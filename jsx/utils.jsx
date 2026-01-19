// TATA Utilities Module
// Shared utility functions extracted from hostscript.jsx
// Version: 2.1 - Enhanced with comprehensive utilities

// JSON Polyfill
if (typeof JSON !== 'object') { JSON = {}; }
if (!JSON.parse) { JSON.parse = function (s) { return eval('(' + s + ')'); }; }
if (!JSON.stringify) {
    JSON.stringify = function (o) {
        if (o === null) return 'null';
        if (typeof o === 'number') return isFinite(o) ? String(o) : 'null';
        if (typeof o === 'boolean') return String(o);
        if (typeof o === 'object') {
            if (o instanceof Array) {
                var res = '['; for (var i = 0; i < o.length; i++) res += (i > 0 ? ',' : '') + JSON.stringify(o[i]); return res + ']';
            }
            var arr = []; for (var k in o) { if (o.hasOwnProperty(k)) arr.push('"' + k + '":' + JSON.stringify(o[k])); } return '{' + arr.join(',') + '}';
        }
        return '"' + String(o) + '"';
    };
}

// ====================================================================================
// ====================================   LAYER MANAGEMENT   ==========================
// ====================================================================================

/**
 * Get layer by name or create if doesn't exist
 * @param {Document} doc - The Illustrator document
 * @param {string} name - Layer name
 * @returns {Layer} The layer object
 */
function getLayerByName(doc, name) {
    try {
        return doc.layers.getByName(name);
    } catch (e) {
        var layer = doc.layers.add();
        layer.name = name;
        return layer;
    }
}

/**
 * Get or create a layer by name and ensure it's unlocked and visible
 * @param {Document} doc - The Illustrator document
 * @param {string} name - Layer name
 * @returns {Layer} The layer object
 */
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

/**
 * Restore active layer and lock target layer
 * @param {Document} doc - The Illustrator document
 * @param {Layer} prevActiveLayer - Previous active layer to restore
 * @param {Layer} targetLayer - Layer to lock
 */
function restoreAndLock(doc, prevActiveLayer, targetLayer) {
    try { doc.activeLayer = prevActiveLayer; } catch (e) { }
    try { targetLayer.locked = true; } catch (e) { }
}

/**
 * Group all items in a layer
 * @param {Document} doc - The Illustrator document
 * @param {string} layerName - Name of layer to group
 * @param {Array} excludes - Array of item names to exclude
 */
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

// ====================================================================================
// ====================================   COLOR UTILITIES   ===========================
// ====================================================================================

/**
 * Convert hex color to RGB values
 * @param {string} hex - Hex color string (e.g., "#FF0000")
 * @returns {Object} Object with r, g, b properties
 */
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return { r: r, g: g, b: b };
}

/**
 * Convert hex color to CMYK values
 * @param {string} hex - Hex color string
 * @returns {Object} Object with c, m, y, k properties
 */
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

/**
 * Convert any color to RGB
 * @param {Color} c - Illustrator color object
 * @returns {RGBColor} RGB color object
 */
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

/**
 * Convert RGB to hex string
 * @param {Object} rgb - Object with red, green, blue properties
 * @returns {string} Hex color string
 */
function rgbToHex(rgb) {
    function toHex(n) { var h = Math.round(n).toString(16).toUpperCase(); return h.length == 1 ? "0" + h : h; }
    return "#" + toHex(rgb.red) + toHex(rgb.green) + toHex(rgb.blue);
}

/**
 * Convert RGB to HSV
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {Object} Object with h, s, v properties
 */
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

/**
 * Apply color to object based on document color mode
 * @param {Document} doc - The Illustrator document
 * @param {Object} cm - The object to color
 * @param {string} hex - Hex color string
 * @param {number} type - 1=text fill, 2=fill, 3=stroke
 */
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

/**
 * Generate unique key for color
 * @param {Color} c - Illustrator color object
 * @returns {string|null} Color key string
 */
function colorKey(c) {
    if (!c) return null;
    if (c.typename === "RGBColor") return "R" + c.red + "G" + c.green + "B" + c.blue;
    if (c.typename === "CMYKColor") return "C" + c.cyan + "M" + c.magenta + "Y" + c.yellow + "K" + c.black;
    if (c.typename === "GrayColor") return "G" + c.gray;
    if (c.typename === "SpotColor") return "S" + c.spot.name + ":" + (c.tint || 100);
    return null;
}

/**
 * Copy color object
 * @param {Color} c - Illustrator color object
 * @returns {Color} Copied color object
 */
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

/**
 * Collect all unique colors from selection
 * @param {Array} sel - Array of selected items
 * @returns {Array} Array of unique colors
 */
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

// ====================================================================================
// ====================================   SWATCH UTILITIES   ==========================
// ====================================================================================

/**
 * Create swatch group from colors
 * @param {Document} doc - The Illustrator document
 * @param {Array} colors - Array of color objects
 * @param {string} name - Name for the swatch group
 * @returns {SwatchGroup} Created swatch group
 */
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

/**
 * Delete swatch group
 * @param {SwatchGroup} sg - Swatch group to delete
 */
function deleteSwatchGroup(sg) {
    try { sg.remove(); } catch (e) { }
}

/**
 * Group colors by tone
 * @param {Document} doc - The Illustrator document
 * @param {SwatchGroup} swGroup - Swatch group to process
 * @returns {Array} Array of tone-based swatch groups
 */
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

// ====================================================================================
// ====================================   AREA COMPUTATION   ==========================
// ====================================================================================

/**
 * Compute color areas from selection
 * @param {Document} doc - The Illustrator document
 * @param {SwatchGroup} swatchGroup - Swatch group to analyze
 * @param {Array} sel - Selection to analyze
 * @returns {Object} Object with rows and totalPt2 properties
 */
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

/**
 * Compute all color areas from selection
 * @param {Document} doc - The Illustrator document
 * @param {Array} sel - Selection to analyze
 * @returns {Object} Object with rows and totalPt2 properties
 */
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

// ====================================================================================
// ====================================   DRAWING UTILITIES   =========================
// ====================================================================================

/**
 * Create dimension line with arrows
 * @param {Document} doc - The Illustrator document
 * @param {Array} startPoint - [x, y] coordinates
 * @param {Array} endPoint - [x, y] coordinates
 * @param {number} arrowSize - Size of arrows
 * @param {string} orientation - 'horizontal' or 'vertical'
 * @param {number} dimDist - Distance for dimension line
 */
function createDimensionLine(doc, startPoint, endPoint, arrowSize, orientation, dimDist) {
    // Main line
    var line = doc.pathItems.add();
    line.setEntirePath([startPoint, endPoint]);
    line.stroked = true;
    line.filled = false;
    selectColorMode(doc, line, '#FFFFFF', 3);
    line.strokeWidth = arrowSize / 4;

    // Extension lines and arrows
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

/**
 * Create arrow polygon
 * @param {Document} doc - The Illustrator document
 * @param {Array} position - [x, y] coordinates
 * @param {number} size - Arrow size
 * @param {number} angle - Rotation angle
 */
function createArrow(doc, position, size, angle) {
    var arrow = doc.pathItems.polygon(position[0], position[1], size, 3);
    arrow.rotate(angle);
    arrow.stroked = false;
    arrow.filled = true;
    selectColorMode(doc, arrow, '#FFFFFF', 2);
}

/**
 * Draw title text
 * @param {Document} doc - The Illustrator document
 * @param {string} text - Text content
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} size - Font size
 * @returns {TextFrame} Created text frame
 */
function drawTitle(doc, text, x, y, size) {
    var t = doc.activeLayer.textFrames.add();
    t.contents = text;
    t.position = [x, y];
    t.textRange.characterAttributes.size = size;
    return t;
}

/**
 * Draw summary circles with labels
 * @param {Document} doc - The Illustrator document
 * @param {Array} list - Array of color data objects
 * @param {number} x - Starting X position
 * @param {number} y - Starting Y position
 * @param {number} d - Circle diameter
 * @param {number} spacing - Vertical spacing
 * @param {number} labelSize - Label font size
 * @param {string} labelMode - 'group' or 'percent'
 * @returns {Array} Array of created items
 */
function drawSummaryCircles(doc, list, x, y, d, spacing, labelSize, labelMode) {
    var L = doc.activeLayer, r = d / 2;
    var created = [];

    for (var i = 0; i < list.length; i++) {
        var c = list[i].rgb;
        var cx = x + r;
        var cy = y - i * (d + spacing) - r;

        // Circle
        var circle = L.pathItems.ellipse(cy + r, cx - r, d, d);
        var rgb = new RGBColor();
        rgb.red = c.red; rgb.green = c.green; rgb.blue = c.blue;
        circle.fillColor = rgb;
        circle.stroked = false;

        // Label
        var label = L.textFrames.add();
        var hex = rgbToHex(c);

        if (labelMode === "group") {
            var name = list[i].groupName || "";
            label.contents = name + "  " + hex;
        } else {
            var pct = (list[i].topArea / list[i].totalArea) * 100;
            label.contents = "(" + pct.toFixed(1) + "%)  " + hex;

            // Bold the percentage - with proper validation
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

/**
 * Move all items to group
 * @param {Array} items - Array of page items
 * @param {GroupItem} group - Target group
 */
function moveAllToGroup(items, group) {
    for (var i = 0; i < items.length; i++) {
        items[i].moveToEnd(group);
    }
}
