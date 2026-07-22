(() => {
	'use strict';

	const TATA = window.TATA || {};
	const showToast = TATA.showToast;

	function swapContrastColors() {
		const bgEl = document.getElementById('cc_bg_hex');
		const textEl = document.getElementById('cc_text_hex');
		if (!bgEl || !textEl) return;

		const temp = bgEl.value;
		bgEl.value = textEl.value;
		textEl.value = temp;

		updateContrastUI();
	}
	function openGlobalColorPicker(callback, initialColor) {
		// Create modal if needed
		const modalId = 'global_color_picker';
		let modal = document.getElementById(modalId);

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

		const inpNative = document.getElementById('gcp_native');
		const inpHex = document.getElementById('gcp_hex');
		const btnOk = document.getElementById('gcp_ok');
		const btnCancel = document.getElementById('gcp_cancel');
		const swatches = modal.querySelectorAll('.color-swatch');

		// Reset State
		inpHex.value = initialColor || '#FF0000';
		inpNative.value = initialColor || '#FF0000';
		swatches.forEach(s => { s.classList.remove('selected'); });

		// Handlers
		const onSwatch = e => {
			const hex = e.target.getAttribute('data-hex');
			if (hex) {
				inpHex.value = hex;
				inpNative.value = hex;
				swatches.forEach(s => { s.classList.remove('selected'); });
				e.target.classList.add('selected');
			}
		};
		swatches.forEach(s => { s.onclick = onSwatch; });

		const onNative = () => {
			inpHex.value = inpNative.value;
			swatches.forEach(s => { s.classList.remove('selected'); });
		};
		inpNative.oninput = onNative;

		const onHex = () => {
			inpNative.value = inpHex.value;
			swatches.forEach(s => { s.classList.remove('selected'); });
		};
		inpHex.oninput = onHex;

		const onConfirm = () => {
			const val = inpHex.value;
			cleanup();
			if (callback) callback(val);
		};

		const onDismiss = () => {
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
	}
	// HARMONY DASHBOARD LOGIC (Wheel Version)
	// ===========================================
	function setupCreative() {
		// UI Elements
		const btnDashGen = document.getElementById('btn_dash_generate');
		const inputPrimary = document.getElementById('input_primary_hex');
		const btnPickPrimary = document.getElementById('btn_pick_primary');
		const listContainer = document.getElementById('harmony_list');
		const canvas = document.getElementById('color_wheel_canvas');
		const wheelCursor = document.getElementById('wheel_cursor');
		const valSlider = document.getElementById('input_lightness');

		if (!btnDashGen || !listContainer || !canvas) return;

		const ctx = canvas.getContext('2d');
		const width = canvas.width;
		const height = canvas.height;
		const radius = width / 2;
		const centerX = width / 2;
		const centerY = height / 2;
		let isDragging = false;

		// State
		let primaryHex = "#FF6B6B";
		let harmonyData = {};
		// Recent Colors State
		let recentColors = [];
		try {
			const savedRecent = localStorage.getItem('tata_recent_colors');
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
			const a = s * Math.min(l, 1 - l) / 100;
			const f = n => {
				const k = (n + h / 30) % 12;
				const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
				return Math.round(255 * color).toString(16).padStart(2, '0');
			};
			return `#${f(0)}${f(8)}${f(4)}`;
		}
		function hexToHSL(H) {
            // Convert hex to RGB first
            let r = 0, g = 0, b = 0;
            if (H.length == 4) {
				r = `0x${H[1]}${H[1]}`;
				g = `0x${H[2]}${H[2]}`;
				b = `0x${H[3]}${H[3]}`;
			} else if (H.length == 7) {
				r = `0x${H[1]}${H[2]}`;
				g = `0x${H[3]}${H[4]}`;
				b = `0x${H[5]}${H[6]}`;
			}
            // Then to fractions
            r = +r / 255;
            g = +g / 255;
            b = +b / 255;

            const cmin = Math.min(r, g, b);
            const cmax = Math.max(r, g, b);
            const delta = cmax - cmin;
            let h = 0;
            let s = 0;
            let l = 0;

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

            return { h, s, l };
        }

		// Draw Wheel (Dynamic Lightness)
		function drawWheel(lightness) {
			if (lightness === undefined) lightness = 50;
			const image = ctx.createImageData(width, height);
			const data = image.data;


			for (let x = 0; x < width; x++) {
				for (let y = 0; y < height; y++) {
					const dx = x - centerX;
					const dy = y - centerY;
					const dist = Math.sqrt(dx * dx + dy * dy);

					// Inside Circle
					if (dist <= radius) {
						let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
						if (angle < 0) angle += 360;

						// H = Angle, S = Dist/Radius, L = Input
						const h = angle;
						const s = (dist / radius) * 100;
						const l = lightness;

						// HSL to RGB conversion for pixel
						const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
						const x_val = c * (1 - Math.abs(((h / 60) % 2) - 1));
						const m = (l / 100) - c / 2;
						let r = 0, g = 0, b = 0;

						if (0 <= h && h < 60) { r = c; g = x_val; b = 0; }
						else if (60 <= h && h < 120) { r = x_val; g = c; b = 0; }
						else if (120 <= h && h < 180) { r = 0; g = c; b = x_val; }
						else if (180 <= h && h < 240) { r = 0; g = x_val; b = c; }
						else if (240 <= h && h < 300) { r = x_val; g = 0; b = c; }
						else if (300 <= h && h < 360) { r = c; g = 0; b = x_val; }

						const index = (y * width + x) * 4;
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
			const hsl = hexToHSL(hex);
			const angle = (hsl.h - 90) * (Math.PI / 180);
			const dist = (hsl.s / 100) * radius;

			const cx = centerX + dist * Math.cos(angle);
			const cy = centerY + dist * Math.sin(angle);

			wheelCursor.style.left = `${cx}px`;
			wheelCursor.style.top = `${cy}px`;
		}

		function handleCanvasInput(e) {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;

			const x = (e.clientX - rect.left) * scaleX;
			const y = (e.clientY - rect.top) * scaleY;

			const dx = x - centerX;
			const dy = y - centerY;

			// Direct Cursor Tracking
			const rawAngle = Math.atan2(dy, dx);
			const distFromCenter = Math.sqrt(dx * dx + dy * dy);

			// Visual Clamp (Radius - 2)
			const visualDist = Math.min(distFromCenter, radius - 2);
			const logicDist = Math.min(distFromCenter, radius);

			const cursorX = centerX + visualDist * Math.cos(rawAngle);
			const cursorY = centerY + visualDist * Math.sin(rawAngle);

			wheelCursor.style.left = `${cursorX}px`;
			wheelCursor.style.top = `${cursorY}px`;

			// Calculate Color
			let angleDeg = rawAngle * (180 / Math.PI) + 90;
			if (angleDeg < 0) angleDeg += 360;

			const h = angleDeg;
			const s = (logicDist / radius) * 100;
			// Use current slider val if available, else 50
			const l = valSlider ? parseInt(valSlider.value) : 50;

			const hex = hslToHex(h, s, l);
			updatePrimary(hex, true, true); // Skip history and wheel update during drag
		}

		// Recent Colors Helpers
		function addToRecent(hex) {
			if (!hex) return;
			// 1. Remove if exists (to move to top)
			const idx = recentColors.indexOf(hex);
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
			const container = document.getElementById('recent_list');
			if (!container) return;
			container.innerHTML = '';

			recentColors.forEach(c => {
				const div = document.createElement('div');
				div.style.width = "16px";
				div.style.height = "16px";
				div.style.borderRadius = "50%"; // Circular
				div.style.backgroundColor = c;
				div.style.cursor = "pointer";
				div.title = c;
				div.style.border = "1px solid #555";
				div.style.flex = "none"; // Fix sizing

				div.onclick = () => {
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
				const contrastColor = getContrastYIQ(hex);
				inputPrimary.style.color = contrastColor;
			}

			// Fix: Target the new .mini-hex-card
			const bgCard = document.querySelector('.mini-hex-card');
			if (bgCard) {
				bgCard.style.backgroundColor = hex;
				// Update Icon Color too
				const icon = document.querySelector('#btn_pick_primary svg');
				if (icon) icon.style.fill = getContrastYIQ(hex);
			}

			if (!skipWheelUpdate) updateCursorFromHex(hex);
			if (!skipHistory) addToRecent(hex);

			// Update Slider UI
			if (!skipSliderUpdate && valSlider) {
				const hsl = hexToHSL(hex);
				valSlider.value = hsl.l;
				// Update Gradient
				const midColor = hslToHex(hsl.h, hsl.s, 50);
				valSlider.style.background = `linear-gradient(to right, black, ${midColor}, white)`;
				// Redraw Wheel with new Lightness
				drawWheel(hsl.l);
			}

			generateDashboard();
		}

		// Helper: Contrast (Black/White)
		function getContrastYIQ(hexcolor) {
			hexcolor = hexcolor.replace("#", "");
			const r = parseInt(hexcolor.substr(0, 2), 16);
			const g = parseInt(hexcolor.substr(2, 2), 16);
			const b = parseInt(hexcolor.substr(4, 2), 16);
			const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
			return (yiq >= 128) ? '#000000' : '#ffffff';
		}

		// Core Generator
		function generateDashboard() {
			const baseHSL = hexToHSL(primaryHex);
			// Defined Rules
			const rules = [
				"Analogous", "Complementary", "Triad", "Split Complementary",
				"Tetradic", "Square",
				"Shades", "Saturation", "Hue Scale", "Temperature",
				"Random"
			];

			harmonyData = {};

			rules.forEach(rule => {
				const rowColors = [];
				let count = 5; // Default

				// specific counts
				if (rule === "Complementary") count = 2;
				else if (rule === "Triad" || rule === "Split Complementary") count = 3;
				else if (rule === "Tetradic" || rule === "Square") count = 4;
				else if (rule === "Shades" || rule === "Saturation" || rule === "Hue Scale" || rule === "Temperature") count = 7;

				// Calculate offsets for Centered Scales (count 7) -> indices: -3, -2, -1, 0, 1, 2, 3
				const centerIndex = Math.floor(count / 2);

				for (let i = 0; i < count; i++) {
					let h = baseHSL.h, s = baseHSL.s, l = baseHSL.l;

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
						const step = i - centerIndex; // -3, -2, -1, 0, 1, 2, 3
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

			Object.keys(harmonyData).forEach(ruleName => {
				const colors = harmonyData[ruleName];
				const card = document.createElement('div');
				card.className = 'harmony-card';
				card.style.background = "#fff"; card.style.borderRadius = "6px";
				card.style.marginBottom = "5px"; // Reduced to 5px
				card.style.padding = "0"; card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.15)";
				card.style.display = "flex"; card.style.flexDirection = "column";

				const header = document.createElement('div');
				header.style.padding = "8px 10px 4px 10px"; // Move padding here
				header.style.display = "flex"; header.style.justifyContent = "space-between";
				header.style.alignItems = "baseline"; // header.style.marginBottom = "4px";

				const title = document.createElement('span');
				title.innerText = ruleName;
				title.style.fontWeight = "bold"; title.style.color = "#333"; title.style.fontSize = "11px";
				header.appendChild(title);

				// Place Button
				const btnPlace = document.createElement('button');
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
				btnPlace.onclick = () => { placePalette(colors); };
				header.appendChild(btnPlace);


				// Swatch Button (Renamed from "Save to Swatches")
				const btnExp = document.createElement('button');
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
				btnExp.title = `Export ${ruleName}`;
				btnExp.onclick = () => { exportPalette(ruleName, colors); };
				header.appendChild(btnExp);
				card.appendChild(header);

				const row = document.createElement('div');
				row.style.display = "flex"; row.style.height = "28px";
				row.style.borderRadius = "0 0 6px 6px"; row.style.overflow = "hidden";
				row.style.marginTop = "0px";

				colors.forEach(c => {
					const box = document.createElement('div');
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
					const ed = new EyeDropper();
					ed.open().then(result => {
						updatePrimary(result.sRGBHex.toUpperCase());
					}).catch(e => { });
				} else {
					// Fallback: Use Native OS Color Picker via ExtendScript
					// Validation
					if (!primaryHex) primaryHex = "#FF0000";

					let currentInt = parseInt(primaryHex.replace('#', ''), 16);
					if (isNaN(currentInt)) currentInt = 0xFF0000;

					alert("Debug: Starting Bridge... (Wait for Picker)");

					// Use Direct String Injection for maximum reliability (no reload needed)
					const script = `try {    var dec = $.colorPicker(${currentInt});    if(dec > -1) {       var hex = dec.toString(16).toUpperCase();       while(hex.length < 6) hex = '0' + hex;       '#' + hex;    } else { 'CANCELED'; } } catch(e) { 'ERR: ' + e.message; }`;

					TATA.host.evalCode(script, res => {
						if (res && res.indexOf('#') === 0) {
							updatePrimary(res);
						} else if (res === 'CANCELED') {
							// Do nothing
						} else {
							// If function not found (because hostscript didn't reload), warn user
							if (res.includes('undefined')) alert("Please reload the extension to apply the update.");
							else alert(`Picker Error: ${res}`);
						}
					});
				}
			} catch (e) {
				alert(`Client JS Error: ${e}`);
			}
		}

		// Initial Run
		drawWheel();
		updatePrimary(primaryHex);

		// Listeners
		btnDashGen.addEventListener('click', () => {
			const r = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
			updatePrimary(`#${r.toUpperCase()}`);
		});

		btnPickPrimary.addEventListener('click', () => {
			try {
				if ((localStorage.getItem('tata_picker_mode') || 'os') === 'tool') {
					// MODE 1: EYEDROPPER TOOL
					const toolScript = "try { " +
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

					TATA.host.evalCode(toolScript, res => {
						if (res && res.indexOf('#') === 0) {
							updatePrimary(res);
						} else if (res === 'TOOL_ACTIVATED') {
							// Poll for change in Default Fill Color (since user is picking now)
							let pollCount = 0;
							const maxPolls = 30; // 15 seconds
							const lastHex = primaryHex;

							const interval = setInterval(() => {
								pollCount++;
								if (pollCount > maxPolls) { clearInterval(interval); return; }

								const checkScript = "try { " +
									"   var c = app.activeDocument.defaultFillColor; " +
									"   if(c.typename === 'RGBColor') { " +
									"      var hex = c.red.toString(16).toUpperCase(); if(hex.length<2) hex='0'+hex; " +
									"      var g = c.green.toString(16).toUpperCase(); if(g.length<2) g='0'+g; hex += g; " +
									"      var b = c.blue.toString(16).toUpperCase(); if(b.length<2) b='0'+b; hex += b; " +
									"      '#' + hex; " +
									"   } else { 'SKIP'; } " +
									"} catch(e) { 'SKIP'; }";

								TATA.host.evalCode(checkScript, res => {
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
					let currentInt = parseInt(primaryHex.replace('#', ''), 16);
					if (isNaN(currentInt)) currentInt = 0xFF0000;

					const script = `try {    var dec = $.colorPicker(${currentInt});    if(dec > -1) {       var hex = dec.toString(16).toUpperCase();       while(hex.length < 6) hex = '0' + hex;       '#' + hex;    } else { 'CANCELED'; } } catch(e) { 'ERR: ' + e.message; }`;

					TATA.host.evalCode(script, res => {
						if (res && res.indexOf('#') === 0) updatePrimary(res);
						else if (res !== 'CANCELED') alert(`Picker Error: ${res}`);
					});
				}
			} catch (e) {
				alert(`Inline Error: ${e}`);
			}
		});

		inputPrimary.addEventListener('change', e => {
			if (/^#[0-9A-F]{6}$/i.test(e.target.value)) updatePrimary(e.target.value);
		});

		// Canvas Interaction
		canvas.addEventListener('mousedown', e => { isDragging = true; handleCanvasInput(e); });
		window.addEventListener('mousemove', e => { if (isDragging) handleCanvasInput(e); });
		window.addEventListener('mouseup', () => {
			if (isDragging) {
				isDragging = false;
				// Save final color on drag end
				addToRecent(primaryHex);
			}
		});
		// Lightness Slider Interaction
		if (valSlider) {
			valSlider.addEventListener('input', e => {
				const l = parseInt(e.target.value);
				const currentHSL = hexToHSL(primaryHex);
				const newHex = hslToHex(currentHSL.h, currentHSL.s, l);
				// Update Primary (Skip: WheelCursor, History, Slider)
				// We DO NOT skip wheel REDRAW inside updatePrimary
				updatePrimary(newHex, true, true, true);
				drawWheel(l); // Specific redraw
			});

			valSlider.addEventListener('change', e => {
				addToRecent(primaryHex);
			});
		}
	}
	// ===========================================
	// CONTRAST CHECKER LOGIC
	// ===========================================
	// GLOBAL CUSTOM PICKER STATE (In-App Modal)
	const customPickerState = {
		targetInputId: null,
		hue: 0,
		sat: 100,
		val: 100,
		rgb: { r: 255, g: 0, b: 0 },
		hex: '#FF0000',
		isDraggingCanvas: false
	};

	function openCustomColorPicker(inputId) {
		const inp = document.getElementById(inputId);
		if (!inp) return;

		customPickerState.targetInputId = inputId;

		// Parse current hex to HSV
		const currentHex = inp.value;
		if (isValidHex(currentHex)) {
			const rgb = hexToRgb(currentHex);
			const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
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
	}

	function closeCustomPicker() {
		document.getElementById('custom_picker_modal').style.display = 'none';
	}

	function confirmCustomPicker() {
		if (customPickerState.targetInputId) {
			const inp = document.getElementById(customPickerState.targetInputId);
			if (inp) {
				inp.value = customPickerState.hex;
				// Trigger update
				updateContrastUI();
			}
		}
		closeCustomPicker();
	}

	function setupCustomPickerListeners() {
		const canvas = document.getElementById('custom_picker_canvas');
		const hueSlider = document.getElementById('custom_picker_hue');

		// Hue Change
		hueSlider.addEventListener('input', e => {
			customPickerState.hue = parseFloat(e.target.value);
			renderCustomPickerCanvas();
			updatePickerUI();
		});

		// Canvas Interaction
		function handleCanvas(e) {
			const rect = canvas.getBoundingClientRect();
			let x = e.clientX - rect.left;
			let y = e.clientY - rect.top;

			// Clamp
			x = Math.max(0, Math.min(x, rect.width));
			y = Math.max(0, Math.min(y, rect.height));

			customPickerState.sat = (x / rect.width) * 100;
			customPickerState.val = 100 - ((y / rect.height) * 100);
			updatePickerUI();
		}

		canvas.addEventListener('mousedown', e => {
			customPickerState.isDraggingCanvas = true;
			handleCanvas(e);
		});
		window.addEventListener('mousemove', e => {
			if (customPickerState.isDraggingCanvas) handleCanvas(e);
		});
		window.addEventListener('mouseup', () => {
			customPickerState.isDraggingCanvas = false;
		});
	}

	function renderCustomPickerCanvas() {
		const canvas = document.getElementById('custom_picker_canvas');
		const ctx = canvas.getContext('2d');
		const w = canvas.width;
		const h = canvas.height;

		ctx.clearRect(0, 0, w, h);

		// 1. Fill with Hue
		ctx.fillStyle = `hsl(${customPickerState.hue}, 100%, 50%)`;
		ctx.fillRect(0, 0, w, h);

		// 2. White Gradient (Left to Right)
		const gradWhite = ctx.createLinearGradient(0, 0, w, 0);
		gradWhite.addColorStop(0, 'rgba(255,255,255,1)');
		gradWhite.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = gradWhite;
		ctx.fillRect(0, 0, w, h);

		// 3. Black Gradient (Top to Bottom)
		const gradBlack = ctx.createLinearGradient(0, 0, 0, h);
		gradBlack.addColorStop(0, 'rgba(0,0,0,0)');
		gradBlack.addColorStop(1, 'rgba(0,0,0,1)');
		ctx.fillStyle = gradBlack;
		ctx.fillRect(0, 0, w, h);
	}

	function updatePickerUI() {
		const h = customPickerState.hue;
		const s = customPickerState.sat;
		const v = customPickerState.val;

		const rgb = hsvToRgb(h / 360, s / 100, v / 100);
		customPickerState.rgb = rgb;
		const hex = `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1).toUpperCase()}`;
		customPickerState.hex = hex;

		// Update Cursor Pos
		const canvas = document.getElementById('custom_picker_canvas');
		const cursor = document.getElementById('custom_picker_cursor');
		const x = (s / 100) * canvas.width;
		const y = (1 - (v / 100)) * canvas.height;
		cursor.style.left = `${x}px`;
		cursor.style.top = `${y}px`;
		cursor.style.borderColor = (v < 50) ? '#fff' : '#000';

		// Update Preview
		const prev = document.getElementById('custom_picker_preview');
		prev.style.backgroundColor = hex;
	}

	// Helper: HSV to RGB
	function hsvToRgb(h, s, v) {
		let r, g, b;
		const i = Math.floor(h * 6);
		const f = h * 6 - i;
		const p = v * (1 - s);
		const q = v * (1 - f * s);
		const t = v * (1 - (1 - f) * s);
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
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h;
        let s;
        const v = max;
        const d = max - min;
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
        return { h, s, v };
    }



	// --- DESIGNER TIPS FEATURE ---
	const designerTips = [
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

	function updateRandomTip() {
		const el = document.getElementById('daily_tip_text');
		if (!el) return;
		const r = Math.floor(Math.random() * designerTips.length);
		el.innerText = `"${designerTips[r]}"`;

		// Optional: Animate a bit
		const card = el.closest('.tip-card');
		if (card) {
			card.style.transform = "scale(0.98)";
			setTimeout(() => { card.style.transform = "scale(1)"; }, 100);
		}
	}

	function initContrastChecker() {
		const bgInput = document.getElementById('cc_bg_hex');
		const textInput = document.getElementById('cc_text_hex');
		if (!bgInput || !textInput) return;

		// Init Funny Tip
		if (typeof window.updateRandomTip === 'function') window.updateRandomTip();

		updateContrastUI();

		[bgInput, textInput].forEach(inp => {
			inp.addEventListener('input', updateContrastUI);
			inp.addEventListener('change', updateContrastUI);
		});

		// Force Toggle Logic
		const ccHeader = bgInput.closest('.section-card').querySelector('.section-header');
		if (ccHeader) {
			ccHeader.style.cursor = 'pointer';
			ccHeader.onclick = function (e) {
				e.stopPropagation();
				this.closest('.section-card').classList.toggle('collapsed');
			};
		}
	}

	function updateContrastUI() {
		const bgEl = document.getElementById('cc_bg_hex');
		const textEl = document.getElementById('cc_text_hex');

		if (!bgEl || !textEl) return;

		const bgHex = bgEl.value;
		const textHex = textEl.value;

		if (!isValidHex(bgHex) || !isValidHex(textHex)) return;

		// 1. Update Tip Card (Real-time Preview)
		const tipCard = document.querySelector('.tip-card');
		if (tipCard) {
			tipCard.style.backgroundColor = bgHex;
			tipCard.style.color = textHex;
			tipCard.style.border = (bgHex.toLowerCase() === textHex.toLowerCase()) ? "1px solid #ccc" : "none";
		}

		const ratio = getContrastRatio(bgHex, textHex);
		const scoreVal = document.getElementById('cc_score_val');
		const scoreText = document.getElementById('cc_score_text');
		const scoreStars = document.getElementById('cc_score_stars');
		const card = document.getElementById('score_card');

		// Update Number
		if (scoreVal) scoreVal.textContent = ratio.toFixed(2);

		// --- MAIN CARD LOGIC (User Defined 5-Tiers) ---
		function getMainState(r) {
			const pinkBg = '#ffebee', pinkText = '#b71c1c';
			const yellowBg = '#fff9c4', yellowText = '#fbc02d'; // darker gold for text
			const greenBg = '#e8f5e9', greenText = '#2e7d32';

			if (r < 3.0) return { label: 'Very poor', bg: pinkBg, text: pinkText, stars: '★☆☆☆☆' };
			if (r < 4.5) return { label: 'Poor', bg: pinkBg, text: pinkText, stars: '★★☆☆☆' };
			if (r < 7.0) return { label: 'Good', bg: yellowBg, text: yellowText, stars: '★★★☆☆' };
			if (r < 12.0) return { label: 'Very good', bg: greenBg, text: greenText, stars: '★★★★☆' };
			return { label: 'Excellent', bg: greenBg, text: greenText, stars: '★★★★★' };
		}

		const mainState = getMainState(ratio);

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
		const smallState = getBoxState(ratio, 4.5, 7.0);
		// Large Text: AA=3.0, AAA=4.5
		const largeState = getBoxState(ratio, 3.0, 4.5);

		// Update Small Box
		const sBox = document.getElementById('cc_small_box');
		const sLabel = document.getElementById('cc_s_label');
		const sStars = document.getElementById('cc_small_stars');
		if (sBox) sBox.style.backgroundColor = smallState.bg;
		if (sLabel) sLabel.style.color = smallState.text;
		if (sStars) sStars.style.color = smallState.text;

		// Update Large Box
		const lBox = document.getElementById('cc_large_box');
		const lLabel = document.getElementById('cc_l_label');
		const lStars = document.getElementById('cc_large_stars');
		if (lBox) lBox.style.backgroundColor = largeState.bg;
		if (lLabel) lLabel.style.color = largeState.text;
		if (lStars) lStars.style.color = largeState.text;

		// Update Input Backgrounds and ICON CONTRAST
		if (bgEl.parentElement) bgEl.parentElement.style.backgroundColor = bgHex;
		// Update Input Backgrounds
		if (bgEl.parentElement) bgEl.parentElement.style.backgroundColor = bgHex;
		const bgContrast = getContrastYIQ(bgHex);
		bgEl.style.color = bgContrast;

		if (textEl.parentElement) textEl.parentElement.style.backgroundColor = textHex;
		const textContrast = getContrastYIQ(textHex);
		textEl.style.color = textContrast;
	}

	function getContrastYIQ(hexcolor) {
		hexcolor = hexcolor.replace("#", "");
		if (hexcolor.length === 3) {
			hexcolor = hexcolor.split('').map(c => { return c + c; }).join('');
		}
		const r = parseInt(hexcolor.substr(0, 2), 16);
		const g = parseInt(hexcolor.substr(2, 2), 16);
		const b = parseInt(hexcolor.substr(4, 2), 16);
		const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
		return (yiq >= 128) ? '#000000' : '#ffffff';
	}

	function getContrastRatio(hex1, hex2) {
		const lum1 = getLuminance(hex1);
		const lum2 = getLuminance(hex2);
		const bright = Math.max(lum1, lum2);
		const dark = Math.min(lum1, lum2);
		return (bright + 0.05) / (dark + 0.05);
	}

	function getLuminance(hex) {
		const rgb = hexToRgb(hex);
		const a = [rgb.r, rgb.g, rgb.b].map(v => {
			v /= 255;
			return v <= 0.03928
				? v / 12.92
				: Math.pow((v + 0.055) / 1.055, 2.4);
		});
		return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
	}

	function hexToRgb(hex) {
		const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, (m, r, g, b) => {
			return r + r + g + g + b + b;
		});

		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : { r: 0, g: 0, b: 0 };
	}

	function isValidHex(hex) {
		return /^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{3}$/i.test(hex);
	}
	function exportPalette(name, colors) {
		const script = `try { var doc = app.activeDocument; var grp = doc.swatchGroups.add(); grp.name = '${name} Theme'; var cols = ${JSON.stringify(colors)}; for(var i=0; i<cols.length; i++){ var hex = cols[i].replace('#',''); var r = parseInt(hex.substring(0,2), 16); var g = parseInt(hex.substring(2,4), 16); var b = parseInt(hex.substring(4,6), 16); var c = new RGBColor(); c.red=r; c.green=g; c.blue=b; var s = doc.swatches.add(); s.color = c; s.name = 'Hex '+hex; grp.addSwatch(s); } 'Success'; } catch(e){e.toString();}`;
		TATA.host.evalCode(script, res => { if (res !== 'Success') alert(res); });
	}

	function placePalette(colors) {
		const script = // Start 100pt above artboard
        // Helper: Hex to RGBColor object
        // Helper: Create Gradient
        // Create Main Group
        // 1. Draw Solid Colors (Row 1)
        // 2. Draw Pairwise Gradients (Row 2) => Below Row 1
        // 3. Draw Global Gradient (Row 3) => Below Row 2
        `try { var doc = app.activeDocument;var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];var rect = ab.artboardRect;var x = rect[0];var y = rect[1];var topFunc = y + 100;var size = 80;var gap = 10;var cols = ${JSON.stringify(colors)};function getRGB(hex) {   hex = hex.replace('#','');   var r = parseInt(hex.substring(0,2), 16);   var g = parseInt(hex.substring(2,4), 16);   var b = parseInt(hex.substring(4,6), 16);   var c = new RGBColor(); c.red=r; c.green=g; c.blue=b;   return c;}function createGrad(name, colorsArr) {   var gName = name + '_' + Math.round(Math.random()*10000);   try { var existing = doc.gradients.getByName(gName); existing.remove(); } catch(e){}   var newGrad = doc.gradients.add();   newGrad.name = gName;   newGrad.type = GradientType.LINEAR;      /* Safe Logic: Reuse Existing Stops */   var stops = newGrad.gradientStops;   var targetLen = colorsArr.length;      /* 1. Add if needed */   while(stops.length < targetLen) { stops.add(); }   /* 2. Remove if too many (reverse loop) */   while(stops.length > targetLen) { stops[stops.length-1].remove(); }      /* 3. Assign Values */   for(var i=0; i<targetLen; i++) {       var s = stops[i];       s.rampPoint = (i / (targetLen - 1)) * 100;       s.color = getRGB(colorsArr[i]);       s.midPoint = 50;   }   var gc = new GradientColor();   gc.gradient = newGrad;   return gc;}var mainGroup = doc.groupItems.add();mainGroup.name = 'TATA Palette';for(var i=0; i<cols.length; i++){   var box = mainGroup.pathItems.rectangle(topFunc, x + (i * (size + gap)), size, size);   box.fillColor = getRGB(cols[i]);   box.stroked = false;}var row2Top = topFunc - (size + gap);if(cols.length > 1) {   for(var i=0; i<cols.length-1; i++){       var gCol = createGrad('Pair_'+i, [cols[i], cols[i+1]]);       var box = mainGroup.pathItems.rectangle(row2Top, x + (i * (size + gap)), size, size);       box.fillColor = gCol;       box.stroked = false;       /* Rotate Gradient 0 deg default */   }}var row3Top = row2Top - (size + gap);if(cols.length > 1) {   var totalWidth = (cols.length * size) + ((cols.length-1) * gap);   var gAll = createGrad('Global', cols);   var box = mainGroup.pathItems.rectangle(row3Top, x, totalWidth, size);   box.fillColor = gAll;   box.stroked = false;}'Success';} catch(e) { e.message + ' line:' + e.line; }`;

		TATA.host.evalCode(script, res => {
			if (res !== 'Success') alert(`Place Error: ${res}`);
		});
	}
	function initCustomColors() {
		// Default custom colors
		const customColors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#8B00FF"];
	
		// Check if we are on the Colors panel
		const container = document.getElementById('custom_colors_container');
		if (!container) return; // Not on Colors panel or elements not ready
	
		// Initialize Slots
		function updateSlots() {
			const slots = document.querySelectorAll('.custom-color-slot');
			slots.forEach((slot, index) => {
				slot.style.backgroundColor = customColors[index];
				slot.title = `Click to Edit: ${customColors[index]}`;
				slot.onclick = () => {
					// Use GLOBAL Picker (New Script Style) as requested
					const currentColor = customColors[index];
					openGlobalColorPicker(newColor => {
						if (newColor) {
							customColors[index] = newColor;
							updateSlots();
						}
					}, currentColor);
				};
			});
		}
	
		// Attach Button Events
		const btnPlace = document.getElementById('btn_custom_place');
		if (btnPlace) {
			btnPlace.onclick = () => {
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
	
		const btnSwatch = document.getElementById('btn_custom_swatch');
		if (btnSwatch) {
			btnSwatch.onclick = () => {
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
	
	}


	// Expose color tools on TATA namespace
	TATA.colorTools = {
		init,
		openGlobalColorPicker,
		openCustomColorPicker,
		swapContrastColors,
		initContrastChecker,
		setupCreative,
		exportPalette,
		placePalette
	};

	// Keep window references for inline HTML onclick attributes
	window.openGlobalColorPicker = openGlobalColorPicker;
	window.openCustomColorPicker = openCustomColorPicker;
	window.closeCustomPicker = closeCustomPicker;
	window.confirmCustomPicker = confirmCustomPicker;
	window.updateRandomTip = updateRandomTip;
	window.swapContrastColors = swapContrastColors;
	window.setupCreative = setupCreative;
	window.exportPalette = exportPalette;
	window.placePalette = placePalette;

	function init() {
		setupCreative();
		initContrastChecker();
		initCustomColors();
	}

	window.TATA = TATA;
})();
