// Stars - Create star variations
// Calls TATA.createStars() from hostscript.jsx

(function () {
    if (app.documents.length === 0) {
        alert("Please open a document first.");
        return;
    }

    // Call TATA function
    try {
        TATA.createStars();
    } catch (e) {
        alert("Error: " + e.message);
    }
})();
