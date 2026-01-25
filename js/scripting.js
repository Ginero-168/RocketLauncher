(function () {
    'use strict';

    var csInterface = new CSInterface();
    var extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
    var currentScriptId = 'default_script'; // Track ID for edits - start with default

    // ==================== ICONS ====================
    // Expanded icon library (60+ icons)
    var ICONS = {
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
        console.log("TATA Scripting Info: Init started");

        // Load default script if empty
        var editor = document.getElementById('code_editor');
        if (editor && editor.value.trim() === "// Your code will appear here...") {
            editor.value = "// Example: \n// var doc = app.activeDocument;\nalert('Hello world');";
        }

        initTabs();
        initSmartWords();
        initIconPicker();
        initColorPicker(); // V4 Custom Color Picker
        initListeners();

        // V3: Initialize CodeMirror for Syntax Highlighting
        initCodeMirror();

        // V4: Status Init
        updateEditorStatus('new');

        // Request Settings from Main Panel
        var req = new CSEvent("com.tata.pro.requestSettings", "APPLICATION");
        csInterface.dispatchEvent(req);

        // Load API Key Check
        var apiKey = localStorage.getItem('tata_gemini_api_key');
        if (!apiKey) {
            addChatBubble("ai", "⚠️ Please set your Gemini API Key in the Main TATA Panel settings first.");
        }
    }

    // ==================== FEATURES ====================

    function initListeners() {
        // Send Prompt
        var btnSend = document.getElementById('btn_send_prompt');
        if (btnSend) btnSend.addEventListener('click', handleSendPrompt);

        // Test Run
        var btnTest = document.getElementById('btn_test');
        if (btnTest) btnTest.addEventListener('click', handleTestRun);

        // Import
        var btnImport = document.getElementById('btn_import');
        if (btnImport) btnImport.addEventListener('click', handleImport);

        // Clear Chat
        var btnClear = document.getElementById('btn_clear_chat');
        if (btnClear) btnClear.addEventListener('click', handleClearChat);

        // V3: Copy Last Code Button (Global) - OPTIONAL/REMOVED in V4.1
        var btnCopy = document.getElementById('btn_copy_code');
        if (btnCopy) {
            btnCopy.addEventListener('click', function () {
                var code = getEditorCode();
                if (code && code.trim()) {
                    navigator.clipboard.writeText(code).then(function () {
                        showToast("Code copied!");
                    });
                }
            });
        }

        // Edit Mode Listener
        csInterface.addEventListener("com.tata.pro.editScript", handleEditScriptEvent);

        // Settings Listener
        csInterface.addEventListener("com.tata.pro.settingsData", function (event) {
            var data = (typeof event.data === 'string') ? JSON.parse(event.data) : event.data;
            if (data.apiKey) {
                localStorage.setItem('tata_gemini_api_key', data.apiKey);
            }
        });

        // Upload to Server
        var btnUpload = document.getElementById('btn_upload_server');
        if (btnUpload) btnUpload.addEventListener('click', handleUploadToServer);

        // Keyboard Shortcuts
        document.addEventListener('keydown', function (e) {
            // Ctrl+Enter or Cmd+Enter = Run Script
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleTestRun();
                showToast('▶ Running script... (Ctrl+Enter)');
            }
            // Ctrl+S or Cmd+S = Save to Library
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                var btnSave = document.getElementById('btn_save');
                if (btnSave) btnSave.click();
                showToast('💾 Saving... (Ctrl+S)');
            }
            // Escape = Close modals
            if (e.key === 'Escape') {
                var modals = document.querySelectorAll('.modal.active, .modal-overlay.active');
                modals.forEach(function (m) { m.classList.remove('active'); });
            }
        });
    }

    // ==================== SUPABASE CONFIG ====================
    var SUPABASE_URL = (window.TATA_CONFIG && window.TATA_CONFIG.SUPABASE_URL) || 'https://ocglwbaobmsmuwdpcvqw.supabase.co';
    var SUPABASE_KEY = (window.TATA_CONFIG && window.TATA_CONFIG.SUPABASE_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZ2x3YmFvYm1zbXV3ZHBjdnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDQ4MDEsImV4cCI6MjA4NDMyMDgwMX0.ZZDik1x-S3CxO7trJV68oc0Ncdr50LuTwMR6J4fZ5v4';

    function handleUploadToServer() {
        var nameInput = document.getElementById('script_name_input');
        var descInput = document.getElementById('script_description');
        var iconInput = document.getElementById('icon_value');
        var colorTrigger = document.getElementById('color_trigger');

        var name = nameInput ? nameInput.value.trim() : '';
        var description = descInput ? descInput.value.trim() : '';
        var code = getEditorCode();
        var icon = iconInput ? iconInput.value : '★';

        // Validation
        if (!name) {
            showToast('⚠️ Please enter a script name');
            return;
        }
        if (!code || code === '// Your code will appear here...') {
            showToast('⚠️ Please write some code first');
            return;
        }
        if (!description) {
            showToast('⚠️ Please add a description for upload');
            return;
        }

        // Determine category based on color
        var color = colorTrigger ? colorTrigger.style.background : '#3b82f6';
        var category = 'tools';
        if (color.includes('ef4444') || color.includes('239, 68, 68')) category = 'swift';
        else if (color.includes('f59e0b') || color.includes('245, 158, 11')) category = 'creative';
        else if (color.includes('8b5cf6') || color.includes('139, 92, 246')) category = 'tools';

        var data = {
            name: name,
            description: description,
            code: code,
            icon: icon,
            category: category,
            author_name: 'Anonymous',
            votes: 0,
            downloads: 0
        };

        // Show loading
        var btn = document.getElementById('btn_upload_server');
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';

        fetch(SUPABASE_URL + '/rest/v1/scripts', {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        })
            .then(function (res) {
                if (!res.ok) throw new Error('Upload failed');
                return res.json();
            })
            .then(function () {
                showToast('🎉 Script uploaded to Explore!');
            })
            .catch(function (err) {
                showToast('❌ Upload failed: ' + err.message);
            })
            .finally(function () {
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            });
    }

    function initTabs() {
        var tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(t => {
            t.addEventListener('click', function () {
                var targetId = this.dataset.tab;
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
        var grid = document.getElementById('icon_grid_popover');
        var trigger = document.getElementById('icon_trigger');
        var input = document.getElementById('icon_value');

        if (!grid || !trigger || !input) return;

        trigger.onclick = function (e) {
            e.stopPropagation();
            grid.style.display = (grid.style.display === 'block') ? 'none' : 'grid';
        };
        document.addEventListener('click', function () { grid.style.display = 'none'; });
        grid.onclick = function (e) { e.stopPropagation(); };

        Object.keys(ICONS).forEach(key => {
            var btn = document.createElement('div');
            btn.innerHTML = ICONS[key];
            btn.style.cssText = "width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid transparent; border-radius: 4px; color: #ccc;";
            btn.onmouseover = function () { this.style.background = '#444'; };
            btn.onmouseout = function () { this.style.background = 'transparent'; };

            var svg = btn.querySelector('svg');
            if (svg) { svg.setAttribute('width', '20'); svg.setAttribute('height', '20'); }

            btn.onclick = function () {
                input.value = ICONS[key];
                trigger.innerHTML = ICONS[key];
                var tSvg = trigger.querySelector('svg');
                if (tSvg) { tSvg.setAttribute('width', '18'); tSvg.setAttribute('height', '18'); }
                grid.style.display = 'none';
            };
            grid.appendChild(btn);
        });
    }

    // ==================== V4 CUSTOM COLOR PICKER ====================
    var PRESET_COLORS = [
        '#3b82f6', '#8b5cf6', '#ef4444', '#f97316',
        '#eab308', '#10b981', '#14b8a6', '#06b6d4',
        '#ec4899', '#f43f5e', '#64748b', '#FFD700'
    ];

    function initColorPicker() {
        var trigger = document.getElementById('color_trigger');
        var modal = document.getElementById('color_picker_modal');
        var backdrop = document.getElementById('color_backdrop');
        var grid = document.getElementById('color_grid');
        var input = document.getElementById('color_hex_input');
        var preview = document.getElementById('color_preview');

        if (!trigger || !modal) return;

        // Render Grid
        PRESET_COLORS.forEach(color => {
            var swatch = document.createElement('div');
            swatch.style.cssText = 'width: 100%; height: 30px; background: ' + color + '; border-radius: 4px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: transform 0.1s;';
            swatch.onmouseover = function () { this.style.transform = 'scale(1.1)'; };
            swatch.onmouseout = function () { this.style.transform = 'scale(1)'; };
            swatch.onclick = function () {
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
            var val = this.value;
            if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {
                preview.style.background = val;
                trigger.style.background = val;
            }
        });
    }



    // ==================== V4 EDITOR STATUS ====================
    function updateEditorStatus(mode, name) {
        var el = document.getElementById('editor_status');
        if (!el) return;

        if (mode === 'edit') {
            el.innerHTML = "• Editing: <span style='color: #fff; font-weight: 600;'>" + (name || 'Unknown') + "</span>";
            el.style.color = "#f97316"; // Orange for edit

            // V4: Button Text
            var btn = document.getElementById('btn_import');
            if (btn) btn.innerText = "Update";
        } else {
            el.innerHTML = "• New Script";
            el.style.color = "#2ecc71"; // Green for new

            // V4: Button Text
            var btn = document.getElementById('btn_import');
            if (btn) btn.innerText = "Import to TATA";
        }
    }

    // ==================== HANDLERS ====================

    function handleEditScriptEvent(event) {
        var data = (typeof event.data === 'string') ? JSON.parse(event.data) : event.data;

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
            var input = document.getElementById('icon_value');
            if (input) input.value = data.icon;

            var trigger = document.getElementById('icon_trigger');
            if (trigger) {
                trigger.innerHTML = data.icon;
                var svg = trigger.querySelector('svg');
                if (svg) { svg.setAttribute('width', '18'); svg.setAttribute('height', '18'); }
            }
        }

        // V4: Update Status
        updateEditorStatus('edit', (data.label || data.name || "Script"));

        activateTab('tab_editor');
        showToast("Edit Mode: " + (data.label || data.name || "Script"));
        addChatBubble("ai", "ℹ️ <b>Edit Mode Started</b><br>Code loaded.");
    }

    async function handleSendPrompt() {
        var txtPrompt = document.getElementById('prompt_input');
        var userText = txtPrompt.value.trim();
        if (!userText) return;

        var apiKey = localStorage.getItem('tata_gemini_api_key');
        if (!apiKey) {
            alert("No API Key found. Settings -> Main Panel.");
            return;
        }

        addChatBubble("user", userText);
        txtPrompt.value = "";
        var loadingId = addChatBubble("ai", "<span class='loading-dots'>Thinking</span>");

        try {
            // V3: Use getEditorCode for CodeMirror
            var currentCode = getEditorCode();
            var prompt = userText;
            if (currentCode.length > 50 && currentCode.indexOf('// Your code') === -1) {
                prompt = "Current Code:\n```javascript\n" + currentCode + "\n```\n\nTask: " + userText + "\n\nModify code. Return full code.";
            }

            // V3: Get AI model from Settings (localStorage) or default
            var selectedModel = localStorage.getItem('tata_ai_model') || 'gemini-2.0-flash';

            var result = await callAI(apiKey, prompt, selectedModel);

            var loadingBubble = document.getElementById(loadingId);
            if (loadingBubble) loadingBubble.remove();

            if (result.message) addChatBubble("ai", result.message);
            if (result.code) {
                addChatBubble("ai", "Code updated!");
                // V3: Use setEditorCode to properly update CodeMirror
                setEditorCode(result.code);
                activateTab('tab_editor');
                showToast("Code Generated!");

                if (!currentScriptId) {
                    currentScriptId = 'ai_script_' + Date.now();
                }
            }
            if (result.name) {
                document.getElementById('script_name_input').value = result.name;
                // Also update currentScriptId based on name if needed
                if (result.name && !currentScriptId.includes(result.name.replace(/\s+/g, '_').toLowerCase())) {
                    currentScriptId = result.name.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();
                }
            }
        } catch (e) {
            var lb = document.getElementById(loadingId);
            if (lb) lb.innerText = "Error: " + e.message;
        }
    }

    // V3: Track auto-fix attempts
    var autoFixAttempts = 0;
    var MAX_AUTO_FIX = 2;

    function handleTestRun() {
        var code = getEditorCode();
        // V3: Removed auto-save on TestRun - now only saves when AI creates/modifies code
        runCodeWithAutoFix(code, 0);
    }

    function runCodeWithAutoFix(code, attempt) {
        csInterface.evalScript(code, async function (res) {
            if (res && res !== 'undefined') {
                if (/Error|Exception|ReferenceError|SyntaxError/.test(res) || res.indexOf('Line:') !== -1) {
                    // Error detected
                    if (attempt < MAX_AUTO_FIX) {
                        // Try to auto-fix
                        showToast("🔧 Auto-fixing... (Attempt " + (attempt + 1) + "/" + MAX_AUTO_FIX + ")");
                        addChatBubble("ai", "🔧 <b>Auto-fixing error...</b> (Attempt " + (attempt + 1) + ")");

                        try {
                            var apiKey = localStorage.getItem('tata_gemini_api_key');
                            if (!apiKey) {
                                throw new Error("No API key");
                            }

                            var fixPrompt = "Fix this Adobe Illustrator JSX code error:\n\nError: " + res + "\n\nCode:\n```javascript\n" + code + "\n```\n\nFix the error and return the corrected code.";
                            var selectedModel = localStorage.getItem('tata_ai_model') || 'gemini-2.0-flash';
                            var result = await callAI(apiKey, fixPrompt, selectedModel);

                            if (result.code) {
                                setEditorCode(result.code);
                                addChatBubble("ai", "✅ Code fixed! Retrying...");
                                // Retry with fixed code
                                setTimeout(function () {
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
                    addChatBubble("ai", "Result: " + res);
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
        addChatBubble("ai", "⚠️ <b>Error (after " + MAX_AUTO_FIX + " auto-fix attempts):</b><br><span style='color:#ff6b6b'>" + errorMsg + "</span>");
        showToast("❌ Script Error! Auto-fix failed.");
        activateTab('tab_ai');
    }

    function handleImport() {
        // V3: Use getEditorCode for CodeMirror
        var scriptCode = getEditorCode();
        var scriptName = document.getElementById('script_name_input').value || "New Script";
        var scriptIcon = document.getElementById('icon_value').value || "★";
        var scriptColor = document.getElementById('color_hex_input').value || "#3b82f6"; // V4 Custom Input

        var data = {
            id: currentScriptId || ('ai_script_' + Date.now()),
            name: scriptName,
            icon: scriptIcon,
            code: scriptCode,
            color: scriptColor
        };

        var event = new CSEvent("com.tata.pro.importScript", "APPLICATION");
        event.data = JSON.stringify(data);
        csInterface.dispatchEvent(event);

        // V4: Force Switch Focus to Main Panel
        CSInterface.prototype.requestOpenExtension("com.tata.pro.panel", "");

        var btn = document.getElementById('btn_import');
        var original = btn.innerText;
        btn.innerText = "Imported!";
        btn.style.background = "#333";
        setTimeout(() => {
            btn.innerText = original;
            btn.style.background = "#27ae60";
        }, 2000);
    }

    function handleClearChat() {
        var container = document.getElementById('chat_history');
        if (!container) return;
        container.innerHTML = ''; // Fully Clear
        // Reset Logic
        autoFixAttempts = 0;
        addChatBubble("ai", "Chat cleared (Context reset).");
    }

    // ==================== HELPERS ====================

    // V3: Multi-Model AI Call
    async function callAI(apiKey, prompt, model) {
        var systemPrompt = "You are an Adobe Illustrator JSX expert. Return JSON: { \"name\": \"Short Script Name (2-4 words)\", \"message\": \"...\", \"code\": \"...\" }. Use ES3 JS only.";

        if (model.startsWith('gemini')) {
            // Gemini API - auto discover working model (updated Jan 2026)
            // Note: Gemini 1.5 was retired April 2025, use 2.0/2.5/3.0 models
            // Gemini API - FORCE GEMINI 3.0 ONLY (User Request)
            var modelsToTry = [];

            // 1. User Preference (if set in Settings)
            var userModel = localStorage.getItem('tata_ai_model');
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
            modelsToTry = modelsToTry.filter(function (item, pos) {
                return modelsToTry.indexOf(item) == pos;
            });
            var lastError = null;

            for (var i = 0; i < modelsToTry.length; i++) {
                var modelName = modelsToTry[i];
                var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + apiKey;
                var payload = { "contents": [{ "parts": [{ "text": systemPrompt + "\n\n" + prompt }] }] };

                try {
                    var response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (response.ok) {
                        var data = await response.json();
                        var text = data.candidates[0].content.parts[0].text;
                        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                        console.log('[TATA] Using Gemini model: ' + modelName);

                        // Update UI with used model name (V7.3 Fix)
                        var modelBadge = document.getElementById('ai_model_name');
                        if (modelBadge) {
                            modelBadge.textContent = "(" + modelName + ")";
                        }

                        return JSON.parse(text);
                    }
                    lastError = "HTTP " + response.status;
                } catch (e) {
                    lastError = e.message;
                }
            }
            throw new Error("Gemini API Error: " + lastError + " (tried all models)");

        } else if (model.startsWith('claude')) {
            // Claude API (Anthropic)
            var claudeKey = localStorage.getItem('tata_claude_api_key') || apiKey; // Fallback to Gemini key for now
            var claudeUrl = "https://api.anthropic.com/v1/messages";
            var claudePayload = {
                model: "claude-3-haiku-20240307",
                max_tokens: 4096,
                messages: [{ role: "user", content: systemPrompt + "\n\n" + prompt }]
            };

            var claudeResponse = await fetch(claudeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': claudeKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(claudePayload)
            });

            if (!claudeResponse.ok) throw new Error("Claude API Error " + claudeResponse.status);

            var claudeData = await claudeResponse.json();
            var claudeText = claudeData.content[0].text;
            claudeText = claudeText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(claudeText);
        }

        throw new Error("Unknown model: " + model);
    }

    // Legacy alias
    async function callGemini(apiKey, prompt) {
        return callAI(apiKey, prompt, 'gemini-1.5-pro');
    }

    function addChatBubble(type, html) {
        var container = document.getElementById('chat_history');
        if (!container) return;

        // Wrapper for Layout (Message Row)
        var wrapper = document.createElement('div');
        wrapper.className = "chat-message-row " + type;
        wrapper.style.cssText = "display: flex; width: 100%; margin-bottom: 8px; align-items: flex-start;";
        wrapper.style.justifyContent = (type === 'user') ? 'flex-end' : 'flex-start';

        // V4: Per-Message Copy Button (User Only)
        if (type === 'user') {
            // Icon SVG (Copy)
            var copyBtn = document.createElement('div');
            copyBtn.innerHTML = ICONS.copy; // Use existing copy icon
            copyBtn.title = "Copy Text";
            copyBtn.className = "msg-copy-btn";
            // Style: Hidden by default, show on hover
            copyBtn.style.cssText = "width: 24px; height: 24px; margin-right: 8px; cursor: pointer; color: #888; opacity: 0; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center;";

            var svg = copyBtn.querySelector('svg');
            if (svg) { svg.style.width = '16px'; svg.style.height = '16px'; }

            // Copy Logic
            copyBtn.onclick = function () {
                var text = html.replace(/<[^>]*>?/gm, ''); // Strip HTML if any
                navigator.clipboard.writeText(text).then(() => showToast("Copied!"));
            };

            // Hover Logic (Row)
            wrapper.onmouseenter = function () { copyBtn.style.opacity = '1'; };
            wrapper.onmouseleave = function () { copyBtn.style.opacity = '0'; };

            wrapper.appendChild(copyBtn);
        }

        var bubble = document.createElement('div');
        bubble.className = "chat-bubble " + type;
        bubble.id = "msg_" + Date.now();
        bubble.innerHTML = html;

        wrapper.appendChild(bubble);
        container.appendChild(wrapper);
        container.scrollTop = container.scrollHeight;
        return bubble.id;
    }

    function showToast(msg) {
        var t = document.getElementById('toast');
        if (!t) return;
        t.innerText = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }

    // ==================== SMART WORDS ====================
    var smartGroups = [
        ["Selected Items", "All Artboards", "Loop Selection", "Ungroup All", "Unlock All", "Select All"],
        ["Create Dialog", "Randomize Color", "Resize to Fit", "Align Center", "Rotate 90°", "Flip Horizontal"],
        ["Create Rectangle", "Create Circle", "Create Text", "Create Line", "Create Star", "Create Polygon"],
        ["Set Fill Color", "Set Stroke Color", "Remove Stroke", "Opacity 50%", "Blend Mode", "Gradient Fill"],
        ["Group Items", "Lock Layer", "Hide Selection", "Bring to Front", "Send to Back", "Ungroup"],
        ["New Artboard", "Fit Artboard", "Rename Layer", "Delete Empty", "Duplicate Layer", "Move Layer"],
        ["Change Font", "Outline Text", "Text Size", "Text Content", "Paragraph Style", "Area Type"],
        ["If / Else", "For Loop", "Try / Catch", "Alert Message", "Confirm Dialog", "Console Log"],
        ["Save as PNG", "Export SVG", "Current Path", "Close Doc", "Save as AI", "Open File"],
        ["Input Field", "Checkbox", "Button", "Panel Window", "Dropdown List", "Progress Bar"]
    ];
    var currentGroupIdx = 0;

    function initSmartWords() {
        renderSmartWords();
    }

    function renderSmartWords() {
        var container = document.getElementById('smart_words_container');
        if (!container) return;
        container.innerHTML = '';

        var cycleBtn = document.createElement('div');
        cycleBtn.innerHTML = "↻";
        cycleBtn.className = "cycle-btn";
        cycleBtn.title = "Next Group";
        cycleBtn.onclick = function () {
            currentGroupIdx = (currentGroupIdx + 1) % smartGroups.length;
            renderSmartWords();
        };
        container.appendChild(cycleBtn);

        var group = smartGroups[currentGroupIdx];
        group.forEach(word => {
            var chip = document.createElement('div');
            chip.innerText = word;
            chip.className = "smart-chip";
            chip.onclick = function () {
                var input = document.getElementById('prompt_input');
                var val = input.value;
                if (val && val.slice(-1) !== ' ') input.value += ' ';
                input.value += word;
                input.focus();
            };
            container.appendChild(chip);
        });
    }



    // ==================== V3: CODEMIRROR ====================
    var cmEditor = null;

    function initCodeMirror() {
        var textarea = document.getElementById('code_editor');
        if (!textarea || typeof CodeMirror === 'undefined') {
            console.log("CodeMirror not available, using fallback textarea");
            return;
        }

        cmEditor = CodeMirror.fromTextArea(textarea, {
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
        cmEditor.on('change', function () {
            cmEditor.save();
        });

        // Style adjustments
        var cmWrapper = cmEditor.getWrapperElement();
        cmWrapper.style.flex = '1';
        cmWrapper.style.fontSize = '12px';
        cmWrapper.style.height = 'auto';
    }

    // CodeMirror helpers
    function getEditorCode() {
        if (cmEditor) {
            return cmEditor.getValue();
        }
        var el = document.getElementById('code_editor');
        return el ? el.value : '';
    }

    function setEditorCode(code) {
        if (cmEditor) {
            cmEditor.setValue(code);
            // Force refresh to display immediately without click
            setTimeout(function () { cmEditor.refresh(); }, 10);
        } else {
            var el = document.getElementById('code_editor');
            if (el) el.value = code;
        }
    }

    // Expose to window for external access
    window.getEditorCode = getEditorCode;
    window.setEditorCode = setEditorCode;

    // Start
    init();

})();
