(() => {
    'use strict';

    window.TATA = window.TATA || {};

    // ==================== IMPORT / EXPORT ====================

    const fs = window.require('fs');

    function exportScript() {
        const v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
        let hasExportable = false;
        const allTabs = ['tab_button'];
        allTabs.forEach(t => {
            if (!v2Layout[t]) return;
            v2Layout[t].forEach(item => {
                if (item.script || item.code) hasExportable = true;
            });
        });

        if (!hasExportable) {
            TATA.showToast && TATA.showToast("No scripts to export.", "error");
            return;
        }

        TATA.showToast && TATA.showToast("Click a button to export it", "info");
        document.body.classList.add('export-mode');

        const btns = document.querySelectorAll('.grid-btn');
        const handler = function (e) {
            e.preventDefault();
            e.stopPropagation();

            const item = TATA.getItemDataFromElement(this);
            const defaultName = item.label;

            const result = window.cep.fs.showSaveDialogEx("Export Script", "", ["json"], defaultName);
            if (result.data) {
                const payload = {
                    tata_version: "2.0",
                    name: item.label,
                    icon: item.icon,
                    script: item.script,
                    code: item.code,
                    type: item.type,
                    color: item.color
                };
                let finalPath = result.data;
                if (!finalPath.toLowerCase().endsWith('.json')) finalPath += '.json';

                fs.writeFileSync(finalPath, JSON.stringify(payload, null, 2));
                TATA.showToast && TATA.showToast("Exported!", "success");
            }

            document.body.classList.remove('export-mode');
            btns.forEach(b => { b.removeEventListener('click', handler, true); });
        };

        btns.forEach(b => { b.addEventListener('click', handler, true); });
    }

    function importScript() {
        const result = window.cep.fs.showOpenDialogEx(false, false, "Import Script", "", ["json"]);
        if (result.data && result.data.length > 0) {
            const filePath = result.data[0];
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                const v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
                const activeTab = 'tab_button';
                if (!v2Layout[activeTab]) v2Layout[activeTab] = [];

                const newItem = {
                    id: `imported_${new Date().getTime()}`,
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
                TATA.showToast && TATA.showToast(`Imported ${data.name}`, "success");
            } catch (e) {
                TATA.showToast && TATA.showToast(`Import Failed: ${e}`, "error");
            }
        }
    }

    function initScriptTransfer() {
        const importButton = document.getElementById('btn_import_script');
        if (importButton && !importButton._scriptTransferBound) {
            importButton._scriptTransferBound = true;
            importButton.addEventListener('click', importScript);
        }

        const exportButton = document.getElementById('btn_export_script');
        if (exportButton && !exportButton._scriptTransferBound) {
            exportButton._scriptTransferBound = true;
            exportButton.addEventListener('click', exportScript);
        }
    }

    TATA.initScriptTransfer = initScriptTransfer;
    TATA.importScript = importScript;
    TATA.exportScript = exportScript;

})();
