/**
 * TATA V3 - Hotkeys Module
 * Contains: initHotkeys, saveHotkeys, renderHotkeys, setupSlotDrag, setupDraggableButtons
 */
(function (global) {
    'use strict';

    var hotkeys = [];
    var hotkeyCount = 5;

    function initHotkeys() {
        var savedCount = localStorage.getItem('tata_hotkey_count');
        if (savedCount) hotkeyCount = parseInt(savedCount);
        if (isNaN(hotkeyCount) || hotkeyCount < 1) hotkeyCount = 5;

        var saved = localStorage.getItem('tata_hotkeys');
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
        var bar = document.getElementById('hotkey-bar');
        if (!bar) return;
        bar.innerHTML = '';

        var cols = hotkeyCount > 5 ? 5 : hotkeyCount;
        bar.style.setProperty('--col-count', cols);

        for (var i = 0; i < hotkeyCount; i++) {
            var slot = document.createElement('div');
            slot.className = 'hotkey-slot';
            slot.dataset.slot = (i + 1);

            var data = hotkeys[i];
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

                // Flow type: show 🎬 emoji
                if (data.type === 'flow') {
                    slot.innerText = '🎬';
                    slot.style.fontSize = '14px';
                } else if (data.icon) {
                    var iconSpan = document.createElement('span');
                    iconSpan.innerHTML = data.icon;
                    var svg = iconSpan.querySelector('svg');
                    if (svg) {
                        svg.setAttribute('width', '16');
                        svg.setAttribute('height', '16');
                        svg.style.width = '16px';
                        svg.style.height = '16px';
                        svg.style.minWidth = '16px';
                        svg.style.display = 'block';
                    }
                    slot.appendChild(iconSpan);
                } else {
                    slot.innerText = data.label.substring(0, 3);
                }
                slot.title = data.label;

                var removeBtn = document.createElement('span');
                removeBtn.className = 'hotkey-remove';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Remove';
                removeBtn.onclick = (function (idx) {
                    return function (e) {
                        e.stopPropagation();
                        hotkeys[idx] = null;
                        saveHotkeys();
                        renderHotkeys();
                    };
                })(i);
                slot.appendChild(removeBtn);

                slot.onclick = (function (slotData) {
                    return function () {
                        // Flow type: run flow directly
                        if (slotData.type === 'flow' && typeof TATA.playFlow === 'function') {
                            TATA.playFlow(slotData.id);
                            this.style.opacity = '0.5';
                            var self = this;
                            setTimeout(function () { self.style.opacity = '1'; }, 100);
                            return;
                        }
                        // Default: trigger button click
                        var btn = document.getElementById(slotData.id);
                        if (btn) {
                            btn.click();
                            this.style.opacity = '0.5';
                            var self = this;
                            setTimeout(function () { self.style.opacity = '1'; }, 100);
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
        var bar = document.getElementById('hotkey-bar');
        if (!bar) return;
        TATA._hotkeyDelegated = true;

        bar.addEventListener('dragover', function (e) {
            var slot = e.target.closest('.hotkey-slot');
            if (!slot) return;
            e.preventDefault();
            slot.classList.add('drag-over');
        });

        bar.addEventListener('dragleave', function (e) {
            var slot = e.target.closest('.hotkey-slot');
            if (slot) slot.classList.remove('drag-over');
        });

        bar.addEventListener('drop', function (e) {
            var slot = e.target.closest('.hotkey-slot');
            if (!slot) return;
            e.preventDefault();
            slot.classList.remove('drag-over');
            var index = parseInt(slot.dataset.slot) - 1;
            var raw = e.dataTransfer.getData('text/plain');
            if (raw) {
                try {
                    var data = JSON.parse(raw);
                    hotkeys[index] = data;
                    saveHotkeys();
                    renderHotkeys();
                } catch (e) { }
            }
        });
    }

    function setupDraggableButtons() {
        var buttons = document.querySelectorAll('.tab-content button');
        buttons.forEach(function (btn) {
            btn.setAttribute('draggable', 'true');
            btn.addEventListener('dragstart', function (e) {
                var tabId = btn.closest('.tab-content') ? btn.closest('.tab-content').id : 'unknown';
                var label = btn.innerText.trim();
                var icon = null;
                var svg = btn.querySelector('svg');
                if (svg) {
                    icon = svg.outerHTML;
                }

                var color = null;
                btn.classList.forEach(function (cls) {
                    if (cls.startsWith('btn-')) {
                        color = cls.replace('btn-', '');
                    }
                });

                e.dataTransfer.setData('text/plain', JSON.stringify({
                    id: btn.id,
                    label: label,
                    icon: icon,
                    type: tabId,
                    color: color
                }));

                document.body.classList.add('dragging-mode');
            });

            btn.addEventListener('dragend', function () {
                document.body.classList.remove('dragging-mode');
            });
        });
    }

    // Export
    global.TATA = global.TATA || {};
    global.TATA.initHotkeys = initHotkeys;
    global.TATA.saveHotkeys = saveHotkeys;
    global.TATA.renderHotkeys = renderHotkeys;
    global.TATA.getHotkeys = function () { return hotkeys; };
    global.TATA.setHotkeys = function (newHotkeys) { hotkeys = newHotkeys; };

})(window);
