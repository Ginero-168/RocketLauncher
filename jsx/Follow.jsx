// Follow - Match width and align two objects
// Calls TATA.followWidth() from hostscript.jsx

(function () {
    if (app.documents.length === 0) {
        alert("Please open a document first.");
        return;
    }

    var doc = app.activeDocument;

    if (!doc.selection || doc.selection.length !== 2) {
        alert("Please select exactly 2 objects.");
        return;
    }

    // Call TATA function
    try {
        TATA.followWidth();
    } catch (e) {
        alert("Error: " + e.message);
    }
})();
