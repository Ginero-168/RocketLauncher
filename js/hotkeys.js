/**
 * TATA V3 - Hotkeys Module
 * Contains: initHotkeys, saveHotkeys, renderHotkeys, setupSlotDrag, setupDraggableButtons
 */
(global => {
    'use strict';

    let hotkeys = [];
    let hotkeyCount = 5;

    let hotkeyListenersBound = false;

    function initHotkeys() {
        const savedCount = localStorage.getItem('tata_hotkey_count');
        if (savedCount) hotkeyCount = parseInt(savedCount);
        if (isNaN(hotkeyCount) || hotkeyCount < 1) hotkeyCount = 5;

        if (global.TATA && typeof global.TATA.readStoredHotkeys === 'function') {
            hotkeys = global.TATA.readStoredHotkeys() || [];
        } else {
            const saved = localStorage.getItem('tata_hotkeys');
            if (saved) {
                try { hotkeys = JSON.parse(saved); } catch (e) { hotkeys = []; }
            }
        }
        if (!Array.isArray(hotkeys)) hotkeys = [];
        hotkeys = hotkeys.map(entry => (
            entry && typeof entry === 'object' && entry.id != null && String(entry.id).trim() !== ''
                ? entry
                : null
        ));

        while (hotkeys.length < hotkeyCount) {
            hotkeys.push(null);
        }

        renderHotkeys();
        if (!hotkeyListenersBound) {
            setupSlotDelegation();
            hotkeyListenersBound = true;
        }
        setupDraggableButtons();
    }

    function saveHotkeys() {
        localStorage.setItem('tata_hotkeys', JSON.stringify(hotkeys));
    }

    // Built-in tools take their icon from this release, so a pinned tool
    // picks up icon updates; anything else keeps the icon it was pinned with.
    function iconFor(data) {
        const id = String(data.id || '');
        const defaults = global.TATA && global.TATA.v2Defaults && global.TATA.v2Defaults.tab_button;
        if (id.indexOf('btn_') === 0 && Array.isArray(defaults)) {
            for (let i = 0; i < defaults.length; i++) {
                if (defaults[i].id === id) return defaults[i].icon;
            }
        }
        return data.icon;
    }

    function fillSlot(slot, data, index) {
        slot.classList.add('filled');
        const tata = global.TATA || {};
        const color = tata.resolveColor ? (tata.resolveColor(data.color) || data.color) : data.color;
        if (typeof tata.applyTint === 'function') tata.applyTint(slot, color);

        slot.title = data.label || '';
        slot.dataset.id = data.id;
        slot.setAttribute('aria-label', 'Hotkey slot ' + (index + 1) + ', ' + (data.label || 'assigned action'));

        let iconEl = slot.querySelector('.hotkey-icon');
        if (!iconEl) {
            iconEl = document.createElement('span');
            iconEl.className = 'hotkey-icon';
            iconEl.setAttribute('aria-hidden', 'true');
            slot.appendChild(iconEl);
        }
        const icon = iconFor(data);
        const mounted = icon && typeof tata.mountSanitizedIcon === 'function'
            ? tata.mountSanitizedIcon(iconEl, icon, '')
            : false;
        if (!mounted) iconEl.textContent = String(data.label || '?').substring(0, 2);

        let nameLabel = slot.querySelector('.hotkey-label');
        if (!nameLabel) {
            nameLabel = document.createElement('span');
            nameLabel.className = 'hotkey-label';
            slot.appendChild(nameLabel);
        }
        nameLabel.textContent = data.label || '';

        // Shown on hover and keyboard focus by CSS (:hover / :focus-within).
        let removeBtn = slot.querySelector('.hotkey-remove');
        if (!removeBtn || removeBtn.tagName !== 'BUTTON') {
            const oldRemoveBtn = removeBtn;
            removeBtn = document.createElement('button');
            removeBtn.className = 'hotkey-remove';
            if (oldRemoveBtn) oldRemoveBtn.replaceWith(removeBtn);
            else slot.appendChild(removeBtn);
        }
        removeBtn.type = 'button';
        removeBtn.textContent = '\u00d7';
        removeBtn.setAttribute('aria-label', 'Remove hotkey from slot ' + (index + 1));
        removeBtn.title = 'Remove';
    }

    function clearSlot(slot, index) {
        slot.classList.remove('filled');
        const tata = global.TATA || {};
        if (typeof tata.applyTint === 'function') tata.applyTint(slot, '');
        slot.title = 'Drag a button here';
        slot.dataset.id = '';
        slot.setAttribute('aria-label', 'Hotkey slot ' + (index + 1) + ', empty');
        slot.textContent = '';
    }

    function renderHotkeys() {
        const bar = document.getElementById('hotkey-bar');
        if (!bar) return;

        const cols = hotkeyCount > 5 ? 5 : hotkeyCount;
        bar.style.setProperty('--col-count', cols);

        for (let i = 0; i < hotkeyCount; i++) {
            let slot = bar.querySelector(`.hotkey-slot[data-slot="${i + 1}"]`);
            if (!slot) {
                slot = document.createElement('div');
                slot.className = 'hotkey-slot tile';
                slot.dataset.slot = (i + 1);
                bar.appendChild(slot);
            }
            slot.classList.add('tile');
            slot.setAttribute('tabindex', '0');
            slot.setAttribute('role', 'button');
            if (hotkeys[i]) fillSlot(slot, hotkeys[i], i);
            else clearSlot(slot, i);
        }

        // Remove extra slots if hotkeyCount reduced
        Array.from(bar.querySelectorAll('.hotkey-slot')).forEach(slot => {
            const idx = parseInt(slot.dataset.slot, 10) - 1;
            if (idx >= hotkeyCount) slot.remove();
        });
    }

    // Event delegation for hotkey slots (set up once)
    function setupSlotDelegation() {
        if (TATA._hotkeyDelegated) return;
        const bar = document.getElementById('hotkey-bar');
        if (!bar) return;
        TATA._hotkeyDelegated = true;

        bar.addEventListener('dragover', e => {
            const slot = e.target.closest('.hotkey-slot');
            if (!slot) return;
            e.preventDefault();
            slot.classList.add('drag-over');
        });

        bar.addEventListener('dragleave', e => {
            const slot = e.target.closest('.hotkey-slot');
            if (slot) slot.classList.remove('drag-over');
        });

        bar.addEventListener('drop', e => {
            const slot = e.target.closest('.hotkey-slot');
            if (!slot) return;
            e.preventDefault();
            slot.classList.remove('drag-over');
            const index = parseInt(slot.dataset.slot) - 1;
            const raw = e.dataTransfer.getData('text/plain');
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    hotkeys[index] = data;
                    saveHotkeys();
                    renderHotkeys();
                } catch (e) { }
            }
        });

        bar.addEventListener('keydown', e => {
            const slot = e.target.closest('.hotkey-slot');
            if (!slot || e.target !== slot) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                activateSlot(slot);
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
            }
        });

        bar.addEventListener('keyup', e => {
            const slot = e.target.closest('.hotkey-slot');
            if (!slot || e.target !== slot || (e.key !== ' ' && e.key !== 'Spacebar')) return;
            e.preventDefault();
            activateSlot(slot);
        });

        bar.addEventListener('click', e => {
            const slot = e.target.closest('.hotkey-slot');
            if (!slot) return;

            // Remove button clicked
            if (e.target.closest('.hotkey-remove')) {
                e.stopPropagation();
                removeHotkey(slot);
                return;
            }

            // Slot clicked: trigger the assigned button
            activateSlot(slot);
        });
    }

    function activateSlot(slot) {
        const index = parseInt(slot.dataset.slot, 10) - 1;
        const data = hotkeys[index];
        if (!data || !data.id) return;
        const btn = document.getElementById(data.id);
        if (!btn) {
            hotkeys[index] = null;
            saveHotkeys();
            renderHotkeys();
            return;
        }
        btn.click();
    }

    function removeHotkey(slot) {
        const index = parseInt(slot.dataset.slot, 10) - 1;
        hotkeys[index] = null;
        saveHotkeys();
        renderHotkeys();
        slot.focus();
    }

    function setupDraggableButtons() {
        const buttons = document.querySelectorAll('.tab-content button');
        buttons.forEach(btn => {
            if (!btn.id || btn.dataset.hotkeyDragBound === '1') return;
            btn.dataset.hotkeyDragBound = '1';
            btn.setAttribute('draggable', 'true');
            btn.addEventListener('dragstart', e => {
                if (!btn.id) {
                    e.preventDefault();
                    return;
                }
                const tabId = btn.closest('.tab-content') ? btn.closest('.tab-content').id : 'unknown';
                const label = btn.innerText.trim();
                let icon = null;
                const svg = btn.querySelector('svg');
                if (svg) {
                    icon = svg.outerHTML;
                }

                // Panel buttons carry no user colour; a btn-<colour> class may.
                let color = null;
                const resolve = global.TATA && global.TATA.resolveColor;
                btn.classList.forEach(cls => {
                    if (!color && cls.indexOf('btn-') === 0 && resolve && resolve(cls.slice(4))) {
                        color = cls.slice(4);
                    }
                });

                e.dataTransfer.setData('text/plain', JSON.stringify({
                    id: btn.id,
                    label,
                    icon,
                    type: tabId,
                    color
                }));

                document.body.classList.add('dragging-mode');
            });

            btn.addEventListener('dragend', () => {
                document.body.classList.remove('dragging-mode');
            });
        });
    }

    // Export
    global.TATA = global.TATA || {};
    global.TATA.initHotkeys = initHotkeys;
    global.TATA.saveHotkeys = saveHotkeys;
    global.TATA.renderHotkeys = renderHotkeys;
    global.TATA.getHotkeys = () => { return hotkeys; };
    global.TATA.setHotkeys = newHotkeys => { hotkeys = newHotkeys; };

})(window);
