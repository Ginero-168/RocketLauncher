(function () {
	'use strict';

	var TATA = window.TATA || {};
	var showToast = TATA.showToast;

	function swapContrastColors() {
		var bgEl = document.getElementById('cc_bg_hex');
		var textEl = document.getElementById('cc_text_hex');
		if (!bgEl || !textEl) return;

		var temp = bgEl.value;
		bgEl.value = textEl.value;
		textEl.value = temp;

		updateContrastUI();
	}
	function openGlobalColorPicker(callback, initialColor) {
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
	}
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
			var r = 0, g = 0, b = 0;
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

			var cmin = Math.min(r, g, b),
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

					TATA.host.evalCode(script, function (res) {
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
				if ((localStorage.getItem('tata_picker_mode') || 'os') === 'tool') {
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

					TATA.host.evalCode(toolScript, function (res) {
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

								TATA.host.evalCode(checkScript, function (res) {
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

					TATA.host.evalCode(script, function (res) {
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

	function openCustomColorPicker(inputId) {
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
	}

	function closeCustomPicker() {
		document.getElementById('custom_picker_modal').style.display = 'none';
	}

	function confirmCustomPicker() {
		if (customPickerState.targetInputId) {
			var inp = document.getElementById(customPickerState.targetInputId);
			if (inp) {
				inp.value = customPickerState.hex;
				// Trigger update
				updateContrastUI();
			}
		}
		closeCustomPicker();
	}

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

	function updateRandomTip() {
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
	}

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
	function exportPalette(name, colors) {
		var script = "try { var doc = app.activeDocument; var grp = doc.swatchGroups.add(); grp.name = '" + name + " Theme'; var cols = " + JSON.stringify(colors) + "; for(var i=0; i<cols.length; i++){ var hex = cols[i].replace('#',''); var r = parseInt(hex.substring(0,2), 16); var g = parseInt(hex.substring(2,4), 16); var b = parseInt(hex.substring(4,6), 16); var c = new RGBColor(); c.red=r; c.green=g; c.blue=b; var s = doc.swatches.add(); s.color = c; s.name = 'Hex '+hex; grp.addSwatch(s); } 'Success'; } catch(e){e.toString();}";
		TATA.host.evalCode(script, function (res) { if (res !== 'Success') alert(res); });
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

		TATA.host.evalCode(script, function (res) {
			if (res !== 'Success') alert("Place Error: " + res);
		});
	}
	function initCustomColors() {
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
	
	}


	// Expose color tools on TATA namespace
	TATA.colorTools = {
		init: init,
		openGlobalColorPicker: openGlobalColorPicker,
		openCustomColorPicker: openCustomColorPicker,
		swapContrastColors: swapContrastColors,
		initContrastChecker: initContrastChecker,
		setupCreative: setupCreative,
		exportPalette: exportPalette,
		placePalette: placePalette
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
