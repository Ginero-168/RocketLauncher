/**
 * TATA KEEP - JavaScript Logic
 * SVG Asset Manager for Adobe Illustrator
 * @version 5.0
 */
(function () {
    'use strict';

    // ==========================================
    // CSInterface & Node.js Modules
    // ==========================================
    var csInterface = new CSInterface();
    var fs = require('fs');
    var path = require('path');
    var os = require('os');

    // Storage directory: ~/.tata_keeper
    var STORAGE_DIR = path.join(os.homedir(), '.tata_keeper');

    // In-memory items array
    var keeperItems = [];

    // ==========================================
    // Initialize
    // ==========================================
    function init() {
        // Ensure storage directory exists
        if (!fs.existsSync(STORAGE_DIR)) {
            try {
                fs.mkdirSync(STORAGE_DIR);
            } catch (e) {
                console.error('[KEEP] Could not create storage directory:', e);
            }
        }

        // Load items from localStorage
        loadItems();
        renderGrid();
        bindEvents();
    }

    // ==========================================
    // Load Items from Storage
    // ==========================================
    function loadItems() {
        try {
            var saved = localStorage.getItem('tata_keeper');
            if (saved) {
                keeperItems = JSON.parse(saved);
            }
        } catch (e) {
            console.error('[KEEP] Failed to load items:', e);
            keeperItems = [];
        }
    }

    // ==========================================
    // Save Items to Storage
    // ==========================================
    function saveItems() {
        try {
            localStorage.setItem('tata_keeper', JSON.stringify(keeperItems));
        } catch (e) {
            console.error('[KEEP] Failed to save items:', e);
        }
    }

    // ==========================================
    // Bind Event Listeners
    // ==========================================
    function bindEvents() {
        document.getElementById('btn_import').addEventListener('click', importFiles);
        document.getElementById('btn_add_selection').addEventListener('click', addSelectionToKeeper);
        document.getElementById('btn_export').addEventListener('click', exportFiles);
        document.getElementById('btn_clear').addEventListener('click', clearAll);
    }

    // ==========================================
    // Render Grid
    // ==========================================
    function renderGrid() {
        var grid = document.getElementById('keeper_grid');
        var emptyState = document.getElementById('empty_state');
        var itemCount = document.getElementById('item_count');

        // Clear existing content (except empty state)
        var cards = grid.querySelectorAll('.keeper-card');
        cards.forEach(function (c) { c.remove(); });

        // Update count
        itemCount.textContent = keeperItems.length + ' item' + (keeperItems.length !== 1 ? 's' : '');

        // Show/hide empty state
        if (keeperItems.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }
        emptyState.style.display = 'none';

        // Render cards
        keeperItems.forEach(function (item) {
            var card = createCard(item);
            if (card) grid.appendChild(card);
        });
    }

    // ==========================================
    // Create Card Element
    // ==========================================
    function createCard(item) {
        if (item.type !== 'file_svg') return null;

        var card = document.createElement('div');
        card.className = 'keeper-card';
        card.dataset.id = item.id;

        // Load SVG content from file
        var svgContent = '';
        try {
            if (item.file_path && fs.existsSync(item.file_path)) {
                svgContent = fs.readFileSync(item.file_path, 'utf-8');
            } else {
                card.innerHTML = '<div class="card-error">File Missing</div>';
                return card;
            }
        } catch (e) {
            card.innerHTML = '<div class="card-error">Read Error</div>';
            return card;
        }

        // Parse and scope SVG
        try {
            var parser = new DOMParser();
            var doc = parser.parseFromString(svgContent, 'image/svg+xml');
            var svgEl = doc.documentElement;

            if (svgEl.tagName.toLowerCase() !== 'svg') {
                svgEl = doc.querySelector('svg');
            }
            if (!svgEl) throw 'No SVG element found';

            // Scope IDs to avoid conflicts
            var suffix = '_' + item.id;
            var idMap = {};
            var elements = doc.querySelectorAll('[id]');
            elements.forEach(function (el) {
                var oldId = el.id;
                var newId = oldId + suffix;
                idMap[oldId] = newId;
                el.id = newId;
            });

            // Update URL references
            var allEls = doc.querySelectorAll('*');
            allEls.forEach(function (el) {
                Array.from(el.attributes).forEach(function (attr) {
                    var val = attr.value;
                    if (val.indexOf('url(#') !== -1) {
                        for (var oldId in idMap) {
                            val = val.replace(new RegExp('url\\(#' + oldId + '\\)', 'g'), 'url(#' + idMap[oldId] + ')');
                        }
                        attr.value = val;
                    }
                    if (attr.name === 'href' || attr.name === 'xlink:href') {
                        if (val.startsWith('#')) {
                            var rawId = val.substring(1);
                            if (idMap[rawId]) attr.value = '#' + idMap[rawId];
                        }
                    }
                });
            });

            // Ensure viewBox
            if (!svgEl.hasAttribute('viewBox') && svgEl.hasAttribute('width') && svgEl.hasAttribute('height')) {
                var w = parseFloat(svgEl.getAttribute('width'));
                var h = parseFloat(svgEl.getAttribute('height'));
                if (!isNaN(w) && !isNaN(h)) svgEl.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
            }

            // Set preserveAspectRatio
            if (!svgEl.hasAttribute('preserveAspectRatio')) {
                svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }

            // Remove fixed dimensions for responsive sizing
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('height');
            svgEl.style.maxWidth = '100%';
            svgEl.style.maxHeight = '100%';

            card.innerHTML = new XMLSerializer().serializeToString(svgEl);

        } catch (e) {
            console.error('[KEEP] SVG Parse Error:', e);
            card.innerHTML = '<div class="card-error">Preview Error</div>';
        }

        // Action buttons
        var actions = document.createElement('div');
        actions.className = 'card-actions';

        var btnPlace = document.createElement('button');
        btnPlace.className = 'card-btn';
        btnPlace.textContent = 'Place';
        btnPlace.onclick = function (e) {
            e.stopPropagation();
            placeItem(item);
        };

        var btnDelete = document.createElement('button');
        btnDelete.className = 'card-btn delete';
        btnDelete.textContent = '×';
        btnDelete.onclick = function (e) {
            e.stopPropagation();
            deleteItem(item.id);
        };

        actions.appendChild(btnPlace);
        actions.appendChild(btnDelete);
        card.appendChild(actions);

        // Drag support
        card.draggable = true;
        card.ondragstart = function (e) {
            e.dataTransfer.effectAllowed = 'copy';
            if (item.file_path) {
                var fileUrl = 'file://' + (os.platform() === 'win32' ? '/' : '') + item.file_path;
                e.dataTransfer.setData('text/uri-list', encodeURI(fileUrl));
                e.dataTransfer.setData('URL', encodeURI(fileUrl));
            }
        };

        return card;
    }

    // ==========================================
    // Import SVG Files
    // ==========================================
    function importFiles() {
        try {
            var result = window.cep.fs.showOpenDialog(true, false, 'Select SVG Files', null, ['svg']);
            if (result.err) throw 'Dialog Error';
            if (!result.data || result.data.length === 0) return;

            var addedCount = 0;
            result.data.forEach(function (srcUri) {
                try {
                    // Sanitize path
                    var srcPath = srcUri;
                    if (srcPath.indexOf('file://') === 0) {
                        srcPath = decodeURIComponent(srcPath.replace(/^file:\/\//, ''));
                    } else if (srcPath.indexOf('file:') === 0) {
                        srcPath = decodeURIComponent(srcPath.replace(/^file:/, ''));
                    }

                    var filename = path.basename(srcPath);
                    var newName = Date.now() + '_' + filename;
                    var destPath = path.join(STORAGE_DIR, newName);

                    fs.copyFileSync(srcPath, destPath);

                    keeperItems.unshift({
                        id: Date.now() + Math.random(),
                        type: 'file_svg',
                        file_path: destPath
                    });
                    addedCount++;

                } catch (err) {
                    console.error('[KEEP] Import error:', err);
                }
            });

            if (addedCount > 0) {
                saveItems();
                renderGrid();
                showToast('Imported ' + addedCount + ' file(s)', 'success');
            }

        } catch (e) {
            console.error('[KEEP] Import failed:', e);
            showToast('Import failed', 'error');
        }
    }

    // ==========================================
    // Add Selection to Keeper
    // ==========================================
    function addSelectionToKeeper() {
        try {
            var timestamp = Date.now();
            var fileName = 'keep_' + timestamp + '.svg';
            var filePath = path.join(STORAGE_DIR, fileName);

            var params = { path: filePath };
            var safeParams = JSON.stringify(params).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

            csInterface.evalScript('TATA.run("saveSelectionAsRichSvg", \'' + safeParams + '\')', function (res) {
                if (res === 'Success' || res === '"Success"') {
                    keeperItems.unshift({
                        id: timestamp,
                        type: 'file_svg',
                        file_path: filePath
                    });
                    saveItems();
                    renderGrid();
                    showToast('Selection saved!', 'success');

                } else if (res === 'No Selection' || res === '"No Selection"') {
                    showToast('Please select objects first', 'error');
                } else {
                    showToast('Save failed: ' + res, 'error');
                }
            });

        } catch (e) {
            console.error('[KEEP] Save selection failed:', e);
            showToast('Error saving selection', 'error');
        }
    }

    // ==========================================
    // Place Item into Illustrator
    // ==========================================
    function placeItem(item) {
        if (!item.file_path) {
            showToast('No file to place', 'error');
            return;
        }

        try {
            var params = { path: item.file_path };
            var safeParams = JSON.stringify(params).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            csInterface.evalScript('TATA.run("placeSvg", \'' + safeParams + '\')');
            showToast('Placed!', 'success');
        } catch (e) {
            console.error('[KEEP] Place error:', e);
            showToast('Place failed', 'error');
        }
    }

    // ==========================================
    // Export All Files
    // ==========================================
    function exportFiles() {
        if (keeperItems.length === 0) {
            showToast('No items to export', 'error');
            return;
        }

        try {
            var result = window.cep.fs.showOpenDialog(false, true, 'Select Destination Folder', null, null);
            if (!result.data || result.data.length === 0) return;

            var destFolder = result.data[0];
            if (destFolder.indexOf('file://') === 0) {
                destFolder = decodeURIComponent(destFolder.replace(/^file:\/\//, ''));
            } else if (destFolder.indexOf('file:') === 0) {
                destFolder = decodeURIComponent(destFolder.replace(/^file:/, ''));
            }

            var successCount = 0;
            keeperItems.forEach(function (item, index) {
                try {
                    if (item.file_path && fs.existsSync(item.file_path)) {
                        var destName = path.basename(item.file_path);
                        var destPath = path.join(destFolder, destName);
                        fs.copyFileSync(item.file_path, destPath);
                        successCount++;
                    }
                } catch (err) {
                    console.error('[KEEP] Export error for item:', err);
                }
            });

            showToast('Exported ' + successCount + ' files', 'success');

        } catch (e) {
            console.error('[KEEP] Export failed:', e);
            showToast('Export failed', 'error');
        }
    }

    // ==========================================
    // Delete Item
    // ==========================================
    function deleteItem(id) {
        var item = keeperItems.find(function (i) { return i.id === id; });

        if (item && item.file_path) {
            try {
                if (fs.existsSync(item.file_path)) {
                    fs.unlinkSync(item.file_path);
                }
            } catch (e) {
                console.error('[KEEP] File delete error:', e);
            }
        }

        keeperItems = keeperItems.filter(function (i) { return i.id !== id; });
        saveItems();
        renderGrid();
        showToast('Deleted', 'success');
    }

    // ==========================================
    // Clear All
    // ==========================================
    function clearAll() {
        if (keeperItems.length === 0) return;

        if (!confirm('Delete ALL ' + keeperItems.length + ' items?\nThis will permanently delete the files.')) {
            return;
        }

        // Delete all files
        keeperItems.forEach(function (item) {
            if (item.file_path) {
                try {
                    if (fs.existsSync(item.file_path)) {
                        fs.unlinkSync(item.file_path);
                    }
                } catch (e) { }
            }
        });

        keeperItems = [];
        saveItems();
        renderGrid();
        showToast('Cleared all items', 'success');
    }

    // ==========================================
    // Toast Notification
    // ==========================================
    function showToast(msg, type) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'toast ' + (type || 'info');
        toast.textContent = msg;
        document.body.appendChild(toast);

        setTimeout(function () { toast.classList.add('show'); }, 10);
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 300);
        }, 2000);
    }

    // ==========================================
    // Initialize on Load
    // ==========================================
    window.addEventListener('load', init);

})();
