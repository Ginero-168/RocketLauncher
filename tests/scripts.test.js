describe('user script persistence', function () {
    function loadScripts() {
        window.TATA = {
            state: { userScripts: {}, layout: { tab_button: [] } },
            getUserScripts: function () { return this.state.userScripts; },
            setUserScripts: function (scripts) { this.state.userScripts = scripts; },
            getV2Layout: function () { return this.state.layout; },
            setV2Layout: function (layout) { this.state.layout = layout; },
            saveV2Layout: jest.fn(function () {
                localStorage.setItem('tata_v2_layout', JSON.stringify(TATA.state.layout));
            }),
            renderGrid: jest.fn(),
            Sync: { autoPush: jest.fn() }
        };
        global.TATA = window.TATA;
        window.loadPanelScript('js/scripts.js');
    }

    test('saving a new script batches persistence into one sync request', function () {
        loadScripts();

        TATA.saveUserScript('Example', '<svg></svg>', 'alert("ok");', '#333333', false);

        expect(Object.keys(TATA.getUserScripts())).toHaveLength(1);
        expect(TATA.getV2Layout().tab_button).toHaveLength(1);
        expect(TATA.saveV2Layout).toHaveBeenCalledTimes(1);
        expect(TATA.Sync.autoPush).toHaveBeenCalledTimes(1);
        expect(TATA.renderGrid).toHaveBeenCalledTimes(1);
    });

    test('deleting a script persists related state and schedules one sync request', function () {
        loadScripts();
        TATA.state.userScripts.script_1 = { name: 'Example', code: 'alert("ok");' };
        TATA.state.layout.tab_button.push({ id: 'script_1', label: 'Example', code: 'alert("ok");' });

        TATA.deleteUserScript('script_1');

        expect(TATA.getUserScripts().script_1).toBeUndefined();
        expect(TATA.getV2Layout().tab_button).toHaveLength(0);
        expect(TATA.saveV2Layout).toHaveBeenCalledTimes(1);
        expect(TATA.Sync.autoPush).toHaveBeenCalledTimes(1);
        expect(TATA.renderGrid).toHaveBeenCalledTimes(1);
    });
});
