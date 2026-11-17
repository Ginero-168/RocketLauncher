const fs = require('fs');
const os = require('os');
const path = require('path');

const FIXTURE = `
    <button id="btn_settings">Settings</button>
    <div id="settings_modal">
        <input id="setting_api_key">
        <div id="api_key_section"></div>
        <select id="setting_picker_mode"><option value="os">os</option><option value="panel">panel</option></select>
        <select id="setting_ai_model"><option value="google/gemini-3-flash">g</option><option value="other/model">o</option></select>
        <span id="ai_model_name"></span>
        <div id="stepper_hotkey_count">
            <button class="btn-minus">-</button><span id="hotkey_count_display">5</span><button class="btn-plus">+</button>
        </div>
        <button id="btn_check_models">Check</button>
        <span id="model_check_loader" hidden></span>
        <p id="model_check_msg"></p>
        <p id="data_folder_hint"></p>
        <button id="btn_show_data_folder"></button>
        <button id="btn_factory_reset">Reset</button>
        <button id="btn_save_settings">Save</button>
        <button id="btn_cancel_settings">Cancel</button>
    </div>`;

function boot(extra) {
    document.body.innerHTML = FIXTURE;
    Object.assign(TATA, { showToast: jest.fn() }, extra || {});
    window.loadPanelScript('js/settings.js');
    TATA.bindSettings();
}

function click(id) {
    document.getElementById(id).click();
}

function flushPromises() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

describe('settings dialog (js/settings.js)', function () {
    test('saving keeps the trimmed Replicate token and hides the token prompt', function () {
        boot();
        click('btn_settings');
        document.getElementById('setting_api_key').value = '  r8_abc  ';
        click('btn_save_settings');

        expect(localStorage.getItem('tata_replicate_api_token')).toBe('r8_abc');
        expect(document.getElementById('api_key_section').hidden).toBe(true);
        expect(TATA.showToast).toHaveBeenCalledWith('Settings saved', 'success');
    });

    test('saving an empty token removes the stored one', function () {
        localStorage.setItem('tata_replicate_api_token', 'r8_old');
        boot();
        click('btn_settings');
        expect(document.getElementById('setting_api_key').value).toBe('r8_old');
        document.getElementById('setting_api_key').value = '   ';
        click('btn_save_settings');

        expect(localStorage.getItem('tata_replicate_api_token')).toBeNull();
        expect(document.getElementById('api_key_section').hidden).toBe(false);
    });

    test('cancel leaves the stored token alone', function () {
        localStorage.setItem('tata_replicate_api_token', 'r8_old');
        boot();
        click('btn_settings');
        document.getElementById('setting_api_key').value = 'r8_new';
        click('btn_cancel_settings');
        expect(localStorage.getItem('tata_replicate_api_token')).toBe('r8_old');
    });

    test('the token never reaches the durable copy on disk, other settings do', function () {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-settings-'));
        try {
            window.require = require;
            window.loadPanelScript('js/persist.js');
            TATA.persist._start(dir);
            boot({ persist: TATA.persist });

            click('btn_settings');
            document.getElementById('setting_api_key').value = 'r8_secret';
            document.getElementById('setting_picker_mode').value = 'panel';
            click('btn_save_settings');
            TATA.persist.flush();

            const written = fs.readdirSync(dir).map(name => fs.readFileSync(path.join(dir, name), 'utf8'));
            expect(fs.existsSync(path.join(dir, 'tata_picker_mode.json'))).toBe(true);
            expect(fs.existsSync(path.join(dir, 'tata_replicate_api_token.json'))).toBe(false);
            expect(written.join('\n')).not.toContain('r8_secret');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('a confirmed factory reset sets the disk copy aside before clearing storage', async function () {
        localStorage.setItem('tata_v2_layout', '{"tab_button":[]}');
        localStorage.setItem('tata_hotkeys', '[]');
        const order = [];
        const persist = {
            available: true,
            dir: '/tmp/x',
            reset: jest.fn(() => order.push(['reset', localStorage.length]))
        };
        boot({ persist: persist, askConfirm: jest.fn(() => Promise.resolve(true)) });
        const jsdomNoise = jest.spyOn(console, 'error').mockImplementation(() => {});

        click('btn_factory_reset');
        await flushPromises();
        const reloaded = jsdomNoise.mock.calls.some(args => /navigation/.test(String(args[0] && args[0].message)));
        jsdomNoise.mockRestore();

        expect(TATA.askConfirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
        expect(persist.reset).toHaveBeenCalledTimes(1);
        expect(order[0][1]).toBeGreaterThan(0);
        expect(localStorage.length).toBe(0);
        expect(reloaded).toBe(true);
    });

    test('a declined factory reset keeps everything', async function () {
        localStorage.setItem('tata_v2_layout', '{"tab_button":[]}');
        const persist = { available: true, dir: '/tmp/x', reset: jest.fn() };
        boot({ persist: persist, askConfirm: jest.fn(() => Promise.resolve(false)) });

        click('btn_factory_reset');
        await flushPromises();

        expect(persist.reset).not.toHaveBeenCalled();
        expect(localStorage.getItem('tata_v2_layout')).toBe('{"tab_button":[]}');
    });

    test('checking the token reports the account, and an empty field never calls the network', async function () {
        const fetchWithTimeout = jest.fn(() => Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ username: 'pat' })
        }));
        boot({ fetchWithTimeout: fetchWithTimeout });
        const msg = document.getElementById('model_check_msg');

        click('btn_check_models');
        await flushPromises();
        expect(fetchWithTimeout).not.toHaveBeenCalled();
        expect(msg.getAttribute('data-state')).toBe('error');

        document.getElementById('setting_api_key').value = 'r8_abc';
        click('btn_check_models');
        await flushPromises();
        expect(fetchWithTimeout.mock.calls[0][1].headers.Authorization).toBe('Bearer r8_abc');
        expect(msg.textContent).toBe('Token works for pat.');
        expect(document.getElementById('btn_check_models').disabled).toBe(false);
    });

    test('a rejected token says so', async function () {
        boot({ fetchWithTimeout: jest.fn(() => Promise.resolve({ ok: false, status: 401 })) });
        document.getElementById('setting_api_key').value = 'r8_bad';
        click('btn_check_models');
        await flushPromises();
        expect(document.getElementById('model_check_msg').textContent).toBe('Token check failed: HTTP 401');
    });

    test('the hotkey slot stepper stays between 1 and 30', function () {
        localStorage.setItem('tata_hotkey_count', '29');
        boot({ initHotkeys: jest.fn() });
        click('btn_settings');
        const plus = document.querySelector('#stepper_hotkey_count .btn-plus');
        const minus = document.querySelector('#stepper_hotkey_count .btn-minus');
        plus.click();
        plus.click();
        expect(document.getElementById('hotkey_count_display').textContent).toBe('30');
        expect(plus.disabled).toBe(true);

        document.getElementById('hotkey_count_display').textContent = '2';
        minus.click();
        minus.click();
        expect(document.getElementById('hotkey_count_display').textContent).toBe('1');
        expect(minus.disabled).toBe(true);

        click('btn_save_settings');
        expect(localStorage.getItem('tata_hotkey_count')).toBe('1');
        expect(TATA.initHotkeys).toHaveBeenCalled();
    });
});
