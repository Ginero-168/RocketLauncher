# Agent Notes - Rocket Launcher (TATA) Extension

## Project Identity
- **Bundle ID:** `com.tata.pro`
- **Product Name:** Rocket Launcher
- **Version:** 3.1.0
- **Location:** `/Library/Application Support/Adobe/CEP/extensions/TATA/`
- **Panels:** `index.html` only. Color tools and the SVG keeper are tabs inside it since 3.1.0.

## Build / Test Commands
- Run tests: `npm test -- --runInBand`
- Syntax check all JS: `for f in js/*.js tests/*.js; do node --check "$f"; done`
- Whitespace check: `git diff --check`

## Architecture
- `js/persist.js` loads first. It restores panel data from, and mirrors every `tata_*` localStorage write to,
  `~/Library/Application Support/RocketLauncher/panel-data` (`%APPDATA%\\RocketLauncher\\panel-data` on Windows),
  because CEP keeps localStorage inside its cache folder. Keep using `localStorage` in modules; do not bypass it.
  Sign-in sessions and API tokens are deliberately not mirrored. A factory reset must call `TATA.persist.reset()`.
- Modular IIFE modules in `js/`:
  - `core.js`, `state.js`, `modals.js`, `tabs.js`, `host.js` — shared infrastructure
  - `grid.js`, `scripts.js`, `context-menu.js`, `hotkeys.js` — main panel
  - `scripting.js`, `ai-agent.js` — editor/AI
  - `color-tools.js`, `script-transfer.js` — extracted feature modules
  - `chat.js` — team chat (polls Hostinger PHP backend every 10s)
- `js/host.js` is the single ExtendScript execution gateway (use `TATA.host.run/evalFile/evalCode`).
- `jsx/hostscript.jsx` contains Illustrator-side `TATA.run` handlers.
- `js/config.js` loads public defaults and merges `js/config.local.json` (gitignored) for optional server features.
- `chat-backend/` contains PHP + MySQL backend files for the team chat feature (deployed to Hostinger by GitHub Actions).
  - `lib.php` is the shared backend library (settings store, storage stats, adaptive retention).
  - `admin.php` is the password-protected storage/retention dashboard.
  - `chat.js` supports text messages, button sharing/import, rooms, and display-name settings only.
  - `setup.php` is a one-time browser wizard that writes `chat-config.json` and creates the tables.
  - Credentials live in `chat-config.json`, not a PHP file: `config.php` repeatedly vanished from
    the Hostinger account between deploys. `lib.php` still migrates a legacy `config.php` if found.
  - The deploy workflow never uploads or overwrites the server config.

## Security Notes
- Never commit `js/config.local.json`.
- Never commit `chat-backend/chat-config.json` (contains MySQL credentials).
- User-provided JSX/ExtendScript in grid/scripting is intentionally executed directly; sandboxing would require a separate architectural change.

## CEP / Node
- CEP panel uses Node.js (`--enable-nodejs`, `--mixed-context`).
- `window.require('fs')` and `window.require('path')` are used in several modules.
- `SystemPath.EXTENSION` from `CSInterface` is the canonical extension root.

## Common Pitfalls
- `TATA` namespace is shared across modules; `host.js` must load before modules that call `TATA.host`.

## Recovered source (3.1.0)
- The 3.1.0 working tree was lost and rebuilt from the signed ZXP. `css/`, `js/`, `jsx/`, `CSXS/` and `index.html`
  are the shipped 3.1.0 files. The module list above, `chat-backend/`, the deploy/release workflows and `README.md`
  still describe 3.0.5 in places (chat and `ai-agent.js` no longer exist in the panel) and need a pass.
- The Marketplace tab (`js/market.js`) talks to https://rl.kirita.me, source in `Ginero-168/RocketLauncher-backend`.
