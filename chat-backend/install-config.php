<?php
/**
 * TATA Chat - Config Installer
 *
 * This file is uploaded by the GitHub Actions deploy workflow.
 * The workflow POSTs the database credentials to this endpoint once per deploy;
 * the script writes chat-config.json on the server-side filesystem and then
 * deletes itself so it cannot be reused by an attacker.
 *
 * No credentials are stored inside this file.
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php-errors.log');

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    return;
}

// Very simple bearer token: the install secret or the database password itself.
$token = $_POST['token'] ?? '';
$dbPass = $_POST['db_pass'] ?? '';

if ($token === '' || $token !== $dbPass) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Forbidden']);
    return;
}

$config = [
    'db_host' => $_POST['db_host'] ?? 'localhost',
    'db_name' => $_POST['db_name'] ?? '',
    'db_user' => $_POST['db_user'] ?? '',
    'db_pass' => $dbPass,
    'db_charset' => 'utf8mb4',
    'room_password' => $_POST['room_password'] ?? '',
];

if ($config['db_name'] === '' || $config['db_user'] === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Database name and user are required']);
    return;
}

// Make sure the uploads directory exists for the next upload.
$uploadDir = __DIR__ . '/uploads';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

// Write the config file and lock it down.
$json = json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if (@file_put_contents(__DIR__ . '/chat-config.json', $json) === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to write chat-config.json']);
    return;
}
@chmod(__DIR__ . '/chat-config.json', 0600);

// Self-destruct. The next deploy will re-upload this file from the repo.
@unlink(__FILE__);

// Also clean up legacy config.php if it still exists.
@unlink(__DIR__ . '/config.php');

echo json_encode(['ok' => true]);
