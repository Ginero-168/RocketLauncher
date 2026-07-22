/**
 * TATA KEEP - JavaScript Logic
 * SVG Asset Manager for Adobe Illustrator
 * @version 5.0
 */
(() => {
    'use strict';

    // ==========================================
    // CSInterface & Node.js Modules
    // ==========================================
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    // Storage directory: ~/.tata_keeper
    const STORAGE_DIR = path.join(os.homedir(), '.tata_keeper');

    // In-memory items array
    let keeperItems = [];

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
            const saved = localStorage.getItem('tata_keeper');
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

        // Info modal
        document.getElementById('btn_info').addEventListener('click', () => {
            document.getElementById('info_modal').classList.add('show');
        });
        document.getElementById('btn_close_info').addEventListener('click', () => {
            document.getElementById('info_modal').classList.remove('show');
        });
        document.getElementById('info_modal').addEventListener('click', function (e) {
            if (e.target === this) this.classList.remove('show');
        });
    }

    // ==========================================
    // Render Grid
    // ==========================================
    function renderGrid() {
        const grid = document.getElementById('keeper_grid');
        const emptyState = document.getElementById('empty_state');
        const itemCount = document.getElementById('item_count');

        // Clear existing content (except empty state)
        const cards = grid.querySelectorAll('.keeper-card');
        cards.forEach(c => { c.remove(); });

        // Update count
        itemCount.textContent = `${keeperItems.length} item${keeperItems.length !== 1 ? 's' : ''}`;

        // Show/hide empty state
        if (keeperItems.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }
        emptyState.style.display = 'none';

        // Render cards
        keeperItems.forEach(item => {
            const card = createCard(item);
            if (card) grid.appendChild(card);
        });
    }

    // ==========================================
    // Create Card Element
    // ==========================================
    function createCard(item) {
        if (item.type !== 'file_svg') return null;

        const card = document.createElement('div');
        card.className = 'keeper-card';
        card.dataset.id = item.id;

        // Load SVG content from file
        let svgContent = '';
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
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgContent, 'image/svg+xml');
            let svgEl = doc.documentElement;

            if (svgEl.tagName.toLowerCase() !== 'svg') {
                svgEl = doc.querySelector('svg');
            }
            if (!svgEl) throw 'No SVG element found';

            // Scope IDs to avoid conflicts
            const suffix = `_${item.id}`;
            const idMap = {};
            const elements = doc.querySelectorAll('[id]');
            elements.forEach(el => {
                const oldId = el.id;
                const newId = oldId + suffix;
                idMap[oldId] = newId;
                el.id = newId;
            });

            // Update URL references
            const allEls = doc.querySelectorAll('*');
            allEls.forEach(el => {
                Array.from(el.attributes).forEach(attr => {
                    let val = attr.value;
                    if (val.includes('url(#')) {
                        for (const oldId in idMap) {
                            val = val.replace(new RegExp(`url\\(#${oldId}\\)`, 'g'), `url(#${idMap[oldId]})`);
                        }
                        attr.value = val;
                    }
                    if (attr.name === 'href' || attr.name === 'xlink:href') {
                        if (val.startsWith('#')) {
                            const rawId = val.substring(1);
                            if (idMap[rawId]) attr.value = `#${idMap[rawId]}`;
                        }
                    }
                });
            });

            // Ensure viewBox
            if (!svgEl.hasAttribute('viewBox') && svgEl.hasAttribute('width') && svgEl.hasAttribute('height')) {
                const w = parseFloat(svgEl.getAttribute('width'));
                const h = parseFloat(svgEl.getAttribute('height'));
                if (!isNaN(w) && !isNaN(h)) svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
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
        const actions = document.createElement('div');
        actions.className = 'card-actions';

        const btnPlace = document.createElement('button');
        btnPlace.className = 'card-btn';
        btnPlace.textContent = 'Place';
        btnPlace.onclick = e => {
            e.stopPropagation();
            placeItem(item);
        };

        const btnDelete = document.createElement('button');
        btnDelete.className = 'card-btn delete';
        btnDelete.textContent = '×';
        btnDelete.onclick = e => {
            e.stopPropagation();
            deleteItem(item.id);
        };

        actions.appendChild(btnPlace);
        actions.appendChild(btnDelete);
        card.appendChild(actions);

        // Drag support
        card.draggable = true;
        card.ondragstart = e => {
            e.dataTransfer.effectAllowed = 'copy';
            if (item.file_path) {
                const fileUrl = `file://${os.platform() === 'win32' ? '/' : ''}${item.file_path}`;
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
            const result = window.cep.fs.showOpenDialog(true, false, 'Select SVG Files', null, ['svg']);
            if (result.err) throw 'Dialog Error';
            if (!result.data || result.data.length === 0) return;

            let addedCount = 0;
            result.data.forEach(srcUri => {
                try {
                    // Sanitize path
                    let srcPath = srcUri;
                    if (srcPath.indexOf('file://') === 0) {
                        srcPath = decodeURIComponent(srcPath.replace(/^file:\/\//, ''));
                    } else if (srcPath.indexOf('file:') === 0) {
                        srcPath = decodeURIComponent(srcPath.replace(/^file:/, ''));
                    }

                    const filename = path.basename(srcPath);
                    const newName = `${Date.now()}_${filename}`;
                    const destPath = path.join(STORAGE_DIR, newName);

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
                showToast(`Imported ${addedCount} file(s)`, 'success');
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
            const timestamp = Date.now();
            const fileName = `keep_${timestamp}.svg`;
            const filePath = path.join(STORAGE_DIR, fileName);

            const params = { path: filePath };

            TATA.host.run('saveSelectionAsRichSvg', params, res => {
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
                    showToast(`Save failed: ${res}`, 'error');
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
            const params = { path: item.file_path };
            TATA.host.run('placeSvg', params);
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
            const result = window.cep.fs.showOpenDialog(false, true, 'Select Destination Folder', null, null);
            if (!result.data || result.data.length === 0) return;

            let destFolder = result.data[0];
            if (destFolder.indexOf('file://') === 0) {
                destFolder = decodeURIComponent(destFolder.replace(/^file:\/\//, ''));
            } else if (destFolder.indexOf('file:') === 0) {
                destFolder = decodeURIComponent(destFolder.replace(/^file:/, ''));
            }

            let successCount = 0;
            keeperItems.forEach((item, index) => {
                try {
                    if (item.file_path && fs.existsSync(item.file_path)) {
                        const destName = path.basename(item.file_path);
                        const destPath = path.join(destFolder, destName);
                        fs.copyFileSync(item.file_path, destPath);
                        successCount++;
                    }
                } catch (err) {
                    console.error('[KEEP] Export error for item:', err);
                }
            });

            showToast(`Exported ${successCount} files`, 'success');

        } catch (e) {
            console.error('[KEEP] Export failed:', e);
            showToast('Export failed', 'error');
        }
    }

    // ==========================================
    // Delete Item
    // ==========================================
    function deleteItem(id) {
        const item = keeperItems.find(i => { return i.id === id; });

        if (item && item.file_path) {
            try {
                if (fs.existsSync(item.file_path)) {
                    fs.unlinkSync(item.file_path);
                }
            } catch (e) {
                console.error('[KEEP] File delete error:', e);
            }
        }

        keeperItems = keeperItems.filter(i => { return i.id !== id; });
        saveItems();
        renderGrid();
        showToast('Deleted', 'success');
    }

    // ==========================================
    // Clear All
    // ==========================================
    function clearAll() {
        if (keeperItems.length === 0) return;

        if (!confirm(`Delete ALL ${keeperItems.length} items?\nThis will permanently delete the files.`)) {
            return;
        }

        // Delete all files
        keeperItems.forEach(item => {
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
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type || 'info'}`;
        toast.textContent = msg;
        document.body.appendChild(toast);

        setTimeout(() => { toast.classList.add('show'); }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { toast.remove(); }, 300);
        }, 2000);
    }

    // ==========================================
    // Initialize on Load
    // ==========================================
    window.addEventListener('load', init);

})();
