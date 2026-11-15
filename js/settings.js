/**
 * Settings dialog: Replicate token, AI model, document-context sharing,
 * eyedropper mode, hotkey slot count, updates and factory reset.
 * The token is stored in localStorage on purpose so it survives panel restarts.
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    const MIN_SLOTS = 1;
    const MAX_SLOTS = 30;

    function byId(id) {
        return document.getElementById(id);
    }

    function toast(message, type) {
        if (typeof TATA.showToast === 'function') TATA.showToast(message, type);
    }

    function setStatus(el, text, state) {
        if (!el) return;
        el.textContent = text || '';
        if (state) el.setAttribute('data-state', state);
        else el.removeAttribute('data-state');
    }

    function storedModel() {
        const raw = TATA.getStored ? TATA.getStored('tata_ai_model') : localStorage.getItem('tata_ai_model');
        return TATA.resolveAiModel ? TATA.resolveAiModel(raw) : 'google/gemini-3-flash';
    }

    function fillForm() {
        const inpApiKey = byId('setting_api_key');
        if (inpApiKey) inpApiKey.value = localStorage.getItem('tata_replicate_api_token') || '';
        const picker = byId('setting_picker_mode');
        if (picker) picker.value = localStorage.getItem('tata_picker_mode') || 'os';
        const model = byId('setting_ai_model');
        if (model) model.value = storedModel();
        const count = byId('hotkey_count_display');
        if (count) count.textContent = localStorage.getItem('tata_hotkey_count') || '5';
        setStatus(byId('model_check_msg'), '');
        paintDataFolder();
        syncStepper();
        if (TATA.market && TATA.market.paintAccount) TATA.market.paintAccount();
    }

    function paintDataFolder() {
        const hint = byId('data_folder_hint');
        const button = byId('btn_show_data_folder');
        const persist = TATA.persist;
        const on = !!(persist && persist.available);
        if (hint) {
            hint.textContent = on
                ? 'Scripts, layout, hotkeys and colours are also saved outside the Illustrator cache, so clearing the cache does not remove them.'
                : 'A safe copy could not be created on this computer. Clearing the Illustrator cache will remove your panel data.';
            if (on) hint.title = persist.dir;
        }
        if (button) button.hidden = !on;
    }

    function syncStepper() {
        const display = byId('hotkey_count_display');
        if (!display) return;
        const value = parseInt(display.textContent, 10) || 5;
        const minus = document.querySelector('#stepper_hotkey_count .btn-minus');
        const plus = document.querySelector('#stepper_hotkey_count .btn-plus');
        if (minus) minus.disabled = value <= MIN_SLOTS;
        if (plus) plus.disabled = value >= MAX_SLOTS;
    }

    async function checkToken(button) {
        const inpApiKey = byId('setting_api_key');
        const msg = byId('model_check_msg');
        const loader = byId('model_check_loader');
        const key = inpApiKey ? inpApiKey.value.trim() : '';
        if (!key) {
            setStatus(msg, 'Enter a Replicate API token first.', 'error');
            if (inpApiKey) inpApiKey.focus();
            return;
        }
        button.disabled = true;
        if (loader) loader.hidden = false;
        setStatus(msg, 'Checking the token…');
        try {
            const res = await TATA.fetchWithTimeout('https://api.replicate.com/v1/account', {
                headers: { Authorization: `Bearer ${key}` }
            }, 15000);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setStatus(msg, `Token works for ${data.username || data.name || 'this account'}.`, 'ok');
        } catch (e) {
            setStatus(msg, `Token check failed: ${e.message}`, 'error');
        } finally {
            button.disabled = false;
            if (loader) loader.hidden = true;
        }
    }

    function saveSettings() {
        const inpApiKey = byId('setting_api_key');
        const key = inpApiKey ? inpApiKey.value.trim() : '';
        // Intentional: keep the Replicate token in localStorage across sessions.
        if (key) localStorage.setItem('tata_replicate_api_token', key);
        else localStorage.removeItem('tata_replicate_api_token');
        const keySection = byId('api_key_section');
        if (keySection) keySection.hidden = !!key;

        const picker = byId('setting_picker_mode');
        if (picker) localStorage.setItem('tata_picker_mode', picker.value);

        const model = byId('setting_ai_model');
        if (model) {
            if (TATA.setStored) TATA.setStored('tata_ai_model', model.value);
            else localStorage.setItem('tata_ai_model', model.value);
            const badge = byId('ai_model_name');
            if (badge) badge.textContent = model.value;
        }

        const count = byId('hotkey_count_display');
        if (count) localStorage.setItem('tata_hotkey_count', count.textContent);
        if (typeof TATA.initHotkeys === 'function') TATA.initHotkeys();
        toast('Settings saved', 'success');
    }

    function bindSettings() {
        const settingsModal = byId('settings_modal');
        const btnSettings = byId('btn_settings');
        const inpApiKey = byId('setting_api_key');
        if (!settingsModal || !inpApiKey || settingsModal.dataset.bound === '1') return;
        settingsModal.dataset.bound = '1';

        let close = null;
        const closeDialog = () => {
            if (close) close();
            else settingsModal.classList.remove('active');
            close = null;
        };

        if (btnSettings) {
            btnSettings.addEventListener('click', () => {
                fillForm();
                if (typeof TATA.openDialog === 'function') {
                    close = TATA.openDialog(settingsModal, { onCancel: closeDialog, focus: inpApiKey });
                } else {
                    settingsModal.classList.add('active');
                }
            });
        }

        const resetShare = byId('btn_reset_workspace_share');
        if (resetShare) {
            resetShare.addEventListener('click', () => {
                localStorage.removeItem('tata_share_workspace_context');
                toast('Document context sharing is off');
            });
        }

        const btnData = byId('btn_show_data_folder');
        if (btnData) {
            btnData.addEventListener('click', () => {
                if (!TATA.persist || !TATA.persist.reveal()) toast('Could not open the data folder', 'error');
            });
        }

        const btnCheck = byId('btn_check_models');
        if (btnCheck) btnCheck.addEventListener('click', () => checkToken(btnCheck));

        const display = byId('hotkey_count_display');
        const btnMinus = document.querySelector('#stepper_hotkey_count .btn-minus');
        const btnPlus = document.querySelector('#stepper_hotkey_count .btn-plus');
        if (display && btnMinus && btnPlus) {
            btnMinus.addEventListener('click', () => {
                const value = parseInt(display.textContent, 10);
                if (value > MIN_SLOTS) display.textContent = value - 1;
                syncStepper();
            });
            btnPlus.addEventListener('click', () => {
                const value = parseInt(display.textContent, 10);
                if (value < MAX_SLOTS) display.textContent = value + 1;
                syncStepper();
            });
        }

        const btnFactoryReset = byId('btn_factory_reset');
        if (btnFactoryReset && typeof TATA.askConfirm === 'function') {
            btnFactoryReset.addEventListener('click', () => {
                TATA.askConfirm({
                    title: 'Factory reset',
                    message: 'Delete all custom scripts and buttons and clear every setting? This cannot be undone.',
                    confirmLabel: 'Reset',
                    danger: true
                }).then(ok => {
                    if (!ok) return;
                    // Without this the durable copy would restore everything.
                    if (TATA.persist && TATA.persist.reset) TATA.persist.reset();
                    localStorage.clear();
                    location.reload();
                });
            });
        }

        const btnSave = byId('btn_save_settings');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                saveSettings();
                closeDialog();
            });
        }

        const btnCancel = byId('btn_cancel_settings');
        if (btnCancel) btnCancel.addEventListener('click', closeDialog);
    }

    TATA.bindSettings = bindSettings;
})();
