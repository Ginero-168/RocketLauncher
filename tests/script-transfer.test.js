describe('script import and export', function () {
    function setupModule(options) {
        options = options || {};
        document.body.innerHTML =
            '<button id="btn_import_script"></button>' +
            '<button id="btn_export_script"></button>' +
            '<div id="script_1" class="grid-btn"></div>';

        var layout = options.layout || { tab_button: [] };
        var fs = {
            readFileSync: jest.fn(function () { return options.importContent || '{}'; }),
            writeFileSync: jest.fn()
        };
        window.require = jest.fn(function () { return fs; });
        window.cep = {
            fs: {
                showOpenDialogEx: jest.fn(function () { return options.openResult || { data: [] }; }),
                showSaveDialogEx: jest.fn(function () { return options.saveResult || { data: null }; })
            }
        };
        window.TATA = {
            getV2Layout: function () { return layout; },
            setV2Layout: jest.fn(function (next) { layout = next; }),
            saveV2Layout: jest.fn(),
            renderGrid: jest.fn(),
            getItemDataFromElement: jest.fn(function () { return layout.tab_button[0]; }),
            showToast: jest.fn(),
            ICONS: { stars: '<svg></svg>' }
        };
        global.TATA = window.TATA;
        window.loadPanelScript('js/script-transfer.js');
        return { fs: fs, getLayout: function () { return layout; } };
    }

    test('imports a script into the shared layout and renders once', function () {
        var context = setupModule({
            openResult: { data: ['/tmp/example.json'] },
            importContent: JSON.stringify({ name: 'Imported', code: 'alert("ok");', type: 'code', color: '#333333' })
        });

        TATA.initScriptTransfer();
        document.getElementById('btn_import_script').click();

        expect(context.fs.readFileSync).toHaveBeenCalledWith('/tmp/example.json', 'utf8');
        expect(context.getLayout().tab_button).toHaveLength(1);
        expect(context.getLayout().tab_button[0].label).toBe('Imported');
        expect(TATA.saveV2Layout).toHaveBeenCalledTimes(1);
        expect(TATA.renderGrid).toHaveBeenCalledTimes(1);
    });

    test('initialization is idempotent', function () {
        setupModule();

        TATA.initScriptTransfer();
        TATA.initScriptTransfer();
        document.getElementById('btn_import_script').click();

        expect(window.cep.fs.showOpenDialogEx).toHaveBeenCalledTimes(1);
    });

    test('exports the selected button without mutating layout state', function () {
        var item = { id: 'script_1', label: 'Example', icon: '<svg></svg>', code: 'alert("ok");', type: 'code' };
        var context = setupModule({
            layout: { tab_button: [item] },
            saveResult: { data: '/tmp/example' }
        });

        TATA.initScriptTransfer();
        document.getElementById('btn_export_script').click();
        document.getElementById('script_1').click();

        expect(context.fs.writeFileSync).toHaveBeenCalledTimes(1);
        expect(context.fs.writeFileSync.mock.calls[0][0]).toBe('/tmp/example.json');
        expect(item._tab).toBeUndefined();
        expect(document.body.classList.contains('export-mode')).toBe(false);
    });
});
