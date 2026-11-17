const fs = require('fs');
const os = require('os');
const path = require('path');

describe('stored data checks (js/storage.js)', function () {
    let keeperDir;

    beforeEach(function () {
        window.require = require;
        keeperDir = path.join(os.homedir(), '.tata_keeper');
        fs.rmSync(keeperDir, { recursive: true, force: true });
        window.loadPanelScript('js/storage.js');
    });

    afterEach(function () {
        jest.restoreAllMocks();
    });

    function keepFile(name) {
        fs.mkdirSync(keeperDir, { recursive: true });
        const file = path.join(keeperDir, name);
        fs.writeFileSync(file, '<svg/>');
        return fs.realpathSync(file);
    }

    test('a corrupt layout loads as an empty grid and the raw text is kept in the backup', function () {
        localStorage.setItem('tata_v2_layout', '{"tab_button": [ {"id": "a"');

        let layout;
        expect(() => { layout = TATA.readStoredLayout(); }).not.toThrow();
        expect(layout).toEqual({ tab_button: [] });
        expect(localStorage.getItem('tata_v2_layout_backup')).toBe('{"tab_button": [ {"id": "a"');
        expect(JSON.parse(localStorage.getItem('tata_v2_layout'))).toEqual({ tab_button: [] });
    });

    test('one bad button is dropped and the rest of the layout survives', function () {
        localStorage.setItem('tata_v2_layout', JSON.stringify({
            tab_button: [{ id: 'keep_me', name: 'A' }, 'junk', { name: 'no id' }, { id: 7, name: 'B' }],
            columns: 4
        }));

        const layout = TATA.readStoredLayout();

        expect(layout.tab_button).toEqual([{ id: 'keep_me', name: 'A' }, { id: '7', name: 'B' }]);
        expect(layout.columns).toBe(4);
        expect(JSON.parse(localStorage.getItem('tata_v2_layout')).tab_button).toHaveLength(2);
    });

    test('hotkeys keep their empty slots but lose entries without an id', function () {
        localStorage.setItem('tata_hotkeys', JSON.stringify([{ id: 'x' }, null, { label: 'orphan' }, { id: 'y' }]));
        expect(TATA.readStoredHotkeys()).toEqual([{ id: 'x' }, null, { id: 'y' }]);

        localStorage.setItem('tata_hotkeys', 'not json');
        expect(TATA.readStoredHotkeys()).toEqual([]);
    });

    test('a full disk while rewriting cleaned data still returns the cleaned data', function () {
        localStorage.setItem('tata_v2_layout', JSON.stringify({ tab_button: [{ id: 'a' }, 42] }));
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function () {
            const error = new Error('QuotaExceededError');
            error.name = 'QuotaExceededError';
            throw error;
        });

        let layout;
        expect(() => { layout = TATA.readStoredLayout(); }).not.toThrow();
        expect(layout.tab_button).toEqual([{ id: 'a' }]);
    });

    test('a Keep entry pointing outside the Keep folder is dropped', function () {
        const inside = keepFile('keep_1.svg');
        localStorage.setItem('tata_keeper', JSON.stringify([
            { id: 'ok', type: 'svg', file_path: inside },
            { id: 'abs', type: 'svg', file_path: '/etc/passwd' },
            { id: 'dots', type: 'svg', file_path: path.join(keeperDir, '..', '.ssh', 'id_rsa') },
            { id: 'no_type', file_path: inside }
        ]));

        expect(TATA.readStoredKeeper().map(item => item.id)).toEqual(['ok']);
    });

    test('a wiped Keep library comes back from its backup unless the user cleared it', function () {
        const file = keepFile('keep_1.svg');
        const saved = JSON.stringify([{ id: 'k1', type: 'svg', file_path: file }]);

        localStorage.setItem('tata_keeper', '[]');
        localStorage.setItem('tata_keeper_backup', saved);
        expect(TATA.readStoredKeeper().map(item => item.id)).toEqual(['k1']);
        expect(JSON.parse(localStorage.getItem('tata_keeper'))).toHaveLength(1);

        localStorage.setItem('tata_keeper', '[]');
        localStorage.setItem('tata_keeper_backup', saved);
        localStorage.setItem('tata_keeper_cleared', '1');
        expect(TATA.readStoredKeeper()).toEqual([]);
        expect(localStorage.getItem('tata_keeper_backup')).toBe(saved);
    });
});
