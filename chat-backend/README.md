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
- The `chat_messages` table
- The `uploads/` directory for image uploads

**Delete `setup.php` and `ping.php` after setup is complete for security.**

## Files

| File | Purpose |
|---|---|
| `config.example.php` | Template config — used by the setup wizard |
| `config.php` | Your actual config (do NOT commit this) |
| `setup.php` | One-time setup wizard — delete after use |
| `ping.php` | Health/debug endpoint — delete after use |
| `send.php` | POST endpoint to send a message or upload an image |
| `poll.php` | GET endpoint to fetch new messages |

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
