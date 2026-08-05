# Changelog

All notable changes to the Rocket Launcher extension will be documented in this file.

## [3.0.0] - 2026-08-04

### Changed
- **Brutalist Paper UI Refresh**: Unified the entire interface around a warm paper canvas, black ink structure, and standard bright accent palette.
  - Tabs, modals, settings, hotkeys, grid, `colors.html`, and `keep.html` all restyled for consistent contrast and borders.
  - Hotkey slots now touch with no gaps, using shared 2px outlines.
  - Default scripts no longer use random nth-child colors; unassigned buttons default to gray.
  - Color presets unified to the standard bright palette across script modal, color tools, context menu, chat, and custom color slots.
- **Version Bump**: `package.json`, `CSXS/manifest.xml`, `js/main.js`, `README.md`, and `AGENTS.md` aligned to v3.0.0.

## [3.0.1] - 2026-08-04

### Added
- **Button Color Presets**: Added purple (`#9d95ff`) and sakura pink (`#ff9ecd`) to all color pickers.
- **Missing Assets**: Added untracked `Logo2.png` and `Rocket_GIF.gif` so they are included in the signed ZXP.

### Changed
- Color swatch rows now wrap when they exceed available width.
- `CSXS/manifest.xml`, `package.json`, `js/main.js`, `README.md`, `AGENTS.md`, and release workflow default aligned to v3.0.1.

## [3.0.2] - 2026-08-04

### Changed
- **Panel Performance**: chat polling, eyedropper, GIF, and CodeMirror now pause/start based on tab/panel visibility.
- **Color Wheel**: cached by lightness.
- **Storage Cache**: `TATA.getStored`/`setStored` helpers for hot localStorage keys.
- **Version**: aligned all manifests and docs to v3.0.2.

## [3.0.3] - 2026-08-04

### Changed
- **Incremental Grid/Hotkey Render**: reuse existing DOM nodes instead of wiping innerHTML on every render.
- **Hotkey Click Delegation**: bar-level delegation for remove and trigger actions.
- **Theme Cache**: `tata_theme` reads/writes use `TATA.getStored`/`setStored`; default light.
- **Version**: aligned all manifests and docs to v3.0.3.

## [3.0.4] - 2026-08-04

### Fixed
- **Critical Init Error**: `querySelector` failed on `:has()` selector in older CEP Chromium.
  - Replaced with standard grid ID lookup and `closest('.script-section')`.
- **Version**: aligned all manifests and docs to v3.0.4.

## [2.2.0] - 2026-07-22

### Added
- **Team Chat**: New "Chat" tab in main panel for private team communication
  - PHP + MySQL backend on Hostinger shared hosting (`chat-backend/`)
  - Polls every 10 seconds (non-real-time, suitable for shared hosting)
  - No login required — just enter your name to join
  - Share TATA button configs to chat (right-click → "Share to Chat")
  - Import shared buttons from chat with one click
  - Code block rendering with triple-backtick syntax
  - Auto-cleanup of messages older than 30 days
  - Config via `js/config.local.json` (`CHAT_BACKEND_URL`, `CHAT_ROOM_PASSWORD`)

## [2.1.1] - 2026-07-22

### Changed
- **CEP 11 Upgrade**: `CSXS/manifest.xml` now targets CEP 11.0 and Illustrator 2022+ (v25.3)
- **CEP 11 Modernization**: All panel JS modules converted to ES6+ syntax (const/let, arrows, template literals, includes/startsWith, for-of where safe)
- **Requirements**: README updated to Illustrator 2022+ / CEP 11.0

### Removed
- Deleted `js/flow.js` (dead Flow Builder module, never loaded)
- Removed unused TATA exports and aliases from `core.js`, `state.js`, `main.js`, `grid.js`, `tabs.js`, `context-menu.js`, and `color-tools.js`

## [2.1.0] - 2026-07-22

### Added
- **Modular Architecture**: Refactored codebase into separate modules
  - `js/grid.js`, `js/scripts.js`, `js/color-tools.js`, `js/script-transfer.js`, `js/host.js`
  - `js/context-menu.js`, `js/hotkeys.js`, `js/state.js`
- **Host Execution Gateway**: Centralized `TATA.host` for all ExtendScript calls
- **Regression Tests**: Jest test suites for grid, scripts, context-menu, state, script-transfer, host, and color-tools
- **Version Consistency**: Aligned `CSXS/manifest.xml`, `package.json`, and `README.md` to v2.1.0

### Changed
- **Code Organization**: Removed dead code and legacy layout logic from `main.js`
- **CSS Cleanup**: Removed ~34 unused CSS class rules from `css/styles.css`
- **Script Load Order**: `js/host.js` loaded before dependent modules

### Removed
- Dead code: `setupDimension`, `setupSwift`, legacy `initDragLayout`, keeper and cleaner duplicates
- Unused CSS classes: shimmer, pulse, radio-group, validation variants, FAB styles, color modifier buttons

### Changed
- **Code Organization**: All functions moved from individual JSX files to `hostscript.jsx`
- **Dialogs**: All input dialogs now handled in `main.js` instead of separate JSX files
- **File Structure**: Simplified from 30+ files to 12 essential files

### Removed
- Deleted 18 unused legacy files (~143KB):
  - Old `Dimension.jsx` monolithic file
  - 14 individual JSX script files
  - 2 duplicate `json2.js` files
  - System file `.DS_Store`

### Fixed
- Dimension tool button now works correctly
- Improved error messages and user feedback
- Fixed function calls after refactoring to standalone utilities

---

## [2.0.0] - Previous

### Added
- Coolors architecture implementation
- Enhanced color harmony features
- Custom script support with AI integration

### Changed
- Major UI overhaul
- Performance improvements

---

## [1.x] - Original

### Added
- Initial TATA extension release
- Basic dimension tools
- Swift productivity scripts
- Color management features
- Keeper asset management
- Cleaner document hygiene tools
