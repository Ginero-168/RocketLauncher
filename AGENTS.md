# Agent Notes - Rocket Launcher (TATA) Extension

## Project Identity
- **Bundle ID:** `com.tata.pro`
- **Product Name:** Rocket Launcher
- **Version:** 3.1.0
- **Location:** `/Library/Application Support/Adobe/CEP/extensions/TATA/`
- **Panels:** `index.html` only. Color tools and the SVG keeper are tabs inside it since 3.1.0.

## Build / Test Commands
- Install: `npm ci` (the lockfile is committed)
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
  - `census.js` — the Selector tab: document census (groups objects by stroke, fill and font; click selects the set). No AI, no
    network. Host side: `censusScan` / `censusSelect` / `censusFix` at the end of `jsx/hostscript.jsx`, which keep
    object references in the ExtendScript engine between calls and answer `{"error":"stale"}` when the document changed.
  - `script-scan.js` — static scan of a script for file, network and system access; `script-review.js` — the
    "before you install" dialog for Marketplace scripts. The scan reads text only; keep it conservative (anything
    it cannot read is reported, never passed as clean).
  - `main.js`, `bootstrap.js` — startup
- The strip has three tabs: **Tool**, **Selector**, **Library** (plus Market in the footer).
  - Tool: the button grid. The script editor and the AI are one **workbench** inside it (`#workbench` holding
    `#tab_editor` and `#tab_ai`), shown in place of the grid while `body.workbench-open` is set. The workbench shows
    one full-height view at a time, Code or AI (`#workbench[data-view]`), picked by the switch in its bar.
    `TATA.activateTab('tab_editor' | 'tab_ai')` opens it on that view; `TATA.activateTab('tab_button')` returns to
    the buttons. `TATA.workbench.isOpen()` and `TATA.workbench.view()` ask.
  - `editor-tools.js` adds the editing toolbar (undo/redo, snippets, comment, re-indent, syntax check, copy,
    paste-over, clear, font size, wrap). It attaches when `scripting.js` fires `tata:editor-ready`. The syntax check
    compiles with Node's `vm.Script` and never runs the code.
    It also owns the Recent code dialog (`#recent_code_modal`); `scripting.js` still draws the list and the count.
  - Selector (`#tab_selector`): the document census. It surveys again each time the tab is shown.
  - Library: Style, Color and Keep. They keep their own panels and ids (`tab_styles`, `tab_colors`, `tab_keep`);
    the one strip button `#tabbtn_library` points its `data-tab` at whichever is in use, and the `.subtabs` chips
    switch between them. `body[data-tab]` is still the section id, so `TATA.activateTab('tab_keep')` etc. work.
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
- Which code must be confirmed before each run is decided only by `TATA.trackedSource` /
  `TATA.shouldConfirmJsxRun` in `sanitize.js`. Do not copy the list of sources into another module.
- `tests/setup.js` gives every test file a throwaway home folder; `persist.js` would otherwise read and write the
  developer's real panel data.

## Recovered source (3.1.0)
- The 3.1.0 working tree was lost and rebuilt from the signed ZXP. `css/`, `js/`, `jsx/`, `CSXS/` and `index.html`
  are the shipped 3.1.0 files. Tests for the modules added in 3.1.0 were not recovered; sanitize, script-review,
  the editor save, Marketplace timeouts, the Replicate client and the jsx JSON fallback have tests again.
  keep, graphic-styles, hotkeys, settings, updates and `jsx/hostscript.jsx` still have none.

## Marketplace site (`market-backend/`)
- PHP site behind the Marketplace tab (`js/market.js`, default URL https://rl.kirita.me). Merged in from the former
  `Ginero-168/RocketLauncher-backend` repository with its history (git subtree).
- Tests: `cd market-backend && php tests/run.php` (PHP CLI with curl).
- Remix: an upload may send `parent` (the item it was made from). The server copies the credit chain onto the new
  item and refuses an unchanged copy. The panel remembers where each installed script came from in
  `tata_market_origin` and sends `parent` when that script is uploaded.
- Deploy: `deploy-market-backend.yml` republishes this folder as the root of the `market-deploy` branch, which
  Hostinger pulls. Never point Hostinger at `main`. `config.json` and `storage/` data exist only on the server.
- The folder is excluded from the ZXP in `release-extension.yml`; keep it that way.
