/**
 * TATA V3 - Modals Module
 * Contains: showInputModal, showConfirmModal
 */
(function (global) {
    'use strict';

    /**
     * Generic Input Modal Helper (Multi-Field)
     * @param {string} title - Modal title
     * @param {Array} fields - Array of field objects {key, label, type, default, storageKey}
     * @param {function} callback - Callback with results object or null if cancelled
     */
    function showInputModal(title, fields, callback) {
        var modal = document.getElementById('input_modal');
        var elTitle = document.getElementById('input_modal_title');
        var container = document.getElementById('input_container');
        var btnConfirm = document.getElementById('btn_confirm_input');
        var btnCancel = document.getElementById('btn_cancel_input');

        if (!modal || !container) return;

        elTitle.innerText = title;
        container.innerHTML = '';

        fields.forEach(function (field) {
            var wrapper = document.createElement('div');
            wrapper.className = 'control-group';
            wrapper.style.marginBottom = '10px';

            if (field.type === 'checkbox') {
                var input = document.createElement('input');
                input.type = 'checkbox';
                input.id = 'input_field_' + field.key;
                input.style.width = 'auto';
                input.style.marginRight = '8px';

                var isChecked = field.default === true;
                if (field.storageKey) {
                    var saved = localStorage.getItem(field.storageKey);
                    if (saved !== null) isChecked = (saved === 'true');
                }
                input.checked = isChecked;

                var chkLabel = document.createElement('label');
                chkLabel.appendChild(input);
                chkLabel.appendChild(document.createTextNode(field.label));
                chkLabel.style.display = 'flex';
                chkLabel.style.alignItems = 'center';
                chkLabel.style.cursor = 'pointer';

                wrapper.appendChild(chkLabel);
            } else {
                var label = document.createElement('label');
                label.innerText = field.label;
                label.style.display = 'block';
                label.style.marginBottom = '5px';

                var input = document.createElement('input');
                input.type = 'text';
                input.id = 'input_field_' + field.key;
                input.style.width = '100%';
                input.style.boxSizing = 'border-box';

                var val = field.default || "";
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

        var firstTextInput = container.querySelector('input[type=text]');
        if (firstTextInput) {
            firstTextInput.focus();
            firstTextInput.select();
        }

        var onConfirm = function () {
            var results = {};
            fields.forEach(function (field) {
                var el = document.getElementById('input_field_' + field.key);
                var val;
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

        var onCancel = function () {
            cleanup();
            callback(null);
        };

        var onKey = function (e) {
            if (e.key === 'Enter') onConfirm();
            if (e.key === 'Escape') onCancel();
        };

        function cleanup() {
            modal.classList.remove('active');
            btnConfirm.removeEventListener('click', onConfirm);
            btnCancel.removeEventListener('click', onCancel);
            var inputs = container.querySelectorAll('input');
            inputs.forEach(function (inp) { inp.removeEventListener('keydown', onKey); });
        }

        btnConfirm.addEventListener('click', onConfirm);
        btnCancel.addEventListener('click', onCancel);
        var inputs = container.querySelectorAll('input');
        inputs.forEach(function (inp) { inp.addEventListener('keydown', onKey); });
    }

    /**
     * Confirm Modal (Yes/No Dialog)
     */
    function showConfirmModal(title, text, callback) {
        var modal = document.getElementById('confirm_modal');
        var elTitle = document.getElementById('confirm_modal_title');
        var elText = document.getElementById('confirm_modal_text');
        var btnOk = document.getElementById('btn_confirm_ok');
        var btnCancel = document.getElementById('btn_confirm_cancel');

        if (!modal) return;

        elTitle.innerText = title;
        elText.innerText = text;
        modal.classList.add('active');

        var cleanup = function () {
            modal.classList.remove('active');
            btnOk.removeEventListener('click', onOk);
            btnCancel.removeEventListener('click', onCancel);
        };

        var onOk = function () {
            cleanup();
            callback(true);
        };

        var onCancel = function () {
            cleanup();
            callback(false);
        };

        btnOk.addEventListener('click', onOk);
        btnCancel.addEventListener('click', onCancel);
        btnOk.focus();
    }

    // Export to global TATA namespace
    global.TATA = global.TATA || {};
    global.TATA.showInputModal = showInputModal;
    global.TATA.showConfirmModal = showConfirmModal;

})(window);
