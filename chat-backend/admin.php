<?php
/**
 * TATA Chat - Admin Panel
 *
 * Dashboard for storage usage plus retention / quota settings.
 * Protected by a dedicated admin password (set on first visit).
 */

session_set_cookie_params([
    'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Strict',
]);
session_start();
if (empty($_SESSION['tata_csrf'])) {
    $_SESSION['tata_csrf'] = bin2hex(random_bytes(32));
}

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php-errors.log');

require_once __DIR__ . '/lib.php';

function h($s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

function page(string $title, string $body): void
{
    $t = h($title);
    echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$t}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#0f0f1a; color:#e8e8f0; font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; padding:32px 16px; }
  .wrap { max-width:720px; margin:0 auto; }
  .card { background:#1a1a2e; border:1px solid #2e2e4a; border-radius:10px; padding:20px 24px; margin-bottom:16px; }
  h1 { font-size:20px; margin:0 0 4px; }
  h2 { font-size:15px; margin:0 0 14px; color:#9a9ab8; font-weight:600; text-transform:uppercase; letter-spacing:.04em; }
  .sub { color:#8a8aa8; margin:0 0 24px; font-size:13px; }
  label { display:block; margin:14px 0 5px; font-size:13px; color:#b8b8d0; }
  input[type=text],input[type=number],input[type=password] {
    width:100%; padding:9px 11px; background:#0f0f1a; border:1px solid #34345a; color:#fff;
    border-radius:6px; font-size:14px; font-family:inherit;
  }
  input:focus { outline:2px solid #4e8cff; outline-offset:-1px; border-color:transparent; }
  .hint { color:#75758f; font-size:12px; margin-top:4px; }
  .row { display:flex; gap:14px; }
  .row > div { flex:1; }
  button { margin-top:20px; padding:10px 22px; background:#4e8cff; color:#fff; border:0;
           border-radius:7px; cursor:pointer; font-size:14px; font-weight:600; font-family:inherit; }
  button:hover { background:#3d7bee; }
  button.ghost { background:#2a2a44; }
  button.ghost:hover { background:#34345a; }
  .bar { height:10px; background:#0f0f1a; border-radius:5px; overflow:hidden; border:1px solid #2e2e4a; margin:10px 0 6px; }
  .bar > span { display:block; height:100%; background:linear-gradient(90deg,#4e8cff,#6bcb77); transition:width .3s; }
  .bar.warn > span { background:linear-gradient(90deg,#ffb84e,#ff8c42); }
  .bar.crit > span { background:linear-gradient(90deg,#ff6b6b,#ff3b3b); }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:14px; margin-top:16px; }
  .stat { background:#12121f; border:1px solid #26263f; border-radius:8px; padding:12px 14px; }
  .stat .k { color:#75758f; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
  .stat .v { font-size:17px; font-weight:600; margin-top:3px; }
  .msg { padding:11px 14px; border-radius:7px; margin-bottom:16px; font-size:13px; }
  .msg.ok { background:#14311f; border:1px solid #2c6b41; color:#8fe0a6; }
  .msg.err { background:#331717; border:1px solid #6b2c2c; color:#ff9d9d; }
  .msg.info { background:#141f31; border:1px solid #2c4a6b; color:#9dc4ff; }
  code { background:#0f0f1a; padding:2px 6px; border-radius:4px; font-size:12px; }
  a { color:#4e8cff; }
  .foot { color:#5a5a75; font-size:12px; text-align:center; margin-top:24px; }
</style>
</head>
<body><div class="wrap">{$body}</div></body>
</html>
HTML;
}

// ------------------------------------------------------------------
// Boot: config + DB must exist before anything else
// ------------------------------------------------------------------
try {
    $pdo = tata_pdo();
    tata_ensure_chat_schema($pdo);
} catch (Throwable $e) {
    page('TATA Chat Admin', '<div class="card"><h1>Not configured</h1>'
        . '<p class="sub">Configure the required deployment secrets and deploy the backend again.</p></div>');
    exit;
}

$settings = tata_settings($pdo);
$notice = '';
$noticeType = 'ok';

// ------------------------------------------------------------------
// First run: create the admin password
// ------------------------------------------------------------------
if ($settings['admin_password_hash'] === '') {
    $setupToken = tata_admin_setup_token();
    if ($setupToken === '') {
        page('TATA Chat Admin - Setup locked', <<<'HTML'
<div class="card">
  <h1>Admin setup locked</h1>
  <p class="sub">Set <code>ADMIN_SETUP_TOKEN</code> in the deployment configuration, deploy again, then return here.</p>
</div>
HTML);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['new_password'])) {
        $pw = (string)$_POST['new_password'];
        $confirm = (string)($_POST['confirm_password'] ?? '');
        $providedToken = (string)($_POST['setup_token'] ?? '');

        try {
            tata_enforce_rate_limit($pdo, 'admin-setup', 10, 300);
        } catch (OverflowException $e) {
            $err = 'Too many setup attempts. Try again later.';
        }

        if (isset($err)) {
            // Keep the rate-limit error.
        } elseif (!hash_equals($setupToken, $providedToken)) {
            $err = 'Invalid admin setup token.';
        } elseif (strlen($pw) < 8) {
            $err = 'Password must be at least 8 characters.';
        } elseif ($pw !== $confirm) {
            $err = 'Passwords do not match.';
        } else {
            tata_set_setting($pdo, 'admin_password_hash', password_hash($pw, PASSWORD_DEFAULT));
            tata_clear_admin_setup_token();
            session_regenerate_id(true);
            $_SESSION['tata_admin'] = true;
            header('Location: admin.php');
            exit;
        }
    }

    $errHtml = isset($err) ? '<div class="msg err">' . h($err) . '</div>' : '';
    page('TATA Chat Admin - Set Password', <<<HTML
<div class="card">
  <h1>Create admin password</h1>
  <p class="sub">This password protects the chat settings panel. It is stored as a bcrypt hash.</p>
  {$errHtml}
  <form method="post">
    <label>Setup token</label>
    <input type="password" name="setup_token" required autocomplete="one-time-code">
    <label>New password</label>
    <input type="password" name="new_password" required autofocus>
    <div class="hint">Minimum 8 characters.</div>
    <label>Confirm password</label>
    <input type="password" name="confirm_password" required>
    <button type="submit">Set password</button>
  </form>
</div>
HTML);
    exit;
}

// ------------------------------------------------------------------
// Login
// ------------------------------------------------------------------
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: admin.php');
    exit;
}

if (empty($_SESSION['tata_admin'])) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
        try {
            tata_enforce_rate_limit($pdo, 'admin-login', 10, 300);
        } catch (OverflowException $e) {
            $err = 'Too many login attempts. Try again later.';
        }
        if (!isset($err) && password_verify((string)$_POST['password'], $settings['admin_password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['tata_admin'] = true;
            header('Location: admin.php');
            exit;
        }
        if (!isset($err)) {
            $err = 'Incorrect password.';
        }
    }

    $errHtml = isset($err) ? '<div class="msg err">' . h($err) . '</div>' : '';
    page('TATA Chat Admin - Login', <<<HTML
<div class="card">
  <h1>TATA Chat Admin</h1>
  <p class="sub">Enter the admin password to continue.</p>
  {$errHtml}
  <form method="post">
    <label>Password</label>
    <input type="password" name="password" required autofocus>
    <button type="submit">Log in</button>
  </form>
</div>
HTML);
    exit;
}

// ------------------------------------------------------------------
// Actions
// ------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if (!hash_equals((string)$_SESSION['tata_csrf'], (string)($_POST['csrf_token'] ?? ''))) {
        http_response_code(403);
        page('TATA Chat Admin - Forbidden', '<div class="card"><h1>Request expired</h1><p class="sub">Reload the admin page and try again.</p></div>');
        exit;
    }
    $action = $_POST['action'];

    if ($action === 'save_settings') {
        $min = max(1, (int)$_POST['retention_min_days']);
        $max = max($min, (int)$_POST['retention_max_days']);
        $retention = min($max, max($min, (int)$_POST['retention_days']));

        tata_set_settings($pdo, [
            'retention_days'     => $retention,
            'retention_min_days' => $min,
            'retention_max_days' => $max,
            'storage_quota_mb'   => max(1, (int)$_POST['storage_quota_mb']),
            'storage_target_pct' => min(99, max(10, (int)$_POST['storage_target_pct'])),
            'maintenance_hours'  => max(1, (int)$_POST['maintenance_hours']),
            'adaptive_enabled'   => isset($_POST['adaptive_enabled']) ? 1 : 0,
        ]);
        $notice = 'Settings saved.';
    }

    if ($action === 'run_maintenance') {
        $report = tata_run_maintenance($pdo, true);
        $parts = ['Purged ' . (int)($report['purged'] ?? 0) . ' message(s).'];
        if (!empty($report['adjusted'])) {
            $parts[] = sprintf('Retention %d → %d days.', $report['retention_before'], $report['retention_after']);
        }
        if (!empty($report['reason'])) {
            $parts[] = $report['reason'] . '.';
        }
        if (!empty($report['force_purged'])) {
            $parts[] = 'Force-removed ' . (int)$report['force_purged'] . ' oldest message(s) to fit the quota.';
        }
        $notice = implode(' ', $parts);
        $noticeType = 'info';
    }

    if ($action === 'change_password') {
        $pw = (string)($_POST['new_password'] ?? '');
        if (strlen($pw) < 8) {
            $notice = 'Password must be at least 8 characters.';
            $noticeType = 'err';
        } else {
            tata_set_setting($pdo, 'admin_password_hash', password_hash($pw, PASSWORD_DEFAULT));
            $notice = 'Admin password updated.';
        }
    }

    $settings = tata_settings($pdo, true);
}

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------
$stats = tata_storage_stats($pdo);
[$suggested, $reason] = tata_suggest_retention($settings, $stats);

$pct = min(100, $stats['usage_pct']);
$barClass = $pct >= 90 ? 'bar crit' : ($pct >= (float)$settings['storage_target_pct'] ? 'bar warn' : 'bar');

$noticeHtml = $notice ? '<div class="msg ' . h($noticeType) . '">' . h($notice) . '</div>' : '';
$adaptiveChecked = (int)$settings['adaptive_enabled'] === 1 ? 'checked' : '';
$lastRun = $settings['last_maintenance_at'] ?: 'never';
$lastReason = $settings['last_adjust_reason'] ?: '—';

$usageLabel = h(
    tata_format_bytes($stats['total_bytes']) . ' of ' . tata_format_bytes($stats['quota_bytes'])
    . sprintf(' (%.1f%%)', $stats['usage_pct'])
);

$suggestionHtml = '';
if ((int)$settings['adaptive_enabled'] === 1 && $suggested !== (int)$settings['retention_days']) {
    $suggestionHtml = '<div class="msg info">Next maintenance will change retention to <strong>'
        . (int)$suggested . ' days</strong>. ' . h($reason) . '.</div>';
}

$host          = h($_SERVER['HTTP_HOST'] ?? '');
$imageCount    = (int)$stats['image_count'];
$messageCount  = (int)$stats['message_count'];
$uploadsHuman  = h(tata_format_bytes($stats['upload_bytes']));
$dbHuman       = h(tata_format_bytes($stats['db_bytes']));
$freeHuman     = h(tata_format_bytes($stats['free_bytes']));
$retention     = (int)$settings['retention_days'];
$oldestHuman   = $stats['oldest_message'] ? h($stats['oldest_message']) : '&mdash;';
$lastRunHuman  = h($lastRun);
$lastReasonHtml = h($lastReason);
$pctWidth      = round($pct, 2);

$body = <<<HTML
<div class="card">
  <h1>TATA Chat Admin</h1>
  <p class="sub">Storage and retention for <code>{$host}</code> &middot;
     <a href="?logout=1">Log out</a></p>
  {$noticeHtml}

  <h2>Storage</h2>
  <div class="{$barClass}"><span style="width:{$pctWidth}%"></span></div>
  <div class="hint">{$usageLabel}</div>

  <div class="stats">
    <div class="stat"><div class="k">Images</div><div class="v">{$imageCount}</div></div>
    <div class="stat"><div class="k">Messages</div><div class="v">{$messageCount}</div></div>
    <div class="stat"><div class="k">Uploads</div><div class="v">{$uploadsHuman}</div></div>
    <div class="stat"><div class="k">Database</div><div class="v">{$dbHuman}</div></div>
    <div class="stat"><div class="k">Free</div><div class="v">{$freeHuman}</div></div>
    <div class="stat"><div class="k">Retention</div><div class="v">{$retention} d</div></div>
  </div>

  <div class="hint" style="margin-top:14px">Oldest message: {$oldestHuman} &middot; Last maintenance: {$lastRunHuman}</div>
  <div class="hint">Last adjustment: {$lastReasonHtml}</div>
</div>
{$suggestionHtml}
HTML;

$minDays = (int)$settings['retention_min_days'];
$maxDays = (int)$settings['retention_max_days'];
$quotaMb = (int)$settings['storage_quota_mb'];
$targetPct = (int)$settings['storage_target_pct'];
$maintHours = (int)$settings['maintenance_hours'];
$csrfToken = h($_SESSION['tata_csrf']);

$body .= <<<HTML
<div class="card">
  <h2>Retention &amp; quota</h2>
	  <form method="post">
	    <input type="hidden" name="action" value="save_settings">
	    <input type="hidden" name="csrf_token" value="{$csrfToken}">

    <label><input type="checkbox" name="adaptive_enabled" value="1" {$adaptiveChecked}>
      Adaptive retention</label>
    <div class="hint">Automatically raise or lower the retention window to keep usage near the target percentage of the quota.</div>

    <div class="row">
      <div>
        <label>Retention (days)</label>
        <input type="number" name="retention_days" value="{$retention}" min="1" required>
        <div class="hint">Messages older than this are deleted.</div>
      </div>
      <div>
        <label>Storage quota (MB)</label>
        <input type="number" name="storage_quota_mb" value="{$quotaMb}" min="1" required>
        <div class="hint">Budget for uploads + database.</div>
      </div>
    </div>

    <div class="row">
      <div>
        <label>Minimum retention (days)</label>
        <input type="number" name="retention_min_days" value="{$minDays}" min="1" required>
      </div>
      <div>
        <label>Maximum retention (days)</label>
        <input type="number" name="retention_max_days" value="{$maxDays}" min="1" required>
      </div>
    </div>
    <div class="hint">The adaptive engine never goes outside these bounds.</div>

    <div class="row">
      <div>
        <label>Target usage (%)</label>
        <input type="number" name="storage_target_pct" value="{$targetPct}" min="10" max="99" required>
        <div class="hint">Adaptive mode aims for this fill level.</div>
      </div>
      <div>
        <label>Check every (hours)</label>
        <input type="number" name="maintenance_hours" value="{$maintHours}" min="1" required>
        <div class="hint">Maintenance runs at most this often, triggered by chat polling.</div>
      </div>
    </div>

    <button type="submit">Save settings</button>
  </form>
</div>

<div class="card">
  <h2>Maintenance</h2>
  <p class="hint">Purge expired messages now and recalculate the retention window.</p>
	  <form method="post">
	    <input type="hidden" name="action" value="run_maintenance">
	    <input type="hidden" name="csrf_token" value="{$csrfToken}">
    <button type="submit" class="ghost">Run maintenance now</button>
  </form>
</div>

<div class="card">
  <h2>Admin password</h2>
	  <form method="post">
	    <input type="hidden" name="action" value="change_password">
	    <input type="hidden" name="csrf_token" value="{$csrfToken}">
    <label>New password</label>
    <input type="password" name="new_password" required>
    <div class="hint">Minimum 8 characters.</div>
    <button type="submit" class="ghost">Change password</button>
  </form>
</div>

<div class="foot">TATA Chat &middot; admin.php</div>
HTML;

page('TATA Chat Admin', $body);
