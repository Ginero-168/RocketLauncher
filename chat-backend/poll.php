<?php
/**
 * TATA Chat - Poll Messages
 * GET endpoint: poll.php?since=ID&password=xxx
 *
 * Response (JSON):
 *   { ok: true, messages: [ { id, username, message_type, content, button_data, created_at } ] }
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

// Auto-cleanup old messages
if (CLEANUP_DAYS > 0) {
    try {
        $cleanupPdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $cleanupPdo->exec(
            "DELETE FROM chat_messages WHERE created_at < DATE_SUB(NOW(), INTERVAL " . CLEANUP_DAYS . " DAY)"
        );
    } catch (PDOException $e) {
        // cleanup failure is non-fatal
    }
}

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $stmt = $pdo->prepare("
        SELECT id, username, message_type, content, button_data, created_at
        FROM chat_messages
        WHERE id > :since
        ORDER BY id ASC
        LIMIT :limit
    ");

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
            'created_at' => $row['created_at'],
        ];
    }

    echo json_encode(['ok' => true, 'messages' => $messages]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Database error']);
}
