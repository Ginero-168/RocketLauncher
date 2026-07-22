describe('grid storage and rendering', function () {
    function loadGrid() {
        document.body.innerHTML = '<div id="tab_button"></div><div id="context_menu"></div>';
        window.TATA = {
            debounce: function (fn) { return fn; },
            safeParse: function (value, fallback) {
                try { return JSON.parse(value); } catch (e) { return fallback; }
            },
            backupBeforeSave: jest.fn()
        };
        global.TATA = window.TATA;
        window.loadPanelScript('js/grid.js');
    }

    test('persists normalized defaults once and keeps subsequent renders read-only', function () {
        loadGrid();
        const setItem = jest.spyOn(Storage.prototype, 'setItem');

        TATA.renderGrid();
        TATA.renderGrid();

        const layoutWrites = setItem.mock.calls.filter(function (call) {
            return call[0] === 'tata_v2_layout';
        });
        expect(layoutWrites).toHaveLength(1);
        expect(document.querySelectorAll('.grid-btn')).toHaveLength(9);
    });

    test('explicit save persists layout to localStorage', function () {
        loadGrid();
        TATA.setV2Layout({ tab_button: [] });
        const setItem = jest.spyOn(Storage.prototype, 'setItem');

        TATA.saveV2Layout();

        expect(setItem).toHaveBeenCalledWith('tata_v2_layout', JSON.stringify({ tab_button: [] }));
    });

    test('reloads in-memory layout after cloud storage is restored', function () {
        loadGrid();
        TATA.renderGrid();
        localStorage.setItem('tata_v2_layout', JSON.stringify({
            tab_button: [{ id: 'cloud_script', label: 'Cloud Script', code: 'alert("cloud");' }]
        }));

        TATA.reloadV2Layout();

        expect(TATA.getV2Layout().tab_button[0].id).toBe('cloud_script');
        expect(document.getElementById('cloud_script')).not.toBeNull();
    });
});
