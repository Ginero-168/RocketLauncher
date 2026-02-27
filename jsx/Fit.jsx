// Fit - Fit selected objects to active artboard
// Self-contained script - no external dependencies

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

    var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()];
    var abBounds = artboard.artboardRect; // [left, top, right, bottom]
    var abWidth = Math.abs(abBounds[2] - abBounds[0]);
    var abHeight = Math.abs(abBounds[3] - abBounds[1]);

    for (var i = 0; i < doc.selection.length; i++) {
        var item = doc.selection[i];

        if (item.typename === "PathItem" || item.typename === "CompoundPathItem" || item.typename === "GroupItem") {
            item.position = [abBounds[0], abBounds[1]];
            item.width = abWidth;
            item.height = abHeight;
        } else if (item.typename === "PlacedItem" || item.typename === "RasterItem") {
            var ratio = item.height / item.width;
            item.position = [abBounds[0], abBounds[1]];
            item.width = abWidth;
            item.height = abWidth * ratio;
        }
    }
})();
