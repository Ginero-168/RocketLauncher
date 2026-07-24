<?php
/**
 * TATA Chat - Database Schema Setup
 *
 * Run this script ONCE to create the messages table.
 * Visit: https://yourdomain.com/chat-backend/setup.php
 *
 * Delete this file after successful setup.
 */

require_once __DIR__ . '/config.php';

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

    $sql = "
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        message_type VARCHAR(20) NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        button_data JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($sql);
    echo "<h2>TATA Chat - Setup Complete</h2>";
    echo "<p>Table 'chat_messages' created successfully.</p>";
    echo "<p><strong>IMPORTANT:</strong> Delete this file (setup.php) now for security.</p>";
    echo "<p>Next step: Update your TATA extension config with your chat backend URL.</p>";

} catch (PDOException $e) {
    http_response_code(500);
    echo "<h2>Setup Failed</h2>";
    echo "<p>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p>Check your config.php credentials in hPanel > Databases > MySQL Databases.</p>";
}
