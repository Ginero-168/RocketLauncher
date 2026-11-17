describe('Hotkey bar (js/hotkeys.js)', function () {
    let clicks;

    // CEP's Chromium has innerText; jsdom does not.
    const hadInnerText = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText');
    beforeAll(function () {
        if (!hadInnerText) {
            Object.defineProperty(HTMLElement.prototype, 'innerText', {
                configurable: true,
                get() { return this.textContent; }
            });
        }
    });
    afterAll(function () {
        if (!hadInnerText) delete HTMLElement.prototype.innerText;
    });

    function boot() {
        document.body.innerHTML =
            '<div id="hotkey-bar"></div>' +
            '<section id="tab_button" class="tab-content">' +
            '<button id="btn_rename">Rename</button>' +
            '<button id="btn_outline">Outline</button>' +
            '<input id="search">' +
            '</section>';
        clicks = [];
        ['btn_rename', 'btn_outline'].forEach(id => {
            document.getElementById(id).addEventListener('click', () => clicks.push(id));
        });
        window.TATA = global.TATA = {};
        window.loadPanelScript('js/hotkeys.js');
        TATA.initHotkeys();
    }

    function slot(n) {
        return document.querySelector('.hotkey-slot[data-slot="' + n + '"]');
    }

    function stored() {
        return JSON.parse(localStorage.getItem('tata_hotkeys') || '[]');
    }

    function drag(buttonId, target) {
        let payload = '';
        const start = new Event('dragstart', { bubbles: true });
        start.dataTransfer = { setData: (type, value) => { payload = value; } };
        document.getElementById(buttonId).dispatchEvent(start);

        const drop = new Event('drop', { bubbles: true, cancelable: true });
        drop.dataTransfer = { getData: () => payload };
        target.dispatchEvent(drop);
    }

    function key(target, type, name) {
        target.dispatchEvent(new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true }));
    }

    test('a button dropped on a slot runs from that slot', function () {
        boot();
        drag('btn_rename', slot(2));

        expect(slot(2).classList.contains('filled')).toBe(true);
        expect(slot(2).querySelector('.hotkey-label').textContent).toBe('Rename');
        slot(2).click();
        expect(clicks).toEqual(['btn_rename']);
    });

    test('Enter and Space on a focused slot run it; keys typed elsewhere do not', function () {
        boot();
        drag('btn_rename', slot(1));

        key(document.getElementById('search'), 'keydown', 'Enter');
        key(slot(1).querySelector('.hotkey-remove'), 'keydown', 'Enter');
        expect(clicks).toEqual([]);

        key(slot(1), 'keydown', 'Enter');
        key(slot(1), 'keydown', ' ');
        expect(clicks).toEqual(['btn_rename']);
        key(slot(1), 'keyup', ' ');
        expect(clicks).toEqual(['btn_rename', 'btn_rename']);
    });

    test('dropping on a filled slot replaces what was there', function () {
        boot();
        drag('btn_rename', slot(1));
        drag('btn_outline', slot(1));

        slot(1).click();
        expect(clicks).toEqual(['btn_outline']);
        expect(stored()[0].id).toBe('btn_outline');
    });

    test('pinned buttons survive a reload of the panel', function () {
        boot();
        drag('btn_outline', slot(3));
        expect(stored()[2]).toMatchObject({ id: 'btn_outline', label: 'Outline' });

        boot();
        expect(slot(3).querySelector('.hotkey-label').textContent).toBe('Outline');
        slot(3).click();
        expect(clicks).toEqual(['btn_outline']);
    });

    test('the remove button empties the slot without running the button', function () {
        boot();
        drag('btn_rename', slot(1));
        slot(1).querySelector('.hotkey-remove').click();

        expect(clicks).toEqual([]);
        expect(slot(1).classList.contains('filled')).toBe(false);
        expect(stored()[0]).toBeNull();
    });

    test('a slot whose button is gone clears itself instead of doing nothing forever', function () {
        localStorage.setItem('tata_hotkeys', JSON.stringify([{ id: 'btn_deleted', label: 'Old' }]));
        boot();
        expect(slot(1).classList.contains('filled')).toBe(true);

        slot(1).click();
        expect(slot(1).classList.contains('filled')).toBe(false);
        expect(stored()[0]).toBeNull();
    });

    test('corrupt stored data loads as empty slots', function () {
        for (const raw of ['{not json', '"text"', '{"id":"btn_rename"}', '[null, 7, {"label":"no id"}, {"id":"  "}]']) {
            localStorage.setItem('tata_hotkeys', raw);
            localStorage.setItem('tata_hotkey_count', 'many');
            expect(boot).not.toThrow();
            expect(document.querySelectorAll('.hotkey-slot')).toHaveLength(5);
            expect(document.querySelectorAll('.hotkey-slot.filled')).toHaveLength(0);
        }
    });

    test('a drop that is not a pinned button leaves the slot alone', function () {
        boot();
        const drop = new Event('drop', { bubbles: true, cancelable: true });
        drop.dataTransfer = { getData: () => 'plain text from another app' };
        expect(() => slot(1).dispatchEvent(drop)).not.toThrow();

        expect(slot(1).classList.contains('filled')).toBe(false);
        expect(localStorage.getItem('tata_hotkeys')).toBeNull();
    });

    test('dropped text that parses as JSON but is not a button leaves the slot empty', function () {
        boot();
        const drop = new Event('drop', { bubbles: true, cancelable: true });
        drop.dataTransfer = { getData: () => '42' };
        slot(1).dispatchEvent(drop);

        expect(slot(1).classList.contains('filled')).toBe(false);
        expect(localStorage.getItem('tata_hotkeys')).toBeNull();
    });
});
