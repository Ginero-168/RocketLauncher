<?php
/**
 * TATA Chat - Shared Library
 *
 * Provides:
 * - Config loading and PDO connection
 * - Settings store (chat_settings table) with defaults
 * - Storage usage statistics
 * - Adaptive retention engine
 * - Throttled maintenance runner
 */

const TATA_SETTING_DEFAULTS = [
    // Current retention window in days. Adjusted automatically when adaptive mode is on.
    'retention_days'      => '30',
    // Hard bounds the adaptive engine will never cross.
    'retention_min_days'  => '3',
    'retention_max_days'  => '365',
    // Storage budget in megabytes (uploads + database).
    'storage_quota_mb'    => '500',
    // Adaptive engine aims to keep usage near this percentage of the quota.
    'storage_target_pct'  => '75',
    // Turn the adaptive engine on/off. Retention stays fixed when off.
    'adaptive_enabled'    => '1',
    // How often maintenance may run, in hours.
    'maintenance_hours'   => '6',
    // Bookkeeping, written by the maintenance runner.
    'last_maintenance_at' => '',
    'last_adjust_reason'  => '',
    // bcrypt hash for the admin panel. Empty means "not configured yet".
    'admin_password_hash' => '',
];

function tata_config_path(): string
{
    return __DIR__ . '/config.php';
}

function tata_require_config(): void
{
    if (!file_exists(tata_config_path())) {
        throw new RuntimeException('Server config missing');
    }
    require_once tata_config_path();
}

function tata_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    tata_require_config();
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET,
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    return $pdo;
}

function tata_ensure_schema(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS chat_settings (
            setting_key VARCHAR(50) PRIMARY KEY,
            setting_value TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

/**
 * Load all settings, filling in defaults for anything not stored yet.
 */
function tata_settings(PDO $pdo, bool $refresh = false): array
{
    static $cache = null;
    if ($cache !== null && !$refresh) {
        return $cache;
    }

    tata_ensure_schema($pdo);
    $stored = [];
    foreach ($pdo->query('SELECT setting_key, setting_value FROM chat_settings') as $row) {
        $stored[$row['setting_key']] = $row['setting_value'];
    }

    $cache = array_merge(TATA_SETTING_DEFAULTS, $stored);

    // config.php CLEANUP_DAYS seeds retention_days on first run only.
    if (!isset($stored['retention_days']) && defined('CLEANUP_DAYS')) {
        $cache['retention_days'] = (string)(int)CLEANUP_DAYS;
    }

    return $cache;
}

function tata_setting(PDO $pdo, string $key, $fallback = null)
{
    $settings = tata_settings($pdo);
    return $settings[$key] ?? $fallback;
}

function tata_set_setting(PDO $pdo, string $key, string $value): void
{
    tata_ensure_schema($pdo);
    $stmt = $pdo->prepare('
        INSERT INTO chat_settings (setting_key, setting_value)
        VALUES (:k, :v)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    ');
    $stmt->execute([':k' => $key, ':v' => $value]);
    tata_settings($pdo, true);
}

function tata_set_settings(PDO $pdo, array $pairs): void
{
    foreach ($pairs as $key => $value) {
        tata_set_setting($pdo, $key, (string)$value);
    }
}

// ==========================================
// Storage statistics
// ==========================================

function tata_uploads_dir(): string
{
    return __DIR__ . '/uploads';
}

/**
 * Total bytes used by uploaded images.
 */
function tata_uploads_bytes(): int
{
    $dir = tata_uploads_dir();
    if (!is_dir($dir)) {
        return 0;
    }

    $total = 0;
    foreach (new DirectoryIterator($dir) as $file) {
        if ($file->isFile() && !in_array($file->getFilename(), ['.htaccess', 'index.html'], true)) {
            $total += $file->getSize();
        }
    }
    return $total;
}

/**
 * Bytes used by the chat tables (data + indexes) as reported by MySQL.
 */
function tata_db_bytes(PDO $pdo): int
{
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(data_length + index_length), 0) AS bytes
        FROM information_schema.TABLES
        WHERE table_schema = :db AND table_name IN ('chat_messages', 'chat_settings')
    ");
    $stmt->execute([':db' => DB_NAME]);
    $row = $stmt->fetch();
    return (int)($row['bytes'] ?? 0);
}

/**
 * Snapshot of everything the admin dashboard needs to show.
 */
function tata_storage_stats(PDO $pdo): array
{
    $settings = tata_settings($pdo);
    $quotaBytes = max(1, (int)$settings['storage_quota_mb']) * 1024 * 1024;

    $uploadBytes = tata_uploads_bytes();
    $dbBytes = tata_db_bytes($pdo);
    $totalBytes = $uploadBytes + $dbBytes;

    $counts = $pdo->query("
        SELECT
            COUNT(*) AS total,
            SUM(message_type = 'image') AS images,
            MIN(created_at) AS oldest,
            MAX(created_at) AS newest
        FROM chat_messages
    ")->fetch() ?: [];

    return [
        'upload_bytes' => $uploadBytes,
        'db_bytes'     => $dbBytes,
        'total_bytes'  => $totalBytes,
        'quota_bytes'  => $quotaBytes,
        'usage_pct'    => $quotaBytes > 0 ? ($totalBytes / $quotaBytes) * 100 : 0,
        'free_bytes'   => max(0, $quotaBytes - $totalBytes),
        'message_count' => (int)($counts['total'] ?? 0),
        'image_count'  => (int)($counts['images'] ?? 0),
        'oldest_message' => $counts['oldest'] ?? null,
        'newest_message' => $counts['newest'] ?? null,
    ];
}

function tata_format_bytes(int $bytes): string
{
    if ($bytes >= 1024 * 1024 * 1024) {
        return round($bytes / (1024 * 1024 * 1024), 2) . ' GB';
    }
    if ($bytes >= 1024 * 1024) {
        return round($bytes / (1024 * 1024), 1) . ' MB';
    }
    if ($bytes >= 1024) {
        return round($bytes / 1024, 1) . ' KB';
    }
    return $bytes . ' B';
}

// ==========================================
// Retention
// ==========================================

/**
 * Delete messages older than $days, removing their image files first.
 * Returns the number of deleted rows.
 */
function tata_purge_older_than(PDO $pdo, int $days): int
{
    if ($days <= 0) {
        return 0;
    }

    $stmt = $pdo->prepare('
        SELECT id, file_path FROM chat_messages
        WHERE created_at < DATE_SUB(NOW(), INTERVAL :days DAY)
    ');
    $stmt->bindValue(':days', $days, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    if (!$rows) {
        return 0;
    }

    foreach ($rows as $row) {
        if (!empty($row['file_path'])) {
            @unlink(__DIR__ . '/' . $row['file_path']);
        }
    }

    $del = $pdo->prepare('
        DELETE FROM chat_messages
        WHERE created_at < DATE_SUB(NOW(), INTERVAL :days DAY)
    ');
    $del->bindValue(':days', $days, PDO::PARAM_INT);
    $del->execute();

    return $del->rowCount();
}

/**
 * Delete oldest messages until usage falls under the quota.
 * Safety net for when even the minimum retention window is too generous.
 */
function tata_purge_to_fit(PDO $pdo, int $quotaBytes, int $batch = 50): int
{
    $deleted = 0;
    for ($i = 0; $i < 40; $i++) { // hard cap on iterations
        $stats = tata_storage_stats($pdo);
        if ($stats['total_bytes'] <= $quotaBytes) {
            break;
        }

        $stmt = $pdo->prepare('SELECT id, file_path FROM chat_messages ORDER BY id ASC LIMIT :n');
        $stmt->bindValue(':n', $batch, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        if (!$rows) {
            break;
        }

        $ids = [];
        foreach ($rows as $row) {
            $ids[] = (int)$row['id'];
            if (!empty($row['file_path'])) {
                @unlink(__DIR__ . '/' . $row['file_path']);
            }
        }

        $pdo->exec('DELETE FROM chat_messages WHERE id IN (' . implode(',', $ids) . ')');
        $deleted += count($ids);
    }
    return $deleted;
}

/**
 * Compute the retention window that should keep usage near the target percentage.
 *
 * The estimate is proportional: if we are at 150% of the target, we need roughly
 * two-thirds of the current window. Growth is damped to 1.5x per run so a quiet
 * week does not immediately swing retention to the maximum.
 */
function tata_suggest_retention(array $settings, array $stats): array
{
    $current = max(1, (int)$settings['retention_days']);
    $min = max(1, (int)$settings['retention_min_days']);
    $max = max($min, (int)$settings['retention_max_days']);
    $targetPct = min(99, max(10, (float)$settings['storage_target_pct']));
    $usagePct = (float)$stats['usage_pct'];

    if ($usagePct <= 0.5) {
        // Practically empty: drift toward the maximum instead of dividing by ~0.
        $suggested = min($max, (int)ceil($current * 1.5));
        $reason = 'Storage nearly empty, increasing retention';
        return [$suggested, $reason, $usagePct];
    }

    $ratio = $targetPct / $usagePct;
    // Damp growth so retention rises gradually but can shrink quickly when needed.
    $ratio = min($ratio, 1.5);
    $suggested = (int)round($current * $ratio);
    $suggested = max($min, min($max, $suggested));

    if ($suggested < $current) {
        $reason = sprintf('Usage %.1f%% above target %.0f%%, reducing retention', $usagePct, $targetPct);
    } elseif ($suggested > $current) {
        $reason = sprintf('Usage %.1f%% below target %.0f%%, increasing retention', $usagePct, $targetPct);
    } else {
        $reason = sprintf('Usage %.1f%% near target %.0f%%, retention unchanged', $usagePct, $targetPct);
    }

    return [$suggested, $reason, $usagePct];
}

/**
 * Purge expired messages and, when adaptive mode is on, retune the retention window.
 * Returns a report array; safe to call often.
 */
function tata_run_maintenance(PDO $pdo, bool $force = false): array
{
    $settings = tata_settings($pdo, true);

    $intervalHours = max(1, (int)$settings['maintenance_hours']);
    $last = $settings['last_maintenance_at'];
    if (!$force && $last) {
        $elapsed = time() - strtotime($last);
        if ($elapsed < $intervalHours * 3600) {
            return ['ran' => false, 'reason' => 'throttled'];
        }
    }

    $retention = max(0, (int)$settings['retention_days']);
    $purged = tata_purge_older_than($pdo, $retention);

    $report = [
        'ran' => true,
        'purged' => $purged,
        'retention_before' => $retention,
        'retention_after' => $retention,
        'adjusted' => false,
        'reason' => '',
    ];

    if ((int)$settings['adaptive_enabled'] === 1) {
        $stats = tata_storage_stats($pdo);
        [$suggested, $reason, $usagePct] = tata_suggest_retention($settings, $stats);

        if ($suggested !== $retention) {
            tata_set_setting($pdo, 'retention_days', (string)$suggested);
            // Apply the new, shorter window immediately so the dashboard reflects reality.
            if ($suggested < $retention) {
                $report['purged'] += tata_purge_older_than($pdo, $suggested);
            }
            $report['retention_after'] = $suggested;
            $report['adjusted'] = true;
        }
        $report['reason'] = $reason;
        $report['usage_pct'] = $usagePct;
        tata_set_setting($pdo, 'last_adjust_reason', $reason);

        // Last resort: still over quota even at the new window.
        $stats = tata_storage_stats($pdo);
        if ($stats['total_bytes'] > $stats['quota_bytes']) {
            $report['force_purged'] = tata_purge_to_fit($pdo, $stats['quota_bytes']);
        }
    }

    tata_set_setting($pdo, 'last_maintenance_at', date('Y-m-d H:i:s'));
    return $report;
}
