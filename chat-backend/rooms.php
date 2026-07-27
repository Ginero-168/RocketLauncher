<?php
/**
 * Room lifecycle endpoint.
 *
 * POST { action: "join", room: "public|invite-code", password?: "..." }
 * POST { action: "create", name: "...", password: "...", username: "..." }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Chat-Room');

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

try {
    $raw = file_get_contents('php://input');
    $body = json_decode((string)$raw, true);
    if (!is_array($body)) {
        throw new InvalidArgumentException('Invalid JSON body');
    }

    $pdo = tata_require_pdo();
    tata_ensure_chat_schema($pdo);
    $action = (string)($body['action'] ?? 'join');

    if ($action === 'create') {
        $name = trim((string)($body['name'] ?? ''));
        $password = (string)($body['password'] ?? '');
        $username = trim((string)($body['username'] ?? ''));

        if ($name === '' || mb_strlen($name) > 80) {
            throw new InvalidArgumentException('Room name required (max 80 chars)');
        }
        if (mb_strlen($password) < 6 || mb_strlen($password) > 128) {
            throw new InvalidArgumentException('Private room password must be 6–128 characters');
        }
        if ($username === '' || mb_strlen($username) > 50) {
            throw new InvalidArgumentException('Display name required (max 50 chars)');
        }

        $ipHash = hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        $rate = $pdo->prepare("
            SELECT COUNT(*) FROM chat_rooms
            WHERE created_ip_hash = :ip_hash
              AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $rate->execute([':ip_hash' => $ipHash]);
        if ((int)$rate->fetchColumn() >= 10) {
            http_response_code(429);
            echo json_encode(['ok' => false, 'error' => 'Room creation limit reached. Try again later.']);
            exit;
        }

        $base = tata_room_slug($name);
        if ($base === '' || $base === 'public') {
            $base = 'room';
        }
        $slug = substr($base, 0, 48) . '-' . bin2hex(random_bytes(4));

        $stmt = $pdo->prepare("
            INSERT INTO chat_rooms (slug, name, password_hash, created_by, created_ip_hash)
            VALUES (:slug, :name, :password_hash, :created_by, :created_ip_hash)
        ");
        $stmt->execute([
            ':slug' => $slug,
            ':name' => $name,
            ':password_hash' => password_hash($password, PASSWORD_DEFAULT),
            ':created_by' => $username,
            ':created_ip_hash' => $ipHash,
        ]);

        $room = tata_require_room($pdo, $slug, $password);
        echo json_encode(['ok' => true, 'room' => $room]);
        exit;
    }

    if ($action !== 'join') {
        throw new InvalidArgumentException('Unsupported action');
    }

    $slug = (string)($body['room'] ?? 'public');
    $password = (string)($body['password'] ?? '');
    $room = tata_require_room($pdo, $slug, $password);
    echo json_encode(['ok' => true, 'room' => $room]);
} catch (OutOfBoundsException $e) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (UnexpectedValueException $e) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (OverflowException $e) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    error_log('[TATA Chat rooms.php] ' . $e->getMessage());
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
