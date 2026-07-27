<?php
/**
 * TATA Chat - Send Message
 * POST endpoint: send.php
 *
 * Supports:
 * - JSON body: { username, content, message_type, button_data, password }
 * - Multipart form: username, content, message_type, password, image (file)
 *
 * Response (JSON):
 *   { ok: true, id: 123 }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

/**
 * Remove dangerous constructs from SVG files before serving them from our domain.
 * We strip script tags, event handlers, foreign objects, and external references.
 * This is defense-in-depth; the image is also displayed in an <img> tag, which
 * blocks inline scripts in modern browsers, but sanitizing the file itself
 * protects older clients and direct downloaders.
 */
function sanitize_svg(string $svg): string
{
    // Bail out if it doesn't even look like an SVG.
    if (stripos($svg, '<svg') === false) {
        throw new RuntimeException('Not an SVG document');
    }

    $svg = preg_replace(
        [
            // Remove <script> elements entirely (including CDATA-wrapped).
            '#<script[\s\S]*?</script>#i',
            // Remove <foreignObject>, <iframe>, <object>, <embed>, <use>.
            '#<(foreignObject|iframe|object|embed|use)[\s\S]*?</\1>#i',
            '#<(foreignObject|iframe|object|embed|use)\s+[^>]*/?>#i',
            // Remove event handlers (onload, onclick, ...).
            '#\s+on\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)#i',
            // Remove JavaScript URLs.
            '#(xlink:href|href)\s*=\s*(["\'])javascript:.*?\2#i',
            // Remove XML entity definitions and DOCTYPE declarations (XXE protection).
            '#<!ENTITY\s+.*?>#i',
            '#<!DOCTYPE\s+[\s\S]*?>#i',
        ],
        '',
        $svg
    );

    // Ensure the XML prologue (if any) still declares UTF-8 and standalone=no.
    if (stripos($svg, '<?xml') === false) {
        $svg = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n" . ltrim($svg);
    }

    return $svg;
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
    echo json_encode(['ok' => false, 'error' => 'Server config missing — run setup.php']);
    exit;
}

// Parse request body (JSON or multipart)
$isMultipart = !empty($_FILES);
$body = $_POST;
if (!$isMultipart && $_SERVER['CONTENT_TYPE'] && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
    $raw = file_get_contents('php://input');
    $parsed = json_decode($raw, true);
    if ($parsed) {
        $body = $parsed;
    }
}

// Check room password
$roomPassword = tata_room_password();
if ($roomPassword !== '') {
    if (($body['password'] ?? '') !== $roomPassword) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Wrong room password']);
        exit;
    }
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
        $stats = tata_storage_stats(tata_require_pdo());
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
        $clean = sanitize_svg($rawSvgContent);
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

    if (mb_strlen($content) > 10000) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Message too long (max 10000 chars)']);
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

try {
    $pdo = tata_require_pdo();

    // Ensure the schema is up to date (file_path column, etc.)
    $pdo->exec("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_path VARCHAR(255) NULL AFTER button_data");

    $stmt = $pdo->prepare("
        INSERT INTO chat_messages (username, message_type, content, button_data, file_path)
        VALUES (:username, :message_type, :content, :button_data, :file_path)
    ");

    $stmt->execute([
        ':username' => $username,
        ':message_type' => $messageType,
        ':content' => $content,
        ':button_data' => $buttonData ? json_encode($buttonData) : null,
        ':file_path' => $filePath,
    ]);

    echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);

} catch (Throwable $e) {
    http_response_code(500);
    error_log('[TATA Chat send.php] ' . $e->getMessage());
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
