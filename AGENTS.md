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
- Modular IIFE modules in `js/` (load order is the `<script>` list at the end of `index.html`):
  - `core.js`, `storage.js`, `sanitize.js`, `state.js`, `modals.js`, `tabs.js`, `host.js` — shared infrastructure
  - `grid.js`, `scripts.js`, `context-menu.js`, `hotkeys.js`, `script-transfer.js` — Tool tab
  - `scripting.js` — editor and Replicate AI assistant (CodeMirror is loaded on first use)
  - `color-tools.js`, `graphic-styles.js`, `keep.js` — Color, Style and Keep tabs
  - `market.js` — Marketplace; `settings.js`, `updates.js` — settings dialog and update check
  - `main.js`, `bootstrap.js` — startup
- `js/host.js` is the single ExtendScript execution gateway (use `TATA.host.run/evalFile/evalCode`).
- `jsx/hostscript.jsx` contains Illustrator-side `TATA.run` handlers.
- Team chat was removed in 3.1.0; its backend folder and deploy workflow are gone from the repository.

## Security Notes
- Never commit `market-backend/config.json` or anything under `market-backend/storage/` except the tracked placeholders.
- User-provided JSX/ExtendScript in grid/scripting is intentionally executed directly; sandboxing would require a separate architectural change.

## CEP / Node
- CEP panel uses Node.js (`--enable-nodejs`, `--mixed-context`).
- `window.require('fs')` and `window.require('path')` are used in several modules.
- `SystemPath.EXTENSION` from `CSInterface` is the canonical extension root.

## Common Pitfalls
- `TATA` namespace is shared across modules; `host.js` must load before modules that call `TATA.host`.

## Recovered source (3.1.0)
- The 3.1.0 working tree was lost and rebuilt from the signed ZXP. `css/`, `js/`, `jsx/`, `CSXS/` and `index.html`
  are the shipped 3.1.0 files. Tests for the modules added in 3.1.0 were not recovered.

## Marketplace site (`market-backend/`)
- PHP site behind the Marketplace tab (`js/market.js`, default URL https://rl.kirita.me). Merged in from the former
  `Ginero-168/RocketLauncher-backend` repository with its history (git subtree).
- Tests: `cd market-backend && php tests/run.php` (PHP CLI with curl).
- Deploy: `deploy-market-backend.yml` republishes this folder as the root of the `market-deploy` branch, which
  Hostinger pulls. Never point Hostinger at `main`. `config.json` and `storage/` data exist only on the server.
- The folder is excluded from the ZXP in `release-extension.yml`; keep it that way.
