// Dimension Dialog - Creates dimension labels on artboards
// Size parameter determines the text size of dimension labels

(function () {
    if (app.documents.length === 0) {
        alert("Please open a document first.");
        return;
    }

    var doc = app.activeDocument;

    // Create dialog
    var dialog = new Window('dialog', 'Dimension Tool');
    dialog.alignChildren = 'fill';

    // Size input (for dimension label text size)
    var sizeGroup = dialog.add('group');
    sizeGroup.add('statictext', undefined, 'Label Size % (default 100):');
    var sizeInput = sizeGroup.add('edittext', undefined, '100');
    sizeInput.characters = 10;
    sizeInput.active = true;

    // Name input
    var nameGroup = dialog.add('group');
    nameGroup.add('statictext', undefined, 'Artboard Name (Optional):');
    var nameInput = nameGroup.add('edittext', undefined, '');
    nameInput.characters = 20;

    // All artboards checkbox
    var allArtboardsCheck = dialog.add('checkbox', undefined, 'Apply to All Artboards');
    allArtboardsCheck.value = false;

    // Buttons
    var buttonGroup = dialog.add('group');
    buttonGroup.alignment = 'center';
    var btnOK = buttonGroup.add('button', undefined, 'OK', { name: 'ok' });
    var btnCancel = buttonGroup.add('button', undefined, 'Cancel', { name: 'cancel' });

    if (dialog.show() === 1) {
        var size = parseInt(sizeInput.text);
        var name = String(nameInput.text);
        name = name.replace(/^\s+|\s+$/g, '');
        var applyToAll = allArtboardsCheck.value;

        if (isNaN(size) || size <= 0) {
            size = 100; // Default
        }

        try {
            // TATA is already loaded from hostscript.jsx via init()
            if (applyToAll) {
                // Apply to all artboards
                TATA.dimensionAll({ size: size });
            } else {
                // Apply to single artboard
                TATA.dimensionSingle({ size: size, name: name });
            }

            alert("Dimension labels created!");
        } catch (err) {
            alert("Error: " + err.toString());
        }
    }
})();
