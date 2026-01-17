/**
 * AI Learning Examples for TATA Pro Extension
 * 
 * This file contains working code examples that help AI understand
 * TATA architecture and Illustrator scripting patterns.
 * 
 * These examples are embedded in the AI system prompt for few-shot learning.
 */

// =============================================================================
// EXAMPLE 1: Basic Selection Check and Alert
// =============================================================================
var EXAMPLE_1 = {
    name: "Selection Counter",
    description: "Count and show selected objects",
    code: function () {
        // Always check if document exists first
        if (app.documents.length === 0) {
            alert("Please open a document first.");
            return;
        }

        var doc = app.activeDocument;

        // Check selection before accessing
        if (doc.selection.length === 0) {
            alert("Please select at least one object.");
            return;
        }

        alert("You have selected " + doc.selection.length + " object(s).");
    }
};

// =============================================================================
// EXAMPLE 2: Resize Selected Objects with Error Handling
// =============================================================================
var EXAMPLE_2 = {
    name: "Resize to Width",
    description: "Resize selected objects to specific width maintaining aspect ratio",
    code: function (targetWidth) {
        try {
            if (app.documents.length === 0) {
                throw new Error("No document open");
            }

            var doc = app.activeDocument;

            if (doc.selection.length === 0) {
                throw new Error("No objects selected");
            }

            // Process each selected item
            for (var i = 0; i < doc.selection.length; i++) {
                var item = doc.selection[i];
                var currentWidth = item.width;

                if (currentWidth > 0) {
                    var scale = (targetWidth / currentWidth) * 100;
                    item.resize(scale, scale);
                }
            }

            alert("Resized " + doc.selection.length + " object(s) to " + targetWidth + "px wide.");

        } catch (e) {
            alert("Error: " + e.message);
        }
    }
};

// =============================================================================
// EXAMPLE 3: Using TATA.run() Router Pattern
// =============================================================================
var EXAMPLE_3 = {
    name: "Call TATA Function",
    description: "How to call existing TATA functions via router",
    code: function () {
        // TATA.run is the main router for all TATA functions
        // Syntax: TATA.run(commandName, paramsObject)

        // Example: Fit selection to artboard
        var result = TATA.run('fitSelection', {});

        // Check result
        if (result && result.success) {
            alert("Success: " + result.message);
        } else if (result && result.error) {
            alert("Error: " + result.message);
        }

        // Example: Generate color palette
        var paletteResult = TATA.run('generateColorPalette', { autoClean: true });
    }
};

// =============================================================================
// EXAMPLE 4: Working with Colors using TATAUtils
// =============================================================================
var EXAMPLE_4 = {
    name: "Color Manipulation",
    description: "Convert and apply colors using utility functions",
    code: function () {
        if (app.documents.length === 0 || app.activeDocument.selection.length === 0) {
            alert("Please select objects first.");
            return;
        }

        var doc = app.activeDocument;
        var selection = doc.selection;

        // Use TATAUtils for color conversion
        // Hex to RGB
        var rgbColor = TATAUtils.hexToRGB("#FF5733");

        // Create Illustrator color
        var newColor = new RGBColor();
        newColor.red = rgbColor.r;
        newColor.green = rgbColor.g;
        newColor.blue = rgbColor.b;

        // Apply to selected objects
        for (var i = 0; i < selection.length; i++) {
            if (selection[i].typename === "PathItem") {
                selection[i].fillColor = newColor;
            }
        }
    }
};

// =============================================================================
// EXAMPLE 5: Creating New Objects with Proper Layer Management
// =============================================================================
var EXAMPLE_5 = {
    name: "Create Rectangle on Layer",
    description: "Create objects on specific layers properly",
    code: function () {
        if (app.documents.length === 0) {
            alert("Please open a document first.");
            return;
        }

        var doc = app.activeDocument;

        // Get or create layer using TATAUtils
        var targetLayer = TATAUtils.getOrCreateLayer(doc, "Generated Objects");

        // Create rectangle
        var rect = targetLayer.pathItems.rectangle(
            100,  // top
            100,  // left
            200,  // width
            150   // height
        );

        // Set fill color
        var fillColor = new RGBColor();
        fillColor.red = 100;
        fillColor.green = 150;
        fillColor.blue = 255;
        rect.fillColor = fillColor;

        // No stroke
        rect.stroked = false;

        alert("Created rectangle on layer: " + targetLayer.name);
    }
};

// =============================================================================
// EXAMPLE 6: Safe Iteration with Error Handling
// =============================================================================
var EXAMPLE_6 = {
    name: "Safe Object Processing",
    description: "Process objects safely with try-catch per item",
    code: function () {
        if (app.documents.length === 0 || app.activeDocument.selection.length === 0) {
            alert("Please select objects first.");
            return;
        }

        var doc = app.activeDocument;
        var selection = doc.selection;
        var successCount = 0;
        var failCount = 0;

        for (var i = 0; i < selection.length; i++) {
            try {
                var item = selection[i];

                // Example: Move object to specific position
                item.position = [100, 100];
                successCount++;

            } catch (e) {
                // Continue processing even if one fails
                failCount++;
            }
        }

        alert("Processed: " + successCount + " success, " + failCount + " failed");
    }
};

// =============================================================================
// EXAMPLE 7: Working with Groups
// =============================================================================
var EXAMPLE_7 = {
    name: "Ungroup All",
    description: "Recursively ungroup selected groups",
    code: function () {
        if (app.documents.length === 0 || app.activeDocument.selection.length === 0) {
            alert("Please select groups first.");
            return;
        }

        var doc = app.activeDocument;
        var selection = doc.selection;

        function ungroupItem(item) {
            if (item.typename === "GroupItem") {
                // Get all items in group
                var items = [];
                for (var i = 0; i < item.pageItems.length; i++) {
                    items.push(item.pageItems[i]);
                }

                // Move items to parent
                var parent = item.parent;
                for (var j = 0; j < items.length; j++) {
                    items[j].move(parent, ElementPlacement.PLACEATEND);
                }

                // Remove empty group
                item.remove();
            }
        }

        for (var i = selection.length - 1; i >= 0; i--) {
            ungroupItem(selection[i]);
        }

        alert("Ungrouped selected items.");
    }
};

// =============================================================================
// EXAMPLE 8: Using ErrorHandler for Undo Support
// =============================================================================
var EXAMPLE_8 = {
    name: "With Undo Group",
    description: "Wrap operations in undo group for better UX",
    code: function () {
        // Use ErrorHandler.withUndoGroup instead of app.beginUndoGroup
        var result = ErrorHandler.withUndoGroup("My Operation", function () {
            if (app.documents.length === 0) {
                throw new Error("No document open");
            }

            var doc = app.activeDocument;

            // Do multiple operations
            // All will be undoable as one action
            for (var i = 0; i < doc.selection.length; i++) {
                doc.selection[i].rotate(45);
            }

            return { success: true, message: "Rotated objects" };
        });

        if (result.success) {
            alert(result.message);
        } else {
            alert("Error: " + result.message);
        }
    }
};

// =============================================================================
// COMMON PATTERNS REFERENCE
// =============================================================================
var COMMON_PATTERNS = {

    // Always check documents first
    documentCheck: "if (app.documents.length === 0) { alert('No document'); return; }",

    // Selection check
    selectionCheck: "if (doc.selection.length === 0) { alert('Nothing selected'); return; }",

    // Safe color creation (RGB)
    createRGBColor: function (r, g, b) {
        var color = new RGBColor();
        color.red = r;
        color.green = g;
        color.blue = b;
        return color;
    },

    // Safe color creation (CMYK)
    createCMYKColor: function (c, m, y, k) {
        var color = new CMYKColor();
        color.cyan = c;
        color.magenta = m;
        color.yellow = y;
        color.black = k;
        return color;
    },

    // Iterate selection safely
    iterateSelection: function (callback) {
        if (app.documents.length === 0 || app.activeDocument.selection.length === 0) {
            return;
        }
        var sel = app.activeDocument.selection;
        for (var i = 0; i < sel.length; i++) {
            try {
                callback(sel[i], i);
            } catch (e) {
                // Continue on error
            }
        }
    }
};

// =============================================================================
// AVAILABLE TATA COMMANDS (for AI reference)
// =============================================================================
var TATA_COMMANDS = {
    // Swift Tools
    "fitSelection": "Fit selected objects to active artboard",
    "followWidth": "Match width and align two selected objects",
    "embedAll": "Embed all linked images in document",
    "createPreview": "Create preview artboard",
    "createStars": "Generate star variations",
    "generateColorPalette": "Analyze colors from selection",

    // Dimension
    "dimensionSingle": "Add dimension label to one artboard",
    "dimensionAll": "Add dimension labels to all artboards",

    // Clean
    "quickClean": "Quick cleanup (remove stray points, empty text)",
    "smartClean": "Advanced cleanup with options",

    // Symbols
    "createSymbols": "Convert selection to symbols",

    // Effects
    "applyEffect": "Apply effect preset",
    "manageAppearance": "Manage appearance attributes",
    "setBlendMode": "Set blend mode for selection"
};

/**
 * Export all examples as formatted string for AI prompt
 */
function getExamplesForPrompt() {
    var examples = [EXAMPLE_1, EXAMPLE_2, EXAMPLE_3, EXAMPLE_4, EXAMPLE_5, EXAMPLE_6, EXAMPLE_7, EXAMPLE_8];
    var output = "";

    for (var i = 0; i < examples.length; i++) {
        var ex = examples[i];
        output += "EXAMPLE " + (i + 1) + ": " + ex.name + "\n";
        output += "// " + ex.description + "\n";
        output += ex.code.toString() + "\n\n";
    }

    return output;
}
