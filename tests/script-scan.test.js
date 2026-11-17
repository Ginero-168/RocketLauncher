describe('script scan (js/script-scan.js)', function () {
    let scan;

    beforeEach(function () {
        window.loadPanelScript('js/script-scan.js');
        scan = TATA.scriptScan.scan;
    });

    test('a script that only edits the document is "doc"', function () {
        const report = scan('var d = app.activeDocument;\nfor (var i = 0; i < d.artboards.length; i++) d.artboards[i].name = "A" + i;');
        expect(report.level).toBe('doc');
        expect(report.lines).toEqual([]);
        expect(TATA.scriptScan.needsConsent(report)).toBe(false);
    });

    test('file access is found with its line number', function () {
        const report = scan('var doc = app.activeDocument;\nvar out = Folder.selectDialog();\ndoc.exportFile(new File(out + "/a.png"), ExportType.PNG24);');
        expect(report.level).toBe('file');
        expect(report.lines.map(l => l.no)).toEqual([2, 3]);
        expect(report.lines[1].code).toContain('exportFile');
    });

    test('network access outranks file access and needs consent', function () {
        const report = scan('var f = new File("~/x.txt");\nvar c = new Socket();\nc.open("example.com:80");');
        expect(report.level).toBe('net');
        expect(report.touches.file).toBe(true);
        expect(TATA.scriptScan.needsConsent(report)).toBe(true);
    });

    test('system calls need consent', function () {
        expect(scan('app.system("rm -rf ~");').level).toBe('system');
        expect(scan('var bt = new BridgeTalk(); bt.target = "photoshop";').touches.system).toBe(true);
        expect(scan('new File("~/a.command").execute();').touches.system).toBe(true);
    });

    test('code inside comments is ignored, line numbers stay right', function () {
        const report = scan('// new Socket()\n/* app.system("x")\n   new File("y") */\nvar s = new Socket();');
        expect(report.lines.map(l => l.no)).toEqual([4]);
        expect(report.level).toBe('net');
    });

    test('a URL inside a string does not start a comment', function () {
        const report = scan('var u = "http://example.com"; var s = new Socket();');
        expect(report.touches.net).toBe(true);
    });

    test('code that hides what it runs is reported, never passed as clean', function () {
        expect(scan('eval(payload);').level).toBe('hidden');
        expect(scan('var k = String.fromCharCode(83, 111);').level).toBe('hidden');
        expect(scan('this["Soc" + "ket"]').level).toBe('hidden');
        expect(scan('$.evalFile(path);').touches.hidden).toBe(true);
    });

    test('rows describe every kind for the review dialog', function () {
        const rows = TATA.scriptScan.rows(scan('new File("a");'));
        expect(rows.map(r => r.kind)).toEqual(['file', 'net', 'system', 'hidden']);
        expect(rows[0].on).toBe(true);
        expect(rows[1].on).toBe(false);
        expect(TATA.scriptScan.label('net').badge).toBe('ต่ออินเทอร์เน็ต');
    });
});
