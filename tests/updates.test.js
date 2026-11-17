const fs = require('fs');
const os = require('os');
const path = require('path');

const FIXTURE = `
    <span id="current_version"></span>
    <button id="btn_check_update">Check for updates</button>
    <p id="update_status"></p>
    <div id="update_available" hidden>
        <span id="new_version"></span>
        <a id="download_link">Download ZXP</a>
        <p id="update_notes"></p>
        <p id="update_checksum"></p>
    </div>`;

const WRITES = ['writeFileSync', 'writeFile', 'appendFileSync', 'appendFile', 'renameSync', 'rename',
    'unlinkSync', 'unlink', 'rmSync', 'rm', 'mkdirSync', 'mkdir', 'copyFileSync', 'createWriteStream'];

function asset(name) {
    return { name: name, browser_download_url: `https://github.com/dl/${name}` };
}

function release(tag, extraAssets) {
    const v = tag.replace(/^v/, '');
    return {
        tag_name: tag,
        body: 'Fixes',
        assets: [
            asset(`RocketLauncher-v${v}-macos.zxp`),
            asset(`RocketLauncher-v${v}-macos.sha256`),
            asset(`RocketLauncher-v${v}-windows.zxp`)
        ].concat(extraAssets || [])
    };
}

describe('update check (js/updates.js)', function () {
    let extDir;
    let guardedFs;

    function boot(response) {
        document.body.innerHTML = FIXTURE;
        TATA.getExtensionPath = () => extDir;
        TATA.showToast = jest.fn();
        TATA.fetchWithTimeout = jest.fn(() => (response instanceof Error
            ? Promise.reject(response)
            : Promise.resolve(response)));
        window.loadPanelScript('js/updates.js');
        TATA.bindUpdates();
    }

    function ok(body) {
        return { ok: true, status: 200, json: () => Promise.resolve(body) };
    }

    async function check() {
        await TATA.checkForUpdates();
    }

    beforeEach(function () {
        extDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-ext-'));
        fs.mkdirSync(path.join(extDir, 'CSXS'));
        fs.writeFileSync(path.join(extDir, 'CSXS', 'manifest.xml'),
            '<ExtensionManifest ExtensionBundleVersion="3.1.0"></ExtensionManifest>');
        guardedFs = Object.assign({}, fs);
        WRITES.forEach(name => { guardedFs[name] = jest.fn(); });
        window.require = name => (name === 'fs' ? guardedFs : require(name));
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(function () {
        jest.restoreAllMocks();
        fs.rmSync(extDir, { recursive: true, force: true });
        WRITES.forEach(name => expect(guardedFs[name]).not.toHaveBeenCalled());
    });

    test('the installed version comes from the extension manifest', function () {
        boot(ok(release('v3.1.0')));
        expect(document.getElementById('current_version').textContent).toBe('v3.1.0');
    });

    test('a newer release offers the macOS ZXP and its checksum on a Mac', async function () {
        jest.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
        boot(ok(release('v3.2.0')));
        await check();

        expect(TATA.fetchWithTimeout.mock.calls[0][0]).toBe('https://api.github.com/repos/Ginero-168/RocketLauncher/releases/latest');
        expect(document.getElementById('update_available').hidden).toBe(false);
        expect(document.getElementById('new_version').textContent).toBe('v3.2.0');
        expect(document.getElementById('download_link').getAttribute('href'))
            .toBe('https://github.com/dl/RocketLauncher-v3.2.0-macos.zxp');
        expect(document.querySelector('#update_checksum a').getAttribute('href'))
            .toBe('https://github.com/dl/RocketLauncher-v3.2.0-macos.sha256');
        expect(document.getElementById('update_status').textContent).toBe('Update available: v3.2.0');
    });

    test('Windows gets the Windows ZXP and is told when the checksum is missing', async function () {
        jest.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
        boot(ok(release('v3.2.0')));
        await check();

        expect(document.getElementById('download_link').getAttribute('href'))
            .toBe('https://github.com/dl/RocketLauncher-v3.2.0-windows.zxp');
        expect(document.getElementById('update_checksum').textContent)
            .toBe('Checksum file is not available for this release.');
    });

    test.each([['v3.1.0'], ['v3.0.9'], ['v3.1.0-beta.2']])('release %s is not offered over 3.1.0', async function (tag) {
        boot(ok(release(tag)));
        await check();

        expect(document.getElementById('update_available').hidden).toBe(true);
        expect(document.getElementById('download_link').hasAttribute('href')).toBe(false);
        expect(document.getElementById('update_status').textContent).toBe('You have the latest version (v3.1.0).');
    });

    test('an HTTP error leaves no download link and re-enables the button', async function () {
        boot({ ok: false, status: 503, json: () => Promise.resolve({}) });
        await check();

        expect(document.getElementById('update_status').textContent).toBe('Update check failed: GitHub returned HTTP 503');
        expect(document.getElementById('update_available').hidden).toBe(true);
        expect(document.getElementById('btn_check_update').disabled).toBe(false);
        expect(TATA.showToast).toHaveBeenCalledWith('Could not check for updates', 'error');
    });

    test.each([
        ['malformed JSON', { ok: true, status: 200, json: () => Promise.reject(new SyntaxError('Unexpected token <')) }],
        ['a release with no ZXP', ok({ tag_name: 'v9.0.0', assets: [] })],
        ['a body with no tag', ok(null)],
        ['an oversized body', new Error('Response exceeds 2097152 bytes')]
    ])('%s fails cleanly', async function (label, response) {
        boot(response);
        document.getElementById('download_link').href = 'https://stale.example/old.zxp';
        await check();

        expect(document.getElementById('update_status').textContent).toMatch(/^Update check failed: /);
        expect(document.getElementById('update_available').hidden).toBe(true);
        expect(document.getElementById('download_link').hasAttribute('href')).toBe(false);
        expect(document.getElementById('btn_check_update').textContent).toBe('Check for updates');
    });

    test('semver order puts pre-releases before the release and compares numbers numerically', function () {
        boot(ok(release('v3.1.0')));
        const cmp = TATA.compareVersions;
        expect(cmp('3.10.0', '3.9.0')).toBe(1);
        expect(cmp('3.2.0-beta.1', '3.2.0')).toBe(-1);
        expect(cmp('3.2.0-beta.2', '3.2.0-beta.10')).toBe(-1);
        expect(cmp('3.2.0', '3.2.0+build.5')).toBe(0);
        expect(cmp('garbage', '0.0.1')).toBe(-1);
    });
});
