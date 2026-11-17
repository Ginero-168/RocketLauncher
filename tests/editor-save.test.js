describe('saving from the code editor (js/scripting.js)', function () {
    let layout, scripts;

    function boot() {
        document.body.innerHTML =
            '<textarea id="code_editor"></textarea>' +
            '<input id="script_name_input">' +
            '<span id="editor_status"></span>' +
            '<button id="btn_editor_import"><span class="btn-label">Import</span></button>';
        layout = { tab_button: [] };
        scripts = {};
        Object.assign(window.TATA, {
            getUserScripts: () => scripts,
            setUserScripts: next => { scripts = next; },
            getV2Layout: () => layout,
            setV2Layout: next => { layout = next; },
            saveV2Layout: jest.fn(),
            renderGrid: jest.fn(),
            showToast: jest.fn(),
            activateTab: jest.fn(),
            csInterface: { getSystemPath: () => '/ext', addEventListener: jest.fn(), evalScript: jest.fn() }
        });
        window.loadPanelScript('js/sanitize.js');
        window.loadPanelScript('js/scripts.js');
        window.loadPanelScript('js/scripting.js');
        TATA.initScripting();
    }

    function save(code) {
        document.getElementById('code_editor').value = code;
        document.getElementById('btn_editor_import').click();
    }

    test('Update changes the opened button instead of adding a second one', function () {
        boot();
        layout.tab_button.push({ id: 'script_1', label: 'Mine', code: 'alert(1);' });
        scripts.script_1 = { name: 'Mine', code: 'alert(1);' };

        TATA.openEditorForItem({ id: 'script_1', label: 'Mine', code: 'alert(1);' });
        save('alert(2);');

        expect(layout.tab_button).toHaveLength(1);
        expect(layout.tab_button[0].code).toBe('alert(2);');
        expect(scripts.script_1.code).toBe('alert(2);');
    });

    test('a Marketplace script keeps asking before each run after an edit', function () {
        boot();
        layout.tab_button.push({ id: 'm1', label: 'Market', code: 'alert(1);', source: 'market' });
        TATA.openEditorForItem({ id: 'm1', label: 'Market', code: 'alert(1);', source: 'market' });
        save('alert(3);');
        expect(layout.tab_button[0].source).toBe('market');
    });

    test('saving twice from a new script updates the button it just made', function () {
        boot();
        save('alert(1);');
        save('alert(2);');
        expect(layout.tab_button).toHaveLength(1);
        expect(layout.tab_button[0].code).toBe('alert(2);');
    });

    test('if the opened button was deleted meanwhile, saving makes a new one', function () {
        boot();
        TATA.openEditorForItem({ id: 'gone', label: 'Gone', code: 'alert(1);' });
        save('alert(4);');
        expect(layout.tab_button).toHaveLength(1);
        expect(layout.tab_button[0].id).not.toBe('gone');
    });
});
