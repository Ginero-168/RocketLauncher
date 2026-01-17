# Changelog

All notable changes to the TATA Pro extension will be documented in this file.

## [2.1.0] - 2026-01-04

### Added
- **Modular Architecture**: Refactored codebase into separate modules
  - `jsx/utils.jsx`: Utility functions for colors, layers, swatch management
  - `jsx/errorHandling.jsx`: Standardized error handling and undo support
  - `js/uiUtils.js`: UI utilities for tooltips, loading states, validation
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Undo Support**: Added `withUndoGroup()` wrapper for Cmd+Z support
- **Tooltips**: Descriptive tooltips on all buttons
- **Loading States**: Visual loading indicators for async operations
- **Input Validation**: Validation for API keys and user inputs
- **Unit Tests**: Example test suite in `tests/utils.test.js`

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
