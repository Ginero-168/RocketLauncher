/**
 * TATA Panel - Shared State Module
 * Contains: Global state object, getters/setters for controlled access
 * @version 4.2
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
    TATA.getLayout = function () {
        return TATA.state.v2Layout;
    };

    TATA.setLayout = function (layout) {
        TATA.state.v2Layout = layout;
    };

    TATA.getDefaults = function () {
        return TATA.state.v2Defaults;
    };

    TATA.setDefaults = function (defaults) {
        TATA.state.v2Defaults = defaults;
    };

    // ==========================================
    // Hotkey Getters/Setters
    // ==========================================
    TATA.getHotkeys = function () {
        return TATA.state.hotkeys;
    };

    TATA.setHotkeys = function (hotkeys) {
        TATA.state.hotkeys = hotkeys;
    };

    TATA.getHotkeyCount = function () {
        return TATA.state.hotkeyCount;
    };

    TATA.setHotkeyCount = function (count) {
        TATA.state.hotkeyCount = count;
    };

    // ==========================================
    // User Scripts Getters/Setters
    // ==========================================
    TATA.getUserScripts = function () {
        return TATA.state.userScripts;
    };

    TATA.setUserScripts = function (scripts) {
        TATA.state.userScripts = scripts;
    };

    // ==========================================
    // Context Menu State
    // ==========================================
    TATA.getCurrentContextId = function () {
        return TATA.state.currentContextScriptId;
    };

    TATA.setCurrentContextId = function (id) {
        TATA.state.currentContextScriptId = id;
        // Also set on window for backward compatibility
        window.currentContextScriptId = id;
    };

    // ==========================================
    // CSInterface Accessor
    // ==========================================
    TATA.getCSInterface = function () {
        return TATA.state.csInterface;
    };

    TATA.setCSInterface = function (csInterface) {
        TATA.state.csInterface = csInterface;
    };

    // ==========================================
    // Extension Path
    // ==========================================
    TATA.getExtensionPath = function () {
        return TATA.state.extensionPath;
    };

    TATA.setExtensionPath = function (path) {
        TATA.state.extensionPath = path;
    };

})();
