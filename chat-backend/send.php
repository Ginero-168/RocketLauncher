<?php
/**
 * TATA Chat - Send Message
 * POST endpoint: send.php
 *
 * Supports:
 * - JSON body: { username, content, message_type, button_data }
 * - Multipart form: username, content, message_type, image (file)
 * - Room selection: X-Chat-Room + optional Authorization: Bearer <password>
 *
 * Response (JSON):
 *   { ok: true, id: 123 }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Chat-Room');

/**
 * Remove dangerous constructs from SVG files before serving them from our domain.
 * We strip script tags, event handlers, foreign objects, and external references.
 * This is defense-in-depth; the image is also displayed in an <img> tag, which
 * blocks inline scripts in modern browsers, but sanitizing the file itself
 * protects older clients and direct downloaders.
 */
function sanitize_svg(string $svg): string
{
    if (!class_exists('DOMDocument')) {
        throw new RuntimeException('SVG sanitizer unavailable');
    }
    if (stripos($svg, '<!DOCTYPE') !== false || stripos($svg, '<!ENTITY') !== false) {
        throw new RuntimeException('Unsafe SVG document');
    }

    $previous = libxml_use_internal_errors(true);
    $doc = new DOMDocument();
    $loaded = $doc->loadXML($svg, LIBXML_NONET | LIBXML_NOBLANKS);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);
    if (!$loaded || !$doc->documentElement || strtolower($doc->documentElement->localName) !== 'svg') {
        throw new RuntimeException('Not an SVG document');
    }

    $blocked = ['script', 'foreignobject', 'iframe', 'object', 'embed'];
    $nodes = [];
    foreach ($doc->getElementsByTagName('*') as $node) {
        $nodes[] = $node;
    }
    foreach (array_reverse($nodes) as $node) {
        if (in_array(strtolower($node->localName), $blocked, true)) {
            if ($node->parentNode) {
                $node->parentNode->removeChild($node);
            }
            continue;
        }

        $remove = [];
        foreach ($node->attributes as $attribute) {
            $name = strtolower($attribute->nodeName);
            $value = trim($attribute->nodeValue);
            if (strpos($name, 'on') === 0
                || (($name === 'href' || $name === 'xlink:href')
                    && !preg_match('/^(#|data:image\/(?:png|jpeg|gif|webp);base64,)/i', $value))
                || (($name === 'style' || $name === 'filter')
                    && preg_match('/(javascript:|expression\s*\(|url\s*\(\s*[\'"]?(?!#|data:image\/(?:png|jpeg|gif|webp);base64,))/i', $value))) {
                $remove[] = $attribute->nodeName;
            }
        }
        foreach ($remove as $name) {
            $node->removeAttribute($name);
        }
        if (strtolower($node->localName) === 'style'
            && preg_match('/(@import|javascript:|expression\s*\(|url\s*\(\s*[\'"]?(?!#|data:image\/(?:png|jpeg|gif|webp);base64,))/i', $node->textContent)) {
            $node->parentNode->removeChild($node);
        }
    }

    return $doc->saveXML($doc->documentElement);
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php-errors.log');

require_once __DIR__ . '/lib.php';

if (!tata_is_configured()) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server configuration missing']);
    exit;
}

// Parse request body (JSON or multipart)
$isMultipart = !empty($_FILES);
$body = $_POST;
if (!$isMultipart && !empty($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
    $raw = file_get_contents('php://input');
    $parsed = json_decode($raw, true);
    if ($parsed) {
        $body = $parsed;
    }
}

try {
    $pdo = tata_require_pdo();
    $room = tata_require_room(
        $pdo,
        (string)($_SERVER['HTTP_X_CHAT_ROOM'] ?? ($body['room'] ?? 'public')),
        tata_bearer_token()
    );
} catch (OutOfBoundsException $e) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    exit;
} catch (UnexpectedValueException $e) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    exit;
} catch (OverflowException $e) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    exit;
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error']);
    exit;
}

// Validate input
$username = trim($body['username'] ?? '');
$messageType = $body['message_type'] ?? 'text';
$content = trim($body['content'] ?? '');
$buttonData = $body['button_data'] ?? null;
$filePath = null;

if ($username === '' || mb_strlen($username) > 50) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Username required (max 50 chars)']);
    exit;
}

$allowedTypes = ['text', 'button_config', 'image'];
if (!in_array($messageType, $allowedTypes, true)) {
    $messageType = 'text';
}
if (mb_strlen($content) > 10000) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Message too long (max 10000 chars)']);
    exit;
}

try {
    tata_enforce_rate_limit($pdo, 'send-room-' . $room['id'], 60, 60);
    if ($messageType === 'image') {
        tata_enforce_rate_limit($pdo, 'upload-room-' . $room['id'], 15, 60);
    }
} catch (OverflowException $e) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    exit;
}

// Handle image upload
if ($messageType === 'image') {
    if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Image upload failed']);
        exit;
    }

    $file = $_FILES['image'];
    $uploadDir = __DIR__ . '/uploads';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }

    $maxSize = 5 * 1024 * 1024; // 5 MB
    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Image too large (max 5 MB)']);
        exit;
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    $rawSvgContent = null;

    // Accept both bitmap images and SVG.
    $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    $isSvg = in_array($mime, ['image/svg+xml'], true) || preg_match('/\.svg$/i', (string)$file['name']);

    if (!$isSvg && !in_array($mime, $allowedMimes, true)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid image type']);
        exit;
    }

    // Refuse uploads that would push storage past the configured quota
    try {
        $stats = tata_storage_stats($pdo);
        if ($stats['total_bytes'] + $file['size'] > $stats['quota_bytes']) {
            http_response_code(507);
            echo json_encode(['ok' => false, 'error' => 'Storage quota full — ask an admin to free up space']);
            exit;
        }
    } catch (Throwable $e) {
        // Quota check is advisory; never block on internal failure
    }

    // Read SVG content once for sanitization before moving it.
    if ($isSvg) {
        $rawSvgContent = @file_get_contents($file['tmp_name']);
        if ($rawSvgContent === false) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Failed to read SVG']);
            exit;
        }
    }

    $ext = $isSvg ? 'svg' : match ($mime) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        default => 'bin',
    };

    $filename = bin2hex(random_bytes(16)) . '.' . $ext;
    $destination = $uploadDir . '/' . $filename;

    if ($isSvg) {
        // SVG may arrive via Illustrator export as application/octet-stream or with a
        // non-standard extension; the live file must be sanitized and written.
        try {
            $clean = sanitize_svg($rawSvgContent);
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Unsafe or invalid SVG']);
            exit;
        }
        if (@file_put_contents($destination, $clean) === false) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Failed to save SVG']);
            exit;
        }
    } else {
        if (!@move_uploaded_file($file['tmp_name'], $destination)) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Failed to save image']);
            exit;
        }
    }

    $filePath = 'uploads/' . $filename;
    if ($content === '') {
        $content = $isSvg ? 'SVG selection' : $filename;
    }
} else {
    // Text / button_config messages require content
    if ($content === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Content required']);
        exit;
    }

}

// Sanitize button_data (must be valid JSON object or null)
if ($buttonData !== null) {
    $buttonJson = json_encode($buttonData);
    if ($buttonJson === false || mb_strlen($buttonJson) > 50000) {
        $buttonData = null;
    }
}
if ($messageType === 'button_config') {
    if (!is_array($buttonData)
        || trim((string)($buttonData['label'] ?? '')) === ''
        || mb_strlen((string)($buttonData['label'] ?? '')) > 100
        || mb_strlen((string)($buttonData['code'] ?? '')) > 40000) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid panel button configuration']);
        exit;
    }
    $icon = (string)($buttonData['icon'] ?? '★');
    if (stripos(ltrim($icon), '<svg') === 0) {
        try {
            $icon = sanitize_svg($icon);
        } catch (Throwable $e) {
            $icon = '★';
        }
    } else {
        $icon = substr(strip_tags($icon), 0, 32) ?: '★';
    }
    $buttonData = [
        'id' => substr((string)($buttonData['id'] ?? ''), 0, 100),
        'label' => trim((string)$buttonData['label']),
        'icon' => substr($icon, 0, 5000),
        'color' => substr((string)($buttonData['color'] ?? 'gray'), 0, 30),
        'code' => (string)($buttonData['code'] ?? ''),
        'script' => substr((string)($buttonData['script'] ?? ''), 0, 500),
        'type' => substr((string)($buttonData['type'] ?? 'code'), 0, 30),
    ];
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO chat_messages (room_id, username, message_type, content, button_data, file_path)
        VALUES (:room_id, :username, :message_type, :content, :button_data, :file_path)
    ");

    $stmt->execute([
        ':room_id' => $room['id'],
        ':username' => $username,
        ':message_type' => $messageType,
        ':content' => $content,
        ':button_data' => $buttonData ? json_encode($buttonData) : null,
        ':file_path' => $filePath,
    ]);

    echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);

} catch (Throwable $e) {
    if ($filePath !== null && isset($destination) && is_file($destination)) {
        @unlink($destination);
    }
    http_response_code(500);
    error_log('[TATA Chat send.php] ' . $e->getMessage());
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
