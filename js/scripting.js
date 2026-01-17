(function () {
    'use strict';

    var csInterface = new CSInterface();
    var extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
    var currentScriptId = null; // Track ID for edits

    // V3: Script Version History
    var scriptVersions = {}; // { scriptId: [{ code, timestamp }] }
    var MAX_VERSIONS = 5;

    // ==================== ICONS ====================
    // Moved to top for safety
    var ICONS = {
        // Star & Basics
        star: '★', play: '▶', bolt: '⚡', gear: '⚙️', check: '✅', heart: '❤️', fire: '🔥', gem: '💎',

        // TATA Core
        fit: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h4v2H4v4H2V4a2 2 0 0 1 2-2zm16 0h-4v2h4v4h2V4a2 2 0 0 0-2-2zM4 20h4v-2H4v-4H2v4a2 2 0 0 0 2 2zm16 0h-4v-2h4v-4h2v4a2 2 0 0 0-2 2z" /></svg>',
        resize: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 12h-2.26l2.03-2.03l-1.41-1.41L15.31 10.6V8.34h-2v4.66h4.66v-2h-2.66zM7 12h2.26L7.23 14.03l1.41 1.41L10.69 13.4v2.26h2v-4.66H8.03v2H10.69z" /></svg>',
        follow: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" /></svg>',
        arrange: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z" /></svg>',
        stars: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>',
        palette: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>',
        embed: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" /></svg>',
        preview: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>',
        clean: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>',

        // Extended
        layers: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M11.99 18.54l-7.37-5.73L3 14.07l9 7l9-7l-1.63-1.27l-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7l-9 7l1.63 1.27L12 16z"/></svg>',
        text: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>',
        path: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M11.71 17.99C8.53 17.84 6 15.22 6 12c0-3.31 2.69-6 6-6c3.22 0 5.84 2.53 5.99 5.71l-2.1.22c-.14-1.97-1.77-3.52-3.76-3.52c-2.09 0-3.79 1.7-3.79 3.79c0 2.02 1.56 3.65 3.52 3.76l.22-2.1c3.18.15 5.71 2.77 5.71 5.99c-3.31 0-6-2.69-6-6l-2.1.21z"/></svg>',
        code: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6l6 6l1.4-1.4zm5.2 0l4.6-4.6l-4.6-4.6L16 6l6 6l-6 6l-1.4-1.4z"/></svg>',
        export: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7l7-7zM5 18v2h14v-2H5z"/></svg>',
        import: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16h6v-6h4l-7-7l-7 7h4zm-4 2h14v2H5z"/></svg>',
        save: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3s3 1.34 3 3s-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',
        file: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2.5L15.5 8H12V4.5z"/></svg>',
        folder: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
        image: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
        artboard: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 7v10H4V7h16m0-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/></svg>',
        align: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 22H2V2h2v20zM22 7H6v3h16V7zm-6 7H6v3h10v-3z"/></svg>',
        ruler: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 7h20v10H2V7zm2 2v3h2V9H4zm4 0v2h2V9H8zm4 0v3h2V9h-2zm4 0v2h2V9h-2z"/></svg>'
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
        initListeners();

        // V3: Initialize CodeMirror for Syntax Highlighting
        initCodeMirror();

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

        // Edit Mode Listener
        csInterface.addEventListener("com.tata.pro.editScript", handleEditScriptEvent);

        // Settings Listener
        csInterface.addEventListener("com.tata.pro.settingsData", function (event) {
            var data = (typeof event.data === 'string') ? JSON.parse(event.data) : event.data;
            if (data.apiKey) {
                localStorage.setItem('tata_gemini_api_key', data.apiKey);
            }
        });

        // V3: Version History Button
        var btnVersion = document.getElementById('btn_version_history');
        if (btnVersion) {
            btnVersion.addEventListener('click', function () {
                var versions = getVersions(currentScriptId);
                if (versions.length === 0) {
                    showToast("No version history");
                    return;
                }
                // Simple: Restore previous version
                if (versions.length > 1) {
                    restoreVersion(currentScriptId, 1);
                } else {
                    showToast("Only 1 version saved");
                }
            });
        }

        // Load version history on init
        loadVersionHistory();
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

    // ==================== HANDLERS ====================

    function handleEditScriptEvent(event) {
        var data = (typeof event.data === 'string') ? JSON.parse(event.data) : event.data;

        if (data.id) currentScriptId = data.id;

        if (data.code) {
            document.getElementById('code_editor').value = data.code;
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
            var currentCode = document.getElementById('code_editor').value;
            var prompt = userText;
            if (currentCode.length > 50 && currentCode.indexOf('// Your code') === -1) {
                prompt = "Current Code:\n```javascript\n" + currentCode + "\n```\n\nTask: " + userText + "\n\nModify code. Return full code.";
            }

            // V3: Get selected model
            var modelSelector = document.getElementById('ai_model_selector');
            var selectedModel = modelSelector ? modelSelector.value : 'gemini-1.5-pro';

            var result = await callAI(apiKey, prompt, selectedModel);

            var loadingBubble = document.getElementById(loadingId);
            if (loadingBubble) loadingBubble.remove();

            if (result.message) addChatBubble("ai", result.message);
            if (result.code) {
                addChatBubble("ai", "Code updated!");
                document.getElementById('code_editor').value = result.code;
                activateTab('tab_editor');
                showToast("Code Generated!");
            }
            if (result.name) {
                document.getElementById('script_name_input').value = result.name;
            }
        } catch (e) {
            var lb = document.getElementById(loadingId);
            if (lb) lb.innerText = "Error: " + e.message;
        }
    }

    function handleTestRun() {
        var code = document.getElementById('code_editor').value;
        csInterface.evalScript(code, function (res) {
            if (res && res !== 'undefined') {
                if (/Error|Exception|ReferenceError|SyntaxError/.test(res) || res.indexOf('Line:') !== -1) {
                    addChatBubble("ai", "⚠️ <b>Error:</b><br><span style='color:#ff6b6b'>" + res + "</span>");
                } else {
                    addChatBubble("ai", "Result: " + res);
                }
            }
        });
    }

    function handleImport() {
        var scriptCode = document.getElementById('code_editor').value;
        var scriptName = document.getElementById('script_name_input').value || "New Script";
        var scriptIcon = document.getElementById('icon_value').value || "★";

        var data = {
            id: currentScriptId || ('ai_script_' + Date.now()),
            name: scriptName,
            icon: scriptIcon,
            code: scriptCode
        };

        // V3: Save version before import
        saveVersion(data.id, scriptCode);

        var event = new CSEvent("com.tata.pro.importScript", "APPLICATION");
        event.data = JSON.stringify(data);
        csInterface.dispatchEvent(event);

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
        var bubbles = container.querySelectorAll('.chat-bubble');
        bubbles.forEach(b => b.remove());
        addChatBubble("ai", "Chat cleared.");
    }

    // ==================== HELPERS ====================

    // V3: Multi-Model AI Call
    async function callAI(apiKey, prompt, model) {
        var systemPrompt = "You are an Adobe Illustrator JSX expert. Return JSON: { \"message\": \"...\", \"code\": \"...\" }. Use ES3 JS only.";

        if (model.startsWith('gemini')) {
            // Gemini API
            var modelName = model === 'gemini-2.0-flash' ? 'gemini-2.0-flash-exp' : 'gemini-1.5-pro';
            var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + apiKey;
            var payload = { "contents": [{ "parts": [{ "text": systemPrompt + "\n\n" + prompt }] }] };

            var response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error("Gemini API Error " + response.status);

            var data = await response.json();
            var text = data.candidates[0].content.parts[0].text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);

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
        var bubble = document.createElement('div');
        bubble.className = "chat-bubble " + type;
        bubble.id = "msg_" + Date.now();
        bubble.innerHTML = html;
        container.appendChild(bubble);
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

    // Start
    init();

})();

// ==================== V3: VERSION HISTORY ====================
function loadVersionHistory() {
    var saved = localStorage.getItem('tata_script_versions');
    if (saved) {
        try { scriptVersions = JSON.parse(saved); } catch (e) { }
    }
}

function saveVersionHistory() {
    localStorage.setItem('tata_script_versions', JSON.stringify(scriptVersions));
}

function saveVersion(scriptId, code) {
    if (!scriptId || !code) return;

    if (!scriptVersions[scriptId]) {
        scriptVersions[scriptId] = [];
    }

    // Add new version
    scriptVersions[scriptId].unshift({
        code: code,
        timestamp: Date.now()
    });

    // Limit to MAX_VERSIONS
    if (scriptVersions[scriptId].length > MAX_VERSIONS) {
        scriptVersions[scriptId] = scriptVersions[scriptId].slice(0, MAX_VERSIONS);
    }

    saveVersionHistory();
}

function getVersions(scriptId) {
    return scriptVersions[scriptId] || [];
}

function restoreVersion(scriptId, index) {
    var versions = getVersions(scriptId);
    if (versions[index]) {
        document.getElementById('code_editor').value = versions[index].code;
        showToast("Version " + (index + 1) + " restored!");
    }
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
    
    // Override getValue for CodeMirror
    function getEditorCode() {
        if (cmEditor) {
            return cmEditor.getValue();
        }
        return document.getElementById('code_editor').value;
    }
    
    function setEditorCode(code) {
        if (cmEditor) {
            cmEditor.setValue(code);
        } else {
            document.getElementById('code_editor').value = code;
        }
    }
