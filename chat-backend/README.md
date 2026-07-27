# TATA Chat Backend

PHP + MySQL backend for the TATA Panel chat feature.

## Setup (3 steps)

### 1. Create a MySQL database
In **hPanel > Databases > MySQL Databases**:
- Create a database, e.g. `u123456789_tata_chat`
- Create a user and grant all privileges to this database
- Note the credentials

### 2. Deploy files
Push this repo to `main`; the GitHub Actions workflow deploys `chat-backend/` to Hostinger automatically.

### 3. Run the setup wizard
Visit in your browser:
```
https://yourdomain.com/chat-backend/setup.php
```
Enter your MySQL credentials and click **Create Config & Table**.

The wizard creates:
- `config.php` with your database settings
- The `chat_messages` and `chat_settings` tables
- The `uploads/` directory for image uploads

**Delete `setup.php` and `ping.php` after setup is complete for security.**

### 4. Set the admin password

Visit `https://yourdomain.com/chat-backend/admin.php` **immediately after deploying** and set an
admin password. Until a password is set, the first visitor to that URL can claim the panel.

## Files

| File | Purpose |
|---|---|
| `config.example.php` | Template config — used by the setup wizard |
| `config.php` | Your actual config (do NOT commit this) |
| `lib.php` | Shared helpers: settings, storage stats, retention engine |
| `setup.php` | One-time setup wizard — delete after use |
| `admin.php` | Admin dashboard: storage usage + retention settings |
| `ping.php` | Health/debug endpoint — delete after use |
| `send.php` | POST endpoint to send a message or upload an image |
| `poll.php` | GET endpoint to fetch new messages |

## Storage management

The admin panel tracks total usage (uploaded images + database tables) against a configurable
quota and tunes the retention window to keep usage near a target fill level.

| Setting | Meaning |
|---|---|
| `retention_days` | Messages older than this are deleted. Auto-adjusted when adaptive mode is on. |
| `retention_min_days` / `retention_max_days` | Bounds the adaptive engine never crosses. |
| `storage_quota_mb` | Budget for uploads + database. |
| `storage_target_pct` | Fill level the adaptive engine aims for (default 75%). |
| `maintenance_hours` | Minimum interval between maintenance runs. |
| `adaptive_enabled` | Turn auto-tuning on/off. |

### How adaptive retention works

Maintenance runs at most once per `maintenance_hours`, triggered by normal chat polling:

1. Delete messages older than `retention_days` (and their image files).
2. Measure usage as a percentage of the quota.
3. Scale retention by `target_pct / usage_pct`, so 150% of target roughly two-thirds the window.
   Growth is damped to 1.5x per run so a quiet week does not immediately jump to the maximum.
4. Clamp the result to `[retention_min_days, retention_max_days]`.
5. If usage still exceeds the quota, delete the oldest messages until it fits.

Uploads are rejected with HTTP 507 when they would push usage past the quota.

## API

### Send text message
```
POST /chat-backend/send.php
Content-Type: application/json

{
  "username": "John",
  "content": "Hello!",
  "message_type": "text",
  "button_data": null,
  "password": ""
}
```

### Send image
```
POST /chat-backend/send.php
Content-Type: multipart/form-data

username=John
message_type=image
password=
content=Optional caption
image=<binary image file>
```

### Poll messages
```
GET /chat-backend/poll.php?since=0&password=
```

## Security notes
- `config.php` contains your DB password — do NOT commit it to git
- The `.gitignore` in the parent repo already excludes `config.php`
- The deploy workflow never overwrites `config.php`
- For production, consider enabling `ROOM_PASSWORD`
- Messages (and their image files) auto-delete after 30 days (configurable in `config.php`)
