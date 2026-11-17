const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('document census on the host side (jsx/hostscript.jsx)', function () {
    let host, doc;

    function rgb(red, green, blue) {
        return { typename: 'RGBColor', red: red, green: green, blue: blue };
    }

    function line(width) {
        return {
            typename: 'PathItem', stroked: true, filled: false, strokeColor: rgb(0, 186, 226), strokeWidth: width,
            geometricBounds: [0, 10, 10, 0], selected: false, parent: { typename: 'Document' }
        };
    }

    function call(command, params) {
        return JSON.parse(host.run(command, JSON.stringify(params)));
    }

    beforeEach(function () {
        const paths = [line(1), line(1), line(2)];
        doc = {
            name: 'Untitled-1', pathItems: paths, textFrames: [], pageItems: paths, selection: null,
            artboards: [{ artboardRect: [0, 100, 100, 0] }]
        };
        doc.artboards.getActiveArtboardIndex = () => 0;
        const context = vm.createContext({ alert: function () {}, app: { documents: [doc], activeDocument: doc } });
        const read = name => fs.readFileSync(path.join(__dirname, '..', 'jsx', name), 'utf8');
        vm.runInContext(read('utils.jsx'), context);
        vm.runInContext(read('hostscript.jsx').replace(/^#include.*$/m, ''), context);
        host = context.TATA;
    });

    test('a scan reports each painted object with what it is grouped by', function () {
        const report = call('censusScan', { scope: 'document' });
        expect(report.items.map(item => [item.i, item.sc, item.sw])).toEqual([[0, '#00BAE2', 1], [1, '#00BAE2', 1], [2, '#00BAE2', 2]]);
    });

    test('selecting a group selects exactly those objects', function () {
        call('censusScan', { scope: 'document' });
        expect(call('censusSelect', { ids: [0, 1] })).toEqual({ selected: 2, missed: 0 });
        expect(doc.pathItems.map(item => item.selected)).toEqual([true, true, false]);
    });

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
});
