/**
 * Rocket Launcher - Editor and AI tabs
 * Script editor (CodeMirror, icon and colour pickers, recent code) and the
 * Replicate chat that writes or fixes ExtendScript. AI-written and auto-fixed
 * code always goes through TATA.runConfirmedJsx before Illustrator runs it.
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    let csInterface = null; // Lazy init
    let extensionPath = '';
    let currentScriptId = 'default_script';
    let editorOrigin = 'user';

    function getCS() {
        if (!csInterface) {
            csInterface = TATA.csInterface || new CSInterface();
            try { extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION); } catch (e) { /* path set below */ }
        }
        return csInterface;
    }

    function loadScript(src, cb) {
        const s = document.createElement('script');
        s.src = src;
        s.onload = cb;
        s.onerror = () => console.error('[TATA] Failed to load', src);
        document.head.appendChild(s);
    }

    function loadCss(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    function showToast(msg, type) {
        if (typeof TATA.showToast === 'function') TATA.showToast(msg, type);
    }

    function byId(id) {
        return document.getElementById(id);
    }

    // ==================== ICONS ====================
    // One-colour SVGs that follow the button's ink (no emoji: they ignore it).
    const svg = d => `<svg viewBox="0 0 24 24"><path fill="currentColor" d="${d}"/></svg>`;
    const ICONS = {
        stars: svg('M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'),
        play: svg('M8 5v14l11-7z'),
        bolt: svg('M7 2v11h3v9l7-12h-4l4-8z'),
        check: svg('M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'),
        heart: svg('m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'),
        fire: svg('M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67ZM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8Z'),
        gem: svg('M19 3H5L2 9l10 12L22 9l-3-6ZM9.62 8l1.5-3h1.76l1.5 3H9.62ZM11 10v6.68L5.44 10H11Zm2 0h5.56L13 16.68V10Zm6.26-2h-2.65l-1.5-3h2.65l1.5 3ZM6.24 5h2.65l-1.5 3H4.74l1.5-3Z'),
        add: svg('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'),
        remove: svg('M19 13H5v-2h14v2z'),
        delete: svg('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'),
        edit: svg('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'),
        copy: svg('M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z'),
        undo: svg('M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z'),
        redo: svg('M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z'),
        home: svg('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'),
        menu: svg('M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z'),
        settings: svg('M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 0 0-.12-.61l-2.01-1.58ZM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2Z'),
        search: svg('M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'),
        close: svg('M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'),
        palette: svg('M12 3a9 9 0 0 0 0 18 1.5 1.5 0 0 0 1.11-2.51 1.5 1.5 0 0 1 1.12-2.49H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z'),
        brush: svg('M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37-1.34-1.34a1 1 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 0 0 0-1.41z'),
        colorize: svg('M20.71 5.63 18.37 3.3a1 1 0 0 0-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12a1 1 0 0 0 .01-1.42zM6.92 19 5 17.08l8.06-8.06 1.92 1.92L6.92 19z'),
        crop: svg('M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z'),
        transform: svg('M12 6v3l4-4-4-4v3a8 8 0 0 0-6.76 12.26L6.7 14.8A5.87 5.87 0 0 1 6 12c0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3a8 8 0 0 0 6.76-12.26z'),
        layers: svg('m11.99 18.54-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16zm0-11.47L17.74 9 12 13.47 6.26 9 12 4.53z'),
        grid: svg('M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z'),
        circle: '<svg viewBox="0 0 24 24"><circle fill="currentColor" cx="12" cy="12" r="10"/></svg>',
        square: svg('M3 3h18v18H3z'),
        triangle: svg('M12 2 2 22h20z'),
        folder: svg('M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z'),
        file: svg('M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'),
        image: svg('M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'),
        code: svg('M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z'),
        lightbulb: svg('M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z'),
        magic: svg('M7.5 5.6 10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29a1 1 0 0 0-1.41 0L1.29 18.96a1 1 0 0 0 0 1.41l2.34 2.34a1 1 0 0 0 1.41 0L16.7 11.05a1 1 0 0 0 0-1.41l-2.33-2.35zm-1.03 5.49-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44z'),
        robot: svg('M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zM16 17H8v-2h8v2zm-1-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z'),
        download: svg('M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z'),
        upload: svg('M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z'),
        refresh: svg('M17.65 6.35A7.958 7.958 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z'),
        save: svg('M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z'),
        fit: svg('M4 4h4v2H4v4H2V4a2 2 0 0 1 2-2zm16 0h-4v2h4v4h2V4a2 2 0 0 0-2-2zM4 20h4v-2H4v-4H2v4a2 2 0 0 0 2 2zm16 0h-4v-2h4v-4h2v4a2 2 0 0 0-2 2z'),
        resize: svg('M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10z'),
        follow: svg('M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'),
        arrange: svg('M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z'),
        embed: svg('M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z'),
        preview: svg('M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z'),
        text: svg('M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z'),
        align: svg('M4 22H2V2h2v20zM22 7H6v3h16V7zm-6 7H6v3h10v-3z'),
        ruler: svg('M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z'),
        artboard: svg('M20 7v10H4V7h16m0-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z'),
        clean: svg('M16 11h-1V3a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v8H8a5 5 0 0 0-5 5v7h18v-7a5 5 0 0 0-5-5Zm3 10h-2v-3a1 1 0 0 0-2 0v3h-2v-3a1 1 0 0 0-2 0v3H9v-3a1 1 0 0 0-2 0v3H5v-5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5Z')
    };
    const FILE_ICON = '<svg class="rc-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm2 16H8v-2h8v2Zm0-4H8v-2h8v2Zm-3-5V3.5L18.5 9H13Z"/></svg>';

    // ==================== INIT ====================
    function init() {
        const editor = byId('code_editor');
        if (editor && editor.value.trim() === '// Your code will appear here...') {
            editor.value = "// Example:\n// var doc = app.activeDocument;\nalert('Hello world');";
        }

        if (typeof TATA.bindTabList === 'function') TATA.bindTabList();
        initIconPicker();
        initColorPicker();
        initRecentCode();
        initApiKeySection();
        initListeners();
        updateEditorStatus('new');

        // The API token stays in this panel's localStorage. It is not requested
        // over an APPLICATION-scoped CSEvent.
        if (!localStorage.getItem('tata_replicate_api_token')) {
            const keySection = byId('api_key_section');
            if (keySection) keySection.hidden = false;
            addChatBubble('ai', 'กรุณากรอก Replicate API token ในช่องด้านบนก่อนใช้งาน');
        }
    }

    function activeTabId() {
        // The editor lives in the Tool tab's workbench (js/tabs.js).
        if (TATA.workbench && TATA.workbench.isOpen()) return 'tab_editor';
        const panel = document.querySelector('.tab-content.active');
        return panel ? panel.id : '';
    }

    function initListeners() {
        const btnSend = byId('btn_send_prompt');
        if (btnSend) btnSend.addEventListener('click', handleSendPrompt);

        const prompt = byId('prompt_input');
        if (prompt) {
            // Enter sends, Shift+Enter adds a line; never while an IME is composing (Thai input).
            prompt.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
                    e.preventDefault();
                    handleSendPrompt();
                }
            });
        }

        const btnTest = byId('btn_test');
        if (btnTest) btnTest.addEventListener('click', handleTestRun);

        const btnImport = byId('btn_editor_import');
        if (btnImport) btnImport.addEventListener('click', handleImport);

        const btnClear = byId('btn_clear_chat');
        if (btnClear) btnClear.addEventListener('click', handleClearChat);

        // Editor shortcuts only act on the Editor tab.
        document.addEventListener('keydown', e => {
            if (!(e.ctrlKey || e.metaKey) || activeTabId() !== 'tab_editor') return;
            if (document.querySelector('.modal.active')) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                handleTestRun();
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                handleImport();
            }
        });
    }

    function activateTab(tabId) {
        if (typeof TATA.activateTab === 'function') return TATA.activateTab(tabId);
        return undefined;
    }

    // ==================== ICON PICKER ====================
    function setTriggerIcon(trigger, icon) {
        mountTrustedIcon(trigger, icon);
    }

    function initIconPicker() {
        const grid = byId('icon_grid_popover');
        const trigger = byId('icon_trigger');
        const input = byId('icon_value');
        if (!grid || !trigger || !input || grid.dataset.bound === '1') return;
        grid.dataset.bound = '1';

        // Text '★' was the old default; the star SVG matches every other icon.
        if (!input.value || input.value === '★') input.value = storedIconValue(ICONS.stars);
        setTriggerIcon(trigger, input.value);

        function setOpen(open) {
            grid.hidden = !open;
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                const current = grid.querySelector('[aria-checked="true"]') || grid.firstElementChild;
                if (current) current.focus();
            }
        }

        function markCurrent() {
            Array.prototype.forEach.call(grid.children, option => {
                option.setAttribute('aria-checked', option.dataset.value === input.value ? 'true' : 'false');
            });
        }

        Object.keys(ICONS).forEach(key => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'icon-option';
            option.setAttribute('role', 'menuitemradio');
            option.setAttribute('aria-label', key);
            option.title = key;
            option.dataset.value = storedIconValue(ICONS[key]);
            mountTrustedIcon(option, ICONS[key]);
            option.addEventListener('click', () => {
                input.value = option.dataset.value;
                setTriggerIcon(trigger, input.value);
                markCurrent();
                setOpen(false);
                trigger.focus();
            });
            grid.appendChild(option);
        });

        trigger.addEventListener('click', e => {
            e.stopPropagation();
            markCurrent();
            setOpen(grid.hidden);
        });
        grid.addEventListener('click', e => e.stopPropagation());
        grid.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
                trigger.focus();
            }
        });
        document.addEventListener('click', () => setOpen(false));
    }

    // ==================== COLOUR PICKER ====================
    function normalizeHex(value) {
        const text = String(value || '').trim();
        if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
        const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(text);
        if (short) return ('#' + short[1] + short[1] + short[2] + short[2] + short[3] + short[3]).toLowerCase();
        return '';
    }

    function initColorPicker() {
        const trigger = byId('color_trigger');
        const modal = byId('color_picker_modal');
        const grid = byId('color_grid');
        const input = byId('color_hex_input');
        const preview = byId('color_preview');
        const done = byId('btn_color_done');
        if (!trigger || !modal || !grid || !input || trigger.dataset.bound === '1') return;
        trigger.dataset.bound = '1';

        const colors = TATA.BUTTON_COLORS || ['', '#e61919', '#ff8709', '#ffe500', '#b8f55f', '#9d95ff', '#ff9ecd', '#0ae448', '#00bae2'];
        let close = null;

        function paint(hex) {
            const clean = normalizeHex(hex);
            [trigger, preview].forEach(el => {
                if (!el) return;
                if (clean) el.style.setProperty('--swatch', clean);
                else el.style.removeProperty('--swatch');
            });
            trigger.classList.toggle('is-empty', !clean);
            Array.prototype.forEach.call(grid.children, swatch => {
                swatch.setAttribute('aria-checked', (swatch.dataset.color || '') === clean ? 'true' : 'false');
            });
        }

        function setColor(hex) {
            input.value = normalizeHex(hex);
            input.removeAttribute('aria-invalid');
            paint(input.value);
        }

        colors.forEach(color => {
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = color ? 'swatch-btn' : 'swatch-btn swatch-btn--none';
            swatch.setAttribute('role', 'radio');
            swatch.dataset.color = color;
            if (color) {
                swatch.style.setProperty('--swatch', color);
                swatch.title = color;
                swatch.setAttribute('aria-label', color);
            } else {
                swatch.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
                swatch.title = 'No color';
                swatch.setAttribute('aria-label', 'No color');
            }
            swatch.addEventListener('click', () => {
                setColor(color);
                if (close) close();
            });
            grid.appendChild(swatch);
        });

        input.addEventListener('input', () => {
            const clean = normalizeHex(input.value);
            if (clean || !input.value.trim()) {
                input.removeAttribute('aria-invalid');
                paint(clean);
            } else {
                input.setAttribute('aria-invalid', 'true');
            }
        });
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && close) {
                e.preventDefault();
                close();
            }
        });
        if (done) done.addEventListener('click', () => { if (close) close(); });

        trigger.addEventListener('click', () => {
            paint(input.value);
            const current = grid.querySelector('[aria-checked="true"]');
            close = typeof TATA.openDialog === 'function'
                ? TATA.openDialog(modal, { focus: current || input })
                : null;
        });

        paint(input.value);
    }

    // ==================== EDITOR STATUS ====================
    function updateEditorStatus(mode, name) {
        const el = byId('editor_status');
        const dot = byId('editor_status_dot');
        const button = byId('btn_editor_import');
        const label = button ? button.querySelector('.btn-label') : null;
        if (!el) return;
        const editing = mode === 'edit';
        el.textContent = editing ? `Editing: ${name || 'Unknown'}` : 'New Script';
        el.classList.toggle('editing', editing);
        if (dot) dot.classList.toggle('editing', editing);
        if (label) label.textContent = editing ? 'Update' : 'Import';
        if (button) button.setAttribute('aria-label', editing ? 'Update in Tools' : 'Save to Tools');
    }

    // ==================== HANDLERS ====================
    function handleEditScriptEvent(event) {
        const data = (typeof event.data === 'string') ? JSON.parse(event.data) : event.data;

        if (data.id) currentScriptId = data.id;

        if (data.code) {
            const origin = data.source === 'ai' || data.source === 'auto-fix' ? data.source : 'user';
            setEditorCode(data.code, origin);
        }
        const nameInput = byId('script_name_input');
        const name = (data.style && data.style.label) || data.label || data.name;
        if (nameInput && name) nameInput.value = name;

        if (data.icon) {
            const storedIcon = storedIconValue(data.icon);
            const input = byId('icon_value');
            if (input) input.value = storedIcon;
            const trigger = byId('icon_trigger');
            if (trigger) setTriggerIcon(trigger, storedIcon);
        }
        const colorInput = byId('color_hex_input');
        if (colorInput) {
            colorInput.value = normalizeHex(TATA.resolveColor ? TATA.resolveColor(data.color) : data.color);
            colorInput.dispatchEvent(new Event('input'));
        }

        updateEditorStatus('edit', (data.label || data.name || 'Script'));
        activateTab('tab_editor');
        showToast(`Editing ${data.label || data.name || 'script'}`);
    }

    let promptInFlight = false;

    async function handleSendPrompt() {
        if (promptInFlight) return;

        const txtPrompt = byId('prompt_input');
        const userText = txtPrompt ? txtPrompt.value.trim() : '';
        if (!userText) return;

        let apiKey = localStorage.getItem('tata_replicate_api_token');
        if (!apiKey) {
            const inlineInput = byId('api_key_inline_input');
            if (inlineInput && inlineInput.value.trim()) {
                apiKey = inlineInput.value.trim();
                localStorage.setItem('tata_replicate_api_token', apiKey);
            }
        }
        if (!apiKey) {
            addChatBubble('ai', 'ไม่พบ API token. กรอก Replicate API token ในช่องด้านบน หรือใน Settings');
            const keySection = byId('api_key_section');
            if (keySection) keySection.hidden = false;
            return;
        }

        promptInFlight = true;
        const btnSend = byId('btn_send_prompt');
        if (btnSend) btnSend.disabled = true;

        addChatBubble('user', userText);
        txtPrompt.value = '';
        const promptBox = document.querySelector('.prompt-box');
        if (promptBox) promptBox.classList.add('thinking');
        const loadingId = addChatBubble('ai', 'Thinking...', { loading: true });

        try {
            const currentCode = getEditorCode();
            let prompt = userText;
            if (currentCode.length > 50 && !currentCode.includes('// Your code')) {
                prompt = `Current Code:\n\`\`\`javascript\n${currentCode}\n\`\`\`\n\nTask: ${userText}\n\nModify code. Return full code.`;
            }
            const selectedModel = TATA.resolveAiModel(TATA.getStored ? TATA.getStored('tata_ai_model') : '');
            prompt = await withWorkspaceContext(prompt);
            const result = await callAI(apiKey, prompt, selectedModel);

            const loadingBubble = byId(loadingId);
            if (loadingBubble) loadingBubble.closest('.chat-message-row').remove();

            if (result.message) addChatBubble('ai', result.message);
            if (result.code) {
                addChatBubble('ai', 'Code updated. Review it in the Editor, then Run.');
                setEditorCode(result.code, 'ai');
                activateTab('tab_editor');
                showToast('Code generated', 'success');
                const nameInput = byId('script_name_input');
                saveRecentCode(result.name || (nameInput && nameInput.value) || 'AI Script', result.code, 'ai');
                if (!currentScriptId) currentScriptId = `ai_script_${Date.now()}`;
            }
            if (result.name) {
                const nameInput = byId('script_name_input');
                if (nameInput) nameInput.value = result.name;
                const slug = result.name.replace(/\s+/g, '_').toLowerCase();
                if (!String(currentScriptId).includes(slug)) currentScriptId = `${slug}_${Date.now()}`;
            }
        } catch (e) {
            const lb = byId(loadingId);
            if (lb) lb.textContent = `Error: ${e && e.message ? e.message : e}`;
        } finally {
            promptInFlight = false;
            if (btnSend) btnSend.disabled = false;
            if (promptBox) promptBox.classList.remove('thinking');
        }
    }

    const MAX_AUTO_FIX = 2;

    function handleTestRun() {
        return runCodeWithAutoFix(getEditorCode(), 0);
    }

    function runCodeWithAutoFix(code, attempt) {
        const source = attempt > 0 ? 'auto-fix' : editorOrigin;
        const runner = TATA.runConfirmedJsx;
        if (typeof runner !== 'function') {
            showToast('Script runner is unavailable', 'error');
            return undefined;
        }
        return runner(code, source).then(result => {
            if (!result || result.ran !== true) {
                addChatBubble('ai', 'Run cancelled. Illustrator did not receive this script.');
                showToast('Run cancelled');
                return;
            }
            handleRunResult(code, attempt, result.res);
        });
    }

    async function handleRunResult(code, attempt, res) {
        if (!res || res === 'undefined') {
            showToast('Script ran', 'success');
            return;
        }
        if (!(/Error|Exception|ReferenceError|SyntaxError/.test(res) || res.includes('Line:'))) {
            addChatBubble('ai', `Result: ${res}`);
            showToast('Script ran', 'success');
            return;
        }
        if (attempt >= MAX_AUTO_FIX) {
            showErrorToUser(res);
            return;
        }
        showToast(`Auto-fixing (attempt ${attempt + 1} of ${MAX_AUTO_FIX})`);
        addChatBubble('ai', `Auto-fixing error... (attempt ${attempt + 1})`);
        try {
            const apiKey = localStorage.getItem('tata_replicate_api_token');
            if (!apiKey) throw new Error('No API key');
            const fixPrompt = `Fix this Adobe Illustrator JSX code error:\n\nError: ${res}\n\nCode:\n\`\`\`javascript\n${code}\n\`\`\`\n\nFix the error and return the corrected code.`;
            const selectedModel = TATA.resolveAiModel(TATA.getStored ? TATA.getStored('tata_ai_model') : '');
            const result = await callAI(apiKey, fixPrompt, selectedModel);
            if (!result.code) throw new Error("AI couldn't fix");
            setEditorCode(result.code, 'auto-fix');
            addChatBubble('ai', 'Code fixed. Review it, then confirm the retry.');
            setTimeout(() => runCodeWithAutoFix(result.code, attempt + 1), 500);
        } catch (e) {
            showErrorToUser(res);
        }
    }

    function showErrorToUser(errorMsg) {
        addChatBubble('ai', `Error after ${MAX_AUTO_FIX} auto-fix attempts: ${errorMsg}`);
        showToast('Script error: auto-fix failed', 'error');
        activateTab('tab_ai');
    }

    function handleImport() {
        const scriptCode = getEditorCode();
        if (!scriptCode || !scriptCode.trim()) {
            showToast('No code to import', 'error');
            return;
        }
        const nameInput = byId('script_name_input');
        const iconInput = byId('icon_value');
        const colorInput = byId('color_hex_input');
        const scriptName = (nameInput && nameInput.value.trim()) || 'New Script';
        const scriptIcon = storedIconValue(iconInput ? iconInput.value : '');
        const scriptColor = colorInput ? normalizeHex(colorInput.value) : '';

        if (typeof TATA.saveUserScript !== 'function') {
            showToast('Could not import this script', 'error');
            return;
        }
        const origin = typeof TATA.getEditorOrigin === 'function' ? TATA.getEditorOrigin() : 'user';
        TATA.saveUserScript(scriptName, scriptIcon, scriptCode, scriptColor, false, null, false, origin);
        showToast(`Added "${scriptName}" to Tools`, 'success');
        setTimeout(() => activateTab('tab_button'), 150);
    }

    function handleClearChat() {
        const container = byId('chat_history');
        if (!container) return;
        container.textContent = '';
        addChatBubble('ai', 'Chat cleared (context reset).');
    }

    // ==================== WORKSPACE CONTEXT (opt-in) ====================
    const WORKSPACE_SHARE_KEY = 'tata_share_workspace_context';
    const WORKSPACE_SHARE_MESSAGE = [
        'Send the open Illustrator document to Replicate with your prompt?',
        '',
        'This includes the document name, text, metadata, and file paths.',
        'The choice is remembered: Share sends that context on later requests too.',
        'Not now sends only your prompt this time.',
        'Turn it off later with "Stop sharing document context" in Settings.'
    ].join('\n');

    function shareRemembered() {
        try { return localStorage.getItem(WORKSPACE_SHARE_KEY) === 'yes'; } catch (e) { return false; }
    }

    function fetchWorkspaceContext(prompt) {
        return new Promise(resolve => {
            if (TATA.host && typeof TATA.host.run === 'function') {
                TATA.host.run('getWorkspaceContext', undefined, result => resolve(result));
            } else {
                resolve(null);
            }
        }).then(wsContext => {
            if (wsContext && wsContext !== 'EvalScript error.' && String(wsContext).indexOf('{') === 0) {
                return `===== CURRENT WORKSPACE =====\n${wsContext}\n\nUse this workspace data to understand the document.\nReference actual layers, objects, selection, and text from the data above.\nIf the user mentions objects, check the selection and layer data.\n\nUser Request: ${prompt}`;
            }
            return prompt;
        }).catch(() => prompt);
    }

    // Nothing leaves the panel until the user says yes once.
    function withWorkspaceContext(prompt) {
        if (shareRemembered()) return fetchWorkspaceContext(prompt);
        if (typeof TATA.askConfirm !== 'function') return Promise.resolve(prompt);
        return TATA.askConfirm({
            title: 'Share document context',
            message: WORKSPACE_SHARE_MESSAGE,
            confirmLabel: 'Share',
            cancelLabel: 'Not now'
        }).then(allowed => {
            if (!allowed) return prompt;
            try { localStorage.setItem(WORKSPACE_SHARE_KEY, 'yes'); } catch (e) { /* storage blocked */ }
            return fetchWorkspaceContext(prompt);
        });
    }

    // ==================== API KEY (inline, AI tab) ====================
    function initApiKeySection() {
        const pasteBtn = byId('btn_paste_api_key');
        const saveBtn = byId('btn_save_api_key');
        const apiInput = byId('api_key_inline_input');
        if (!apiInput || apiInput.dataset.bound === '1') return;
        apiInput.dataset.bound = '1';

        function syncPasteButton() {
            if (pasteBtn) pasteBtn.hidden = apiInput.value.trim().length > 0;
        }

        // Reads the clipboard only when Paste is pressed (never polls).
        if (pasteBtn) {
            pasteBtn.addEventListener('click', () => {
                if (!navigator.clipboard || !navigator.clipboard.readText) return;
                navigator.clipboard.readText().then(text => {
                    if (!text || !text.trim()) return;
                    apiInput.value = text.trim();
                    syncPasteButton();
                }).catch(() => showToast('Could not read the clipboard', 'error'));
            });
        }
        apiInput.addEventListener('input', syncPasteButton);
        apiInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') saveInlineApiKey();
        });
        if (saveBtn) saveBtn.addEventListener('click', saveInlineApiKey);
    }

    function saveInlineApiKey() {
        const input = byId('api_key_inline_input');
        if (!input || !input.value.trim()) {
            showToast('Enter a Replicate API token first', 'error');
            return;
        }
        localStorage.setItem('tata_replicate_api_token', input.value.trim());
        input.value = '';
        const keySection = byId('api_key_section');
        if (keySection) keySection.hidden = true;
        showToast('API token saved', 'success');
        addChatBubble('ai', 'Replicate API token บันทึกแล้ว ลองพิมพ์คำสั่งได้เลยครับ');
    }

    // ==================== HELPERS ====================
    function parseModelJson(text) {
        const cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
            return JSON.parse(cleaned);
        } catch (e) {
            const start = cleaned.indexOf('{');
            const end = cleaned.lastIndexOf('}');
            if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
            throw new Error('Model did not return JSON');
        }
    }

    async function callAI(apiKey, prompt, model) {
        const systemPrompt = "You are an Adobe Illustrator JSX expert. Return JSON: { \"name\": \"Short Script Name (2-4 words)\", \"message\": \"...\", \"code\": \"...\" }. Use ES3 JS only.";
        const modelName = window.TATA.resolveAiModel(model);
        const text = await window.TATA.runReplicate(apiKey, modelName, {
            prompt: prompt,
            system_prompt: systemPrompt,
            max_tokens: 2048,
            temperature: 0.4
        });
        const modelBadge = byId('ai_model_name');
        if (modelBadge) modelBadge.textContent = modelName;
        return parseModelJson(text);
    }

    function storedIconValue(icon) {
        if (typeof TATA.sanitizeSvg === 'function') {
            const safe = TATA.sanitizeSvg(icon);
            if (safe) return safe;
        }
        if (typeof TATA.plainIconText === 'function') {
            const plain = TATA.plainIconText(icon);
            if (plain) return plain;
        }
        const text = String(icon == null ? '' : icon).trim();
        if (text && text.charAt(0) !== '<') return text.slice(0, 8);
        return '★';
    }

    function mountTrustedIcon(container, icon) {
        if (!container) return;
        if (typeof TATA.mountSanitizedIcon === 'function') {
            TATA.mountSanitizedIcon(container, icon, '★');
            return;
        }
        container.textContent = storedIconValue(icon);
    }

    function addChatBubble(type, text, options) {
        const container = byId('chat_history');
        if (!container) return undefined;

        const message = text == null ? '' : String(text);
        const row = document.createElement('div');
        row.className = `chat-message-row ${type}`;

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${type}`;
        bubble.id = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        if (options && options.loading) {
            const dots = document.createElement('span');
            dots.className = 'loading-dots';
            dots.setAttribute('data-text', message || 'Thinking...');
            dots.textContent = message || 'Thinking...';
            bubble.appendChild(dots);
        } else {
            bubble.textContent = message;
        }

        if (type === 'user') {
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'btn btn--icon btn--sm msg-copy-btn';
            copyBtn.title = 'Copy text';
            copyBtn.setAttribute('aria-label', 'Copy text');
            mountTrustedIcon(copyBtn, ICONS.copy);
            copyBtn.addEventListener('click', () => {
                if (!navigator.clipboard) return;
                navigator.clipboard.writeText(bubble.textContent || '').then(() => showToast('Copied'));
            });
            row.appendChild(copyBtn);
        }

        row.appendChild(bubble);
        container.appendChild(row);
        container.scrollTop = container.scrollHeight;
        return bubble.id;
    }

    // ==================== RECENT CODE ====================
    const RECENT_CODE_KEY = 'rocket_launcher_recent_code';
    const MAX_RECENT = 5;

    function getRecentCodes() {
        try {
            const data = localStorage.getItem(RECENT_CODE_KEY);
            const list = data ? JSON.parse(data) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function saveRecentCode(name, code, origin) {
        if (!code || code.trim().length < 10) return;
        const list = getRecentCodes().filter(item => item && item.name !== name);
        list.unshift({
            name: name || 'Untitled',
            code,
            origin: origin === 'ai' || origin === 'auto-fix' ? origin : 'user',
            timestamp: Date.now()
        });
        localStorage.setItem(RECENT_CODE_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
        renderRecentCodes();
    }

    function renderRecentCodes() {
        const container = byId('recent_code_list');
        if (!container) return;
        const list = getRecentCodes();
        container.textContent = '';

        if (list.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'recent-code-empty';
            empty.textContent = 'No recent code yet';
            container.appendChild(empty);
            return;
        }

        list.forEach(item => {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'recent-code-item';
            row.title = `Load "${item.name || 'Untitled'}" into the editor`;
            row.insertAdjacentHTML('afterbegin', FILE_ICON);

            const info = document.createElement('span');
            info.className = 'rc-info';
            const nameEl = document.createElement('span');
            nameEl.className = 'rc-name';
            nameEl.textContent = item.name || '';
            const timeEl = document.createElement('span');
            timeEl.className = 'rc-time';
            timeEl.textContent = getTimeAgo(item.timestamp);
            if (item.origin === 'ai' || item.origin === 'auto-fix') {
                const source = document.createElement('span');
                source.className = 'rc-source';
                source.textContent = 'AI';
                timeEl.appendChild(source);
            }
            info.appendChild(nameEl);
            info.appendChild(timeEl);

            const load = document.createElement('span');
            load.className = 'rc-load';
            load.textContent = 'Load';

            row.appendChild(info);
            row.appendChild(load);
            row.addEventListener('click', () => {
                const origin = item.origin === 'ai' || item.origin === 'auto-fix' ? item.origin : 'user';
                setEditorCode(item.code, origin);
                const nameInput = byId('script_name_input');
                if (nameInput) nameInput.value = item.name;
                activateTab('tab_editor');
                showToast(`Loaded ${item.name}`);
            });
            container.appendChild(row);
        });
    }

    function getTimeAgo(ts) {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    }

    function initRecentCode() {
        renderRecentCodes();
        const btnClear = byId('btn_clear_recent');
        if (btnClear && btnClear.dataset.bound !== '1') {
            btnClear.dataset.bound = '1';
            btnClear.addEventListener('click', () => {
                localStorage.removeItem(RECENT_CODE_KEY);
                renderRecentCodes();
                showToast('Recent code cleared');
            });
        }
    }

    // ==================== CODEMIRROR (lazy) ====================
    let cmEditor = null;
    let cmLoadRequested = false;

    function ensureCodeMirror(cb) {
        if (cmEditor) { if (cb) cb(); return; }
        if (cmLoadRequested) return; // wait for the current load
        cmLoadRequested = true;

        getCS();
        const base = (extensionPath || TATA.extensionPath || '').replace(/\\/g, '/');
        loadCss(base + '/js/libs/codemirror/codemirror.min.css');
        loadCss(base + '/js/libs/codemirror/material-darker.min.css');
        loadScript(base + '/js/libs/codemirror/codemirror.min.js', () => {
            loadScript(base + '/js/libs/codemirror/javascript.min.js', () => {
                initCodeMirror();
                if (cb) cb();
            });
        });
    }

    function initCodeMirror() {
        const textarea = byId('code_editor');
        if (!textarea || typeof CodeMirror === 'undefined') return;
        cmEditor = window.cmEditor = CodeMirror.fromTextArea(textarea, {
            mode: 'javascript',
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: true
        });
        cmEditor.on('change', () => cmEditor.save());
    }

    function getEditorCode() {
        if (cmEditor) return cmEditor.getValue();
        const el = byId('code_editor');
        return el ? el.value : '';
    }

    function setEditorCode(code, origin) {
        if (origin === 'ai' || origin === 'auto-fix') editorOrigin = origin;
        else if (origin) editorOrigin = 'user';
        if (cmEditor) {
            cmEditor.setValue(code);
            setTimeout(() => cmEditor.refresh(), 10);
        } else {
            const el = byId('code_editor');
            if (el) el.value = code;
        }
    }

    window.getEditorCode = getEditorCode;
    window.setEditorCode = setEditorCode;
    window.cmEditor = null; // set by initCodeMirror

    TATA.initScripting = init;
    TATA.ensureCodeMirror = ensureCodeMirror;
    TATA.addChatBubble = addChatBubble;
    TATA.runEditorScript = runCodeWithAutoFix;
    TATA.markEditorOrigin = origin => {
        editorOrigin = origin === 'ai' || origin === 'auto-fix' ? origin : 'user';
    };
    TATA.getEditorOrigin = () => editorOrigin;
    TATA.withWorkspaceContext = withWorkspaceContext;
    TATA.openEditorForItem = data => {
        handleEditScriptEvent({ data: data || {} });
    };
})();

// ==========================================
// Replicate client used by the editor AI flow above.
// ==========================================
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    function replicateOutputText(output) {
        if (Array.isArray(output)) return output.join('');
        if (typeof output === 'string') return output;
        if (output == null) return '';
        return String(output);
    }

    window.TATA.DEFAULT_AI_MODEL = 'google/gemini-3-flash';

    window.TATA.resolveAiModel = stored => {
        if (!stored || stored.indexOf('/') < 0 || stored.indexOf('llama') !== -1) {
            return window.TATA.DEFAULT_AI_MODEL;
        }
        return stored;
    };

    function replicateInputForModel(model, input) {
        const next = Object.assign({}, input || {});
        if (model.indexOf('gemini') === -1) return next;
        if (next.system_prompt && !next.system_instruction) {
            next.system_instruction = next.system_prompt;
        }
        delete next.system_prompt;
        if (next.max_tokens && !next.max_output_tokens) {
            next.max_output_tokens = next.max_tokens;
        }
        delete next.max_tokens;
        if (!next.thinking_level) next.thinking_level = 'low';
        return next;
    }

    window.TATA.REPLICATE_LIMITS = {
        requestTimeoutMs: 70000,
        pollTimeoutMs: 15000,
        maxPolls: 8,
        pollDelayMs: 2000
    };

    function replicatePollUrl(data) {
        const id = encodeURIComponent(data && data.id ? data.id : '');
        const fallback = `https://api.replicate.com/v1/predictions/${id}`;
        const candidate = data && data.urls && data.urls.get;
        if (typeof candidate === 'string' && candidate.indexOf('https://api.replicate.com/') === 0) return candidate;
        return fallback;
    }

    function replicateTimeoutError(error) {
        if (error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
            return new Error('Replicate request timed out');
        }
        return error;
    }

    window.TATA.runReplicate = async (token, model, input, limits) => {
        if (!/^[\w.-]+\/[\w.-]+$/.test(String(model || ''))) {
            throw new Error('Invalid Replicate model id');
        }
        const cfg = Object.assign({}, window.TATA.REPLICATE_LIMITS, limits || {});
        const fetchTimed = window.TATA.fetchWithTimeout;
        if (typeof fetchTimed !== 'function') throw new Error('Timed fetch is unavailable');

        let response;
        try {
            response = await fetchTimed(`https://api.replicate.com/v1/models/${model}/predictions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Prefer: 'wait=60'
                },
                body: JSON.stringify({ input: replicateInputForModel(model, input) })
            }, cfg.requestTimeoutMs);
        } catch (error) {
            throw replicateTimeoutError(error);
        }
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Replicate ${response.status}: ${errText.slice(0, 180)}`);
        }

        let data = await response.json();
        for (let attempt = 0; data.status && data.status !== 'succeeded' && data.status !== 'failed' && data.status !== 'canceled' && attempt < cfg.maxPolls; attempt++) {
            if (cfg.pollDelayMs) {
                await new Promise(resolve => { setTimeout(resolve, cfg.pollDelayMs); });
            }
            let poll;
            try {
                poll = await fetchTimed(replicatePollUrl(data), {
                    headers: { Authorization: `Bearer ${token}` }
                }, cfg.pollTimeoutMs);
            } catch (error) {
                throw replicateTimeoutError(error);
            }
            if (!poll.ok) throw new Error(`Replicate poll ${poll.status}`);
            data = await poll.json();
        }

        if (data.status === 'failed' || data.status === 'canceled') {
            throw new Error(data.error || `Replicate ${data.status}`);
        }
        if (data.status !== 'succeeded') throw new Error('Replicate timed out before the model finished');
        return replicateOutputText(data.output);
    };
})();
