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
            renderGrid: jest.fn()
        };
        global.TATA = window.TATA;
        window.loadPanelScript('js/sanitize.js');
        window.loadPanelScript('js/scripts.js');
    }

    test('Marketplace code that ends in .jsx stays code and keeps its source', function () {
        loadScripts();
        const id = TATA.saveUserScript('Sneaky', '★', '../../../../Users/Shared/x.jsx', '', false, null, true, 'market');
        const saved = TATA.getUserScripts()[id];
        expect(saved.code).toBe('../../../../Users/Shared/x.jsx');
        expect(saved.script).toBeUndefined();
        expect(saved.source).toBe('market');
    });

    test('code whose last line mentions a .jsx file is not lost', function () {
        loadScripts();
        const code = 'alert(1);\n// helper.jsx';
        const id = TATA.saveUserScript('Helper', '★', code, '', false, null, true, 'ai');
        expect(TATA.getUserScripts()[id].code).toBe(code);
    });

    test('a button never runs a file outside the bundled jsx folder', function () {
        loadScripts();
        TATA.getExtensionPath = () => '/ext';
        TATA.host = { evalFile: jest.fn() };
        TATA.showToast = jest.fn();
        ['../x.jsx', '/Users/Shared/x.jsx', 'sub/../../x.jsx', 'C:\\x.jsx', 'x.js'].forEach(name => TATA.runScript(name));
        expect(TATA.host.evalFile).not.toHaveBeenCalled();
        TATA.runScript('Fit.jsx');
        expect(TATA.host.evalFile).toHaveBeenCalledWith('/ext/jsx/Fit.jsx', undefined, expect.any(Function));
    });

    test('saving a new script batches persistence into one sync request', function () {
        loadScripts();

        TATA.saveUserScript('Example', '<svg></svg>', 'alert("ok");', '#333333', false);

        expect(Object.keys(TATA.getUserScripts())).toHaveLength(1);
        expect(TATA.getV2Layout().tab_button).toHaveLength(1);
        expect(TATA.saveV2Layout).toHaveBeenCalledTimes(1);
        expect(TATA.renderGrid).toHaveBeenCalledTimes(1);
    });

    test('deleting a script persists related state', function () {
        loadScripts();
        TATA.state.userScripts.script_1 = { name: 'Example', code: 'alert("ok");' };
        TATA.state.layout.tab_button.push({ id: 'script_1', label: 'Example', code: 'alert("ok");' });

        TATA.deleteUserScript('script_1');

        expect(TATA.getUserScripts().script_1).toBeUndefined();
        expect(TATA.getV2Layout().tab_button).toHaveLength(0);
        expect(TATA.saveV2Layout).toHaveBeenCalledTimes(1);
        expect(TATA.renderGrid).toHaveBeenCalledTimes(1);
    });
});
