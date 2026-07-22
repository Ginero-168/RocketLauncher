/**
 * TATA Panel - Modals Module
 * Contains: Toast notifications, Input Modal, Confirm Modal
 * @version 4.2
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    // ==========================================
    // Toast Notification
    // ==========================================
    function showToast(msg, type) {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type || 'info'}`;
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => { toast.classList.add('show'); }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // ==========================================
    // Input Modal (Multi-Field)
    // ==========================================
    function showInputModal(title, fields, callback) {
        const modal = document.getElementById('input_modal');
        const elTitle = document.getElementById('input_modal_title');
        const container = document.getElementById('input_container');
        const btnConfirm = document.getElementById('btn_confirm_input');
        const btnCancel = document.getElementById('btn_cancel_input');

        if (!modal || !container) return;

        elTitle.innerText = title;
        container.innerHTML = '';

        fields.forEach(field => {
            const wrapper = document.createElement('div');
            wrapper.className = 'control-group';
            wrapper.style.marginBottom = '10px';

            if (field.type === 'checkbox') {
                var input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `input_field_${field.key}`;
                input.style.width = 'auto';
                input.style.marginRight = '8px';

                let isChecked = field.default === true;
                if (field.storageKey) {
                    var saved = localStorage.getItem(field.storageKey);
                    if (saved !== null) isChecked = (saved === 'true');
                }
                input.checked = isChecked;

                const chkLabel = document.createElement('label');
                chkLabel.appendChild(input);
                chkLabel.appendChild(document.createTextNode(field.label));
                chkLabel.style.display = 'flex';
                chkLabel.style.alignItems = 'center';
                chkLabel.style.cursor = 'pointer';
                wrapper.appendChild(chkLabel);
            } else {
                const label = document.createElement('label');
                label.innerText = field.label;
                label.style.display = 'block';
                label.style.marginBottom = '5px';

                var input = document.createElement('input');
                input.type = 'text';
                input.id = `input_field_${field.key}`;
                input.style.width = '100%';
                input.style.boxSizing = 'border-box';

                let val = field.default || "";
                if (field.storageKey) {
                    var saved = localStorage.getItem(field.storageKey);
                    if (saved !== null) val = saved;
                }
                input.value = val;

                wrapper.appendChild(label);
                wrapper.appendChild(input);
            }
            container.appendChild(wrapper);
        });

        modal.classList.add('active');

        const firstTextInput = container.querySelector('input[type=text]');
        if (firstTextInput) {
            firstTextInput.focus();
            firstTextInput.select();
        }

        const onConfirm = () => {
            const results = {};
            fields.forEach(field => {
                const el = document.getElementById(`input_field_${field.key}`);
                let val;
                if (field.type === 'checkbox') {
                    val = el.checked;
                    if (field.storageKey) localStorage.setItem(field.storageKey, val);
                } else {
                    val = el.value;
                    if (field.storageKey) localStorage.setItem(field.storageKey, val);
                }
                results[field.key] = val;
            });
            cleanup();
            callback(results);
        };

        const onCancel = () => {
            cleanup();
            callback(null);
        };

        const onKey = e => {
            if (e.key === 'Enter') onConfirm();
            if (e.key === 'Escape') onCancel();
        };

        function cleanup() {
            modal.classList.remove('active');
            btnConfirm.removeEventListener('click', onConfirm);
            btnCancel.removeEventListener('click', onCancel);
            const inputs = container.querySelectorAll('input');
            inputs.forEach(inp => { inp.removeEventListener('keydown', onKey); });
        }

        btnConfirm.addEventListener('click', onConfirm);
        btnCancel.addEventListener('click', onCancel);
        const inputs = container.querySelectorAll('input');
        inputs.forEach(inp => { inp.addEventListener('keydown', onKey); });
    }

    // ==========================================
    // Confirm Modal
    // ==========================================
    function showConfirmModal(title, text, callback) {
        const modal = document.getElementById('confirm_modal');
        const elTitle = document.getElementById('confirm_modal_title');
        const elText = document.getElementById('confirm_modal_text');
        const btnOk = document.getElementById('btn_confirm_ok');
        const btnCancel = document.getElementById('btn_confirm_cancel');

        if (!modal) return;

        elTitle.innerText = title;
        elText.innerText = text;
        modal.classList.add('active');

        const cleanup = () => {
            modal.classList.remove('active');
            btnOk.removeEventListener('click', onOk);
            btnCancel.removeEventListener('click', onCancel);
        };

        var onOk = () => {
            cleanup();
            callback(true);
        };

        var onCancel = () => {
            cleanup();
            callback(false);
        };

        btnOk.addEventListener('click', onOk);
        btnCancel.addEventListener('click', onCancel);
        btnOk.focus();
    }

    // ==========================================
    // Export to TATA Namespace
    // ==========================================
    TATA.showToast = showToast;
    TATA.showInputModal = showInputModal;
    TATA.showConfirmModal = showConfirmModal;

})();
