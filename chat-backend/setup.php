<?php
/**
 * TATA Chat - Setup Wizard
 *
 * Run this script ONCE to create chat-config.json and the database tables.
 * Visit: https://yourdomain.com/chat-backend/setup.php
 *
 * Delete this file after successful setup for security.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php-errors.log');

require_once __DIR__ . '/lib.php';

function esc($s) {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function renderForm($values, $error = '') {
    $host = esc($values['db_host'] ?? 'localhost');
    $name = esc($values['db_name'] ?? '');
    $user = esc($values['db_user'] ?? '');
    $pass = esc($values['db_pass'] ?? '');
    $adminToken = esc($values['admin_setup_token'] ?? '');
    $cleanup = esc($values['cleanup_days'] ?? '30');
    $errorHtml = $error ? "<p style='color:#ff6b6b'>" . esc($error) . "</p>" : '';

    echo <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>TATA Chat Setup</title>
    <style>
        body { background: #0f0f1a; color: #eee; font-family: sans-serif; padding: 40px; }
        .box { max-width: 500px; margin: 0 auto; background: #1a1a2e; padding: 24px; border-radius: 8px; border: 1px solid #3a3a5c; }
        h2 { margin-top: 0; }
        label { display: block; margin: 12px 0 4px; font-size: 13px; color: #aaa; }
        input { width: 100%; padding: 8px; background: #0f0f1a; border: 1px solid #3a3a5c; color: #fff; border-radius: 4px; box-sizing: border-box; }
        button { margin-top: 16px; padding: 10px 20px; background: #4e8cff; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
        .hint { color: #888; font-size: 12px; margin-top: 4px; }
    </style>
</head>
<body>
    <div class="box">
        <h2>TATA Chat Setup</h2>
        <p>Enter your Hostinger MySQL credentials to create the configuration file and database table.</p>
        {$errorHtml}
        <form method="POST" action="">
            <label>MySQL Host</label>
            <input type="text" name="db_host" value="{$host}" required>

            <label>Database Name</label>
            <input type="text" name="db_name" value="{$name}" required>

            <label>Database User</label>
            <input type="text" name="db_user" value="{$user}" required>

            <label>Database Password</label>
            <input type="password" name="db_pass" value="{$pass}" required>

            <label>Admin Setup Token</label>
            <input type="password" name="admin_setup_token" value="{$adminToken}" minlength="12" required>
            <div class="hint">A one-time secret required to claim the admin panel.</div>

            <label>Auto-cleanup (days)</label>
            <input type="number" name="cleanup_days" value="{$cleanup}" min="0">
            <div class="hint">0 = keep messages forever.</div>

            <button type="submit">Create Config & Table</button>
        </form>
    </div>
</body>
</html>
HTML;
}

function renderSuccess($msg) {
    echo <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>TATA Chat Setup</title>
    <style>
        body { background: #0f0f1a; color: #eee; font-family: sans-serif; padding: 40px; }
        .box { max-width: 500px; margin: 0 auto; background: #1a1a2e; padding: 24px; border-radius: 8px; border: 1px solid #3a3a5c; }
        .ok { color: #6bcb77; }
        .warn { color: #ff6b6b; }
        code { background: #0f0f1a; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="box">
        <h2 class="ok">Setup Complete</h2>
        <p>{$msg}</p>
        <p class="warn"><strong>Security:</strong> Delete <code>setup.php</code> from your server now (via hPanel File Manager) to prevent this form from being accessed again.</p>
        <p>Next: open <a href="admin.php" style="color:#4e8cff">admin.php</a> to set an admin password and tune storage settings, then use the Chat tab in the TATA extension.</p>
    </div>
</body>
</html>
HTML;
}

function renderDone() {
    echo <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>TATA Chat Setup</title>
    <style>
        body { background: #0f0f1a; color: #eee; font-family: sans-serif; padding: 40px; }
        .box { max-width: 500px; margin: 0 auto; background: #1a1a2e; padding: 24px; border-radius: 8px; border: 1px solid #3a3a5c; }
        .ok { color: #6bcb77; }
        .warn { color: #ff6b6b; }
        code { background: #0f0f1a; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="box">
        <h2 class="ok">Already Configured</h2>
        <p><code>chat-config.json</code> and the <code>chat_messages</code> table already exist.</p>
        <p>Manage storage and retention in <a href="admin.php" style="color:#4e8cff">admin.php</a>.</p>
        <p class="warn"><strong>Security:</strong> Delete <code>setup.php</code> from your server now if you no longer need it.</p>
    </div>
</body>
</html>
HTML;
}

// Check if already configured
if (tata_is_configured()) {
    try {
        $pdo = tata_pdo();
        $stmt = $pdo->query("SHOW TABLES LIKE 'chat_messages'");
        if ($stmt->rowCount() > 0) {
            renderDone();
            exit;
        }
    } catch (PDOException $e) {
        // Config exists but the connection failed — let the user re-enter credentials
        renderForm($_POST ?: [], 'Config exists but the database connection failed. Please check your credentials.');
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    renderForm([]);
    exit;
}

$values = [
    'db_host' => trim($_POST['db_host'] ?? 'localhost'),
    'db_name' => trim($_POST['db_name'] ?? ''),
    'db_user' => trim($_POST['db_user'] ?? ''),
    'db_pass' => $_POST['db_pass'] ?? '',
    'admin_setup_token' => (string)($_POST['admin_setup_token'] ?? ''),
    'cleanup_days' => trim($_POST['cleanup_days'] ?? '30'),
];

if ($values['db_name'] === '' || $values['db_user'] === '' || strlen($values['admin_setup_token']) < 12) {
    renderForm($values, 'Database name, user, and an admin setup token of at least 12 characters are required.');
    exit;
}

$cleanupDays = (int)$values['cleanup_days'];
if ($cleanupDays < 0) {
    $cleanupDays = 0;
}

// Test connection before writing config
$testDsn = "mysql:host=" . $values['db_host'] . ";dbname=" . $values['db_name'] . ";charset=utf8mb4";
try {
    $test = new PDO($testDsn, $values['db_user'], $values['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (PDOException $e) {
    renderForm($values, 'Database connection failed: ' . $e->getMessage());
    exit;
}

// Persist credentials to chat-config.json (see lib.php for why it is not a .php file)
$written = tata_write_config([
    'db_host' => $values['db_host'],
    'db_name' => $values['db_name'],
    'db_user' => $values['db_user'],
    'db_pass' => $values['db_pass'],
    'db_charset' => 'utf8mb4',
    'admin_setup_token' => $values['admin_setup_token'],
]);

if (!$written) {
    renderForm($values, 'Failed to write chat-config.json. Check folder permissions.');
    exit;
}

// Create the chat table
$pdo = new PDO($testDsn, $values['db_user'], $values['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$pdo->exec("
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NULL,
    username VARCHAR(50) NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    button_data JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created (created_at),
    INDEX idx_room_id (room_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// Settings table used by the admin panel and the adaptive retention engine
$pdo->exec("
CREATE TABLE IF NOT EXISTS chat_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// Public Lounge plus password-protected private rooms.
$pdo->exec("
CREATE TABLE IF NOT EXISTS chat_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    password_hash VARCHAR(255) NULL,
    created_by VARCHAR(50) NOT NULL DEFAULT '',
    created_ip_hash CHAR(64) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_room_created (created_at),
    INDEX idx_room_creator (created_ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
$pdo->exec("
CREATE TABLE IF NOT EXISTS chat_rate_limits (
    ip_hash CHAR(64) NOT NULL,
    scope VARCHAR(96) NOT NULL,
    window_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (ip_hash, scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
$pdo->exec("
    INSERT INTO chat_rooms (slug, name, password_hash, created_by)
    VALUES ('public', 'Public Lounge', NULL, 'system')
    ON DUPLICATE KEY UPDATE name = VALUES(name)
");
$publicId = (int)$pdo->query("SELECT id FROM chat_rooms WHERE slug = 'public' LIMIT 1")->fetchColumn();
$assignPublic = $pdo->prepare("UPDATE chat_messages SET room_id = :room_id WHERE room_id IS NULL");
$assignPublic->execute([':room_id' => $publicId]);

// Seed the retention window from the value entered in this form
$seed = $pdo->prepare("
    INSERT INTO chat_settings (setting_key, setting_value)
    VALUES ('retention_days', :days)
    ON DUPLICATE KEY UPDATE setting_value = setting_value
");
$seed->execute([':days' => (string)$cleanupDays]);

// Ensure uploads directory exists with protection
$uploadDir = __DIR__ . '/uploads';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}
$htaccess = $uploadDir . '/.htaccess';
if (!file_exists($htaccess)) {
    @file_put_contents($htaccess, "# Media is served only through ../media.php after room authorization.\nRequire all denied\n");
}

renderSuccess("Created <code>chat-config.json</code> and the <code>chat_messages</code> table successfully.");
