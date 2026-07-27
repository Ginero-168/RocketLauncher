<?php
/**
 * Authorized media delivery. Uploads are denied at the web-server layer and
 * can only be read after the caller proves access to the message's room.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, X-Chat-Room');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit;
}

require_once __DIR__ . '/lib.php';

try {
    $messageId = (int)($_GET['id'] ?? 0);
    if ($messageId <= 0) {
        throw new InvalidArgumentException('Invalid media id');
    }

    $pdo = tata_require_pdo();
    $room = tata_require_room($pdo);
    $stmt = $pdo->prepare("
        SELECT file_path FROM chat_messages
        WHERE id = :id AND room_id = :room_id AND file_path IS NOT NULL
        LIMIT 1
    ");
    $stmt->execute([':id' => $messageId, ':room_id' => $room['id']]);
    $relative = (string)($stmt->fetchColumn() ?: '');
    if ($relative === '') {
        throw new OutOfBoundsException('Media not found');
    }

    $uploads = realpath(tata_uploads_dir());
    $path = realpath(__DIR__ . '/' . $relative);
    if ($uploads === false || $path === false || strpos($path, $uploads . DIRECTORY_SEPARATOR) !== 0) {
        throw new OutOfBoundsException('Media not found');
    }

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path) ?: 'application/octet-stream';
    $allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!in_array($mime, $allowed, true)) {
        http_response_code(415);
        exit;
    }

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: private, max-age=300');
    readfile($path);
} catch (OutOfBoundsException $e) {
    http_response_code(404);
} catch (UnexpectedValueException $e) {
    http_response_code(403);
} catch (OverflowException $e) {
    http_response_code(429);
} catch (Throwable $e) {
    http_response_code(500);
    error_log('[TATA Chat media.php] ' . $e->getMessage());
}
