// Dimension Dialog - Creates dimension labels on artboards
// Self-contained script - no external dependencies

(function () {
    if (app.documents.length === 0) {
        alert("Please open a document first.");
        return;
    }

    var doc = app.activeDocument;

    // ========== Helper Functions ==========

    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);
        return { r: r, g: g, b: b };
    }

    function hexToCmyk(hex) {
        var rgb = hexToRgb(hex);
        var r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
        var k = 1 - Math.max(r, g, b);
        var c = (1 - r - k) / (1 - k);
        var m = (1 - g - k) / (1 - k);
        var y = (1 - b - k) / (1 - k);
        if (isNaN(c)) c = 0;
        if (isNaN(m)) m = 0;
        if (isNaN(y)) y = 0;
        return { c: c * 100, m: m * 100, y: y * 100, k: k * 100 };
    }

    function selectColorMode(doc, cm, hex, type) {
        var colorMode = doc.documentColorSpace;
        if (colorMode == DocumentColorSpace.RGB) {
            var rgb = hexToRgb(hex);
            var c = new RGBColor();
            c.red = rgb.r; c.green = rgb.g; c.blue = rgb.b;
            if (type == 1) cm.textRange.fillColor = c;
            else if (type == 2) cm.fillColor = c;
            else if (type == 3) cm.strokeColor = c;
        } else {
            var cmyk = hexToCmyk(hex);
            var c = new CMYKColor();
            c.cyan = cmyk.c; c.magenta = cmyk.m; c.yellow = cmyk.y; c.black = cmyk.k;
            if (type == 1) cm.textRange.fillColor = c;
            else if (type == 2) cm.fillColor = c;
            else if (type == 3) cm.strokeColor = c;
        }
    }

    function getOrCreateLayer(doc, name) {
        var lyr;
        try {
            lyr = doc.layers.getByName(name);
        } catch (e) {
            lyr = doc.layers.add();
            lyr.name = name;
        }
        try { lyr.locked = false; } catch (e) { }
        try { lyr.visible = true; } catch (e) { }
        return lyr;
    }

    function restoreAndLock(doc, prevActiveLayer, targetLayer) {
        try { doc.activeLayer = prevActiveLayer; } catch (e) { }
        try { targetLayer.locked = true; } catch (e) { }
    }

    function groupAllInLayer(doc, layerName, excludes) {
        try {
            var layer = doc.layers.getByName(layerName);
            if (layer.pageItems.length > 0) {
                var grp = layer.groupItems.add();
                for (var i = layer.pageItems.length - 1; i >= 0; i--) {
                    var item = layer.pageItems[i];
                    if (item === grp) continue;
                    var skip = false;
                    if (excludes) {
                        for (var x = 0; x < excludes.length; x++) {
                            if (item.name === excludes[x]) skip = true;
                        }
                    }
                    if (!skip) item.moveToBeginning(grp);
                }
            }
        } catch (e) { }
    }

    function createArrow(doc, position, size, angle) {
        var arrow = doc.pathItems.polygon(position[0], position[1], size, 3);
        arrow.rotate(angle);
        arrow.stroked = false;
        arrow.filled = true;
        selectColorMode(doc, arrow, '#FFFFFF', 2);
    }

    function createDimensionLine(doc, startPoint, endPoint, arrowSize, orientation, dimDist) {
        var line = doc.pathItems.add();
        line.setEntirePath([startPoint, endPoint]);
        line.stroked = true;
        line.filled = false;
        selectColorMode(doc, line, '#FFFFFF', 3);
        line.strokeWidth = arrowSize / 4;

        if (orientation == 'horizontal') {
            var line2 = doc.pathItems.add();
            line2.setEntirePath([[startPoint[0], startPoint[1] - dimDist], [startPoint[0], startPoint[1]]]);
            line2.stroked = true; line2.filled = false;
            selectColorMode(doc, line2, '#FFFFFF', 3);
            line2.strokeWidth = arrowSize / 6;

            var line3 = doc.pathItems.add();
            line3.setEntirePath([[endPoint[0], endPoint[1] - dimDist], [endPoint[0], endPoint[1]]]);
            line3.stroked = true; line3.filled = false;
            selectColorMode(doc, line3, '#FFFFFF', 3);
            line3.strokeWidth = arrowSize / 6;

            createArrow(doc, [endPoint[0] - (arrowSize / 2), endPoint[1] - (arrowSize / 4)], arrowSize, 270);
            createArrow(doc, [startPoint[0] + (arrowSize / 2), startPoint[1] - (arrowSize / 4)], arrowSize, 90);
        } else {
            var line2 = doc.pathItems.add();
            line2.setEntirePath([[startPoint[0], startPoint[1]], [startPoint[0] + dimDist, startPoint[1]]]);
            line2.stroked = true; line2.filled = false;
            selectColorMode(doc, line2, '#FFFFFF', 3);
            line2.strokeWidth = arrowSize / 6;

            var line3 = doc.pathItems.add();
            line3.setEntirePath([[endPoint[0], endPoint[1]], [endPoint[0] + dimDist, endPoint[1]]]);
            line3.stroked = true; line3.filled = false;
            selectColorMode(doc, line3, '#FFFFFF', 3);
            line3.strokeWidth = arrowSize / 6;

            createArrow(doc, [startPoint[0], startPoint[1] - arrowSize], arrowSize, 0);
            createArrow(doc, [endPoint[0], endPoint[1] + (arrowSize / 2)], arrowSize, 180);
        }
    }

    function safeSetTextAttrs(textFrame, fontSize, justification) {
        try {
            if (textFrame && textFrame.textRange) {
                textFrame.textRange.characterAttributes.size = fontSize;
                textFrame.textRange.justification = justification;
            }
        } catch (e) {
            try {
                for (var i = 0; i < textFrame.textRange.characters.length; i++) {
                    textFrame.textRange.characters[i].characterAttributes.size = fontSize;
                }
            } catch (e2) { }
        }
    }

    // ========== Dimension Master ==========

    function dimensionMaster(doc, activeABIndex, ABName, sizeVal) {
        var passActiveLayer = doc.activeLayer;
        var dimensionLayer = getOrCreateLayer(doc, "Dimension");

        if (dimensionLayer.locked) dimensionLayer.locked = false;
        dimensionLayer.zOrder(ZOrderMethod.BRINGTOFRONT);
        doc.activeLayer = dimensionLayer;

        var activeArtboard = doc.artboards[activeABIndex];
        var abBounds = activeArtboard.artboardRect;

        // Determine Unit Type
        var unitType = doc.rulerUnits;
        var conversionFactor = 1;
        var unitLabel = "px";

        switch (unitType) {
            case RulerUnits.Points: conversionFactor = 1; unitLabel = "pt"; break;
            case RulerUnits.Picas: conversionFactor = 1 / 12; unitLabel = "pica"; break;
            case RulerUnits.Inches: conversionFactor = 1 / 72; unitLabel = "in"; break;
            case RulerUnits.Millimeters: conversionFactor = 25.4 / 72; unitLabel = "mm"; break;
            case RulerUnits.Centimeters: conversionFactor = 2.54 / 72; unitLabel = "cm"; break;
            default: conversionFactor = 1; unitLabel = "px";
        }

        var abWidth = Math.abs(abBounds[2] - abBounds[0]) * conversionFactor;
        var abHeight = Math.abs(abBounds[1] - abBounds[3]) * conversionFactor;

        // Dynamic Arrow Size (in points for internal calculations)
        var arrowSize = (((Math.abs(abBounds[2] - abBounds[0]) + Math.abs(abBounds[1] - abBounds[3])) / 2) * 0.01);
        if (sizeVal && sizeVal != 0) {
            arrowSize *= (sizeVal / 100);
        }

        var dimDist = arrowSize * 4;

        // Horizontal Line
        createDimensionLine(doc, [abBounds[0], abBounds[1] + dimDist], [abBounds[2], abBounds[1] + dimDist], arrowSize, 'horizontal', dimDist);
        // Vertical Line
        createDimensionLine(doc, [abBounds[0] - dimDist, abBounds[1]], [abBounds[0] - dimDist, abBounds[3]], arrowSize, 'vertical', dimDist);

        // Artboard Name (Optional)
        if (ABName !== "") {
            try {
                var abNameText = doc.textFrames.add();
                abNameText.contents = ABName + ' [ ' + abWidth.toFixed(2) + ' x ' + abHeight.toFixed(2) + ' ] ' + unitLabel;
                abNameText.position = [abBounds[0], abBounds[1] + (dimDist * 4)];
                safeSetTextAttrs(abNameText, dimDist * 1.5, Justification.LEFT);
                selectColorMode(doc, abNameText, '#FFFFFF', 1);
            } catch (e) { }
        }

        // Width Text
        try {
            var widthText = doc.textFrames.add();
            widthText.contents = "W: " + abWidth.toFixed(2) + " " + unitLabel;
            widthText.position = [(abBounds[0] + abBounds[2]) / 2, abBounds[1] + dimDist * 2];
            safeSetTextAttrs(widthText, dimDist, Justification.CENTER);
            selectColorMode(doc, widthText, '#000000', 1);

            // Width Text BG
            var wTop = widthText.top;
            var wLeft = widthText.left - dimDist;
            var wWidth = widthText.width + (dimDist * 2);
            var wHeight = widthText.height;
            var wBG = dimensionLayer.pathItems.roundedRectangle(wTop, wLeft, wWidth, wHeight, 30, 30);
            selectColorMode(doc, wBG, '#FFFFFF', 2);
            wBG.zOrder(ZOrderMethod.SENDTOBACK);
        } catch (e) { }

        // Height Text
        try {
            var heightText = doc.textFrames.add();
            heightText.contents = "H: " + abHeight.toFixed(2) + " " + unitLabel;
            heightText.position = [abBounds[0] - (dimDist * 2), (abBounds[1] + abBounds[3]) / 2];
            safeSetTextAttrs(heightText, dimDist, Justification.CENTER);
            heightText.rotate(90);
            selectColorMode(doc, heightText, '#000000', 1);

            // Height Text BG
            var hTop = heightText.top + dimDist;
            var hLeft = heightText.left;
            var hWidth = heightText.width;
            var hHeight = heightText.height + (dimDist * 2);
            var hBG = dimensionLayer.pathItems.roundedRectangle(hTop, hLeft, hWidth, hHeight, 30, 30);
            selectColorMode(doc, hBG, '#FFFFFF', 2);
            hBG.zOrder(ZOrderMethod.SENDTOBACK);
        } catch (e) { }

        groupAllInLayer(doc, "Dimension", ["PreviewBG"]);
        restoreAndLock(doc, passActiveLayer, dimensionLayer);
    }

    // ===== Flow Params Guard =====
    if (typeof params !== 'undefined' && params) {
        var size = parseInt(params.size) || 100;
        var name = String(params.name || '').replace(/^\s+|\s+$/g, '');
        var applyToAll = params.allArtboards === true || params.allArtboards === 'true';

        try {
            if (applyToAll) {
                for (var pi = 0; pi < doc.artboards.length; pi++) {
                    dimensionMaster(doc, pi, "", size);
                }
            } else {
                var pidx = doc.artboards.getActiveArtboardIndex();
                dimensionMaster(doc, pidx, name, size);
            }
            return "Dimension labels created!";
        } catch (pe) {
            return "Error: " + pe.message;
        }
    }
    // ===== End Flow Params Guard =====

    // ========== Dialog ==========

    var dialog = new Window('dialog', 'Dimension Tool');
    dialog.alignChildren = 'fill';

    // Size input (for dimension label text size)
    var sizeGroup = dialog.add('group');
    sizeGroup.add('statictext', undefined, 'Label Size % (default 100):');
    var sizeInput = sizeGroup.add('edittext', undefined, '100');
    sizeInput.characters = 10;
    sizeInput.active = true;

    // Name input
    var nameGroup = dialog.add('group');
    nameGroup.add('statictext', undefined, 'Artboard Name (Optional):');
    var nameInput = nameGroup.add('edittext', undefined, '');
    nameInput.characters = 20;

    // All artboards checkbox
    var allArtboardsCheck = dialog.add('checkbox', undefined, 'Apply to All Artboards');
    allArtboardsCheck.value = false;

    // Buttons
    var buttonGroup = dialog.add('group');
    buttonGroup.alignment = 'center';
    var btnOK = buttonGroup.add('button', undefined, 'OK', { name: 'ok' });
    var btnCancel = buttonGroup.add('button', undefined, 'Cancel', { name: 'cancel' });

    if (dialog.show() === 1) {
        var size = parseInt(sizeInput.text);
        var name = String(nameInput.text);
        name = name.replace(/^\s+|\s+$/g, '');
        var applyToAll = allArtboardsCheck.value;

        if (isNaN(size) || size <= 0) {
            size = 100;
        }

        try {
            if (applyToAll) {
                for (var i = 0; i < doc.artboards.length; i++) {
                    dimensionMaster(doc, i, "", size);
                }
            } else {
                var idx = doc.artboards.getActiveArtboardIndex();
                dimensionMaster(doc, idx, name, size);
            }

            alert("Dimension labels created!");
        } catch (err) {
            var msg = "ไม่สามารถสร้าง Dimension ได้\n\n";
            msg += "กรุณาตรวจสอบ:\n";
            msg += "• เอกสารเปิดอยู่และมี Artboard\n";
            msg += "• ไม่มี Layer ที่ล็อคอยู่\n\n";
            msg += "(Details: " + err.message + ")";
            alert(msg);
        }
    }
})();
