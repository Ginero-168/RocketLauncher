describe('shared runtime state', function () {
    test('adopts environment values initialized by core without duplicating them', function () {
        const csInterface = { evalScript: jest.fn() };
        window.TATA = {
            csInterface: csInterface,
            extensionPath: '/extension/path',
            userScripts: { script_1: { name: 'Example' } }
        };
        global.TATA = window.TATA;

        window.loadPanelScript('js/state.js');

        expect(TATA.getCSInterface()).toBe(csInterface);
        expect(TATA.getExtensionPath()).toBe('/extension/path');
        expect(TATA.getUserScripts()).toEqual({ script_1: { name: 'Example' } });
    });

    test('setters update the single shared state object', function () {
        window.loadPanelScript('js/state.js');
        const csInterface = { evalScript: jest.fn() };

        TATA.setCSInterface(csInterface);
        TATA.setExtensionPath('/new/path');
        TATA.setUserScripts({});

        expect(TATA.state.csInterface).toBe(csInterface);
        expect(TATA.state.extensionPath).toBe('/new/path');
        expect(TATA.state.userScripts).toEqual({});
    });
});
