describe('dialogs and toasts (js/modals.js)', function () {
    function markup() {
        document.body.innerHTML =
            '<button id="opener">Open</button>' +
            '<div id="dlg" class="modal">' +
            '<div class="modal-content"><input id="first" type="text"><button id="middle">M</button><button id="last">L</button></div>' +
            '</div>' +
            '<div id="dlg2" class="modal"><button id="inner">Inner</button></div>' +
            '<div id="confirm_modal" class="modal">' +
            '<h3 id="confirm_modal_title"></h3><p id="confirm_modal_text"></p>' +
            '<button id="btn_confirm_cancel"></button><button id="btn_confirm_ok"></button>' +
            '</div>';
    }

    function press(key, opts) {
        const target = document.activeElement || document.body;
        target.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: key, bubbles: true, cancelable: true }, opts)));
    }

    function byId(id) {
        return document.getElementById(id);
    }

    beforeEach(function () {
        markup();
        window.loadPanelScript('js/modals.js');
        byId('opener').focus();
    });

    afterEach(function () {
        for (let i = 0; i < 3; i++) press('Escape');
    });

    test('focus moves into the dialog and returns to the opener on close; a second close is a no-op', function () {
        const close = TATA.openDialog(byId('dlg'));
        expect(byId('dlg').classList.contains('active')).toBe(true);
        expect(document.activeElement).toBe(byId('first'));

        close();
        expect(byId('dlg').classList.contains('active')).toBe(false);
        expect(document.activeElement).toBe(byId('opener'));

        byId('inner').focus();
        close();
        expect(document.activeElement).toBe(byId('inner'));
    });

    test('Escape runs the dialog\'s own cancel path, or closes it when there is none', function () {
        const onCancel = jest.fn();
        TATA.openDialog(byId('dlg'), { onCancel: onCancel });
        press('Escape');
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(byId('dlg').classList.contains('active')).toBe(true);

        markup();
        window.loadPanelScript('js/modals.js');
        TATA.openDialog(byId('dlg2'));
        press('Escape');
        expect(byId('dlg2').classList.contains('active')).toBe(false);
    });

    test('Tab and Shift+Tab wrap around inside the dialog', function () {
        TATA.openDialog(byId('dlg'));
        byId('last').focus();
        press('Tab');
        expect(document.activeElement).toBe(byId('first'));

        press('Tab', { shiftKey: true });
        expect(document.activeElement).toBe(byId('last'));
    });

    test('a backdrop click closes by default but not with closeOnBackdrop:false', function () {
        TATA.openDialog(byId('dlg'), { closeOnBackdrop: false });
        byId('dlg').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        expect(byId('dlg').classList.contains('active')).toBe(true);

        TATA.openDialog(byId('dlg2'));
        byId('inner').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        expect(byId('dlg2').classList.contains('active')).toBe(true);
        byId('dlg2').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        expect(byId('dlg2').classList.contains('active')).toBe(false);
    });

    test('Escape closes only the top dialog of a stack, and focus walks back down', function () {
        TATA.openDialog(byId('dlg'));
        byId('middle').focus();
        TATA.openDialog(byId('dlg2'));

        press('Escape');
        expect(byId('dlg2').classList.contains('active')).toBe(false);
        expect(byId('dlg').classList.contains('active')).toBe(true);
        expect(document.activeElement).toBe(byId('middle'));

        press('Escape');
        expect(byId('dlg').classList.contains('active')).toBe(false);
        expect(document.activeElement).toBe(byId('opener'));
    });

    test('askConfirm resolves false on Escape, true on OK, and a danger prompt starts on Cancel', async function () {
        const cancelled = TATA.askConfirm({ title: 'Delete?', message: 'Gone for good', danger: true });
        expect(document.activeElement).toBe(byId('btn_confirm_cancel'));
        expect(byId('btn_confirm_ok').textContent).toBe('Delete');
        press('Escape');
        await expect(cancelled).resolves.toBe(false);
        expect(byId('confirm_modal').classList.contains('active')).toBe(false);

        const accepted = TATA.askConfirm({ title: 'Apply?' });
        byId('btn_confirm_ok').click();
        await expect(accepted).resolves.toBe(true);
    });

    test('a newer confirm answers the unanswered one with false exactly once', function () {
        const first = jest.fn();
        const second = jest.fn();
        TATA.showConfirmModal('One', '', first);
        TATA.showConfirmModal('Two', '', second);
        expect(first).toHaveBeenCalledTimes(1);
        expect(first).toHaveBeenCalledWith(false);

        byId('btn_confirm_ok').click();
        expect(second).toHaveBeenCalledWith(true);
        expect(first).toHaveBeenCalledTimes(1);
    });

    test('only the newest toast is shown, and errors are announced as alerts', function () {
        TATA.showToast('Saved', 'success');
        const toast = TATA.showToast('Upload failed', 'error');
        const shown = document.querySelectorAll('.toast');
        expect(shown).toHaveLength(1);
        expect(shown[0]).toBe(toast);
        expect(toast.textContent).toBe('Upload failed');
        expect(toast.getAttribute('role')).toBe('alert');
        expect(TATA.showToast('<b>x</b>', 'bogus').className).toBe('toast toast--info');
        expect(document.querySelector('.toast b')).toBeNull();
    });
});
