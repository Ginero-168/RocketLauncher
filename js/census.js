/**
 * Document census: what the artboard or document holds, grouped by what the
 * objects share (stroke colour and width, fill colour, font and size).
 * Clicking a group selects exactly those objects in Illustrator.
 *
 * No AI and no network: jsx/hostscript.jsx (censusScan) lists the objects,
 * build() below groups them, and the list is drawn from that.
 *
 * "Near-misses" are small groups that sit within 15% of a much larger group
 * of the same colour or font (a 1.1pt stroke among 1pt strokes). They are
 * shown separately with a one-click fix.
 */
(function () {
    'use strict';

    window.TATA = window.TATA || {};

    const MAX_ITEMS = 4000;
    const ROWS_PER_SECTION = 14;
    const NEAR = 0.15;        // relative distance that still counts as "meant to be the same"
    const MAJORITY = 3;       // a group this large can have near-misses

    function num(value) {
        return String(Math.round(value * 100) / 100);
    }

    function bucket(items, keyOf) {
        const map = new Map();
        items.forEach(item => {
            const key = keyOf(item);
            if (key === '' || key === null || typeof key === 'undefined') return;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        });
        return Array.from(map.entries())
            .map(entry => ({ key: entry[0], items: entry[1] }))
            .sort((a, b) => b.items.length - a.items.length || String(a.key).localeCompare(String(b.key)));
    }

    function ids(items) {
        return items.map(item => item.i);
    }

    // Small groups close to a big one, within one colour or one font.
    function nearMisses(groups, valueOf, describe) {
        const out = [];
        groups.forEach(small => {
            let best = null;
            groups.forEach(big => {
                if (big === small || big.items.length < MAJORITY) return;
                if (small.items.length * 3 > big.items.length) return;
                const a = valueOf(small);
                const b = valueOf(big);
                if (!(a > 0) || !(b > 0) || a === b) return;
                if (Math.abs(a - b) / b > NEAR) return;
                if (!best || big.items.length > best.items.length) best = big;
            });
            if (best) out.push(describe(small, best));
        });
        return out;
    }

    function build(rawItems) {
        const all = Array.isArray(rawItems) ? rawItems : [];
        const items = all.filter(item => item && !item.skip);
        const sections = [];
        const outliers = [];

        function section(id, title, rows, count) {
            if (!rows.length) return;
            const shown = rows.slice(0, ROWS_PER_SECTION);
            sections.push({ id: id, title: title, count: count, rows: shown, more: rows.length - shown.length });
        }

        // --- strokes ---------------------------------------------------
        const stroked = items.filter(item => item.k === 'path' && item.sc);
        const strokeRows = [];
        if (stroked.length) {
            strokeRows.push({ id: 'stroke', depth: 0, label: 'เส้นทั้งหมด', sub: 'ทุกสี ทุกขนาด', swatch: '', ids: ids(stroked) });
        }
        bucket(stroked, item => item.sc).forEach(color => {
            const widths = bucket(color.items, item => item.sw);
            const swatch = color.items[0].sh || '';
            if (widths.length > 1) {
                strokeRows.push({ id: 'stroke:' + color.key, depth: 1, label: 'สีเดียวกัน', sub: color.key + ' · ทุกขนาด', swatch: swatch, ids: ids(color.items) });
            }
            widths.forEach(width => {
                strokeRows.push({
                    id: 'stroke:' + color.key + ':' + width.key,
                    depth: widths.length > 1 ? 2 : 1,
                    label: 'สีและขนาดเดียวกัน',
                    sub: color.key + ' · ' + num(width.key) + 'pt',
                    swatch: swatch,
                    ids: ids(width.items)
                });
            });
            nearMisses(widths, group => group.key, (small, big) => ({
                id: 'near:stroke:' + color.key + ':' + small.key,
                kind: 'stroke',
                ids: ids(small.items),
                value: big.key,
                fixLabel: 'ปรับเป็น ' + num(big.key) + 'pt',
                text: 'มีเส้นสี ' + color.key + ' หนา ' + num(small.key) + 'pt อยู่ ' + small.items.length +
                    ' เส้น ใกล้กับชุด ' + num(big.key) + 'pt ที่มี ' + big.items.length + ' เส้น'
            })).forEach(found => outliers.push(found));
        });
        section('stroke', 'เส้น', strokeRows, stroked.length);

        // --- fills -----------------------------------------------------
        const filled = items.filter(item => item.k === 'path' && item.fc);
        const fillRows = bucket(filled, item => item.fc).map(color => ({
            id: 'fill:' + color.key, depth: 0, label: 'สีพื้นเดียวกัน', sub: color.key,
            swatch: color.items[0].fh || '', ids: ids(color.items)
        }));
        section('fill', 'สีพื้น', fillRows, filled.length);

        // --- text ------------------------------------------------------
        const texts = items.filter(item => item.k === 'text');
        const textRows = [];
        if (texts.length) {
            textRows.push({ id: 'text', depth: 0, label: 'ข้อความทั้งหมด', sub: 'ทุกฟอนต์', swatch: '', ids: ids(texts) });
        }
        bucket(texts, item => item.font).forEach(font => {
            const sizes = bucket(font.items, item => item.size);
            if (sizes.length > 1) {
                textRows.push({ id: 'text:' + font.key, depth: 1, label: 'ฟอนต์เดียวกัน', sub: font.key + ' · ทุกขนาด', swatch: '', ids: ids(font.items) });
            }
            sizes.forEach(size => {
                textRows.push({
                    id: 'text:' + font.key + ':' + size.key,
                    depth: sizes.length > 1 ? 2 : 1,
                    label: 'ฟอนต์และขนาดเดียวกัน',
                    sub: font.key + ' · ' + num(size.key) + 'pt',
                    swatch: '',
                    ids: ids(size.items)
                });
            });
            nearMisses(sizes, group => group.key, (small, big) => ({
                id: 'near:size:' + font.key + ':' + small.key,
                kind: 'size',
                ids: ids(small.items),
                value: big.key,
                fixLabel: 'ปรับเป็น ' + num(big.key) + 'pt',
                text: 'มีข้อความ ' + font.key + ' ขนาด ' + num(small.key) + 'pt อยู่ ' + small.items.length +
                    ' ชิ้น ใกล้กับชุด ' + num(big.key) + 'pt ที่มี ' + big.items.length + ' ชิ้น'
            })).forEach(found => outliers.push(found));
        });
        section('text', 'ข้อความ', textRows, texts.length);

        return {
            total: items.length,
            skipped: all.length - items.length,
            sections: sections,
            outliers: outliers
        };
    }

    // ------------------------------------------------------------------
    // Panel UI
    // ------------------------------------------------------------------
    const view = { scope: 'artboard', report: null, picked: '', busy: false, truncated: false };

    function byId(id) {
        return document.getElementById(id);
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (typeof text === 'string') node.textContent = text;
        return node;
    }

    function setStatus(text, tone) {
        const status = byId('census_status');
        if (!status) return;
        status.textContent = text || '';
        status.dataset.tone = tone || '';
    }

    function parse(result) {
        if (typeof result !== 'string' || !result || result.indexOf('Error') === 0 || result.indexOf('ERR') === 0) return null;
        try {
            return JSON.parse(result);
        } catch (e) {
            return null;
        }
    }

    function hostRun(command, params) {
        return new Promise(resolve => {
            if (!TATA.host || typeof TATA.host.run !== 'function') {
                resolve(null);
                return;
            }
            TATA.host.run(command, params, result => resolve(parse(result)));
        });
    }

    function paint() {
        const list = byId('census_list');
        const summary = byId('census_summary');
        if (!list) return;
        list.textContent = '';
        const report = view.report;
        if (!report) return;

        if (summary) {
            let text = report.total + ' วัตถุ';
            if (report.skipped) text += ' · ข้าม ' + report.skipped + ' ชิ้นที่ล็อกหรือซ่อนอยู่';
            if (view.truncated) text += ' · แสดงเฉพาะ ' + MAX_ITEMS + ' ชิ้นแรก';
            summary.textContent = text;
        }
        if (!report.total) {
            list.appendChild(el('p', 'census-empty', view.scope === 'artboard'
                ? 'ไม่พบเส้น สีพื้น หรือข้อความบน artboard นี้'
                : 'ไม่พบเส้น สีพื้น หรือข้อความในเอกสารนี้'));
            return;
        }

        report.outliers.forEach(found => {
            const card = el('div', 'census-near');
            card.appendChild(el('span', 'census-near-title', '▲ ตัวหลุดชุด'));
            card.appendChild(el('p', 'census-near-text', found.text));
            const actions = el('div', 'census-near-actions');
            const show = el('button', 'btn', 'ชี้ให้ดู');
            show.type = 'button';
            show.addEventListener('click', () => select(found.id, found.ids));
            const fix = el('button', 'btn btn--primary', found.fixLabel);
            fix.type = 'button';
            fix.addEventListener('click', () => fixNear(found));
            actions.appendChild(show);
            actions.appendChild(fix);
            card.appendChild(actions);
            list.appendChild(card);
        });

        report.sections.forEach(section => {
            const box = el('div', 'census-section');
            box.appendChild(el('span', 'census-heading', section.title + ' ' + section.count));
            section.rows.forEach(row => {
                const button = el('button', 'census-row');
                button.type = 'button';
                button.dataset.depth = String(row.depth);
                button.setAttribute('aria-pressed', row.id === view.picked ? 'true' : 'false');
                if (row.id === view.picked) button.classList.add('is-on');
                const swatch = el('span', 'census-swatch');
                swatch.setAttribute('aria-hidden', 'true');
                if (/^#[0-9A-F]{6}$/i.test(row.swatch)) swatch.style.background = row.swatch;
                else swatch.classList.add('census-swatch--none');
                const text = el('span', 'census-text');
                text.appendChild(el('span', 'census-label', row.label));
                text.appendChild(el('span', 'census-sub', row.sub));
                button.appendChild(swatch);
                button.appendChild(text);
                button.appendChild(el('span', 'census-count', String(row.ids.length)));
                button.addEventListener('click', () => select(row.id, row.ids));
                box.appendChild(button);
            });
            if (section.more > 0) box.appendChild(el('span', 'census-more', 'และอีก ' + section.more + ' ชุดที่เล็กกว่า'));
            list.appendChild(box);
        });
    }

    function scan() {
        if (view.busy) return Promise.resolve();
        view.busy = true;
        view.picked = '';
        setStatus('กำลังสำรวจ...', '');
        return hostRun('censusScan', { scope: view.scope, max: MAX_ITEMS }).then(data => {
            view.busy = false;
            if (!data) {
                view.report = null;
                paint();
                setStatus('สำรวจไม่ได้ เปิดพาเนลใน Illustrator แล้วลองอีกครั้ง', 'error');
                return;
            }
            if (data.error === 'nodoc') {
                view.report = null;
                paint();
                setStatus('ยังไม่ได้เปิดเอกสาร', 'error');
                return;
            }
            view.truncated = !!data.truncated;
            view.report = build(data.items);
            paint();
            setStatus(view.report.total ? 'กดชุดใดก็ได้เพื่อเลือกทั้งชุด' : '', '');
        });
    }

    function stale() {
        setStatus('เอกสารเปลี่ยนไปแล้ว กำลังสำรวจใหม่...', '');
        return scan();
    }

    function select(id, list) {
        if (view.busy) return;
        hostRun('censusSelect', { ids: list }).then(data => {
            if (!data) return setStatus('เลือกไม่สำเร็จ', 'error');
            if (data.error === 'stale') return stale();
            view.picked = id;
            paint();
            let text = 'เลือกแล้ว ' + data.selected + ' วัตถุใน Illustrator';
            if (data.missed) text += ' · เลือกไม่ได้ ' + data.missed + ' ชิ้น';
            setStatus(text, 'ok');
        });
    }

    function fixNear(found) {
        if (view.busy) return;
        hostRun('censusFix', { ids: found.ids, kind: found.kind, value: found.value }).then(data => {
            if (!data) return setStatus('ปรับไม่สำเร็จ', 'error');
            if (data.error === 'stale') return stale();
            const changed = data.changed || 0;
            scan().then(() => setStatus('ปรับแล้ว ' + changed + ' ชิ้น (Undo ได้ใน Illustrator)', 'ok'));
        });
    }

    function paintScope() {
        document.querySelectorAll('[data-census-scope]').forEach(chip => {
            const on = chip.dataset.censusScope === view.scope;
            chip.classList.toggle('is-on', on);
            chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    // Called when the Selector tab is shown (js/tabs.js): the document may
    // have changed since the last look, so it is surveyed again.
    function refresh() {
        paintScope();
        return scan();
    }

    function bind() {
        const rescan = byId('btn_census_rescan');
        if (rescan) rescan.addEventListener('click', scan);
        document.querySelectorAll('[data-census-scope]').forEach(chip => {
            chip.addEventListener('click', () => {
                view.scope = chip.dataset.censusScope === 'document' ? 'document' : 'artboard';
                paintScope();
                scan();
            });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();

    TATA.census = { build: build, refresh: refresh, MAX_ITEMS: MAX_ITEMS };
})();
