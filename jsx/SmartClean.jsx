// Smart Clean - Native Illustrator Dialog
// Replaces HTML modal with ScriptUI dialog

(function () {
    if (app.documents.length === 0) {
        alert("Please open a document first.");
        return;
    }

    var doc = app.activeDocument;

    // Create dialog
    var dialog = new Window('dialog', 'Smart Clean');
    dialog.alignChildren = 'fill';

    // Title
    var titleGroup = dialog.add('group');
    titleGroup.add('statictext', undefined, 'Select items to clean from your document:');

    // Checkboxes
    var checkStray = dialog.add('checkbox', undefined, 'Remove Stray Anchor Points');
    checkStray.value = true;

    var checkEmpty = dialog.add('checkbox', undefined, 'Remove Empty Text Frames');
    checkEmpty.value = true;

    var checkOutline = dialog.add('checkbox', undefined, 'Convert All Text to Outlines');
    checkOutline.value = false;

    var checkUnlock = dialog.add('checkbox', undefined, 'Unlock All Locked Objects');
    checkUnlock.value = false;

    // Scan results area
    var resultsGroup = dialog.add('panel', undefined, 'Scan Results');
    resultsGroup.alignChildren = 'fill';
    resultsGroup.margins = 15;
    resultsGroup.visible = false;

    var resultText = resultsGroup.add('statictext', undefined, '', { multiline: true });
    resultText.preferredSize = [350, 80];

    // Buttons
    var buttonGroup = dialog.add('group');
    buttonGroup.alignment = 'center';

    var btnScan = buttonGroup.add('button', undefined, 'Scan Document');
    var btnClean = buttonGroup.add('button', undefined, 'Clean Now', { name: 'ok' });
    var btnCancel = buttonGroup.add('button', undefined, 'Cancel', { name: 'cancel' });

    // Scan button handler
    btnScan.onClick = function () {
        var strayCount = 0;
        var emptyCount = 0;
        var textCount = 0;
        var lockedCount = 0;

        // Count stray points
        for (var i = 0; i < doc.pathItems.length; i++) {
            try {
                if (doc.pathItems[i].pathPoints.length === 1) {
                    strayCount++;
                }
            } catch (e) { }
        }

        // Count empty text and total text
        for (var j = 0; j < doc.textFrames.length; j++) {
            textCount++;
            try {
                if (doc.textFrames[j].contents === "" || doc.textFrames[j].contents.replace(/\s/g, "") === "") {
                    emptyCount++;
                }
            } catch (e) { }
        }

        // Count locked items
        for (var k = 0; k < doc.layers.length; k++) {
            if (doc.layers[k].locked) lockedCount++;
        }
        for (var l = 0; l < doc.pageItems.length; l++) {
            try {
                if (doc.pageItems[l].locked) lockedCount++;
            } catch (e) { }
        }

        // Show results
        var msg = 'Found:\n';
        msg += '• ' + strayCount + ' stray points\n';
        msg += '• ' + emptyCount + ' empty text frames\n';
        msg += '• ' + textCount + ' text frames\n';
        msg += '• ' + lockedCount + ' locked items';

        resultText.text = msg;
        resultsGroup.visible = true;
        dialog.layout.layout(true);
    };

    // Clean button handler
    btnClean.onClick = function () {
        var results = [];

        // Clean stray points
        if (checkStray.value) {
            var strayCount = 0;
            for (var i = doc.pathItems.length - 1; i >= 0; i--) {
                try {
                    if (doc.pathItems[i].pathPoints.length === 1) {
                        doc.pathItems[i].remove();
                        strayCount++;
                    }
                } catch (e) { }
            }
            if (strayCount > 0) results.push("Removed " + strayCount + " stray points");
        }

        // Clean empty text
        if (checkEmpty.value) {
            var emptyCount = 0;
            for (var j = doc.textFrames.length - 1; j >= 0; j--) {
                try {
                    if (doc.textFrames[j].contents === "" || doc.textFrames[j].contents.replace(/\s/g, "") === "") {
                        doc.textFrames[j].remove();
                        emptyCount++;
                    }
                } catch (e) { }
            }
            if (emptyCount > 0) results.push("Removed " + emptyCount + " empty text frames");
        }

        // Outline text
        if (checkOutline.value) {
            var outlineCount = 0;
            for (var k = doc.textFrames.length - 1; k >= 0; k--) {
                try {
                    doc.textFrames[k].createOutline();
                    outlineCount++;
                } catch (e) { }
            }
            if (outlineCount > 0) results.push("Outlined " + outlineCount + " text frames");
        }

        // Unlock all
        if (checkUnlock.value) {
            var unlockCount = 0;
            for (var m = 0; m < doc.layers.length; m++) {
                if (doc.layers[m].locked) {
                    doc.layers[m].locked = false;
                    unlockCount++;
                }
            }
            for (var n = 0; n < doc.pageItems.length; n++) {
                try {
                    if (doc.pageItems[n].locked) {
                        doc.pageItems[n].locked = false;
                        unlockCount++;
                    }
                } catch (e) { }
            }
            if (unlockCount > 0) results.push("Unlocked " + unlockCount + " items");
        }

        if (results.length === 0) {
            alert("Nothing to clean");
        } else {
            alert(results.join("\n"));
        }

        dialog.close();
    };

    // Show dialog
    dialog.show();
})();
