/**
 * Rocket Launcher - Shared State Module
 * Contains: Global state object, getters/setters for controlled access
 */
(function () {
    'use strict';

    // Ensure namespace exists
    window.TATA = window.TATA || {};

    // ==========================================
    // Shared State Object
    // ==========================================
    TATA.state = {
        // CSInterface (set in main.js init)
        csInterface: TATA.csInterface || null,
        extensionPath: TATA.extensionPath || '',

        // Layout Data
        v2Layout: {},
        v2Defaults: {},

        // Hotkeys
        hotkeys: [],
        hotkeyCount: 5,

        // User Scripts
        userScripts: TATA.userScripts || {},

        // Context Menu
        currentContextScriptId: null,
        contextMenuEl: null,

        // Settings
        pickerMode: localStorage.getItem('tata_picker_mode') || 'os',

        // Keeper
        keeperItems: [],

        // Contrast Checker
        customPickerState: {
            targetInputId: null,
            hue: 0,
            sat: 100,
            val: 100,
            rgb: { r: 255, g: 0, b: 0 },
            hex: '#FF0000',
            isDraggingCanvas: false
        }
    };

    // ==========================================
    // Layout Getters/Setters
    // ==========================================
    TATA.getLayout = () => TATA.state.v2Layout;
    TATA.setLayout = (layout) => { TATA.state.v2Layout = layout; };

    TATA.getDefaults = () => TATA.state.v2Defaults;
    TATA.setDefaults = (defaults) => { TATA.state.v2Defaults = defaults; };

    // ==========================================
    // Hotkey Getters/Setters
    // ==========================================
    TATA.getHotkeys = () => TATA.state.hotkeys;
    TATA.setHotkeys = (hotkeys) => { TATA.state.hotkeys = hotkeys; };

    TATA.getHotkeyCount = () => TATA.state.hotkeyCount;
    TATA.setHotkeyCount = (count) => { TATA.state.hotkeyCount = count; };

    // ==========================================
    // User Scripts Getters/Setters
    // ==========================================
    TATA.getUserScripts = () => TATA.state.userScripts;
    TATA.setUserScripts = (scripts) => { TATA.state.userScripts = scripts; };

    // ==========================================
    // Context Menu State
    // ==========================================
    TATA.getCurrentContextId = () => TATA.state.currentContextScriptId;
    TATA.setCurrentContextId = (id) => {
        TATA.state.currentContextScriptId = id;
        // Also set on window for backward compatibility
        window.currentContextScriptId = id;
    };

    // ==========================================
    // CSInterface Accessor
    // ==========================================
    TATA.getCSInterface = () => TATA.state.csInterface;
    TATA.setCSInterface = (csInterface) => { TATA.state.csInterface = csInterface; };

    // ==========================================
    // Extension Path
    // ==========================================
    TATA.getExtensionPath = () => TATA.state.extensionPath;
    TATA.setExtensionPath = (path) => { TATA.state.extensionPath = path; };

})();
