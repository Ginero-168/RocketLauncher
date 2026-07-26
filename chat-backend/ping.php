<?php
/**
 * TATA Chat - Health Check / Debug Endpoint
 *
 * Use this to verify that the backend files were deployed correctly
 * and that the database connection works.
 *
 * Delete this file after setup for security.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$checks = [
    'php' => true,
    'php_version' => PHP_VERSION,
    'config_exists' => file_exists(__DIR__ . '/config.php'),
    'pdo_available' => extension_loaded('pdo_mysql'),
];

if ($checks['config_exists']) {
    require_once __DIR__ . '/config.php';
    $checks['config_readable'] = true;

    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $checks['db_connected'] = true;

        $stmt = $pdo->query("SHOW TABLES LIKE 'chat_messages'");
        $checks['table_exists'] = $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        $checks['db_connected'] = false;
        $checks['db_error'] = $e->getMessage();
    }
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($checks, JSON_PRETTY_PRINT);
