# TATA Chat Backend

PHP + MySQL backend for the TATA Panel chat feature.

## Setup

### 1. Create a MySQL database
In **hPanel > Databases > MySQL Databases**:
- Create a database, e.g. `u123456789_tata_chat`
- Create a user and grant all privileges to this database
- Note the credentials

### 2. Configure and deploy
Add the required GitHub Secrets listed in the repository README, then push to `main`.
The workflow deploys `chat-backend/` over FTPS and writes the database credentials to
the deploy-managed `tata-env.php`. The schema is initialized or migrated on first use.

> Runtime credentials live in `chat-config.json`, not a PHP file. It is created from
> the deploy-managed configuration on first use. An earlier `config.php` kept
> disappearing from the Hostinger account between deploys; a plain data file is neither a
> deploy artifact nor a target for PHP malware scanning. `.htaccess` denies HTTP access to it.

The workflow does not deploy `setup.php`, `ping.php`, or `install-config.php`, and removes
those exact files from the remote backend if an earlier release left them there.

### 3. Set the admin password

Visit `https://yourdomain.com/chat-backend/admin.php`, enter the deployment's
`ADMIN_SETUP_TOKEN`, and set an admin password. The token is removed from the runtime
configuration after the password is created.

## Files

| File | Purpose |
|---|---|
| `chat-config.json` | Your database credentials, written by setup (do NOT commit) |
| `tata-env.php` | Deploy-generated database settings (do NOT commit) |
| `lib.php` | Shared helpers: config, settings, storage stats, retention engine |
| `setup.php` | Manual-only setup wizard; never deployed by Actions |
| `admin.php` | Admin dashboard: storage usage + retention settings |
| `ping.php` | Health/debug endpoint — delete after use |
| `rooms.php` | Create or join public/private rooms |
| `send.php` | Send text or panel-button messages |
| `poll.php` | Fetch new messages from the selected room |

## API

### Send text message
```
POST /chat-backend/send.php
Content-Type: application/json

{
  "username": "John",
  "content": "Hello!",
  "message_type": "text",
  "button_data": null
}
```

### Poll messages
```
GET /chat-backend/poll.php?since=0
X-Chat-Room: public
```

Private-room requests add:
```
X-Chat-Room: studio-a1b2c3d4
Authorization: Bearer your-room-password
```

### Create a private room
```
POST /chat-backend/rooms.php
Content-Type: application/json

{
  "action": "create",
  "name": "Studio",
  "password": "six-or-more-characters",
  "username": "John"
}
```

## Security notes
- `chat-config.json` contains your DB password — do NOT commit it to git
- The `.gitignore` in the parent repo already excludes it, and `.htaccess` denies HTTP access
- The deploy workflow never uploads or overwrites it
- Public Lounge is always open; private rooms use per-room password hashes
- Public Lounge messages are automatically deleted after 6 hours
- Private-room messages use the configured retention period
