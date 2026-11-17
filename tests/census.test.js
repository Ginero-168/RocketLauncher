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

    describe('the panel', function () {
        let calls, replies;

        function mount() {
            document.body.innerHTML =
                '<button data-census-scope="selection"></button><button data-census-scope="document"></button>' +
                '<button id="btn_census_rescan"></button>' +
                '<div id="census_list"></div><div id="census_summary"></div><div id="census_status"></div>';
            calls = [];
            replies = {};
            TATA.host = {
                run: (cmd, params, cb) => {
                    calls.push({ cmd: cmd, params: params });
                    if (replies[cmd]) cb(JSON.stringify(replies[cmd]));
                    else calls[calls.length - 1].cb = cb;
                }
            };
            window.loadPanelScript('js/census.js');
        }

        function settle() {
            return new Promise(resolve => setTimeout(resolve, 0));
        }

        function commands() {
            return calls.map(call => call.cmd + ':' + (call.params.scope || ''));
        }

        test('the first survey is of the selection', async function () {
            mount();
            replies.censusSize = { n: 12, over: false };
            replies.censusScan = { items: [] };
            TATA.census.refresh();
            await settle();
            expect(commands()).toEqual(['censusSize:selection', 'censusScan:selection']);
        });

        test('a large selection is not scanned when the tab is shown, and says why', async function () {
            mount();
            replies.censusSize = { n: 3001, over: true };
            TATA.census.refresh();
            await settle();
            expect(commands()).toEqual(['censusSize:selection']);
            expect(document.getElementById('census_list').textContent).toContain('เลือกไว้ เกิน 3000 ชิ้น');
        });

        test('a large document shows how many objects it has and waits to be asked', async function () {
            mount();
            replies.censusSize = { n: 52000, over: true };
            document.querySelector('[data-census-scope="document"]').click();
            await settle();
            expect(commands()).toEqual(['censusSize:document']);
            expect(document.getElementById('census_list').textContent).toContain('52,000');
        });

        test('the rescan button scans without asking the size first', async function () {
            mount();
            replies.censusScan = { items: [] };
            document.getElementById('btn_census_rescan').click();
            await settle();
            expect(commands()).toEqual(['censusScan:selection']);
        });

        test('nothing selected says to select something', async function () {
            mount();
            replies.censusSize = { n: 0, over: false };
            replies.censusScan = { error: 'noselection' };
            TATA.census.refresh();
            await settle();
            expect(document.getElementById('census_list').textContent).toContain('ยังไม่ได้เลือกวัตถุ');
        });

        test('changing scope while the size is read asks again for the new scope, and never scans the old one unchecked', async function () {
            mount();
            TATA.census.refresh();
            document.querySelector('[data-census-scope="document"]').click();
            expect(commands()).toEqual(['censusSize:selection']);

            calls[0].cb(JSON.stringify({ n: 5, over: false }));
            await settle();
            expect(commands()).toEqual(['censusSize:selection', 'censusSize:document']);

            calls[1].cb(JSON.stringify({ n: 52000, over: true }));
            await settle();
            expect(commands()).toEqual(['censusSize:selection', 'censusSize:document']);
            expect(document.getElementById('census_list').textContent).toContain('52,000');
        });

        test('changing scope during a scan ends with the list for the chosen scope', async function () {
            mount();
            replies.censusSize = { n: 5, over: false };
            TATA.census.refresh();
            await settle();
            expect(commands()).toEqual(['censusSize:selection', 'censusScan:selection']);

            document.querySelector('[data-census-scope="document"]').click();
            calls[1].cb(JSON.stringify({ items: [] }));
            await settle();
            expect(commands()).toEqual(['censusSize:selection', 'censusScan:selection', 'censusSize:document', 'censusScan:document']);
        });

        test('a click on a row sends the fields that define it, so the host re-reads only those', async function () {
            mount();
            const path = (i, width) => ({ i: i, k: 'path', sc: '#00BAE2', sh: '#00BAE2', sw: width, fc: '', fh: '' });
            replies.censusSize = { n: 3, over: false };
            replies.censusScan = { items: [path(0, 1), path(1, 1), path(2, 2)] };
            replies.censusSelect = { selected: 2, missed: 0 };
            TATA.census.refresh();
            await settle();

            const rows = Array.from(document.querySelectorAll('.census-row'));
            const widthRow = rows.find(row => row.textContent.indexOf('สีและขนาดเดียวกัน') !== -1);
            widthRow.click();
            await settle();
            const select = calls.find(call => call.cmd === 'censusSelect');
            expect(select.params.check).toEqual(['sc', 'sw']);

            rows[0].click();
            await settle();
            expect(calls.filter(call => call.cmd === 'censusSelect')[1].params.check).toEqual(['stroked']);
        });

        test('every row and every near-miss names the fields that define it', function () {
            const report = build([
                line(CY, 1), line(CY, 1), line(CY, 1), line(CY, 1), line(CY, 1.1),
                text('Arial Regular', 12), text('Arial Regular', 12), text('Arial Regular', 12), text('Arial Regular', 11)
            ]);
            const rows = [];
            report.sections.forEach(section => section.rows.forEach(row => rows.push(row)));
            rows.concat(report.outliers).forEach(entry => {
                expect(Array.isArray(entry.check)).toBe(true);
            });
            expect(report.outliers.map(found => found.check)).toEqual([['sc', 'sw'], ['font', 'size']]);
        });
    });
});
