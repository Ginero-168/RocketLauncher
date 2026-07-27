<?php
/**
 * TATA Chat - Health Check / Debug Endpoint
 *
 * Verifies that the backend files were deployed correctly, that the
 * configuration is readable, and that the database connection works.
 *
 * Delete this file after setup for security.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

require_once __DIR__ . '/lib.php';

$checks = [
    'php' => true,
    'php_version' => PHP_VERSION,
    'pdo_available' => extension_loaded('pdo_mysql'),
    'config_exists' => file_exists(__DIR__ . '/chat-config.json'),
    'legacy_config_exists' => file_exists(__DIR__ . '/config.php'),
    'uploads_writable' => is_dir(__DIR__ . '/uploads') && is_writable(__DIR__ . '/uploads'),
    'dir_writable' => is_writable(__DIR__),
];

if (tata_is_configured()) {
    $checks['config_readable'] = true;
    try {
        $pdo = tata_pdo();
        $checks['db_connected'] = true;
        $checks['table_exists'] = $pdo->query("SHOW TABLES LIKE 'chat_messages'")->rowCount() > 0;
        $checks['settings_table_exists'] = $pdo->query("SHOW TABLES LIKE 'chat_settings'")->rowCount() > 0;

        if ($checks['table_exists']) {
            $stats = tata_storage_stats($pdo);
            $checks['storage'] = [
                'used' => tata_format_bytes($stats['total_bytes']),
                'quota' => tata_format_bytes($stats['quota_bytes']),
                'usage_pct' => round($stats['usage_pct'], 1),
                'messages' => $stats['message_count'],
                'retention_days' => (int)tata_setting($pdo, 'retention_days'),
            ];
        }
    } catch (Throwable $e) {
        $checks['db_connected'] = false;
        $checks['db_error'] = $e->getMessage();
    }
} else {
    $checks['config_readable'] = false;
    $checks['hint'] = 'Run setup.php to create chat-config.json';
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($checks, JSON_PRETTY_PRINT);
