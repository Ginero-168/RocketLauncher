/**
 * "Before you install" dialog for a Marketplace script.
 * Shows what js/script-scan.js found in the code and lets the user install,
 * remix (install and open in the editor) or cancel. Scripts that reach the
 * network or other programs need an explicit tick first.
 */
(function () {
    'use strict';

    window.TATA = window.TATA || {};

    let settle = null;

    function byId(id) {
        return document.getElementById(id);
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (typeof text === 'string') node.textContent = text;
        return node;
    }

    function creditText(credits) {
        const list = Array.isArray(credits) ? credits : [];
        if (!list.length) return '';
        return 'สายที่มา: ' + list.map(c => (c.by ? c.name + ' (' + c.by + ')' : c.name)).join(' → ');
    }

    /**
     * @param {{name:string, by:string, code:string, credits:Array}} item
     * @returns {Promise<string>} 'install', 'remix' or '' (cancelled)
     */
    function open(item) {
        const modal = byId('script_review_modal');
        const scanApi = TATA.scriptScan;
        if (!modal || !scanApi || typeof TATA.openDialog !== 'function') return Promise.resolve('install');
        if (settle) settle('');

        const report = scanApi.scan(item.code);
        const label = scanApi.label(report.level);
        const needsConsent = scanApi.needsConsent(report);

        byId('script_review_name').textContent = item.name || 'Script';
        const by = byId('script_review_by');
        const lineage = creditText(item.credits);
        by.textContent = [item.by ? 'โดย ' + item.by : '', lineage].filter(Boolean).join(' · ');
        by.hidden = !by.textContent;

        const badge = byId('script_review_badge');
        badge.textContent = label.mark + ' ' + label.badge;
        badge.dataset.tone = label.tone;

        const rows = byId('script_review_rows');
        rows.textContent = '';
        scanApi.rows(report).forEach(row => {
            const line = el('div', 'review-row');
            line.appendChild(el('span', 'review-row-label', row.label));
            const value = el('span', 'review-row-value', row.mark + ' ' + row.text);
            value.dataset.tone = row.tone;
            line.appendChild(value);
            rows.appendChild(line);
        });

        const wrap = byId('script_review_lines_wrap');
        const lines = byId('script_review_lines');
        lines.textContent = '';
        report.lines.slice(0, 40).forEach(found => {
            const line = el('div', 'review-line');
            line.appendChild(el('span', 'review-line-no', String(found.no)));
            line.appendChild(el('span', 'review-line-code', found.code));
            lines.appendChild(line);
        });
        if (report.lines.length > 40) lines.appendChild(el('div', 'review-line-more', 'และอีก ' + (report.lines.length - 40) + ' บรรทัด'));
        wrap.hidden = report.lines.length === 0;

        const consent = byId('script_review_consent');
        const ack = byId('script_review_ack');
        const install = byId('btn_review_install');
        const remix = byId('btn_review_remix');
        const cancel = byId('btn_review_cancel');
        ack.checked = false;
        consent.hidden = !needsConsent;

        function sync() {
            const blocked = needsConsent && !ack.checked;
            install.disabled = blocked;
            install.textContent = blocked ? 'ติ๊กยืนยันก่อน' : 'ติดตั้ง';
        }
        sync();

        return new Promise(resolve => {
            let close = null;
            function finish(result) {
                if (settle !== finish) return;
                settle = null;
                ack.removeEventListener('change', sync);
                install.removeEventListener('click', onInstall);
                remix.removeEventListener('click', onRemix);
                cancel.removeEventListener('click', onCancel);
                if (close) close();
                resolve(result);
            }
            function onInstall() { if (!install.disabled) finish('install'); }
            function onRemix() { finish('remix'); }
            function onCancel() { finish(''); }
            settle = finish;
            ack.addEventListener('change', sync);
            install.addEventListener('click', onInstall);
            remix.addEventListener('click', onRemix);
            cancel.addEventListener('click', onCancel);
            close = TATA.openDialog(modal, { onCancel: onCancel, focus: cancel });
        });
    }

    TATA.scriptReview = { open: open, creditText: creditText };
})();
