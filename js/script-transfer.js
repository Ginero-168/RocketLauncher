(function () {
    'use strict';

    window.TATA = window.TATA || {};

    // ==================== IMPORT / EXPORT ====================

    var fs = window.require('fs');

    function exportScript() {
        var v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
        var hasExportable = false;
        var allTabs = ['tab_button'];
        allTabs.forEach(function (t) {
            if (!v2Layout[t]) return;
            v2Layout[t].forEach(function (item) {
                if (item.script || item.code) hasExportable = true;
            });
        });

        if (!hasExportable) {
            TATA.showToast && TATA.showToast("No scripts to export.", "error");
            return;
        }

        TATA.showToast && TATA.showToast("Click a button to export it", "info");
        document.body.classList.add('export-mode');

        var btns = document.querySelectorAll('.grid-btn');
        var handler = function (e) {
            e.preventDefault();
            e.stopPropagation();

            var item = TATA.getItemDataFromElement(this);
            var defaultName = item.label;

            var result = window.cep.fs.showSaveDialogEx("Export Script", "", ["json"], defaultName);
            if (result.data) {
                var payload = {
                    tata_version: "2.0",
                    name: item.label,
                    icon: item.icon,
                    script: item.script,
                    code: item.code,
                    type: item.type,
                    color: item.color
                };
                var finalPath = result.data;
                if (!finalPath.toLowerCase().endsWith('.json')) finalPath += '.json';

                fs.writeFileSync(finalPath, JSON.stringify(payload, null, 2));
                TATA.showToast && TATA.showToast("Exported!", "success");
            }

            document.body.classList.remove('export-mode');
            btns.forEach(function (b) { b.removeEventListener('click', handler, true); });
        };

        btns.forEach(function (b) { b.addEventListener('click', handler, true); });
    }

    function importScript() {
        var result = window.cep.fs.showOpenDialogEx(false, false, "Import Script", "", ["json"]);
        if (result.data && result.data.length > 0) {
            var filePath = result.data[0];
            try {
                var content = fs.readFileSync(filePath, 'utf8');
                var data = JSON.parse(content);
                var v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
                var activeTab = 'tab_button';
                if (!v2Layout[activeTab]) v2Layout[activeTab] = [];

                var newItem = {
                    id: 'imported_' + new Date().getTime(),
                    label: data.name || "Imported",
                    icon: data.icon || (TATA.ICONS && TATA.ICONS.stars),
                    script: data.script,
                    code: data.code,
                    type: data.type,
                    color: data.color
                };

                v2Layout[activeTab].push(newItem);
                TATA.setV2Layout && TATA.setV2Layout(v2Layout);
                TATA.saveV2Layout && TATA.saveV2Layout();
                TATA.renderGrid && TATA.renderGrid();
                TATA.showToast && TATA.showToast("Imported " + data.name, "success");
            } catch (e) {
                TATA.showToast && TATA.showToast("Import Failed: " + e, "error");
            }
        }
    }

    function initScriptTransfer() {
        var importButton = document.getElementById('btn_import_script');
        if (importButton && !importButton._scriptTransferBound) {
            importButton._scriptTransferBound = true;
            importButton.addEventListener('click', importScript);
        }

        var exportButton = document.getElementById('btn_export_script');
        if (exportButton && !exportButton._scriptTransferBound) {
            exportButton._scriptTransferBound = true;
            exportButton.addEventListener('click', exportScript);
        }
    }

    TATA.initScriptTransfer = initScriptTransfer;
    TATA.importScript = importScript;
    TATA.exportScript = exportScript;

})();
