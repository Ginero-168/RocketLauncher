(() => {
	'use strict';

	// ==========================================
	// Local aliases to TATA.* modules
	// (defined in core.js, state.js, modals.js, tabs.js)
	// ==========================================
	const debounce = TATA.debounce;
	const safeParse = TATA.safeParse;
	const safeCall = TATA.safeCall;
	const cacheDOM = TATA.cacheDOM;
	const DOM = TATA.DOM;
	const checkStorageVersion = TATA.checkStorageVersion;
	const backupBeforeSave = TATA.backupBeforeSave;
	const showToast = TATA.showToast;
	const showInputModal = TATA.showInputModal;
	const showConfirmModal = TATA.showConfirmModal;

	let csInterface = TATA.getCSInterface ? TATA.getCSInterface() : TATA.csInterface;
	if (!csInterface) csInterface = new CSInterface();
	let extensionPath = TATA.getExtensionPath ? TATA.getExtensionPath() : (TATA.extensionPath || "");

	// Export Core System Variables to TATA for modules to use
	window.TATA = window.TATA || {};
	if (TATA.setCSInterface) TATA.setCSInterface(csInterface);


	function init() {
		// V3: Cache DOM elements first
		cacheDOM();

		// V3: Check storage version for migrations
		checkStorageVersion();

		// V3: Apply saved theme
		const savedTheme = localStorage.getItem('tata_theme');
		if (savedTheme === 'light') {
			document.body.classList.add('light-theme');
		}

		try {
			extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
		} catch (e) { }

		// Fallback: If SystemPath failed, derive from URL
		if (!extensionPath) {
			let path = window.location.href;
			if (path.indexOf('file://') === 0) {
				path = path.substring(7);
			}
			// Remove filename (index.html)
			const lastSlash = path.lastIndexOf('/');
			if (lastSlash !== -1) {
				path = path.substring(0, lastSlash);
			}
			extensionPath = decodeURIComponent(path);
		}
		if (TATA.setExtensionPath) TATA.setExtensionPath(extensionPath);
		TATA.extensionPath = extensionPath;



		// Determine Context (Main Panel vs Sub-Panel)
		const isColorPanel = window.location.href.includes('colors.html');

		if (isColorPanel) {
			// ==================== COLORS PANEL INIT ====================
			try { TATA.colorTools.init(); } catch (e) { alert(`ColorTools Init Error: ${e}`); }

			// Init Color-Specific Context Menu or Features if needed
			// For now, Creative setup is sufficient + Custom Picker
		} else {
			// ==================== MAIN PANEL INIT ====================

			// V2: Setup Uniform Grid Tabs
			setupTabsV2();

			// Old setupTabs was: setupTabs(); 
			// We will replace it with V2 logic below.

			initUserScripts(); // Adds orphans to layout

			// RESTORED UI ENABLING CALLS (Previously hidden inside initUserScripts)
			if (typeof setupAddScriptUI === 'function') setupAddScriptUI();
			if (typeof startContextMenu === 'function') startContextMenu();

			// setupPanelToggle is Main Panel only
			setupPanelToggle();

			// Initialize Features (Hotkeys are Main Panel only)
			try { initHotkeys(); } catch (e) { }

			renderGrid();

			// Initialize Scripting (Editor + AI Helper tabs)
			if (typeof TATA.initScripting === 'function') {
				TATA.initScripting();
			}

			// Initialize Script Import/Export
			if (typeof TATA.initScriptTransfer === 'function') {
				TATA.initScriptTransfer();
			}

			// Show active AI model badge
			const initModelBadge = document.getElementById('ai_model_name');
			const initModel = localStorage.getItem('tata_ai_model') || 'gemini-2.0-flash';
			if (initModelBadge) initModelBadge.textContent = `(${initModel})`;
		}

		// COMMON INIT
		// load Host Script via gateway
		if (TATA.host && TATA.host.evalFile) {
			TATA.host.evalFile(`${extensionPath}/jsx/hostscript.jsx`);
		}
	}
	let setupPanelToggleDone = false;

	function setupPanelToggle() {
		// Prevent duplicate setup
		if (setupPanelToggleDone) return;
		setupPanelToggleDone = true;

		const btn = document.getElementById('btn_toggle_height');
		if (!btn) return;

		// 1. STATE PERSISTENCE
		const savedState = localStorage.getItem('tata_panel_collapsed');
		let isCollapsed = (savedState === 'true');

		// Helpers for Height
		function getCollapsedHeight() {
			const hotkeyBar = document.getElementById('hotkey-bar');
			// Only add 14px for the collapsed_strip, no extra padding
			return Math.ceil((hotkeyBar ? hotkeyBar.offsetHeight : 0) + 14);
		}

		// 2. INITIAL SYNC
		if (isCollapsed) {
			// Apply Collapsed UI
			document.body.classList.add('collapsed');
			btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>'; // Down Arrow
			btn.title = "Expand Panel";
			const tabsContent = document.querySelector('.tabs');
			if (tabsContent) tabsContent.style.display = 'none';

			// Force Resize (with slight delay)
			setTimeout(() => {
				csInterface.resizeContent(Math.floor(window.innerWidth), getCollapsedHeight());
			}, 100);

		} else {
			// Apply Expanded UI
			document.body.classList.remove('collapsed');
			const tabsContent = document.querySelector('.tabs');
			if (tabsContent) tabsContent.style.display = '';
			btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>'; // Up Arrow
			btn.title = "Collapse Panel";

			// Safety: Force Expand if window is suspiciously small but state is Open
			if (window.innerHeight < 200) {
				const restoreH = parseInt(localStorage.getItem('tata_panel_last_height')) || 550;
				csInterface.resizeContent(Math.floor(window.innerWidth), restoreH);
			}
		}

		// 3. EVENT LISTENER
		btn.addEventListener('click', () => {
			try {
				if (!isCollapsed) {
					// --- ACTION: COLLAPSE ---
					if (window.innerHeight > 200) {
						const h = window.innerHeight;
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
					const restoreH = parseInt(btn.dataset.lastHeight) || parseInt(localStorage.getItem('tata_panel_last_height')) || 550;

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
		const strip = document.getElementById('collapsed_strip');
		if (strip) {
			strip.addEventListener('click', () => {
				if (isCollapsed) {
					// --- ACTION: EXPAND ---
					const tabsContent = document.querySelector('.tabs');
					if (tabsContent) tabsContent.style.display = '';

					const width = Math.floor(window.innerWidth);
					const restoreH = parseInt(btn.dataset.lastHeight) || parseInt(localStorage.getItem('tata_panel_last_height')) || 550;

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
	const saveHotkeys = TATA.saveHotkeys;
	const renderHotkeys = TATA.renderHotkeys;
	// TATA handles drag/drop logic natively inside its hotkeys.js rendering now.

	// NOTE: saveHotkeys() is defined earlier at line 808
	// Tab setup handled by setupTabsV2()

	// Init when Window Loaded (Safest)
	window.addEventListener('load', () => {
		try {
			init();
			// Features only for Main Panel
			if (!window.location.href.includes('colors.html')) {
				initHotkeys();
			}

			// Listen for Scripts from Scripting Panel
			csInterface.addEventListener("com.tata.pro.importScript", event => {
				try {
					const data = (typeof event.data === 'string') ? JSON.parse(event.data) : event.data;

					// 1. Auto-switch Focus: Moved to scripting.js SIDE
					// But we can try here too just in case
					// CSInterface.prototype.requestOpenExtension("com.tata.pro.panel", "");

					// 2. Add to Active Tab or Swift
					const activeTabEl = document.querySelector('.tab-btn.active');
					const targetTab = 'tab_button';

					v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};

					// Ensure target array exists
					if (!v2Layout[targetTab]) v2Layout[targetTab] = [];

					const newItem = {
						id: data.id,
						label: data.name,
						icon: data.icon,
						code: data.code,
						type: 'code',
						color: data.color // V4 Color Handle
					};

					// Check if already exists (update instead of duplicate)
					const existingIndex = v2Layout[targetTab].findIndex(item => {
						return item.id === data.id;
					});

					if (existingIndex >= 0) {
						v2Layout[targetTab][existingIndex] = newItem;
						// Preserve position but update data
					} else {
						v2Layout[targetTab].push(newItem);
					}

					saveV2Layout(true);
					renderGrid();

					// Optional: Save to userScripts global store
					setTimeout(() => {
						saveUserScript(data.name, data.icon, data.code, data.color || 'gray', true, data.id, true);
					}, 100);

				} catch (e) {
					console.error("Import Event Error", e);
				}
			});

			// ==================== CONTEXT MENU: EDIT ====================
			const btnEdit = document.getElementById('ctx_edit');
			if (btnEdit) {
				btnEdit.onclick = () => {
					const id = window.currentContextScriptId;
					if (!id) return;

					// BLOCK DEFAULTS
					if (id.indexOf('btn_') === 0) {
						showToast("Default scripts cannot be edited.", "error");
						document.getElementById('context_menu').style.display = 'none';
						return;
					}

					// Find Data (Prioritize V2 Layout)
					let foundItem = null;
					['tab_button'].forEach(t => {
						if (v2Layout[t]) {
							const match = v2Layout[t].find(x => { return x.id === id; });
							if (match) foundItem = match;
						}
					});

					// Fallback to User Scripts
					const storedScripts = TATA.getUserScripts ? TATA.getUserScripts() : {};
					if (!foundItem && storedScripts[id]) {
						foundItem = storedScripts[id];
						foundItem.code = foundItem.code;
					}

					if (foundItem && (foundItem.code || foundItem.script)) {
						document.getElementById('context_menu').style.display = 'none'; // Hide Menu

						// Open Scripting Panel
						CSInterface.prototype.requestOpenExtension("com.tata.pro.scripting", "");

						// Logic to load file content if it's a default script
						if (!foundItem.code && foundItem.script) {
							try {
								const fs = require('fs');
								const path = require('path');
								const scriptPath = path.join(extensionPath, 'jsx', foundItem.script);
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
						setTimeout(() => {
							const evt = new CSEvent("com.tata.pro.editScript", "APPLICATION");
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
			csInterface.addEventListener("com.tata.pro.requestSettings", event => {
				const apiKey = localStorage.getItem('tata_gemini_api_key') || "";
				const picker = localStorage.getItem('tata_picker_mode') || "os";

				const response = new CSEvent("com.tata.pro.settingsData", "APPLICATION");
				response.data = JSON.stringify({ apiKey, pickerMode: picker });
				csInterface.dispatchEvent(response);
			});

		} catch (e) {
			alert(`CRITICAL INIT ERROR: ${e}`);
		}
	});

	// ====================================================================================
	// =================================   USER SCRIPTS   =================================
	// ====================================================================================

	var initUserScripts = TATA.initUserScripts;

	var startContextMenu = TATA.startContextMenu;
	const updateItemColor = TATA.updateItemColor;

	function setupAddScriptUI() {
		// --- Modals ---
		const scriptModal = document.getElementById('script_modal');
		const settingsModal = document.getElementById('settings_modal');
		const aiModal = document.getElementById('ai_prompt_modal');

		// --- Buttons ---
		const btnAdd = document.getElementById('btn_add_script');
		const btnSettings = document.getElementById('btn_settings');
		const btnOpenAI = document.getElementById('btn_open_ai');

		// Script Modal Actions
		const btnSaveScript = document.getElementById('btn_save_script');
		const btnCancelScript = document.getElementById('btn_cancel_script');

		// Settings Modal Actions
		var btnSaveSettings = document.getElementById('btn_save_settings');
		var btnCancelSettings = document.getElementById('btn_cancel_settings');

		// AI Modal Actions
		const btnSubmitAI = document.getElementById('btn_submit_ai');
		const btnCancelAI = document.getElementById('btn_cancel_ai');

		// --- Inputs ---
		const inpApiKey = document.getElementById('setting_api_key');
		const inpPrompt = document.getElementById('ai_prompt_text');
		const loadingIndicator = document.getElementById('ai_loading');

		// ==================
		// 1. Settings Logic
		// ==================
		if (btnSettings) {
			btnSettings.addEventListener('click', () => {
				const savedKey = localStorage.getItem('tata_gemini_api_key');
				if (savedKey) inpApiKey.value = savedKey;

				// Load Picker Mode
				const elPicker = document.getElementById('setting_picker_mode');
				if (elPicker) elPicker.value = localStorage.getItem('tata_picker_mode') || 'os';

				// V3: Load Theme
				const elTheme = document.getElementById('setting_theme');
				const savedTheme = localStorage.getItem('tata_theme') || 'dark';
				if (elTheme) elTheme.value = savedTheme;

				// V3: Load AI Model
				const elModel = document.getElementById('setting_ai_model');
				const savedModel = localStorage.getItem('tata_ai_model') || 'gemini-2.0-flash';
				if (elModel) elModel.value = savedModel;

				// Load Count UI
				const savedCount = localStorage.getItem('tata_hotkey_count') || "5";
				document.getElementById('hotkey_count_display').textContent = savedCount;

				settingsModal.classList.add('active');
			});
		}

		// Check Models Logic
		const btnCheckModels = document.getElementById('btn_check_models');
		if (btnCheckModels) {
			btnCheckModels.addEventListener('click', async function () {
				const key = inpApiKey.value.trim();
				if (!key) {
					alert("Please enter API Key first.");
					return;
				}

				const btn = this;
				const loader = document.getElementById('model_check_loader');
				const msg = document.getElementById('model_check_msg');
				const select = document.getElementById('setting_ai_model');

				btn.disabled = true;
				loader.style.display = 'block';
				msg.textContent = "Checking API permissions...";
				msg.style.color = "#171717";
				msg.style.backgroundColor = "#f5f2e9";
				msg.style.padding = "2px 6px";
				msg.style.borderRadius = "4px";

				try {
					const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
					const res = await TATA.fetchWithTimeout(listUrl, {}, 15000);

					if (!res.ok) {
						throw new Error(`HTTP ${res.status}`);
					}

					const data = await res.json();
					if (data.models) {
						// Filter for generateContent
						const validModels = data.models.filter(m => {
							return m.supportedGenerationMethods &&
								m.supportedGenerationMethods.includes("generateContent") &&
								m.name.includes("gemini");
						});

						if (validModels.length > 0) {
							// Clear existing
							select.innerHTML = "";

							// Sort: Pro models first, then Flash, then others
							validModels.sort((a, b) => {
								const nameA = a.name.toLowerCase();
								const nameB = b.name.toLowerCase();
								// Pro > Flash > Others
								// Newer > Older (roughly based on numbers)
								return nameB.localeCompare(nameA);
							});

							validModels.forEach(m => {
								const opt = document.createElement('option');
								const shortName = m.name.replace("models/", "");
								opt.value = shortName;
								opt.text = `${m.displayName} (${shortName})`;
								select.appendChild(opt);
							});

							msg.textContent = `Found ${validModels.length} models available for your key.`;
							msg.style.color = "#171717";
							msg.style.backgroundColor = "#b8f55f";
							msg.style.padding = "2px 6px";
							msg.style.borderRadius = "4px";

							// Auto-select first or previously selected if exists
							const savedModel = localStorage.getItem('tata_ai_model');
							if (savedModel) {
								// Check if saved exists in new list
								const exists = Array.from(select.options).some(o => { return o.value === savedModel; });
								if (exists) select.value = savedModel;
							}

						} else {
							msg.textContent = "No compatible Gemini models found.";
							msg.style.color = "#171717";
							msg.style.backgroundColor = "#ff8709";
							msg.style.padding = "2px 6px";
							msg.style.borderRadius = "4px";
						}
					}

				} catch (e) {
					msg.textContent = `Error: ${e.message} (Check API Key)`;
					msg.style.color = "#f5f2e9";
					msg.style.backgroundColor = "#e61919";
					msg.style.padding = "2px 6px";
					msg.style.borderRadius = "4px";
				} finally {
					btn.disabled = false;
					loader.style.display = 'none';
				}
			});
		}

		// Stepper Logic
		const btnMinus = document.querySelector('#stepper_hotkey_count .btn-minus');
		const btnPlus = document.querySelector('#stepper_hotkey_count .btn-plus');
		const display = document.getElementById('hotkey_count_display');

		if (btnMinus && btnPlus && display) {
			btnMinus.onclick = () => {
				const v = parseInt(display.textContent);
				if (v > 1) display.textContent = v - 1;
			};

			btnPlus.onclick = () => {
				const v = parseInt(display.textContent);
				if (v < 30) display.textContent = v + 1; // Limit 30
			};
		}

		// Factory Reset Logic
		const btnFactoryReset = document.getElementById('btn_factory_reset');
		var btnSaveSettings = document.getElementById('btn_save_settings');
		var btnCancelSettings = document.getElementById('btn_cancel_settings');

		// Guard: only attach listeners once per button
		if (btnFactoryReset && !btnFactoryReset._bound) {
			btnFactoryReset._bound = true;
			btnFactoryReset.addEventListener('click', () => {
				if (confirm("Are you sure you want to restore Factory Defaults?\n\nThis will DELETE ALL custom scripts/buttons and clear your settings.")) {
					// 1. Clear All LocalStorage
					localStorage.clear();

					// 2. Reload Panel
					location.reload();
				}
			});
		}

		if (btnSaveSettings && !btnSaveSettings._bound) {
			btnSaveSettings._bound = true;
			btnSaveSettings.addEventListener('click', () => {
				const key = inpApiKey.value.trim();
				if (key) {
					localStorage.setItem('tata_gemini_api_key', key);
				} else {
					localStorage.removeItem('tata_gemini_api_key');
				}

				// Hide inline API key prompt in AI Helper if key is set
				const keySection = document.getElementById('api_key_section');
				if (keySection) {
					keySection.style.display = key ? 'none' : 'flex';
				}

				// Save Picker Mode
				const elPicker = document.getElementById('setting_picker_mode');
				if (elPicker) {
					localStorage.setItem('tata_picker_mode', elPicker.value);
				}

				// V3: Save Theme
				const elTheme = document.getElementById('setting_theme');
				if (elTheme) {
					const theme = elTheme.value;
					localStorage.setItem('tata_theme', theme);
					if (theme === 'light') {
						document.body.classList.add('light-theme');
					} else {
						document.body.classList.remove('light-theme');
					}
				}

				// V3: Save AI Model
				const elModel = document.getElementById('setting_ai_model');
				if (elModel) {
					localStorage.setItem('tata_ai_model', elModel.value);
					// Update model badge in AI Helper
					const modelBadge = document.getElementById('ai_model_name');
					if (modelBadge) modelBadge.textContent = `(${elModel.value})`;
				}

				// Save Count
				const count = document.getElementById('hotkey_count_display').textContent;
				localStorage.setItem('tata_hotkey_count', count);

				// Reload Hotkeys
				initHotkeys();

				settingsModal.classList.remove('active');
			});
		}

		if (btnCancelSettings && !btnCancelSettings._bound) {
			btnCancelSettings._bound = true;
			btnCancelSettings.addEventListener('click', () => {
				settingsModal.classList.remove('active');
			});
		}

		// ==========================================
		// VERSION CHECK SYSTEM
		// ==========================================
		const CURRENT_VERSION = '3.0.1';
		const RELEASES_API_URL = 'https://api.github.com/repos/Ginero-168/RocketLauncher/releases/latest';

		async function checkForUpdates() {
			const btnCheck = document.getElementById('btn_check_update');
			const status = document.getElementById('update_status');
			const available = document.getElementById('update_available');
			if (btnCheck) {
				btnCheck.textContent = 'Checking...';
				btnCheck.disabled = true;
			}
			if (status) status.textContent = 'Checking GitHub Releases...';

			try {
				const res = await fetch(RELEASES_API_URL, {
					headers: { Accept: 'application/vnd.github+json' },
					cache: 'no-store',
				});
				if (!res.ok) throw new Error(`GitHub returned HTTP ${res.status}`);
				const release = await res.json();
				const latestVersion = String(release.tag_name || '').replace(/^v/i, '');
				const platform = /win/i.test(navigator.platform) ? 'windows' : 'macos';
				const asset = (release.assets || []).find(item =>
					item.name === `RocketLauncher-v${latestVersion}-${platform}.zxp`
				);
				const checksum = (release.assets || []).find(item =>
					item.name === `RocketLauncher-v${latestVersion}-${platform}.sha256`
				);
				if (!latestVersion || !asset) throw new Error('Release ZIP is missing');

				if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
					document.getElementById('new_version').textContent = `v${latestVersion}`;
					document.getElementById('download_link').href = asset.browser_download_url;
					document.getElementById('update_notes').textContent = release.body || 'Release notes are not available.';
					document.getElementById('update_checksum').textContent = checksum
						? `Checksum: download ${checksum.name} and verify SHA-256 before installing.`
						: 'Checksum file is not available for this release.';
					available.style.display = 'block';
					if (status) status.textContent = `Update available: v${latestVersion}`;
					showToast(`Update available: v${latestVersion}`);
				} else {
					available.style.display = 'none';
					if (status) status.textContent = `You have the latest version (v${CURRENT_VERSION}).`;
					showToast('You have the latest version!');
				}
			} catch (err) {
				if (status) status.textContent = `Update check failed: ${err.message}`;
				console.error('[Updates]', err);
				showToast('Could not check for updates', 'error');
			} finally {
				if (btnCheck) {
					btnCheck.textContent = 'Check for Updates';
					btnCheck.disabled = false;
				}
			}
		}

		function compareVersions(v1, v2) {
			const parts1 = v1.split('.').map(Number);
			const parts2 = v2.split('.').map(Number);
			for (let i = 0; i < 3; i++) {
				if ((parts1[i] || 0) > (parts2[i] || 0)) return 1;
				if ((parts1[i] || 0) < (parts2[i] || 0)) return -1;
			}
			return 0;
		}

		// Init version display
		const versionEl = document.getElementById('current_version');
		if (versionEl) versionEl.textContent = `v${CURRENT_VERSION}`;

		// Check update button
		const btnCheckUpdate = document.getElementById('btn_check_update');
		if (btnCheckUpdate) {
			btnCheckUpdate.addEventListener('click', checkForUpdates);
		}

		// Update checks are manual (Settings → Check for Updates) to avoid
		// unnecessary network calls on every panel load.

		// ==================
		// 2. Add Script Logic
		// ==================
		if (btnAdd) {
			btnAdd.addEventListener('click', () => {
				// Switch to AI Helper tab
				const aiTab = document.querySelector('.tab-btn[data-tab="tab_ai"]');
				if (aiTab) aiTab.click();
			});
		}



		if (btnCancelScript) {
			btnCancelScript.addEventListener('click', () => {
				scriptModal.classList.remove('active');
			});
		}

		if (btnSaveScript) {
			btnSaveScript.onclick = function () {
				const name = document.getElementById('script_name').value.trim();
				const code = document.getElementById('script_code').value.trim();


				let icon = document.getElementById('script_icon_val').value;
				if (!icon) icon = "★"; // Fallback

				const color = document.getElementById('script_color').value || "red";

				if (!name || !code) {
					alert("Name and Code are required.");
					return;
				}

				const isUpdate = (this.dataset.mode === "edit");
				const targetId = this.dataset.targetId;

				saveUserScript(name, icon, code, color, isUpdate, targetId);
				scriptModal.classList.remove('active');
			};
		}

		// Validate Script Button

		// ==================
		// 3. AI Prompt Logic
		// ==================
		if (btnOpenAI) {
			btnOpenAI.addEventListener('click', () => {
				const apiKey = localStorage.getItem('tata_gemini_api_key');
				if (!apiKey) {
					alert("Please set your Gemini API Key in Settings first.");
					return;
				}
				inpPrompt.value = "";
				loadingIndicator.style.display = 'none';
				btnSubmitAI.disabled = false;
				aiModal.classList.add('active');
			});
		}

		if (btnCancelAI) {
			btnCancelAI.addEventListener('click', () => {
				aiModal.classList.remove('active');
			});
		}

		if (btnSubmitAI) {
			btnSubmitAI.addEventListener('click', async () => {
				const apiKey = localStorage.getItem('tata_gemini_api_key');
				const userPrompt = inpPrompt.value.trim();

				if (!userPrompt) return;

				// Context Awareness: Inject existing code if available
				const currentCode = document.getElementById('script_code').value.trim();
				let finalPrompt = userPrompt;

				if (currentCode.length > 0) {
					finalPrompt = `My Current Code:\n\`\`\`javascript\n${currentCode}\n\`\`\`\n\nRequest: ${userPrompt}\n\nPlease modify the code above to fulfill the request. Maintain the JSON return format.`;
				}

				// Start Loading
				btnSubmitAI.disabled = true;
				loadingIndicator.style.display = 'inline-block';

				try {
					const scriptData = await generateScriptWithGemini(apiKey, finalPrompt);

					// Success! Fill parent modal
					document.getElementById('script_code').value = scriptData.code;

					// Always use AI name if available, or generate fallback
					if (scriptData.name) {
						document.getElementById('script_name').value = scriptData.name;
					} else if (!document.getElementById('script_name').value) {
						document.getElementById('script_name').value = `AI Script ${Math.floor(Math.random() * 1000)}`;
					}

					// Close AI modal
					aiModal.classList.remove('active');

				} catch (e) {
					alert(`AI Error: ${e.message}`);
				} finally {
					btnSubmitAI.disabled = false;
					loadingIndicator.style.display = 'none';
				}
			});
		}

		// ==================
		// 4. Color Swatch Logic
		// ==================
		const swatches = document.querySelectorAll('.color-swatch');
		swatches.forEach(swatch => {
			swatch.addEventListener('click', function () {
				// Update UI
				swatches.forEach(el => { el.classList.remove('selected'); });
				this.classList.add('selected');

				// Update Hidden Input
				const color = this.dataset.color;
				document.getElementById('script_color').value = color;

				// Update color preview
				const colorTrigger = document.getElementById('color_trigger');
				if (colorTrigger) colorTrigger.style.background = color;
			});
		});


		// ==================
		// 5. Icon Grid Logic
		// ==================
		const icons = document.querySelectorAll('.icon-option');
		icons.forEach(opt => {
			opt.addEventListener('click', function () {
				// UI
				icons.forEach(el => { el.classList.remove('selected'); });
				this.classList.add('selected');

				// Value
				document.getElementById('script_icon_val').value = this.innerHTML;
			});
		});
	}

	async function generateScriptWithGemini(apiKey, prompt) {
        // ENHANCED SYSTEM PROMPT with Context and Examples
        let systemPrompt = "You are an expert Adobe Illustrator JSX/ExtendScript developer for the Rocket Launcher extension.\n\n" +
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

        // Workspace Context: scan the active Illustrator document
        try {
			const wsContext = await new Promise(resolve => {
				if (TATA.host && TATA.host.run) {
					TATA.host.run('getWorkspaceContext', undefined, result => {
						resolve(result);
					});
				} else {
					resolve(null);
				}
			});
			if (wsContext && wsContext !== "EvalScript error." && wsContext.indexOf('{') === 0) {
				systemPrompt += `\n===== CURRENT WORKSPACE =====\n${wsContext}\n\nUse this workspace data to understand the current document structure.\nReference actual object names, layers, and text content when generating code.\n\n`;
			}
		} catch (e) { /* workspace context is optional */ }

        const payload = {
			"contents": [{
				"parts": [{
					"text": `${systemPrompt}\n\nUser Request: ${prompt}`
				}]
			}]
		};

        // New Retry Logic - Dynamic & Robust
        let modelsToTry = [];

        // 1. User Preference (if set)
        const userModel = localStorage.getItem('tata_ai_model');
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
        modelsToTry = modelsToTry.filter((item, pos) => {
			return modelsToTry.indexOf(item) == pos;
		});

        let lastError = null;
        let responseData = null;
        let usedModel = "";

        for (const modelName of modelsToTry) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            console.log(`[TATA] Trying Gemini Model: ${modelName}`);

            try {
				const response = await TATA.fetchWithTimeout(url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload)
				}, 45000);

				if (response.ok) {
					responseData = await response.json();
					usedModel = modelName;
					console.log(`[TATA] Success with model: ${modelName}`);

					// Update UI with used model name
					const modelBadge = document.getElementById('ai_model_name');
					if (modelBadge) {
						modelBadge.textContent = `(${modelName})`;
					}

					break; // Success!
				} else {
					const errText = await response.text();
					lastError = `HTTP ${response.status} (${modelName})`;
				}
			} catch (e) {
				lastError = e.message;
			}
        }

        if (!responseData) {
			throw new Error(`All Gemini models failed. Last error: ${lastError}`);
		}

        // Use data directly
        const data = responseData;
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content ||
			!data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
			throw new Error(`Invalid response structure from ${usedModel}`);
		}

        const text = data.candidates[0].content.parts[0].text;

        // Parse Tag-Based Format
        const nameMatch = text.match(/\[NAME\]([\s\S]*?)\[\/NAME\]/i);
        const codeMatch = text.match(/\[CODE\]([\s\S]*?)\[\/CODE\]/i);

        if (codeMatch) {
			const nameStr = nameMatch ? nameMatch[1].trim() : (`AI Script ${Math.floor(Math.random() * 100)}`);
			let codeStr = codeMatch[1].trim();

			// Clean up markdown blocks if any persist inside the [CODE] block
			codeStr = codeStr.replace(/^```javascript\n/, '').replace(/^```\n/, '').replace(/```$/, '');

			return { name: nameStr, code: codeStr };
		} else {
			// Fallback: If no tags found, assume whole text is code (risky but better than crashing)
			// Or try to strip markdown
			const raw = text.replace(/^```javascript\n/, '').replace(/^```\n/, '').replace(/```$/, '');
			return { name: `AI Script ${Math.floor(Math.random() * 100)}`, code: raw };
		}
    }

	/**
	 * Test a generated script in a safe environment (dry run)
	 */


	function openEditScriptModal(id) {
		const scripts = TATA.getUserScripts ? TATA.getUserScripts() : {};
		const script = scripts[id];
		if (!script) return;

		const modal = document.getElementById('script_modal');
		const btnSave = document.getElementById('btn_save_script');

		// Fill Data
		document.getElementById('script_name').value = script.name;
		document.getElementById('script_code').value = script.code;
		document.getElementById('script_icon_val').value = script.icon;
		document.getElementById('script_color').value = script.color;

		// UI Updates (Icon Selection)
		document.querySelectorAll('.icon-option').forEach(el => { el.classList.remove('selected'); });
		// Try to find matching icon
		let found = false;
		document.querySelectorAll('.icon-option').forEach(el => {
			if (el.innerHTML === script.icon) {
				el.classList.add('selected');
				found = true;
			}
		});

		// UI Updates (Color Selection)
		document.querySelectorAll('.color-swatch').forEach(el => { el.classList.remove('selected'); });
		const resolvedColor = TATA.resolveColor ? TATA.resolveColor(script.color) : script.color;
		const colorEl = document.querySelector(`.color-swatch[data-color="${resolvedColor}"], .color-swatch[data-color="${script.color}"]`);
		if (colorEl) colorEl.classList.add('selected');

		// Update color preview
		const colorTrigger = document.getElementById('color_trigger');
		if (colorTrigger) colorTrigger.style.background = resolvedColor || '';

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

	const deleteUserScript = TATA.deleteUserScript;



	// ===========================================
	// GLOBAL COLLAPSIBLE SECTION LOGIC
	// ===========================================
	document.addEventListener('click', e => {
		// Identify Header
		const header = e.target.closest('.section-header');
		if (!header) return;

		// Ignore if clicking buttons/inputs inside header (like the random button)
		if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
		if (e.target.tagName === 'INPUT') return;

		// Toggle Class
		const card = header.closest('.section-card');
		if (card) {
			card.classList.toggle('collapsed');
		}
	});



	var saveUserScript = TATA.saveUserScript;

	// ====================================================================================
	// ====================================   V2 LOGIC   ==================================
	// ====================================================================================

	// Bind to grid.js module directly
	Object.defineProperty(window, 'v2Layout', {
		get() { return TATA.v2Layout; },
		set(val) { TATA.v2Layout = val; }
	});

	const ICONS = TATA.ICONS || {};
	const v2Defaults = TATA.v2Defaults || {};
	var renderGrid = TATA.renderGrid;
	var saveV2Layout = TATA.saveV2Layout;

	function setupTabsV2() {
		const tabs = document.querySelectorAll('.tab-btn');
		const chat = TATA.chat;
		tabs.forEach(tab => {
			tab.addEventListener('click', function () {
				document.querySelectorAll('.tab-btn').forEach(t => { t.classList.remove('active'); });
				document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); });

				this.classList.add('active');
				const targetId = this.dataset.tab;
				const target = document.getElementById(targetId);
				if (target) target.classList.add('active');

				// Show tab-actions only on Button tab
				const tabActions = document.querySelector('.tab-actions');
				if (tabActions) {
					tabActions.style.display = (targetId === 'tab_button') ? 'flex' : 'none';
				}

				// Refresh CodeMirror when switching to Editor tab
				if (targetId === 'tab_editor' && window.cmEditor) {
					setTimeout(() => { window.cmEditor.refresh(); }, 50);
				}

				// Activate/deactivate chat polling based on tab visibility
				if (chat) {
					if (targetId === 'tab_chat') {
						chat.activate();
					} else {
						chat.deactivate();
					}
				}
			});

			// Drag Over to Switch Tab
			tab.addEventListener('dragenter', function (e) {
				e.preventDefault();
				this.click();
			});
			tab.addEventListener('dragover', e => { e.preventDefault(); });
			tab.addEventListener('drop', e => { e.preventDefault(); });
		});

		// Ensure chat is not polling on initial load (default is not the chat tab)
		if (chat) chat.deactivate();
	}

	// Tab rename reset removed (tabs are no longer renamable)

	// ==========================================
	// Background Work Pause/Resume
	// ==========================================
	function pauseBackgroundWork() {
		if (TATA.chat && typeof TATA.chat.deactivate === 'function') {
			TATA.chat.deactivate();
		}
	}

	function resumeBackgroundWork() {
		const activeTab = document.querySelector('.tab-btn.active');
		const activeTabId = activeTab ? activeTab.dataset.tab : 'tab_button';
		if (activeTabId === 'tab_chat' && TATA.chat && typeof TATA.chat.activate === 'function') {
			TATA.chat.activate();
		}
	}

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			pauseBackgroundWork();
		} else {
			resumeBackgroundWork();
		}
	});

	// Also pause/resume based on panel collapse
	function setupPanelVisibilityObserver() {
		const body = document.body;
		if (!body) return;
		new MutationObserver((mutations) => {
			for (const m of mutations) {
				if (m.attributeName !== 'class') continue;
				if (body.classList.contains('collapsed')) {
					pauseBackgroundWork();
				} else {
					resumeBackgroundWork();
				}
			}
		}).observe(body, { attributes: true, attributeFilter: ['class'] });
	}
	setupPanelVisibilityObserver();

	// ==========================================
	// V4.2: Export to Global TATA Namespace
	// ==========================================
	// ==========================================
	// V4.2: Export to Global TATA Namespace
	// ==========================================
	window.TATA = window.TATA || {};

	// Expose Critical Utils Globally (for separated IIFEs)
	window.showToast = showToast;

	TATA.showToast = showToast;
	TATA.showInputModal = showInputModal;
	TATA.showConfirmModal = showConfirmModal;
	TATA.openEditScriptModal = openEditScriptModal;
	TATA.renderGrid = renderGrid;
	TATA.renderHotkeys = renderHotkeys;
	TATA.saveV2Layout = saveV2Layout;
	TATA.saveHotkeys = saveHotkeys;
	TATA.debounce = debounce;
	TATA.safeParse = safeParse;
	TATA.backupBeforeSave = backupBeforeSave;
	TATA.DOM = DOM;
	TATA.csInterface = csInterface;

})();
