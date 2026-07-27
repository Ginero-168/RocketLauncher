/**
 * Host Execution Gateway tests
 */

const fs = require('fs');
const path = require('path');

function setupTATA() {
    global.window.TATA = {
        state: {},
        getCSInterface: jest.fn(function () {
            return global.window.TATA.state.csInterface;
        }),
        setCSInterface: jest.fn(function (cs) {
            global.window.TATA.state.csInterface = cs;
        }),
    };
}

describe('js/host.js gateway', () => {
    beforeEach(() => {
        setupTATA();
        // load host.js as a plain script (it uses IIFE and window.TATA)
        const hostSource = fs.readFileSync(path.join(__dirname, '../js/host.js'), 'utf8');
        eval(hostSource);
    });

    test('TATA.host is defined with evalFile, run, and evalCode', () => {
        expect(window.TATA.host).toBeDefined();
        expect(typeof window.TATA.host.evalFile).toBe('function');
        expect(typeof window.TATA.host.run).toBe('function');
        expect(typeof window.TATA.host.evalCode).toBe('function');
    });

    test('host.run builds a TATA.run script string', () => {
        const evalScriptMock = jest.fn();
        const cs = { evalScript: evalScriptMock };
        window.TATA.setCSInterface(cs);

        const cb = jest.fn();
        window.TATA.host.run('placeSvg', { path: '/tmp/test.svg' }, cb);

        expect(evalScriptMock).toHaveBeenCalledTimes(1);
        const script = evalScriptMock.mock.calls[0][0];
        expect(script).toContain('TATA.run("placeSvg"');
        expect(script).toContain('"{\\"path\\":\\"/tmp/test.svg\\"}"');
        expect(evalScriptMock.mock.calls[0][1]).toBe(cb);
    });

    test('host.run without params omits argument', () => {
        const evalScriptMock = jest.fn();
        window.TATA.setCSInterface({ evalScript: evalScriptMock });
        window.TATA.host.run('scanDoc', undefined, jest.fn());

        const script = evalScriptMock.mock.calls[0][0];
        expect(script).toBe('try { TATA.run("scanDoc"); } catch(e) { "Error: " + e.message; }');
    });

    test('host.run with (command, callback) omits argument', () => {
        const evalScriptMock = jest.fn();
        window.TATA.setCSInterface({ evalScript: evalScriptMock });
        const cb = jest.fn();
        window.TATA.host.run('scanDoc', cb);

        const script = evalScriptMock.mock.calls[0][0];
        expect(script).toBe('try { TATA.run("scanDoc"); } catch(e) { "Error: " + e.message; }');
        expect(evalScriptMock.mock.calls[0][1]).toBe(cb);
    });

    test('host.run escapes quotes and backslashes in params', () => {
        const evalScriptMock = jest.fn();
        window.TATA.setCSInterface({ evalScript: evalScriptMock });
        window.TATA.host.run('placeSvg', { path: "C:\\temp\\Bob's.svg" }, jest.fn());

        const script = evalScriptMock.mock.calls[0][0];
        expect(script).toContain('\\"path\\":\\"C:\\\\\\\\temp\\\\\\\\Bob\'s.svg\\"');
    });

    test('host.evalFile builds $.evalFile script and passes params', () => {
        const evalScriptMock = jest.fn();
        window.TATA.setCSInterface({ evalScript: evalScriptMock });
        const cb = jest.fn();
        window.TATA.host.evalFile('/tmp/script.jsx', { size: 50 }, cb);

        expect(evalScriptMock).toHaveBeenCalledTimes(1);
        const script = evalScriptMock.mock.calls[0][0];
        expect(script).toContain('var params = {"size":50}');
        expect(script).toContain('$.evalFile("/tmp/script.jsx")');
        expect(script).toContain('try {');
        expect(evalScriptMock.mock.calls[0][1]).toBe(cb);
    });

    test('host.evalFile supports (filePath, callback) without params', () => {
        const evalScriptMock = jest.fn();
        window.TATA.setCSInterface({ evalScript: evalScriptMock });
        const cb = jest.fn();
        window.TATA.host.evalFile('/tmp/script.jsx', cb);

        const script = evalScriptMock.mock.calls[0][0];
        expect(script).not.toContain('var params');
        expect(script).toContain('$.evalFile("/tmp/script.jsx")');
        expect(evalScriptMock.mock.calls[0][1]).toBe(cb);
    });

    test('host.evalFile escapes file paths with quotes and backslashes', () => {
        const evalScriptMock = jest.fn();
        window.TATA.setCSInterface({ evalScript: evalScriptMock });
        window.TATA.host.evalFile("C:\\temp\\Bob's.jsx", jest.fn());

        const script = evalScriptMock.mock.calls[0][0];
        expect(script).toContain('$.evalFile("C:\\\\temp\\\\Bob\'s.jsx")');
        expect(script).not.toContain('var params');
    });

    test('host.evalCode forwards script to csInterface', () => {
        const evalScriptMock = jest.fn();
        window.TATA.setCSInterface({ evalScript: evalScriptMock });
        const cb = jest.fn();
        window.TATA.host.evalCode('1+1', cb);

        expect(evalScriptMock).toHaveBeenCalledWith('1+1', cb);
    });

    test('host methods call callback with error when csInterface missing', () => {
        const cb = jest.fn();
        window.TATA.setCSInterface(null);
        window.TATA.host.run('x', undefined, cb);
        expect(cb).toHaveBeenCalledWith('ERR: csInterface not available');
    });
});
