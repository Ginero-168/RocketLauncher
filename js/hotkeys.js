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

    function renderHotkeys() {
        const bar = document.getElementById('hotkey-bar');
        if (!bar) return;
        bar.innerHTML = '';

        const cols = hotkeyCount > 5 ? 5 : hotkeyCount;
        bar.style.setProperty('--col-count', cols);

        for (let i = 0; i < hotkeyCount; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotkey-slot';
            slot.dataset.slot = (i + 1);

            const data = hotkeys[i];
            if (data) {
                slot.classList.add('filled');
                if (data.color) {
                    slot.style.background = data.color;
                    slot.style.borderColor = data.color;
                    slot.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.2)';
                    slot.style.color = '#ffffff';
                } else {
                    slot.style.background = '';
                    slot.style.borderColor = '';
                    slot.style.boxShadow = '';
                }

                // Icon element
                const iconEl = document.createElement('span');
                iconEl.className = 'hotkey-icon';

                if (data.icon) {
                    iconEl.innerHTML = data.icon;
                    const svg = iconEl.querySelector('svg');
                    if (svg) {
                        svg.setAttribute('width', '14');
                        svg.setAttribute('height', '14');
                        svg.style.width = '14px';
                        svg.style.height = '14px';
                        svg.style.minWidth = '14px';
                        svg.style.display = 'block';
                    }
                } else {
                    iconEl.textContent = data.label.substring(0, 2);
                    iconEl.style.fontSize = '11px';
                    iconEl.style.fontWeight = '700';
                    iconEl.style.lineHeight = '1';
                }
                slot.appendChild(iconEl);
                slot.title = data.label;

                // Name label (small text below icon)
                const nameLabel = document.createElement('span');
                nameLabel.className = 'hotkey-label';
                nameLabel.textContent = data.label;
                slot.appendChild(nameLabel);

                const removeBtn = document.createElement('span');
                removeBtn.className = 'hotkey-remove';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Remove';
                removeBtn.onclick = (idx => {
                    return e => {
                        e.stopPropagation();
                        hotkeys[idx] = null;
                        saveHotkeys();
                        renderHotkeys();
                    };
                })(i);
                slot.appendChild(removeBtn);

                slot.onclick = (slotData => {
                    return function () {
                        // Default: trigger button click
                        const btn = document.getElementById(slotData.id);
                        if (btn) {
                            btn.click();
                            this.style.opacity = '0.5';
                            const self = this;
                            setTimeout(() => { self.style.opacity = '1'; }, 100);
                        }
                    };
                })(data);
            } else {
                slot.title = "Drag a button here";
            }

            bar.appendChild(slot);
        }
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
