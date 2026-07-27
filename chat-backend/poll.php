<?php
/**
 * TATA Chat - Poll Messages
 * GET endpoint: poll.php?since=ID&password=xxx
 *
 * Response (JSON):
 *   { ok: true, messages: [ { id, username, message_type, content, button_data, file_path, created_at } ] }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

if (!file_exists(__DIR__ . '/config.php')) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server config missing']);
    exit;
}

require_once __DIR__ . '/config.php';

// Check room password
if (ROOM_PASSWORD !== '') {
    $pass = $_GET['password'] ?? '';
    if ($pass !== ROOM_PASSWORD) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Wrong room password']);
        exit;
    }
}

$since = isset($_GET['since']) ? (int)$_GET['since'] : 0;
$limit = 100; // max messages per poll

try {
    $pdo = tata_pdo();

    // Ensure file_path column exists (idempotent migration)
    try {
        $pdo->exec('ALTER TABLE chat_messages ADD COLUMN file_path VARCHAR(255) NULL AFTER button_data');
    } catch (PDOException $e) {
        // Column already exists
    }

    // Throttled housekeeping: purge expired messages and retune retention.
    try {
        tata_run_maintenance($pdo);
    } catch (Throwable $e) {
        // Maintenance failure must never break polling
        error_log('[TATA Chat] Maintenance failed: ' . $e->getMessage());
    }

    $stmt = $pdo->prepare('
        SELECT id, username, message_type, content, button_data, file_path, created_at
        FROM chat_messages
        WHERE id > :since
        ORDER BY id ASC
        LIMIT :limit
    ');

    $stmt->bindValue(':since', $since, PDO::PARAM_INT);
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
            'file_path' => $row['file_path'],
            'created_at' => $row['created_at'],
        ];
    }

    echo json_encode(['ok' => true, 'messages' => $messages]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Database error']);
}
