// Arrange Dialog - Native Illustrator Dialog
// Arranges selected objects in a grid

(function () {
    if (app.documents.length === 0 || app.activeDocument.selection.length === 0) {
        alert("Please select objects first.");
        return;
    }

    var doc = app.activeDocument;

    // ===== Flow Params Guard =====
    if (typeof params !== 'undefined' && params) {
        var cols = parseInt(params.cols) || 5;
        var gap = parseFloat(params.gap) || 20;

        var selection = doc.selection;
        var x = 0, y = 0, maxHeight = 0, col = 0;
        for (var i = 0; i < selection.length; i++) {
            var item = selection[i];
            item.left = x;
            item.top = y;
            if (item.height > maxHeight) maxHeight = item.height;
            col++;
            if (col >= cols) { col = 0; x = 0; y -= (maxHeight + gap); maxHeight = 0; }
            else { x += item.width + gap; }
        }
        return "Arranged " + selection.length + " objects";
    }
    // ===== End Flow Params Guard =====

    // Create dialog
    var dialog = new Window('dialog', 'Arrange Objects');
    dialog.alignChildren = 'fill';

    // Columns input
    var colsGroup = dialog.add('group');
    colsGroup.add('statictext', undefined, 'Columns:');
    var colsInput = colsGroup.add('edittext', undefined, '5');
    colsInput.characters = 10;

    // Gap input
    var gapGroup = dialog.add('group');
    gapGroup.add('statictext', undefined, 'Gap (px):');
    var gapInput = gapGroup.add('edittext', undefined, '20');
    gapInput.characters = 10;

    // Buttons
    var buttonGroup = dialog.add('group');
    buttonGroup.alignment = 'center';
    var btnOK = buttonGroup.add('button', undefined, 'OK', { name: 'ok' });
    var btnCancel = buttonGroup.add('button', undefined, 'Cancel', { name: 'cancel' });

    if (dialog.show() === 1) {
        var cols = parseInt(colsInput.text);
        var gap = parseFloat(gapInput.text);

        if (isNaN(cols) || cols <= 0) {
            alert("Please enter a valid number of columns.");
            return;
        }

        if (isNaN(gap)) {
            alert("Please enter a valid gap value.");
            return;
        }

        var selection = doc.selection;
        var x = 0;
        var y = 0;
        var maxHeight = 0;
        var col = 0;

        for (var i = 0; i < selection.length; i++) {
            var item = selection[i];

            // Move item
            item.left = x;
            item.top = y;

            // Track max height in this row
            if (item.height > maxHeight) {
                maxHeight = item.height;
            }

            col++;

            if (col >= cols) {
                // New row
                col = 0;
                x = 0;
                y -= (maxHeight + gap);
                maxHeight = 0;
            } else {
                // Next column
                x += item.width + gap;
            }
        }

        alert("Arranged " + selection.length + " objects in " + cols + " columns.");
    }
})();
