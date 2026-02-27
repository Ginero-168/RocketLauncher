// Follow - Match width and align two objects
// Self-contained script - no external dependencies

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

    var obj1 = doc.selection[0];
    var obj2 = doc.selection[1];

    // Determine which is on top (visually higher Y = reference)
    var refObj, targetObj;
    if (obj1.top > obj2.top) {
        refObj = obj1;
        targetObj = obj2;
    } else {
        refObj = obj2;
        targetObj = obj1;
    }

    // Scale targetObj to match width of refObj
    if (targetObj.width !== 0 && refObj.width !== 0) {
        var scaleFactor = refObj.width / targetObj.width;

        // Resize
        targetObj.width = refObj.width;
        targetObj.height *= scaleFactor;

        // Align both X and Y to reference object position
        var refCenterX = refObj.left + refObj.width / 2;
        var refCenterY = refObj.top - refObj.height / 2;

        // Move target to same center position as reference (both X and Y)
        targetObj.left = refCenterX - targetObj.width / 2;
        targetObj.top = refCenterY + targetObj.height / 2;
    }
})();
