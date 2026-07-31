<?php
/**
 * TATA Chat - Poll Messages
 * GET endpoint: poll.php?since=ID
 *
 * Response (JSON):
 *   { ok: true, messages: [ { id, username, message_type, content, button_data, created_at } ] }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Chat-Room');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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

$since = isset($_GET['since']) ? (int)$_GET['since'] : 0;
$limit = 100; // max messages per poll

try {
    $pdo = tata_pdo();
    $room = tata_require_room($pdo);

    // Throttled housekeeping: purge expired messages and retune retention.
    try {
        tata_run_maintenance($pdo);
    } catch (Throwable $e) {
        // Maintenance failure must never break polling
        error_log('[TATA Chat] Maintenance failed: ' . $e->getMessage());
    }

    $stmt = $pdo->prepare('
        SELECT id, username, message_type, content, button_data, created_at
        FROM chat_messages
        WHERE room_id = :room_id AND id > :since
        ORDER BY id ASC
        LIMIT :limit
    ');

    $stmt->bindValue(':since', $since, PDO::PARAM_INT);
    $stmt->bindValue(':room_id', $room['id'], PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    $messages = [];
    while ($row = $stmt->fetch()) {
        $messages[] = [
            'id' => (int)$row['id'],
            'username' => $row['username'],
            'message_type' => $row['message_type'],
            'content' => $row['content'],
            'button_data' => $row['button_data'] ? json_decode($row['button_data'], true) : null,
            'created_at' => $row['created_at'],
        ];
    }

    echo json_encode(['ok' => true, 'room' => $room, 'messages' => $messages]);

} catch (OutOfBoundsException $e) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (UnexpectedValueException $e) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (OverflowException $e) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Database error']);
} catch (Throwable $e) {
    http_response_code(500);
    error_log('[TATA Chat poll.php] ' . $e->getMessage());
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
