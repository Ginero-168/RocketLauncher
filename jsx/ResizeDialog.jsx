// Resize Dialog - Native Illustrator Dialog
// Resizes selected objects to specified width

(function () {
    if (app.documents.length === 0 || app.activeDocument.selection.length === 0) {
        alert("Please select objects first.");
        return;
    }

    var doc = app.activeDocument;

    // Create dialog
    var dialog = new Window('dialog', 'Resize Objects');
    dialog.alignChildren = 'fill';

    // Width input
    var widthGroup = dialog.add('group');
    widthGroup.add('statictext', undefined, 'Width (px):');
    var widthInput = widthGroup.add('edittext', undefined, '100');
    widthInput.characters = 10;

    // Buttons
    var buttonGroup = dialog.add('group');
    buttonGroup.alignment = 'center';
    var btnOK = buttonGroup.add('button', undefined, 'OK', { name: 'ok' });
    var btnCancel = buttonGroup.add('button', undefined, 'Cancel', { name: 'cancel' });

    if (dialog.show() === 1) {
        var targetWidth = parseFloat(widthInput.text);

        if (isNaN(targetWidth) || targetWidth <= 0) {
            alert("Please enter a valid width.");
            return;
        }

        var selection = doc.selection;
        var resized = 0;

        for (var i = 0; i < selection.length; i++) {
            var item = selection[i];

            try {
                var currentWidth = item.width;
                if (currentWidth > 0) {
                    var scale = (targetWidth / currentWidth) * 100;
                    item.resize(scale, scale);
                    resized++;
                }
            } catch (e) {
                // Skip items that can't be resized
            }
        }

        alert("Resized " + resized + " objects to " + targetWidth + "px width.");
    }
})();
