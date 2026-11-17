/**
 * Editing helpers for the script editor (the Code view of the workbench):
 * undo/redo, snippets, comment toggle, re-indent, syntax check, copy,
 * paste-over, clear, font size and line wrapping. Plus a status line with
 * the cursor position.
 *
 * Works on the CodeMirror instance js/scripting.js creates; it waits for the
 * 'tata:editor-ready' event. The syntax check only compiles the code with
 * Node's vm module; it never runs it.
 */
(function () {
    'use strict';

    window.TATA = window.TATA || {};

    const FONT_KEY = 'tata_editor_font';
    const WRAP_KEY = 'tata_editor_wrap';
    const FONT_MIN = 10;
    const FONT_MAX = 22;
    const FONT_DEFAULT = 13;

    // ExtendScript, so ES3 style: var, no arrow functions, tabs for indent.
    const SNIPPETS = [
        {
            label: 'เช็กว่ามีเอกสารเปิดอยู่',
            code: 'if (app.documents.length === 0) {\n\talert("Open a document first.");\n} else {\n\tvar doc = app.activeDocument;\n\t\n}\n'
        },
        {
            label: 'วนทุกชิ้นที่เลือก',
            code: 'var sel = app.activeDocument.selection;\nfor (var i = 0; i < sel.length; i++) {\n\tvar item = sel[i];\n\t\n}\n'
        },
        {
            label: 'วนทุก artboard',
            code: 'var doc = app.activeDocument;\nfor (var i = 0; i < doc.artboards.length; i++) {\n\tvar board = doc.artboards[i];\n\t// board.name, board.artboardRect\n}\n'
        },
        {
            label: 'วนทุกข้อความ',
            code: 'var doc = app.activeDocument;\nfor (var i = 0; i < doc.textFrames.length; i++) {\n\tvar frame = doc.textFrames[i];\n\t// frame.contents, frame.textRange.characterAttributes.size\n}\n'
        },
        {
            label: 'วนทุก path',
            code: 'var doc = app.activeDocument;\nfor (var i = 0; i < doc.pathItems.length; i++) {\n\tvar path = doc.pathItems[i];\n\t// path.strokeWidth, path.fillColor\n}\n'
        },
        {
            label: 'ถามตัวเลขจากผู้ใช้',
            code: 'var answer = prompt("Size (pt)", "10");\nif (answer !== null) {\n\tvar size = parseFloat(answer);\n\t\n}\n'
        },
        {
            label: 'สร้างสี RGB',
            code: 'var color = new RGBColor();\ncolor.red = 255;\ncolor.green = 135;\ncolor.blue = 9;\n'
        },
        {
            label: 'เลือกทุกชิ้นบน artboard นี้',
            code: 'app.activeDocument.selectObjectsOnActiveArtboard();\n'
        }
    ];

    // ------------------------------------------------------------------
    // Pure helpers (tested in tests/editor-tools.test.js)
    // ------------------------------------------------------------------

    /**
     * Comment or uncomment lines the way most editors do: if every non-blank
     * line already starts with //, remove it; otherwise add // at the
     * shallowest indent so the block stays aligned.
     */
    function toggleComment(lines) {
        const filled = lines.filter(line => line.trim() !== '');
        if (!filled.length) return lines.slice();
        const commented = filled.every(line => /^\s*\/\//.test(line));
        if (commented) {
            return lines.map(line => line.replace(/^(\s*)\/\/ ?/, '$1'));
        }
        const indent = Math.min.apply(null, filled.map(line => line.match(/^\s*/)[0].length));
        return lines.map(line => (line.trim() === '' ? line : line.slice(0, indent) + '// ' + line.slice(indent)));
    }

    /**
     * Compiles the code without running it.
     * @returns {{ok: true} | {ok: false, line: number, message: string}}
     *   line is 1-based, or 0 when the engine did not say.
     */
    function checkSyntax(code, vm) {
        // #target / #include are ExtendScript directives, not JavaScript.
        // Blank them so line numbers stay right.
        const source = String(code || '').replace(/^[ \t]*#.*$/gm, '');
        try {
            if (vm && typeof vm.Script === 'function') {
                new vm.Script(source, { filename: 'script.jsx' });
            } else {
                // eslint-disable-next-line no-new-func
                new Function(source);
            }
            return { ok: true };
        } catch (error) {
            if (!error || error.name !== 'SyntaxError') return { ok: true };
            const where = String(error.stack || '').match(/script\.jsx:(\d+)/);
            return { ok: false, line: where ? parseInt(where[1], 10) : 0, message: String(error.message || 'Syntax error') };
        }
    }

    function clampFont(size) {
        const value = parseInt(size, 10);
        if (!(value > 0)) return FONT_DEFAULT;
        return Math.max(FONT_MIN, Math.min(FONT_MAX, value));
    }

    // ------------------------------------------------------------------
    // Editor wiring
    // ------------------------------------------------------------------
    let cm = null;
    let errorLine = -1;

    function byId(id) {
        return document.getElementById(id);
    }

    function toast(message, type) {
        if (typeof TATA.showToast === 'function') TATA.showToast(message, type);
    }

    function stored(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function store(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* preference only */ }
    }

    function nodeVm() {
        try {
            if (typeof window.require === 'function') return window.require('vm');
        } catch (e) { /* no Node in this context */ }
        return null;
    }

    function markUserEdit() {
        if (typeof TATA.markEditorOrigin === 'function') TATA.markEditorOrigin('user');
    }

    function clearError() {
        if (cm && errorLine >= 0) {
            try { cm.removeLineClass(errorLine, 'background', 'editor-error-line'); } catch (e) { /* line gone */ }
        }
        errorLine = -1;
        const check = byId('editor_check');
        if (check) {
            check.textContent = '';
            check.dataset.tone = '';
        }
        const ask = byId('btn_edit_ask_ai');
        if (ask) ask.hidden = true;
    }

    function paintPosition() {
        const out = byId('editor_position');
        if (!out || !cm) return;
        const cursor = cm.getCursor();
        out.textContent = 'บรรทัด ' + (cursor.line + 1) + ':' + (cursor.ch + 1) + ' · ' + cm.lineCount() + ' บรรทัด';
    }

    function applyFont(size) {
        const value = clampFont(size);
        if (cm) {
            cm.getWrapperElement().style.fontSize = value + 'px';
            cm.refresh();
        }
        store(FONT_KEY, String(value));
        return value;
    }

    function applyWrap(on) {
        if (cm) cm.setOption('lineWrapping', !!on);
        store(WRAP_KEY, on ? '1' : '0');
        const button = document.querySelector('[data-edit="wrap"]');
        if (button) {
            button.setAttribute('aria-pressed', on ? 'true' : 'false');
            button.classList.toggle('is-on', !!on);
        }
    }

    // Lines touched by the selection, or the cursor line.
    function selectedLineRange() {
        const from = cm.getCursor('from');
        const to = cm.getCursor('to');
        let last = to.line;
        if (to.ch === 0 && to.line > from.line) last -= 1;
        return { first: from.line, last: last };
    }

    function doComment() {
        const range = selectedLineRange();
        const lines = [];
        for (let i = range.first; i <= range.last; i++) lines.push(cm.getLine(i));
        const next = toggleComment(lines);
        cm.operation(() => {
            cm.replaceRange(next.join('\n'), { line: range.first, ch: 0 }, { line: range.last, ch: cm.getLine(range.last).length }, '+comment');
        });
        markUserEdit();
        cm.focus();
    }

    function doIndent() {
        const whole = !cm.somethingSelected();
        const range = whole ? { first: 0, last: cm.lineCount() - 1 } : selectedLineRange();
        cm.operation(() => {
            for (let i = range.first; i <= range.last; i++) cm.indentLine(i, 'smart');
        });
        markUserEdit();
        toast(whole ? 'จัดย่อหน้าทั้งไฟล์แล้ว' : 'จัดย่อหน้าส่วนที่เลือกแล้ว', 'success');
        cm.focus();
    }

    function doCheck() {
        clearError();
        const result = checkSyntax(cm.getValue(), nodeVm());
        const check = byId('editor_check');
        const ask = byId('btn_edit_ask_ai');
        if (result.ok) {
            if (check) {
                check.textContent = 'ไม่พบ syntax error';
                check.dataset.tone = 'ok';
            }
            return result;
        }
        if (result.line > 0 && result.line <= cm.lineCount()) {
            errorLine = result.line - 1;
            cm.addLineClass(errorLine, 'background', 'editor-error-line');
            cm.setCursor({ line: errorLine, ch: 0 });
            cm.scrollIntoView({ line: errorLine, ch: 0 }, 60);
        }
        if (check) {
            check.textContent = (result.line ? 'บรรทัด ' + result.line + ': ' : '') + result.message;
            check.dataset.tone = 'error';
        }
        if (ask) {
            ask.hidden = false;
            ask.dataset.prompt = 'แก้ syntax error' + (result.line ? ' ที่บรรทัด ' + result.line : '') + ': ' + result.message;
        }
        return result;
    }

    function askAi() {
        const ask = byId('btn_edit_ask_ai');
        const text = ask && ask.dataset.prompt ? ask.dataset.prompt : '';
        if (typeof TATA.activateTab === 'function') TATA.activateTab('tab_ai');
        const prompt = byId('prompt_input');
        // Filled in, not sent: the user decides, and a request may cost them.
        if (prompt && text) {
            prompt.value = text;
            try { prompt.focus(); } catch (e) { /* not focusable */ }
        }
    }

    function doCopy() {
        const code = cm.getValue();
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            toast('คัดลอกไม่ได้ ใช้ ⌘A แล้ว ⌘C แทน', 'error');
            return;
        }
        navigator.clipboard.writeText(code)
            .then(() => toast('คัดลอกโค้ดทั้งหมดแล้ว', 'success'))
            .catch(() => toast('คัดลอกไม่ได้ ใช้ ⌘A แล้ว ⌘C แทน', 'error'));
    }

    function doPaste() {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
            toast('อ่าน clipboard ไม่ได้ ใช้ ⌘V แทน', 'error');
            return;
        }
        navigator.clipboard.readText().then(text => {
            if (!text || !text.trim()) {
                toast('Clipboard ว่างอยู่', 'error');
                return;
            }
            cm.setValue(text);
            markUserEdit();
            cm.focus();
            toast('วางแทนโค้ดเดิมแล้ว (⌘Z เพื่อย้อน)', 'success');
        }).catch(() => toast('อ่าน clipboard ไม่ได้ ใช้ ⌘V แทน', 'error'));
    }

    function doClear() {
        if (!cm.getValue()) return;
        // Undoable, so no confirmation dialog.
        cm.setValue('');
        markUserEdit();
        cm.focus();
        toast('ล้างโค้ดแล้ว กด ↶ หรือ ⌘Z เพื่อคืน', 'success');
    }

    function insertSnippet(snippet) {
        const from = cm.getCursor('from');
        const lineText = cm.getLine(from.line);
        // On a line with text, start the snippet on a new line.
        const prefix = lineText.trim() !== '' && from.ch > 0 ? '\n' : '';
        const text = prefix + snippet.code;
        cm.operation(() => {
            cm.replaceSelection(text, 'end', '+snippet');
            const end = cm.getCursor();
            const first = from.line + (prefix ? 1 : 0);
            for (let i = first; i <= end.line; i++) cm.indentLine(i, 'smart');
        });
        markUserEdit();
        cm.focus();
    }

    function setMenu(open) {
        const menu = byId('edit_snippet_menu');
        const trigger = byId('btn_edit_snippets');
        if (!menu || !trigger) return;
        menu.hidden = !open;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
            const first = menu.querySelector('.menu-item');
            if (first) first.focus();
        }
    }

    function buildMenu() {
        const menu = byId('edit_snippet_menu');
        if (!menu || menu.dataset.built === '1') return;
        menu.dataset.built = '1';
        SNIPPETS.forEach(snippet => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'menu-item';
            item.setAttribute('role', 'menuitem');
            item.textContent = snippet.label;
            item.addEventListener('click', () => {
                setMenu(false);
                if (cm) insertSnippet(snippet);
            });
            menu.appendChild(item);
        });
        menu.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setMenu(false);
                const trigger = byId('btn_edit_snippets');
                if (trigger) trigger.focus();
            }
        });
        document.addEventListener('click', event => {
            if (menu.hidden) return;
            if (!event.target.closest || !event.target.closest('.editor-snippets')) setMenu(false);
        });
    }

    const ACTIONS = {
        undo: () => { cm.undo(); cm.focus(); },
        redo: () => { cm.redo(); cm.focus(); },
        snippets: () => setMenu(byId('edit_snippet_menu').hidden),
        comment: doComment,
        indent: doIndent,
        check: doCheck,
        copy: doCopy,
        paste: doPaste,
        clear: doClear,
        smaller: () => applyFont(clampFont(stored(FONT_KEY)) - 1),
        bigger: () => applyFont(clampFont(stored(FONT_KEY)) + 1),
        wrap: () => applyWrap(!cm.getOption('lineWrapping'))
    };

    function bindToolbar() {
        const bar = document.querySelector('.editor-tools');
        if (!bar || bar.dataset.bound === '1') return;
        bar.dataset.bound = '1';
        buildMenu();
        bar.addEventListener('click', event => {
            const button = event.target.closest ? event.target.closest('[data-edit]') : null;
            if (!button || !bar.contains(button)) return;
            const action = ACTIONS[button.getAttribute('data-edit')];
            if (!action) return;
            if (!cm) {
                toast('ตัวแก้โค้ดกำลังโหลด ลองอีกครั้ง', 'error');
                if (typeof TATA.ensureCodeMirror === 'function') TATA.ensureCodeMirror();
                return;
            }
            action();
        });
        const ask = byId('btn_edit_ask_ai');
        if (ask) ask.addEventListener('click', askAi);
    }

    function attach(editor) {
        if (!editor || editor === cm) return;
        cm = editor;
        applyFont(stored(FONT_KEY));
        const wrap = stored(WRAP_KEY);
        applyWrap(wrap === null ? true : wrap === '1');
        cm.addKeyMap({
            'Cmd-/': doComment,
            'Ctrl-/': doComment
        });
        cm.on('cursorActivity', paintPosition);
        cm.on('change', () => {
            if (errorLine >= 0) clearError();
            paintPosition();
        });
        paintPosition();
    }

    function start() {
        bindToolbar();
        if (window.cmEditor) attach(window.cmEditor);
    }

    document.addEventListener('tata:editor-ready', event => attach(event.detail || window.cmEditor));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();

    TATA.editorTools = {
        toggleComment: toggleComment,
        checkSyntax: checkSyntax,
        clampFont: clampFont,
        snippets: SNIPPETS
    };
})();
