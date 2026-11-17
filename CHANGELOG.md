# Changelog

All notable changes to the Rocket Launcher extension will be documented in this file.

## 3.1.1 - 2026-11-17

The first release built from this repository rather than recovered from the 3.1.0 package. It replaces 3.1.0, so
the update check offers it to every 3.1.0 install.

### Security
- Marketplace scripts always ask before each run. Three ways around the confirmation are closed: code ending in
  `.jsx` being run as a file, the source being lost on export/import or on edit, and installing without the review
  dialog.
- While connecting to the Marketplace, the panel shows the connection code so it can be compared with the browser page.

### Removed
- 30 host functions in `jsx/hostscript.jsx` that nothing in the panel called (symbols, effects, appearance,
  the old clean and dimension entry points). `TATA.run` with `fitSelection`, `followWidth`, `embedAll`,
  `createPreview` and `generateColorPalette` still works for scripts saved from older versions.

### Fixed
- Update in the editor updates the button it was opened from instead of adding a second one.
- Selector: changing the scope during a survey no longer shows the other scope's results.
- Marketplace requests give up after 30 seconds instead of waiting until the panel is reloaded.
- Documents, layers or fonts with quotes or line breaks in their names no longer break the Selector survey on
  Illustrator versions without native JSON.
- An AI request the panel stops waiting for is cancelled at Replicate.
- Clearing the Illustrator/CEP cache no longer removes scripts, layout, hotkeys, the Keep index or custom colours.
  The panel now keeps a second copy in `~/Library/Application Support/RocketLauncher/panel-data`
  (`%APPDATA%\RocketLauncher\panel-data` on Windows) and restores it on the next start. One snapshot per key per
  day is kept (last 5). Sign-in sessions and the Replicate token are not copied.
- A full panel storage now shows an error instead of dropping the change silently.

### Added
- Editing toolbar in the Code view: undo and redo, ready-made snippets (document check, loops over selection,
  artboards, text, paths, a prompt, an RGB colour), comment toggle (also ⌘/), re-indent, a syntax check that marks
  the line and offers to hand the error to the AI, copy all, paste over everything, clear (undoable), font size and
  line wrapping. A status line shows the cursor position and line count.
- Selector tab: lists what the artboard or document holds, grouped by stroke colour and width, fill colour,
  and font and size. Clicking a group selects those objects in Illustrator. Small groups that sit within 15% of a
  much larger one ("near-misses", such as one 1.1pt stroke among 1pt strokes) are shown with a one-click fix.
  Works offline and without AI. Locked and hidden objects are counted but never selected.
- Before installing a Marketplace script the panel scans its code and shows whether it touches local files, the
  network or other programs, with the lines that caused each label. Network and system access need a tick first.
- Remix: a Marketplace script can be installed straight into the editor. Uploading an edited copy records which
  item it came from, and the credit chain is shown on the card, in the install dialog and on the website.
- Settings → Your data: shows whether the safe copy is active and opens its folder.

### Changed
- The editor and the AI are separate full-height views, switched with Code | AI at the top of the workbench.
  When the AI writes code the panel switches to Code. Recent code opens as a dialog from a
  history button (with a count) in the AI view's header.
- The panel has three tabs: Tool, Selector and Library. Library holds Style, Color and Keep behind a row of
  chips and reopens on the one used last.
- Tool, Edit and AI are one tab. The editor and the AI that writes into it open together as a workbench in place
  of the button grid (New, or Edit on a button), with a Tools button to go back. Pressing the Tool tab again also
  returns to the buttons; visiting another tab and coming back keeps the workbench open.
- The Tool action row shows icons only below 480px, so five actions no longer run off the panel.
- The Marketplace site now lives in `market-backend/` in this repository (was `RocketLauncher-backend`).
  It is published to the `market-deploy` branch for Hostinger and left out of the ZXP.
- Removed `chat-backend/` and its deploy workflow; the panel has had no chat since 3.1.0.
- Factory reset also sets the safe copy aside (kept in `panel-data/before-reset`).

## 3.1.0

Source recovered from the signed `RocketLauncher-v3.1.0.zxp`; the original commits were lost.
- Color tools and the SVG keeper moved into the main panel (`colors.html`, `keep.html` removed).
- Added Marketplace, Graphic Styles, settings, update check and input sanitising modules.
- Stylesheet split into tokens, base, components, shell, tools, library and colors.
- Team chat and the old AI agent module removed from the panel.

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

## [3.0.5] - 2026-08-04

### Fixed
- **Light Theme Accent**: `.light-theme` was overriding `--accent-color` to blue.
  - Restored standard lime (`#b8f55f`) so active tab and primary buttons (New) show lime again.
  - Active tab text now uses black (`#171717`) for contrast on lime.
- **Version**: aligned all manifests and docs to v3.0.5.

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
