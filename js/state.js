/**
 * Rocket Launcher - Shared State Module
 * Contains: Global state object, getters/setters for controlled access
 */
(() => {
    'use strict';

    // Ensure namespace exists
    window.TATA = window.TATA || {};

    // ==========================================
    // Standard Color Palette
    // ==========================================
    const STANDARD_COLORS = {
        red: '#e61919',
        orange: '#ff8709',
        yellow: '#ffe500',
        lime: '#b8f55f',
        green: '#0ae448',
        cyan: '#00bae2',
        purple: '#9d95ff',
        black: '#171717',
        slate: '#687174',
        gray: '#ded9cc',
        paper: '#f5f2e9'
    };

    TATA.resolveColor = (color) => {
        if (!color || color === '') return '';
        if (STANDARD_COLORS[color]) return STANDARD_COLORS[color];
        if (/^#[0-9A-F]{6}$/i.test(color)) return color.toLowerCase();
        return '';
    };

    TATA.PRESET_COLORS = [
        '#e61919',
        '#ff8709',
        '#ffe500',
        '#b8f55f',
        '#0ae448',
        '#00bae2',
        '#687174'
    ];

    // ==========================================
    // Shared State Object
    // ==========================================
    TATA.state = {
        // CSInterface (set in main.js init)
        csInterface: TATA.csInterface || null,
        extensionPath: TATA.extensionPath || '',

        // User Scripts
        userScripts: TATA.userScripts || {},

        // Context Menu
        currentContextScriptId: null
    };

    // ==========================================
    // User Scripts Getters/Setters
    // ==========================================
    TATA.getUserScripts = () => TATA.state.userScripts;
    TATA.setUserScripts = (scripts) => { TATA.state.userScripts = scripts; };

    // ==========================================
    // Context Menu State
    // ==========================================
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
