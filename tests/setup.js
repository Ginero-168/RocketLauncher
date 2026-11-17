const fs = require('fs');
const os = require('os');
const path = require('path');

// js/persist.js starts on load against os.homedir(). Without this the tests
// would restore, and write to, the developer's real panel data.
const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-home-'));
jest.spyOn(os, 'homedir').mockReturnValue(fakeHome);
process.env.APPDATA = path.join(fakeHome, 'AppData', 'Roaming');
afterAll(function () {
    fs.rmSync(fakeHome, { recursive: true, force: true });
});

window.loadPanelScript = function (relativePath) {
    const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    window.eval(source);
};

beforeEach(function () {
    localStorage.clear();
    document.body.innerHTML = '';
    window.TATA = {};
    global.TATA = window.TATA;
});
