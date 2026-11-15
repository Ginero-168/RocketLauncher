/**
 * Panel startup: extension path, host script, tabs, grid and the single
 * hotkey init. A start-up failure is shown in the panel (#boot_error),
 * never as a blocking alert.
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    const DEFAULT_RESTORE_HEIGHT = 550;

    function cs() {
        return TATA.csInterface || (typeof CSInterface !== 'undefined' ? new CSInterface() : null);
    }

    function resolveExtensionPath() {
        let extensionPath = TATA.extensionPath || '';
        const bridge = cs();
        try {
            if (bridge && typeof SystemPath !== 'undefined') {
                extensionPath = bridge.getSystemPath(SystemPath.EXTENSION) || extensionPath;
            }
        } catch (e) { /* derive from the page URL below */ }
        if (!extensionPath) {
            let path = window.location.href;
            if (path.indexOf('file://') === 0) path = path.substring(7);
            const lastSlash = path.lastIndexOf('/');
            if (lastSlash !== -1) path = path.substring(0, lastSlash);
            extensionPath = decodeURIComponent(path);
        }
        if (TATA.setExtensionPath) TATA.setExtensionPath(extensionPath);
        TATA.extensionPath = extensionPath;
        return extensionPath;
    }

    // ==========================================
    // Collapse: shrink to the hotkey bar and back
    // ==========================================
    let toggleBound = false;

    function setupPanelToggle() {
        if (toggleBound) return;
        toggleBound = true;
        const bridge = cs();
        const btn = document.getElementById('btn_toggle_height');
        const strip = document.getElementById('collapsed_strip');
        if (!btn) return;

        function collapsedHeight() {
            const bar = document.getElementById('hotkey-bar');
            return Math.ceil((bar ? bar.offsetHeight : 0) + (strip ? strip.offsetHeight || 14 : 14));
        }

        function resize(height) {
            if (!bridge || typeof bridge.resizeContent !== 'function') return;
            try { bridge.resizeContent(Math.floor(window.innerWidth), height); } catch (e) { /* docked panels ignore it */ }
        }

        function restoreHeight() {
            return parseInt(btn.dataset.lastHeight, 10)
                || parseInt(localStorage.getItem('tata_panel_last_height'), 10)
                || DEFAULT_RESTORE_HEIGHT;
        }

        function setCollapsed(collapsed) {
            document.body.classList.toggle('collapsed', collapsed);
            btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            localStorage.setItem('tata_panel_collapsed', collapsed ? 'true' : 'false');
        }

        function collapse() {
            if (window.innerHeight > 200) {
                btn.dataset.lastHeight = window.innerHeight;
                localStorage.setItem('tata_panel_last_height', window.innerHeight);
            }
            setCollapsed(true);
            resize(collapsedHeight());
            if (strip) strip.focus();
        }

        function expand() {
            setCollapsed(false);
            resize(restoreHeight());
            btn.focus();
        }

        if (localStorage.getItem('tata_panel_collapsed') === 'true') {
            setCollapsed(true);
            setTimeout(() => resize(collapsedHeight()), 100);
        } else {
            setCollapsed(false);
            if (window.innerHeight < 200) resize(restoreHeight());
        }

        btn.addEventListener('click', collapse);
        if (strip) strip.addEventListener('click', expand);
    }

    function showBootError(error) {
        const box = document.getElementById('boot_error');
        const message = `Rocket Launcher could not start: ${error && error.message ? error.message : error}`;
        console.error('[TATA] start-up failed', error);
        if (!box) return;
        box.textContent = message;
        box.hidden = false;
    }

    function init() {
        if (typeof TATA.checkStorageVersion === 'function') TATA.checkStorageVersion();

        const extensionPath = resolveExtensionPath();
        if (typeof TATA.setupTabsV2 === 'function') TATA.setupTabsV2();
        if (typeof TATA.initUserScripts === 'function') TATA.initUserScripts();
        if (typeof TATA.setupAddScriptUI === 'function') TATA.setupAddScriptUI();
        if (typeof TATA.startContextMenu === 'function') TATA.startContextMenu();
        setupPanelToggle();
        if (typeof TATA.renderGrid === 'function') TATA.renderGrid();
        if (typeof TATA.initScripting === 'function') TATA.initScripting();
        if (typeof TATA.initScriptTransfer === 'function') TATA.initScriptTransfer();

        const badge = document.getElementById('ai_model_name');
        if (badge) {
            badge.textContent = TATA.resolveAiModel
                ? TATA.resolveAiModel(TATA.getStored ? TATA.getStored('tata_ai_model') : '')
                : 'google/gemini-3-flash';
        }

        if (TATA.host && TATA.host.evalFile) {
            TATA.host.evalFile(`${extensionPath}/jsx/hostscript.jsx`);
        }
    }

    function start() {
        try {
            init();
            if (typeof TATA.initHotkeys === 'function') TATA.initHotkeys();
        } catch (e) {
            showBootError(e);
        }
    }

    TATA.bootstrapPanel = start;
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);
})();
