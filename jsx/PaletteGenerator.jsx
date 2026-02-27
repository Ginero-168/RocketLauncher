// Palette Generator - Generate color palette from selection
// Self-contained script - no external dependencies

(function () {
    if (app.documents.length === 0) {
        alert("Please open a document first.");
        return;
    }

    var doc = app.activeDocument;

    if (!doc.selection || doc.selection.length === 0) {
        alert("Please select objects to analyze colors.");
        return;
    }

    // ========== Color Utility Functions ==========

    function toRGB(c) {
        var rgb = new RGBColor();
        if (!c) { rgb.red = 128; rgb.green = 128; rgb.blue = 128; return rgb; }
        if (c.typename == "RGBColor") { rgb.red = c.red; rgb.green = c.green; rgb.blue = c.blue; }
        else if (c.typename == "CMYKColor") {
            rgb.red = Math.round(255 * (1 - c.cyan / 100) * (1 - c.black / 100));
            rgb.green = Math.round(255 * (1 - c.magenta / 100) * (1 - c.black / 100));
            rgb.blue = Math.round(255 * (1 - c.yellow / 100) * (1 - c.black / 100));
        } else if (c.typename == "GrayColor") {
            var v = Math.round(255 * (1 - c.gray / 100)); rgb.red = v; rgb.green = v; rgb.blue = v;
        } else if (c.typename == "SpotColor") {
            return toRGB(c.spot.color);
        }
        return rgb;
    }

    function rgbToHex(rgb) {
        function toHex(n) { var h = Math.round(n).toString(16).toUpperCase(); return h.length == 1 ? "0" + h : h; }
        return "#" + toHex(rgb.red) + toHex(rgb.green) + toHex(rgb.blue);
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, v = max, d = max - min;
        s = max === 0 ? 0 : d / max;
        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s, v: v };
    }

    function colorKey(c) {
        if (!c) return null;
        if (c.typename === "RGBColor") return "R" + c.red + "G" + c.green + "B" + c.blue;
        if (c.typename === "CMYKColor") return "C" + c.cyan + "M" + c.magenta + "Y" + c.yellow + "K" + c.black;
        if (c.typename === "GrayColor") return "G" + c.gray;
        if (c.typename === "SpotColor") return "S" + c.spot.name + ":" + (c.tint || 100);
        return null;
    }

    function copyColor(c) {
        if (c.typename === "RGBColor") {
            var nc = new RGBColor();
            nc.red = c.red; nc.green = c.green; nc.blue = c.blue;
            return nc;
        }
        if (c.typename === "CMYKColor") {
            var cc = new CMYKColor();
            cc.cyan = c.cyan; cc.magenta = c.magenta; cc.yellow = c.yellow; cc.black = c.black;
            return cc;
        }
        if (c.typename === "GrayColor") {
            var gc = new GrayColor();
            gc.gray = c.gray;
            return gc;
        }
        if (c.typename === "SpotColor") {
            var sc = new SpotColor();
            sc.spot = c.spot; sc.tint = c.tint;
            return sc;
        }
        return null;
    }

    // ========== Collection Functions ==========

    function collectColorsFromSelection(sel) {
        var found = [], seen = {};

        function pushColor(c) {
            if (!c || !c.typename) return;
            var key = colorKey(c);
            if (!key || seen[key]) return;
            seen[key] = true;
            found.push(copyColor(c));
        }

        function walk(it) {
            if (!it) return;
            switch (it.typename) {
                case "PathItem":
                    if (it.filled) pushColor(it.fillColor);
                    if (it.stroked) pushColor(it.strokeColor);
                    break;
                case "CompoundPathItem":
                    for (var k = 0; k < it.pathItems.length; k++) walk(it.pathItems[k]);
                    break;
                case "GroupItem":
                    for (var g = 0; g < it.pageItems.length; g++) walk(it.pageItems[g]);
                    break;
                case "TextFrame":
                    try {
                        var ca = it.textRange.characterAttributes;
                        pushColor(ca.fillColor);
                        pushColor(ca.strokeColor);
                    } catch (e) { }
                    break;
            }
        }

        for (var i = 0; i < sel.length; i++) walk(sel[i]);
        return found;
    }

    // ========== Swatch Group Functions ==========

    function makeSwatchGroupFromColors(doc, colors, name) {
        var sg = doc.swatchGroups.add();
        sg.name = name;
        for (var i = 0; i < colors.length; i++) {
            try {
                var sw = doc.swatches.add();
                sw.color = colors[i];
                sg.addSwatch(sw);
            } catch (e) { }
        }
        return sg;
    }

    function deleteSwatchGroup(sg) {
        try { sg.remove(); } catch (e) { }
    }

    function groupColorsByTone6(doc, swGroup) {
        var all = (typeof swGroup.getAllSwatches === "function") ? swGroup.getAllSwatches() : swGroup.swatches;
        var buckets = { Red: [], Yellow: [], Green: [], Blue: [], White: [], Black: [] };

        for (var i = 0; i < all.length; i++) {
            var sw = all[i];
            if (!sw.color) continue;
            var rgb = toRGB(sw.color);
            var hsv = rgbToHsv(rgb.red, rgb.green, rgb.blue);
            var tone = null;

            if (hsv.v < 0.25) tone = "Black";
            else if (hsv.s < 0.15 && hsv.v > 0.85) tone = "White";
            else if (hsv.h < 15 || hsv.h >= 345) tone = "Red";
            else if (hsv.h >= 35 && hsv.h < 85) tone = "Yellow";
            else if (hsv.h >= 85 && hsv.h < 165) tone = "Green";
            else if (hsv.h >= 195 && hsv.h < 260) tone = "Blue";

            if (tone) buckets[tone].push(sw);
        }

        var order = ["Red", "Yellow", "Green", "Blue", "White", "Black"];
        var out = [];
        for (var n = 0; n < order.length; n++) {
            var name = order[n];
            if (buckets[name].length > 0) {
                var sg = doc.swatchGroups.add();
                sg.name = name;
                for (var j = 0; j < buckets[name].length; j++) {
                    try { sg.addSwatch(buckets[name][j]); } catch (e) { }
                }
                out.push(sg);
            }
        }
        return out;
    }

    // ========== Area Computation Functions ==========

    function computeColorAreasFromSelection(doc, swatchGroup, sel) {
        var target = (typeof swatchGroup.getAllSwatches === "function") ? swatchGroup.getAllSwatches() : swatchGroup.swatches;
        var map = {};
        if (!sel) sel = doc.selection;

        for (var i = 0; i < target.length; i++) {
            var sw = target[i], k = colorKey(sw.color);
            if (k) map[k] = { sw: sw, area: 0 };
        }

        function walk(it) {
            if (!it || it.guides || it.hidden) return;
            if (it.typename == "PathItem" && it.filled) {
                var k = colorKey(it.fillColor);
                if (map[k]) map[k].area += Math.abs(it.area);
            } else if (it.typename == "GroupItem") {
                for (var g = 0; g < it.pageItems.length; g++) walk(it.pageItems[g]);
            } else if (it.typename == "CompoundPathItem") {
                for (var p = 0; p < it.pathItems.length; p++) walk(it.pathItems[p]);
            }
        }

        for (var s = 0; s < sel.length; s++) walk(sel[s]);

        var total = 0;
        for (var k in map) total += map[k].area;

        var rows = [];
        for (var k2 in map) {
            var a = map[k2];
            if (a.area > 0) {
                rows.push({
                    swatch: a.sw,
                    areaPt2: a.area,
                    percent: (total > 0 ? a.area / total * 100 : 0)
                });
            }
        }
        rows.sort(function (a, b) { return b.areaPt2 - a.areaPt2; });
        return { rows: rows, totalPt2: total };
    }

    function computeAllColorAreasFromSelection(doc, sel) {
        var map = {};

        function walk(it) {
            if (!it || it.guides || it.hidden) return;
            if (it.typename == "PathItem" && it.filled) {
                var rgb = toRGB(it.fillColor);
                var key = "R" + Math.round(rgb.red) + "G" + Math.round(rgb.green) + "B" + Math.round(rgb.blue);
                if (!map[key]) map[key] = { rgb: rgb, area: 0 };
                try { map[key].area += Math.abs(it.area); } catch (e) { }
            } else if (it.typename == "GroupItem") {
                for (var g = 0; g < it.pageItems.length; g++) walk(it.pageItems[g]);
            } else if (it.typename == "CompoundPathItem") {
                for (var p = 0; p < it.pathItems.length; p++) walk(it.pathItems[p]);
            }
        }

        for (var s = 0; s < sel.length; s++) walk(sel[s]);

        var total = 0;
        for (var k in map) total += map[k].area;

        var rows = [];
        for (var k2 in map) {
            var rec = map[k2];
            rows.push({
                rgb: rec.rgb,
                areaPt2: rec.area,
                percent: (total > 0 ? rec.area / total * 100 : 0)
            });
        }
        rows.sort(function (a, b) { return b.areaPt2 - a.areaPt2; });
        return { rows: rows, totalPt2: total };
    }

    // ========== Drawing Functions ==========

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

    function drawTitle(doc, text, x, y, size) {
        var t = doc.activeLayer.textFrames.add();
        t.contents = text;
        t.position = [x, y];
        t.textRange.characterAttributes.size = size;
        return t;
    }

    function drawSummaryCircles(doc, list, x, y, d, spacing, labelSize, labelMode) {
        var L = doc.activeLayer, r = d / 2;
        var created = [];

        for (var i = 0; i < list.length; i++) {
            var c = list[i].rgb;
            var cx = x + r;
            var cy = y - i * (d + spacing) - r;

            var circle = L.pathItems.ellipse(cy + r, cx - r, d, d);
            var rgb = new RGBColor();
            rgb.red = c.red; rgb.green = c.green; rgb.blue = c.blue;
            circle.fillColor = rgb;
            circle.stroked = false;

            var label = L.textFrames.add();
            var hex = rgbToHex(c);

            if (labelMode === "group") {
                var name = list[i].groupName || "";
                label.contents = name + "  " + hex;
            } else {
                var pct = (list[i].topArea / list[i].totalArea) * 100;
                label.contents = "(" + pct.toFixed(1) + "%)  " + hex;

                try {
                    var txt = label.contents;
                    if (txt && txt.length > 0) {
                        var lp = txt.indexOf("(");
                        var rp = txt.indexOf(")");
                        if (lp >= 0 && rp > lp && label.textRange && label.textRange.characters && label.textRange.characters.length > rp) {
                            var chars = label.textRange.characters;
                            for (var idx = lp; idx <= rp && idx < chars.length; idx++) {
                                try {
                                    chars[idx].characterAttributes.fauxBold = true;
                                } catch (charErr) { }
                            }
                        }
                    }
                } catch (e) { }
            }

            label.position = [x + d + 10, cy];
            label.textRange.characterAttributes.size = labelSize;
            created.push(circle);
            created.push(label);
        }
        return created;
    }

    function moveAllToGroup(items, group) {
        for (var i = 0; i < items.length; i++) {
            items[i].moveToEnd(group);
        }
    }

    // ========== Recursive Flatten Helper ==========

    function flattenItems(collection) {
        var flat = [];
        var stack = [];
        for (var i = 0; i < collection.length; i++) stack.push(collection[i]);

        var safety = 0;
        while (stack.length > 0 && safety < 5000) {
            var item = stack.shift();
            if (item.typename === "GroupItem") {
                var childList = [];
                for (var j = 0; j < item.pageItems.length; j++) {
                    childList.push(item.pageItems[j]);
                }
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

    // ========== Main Palette Generation Logic ==========

    try {
        // 1. Capture Originals
        var originals = [];
        for (var i = 0; i < doc.selection.length; i++) originals.push(doc.selection[i]);

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
        var itemsToProcess = flattenItems(workingItems);

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
                        var expandedChildren = flattenItems([expandedGroup]);
                        for (var e = 0; e < expandedChildren.length; e++) finalItems.push(expandedChildren[e]);
                    }
                } else {
                    finalItems.push(item);
                }
            } catch (e) { finalItems.push(item); }
        }

        // 4. Generate Palette
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

        var colors = collectColorsFromSelection(finalItems);
        if (!colors.length) {
            // Cleanup
            for (var i = 0; i < finalItems.length; i++) { try { finalItems[i].remove(); } catch (e) { } }
            for (var i = 0; i < originals.length; i++) { try { originals[i].selected = true; } catch (e) { } }
            restoreAndLock(doc, prevActiveLayer, colorLayer);
            alert("No colors found in selection.");
            return;
        }

        var masterGroup = makeSwatchGroupFromColors(doc, colors, "TempColorGroup");
        var toneGroups = groupColorsByTone6(doc, masterGroup);
        var primaryList = [];
        var fillers = [];

        for (var i = 0; i < toneGroups.length; i++) {
            var tg = toneGroups[i];
            var areaData = computeColorAreasFromSelection(doc, tg, finalItems);
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

        var overall = computeAllColorAreasFromSelection(doc, finalItems);
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

        // 5. Cleanup working copies
        for (var i = 0; i < finalItems.length; i++) { try { finalItems[i].remove(); } catch (e) { } }
        for (var i = 0; i < originals.length; i++) { try { originals[i].selected = true; } catch (e) { } }

    } catch (err) {
        alert("Error generating palette: " + err.message);
    }
})();
