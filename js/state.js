/**
 * Rocket Launcher - Shared State Module
 * Contains: Global state object, getters/setters for controlled access
 */
(() => {
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
