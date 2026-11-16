/**
 * Rocket Launcher - Panel wiring
 * Glue that does not belong to a single feature module: collapsible
 * sections, tab wiring (including drag-to-tab), the Tools "New" button,
 * and pausing background work while the panel is hidden or collapsed.
 */
(() => {
	'use strict';

	window.TATA = window.TATA || {};

	// ==========================================
	// Collapsible sections (Colors tab)
	// ==========================================
	document.addEventListener('click', e => {
		const header = e.target.closest && e.target.closest('.section-header');
		if (!header) return;
		const nested = e.target.closest('button, input, a');
		if (nested && nested !== header) return;
		const card = header.closest('.section-card');
		if (!card) return;
		const collapsed = card.classList.toggle('collapsed');
		header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
		if (!collapsed && TATA.colorTools && typeof TATA.colorTools.refreshWheel === 'function') {
			TATA.colorTools.refreshWheel();
		}
	});

	// ==========================================
	// Tabs: bind the strip; dragging a button over a tab opens that tab
	// ==========================================
	function setupTabsV2() {
		const tabStrip = document.querySelector('.tabs');
		if (typeof TATA.bindTabList === 'function') TATA.bindTabList(tabStrip);

		// Keep cards drag files out to Illustrator, not between tabs.
		let dragFromKeep = false;
		document.addEventListener('dragstart', event => {
			dragFromKeep = !!(event.target && event.target.closest && event.target.closest('#tab_keep'));
		});
		document.addEventListener('dragend', () => { dragFromKeep = false; });

		document.querySelectorAll('.tab-btn').forEach(tab => {
			tab.addEventListener('dragenter', function (e) {
				if (dragFromKeep) return;
				e.preventDefault();
				if (typeof TATA.activateTab === 'function') TATA.activateTab(this.getAttribute('data-tab'));
			});
			tab.addEventListener('dragover', e => { e.preventDefault(); });
			tab.addEventListener('drop', e => { e.preventDefault(); });
		});
	}

	// ==========================================
	// Tools actions, Settings and Updates
	// ==========================================
	function setupAddScriptUI() {
		if (typeof TATA.bindSettings === 'function') TATA.bindSettings();
		if (typeof TATA.bindUpdates === 'function') TATA.bindUpdates();

		// "New" opens the workbench on the AI prompt: describe the script, review it, save it.
		const btnAdd = document.getElementById('btn_add_script');
		if (btnAdd && btnAdd.dataset.bound !== '1') {
			btnAdd.dataset.bound = '1';
			btnAdd.addEventListener('click', () => {
				if (typeof TATA.activateTab === 'function') TATA.activateTab('tab_ai');
				const prompt = document.getElementById('prompt_input');
				if (prompt) prompt.focus();
			});
		}
	}

	// ==========================================
	// Pause polling while hidden or collapsed
	// ==========================================
	function pauseBackgroundWork() {
		if (TATA.colorTools && typeof TATA.colorTools.stopEyeDropper === 'function') {
			TATA.colorTools.stopEyeDropper();
		}
	}

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) pauseBackgroundWork();
	});

	if (document.body && typeof MutationObserver === 'function') {
		new MutationObserver(() => {
			if (document.body.classList.contains('collapsed')) pauseBackgroundWork();
		}).observe(document.body, { attributes: true, attributeFilter: ['class'] });
	}

	TATA.setupTabsV2 = setupTabsV2;
	TATA.setupAddScriptUI = setupAddScriptUI;
})();
