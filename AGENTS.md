# Agent Notes - Rocket Launcher (TATA) Extension

## Project Identity
- **Bundle ID:** `com.tata.pro`
- **Product Name:** Rocket Launcher
- **Version:** 2.1.0
- **Location:** `/Library/Application Support/Adobe/CEP/extensions/TATA/`
- **Panels:** `index.html` (main), `colors.html` (color tools), `keep.html` (SVG keeper)

## Build / Test Commands
- Run tests: `npm test -- --runInBand`
- Syntax check all JS: `for f in js/*.js tests/*.js; do node --check "$f"; done`
- Whitespace check: `git diff --check`

## Architecture
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
  - `setup.php` is a one-time browser wizard that writes `config.php` and creates the tables.
  - The deploy workflow never uploads or overwrites `config.php`.

## Security Notes
- Never commit `js/config.local.json`.
- Never commit `chat-backend/config.php` (contains MySQL credentials).
- User-provided JSX/ExtendScript in grid/scripting is intentionally executed directly; sandboxing would require a separate architectural change.

## CEP / Node
- CEP panel uses Node.js (`--enable-nodejs`, `--mixed-context`).
- `window.require('fs')` and `window.require('path')` are used in several modules.
- `SystemPath.EXTENSION` from `CSInterface` is the canonical extension root.

## Common Pitfalls
- `main.js` is loaded by both `index.html` and `colors.html`; the `isColorPanel` branch selects behavior.
- `keep.html` is standalone and loads `js/core.js`, `js/host.js`, then `js/keep.js`.
- `TATA` namespace is shared across modules; `host.js` must load before modules that call `TATA.host`.
