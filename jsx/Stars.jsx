// Stars - Create star variations grid
// Self-contained script - no external dependencies

(function () {
    if (app.documents.length === 0) {
        alert("Please open a document first.");
        return;
    }

    var doc = app.activeDocument;
    var xStart = 0, yStart = 0, r = 60, gap = 160;
    var counts = [3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 36, 60, 90, 120];
    var depths = [0.2, 0.3, 0.5, 0.7, 0.85];

    for (var i = 0; i < counts.length; i++) {
        for (var j = 0; j < depths.length; j++) {
            try {
                doc.pathItems.star(xStart + j * gap, yStart - i * gap, r, r * depths[j], counts[i]);
            } catch (e) { }
        }
    }
})();
