/**
 * Color Tools module tests
 */

const fs = require('fs');
const path = require('path');

function setupWindow() {
    const evalCodeMock = jest.fn();
    const evalFileMock = jest.fn();
    const runMock = jest.fn();

    global.window.TATA = {
        showToast: jest.fn(),
        getCSInterface: jest.fn(() => ({ evalScript: jest.fn() })),
        getExtensionPath: jest.fn(() => '/tmp/ext'),
        host: {
            evalCode: evalCodeMock,
            evalFile: evalFileMock,
            run: runMock,
        },
    };

    if (!global.window.localStorage) {
        global.window.localStorage = {
            getItem: jest.fn(() => null),
            setItem: jest.fn(),
            removeItem: jest.fn(),
        };
    } else {
        global.window.localStorage.getItem = jest.fn(() => null);
        global.window.localStorage.setItem = jest.fn();
        global.window.localStorage.removeItem = jest.fn();
    }

    if (!global.window.cep) {
        global.window.cep = { fs: { showSaveDialogEx: jest.fn(), showOpenDialogEx: jest.fn() } };
    }
    global.window.EyeDropper = undefined;
    return { evalCodeMock, evalFileMock, runMock };
}

function loadColorTools() {
    const source = fs.readFileSync(path.join(__dirname, '../js/color-tools.js'), 'utf8');
    eval(source);
}

describe('js/color-tools.js module', () => {
    beforeEach(() => {
        setupWindow();
        loadColorTools();
    });

    test('exposes TATA.colorTools namespace', () => {
        expect(window.TATA.colorTools).toBeDefined();
        expect(typeof window.TATA.colorTools.init).toBe('function');
        expect(typeof window.TATA.colorTools.setupCreative).toBe('function');
        expect(typeof window.TATA.colorTools.exportPalette).toBe('function');
        expect(typeof window.TATA.colorTools.placePalette).toBe('function');
        expect(typeof window.TATA.colorTools.openGlobalColorPicker).toBe('function');
        expect(typeof window.TATA.colorTools.swapContrastColors).toBe('function');
    });

    test('exportPalette executes a swatch creation script via host.evalCode', () => {
        const { evalCodeMock } = setupWindow();
        loadColorTools();
        window.exportPalette('Test', ['#FF0000', '#00FF00']);

        expect(evalCodeMock).toHaveBeenCalledTimes(1);
        const script = evalCodeMock.mock.calls[0][0];
        expect(script).toContain('var grp = doc.swatchGroups.add();');
        expect(script).toContain("'Test Theme'");
        expect(script).toContain('#FF0000');
        expect(script).toContain('#00FF00');
    });

    test('placePalette executes a place script via host.evalCode', () => {
        const { evalCodeMock } = setupWindow();
        loadColorTools();
        window.placePalette(['#FF0000', '#00FF00']);

        expect(evalCodeMock).toHaveBeenCalledTimes(1);
        const script = evalCodeMock.mock.calls[0][0];
        expect(script).toContain('app.activeDocument');
        expect(script).toContain('#FF0000');
    });
});
