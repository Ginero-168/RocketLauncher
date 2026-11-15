/**
 * Durable copy of the panel's data, kept outside the CEP cache.
 *
 * Everything the panel saves goes to localStorage, and CEP keeps
 * localStorage inside its cache folder (~/Library/Caches/CSXS/cep_cache
 * on macOS). Clearing that cache therefore wiped scripts, layout, hotkeys,
 * the Keep index and custom colours.
 *
 * This module must load before any other module reads localStorage. It
 *   1. restores every missing key from the data folder (cache was cleared),
 *   2. mirrors every later tata_* write and removal to that folder,
 *   3. keeps one dated snapshot per key per day (last 5 kept).
 *
 * localStorage stays the live source, so no other module had to change.
 * Sign-in sessions and API tokens are deliberately not copied to disk.
 */
(function () {
    'use strict';

    window.TATA = window.TATA || {};

    const PREFIX = 'tata_';
    const NOT_COPIED = {
        tata_market_session: true,
        tata_market_token: true,
        tata_replicate_api_token: true
    };
    const WRITE_DELAY_MS = 400;
    const SNAPSHOTS_KEPT = 5;

    function nodeRequire(name) {
        try {
            if (typeof window.require === 'function') return window.require(name);
        } catch (e) { /* CEP require can throw */ }
        try {
            if (typeof require === 'function') return require(name);
        } catch (e2) { /* plain browser */ }
        return null;
    }

    const fs = nodeRequire('fs');
    const path = nodeRequire('path');
    const os = nodeRequire('os');

    function durable(key) {
        return typeof key === 'string' && key.indexOf(PREFIX) === 0 &&
            !NOT_COPIED[key] && !/_backup$/.test(key);
    }

    function defaultDir() {
        if (!os || !path) return '';
        const home = os.homedir();
        if (!home) return '';
        const platform = os.platform();
        const env = typeof process !== 'undefined' && process.env ? process.env : {};
        if (platform === 'darwin') {
            return path.join(home, 'Library', 'Application Support', 'RocketLauncher', 'panel-data');
        }
        if (platform === 'win32') {
            return path.join(env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'RocketLauncher', 'panel-data');
        }
        return path.join(home, '.config', 'RocketLauncher', 'panel-data');
    }

    const state = {
        available: false,
        dir: '',
        restored: [],
        lastError: ''
    };
    const pending = new Map();   // key -> string value, or null for a removal
    let timer = null;
    let nativeSet = null;
    let nativeRemove = null;

    function fileFor(key) {
        return path.join(state.dir, encodeURIComponent(key) + '.json');
    }

    function keyFor(fileName) {
        if (!/\.json$/.test(fileName)) return '';
        try {
            return decodeURIComponent(fileName.slice(0, -5));
        } catch (e) {
            return '';
        }
    }

    function fail(err) {
        state.lastError = err && err.message ? err.message : String(err);
        try { console.warn('[TATA] persist:', state.lastError); } catch (e) { /* no console */ }
    }

    function today() {
        const d = new Date();
        const pad = n => (n < 10 ? '0' : '') + n;
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    // One copy of the previous value per key per day, taken before the
    // first overwrite of that day.
    function snapshot(key, file) {
        try {
            if (!fs.existsSync(file)) return;
            const dir = path.join(state.dir, 'snapshots');
            const stem = encodeURIComponent(key) + '.';
            const target = path.join(dir, stem + today() + '.json');
            if (fs.existsSync(target)) return;
            fs.mkdirSync(dir, { recursive: true });
            fs.copyFileSync(file, target);
            const mine = fs.readdirSync(dir).filter(name => name.indexOf(stem) === 0 &&
                /^\d{4}-\d{2}-\d{2}\.json$/.test(name.slice(stem.length))).sort();
            while (mine.length > SNAPSHOTS_KEPT) {
                fs.unlinkSync(path.join(dir, mine.shift()));
            }
        } catch (e) { fail(e); }
    }

    function writeNow(key, value) {
        const file = fileFor(key);
        try {
            if (value === null) {
                // Keep the last value beside it; removals are rarely meant.
                if (fs.existsSync(file)) fs.renameSync(file, file + '.removed');
                return;
            }
            try {
                if (fs.readFileSync(file, 'utf8') === value) return;
            } catch (e) { /* no file yet */ }
            snapshot(key, file);
            const tmp = file + '.tmp';
            fs.writeFileSync(tmp, value, { encoding: 'utf8', mode: 0o600 });
            fs.renameSync(tmp, file);
        } catch (e) { fail(e); }
    }

    function flush() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (!state.available || !pending.size) return;
        const batch = Array.from(pending.entries());
        pending.clear();
        batch.forEach(entry => writeNow(entry[0], entry[1]));
    }

    function queue(key, value) {
        pending.set(key, value);
        if (!timer) timer = setTimeout(flush, WRITE_DELAY_MS);
    }

    function restoreMissing() {
        let names = [];
        try {
            names = fs.readdirSync(state.dir);
        } catch (e) { return; }
        names.forEach(name => {
            const key = keyFor(name);
            if (!durable(key)) return;
            try {
                if (window.localStorage.getItem(key) !== null) return;
                const value = fs.readFileSync(path.join(state.dir, name), 'utf8');
                nativeSet.call(window.localStorage, key, value);
                state.restored.push(key);
            } catch (e) { fail(e); }
        });
    }

    // Copy what is already in localStorage (first run after this update).
    function seed() {
        const store = window.localStorage;
        for (let i = 0; i < store.length; i++) {
            const key = store.key(i);
            if (durable(key) && !pending.has(key)) pending.set(key, store.getItem(key));
        }
        flush();
    }

    function hook() {
        const proto = Object.getPrototypeOf(window.localStorage);
        nativeSet = proto.setItem;
        nativeRemove = proto.removeItem;
        proto.setItem = function (key, value) {
            try {
                nativeSet.call(this, key, value);
            } catch (err) {
                // Quota reached: say so instead of losing the change silently.
                if (this === window.localStorage && typeof TATA.showToast === 'function') {
                    TATA.showToast('Panel storage is full, so this change was not saved. Remove unused scripts or Keep items.', 'error');
                }
                throw err;
            }
            if (state.available && this === window.localStorage && durable(String(key))) {
                queue(String(key), String(value));
            }
        };
        proto.removeItem = function (key) {
            nativeRemove.call(this, key);
            if (state.available && this === window.localStorage && durable(String(key))) {
                queue(String(key), null);
            }
        };
    }

    function start(dir) {
        if (!fs || !path || !os) return state;
        try {
            if (!nativeSet) hook();
            state.dir = dir || defaultDir();
            if (!state.dir) return state;
            fs.mkdirSync(state.dir, { recursive: true });
            state.available = true;
            state.restored = [];
            restoreMissing();
            setTimeout(seed, 1500);
        } catch (e) {
            state.available = false;
            fail(e);
        }
        return state;
    }

    start();

    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);

    // Tell the user once, after the panel has drawn, that data came back.
    const SHOWN = ['tata_user_scripts', 'tata_v2_layout', 'tata_hotkeys', 'tata_keeper', 'tata_custom_colors'];
    if (state.restored.some(key => SHOWN.indexOf(key) !== -1)) {
        setTimeout(() => {
            if (typeof TATA.showToast === 'function') {
                TATA.showToast('Your panel data was restored after a cache reset.', 'success');
            }
        }, 1800);
    }

    function reveal() {
        if (!state.available) return false;
        flush();
        const cp = nodeRequire('child_process');
        if (!cp) return false;
        try {
            const platform = os.platform();
            if (platform === 'darwin') cp.execFile('open', [state.dir]);
            else if (platform === 'win32') cp.execFile('explorer', [state.dir]);
            else cp.execFile('xdg-open', [state.dir]);
            return true;
        } catch (e) {
            fail(e);
            return false;
        }
    }

    // Factory reset: set the copies aside so the next start does not bring
    // them back. The newest set-aside folder is kept as a last resort.
    function reset() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        pending.clear();
        if (!state.available) return;
        try {
            const aside = path.join(state.dir, 'before-reset');
            fs.mkdirSync(aside, { recursive: true });
            fs.readdirSync(state.dir).forEach(name => {
                if (!keyFor(name)) return;
                fs.renameSync(path.join(state.dir, name), path.join(aside, name));
            });
        } catch (e) { fail(e); }
    }

    TATA.persist = {
        get available() { return state.available; },
        get dir() { return state.dir; },
        get restored() { return state.restored.slice(); },
        get lastError() { return state.lastError; },
        durable: durable,
        flush: flush,
        seed: seed,
        reveal: reveal,
        reset: reset,
        _start: start
    };
})();
