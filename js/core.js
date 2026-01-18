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
    var userScripts = {};
    var pickerMode = localStorage.getItem('tata_picker_mode') || 'os';

    // Context Menu Globals
    var contextMenuEl = null;
    var currentContextScriptId = null;

    // ==========================================
    // Storage Versioning
    // ==========================================
    var STORAGE_VERSION = 2;
    function checkStorageVersion() {
        var currentVersion = parseInt(localStorage.getItem('tata_storage_version') || '0');
        if (currentVersion < STORAGE_VERSION) {
            console.log("[TATA] Migrating to V4 Layout Structure...");
            TATA.backupBeforeSave('tata_v2_layout_v' + currentVersion);
            localStorage.removeItem('tata_v2_layout');
            localStorage.setItem('tata_storage_version', STORAGE_VERSION.toString());
            setTimeout(function () {
                if (typeof TATA.showToast === 'function') TATA.showToast("Panel Updated to V4 Layout", "success");
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
    // Health Check
    // ==========================================
    function verifyPanelHealth() {
        var requiredDefaults = ['btn_fit', 'btn_resize', 'btn_follow'];
        var swiftContainer = document.getElementById('swift');
        if (!swiftContainer) return true;

        var missingCount = 0;
        requiredDefaults.forEach(function (id) {
            if (!document.getElementById(id)) {
                missingCount++;
            }
        });

        if (missingCount >= 2) {
            console.warn('[TATA] Health check failed, attempting repair...');
            localStorage.removeItem('tata_v2_layout');
            if (typeof TATA.renderGrid === 'function') TATA.renderGrid();
            return false;
        }
        return true;
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
    TATA.userScripts = userScripts;
    TATA.pickerMode = pickerMode;
    TATA.contextMenuEl = contextMenuEl;
    TATA.currentContextScriptId = currentContextScriptId;
    TATA.checkStorageVersion = checkStorageVersion;
    TATA.backupBeforeSave = backupBeforeSave;
    TATA.restoreFromBackup = restoreFromBackup;
    TATA.verifyPanelHealth = verifyPanelHealth;
    TATA.STORAGE_VERSION = STORAGE_VERSION;

})();
