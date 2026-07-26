<?php
/**
 * TATA Chat - Send Message
 * POST endpoint: send.php
 *
 * Body (JSON):
 *   { username, content, message_type, button_data, password }
 *
 * Response (JSON):
 *   { ok: true, id: 123 }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

if (!file_exists(__DIR__ . '/config.php')) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server config missing']);
    exit;
}

require_once __DIR__ . '/config.php';

// Read JSON body
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
    exit;
}

// Check room password
if (ROOM_PASSWORD !== '') {
    $pass = $body['password'] ?? '';
    if ($pass !== ROOM_PASSWORD) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Wrong room password']);
        exit;
    }
}

// Validate input
$username = trim($body['username'] ?? '');
$content = trim($body['content'] ?? '');
$messageType = $body['message_type'] ?? 'text';
$buttonData = $body['button_data'] ?? null;

if ($username === '' || mb_strlen($username) > 50) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Username required (max 50 chars)']);
    exit;
}

if ($content === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Content required']);
    exit;
}

// Limit message size (prevent abuse)
if (mb_strlen($content) > 10000) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Message too long (max 10000 chars)']);
    exit;
}

// Validate message_type
$allowedTypes = ['text', 'button_config'];
if (!in_array($messageType, $allowedTypes, true)) {
    $messageType = 'text';
}

// Sanitize button_data (must be valid JSON object or null)
if ($buttonData !== null) {
    $buttonJson = json_encode($buttonData);
    if ($buttonJson === false || mb_strlen($buttonJson) > 50000) {
        $buttonData = null;
    }
}

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $stmt = $pdo->prepare("
        INSERT INTO chat_messages (username, message_type, content, button_data)
        VALUES (:username, :message_type, :content, :button_data)
    ");

    $stmt->execute([
        ':username' => $username,
        ':message_type' => $messageType,
        ':content' => $content,
        ':button_data' => $buttonData ? json_encode($buttonData) : null,
    ]);

    echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Database error']);
}
