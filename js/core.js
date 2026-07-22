/**
 * Rocket Launcher - Core Module
 * Contains: CSInterface, globals, utilities, storage versioning
 */
(() => {
    'use strict';

    // ==========================================
    // Global Namespace
    // ==========================================
    window.TATA = window.TATA || {};

    // ==========================================
    // Global Error Handler
    // ==========================================
    window.onerror = (msg, url, line, col, error) => {
        console.error('[TATA Error]', { msg, url, line, col, error });
        if (typeof TATA.showToast === 'function') {
            TATA.showToast(`Error: ${msg}`, 'error');
        }
        return true;
    };

    // ==========================================
    // Debounce Utility
    // ==========================================
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // ==========================================
    // DOM Cache
    // ==========================================
    const DOM = {};
    function cacheDOM() {
        DOM.hotkeyBar = document.getElementById('hotkey-bar');
        DOM.footerToolbar = document.querySelector('.footer-toolbar');
        DOM.collapsedStrip = document.getElementById('collapsed_strip');
        DOM.tabs = document.querySelector('.tabs');
        DOM.tabContainer = document.getElementById('tab-container');
        DOM.settingsModal = document.getElementById('settings_modal');
        DOM.inputModal = document.getElementById('input_modal');
        DOM.confirmModal = document.getElementById('confirm_modal');
        DOM.contextMenu = document.getElementById('context_menu');
        DOM.ctxEdit = document.getElementById('ctx_edit');
        DOM.ctxDelete = document.getElementById('ctx_delete');
        DOM.ctxColors = document.getElementById('ctx_colors');
    }

    // ==========================================
    // Safe JSON Parse Utility
    // ==========================================
    function safeParse(jsonString, fallback) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('[TATA] JSON Parse Error:', e);
            return fallback;
        }
    }

    // ==========================================
    // Safe Function Wrapper
    // ==========================================
    function safeCall(fn, context, fallbackValue) {
        try {
            return fn.call(context);
        } catch (e) {
            console.error(`[TATA] Error in ${fn.name || 'anonymous'}:`, e);
            return fallbackValue;
        }
    }

    // ==========================================
    // CSInterface & Globals
    // ==========================================
    const csInterface = new CSInterface();
    let extensionPath = '';
    try {
        extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
    } catch (e) { /* fallback below */ }

    // Fallback: derive from URL
    if (!extensionPath) {
        let loc = window.location.href;
        if (loc.startsWith('file://')) loc = loc.substring(7);
        const ls = loc.lastIndexOf('/');
        if (ls !== -1) loc = loc.substring(0, ls);
        extensionPath = decodeURIComponent(loc);
    }
    const userScripts = {};
    const pickerMode = localStorage.getItem('tata_picker_mode') || 'os';

    // Context Menu Globals
    let contextMenuEl = null;
    let currentContextScriptId = null;

    // ==========================================
    // Storage Versioning
    // ==========================================
    const STORAGE_VERSION = 3;
    function checkStorageVersion() {
        const currentVersion = parseInt(localStorage.getItem('tata_storage_version') || '0', 10);
        if (currentVersion < STORAGE_VERSION) {
            console.log('[TATA] Migrating to V7 Layout (4-tab restructure)...');
            TATA.backupBeforeSave(`tata_v2_layout_v${currentVersion}`);

            // Migrate: merge old tabs into single 'tab_button'
            const oldLayout = localStorage.getItem('tata_v2_layout');
            if (oldLayout) {
                try {
                    const parsed = JSON.parse(oldLayout);
                    const merged = [];
                    ['swift', 'creative', 'organize', 'tools'].forEach((tab) => {
                        if (parsed[tab] && Array.isArray(parsed[tab])) {
                            parsed[tab].forEach((item) => {
                                if (item.id && item.id.startsWith('btn_')) return;
                                if (item.type === 'subpanel') return;
                                merged.push(item);
                            });
                        }
                    });
                    // Also carry over if already migrated
                    if (parsed.tab_button && Array.isArray(parsed.tab_button)) {
                        parsed.tab_button.forEach((item) => merged.push(item));
                    }
                    localStorage.setItem('tata_v2_layout', JSON.stringify({ tab_button: merged }));
                } catch (e) {
                    console.error('[TATA] Migration error:', e);
                    localStorage.removeItem('tata_v2_layout');
                }
            }

            localStorage.removeItem('tata_tab_names');
            localStorage.setItem('tata_storage_version', STORAGE_VERSION.toString());
            setTimeout(() => {
                if (typeof TATA.showToast === 'function') TATA.showToast('Panel updated!', 'success');
            }, 1000);
        }
    }

    // ==========================================
    // Backup/Restore Utilities
    // ==========================================
    function backupBeforeSave(key) {
        const current = localStorage.getItem(key);
        if (current) {
            localStorage.setItem(`${key}_backup`, current);
        }
    }

    function restoreFromBackup(key) {
        const backup = localStorage.getItem(`${key}_backup`);
        if (backup) {
            try {
                JSON.parse(backup);
                localStorage.setItem(key, backup);
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    // ==========================================
    // Health Check
    // ==========================================
    function verifyPanelHealth() {
        const container = document.getElementById('tab_button');
        if (!container) {
            console.warn('[TATA] Health check: tab_button container missing');
            return false;
        }
        return true;
    }

    // ==========================================
    // Fetch with Timeout (AbortController)
    // ==========================================
    function fetchWithTimeout(url, options, timeoutMs) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs || 30000);
        options = options || {};
        options.signal = controller.signal;
        return fetch(url, options).finally(() => clearTimeout(id));
    }

    // ==========================================
    // Export to Global Namespace
    // ==========================================
    TATA.debounce = debounce;
    TATA.safeParse = safeParse;
    TATA.safeCall = safeCall;
    TATA.cacheDOM = cacheDOM;
    TATA.DOM = DOM;
    TATA.csInterface = csInterface;
    TATA.extensionPath = extensionPath;
    // Dynamic getter – always returns latest resolved path
    TATA.getExtensionPathCore = () => extensionPath;
    TATA.userScripts = userScripts;
    TATA.pickerMode = pickerMode;
    TATA.contextMenuEl = contextMenuEl;
    TATA.currentContextScriptId = currentContextScriptId;
    TATA.checkStorageVersion = checkStorageVersion;
    TATA.backupBeforeSave = backupBeforeSave;
    TATA.restoreFromBackup = restoreFromBackup;
    TATA.verifyPanelHealth = verifyPanelHealth;
    TATA.fetchWithTimeout = fetchWithTimeout;
    TATA.STORAGE_VERSION = STORAGE_VERSION;

})();
