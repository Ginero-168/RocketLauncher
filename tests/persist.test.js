const fs = require('fs');
const os = require('os');
const path = require('path');

describe('durable copy of panel data (js/persist.js)', function () {
    let dir;

    function boot() {
        window.loadPanelScript('js/persist.js');
        TATA.persist._start(dir);
        return TATA.persist;
    }

    function file(key) {
        return path.join(dir, encodeURIComponent(key) + '.json');
    }

    beforeEach(function () {
        window.require = require;
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-persist-'));
    });

    afterEach(function () {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    test('a write to localStorage reaches the data folder', function () {
        const persist = boot();
        localStorage.setItem('tata_user_scripts', '{"a":1}');
        persist.flush();
        expect(fs.readFileSync(file('tata_user_scripts'), 'utf8')).toBe('{"a":1}');
    });

    test('data comes back after the cache is cleared', function () {
        let persist = boot();
        localStorage.setItem('tata_user_scripts', '{"a":1}');
        localStorage.setItem('tata_v2_layout', '{"tab_button":[{"id":"a"}]}');
        persist.flush();

        localStorage.clear();              // what clearing the CEP cache does
        window.TATA = {};
        persist = boot();

        expect(localStorage.getItem('tata_user_scripts')).toBe('{"a":1}');
        expect(localStorage.getItem('tata_v2_layout')).toBe('{"tab_button":[{"id":"a"}]}');
        expect(persist.restored.sort()).toEqual(['tata_user_scripts', 'tata_v2_layout']);
    });

    test('a value already in localStorage is not replaced by the copy', function () {
        fs.writeFileSync(file('tata_hotkeys'), '["old"]');
        localStorage.setItem('tata_hotkeys', '["new"]');
        const persist = boot();
        expect(localStorage.getItem('tata_hotkeys')).toBe('["new"]');
        expect(persist.restored).toEqual([]);
        persist.seed();
        expect(fs.readFileSync(file('tata_hotkeys'), 'utf8')).toBe('["new"]');
    });

    test('tokens, sessions and foreign keys are never written to disk', function () {
        const persist = boot();
        localStorage.setItem('tata_replicate_api_token', 'r8_secret');
        localStorage.setItem('tata_market_session', '{"t":"secret"}');
        localStorage.setItem('other_key', 'x');
        persist.flush();
        expect(fs.readdirSync(dir)).toEqual([]);
    });

    test('a removed key is not restored, and its last value is kept aside', function () {
        let persist = boot();
        localStorage.setItem('tata_recent_colors', '["#fff"]');
        persist.flush();
        localStorage.removeItem('tata_recent_colors');
        persist.flush();
        expect(fs.existsSync(file('tata_recent_colors'))).toBe(false);
        expect(fs.existsSync(file('tata_recent_colors') + '.removed')).toBe(true);

        window.TATA = {};
        persist = boot();
        expect(localStorage.getItem('tata_recent_colors')).toBeNull();
    });

    test('factory reset does not bring the data back', function () {
        let persist = boot();
        localStorage.setItem('tata_user_scripts', '{"a":1}');
        persist.flush();
        persist.reset();
        localStorage.clear();

        window.TATA = {};
        persist = boot();
        expect(localStorage.getItem('tata_user_scripts')).toBeNull();
        expect(fs.existsSync(path.join(dir, 'before-reset', 'tata_user_scripts.json'))).toBe(true);
    });

    test('the previous value is snapshotted before an overwrite', function () {
        const persist = boot();
        localStorage.setItem('tata_user_scripts', '{"v":1}');
        persist.flush();
        localStorage.setItem('tata_user_scripts', '{"v":2}');
        persist.flush();
        const snaps = fs.readdirSync(path.join(dir, 'snapshots'));
        expect(snaps).toHaveLength(1);
        expect(fs.readFileSync(path.join(dir, 'snapshots', snaps[0]), 'utf8')).toBe('{"v":1}');
    });
});
