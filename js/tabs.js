/**
 * Rocket Launcher - Tabs Module
 * One switcher for mouse, keyboard, wheel and programmatic tab changes.
 * The tab bar fits the panel width (labels, or icons when narrow); it only
 * scrolls below the 20px-per-tab floor, and then keeps the active tab visible.
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    const MOVE_KEYS = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

    function tabButtons(list) {
        const root = list || document.querySelector('.tabs');
        if (!root) return [];
        return Array.from(root.querySelectorAll('.tab-btn'));
    }

    function applyTabSideEffects(targetId) {
        if (targetId !== 'tab_colors' && TATA.colorTools && typeof TATA.colorTools.stopEyeDropper === 'function') {
            TATA.colorTools.stopEyeDropper();
        }

        if (targetId === 'tab_market' && TATA.market && typeof TATA.market.open === 'function') {
            TATA.market.open();
        }

        if (targetId === 'tab_styles' && TATA.graphicStyles && typeof TATA.graphicStyles.refresh === 'function') {
            TATA.graphicStyles.refresh();
        }

        if (targetId === 'tab_colors' && TATA.colorTools) {
            if (!TATA._colorsReady) {
                try {
                    TATA.colorTools.init();
                    TATA._colorsReady = true;
                } catch (e) { console.error(e); }
            } else if (typeof TATA.colorTools.refreshWheel === 'function') {
                TATA.colorTools.refreshWheel();
            }
        }

        if (targetId === 'tab_keep' && TATA.keep) {
            if (!TATA._keepReady && typeof TATA.keep.init === 'function') {
                const pending = TATA.keep.init();
                TATA._keepReady = true;
                return pending;
            }
            if (typeof TATA.keep.refresh === 'function') return TATA.keep.refresh();
        }

        if (targetId === 'tab_selector' && TATA.census && typeof TATA.census.refresh === 'function') {
            TATA.census.refresh();
        }

        if (targetId === 'tab_editor') {
            if (TATA.ensureCodeMirror) {
                TATA.ensureCodeMirror(() => {
                    if (window.cmEditor) window.cmEditor.refresh();
                });
            } else if (window.cmEditor) {
                setTimeout(() => { window.cmEditor.refresh(); }, 50);
            }
        }
        return undefined;
    }

    // Only matters when the strip overflows (a panel under ~130px wide).
    function revealActiveTab(list) {
        const strip = list || document.querySelector('.tabs');
        if (!strip) return;
        const button = strip.querySelector('.tab-btn.active');
        if (!button || strip.scrollWidth <= strip.clientWidth) return;
        const start = button.offsetLeft;
        const end = start + button.offsetWidth;
        if (start < strip.scrollLeft) strip.scrollLeft = start;
        else if (end > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = end - strip.clientWidth;
    }

    // The script editor and the AI are one workbench inside the Tool tab,
    // shown in place of the button grid. 'tab_editor' and 'tab_ai' are kept
    // as names that open it, so callers written for the old tabs still work.
    const WORKBENCH = { tab_editor: 'editor', tab_ai: 'ai' };

    function workbenchOpen() {
        return !!document.body && document.body.classList.contains('workbench-open');
    }

    function setWorkbench(open) {
        if (document.body) document.body.classList.toggle('workbench-open', !!open);
    }

    function focusWorkbench(part) {
        if (part === 'ai') {
            const prompt = document.getElementById('prompt_input');
            if (prompt && typeof prompt.focus === 'function') {
                try { prompt.focus(); } catch (e) { /* not focusable yet */ }
            }
        }
    }

    // Style, Color and Keep share one tab, "Library". Its strip button points
    // at whichever of the three is in use, so each keeps its own panel, id
    // and behaviour; the row of chips under the strip switches between them.
    const LIBRARY = ['tab_styles', 'tab_colors', 'tab_keep'];
    const LIBRARY_KEY = 'tata_library_tab';

    function libraryButton() {
        return document.getElementById('tabbtn_library');
    }

    function pointLibraryAt(tabId, remember) {
        const button = libraryButton();
        if (button) {
            button.setAttribute('data-tab', tabId);
            button.setAttribute('aria-controls', tabId);
        }
        document.querySelectorAll('[data-subtab]').forEach(chip => {
            const on = chip.getAttribute('data-subtab') === tabId;
            chip.classList.toggle('is-on', on);
            chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        if (remember) {
            try { localStorage.setItem(LIBRARY_KEY, tabId); } catch (e) { /* not essential */ }
        }
    }

    /**
     * @param {string} tabId
     * @param {{user?: boolean}} [opts] user: the tab strip was used. Coming
     *   back to Tool from another tab then keeps the workbench as it was;
     *   pressing Tool while already there returns to the buttons.
     */
    function activateTab(tabId, opts) {
        const part = WORKBENCH[tabId];
        const current = document.body ? document.body.getAttribute('data-tab') : '';
        if (part) {
            tabId = 'tab_button';
            setWorkbench(true);
        } else if (tabId === 'tab_button' && (!(opts && opts.user) || current === 'tab_button')) {
            setWorkbench(false);
        }
        if (LIBRARY.indexOf(tabId) !== -1) pointLibraryAt(tabId, true);
        const buttons = tabButtons();
        buttons.forEach(button => {
            const on = button.getAttribute('data-tab') === tabId;
            button.classList.toggle('active', on);
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', on ? 'true' : 'false');
            button.tabIndex = on ? 0 : -1;
            if (!button.getAttribute('aria-controls')) button.setAttribute('aria-controls', button.getAttribute('data-tab'));
        });
        document.querySelectorAll('.tab-content').forEach(panel => {
            const on = panel.id === tabId;
            panel.classList.toggle('active', on);
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-hidden', on ? 'false' : 'true');
        });
        const market = document.getElementById('tabbtn_tab_market');
        if (market) {
            const on = tabId === 'tab_market';
            market.classList.toggle('active', on);
            market.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
        // CSS reads this (e.g. the Tools action row only shows on Tools).
        if (document.body) document.body.setAttribute('data-tab', tabId);
        revealActiveTab();
        if (tabId === 'tab_button' && workbenchOpen()) {
            applyTabSideEffects('tab_editor');
            focusWorkbench(part);
            return undefined;
        }
        return applyTabSideEffects(tabId);
    }

    let wheelLock = 0;

    function stepMenu(list, direction) {
        const buttons = tabButtons(list);
        const index = buttons.findIndex(button => button.classList.contains('active'));
        const next = index + direction;
        if (index < 0 || next < 0 || next >= buttons.length) return false;
        activateTab(buttons[next].getAttribute('data-tab'), { user: true });
        return true;
    }

    function wheelDelta(event) {
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return event.deltaX;
        return event.deltaY;
    }

    function moveTab(current, key) {
        const buttons = tabButtons();
        const index = buttons.indexOf(current);
        if (index < 0 || !buttons.length) return;
        let next = index;
        if (key === 'Home') next = 0;
        else if (key === 'End') next = buttons.length - 1;
        else next = (index + MOVE_KEYS[key] + buttons.length) % buttons.length;
        const button = buttons[next];
        if (!button) return;
        if (typeof button.focus === 'function') button.focus();
        activateTab(button.getAttribute('data-tab'), { user: true });
    }

    function bindTabList(root) {
        const list = root || document.querySelector('.tabs');
        if (!list || list.dataset.tabsBound === '1') return;
        list.dataset.tabsBound = '1';
        list.setAttribute('role', 'tablist');
        let lastLibrary = '';
        try { lastLibrary = localStorage.getItem(LIBRARY_KEY) || ''; } catch (e) { /* keep the default */ }
        if (LIBRARY.indexOf(lastLibrary) !== -1) pointLibraryAt(lastLibrary, false);
        document.querySelectorAll('[data-subtab]').forEach(chip => {
            chip.addEventListener('click', () => activateTab(chip.getAttribute('data-subtab')));
        });
        tabButtons(list).forEach(button => {
            const panelId = button.getAttribute('data-tab');
            if (!button.id) button.id = 'tabbtn_' + panelId;
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-controls', panelId);
            const selected = button.classList.contains('active');
            button.setAttribute('aria-selected', selected ? 'true' : 'false');
            button.tabIndex = selected ? 0 : -1;
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.setAttribute('role', 'tabpanel');
                panel.setAttribute('aria-labelledby', button.id);
                panel.setAttribute('aria-hidden', selected ? 'false' : 'true');
            }
        });

        // Wheel over the strip steps one tab per notch (throttled).
        list.addEventListener('wheel', event => {
            const delta = wheelDelta(event);
            if (!delta) return;
            event.preventDefault();
            const now = Date.now();
            if (now < wheelLock) return;
            if (Math.abs(delta) < 12) return;
            if (stepMenu(list, delta > 0 ? 1 : -1)) wheelLock = now + 320;
        }, { passive: false });

        list.addEventListener('click', event => {
            const button = event.target.closest && event.target.closest('.tab-btn');
            if (!button || !list.contains(button)) return;
            activateTab(button.getAttribute('data-tab'), { user: true });
        });

        list.addEventListener('keydown', event => {
            if (!Object.prototype.hasOwnProperty.call(MOVE_KEYS, event.key) && event.key !== 'Home' && event.key !== 'End') return;
            const button = event.target.closest && event.target.closest('.tab-btn');
            if (!button || !list.contains(button)) return;
            event.preventDefault();
            moveTab(button, event.key);
        });

        const market = document.getElementById('tabbtn_tab_market');
        if (market && market.dataset.marketBound !== '1') {
            market.dataset.marketBound = '1';
            market.addEventListener('click', () => activateTab('tab_market'));
        }

        const back = document.getElementById('btn_workbench_close');
        if (back && back.dataset.bound !== '1') {
            back.dataset.bound = '1';
            back.addEventListener('click', () => activateTab('tab_button'));
        }

        window.addEventListener('resize', () => revealActiveTab(list));
        revealActiveTab(list);
    }

    TATA.workbench = { isOpen: () => workbenchOpen() && document.body.getAttribute('data-tab') === 'tab_button' };
    TATA.activateTab = activateTab;
    TATA.bindTabList = bindTabList;
    TATA.revealActiveTab = revealActiveTab;
})();
