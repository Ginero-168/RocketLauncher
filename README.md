# Rocket Launcher - TATA Extension

Adobe Illustrator CEP 11 extension with team chat feature.

## Repository
- Frontend: `js/`, `index.html`, `css/`, `CSXS/`
- Chat backend: `chat-backend/`

## Auto-Deploy Chat Backend to Hostinger

This repo includes a GitHub Actions workflow (`.github/workflows/deploy-chat-backend.yml`) that deploys the `chat-backend/` folder to Hostinger shared hosting over FTPS every time you push to `main`.

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
| `ADMIN_SETUP_TOKEN` | `random-long-secret` | Required once when claiming the admin panel |
### Hostinger Setup

1. **Create MySQL database** in hPanel → Databases → MySQL Databases
2. **Add every required GitHub Secret** above
3. **Push to `main`** to deploy and initialize/migrate the schema on first use
4. **Set the admin password**: Visit `https://yourdomain.com/chat-backend/admin.php`, enter `ADMIN_SETUP_TOKEN`, and choose a password

The workflow deliberately does not deploy `setup.php`, `ping.php`, or the retired
`install-config.php`, and removes those exact files from the remote backend if found.

### Admin panel

`chat-backend/admin.php` shows storage usage (images + database) against a quota and tunes the
message retention window automatically to stay near a target fill level. See
`chat-backend/README.md` for the full settings reference.

### Manual Backend Setup (without Actions)

See `chat-backend/README.md` for manual upload instructions.

## Manual Updates

Releases are distributed as signed ZXP files through GitHub Releases. The extension detects
macOS/Windows and shows the matching **Download ZXP** link in **Settings → Extension Updates**;
it never overwrites its own files automatically.

To publish a release:

```bash
git tag v3.0.5
git push origin v3.0.5
```

GitHub Actions validates that the tag matches `CSXS/manifest.xml`, runs the test suite, and creates:

- `RocketLauncher-v3.0.5-macos.zxp`
- `RocketLauncher-v3.0.5-macos.sha256`
- `RocketLauncher-v3.0.5-windows.zxp`
- `RocketLauncher-v3.0.5-windows.sha256`

The ZXP is signed with the team's self-signed certificate. The certificate file and password are
kept in GitHub Secrets and are never included in the release.

### Configure signing once

Create a self-signed certificate with Adobe's `ZXPSignCmd`:

```bash
ZXPSignCmd -selfSignedCert US NY RocketLauncher RocketLauncher \
  'choose-a-strong-password' RocketLauncher.p12
```

Base64-encode `RocketLauncher.p12` and add these GitHub Actions secrets:

```text
ZXP_CERT_P12_B64
ZXP_CERT_PASSWORD
```

Keep the `.p12` file and password backed up securely. The same certificate must be reused for
future releases so existing installations recognize the publisher.

To install manually:

1. Download the ZXP matching the user's operating system.
2. Verify the SHA-256 checksum.
3. Install it with a ZXP installer/ExManCmd compatible with Adobe CEP.
4. Restart Illustrator and confirm the version in Settings.

The release package excludes local development overrides such as `js/config.local.json`. The
production Chat backend URL is included as a public default in `js/config.js`, so users do not
need to create a local config file for normal Chat usage. Server credentials remain on Hostinger
and are never included in the extension.

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
    "CHAT_BACKEND_URL": "https://yourdomain.com/chat-backend"
}
```

## License
MIT
