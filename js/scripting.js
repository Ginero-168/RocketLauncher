(() => {
    'use strict';

    window.TATA = window.TATA || {};

    let csInterface = null; // Lazy init
    let extensionPath = '';
    let currentScriptId = 'default_script';

    function getCS() {
        if (!csInterface) {
            csInterface = TATA.csInterface || new CSInterface();
            try { extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION); } catch (e) { }
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

    // ==================== ICONS ====================
    // Expanded icon library (60+ icons)
    const ICONS = {
        // Emoji Icons
        star: '★', play: '▶', bolt: '⚡', gear: '⚙️', check: '✅', heart: '❤️', fire: '🔥', gem: '💎',

        // Actions
        add: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
        remove: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13H5v-2h14v2z"/></svg>',
        delete: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
        edit: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
        copy: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
        undo: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>',
        redo: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>',

        // Navigation
        home: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
        menu: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>',
        settings: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
        search: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
        close: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',

        // Design Tools
        palette: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
        brush: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z"/></svg>',
        colorize: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z"/></svg>',
        crop: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z"/></svg>',
        transform: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>',
        layers: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16zm0-11.47L17.74 9 12 13.47 6.26 9 12 4.53z"/></svg>',
        grid: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>',

        // Objects
        circle: '<svg viewBox="0 0 24 24"><circle fill="currentColor" cx="12" cy="12" r="10"/></svg>',
        square: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h18v18H3z"/></svg>',
        triangle: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L2 22h20z"/></svg>',

        // Files
        folder: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
        file: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
        image: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
        code: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',

        // Misc
        lightbulb: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>',
        magic: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29c-.39-.39-1.02-.39-1.41 0L1.29 18.96c-.39.39-.39 1.02 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05c.39-.39.39-1.02 0-1.41l-2.33-2.35zm-1.03 5.49l-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44z"/></svg>',
        robot: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/></svg>',
        download: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
        upload: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>',
        refresh: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>',
        save: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',

        // TATA Core (from old)
        fit: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h4v2H4v4H2V4a2 2 0 0 1 2-2zm16 0h-4v2h4v4h2V4a2 2 0 0 0-2-2zM4 20h4v-2H4v-4H2v4a2 2 0 0 0 2 2zm16 0h-4v-2h4v-4h2v4a2 2 0 0 0-2 2z" /></svg>',
        resize: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 12h-2.26l2.03-2.03l-1.41-1.41L15.31 10.6V8.34h-2v4.66h4.66v-2h-2.66zM7 12h2.26L7.23 14.03l1.41 1.41L10.69 13.4v2.26h2v-4.66H8.03v2H10.69z" /></svg>',
        follow: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" /></svg>',
        arrange: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z" /></svg>',
        stars: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>',
        embed: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" /></svg>',
        preview: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>',
        clean: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>',
        text: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>',
        align: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 22H2V2h2v20zM22 7H6v3h16V7zm-6 7H6v3h10v-3z"/></svg>',
        ruler: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z"/></svg>',
        artboard: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 7v10H4V7h16m0-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/></svg>',
        path: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M11.71 17.99C8.53 17.84 6 15.22 6 12c0-3.31 2.69-6 6-6c3.22 0 5.84 2.53 5.99 5.71l-2.1.22c-.14-1.97-1.77-3.52-3.76-3.52c-2.09 0-3.79 1.7-3.79 3.79c0 2.02 1.56 3.65 3.52 3.76l.22-2.1c3.18.15 5.71 2.77 5.71 5.99c-3.31 0-6-2.69-6-6l-2.1.21z"/></svg>',
        export: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7l7-7zM5 18v2h14v-2H5z"/></svg>',
        import: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16h6v-6h4l-7-7l-7 7h4zm-4 2h14v2H5z"/></svg>'
    };

    // ==================== INIT ====================
    function init() {
        console.log("Rocket Launcher Scripting: Init started");

        // Load default script if empty
        const editor = document.getElementById('code_editor');
        if (editor && editor.value.trim() === "// Your code will appear here...") {
            editor.value = "// Example: \n// var doc = app.activeDocument;\nalert('Hello world');";
        }

        initTabs();
        initIconPicker();
        initColorPicker(); // V4 Custom Color Picker
        initRecentCode();
        initListeners();

        // V3: CodeMirror is lazy-loaded when the Editor tab is first opened

        // V4: Status Init
        updateEditorStatus('new');

        // Request Settings from Main Panel (only when standalone)
        const cs = getCS();
        try {
            const req = new CSEvent("com.tata.pro.requestSettings", "APPLICATION");
            cs.dispatchEvent(req);
        } catch (e) { }

        // Load API Key Check
        const apiKey = localStorage.getItem('tata_gemini_api_key');
        if (!apiKey) {
            const keySection = document.getElementById('api_key_section');
            if (keySection) keySection.style.display = 'flex';
            addChatBubble("ai", "⚠️ กรุณากรอก <b>Gemini API Key</b> ในช่องด้านบนก่อนใช้งาน");
        }
    }

    // ==================== FEATURES ====================

    function initListeners() {
        // Send Prompt
        const btnSend = document.getElementById('btn_send_prompt');
        if (btnSend) btnSend.addEventListener('click', handleSendPrompt);

        // Test Run
        const btnTest = document.getElementById('btn_test');
        if (btnTest) btnTest.addEventListener('click', handleTestRun);

        // Import
        const btnImport = document.getElementById('btn_editor_import') || document.getElementById('btn_import');
        if (btnImport) btnImport.addEventListener('click', handleImport);

        // Clear Chat
        const btnClear = document.getElementById('btn_clear_chat');
        if (btnClear) btnClear.addEventListener('click', handleClearChat);

        // V3: Copy Last Code Button (Global) - OPTIONAL/REMOVED in V4.1
        const btnCopy = document.getElementById('btn_copy_code');
        if (btnCopy) {
            btnCopy.addEventListener('click', () => {
                const code = getEditorCode();
                if (code && code.trim()) {
                    navigator.clipboard.writeText(code).then(() => {
                        showToast("Code copied!");
                    });
                }
            });
        }

        // Edit Mode Listener
        const cs = getCS();
        cs.addEventListener("com.tata.pro.editScript", handleEditScriptEvent);

        // Settings Listener
        cs.addEventListener("com.tata.pro.settingsData", event => {
            const data = (typeof event.data === 'string') ? JSON.parse(event.data) : event.data;
            if (data.apiKey) {
                localStorage.setItem('tata_gemini_api_key', data.apiKey);
                // ซ่อน inline input เมื่อได้รับ key แล้ว
                const keySection = document.getElementById('api_key_section');
                if (keySection) keySection.style.display = 'none';
            }
        });

        // Upload to Server
        const btnUpload = document.getElementById('btn_upload_server');
        if (btnUpload) btnUpload.addEventListener('click', handleUploadToServer);

        // Save API Key button (embedded in main panel)
        const btnSaveKey = document.getElementById('btn_save_api_key');
        if (btnSaveKey) btnSaveKey.addEventListener('click', window.saveInlineApiKey);

        // Keyboard Shortcuts
        document.addEventListener('keydown', e => {
            // Ctrl+Enter or Cmd+Enter = Run Script
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleTestRun();
                showToast('▶ Running script... (Ctrl+Enter)');
            }
            // Ctrl+S or Cmd+S = Save to Library
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const btnSave = document.getElementById('btn_save');
                if (btnSave) btnSave.click();
                showToast('💾 Saving... (Ctrl+S)');
            }
            // Escape = Close modals
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal.active, .modal-overlay.active');
                modals.forEach(m => { m.classList.remove('active'); });
            }
        });
    }

    // ==================== SUPABASE CONFIG (optional: only for upload to server) ====================
    const SUPABASE_URL = (window.TATA_CONFIG && window.TATA_CONFIG.SUPABASE_URL) || '';
    const SUPABASE_KEY = (window.TATA_CONFIG && window.TATA_CONFIG.SUPABASE_KEY) || '';

    function handleUploadToServer() {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            showToast('Server upload not configured.');
            return;
        }
        const nameInput = document.getElementById('script_name_input');
        const iconInput = document.getElementById('icon_value');
        const colorTrigger = document.getElementById('color_trigger');

        const name = nameInput ? nameInput.value.trim() : '';
        const code = getEditorCode();
        const icon = iconInput ? iconInput.value : '★';

        // Validation
        if (!name) {
            showToast('⚠️ Please enter a script name');
            return;
        }
        if (!code || code === '// Your code will appear here...') {
            showToast('⚠️ Please write some code first');
            return;
        }

        // Determine category based on color
        const color = colorTrigger ? colorTrigger.style.background : '#3b82f6';
        let category = 'tools';
        if (color.includes('ef4444') || color.includes('239, 68, 68')) category = 'swift';
        else if (color.includes('f59e0b') || color.includes('245, 158, 11')) category = 'creative';
        else if (color.includes('8b5cf6') || color.includes('139, 92, 246')) category = 'tools';

        const data = {
            name,
            description: name,
            code,
            icon,
            category,
            author_name: 'Anonymous',
            votes: 0,
            downloads: 0
        };

        // Show loading
        const btn = document.getElementById('btn_upload_server');
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';

        fetch(`${SUPABASE_URL}/rest/v1/scripts`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        })
            .then(res => {
                if (!res.ok) throw new Error('Upload failed');
                return res.json();
            })
            .then(() => {
                showToast('🎉 Script uploaded to Explore!');
            })
            .catch(err => {
                showToast(`❌ Upload failed: ${err.message}`);
            })
            .finally(() => {
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            });
    }

    function initTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(t => {
            t.addEventListener('click', function () {
                const targetId = this.dataset.tab;
                activateTab(targetId);
            });
        });
    }

    function activateTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.id === tabId);
        });
    }

    function initIconPicker() {
        const grid = document.getElementById('icon_grid_popover');
        const trigger = document.getElementById('icon_trigger');
        const input = document.getElementById('icon_value');

        if (!grid || !trigger || !input) return;

        trigger.onclick = e => {
            e.stopPropagation();
            grid.style.display = (grid.style.display === 'block') ? 'none' : 'grid';
        };
        document.addEventListener('click', () => { grid.style.display = 'none'; });
        grid.onclick = e => { e.stopPropagation(); };

        Object.keys(ICONS).forEach(key => {
            const btn = document.createElement('div');
            btn.innerHTML = ICONS[key];
            btn.style.cssText = "width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid transparent; border-radius: 4px; color: #ccc;";
            btn.onmouseover = function () { this.style.background = '#444'; };
            btn.onmouseout = function () { this.style.background = 'transparent'; };

            const svg = btn.querySelector('svg');
            if (svg) { svg.setAttribute('width', '20'); svg.setAttribute('height', '20'); }

            btn.onclick = () => {
                input.value = ICONS[key];
                trigger.innerHTML = ICONS[key];
                const tSvg = trigger.querySelector('svg');
                if (tSvg) { tSvg.setAttribute('width', '18'); tSvg.setAttribute('height', '18'); }
                grid.style.display = 'none';
            };
            grid.appendChild(btn);
        });
    }

    // ==================== V4 CUSTOM COLOR PICKER ====================
    const PRESET_COLORS = [
        'transparent', // No Color option
        '#3b82f6', '#8b5cf6', '#ef4444', '#f97316',
        '#eab308', '#10b981', '#14b8a6', '#06b6d4',
        '#ec4899', '#f43f5e', '#64748b', '#FFD700'
    ];

    function initColorPicker() {
        const trigger = document.getElementById('color_trigger');
        const modal = document.getElementById('color_picker_modal');
        const backdrop = document.getElementById('color_backdrop');
        const grid = document.getElementById('color_grid');
        const input = document.getElementById('color_hex_input');
        const preview = document.getElementById('color_preview');

        if (!trigger || !modal) return;

        // Render Grid
        PRESET_COLORS.forEach(color => {
            const swatch = document.createElement('div');

            // Special styling for transparent "No Color" option
            if (color === 'transparent') {
                swatch.style.cssText = 'width: 100%; height: 30px; border-radius: 4px; cursor: pointer; border: 1px solid rgba(255,255,255,0.4); transition: transform 0.1s; position: relative; overflow: hidden;';
                // Add diagonal red line to indicate "No color"
                swatch.innerHTML = '<div style="position:absolute; top:50%; left:-20%; width:140%; height:2px; background:rgba(255,255,255,0.6); transform:rotate(-25deg); transform-origin:center;"></div>';
                swatch.title = "No Color";
            } else {
                swatch.style.cssText = `width: 100%; height: 30px; background: ${color}; border-radius: 4px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: transform 0.1s;`;
            }

            swatch.onmouseover = function () { this.style.transform = 'scale(1.1)'; };
            swatch.onmouseout = function () { this.style.transform = 'scale(1)'; };
            swatch.onclick = () => {
                setColor(color);
                closeModal();
            };
            grid.appendChild(swatch);
        });

        function setColor(hex) {
            input.value = hex;
            preview.style.background = hex;
            trigger.style.background = hex;
        }

        function openModal() {
            modal.style.display = 'flex';
            backdrop.style.display = 'block';
            setColor(input.value); // Sync UI
        }

        function closeModal() {
            modal.style.display = 'none';
            backdrop.style.display = 'none';
        }

        // Listeners
        trigger.onclick = openModal;
        backdrop.onclick = closeModal;

        input.addEventListener('input', function () {
            const val = this.value;
            if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {
                preview.style.background = val;
                trigger.style.background = val;
            }
        });
    }



    // ==================== V4 EDITOR STATUS ====================
    function updateEditorStatus(mode, name) {
        const el = document.getElementById('editor_status');
        const dot = document.getElementById('editor_status_dot');
        if (!el) return;

        if (mode === 'edit') {
            el.innerHTML = `Editing: <span style='color: #fff; font-weight: 600;'>${name || 'Unknown'}</span>`;
            el.style.color = "#f97316";
            if (dot) dot.classList.add('editing');

            // V4: Button Text
            var btn = document.getElementById('btn_editor_import');
            if (btn) {
                var spanEl = btn.querySelector('span');
                if (spanEl) spanEl.textContent = "Update";
            }
        } else {
            el.innerHTML = "New Script";
            el.style.color = "var(--text-secondary)";
            if (dot) dot.classList.remove('editing');

            // V4: Button Text
            var btn = document.getElementById('btn_editor_import');
            if (btn) {
                var spanEl = btn.querySelector('span');
                if (spanEl) spanEl.textContent = "Import";
            }
        }
    }

    // ==================== HANDLERS ====================

    function handleEditScriptEvent(event) {
        const data = (typeof event.data === 'string') ? JSON.parse(event.data) : event.data;

        if (data.id) currentScriptId = data.id;

        if (data.code) {
            // V3: Use setEditorCode for CodeMirror
            setEditorCode(data.code);
        }
        if (data.style && data.style.label) {
            document.getElementById('script_name_input').value = data.style.label;
        } else if (data.label) {
            document.getElementById('script_name_input').value = data.label;
        } else if (data.name) {
            document.getElementById('script_name_input').value = data.name;
        }

        if (data.icon) {
            const input = document.getElementById('icon_value');
            if (input) input.value = data.icon;

            const trigger = document.getElementById('icon_trigger');
            if (trigger) {
                trigger.innerHTML = data.icon;
                const svg = trigger.querySelector('svg');
                if (svg) { svg.setAttribute('width', '18'); svg.setAttribute('height', '18'); }
            }
        }

        // V4: Update Status
        updateEditorStatus('edit', (data.label || data.name || "Script"));

        activateTab('tab_editor');
        showToast(`Edit Mode: ${data.label || data.name || "Script"}`);
        addChatBubble("ai", "ℹ️ <b>Edit Mode Started</b><br>Code loaded.");
    }

    async function handleSendPrompt() {

        const txtPrompt = document.getElementById('prompt_input');
        const userText = txtPrompt.value.trim();
        if (!userText) return;

        let apiKey = localStorage.getItem('tata_gemini_api_key');

        // ถ้าไม่มี key ใน local → ลอง re-request จาก Main Panel
        if (!apiKey) {
            const req = new CSEvent("com.tata.pro.requestSettings", "APPLICATION");
            getCS().dispatchEvent(req);
            // รอรับ event กลับ 500ms
            await new Promise(resolve => { setTimeout(resolve, 500); });
            apiKey = localStorage.getItem('tata_gemini_api_key');
        }

        // ถ้ายังไม่มี → ลองดึงจาก inline input (ถ้ามี)
        if (!apiKey) {
            const inlineInput = document.getElementById('api_key_inline_input');
            if (inlineInput && inlineInput.value.trim()) {
                apiKey = inlineInput.value.trim();
                localStorage.setItem('tata_gemini_api_key', apiKey);
            }
        }

        if (!apiKey) {
            addChatBubble("ai", "⚠️ <b>ไม่พบ API Key</b><br>กรอก Gemini API Key ในช่องด้านบน หรือตั้งค่าในหน้า Main Panel");
            // แสดง inline input
            const keySection = document.getElementById('api_key_section');
            if (keySection) keySection.style.display = 'flex';
            return;
        }

        addChatBubble("user", userText);
        txtPrompt.value = "";
        // Start thinking animation
        var promptBox = document.querySelector('.prompt-box');
        if (promptBox) promptBox.classList.add('thinking');
        const loadingId = addChatBubble("ai", "<span class='loading-dots' data-text='Thinking...'>Thinking...</span>");

        try {
            // V3: Use getEditorCode for CodeMirror
            const currentCode = getEditorCode();
            let prompt = userText;
            if (currentCode.length > 50 && !currentCode.includes('// Your code')) {
                prompt = `Current Code:\n\`\`\`javascript\n${currentCode}\n\`\`\`\n\nTask: ${userText}\n\nModify code. Return full code.`;
            }

            // V3: Get AI model from Settings (localStorage) or default
            const selectedModel = TATA.getStored('tata_ai_model') || 'gemini-2.0-flash';

            // Workspace Context: scan active Illustrator document
            try {
                const wsContext = await new Promise(resolve => {
                    if (TATA.host && TATA.host.run) {
                        TATA.host.run('getWorkspaceContext', undefined, result => {
                            resolve(result);
                        });
                    } else {
                        resolve(null);
                    }
                });
                if (wsContext && wsContext !== "EvalScript error." && wsContext.indexOf('{') === 0) {
                    prompt = `===== CURRENT WORKSPACE =====\n${wsContext}\n\nUse this workspace data to understand the document.\nReference actual layers, objects, selection, and text from the data above.\nIf the user mentions objects, check the selection and layer data.\n\nUser Request: ${prompt}`;
                }
            } catch (wsErr) { /* workspace context is optional */ }

            const result = await callAI(apiKey, prompt, selectedModel);

            const loadingBubble = document.getElementById(loadingId);
            if (loadingBubble) loadingBubble.remove();

            if (result.message) addChatBubble("ai", result.message);
            if (result.code) {
                addChatBubble("ai", "Code updated!");
                // V3: Use setEditorCode to properly update CodeMirror
                setEditorCode(result.code);
                activateTab('tab_editor');
                showToast("Code Generated!");

                // Save to Recent Code
                const recentName = result.name || document.getElementById('script_name_input').value || 'AI Script';
                saveRecentCode(recentName, result.code);

                if (!currentScriptId) {
                    currentScriptId = `ai_script_${Date.now()}`;
                }
            }
            if (result.name) {
                document.getElementById('script_name_input').value = result.name;
                // Also update currentScriptId based on name if needed
                if (result.name && !currentScriptId.includes(result.name.replace(/\s+/g, '_').toLowerCase())) {
                    currentScriptId = `${result.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
                }
            }
        } catch (e) {
            const lb = document.getElementById(loadingId);
            if (lb) lb.innerText = `Error: ${e.message}`;
        } finally {
            // Stop thinking animation
            var promptBox = document.querySelector('.prompt-box');
            if (promptBox) promptBox.classList.remove('thinking');
        }
    }

    // V3: Track auto-fix attempts
    let autoFixAttempts = 0;
    const MAX_AUTO_FIX = 2;

    function handleTestRun() {
        const code = getEditorCode();
        // V3: Removed auto-save on TestRun - now only saves when AI creates/modifies code
        runCodeWithAutoFix(code, 0);
    }

    function runCodeWithAutoFix(code, attempt) {
        TATA.host.evalCode(code, async res => {
            if (res && res !== 'undefined') {
                if (/Error|Exception|ReferenceError|SyntaxError/.test(res) || res.includes('Line:')) {
                    // Error detected
                    if (attempt < MAX_AUTO_FIX) {
                        // Try to auto-fix
                        showToast(`🔧 Auto-fixing... (Attempt ${attempt + 1}/${MAX_AUTO_FIX})`);
                        addChatBubble("ai", `🔧 <b>Auto-fixing error...</b> (Attempt ${attempt + 1})`);

                        try {
                            const apiKey = localStorage.getItem('tata_gemini_api_key');
                            if (!apiKey) {
                                throw new Error("No API key");
                            }

                            const fixPrompt = `Fix this Adobe Illustrator JSX code error:\n\nError: ${res}\n\nCode:\n\`\`\`javascript\n${code}\n\`\`\`\n\nFix the error and return the corrected code.`;
                            const selectedModel = TATA.getStored('tata_ai_model') || 'gemini-2.0-flash';
                            const result = await callAI(apiKey, fixPrompt, selectedModel);

                            if (result.code) {
                                setEditorCode(result.code);
                                addChatBubble("ai", "✅ Code fixed! Retrying...");
                                // Retry with fixed code
                                setTimeout(() => {
                                    runCodeWithAutoFix(result.code, attempt + 1);
                                }, 500);
                            } else {
                                throw new Error("AI couldn't fix");
                            }
                        } catch (e) {
                            // Auto-fix failed, show error
                            showErrorToUser(res);
                        }
                    } else {
                        // Max attempts reached, show error
                        showErrorToUser(res);
                    }
                } else {
                    addChatBubble("ai", `Result: ${res}`);
                    showToast("✅ Script ran successfully!");
                    autoFixAttempts = 0; // Reset counter on success
                }
            } else {
                showToast("✅ Script ran!");
                autoFixAttempts = 0; // Reset
            }
        });
    }

    function showErrorToUser(errorMsg) {
        addChatBubble("ai", `⚠️ <b>Error (after ${MAX_AUTO_FIX} auto-fix attempts):</b><br><span style='color:#ff6b6b'>${errorMsg}</span>`);
        showToast("❌ Script Error! Auto-fix failed.");
        activateTab('tab_ai');
    }

    function handleImport() {
        const scriptCode = getEditorCode();
        if (!scriptCode || !scriptCode.trim()) {
            showToast("No code to import!", "error");
            return;
        }

        const scriptName = document.getElementById('script_name_input').value || "New Script";
        const scriptIcon = document.getElementById('icon_value').value || "★";
        const scriptColor = document.getElementById('color_hex_input').value || "#3b82f6";

        // Import directly into Button tab (since we're in main panel now)
        if (typeof TATA.saveUserScript === 'function') {
            TATA.saveUserScript(scriptName, scriptIcon, scriptCode, scriptColor, false, null, false);
            showToast("Imported to Button tab!", "success");
        } else {
            // Fallback: dispatch event for external scripting panel
            const data = {
                id: currentScriptId || (`ai_script_${Date.now()}`),
                name: scriptName,
                icon: scriptIcon,
                code: scriptCode,
                color: scriptColor
            };
            const event = new CSEvent("com.tata.pro.importScript", "APPLICATION");
            event.data = JSON.stringify(data);
            getCS().dispatchEvent(event);
        }

        // Switch to Button tab so user can see the new button
        setTimeout(() => {
            activateTab('tab_button');
        }, 150);

        // UI Feedback on Import button
        const btn = document.getElementById('btn_editor_import') || document.getElementById('btn_import');
        if (btn) {
            const spanEl = btn.querySelector('span');
            const original = spanEl ? spanEl.textContent : btn.innerText;
            if (spanEl) spanEl.textContent = "Imported!";
            else btn.innerText = "Imported!";
            btn.style.opacity = '0.6';
            setTimeout(() => {
                if (spanEl) spanEl.textContent = original;
                else btn.innerText = original;
                btn.style.opacity = '1';
            }, 2000);
        }
    }

    function handleClearChat() {
        const container = document.getElementById('chat_history');
        if (!container) return;
        container.innerHTML = ''; // Fully Clear
        // Reset Logic
        autoFixAttempts = 0;
        addChatBubble("ai", "Chat cleared (Context reset).");
    }

    // ==================== HELPERS ====================

    // V3: Multi-Model AI Call
    async function callAI(apiKey, prompt, model) {
        const systemPrompt = "You are an Adobe Illustrator JSX expert. Return JSON: { \"name\": \"Short Script Name (2-4 words)\", \"message\": \"...\", \"code\": \"...\" }. Use ES3 JS only.";

        if (model.startsWith('gemini')) {
            // Gemini API - auto discover working model (updated Jan 2026)
            // Note: Gemini 1.5 was retired April 2025, use 2.0/2.5/3.0 models
            // Gemini API - FORCE GEMINI 3.0 ONLY (User Request)
            let modelsToTry = [];

            // 1. User Preference (if set in Settings)
            const userModel = TATA.getStored('tata_ai_model');
            if (userModel && userModel !== 'gemini-1.5-pro' && userModel !== 'gemini-2.0-flash') {
                modelsToTry.push(userModel);
            }

            // 2. High-Tier Fallbacks
            modelsToTry.push('gemini-3.0-pro-latest');
            modelsToTry.push('gemini-3-pro-preview');
            modelsToTry.push('gemini-3.0-flash-latest');

            // 3. Reliable Fallback
            modelsToTry.push('gemini-2.0-flash');

            // Deduplicate
            modelsToTry = modelsToTry.filter((item, pos) => {
                return modelsToTry.indexOf(item) == pos;
            });
            let lastError = null;

            for (const modelName of modelsToTry) {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                const payload = { "contents": [{ "parts": [{ "text": `${systemPrompt}\n\n${prompt}` }] }] };

                try {
                    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (response.ok) {
                        const data = await response.json();
                        let text = data.candidates[0].content.parts[0].text;
                        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                        console.log(`[RocketLauncher] Using Gemini model: ${modelName}`);

                        // Update UI with used model name (V7.3 Fix)
                        const modelBadge = document.getElementById('ai_model_name');
                        if (modelBadge) {
                            modelBadge.textContent = `(${modelName})`;
                        }

                        return JSON.parse(text);
                    }
                    lastError = `HTTP ${response.status}`;
                } catch (e) {
                    lastError = e.message;
                }
            }

            throw new Error(`Gemini API Error: ${lastError} (tried all models)`);
        } else if (model.startsWith('claude')) {
            // Claude API (Anthropic)
            const claudeKey = localStorage.getItem('tata_claude_api_key') || apiKey; // Fallback to Gemini key for now
            const claudeUrl = "https://api.anthropic.com/v1/messages";
            const claudePayload = {
                model: "claude-3-haiku-20240307",
                max_tokens: 4096,
                messages: [{ role: "user", content: `${systemPrompt}\n\n${prompt}` }]
            };

            const claudeResponse = await fetch(claudeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': claudeKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(claudePayload)
            });

            if (!claudeResponse.ok) throw new Error(`Claude API Error ${claudeResponse.status}`);

            const claudeData = await claudeResponse.json();
            let claudeText = claudeData.content[0].text;
            claudeText = claudeText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(claudeText);
        }

        throw new Error(`Unknown model: ${model}`);
    }

    // Legacy alias
    async function callGemini(apiKey, prompt) {
        return callAI(apiKey, prompt, 'gemini-1.5-pro');
    }

    function addChatBubble(type, html) {
        const container = document.getElementById('chat_history');
        if (!container) return;

        // Wrapper for Layout (Message Row)
        const wrapper = document.createElement('div');
        wrapper.className = `chat-message-row ${type}`;
        wrapper.style.cssText = "display: flex; width: 100%; margin-bottom: 8px; align-items: flex-start;";
        wrapper.style.justifyContent = (type === 'user') ? 'flex-end' : 'flex-start';

        // V4: Per-Message Copy Button (User Only)
        if (type === 'user') {
            // Icon SVG (Copy)
            const copyBtn = document.createElement('div');
            copyBtn.innerHTML = ICONS.copy; // Use existing copy icon
            copyBtn.title = "Copy Text";
            copyBtn.className = "msg-copy-btn";
            // Style: Hidden by default, show on hover
            copyBtn.style.cssText = "width: 24px; height: 24px; margin-right: 8px; cursor: pointer; color: #888; opacity: 0; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center;";

            const svg = copyBtn.querySelector('svg');
            if (svg) { svg.style.width = '16px'; svg.style.height = '16px'; }

            // Copy Logic
            copyBtn.onclick = () => {
                const text = html.replace(/<[^>]*>?/gm, ''); // Strip HTML if any
                navigator.clipboard.writeText(text).then(() => showToast("Copied!"));
            };

            // Hover Logic (Row)
            wrapper.onmouseenter = () => { copyBtn.style.opacity = '1'; };
            wrapper.onmouseleave = () => { copyBtn.style.opacity = '0'; };

            wrapper.appendChild(copyBtn);
        }

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${type}`;
        bubble.id = `msg_${Date.now()}`;
        bubble.innerHTML = html;

        wrapper.appendChild(bubble);
        container.appendChild(wrapper);
        container.scrollTop = container.scrollHeight;
        return bubble.id;
    }

    function showToast(msg) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.innerText = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }

    // ==================== RECENT CODE ====================
    const RECENT_CODE_KEY = 'rocket_launcher_recent_code';
    const MAX_RECENT = 5;

    function getRecentCodes() {
        try {
            const data = localStorage.getItem(RECENT_CODE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveRecentCode(name, code) {
        if (!code || code.trim().length < 10) return;
        let list = getRecentCodes();
        // Remove duplicate if same name exists
        list = list.filter(item => { return item.name !== name; });
        // Add to front
        list.unshift({
            name: name || 'Untitled',
            code,
            timestamp: Date.now()
        });
        // Keep only MAX_RECENT
        if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
        localStorage.setItem(RECENT_CODE_KEY, JSON.stringify(list));
        renderRecentCodes();
    }

    function renderRecentCodes() {
        const container = document.getElementById('recent_code_list');
        if (!container) return;

        const list = getRecentCodes();
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<div class="recent-code-empty">No recent code yet</div>';
            return;
        }

        list.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'recent-code-item';
            row.title = item.name;

            const timeAgo = getTimeAgo(item.timestamp);

            row.innerHTML =
                `<span class="rc-icon">📄</span><div class="rc-info"><div class="rc-name">${escapeHtml(item.name)}</div><div class="rc-time">${timeAgo}</div></div><span class="rc-load">LOAD</span>`;

            row.onclick = () => {
                setEditorCode(item.code);
                const nameInput = document.getElementById('script_name_input');
                if (nameInput) nameInput.value = item.name;
                activateTab('tab_editor');
                showToast(`Loaded: ${item.name}`);
            };

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
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function initRecentCode() {
        renderRecentCodes();
        const btnClear = document.getElementById('btn_clear_recent');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                localStorage.removeItem(RECENT_CODE_KEY);
                renderRecentCodes();
                showToast('Recent code cleared');
            });
        }
    }

    // ==================== V3: CODEMIRROR ====================
    let cmEditor = null;
    let cmLoadRequested = false;

    function ensureCodeMirror(cb) {
        if (cmEditor) { if (cb) cb(); return; }
        if (cmLoadRequested) { return; } // wait for current load
        cmLoadRequested = true;

        getCS();
        const base = (extensionPath || '').replace(/\\/g, '/');
        const css1 = base + '/js/libs/codemirror/codemirror.min.css';
        const css2 = base + '/js/libs/codemirror/material-darker.min.css';
        const js1 = base + '/js/libs/codemirror/codemirror.min.js';
        const js2 = base + '/js/libs/codemirror/javascript.min.js';

        loadCss(css1);
        loadCss(css2);
        loadScript(js1, () => {
            loadScript(js2, () => {
                initCodeMirror();
                if (cb) cb();
            });
        });
    }

    function initCodeMirror() {
        const textarea = document.getElementById('code_editor');
        if (!textarea || typeof CodeMirror === 'undefined') {
            console.log("CodeMirror not available, using fallback textarea");
            return;
        }

        cmEditor = window.cmEditor = CodeMirror.fromTextArea(textarea, {
            mode: 'javascript',
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: true,
            autoCloseBrackets: true,
            matchBrackets: true
        });

        // Sync with hidden textarea for form submissions
        cmEditor.on('change', () => {
            cmEditor.save();
        });

        // Style adjustments
        const cmWrapper = cmEditor.getWrapperElement();
        cmWrapper.style.flex = '1';
        cmWrapper.style.fontSize = '12px';
        cmWrapper.style.height = 'auto';
    }

    // CodeMirror helpers
    function getEditorCode() {
        if (cmEditor) {
            return cmEditor.getValue();
        }
        const el = document.getElementById('code_editor');
        return el ? el.value : '';
    }

    function setEditorCode(code) {
        if (cmEditor) {
            cmEditor.setValue(code);
            // Force refresh to display immediately without click
            setTimeout(() => { cmEditor.refresh(); }, 10);
        } else {
            const el = document.getElementById('code_editor');
            if (el) el.value = code;
        }
    }

    // Expose to window for external access
    window.getEditorCode = getEditorCode;
    window.setEditorCode = setEditorCode;

    // Save API Key from inline input
    window.saveInlineApiKey = () => {
        const input = document.getElementById('api_key_inline_input');
        if (!input || !input.value.trim()) {
            showToast('⚠️ กรุณากรอก API Key');
            return;
        }
        const key = input.value.trim();
        localStorage.setItem('tata_gemini_api_key', key);

        // ซ่อน section
        const keySection = document.getElementById('api_key_section');
        if (keySection) keySection.style.display = 'none';

        showToast('✅ บันทึก API Key แล้ว');
        addChatBubble("ai", "✅ API Key บันทึกแล้ว! ลองพิมพ์คำสั่งได้เลยครับ");
    };

    // Export to TATA namespace (no auto-init)
    TATA.initScripting = init;
    TATA.ensureCodeMirror = ensureCodeMirror;

    // Expose editor helpers globally
    window.cmEditor = null; // Will be set by initCodeMirror

})();


// ==========================================
// Export AI Call logic for ai-agent.js
// ==========================================
window.TATA = window.TATA || {};
window.TATA.callGemini = async messages => {
    let apiKey = localStorage.getItem('tata_gemini_api_key');
    if (!apiKey) {
        const inlineInput = document.getElementById('api_key_inline_input');
        if (inlineInput && inlineInput.value.trim()) {
            apiKey = inlineInput.value.trim();
        }
    }
    if (!apiKey) throw new Error('API Key missing. Please provide Gemini API Key.');

    const geminiContents = [];
    let systemInstruction = null;

    for (const msg of messages) {
        let textContent = msg.content || (msg.parts && msg.parts[0] ? msg.parts[0].text : '');
        if (typeof textContent !== 'string') textContent = String(textContent);
        textContent = textContent.trim();
        if (!textContent) continue;

        if (msg.role === 'system') {
            systemInstruction = { parts: [{ text: textContent }] };
        } else {
            geminiContents.push({
                role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: textContent }]
            });
        }
    }

    const payload = {
        contents: geminiContents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
        }
    };
    if (systemInstruction) {
        payload.systemInstruction = systemInstruction;
    }

    let model = 'gemini-2.0-flash';
    const userModel = TATA.getStored('tata_ai_model');
    if (userModel) model = userModel;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return {
            text: data.candidates[0].content.parts[0].text,
            model
        };
    }
    throw new Error('Invalid response from AI');
};
