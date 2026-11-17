const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('ExtendScript JSON fallback (jsx/utils.jsx)', function () {
    function engineWithoutJson() {
        const context = vm.createContext({});
        vm.runInContext('delete this.JSON;', context);
        const source = fs.readFileSync(path.join(__dirname, '..', 'jsx', 'utils.jsx'), 'utf8');
        vm.runInContext(source, context);
        return context;
    }

    test('the fallback is what runs when the engine has no JSON', function () {
        const ctx = engineWithoutJson();
        expect(vm.runInContext('JSON.stringify.toString()', ctx)).not.toContain('[native code]');
    });

    test('names with quotes, backslashes and line breaks round-trip', function () {
        const ctx = engineWithoutJson();
        const value = { doc: 'Logo "v2"\\final\n.ai', tab: 'a\tb', ctl: '\u0001', list: [1, 'x', null, true] };
        ctx.value = value;
        const text = vm.runInContext('JSON.stringify(value)', ctx);
        expect(JSON.parse(text)).toEqual(value);
        expect(vm.runInContext('JSON.parse(JSON.stringify(value)).doc', ctx)).toBe(value.doc);
    });

    test('undefined and functions are skipped like native JSON', function () {
        const ctx = engineWithoutJson();
        const text = vm.runInContext('JSON.stringify({ a: 1, b: undefined, f: function () {}, arr: [undefined] })', ctx);
        expect(JSON.parse(text)).toEqual({ a: 1, arr: [null] });
    });

    test('no helper leaks into the ExtendScript global scope', function () {
        const ctx = engineWithoutJson();
        expect(vm.runInContext('typeof quote', ctx)).toBe('undefined');
    });
});
