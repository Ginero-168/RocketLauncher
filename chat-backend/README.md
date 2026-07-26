# TATA Chat Backend

PHP + MySQL backend for the TATA Panel chat feature.
Upload this folder to your Hostinger shared hosting.

## Setup (3 steps)

### 1. Create a MySQL database
In **hPanel > Databases > MySQL Databases**:
- Create a database, e.g. `u123456789_tata_chat`
- Create a user and grant all privileges to this database
- Note the credentials

### 2. Configure
- Copy `config.example.php` to `config.php`
- Edit `config.php` with your MySQL credentials
- (Optional) Set `ROOM_PASSWORD` to restrict access

### 3. Verify deploy
Visit in your browser:
```
https://yourdomain.com/chat-backend/ping.php
```
You should see JSON with `"config_exists": true` and `"db_connected": true`.

### 4. Run setup
Visit in your browser:
```
https://yourdomain.com/chat-backend/setup.php
```
You should see "Table 'chat_messages' created successfully."

**Delete `setup.php` and `ping.php` after setup is complete for security.**

## Files

| File | Purpose |
|---|---|
| `config.example.php` | Template config — copy to `config.php` |
| `config.php` | Your actual config (do NOT commit this) |
| `setup.php` | One-time table creation — delete after use |
| `ping.php` | Health/debug endpoint — delete after use |
| `send.php` | POST endpoint to send a message |
| `poll.php` | GET endpoint to fetch new messages |

## API

### Send message
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

### Poll messages
```
GET /chat-backend/poll.php?since=0&password=
```

## Security notes
- `config.php` contains your DB password — do NOT commit it to git
- The `.gitignore` in the parent repo already excludes `config.php`
- For production, consider enabling `ROOM_PASSWORD`
- Messages auto-delete after 30 days (configurable in `config.php`)
