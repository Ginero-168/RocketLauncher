const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('host script contract (jsx/hostscript.jsx)', function () {
    const root = path.join(__dirname, '..');
    let host;

    function read(name) {
        return fs.readFileSync(path.join(root, name), 'utf8');
    }

    beforeAll(function () {
        const context = vm.createContext({ alert: function () {} });
        vm.runInContext(read('jsx/utils.jsx'), context);
        vm.runInContext(read('jsx/hostscript.jsx').replace(/^#include.*$/m, ''), context);
        host = context.TATA;
    });

    test('every command the panel sends has a handler', function () {
        const called = new Set();
        fs.readdirSync(path.join(root, 'js')).filter(name => /\.js$/.test(name)).forEach(name => {
            const source = read('js/' + name);
            const pattern = /(?:host\.run|hostRun)\(\s*['"]([A-Za-z]+)['"]/g;
            let match;
            while ((match = pattern.exec(source))) called.add(match[1]);
        });
        expect(called.size).toBeGreaterThan(0);
        called.forEach(command => {
            expect([command, typeof host[command]]).toEqual([command, 'function']);
        });
    });

    // The AI prompt of 2.x told generated scripts to call these through
    // TATA.run, so scripts users saved back then still depend on them.
    test.each(['fitSelection', 'followWidth', 'embedAll', 'createPreview', 'generateColorPalette'])(
        'saved user scripts can still call %s', function (command) {
            expect(typeof host[command]).toBe('function');
        });

    test('the bundled Dimension dialog finds its host function', function () {
        expect(read('jsx/DimensionDialog.jsx')).toContain('dimensionMaster');
        expect(typeof host.dimensionMaster).toBe('function');
    });

    test('an unknown command answers with an error instead of throwing', function () {
        expect(host.run('noSuchCommand', '')).toBe("Error: Function 'noSuchCommand' not found.");
    });

    test('the router hands parsed parameters to the handler', function () {
        host.echoForTest = function (params) { return params.value; };
        expect(host.run('echoForTest', '{"value":"ok"}')).toBe('ok');
        delete host.echoForTest;
    });
});
