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
        bindEvents();
        return renderGrid();
    }

    // ==========================================
    // Load Items from Storage
    // ==========================================
    function loadItems() {
        try {
            if (typeof TATA !== 'undefined' && typeof TATA.readStoredKeeper === 'function') {
                keeperItems = TATA.readStoredKeeper() || [];
            } else {
                const saved = localStorage.getItem('tata_keeper');
                keeperItems = saved ? JSON.parse(saved) : [];
            }
        } catch (e) {
            console.error('[KEEP] Failed to load items:', e);
            keeperItems = [];
        }
        if (!Array.isArray(keeperItems)) keeperItems = [];
        keeperItems = keeperItems.filter(item => {
            if (item == null || typeof item !== 'object' || !item.file_path) return true;
            return !!resolvedKeeperFile(item.file_path);
        });
    }

    function canonicalPath(target) {
        const resolved = path.resolve(String(target || ''));
        const stop = path.parse(resolved).root;
        const missing = [];
        let current = resolved;
        while (current && current !== stop) {
            try {
                fs.lstatSync(current);
                const real = fs.realpathSync(current);
                return missing.length ? path.join(real, ...missing) : real;
            } catch (err) {
                if (!err || err.code !== 'ENOENT') return '';
            }
            missing.unshift(path.basename(current));
            const parent = path.dirname(current);
            if (parent === current) break;
            current = parent;
        }
        return '';
    }

    function keeperRoot() {
        const lexical = path.resolve(os.homedir(), '.tata_keeper');
        return canonicalPath(lexical) || lexical;
    }

    function insideKeeper(root, target) {
        if (!root || !target) return false;
        const rel = path.relative(root, target);
        return !!rel && rel !== '..' && rel.indexOf('..' + path.sep) !== 0 && !path.isAbsolute(rel);
    }

    function resolvedKeeperFile(filePath) {
        if (typeof TATA.resolveKeeperFile === 'function') return TATA.resolveKeeperFile(filePath);
        if (typeof filePath !== 'string' || !filePath) return '';
        const canonical = canonicalPath(filePath);
        if (!insideKeeper(keeperRoot(), canonical)) return '';
        return canonical;
    }

    function deleteKeeperFile(filePath) {
        const safe = resolvedKeeperFile(filePath);
        if (!safe) return;
        try {
            const stat = fs.lstatSync(safe);
            if (stat.isSymbolicLink() || !stat.isFile()) return;
            fs.unlinkSync(safe);
        } catch (e) {
            if (!e || e.code !== 'ENOENT') console.error('[KEEP] File delete error:', e);
        }
    }

    // ==========================================
    // Save Items to Storage
    // ==========================================
    function coerceKeeperId(item) {
        if (!item || typeof item !== 'object') return item;
        if (typeof item.id === 'number' && isFinite(item.id)) item.id = String(item.id);
        return item;
    }

    function saveItems() {
        try {
            keeperItems = (Array.isArray(keeperItems) ? keeperItems : []).map(coerceKeeperId);
            localStorage.setItem('tata_keeper', JSON.stringify(keeperItems));
            if (keeperItems.length) {
                localStorage.removeItem('tata_keeper_cleared');
                localStorage.setItem('tata_keeper_backup', JSON.stringify(keeperItems));
            } else {
                localStorage.setItem('tata_keeper_cleared', '1');
            }
        } catch (e) {
            console.error('[KEEP] Failed to save items:', e);
        }
    }

    // ==========================================
    // Toolbar: File Location + card size (matches Graphic Style)
    // ==========================================
    const CARD_SIZES = ['100', '75', '50', '25'];
    const SIZE_KEY = 'tata_keep_card_size';

    function cardSize() {
        try {
            const saved = localStorage.getItem(SIZE_KEY);
            if (CARD_SIZES.indexOf(saved) !== -1) return saved;
        } catch (e) { /* storage can be blocked */ }
        return '50';
    }

    function setSizeMenu(open) {
        const menu = document.getElementById('keep_size_menu');
        const button = document.getElementById('btn_keep_size');
        if (menu) menu.hidden = !open;
        if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function applyCardSize(size) {
        const next = CARD_SIZES.indexOf(String(size)) === -1 ? '50' : String(size);
        const grid = document.getElementById('keeper_grid');
        if (grid) grid.setAttribute('data-size', next);
        const button = document.getElementById('btn_keep_size');
        if (button) {
            button.textContent = next + '%';
            button.setAttribute('aria-label', 'ขนาดการ์ด ' + next + '%');
        }
        document.querySelectorAll('#keep_size_menu [data-size]').forEach(item => {
            const on = item.getAttribute('data-size') === next;
            item.classList.toggle('is-on', on);
            item.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        try { localStorage.setItem(SIZE_KEY, next); } catch (e) { /* ignore */ }
        return next;
    }

    function openStorageFolder() {
        let child = null;
        try { child = require('child_process'); } catch (e) { child = null; }
        if (!child) {
            showToast('เปิดโฟลเดอร์ได้เมื่อเปิดพาเนลใน Illustrator', 'info');
            return false;
        }
        try {
            if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR);
        } catch (err) {
            showToast('เปิดโฟลเดอร์ไม่สำเร็จ', 'error');
            return false;
        }
        const platform = (typeof process !== 'undefined' && process.platform) || '';
        const command = platform === 'win32' ? 'explorer' : (platform === 'darwin' ? 'open' : 'xdg-open');
        child.execFile(command, [STORAGE_DIR], err => {
            if (err) showToast('เปิดโฟลเดอร์ไม่สำเร็จ', 'error');
        });
        return true;
    }

    function bindToolbar() {
        const location = document.getElementById('btn_keep_location');
        const sizeButton = document.getElementById('btn_keep_size');
        const sizeMenu = document.getElementById('keep_size_menu');
        applyCardSize(cardSize());
        if (location && !location._keepBound) {
            location._keepBound = true;
            location.addEventListener('click', openStorageFolder);
        }
        if (sizeButton && !sizeButton._keepBound) {
            sizeButton._keepBound = true;
            sizeButton.addEventListener('click', event => {
                event.stopPropagation();
                const menu = document.getElementById('keep_size_menu');
                setSizeMenu(!menu || menu.hidden);
            });
            document.addEventListener('click', event => {
                if (!event.target.closest || !event.target.closest('#tab_keep .style-size')) setSizeMenu(false);
            });
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') setSizeMenu(false);
            });
        }
        if (sizeMenu && !sizeMenu._keepBound) {
            sizeMenu._keepBound = true;
            sizeMenu.addEventListener('click', event => {
                const choice = event.target.closest('[data-size]');
                if (!choice) return;
                event.stopPropagation();
                applyCardSize(choice.getAttribute('data-size'));
                setSizeMenu(false);
            });
        }
    }

    // ==========================================
    // Bind Event Listeners
    // ==========================================
    let eventsBound = false;

    function bindEvents() {
        bindToolbar();
        if (eventsBound) return;
        const addBtn = document.getElementById('btn_add_selection');
        const clearBtn = document.getElementById('btn_clear');
        if (!addBtn || !clearBtn) return;
        eventsBound = true;

        addBtn.addEventListener('click', addSelectionToKeeper);
        clearBtn.addEventListener('click', clearAll);
    }

    // ==========================================
    // Render Grid
    // ==========================================
    let renderGeneration = 0;
    const MAX_SVG_BYTES = 2000000;
    const MAX_PREVIEW_ELEMENTS = 2000;
    const MAX_PREVIEW_CONCURRENCY = 3;
    const MAX_SVG_CACHE = 24;

    function mapPool(items, limit, worker) {
        const results = new Array(items.length);
        let cursor = 0;
        let active = 0;
        if (!items.length) return Promise.resolve(results);
        return new Promise(resolve => {
            const pump = () => {
                if (cursor >= items.length && active === 0) {
                    resolve(results);
                    return;
                }
                while (active < limit && cursor < items.length) {
                    const index = cursor++;
                    active += 1;
                    let pending;
                    try {
                        pending = Promise.resolve(worker(items[index], index));
                    } catch (err) {
                        pending = Promise.reject(err);
                    }
                    pending.then(value => {
                        results[index] = value;
                    }, () => {}).then(() => {
                        active -= 1;
                        pump();
                    });
                }
            };
            pump();
        });
    }

    function readFileAsync(filePath, encoding) {
        if (fs.promises && typeof fs.promises.readFile === 'function') {
            return fs.promises.readFile(filePath, encoding);
        }
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, encoding, (err, data) => (err ? reject(err) : resolve(data)));
        });
    }

    function statAsync(filePath) {
        if (fs.promises && typeof fs.promises.stat === 'function') return fs.promises.stat(filePath);
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stat) => (err ? reject(err) : resolve(stat)));
        });
    }

    function renderGrid() {
        const grid = document.getElementById('keeper_grid');
        const emptyState = document.getElementById('empty_state');
        const itemCount = document.getElementById('item_count');
        if (!grid) return Promise.resolve();

        const generation = ++renderGeneration;
        const cards = grid.querySelectorAll('.keeper-card');
        cards.forEach(c => { c.remove(); });

        const items = Array.isArray(keeperItems) ? keeperItems : [];
        if (itemCount) itemCount.textContent = `${items.length} รายการ`;
        if (emptyState) emptyState.hidden = items.length > 0;
        const clearBtn = document.getElementById('btn_clear');
        if (clearBtn) clearBtn.disabled = items.length === 0;
        const footer = clearBtn && clearBtn.closest ? clearBtn.closest('.keep-footer') : null;
        if (footer) footer.hidden = items.length === 0;
        if (items.length === 0) return Promise.resolve();

        const jobs = items.map(item => {
            const card = createCardShell(item);
            grid.appendChild(card);
            return { card: card, item: item };
        });
        return mapPool(jobs, MAX_PREVIEW_CONCURRENCY, job => fillCard(job.card, job.item, generation));
    }

    // ==========================================
    // Create Card Element
    // ==========================================
    function cardFrame(card) {
        return card.querySelector('.style-frame') || card;
    }

    // Swap whatever sits in the preview slot (pending text, error, or SVG).
    function setPreviewNode(card, node) {
        const frame = cardFrame(card);
        const old = frame.querySelector(':scope > .keeper-preview');
        if (old) old.remove();
        node.classList.add('keeper-preview');
        frame.insertBefore(node, frame.firstChild);
    }

    function setCardError(card, message) {
        const err = document.createElement('div');
        err.className = 'card-error style-pending';
        err.textContent = message;
        setPreviewNode(card, err);
        return card;
    }

    const svgPreviewCache = new Map();

    function rememberSvg(key, safe) {
        if (svgPreviewCache.has(key)) svgPreviewCache.delete(key);
        svgPreviewCache.set(key, safe);
        while (svgPreviewCache.size > MAX_SVG_CACHE) {
            const oldest = svgPreviewCache.keys().next().value;
            svgPreviewCache.delete(oldest);
        }
        return safe;
    }

    function cachedSanitizedSvg(item) {
        return statAsync(item.file_path).then(stat => {
            if (stat.size > MAX_SVG_BYTES) {
                const err = new Error('SVG exceeds ' + MAX_SVG_BYTES + ' bytes');
                err.code = 'ESIZE';
                throw err;
            }
            const key = `${item.file_path}\0${stat.mtimeMs}\0${stat.size}\0${item.id}`;
            if (svgPreviewCache.has(key)) return rememberSvg(key, svgPreviewCache.get(key));
            return readFileAsync(item.file_path, 'utf8').then(svgContent => {
                return rememberSvg(key, sanitizePreviewMarkup(item, svgContent));
            });
        });
    }

    // Illustrator's "preserve editability" SVG export adds a DOCTYPE that declares
    // fixed Adobe namespace entities (&ns_ai; etc.). The sanitizer rejects any
    // DOCTYPE, so strip it and expand only these known, constant entities.
    const ADOBE_SVG_ENTITIES = {
        ns_extend: 'http://ns.adobe.com/Extensibility/1.0/',
        ns_ai: 'http://ns.adobe.com/AdobeIllustrator/10.0/',
        ns_graphs: 'http://ns.adobe.com/Graphs/1.0/',
        ns_vars: 'http://ns.adobe.com/Variables/1.0/',
        ns_imrep: 'http://ns.adobe.com/ImageReplacement/1.0/',
        ns_sfw: 'http://ns.adobe.com/SaveForWeb/1.0/',
        ns_custom: 'http://ns.adobe.com/GenericCustomNamespace/1.0/',
        ns_adobe_xpath: 'http://ns.adobe.com/XPath/1.0/'
    };

    function normalizeIllustratorSvg(svgContent) {
        let text = String(svgContent || '');
        const doctype = text.match(/<!DOCTYPE[^\[>]*(\[[\s\S]*?\])?\s*>/i);
        if (!doctype) return text;
        const decls = doctype[1] || '';
        const declRe = /<!ENTITY\s+([A-Za-z_][\w.-]*)\s+"([^"]*)"\s*>/g;
        let m;
        while ((m = declRe.exec(decls)) !== null) {
            if (ADOBE_SVG_ENTITIES[m[1]] !== m[2]) return text; // unknown entity: let sanitizer reject
        }
        if (decls.replace(declRe, '').replace(/[\[\]\s]/g, '')) return text;
        text = text.slice(0, doctype.index) + text.slice(doctype.index + doctype[0].length);
        return text.replace(/&(ns_[a-z_]+);/g, (all, name) =>
            Object.prototype.hasOwnProperty.call(ADOBE_SVG_ENTITIES, name) ? ADOBE_SVG_ENTITIES[name] : all);
    }

    function sanitizePreviewMarkup(item, svgContent) {
        svgContent = normalizeIllustratorSvg(svgContent);
        const sanitizedInput = (typeof TATA !== 'undefined' && typeof TATA.sanitizeSvg === 'function')
            ? TATA.sanitizeSvg(svgContent)
            : '';
        if (!sanitizedInput) throw new Error('SVG rejected by sanitizer');

        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitizedInput, 'image/svg+xml');
        let svgEl = doc.documentElement;
        if (!svgEl || String(svgEl.tagName || '').toLowerCase() !== 'svg') {
            svgEl = doc.querySelector('svg');
        }
        if (!svgEl) throw new Error('No SVG element found');
        if (doc.querySelector('parsererror')) throw new Error('SVG rejected by sanitizer');

        const elements = Array.from(doc.querySelectorAll('*'));
        if (elements.length > MAX_PREVIEW_ELEMENTS) {
            throw new Error('SVG exceeds preview element limit');
        }

        const suffix = `_${item.id}`;
        const idMap = new Map();
        elements.forEach(el => {
            if (!el.hasAttribute('id')) return;
            const oldId = el.getAttribute('id');
            const newId = oldId + suffix;
            idMap.set(oldId, newId);
            el.setAttribute('id', newId);
        });

        elements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                let val = attr.value;
                if (val.includes('url(')) {
                    val = val.replace(/url\(\s*#([^\s)]+)\s*\)/gi, (match, oldId) => {
                        return idMap.has(oldId) ? `url(#${idMap.get(oldId)})` : match;
                    });
                }
                if (attr.name === 'href' || attr.name === 'xlink:href') {
                    if (val.startsWith('#')) {
                        const rawId = val.substring(1);
                        if (idMap.has(rawId)) val = `#${idMap.get(rawId)}`;
                    }
                }
                if (val !== attr.value) attr.value = val;
            });
        });

        if (!svgEl.hasAttribute('viewBox') && svgEl.hasAttribute('width') && svgEl.hasAttribute('height')) {
            const w = parseFloat(svgEl.getAttribute('width'));
            const h = parseFloat(svgEl.getAttribute('height'));
            if (!isNaN(w) && !isNaN(h)) svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
        }
        if (!svgEl.hasAttribute('preserveAspectRatio')) {
            svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');

        const serialized = new XMLSerializer().serializeToString(svgEl);
        const safe = (typeof TATA !== 'undefined' && typeof TATA.sanitizeSvg === 'function')
            ? TATA.sanitizeSvg(serialized)
            : '';
        if (!safe) throw new Error('SVG rejected by sanitizer');
        return safe;
    }

    // Display name for a kept SVG, from its stored file name.
    function itemLabel(item) {
        if (item && item.name) return String(item.name);
        const file = item && item.file_path ? path.basename(String(item.file_path)) : '';
        const stamp = /^keep_(\d{10,})\.svg$/i.exec(file);
        if (stamp) {
            const d = new Date(Number(stamp[1]));
            if (!isNaN(d.getTime())) {
                const pad = n => (n < 10 ? '0' : '') + n;
                return 'Keep ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
            }
        }
        return file.replace(/^\d+_\d+_/, '').replace(/\.svg$/i, '') || 'SVG';
    }

    // Same structure as a Graphic Style card: frame (preview + buttons) and a name foot.
    function createCardShell(item) {
        const card = document.createElement('div');
        card.className = 'keeper-card style-card';
        if (item && item.id != null) card.dataset.id = String(item.id);
        const label = itemLabel(item);
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', 'วาง ' + label);
        card.title = 'คลิกเพื่อวาง';

        const frame = document.createElement('div');
        frame.className = 'style-frame';
        const pending = document.createElement('div');
        pending.className = 'card-error style-pending keeper-preview';
        pending.textContent = 'Loading';
        frame.appendChild(pending);

        const foot = document.createElement('div');
        foot.className = 'style-foot';
        const name = document.createElement('span');
        name.className = 'style-name';
        name.textContent = label;
        foot.appendChild(name);

        card.appendChild(frame);
        card.appendChild(foot);
        return card;
    }

    function paintSanitizedSvg(card, safeSvg) {
        const cleanDoc = new DOMParser().parseFromString(safeSvg, 'image/svg+xml');
        const cleanSvg = cleanDoc.documentElement;
        if (!cleanSvg || String(cleanSvg.localName || '').toLowerCase() !== 'svg' || cleanDoc.querySelector('parsererror')) {
            throw new Error('SVG rejected by sanitizer');
        }
        const holder = document.createElement('div');
        holder.className = 'keeper-thumb';
        holder.appendChild(document.importNode(cleanSvg, true));
        setPreviewNode(card, holder);
    }

    function fillCard(card, item, generation) {
        try {
            if (!item || typeof item !== 'object') return Promise.resolve(setCardError(card, 'Invalid item'));
            attachCardActions(card, item);
            if (item.type !== 'file_svg') return Promise.resolve(setCardError(card, 'Unsupported item'));
            if (!item.file_path) return Promise.resolve(setCardError(card, 'File Missing'));
            return cachedSanitizedSvg(item).then(safeSvg => {
                if (generation !== renderGeneration) return card;
                paintSanitizedSvg(card, safeSvg);
                return card;
            }).catch(e => {
                if (generation !== renderGeneration) return card;
                console.error('[KEEP] SVG Parse Error:', e);
                const missing = e && (e.code === 'ENOENT' || /ENOENT/.test(String(e.message || '')));
                const oversized = e && (e.code === 'ESIZE' || /exceeds \d+ bytes/.test(String(e.message || '')));
                const message = missing ? 'File Missing' : (oversized ? 'File Too Large' : 'Preview Error');
                return setCardError(card, message);
            });
        } catch (e) {
            console.error('[KEEP] Card error:', e);
            return Promise.resolve(setCardError(card, 'Preview Error'));
        }
    }

    const ICON_PLACE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 20h14v-2H5v2zm7-3 7-7h-4V4H9v6H5l7 7z"/></svg>';
    const ICON_DELETE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';

    function attachCardActions(card, item) {
        const frame = cardFrame(card);
        if (frame.querySelector('.keeper-place')) return card;

        // Top-left: place on artboard. Top-right: delete. (Graphic Style layout.)
        const btnPlace = document.createElement('button');
        btnPlace.type = 'button';
        btnPlace.className = 'btn btn--overlay style-upload keeper-place';
        btnPlace.setAttribute('aria-label', 'วาง');
        btnPlace.title = 'วางลงอาร์ตบอร์ด';
        btnPlace.innerHTML = ICON_PLACE;
        btnPlace.onclick = e => {
            e.stopPropagation();
            placeItem(item);
        };

        const btnDelete = document.createElement('button');
        btnDelete.type = 'button';
        btnDelete.className = 'btn btn--overlay btn--danger-hover style-delete keeper-delete';
        btnDelete.setAttribute('aria-label', 'ลบ');
        btnDelete.title = 'ลบ';
        btnDelete.innerHTML = ICON_DELETE;
        btnDelete.onclick = e => {
            e.stopPropagation();
            deleteItem(item.id);
        };

        frame.appendChild(btnPlace);
        frame.appendChild(btnDelete);

        // Click or Enter on the card places it, like applying a Graphic Style.
        card.onclick = () => placeItem(item);
        card.onkeydown = e => {
            if (e.target !== card) return;
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                placeItem(item);
            }
        };

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
    let selectionSaveInFlight = false;

    function addSelectionToKeeper() {
        if (selectionSaveInFlight) return;
        selectionSaveInFlight = true;
        try {
            const timestamp = Date.now();
            const fileName = `keep_${timestamp}.svg`;
            const filePath = path.join(STORAGE_DIR, fileName);

            const params = { path: filePath, useClipboard: false };

            TATA.host.run('saveSelectionAsRichSvg', params, res => {
                selectionSaveInFlight = false;
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
            selectionSaveInFlight = false;
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
            TATA.host.run('placeSvg', params, function (res) {
                let text = res == null ? '' : String(res);
                if (text.length >= 2 && text.charAt(0) === '"' && text.charAt(text.length - 1) === '"') {
                    text = text.slice(1, -1);
                }
                if (text === 'Success') showToast('Placed!', 'success');
                else showToast(text || 'Place failed', 'error');
            });
        } catch (e) {
            console.error('[KEEP] Place error:', e);
            showToast('Place failed', 'error');
        }
    }

    // ==========================================
    // Delete Item
    // ==========================================
    function removeItem(id) {
        const item = keeperItems.find(i => i && i.id === id);
        if (item && item.file_path) deleteKeeperFile(item.file_path);
        keeperItems = keeperItems.filter(i => i && i.id !== id);
        saveItems();
        renderGrid();
        showToast('Deleted', 'success');
    }

    // The SVG file is removed from disk, so ask first (as Graphic Style does).
    function deleteItem(id) {
        if (typeof TATA.askConfirm !== 'function') return Promise.resolve(false);
        const item = keeperItems.find(i => i && i.id === id);
        return TATA.askConfirm({
            title: 'ลบ SVG',
            message: `ลบ "${itemLabel(item)}" ออกจาก Keep หรือไม่ ไฟล์จะถูกลบออกจากเครื่อง`,
            confirmLabel: 'ลบ',
            danger: true
        }).then(ok => {
            if (ok) removeItem(id);
            return ok;
        });
    }

    // ==========================================
    // Clear All
    // ==========================================
    function clearAll() {
        if (keeperItems.length === 0) return Promise.resolve(false);
        if (typeof TATA.askConfirm !== 'function') return Promise.resolve(false);
        const count = keeperItems.length;
        return TATA.askConfirm({
            title: 'ลบทั้งหมด',
            message: `ลบ SVG ทั้ง ${count} รายการ?\nไฟล์จะถูกลบออกจากเครื่อง`,
            confirmLabel: 'ลบทั้งหมด',
            danger: true
        }).then(ok => {
            if (!ok) return false;
            keeperItems.forEach(item => {
                if (item && item.file_path) deleteKeeperFile(item.file_path);
            });
            keeperItems = [];
            saveItems();
            renderGrid();
            showToast('Cleared all items', 'success');
            return true;
        });
    }

    function showToast(msg, type) {
        if (typeof TATA !== 'undefined' && typeof TATA.showToast === 'function') TATA.showToast(msg, type);
    }

    // ==========================================
    // Initialize on Load
    // ==========================================
    window.TATA = window.TATA || {};
    function reloadFromStorage() {
        loadItems();
        return renderGrid();
    }

    function openKeep() {
        if (eventsBound) return renderGrid();
        return init();
    }

    TATA.keep = {
        init: openKeep,
        openStorageFolder: openStorageFolder,
        applyCardSize: applyCardSize,
        cardSize: cardSize,
        refresh: renderGrid,
        reload: reloadFromStorage,
        clearAll: clearAll,
        previewCacheSize: function () { return svgPreviewCache.size; },
        limits: {
            bytes: MAX_SVG_BYTES,
            concurrency: MAX_PREVIEW_CONCURRENCY,
            cache: MAX_SVG_CACHE
        }
    };

})();
