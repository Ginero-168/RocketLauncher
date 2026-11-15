describe('document census (js/census.js)', function () {
    let build;
    const CY = '#00BAE2';
    const OR = '#FF8709';
    let next;

    function line(color, width, extra) {
        return Object.assign({ i: next++, k: 'path', sc: color, sh: color, sw: width, fc: '', fh: '' }, extra || {});
    }

    function text(font, size) {
        return { i: next++, k: 'text', font: font, size: size, fc: '#000000', fh: '#000000' };
    }

    beforeEach(function () {
        next = 0;
        window.loadPanelScript('js/census.js');
        build = TATA.census.build;
    });

    function row(report, id) {
        let found = null;
        report.sections.forEach(s => s.rows.forEach(r => { if (r.id === id) found = r; }));
        return found;
    }

    test('ten lines: same colour 8, same colour and width 4', function () {
        const items = [
            line(CY, 2), line(CY, 2), line(CY, 2), line(CY, 2),
            line(CY, 1), line(CY, 1), line(CY, 1), line(CY, 1),
            line(OR, 2), line(OR, 2)
        ];
        const report = build(items);
        expect(report.total).toBe(10);
        expect(row(report, 'stroke').ids).toHaveLength(10);
        expect(row(report, 'stroke:' + CY).ids).toHaveLength(8);
        expect(row(report, 'stroke:' + CY + ':2').ids).toEqual([0, 1, 2, 3]);
        expect(row(report, 'stroke:' + CY + ':1').ids).toEqual([4, 5, 6, 7]);
        expect(row(report, 'stroke:' + OR + ':2').ids).toEqual([8, 9]);
        // One width only: no separate "same colour" row repeating the same set.
        expect(row(report, 'stroke:' + OR)).toBeNull();
        expect(report.outliers).toEqual([]);
    });

    test('a 1.1pt line among 1pt lines is a near-miss with a fix', function () {
        const report = build([line(CY, 1), line(CY, 1), line(CY, 1), line(CY, 1.1), line(CY, 2), line(CY, 2), line(CY, 2), line(CY, 2)]);
        expect(report.outliers).toHaveLength(1);
        expect(report.outliers[0]).toMatchObject({ kind: 'stroke', ids: [3], value: 1, fixLabel: 'ปรับเป็น 1pt' });
    });

    test('a deliberate second width is not a near-miss', function () {
        const report = build([line(CY, 1), line(CY, 1), line(CY, 1), line(CY, 2), line(CY, 0.5)]);
        expect(report.outliers).toEqual([]);
    });

    test('two groups of similar size are not near-misses of each other', function () {
        const report = build([line(CY, 1), line(CY, 1), line(CY, 1), line(CY, 1.1), line(CY, 1.1)]);
        expect(report.outliers).toEqual([]);
    });

    test('locked or hidden objects are counted as skipped and never in a set', function () {
        const report = build([line(CY, 1), line(CY, 1, { skip: 1 }), line(CY, 1)]);
        expect(report.total).toBe(2);
        expect(report.skipped).toBe(1);
        expect(row(report, 'stroke').ids).toEqual([0, 2]);
    });

    test('fills and text are grouped, with a font-size near-miss', function () {
        const fill = { i: 100, k: 'path', sc: '', sh: '', sw: 0, fc: '#111111', fh: '#111111' };
        const report = build([fill, text('Prompt Bold', 24), text('Prompt Bold', 24), text('Prompt Bold', 24), text('Prompt Bold', 23.9), text('Prompt Regular', 14)]);
        expect(row(report, 'fill:#111111').ids).toEqual([100]);
        expect(row(report, 'text').ids).toHaveLength(5);
        expect(row(report, 'text:Prompt Bold:24').ids).toHaveLength(3);
        expect(report.outliers[0]).toMatchObject({ kind: 'size', value: 24 });
        expect(report.sections.map(s => s.id)).toEqual(['fill', 'text']);
    });

    test('an empty document builds an empty report', function () {
        expect(build([])).toEqual({ total: 0, skipped: 0, sections: [], outliers: [] });
        expect(build(null).total).toBe(0);
    });
});
