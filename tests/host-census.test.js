const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('document census on the host side (jsx/hostscript.jsx)', function () {
    let host, doc, reads;

    function counted(target) {
        return new Proxy(target, {
            get(object, property) {
                if (typeof property !== 'symbol') reads++;
                return object[property];
            }
        });
    }

    function rgb(red, green, blue) {
        return { typename: 'RGBColor', red: red, green: green, blue: blue };
    }

    const DOCUMENT = { typename: 'Document' };

    function line(width, color) {
        return {
            typename: 'PathItem', stroked: true, filled: false, strokeColor: color || rgb(0, 186, 226), strokeWidth: width,
            guides: false, clipping: false, locked: false, hidden: false, selected: false, parent: DOCUMENT
        };
    }

    function label(text, size) {
        return {
            typename: 'TextFrame', contents: text, locked: false, hidden: false, selected: false, parent: DOCUMENT,
            textRange: { characterAttributes: { fillColor: rgb(0, 0, 0), textFont: { family: 'Arial', style: 'Regular' }, size: size } }
        };
    }

    function group(paths, texts) {
        return { typename: 'GroupItem', pathItems: paths || [], textFrames: texts || [], locked: false, hidden: false, parent: DOCUMENT };
    }

    function compound(paths) {
        return { typename: 'CompoundPathItem', pathItems: paths, locked: false, hidden: false, parent: DOCUMENT };
    }

    function open(paths, texts, selection) {
        doc = {
            name: 'Untitled-1', pathItems: paths, textFrames: texts || [], pageItems: paths.concat(texts || []),
            selection: selection || null
        };
        const context = vm.createContext({ alert: function () {}, app: { documents: [doc], activeDocument: doc } });
        const read = name => fs.readFileSync(path.join(__dirname, '..', 'jsx', name), 'utf8');
        vm.runInContext(read('utils.jsx'), context);
        vm.runInContext(read('hostscript.jsx').replace(/^#include.*$/m, ''), context);
        host = context.TATA;
    }

    function call(command, params) {
        return JSON.parse(host.run(command, JSON.stringify(params)));
    }

    beforeEach(function () {
        reads = 0;
        open([line(1), line(1), line(2)]);
    });

    describe('whole document', function () {
        test('a scan reports each painted object with what it is grouped by', function () {
            const report = call('censusScan', { scope: 'document' });
            expect(report.scope).toBe('document');
            expect(report.items.map(item => [item.i, item.sc, item.sw])).toEqual([[0, '#00BAE2', 1], [1, '#00BAE2', 1], [2, '#00BAE2', 2]]);
        });

        test('its size is every path and text frame', function () {
            open([line(1), line(1)], [label('a', 12)]);
            expect(call('censusSize', { scope: 'document', limit: 3000 })).toEqual({ n: 3, over: false });
            expect(call('censusSize', { scope: 'document', limit: 2 })).toEqual({ n: 3, over: true });
        });

        test('a scan reads about 28 properties per object, so a new read has to be a decision', function () {
            const many = [];
            for (let i = 0; i < 500; i++) many.push(counted(line(1 + (i % 3))));
            open(many);
            reads = 0;
            call('censusScan', { scope: 'document' });
            expect(reads / 500).toBeLessThanOrEqual(28);
        });
    });

    describe('selection', function () {
        test('only what is selected is reported, groups and compound paths opened', function () {
            const selected = [
                line(1),
                group([line(2), line(2)], [label('in group', 12)]),
                compound([line(3)])
            ];
            open([line(9), line(9)], [], selected);
            const report = call('censusScan', { scope: 'selection' });
            expect(report.scope).toBe('selection');
            expect(report.items.map(item => item.k + ':' + (item.sw || item.size))).toEqual(['path:1', 'path:2', 'path:2', 'text:12', 'path:3']);
        });

        test('nothing selected, or text being edited, answers noselection', function () {
            expect(call('censusScan', { scope: 'selection' })).toEqual({ error: 'noselection' });
            open([line(1)], [], { typename: 'TextRange', length: 4 });
            expect(call('censusScan', { scope: 'selection' })).toEqual({ error: 'noselection' });
            open([line(1)], [], [{ typename: 'RasterItem' }]);
            expect(call('censusScan', { scope: 'selection' })).toEqual({ error: 'noselection' });
        });

        test('its size stops counting just past the limit instead of walking all of a huge selection', function () {
            const huge = [];
            for (let i = 0; i < 10000; i++) huge.push(counted(line(1)));
            open([], [], huge);
            reads = 0;
            expect(call('censusSize', { scope: 'selection', limit: 3000 })).toEqual({ n: 3001, over: true });
            expect(reads).toBeLessThanOrEqual(3001);
        });

        test('a selection larger than the cap is cut and says so', function () {
            const many = [];
            for (let i = 0; i < 30; i++) many.push(line(1));
            open([], [], many);
            const report = call('censusScan', { scope: 'selection', max: 10 });
            expect(report.items).toHaveLength(10);
            expect(report.truncated).toBe(true);
        });

        test('selecting a group selects exactly those objects', function () {
            const a = line(1), b = line(1), c = line(2);
            open([], [], [a, b, c]);
            call('censusScan', { scope: 'selection' });
            expect(call('censusSelect', { ids: [0, 1] })).toEqual({ selected: 2, missed: 0 });
            expect([a, b, c].map(item => item.selected)).toEqual([true, true, false]);
        });
    });

    describe('staleness', function () {
        test('an object restyled after the scan makes select and fix answer stale, and nothing is changed', function () {
            call('censusScan', { scope: 'document' });
            doc.pathItems[1].strokeWidth = 5;

            expect(call('censusSelect', { ids: [0, 1] })).toEqual({ error: 'stale' });
            expect(call('censusFix', { ids: [0, 1], kind: 'stroke', value: 2 })).toEqual({ error: 'stale' });
            expect(doc.pathItems.map(item => item.strokeWidth)).toEqual([1, 5, 2]);
            expect(doc.pathItems.some(item => item.selected)).toBe(false);
        });

        test('a restyled object outside the requested group does not block it', function () {
            call('censusScan', { scope: 'document' });
            doc.pathItems[2].strokeWidth = 9;
            expect(call('censusFix', { ids: [0, 1], kind: 'stroke', value: 2 })).toEqual({ changed: 2 });
            expect(doc.pathItems.map(item => item.strokeWidth)).toEqual([2, 2, 9]);
        });

        test('an unstroked object with a fill is not mistaken for restyled', function () {
            const fillOnly = { typename: 'PathItem', stroked: false, filled: true, fillColor: rgb(255, 0, 0), strokeWidth: 1, guides: false, clipping: false, locked: false, hidden: false, selected: false, parent: DOCUMENT };
            open([fillOnly]);
            call('censusScan', { scope: 'document' });
            expect(call('censusSelect', { ids: [0] })).toEqual({ selected: 1, missed: 0 });
        });

        test('only the fields that define the group are re-read', function () {
            call('censusScan', { scope: 'document' });
            doc.pathItems[0].strokeColor = rgb(255, 0, 0);

            expect(call('censusSelect', { ids: [0, 1], check: ['sw'] })).toEqual({ selected: 2, missed: 0 });
            expect(call('censusSelect', { ids: [0, 1], check: ['sc', 'sw'] })).toEqual({ error: 'stale' });
            expect(call('censusSelect', { ids: [0, 1], check: [] })).toEqual({ selected: 2, missed: 0 });
        });

        test('selecting a group re-reads one property per object when one field defines it, none when none does', function () {
            const many = [];
            for (let i = 0; i < 1000; i++) many.push(counted(line(1)));
            open(many);
            call('censusScan', { scope: 'document' });
            const ids = many.map((item, index) => index);

            reads = 0;
            call('censusSelect', { ids: ids, check: ['sw'] });
            expect(reads / 1000).toBeLessThanOrEqual(1);

            reads = 0;
            call('censusSelect', { ids: ids, check: ['stroked'] });
            expect(reads / 1000).toBeLessThanOrEqual(1);

            reads = 0;
            call('censusSelect', { ids: ids, check: [] });
            expect(reads).toBe(0);

            reads = 0;
            call('censusSelect', { ids: ids, check: ['sc', 'sw'] });
            expect(reads / 1000).toBeLessThanOrEqual(8);
        });

        test('text is checked by font and size, and a path-only field is ignored for it', function () {
            const t = label('hello', 12);
            open([], [t]);
            call('censusScan', { scope: 'document' });
            t.textRange.characterAttributes.size = 14;

            expect(call('censusSelect', { ids: [0], check: ['sc', 'sw'] })).toEqual({ selected: 1, missed: 0 });
            expect(call('censusSelect', { ids: [0], check: ['font', 'size'] })).toEqual({ error: 'stale' });
        });
    });
});
