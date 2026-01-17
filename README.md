# TATA Pro - Adobe Illustrator Extension

**Version 2.1** - Professional productivity tools for Adobe Illustrator

## Features

- 🎯 **Swift Tools**: Fit, Resize, Arrange, Follow, Stars, Palette Generator, Embed, Preview, Dimension
- 🎨 **Color Harmony**: Advanced color management with contrast checker
- 💾 **Keeper**: Asset management (save/import design elements)
- 🧹 **Cleaner**: Document hygiene tools
- ⚡ **Hotkey Bar**: Customizable quick access (drag & drop)
- 🤖 **AI Integration**: Gemini API for custom script generation

---

## Installation

### 1. Enable Debug Mode
Required for unsigned extensions.

**Mac:**
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
defaults write com.adobe.CSXS.13 PlayerDebugMode 1
defaults write com.adobe.CSXS.14 PlayerDebugMode 1
defaults write com.adobe.CSXS.15 PlayerDebugMode 1
```

**Windows:**
Open Registry Editor (`regedit`), go to `HKEY_CURRENT_USER/Software/Adobe/CSXS.XX` (where XX is version 11-15), add String Value `PlayerDebugMode` = `1`.

### 2. Copy Extension
**Mac:** `/Library/Application Support/Adobe/CEP/extensions/`  
**Windows:** `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\`

### 3. Restart Illustrator
Access via **Window > Extensions > TATA Pro**

---

## Architecture (V2.1)

### File Structure
```
TATA/
├── index.html          # Main UI
├── CSXS/
│   └── manifest.xml    # Extension configuration
├── css/
│   └── styles.css      # Styling
├── js/
│   ├── libs/
│   │   └── CSInterface.js  # Adobe CEP library
│   ├── main.js         # Client-side logic
│   └── uiUtils.js      # Tooltips, loading, validation
├── jsx/
│   ├── hostscript.jsx  # Main routing & functions
│   ├── utils.jsx       # Utility functions
│   └── errorHandling.jsx  # Error handling & undo
└── tests/
    └── utils.test.js   # Unit tests
```

### Key Improvements in V2.1
- **Modular Architecture**: Separated concerns into focused modules
- **Error Handling**: Standardized error responses with user-friendly messages
- **Undo Support**: All major operations support Cmd+Z
- **UI Enhancements**: Tooltips, loading states, input validation
- **Code Quality**: JSDoc documentation, unit tests, professional structure

---

## Development

### Running Tests
```bash
node tests/utils.test.js
```

### Adding New Features
1. Add ExtendScript function to `jsx/hostscript.jsx`
2. Add UI handler in `js/main.js`
3. Use utilities from `jsx/utils.jsx` and `js/uiUtils.js`
4. Wrap operations with `withUndoGroup()` for undo support

### Code Style
- JSDoc comments for all functions
- Consistent error handling using `createResponse()`
- Loading states for async operations
- Input validation before processing

---

## Troubleshooting

**Panel appears but buttons don't work:**
1. Check Debug Mode is enabled
2. Restart Illustrator after enabling
3. Reload panel from flyout menu (top-right)

**Dimension tool not working:**
1. Close Illustrator completely
2. Reopen and reload panel
3. ExtendScript caches .jsx files

**Console Errors:**
1. Open Chrome DevTools: Right-click panel > Inspect
2. Check Console tab for JavaScript errors
3. Check for missing files or broken references

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

**Current:** V2.1 - Modular refactoring, professional code quality  
**Previous:** V2.0 - Coolors architecture  
**Original:** V1.x - Initial release

---

## License

Custom extension for personal/team use.
