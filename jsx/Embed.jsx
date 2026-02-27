// Embed - Embed all linked images in the document
// Self-contained script - no external dependencies

(function () {
    if (app.documents.length === 0) {
        alert("Please open a document first.");
        return;
    }

    var doc = app.activeDocument;
    var count = 0;

    // Reverse loop required for live collection modification
    for (var i = doc.placedItems.length - 1; i >= 0; i--) {
        try {
            doc.placedItems[i].embed();
            count++;
        } catch (e) { }
    }

    if (count > 0) {
        alert("Embedded " + count + " items.");
    } else {
        alert("No linked images found to embed.");
    }
})();
