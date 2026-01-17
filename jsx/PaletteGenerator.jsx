// Palette Generator - Generate color palette from selection
// Calls TATA.generateColorPalette() from hostscript.jsx

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

    // Call TATA function
    try {
        TATA.generateColorPalette();
    } catch (e) {
        alert("Error: " + e.message);
    }
})();
