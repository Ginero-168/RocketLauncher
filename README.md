# Rocket Launcher - TATA Extension

Adobe Illustrator CEP 11 extension with team chat feature.

## Repository
- Frontend: `js/`, `index.html`, `css/`, `CSXS/`
- Chat backend: `chat-backend/`

## Auto-Deploy Chat Backend to Hostinger

This repo includes a GitHub Actions workflow (`.github/workflows/deploy-chat-backend.yml`) that deploys the `chat-backend/` folder to Hostinger shared hosting via FTP every time you push to `main`.

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Example | Description |
|---|---|---|
| `FTP_SERVER` | `ftp.yourdomain.com` | Your Hostinger FTP server |
| `FTP_USERNAME` | `u123456789` | Hostinger FTP username |
| `FTP_PASSWORD` | `your-ftp-password` | Hostinger FTP password |
| `FTP_REMOTE_DIR` | `/public_html/chat-backend/` | Target directory on Hostinger |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_NAME` | `u123456789_tata_chat` | MySQL database name |
| `DB_USER` | `u123456789_tata_chat` | MySQL username |
| `DB_PASS` | `your-db-password` | MySQL password |
| `CHAT_ROOM_PASSWORD` | *(optional)* | Leave empty for public room |
| `CLEANUP_DAYS` | `30` | Auto-delete messages older than N days |

### Hostinger Setup

1. **Create MySQL database** in hPanel → Databases → MySQL Databases
2. **Run setup once**: Visit `https://yourdomain.com/chat-backend/setup.php` in your browser to create the `chat_messages` table
3. **Delete `setup.php` after first run** for security

### Manual Backend Setup (without Actions)

See `chat-backend/README.md` for manual upload instructions.

## Local Development

```bash
npm install
npm test -- --runInBand
```

## Extension Installation

Copy the entire repo folder to:

```
/Library/Application Support/Adobe/CEP/extensions/TATA
```

Then create `js/config.local.json`:

```json
{
    "CHAT_BACKEND_URL": "https://yourdomain.com/chat-backend",
    "CHAT_ROOM_PASSWORD": ""
}
```

## License
MIT
