/**
 * TATA V3 - Hotkeys Module
 * Contains: initHotkeys, saveHotkeys, renderHotkeys, setupSlotDrag, setupDraggableButtons
 */
(global => {
    'use strict';

    let hotkeys = [];
    let hotkeyCount = 5;

    function initHotkeys() {
        const savedCount = localStorage.getItem('tata_hotkey_count');
        if (savedCount) hotkeyCount = parseInt(savedCount);
        if (isNaN(hotkeyCount) || hotkeyCount < 1) hotkeyCount = 5;

        const saved = localStorage.getItem('tata_hotkeys');
        if (saved) {
            try { hotkeys = JSON.parse(saved); } catch (e) { }
        }

        while (hotkeys.length < hotkeyCount) {
            hotkeys.push(null);
        }

        setupSlotDelegation();
        renderHotkeys();
        setupDraggableButtons();
    }

    function saveHotkeys() {
        localStorage.setItem('tata_hotkeys', JSON.stringify(hotkeys));
    }

    function getHotkeyTextColor(color) {
        const match = String(color || '').replace('#', '').match(/^[0-9a-f]{6}$/i);
        if (!match) return '#171717';

        const hex = match[0];
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return ((r * 299 + g * 587 + b * 114) / 1000) > 155 ? '#171717' : '#f5f2e9';
    }

    function renderHotkeys() {
        const bar = document.getElementById('hotkey-bar');
        if (!bar) return;

        const cols = hotkeyCount > 5 ? 5 : hotkeyCount;
        bar.style.setProperty('--col-count', cols);

        for (let i = 0; i < hotkeyCount; i++) {
            const data = hotkeys[i];
            let slot = bar.querySelector(`.hotkey-slot[data-slot="${i + 1}"]`);

            if (!slot) {
                slot = document.createElement('div');
                slot.className = 'hotkey-slot';
                slot.dataset.slot = (i + 1);
                bar.appendChild(slot);
            }

            if (data) {
                slot.classList.add('filled');
                if (data.color) {
                    slot.style.background = data.color;
                    slot.style.color = getHotkeyTextColor(data.color);
                } else {
                    slot.style.background = '';
                    slot.style.color = '';
                }

                slot.title = data.label;
                slot.dataset.id = data.id;

                // Icon element
                let iconEl = slot.querySelector('.hotkey-icon');
                if (!iconEl) {
                    iconEl = document.createElement('span');
                    iconEl.className = 'hotkey-icon';
                    slot.appendChild(iconEl);
                }

                if (data.icon) {
                    iconEl.innerHTML = data.icon;
                    iconEl.style.fontSize = '';
                    iconEl.style.fontWeight = '';
                    iconEl.style.lineHeight = '';
                    const svg = iconEl.querySelector('svg');
                    if (svg) {
                        svg.setAttribute('width', '20');
                        svg.setAttribute('height', '20');
                        svg.style.width = '20px';
                        svg.style.height = '20px';
                        svg.style.minWidth = '20px';
                        svg.style.display = 'block';
                    }
                } else {
                    iconEl.textContent = data.label.substring(0, 2);
                    iconEl.style.fontSize = '12px';
                    iconEl.style.fontWeight = '700';
                    iconEl.style.lineHeight = '1';
                }

                // Name label
                let nameLabel = slot.querySelector('.hotkey-label');
                if (!nameLabel) {
                    nameLabel = document.createElement('span');
                    nameLabel.className = 'hotkey-label';
                    slot.appendChild(nameLabel);
                }
                nameLabel.textContent = data.label;

                // Remove button
                let removeBtn = slot.querySelector('.hotkey-remove');
                if (!removeBtn) {
                    removeBtn = document.createElement('span');
                    removeBtn.className = 'hotkey-remove';
                    removeBtn.innerHTML = '&times;';
                    removeBtn.title = 'Remove';
                    slot.appendChild(removeBtn);
                }
            } else {
                slot.classList.remove('filled');
                slot.style.background = '';
                slot.style.color = '';
                slot.title = "Drag a button here";
                slot.dataset.id = '';
                slot.textContent = '';
            }
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

        bar.addEventListener('click', e => {
            const slot = e.target.closest('.hotkey-slot');
            if (!slot) return;

            const index = parseInt(slot.dataset.slot, 10) - 1;

            // Remove button clicked
            if (e.target.closest('.hotkey-remove')) {
                e.stopPropagation();
                hotkeys[index] = null;
                saveHotkeys();
                renderHotkeys();
                return;
            }

            // Slot clicked: trigger the assigned button
            const data = hotkeys[index];
            if (!data || !data.id) return;
            const btn = document.getElementById(data.id);
            if (btn) {
                btn.click();
                slot.style.opacity = '0.5';
                setTimeout(() => { slot.style.opacity = '1'; }, 100);
            }
        });
    }

    function setupDraggableButtons() {
        const buttons = document.querySelectorAll('.tab-content button');
        buttons.forEach(btn => {
            btn.setAttribute('draggable', 'true');
            btn.addEventListener('dragstart', e => {
                const tabId = btn.closest('.tab-content') ? btn.closest('.tab-content').id : 'unknown';
                const label = btn.innerText.trim();
                let icon = null;
                const svg = btn.querySelector('svg');
                if (svg) {
                    icon = svg.outerHTML;
                }

                let color = null;
                btn.classList.forEach(cls => {
                    if (cls.startsWith('btn-')) {
                        color = cls.replace('btn-', '');
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
