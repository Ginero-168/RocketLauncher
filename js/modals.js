/**
 * Rocket Launcher - Feedback & Dialogs
 * Toasts, the dialog stack (Escape / focus handling), input and confirm
 * dialogs, and the "pick a script" mode banner. Nothing here blocks the
 * panel: there are no alert() or confirm() calls anywhere in the panel.
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    // Thai text must not get Latin letter-spacing (it splits vowel marks).
    function markLanguage(el, text) {
        if (!el) return;
        if (/[\u0E00-\u0E7F]/.test(String(text || ''))) el.lang = 'th';
        else el.removeAttribute('lang');
    }

    // ==========================================
    // Toast (one at a time, newest wins)
    // ==========================================
    const TOAST_TYPES = { info: 1, success: 1, warning: 1, error: 1 };
    let toastTimer = 0;

    function showToast(msg, type) {
        const kind = TOAST_TYPES[type] ? type : 'info';
        const host = document.getElementById('toast_region') || document.body;
        if (!host) return null;
        Array.prototype.forEach.call(host.querySelectorAll('.toast'), old => old.remove());
        clearTimeout(toastTimer);

        const toast = document.createElement('div');
        toast.className = `toast toast--${kind}`;
        toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
        toast.textContent = msg == null ? '' : String(msg);
        markLanguage(toast, toast.textContent);
        toast.addEventListener('click', () => toast.remove());
        host.appendChild(toast);

        // The class change (not an animation) makes it visible.
        setTimeout(() => toast.classList.add('show'), 10);
        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, kind === 'error' ? 5000 : 3000);
        return toast;
    }

    // ==========================================
    // Dialog stack
    // ==========================================
    // Every dialog opens through here, so Escape always runs that dialog's
    // own cancel path (listeners are removed, callbacks fire once) and focus
    // returns to whatever opened it.
    const stack = [];
    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function focusables(modal) {
        return Array.prototype.filter.call(modal.querySelectorAll(FOCUSABLE), el => !el.closest('[hidden]'));
    }

    function onStackKey(event) {
        const top = stack[stack.length - 1];
        if (!top) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            top.cancel();
            return;
        }
        if (event.key !== 'Tab') return;
        const items = focusables(top.modal);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function openDialog(modal, options) {
        if (!modal) return () => {};
        const opts = options || {};
        const previous = document.activeElement;
        let open = true;
        const entry = {
            modal: modal,
            cancel: () => {
                if (typeof opts.onCancel === 'function') opts.onCancel();
                else close();
            }
        };

        function onBackdrop(event) {
            if (event.target === modal) entry.cancel();
        }

        function close() {
            if (!open) return;
            open = false;
            modal.classList.remove('active');
            modal.removeEventListener('mousedown', onBackdrop);
            const index = stack.indexOf(entry);
            if (index !== -1) stack.splice(index, 1);
            if (!stack.length) document.removeEventListener('keydown', onStackKey, true);
            if (previous && previous.isConnected !== false && typeof previous.focus === 'function') {
                try { previous.focus(); } catch (e) { /* element may be gone */ }
            }
        }

        stack.push(entry);
        if (stack.length === 1) document.addEventListener('keydown', onStackKey, true);
        modal.classList.add('active');
        if (opts.closeOnBackdrop !== false) modal.addEventListener('mousedown', onBackdrop);
        const target = opts.focus || focusables(modal)[0];
        if (target && typeof target.focus === 'function') {
            try { target.focus(); } catch (e) { /* not focusable yet */ }
        }
        return close;
    }

    // ==========================================
    // Input dialog (one or more fields)
    // ==========================================
    function uniqueInputId(input, field) {
        const key = field && field.key != null && String(field.key) !== '' ? field.key : 'field';
        const baseId = input.id || `input_field_${key}`;
        let id = baseId;
        let suffix = 1;
        while (document.getElementById(id)) {
            id = `${baseId}_${suffix}`;
            suffix += 1;
        }
        input.id = id;
        return id;
    }

    function storedValue(field) {
        if (!field.storageKey) return null;
        try { return localStorage.getItem(field.storageKey); } catch (e) { return null; }
    }

    function buildField(field) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-group';
        const input = document.createElement('input');

        if (field.type === 'checkbox') {
            input.type = 'checkbox';
            uniqueInputId(input, field);
            const saved = storedValue(field);
            input.checked = saved !== null ? saved === 'true' : field.default === true;
            const label = document.createElement('label');
            label.className = 'control-check';
            label.htmlFor = input.id;
            label.appendChild(input);
            label.appendChild(document.createTextNode(field.label || ''));
            wrapper.appendChild(label);
        } else {
            input.type = 'text';
            input.className = 'field field--block';
            input.autocomplete = 'off';
            uniqueInputId(input, field);
            const saved = storedValue(field);
            input.value = saved !== null ? saved : (field.default || '');
            const label = document.createElement('label');
            label.className = 'control-label';
            label.htmlFor = input.id;
            label.textContent = field.label || '';
            wrapper.appendChild(label);
            wrapper.appendChild(input);
        }
        return { wrapper: wrapper, input: input };
    }

    // An unanswered dialog is answered "cancel" when a newer one reuses it,
    // so listeners never pile up and every caller hears back exactly once.
    let pendingInput = null;
    let pendingConfirm = null;

    function settle(getPending, value) {
        // A cancel callback may itself open the dialog again; settle that too.
        for (let i = 0; i < 5; i++) {
            const pending = getPending();
            if (!pending) return;
            pending(value);
        }
    }

    function showInputModal(title, fields, callback) {
        settle(() => pendingInput, null);
        const modal = document.getElementById('input_modal');
        const elTitle = document.getElementById('input_modal_title');
        const container = document.getElementById('input_container');
        const btnConfirm = document.getElementById('btn_confirm_input');
        const btnCancel = document.getElementById('btn_cancel_input');
        if (!modal || !container || !btnConfirm || !btnCancel) return;

        if (elTitle) {
            elTitle.textContent = title;
            markLanguage(elTitle, title);
        }
        container.textContent = '';
        const inputs = (fields || []).map(field => {
            const built = buildField(field);
            container.appendChild(built.wrapper);
            return built.input;
        });

        let close = null;
        function finish(results) {
            if (pendingInput === finish) pendingInput = null;
            btnConfirm.removeEventListener('click', onConfirm);
            btnCancel.removeEventListener('click', onCancel);
            inputs.forEach(input => input.removeEventListener('keydown', onKey));
            if (close) close();
            if (typeof callback === 'function') callback(results);
        }

        function onConfirm() {
            const results = {};
            fields.forEach((field, index) => {
                const el = inputs[index];
                const value = field.type === 'checkbox' ? el.checked : el.value;
                if (field.storageKey) {
                    try { localStorage.setItem(field.storageKey, value); } catch (e) { /* storage blocked */ }
                }
                results[field.key] = value;
            });
            finish(results);
        }

        function onCancel() {
            finish(null);
        }

        function onKey(event) {
            if (event.key === 'Enter' && !event.isComposing) {
                event.preventDefault();
                onConfirm();
            }
        }

        btnConfirm.addEventListener('click', onConfirm);
        btnCancel.addEventListener('click', onCancel);
        inputs.forEach(input => input.addEventListener('keydown', onKey));
        pendingInput = finish;

        const firstText = container.querySelector('input[type="text"]');
        close = openDialog(modal, { onCancel: onCancel, focus: firstText || btnConfirm });
        if (firstText) firstText.select();
    }

    // ==========================================
    // Confirm dialog
    // ==========================================
    // options: { confirmLabel, cancelLabel, danger }
    function showConfirmModal(title, text, callback, options) {
        settle(() => pendingConfirm, false);
        const opts = options || {};
        const modal = document.getElementById('confirm_modal');
        const elTitle = document.getElementById('confirm_modal_title');
        const elText = document.getElementById('confirm_modal_text');
        const btnOk = document.getElementById('btn_confirm_ok');
        const btnCancel = document.getElementById('btn_confirm_cancel');
        if (!modal || !btnOk || !btnCancel) {
            if (typeof callback === 'function') callback(false);
            return;
        }

        if (elTitle) elTitle.textContent = title || 'Confirm';
        if (elText) elText.textContent = text || '';
        btnOk.textContent = opts.confirmLabel || (opts.danger ? 'Delete' : 'OK');
        btnCancel.textContent = opts.cancelLabel || 'Cancel';
        [elTitle, elText, btnOk, btnCancel].forEach(el => markLanguage(el, el && el.textContent));
        btnOk.classList.toggle('btn--danger', !!opts.danger);
        btnOk.classList.toggle('btn--primary', !opts.danger);

        let close = null;
        function finish(value) {
            if (pendingConfirm === finish) pendingConfirm = null;
            btnOk.removeEventListener('click', onOk);
            btnCancel.removeEventListener('click', onCancel);
            if (close) close();
            if (typeof callback === 'function') callback(value);
        }
        function onOk() { finish(true); }
        function onCancel() { finish(false); }

        btnOk.addEventListener('click', onOk);
        btnCancel.addEventListener('click', onCancel);
        pendingConfirm = finish;
        // Destructive dialogs start on Cancel so Enter never deletes by accident.
        close = openDialog(modal, { onCancel: onCancel, focus: opts.danger ? btnCancel : btnOk });
    }

    function askConfirm(options) {
        const opts = options || {};
        return new Promise(resolve => {
            showConfirmModal(opts.title, opts.message, value => resolve(value === true), opts);
        });
    }

    // ==========================================
    // Pick mode (export / upload: "click a script")
    // ==========================================
    function enterPickMode(options) {
        const opts = options || {};
        const bodyClass = opts.bodyClass || 'pick-mode';
        const previous = document.querySelector('.mode-banner');
        if (previous) previous.remove();

        const banner = document.createElement('div');
        banner.className = 'mode-banner';
        banner.setAttribute('role', 'status');
        const text = document.createElement('span');
        text.className = 'mode-banner-text';
        text.textContent = opts.message || 'Click a script';
        markLanguage(text, text.textContent);
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'btn btn--sm';
        if (opts.cancelId) cancel.id = opts.cancelId;
        cancel.textContent = opts.cancelLabel || 'Cancel';
        banner.appendChild(text);
        banner.appendChild(cancel);

        let active = true;
        function exit() {
            if (!active) return;
            active = false;
            document.body.classList.remove(bodyClass);
            document.removeEventListener('keydown', onKey, true);
            if (banner.parentNode) banner.remove();
        }
        function onKey(event) {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            exit();
            if (typeof opts.onCancel === 'function') opts.onCancel();
        }
        cancel.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            exit();
            if (typeof opts.onCancel === 'function') opts.onCancel();
        });

        document.body.classList.add(bodyClass);
        document.body.appendChild(banner);
        document.addEventListener('keydown', onKey, true);
        return exit;
    }

    // ==========================================
    // Export to TATA Namespace
    // ==========================================
    TATA.showToast = showToast;
    TATA.openDialog = openDialog;
    TATA.showInputModal = showInputModal;
    TATA.showConfirmModal = showConfirmModal;
    TATA.askConfirm = askConfirm;
    TATA.enterPickMode = enterPickMode;
    TATA.markLanguage = markLanguage;

})();
