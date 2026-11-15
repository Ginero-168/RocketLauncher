/**
 * Static scan of an ExtendScript file: what can it reach besides the document?
 *
 * It reads the code as text, never runs it and never leaves the machine. It
 * finds the plain spellings of file, network and system access. Code that
 * builds those names at run time cannot be read this way, so anything that
 * runs other code or assembles names is reported as "cannot be read" rather
 * than passed as safe. A clean report is a help, not a guarantee.
 */
(function () {
    'use strict';

    window.TATA = window.TATA || {};

    const RULES = [
        // network
        { kind: 'net', re: /\bSocket\b/ },
        { kind: 'net', re: /\bHttpConnection\b/ },
        { kind: 'net', re: /\bWebServiceProxy\b/ },
        // other programs and the operating system
        { kind: 'system', re: /\bsystem\s*\.\s*callSystem\b/ },
        { kind: 'system', re: /\bapp\s*\.\s*system\b/ },
        { kind: 'system', re: /\bBridgeTalk\b/ },
        { kind: 'system', re: /\.\s*execute\s*\(/ },
        { kind: 'system', re: /\bExternalObject\b/ },
        // files and folders
        { kind: 'file', re: /\bFile\s*(\(|\.)/ },
        { kind: 'file', re: /\bFolder\s*(\(|\.)/ },
        { kind: 'file', re: /\.\s*(exportFile|saveAs|imageCapture|openDlg|saveDlg|selectDlg|selectDialog|openDialog|saveDialog)\s*\(/ },
        { kind: 'file', re: /\bapp\s*\.\s*open\s*\(/ },
        { kind: 'file', re: /\.\s*placedItems\s*\.\s*add\b/ },
        // code the scan cannot see into
        { kind: 'hidden', re: /\beval\s*\(/ },
        { kind: 'hidden', re: /\bnew\s+Function\b/ },
        { kind: 'hidden', re: /\$\s*\.\s*evalFile\b/ },
        { kind: 'hidden', re: /\bdoScript\s*\(/ },
        { kind: 'hidden', re: /^\s*#\s*include\b/ },
        { kind: 'hidden', re: /\$\s*\.\s*global\s*\[/ },
        { kind: 'hidden', re: /\bfromCharCode\b/ },
        { kind: 'hidden', re: /\bthis\s*\[\s*["']/ }
    ];

    const ORDER = ['doc', 'file', 'hidden', 'system', 'net'];

    // Blank out comments and keep string contents, without moving any line.
    function withoutComments(code) {
        let out = '';
        let i = 0;
        let quote = '';
        while (i < code.length) {
            const ch = code[i];
            const next = code[i + 1];
            if (quote) {
                out += ch;
                if (ch === '\\' && i + 1 < code.length) {
                    out += next;
                    i += 2;
                    continue;
                }
                if (ch === quote || ch === '\n') quote = '';
                i++;
            } else if (ch === '"' || ch === '\'') {
                quote = ch;
                out += ch;
                i++;
            } else if (ch === '/' && next === '/') {
                while (i < code.length && code[i] !== '\n') i++;
            } else if (ch === '/' && next === '*') {
                i += 2;
                while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
                    if (code[i] === '\n') out += '\n';
                    i++;
                }
                i += 2;
            } else {
                out += ch;
                i++;
            }
        }
        return out;
    }

    function scan(code) {
        const source = String(code || '').replace(/\r\n?/g, '\n');
        const original = source.split('\n');
        const cleaned = withoutComments(source).split('\n');
        const touches = { file: false, net: false, system: false, hidden: false };
        const lines = [];

        cleaned.forEach((text, index) => {
            const kinds = [];
            RULES.forEach(rule => {
                if (rule.re.test(text) && kinds.indexOf(rule.kind) === -1) kinds.push(rule.kind);
            });
            if (!kinds.length) return;
            kinds.forEach(kind => { touches[kind] = true; });
            kinds.sort((a, b) => ORDER.indexOf(b) - ORDER.indexOf(a));
            lines.push({
                no: index + 1,
                code: (original[index] || '').trim().slice(0, 200),
                kind: kinds[0],
                kinds: kinds
            });
        });

        let level = 'doc';
        ORDER.forEach(kind => { if (touches[kind]) level = kind; });
        return { level: level, touches: touches, lines: lines, lineCount: original.length };
    }

    const LABELS = {
        doc: { badge: 'เฉพาะเอกสาร', mark: '●', tone: 'ok' },
        file: { badge: 'แตะไฟล์ในเครื่อง', mark: '▲', tone: 'warn' },
        hidden: { badge: 'มีส่วนที่อ่านไม่ออก', mark: '▲', tone: 'warn' },
        system: { badge: 'สั่งโปรแกรมอื่น', mark: '■', tone: 'bad' },
        net: { badge: 'ต่ออินเทอร์เน็ต', mark: '■', tone: 'bad' }
    };

    const ROWS = [
        { kind: 'file', label: 'ไฟล์ในเครื่อง', yes: 'อ่านหรือเขียน', no: 'ไม่พบ' },
        { kind: 'net', label: 'อินเทอร์เน็ต', yes: 'ต่อออกนอกเครื่อง', no: 'ไม่พบ' },
        { kind: 'system', label: 'โปรแกรมอื่นในเครื่อง', yes: 'สั่งงาน', no: 'ไม่พบ' },
        { kind: 'hidden', label: 'โค้ดที่สแกนอ่านไม่ออก', yes: 'มี', no: 'ไม่พบ' }
    ];

    TATA.scriptScan = {
        scan: scan,
        label: level => LABELS[level] || LABELS.doc,
        rows: report => ROWS.map(row => {
            const on = !!(report && report.touches && report.touches[row.kind]);
            return {
                kind: row.kind,
                label: row.label,
                on: on,
                text: on ? row.yes : row.no,
                tone: on ? LABELS[row.kind].tone : 'mute',
                mark: on ? LABELS[row.kind].mark : '○'
            };
        }),
        // Network and system access need an explicit tick before install.
        needsConsent: report => !!(report && (report.touches.net || report.touches.system))
    };
})();
