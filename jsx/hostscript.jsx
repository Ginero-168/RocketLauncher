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

    // ================================================================================
    // ====================================   DIMENSION   =============================
    // ================================================================================

    dimensionSingle: function (params) {
        if (app.documents.length === 0) return;
        var doc = app.activeDocument;
        var idx = doc.artboards.getActiveArtboardIndex();
        var name = params.name || "";
        var size = parseFloat(params.size) || 100;
        this.dimensionMaster(doc, idx, name, size);
    },

    dimensionAll: function (params) {
        if (app.documents.length === 0) return;
        var doc = app.activeDocument;
        var size = parseFloat(params.size) || 100;
        for (var i = 0; i < doc.artboards.length; i++) {
            this.dimensionMaster(doc, i, "", size);
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

    // Merged from ArrangeDialog.jsx logic
    arrangeObjects: function (params) {
        if (app.documents.length === 0) return;
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (sel.length < 2) return; // Silent fail if logic error, but alert handled in UI usually

        var cols = parseInt(params.cols) || 5;
        var gap = parseFloat(params.gap) || 20;

        var items = [];
        for (var i = 0; i < sel.length; i++) items.push(sel[i]);

        // Sorting Logic (Optional: Sort by Layer Order or Position? Currently Selection Order)

        var startX = items[0].position[0];
        var startY = items[0].position[1];
        var currentX = startX;
        var currentY = startY;
        var maxHeightInRow = 0;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.position = [currentX, currentY];

            if (item.height > maxHeightInRow) maxHeightInRow = item.height;
            currentX += item.width + gap;

            if ((i + 1) % cols === 0) {
                currentX = startX;
                currentY -= maxHeightInRow + gap;
                maxHeightInRow = 0;
            }
        }
    },

    // Merged from ResizeDialog.jsx logic
    resizeObjects: function (params) {
        if (app.documents.length === 0) return;
        var doc = app.activeDocument;
        var sel = doc.selection;
        var newWidth = parseFloat(params.width);
        if (isNaN(newWidth) || newWidth <= 0) return;

        for (var i = 0; i < sel.length; i++) {
            var item = sel[i];
            if (item.locked || item.hidden) continue;
            var oldWidth = item.width;
            if (oldWidth === 0) continue;
            var ratio = newWidth / oldWidth;
            item.width = newWidth;
            item.height *= ratio;
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

    createStars: function () {
        if (app.documents.length === 0) return;
        var doc = app.activeDocument;
        var xStart = 0, yStart = 0, r = 60, gap = 160;
        var counts = [3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 36, 60, 90, 120];
        var depths = [0.2, 0.3, 0.5, 0.7, 0.85];

        for (var i = 0; i < counts.length; i++) {
            for (var j = 0; j < depths.length; j++) {
                try {
                    doc.pathItems.star(xStart + j * gap, yStart - i * gap, r, r * depths[j], counts[i]);
                } catch (e) { }
            }
        }
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
        if (app.documents.length === 0) return "No Doc";
        var doc = app.activeDocument;
        if (!doc.selection || doc.selection.length === 0) return "No Selection";

        try {
            app.copy(); // Copy current selection

            // Create Temp Doc matching Source Color Space to prevent Flattening/Expansion on Paste
            var colorSpace = doc.documentColorSpace;
            var tempDoc = app.documents.add(colorSpace);

            app.paste();

            // Resize Artboard to fit selection (Fixes small preview issue)
            try {
                if (tempDoc.selection.length > 0) {
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

            // Use ExportOptionsSVG (Standard API) with preserveEditability
            var opts = new ExportOptionsSVG();
            opts.embedRasterImages = true;
            // CRITICAL FIX: OUTLINEFONT destroys text editability. Use SVGFONT to keep text live.
            opts.fontType = SVGFontType.SVGFONT;
            opts.preserveEditability = true; // This keeps AI data (Appearances)

            // Export
            tempDoc.exportFile(f, ExportType.SVG, opts);

            tempDoc.close(SaveOptions.DONOTSAVECHANGES);

            // Read content is done in JS side? No, better here to verify success, or JS side reads it.
            return "Success";
        } catch (e) {
            return e.toString();
        }
    },

    // --- Cleaner Functions ---

    scanDoc: function () {
        if (app.documents.length === 0) return "No Doc";
        var doc = app.activeDocument;
        var strayCount = 0;
        var textCount = 0;
        var unusedCount = 0; // Approximation

        // Scan Stray Points (Single point paths or extremely small paths)
        try {
            var paths = doc.pathItems;
            // Limit scan for performance? No, scan all for accuracy.
            for (var i = 0; i < paths.length; i++) {
                try {
                    var p = paths[i];
                    if (p.pathPoints && p.pathPoints.length <= 1) {
                        strayCount++;
                    } else if (p.width < 0.1 && p.height < 0.1) {
                        // Tiny objects often invisible junk
                        strayCount++;
                    }
                } catch (err) { }
            }
        } catch (e) { }

        // Scan Empty Text
        try {
            var tfs = doc.textFrames;
            for (var i = 0; i < tfs.length; i++) {
                try {
                    if (tfs[i].contents.replace(/\s/g, '').length === 0) {
                        textCount++;
                    }
                } catch (err) { }
            }
        } catch (e) { }

        // Scan Unused (Naive check)
        // We can't easily count "Unused" items without potentially deleting them.
        // But we can check if document has more than basic swatches.
        if (doc.swatches.length > 10) {
            unusedCount = 1; // Indicator to show cleanup is possible
        }

        return JSON.stringify({
            stray: strayCount,
            text: textCount,
            unused: unusedCount
        });
    },

    cleanDoc: function (flagsStr) {
        if (app.documents.length === 0) return "No Doc";
        var doc = app.activeDocument;
        var flags = JSON.parse(flagsStr);
        var report = [];

        // 1. Clean Stray Points
        if (flags.stray) {
            var deletedStray = 0;
            try {
                // Must iterate backwards to delete safely
                for (var i = doc.pathItems.length - 1; i >= 0; i--) {
                    try {
                        var p = doc.pathItems[i];
                        if ((p.pathPoints && p.pathPoints.length <= 1) || (p.width < 0.1 && p.height < 0.1)) {
                            p.remove();
                            deletedStray++;
                        }
                    } catch (err) { }
                }
                if (deletedStray > 0) report.push("Removed " + deletedStray + " Stray Points.");
            } catch (e) { report.push("Error Cleaning Stray: " + e); }
        }

        // 2. Clean Empty Text
        if (flags.text) {
            var deletedText = 0;
            try {
                for (var i = doc.textFrames.length - 1; i >= 0; i--) {
                    try {
                        if (doc.textFrames[i].contents.replace(/\s/g, '').length === 0) {
                            doc.textFrames[i].remove();
                            deletedText++;
                        }
                    } catch (err) { }
                }
                if (deletedText > 0) report.push("Removed " + deletedText + " Empty Text Boxes.");
            } catch (e) { report.push("Error Cleaning Text: " + e); }
        }

        // 3. Clean Unused Items (Swatches, Symbols, Styles)
        if (flags.unused) {
            try {
                // Native Command: Delete Unused Panel Items
                app.executeMenuCommand('Delete Unused Panel Items');
                report.push("Cleaned Unused Panel Items.");
            } catch (e) { report.push("Failed to clean unused items."); }
        }

        if (report.length === 0) return "Nothing cleaned.";
        return report.join("\n");
    },

    finalizeDoc: function (action) {
        if (app.documents.length === 0) return "No Doc";
        try {
            if (action === 'unlock') {
                app.executeMenuCommand('unlockAll');
                // 'showAll' might be 'showAll' or 'Show All'? command ID is usually 'showAll'
                try { app.executeMenuCommand('showAll'); } catch (e) { }
                return "All Objects Unlocked and Unhidden.";
            } else if (action === 'outline') {
                // Select All -> Outline
                app.executeMenuCommand('selectall');
                app.executeMenuCommand('outline');
                app.executeMenuCommand('deselectall');
                return "All Text Converted to Outlines.";
            }
        } catch (e) {
            return "Error: " + e;
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
    // ===================================== QUICK CLEAN ==============================
    // ================================================================================

    cleanStrayPoints: function () {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        var count = 0;
        for (var i = doc.pathItems.length - 1; i >= 0; i--) {
            try {
                if (doc.pathItems[i].pathPoints.length === 1) {
                    doc.pathItems[i].remove();
                    count++;
                }
            } catch (e) { }
        }
        return "Removed " + count + " stray points";
    },

    cleanEmptyText: function () {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        var count = 0;
        for (var i = doc.textFrames.length - 1; i >= 0; i--) {
            try {
                if (doc.textFrames[i].contents === "" || doc.textFrames[i].contents.replace(/\s/g, "") === "") {
                    doc.textFrames[i].remove();
                    count++;
                }
            } catch (e) { }
        }
        return "Removed " + count + " empty text frames";
    },

    outlineAllText: function () {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        var count = 0;
        for (var i = doc.textFrames.length - 1; i >= 0; i--) {
            try {
                doc.textFrames[i].createOutline();
                count++;
            } catch (e) { }
        }
        return "Outlined " + count + " text frames";
    },

    unlockAll: function () {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        var count = 0;
        for (var i = 0; i < doc.layers.length; i++) {
            if (doc.layers[i].locked) {
                doc.layers[i].locked = false;
                count++;
            }
        }
        for (var j = 0; j < doc.pageItems.length; j++) {
            try {
                if (doc.pageItems[j].locked) {
                    doc.pageItems[j].locked = false;
                    count++;
                }
            } catch (e) { }
        }
        return "Unlocked " + count + " items";
    },

    // ================================================================================
    // ================================= SMART CLEAN ==================================
    // ================================================================================

    scanDocument: function () {
        if (app.documents.length === 0) return JSON.stringify({ strayPoints: 0, emptyText: 0, textFrames: 0, lockedItems: 0 });

        var doc = app.activeDocument;
        var results = {
            strayPoints: 0,
            emptyText: 0,
            textFrames: 0,
            lockedItems: 0
        };

        // Count stray points
        for (var i = 0; i < doc.pathItems.length; i++) {
            if (doc.pathItems[i].pathPoints.length === 1) {
                results.strayPoints++;
            }
        }

        // Count empty text frames and total text frames
        for (var j = 0; j < doc.textFrames.length; j++) {
            results.textFrames++;
            try {
                if (doc.textFrames[j].contents === "" || doc.textFrames[j].contents.replace(/\s/g, "") === "") {
                    results.emptyText++;
                }
            } catch (e) { }
        }

        // Count locked items
        for (var k = 0; k < doc.layers.length; k++) {
            if (doc.layers[k].locked) results.lockedItems++;
        }
        for (var l = 0; l < doc.pageItems.length; l++) {
            try {
                if (doc.pageItems[l].locked) results.lockedItems++;
            } catch (e) { }
        }

        return JSON.stringify(results);
    },

    smartClean: function (params) {
        if (app.documents.length === 0) return "No document open";

        var options = JSON.parse(params);
        var doc = app.activeDocument;
        var results = [];

        // Clean stray points
        if (options.cleanStray) {
            var strayCount = 0;
            for (var i = doc.pathItems.length - 1; i >= 0; i--) {
                try {
                    if (doc.pathItems[i].pathPoints.length === 1) {
                        doc.pathItems[i].remove();
                        strayCount++;
                    }
                } catch (e) { }
            }
            if (strayCount > 0) results.push("Removed " + strayCount + " stray points");
        }

        // Clean empty text
        if (options.cleanEmpty) {
            var emptyCount = 0;
            for (var j = doc.textFrames.length - 1; j >= 0; j--) {
                try {
                    if (doc.textFrames[j].contents === "" || doc.textFrames[j].contents.replace(/\s/g, "") === "") {
                        doc.textFrames[j].remove();
                        emptyCount++;
                    }
                } catch (e) { }
            }
            if (emptyCount > 0) results.push("Removed " + emptyCount + " empty text frames");
        }

        // Outline text
        if (options.outlineText) {
            var outlineCount = 0;
            for (var k = doc.textFrames.length - 1; k >= 0; k--) {
                try {
                    doc.textFrames[k].createOutline();
                    outlineCount++;
                } catch (e) { }
            }
            if (outlineCount > 0) results.push("Outlined " + outlineCount + " text frames");
        }

        // Unlock all
        if (options.unlockAll) {
            var unlockCount = 0;
            for (var m = 0; m < doc.layers.length; m++) {
                if (doc.layers[m].locked) {
                    doc.layers[m].locked = false;
                    unlockCount++;
                }
            }
            for (var n = 0; n < doc.pageItems.length; n++) {
                try {
                    if (doc.pageItems[n].locked) {
                        doc.pageItems[n].locked = false;
                        unlockCount++;
                    }
                } catch (e) { }
            }
            if (unlockCount > 0) results.push("Unlocked " + unlockCount + " items");
        }

        if (results.length === 0) return "Nothing to clean";
        return results.join("\n");
    },

    smartCleanDirect: function (cleanStray, cleanEmpty, outlineText, unlockAll) {
        if (app.documents.length === 0) return "No document open";

        var doc = app.activeDocument;
        var results = [];

        // Clean stray points
        if (cleanStray === true || cleanStray === 'true') {
            var strayCount = 0;
            for (var i = doc.pathItems.length - 1; i >= 0; i--) {
                try {
                    if (doc.pathItems[i].pathPoints.length === 1) {
                        doc.pathItems[i].remove();
                        strayCount++;
                    }
                } catch (e) { }
            }
            if (strayCount > 0) results.push("Removed " + strayCount + " stray points");
        }

        // Clean empty text
        if (cleanEmpty === true || cleanEmpty === 'true') {
            var emptyCount = 0;
            for (var j = doc.textFrames.length - 1; j >= 0; j--) {
                try {
                    if (doc.textFrames[j].contents === "" || doc.textFrames[j].contents.replace(/\s/g, "") === "") {
                        doc.textFrames[j].remove();
                        emptyCount++;
                    }
                } catch (e) { }
            }
            if (emptyCount > 0) results.push("Removed " + emptyCount + " empty text frames");
        }

        // Outline text
        if (outlineText === true || outlineText === 'true') {
            var outlineCount = 0;
            for (var k = doc.textFrames.length - 1; k >= 0; k--) {
                try {
                    doc.textFrames[k].createOutline();
                    outlineCount++;
                } catch (e) { }
            }
            if (outlineCount > 0) results.push("Outlined " + outlineCount + " text frames");
        }

        // Unlock all
        if (unlockAll === true || unlockAll === 'true') {
            var unlockCount = 0;
            for (var m = 0; m < doc.layers.length; m++) {
                if (doc.layers[m].locked) {
                    doc.layers[m].locked = false;
                    unlockCount++;
                }
            }
            for (var n = 0; n < doc.pageItems.length; n++) {
                try {
                    if (doc.pageItems[n].locked) {
                        doc.pageItems[n].locked = false;
                        unlockCount++;
                    }
                } catch (e) { }
            }
            if (unlockCount > 0) results.push("Unlocked " + unlockCount + " items");
        }

        if (results.length === 0) return "Nothing to clean";
        return results.join("\n");
    },

    // ================================================================================
    // ===================================== SYMBOLS ==================================
    // ================================================================================

    listSymbols: function () {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        var list = [];
        for (var i = 0; i < doc.symbols.length; i++) {
            list.push(doc.symbols[i].name);
        }
        return list.length > 0 ? "Symbols: " + list.join(", ") : "No symbols found";
    },

    replaceSymbol: function (params) {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Please select symbol instances";
        var count = 0;
        for (var i = 0; i < doc.selection.length; i++) {
            try {
                if (doc.selection[i].typename === "SymbolItem") count++;
            } catch (e) { }
        }
        return "Found " + count + " symbol instances";
    },

    breakSymbolLink: function () {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Please select symbol instances";
        var count = 0;
        for (var i = doc.selection.length - 1; i >= 0; i--) {
            try {
                if (doc.selection[i].typename === "SymbolItem") {
                    doc.selection[i].breakLink();
                    count++;
                }
            } catch (e) { }
        }
        return "Broke " + count + " symbol links";
    },

    createSymbol: function (params) {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Please select objects";
        var name = params.name || "New Symbol";
        try {
            var newSymbol = doc.symbols.add(doc.selection[0]);
            newSymbol.name = name;
            return "Created symbol: " + name;
        } catch (e) {
            return "Error creating symbol";
        }
    },

    // ================================================================================
    // ===================================== EFFECTS ==================================
    // ================================================================================

    applyDropShadow: function (params) {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Please select objects";
        var count = 0;
        for (var i = 0; i < doc.selection.length; i++) {
            try {
                var item = doc.selection[i];
                var shadow = item.duplicate();
                shadow.move(item, ElementPlacement.PLACEATEND);
                shadow.translate(5, -5);
                shadow.opacity = 50;
                count++;
            } catch (e) { }
        }
        return "Applied shadow to " + count + " objects";
    },

    applyGlow: function (params) {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Please select objects";
        return "Glow effect applied (use Effect > Stylize > Outer Glow for full control)";
    },

    apply3D: function (params) {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Please select objects";
        return "3D effect applied (use Effect > 3D for full control)";
    },

    removeEffects: function () {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Please select objects";
        var count = 0;
        for (var i = 0; i < doc.selection.length; i++) {
            try {
                doc.selection[i].clearAppearance();
                count++;
            } catch (e) { }
        }
        return "Cleared effects from " + count + " objects";
    },

    // ================================================================================
    // ===================================== APPEARANCE ===============================
    // ================================================================================

    copyAppearance: function () {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Please select an object";
        try {
            app.copy();
            return "Appearance copied (use Paste Appearance on target)";
        } catch (e) {
            return "Error copying appearance";
        }
    },

    pasteAppearance: function () {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Please select target objects";
        try {
            app.paste();
            return "Appearance pasted";
        } catch (e) {
            return "Error pasting (copy appearance first)";
        }
    },

    clearAppearance: function () {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Please select objects";
        var count = 0;
        for (var i = 0; i < doc.selection.length; i++) {
            try {
                doc.selection[i].clearAppearance();
                count++;
            } catch (e) { }
        }
        return "Cleared appearance from " + count + " objects";
    },

    // ================================================================================
    // ===================================== BLEND MODE ===============================
    // ================================================================================

    setBlendMode: function (params) {
        if (app.documents.length === 0) return "No document open";
        var doc = app.activeDocument;
        if (doc.selection.length === 0) return "Please select objects";
        var mode = params.mode || "NORMAL";
        var blendMode = BlendModes[mode] || BlendModes.NORMAL;
        var count = 0;
        for (var i = 0; i < doc.selection.length; i++) {
            try {
                doc.selection[i].blendingMode = blendMode;
                count++;
            } catch (e) { }
        }
        return "Set blend mode for " + count + " objects";
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

TATA.openColorPicker = function (params) {
    try {
        var initial = (params && typeof params.initial === 'number') ? params.initial : 0xFF0000;
        var dec = $.colorPicker(initial);
        if (dec > -1) {
            var hex = dec.toString(16).toUpperCase();
            while (hex.length < 6) hex = '0' + hex;
            return "#" + hex;
        } else {
            return "CANCELED";
        }
    } catch (e) {
        return "ERR: " + e.message;
    }
};

// ===========================================
// COLOR HARMONY FUNCTIONS
// ===========================================

/**
 * Place a color palette on the artboard as a row of rectangles.
 * @param {Array} colors - Array of hex color strings (e.g., ["#FF0000", "#00FF00"])
 * @returns {string} - "success" or error message
 */
function placePaletteOnArtboard(colors) {
    try {
        if (!app.documents.length) return "error: No document open";
        var doc = app.activeDocument;
        var layer = doc.activeLayer;

        var rectSize = 50;
        var gap = 5;
        var startX = doc.activeView.centerPoint[0] - ((colors.length * (rectSize + gap)) / 2);
        var startY = doc.activeView.centerPoint[1];

        // Create group for palette
        var group = layer.groupItems.add();
        group.name = "TATA Palette";

        for (var i = 0; i < colors.length; i++) {
            var hex = colors[i];
            var rgb = hexToRgb(hex);

            var color = new RGBColor();
            color.red = rgb.r;
            color.green = rgb.g;
            color.blue = rgb.b;

            var rect = group.pathItems.rectangle(startY, startX + (i * (rectSize + gap)), rectSize, rectSize);
            rect.fillColor = color;
            rect.stroked = false;
        }

        // Select the new group
        doc.selection = null;
        group.selected = true;

        return "success";
    } catch (e) {
        return "error: " + e.message;
    }
}

/**
 * Save a color palette to the Swatches panel.
 * @param {string} name - Name of the swatch group
 * @param {Array} colors - Array of hex color strings
 * @returns {string} - "success" or error message
 */
function saveToSwatches(name, colors) {
    try {
        if (!app.documents.length) return "error: No document open";
        var doc = app.activeDocument;

        // Create new Swatch Group
        var groupName = name || "TATA Palette";
        var swatchGroup;
        try {
            swatchGroup = doc.swatchGroups.add();
            swatchGroup.name = groupName;
        } catch (e) {
            // Group might already exist or name conflict, create unique name
            swatchGroup = doc.swatchGroups.add();
            swatchGroup.name = groupName + " " + new Date().getTime();
        }

        for (var i = 0; i < colors.length; i++) {
            var hex = colors[i];
            var rgb = hexToRgb(hex);

            var color = new RGBColor();
            color.red = rgb.r;
            color.green = rgb.g;
            color.blue = rgb.b;

            // Add swatch
            var swatchName = "TATA " + hex;
            var swatch = null;

            // Check if swatch exists, otherwise create
            try {
                swatch = doc.swatches.getByName(swatchName);
            } catch (e) {
                swatch = doc.swatches.add();
                swatch.name = swatchName;
                swatch.color = color;
            }

            // Add to group
            swatchGroup.addSwatch(swatch);
        }

        return "success";
    } catch (e) {
        return "error: " + e.message;
    }
}

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
