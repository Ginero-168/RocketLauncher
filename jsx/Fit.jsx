// Fit - Fit selected objects to active artboard
// Calls TATA.fitSelection() from hostscript.jsx

(function () {
    if (app.documents.length === 0) {
        alert("Please open a document first.");
        return;
    }

    var doc = app.activeDocument;

    if (!doc.selection || doc.selection.length === 0) {
        alert("Please select at least one object.");
        return;
    }

    // Call TATA function
    try {
        TATA.fitSelection();
    } catch (e) {
        alert("Error: " + e.message);
    }
})();
