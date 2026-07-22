describe('context menu updates', function () {
    test('persists related color changes and schedules one cloud sync', function () {
        const layout = { tab_button: [{ id: 'script_1', color: '#000000' }] };
        const scripts = { script_1: { color: '#000000' } };
        const hotkeys = [{ id: 'script_1', color: '#000000' }];
        window.TATA = {
            getV2Layout: function () { return layout; },
            setV2Layout: jest.fn(),
            saveV2Layout: jest.fn(),
            getUserScripts: function () { return scripts; },
            setUserScripts: jest.fn(),
            getHotkeys: function () { return hotkeys; },
            setHotkeys: jest.fn(),
            saveHotkeys: jest.fn(),
            renderHotkeys: jest.fn(),
            renderGrid: jest.fn(),
            showToast: jest.fn(),
            Sync: { autoPush: jest.fn() }
        };
        global.TATA = window.TATA;
        window.loadPanelScript('js/context-menu.js');

        TATA.updateItemColor('script_1', '#ffffff');

        expect(layout.tab_button[0].color).toBe('#ffffff');
        expect(scripts.script_1.color).toBe('#ffffff');
        expect(hotkeys[0].color).toBe('#ffffff');
        expect(TATA.saveV2Layout).toHaveBeenCalledWith(true);
        expect(TATA.saveHotkeys).toHaveBeenCalledWith(true);
        expect(TATA.Sync.autoPush).toHaveBeenCalledTimes(1);
        expect(TATA.renderGrid).toHaveBeenCalledTimes(1);
    });
});
