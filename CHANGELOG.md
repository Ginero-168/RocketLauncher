# Changelog

All notable changes to the Rocket Launcher extension will be documented in this file.

## [2.1.1] - 2026-07-22

### Changed
- **CEP 11 Upgrade**: `CSXS/manifest.xml` now targets CEP 11.0 and Illustrator 2022+ (v25.3)
- **Requirements**: README updated to Illustrator 2022+ / CEP 11.0

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
