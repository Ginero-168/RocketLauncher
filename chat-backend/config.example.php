<?php
/**
 * TATA Chat - Database Configuration
 *
 * Copy this file to "config.php" and fill in your Hostinger MySQL credentials.
 * You can find these in hPanel > Databases > MySQL Databases.
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456789_tata_chat');
define('DB_USER', 'u123456789_tata_chat');
define('DB_PASS', 'your_password_here');
define('DB_CHARSET', 'utf8mb4');

/**
 * Room password (optional)
 * Set to empty string to allow anyone with the URL to chat.
 * Set to a string to require this password in every request.
 */
define('ROOM_PASSWORD', '');

/**
 * Auto-cleanup: delete messages older than this many days.
 * Set to 0 to disable auto-cleanup.
 */
define('CLEANUP_DAYS', 30);
