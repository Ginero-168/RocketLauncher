<?php
/**
 * TATA Chat - Setup Wizard
 *
 * Run this script ONCE to create config.php and the messages table.
 * Visit: https://yourdomain.com/chat-backend/setup.php
 *
 * Delete this file after successful setup for security.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php-errors.log');

function esc($s) {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function q($s) {
    return "'" . str_replace(['\\', "'"], ['\\\\', "\\'"], $s) . "'";
}

function renderForm($values, $error = '') {
    $host = esc($values['db_host'] ?? 'localhost');
    $name = esc($values['db_name'] ?? '');
    $user = esc($values['db_user'] ?? '');
    $pass = esc($values['db_pass'] ?? '');
    $room = esc($values['room_password'] ?? '');
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

            <label>Room Password (optional)</label>
            <input type="text" name="room_password" value="{$room}">
            <div class="hint">Leave empty for a public chat room.</div>

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
        <p>Next: open the TATA extension, go to the Chat tab, and start chatting.</p>
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
        <p><code>config.php</code> and the <code>chat_messages</code> table already exist.</p>
        <p class="warn"><strong>Security:</strong> Delete <code>setup.php</code> from your server now if you no longer need it.</p>
    </div>
</body>
</html>
HTML;
}

// Check if already configured
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $stmt = $pdo->query("SHOW TABLES LIKE 'chat_messages'");
        if ($stmt->rowCount() > 0) {
            renderDone();
            exit;
        }
    } catch (PDOException $e) {
        // config exists but DB connection failed — show form with error
        renderForm($_POST ?: [], 'config.php exists but database connection failed. Please check your credentials.');
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
    'room_password' => trim($_POST['room_password'] ?? ''),
    'cleanup_days' => trim($_POST['cleanup_days'] ?? '30'),
];

if ($values['db_name'] === '' || $values['db_user'] === '') {
    renderForm($values, 'Database name and user are required.');
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

// Write config.php
$configContent = "<?php\n" .
    "define('DB_HOST', " . q($values['db_host']) . ");\n" .
    "define('DB_NAME', " . q($values['db_name']) . ");\n" .
    "define('DB_USER', " . q($values['db_user']) . ");\n" .
    "define('DB_PASS', " . q($values['db_pass']) . ");\n" .
    "define('DB_CHARSET', 'utf8mb4');\n" .
    "define('ROOM_PASSWORD', " . q($values['room_password']) . ");\n" .
    "define('CLEANUP_DAYS', " . $cleanupDays . ");\n";

if (@file_put_contents(__DIR__ . '/config.php', $configContent) === false) {
    renderForm($values, 'Failed to write config.php. Check folder permissions.');
    exit;
}

// Create table (and file_path column if missing)
$pdo = new PDO($testDsn, $values['db_user'], $values['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$pdo->exec("
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    button_data JSON NULL,
    file_path VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// Add file_path column if upgrading from an older schema
try {
    $pdo->exec("ALTER TABLE chat_messages ADD COLUMN file_path VARCHAR(255) NULL AFTER button_data");
} catch (PDOException $e) {
    // Column likely already exists; ignore
}

// Ensure uploads directory exists with protection
$uploadDir = __DIR__ . '/uploads';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}
$htaccess = $uploadDir . '/.htaccess';
if (!file_exists($htaccess)) {
    @file_put_contents($htaccess, "# Deny PHP execution in uploads directory\nphp_flag engine off\n\n<FilesMatch \"\\\\.(?i:php)\$\">\n  Require all denied\n</FilesMatch>\n");
}

renderSuccess("Created <code>config.php</code> and the <code>chat_messages</code> table successfully.");
