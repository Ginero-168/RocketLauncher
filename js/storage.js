/**
 * Schema checks for layout, hotkeys, and keeper data in localStorage.
 * Invalid entries are dropped one at a time. The raw value is copied to
 * <key>_backup before a rewrite, and an existing backup is not replaced
 * by an empty list. tata_keeper_cleared is set only when the user saves
 * an empty Keep library. A normal load does not block a later restore.
 */
(function () {
    'use strict';

    window.TATA = window.TATA || {};

    function isPlainObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function parseJson(raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            return undefined;
        }
    }

    function coerceId(id) {
        if (typeof id === 'number' && isFinite(id)) return String(id);
        if (typeof id === 'string') {
            const text = id.trim();
            if (text && text.length < 200) return text;
        }
        return '';
    }

    function backupRaw(key, raw) {
        if (raw == null) return;
        try {
            const backupKey = `${key}_backup`;
            const existing = localStorage.getItem(backupKey);
            if (existing && existing !== '[]') {
                if (raw === '[]' || raw === '') return;
                if (key === 'tata_keeper' && usefulKeeperRaw(existing) && !usefulKeeperRaw(raw)) return;
            }
            localStorage.setItem(backupKey, raw);
        } catch (e) { /* storage may be full */ }
    }

    function layoutItem(item) {
        if (!isPlainObject(item)) return null;
        const id = coerceId(item.id);
        if (!id) return null;
        return item.id === id ? item : Object.assign({}, item, { id: id });
    }

    function readLayout(raw) {
        if (raw == null || raw === '') return { ok: true, value: null, changed: false };
        const parsed = parseJson(raw);
        const tabs = ['tab_button', 'swift', 'creative', 'organize', 'tools'];
        if (!isPlainObject(parsed)) return { ok: false, value: { tab_button: [] }, changed: true };
        let sawTab = false;
        let changed = false;
        const next = Object.assign({}, parsed);
        for (let i = 0; i < tabs.length; i++) {
            const name = tabs[i];
            const tab = parsed[name];
            if (tab == null) continue;
            sawTab = true;
            if (!Array.isArray(tab)) return { ok: false, value: { tab_button: [] }, changed: true };
            const kept = [];
            for (let j = 0; j < tab.length; j++) {
                const item = layoutItem(tab[j]);
                if (!item) {
                    changed = true;
                    continue;
                }
                if (item !== tab[j]) changed = true;
                kept.push(item);
            }
            if (kept.length !== tab.length) changed = true;
            next[name] = kept;
        }
        if (!sawTab) return { ok: false, value: { tab_button: [] }, changed: true };
        return { ok: true, value: next, changed: changed };
    }

    function readList(raw, normalize, allowNull) {
        if (raw == null || raw === '') return { ok: true, value: [], changed: false };
        const parsed = parseJson(raw);
        if (!Array.isArray(parsed)) return { ok: false, value: [], changed: true };
        const clean = [];
        let changed = false;
        for (let i = 0; i < parsed.length; i++) {
            if (parsed[i] == null) {
                if (allowNull) clean.push(null);
                else changed = true;
                continue;
            }
            const item = normalize(parsed[i]);
            if (!item) {
                changed = true;
                continue;
            }
            if (item !== parsed[i]) changed = true;
            clean.push(item);
        }
        return { ok: true, value: clean, changed: changed };
    }

    function hotkeyItem(item) {
        if (!isPlainObject(item)) return null;
        const id = coerceId(item.id);
        if (!id) return null;
        return item.id === id ? item : Object.assign({}, item, { id: id });
    }

    function nodeRequire(name) {
        try {
            if (typeof window !== 'undefined' && typeof window.require === 'function') return window.require(name);
        } catch (e) { /* CEP require can throw */ }
        try {
            if (typeof require === 'function') return require(name);
        } catch (e2) { /* tests eval this file without Node in scope */ }
        return null;
    }

    function keeperRoot() {
        const os = nodeRequire('os');
        const path = nodeRequire('path');
        const fs = nodeRequire('fs');
        if (!os || !path || !fs) return '';
        const lexical = path.resolve(os.homedir(), '.tata_keeper');
        return canonicalPath(lexical, fs, path) || lexical;
    }

    function canonicalPath(target, fs, path) {
        const resolved = path.resolve(String(target || ''));
        const stop = path.parse(resolved).root;
        const missing = [];
        let current = resolved;
        while (current && current !== stop) {
            try {
                fs.lstatSync(current);
                const real = fs.realpathSync(current);
                return missing.length ? path.join(real, ...missing) : real;
            } catch (err) {
                if (!err || err.code !== 'ENOENT') return '';
            }
            missing.unshift(path.basename(current));
            const parent = path.dirname(current);
            if (parent === current) break;
            current = parent;
        }
        return '';
    }

    function insideKeeper(root, target, path) {
        if (!root || !target) return false;
        const rel = path.relative(root, target);
        return !!rel && rel !== '..' && rel.indexOf('..' + path.sep) !== 0 && !path.isAbsolute(rel);
    }

    function resolveKeeperFile(filePath) {
        const fs = nodeRequire('fs');
        const path = nodeRequire('path');
        const root = keeperRoot();
        if (!fs || !path || !root || typeof filePath !== 'string' || !filePath) return '';
        const canonical = canonicalPath(filePath, fs, path);
        if (!insideKeeper(root, canonical, path)) return '';
        return canonical;
    }

    function keeperItem(item) {
        if (!isPlainObject(item)) return null;
        const id = coerceId(item.id);
        if (!id || typeof item.type !== 'string' || !item.type) return null;
        if (item.file_path != null && item.file_path !== '' && !resolveKeeperFile(item.file_path)) return null;
        if (item.id === id) return item;
        return Object.assign({}, item, { id: id });
    }

    function sameKeeperPath(left, right) {
        return left && right && left.file_path && left.file_path === right.file_path;
    }

    function usefulKeeperRaw(raw) {
        const parsed = readList(raw, keeperItem, false);
        return !!(parsed.ok && parsed.value.length);
    }

    function restoreWipedKeeper(current, raw) {
        if (localStorage.getItem('tata_keeper_cleared') === '1') return null;
        if (current && current.length) return null;
        if (usefulKeeperRaw(raw)) return null;
        const backup = localStorage.getItem('tata_keeper_backup');
        if (!backup || backup === '[]') return null;
        const recovered = readList(backup, keeperItem, false);
        if (!recovered.ok || !recovered.value.length) return null;
        const merged = current.slice();
        recovered.value.forEach(item => {
            if (!merged.some(existing => sameKeeperPath(existing, item) || existing.id === item.id)) {
                merged.push(item);
            }
        });
        if (!merged.length) return null;
        return merged;
    }

    function loadChecked(key, check) {
        const raw = localStorage.getItem(key);
        const result = check(raw);
        let value = result.value;
        let changed = !!result.changed;
        let skipBackup = false;
        if (key === 'tata_keeper') {
            const restored = restoreWipedKeeper(value || [], raw);
            if (restored) {
                value = restored;
                changed = true;
                skipBackup = true;
            }
        }
        if (!result.ok || changed) {
            if (!skipBackup) backupRaw(key, raw);
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) { /* keep the in-memory value either way */ }
        }
        if (key === 'tata_keeper') {
            localStorage.removeItem('tata_keeper_restored');
            if (value && value.length) {
                localStorage.removeItem('tata_keeper_cleared');
                if (!usefulKeeperRaw(localStorage.getItem('tata_keeper_backup'))) {
                    try {
                        localStorage.setItem('tata_keeper_backup', JSON.stringify(value));
                    } catch (e) { /* storage may be full */ }
                }
            }
        }
        return value;
    }

    function readStoredLayout() {
        return loadChecked('tata_v2_layout', readLayout);
    }

    function readStoredHotkeys() {
        return loadChecked('tata_hotkeys', raw => readList(raw, hotkeyItem, true));
    }

    function readStoredKeeper() {
        return loadChecked('tata_keeper', raw => readList(raw, keeperItem, false));
    }

    window.TATA.readStoredLayout = readStoredLayout;
    window.TATA.readStoredHotkeys = readStoredHotkeys;
    window.TATA.readStoredKeeper = readStoredKeeper;
    window.TATA.resolveKeeperFile = resolveKeeperFile;
    window.TATA.storageSchema = { readLayout, readList, hotkeyItem, keeperItem, coerceId, resolveKeeperFile };
})();
