(function () {
	'use strict';

	// ==========================================
	// Local aliases to TATA.* modules
	// (defined in core.js, state.js, modals.js, tabs.js)
	// ==========================================
	var debounce = TATA.debounce;
	var safeParse = TATA.safeParse;
	var safeCall = TATA.safeCall;
	var cacheDOM = TATA.cacheDOM;
	var DOM = TATA.DOM;
	var checkStorageVersion = TATA.checkStorageVersion;
	var backupBeforeSave = TATA.backupBeforeSave;
	var restoreFromBackup = TATA.restoreFromBackup;
	var verifyPanelHealth = TATA.verifyPanelHealth;
	var showToast = TATA.showToast;
	var showInputModal = TATA.showInputModal;
	var showConfirmModal = TATA.showConfirmModal;
	var switchTab = TATA.switchTab;
	var moveButtonToTab = TATA.moveButtonToTab;

	var csInterface = new CSInterface();
	var extensionPath = "";

	// Export Core System Variables to TATA for modules to use
	window.TATA = window.TATA || {};
	window.TATA.getCSInterface = function () { return csInterface; };
	window.TATA.getExtensionPath = function () { return extensionPath; };
	var userScripts = {}; // Global User Scripts
	window.TATA.getUserScripts = function () { return userScripts; };
	window.TATA.setUserScripts = function (s) { userScripts = s; };
	var pickerMode = localStorage.getItem('tata_picker_mode') || 'os'; // Global Picker Setting

	// Context Menu Globals
	var contextMenuEl = null;
	var currentContextScriptId = null;

	window.swapContrastColors = function () {
		var bgEl = document.getElementById('cc_bg_hex');
		var textEl = document.getElementById('cc_text_hex');
		if (!bgEl || !textEl) return;

		var temp = bgEl.value;
		bgEl.value = textEl.value;
		textEl.value = temp;

		updateContrastUI();
	};

	function init() {
		// V3: Cache DOM elements first
		cacheDOM();

		// V3: Check storage version for migrations
		checkStorageVersion();

		// V3: Apply saved theme
		var savedTheme = localStorage.getItem('tata_theme');
		if (savedTheme === 'light') {
			document.body.classList.add('light-theme');
		}

		try {
			extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
		} catch (e) { }

		// Fallback: If SystemPath failed, derive from URL
		if (!extensionPath) {
			var path = window.location.href;
			if (path.indexOf('file://') === 0) {
				path = path.substring(7);
			}
			// Remove filename (index.html)
			var lastSlash = path.lastIndexOf('/');
			if (lastSlash !== -1) {
				path = path.substring(0, lastSlash);
			}
			extensionPath = decodeURIComponent(path);
		}



		// Determine Context (Main Panel vs Sub-Panel)
		var isColorPanel = window.location.href.indexOf('colors.html') !== -1;

		if (isColorPanel) {
			// ==================== COLORS PANEL INIT ====================
			try { setupCreative(); } catch (e) { alert("SetupCreative Error: " + e); }

			// Init Color-Specific Context Menu or Features if needed
			// For now, Creative setup is sufficient + Custom Picker
		} else {
			// ==================== MAIN PANEL INIT ====================

			// Initialize Layout FIRST (so we have a target for user scripts)
			try { initDragLayout(); } catch (e) { }

			// V2: Setup Uniform Grid Tabs
			setupTabsV2();

			// Old setupTabs was: setupTabs(); 
			// We will replace it with V2 logic below.

			userScripts = initUserScripts(); // Adds orphans to layout

			// RESTORED UI ENABLING CALLS (Previously hidden inside initUserScripts)
			if (typeof setupAddScriptUI === 'function') setupAddScriptUI();
			if (typeof startContextMenu === 'function') startContextMenu();
			if (typeof setupErrorUI === 'function') setupErrorUI();

			// setupPanelToggle is Main Panel only
			setupPanelToggle();

			// Initialize Features (Hotkeys are Main Panel only)
			try { initHotkeys(); } catch (e) { }

			renderGrid();

			// Initialize Scripting (Editor + AI Helper tabs)
			if (typeof TATA.initScripting === 'function') {
				TATA.initScripting();
			}

			// Initialize Flow tab
			if (typeof TATA.initFlow === 'function') {
				TATA.initFlow();
			}

			// V3: Verify panel health after all rendering
			setTimeout(verifyPanelHealth, 200);
		}

		// COMMON INIT
		// load Host Script (Monolithic)
		csInterface.evalScript('$.evalFile("' + extensionPath + '/jsx/hostscript.jsx")');
	}



	window.openGlobalColorPicker = function (callback, initialColor) {
		// Create modal if needed
		var modalId = 'global_color_picker';
		var modal = document.getElementById(modalId);

		if (!modal) {
			modal = document.createElement('div');
			modal.id = modalId;
			modal.className = 'modal'; // Reuse existing modal styles
			modal.innerHTML =
				'<div class="modal-content" style="max-width:250px;">' +
				'<h3>Select Color</h3>' +
				'<div style="margin-bottom:10px;">' +
				'<label>Presets</label>' +
				'<div class="color-swatches" style="display:flex; gap:8px; justify-content:center; margin-bottom:15px;">' +
				'<div class="color-swatch swatch-red" data-color="red" data-hex="#e74c3c"></div>' +
				'<div class="color-swatch swatch-orange" data-color="orange" data-hex="#e67e22"></div>' +
				'<div class="color-swatch swatch-yellow" data-color="yellow" data-hex="#f1c40f"></div>' +
				'<div class="color-swatch swatch-green" data-color="green" data-hex="#2ecc71"></div>' +
				'<div class="color-swatch swatch-blue" data-color="blue" data-hex="#3498db"></div>' +
				'<div class="color-swatch swatch-purple" data-color="purple" data-hex="#9b59b6"></div>' +
				'<div class="color-swatch swatch-gray" data-color="gray" data-hex="#95a5a6"></div>' +
				'</div>' +
				'</div>' +
				'<div class="control-group">' +
				'<label>Custom Hex</label>' +
				'<div style="display:flex; gap:5px;">' +
				'<input type="color" id="gcp_native" style="width:30px; height:30px; padding:0; border:none; background:none;">' +
				'<input type="text" id="gcp_hex" placeholder="#RRGGBB" style="flex:1;">' +
				'</div>' +
				'</div>' +
				'<div class="modal-actions">' +
				'<button id="gcp_cancel" class="secondary">Cancel</button>' +
				'<button id="gcp_ok" class="primary">Select</button>' +
				'</div>' +
				'</div>';
			document.body.appendChild(modal);
		}

		var inpNative = document.getElementById('gcp_native');
		var inpHex = document.getElementById('gcp_hex');
		var btnOk = document.getElementById('gcp_ok');
		var btnCancel = document.getElementById('gcp_cancel');
		var swatches = modal.querySelectorAll('.color-swatch');

		// Reset State
		inpHex.value = initialColor || '#FF0000';
		inpNative.value = initialColor || '#FF0000';
		swatches.forEach(function (s) { s.classList.remove('selected'); });

		// Handlers
		var onSwatch = function (e) {
			var hex = e.target.getAttribute('data-hex');
			if (hex) {
				inpHex.value = hex;
				inpNative.value = hex;
				swatches.forEach(function (s) { s.classList.remove('selected'); });
				e.target.classList.add('selected');
			}
		};
		swatches.forEach(function (s) { s.onclick = onSwatch; });

		var onNative = function () {
			inpHex.value = inpNative.value;
			swatches.forEach(function (s) { s.classList.remove('selected'); });
		};
		inpNative.oninput = onNative;

		var onHex = function () {
			inpNative.value = inpHex.value;
			swatches.forEach(function (s) { s.classList.remove('selected'); });
		};
		inpHex.oninput = onHex;

		var onConfirm = function () {
			var val = inpHex.value;
			cleanup();
			if (callback) callback(val);
		};

		var onDismiss = function () {
			cleanup();
		};

		function cleanup() {
			modal.classList.remove('active');
			btnOk.onclick = null;
			btnCancel.onclick = null;
		}

		btnOk.onclick = onConfirm;
		btnCancel.onclick = onDismiss;

		modal.classList.add('active');
	};

	var runScript = TATA.runScript;

	function setupDimension() {
		var btn = document.getElementById('btn_dimension');
		if (btn) {
			btn.addEventListener('click', function () {
				showInputModal("Dimension Settings", [
					{ key: 'size', label: 'Size % (default 100):', default: '100', storageKey: 'tata_dim_size' },
					{ key: 'name', label: 'Artboard Name (Optional):', default: '', storageKey: 'tata_dim_name' },
					{ key: 'allArtboards', label: 'Apply to All Artboards', type: 'checkbox', default: false, storageKey: 'tata_dim_all' }
				], function (res) {
					if (!res || !res.size) return;

					if (res.allArtboards) {
						runScript('DimensionAll.jsx', { size: res.size });
					} else {
						runScript('DimensionSingle.jsx', { size: res.size, name: res.name });
					}
				});
			});
		}
	}


	function setupSwift() {
		// Helper to attach safe listener
		function attach(id, script) {
			var btn = document.getElementById(id);
			if (btn && !btn._bound) {
				btn._bound = true;
				btn.addEventListener('click', function () {

					// INTERCEPT FOR DIMENSION
					if (id === 'btn_dimension') {
						runScript('DimensionDialog.jsx'); // Script now has its own dialog
						return;
					}

					// Standard Run - all scripts handle their own dialogs now
					runScript(script);
				});
			}
		}

		attach('btn_fit', 'Fit.jsx');
		attach('btn_resize', 'ResizeDialog.jsx');
		attach('btn_follow', 'Follow.jsx');
		attach('btn_arrange', 'ArrangeDialog.jsx');
		attach('btn_stars', 'Stars.jsx');
		attach('btn_palette', 'PaletteGenerator.jsx');
		attach('btn_embed', 'Embed.jsx');
		attach('btn_dimension'); // Add dimension button
		attach('btn_smart_clean', 'SmartClean.jsx'); // Smart Clean now uses JSX dialog
	}

	var effectsSetupDone = false;

	function setupEffects() {
		// Prevent duplicate setup
		if (effectsSetupDone) return;
		effectsSetupDone = true;

		// Smart Clean now uses native JSX dialog - no HTML modal needed

		// ====================  SYMBOL BUTTONS ====================
		var btnSymbolsList = document.getElementById('btn_symbols_list');
		if (btnSymbolsList) {
			btnSymbolsList.addEventListener('click', function () {
				csInterface.evalScript('TATA.run("listSymbols", "{}")', function (res) {
					alert(res || 'Symbol list');
				});
			});
		}

		var btnSymbolReplace = document.getElementById('btn_symbol_replace');
		if (btnSymbolReplace) {
			btnSymbolReplace.addEventListener('click', function () {
				csInterface.evalScript('TATA.run("replaceSymbol", "{}")', function (res) {
					alert(res || 'Symbol replace');
				});
			});
		}

		var btnSymbolBreak = document.getElementById('btn_symbol_break');
		if (btnSymbolBreak) {
			btnSymbolBreak.addEventListener('click', function () {
				csInterface.evalScript('TATA.run("breakSymbolLink", "{}")', function (res) {
					alert(res || 'Symbol links broken');
				});
			});
		}

		var btnSymbolCreate = document.getElementById('btn_symbol_create');
		if (btnSymbolCreate) {
			btnSymbolCreate.addEventListener('click', function () {
				var name = prompt("Symbol name:", "New Symbol");
				if (name) {
					csInterface.evalScript('TATA.run("createSymbol", "{\\"name\\":\\"' + name + '\\"}")', function (res) {
						alert(res || 'Symbol created');
					});
				}
			});
		}

		// ====================  EFFECT BUTTONS ====================
		var btnEffectShadow = document.getElementById('btn_effect_shadow');
		if (btnEffectShadow) {
			btnEffectShadow.addEventListener('click', function () {
				csInterface.evalScript('TATA.run("applyDropShadow", "{}")', function (res) {
					alert(res || 'Shadow applied');
				});
			});
		}

		var btnEffectGlow = document.getElementById('btn_effect_glow');
		if (btnEffectGlow) {
			btnEffectGlow.addEventListener('click', function () {
				csInterface.evalScript('TATA.run("applyGlow", "{}")', function (res) {
					alert(res || 'Glow applied');
				});
			});
		}

		var btnEffect3D = document.getElementById('btn_effect_3d');
		if (btnEffect3D) {
			btnEffect3D.addEventListener('click', function () {
				csInterface.evalScript('TATA.run("apply3D", "{}")', function (res) {
					alert(res || '3D applied');
				});
			});
		}

		var btnEffectRemove = document.getElementById('btn_effect_remove');
		if (btnEffectRemove) {
			btnEffectRemove.addEventListener('click', function () {
				csInterface.evalScript('TATA.run("removeEffects", "{}")', function (res) {
					alert(res || 'Effects removed');
				});
			});
		}

		// ====================  APPEARANCE BUTTONS ====================
		var btnAppearCopy = document.getElementById('btn_appear_copy');
		if (btnAppearCopy) {
			btnAppearCopy.addEventListener('click', function () {
				csInterface.evalScript('TATA.run("copyAppearance", "{}")', function (res) {
					alert(res || 'Appearance copied');
				});
			});
		}

		var btnAppearPaste = document.getElementById('btn_appear_paste');
		if (btnAppearPaste) {
			btnAppearPaste.addEventListener('click', function () {
				csInterface.evalScript('TATA.run("pasteAppearance", "{}")', function (res) {
					alert(res || 'Appearance pasted');
				});
			});
		}

		var btnAppearClear = document.getElementById('btn_appear_clear');
		if (btnAppearClear) {
			btnAppearClear.addEventListener('click', function () {
				csInterface.evalScript('TATA.run("clearAppearance", "{}")', function (res) {
					alert(res || 'Appearance cleared');
				});
			});
		}

		// ====================  BLEND MODE ====================
		var btnApplyBlend = document.getElementById('btn_apply_blend');
		if (btnApplyBlend) {
			btnApplyBlend.addEventListener('click', function () {
				var select = document.getElementById('select_blend_mode');
				var mode = select ? select.value : 'NORMAL';
				csInterface.evalScript('TATA.run("setBlendMode", "{\\"mode\\":\\"' + mode + '\\"}")', function (res) {
					alert(res || 'Blend mode applied');
				});
			});
		}
	}

	var setupPanelToggleDone = false;

	function setupPanelToggle() {
		// Prevent duplicate setup
		if (setupPanelToggleDone) return;
		setupPanelToggleDone = true;

		var btn = document.getElementById('btn_toggle_height');
		if (!btn) return;

		// 1. STATE PERSISTENCE
		var savedState = localStorage.getItem('tata_panel_collapsed');
		var isCollapsed = (savedState === 'true');

		// Helpers for Height
		function getCollapsedHeight() {
			var hotkeyBar = document.getElementById('hotkey-bar');
			// Only add 14px for the collapsed_strip, no extra padding
			return Math.ceil((hotkeyBar ? hotkeyBar.offsetHeight : 0) + 14);
		}

		// 2. INITIAL SYNC
		if (isCollapsed) {
			// Apply Collapsed UI
			document.body.classList.add('collapsed');
			btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>'; // Down Arrow
			btn.title = "Expand Panel";
			var tabsContent = document.querySelector('.tabs');
			if (tabsContent) tabsContent.style.display = 'none';

			// Force Resize (with slight delay)
			setTimeout(function () {
				csInterface.resizeContent(Math.floor(window.innerWidth), getCollapsedHeight());
			}, 100);

		} else {
			// Apply Expanded UI
			document.body.classList.remove('collapsed');
			btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>'; // Up Arrow
			btn.title = "Collapse Panel";

			// Safety: Force Expand if window is suspiciously small but state is Open
			if (window.innerHeight < 200) {
				var restoreH = parseInt(localStorage.getItem('tata_panel_last_height')) || 550;
				csInterface.resizeContent(Math.floor(window.innerWidth), restoreH);
			}
		}

		// 3. EVENT LISTENER
		btn.addEventListener('click', function () {
			try {
				if (!isCollapsed) {
					// --- ACTION: COLLAPSE ---
					if (window.innerHeight > 200) {
						var h = window.innerHeight;
						btn.dataset.lastHeight = h;
						localStorage.setItem('tata_panel_last_height', h);
					}

					var width = Math.floor(window.innerWidth);
					var tabsContent = document.querySelector('.tabs');
					if (tabsContent) tabsContent.style.display = 'none';

					csInterface.resizeContent(width, getCollapsedHeight());

					btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
					btn.title = "Expand Panel";
					document.body.classList.add('collapsed');
					isCollapsed = true;

				} else {
					// --- ACTION: EXPAND ---
					var tabsContent = document.querySelector('.tabs');
					if (tabsContent) tabsContent.style.display = '';

					var width = Math.floor(window.innerWidth);
					var restoreH = parseInt(btn.dataset.lastHeight) || parseInt(localStorage.getItem('tata_panel_last_height')) || 550;

					csInterface.resizeContent(width, restoreH);

					btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
					btn.title = "Collapse Panel";
					document.body.classList.remove('collapsed');
					isCollapsed = false;
				}

				// SAVE STATE
				localStorage.setItem('tata_panel_collapsed', isCollapsed);

			} catch (e) {
				console.error("Panel Toggle Error", e);
			}
		});

		// V3: Collapsed Strip Click Handler (for expanding from minimal state)
		var strip = document.getElementById('collapsed_strip');
		if (strip) {
			strip.addEventListener('click', function () {
				if (isCollapsed) {
					// --- ACTION: EXPAND ---
					var tabsContent = document.querySelector('.tabs');
					if (tabsContent) tabsContent.style.display = '';

					var width = Math.floor(window.innerWidth);
					var restoreH = parseInt(btn.dataset.lastHeight) || parseInt(localStorage.getItem('tata_panel_last_height')) || 550;

					csInterface.resizeContent(width, restoreH);

					btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
					btn.title = "Collapse Panel";
					document.body.classList.remove('collapsed');
					isCollapsed = false;

					// SAVE STATE
					localStorage.setItem('tata_panel_collapsed', isCollapsed);
				}
			});
		}
	}

	// ==========================================
	// ==========================================
	// Hotkey Feature (Delegated to module)
	// ==========================================
	var initHotkeys = TATA.initHotkeys;
	var saveHotkeys = TATA.saveHotkeys;
	var renderHotkeys = TATA.renderHotkeys;
	// TATA handles drag/drop logic natively inside its hotkeys.js rendering now.

	// NOTE: saveHotkeys() is defined earlier at line 808
	// Tab setup handled by setupTabsV2()

	// ==========================================
	// Drag-and-Drop Layout Customization
	// ==========================================
	var layoutState = {};

	function initDragLayout() {
		try {
			// FORCE RESET V21 (Silent Final):
			if (!localStorage.getItem('tata_reset_v21')) {
				localStorage.setItem('tata_reset_v21', 'true');
				localStorage.removeItem('tata_layout_v21'); // Clear new key
				localStorage.removeItem('tata_layout_state'); // Clear old key
				parseCurrentLayout();
				return;
			}

			// 1. Load or Parse Layout
			var savedLayout = localStorage.getItem('tata_layout_v21');
			if (savedLayout) {
				try {
					layoutState = JSON.parse(savedLayout);
				} catch (e) {
					parseCurrentLayout();
					return;
				}

				if (!layoutState['dimension']) {
					var dimTab = document.getElementById('dimension');
					if (dimTab) {
						var rows = [];
						dimTab.querySelectorAll('.row').forEach(function (row) {
							var ids = [];
							row.querySelectorAll('button').forEach(function (b) { if (b.id) ids.push(b.id); });
							if (ids.length) rows.push(ids);
						});
						layoutState['dimension'] = rows;
						saveLayout();
					}
				}
				renderGrid();
			} else {
				parseCurrentLayout();
			}
		} catch (e) {
			alert("Error in initDragLayout: " + e);
		}
	}

	function parseCurrentLayout() {
		layoutState = {
			'tab_button': []
		};
		saveLayout();
		renderGrid();
	}

	function saveLayout() {
		localStorage.setItem('tata_layout_v21', JSON.stringify(layoutState));

		// Ensure tab_button exists
		if (!layoutState['tab_button']) layoutState['tab_button'] = [];
	}


	// Init when Window Loaded (Safest)
	window.addEventListener('load', function () {
		try {
			init();
			// Features only for Main Panel
			if (window.location.href.indexOf('colors.html') === -1) {
				initHotkeys();
			}
			initContrastChecker();

			// Listen for Scripts from Scripting Panel
			csInterface.addEventListener("com.tata.pro.importScript", function (event) {
				try {
					var data = (typeof event.data === 'string') ? JSON.parse(event.data) : event.data;

					// 1. Auto-switch Focus: Moved to scripting.js SIDE
					// But we can try here too just in case
					// CSInterface.prototype.requestOpenExtension("com.tata.pro.panel", "");

					// 2. Add to Active Tab or Swift
					var activeTabEl = document.querySelector('.tab-btn.active');
					var targetTab = 'tab_button';

					// CRITICAL: Load latest layout from storage before modifing
					var saved = localStorage.getItem('tata_v2_layout');
					if (saved) {
						try {
							v2Layout = JSON.parse(saved);
						} catch (e) { console.error(e); }
					} else {
						v2Layout = JSON.parse(JSON.stringify(v2Defaults));
					}

					// Merge Defaults Logic
					Object.keys(v2Defaults).forEach(function (k) {
						if (!v2Layout[k]) {
							v2Layout[k] = JSON.parse(JSON.stringify(v2Defaults[k]));
						} else {
							v2Defaults[k].forEach(function (defaultItem) {
								var exists = v2Layout[k].some(function (item) {
									return item.id === defaultItem.id;
								});
								if (!exists) {
									v2Layout[k].unshift(JSON.parse(JSON.stringify(defaultItem)));
								}
							});
						}
					});

					// Ensure target array exists
					if (!v2Layout[targetTab]) v2Layout[targetTab] = [];

					var newItem = {
						id: data.id,
						label: data.name,
						icon: data.icon,
						code: data.code,
						type: 'code',
						color: data.color // V4 Color Handle
					};

					// Check if already exists (update instead of duplicate)
					var existingIndex = v2Layout[targetTab].findIndex(function (item) {
						return item.id === data.id;
					});

					if (existingIndex >= 0) {
						v2Layout[targetTab][existingIndex] = newItem;
						// Preserve position but update data
					} else {
						v2Layout[targetTab].push(newItem);
					}

					saveV2Layout();
					renderGrid();

					// Optional: Save to userScripts global store
					setTimeout(function () {
						saveUserScript(data.name, data.icon, data.code, data.color || 'gray', true, data.id, true);
					}, 100);

				} catch (e) {
					console.error("Import Event Error", e);
				}
			});

			// ==================== CONTEXT MENU: EDIT ====================
			var btnEdit = document.getElementById('ctx_edit');
			if (btnEdit) {
				btnEdit.onclick = function () {
					var id = window.currentContextScriptId;
					if (!id) return;

					// BLOCK DEFAULTS
					if (id.indexOf('btn_') === 0) {
						showToast("Default scripts cannot be edited.", "error");
						document.getElementById('context_menu').style.display = 'none';
						return;
					}

					// Find Data (Prioritize V2 Layout)
					var foundItem = null;
					['tab_button'].forEach(function (t) {
						if (v2Layout[t]) {
							var match = v2Layout[t].find(function (x) { return x.id === id; });
							if (match) foundItem = match;
						}
					});

					// Fallback to User Scripts
					if (!foundItem && userScripts[id]) {
						foundItem = userScripts[id];
						foundItem.code = foundItem.code;
					}

					if (foundItem && (foundItem.code || foundItem.script)) {
						document.getElementById('context_menu').style.display = 'none'; // Hide Menu

						// Open Scripting Panel
						CSInterface.prototype.requestOpenExtension("com.tata.pro.scripting", "");

						// Logic to load file content if it's a default script
						if (!foundItem.code && foundItem.script) {
							try {
								var fs = require('fs');
								var path = require('path');
								var scriptPath = path.join(extensionPath, 'jsx', foundItem.script);
								if (fs.existsSync(scriptPath)) {
									foundItem.code = fs.readFileSync(scriptPath, 'utf-8');
								} else {
									// Try absolute path if any
									if (fs.existsSync(foundItem.script)) {
										foundItem.code = fs.readFileSync(foundItem.script, 'utf-8');
									}
								}
							} catch (err) {
								// console.error("Could not read script file", err);
							}
						}

						// Send Data Delayed (to allow panel load)
						setTimeout(function () {
							var evt = new CSEvent("com.tata.pro.editScript", "APPLICATION");
							evt.data = JSON.stringify(foundItem);
							csInterface.dispatchEvent(evt);
						}, 800);
					} else {
						alert("Cannot edit this item (No inline code found).");
						document.getElementById('context_menu').style.display = 'none';
					}
				};
			}
			// ============================================================

			// Listen for Settings Request from Scripting Panel
			csInterface.addEventListener("com.tata.pro.requestSettings", function (event) {
				var apiKey = localStorage.getItem('tata_gemini_api_key') || "";
				var picker = localStorage.getItem('tata_picker_mode') || "os";

				var response = new CSEvent("com.tata.pro.settingsData", "APPLICATION");
				response.data = JSON.stringify({ apiKey: apiKey, pickerMode: picker });
				csInterface.dispatchEvent(response);
			});

		} catch (e) {
			alert("CRITICAL INIT ERROR: " + e);
		}
	});

	// ====================================================================================
	// =================================   USER SCRIPTS   =================================
	// ====================================================================================

	var initUserScripts = TATA.initUserScripts;

	var startContextMenu = TATA.startContextMenu;
	var updateItemColor = TATA.updateItemColor;

	function setupAddScriptUI() {
		// --- Modals ---
		var scriptModal = document.getElementById('script_modal');
		var settingsModal = document.getElementById('settings_modal');
		var aiModal = document.getElementById('ai_prompt_modal');

		// --- Buttons ---
		var btnAdd = document.getElementById('btn_add_script');
		var btnSettings = document.getElementById('btn_settings');
		var btnOpenAI = document.getElementById('btn_open_ai');

		// Script Modal Actions
		var btnSaveScript = document.getElementById('btn_save_script');
		var btnCancelScript = document.getElementById('btn_cancel_script');

		// Settings Modal Actions
		var btnSaveSettings = document.getElementById('btn_save_settings');
		var btnCancelSettings = document.getElementById('btn_cancel_settings');

		// AI Modal Actions
		var btnSubmitAI = document.getElementById('btn_submit_ai');
		var btnCancelAI = document.getElementById('btn_cancel_ai');

		// --- Inputs ---
		var inpApiKey = document.getElementById('setting_api_key');
		var inpPrompt = document.getElementById('ai_prompt_text');
		var loadingIndicator = document.getElementById('ai_loading');

		// ==================
		// 1. Settings Logic
		// ==================
		if (btnSettings) {
			btnSettings.addEventListener('click', function () {
				var savedKey = localStorage.getItem('tata_gemini_api_key');
				if (savedKey) inpApiKey.value = savedKey;

				// Load Picker Mode
				var elPicker = document.getElementById('setting_picker_mode');
				if (elPicker) elPicker.value = localStorage.getItem('tata_picker_mode') || 'os';

				// V3: Load Theme
				var elTheme = document.getElementById('setting_theme');
				var savedTheme = localStorage.getItem('tata_theme') || 'dark';
				if (elTheme) elTheme.value = savedTheme;

				// V3: Load AI Model
				var elModel = document.getElementById('setting_ai_model');
				var savedModel = localStorage.getItem('tata_ai_model') || 'gemini-2.0-flash';
				if (elModel) elModel.value = savedModel;

				// Load Count UI
				var savedCount = localStorage.getItem('tata_hotkey_count') || "5";
				document.getElementById('hotkey_count_display').textContent = savedCount;

				settingsModal.classList.add('active');
			});
		}

		// Check Models Logic
		var btnCheckModels = document.getElementById('btn_check_models');
		if (btnCheckModels) {
			btnCheckModels.addEventListener('click', async function () {
				var key = inpApiKey.value.trim();
				if (!key) {
					alert("Please enter API Key first.");
					return;
				}

				var btn = this;
				var loader = document.getElementById('model_check_loader');
				var msg = document.getElementById('model_check_msg');
				var select = document.getElementById('setting_ai_model');

				btn.disabled = true;
				loader.style.display = 'block';
				msg.textContent = "Checking API permissions...";
				msg.style.color = "#888";

				try {
					var listUrl = "https://generativelanguage.googleapis.com/v1beta/models?key=" + key;
					var res = await TATA.fetchWithTimeout(listUrl, {}, 15000);

					if (!res.ok) {
						throw new Error("HTTP " + res.status);
					}

					var data = await res.json();
					if (data.models) {
						// Filter for generateContent
						var validModels = data.models.filter(function (m) {
							return m.supportedGenerationMethods &&
								m.supportedGenerationMethods.indexOf("generateContent") !== -1 &&
								m.name.indexOf("gemini") !== -1;
						});

						if (validModels.length > 0) {
							// Clear existing
							select.innerHTML = "";

							// Sort: Pro models first, then Flash, then others
							validModels.sort(function (a, b) {
								var nameA = a.name.toLowerCase();
								var nameB = b.name.toLowerCase();
								// Pro > Flash > Others
								// Newer > Older (roughly based on numbers)
								return nameB.localeCompare(nameA);
							});

							validModels.forEach(function (m) {
								var opt = document.createElement('option');
								var shortName = m.name.replace("models/", "");
								opt.value = shortName;
								opt.text = m.displayName + " (" + shortName + ")";
								select.appendChild(opt);
							});

							msg.textContent = "✅ Found " + validModels.length + " models available for your key.";
							msg.style.color = "#10b981"; // Success Green

							// Auto-select first or previously selected if exists
							var savedModel = localStorage.getItem('tata_ai_model');
							if (savedModel) {
								// Check if saved exists in new list
								var exists = Array.from(select.options).some(function (o) { return o.value === savedModel; });
								if (exists) select.value = savedModel;
							}

						} else {
							msg.textContent = "⚠️ No compatible Gemini models found.";
							msg.style.color = "#f59e0b";
						}
					}

				} catch (e) {
					msg.textContent = "❌ Error: " + e.message + " (Check API Key)";
					msg.style.color = "#ef4444";
				} finally {
					btn.disabled = false;
					loader.style.display = 'none';
				}
			});
		}

		// Stepper Logic
		var btnMinus = document.querySelector('#stepper_hotkey_count .btn-minus');
		var btnPlus = document.querySelector('#stepper_hotkey_count .btn-plus');
		var display = document.getElementById('hotkey_count_display');

		if (btnMinus && btnPlus && display) {
			btnMinus.onclick = function () {
				var v = parseInt(display.textContent);
				if (v > 1) display.textContent = v - 1;
			};

			btnPlus.onclick = function () {
				var v = parseInt(display.textContent);
				if (v < 30) display.textContent = v + 1; // Limit 30
			};
		}

		// Factory Reset Logic
		var btnFactoryReset = document.getElementById('btn_factory_reset');
		var btnSaveSettings = document.getElementById('btn_save_settings');
		var btnCancelSettings = document.getElementById('btn_cancel_settings');

		// Guard: only attach listeners once per button
		if (btnFactoryReset && !btnFactoryReset._bound) {
			btnFactoryReset._bound = true;
			btnFactoryReset.addEventListener('click', function () {
				if (confirm("Are you sure you want to restore Factory Defaults?\n\nThis will DELETE ALL custom scripts/buttons and clear your settings.")) {
					// 1. Clear All LocalStorage
					localStorage.clear();

					// 2. Set 'v17' reset flag to true immediately so we don't trigger the parser logic unnecessarily (optional)
					// Actually, clearing it means initDragLayout will run parseCurrentLayout() which is what we want (reset to HTML state).

					// 3. Reload Panel
					location.reload();
				}
			});
		}

		if (btnSaveSettings && !btnSaveSettings._bound) {
			btnSaveSettings._bound = true;
			btnSaveSettings.addEventListener('click', function () {
				var key = inpApiKey.value.trim();
				if (key) {
					localStorage.setItem('tata_gemini_api_key', key);
				} else {
					localStorage.removeItem('tata_gemini_api_key');
				}

				// Save Picker Mode
				var elPicker = document.getElementById('setting_picker_mode');
				if (elPicker) {
					localStorage.setItem('tata_picker_mode', elPicker.value);
					pickerMode = elPicker.value; // Update Global
				}

				// V3: Save Theme
				var elTheme = document.getElementById('setting_theme');
				if (elTheme) {
					var theme = elTheme.value;
					localStorage.setItem('tata_theme', theme);
					if (theme === 'light') {
						document.body.classList.add('light-theme');
					} else {
						document.body.classList.remove('light-theme');
					}
				}

				// V3: Save AI Model
				var elModel = document.getElementById('setting_ai_model');
				if (elModel) {
					localStorage.setItem('tata_ai_model', elModel.value);
				}

				// Save Count
				var count = document.getElementById('hotkey_count_display').textContent;
				localStorage.setItem('tata_hotkey_count', count);

				// Reload Hotkeys
				initHotkeys();

				settingsModal.classList.remove('active');
			});
		}

		if (btnCancelSettings && !btnCancelSettings._bound) {
			btnCancelSettings._bound = true;
			btnCancelSettings.addEventListener('click', function () {
				settingsModal.classList.remove('active');
			});
		}

		// ==========================================
		// VERSION CHECK SYSTEM
		// ==========================================
		var CURRENT_VERSION = '6.0.0';
		var SUPABASE_URL = window.TATA_CONFIG ? window.TATA_CONFIG.SUPABASE_URL : '';
		var SUPABASE_KEY = window.TATA_CONFIG ? window.TATA_CONFIG.SUPABASE_KEY : '';

		function checkForUpdates() {
			var btnCheck = document.getElementById('btn_check_update');
			if (btnCheck) {
				btnCheck.textContent = 'Checking...';
				btnCheck.disabled = true;
			}

			fetch(SUPABASE_URL + '/rest/v1/app_version?id=eq.1', {
				headers: {
					'apikey': SUPABASE_KEY,
					'Authorization': 'Bearer ' + SUPABASE_KEY
				}
			})
				.then(function (res) { return res.json(); })
				.then(function (data) {
					if (data && data[0]) {
						var latestVersion = data[0].version;
						var downloadUrl = data[0].download_url;

						// Compare versions
						if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
							// New version available
							document.getElementById('new_version').textContent = 'v' + latestVersion;
							document.getElementById('download_link').href = downloadUrl;
							document.getElementById('update_available').style.display = 'block';
							showToast('🆕 Update available: v' + latestVersion);
						} else {
							showToast('✅ You have the latest version!');
							document.getElementById('update_available').style.display = 'none';
						}
					}
				})
				.catch(function (err) {
					showToast('❌ Failed to check updates');
					console.error(err);
				})
				.finally(function () {
					if (btnCheck) {
						btnCheck.textContent = 'Check Update';
						btnCheck.disabled = false;
					}
				});
		}

		function compareVersions(v1, v2) {
			var parts1 = v1.split('.').map(Number);
			var parts2 = v2.split('.').map(Number);
			for (var i = 0; i < 3; i++) {
				if ((parts1[i] || 0) > (parts2[i] || 0)) return 1;
				if ((parts1[i] || 0) < (parts2[i] || 0)) return -1;
			}
			return 0;
		}

		// Init version display
		var versionEl = document.getElementById('current_version');
		if (versionEl) versionEl.textContent = 'v' + CURRENT_VERSION;

		// Check update button
		var btnCheckUpdate = document.getElementById('btn_check_update');
		if (btnCheckUpdate) {
			btnCheckUpdate.addEventListener('click', checkForUpdates);
		}

		// Auto-check on startup (after 3 seconds)
		setTimeout(function () {
			fetch(SUPABASE_URL + '/rest/v1/app_version?id=eq.1', {
				headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
			})
				.then(function (res) { return res.json(); })
				.then(function (data) {
					if (data && data[0] && compareVersions(data[0].version, CURRENT_VERSION) > 0) {
						showToast('🆕 Update available! Check Settings.');
					}
				})
				.catch(function () { });
		}, 3000);

		// ==================
		// 2. Add Script Logic
		// ==================
		if (btnAdd) {
			btnAdd.addEventListener('click', function () {
				// Switch to AI Helper tab
				var aiTab = document.querySelector('.tab-btn[data-tab="tab_ai"]');
				if (aiTab) aiTab.click();
			});
		}



		if (btnCancelScript) {
			btnCancelScript.addEventListener('click', function () {
				scriptModal.classList.remove('active');
			});
		}

		if (btnSaveScript) {
			btnSaveScript.onclick = function () {
				var name = document.getElementById('script_name').value.trim();
				var code = document.getElementById('script_code').value.trim();


				var icon = document.getElementById('script_icon_val').value;
				if (!icon) icon = "★"; // Fallback

				var color = document.getElementById('script_color').value || "red";

				if (!name || !code) {
					alert("Name and Code are required.");
					return;
				}

				var isUpdate = (this.dataset.mode === "edit");
				var targetId = this.dataset.targetId;

				saveUserScript(name, icon, code, color, isUpdate, targetId);
				scriptModal.classList.remove('active');
			};
		}

		// Validate Script Button

		// ==================
		// 3. AI Prompt Logic
		// ==================
		if (btnOpenAI) {
			btnOpenAI.addEventListener('click', function () {
				var apiKey = localStorage.getItem('tata_gemini_api_key');
				if (!apiKey) {
					alert("Please set your Gemini API Key in Settings (⚙️) first.");
					return;
				}
				inpPrompt.value = "";
				loadingIndicator.style.display = 'none';
				btnSubmitAI.disabled = false;
				aiModal.classList.add('active');
			});
		}

		if (btnCancelAI) {
			btnCancelAI.addEventListener('click', function () {
				aiModal.classList.remove('active');
			});
		}

		if (btnSubmitAI) {
			btnSubmitAI.addEventListener('click', async function () {
				var apiKey = localStorage.getItem('tata_gemini_api_key');
				var userPrompt = inpPrompt.value.trim();

				if (!userPrompt) return;

				// Context Awareness: Inject existing code if available
				var currentCode = document.getElementById('script_code').value.trim();
				var finalPrompt = userPrompt;

				if (currentCode.length > 0) {
					finalPrompt = "My Current Code:\n```javascript\n" + currentCode + "\n```\n\n" +
						"Request: " + userPrompt + "\n\n" +
						"Please modify the code above to fulfill the request. Maintain the JSON return format.";
				}

				// Start Loading
				btnSubmitAI.disabled = true;
				loadingIndicator.style.display = 'inline-block';

				try {
					var scriptData = await generateScriptWithGemini(apiKey, finalPrompt);

					// Success! Fill parent modal
					document.getElementById('script_code').value = scriptData.code;

					// Always use AI name if available, or generate fallback
					if (scriptData.name) {
						document.getElementById('script_name').value = scriptData.name;
					} else if (!document.getElementById('script_name').value) {
						document.getElementById('script_name').value = "AI Script " + Math.floor(Math.random() * 1000);
					}

					// Close AI modal
					aiModal.classList.remove('active');

				} catch (e) {
					alert("AI Error: " + e.message);
				} finally {
					btnSubmitAI.disabled = false;
					loadingIndicator.style.display = 'none';
				}
			});
		}

		// ==================
		// 4. Color Swatch Logic
		// ==================
		var swatches = document.querySelectorAll('.color-swatch');
		swatches.forEach(function (swatch) {
			swatch.addEventListener('click', function () {
				// Update UI
				swatches.forEach(function (el) { el.classList.remove('selected'); });
				this.classList.add('selected');

				// Update Hidden Input
				var color = this.dataset.color;
				document.getElementById('script_color').value = color;
			});
		});


		// ==================
		// 5. Icon Grid Logic
		// ==================
		var icons = document.querySelectorAll('.icon-option');
		icons.forEach(function (opt) {
			opt.addEventListener('click', function () {
				// UI
				icons.forEach(function (el) { el.classList.remove('selected'); });
				this.classList.add('selected');

				// Value
				document.getElementById('script_icon_val').value = this.innerHTML;
			});
		});
	}

	async function generateScriptWithGemini(apiKey, prompt) {
		// ENHANCED SYSTEM PROMPT with Context and Examples
		var systemPrompt = "You are an expert Adobe Illustrator JSX/ExtendScript developer for the Rocket Launcher extension.\n\n" +
			"===== EXTENSION ARCHITECTURE =====\n" +
			"The extension has a centralized router system:\n" +
			"- Main router: TATA.run(commandName, paramsObject)\n" +
			"- Available commands: fitSelection, followWidth, embedAll, createPreview, generateColorPalette\n" +
			"- Utility functions: TATAUtils namespace (hexToRGB, getOrCreateLayer, etc.)\n" +
			"- Error handling: ErrorHandler.safeExecute(), ErrorHandler.withUndoGroup()\n\n" +

			"===== WORKING CODE EXAMPLES =====\n" +
			"EXAMPLE 1 - Basic Selection Check:\n" +
			"if (app.documents.length === 0) { alert('Please open a document first.'); return; }\n" +
			"var doc = app.activeDocument;\n" +
			"if (doc.selection.length === 0) { alert('Please select objects.'); return; }\n\n" +

			"EXAMPLE 2 - Resize with Error Handling:\n" +
			"try {\n" +
			"  for (var i = 0; i < doc.selection.length; i++) {\n" +
			"    var item = doc.selection[i];\n" +
			"    var scale = (200 / item.width) * 100;\n" +
			"    item.resize(scale, scale);\n" +
			"  }\n" +
			"  alert('Resized ' + doc.selection.length + ' objects');\n" +
			"} catch (e) { alert('Error: ' + e.message); }\n\n" +

			"EXAMPLE 3 - Using TATA.run():\n" +
			"var result = TATA.run('fitSelection', {});\n" +
			"if (result && result.success) { alert(result.message); }\n\n" +

			"EXAMPLE 4 - Creating Objects:\n" +
			"var layer = TATAUtils.getOrCreateLayer(doc, 'My Layer');\n" +
			"var rect = layer.pathItems.rectangle(100, 100, 200, 150);\n" +
			"var color = new RGBColor();\n" +
			"color.red = 255; color.green = 100; color.blue = 50;\n" +
			"rect.fillColor = color; rect.stroked = false;\n\n" +

			"===== CRITICAL RULES =====\n" +
			"1. THIS IS ADOBE ILLUSTRATOR ONLY (not After Effects or Photoshop)\n" +
			"2. NEVER use app.beginUndoGroup() or app.endUndoGroup() - use ErrorHandler.withUndoGroup()\n" +
			"3. NEVER use activeDocument.artLayers - that's Photoshop. Use doc.layers\n" +
			"4. NEVER use suspendRedraw or suspendHistory - not supported in Illustrator\n" +
			"5. ALWAYS check app.documents.length > 0 before accessing activeDocument\n" +
			"6. ALWAYS check selection.length before accessing selection items\n" +
			"7. ALWAYS use try-catch blocks for operations that might fail\n" +
			"8. Color objects MUST use 'new' keyword: var color = new RGBColor();\n" +
			"9. Test typename before operations: if (item.typename === 'PathItem')\n" +
			"10. When iterating selection, iterate backwards if removing items\n\n" +

			"===== OUTPUT FORMAT =====\n" +
			"You MUST return ONLY in this exact format:\n" +
			"[NAME]Script Name Here[/NAME]\n" +
			"[CODE]\n// Your complete JSX code here\n[/CODE]\n\n" +

			"ABSOLUTE REQUIREMENTS:\n" +
			"- NO markdown code blocks (no ```javascript)\n" +
			"- NO explanations outside the tags\n" +
			"- NO JSON formatting\n" +
			"- Code must be immediately executable\n" +
			"- Include ALL necessary checks and error handling\n" +
			"- Use single quotes for strings (ExtendScript convention)\n";

		var payload = {
			"contents": [{
				"parts": [{
					"text": systemPrompt + "\n\nUser Request: " + prompt
				}]
			}]
		};

		// New Retry Logic - Dynamic & Robust
		var modelsToTry = [];

		// 1. User Preference (if set)
		var userModel = localStorage.getItem('tata_ai_model');
		if (userModel && userModel !== 'gemini-1.5-pro' && userModel !== 'gemini-2.0-flash') {
			// Add user model first if it's not one of the old defaults (unless they really want it)
			// Actually just add it first regardless.
			modelsToTry.push(userModel);
		}

		// 2. High-Tier Fallbacks (Pro)
		modelsToTry.push('gemini-3.0-pro-latest');
		modelsToTry.push('gemini-3-pro-preview'); // Preview

		// 3. Efficiency Fallbacks (Flash)
		modelsToTry.push('gemini-3.0-flash-latest');
		modelsToTry.push('gemini-2.0-flash'); // Reliable fallback
		modelsToTry.push('gemini-2.5-flash');

		// Deduplicate
		modelsToTry = modelsToTry.filter(function (item, pos) {
			return modelsToTry.indexOf(item) == pos;
		});

		var lastError = null;
		var responseData = null;
		var usedModel = "";

		for (var i = 0; i < modelsToTry.length; i++) {
			var modelName = modelsToTry[i];
			var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + apiKey;

			console.log("[TATA] Trying Gemini Model: " + modelName);

			try {
				var response = await TATA.fetchWithTimeout(url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload)
				}, 45000);

				if (response.ok) {
					responseData = await response.json();
					usedModel = modelName;
					console.log("[TATA] Success with model: " + modelName);

					// Update UI with used model name
					var modelBadge = document.getElementById('ai_model_name');
					if (modelBadge) {
						modelBadge.textContent = "(" + modelName + ")";
					}

					break; // Success!
				} else {
					var errText = await response.text();
					lastError = "HTTP " + response.status + " (" + modelName + ")";
				}
			} catch (e) {
				lastError = e.message;
			}
		}

		if (!responseData) {
			throw new Error("All Gemini models failed. Last error: " + lastError);
		}

		// Use data directly
		var data = responseData;
		if (!data.candidates || !data.candidates[0] || !data.candidates[0].content ||
			!data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
			throw new Error("Invalid response structure from " + usedModel);
		}

		var text = data.candidates[0].content.parts[0].text;

		// Parse Tag-Based Format
		var nameMatch = text.match(/\[NAME\]([\s\S]*?)\[\/NAME\]/i);
		var codeMatch = text.match(/\[CODE\]([\s\S]*?)\[\/CODE\]/i);

		if (codeMatch) {
			var nameStr = nameMatch ? nameMatch[1].trim() : ("AI Script " + Math.floor(Math.random() * 100));
			var codeStr = codeMatch[1].trim();

			// Clean up markdown blocks if any persist inside the [CODE] block
			codeStr = codeStr.replace(/^```javascript\n/, '').replace(/^```\n/, '').replace(/```$/, '');

			return { name: nameStr, code: codeStr };
		} else {
			// Fallback: If no tags found, assume whole text is code (risky but better than crashing)
			// Or try to strip markdown
			var raw = text.replace(/^```javascript\n/, '').replace(/^```\n/, '').replace(/```$/, '');
			return { name: "AI Script " + Math.floor(Math.random() * 100), code: raw };
		}


	}

	/**
	 * Test a generated script in a safe environment (dry run)
	 */


	function openEditScriptModal(id) {
		var script = userScripts[id];
		if (!script) return;

		var modal = document.getElementById('script_modal');
		var btnSave = document.getElementById('btn_save_script');

		// Fill Data
		document.getElementById('script_name').value = script.name;
		document.getElementById('script_code').value = script.code;
		document.getElementById('script_icon_val').value = script.icon;
		document.getElementById('script_color').value = script.color;

		// UI Updates (Icon Selection)
		document.querySelectorAll('.icon-option').forEach(function (el) { el.classList.remove('selected'); });
		// Try to find matching icon
		var found = false;
		document.querySelectorAll('.icon-option').forEach(function (el) {
			if (el.innerHTML === script.icon) {
				el.classList.add('selected');
				found = true;
			}
		});

		// UI Updates (Color Selection)
		document.querySelectorAll('.color-swatch').forEach(function (el) { el.classList.remove('selected'); });
		var colorEl = document.querySelector('.color-swatch[data-color="' + script.color + '"]');
		if (colorEl) colorEl.classList.add('selected');

		// Set Mode
		btnSave.dataset.mode = "edit";
		btnSave.dataset.targetId = id;
		btnSave.innerText = "Update";

		document.getElementById('script_modal_title').innerText = "Edit Script";
		document.getElementById('btn_open_ai').innerText = "✨ Ask AI to Modify Code";

		modal.classList.add('active');
	}

	// ===========================================
	// COOLORS GEN LOGIC (Tab 2)
	// ===========================================
	// ===========================================
	// HARMONY DASHBOARD LOGIC (Revised Tab 2)
	// ===========================================
	// ===========================================
	// HARMONY DASHBOARD LOGIC (Wheel Version)
	// ===========================================
	function setupCreative() {
		// UI Elements
		var btnDashGen = document.getElementById('btn_dash_generate');
		var inputPrimary = document.getElementById('input_primary_hex');
		var btnPickPrimary = document.getElementById('btn_pick_primary');
		var listContainer = document.getElementById('harmony_list');
		var canvas = document.getElementById('color_wheel_canvas');
		var wheelCursor = document.getElementById('wheel_cursor');
		var valSlider = document.getElementById('input_lightness');

		if (!btnDashGen || !listContainer || !canvas) return;

		var ctx = canvas.getContext('2d');
		var width = canvas.width;
		var height = canvas.height;
		var radius = width / 2;
		var centerX = width / 2;
		var centerY = height / 2;
		var isDragging = false;

		// State
		var primaryHex = "#FF6B6B";
		var harmonyData = {};
		// Recent Colors State
		var recentColors = [];
		try {
			var savedRecent = localStorage.getItem('tata_recent_colors');
			if (savedRecent) recentColors = JSON.parse(savedRecent);
			if (!Array.isArray(recentColors)) recentColors = [];
			// Force limit to 7 (fix legacy larger lists)
			if (recentColors.length > 7) recentColors = recentColors.slice(0, 7);
		} catch (e) { recentColors = []; }

		// Ensure shareColorsToExplore is available in this scope (it is now global)
		// No local definition needed.

		// Helper: HSL/Hex
		function hslToHex(h, s, l) {
			l /= 100;
			var a = s * Math.min(l, 1 - l) / 100;
			var f = function (n) {
				var k = (n + h / 30) % 12;
				var color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
				return Math.round(255 * color).toString(16).padStart(2, '0');
			};
			return "#" + f(0) + f(8) + f(4);
		}
		function hexToHSL(H) {
			// Convert hex to RGB first
			let r = 0, g = 0, b = 0;
			if (H.length == 4) {
				r = "0x" + H[1] + H[1];
				g = "0x" + H[2] + H[2];
				b = "0x" + H[3] + H[3];
			} else if (H.length == 7) {
				r = "0x" + H[1] + H[2];
				g = "0x" + H[3] + H[4];
				b = "0x" + H[5] + H[6];
			}
			// Then to fractions
			r = +r / 255;
			g = +g / 255;
			b = +b / 255;

			let cmin = Math.min(r, g, b),
				cmax = Math.max(r, g, b),
				delta = cmax - cmin,
				h = 0,
				s = 0,
				l = 0;

			if (delta == 0) h = 0;
			else if (cmax == r) h = ((g - b) / delta) % 6;
			else if (cmax == g) h = (b - r) / delta + 2;
			else h = (r - g) / delta + 4;

			h = Math.round(h * 60);
			if (h < 0) h += 360;

			l = (cmax + cmin) / 2;
			s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
			s = +(s * 100).toFixed(1);
			l = +(l * 100).toFixed(1);

			return { h: h, s: s, l: l };
		}

		// Draw Wheel (Dynamic Lightness)
		function drawWheel(lightness) {
			if (lightness === undefined) lightness = 50;
			var image = ctx.createImageData(width, height);
			var data = image.data;


			for (var x = 0; x < width; x++) {
				for (var y = 0; y < height; y++) {
					var dx = x - centerX;
					var dy = y - centerY;
					var dist = Math.sqrt(dx * dx + dy * dy);

					// Inside Circle
					if (dist <= radius) {
						var angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
						if (angle < 0) angle += 360;

						// H = Angle, S = Dist/Radius, L = Input
						var h = angle;
						var s = (dist / radius) * 100;
						var l = lightness;

						// HSL to RGB conversion for pixel
						var c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
						var x_val = c * (1 - Math.abs(((h / 60) % 2) - 1));
						var m = (l / 100) - c / 2;
						var r = 0, g = 0, b = 0;

						if (0 <= h && h < 60) { r = c; g = x_val; b = 0; }
						else if (60 <= h && h < 120) { r = x_val; g = c; b = 0; }
						else if (120 <= h && h < 180) { r = 0; g = c; b = x_val; }
						else if (180 <= h && h < 240) { r = 0; g = x_val; b = c; }
						else if (240 <= h && h < 300) { r = x_val; g = 0; b = c; }
						else if (300 <= h && h < 360) { r = c; g = 0; b = x_val; }

						var index = (y * width + x) * 4;
						data[index] = (r + m) * 255;
						data[index + 1] = (g + m) * 255;
						data[index + 2] = (b + m) * 255;
						data[index + 3] = 255; // Alpha
					}
				}
			}
			ctx.putImageData(image, 0, 0);
		}

		function updateCursorFromHex(hex) {
			var hsl = hexToHSL(hex);
			var angle = (hsl.h - 90) * (Math.PI / 180);
			var dist = (hsl.s / 100) * radius;

			var cx = centerX + dist * Math.cos(angle);
			var cy = centerY + dist * Math.sin(angle);

			wheelCursor.style.left = cx + "px";
			wheelCursor.style.top = cy + "px";
		}

		function handleCanvasInput(e) {
			var rect = canvas.getBoundingClientRect();
			var scaleX = canvas.width / rect.width;
			var scaleY = canvas.height / rect.height;

			var x = (e.clientX - rect.left) * scaleX;
			var y = (e.clientY - rect.top) * scaleY;

			var dx = x - centerX;
			var dy = y - centerY;

			// Direct Cursor Tracking
			var rawAngle = Math.atan2(dy, dx);
			var distFromCenter = Math.sqrt(dx * dx + dy * dy);

			// Visual Clamp (Radius - 2)
			var visualDist = Math.min(distFromCenter, radius - 2);
			var logicDist = Math.min(distFromCenter, radius);

			var cursorX = centerX + visualDist * Math.cos(rawAngle);
			var cursorY = centerY + visualDist * Math.sin(rawAngle);

			wheelCursor.style.left = cursorX + "px";
			wheelCursor.style.top = cursorY + "px";

			// Calculate Color
			var angleDeg = rawAngle * (180 / Math.PI) + 90;
			if (angleDeg < 0) angleDeg += 360;

			var h = angleDeg;
			var s = (logicDist / radius) * 100;
			// Use current slider val if available, else 50
			var l = valSlider ? parseInt(valSlider.value) : 50;

			var hex = hslToHex(h, s, l);
			updatePrimary(hex, true, true); // Skip history and wheel update during drag
		}

		// Recent Colors Helpers
		function addToRecent(hex) {
			if (!hex) return;
			// 1. Remove if exists (to move to top)
			var idx = recentColors.indexOf(hex);
			if (idx !== -1) recentColors.splice(idx, 1);

			// 2. Add to front
			recentColors.unshift(hex);

			// 3. Limit to 7
			if (recentColors.length > 7) recentColors.pop();

			// 4. Save & Render
			localStorage.setItem('tata_recent_colors', JSON.stringify(recentColors));
			renderRecentColors();
		}

		function renderRecentColors() {
			var container = document.getElementById('recent_list');
			if (!container) return;
			container.innerHTML = '';

			recentColors.forEach(function (c) {
				var div = document.createElement('div');
				div.style.width = "16px";
				div.style.height = "16px";
				div.style.borderRadius = "50%"; // Circular
				div.style.backgroundColor = c;
				div.style.cursor = "pointer";
				div.title = c;
				div.style.border = "1px solid #555";
				div.style.flex = "none"; // Fix sizing

				div.onclick = function () {
					updatePrimary(c); // Click restores color
				};
				container.appendChild(div);
			});
		}

		// Init Render
		renderRecentColors();

		function updatePrimary(hex, skipWheelUpdate, skipHistory, skipSliderUpdate) {
			primaryHex = hex;
			if (inputPrimary) {
				inputPrimary.value = hex.toUpperCase();
				// Dynamic Text Color
				var contrastColor = getContrastYIQ(hex);
				inputPrimary.style.color = contrastColor;
			}

			// Fix: Target the new .mini-hex-card
			var bgCard = document.querySelector('.mini-hex-card');
			if (bgCard) {
				bgCard.style.backgroundColor = hex;
				// Update Icon Color too
				var icon = document.querySelector('#btn_pick_primary svg');
				if (icon) icon.style.fill = getContrastYIQ(hex);
			}

			if (!skipWheelUpdate) updateCursorFromHex(hex);
			if (!skipHistory) addToRecent(hex);

			// Update Slider UI
			if (!skipSliderUpdate && valSlider) {
				var hsl = hexToHSL(hex);
				valSlider.value = hsl.l;
				// Update Gradient
				var midColor = hslToHex(hsl.h, hsl.s, 50);
				valSlider.style.background = "linear-gradient(to right, black, " + midColor + ", white)";
				// Redraw Wheel with new Lightness
				drawWheel(hsl.l);
			}

			generateDashboard();
		}

		// Helper: Contrast (Black/White)
		function getContrastYIQ(hexcolor) {
			hexcolor = hexcolor.replace("#", "");
			var r = parseInt(hexcolor.substr(0, 2), 16);
			var g = parseInt(hexcolor.substr(2, 2), 16);
			var b = parseInt(hexcolor.substr(4, 2), 16);
			var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
			return (yiq >= 128) ? '#000000' : '#ffffff';
		}

		// Core Generator
		function generateDashboard() {
			var baseHSL = hexToHSL(primaryHex);
			// Defined Rules
			var rules = [
				"Analogous", "Complementary", "Triad", "Split Complementary",
				"Tetradic", "Square",
				"Shades", "Saturation", "Hue Scale", "Temperature",
				"Random"
			];

			harmonyData = {};

			rules.forEach(function (rule) {
				var rowColors = [];
				var count = 5; // Default

				// specific counts
				if (rule === "Complementary") count = 2;
				else if (rule === "Triad" || rule === "Split Complementary") count = 3;
				else if (rule === "Tetradic" || rule === "Square") count = 4;
				else if (rule === "Shades" || rule === "Saturation" || rule === "Hue Scale" || rule === "Temperature") count = 7;

				// Calculate offsets for Centered Scales (count 7) -> indices: -3, -2, -1, 0, 1, 2, 3
				var centerIndex = Math.floor(count / 2);

				for (var i = 0; i < count; i++) {
					var h = baseHSL.h, s = baseHSL.s, l = baseHSL.l;

					if (rule === "Analogous") {
						h = (baseHSL.h + (i * 30)) % 360;
					}
					else if (rule === "Complementary") {
						if (i === 1) h = (h + 180) % 360;
					}
					else if (rule === "Triad") {
						if (i === 1) h = (h + 120) % 360;
						else if (i === 2) h = (h + 240) % 360;
					}
					else if (rule === "Split Complementary") {
						if (i === 1) h = (h + 150) % 360;
						else if (i === 2) h = (h + 210) % 360;
					}
					else if (rule === "Tetradic") {
						if (i === 1) h = (h + 60) % 360;
						else if (i === 2) h = (h + 180) % 360;
						else if (i === 3) h = (h + 240) % 360;
					}
					else if (rule === "Square") {
						if (i === 1) h = (h + 90) % 360;
						else if (i === 2) h = (h + 180) % 360;
						else if (i === 3) h = (h + 270) % 360;
					}
					else if (rule === "Random") {
						if (i > 0) {
							h = Math.random() * 360;
							s = 40 + Math.random() * 60;
						}
					}
					// --- Centered Scales (7 Steps) ---
					else if (rule === "Shades") {
						// Lightness Scale: L-45 to L+45
						var delta = (centerIndex - i) * 15; // +45, +30, +15, 0, -15, -30, -45
						// Invert logic: i=0 (left) should be Lighter? Or Scale usually left=dark?
						// Standard Image: Left (Positive %) = Lighter. Right (Negative %) = Darker?
						// Let's assume Left=Light (High L), Right=Dark (Low L)
						// i=0 -> delta=3 -> L + 45
						l = Math.min(100, Math.max(0, l + delta));
					}
					else if (rule === "Saturation") {
						// Saturation Scale: S-45 to S+45
						var delta = (i - centerIndex) * 15; // -45 ... 0 ... +45
						// i=0 (left) = Desaturated. i=6 (right) = Saturated.
						s = Math.min(100, Math.max(0, s + delta));
					}
					else if (rule === "Hue Scale") {
						// Hue Fine-tune: H-45 to H+45
						var delta = (i - centerIndex) * 15;
						h = (h + delta + 360) % 360;
					}
					else if (rule === "Temperature") {
						// Cool (Blue 210) <-> Warm (Orange 45)
						// We need a linear interp between "Coolest" and "Warmest" relative to Base?
						// Or just Shift Hue towards Blue (Left) and Orange (Right)?
						// Let's say indices < center shift towards 210.
						// indices > center shift towards 45.
						var step = i - centerIndex; // -3, -2, -1, 0, 1, 2, 3
						if (step < 0) {
							// Shift towards Cool (210)
							var target = 210;
							var dist = (target - h + 540) % 360 - 180;
							// Strength depends on step magnitude (1, 2, 3)
							h = (h + (dist * (Math.abs(step) * 0.15))) % 360;
						} else if (step > 0) {
							// Shift towards Warm (45)
							var target = 45;
							var dist = (target - h + 540) % 360 - 180;
							h = (h + (dist * (Math.abs(step) * 0.15))) % 360;
						}
					}

					rowColors.push(hslToHex(h, s, l));
				}
				harmonyData[rule] = rowColors;
			});

			renderHarmonyList();
		}



		// Logic using global shareColorsToExplore if needed for custom UI


		function renderHarmonyList() {
			listContainer.innerHTML = '';
			listContainer.style.padding = "0";
			// listContainer.style.gap = "25px"; // Gap unreliable in older CEP

			Object.keys(harmonyData).forEach(function (ruleName) {
				var colors = harmonyData[ruleName];
				var card = document.createElement('div');
				card.className = 'harmony-card';
				card.style.background = "#fff"; card.style.borderRadius = "6px";
				card.style.marginBottom = "5px"; // Reduced to 5px
				card.style.padding = "0"; card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.15)";
				card.style.display = "flex"; card.style.flexDirection = "column";

				var header = document.createElement('div');
				header.style.padding = "8px 10px 4px 10px"; // Move padding here
				header.style.display = "flex"; header.style.justifyContent = "space-between";
				header.style.alignItems = "baseline"; // header.style.marginBottom = "4px";

				var title = document.createElement('span');
				title.innerText = ruleName;
				title.style.fontWeight = "bold"; title.style.color = "#333"; title.style.fontSize = "11px";
				header.appendChild(title);

				// Place Button
				var btnPlace = document.createElement('button');
				btnPlace.innerText = "Place";
				btnPlace.style.border = "none"; btnPlace.style.background = "transparent";
				btnPlace.style.borderRadius = "4px";
				btnPlace.style.cursor = "pointer";
				btnPlace.style.display = "flex";
				btnPlace.style.alignItems = "center"; btnPlace.style.justifyContent = "center";
				btnPlace.style.padding = "2px 8px";
				btnPlace.style.fontSize = "9px"; btnPlace.style.color = "#666";
				btnPlace.style.whiteSpace = "nowrap";
				btnPlace.style.flex = "none"; btnPlace.style.width = "auto";
				btnPlace.style.marginLeft = "auto"; // Push Place to right
				btnPlace.title = "Place on Artboard";
				btnPlace.onclick = function () { placePalette(colors); };
				header.appendChild(btnPlace);


				// Swatch Button (Renamed from "Save to Swatches")
				var btnExp = document.createElement('button');
				btnExp.innerText = "Swatch"; // Changed Text
				btnExp.style.border = "none"; btnExp.style.background = "transparent";
				btnExp.style.borderRadius = "4px";
				btnExp.style.cursor = "pointer"; btnExp.style.display = "flex";
				btnExp.style.alignItems = "center"; btnExp.style.justifyContent = "center";
				btnExp.style.padding = "2px 8px";
				btnExp.style.fontSize = "9px"; btnExp.style.color = "#666";
				btnExp.style.whiteSpace = "nowrap"; // Prevent wrap
				btnExp.style.flex = "none"; btnExp.style.width = "auto";
				btnExp.style.marginLeft = "4px"; // Small gap between Place and Save
				btnExp.title = "Export " + ruleName;
				btnExp.onclick = function () { exportPalette(ruleName, colors); };
				header.appendChild(btnExp);
				card.appendChild(header);

				var row = document.createElement('div');
				row.style.display = "flex"; row.style.height = "28px";
				row.style.borderRadius = "0 0 6px 6px"; row.style.overflow = "hidden";
				row.style.marginTop = "0px";

				colors.forEach(function (c) {
					var box = document.createElement('div');
					box.style.flex = "1"; box.style.background = c; box.title = c;
					row.appendChild(box);
				});
				card.appendChild(row);
				listContainer.appendChild(card);
			});
		}



		function pickColor(targetInputId) {
			try {
				// Debug: verify variable state
				// alert("Debug Client: primaryHex = " + primaryHex); 

				// Modern EyeDropper (Chromium 95+) - Likely fails on CEP 5
				if (window.EyeDropper) {
					var ed = new EyeDropper();
					ed.open().then(function (result) {
						updatePrimary(result.sRGBHex.toUpperCase());
					}).catch(function (e) { });
				} else {
					// Fallback: Use Native OS Color Picker via ExtendScript
					// Validation
					if (!primaryHex) primaryHex = "#FF0000";

					var currentInt = parseInt(primaryHex.replace('#', ''), 16);
					if (isNaN(currentInt)) currentInt = 0xFF0000;

					alert("Debug: Starting Bridge... (Wait for Picker)");

					// Use Direct String Injection for maximum reliability (no reload needed)
					var script = "try { " +
						"   var dec = $.colorPicker(" + currentInt + "); " +
						"   if(dec > -1) { " +
						"      var hex = dec.toString(16).toUpperCase(); " +
						"      while(hex.length < 6) hex = '0' + hex; " +
						"      '#' + hex; " +
						"   } else { 'CANCELED'; } " +
						"} catch(e) { 'ERR: ' + e.message; }";

					csInterface.evalScript(script, function (res) {
						if (res && res.indexOf('#') === 0) {
							updatePrimary(res);
						} else if (res === 'CANCELED') {
							// Do nothing
						} else {
							// If function not found (because hostscript didn't reload), warn user
							if (res.indexOf('undefined') !== -1) alert("Please reload the extension to apply the update.");
							else alert("Picker Error: " + res);
						}
					});
				}
			} catch (e) {
				alert("Client JS Error: " + e);
			}
		}

		// Initial Run
		drawWheel();
		updatePrimary(primaryHex);

		// Listeners
		btnDashGen.addEventListener('click', function () {
			var r = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
			updatePrimary("#" + r.toUpperCase());
		});

		btnPickPrimary.addEventListener('click', function () {
			try {
				if (pickerMode === 'tool') {
					// MODE 1: EYEDROPPER TOOL
					var toolScript = "try { " +
						"   if(app.selection.length > 0 && app.selection[0].filled && app.selection[0].fillColor) { " +
						"       var c = app.selection[0].fillColor; " +
						"       var hex = ''; " +
						"       if(c.typename === 'RGBColor') { " +
						"           hex = c.red.toString(16).toUpperCase(); if(hex.length<2) hex='0'+hex; " +
						"           var g = c.green.toString(16).toUpperCase(); if(g.length<2) g='0'+g; hex += g; " +
						"           var b = c.blue.toString(16).toUpperCase(); if(b.length<2) b='0'+b; hex += b; " +
						"           '#' + hex; " +
						"       } else { 'ERR:Please select an RGB Object'; } " +
						"   } else { " +
						"       app.selectTool('Adobe Eyedropper Tool'); " +
						"       'TOOL_ACTIVATED'; " +
						"   } " +
						"} catch(e) { 'ERR:' + e.message; }";

					csInterface.evalScript(toolScript, function (res) {
						if (res && res.indexOf('#') === 0) {
							updatePrimary(res);
						} else if (res === 'TOOL_ACTIVATED') {
							// Poll for change in Default Fill Color (since user is picking now)
							var pollCount = 0;
							var maxPolls = 30; // 15 seconds
							var lastHex = primaryHex;

							var interval = setInterval(function () {
								pollCount++;
								if (pollCount > maxPolls) { clearInterval(interval); return; }

								var checkScript = "try { " +
									"   var c = app.activeDocument.defaultFillColor; " +
									"   if(c.typename === 'RGBColor') { " +
									"      var hex = c.red.toString(16).toUpperCase(); if(hex.length<2) hex='0'+hex; " +
									"      var g = c.green.toString(16).toUpperCase(); if(g.length<2) g='0'+g; hex += g; " +
									"      var b = c.blue.toString(16).toUpperCase(); if(b.length<2) b='0'+b; hex += b; " +
									"      '#' + hex; " +
									"   } else { 'SKIP'; } " +
									"} catch(e) { 'SKIP'; }";

								csInterface.evalScript(checkScript, function (res) {
									if (res && res.indexOf('#') === 0) {
										if (res !== lastHex) {
											updatePrimary(res);
											clearInterval(interval); // Found new color, stop polling
										}
									}
								});
							}, 500); // Check every 0.5s

						} else if (res.indexOf('ERR') === 0) {
							alert(res);
						}
					});
				} else {
					// MODE 2: OS PICKER
					if (!primaryHex) primaryHex = "#FF0000";
					var currentInt = parseInt(primaryHex.replace('#', ''), 16);
					if (isNaN(currentInt)) currentInt = 0xFF0000;

					var script = "try { " +
						"   var dec = $.colorPicker(" + currentInt + "); " +
						"   if(dec > -1) { " +
						"      var hex = dec.toString(16).toUpperCase(); " +
						"      while(hex.length < 6) hex = '0' + hex; " +
						"      '#' + hex; " +
						"   } else { 'CANCELED'; } " +
						"} catch(e) { 'ERR: ' + e.message; }";

					csInterface.evalScript(script, function (res) {
						if (res && res.indexOf('#') === 0) updatePrimary(res);
						else if (res !== 'CANCELED') alert("Picker Error: " + res);
					});
				}
			} catch (e) {
				alert("Inline Error: " + e);
			}
		});

		inputPrimary.addEventListener('change', function (e) {
			if (/^#[0-9A-F]{6}$/i.test(e.target.value)) updatePrimary(e.target.value);
		});

		// Canvas Interaction
		canvas.addEventListener('mousedown', function (e) { isDragging = true; handleCanvasInput(e); });
		window.addEventListener('mousemove', function (e) { if (isDragging) handleCanvasInput(e); });
		window.addEventListener('mouseup', function () {
			if (isDragging) {
				isDragging = false;
				// Save final color on drag end
				addToRecent(primaryHex);
			}
		});
		// Lightness Slider Interaction
		if (valSlider) {
			valSlider.addEventListener('input', function (e) {
				var l = parseInt(e.target.value);
				var currentHSL = hexToHSL(primaryHex);
				var newHex = hslToHex(currentHSL.h, currentHSL.s, l);
				// Update Primary (Skip: WheelCursor, History, Slider)
				// We DO NOT skip wheel REDRAW inside updatePrimary
				updatePrimary(newHex, true, true, true);
				drawWheel(l); // Specific redraw
			});

			valSlider.addEventListener('change', function (e) {
				addToRecent(primaryHex);
			});
		}
	}

	var deleteUserScript = TATA.deleteUserScript;



	// ===========================================
	// ERROR & AI FIX LOGIC
	// ===========================================
	var currentErrorScriptId = null;
	var currentErrorMsg = null;

	function setupErrorUI() {
		var modal = document.getElementById('error_modal');
		var btnClose = document.getElementById('btn_close_error');
		var btnFix = document.getElementById('btn_fix_ai');

		if (btnClose) {
			btnClose.addEventListener('click', function () {
				modal.classList.remove('active');
			});
		}

		if (btnFix) {
			btnFix.addEventListener('click', function () {
				modal.classList.remove('active');
				if (currentErrorScriptId) {
					openFixWithAI(currentErrorScriptId, currentErrorMsg);
				}
			});
		}
	}

	// ===========================================
	// CONTRAST CHECKER LOGIC
	// ===========================================
	// GLOBAL CUSTOM PICKER STATE (In-App Modal)
	var customPickerState = {
		targetInputId: null,
		hue: 0,
		sat: 100,
		val: 100,
		rgb: { r: 255, g: 0, b: 0 },
		hex: '#FF0000',
		isDraggingCanvas: false
	};

	window.openCustomColorPicker = function (inputId) {
		var inp = document.getElementById(inputId);
		if (!inp) return;

		customPickerState.targetInputId = inputId;

		// Parse current hex to HSV
		var currentHex = inp.value;
		if (isValidHex(currentHex)) {
			var rgb = hexToRgb(currentHex);
			var hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
			customPickerState.hue = hsv.h * 360;
			customPickerState.sat = hsv.s * 100;
			customPickerState.val = hsv.v * 100;
		}

		document.getElementById('custom_picker_modal').style.display = 'flex';

		// Init Controls
		document.getElementById('custom_picker_hue').value = customPickerState.hue;
		renderCustomPickerCanvas();
		updatePickerUI();

		// Add Listeners if not already added
		if (!window.customPickerListenersAdded) {
			setupCustomPickerListeners();
			window.customPickerListenersAdded = true;
		}
	};

	window.closeCustomPicker = function () {
		document.getElementById('custom_picker_modal').style.display = 'none';
	};

	window.confirmCustomPicker = function () {
		if (customPickerState.targetInputId) {
			var inp = document.getElementById(customPickerState.targetInputId);
			if (inp) {
				inp.value = customPickerState.hex;
				// Trigger update
				updateContrastUI();
			}
		}
		closeCustomPicker();
	};

	function setupCustomPickerListeners() {
		var canvas = document.getElementById('custom_picker_canvas');
		var hueSlider = document.getElementById('custom_picker_hue');

		// Hue Change
		hueSlider.addEventListener('input', function (e) {
			customPickerState.hue = parseFloat(e.target.value);
			renderCustomPickerCanvas();
			updatePickerUI();
		});

		// Canvas Interaction
		function handleCanvas(e) {
			var rect = canvas.getBoundingClientRect();
			var x = e.clientX - rect.left;
			var y = e.clientY - rect.top;

			// Clamp
			x = Math.max(0, Math.min(x, rect.width));
			y = Math.max(0, Math.min(y, rect.height));

			customPickerState.sat = (x / rect.width) * 100;
			customPickerState.val = 100 - ((y / rect.height) * 100);
			updatePickerUI();
		}

		canvas.addEventListener('mousedown', function (e) {
			customPickerState.isDraggingCanvas = true;
			handleCanvas(e);
		});
		window.addEventListener('mousemove', function (e) {
			if (customPickerState.isDraggingCanvas) handleCanvas(e);
		});
		window.addEventListener('mouseup', function () {
			customPickerState.isDraggingCanvas = false;
		});
	}

	function renderCustomPickerCanvas() {
		var canvas = document.getElementById('custom_picker_canvas');
		var ctx = canvas.getContext('2d');
		var w = canvas.width;
		var h = canvas.height;

		ctx.clearRect(0, 0, w, h);

		// 1. Fill with Hue
		ctx.fillStyle = 'hsl(' + customPickerState.hue + ', 100%, 50%)';
		ctx.fillRect(0, 0, w, h);

		// 2. White Gradient (Left to Right)
		var gradWhite = ctx.createLinearGradient(0, 0, w, 0);
		gradWhite.addColorStop(0, 'rgba(255,255,255,1)');
		gradWhite.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = gradWhite;
		ctx.fillRect(0, 0, w, h);

		// 3. Black Gradient (Top to Bottom)
		var gradBlack = ctx.createLinearGradient(0, 0, 0, h);
		gradBlack.addColorStop(0, 'rgba(0,0,0,0)');
		gradBlack.addColorStop(1, 'rgba(0,0,0,1)');
		ctx.fillStyle = gradBlack;
		ctx.fillRect(0, 0, w, h);
	}

	function updatePickerUI() {
		var h = customPickerState.hue;
		var s = customPickerState.sat;
		var v = customPickerState.val;

		var rgb = hsvToRgb(h / 360, s / 100, v / 100);
		customPickerState.rgb = rgb;
		var hex = "#" + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1).toUpperCase();
		customPickerState.hex = hex;

		// Update Cursor Pos
		var canvas = document.getElementById('custom_picker_canvas');
		var cursor = document.getElementById('custom_picker_cursor');
		var x = (s / 100) * canvas.width;
		var y = (1 - (v / 100)) * canvas.height;
		cursor.style.left = x + 'px';
		cursor.style.top = y + 'px';
		cursor.style.borderColor = (v < 50) ? '#fff' : '#000';

		// Update Preview
		var prev = document.getElementById('custom_picker_preview');
		prev.style.backgroundColor = hex;
	}

	// Helper: HSV to RGB
	function hsvToRgb(h, s, v) {
		var r, g, b;
		var i = Math.floor(h * 6);
		var f = h * 6 - i;
		var p = v * (1 - s);
		var q = v * (1 - f * s);
		var t = v * (1 - (1 - f) * s);
		switch (i % 6) {
			case 0: r = v, g = t, b = p; break;
			case 1: r = q, g = v, b = p; break;
			case 2: r = p, g = v, b = t; break;
			case 3: r = p, g = q, b = v; break;
			case 4: r = t, g = p, b = v; break;
			case 5: r = v, g = p, b = q; break;
		}
		return {
			r: Math.round(r * 255),
			g: Math.round(g * 255),
			b: Math.round(b * 255)
		};
	}

	function rgbToHsv(r, g, b) {
		r /= 255, g /= 255, b /= 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var h, s, v = max;
		var d = max - min;
		s = max == 0 ? 0 : d / max;
		if (max == min) {
			h = 0; // achromatic
		} else {
			switch (max) {
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
		return { h: h, s: s, v: v };
	}



	// --- DESIGNER TIPS FEATURE ---
	var designerTips = [
		"Final_final_v2_REAL.psd",
		"Make the logo bigger.",
		"I want it to 'pop'!",
		"Can you send the open file? (Sends JPG)",
		"Payment is exposure.",
		"Font not found.",
		"Brief today, due yesterday.",
		"Can you make it more 'jazz'?",
		"It looks great, but change everything.",
		"Ctrl+S is my heartbeat.",
		"Layer 1 copy copy copy",
		"Lorem Ipsum Dolor Sit Amet",
		"Approved... but can we change the color?",
		"Do you have the vector file? (Sends Word Doc)",
		"Minimal but with more elements.",
		"Deadline is a suggestion.",
		"RGB or CMYK? Yes.",
		"Can you Photoshop this out?",
		"Just a quick 5 min change.",
		"I'll know it when I see it."
	];

	window.updateRandomTip = function () {
		var el = document.getElementById('daily_tip_text');
		if (!el) return;
		var r = Math.floor(Math.random() * designerTips.length);
		el.innerText = '"' + designerTips[r] + '"';

		// Optional: Animate a bit
		var card = el.closest('.tip-card');
		if (card) {
			card.style.transform = "scale(0.98)";
			setTimeout(function () { card.style.transform = "scale(1)"; }, 100);
		}
	};

	function initContrastChecker() {
		var bgInput = document.getElementById('cc_bg_hex');
		var textInput = document.getElementById('cc_text_hex');
		if (!bgInput || !textInput) return;

		// Init Funny Tip
		if (typeof window.updateRandomTip === 'function') window.updateRandomTip();

		updateContrastUI();

		[bgInput, textInput].forEach(function (inp) {
			inp.addEventListener('input', updateContrastUI);
			inp.addEventListener('change', updateContrastUI);
		});

		// Force Toggle Logic
		var ccHeader = bgInput.closest('.section-card').querySelector('.section-header');
		if (ccHeader) {
			ccHeader.style.cursor = 'pointer';
			ccHeader.onclick = function (e) {
				e.stopPropagation();
				this.closest('.section-card').classList.toggle('collapsed');
			};
		}
	}

	function updateContrastUI() {
		var bgEl = document.getElementById('cc_bg_hex');
		var textEl = document.getElementById('cc_text_hex');

		if (!bgEl || !textEl) return;

		var bgHex = bgEl.value;
		var textHex = textEl.value;

		if (!isValidHex(bgHex) || !isValidHex(textHex)) return;

		// 1. Update Tip Card (Real-time Preview)
		var tipCard = document.querySelector('.tip-card');
		if (tipCard) {
			tipCard.style.backgroundColor = bgHex;
			tipCard.style.color = textHex;
			tipCard.style.border = (bgHex.toLowerCase() === textHex.toLowerCase()) ? "1px solid #ccc" : "none";
		}

		var ratio = getContrastRatio(bgHex, textHex);
		var scoreVal = document.getElementById('cc_score_val');
		var scoreText = document.getElementById('cc_score_text');
		var scoreStars = document.getElementById('cc_score_stars');
		var card = document.getElementById('score_card');

		// Update Number
		if (scoreVal) scoreVal.textContent = ratio.toFixed(2);

		// --- MAIN CARD LOGIC (User Defined 5-Tiers) ---
		function getMainState(r) {
			var pinkBg = '#ffebee', pinkText = '#b71c1c';
			var yellowBg = '#fff9c4', yellowText = '#fbc02d'; // darker gold for text
			var greenBg = '#e8f5e9', greenText = '#2e7d32';

			if (r < 3.0) return { label: 'Very poor', bg: pinkBg, text: pinkText, stars: '★☆☆☆☆' };
			if (r < 4.5) return { label: 'Poor', bg: pinkBg, text: pinkText, stars: '★★☆☆☆' };
			if (r < 7.0) return { label: 'Good', bg: yellowBg, text: yellowText, stars: '★★★☆☆' };
			if (r < 12.0) return { label: 'Very good', bg: greenBg, text: greenText, stars: '★★★★☆' };
			return { label: 'Excellent', bg: greenBg, text: greenText, stars: '★★★★★' };
		}

		var mainState = getMainState(ratio);

		// Update Main Card
		if (card) card.style.backgroundColor = mainState.bg;
		if (scoreText) {
			scoreText.textContent = mainState.label;
			scoreText.style.color = mainState.text;
		}
		if (scoreVal) scoreVal.style.color = mainState.text;
		if (scoreStars) {
			scoreStars.textContent = mainState.stars;
			scoreStars.style.color = mainState.text;
		}

		// --- DETAIL BOX LOGIC (Strict WCAG Fail/AA/AAA) ---
		function getBoxState(r, limitAA, limitAAA) {
			if (r < limitAA) return { bg: '#ffebee', text: '#b71c1c', stars: '★☆☆' }; // Fail
			if (r < limitAAA) return { bg: '#fff9c4', text: '#fbc02d', stars: '★★★' }; // AA Pass
			return { bg: '#e8f5e9', text: '#2e7d32', stars: '★★★' }; // AAA Pass
		}

		// Small Text: AA=4.5, AAA=7
		var smallState = getBoxState(ratio, 4.5, 7.0);
		// Large Text: AA=3.0, AAA=4.5
		var largeState = getBoxState(ratio, 3.0, 4.5);

		// Update Small Box
		var sBox = document.getElementById('cc_small_box');
		var sLabel = document.getElementById('cc_s_label');
		var sStars = document.getElementById('cc_small_stars');
		if (sBox) sBox.style.backgroundColor = smallState.bg;
		if (sLabel) sLabel.style.color = smallState.text;
		if (sStars) sStars.style.color = smallState.text;

		// Update Large Box
		var lBox = document.getElementById('cc_large_box');
		var lLabel = document.getElementById('cc_l_label');
		var lStars = document.getElementById('cc_large_stars');
		if (lBox) lBox.style.backgroundColor = largeState.bg;
		if (lLabel) lLabel.style.color = largeState.text;
		if (lStars) lStars.style.color = largeState.text;

		// Update Input Backgrounds and ICON CONTRAST
		if (bgEl.parentElement) bgEl.parentElement.style.backgroundColor = bgHex;
		// Update Input Backgrounds
		if (bgEl.parentElement) bgEl.parentElement.style.backgroundColor = bgHex;
		var bgContrast = getContrastYIQ(bgHex);
		bgEl.style.color = bgContrast;

		if (textEl.parentElement) textEl.parentElement.style.backgroundColor = textHex;
		var textContrast = getContrastYIQ(textHex);
		textEl.style.color = textContrast;
	}

	function getContrastYIQ(hexcolor) {
		hexcolor = hexcolor.replace("#", "");
		if (hexcolor.length === 3) {
			hexcolor = hexcolor.split('').map(function (c) { return c + c; }).join('');
		}
		var r = parseInt(hexcolor.substr(0, 2), 16);
		var g = parseInt(hexcolor.substr(2, 2), 16);
		var b = parseInt(hexcolor.substr(4, 2), 16);
		var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
		return (yiq >= 128) ? '#000000' : '#ffffff';
	}

	function getContrastRatio(hex1, hex2) {
		var lum1 = getLuminance(hex1);
		var lum2 = getLuminance(hex2);
		var bright = Math.max(lum1, lum2);
		var dark = Math.min(lum1, lum2);
		return (bright + 0.05) / (dark + 0.05);
	}

	function getLuminance(hex) {
		var rgb = hexToRgb(hex);
		var a = [rgb.r, rgb.g, rgb.b].map(function (v) {
			v /= 255;
			return v <= 0.03928
				? v / 12.92
				: Math.pow((v + 0.055) / 1.055, 2.4);
		});
		return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
	}

	function hexToRgb(hex) {
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, function (m, r, g, b) {
			return r + r + g + g + b + b;
		});

		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : { r: 0, g: 0, b: 0 };
	}

	function isValidHex(hex) {
		return /^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{3}$/i.test(hex);
	}


	function showErrorModal(msg, id) {
		currentErrorScriptId = id;
		currentErrorMsg = msg;

		document.getElementById('error_message_display').innerText = msg;
		document.getElementById('error_modal').classList.add('active');
	}

	function openFixWithAI(id, errorMsg) {
		var script = userScripts[id];
		if (!script) return;

		var prompt = "I have a JSX/ExtendScript error in Adobe Illustrator.\n" +
			"Error Message: " + errorMsg + "\n\n" +
			"Here is my current code:\n" +
			script.code + "\n\n" +
			"Please fix the code to resolve this error. Return ONLY the JSON with 'name' and 'code'.";

		// Open AI Modal
		var aiModal = document.getElementById('ai_prompt_modal');
		document.getElementById('ai_prompt_text').value = prompt;
		aiModal.classList.add('active');
	}
	// ===========================================
	// GLOBAL COLLAPSIBLE SECTION LOGIC
	// ===========================================
	document.addEventListener('click', function (e) {
		// Identify Header
		var header = e.target.closest('.section-header');
		if (!header) return;

		// Ignore if clicking buttons/inputs inside header (like the random button)
		if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
		if (e.target.tagName === 'INPUT') return;

		// Toggle Class
		var card = header.closest('.section-card');
		if (card) {
			card.classList.toggle('collapsed');
		}
	});

	// ===========================================
	// KEEPER TAB LOGIC
	// ===========================================
	var keeperItems = [];

	function initKeeper() {
		try {
			var saved = localStorage.getItem('tata_keeper');
			if (saved) keeperItems = JSON.parse(saved);
		} catch (e) { keeperItems = []; }
		renderKeeper();
	}

	// Expose to window for HTML access
	// Deprecated: addKeeperItem (Text Input removed)
	// New Feature: Import Files
	window.importKeeperFiles = function () {
		try {
			// CEP Open Dialog
			var result = window.cep.fs.showOpenDialog(true, false, "Select SVG Files", null, ["svg"]);
			if (result.err) throw "Dialog Error";
			if (result.data && result.data.length > 0) {
				var fs = window.require('fs');
				var path = window.require('path');
				var os = window.require('os');

				var homeDir = os.homedir();
				var storageDir = path.join(homeDir, '.tata_keeper');
				if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir);

				var addedCount = 0;

				var errors = [];
				result.data.forEach(function (srcUri) {
					try {
						// Sanitize Source Path
						var srcPath = srcUri;
						if (srcPath.indexOf('file://') === 0) {
							srcPath = srcPath.replace(/^file:\/\//, '');
							srcPath = decodeURIComponent(srcPath);
						} else if (srcPath.indexOf('file:') === 0) {
							srcPath = srcPath.replace(/^file:/, '');
							srcPath = decodeURIComponent(srcPath);
						}

						var filename = path.basename(srcPath);
						// Unique Name: timestamp_originalName
						var newName = new Date().getTime() + '_' + filename;
						var destPath = path.join(storageDir, newName);

						fs.copyFileSync(srcPath, destPath);

						keeperItems.unshift({
							id: new Date().getTime() + Math.random(), // Ensure unique ID
							type: 'file_svg',
							file_path: destPath
						});
						addedCount++;
					} catch (err) {
						console.error("Import Copy Error", err);
						errors.push(err);
					}
				});

				if (addedCount > 0) {
					localStorage.setItem('tata_keeper', JSON.stringify(keeperItems));
					renderKeeper();
					// optional success msg
				} else if (errors.length > 0) {
					alert("Import Failed:\n" + errors.slice(0, 3).join('\n'));
				}
			}
		} catch (e) {
			alert("Import Failed: " + e);
		}
	};

	// New Feature: Export Items
	// New Feature: Export Items
	window.exportKeeperFiles = function () {
		if (keeperItems.length === 0) {
			alert("No items to export.");
			return;
		}

		// Select Destination Folder
		var result = window.cep.fs.showOpenDialog(false, true, "Select Destination Folder", null, null);
		if (result.data && result.data.length > 0) {
			var destFolder = result.data[0];
			// Sanitize Path: Remove file:// protocol if present (CEP returns URIs on Mac)
			if (destFolder.indexOf('file://') === 0) {
				destFolder = destFolder.replace(/^file:\/\//, '');
				destFolder = decodeURIComponent(destFolder);
			} else if (destFolder.indexOf('file:') === 0) {
				destFolder = destFolder.replace(/^file:/, '');
				destFolder = decodeURIComponent(destFolder);
			}

			var fs = window.require('fs');
			var path = window.require('path');

			var successCount = 0;
			var errors = [];

			keeperItems.forEach(function (item, index) {
				try {
					var destName = 'kitem_' + index + '_' + item.id + '.svg';
					if (item.file_path) {
						destName = path.basename(item.file_path);
					}

					var destPath = path.join(destFolder, destName);

					// Debug: Verify Source
					var sourceExists = false;
					if (item.file_path) {
						try { sourceExists = fs.existsSync(item.file_path); } catch (e) { }
					}

					if (item.file_path && sourceExists) {
						fs.copyFileSync(item.file_path, destPath);
						successCount++;
					} else if (item.content) {
						// Fallback: Write content
						fs.writeFileSync(destPath, item.content);
						successCount++;
					} else {
						// Item has no data?
						errors.push("Item " + index + " skipped: No file found at " + item.file_path);
					}
				} catch (err) {
					console.error("Export Error for item " + item.id, err);
					errors.push("Item " + index + " Error: " + err);
				}
			});

			if (successCount === 0 && errors.length > 0) {
				alert("Export Failed for all " + keeperItems.length + " items.\nErrors:\n" + errors.slice(0, 5).join('\n'));
			} else {
				var msg = "Exported " + successCount + " files to:\n" + destFolder;
				if (errors.length > 0) msg += "\n\n(Some items failed: " + errors.length + ")";
				alert(msg);
			}
		}
	};

	window.clearKeeper = function () {
		var confirmClear = confirm("Are you sure you want to DELETE ALL items?\nThis will permanently delete the files from your disk.");
		if (!confirmClear) return;

		try {
			var fs = window.require('fs');
			// Delete all physical files referenced
			keeperItems.forEach(function (item) {
				if (item.type === 'file_svg' && item.file_path) {
					if (fs.existsSync(item.file_path)) {
						try { fs.unlinkSync(item.file_path); } catch (e) { }
					}
				}
			});
		} catch (e) { }

		// Clear Array and Storage
		keeperItems = [];
		localStorage.setItem('tata_keeper', JSON.stringify(keeperItems));
		renderKeeper();
	};

	window.copyKeeperItem = function (txt) {
		// Create temp element to copy
		var el = document.createElement('textarea');
		el.value = txt;
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
		// Visual feedback could be added here
	};

	window.placeKeeperItem = function (content) {
		try {
			var fs = window.require('fs');
			var path = window.require('path');
			var os = window.require('os');
			var tempDir = os.tmpdir();
			var filePath = path.join(tempDir, 'tata_place_temp.svg');

			fs.writeFileSync(filePath, content);

			var params = { path: filePath };
			var safeParams = JSON.stringify(params).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

			csInterface.evalScript('TATA.run("placeSvg", \'' + safeParams + '\')');
		} catch (e) {
			console.error("Place Error", e);
		}
	};

	window.placeKeeperFile = function (filePath) {
		try {
			var params = { path: filePath };
			var safeParams = JSON.stringify(params).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
			csInterface.evalScript('TATA.run("placeSvg", \'' + safeParams + '\')');
		} catch (e) {
			console.error("Place File Error", e);
		}
	};

	window.addSelectionToKeeper = function () {
		try {
			var fs = window.require('fs');
			var path = window.require('path');
			var os = window.require('os');

			// Use a persistent directory in user home
			var homeDir = os.homedir();
			var storageDir = path.join(homeDir, '.tata_keeper');
			if (!fs.existsSync(storageDir)) {
				fs.mkdirSync(storageDir);
			}

			// Unique filename
			var timestamp = new Date().getTime();
			var fileName = 'smart_keep_' + timestamp + '.svg';
			var filePath = path.join(storageDir, fileName); // Persistent path

			// We pass this persistent path to Illustrator to save directly there
			var params = { path: filePath };
			var safeParams = JSON.stringify(params).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

			csInterface.evalScript('TATA.run("saveSelectionAsRichSvg", \'' + safeParams + '\')', function (res) {
				if (res === 'Success' || res === '"Success"') {
					try {
						// Store metadata only, not content
						keeperItems.unshift({
							id: timestamp,
							type: 'file_svg', // New type for file-backed SVGs
							file_path: filePath
						});
						localStorage.setItem('tata_keeper', JSON.stringify(keeperItems));
						renderKeeper();
					} catch (err) {
						alert("Failed to update Keeper storage: " + err);
					}
				} else if (res === 'No Selection' || res === '"No Selection"') {
					alert("Please select objects in Illustrator to Keep.");
				} else {
					alert("Failed to save selection.\n" + res);
				}
			});

		} catch (e) {
			alert("Error initiating Smart Keep: " + e);
		}
	};

	function renderKeeper() {
		var container = document.getElementById('keeper_list');
		if (!container) return;
		container.innerHTML = '';

		keeperItems.forEach(function (item) {
			// Strict SVG Manager Mode: Ignore text/legacy items that are not SVG
			if (item.type !== 'svg' && item.type !== 'file_svg') return;

			var card = document.createElement('div');
			card.style.background = '#222';
			card.style.borderRadius = '8px';
			card.style.border = '1px solid #333';
			card.style.position = 'relative';
			card.style.overflow = 'hidden';
			card.style.height = '80px';
			card.style.display = 'flex';
			card.style.alignItems = 'center';
			card.style.justifyContent = 'center';
			card.style.cursor = 'pointer';
			card.style.transition = 'background 0.2s';

			card.onmouseover = function () { card.style.background = '#444'; };
			card.onmouseout = function () { card.style.background = '#222'; };

			var displayContent = item.content;

			if (item.type === 'file_svg' && item.file_path) {
				try {
					var fs = window.require('fs');
					if (fs.existsSync(item.file_path)) {
						displayContent = fs.readFileSync(item.file_path, 'utf-8');
					} else {
						displayContent = '<div style="color:red; font-size:10px;">File Missing</div>';
					}
				} catch (e) {
					displayContent = '<div style="color:red; font-size:10px;">Read Error</div>';
				}
			}

			if (item.type === 'svg' || item.type === 'file_svg') {
				card.style.background = '#cccccc';
				card.onmouseout = function () { card.style.background = '#cccccc'; };
				card.onmouseover = function () { card.style.background = '#dddddd'; };

				try {
					var parser = new DOMParser();
					var doc = parser.parseFromString(displayContent, 'image/svg+xml');
					var svgEl = doc.documentElement;
					if (svgEl.tagName.toLowerCase() !== 'svg') {
						svgEl = doc.querySelector('svg');
					}
					if (!svgEl) throw "No SVG";

					// Scope IDs
					var suffix = '_' + item.id;
					var idMap = {};
					var ids = Array.from(doc.querySelectorAll('[id]'));
					ids.forEach(function (el) {
						var oldId = el.id;
						var newId = oldId + suffix;
						idMap[oldId] = newId;
						el.id = newId;
					});

					// Scope Classes (Regex method)
					// Simple replacement in style tags
					var styles = doc.querySelectorAll('style');
					styles.forEach(function (styleTag) {
						var css = styleTag.textContent;
						var newCss = css.replace(/(\.[a-zA-Z0-9_-]+)/g, "$1" + suffix);
						// This naive regex appends suffix to all dots... risky but ok for simple use.
						// Better: just scope existing known classes?
						// Let's stick to the previous robust logical approach if possible, but for brevity:
						// Just use the ID scoping for now as it's the main conflict source (gradients).
						styleTag.textContent = newCss;
					});
					// Update class attributes on elements to match? No, that's hard with regex.
					// Valid "Smart Keep" usually relies on IDs for effects. Classes are less critical for display accuracy often.
					// Actually, relying on IDs is usually sufficient for AI generated SVGs.

					// Update Ref
					var allEls = Array.from(doc.querySelectorAll('*'));
					allEls.forEach(function (el) {
						Array.from(el.attributes).forEach(function (attr) {
							var val = attr.value;
							if (val.indexOf('url(#') !== -1) {
								for (var oldId in idMap) {
									var regex = new RegExp('url\\(#' + oldId + '\\)', 'g');
									val = val.replace(regex, 'url(#' + idMap[oldId] + ')');
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

					// ViewBox
					if (!svgEl.hasAttribute('viewBox') && svgEl.hasAttribute('width') && svgEl.hasAttribute('height')) {
						var w = parseFloat(svgEl.getAttribute('width'));
						var h = parseFloat(svgEl.getAttribute('height'));
						if (!isNaN(w) && !isNaN(h)) svgEl.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
					}

					// Force Aspect Ratio
					if (!svgEl.hasAttribute('preserveAspectRatio')) {
						svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
					}

					svgEl.removeAttribute('width');
					svgEl.removeAttribute('height');
					svgEl.style.width = 'auto';
					svgEl.style.height = 'auto';
					svgEl.style.maxWidth = '100%';
					svgEl.style.maxHeight = '100%';
					svgEl.style.display = 'block';

					card.innerHTML = new XMLSerializer().serializeToString(svgEl);

				} catch (e) {
					console.error("Parse Error", e);
					// Fallback
					// Only show text if parse failed?
					card.innerHTML = '<span style="color:red; font-size:10px">Preview Error</span>';
				}

				// Place Button
				var btnPlace = document.createElement('div');
				btnPlace.innerText = "Place";
				btnPlace.style.position = 'absolute';
				btnPlace.style.bottom = '4px';
				btnPlace.style.right = '4px';
				btnPlace.style.background = '#2680eb';
				btnPlace.style.color = '#fff';
				btnPlace.style.padding = '2px 6px';
				btnPlace.style.borderRadius = '4px';
				btnPlace.style.fontSize = '10px';
				btnPlace.style.fontWeight = 'bold';
				btnPlace.style.zIndex = '10';
				btnPlace.title = "Click to Place";
				btnPlace.onclick = function (e) {
					e.stopPropagation();
					if (item.type === 'file_svg' && item.file_path) {
						window.placeKeeperFile(item.file_path);
					} else {
						window.placeKeeperItem(item.content);
					}
				};
				card.appendChild(btnPlace);

				// Drag Handler for SVG
				card.draggable = true;
				card.ondragstart = function (e) {
					e.dataTransfer.effectAllowed = "copy";
					try {
						var os = window.require('os');
						var path = window.require('path');
						var finalPath = '';
						if (item.type === 'file_svg' && item.file_path) {
							finalPath = item.file_path;
						} else {
							var fs = window.require('fs');
							var tempDir = os.tmpdir();
							finalPath = path.join(tempDir, 'tata_drag_temp.svg');
							fs.writeFileSync(finalPath, item.content);
						}
						var fileUrl = 'file://' + (os.platform() === 'win32' ? '/' : '') + finalPath;
						var encodedUrl = encodeURI(fileUrl);
						e.dataTransfer.setData("text/uri-list", encodedUrl);
						e.dataTransfer.setData("URL", encodedUrl);
					} catch (err) { }
				};

			} else {
				// Text Card
				var textContainer = document.createElement('div');
				textContainer.style.fontSize = '12px';
				textContainer.style.color = '#eee';
				textContainer.style.wordBreak = 'break-word';
				textContainer.style.textAlign = 'center';
				textContainer.style.padding = '5px';
				textContainer.style.width = '100%';
				textContainer.style.maxHeight = '100%';
				textContainer.style.overflow = 'hidden';
				textContainer.innerText = item.content;
				card.appendChild(textContainer);

				card.title = "Click to Copy";
				card.onclick = function () { window.copyKeeperItem(item.content); };
			}

			// Delete Button
			var btnDel = document.createElement('div');
			btnDel.innerHTML = '&times;';
			btnDel.style.position = 'absolute';
			btnDel.style.top = '0px';
			btnDel.style.right = '4px';
			btnDel.style.color = '#666';
			btnDel.style.cursor = 'pointer';
			btnDel.style.fontSize = '18px';
			btnDel.style.fontWeight = 'bold';
			btnDel.title = "Remove";
			btnDel.onclick = function (e) {
				e.stopPropagation();
				deleteKeeperItem(item.id);
			};
			btnDel.onmouseover = function () { btnDel.style.color = '#aaa'; };
			btnDel.onmouseout = function () { btnDel.style.color = '#666'; };

			card.appendChild(btnDel);

			container.appendChild(card);
		});
	}

	function deleteKeeperItem(id) {
		// Find item to delete file if exists
		var item = keeperItems.filter(function (i) { return i.id === id; })[0];
		if (item && item.type === 'file_svg' && item.file_path) {
			try {
				var fs = window.require('fs');
				if (fs.existsSync(item.file_path)) {
					fs.unlinkSync(item.file_path);
				}
			} catch (e) {
				console.error("File Delete Error", e);
			}
		}

		keeperItems = keeperItems.filter(function (i) { return i.id !== id; });
		localStorage.setItem('tata_keeper', JSON.stringify(keeperItems));
		renderKeeper();
	}

	// --- Cleaner Tab Logic ---

	window.scanCleaner = function () {
		// Call JSX to Analyze Doc
		csInterface.evalScript('TATA.run("scanDoc")', function (res) {
			try {
				if (res === 'No Doc') {
					alert("No document open.");
					return;
				}
				var data = JSON.parse(res);

				// Show Report Area
				var report = document.getElementById('cleaner_report');
				report.style.display = 'block';

				document.getElementById('report_stray').innerText = '• Stray Points: ' + data.stray;
				document.getElementById('report_text').innerText = '• Empty Text: ' + data.text;
				document.getElementById('report_unused').innerText = '• Unused Items: ' + data.unused;

				// Auto-check if items found
				document.getElementById('opt_clean_stray').checked = (data.stray > 0);
				document.getElementById('opt_clean_empty_text').checked = (data.text > 0);
				document.getElementById('opt_clean_unused').checked = (data.unused > 0);

			} catch (e) {
				console.error("Scan Error: " + res);
			}
		});
	};

	window.runCleaner = function () {
		var flags = {
			stray: document.getElementById('opt_clean_stray').checked,
			text: document.getElementById('opt_clean_empty_text').checked,
			unused: document.getElementById('opt_clean_unused').checked
		};

		if (!flags.stray && !flags.text && !flags.unused) {
			alert("Select at least one item to clean.");
			return;
		}

		// Double-stringify strategy for safe transport
		var payload = JSON.stringify(flags);
		// JSON.stringify on a string produces a valid quoted string literal (e.g. "{\"a\":1}")
		var arg = window.JSON.stringify(payload);

		csInterface.evalScript('TATA.run("cleanDoc", ' + arg + ')', function (res) {
			// Re-scan to update report
			setTimeout(scanCleaner, 500);
			alert("Cleaning Complete.\n" + res);
		});
	};

	window.runFinalize = function (action) {
		if (action === 'outline') {
			var c = confirm("Convert ALL Text in document to Outlines?");
			if (!c) return;
		}
		csInterface.evalScript('TATA.run("finalizeDoc", "' + action + '")', function (res) {
			alert(res);
		});
	};

	// Init on load
	window.addEventListener('load', initKeeper);
	// window.addEventListener('load', scanCleaner); // Optional auto-scan


	var saveUserScript = TATA.saveUserScript;

	// ====================================================================================
	// ====================================   V2 LOGIC   ==================================
	// ====================================================================================

	// Bind to grid.js module directly
	Object.defineProperty(window, 'v2Layout', {
		get: function () { return TATA.v2Layout; },
		set: function (val) { TATA.v2Layout = val; }
	});

	var ICONS = TATA.ICONS || {};
	var v2Defaults = TATA.v2Defaults || {};
	var renderGrid = TATA.renderGrid;
	var createGridButton = TATA.createGridButton;
	var setupGridDrag = TATA.setupGridDrag;
	var getItemDataFromElement = TATA.getItemDataFromElement;
	var saveV2Layout = TATA.saveV2Layout;

	function setupTabsV2() {
		var tabs = document.querySelectorAll('.tab-btn');
		tabs.forEach(function (tab) {
			tab.addEventListener('click', function () {
				document.querySelectorAll('.tab-btn').forEach(function (t) { t.classList.remove('active'); });
				document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });

				this.classList.add('active');
				var targetId = this.dataset.tab;
				var target = document.getElementById(targetId);
				if (target) target.classList.add('active');

				// Show tab-actions only on Button tab
				var tabActions = document.querySelector('.tab-actions');
				if (tabActions) {
					tabActions.style.display = (targetId === 'tab_button') ? 'flex' : 'none';
				}

				// Refresh CodeMirror when switching to Editor tab
				if (targetId === 'tab_editor' && window.cmEditor) {
					setTimeout(function () { window.cmEditor.refresh(); }, 50);
				}
			});

			// Drag Over to Switch Tab
			tab.addEventListener('dragenter', function (e) {
				e.preventDefault();
				this.click();
			});
			tab.addEventListener('dragover', function (e) { e.preventDefault(); });
			tab.addEventListener('drop', function (e) { e.preventDefault(); });
		});
	}

	// V4.1: Debounced version for high-frequency operations
	var debouncedSaveV2Layout = debounce(saveV2Layout, 300);

	// ==================== IMPORT / EXPORT ====================

	var fs = require('fs');
	var path = require('path');

	function exportScript() {
		var exportable = [];
		var allTabs = ['tab_button'];
		allTabs.forEach(function (t) {
			if (!v2Layout[t]) return;
			v2Layout[t].forEach(function (item) {
				if (item.script || item.code) {
					item._tab = t;
					exportable.push(item);
				}
			});
		});

		if (exportable.length === 0) {
			showToast("No scripts to export.", "error");
			return;
		}

		showToast("Click a button to export it", "info");
		document.body.classList.add('export-mode');

		var btns = document.querySelectorAll('.grid-btn');
		var handler = function (e) {
			e.preventDefault();
			e.stopPropagation();

			var item = getItemDataFromElement(this);
			var defaultName = item.label;

			var result = window.cep.fs.showSaveDialogEx("Export Script", "", ["json"], defaultName);
			if (result.data) {
				var payload = {
					tata_version: "2.0",
					name: item.label,
					icon: item.icon,
					script: item.script,
					code: item.code,
					type: item.type,
					color: item.color // V4: Save Color
				};
				var finalPath = result.data;
				if (!finalPath.toLowerCase().endsWith('.json')) finalPath += '.json';

				fs.writeFileSync(finalPath, JSON.stringify(payload, null, 2));
				showToast("Exported!", "success");
			}

			document.body.classList.remove('export-mode');
			btns.forEach(function (b) { b.removeEventListener('click', handler, true); });
		};

		btns.forEach(function (b) { b.addEventListener('click', handler, true); });
	}

	function importScript() {
		var result = window.cep.fs.showOpenDialogEx(false, false, "Import Script", "", ["json"]);
		if (result.data && result.data.length > 0) {
			var filePath = result.data[0];
			try {
				var content = fs.readFileSync(filePath, 'utf8');
				var data = JSON.parse(content);

				var activeTab = 'tab_button';
				if (!v2Layout[activeTab]) v2Layout[activeTab] = [];

				var newItem = {
					id: 'imported_' + new Date().getTime(),
					label: data.name || "Imported",
					icon: data.icon || ICONS.stars,
					script: data.script,
					code: data.code,
					type: data.type,
					color: data.color // V4 Import Color
				};

				v2Layout[activeTab].push(newItem);
				saveV2Layout();
				renderGrid();
				showToast("Imported " + data.name, "success");

			} catch (e) {
				showToast("Import Failed: " + e, "error");
			}
		}
	}

	// ==================== INITIALIZATION WIRING ====================

	var fabImport = document.getElementById('btn_import_script');
	if (fabImport) fabImport.addEventListener('click', importScript);

	var fabExport = document.getElementById('btn_export_script');
	if (fabExport) fabExport.addEventListener('click', exportScript);

	// Tab rename reset removed (tabs are no longer renamable)

	function exportPalette(name, colors) {
		var script = "try { var doc = app.activeDocument; var grp = doc.swatchGroups.add(); grp.name = '" + name + " Theme'; var cols = " + JSON.stringify(colors) + "; for(var i=0; i<cols.length; i++){ var hex = cols[i].replace('#',''); var r = parseInt(hex.substring(0,2), 16); var g = parseInt(hex.substring(2,4), 16); var b = parseInt(hex.substring(4,6), 16); var c = new RGBColor(); c.red=r; c.green=g; c.blue=b; var s = doc.swatches.add(); s.color = c; s.name = 'Hex '+hex; grp.addSwatch(s); } 'Success'; } catch(e){e.toString();}";
		csInterface.evalScript(script, function (res) { if (res !== 'Success') alert(res); });
	}

	function placePalette(colors) {
		var script = "try { " +
			"var doc = app.activeDocument;" +
			"var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];" +
			"var rect = ab.artboardRect;" +
			"var x = rect[0];" +
			"var y = rect[1];" +
			"var topFunc = y + 100;" + // Start 100pt above artboard
			"var size = 80;" +
			"var gap = 10;" +
			"var cols = " + JSON.stringify(colors) + ";" +

			// Helper: Hex to RGBColor object
			"function getRGB(hex) {" +
			"   hex = hex.replace('#','');" +
			"   var r = parseInt(hex.substring(0,2), 16);" +
			"   var g = parseInt(hex.substring(2,4), 16);" +
			"   var b = parseInt(hex.substring(4,6), 16);" +
			"   var c = new RGBColor(); c.red=r; c.green=g; c.blue=b;" +
			"   return c;" +
			"}" +

			// Helper: Create Gradient
			"function createGrad(name, colorsArr) {" +
			"   var gName = name + '_' + Math.round(Math.random()*10000);" +
			"   try { var existing = doc.gradients.getByName(gName); existing.remove(); } catch(e){}" +
			"   var newGrad = doc.gradients.add();" +
			"   newGrad.name = gName;" +
			"   newGrad.type = GradientType.LINEAR;" +
			"   " +
			"   /* Safe Logic: Reuse Existing Stops */" +
			"   var stops = newGrad.gradientStops;" +
			"   var targetLen = colorsArr.length;" +
			"   " +
			"   /* 1. Add if needed */" +
			"   while(stops.length < targetLen) { stops.add(); }" +
			"   /* 2. Remove if too many (reverse loop) */" +
			"   while(stops.length > targetLen) { stops[stops.length-1].remove(); }" +
			"   " +
			"   /* 3. Assign Values */" +
			"   for(var i=0; i<targetLen; i++) {" +
			"       var s = stops[i];" +
			"       s.rampPoint = (i / (targetLen - 1)) * 100;" +
			"       s.color = getRGB(colorsArr[i]);" +
			"       s.midPoint = 50;" +
			"   }" +
			"   var gc = new GradientColor();" +
			"   gc.gradient = newGrad;" +
			"   return gc;" +
			"}" +

			// Create Main Group
			"var mainGroup = doc.groupItems.add();" +
			"mainGroup.name = 'TATA Palette';" +

			// 1. Draw Solid Colors (Row 1)
			"for(var i=0; i<cols.length; i++){" +
			"   var box = mainGroup.pathItems.rectangle(topFunc, x + (i * (size + gap)), size, size);" +
			"   box.fillColor = getRGB(cols[i]);" +
			"   box.stroked = false;" +
			"}" +

			// 2. Draw Pairwise Gradients (Row 2) => Below Row 1
			"var row2Top = topFunc - (size + gap);" +
			"if(cols.length > 1) {" +
			"   for(var i=0; i<cols.length-1; i++){" +
			"       var gCol = createGrad('Pair_'+i, [cols[i], cols[i+1]]);" +
			"       var box = mainGroup.pathItems.rectangle(row2Top, x + (i * (size + gap)), size, size);" +
			"       box.fillColor = gCol;" +
			"       box.stroked = false;" +
			"       /* Rotate Gradient 0 deg default */" +
			"   }" +
			"}" +

			// 3. Draw Global Gradient (Row 3) => Below Row 2
			"var row3Top = row2Top - (size + gap);" +
			"if(cols.length > 1) {" +
			"   var totalWidth = (cols.length * size) + ((cols.length-1) * gap);" +
			"   var gAll = createGrad('Global', cols);" +
			"   var box = mainGroup.pathItems.rectangle(row3Top, x, totalWidth, size);" +
			"   box.fillColor = gAll;" +
			"   box.stroked = false;" +
			"}" +

			"'Success';" +
			"} catch(e) { e.message + ' line:' + e.line; }";

		csInterface.evalScript(script, function (res) {
			if (res !== 'Success') alert("Place Error: " + res);
		});
	}

	// ==========================================
	// V4.2: Export to Global TATA Namespace
	// ==========================================
	// ==========================================
	// V4.2: Export to Global TATA Namespace
	// ==========================================
	window.TATA = window.TATA || {};

	// Expose Critical Utils Globally (for separated IIFEs)
	window.showToast = showToast;
	window.placePalette = placePalette;
	window.exportPalette = exportPalette;

	TATA.showToast = showToast;
	TATA.showInputModal = showInputModal;
	TATA.showConfirmModal = showConfirmModal;
	TATA.renderGrid = renderGrid;
	TATA.renderHotkeys = renderHotkeys;
	TATA.saveV2Layout = saveV2Layout;
	TATA.saveHotkeys = saveHotkeys;
	TATA.debounce = debounce;
	TATA.safeParse = safeParse;
	TATA.backupBeforeSave = backupBeforeSave;
	TATA.DOM = DOM;
	TATA.csInterface = csInterface;
	TATA.placePalette = placePalette;
	TATA.exportPalette = exportPalette;

})();

// -------------------------------------------------------------------------
// CUSTOM COLORS FUNCTIONALITY
// -------------------------------------------------------------------------
(function () {
	// Default custom colors
	var customColors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#8B00FF"];

	// Check if we are on the Colors panel
	var container = document.getElementById('custom_colors_container');
	if (!container) return; // Not on Colors panel or elements not ready

	// Initialize Slots
	function updateSlots() {
		var slots = document.querySelectorAll('.custom-color-slot');
		slots.forEach(function (slot, index) {
			slot.style.backgroundColor = customColors[index];
			slot.title = "Click to Edit: " + customColors[index];
			slot.onclick = function () {
				// Use GLOBAL Picker (New Script Style) as requested
				var currentColor = customColors[index];
				openGlobalColorPicker(function (newColor) {
					if (newColor) {
						customColors[index] = newColor;
						updateSlots();
					}
				}, currentColor);
			};
		});
	}

	// Attach Button Events
	var btnPlace = document.getElementById('btn_custom_place');
	if (btnPlace) {
		btnPlace.onclick = function () {
			// Reuse TATA.run router if available, or direct eval
			// Host script must implement placePalette logic. 
			// existing 'placePalette' function in main.js (line 3351) generates a script string.
			// Let's reuse that if possible, or call logic directly.
			// Ideally we use a centralized place function.
			// main.js has 'placePalette(colors)' function defined around line 3351.
			if (typeof placePalette === 'function') {
				placePalette(customColors);
			} else {
				showToast('⚠️ Place function missing');
			}
		};
	}

	var btnSwatch = document.getElementById('btn_custom_swatch');
	if (btnSwatch) {
		btnSwatch.onclick = function () {
			// main.js has 'exportPalette(name, colors)' defined around line 3346.
			if (typeof exportPalette === 'function') {
				exportPalette("Custom Colors", customColors);
			} else {
				showToast('⚠️ Export function missing');
			}
		};
	}


	// Initial Render
	updateSlots();

})();
