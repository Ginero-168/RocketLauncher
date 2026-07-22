/**
 * TATA Panel - Core Module
 * Contains: CSInterface, globals, utilities, storage versioning
 * @version 4.2
 */
(function () {
    'use strict';

    // ==========================================
    // Global Namespace
    // ==========================================
    window.TATA = window.TATA || {};

    // ==========================================
    // Global Error Handler
    // ==========================================
    window.onerror = function (msg, url, line, col, error) {
        console.error('[TATA Error]', { msg: msg, url: url, line: line, col: col, error: error });
        if (typeof TATA.showToast === 'function') {
            TATA.showToast('Error: ' + msg, 'error');
        }
        return true;
    };

    // ==========================================
    // Debounce Utility
    // ==========================================
    function debounce(func, wait) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                func.apply(context, args);
            }, wait);
        };
    }

    // ==========================================
    // DOM Cache
    // ==========================================
    var DOM = {};
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
            console.error('[TATA] Error in ' + (fn.name || 'anonymous') + ':', e);
            return fallbackValue;
        }
    }

    // ==========================================
    // CSInterface & Globals
    // ==========================================
    var csInterface = new CSInterface();
    var extensionPath = "";
    try {
        extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
    } catch (e) { }
    // Fallback: derive from URL
    if (!extensionPath) {
        var loc = window.location.href;
        if (loc.indexOf('file://') === 0) loc = loc.substring(7);
        var ls = loc.lastIndexOf('/');
        if (ls !== -1) loc = loc.substring(0, ls);
        extensionPath = decodeURIComponent(loc);
    }
    var userScripts = {};
    var pickerMode = localStorage.getItem('tata_picker_mode') || 'os';

    // Context Menu Globals
    var contextMenuEl = null;
    var currentContextScriptId = null;

    // ==========================================
    // Storage Versioning
    // ==========================================
    var STORAGE_VERSION = 3;
    function checkStorageVersion() {
        var currentVersion = parseInt(localStorage.getItem('tata_storage_version') || '0');
        if (currentVersion < STORAGE_VERSION) {
            console.log("[TATA] Migrating to V7 Layout (4-tab restructure)...");
            TATA.backupBeforeSave('tata_v2_layout_v' + currentVersion);

            // Migrate: merge old tabs into single 'tab_button'
            var oldLayout = localStorage.getItem('tata_v2_layout');
            if (oldLayout) {
                try {
                    var parsed = JSON.parse(oldLayout);
                    var merged = [];
                    ['swift', 'creative', 'organize', 'tools'].forEach(function (tab) {
                        if (parsed[tab] && Array.isArray(parsed[tab])) {
                            parsed[tab].forEach(function (item) {
                                if (item.id && item.id.indexOf('btn_') === 0) return;
                                if (item.type === 'subpanel') return;
                                merged.push(item);
                            });
                        }
                    });
                    // Also carry over if already migrated
                    if (parsed['tab_button'] && Array.isArray(parsed['tab_button'])) {
                        parsed['tab_button'].forEach(function (item) { merged.push(item); });
                    }
                    localStorage.setItem('tata_v2_layout', JSON.stringify({ tab_button: merged }));
                } catch (e) {
                    console.error('[TATA] Migration error:', e);
                    localStorage.removeItem('tata_v2_layout');
                }
            }

            localStorage.removeItem('tata_tab_names');
            localStorage.setItem('tata_storage_version', STORAGE_VERSION.toString());
            setTimeout(function () {
                if (typeof TATA.showToast === 'function') TATA.showToast("Panel updated!", "success");
            }, 1000);
        }
    }

    // ==========================================
    // Backup/Restore Utilities
    // ==========================================
    function backupBeforeSave(key) {
        var current = localStorage.getItem(key);
        if (current) {
            localStorage.setItem(key + '_backup', current);
        }
    }

    function restoreFromBackup(key) {
        var backup = localStorage.getItem(key + '_backup');
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
    // Cloud Sync Utilities
    // ==========================================
    var SYNC_KEYS = [
        'tata_v2_layout',
        'tata_user_scripts',
        'tata_hotkeys',
        'tata_ai_snippets'
    ];

    function getAllDataToSync() {
        var data = {};
        var fs = null;
        if (typeof window.require !== 'undefined') {
            try { fs = window.require('fs'); } catch (e) { }
        }

        SYNC_KEYS.forEach(function (key) {
            var val = localStorage.getItem(key);
            if (val) {
                try {
                    var parsed = JSON.parse(val);

                    // Physical JSX Sync logic — package ALL scripts as _physicalContent
                    if (key === 'tata_user_scripts') {
                        for (var scriptId in parsed) {
                            var spt = parsed[scriptId];

                            // Case 1: Script points to a .jsx file — read the file content
                            if (spt.script && spt.script.endsWith('.jsx')) {
                                if (fs) {
                                    try {
                                        var rawPath = spt.script.replace('file://', '');
                                        try { rawPath = decodeURI(rawPath); } catch (e) { }

                                        if (fs.existsSync(rawPath)) {
                                            spt._physicalContent = fs.readFileSync(rawPath, 'utf8');
                                        }
                                    } catch (fsErr) {
                                        console.warn('[TATA] Could not read script for backup: ' + spt.script);
                                    }
                                }
                            }
                            // Case 2: Inline code — package the code itself as _physicalContent
                            else if (spt.code && spt.code.length > 0) {
                                spt._physicalContent = spt.code;
                            }
                        }
                    }

                    data[key] = parsed;
                } catch (e) {
                    console.warn('[TATA] Skipping sync for invalid key:', key);
                }
            }
        });
        return data;
    }

    function restoreAllDataFromSync(data) {
        if (!data || typeof data !== 'object') return false;

        var fs = null, path = null;
        if (typeof window.require !== 'undefined') {
            try {
                fs = window.require('fs');
                path = window.require('path');
            } catch (e) { }
        }

        try {
            // First backup existing data before overriding
            SYNC_KEYS.forEach(function (key) {
                backupBeforeSave(key);
            });

            // Override with cloud data
            Object.keys(data).forEach(function (key) {
                if (SYNC_KEYS.includes(key) && data[key]) {
                    var valToStore = data[key];

                    // Physical JSX Restore logic — use local extensionPath (already resolved in this IIFE)
                    if (key === 'tata_user_scripts' && fs && path && extensionPath) {
                        var syncDir = path.join(extensionPath, 'jsx', 'cloud_sync');
                        if (!fs.existsSync(syncDir)) {
                            try { fs.mkdirSync(syncDir, { recursive: true }); } catch (e) { }
                        }

                        for (var scriptId in valToStore) {
                            var spt = valToStore[scriptId];
                            if (spt._physicalContent) {
                                var newPath = path.join(syncDir, scriptId + '.jsx');
                                try {
                                    fs.writeFileSync(newPath, spt._physicalContent, 'utf8');
                                    spt.script = newPath; // Update local script path to point to the downloaded file
                                } catch (fsErr) {
                                    console.error('[TATA] Failed to restore script: ' + scriptId);
                                }
                                // Delete the raw file text to prevent localStorage bloat
                                delete spt._physicalContent;
                            }
                        }
                    }

                    localStorage.setItem(key, JSON.stringify(valToStore));
                }
            });
            return true;
        } catch (e) {
            console.error('[TATA] Restore from sync failed:', e);
            return false;
        }
    }

    // ==========================================
    // Health Check
    // ==========================================
    function verifyPanelHealth() {
        var container = document.getElementById('tab_button');
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
        var controller = new AbortController();
        var id = setTimeout(function () { controller.abort(); }, timeoutMs || 30000);
        options = options || {};
        options.signal = controller.signal;
        return fetch(url, options).finally(function () { clearTimeout(id); });
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
    TATA.getExtensionPathCore = function () { return extensionPath; };
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
    TATA.getAllDataToSync = getAllDataToSync;
    TATA.restoreAllDataFromSync = restoreAllDataFromSync;

})();
