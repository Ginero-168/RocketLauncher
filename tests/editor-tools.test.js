describe('editor helpers (js/editor-tools.js)', function () {
    let tools;

    beforeEach(function () {
        window.loadPanelScript('js/editor-tools.js');
        tools = TATA.editorTools;
    });

    describe('toggleComment', function () {
        test('comments a block at its shallowest indent, leaving blank lines', function () {
            expect(tools.toggleComment(['\tif (a) {', '\t\tb();', '', '\t}'])).toEqual(['\t// if (a) {', '\t// \tb();', '', '\t// }']);
        });

        test('uncomments when every line is already commented', function () {
            expect(tools.toggleComment(['// a();', '  // b();', ''])).toEqual(['a();', '  b();', '']);
        });

        test('a mix of commented and plain lines is commented, not flipped line by line', function () {
            expect(tools.toggleComment(['// a();', 'b();'])).toEqual(['// // a();', '// b();']);
        });

        test('nothing but blank lines stays as it is', function () {
            expect(tools.toggleComment(['', '  '])).toEqual(['', '  ']);
        });
    });

    describe('checkSyntax (compiles only, never runs)', function () {
        const vm = require('vm');

        test('valid ExtendScript passes, #target and #include are allowed', function () {
            expect(tools.checkSyntax('#target illustrator\n#include "x.jsx"\nvar a = 1;\nalert(a);', vm)).toEqual({ ok: true });
        });

        test('an error reports its line', function () {
            const result = tools.checkSyntax('var a = 1;\n\nif (a {\n  alert(a);\n}', vm);
            expect(result.ok).toBe(false);
            expect(result.line).toBe(3);
            expect(result.message.length).toBeGreaterThan(0);
        });

        test('the code is not executed', function () {
            global.__ranByCheck = false;
            tools.checkSyntax('global.__ranByCheck = true;', vm);
            expect(global.__ranByCheck).toBe(false);
        });

        test('without Node it still finds the error, with no line', function () {
            const result = tools.checkSyntax('var = ;', null);
            expect(result.ok).toBe(false);
            expect(result.line).toBe(0);
        });
    });

    test('font size stays within limits', function () {
        expect(tools.clampFont('3')).toBe(10);
        expect(tools.clampFont(99)).toBe(22);
        expect(tools.clampFont(null)).toBe(13);
    });

    test('every snippet is valid script', function () {
        const vm = require('vm');
        tools.snippets.forEach(snippet => {
            expect(tools.checkSyntax(snippet.code, vm)).toEqual({ ok: true });
            expect(snippet.code).not.toMatch(/=>|\blet\b|\bconst\b/);
        });
    });
});
