// TATA Extension Host Script (Modular & Enhanced)
// Version: 2.1 - With Error Handling and Undo Support

// Load utility modules
#include "utils.jsx"

// NOTE: JSON polyfill is defined in utils.jsx (loaded via #include above)

// ====================================================================================
// ====================================   NAMESPACE   =================================
// ====================================================================================

var TATA = {

    // Router
    run: function (funcName, paramsString) {
        try {
            var params = {};
            if (paramsString && paramsString !== "") {
                try { params = JSON.parse(paramsString); } catch (e) { }
            }

            if (typeof this[funcName] === 'function') {
                return this[funcName](params);
            } else {
                return "Error: Function '" + funcName + "' not found.";
            }
        } catch (e) {
            alert("TATA Error: " + e.message + "\nLine: " + e.line);
            return "Error: " + e.message;
        }
    },

    dimensionMaster: function (doc, activeABIndex, ABName, sizeVal) {
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

        // Helper function to safely set text attributes
        function safeSetTextAttrs(textFrame, fontSize, justification) {
            try {
                if (textFrame && textFrame.textRange) {
                    textFrame.textRange.characterAttributes.size = fontSize;
                    textFrame.textRange.justification = justification;
                }
            } catch (e) {
                // Fallback: try setting via characters if textRange fails
                try {
                    for (var i = 0; i < textFrame.textRange.characters.length; i++) {
                        textFrame.textRange.characters[i].characterAttributes.size = fontSize;
                    }
                } catch (e2) { }
            }
        }

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
    },

    // ================================================================================
    // ====================================   SWIFT TOOLS   ===========================
    // ================================================================================

    fitSelection: function () {
        if (app.documents.length === 0) return;
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return;

        var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()];
        var abBounds = artboard.artboardRect; // [left, top, right, bottom]
        var abWidth = Math.abs(abBounds[2] - abBounds[0]);
        var abHeight = Math.abs(abBounds[3] - abBounds[1]);

        for (var i = 0; i < doc.selection.length; i++) {
            var item = doc.selection[i];

            if (item.typename === "PathItem" || item.typename === "CompoundPathItem" || item.typename === "GroupItem") {
                item.position = [abBounds[0], abBounds[1]];
                item.width = abWidth;
                item.height = abHeight;
            } else if (item.typename === "PlacedItem" || item.typename === "RasterItem") {
                var ratio = item.height / item.width;
                item.position = [abBounds[0], abBounds[1]];
                item.width = abWidth;
                item.height = abWidth * ratio;
            }
        }
    },

    placeSvg: function (params) {
        if (app.documents.length === 0) return "No Doc";
        var targetDoc = app.activeDocument;
        var filePath = params.path;
        var f = new File(filePath);
        if (!f.exists) return "File not found";

        try {
            // Method C: Open as new doc, Copy, Paste (Most Robust for "AI-SVG")
            var openedDoc = app.open(f); // Open the SVG

            // Select All and Copy
            app.executeMenuCommand('selectall');
            app.copy();

            // Close the temp SVG doc without saving
            openedDoc.close(SaveOptions.DONOTSAVECHANGES);

            // Activate original doc and Paste
            targetDoc.activate();
            app.paste();

            // Center on Active Artboard
            // Pasted items are usually selected. We group them to move easily.
            if (targetDoc.selection.length > 0) {
                // Determine Center of AB
                var ab = targetDoc.artboards[targetDoc.artboards.getActiveArtboardIndex()];
                var rect = ab.artboardRect;
                var centerX = (rect[0] + rect[2]) / 2;
                var centerY = (rect[1] + rect[3]) / 2;

                // Group
                var tempGroup = targetDoc.groupItems.add();
                // Move selection into group. Note: Doing this in reverse order often safer for indexes
                for (var i = targetDoc.selection.length - 1; i >= 0; i--) {
                    targetDoc.selection[i].move(tempGroup, ElementPlacement.PLACEATEND);
                }

                // Move Group
                tempGroup.position = [centerX - tempGroup.width / 2, centerY + tempGroup.height / 2];
                tempGroup.selected = true;

                // Optional: Ungroup? Users might prefer it grouped. Let's keep it grouped for safety.
            }

            return "Success";
        } catch (e) {
            return "Error: " + e.message;
        }
    },

    followWidth: function () {
        if (app.documents.length === 0) return;
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (sel.length !== 2) {
            alert("Please select exactly 2 objects.");
            return;
        }

        var obj1 = sel[0];
        var obj2 = sel[1];

        // Determine which is on top (visually higher Y = reference)
        var refObj, targetObj;
        if (obj1.top > obj2.top) {
            refObj = obj1;
            targetObj = obj2;
        } else {
            refObj = obj2;
            targetObj = obj1;
        }

        // Scale targetObj to match width of refObj
        if (targetObj.width !== 0 && refObj.width !== 0) {
            var scaleFactor = refObj.width / targetObj.width;

            // Resize
            targetObj.width = refObj.width;
            targetObj.height *= scaleFactor;

            // Align both X and Y to reference object position
            var refCenterX = refObj.left + refObj.width / 2;
            var refCenterY = refObj.top - refObj.height / 2;

            // Move target to same center position as reference (both X and Y)
            targetObj.left = refCenterX - targetObj.width / 2;
            targetObj.top = refCenterY + targetObj.height / 2;
        }
    },

    embedAll: function () {
        if (app.documents.length === 0) return;
        var doc = app.activeDocument;
        var count = 0;
        // Reverse loop required for live collection modification
        for (var i = doc.placedItems.length - 1; i >= 0; i--) {
            try {
                doc.placedItems[i].embed();
                count++;
            } catch (e) { }
        }
        if (count > 0) alert("Embedded " + count + " items.");
    },

    createPreview: function () {
        if (app.documents.length === 0) return;
        var doc = app.activeDocument;

        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (var i = 0; i < doc.artboards.length; i++) {
            var rect = doc.artboards[i].artboardRect;
            if (rect[0] < minX) minX = rect[0];
            if (rect[1] > maxY) maxY = rect[1]; // Top is positive
            if (rect[2] > maxX) maxX = rect[2];
            if (rect[3] < minY) minY = rect[3]; // Bottom is lower
        }

        // Padding
        var padding = 100;
        minX -= padding; maxX += padding; minY -= padding; maxY += padding;

        var hasPreview = false;
        for (var j = 0; j < doc.artboards.length; j++) {
            if (doc.artboards[j].name === "Preview Background") {
                hasPreview = true;
                break;
            }
        }

        var dimLayer = getOrCreateLayer(doc, "Dimension");

        if (!hasPreview) {
            // Rect is [Left, Top, Right, Bottom]
            // Top is maxY, Bottom is minY
            var newAb = doc.artboards.add([minX, maxY, maxX, minY]);
            newAb.name = "Preview Background";
            var rect = doc.pathItems.rectangle(maxY, minX, maxX - minX, maxY - minY);
            var c = new CMYKColor(); c.cyan = 61; c.magenta = 53; c.yellow = 52; c.black = 24;
            rect.filled = true; rect.fillColor = c; rect.name = "PreviewBG";
            rect.zOrder(ZOrderMethod.SENDTOBACK);
        }

        dimLayer.zOrder(ZOrderMethod.SENDTOBACK);
        dimLayer.locked = true;
    },

    // ================================================================================
    // ====================================   PALETTE GENERATOR   =====================
    // ================================================================================

    generateColorPalette: function () {
        if (app.documents.length === 0) { alert("Open a document first"); return "No Document"; }
        var doc = app.activeDocument;

        // 1. Capture Originals
        var originals = [];
        if (doc.selection && doc.selection.length > 0) {
            for (var i = 0; i < doc.selection.length; i++) originals.push(doc.selection[i]);
        } else {
            return "No Selection";
        }

        // 2. Create Working Copies
        var workingItems = [];
        for (var i = 0; i < originals.length; i++) {
            try {
                var dup = originals[i].duplicate();
                workingItems.push(dup);
                originals[i].selected = false;
            } catch (e) { }
        }

        // 3. Process Copies (Recursive Flatten & Trace)
        var itemsToProcess = [];

        // Helper: Recursive Flatten
        function flattenItems(collection) {
            var flat = [];
            var stack = [];
            for (var i = 0; i < collection.length; i++) stack.push(collection[i]);

            var safety = 0;
            while (stack.length > 0 && safety < 5000) { // Safety break
                var item = stack.shift();
                if (item.typename === "GroupItem") {
                    var childList = [];
                    for (var j = 0; j < item.pageItems.length; j++) {
                        childList.push(item.pageItems[j]);
                    }
                    // Move out of group (essential for flattening)
                    for (var k = 0; k < childList.length; k++) {
                        var child = childList[k];
                        try {
                            child.move(item, ElementPlacement.PLACEBEFORE);
                            stack.push(child);
                        } catch (e) { }
                    }
                    try { item.remove(); } catch (e) { }
                } else {
                    flat.push(item);
                }
                safety++;
            }
            return flat;
        }

        itemsToProcess = flattenItems(workingItems);

        // Trace & Finalize
        var finalItems = [];
        doc.selection = null;
        for (var i = 0; i < itemsToProcess.length; i++) {
            var item = itemsToProcess[i];
            try {
                if (item.typename === "PlacedItem" || item.typename === "RasterItem") {
                    var pluginItem = item.trace();
                    pluginItem.tracing.tracingOptions.loadFromPreset("Low Fidelity Photo");
                    app.redraw();
                    var expandedGroup = pluginItem.tracing.expandTracing();
                    if (expandedGroup) {
                        // Recursively flatten the result of trace expansion too
                        var expandedChildren = flattenItems([expandedGroup]);
                        for (var e = 0; e < expandedChildren.length; e++) finalItems.push(expandedChildren[e]);
                    }
                } else {
                    finalItems.push(item);
                }
            } catch (e) { finalItems.push(item); }
        }

        // 4. Generate
        var result = this._generatePaletteFromItems(doc, finalItems);

        // 5. Cleanup
        for (var i = 0; i < finalItems.length; i++) { try { finalItems[i].remove(); } catch (e) { } }
        for (var i = 0; i < originals.length; i++) { try { originals[i].selected = true; } catch (e) { } }

        return result;
    },

    saveSelectionAsRichSvg: function (params) {
        var previousInteractionLevel = app.userInteractionLevel;
        var tempDoc = null;
        var doc = null;
        var stage = "prepare";

        try {
            app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
            if (app.documents.length === 0) return "No Doc";

            doc = app.activeDocument;
            if (!doc.selection || doc.selection.length === 0) return "No Selection";
            params = params || {};

            // Create a temporary document matching the source color space.
            var colorSpace = doc.documentColorSpace;
            var sourceItems = [];
            for (var sourceIndex = 0; sourceIndex < doc.selection.length; sourceIndex++) {
                sourceItems.push(doc.selection[sourceIndex]);
            }

            stage = "create temporary document";
            tempDoc = app.documents.add(colorSpace);

            if (params.useClipboard === true) {
                stage = "copy selection";
                doc.activate();
                app.copy();
                stage = "paste selection";
                tempDoc.activate();
                app.paste();
            } else {
                stage = "duplicate selection";
                var targetLayer = tempDoc.layers[0];
                var copiedCount = 0;
                doc.activate();
                for (var duplicateIndex = 0; duplicateIndex < sourceItems.length; duplicateIndex++) {
                    var sourceItem = sourceItems[duplicateIndex];
                    var canDuplicate = true;
                    try {
                        if (sourceItem.locked || sourceItem.hidden) canDuplicate = false;
                    } catch (stateError) {
                        canDuplicate = false;
                    }
                    if (!canDuplicate) continue;

                    try {
                        sourceItem.duplicate(targetLayer, ElementPlacement.PLACEATEND);
                        copiedCount++;
                    } catch (duplicateError) {
                        // Ignore individual items that Illustrator cannot duplicate.
                    }
                }

                tempDoc.activate();
                var copiedItems = tempDoc.pageItems;
                if (copiedCount === 0 || !copiedItems || copiedItems.length === 0) {
                    return "Error at duplicate selection: nothing copied";
                }
                for (var selectIndex = 0; selectIndex < copiedItems.length; selectIndex++) {
                    copiedItems[selectIndex].selected = true;
                }
            }

            // Resize Artboard to fit selection (Fixes small preview issue)
            stage = "fit artboard";
            try {
                if (tempDoc.selection && tempDoc.selection.length > 0) {
                    var sel = tempDoc.selection;
                    var bounds = [Infinity, -Infinity, -Infinity, Infinity]; // [Left, Top, Right, Bottom]
                    // Iterate to find bounds (Geometric bounds for visual accuracy)
                    for (var i = 0; i < sel.length; i++) {
                        // Use geometricBounds to avoid clipping strokes, or visibleBounds for everything?
                        // visibleBounds is safer for strokes.
                        var b = sel[i].visibleBounds;
                        if (b[0] < bounds[0]) bounds[0] = b[0];
                        if (b[1] > bounds[1]) bounds[1] = b[1];
                        if (b[2] > bounds[2]) bounds[2] = b[2];
                        if (b[3] < bounds[3]) bounds[3] = b[3];
                    }

                    // Add small padding?
                    // var pad = 10;
                    // bounds[0] -= pad; bounds[1] += pad; bounds[2] += pad; bounds[3] -= pad;

                    // Set Artboard Rect. Note: Rect is [L, T, R, B] where T > B usually in AI coord system?
                    // AI Coords: Y goes UP. Top > Bottom.
                    // bounds from AI are [L, T, R, B].

                    var ab = tempDoc.artboards[0];
                    ab.artboardRect = bounds;
                }
            } catch (e) {
                // Ignore resize error, fallback to default artboard
            }

            // Output File
            var filePath = params.path;
            var f = new File(filePath);
            var outputFolder = new Folder(f.parent);
            if (!outputFolder.exists) outputFolder.create();
            if (f.exists) f.remove();

            // Use ExportOptionsSVG (Standard API) with preserveEditability
            var opts = new ExportOptionsSVG();
            opts.embedRasterImages = true;
            // CRITICAL FIX: OUTLINEFONT destroys text editability. Use SVGFONT to keep text live.
            opts.fontType = SVGFontType.SVGFONT;
            opts.preserveEditability = true; // This keeps AI data (Appearances)

            // Export
            app.userInteractionLevel = previousInteractionLevel;
            stage = "export SVG";
            tempDoc.activate();
            try {
                tempDoc.exportFile(f, ExportType.SVG, opts);
            } catch (exportError) {
                stage = "export SVG (retry)";
                var retryOpts = new ExportOptionsSVG();
                retryOpts.preserveEditability = false;
                retryOpts.embedRasterImages = true;
                retryOpts.fontType = SVGFontType.SVGFONT;
                if (typeof SVGDocumentEncoding !== "undefined") {
                    try { retryOpts.documentEncoding = SVGDocumentEncoding.UTF8; } catch (encodingError) { }
                }
                tempDoc.activate();
                tempDoc.exportFile(f, ExportType.SVG, retryOpts);
            }

            stage = "close temporary document";
            tempDoc.close(SaveOptions.DONOTSAVECHANGES);
            tempDoc = null;

            // Read content is done in JS side? No, better here to verify success, or JS side reads it.
            return "Success";
        } catch (e) {
            return "Error at " + stage + ": " + e.toString();
        } finally {
            if (tempDoc) {
                try { tempDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (closeErr) { }
            }
            if (doc) {
                try { doc.activate(); } catch (activateErr) { }
            }
            try { app.userInteractionLevel = previousInteractionLevel; } catch (interactionError) { }
        }
    },

    _generatePaletteFromItems: function (doc, targetItems) {
        if (typeof CoordinateSystem !== 'undefined') { app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM; }
        else { app.coordinateSystem = 1; }

        var PRIMARY_X = -960, PRIMARY_Y = -50;
        var SECONDARY_X = -540, SECONDARY_Y = -50;
        var DIAMETER = 100;
        var ROW_SPACING = 10;
        var TITLE_SIZE = 64;
        var LABEL_SIZE = 36;
        var BG_PADDING = 45;
        var BG_RADIUS = 45;

        var colorLayer = getOrCreateLayer(doc, "Colorlist");
        var prevActiveLayer = doc.activeLayer;
        doc.activeLayer = colorLayer;

        var RootGroup = colorLayer.groupItems.add();
        RootGroup.name = "Color Summary (Primary+Secondary)";

        var colors = collectColorsFromSelection(targetItems);
        if (!colors.length) {
            restoreAndLock(doc, prevActiveLayer, colorLayer);
            return "No Colors Found";
        }

        var masterGroup = makeSwatchGroupFromColors(doc, colors, "TempColorGroup");
        var toneGroups = groupColorsByTone6(doc, masterGroup);
        var primaryList = [];
        var fillers = [];

        for (var i = 0; i < toneGroups.length; i++) {
            var tg = toneGroups[i];
            var areaData = computeColorAreasFromSelection(doc, tg, targetItems);
            if (areaData.rows.length === 0) { try { tg.remove(); } catch (e) { }; continue; }

            var top = areaData.rows[0];
            primaryList.push({
                rgb: toRGB(top.swatch.color),
                topArea: top.areaPt2,
                totalArea: areaData.totalPt2,
                groupName: tg.name
            });

            for (var r = 1; r < areaData.rows.length; r++) {
                var row = areaData.rows[r];
                fillers.push({
                    rgb: toRGB(row.swatch.color),
                    topArea: row.areaPt2,
                    totalArea: areaData.totalPt2,
                    groupName: tg.name
                });
            }
            try { tg.remove(); } catch (e) { }
        }

        var need = 10 - primaryList.length;
        for (var k = 0; k < need && k < fillers.length; k++) primaryList.push(fillers[k]);
        if (primaryList.length > 10) primaryList = primaryList.slice(0, 10);

        var overall = computeAllColorAreasFromSelection(doc, targetItems);
        var secondaryList = [];
        for (var s = 0; s < Math.min(10, overall.rows.length); s++) {
            var row2 = overall.rows[s];
            secondaryList.push({
                rgb: row2.rgb,
                topArea: row2.areaPt2,
                totalArea: overall.totalPt2,
                groupName: ""
            });
        }
        deleteSwatchGroup(masterGroup);

        var t1 = drawTitle(doc, "Primary Color", PRIMARY_X, PRIMARY_Y + DIAMETER - 35, TITLE_SIZE);
        t1.textRange.characterAttributes.fauxBold = true;
        t1.moveToEnd(RootGroup);

        var pItems = drawSummaryCircles(doc, primaryList, PRIMARY_X, PRIMARY_Y, DIAMETER, ROW_SPACING, LABEL_SIZE, "group");
        moveAllToGroup(pItems, RootGroup);

        var t2 = drawTitle(doc, "Area(%)", SECONDARY_X, SECONDARY_Y + DIAMETER - 35, TITLE_SIZE);
        t2.textRange.characterAttributes.fauxBold = true;
        t2.moveToEnd(RootGroup);

        secondaryList.sort(function (a, b) { return b.topArea - a.topArea; });
        var sItems = drawSummaryCircles(doc, secondaryList, SECONDARY_X, SECONDARY_Y, DIAMETER, ROW_SPACING, LABEL_SIZE, "percent");
        moveAllToGroup(sItems, RootGroup);

        try {
            var vb = RootGroup.visibleBounds;
            var left = vb[0], top = vb[1], right = vb[2], bottom = vb[3];
            var width = right - left;
            var height = top - bottom;
            var bgRect = colorLayer.pathItems.roundedRectangle(top + BG_PADDING, left - BG_PADDING, width + 2 * BG_PADDING, height + 2 * BG_PADDING, BG_RADIUS, BG_RADIUS);
            var white = new RGBColor(); white.red = white.green = white.blue = 255;
            bgRect.fillColor = white; bgRect.stroked = false;
            bgRect.moveToBeginning(RootGroup);
            if (typeof ZOrderMethod !== 'undefined') bgRect.zOrder(ZOrderMethod.SENDTOBACK);
        } catch (e) { }

        restoreAndLock(doc, prevActiveLayer, colorLayer);
        return "Full Success";
    },

    // ================================================================================
    // ===================================== WORKSPACE CONTEXT ========================
    // ================================================================================

    getWorkspaceContext: function () {
        if (app.documents.length === 0) return JSON.stringify({ error: "No document open" });
        var doc = app.activeDocument;

        var MAX_ITEMS_PER_LAYER = 50;
        var MAX_DEPTH = 2;

        // Helper: Extract color as hex
        function colorToHex(color) {
            try {
                if (color.typename === "RGBColor") {
                    return "#" + pad(Math.round(color.red)) + pad(Math.round(color.green)) + pad(Math.round(color.blue));
                } else if (color.typename === "CMYKColor") {
                    var r = 255 * (1 - color.cyan / 100) * (1 - color.black / 100);
                    var g = 255 * (1 - color.magenta / 100) * (1 - color.black / 100);
                    var b = 255 * (1 - color.yellow / 100) * (1 - color.black / 100);
                    return "#" + pad(Math.round(r)) + pad(Math.round(g)) + pad(Math.round(b));
                } else if (color.typename === "GrayColor") {
                    var v = Math.round(255 * (1 - color.gray / 100));
                    return "#" + pad(v) + pad(v) + pad(v);
                } else if (color.typename === "SpotColor") {
                    return colorToHex(color.spot.color);
                }
            } catch (e) { }
            return null;
        }

        function pad(n) {
            var s = n.toString(16);
            return s.length < 2 ? "0" + s : s;
        }

        // Helper: Describe a single page item
        function describeItem(item, depth) {
            var info = {
                type: item.typename || "Unknown",
                name: item.name || ""
            };

            try {
                info.width = Math.round(item.width * 100) / 100;
                info.height = Math.round(item.height * 100) / 100;
            } catch (e) { }

            // Fill color
            try {
                if (item.filled && item.fillColor) {
                    info.fillColor = colorToHex(item.fillColor);
                }
            } catch (e) { }

            // Stroke color
            try {
                if (item.stroked && item.strokeColor) {
                    info.strokeColor = colorToHex(item.strokeColor);
                }
            } catch (e) { }

            // Text content
            if (item.typename === "TextFrame") {
                try {
                    var txt = item.contents;
                    info.text = txt.length > 200 ? txt.substring(0, 200) + "..." : txt;
                    info.fontSize = item.textRange.characterAttributes.size;
                } catch (e) { }
            }

            // Raster/placed info
            if (item.typename === "PlacedItem" || item.typename === "RasterItem") {
                try {
                    if (item.file) info.filePath = item.file.fsName;
                } catch (e) { }
            }

            // Group children (recurse)
            if (item.typename === "GroupItem" && depth < MAX_DEPTH) {
                info.childCount = item.pageItems.length;
                info.children = [];
                var childLimit = Math.min(item.pageItems.length, 20);
                for (var c = 0; c < childLimit; c++) {
                    info.children.push(describeItem(item.pageItems[c], depth + 1));
                }
                if (item.pageItems.length > childLimit) {
                    info.childrenTruncated = true;
                }
            } else if (item.typename === "GroupItem") {
                info.childCount = item.pageItems.length;
            }

            // Locked/hidden state
            try {
                if (item.locked) info.locked = true;
                if (item.hidden) info.hidden = true;
            } catch (e) { }

            return info;
        }

        // Build context
        var context = {
            docName: doc.name,
            colorSpace: doc.documentColorSpace == DocumentColorSpace.RGB ? "RGB" : "CMYK"
        };

        // Artboards
        context.artboards = [];
        for (var a = 0; a < doc.artboards.length; a++) {
            var ab = doc.artboards[a];
            var r = ab.artboardRect;
            context.artboards.push({
                name: ab.name,
                width: Math.round(Math.abs(r[2] - r[0])),
                height: Math.round(Math.abs(r[1] - r[3]))
            });
        }

        // Layers
        context.layers = [];
        for (var l = 0; l < doc.layers.length; l++) {
            var layer = doc.layers[l];
            var layerInfo = {
                name: layer.name,
                locked: layer.locked,
                visible: layer.visible,
                itemCount: layer.pageItems.length,
                items: []
            };

            var itemLimit = Math.min(layer.pageItems.length, MAX_ITEMS_PER_LAYER);
            for (var i = 0; i < itemLimit; i++) {
                layerInfo.items.push(describeItem(layer.pageItems[i], 0));
            }
            if (layer.pageItems.length > itemLimit) {
                layerInfo.itemsTruncated = true;
            }

            context.layers.push(layerInfo);
        }

        // Selection
        context.selection = [];
        if (doc.selection && doc.selection.length > 0) {
            var selLimit = Math.min(doc.selection.length, 30);
            for (var s = 0; s < selLimit; s++) {
                context.selection.push(describeItem(doc.selection[s], 0));
            }
            if (doc.selection.length > selLimit) {
                context.selectionTruncated = true;
            }
        }

        // Statistics
        context.stats = {
            totalObjects: doc.pageItems.length,
            pathItems: doc.pathItems.length,
            textFrames: doc.textFrames.length,
            groupItems: doc.groupItems.length,
            rasterItems: doc.rasterItems.length,
            placedItems: doc.placedItems.length,
            symbolItems: doc.symbolItems.length,
            layerCount: doc.layers.length,
            artboardCount: doc.artboards.length
        };

        return JSON.stringify(context);
    }

};


// Helper: Hex to RGB
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return { r: r, g: g, b: b };
}

// ====================================================================================
// ===============================   DOCUMENT CENSUS   ================================
// ====================================================================================
// Lists what the document holds so the panel can group objects that share a
// stroke, fill or font, select a whole group, and even out near-misses.
// Object references are kept in this engine between calls; every later call
// checks that the document is still the one that was scanned.

TATA._census = { refs: [], sigs: [], doc: "", count: -1 };

TATA._censusHex = function (r, g, b) {
    function h(n) { var s = Math.max(0, Math.min(255, Math.round(n))).toString(16).toUpperCase(); return s.length === 1 ? "0" + s : s; }
    return "#" + h(r) + h(g) + h(b);
};

// Returns [key, swatchHex]. The key is what "same colour" means; an empty key is no paint.
TATA._censusColor = function (c) {
    try {
        if (!c) return ["", ""];
        var t = c.typename;
        if (t === "RGBColor") { var hex = TATA._censusHex(c.red, c.green, c.blue); return [hex, hex]; }
        if (t === "CMYKColor") {
            var k = 1 - c.black / 100;
            return ["C" + Math.round(c.cyan) + " M" + Math.round(c.magenta) + " Y" + Math.round(c.yellow) + " K" + Math.round(c.black),
                TATA._censusHex(255 * (1 - c.cyan / 100) * k, 255 * (1 - c.magenta / 100) * k, 255 * (1 - c.yellow / 100) * k)];
        }
        if (t === "GrayColor") { var v = 255 * (1 - c.gray / 100); return ["K" + Math.round(c.gray), TATA._censusHex(v, v, v)]; }
        if (t === "SpotColor") { return ["Spot " + c.spot.name, TATA._censusColor(c.spot.color)[1]]; }
        if (t === "GradientColor") { return ["Gradient " + c.gradient.name, ""]; }
        if (t === "PatternColor") { return ["Pattern " + c.pattern.name, ""]; }
    } catch (e) { }
    return ["", ""];
};

// Locked or hidden, on the object itself or anywhere above it.
TATA._censusBlocked = function (item) {
    try {
        var p = item;
        while (p && p.typename !== "Document") {
            if (p.typename === "Layer") { if (p.locked || !p.visible) return true; }
            else if (p.locked || p.hidden) return true;
            p = p.parent;
        }
    } catch (e) { }
    return false;
};

// What the census groups an object by. Null when the object has no paint or
// no text to report. Scan stores it; select and fix compare against it.
TATA._censusDescribe = function (item, kind) {
    if (kind === "text") {
        if (item.contents === "") return null;
        var attrs = item.textRange.characterAttributes;
        var tfill = TATA._censusColor(attrs.fillColor);
        return { k: "text", font: attrs.textFont.family + " " + attrs.textFont.style, size: Math.round(attrs.size * 1000) / 1000, fc: tfill[0], fh: tfill[1] };
    }
    var stroke = item.stroked ? TATA._censusColor(item.strokeColor) : ["", ""];
    var fill = item.filled ? TATA._censusColor(item.fillColor) : ["", ""];
    if (!stroke[0] && !fill[0]) return null;
    return { k: "path", sc: stroke[0], sh: stroke[1], sw: stroke[0] ? Math.round(item.strokeWidth * 1000) / 1000 : 0, fc: fill[0], fh: fill[1] };
};

TATA._censusSignature = function (rec) {
    if (!rec) return "";
    return rec.k === "text" ? "text|" + rec.font + "|" + rec.size + "|" + rec.fc : "path|" + rec.sc + "|" + rec.sw + "|" + rec.fc;
};

TATA.censusScan = function (params) {
    if (app.documents.length === 0) return JSON.stringify({ error: "nodoc" });
    var doc = app.activeDocument;
    var max = parseInt(params.max, 10) || 4000;
    var whole = params.scope === "document";
    var board = whole ? null : doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var refs = [], sigs = [], items = [], truncated = false;

    function inScope(item) {
        if (!board) return true;
        try {
            var b = item.geometricBounds; // left, top, right, bottom (y grows upward)
            return !(b[2] < board[0] || b[0] > board[2] || b[3] > board[1] || b[1] < board[3]);
        } catch (e) { return false; }
    }

    var i, item, rec;
    for (i = 0; i < doc.pathItems.length; i++) {
        if (refs.length >= max) { truncated = true; break; }
        try {
            item = doc.pathItems[i];
            if (item.guides || item.clipping || !inScope(item)) continue;
            rec = TATA._censusDescribe(item, "path");
            if (!rec) continue;
            rec.i = refs.length;
            if (TATA._censusBlocked(item)) rec.skip = 1;
            refs.push(item);
            sigs.push(TATA._censusSignature(rec));
            items.push(rec);
        } catch (e1) { }
    }
    for (i = 0; i < doc.textFrames.length; i++) {
        if (refs.length >= max) { truncated = true; break; }
        try {
            item = doc.textFrames[i];
            if (!inScope(item)) continue;
            rec = TATA._censusDescribe(item, "text");
            if (!rec) continue;
            rec.i = refs.length;
            if (TATA._censusBlocked(item)) rec.skip = 1;
            refs.push(item);
            sigs.push(TATA._censusSignature(rec));
            items.push(rec);
        } catch (e2) { }
    }

    TATA._census = { refs: refs, sigs: sigs, doc: doc.name, count: doc.pageItems.length };
    return JSON.stringify({ doc: doc.name, scope: whole ? "document" : "artboard", truncated: truncated, items: items });
};

// The document the last scan saw, or null when it has changed since. The name
// and object count catch a switched or edited document; the signatures catch
// a restyled object, which would otherwise still be selected or changed as
// part of the group it has left.
TATA._censusCurrent = function (ids) {
    if (app.documents.length === 0) return null;
    var doc = app.activeDocument;
    var c = TATA._census;
    if (!c || c.doc !== doc.name || c.count !== doc.pageItems.length) return null;
    for (var i = 0; i < ids.length; i++) {
        try {
            var kind = c.sigs[ids[i]].indexOf("text|") === 0 ? "text" : "path";
            if (TATA._censusSignature(TATA._censusDescribe(c.refs[ids[i]], kind)) !== c.sigs[ids[i]]) return null;
        } catch (e) { return null; }
    }
    return doc;
};

TATA.censusSelect = function (params) {
    var ids = params.ids || [];
    var doc = TATA._censusCurrent(ids);
    if (!doc) return JSON.stringify({ error: "stale" });
    var done = 0, missed = 0;
    doc.selection = null;
    for (var i = 0; i < ids.length; i++) {
        try { TATA._census.refs[ids[i]].selected = true; done++; } catch (e) { missed++; }
    }
    return JSON.stringify({ selected: done, missed: missed });
};

// Evens out a near-miss: kind "stroke" sets the stroke width, "size" the font size (points).
TATA.censusFix = function (params) {
    var ids = params.ids || [];
    var doc = TATA._censusCurrent(ids);
    if (!doc) return JSON.stringify({ error: "stale" });
    var value = parseFloat(params.value);
    if (!(value > 0)) return JSON.stringify({ error: "value" });
    var done = 0;
    for (var i = 0; i < ids.length; i++) {
        try {
            var item = TATA._census.refs[ids[i]];
            if (params.kind === "size") item.textRange.characterAttributes.size = value;
            else item.strokeWidth = value;
            done++;
        } catch (e) { }
    }
    return JSON.stringify({ changed: done });
};
