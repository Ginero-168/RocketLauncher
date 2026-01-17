// Embed - Embed all linked images
// Calls TATA.embedAll() from hostscript.jsx

(function () {
    if (app.documents.length === 0) {
        alert("Please open a document first.");
        return;
    }

    // Call TATA function
    try {
        TATA.embedAll();
    } catch (e) {
        alert("Error: " + e.message);
    }
})();
