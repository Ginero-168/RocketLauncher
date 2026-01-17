// Preview - Create preview artboard
// Calls TATA.createPreview() from hostscript.jsx

(function () {
    if (app.documents.length === 0) {
        alert("Please open a document first.");
        return;
    }

    // Call TATA function
    try {
        TATA.createPreview();
    } catch (e) {
        alert("Error: " + e.message);
    }
})();
