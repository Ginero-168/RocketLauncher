/**
 * Graphic Style tab.
 * Lists carrier files written by the style-capture script and applies
 * the whole appearance with the same New Graphic Style action as Untitled3.jsx.
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    const CARRIER_NAME = '__STYLE_CARRIER__';

    function nodeRequire(name) {
        try {
            if (typeof window.require === 'function') return window.require(name);
        } catch (e) { /* CEP require can throw when a module is missing */ }
        try {
            if (typeof require === 'function') return require(name);
        } catch (e2) { /* browser preview has no Node */ }
        return null;
    }

    function styleLabel(fileName) {
        return String(fileName || '').replace(/_data\.ai$/i, '').replace(/\.ai$/i, '');
    }

    function styleId(label) {
        const clean = String(label || '').replace(/[^a-zA-Z0-9_]/g, '');
        return 'Style_' + (clean || 'Style');
    }

    function presetsDir() {
        const os = nodeRequire('os');
        const path = nodeRequire('path');
        if (!os || !path) return '';
        return path.join(os.homedir(), 'Documents', 'Illustrator_Style_Presets');
    }

    function previewFile(aiPath) {
        return String(aiPath || '').replace(/_data\.ai$/i, '_text.png');
    }

    const MAX_PREVIEW_BYTES = 2000000;
    const MAX_PREVIEW_CACHE = 24;
    const previewCache = new Map();

    function rememberPreview(key, entry) {
        if (previewCache.has(key)) previewCache.delete(key);
        previewCache.set(key, entry);
        while (previewCache.size > MAX_PREVIEW_CACHE) {
            const oldest = previewCache.keys().next().value;
            previewCache.delete(oldest);
        }
    }

    function ioCall(fs, method, filePath) {
        if (fs.promises && typeof fs.promises[method] === 'function') {
            return fs.promises[method](filePath);
        }
        return new Promise((resolve, reject) => {
            fs[method](filePath, (err, value) => (err ? reject(err) : resolve(value)));
        });
    }

    function previewDataUrl(pngPath) {
        const fs = nodeRequire('fs');
        if (!fs || !pngPath) return Promise.resolve('');
        return ioCall(fs, 'stat', pngPath).then(stat => {
            if (!stat || stat.size > MAX_PREVIEW_BYTES) return '';
            const cached = previewCache.get(pngPath);
            if (cached && cached.mtime === stat.mtimeMs && cached.size === stat.size) {
                rememberPreview(pngPath, cached);
                return cached.url;
            }
            return ioCall(fs, 'readFile', pngPath).then(buf => {
                const bytes = (typeof Buffer !== 'undefined' && Buffer.isBuffer(buf)) ? buf : Buffer.from(buf);
                const url = 'data:image/png;base64,' + bytes.toString('base64');
                rememberPreview(pngPath, { mtime: stat.mtimeMs, size: stat.size, url: url });
                return url;
            });
        }).catch(() => '');
    }

    function listPresets() {
        const fs = nodeRequire('fs');
        const path = nodeRequire('path');
        const dir = presetsDir();
        if (!fs || !path || !dir) return Promise.resolve({ dir: dir, items: [], reason: 'unavailable' });
        return ioCall(fs, 'readdir', dir).then(names => {
            const items = names
                .filter(name => /_data\.ai$/i.test(name))
                .sort((a, b) => a.localeCompare(b))
                .map(name => {
                    const aiPath = path.join(dir, name);
                    return {
                        label: styleLabel(name),
                        id: styleId(styleLabel(name)),
                        path: aiPath,
                        preview: previewFile(aiPath),
                        previewUrl: ''
                    };
                });
            return { dir: dir, items: items, reason: items.length ? '' : 'empty' };
        }).catch(err => {
            if (err && err.code === 'ENOENT') return { dir: dir, items: [], reason: 'missing' };
            return { dir: dir, items: [], reason: 'unavailable' };
        });
    }

    function stalePreviews(items) {
        const fs = nodeRequire('fs');
        if (!fs) return Promise.resolve([]);
        return Promise.all((items || []).map(item => {
            return Promise.all([
                ioCall(fs, 'stat', item.preview).catch(() => null),
                ioCall(fs, 'stat', item.path).catch(() => null)
            ]).then(stats => {
                const previewStat = stats[0];
                const sourceStat = stats[1];
                if (!previewStat || !sourceStat) return item;
                return previewStat.mtimeMs < sourceStat.mtimeMs ? item : null;
            });
        })).then(rows => rows.filter(Boolean));
    }

    function buildApplyScript(aiPath, styleName) {
        const fileLiteral = JSON.stringify(String(aiPath || ''));
        const nameLiteral = JSON.stringify(String(styleName || 'Style_Style'));
        return [
            '(function () {',
            '    if (app.documents.length === 0) {',
            '        alert("กรุณาเปิดเอกสารก่อน");',
            '        return "Error: no document";',
            '    }',
            '    var doc = app.activeDocument;',
            '    var sel = doc.selection;',
            '    if (!sel || (sel.typename !== "TextRange" && sel.length === 0)) {',
            '        alert("กรุณาเลือกวัตถุด้วยลูกศรดำ");',
            '        return "Error: no selection";',
            '    }',
            '    var targets = [];',
            '    if (sel.typename === "TextRange") {',
            '        var frame = sel.parent;',
            '        if (!frame || frame.typename !== "TextFrame") {',
            '            alert("เลือกข้อความไม่ครบทั้งกรอบ");',
            '            return "Error: text frame";',
            '        }',
            '        targets.push(frame);',
            '    } else {',
            '        for (var i = 0; i < sel.length; i++) targets.push(sel[i]);',
            '    }',
            '    var carrierFile = new File(' + fileLiteral + ');',
            '    if (!carrierFile.exists) {',
            '        alert("ไม่พบไฟล์สไตล์");',
            '        return "Error: missing file";',
            '    }',
            '    var STYLE_NAME = ' + nameLiteral + ';',
            '    var prevInteraction = app.userInteractionLevel;',
            '    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;',
            '    var importedShape = null;',
            '    try {',
            '        var activeLyr = doc.activeLayer;',
            '        var wasLocked = activeLyr.locked;',
            '        var wasVisible = activeLyr.visible;',
            '        activeLyr.locked = false;',
            '        activeLyr.visible = true;',
            '        var carrierDoc = app.open(carrierFile);',
            '        var carrier = null;',
            '        for (var c = 0; c < carrierDoc.pageItems.length; c++) {',
            '            if (carrierDoc.pageItems[c].name === "' + CARRIER_NAME + '") {',
            '                carrier = carrierDoc.pageItems[c];',
            '                break;',
            '            }',
            '        }',
            '        if (!carrier && carrierDoc.pageItems.length > 0) carrier = carrierDoc.pageItems[0];',
            '        if (!carrier) throw new Error("ไฟล์สไตล์ไม่มีวัตถุต้นแบบ");',
            '        importedShape = carrier.duplicate(activeLyr, ElementPlacement.PLACEATBEGINNING);',
            '        carrierDoc.close(SaveOptions.DONOTSAVECHANGES);',
            '        app.activeDocument = doc;',
            '        try {',
            '            var previous = doc.graphicStyles.getByName(STYLE_NAME);',
            '            previous.remove();',
            '        } catch (ignoreOld) {}',
            '        doc.selection = [importedShape];',
            '        var styleToApply = makeStyleFromCarrier(doc);',
            '        if (!styleToApply) throw new Error("สร้าง Graphic Style ไม่สำเร็จ");',
            '        try { styleToApply.name = STYLE_NAME; } catch (ignoreName) {}',
            '        for (var j = 0; j < targets.length; j++) {',
            '            var item = targets[j];',
            '            if (item.typename === "TextFrame") {',
            '                try {',
            '                    item.textRange.characterAttributes.fillColor = new NoColor();',
            '                    item.textRange.characterAttributes.strokeColor = new NoColor();',
            '                } catch (ignoreText) {}',
            '            }',
            '            styleToApply.applyTo(item);',
            '        }',
            '        importedShape.remove();',
            '        importedShape = null;',
            '        activeLyr.locked = wasLocked;',
            '        activeLyr.visible = wasVisible;',
            '        doc.selection = targets;',
            '        app.userInteractionLevel = prevInteraction;',
            '        app.redraw();',
            '        return "ok";',
            '    } catch (e) {',
            '        app.userInteractionLevel = prevInteraction;',
            '        try { if (importedShape) importedShape.remove(); } catch (ignoreRemove) {}',
            '        try { app.activeDocument = doc; } catch (ignoreDoc) {}',
            '        alert("เกิดข้อผิดพลาดในการใส่สไตล์: " + e.message);',
            '        return "Error: " + e.message;',
            '    }',
            '    function makeStyleFromCarrier(currentDoc) {',
            '        var countBefore = currentDoc.graphicStyles.length;',
            '        var setName = "__ApplyNativeSet__";',
            '        var actName = "__NewStyle__";',
            '        var aiaStr = [',
            '            "/version 3",',
            '            "/name [ 18 5f5f4170706c794e61746976655365745f5f ]",',
            '            "/isOpen 0",',
            '            "/actionCount 1",',
            '            "/action-1 {",',
            '            " /name [ 12 5f5f4e65775374796c655f5f ]",',
            '            " /keyIndex 0",',
            '            " /colorIndex 0",',
            '            " /isOpen 0",',
            '            " /eventCount 1",',
            '            " /event-1 {",',
            '            "  /useRulersIn1stQuadrant 0",',
            '            "  /internalName (ai_plugin_styles)",',
            '            "  /localizedName [ 14 47726170686963205374796c6573 ]",',
            '            "  /isOpen 0",',
            '            "  /isOn 1",',
            '            "  /hasDialog 1",',
            '            "  /showDialog 0",',
            '            "  /parameterCount 1",',
            '            "  /parameter-1 {",',
            '            "   /key 1835363957",',
            '            "   /showInPalette -1",',
            '            "   /type (enumerated)",',
            '            "   /name [ 17 4e65772047726170686963205374796c65 ]",',
            '            "   /value 1",',
            '            "  }",',
            '            " }",',
            '            "}"',
            '        ].join("\\n");',
            '        var actFile = new File(Folder.temp + "/_apply_native_style.aia");',
            '        actFile.open("w");',
            '        actFile.write(aiaStr);',
            '        actFile.close();',
            '        app.loadAction(actFile);',
            '        app.doScript(actName, setName, false);',
            '        app.unloadAction(setName, "");',
            '        actFile.remove();',
            '        if (currentDoc.graphicStyles.length > countBefore) {',
            '            return currentDoc.graphicStyles[currentDoc.graphicStyles.length - 1];',
            '        }',
            '        return null;',
            '    }',
            '})();'
        ].join('\n');
    }

    function buildPreviewScript(jobs) {
        return [
            '(function () {',
            '    var jobs = ' + JSON.stringify(jobs) + ';',
            '    if (!jobs || !jobs.length) return "ok";',
            '    var prevDoc = null;',
            '    try { if (app.documents.length) prevDoc = app.activeDocument; } catch (ignorePrev) {}',
            '    var prevInteraction = app.userInteractionLevel;',
            '    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;',
            '    var previewDoc = null;',
            '    try {',
            '        previewDoc = app.documents.add(DocumentColorSpace.RGB, 420, 180);',
            '        for (var n = 0; n < jobs.length; n++) renderSample(previewDoc, jobs[n]);',
            '        previewDoc.close(SaveOptions.DONOTSAVECHANGES);',
            '        previewDoc = null;',
            '        if (prevDoc) app.activeDocument = prevDoc;',
            '        app.userInteractionLevel = prevInteraction;',
            '        return "ok";',
            '    } catch (e) {',
            '        app.userInteractionLevel = prevInteraction;',
            '        try { if (previewDoc) previewDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (ignoreClose) {}',
            '        try { if (prevDoc) app.activeDocument = prevDoc; } catch (ignoreRestore) {}',
            '        return "Error: " + e.message;',
            '    }',
            '    function renderSample(doc, job) {',
            '        var carrierFile = new File(job.ai);',
            '        if (!carrierFile.exists) throw new Error("ไม่พบไฟล์สไตล์");',
            '        var carrierDoc = app.open(carrierFile);',
            '        var carrier = null;',
            '        for (var c = 0; c < carrierDoc.pageItems.length; c++) {',
            '            if (carrierDoc.pageItems[c].name === "' + CARRIER_NAME + '") {',
            '                carrier = carrierDoc.pageItems[c];',
            '                break;',
            '            }',
            '        }',
            '        if (!carrier && carrierDoc.pageItems.length > 0) carrier = carrierDoc.pageItems[0];',
            '        if (!carrier) throw new Error("ไฟล์สไตล์ไม่มีวัตถุต้นแบบ");',
            '        var imported = carrier.duplicate(doc.layers[0], ElementPlacement.PLACEATBEGINNING);',
            '        carrierDoc.close(SaveOptions.DONOTSAVECHANGES);',
            '        app.activeDocument = doc;',
            '        doc.selection = [imported];',
            '        var sampleStyle = makeStyleFromCarrier(doc);',
            '        imported.remove();',
            '        if (!sampleStyle) throw new Error("สร้าง Graphic Style ไม่สำเร็จ");',
            '        var sample = doc.textFrames.add();',
            '        sample.contents = "TEXT";',
            '        sample.position = [40, 140];',
            '        var chars = sample.textRange.characterAttributes;',
            '        chars.size = 72;',
            '        var fontNames = ["MyriadPro-Bold", "Arial-BoldMT", "Helvetica-Bold", "MyriadPro-Regular"];',
            '        for (var f = 0; f < fontNames.length; f++) {',
            '            try { chars.textFont = app.textFonts.getByName(fontNames[f]); break; } catch (ignoreFont) {}',
            '        }',
            '        try { chars.fillColor = new NoColor(); } catch (ignoreFill) {}',
            '        try { chars.strokeColor = new NoColor(); } catch (ignoreStroke) {}',
            '        sampleStyle.applyTo(sample);',
            '        app.redraw();',
            '        var bounds = sample.visibleBounds;',
            '        var pad = 12;',
            '        var span = bounds[2] - bounds[0];',
            '        if (bounds[1] - bounds[3] > span) span = bounds[1] - bounds[3];',
            '        span = span + pad * 2;',
            '        var centerX = (bounds[0] + bounds[2]) / 2;',
            '        var centerY = (bounds[1] + bounds[3]) / 2;',
            '        var half = span / 2;',
            '        doc.artboards[0].artboardRect = [centerX - half, centerY + half, centerX + half, centerY - half];',
            '        var options = new ExportOptionsPNG24();',
            '        options.antiAliasing = true;',
            '        options.transparency = true;',
            '        options.artBoardClipping = true;',
            '        options.horizontalScale = 150;',
            '        options.verticalScale = 150;',
            '        var out = new File(job.png);',
            '        if (out.exists) out.remove();',
            '        doc.exportFile(out, ExportType.PNG24, options);',
            '        sample.remove();',
            '        try { sampleStyle.remove(); } catch (ignoreStyle) {}',
            '    }',
            '    function makeStyleFromCarrier(currentDoc) {',
            '        var countBefore = currentDoc.graphicStyles.length;',
            '        var setName = "__ApplyNativeSet__";',
            '        var actName = "__NewStyle__";',
            '        var aiaStr = [',
            '            "/version 3",',
            '            "/name [ 18 5f5f4170706c794e61746976655365745f5f ]",',
            '            "/isOpen 0",',
            '            "/actionCount 1",',
            '            "/action-1 {",',
            '            " /name [ 12 5f5f4e65775374796c655f5f ]",',
            '            " /keyIndex 0",',
            '            " /colorIndex 0",',
            '            " /isOpen 0",',
            '            " /eventCount 1",',
            '            " /event-1 {",',
            '            "  /useRulersIn1stQuadrant 0",',
            '            "  /internalName (ai_plugin_styles)",',
            '            "  /localizedName [ 14 47726170686963205374796c6573 ]",',
            '            "  /isOpen 0",',
            '            "  /isOn 1",',
            '            "  /hasDialog 1",',
            '            "  /showDialog 0",',
            '            "  /parameterCount 1",',
            '            "  /parameter-1 {",',
            '            "   /key 1835363957",',
            '            "   /showInPalette -1",',
            '            "   /type (enumerated)",',
            '            "   /name [ 17 4e65772047726170686963205374796c65 ]",',
            '            "   /value 1",',
            '            "  }",',
            '            " }",',
            '            "}"',
            '        ].join("\\n");',
            '        var actFile = new File(Folder.temp + "/_preview_native_style.aia");',
            '        actFile.open("w");',
            '        actFile.write(aiaStr);',
            '        actFile.close();',
            '        app.loadAction(actFile);',
            '        app.doScript(actName, setName, false);',
            '        app.unloadAction(setName, "");',
            '        actFile.remove();',
            '        if (currentDoc.graphicStyles.length > countBefore) {',
            '            return currentDoc.graphicStyles[currentDoc.graphicStyles.length - 1];',
            '        }',
            '        return null;',
            '    }',
            '})();'
        ].join('\n');
    }

    function buildCaptureScript(aiPath, styleName) {
        const fileLiteral = JSON.stringify(String(aiPath || ''));
        const nameLiteral = JSON.stringify(String(styleName || 'Style_Style'));
        return [
            '(function () {',
            '    if (app.documents.length === 0) {',
            '        alert("กรุณาเปิดเอกสารก่อน");',
            '        return "Error: no document";',
            '    }',
            '    var doc = app.activeDocument;',
            '    var sel = doc.selection;',
            '    if (!sel || (sel.typename !== "TextRange" && sel.length === 0)) {',
            '        alert("กรุณาเลือกวัตถุด้วยลูกศรดำ");',
            '        return "Error: no selection";',
            '    }',
            '    var sourceItem = sel[0];',
            '    if (sel.typename === "TextRange") {',
            '        sourceItem = sel.parent;',
            '        if (!sourceItem || sourceItem.typename !== "TextFrame") {',
            '            alert("เลือกข้อความไม่ครบทั้งกรอบ");',
            '            return "Error: text frame";',
            '        }',
            '    }',
            '    doc.selection = [sourceItem];',
            '    var STYLE_NAME = ' + nameLiteral + ';',
            '    var prevInteraction = app.userInteractionLevel;',
            '    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;',
            '    var tempRect = null;',
            '    var tempDoc = null;',
            '    try {',
            '        var createdStyle = createGraphicStyleDirectly(doc);',
            '        try { createdStyle.name = STYLE_NAME; } catch (ignoreName) {}',
            '        var activeLyr = doc.activeLayer;',
            '        var wasLocked = activeLyr.locked;',
            '        var wasVisible = activeLyr.visible;',
            '        activeLyr.locked = false;',
            '        activeLyr.visible = true;',
            '        tempRect = activeLyr.pathItems.rectangle(50, 50, 50, 50);',
            '        createdStyle.applyTo(tempRect);',
            '        tempDoc = app.documents.add(doc.documentColorSpace, 100, 100);',
            '        var carrierShape = tempRect.duplicate(tempDoc.layers[0], ElementPlacement.PLACEATBEGINNING);',
            '        carrierShape.name = "' + CARRIER_NAME + '";',
            '        carrierShape.position = [25, 75];',
            '        tempRect.remove();',
            '        tempRect = null;',
            '        activeLyr.locked = wasLocked;',
            '        activeLyr.visible = wasVisible;',
            '        var saveOpts = new IllustratorSaveOptions();',
            '        saveOpts.pdfCompatible = true;',
            '        saveOpts.embedICCProfile = false;',
            '        saveOpts.compressed = true;',
            '        tempDoc.saveAs(new File(' + fileLiteral + '), saveOpts);',
            '        tempDoc.close(SaveOptions.DONOTSAVECHANGES);',
            '        tempDoc = null;',
            '        app.activeDocument = doc;',
            '        doc.selection = [sourceItem];',
            '        app.userInteractionLevel = prevInteraction;',
            '        return "ok";',
            '    } catch (e) {',
            '        app.userInteractionLevel = prevInteraction;',
            '        try { if (tempRect) tempRect.remove(); } catch (ignoreRect) {}',
            '        try { if (tempDoc) tempDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (ignoreDoc) {}',
            '        try { app.activeDocument = doc; } catch (ignoreActive) {}',
            '        alert("เกิดข้อผิดพลาดในการสร้างสไตล์: " + e.message);',
            '        return "Error: " + e.message;',
            '    }',
            '    function createGraphicStyleDirectly(targetDoc) {',
            '        var countBefore = targetDoc.graphicStyles.length;',
            '        var setName = "__NativeStyleSet__";',
            '        var actName = "__MakeStyle__";',
            '        var aiaStr = [',
            '            "/version 3",',
            '            "/name [ 18 5f5f4e61746976655374796c655365745f5f ]",',
            '            "/isOpen 0",',
            '            "/actionCount 1",',
            '            "/action-1 {",',
            '            " /name [ 13 5f5f4d616b655374796c655f5f ]",',
            '            " /keyIndex 0",',
            '            " /colorIndex 0",',
            '            " /isOpen 0",',
            '            " /eventCount 1",',
            '            " /event-1 {",',
            '            "  /useRulersIn1stQuadrant 0",',
            '            "  /internalName (ai_plugin_styles)",',
            '            "  /localizedName [ 14 47726170686963205374796c6573 ]",',
            '            "  /isOpen 0",',
            '            "  /isOn 1",',
            '            "  /hasDialog 1",',
            '            "  /showDialog 0",',
            '            "  /parameterCount 1",',
            '            "  /parameter-1 {",',
            '            "   /key 1835363957",',
            '            "   /showInPalette -1",',
            '            "   /type (enumerated)",',
            '            "   /name [ 17 4e65772047726170686963205374796c65 ]",',
            '            "   /value 1",',
            '            "  }",',
            '            " }",',
            '            "}"',
            '        ].join("\\n");',
            '        var actFile = new File(Folder.temp + "/_native_style.aia");',
            '        actFile.open("w");',
            '        actFile.write(aiaStr);',
            '        actFile.close();',
            '        app.loadAction(actFile);',
            '        app.doScript(actName, setName, false);',
            '        app.unloadAction(setName, "");',
            '        actFile.remove();',
            '        if (targetDoc.graphicStyles.length > countBefore) {',
            '            return targetDoc.graphicStyles[targetDoc.graphicStyles.length - 1];',
            '        }',
            '        throw new Error("ไม่สามารถสร้าง Graphic Style จากวัตถุนี้ได้");',
            '    }',
            '})();'
        ].join('\n');
    }

    let previewRunning = false;
    let selectedPath = '';

    function ensurePreviews(items) {
        if (previewRunning || !TATA.host || !TATA.host.evalCode) return;
        previewRunning = true;
        stalePreviews(items).then(stale => {
            const jobs = stale.map(item => ({
                ai: item.path,
                png: item.preview,
                id: item.id
            }));
            if (!jobs.length) {
                previewRunning = false;
                return;
            }
            TATA.host.evalCode(buildPreviewScript(jobs), result => {
                previewRunning = false;
                if (String(result || '').indexOf('Error') === 0) {
                    toast('ทำตัวอย่างตัวอักษรไม่สำเร็จ', 'error');
                    return;
                }
                render();
            });
        }).catch(() => {
            previewRunning = false;
        });
    }

    function toast(message, type) {
        if (TATA.showToast) TATA.showToast(message, type);
    }

    let renderGeneration = 0;

    function paintPreview(button, url, label, generation) {
        if (!url || generation !== renderGeneration || !button.isConnected) return;
        const image = document.createElement('img');
        image.className = 'style-preview';
        image.alt = label;
        image.src = url;
        const pending = button.querySelector('.style-pending');
        if (pending) pending.replaceWith(image);
        else button.insertBefore(image, button.firstChild);
    }

    function openPresetsFolder() {
        const fs = nodeRequire('fs');
        const child = nodeRequire('child_process');
        const dir = presetsDir();
        if (!fs || !child || !dir) {
            toast('เปิดโฟลเดอร์ได้เมื่อเปิดพาเนลใน Illustrator', 'info');
            return false;
        }
        try {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        } catch (err) {
            toast('เปิดโฟลเดอร์ไม่สำเร็จ', 'error');
            return false;
        }
        const platform = (typeof process !== 'undefined' && process.platform) || '';
        const command = platform === 'win32' ? 'explorer' : (platform === 'darwin' ? 'open' : 'xdg-open');
        child.execFile(command, [dir], err => {
            if (err) toast('เปิดโฟลเดอร์ไม่สำเร็จ', 'error');
        });
        return true;
    }

    function render() {
        const list = document.getElementById('style_list');
        if (!list) return Promise.resolve();
        const generation = ++renderGeneration;

        return listPresets().then(result => {
            if (generation !== renderGeneration) return;
            list.textContent = '';

            if (result.reason === 'unavailable') {
                list.appendChild(emptyNote('เปิดพาเนลใน Illustrator เพื่ออ่านสไตล์'));
                return;
            }
            if (result.reason === 'missing' || result.reason === 'empty') {
                list.appendChild(emptyNote('ยังไม่มีสไตล์ในโฟลเดอร์นี้ กด Collect เพื่อเก็บสไตล์'));
                return;
            }

            const fills = result.items.map(item => {
                const card = document.createElement('article');
                const selected = item.path === selectedPath;
                card.className = 'style-card' + (selected ? ' is-selected' : '');
                card.setAttribute('aria-pressed', selected ? 'true' : 'false');
                card.setAttribute('data-style-path', item.path);
                card.setAttribute('data-style-name', item.id);
                card.setAttribute('tabindex', '0');
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', 'ใส่สไตล์ ' + item.label);
                card.title = 'คลิกเพื่อใส่สไตล์';

                const frame = document.createElement('div');
                frame.className = 'style-frame';
                const pending = document.createElement('span');
                pending.className = 'style-pending';
                pending.lang = 'th';
                pending.textContent = 'กำลังทำตัวอย่าง';
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'btn btn--overlay btn--danger-hover style-delete';
                remove.setAttribute('aria-label', 'ลบ');
                remove.title = 'ลบ';
                remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
                const upload = document.createElement('button');
                upload.type = 'button';
                upload.className = 'btn btn--overlay style-upload';
                upload.setAttribute('aria-label', 'อัปโหลด');
                upload.title = 'ขึ้น Marketplace';
                upload.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z"/></svg>';
                frame.appendChild(pending);
                frame.appendChild(upload);
                frame.appendChild(remove);

                const foot = document.createElement('div');
                foot.className = 'style-foot';
                const name = document.createElement('span');
                name.className = 'style-name';
                name.textContent = item.label;
                foot.appendChild(name);

                card.appendChild(frame);
                card.appendChild(foot);
                list.appendChild(card);
                return previewDataUrl(item.preview).then(url => {
                    item.previewUrl = url;
                    paintPreview(card, url, item.label, generation);
                });
            });

            const stylesTab = document.getElementById('tab_styles');
            if (stylesTab && stylesTab.classList.contains('active')) ensurePreviews(result.items);
            return Promise.all(fills);
        }).catch(err => {
            console.error('[Styles] render failed', err);
        });
    }

    function emptyNote(message) {
        const note = document.createElement('p');
        note.className = 'style-empty';
        note.lang = 'th';
        note.textContent = message;
        return note;
    }

    function setBusy(busy) {
        document.querySelectorAll('.style-card').forEach(card => {
            card.classList.toggle('is-busy', busy);
        });
        document.querySelectorAll('.style-delete, .style-upload').forEach(button => {
            button.disabled = busy;
        });
    }

    function selectCard(card) {
        selectedPath = card.getAttribute('data-style-path') || '';
        document.querySelectorAll('.style-card').forEach(item => {
            const on = item === card;
            item.classList.toggle('is-selected', on);
            item.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    let applying = false;

    function flashCard(aiPath) {
        document.querySelectorAll('.style-card').forEach(card => {
            if (card.getAttribute('data-style-path') !== aiPath) return;
            card.classList.add('is-applied');
            setTimeout(() => card.classList.remove('is-applied'), 600);
        });
    }

    function apply(aiPath, styleName) {
        if (applying) return false;
        if (!TATA.host || !TATA.host.evalCode) {
            toast('ใส่สไตล์ได้เมื่อเปิดพาเนลใน Illustrator', 'info');
            return false;
        }
        applying = true;
        setBusy(true);
        TATA.host.evalCode(buildApplyScript(aiPath, styleName), result => {
            applying = false;
            setBusy(false);
            const text = String(result || '');
            if (text.indexOf('Error') === 0) toast('ใส่สไตล์ไม่สำเร็จ', 'error');
            else {
                flashCard(aiPath);
                toast('ใส่ Graphic Style แล้ว', 'success');
            }
        });
        return true;
    }

    function applyCard(card) {
        if (!card || applying || card.classList.contains('is-busy')) return;
        selectCard(card);
        apply(card.getAttribute('data-style-path'), card.getAttribute('data-style-name'));
    }

    function fileNameFromLabel(label) {
        const clean = String(label || '').replace(/[\\/:*?"<>|]/g, '').trim();
        return clean || 'Style';
    }

    function captureToFile(aiPath, styleName) {
        if (!TATA.host || !TATA.host.evalCode) {
            toast('เพิ่มสไตล์ได้เมื่อเปิดพาเนลใน Illustrator', 'info');
            return;
        }
        const fs = nodeRequire('fs');
        const png = previewFile(aiPath);
        if (fs && fs.existsSync(png)) fs.unlinkSync(png);
        setBusy(true);
        TATA.host.evalCode(buildCaptureScript(aiPath, styleName), result => {
            setBusy(false);
            if (String(result || '').indexOf('Error') === 0) {
                toast('เพิ่มสไตล์ไม่สำเร็จ', 'error');
                return;
            }
            selectedPath = aiPath;
            toast('เพิ่ม Graphic Style แล้ว', 'success');
            render();
        });
    }

    function addStyle() {
        const ask = TATA.showInputModal;
        if (!ask) return;
        ask('เพิ่ม Graphic Style', [{ key: 'name', label: 'ชื่อ', type: 'text', default: 'Style' }], results => {
            if (!results || !String(results.name || '').trim()) return;
            const fs = nodeRequire('fs');
            const path = nodeRequire('path');
            const dir = presetsDir();
            if (!fs || !path || !dir) {
                toast('เพิ่มสไตล์ได้เมื่อเปิดพาเนลใน Illustrator', 'info');
                return;
            }
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
            const base = fileNameFromLabel(results.name);
            const aiPath = path.join(dir, base + '_data.ai');
            const start = () => captureToFile(aiPath, styleId(base));
            if (fs.existsSync(aiPath) && TATA.showConfirmModal) {
                TATA.showConfirmModal('แทนที่สไตล์', 'มีชื่อ "' + base + '" อยู่แล้ว แทนที่หรือไม่', yes => {
                    if (yes) start();
                }, { confirmLabel: 'แทนที่' });
                return;
            }
            start();
        });
    }

    function deleteStyle(aiPath) {
        if (!aiPath) return;
        const target = aiPath;
        const label = styleLabel(target.split(/[/\\]/).pop());
        const remove = () => {
            const fs = nodeRequire('fs');
            if (!fs) return;
            [target, previewFile(target), String(target).replace(/_data\.ai$/i, '_preview.png')].forEach(filePath => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
            if (selectedPath === target) selectedPath = '';
            toast('ลบสไตล์แล้ว', 'success');
            render();
        };
        if (TATA.showConfirmModal) {
            TATA.showConfirmModal('ลบสไตล์', 'ลบ "' + label + '" ออกจากแท็บนี้หรือไม่', yes => {
                if (yes) remove();
            }, { confirmLabel: 'ลบ', danger: true });
            return;
        }
        remove();
    }

    const CARD_SIZES = ['100', '75', '50', '25'];
    const SIZE_KEY = 'tata_style_card_size';

    function cardSize() {
        try {
            const saved = localStorage.getItem(SIZE_KEY);
            if (CARD_SIZES.indexOf(saved) !== -1) return saved;
        } catch (e) { /* storage can be blocked in a preview */ }
        return '50';
    }

    function setSizeMenu(open) {
        const menu = document.getElementById('style_size_menu');
        const button = document.getElementById('btn_style_size');
        if (menu) menu.hidden = !open;
        if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function applyCardSize(size) {
        const next = CARD_SIZES.indexOf(String(size)) === -1 ? '50' : String(size);
        const list = document.getElementById('style_list');
        if (list) list.setAttribute('data-size', next);
        const button = document.getElementById('btn_style_size');
        if (button) {
            button.textContent = next + '%';
            button.setAttribute('aria-label', 'ขนาดการ์ด ' + next + '%');
        }
        document.querySelectorAll('#style_size_menu [data-size]').forEach(item => {
            const on = item.getAttribute('data-size') === next;
            item.classList.toggle('is-on', on);
            item.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        try { localStorage.setItem(SIZE_KEY, next); } catch (e) { /* ignore blocked storage */ }
        return next;
    }

    function init() {
        const add = document.getElementById('btn_add_style');
        const location = document.getElementById('btn_style_location');
        const sizeButton = document.getElementById('btn_style_size');
        const sizeMenu = document.getElementById('style_size_menu');
        const list = document.getElementById('style_list');
        if (add) add.addEventListener('click', addStyle);
        if (location) location.addEventListener('click', openPresetsFolder);
        applyCardSize(cardSize());
        if (sizeButton && !sizeButton._sizeBound) {
            sizeButton._sizeBound = true;
            sizeButton.addEventListener('click', event => {
                event.stopPropagation();
                const menu = document.getElementById('style_size_menu');
                setSizeMenu(!menu || menu.hidden);
            });
            document.addEventListener('click', event => {
                if (!event.target.closest || !event.target.closest('.style-size')) setSizeMenu(false);
            });
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') setSizeMenu(false);
            });
        }
        if (sizeMenu && !sizeMenu._sizeBound) {
            sizeMenu._sizeBound = true;
            sizeMenu.addEventListener('click', event => {
                const choice = event.target.closest('[data-size]');
                if (!choice) return;
                event.stopPropagation();
                applyCardSize(choice.getAttribute('data-size'));
                setSizeMenu(false);
            });
        }
        if (list && !list._styleBound) {
            list._styleBound = true;
            list.addEventListener('click', event => {
                const card = event.target.closest('.style-card');
                if (!card || card.classList.contains('is-busy')) return;
                if (event.target.closest('.style-delete')) {
                    event.stopPropagation();
                    deleteStyle(card.getAttribute('data-style-path'));
                    return;
                }
                if (event.target.closest('.style-upload')) {
                    event.stopPropagation();
                    selectCard(card);
                    if (TATA.market && typeof TATA.market.uploadStyle === 'function') TATA.market.uploadStyle(card);
                    return;
                }
                applyCard(card);
            });
            list.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
                const card = event.target.closest ? event.target.closest('.style-card') : null;
                if (!card || event.target !== card) return;
                event.preventDefault();
                applyCard(card);
            });
        }
        render();
    }

    TATA.graphicStyles = {
        init: init,
        refresh: render,
        styleLabel: styleLabel,
        styleId: styleId,
        buildApplyScript: buildApplyScript,
        buildPreviewScript: buildPreviewScript,
        buildCaptureScript: buildCaptureScript,
        fileNameFromLabel: fileNameFromLabel,
        previewFile: previewFile,
        openPresetsFolder: openPresetsFolder,
        cardSize: cardSize,
        applyCardSize: applyCardSize,
        previewDataUrl: previewDataUrl,
        previewCacheSize: function () { return previewCache.size; },
        limits: { bytes: MAX_PREVIEW_BYTES, cache: MAX_PREVIEW_CACHE },
        listPresets: listPresets
    };

    if (document.getElementById('style_list')) init();
})();
