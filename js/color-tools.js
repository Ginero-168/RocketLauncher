/**
 * Rocket Launcher - Colors tab
 * Custom Colors (2–8 slots), Color Harmony and Contrast Checker.
 * Colour values reach CSS as custom properties (--swatch, --dot, --hex-bg,
 * --hex-fg, --tip-bg, --tip-fg); the level of a contrast result is a
 * data-level attribute. Nothing here writes presentational inline styles.
 */
(() => {
	'use strict';

	const TATA = window.TATA || {};
	let activePickerInterval = null;

	const extraWheels = [];
	const contrastWheels = [];
	const wheelFrame = { id: 0, wheels: new Set() };

	function toast(message, type) {
		if (typeof TATA.showToast === 'function') TATA.showToast(message, type);
	}

	// Place on the artboard / add to the Swatches panel (also in index.html).
	const ACTION_ICONS = {
		place: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2Z',
		swatch: 'M6 5H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Zm14 0h-3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Zm-7 0h-3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z'
	};

	function actionButton(kind, label, accessibleName, onClick) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = `btn btn--sm harmony-${kind}`;
		btn.title = accessibleName;
		btn.setAttribute('aria-label', accessibleName);
		const svgNS = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgNS, 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('aria-hidden', 'true');
		const path = document.createElementNS(svgNS, 'path');
		path.setAttribute('d', ACTION_ICONS[kind]);
		svg.appendChild(path);
		const text = document.createElement('span');
		text.className = 'btn-label';
		text.textContent = label;
		btn.appendChild(svg);
		btn.appendChild(text);
		btn.addEventListener('click', onClick);
		return btn;
	}

	function requestFrame(cb) {
		return typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame(cb) : setTimeout(cb, 16);
	}

	function scheduleWheelRefresh(wheels) {
		const list = Array.isArray(wheels) ? wheels : [wheels];
		list.forEach(wheel => {
			if (wheel && typeof wheel.refresh === 'function') wheelFrame.wheels.add(wheel);
		});
		if (!wheelFrame.wheels.size || wheelFrame.id) return;
		wheelFrame.id = requestFrame(() => {
			wheelFrame.id = 0;
			const pending = Array.from(wheelFrame.wheels);
			wheelFrame.wheels.clear();
			pending.forEach(wheel => wheel.refresh());
		});
	}

	// ==========================================
	// Shared converters
	// ==========================================
	function hslToHexShared(h, s, l) {
		if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return '';
		l /= 100;
		const a = s * Math.min(l, 1 - l) / 100;
		const f = n => {
			const k = (n + h / 30) % 12;
			const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
			return Math.round(255 * color).toString(16).padStart(2, '0');
		};
		return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
	}

	function hexToHslShared(H) {
		let r = 0, g = 0, b = 0;
		if (!H) H = '#E61919';
		if (H.length === 4) {
			r = parseInt(H[1] + H[1], 16);
			g = parseInt(H[2] + H[2], 16);
			b = parseInt(H[3] + H[3], 16);
		} else if (H.length === 7) {
			r = parseInt(H.slice(1, 3), 16);
			g = parseInt(H.slice(3, 5), 16);
			b = parseInt(H.slice(5, 7), 16);
		}
		r /= 255; g /= 255; b /= 255;
		const cmin = Math.min(r, g, b);
		const cmax = Math.max(r, g, b);
		const delta = cmax - cmin;
		let h = 0;
		let s = 0;
		const l = (cmax + cmin) / 2;
		if (delta !== 0) {
			if (cmax === r) h = ((g - b) / delta) % 6;
			else if (cmax === g) h = (b - r) / delta + 2;
			else h = (r - g) / delta + 4;
			s = delta / (1 - Math.abs(2 * l - 1));
		}
		h = Math.round(h * 60);
		if (h < 0) h += 360;
		return { h, s: +(s * 100).toFixed(1), l: +(l * 100).toFixed(1) };
	}

	function hexToRgb(hex) {
		const full = String(hex || '').replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => r + r + g + g + b + b);
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full);
		return result
			? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
			: { r: 0, g: 0, b: 0 };
	}

	function isValidHex(hex) {
		return /^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{3}$/i.test(hex);
	}

	// Ink that reads on top of a colour (YIQ, same as before).
	function inkFor(hex) {
		const rgb = hexToRgb(hex);
		return ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000 >= 128 ? '#171717' : '#f5f2e9';
	}

	function getLuminance(hex) {
		const rgb = hexToRgb(hex);
		const a = [rgb.r, rgb.g, rgb.b].map(v => {
			v /= 255;
			return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
		});
		return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
	}

	function getContrastRatio(hex1, hex2) {
		const lum1 = getLuminance(hex1);
		const lum2 = getLuminance(hex2);
		return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
	}

	function showHexError(input, announce) {
		if (input) {
			input.classList.add('hex-invalid');
			input.setAttribute('aria-invalid', 'true');
			input.title = 'Enter a hex color like #E61919';
		}
		if (announce) toast('Enter a hex color like #E61919', 'error');
	}

	function clearHexError(input) {
		if (!input) return;
		input.classList.remove('hex-invalid');
		input.setAttribute('aria-invalid', 'false');
		input.title = '';
	}

	// A field drawn on its own colour.
	function paintHexSurface(el, hex) {
		if (!el || !isValidHex(hex)) return;
		el.style.setProperty('--hex-bg', hex);
		el.style.setProperty('--hex-fg', inkFor(hex));
	}

	// ==========================================
	// Colour wheels (hue around, saturation out, lightness from a slider)
	// ==========================================
	const sharedWheelCache = new Map();

	function paintSharedWheel(canvas, lightness) {
		if (!canvas || typeof canvas.getContext !== 'function') return;
		const ctx = canvas.getContext('2d');
		if (!ctx || typeof ctx.createImageData !== 'function') return;
		const width = canvas.width;
		const height = canvas.height;
		const radius = width / 2;
		const centerX = width / 2;
		const centerY = height / 2;
		const l = Math.max(0, Math.min(100, Math.round(lightness)));
		const key = `${width}x${height}@${l}`;
		if (sharedWheelCache.has(key)) {
			ctx.putImageData(sharedWheelCache.get(key), 0, 0);
			return;
		}
		const image = ctx.createImageData(width, height);
		const data = image.data;
		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				const dx = x - centerX;
				const dy = y - centerY;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist > radius) continue;
				let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
				if (angle < 0) angle += 360;
				const s = (dist / radius) * 100;
				const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
				const xVal = c * (1 - Math.abs(((angle / 60) % 2) - 1));
				const m = (l / 100) - c / 2;
				let rr = 0, gg = 0, bb = 0;
				if (angle < 60) { rr = c; gg = xVal; }
				else if (angle < 120) { rr = xVal; gg = c; }
				else if (angle < 180) { gg = c; bb = xVal; }
				else if (angle < 240) { gg = xVal; bb = c; }
				else if (angle < 300) { rr = xVal; bb = c; }
				else { rr = c; bb = xVal; }
				const index = (y * width + x) * 4;
				data[index] = (rr + m) * 255;
				data[index + 1] = (gg + m) * 255;
				data[index + 2] = (bb + m) * 255;
				data[index + 3] = 255;
			}
		}
		ctx.putImageData(image, 0, 0);
		sharedWheelCache.set(key, image);
	}

	function paintWheelDot(dot, hex) {
		if (!dot || !hex) return;
		dot.style.setProperty('--dot', hex);
		dot.classList.toggle('is-light', hexToHslShared(hex).l > 62);
	}

	// Put the dot's centre at a bitmap point, in CSS pixels.
	function placeDot(canvas, dot, x, y) {
		const rect = canvas.getBoundingClientRect();
		const viewW = rect.width || canvas.width;
		const viewH = rect.height || canvas.height;
		dot.style.left = `${(x / canvas.width) * viewW}px`;
		dot.style.top = `${(y / canvas.height) * viewH}px`;
	}

	function mountColorWheel(canvas, cursor, hooks) {
		if (!canvas || !cursor) return { refresh() {} };
		let dragging = false;
		const radius = canvas.width / 2;
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;

		function lightness() {
			if (typeof hooks.lightness === 'function') return hooks.lightness();
			return hexToHslShared(hooks.getHex() || '#E61919').l;
		}

		function place(hex) {
			const hsl = hexToHslShared(hex || '#E61919');
			const angle = (hsl.h - 90) * (Math.PI / 180);
			const dist = (Math.min(100, hsl.s) / 100) * (radius - 2);
			placeDot(canvas, cursor, centerX + dist * Math.cos(angle), centerY + dist * Math.sin(angle));
			paintWheelDot(cursor, hex);
		}

		function refresh() {
			paintSharedWheel(canvas, lightness());
			place(hooks.getHex());
		}

		function pick(e) {
			const rect = canvas.getBoundingClientRect();
			const x = (e.clientX - rect.left) * (canvas.width / (rect.width || canvas.width));
			const y = (e.clientY - rect.top) * (canvas.height / (rect.height || canvas.height));
			const dx = x - centerX;
			const dy = y - centerY;
			const logicDist = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
			let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
			if (angleDeg < 0) angleDeg += 360;
			const hex = hslToHexShared(angleDeg, (logicDist / radius) * 100, lightness());
			hooks.setHex(hex);
			place(hex);
		}

		canvas.addEventListener('mousedown', e => {
			dragging = true;
			pick(e);
		});
		window.addEventListener('mousemove', e => {
			if (dragging) pick(e);
		});
		window.addEventListener('mouseup', () => {
			if (!dragging) return;
			dragging = false;
			if (typeof hooks.commit === 'function') hooks.commit();
		});

		refresh();
		return { refresh, place };
	}

	// ==========================================
	// Color Harmony
	// ==========================================
	let wheelPainter = null;

	const HARMONY_RULES = [
		'Analogous', 'Complementary', 'Triad', 'Split Complementary', 'Tetradic', 'Square',
		'Shades', 'Saturation', 'Hue Scale', 'Temperature', 'Random'
	];

	function harmonyCount(rule) {
		if (rule === 'Complementary') return 2;
		if (rule === 'Triad' || rule === 'Split Complementary') return 3;
		if (rule === 'Tetradic' || rule === 'Square') return 4;
		if (rule === 'Shades' || rule === 'Saturation' || rule === 'Hue Scale' || rule === 'Temperature') return 7;
		return 5;
	}

	// Pull a hue part of the way towards a target hue (shortest way round).
	function towardHue(h, target, amount) {
		const dist = (target - h + 540) % 360 - 180;
		return (h + dist * amount + 360) % 360;
	}

	function harmonyColors(rule, base) {
		const count = harmonyCount(rule);
		const center = Math.floor(count / 2);
		const OFFSETS = {
			Complementary: [0, 180],
			Triad: [0, 120, 240],
			'Split Complementary': [0, 150, 210],
			Tetradic: [0, 60, 180, 240],
			Square: [0, 90, 180, 270]
		};
		const colors = [];
		for (let i = 0; i < count; i++) {
			let h = base.h, s = base.s, l = base.l;
			const step = i - center;
			if (rule === 'Analogous') h = (base.h + i * 30) % 360;
			else if (OFFSETS[rule]) h = (base.h + OFFSETS[rule][i]) % 360;
			else if (rule === 'Random' && i > 0) {
				h = Math.random() * 360;
				s = 40 + Math.random() * 60;
			} else if (rule === 'Shades') l = Math.min(100, Math.max(0, l - step * 15)); // light → dark
			else if (rule === 'Saturation') s = Math.min(100, Math.max(0, s + step * 15));
			else if (rule === 'Hue Scale') h = (h + step * 15 + 360) % 360;
			else if (rule === 'Temperature' && step) h = towardHue(h, step < 0 ? 210 : 45, Math.abs(step) * 0.15);
			colors.push(hslToHexShared(h, s, l));
		}
		return colors;
	}

	function setupCreative() {
		const btnDashGen = document.getElementById('btn_dash_generate');
		const inputPrimary = document.getElementById('input_primary_hex');
		const btnPickPrimary = document.getElementById('btn_pick_primary');
		const listContainer = document.getElementById('harmony_list');
		const canvas = document.getElementById('color_wheel_canvas');
		const wheelCursor = document.getElementById('wheel_cursor');
		const valSlider = document.getElementById('input_lightness');
		if (!btnDashGen || !listContainer || !canvas) return;

		const radius = canvas.width / 2;
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;
		let isDragging = false;
		let primaryHex = '#E61919';
		let recentColors = [];
		try {
			recentColors = JSON.parse(localStorage.getItem('tata_recent_colors') || '[]');
			if (!Array.isArray(recentColors)) recentColors = [];
			// One entry per colour: '#e61919' and '#E61919' are the same swatch.
			recentColors = recentColors
				.filter(isValidHex)
				.map(c => c.toUpperCase())
				.filter((c, i, list) => list.indexOf(c) === i)
				.slice(0, 7);
		} catch (e) { recentColors = []; }

		const drawWheel = lightness => paintSharedWheel(canvas, lightness === undefined ? 50 : lightness);

		function updateCursorFromHex(hex) {
			if (!wheelCursor) return;
			const hsl = hexToHslShared(hex);
			const angle = (hsl.h - 90) * (Math.PI / 180);
			const dist = (hsl.s / 100) * radius;
			placeDot(canvas, wheelCursor, centerX + dist * Math.cos(angle), centerY + dist * Math.sin(angle));
			paintWheelDot(wheelCursor, hex);
		}

		function handleCanvasInput(e) {
			const rect = canvas.getBoundingClientRect();
			const x = (e.clientX - rect.left) * (canvas.width / rect.width);
			const y = (e.clientY - rect.top) * (canvas.height / rect.height);
			const dx = x - centerX;
			const dy = y - centerY;
			const rawAngle = Math.atan2(dy, dx);
			const distFromCenter = Math.sqrt(dx * dx + dy * dy);
			const visualDist = Math.min(distFromCenter, radius - 2);
			const logicDist = Math.min(distFromCenter, radius);
			if (wheelCursor) placeDot(canvas, wheelCursor, centerX + visualDist * Math.cos(rawAngle), centerY + visualDist * Math.sin(rawAngle));
			let angleDeg = rawAngle * (180 / Math.PI) + 90;
			if (angleDeg < 0) angleDeg += 360;
			const l = valSlider ? parseInt(valSlider.value, 10) : 50;
			const hex = hslToHexShared(angleDeg, (logicDist / radius) * 100, l);
			paintWheelDot(wheelCursor, hex);
			queueDragPrimary(hex);
		}

		function addToRecent(value) {
			if (!value || !isValidHex(value)) return;
			const hex = value.toUpperCase();
			const idx = recentColors.indexOf(hex);
			if (idx !== -1) recentColors.splice(idx, 1);
			recentColors.unshift(hex);
			if (recentColors.length > 7) recentColors.pop();
			try { localStorage.setItem('tata_recent_colors', JSON.stringify(recentColors)); } catch (e) { /* storage full or blocked */ }
			renderRecentColors();
		}

		function renderRecentColors() {
			const container = document.getElementById('recent_list');
			if (!container) return;
			container.textContent = '';
			recentColors.forEach(c => {
				const swatch = document.createElement('button');
				swatch.type = 'button';
				swatch.className = 'swatch-btn';
				swatch.style.setProperty('--swatch', c);
				swatch.title = c;
				swatch.setAttribute('aria-label', `Use ${c}`);
				swatch.addEventListener('click', () => updatePrimary(c));
				container.appendChild(swatch);
			});
		}

		function updatePrimary(hex, skipWheelUpdate, skipHistory, skipSliderUpdate) {
			primaryHex = hex;
			if (inputPrimary) inputPrimary.value = hex.toUpperCase();
			paintHexSurface(document.querySelector('.mini-hex-card'), hex);
			if (!skipWheelUpdate) updateCursorFromHex(hex);
			if (!skipHistory) addToRecent(hex);
			if (!skipSliderUpdate && valSlider) {
				const hsl = hexToHslShared(hex);
				valSlider.value = hsl.l;
				drawWheel(hsl.l);
			}
			renderHarmonyList();
		}

		function renderHarmonyList() {
			const base = hexToHslShared(primaryHex);
			listContainer.innerHTML = '';
			HARMONY_RULES.forEach(rule => {
				const colors = harmonyColors(rule, base);
				// Grid card: name, Place, Swatch, then the strip (css/colors.css).
				const card = document.createElement('div');
				card.className = 'harmony-card';
				const title = document.createElement('span');
				title.className = 'harmony-name';
				title.textContent = rule;
				title.title = rule;
				const strip = document.createElement('div');
				strip.className = 'harmony-strip';
				colors.forEach(c => {
					const box = document.createElement('span');
					box.style.setProperty('--swatch', c);
					box.title = c;
					strip.appendChild(box);
				});
				card.appendChild(title);
				card.appendChild(actionButton('place', 'Place', `Place ${rule} on the artboard`, () => placePalette(colors)));
				card.appendChild(actionButton('swatch', 'Swatch', `Add ${rule} to Swatches`, () => exportPalette(rule, colors)));
				card.appendChild(strip);
				listContainer.appendChild(card);
			});
		}

		renderRecentColors();
		drawWheel();
		updatePrimary(primaryHex);

		btnDashGen.addEventListener('click', () => {
			const r = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
			updatePrimary(`#${r.toUpperCase()}`);
		});

		if (btnPickPrimary) btnPickPrimary.addEventListener('click', () => pickFromIllustrator(primaryHex, updatePrimary));

		if (inputPrimary) {
			inputPrimary.addEventListener('change', e => {
				if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
					clearHexError(inputPrimary);
					updatePrimary(e.target.value);
				} else {
					showHexError(inputPrimary, true);
				}
			});
		}

		let dragHex = '';
		let dragPrimaryFrame = 0;

		function queueDragPrimary(hex) {
			dragHex = hex;
			if (dragPrimaryFrame) return;
			dragPrimaryFrame = requestFrame(() => {
				dragPrimaryFrame = 0;
				updatePrimary(dragHex, true, true);
			});
		}

		function flushDragPrimary() {
			if (!dragPrimaryFrame) return;
			if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(dragPrimaryFrame);
			clearTimeout(dragPrimaryFrame);
			dragPrimaryFrame = 0;
			updatePrimary(dragHex, true, true);
		}

		canvas.addEventListener('mousedown', e => { isDragging = true; handleCanvasInput(e); });
		window.addEventListener('mousemove', e => { if (isDragging) handleCanvasInput(e); });
		window.addEventListener('mouseup', () => {
			if (!isDragging) return;
			isDragging = false;
			flushDragPrimary();
			addToRecent(primaryHex);
		});

		if (valSlider) {
			valSlider.addEventListener('input', e => {
				if (!isValidHex(primaryHex)) {
					showHexError(inputPrimary, true);
					return;
				}
				const l = parseInt(e.target.value, 10);
				const currentHSL = hexToHslShared(primaryHex);
				const newHex = hslToHexShared(currentHSL.h, currentHSL.s, l);
				if (!isValidHex(newHex)) {
					showHexError(inputPrimary, true);
					return;
				}
				clearHexError(inputPrimary);
				updatePrimary(newHex, true, true, true);
				drawWheel(l);
			});
			valSlider.addEventListener('change', () => addToRecent(primaryHex));
		}

		wheelPainter = () => drawWheel(valSlider ? parseInt(valSlider.value, 10) : 50);
	}

	// Eyedropper: OS picker window, or Illustrator's Eyedropper tool (polled).
	function pickFromIllustrator(currentHex, onPick) {
		if (!TATA.host || typeof TATA.host.evalCode !== 'function') {
			toast('Open the panel in Illustrator to pick colors', 'info');
			return;
		}
		const rgbToHex = [
			"var hex = c.red.toString(16).toUpperCase(); if(hex.length<2) hex='0'+hex;",
			"var g = c.green.toString(16).toUpperCase(); if(g.length<2) g='0'+g; hex += g;",
			"var b = c.blue.toString(16).toUpperCase(); if(b.length<2) b='0'+b; hex += b;"
		].join(' ');

		if ((localStorage.getItem('tata_picker_mode') || 'os') === 'tool') {
			const toolScript = "try { if(app.selection.length > 0 && app.selection[0].filled && app.selection[0].fillColor) { " +
				"var c = app.selection[0].fillColor; if(c.typename === 'RGBColor') { " + rgbToHex + " '#' + hex; } " +
				"else { 'ERR:Please select an RGB object'; } } else { app.selectTool('Adobe Eyedropper Tool'); 'TOOL_ACTIVATED'; } " +
				"} catch(e) { 'ERR:' + e.message; }";
			TATA.host.evalCode(toolScript, res => {
				const text = String(res || '');
				if (text.indexOf('#') === 0) {
					onPick(text);
				} else if (text === 'TOOL_ACTIVATED') {
					// The user is picking now: watch the default fill colour for 15s.
					stopEyeDropper();
					let pollCount = 0;
					toast('Click a color with the Eyedropper in Illustrator');
					activePickerInterval = setInterval(() => {
						pollCount++;
						if (pollCount > 15) { stopEyeDropper(); return; }
						const checkScript = "try { var c = app.activeDocument.defaultFillColor; if(c.typename === 'RGBColor') { " +
							rgbToHex + " '#' + hex; } else { 'SKIP'; } } catch(e) { 'SKIP'; }";
						TATA.host.evalCode(checkScript, found => {
							if (found && String(found).indexOf('#') === 0 && found !== currentHex) {
								onPick(found);
								stopEyeDropper();
							}
						});
					}, 1000);
				} else if (text.indexOf('ERR') === 0) {
					toast(text.replace(/^ERR:\s*/, ''), 'error');
				}
			});
			return;
		}

		let currentInt = parseInt(String(currentHex || '#E61919').replace('#', ''), 16);
		if (isNaN(currentInt)) currentInt = 0xFF0000;
		const script = `try { var dec = $.colorPicker(${currentInt}); if(dec > -1) { var hex = dec.toString(16).toUpperCase(); while(hex.length < 6) hex = '0' + hex; '#' + hex; } else { 'CANCELED'; } } catch(e) { 'ERR: ' + e.message; }`;
		TATA.host.evalCode(script, res => {
			const text = String(res || '');
			if (text.indexOf('#') === 0) onPick(text);
			else if (text !== 'CANCELED') toast(`Color picker failed: ${text.replace(/^ERR:\s*/, '')}`, 'error');
		});
	}

	// ==========================================
	// Contrast Checker
	// ==========================================
	const DESIGNER_TIPS = [
		'Final_final_v2_REAL.psd',
		'Make the logo bigger.',
		"I want it to 'pop'!",
		'Can you send the open file? (Sends JPG)',
		'Payment is exposure.',
		'Font not found.',
		'Brief today, due yesterday.',
		"Can you make it more 'jazz'?",
		'It looks great, but change everything.',
		'Ctrl+S is my heartbeat.',
		'Layer 1 copy copy copy',
		'Lorem Ipsum Dolor Sit Amet',
		'Approved... but can we change the color?',
		'Do you have the vector file? (Sends Word Doc)',
		'Minimal but with more elements.',
		'Deadline is a suggestion.',
		'RGB or CMYK? Yes.',
		'Can you Photoshop this out?',
		'Just a quick 5 min change.',
		"I'll know it when I see it."
	];

	function updateRandomTip() {
		const el = document.getElementById('daily_tip_text');
		if (!el) return;
		el.textContent = `"${DESIGNER_TIPS[Math.floor(Math.random() * DESIGNER_TIPS.length)]}"`;
	}

	function swapContrastColors() {
		const bgEl = document.getElementById('cc_bg_hex');
		const textEl = document.getElementById('cc_text_hex');
		if (!bgEl || !textEl) return;
		const temp = bgEl.value;
		bgEl.value = textEl.value;
		textEl.value = temp;
		updateContrastUI(contrastWheels);
	}

	function bindContrastSide(input, slider, canvas, cursor) {
		if (slider && isValidHex(input.value)) {
			slider.value = String(Math.round(hexToHslShared(input.value).l));
		}
		let wheel;
		wheel = mountColorWheel(canvas, cursor, {
			getHex: () => input.value,
			lightness: () => {
				if (slider && isValidHex(input.value)) return parseInt(slider.value, 10);
				return hexToHslShared(isValidHex(input.value) ? input.value : '#E61919').l;
			},
			setHex: hex => {
				if (!isValidHex(hex)) {
					showHexError(input, true);
					return;
				}
				input.value = hex;
				clearHexError(input);
				updateContrastUI(wheel);
			}
		});
		input._colorWheel = wheel;
		contrastWheels.push(wheel);
		extraWheels.push(wheel);
		if (slider) {
			slider.addEventListener('input', () => {
				if (!isValidHex(input.value)) {
					showHexError(input, true);
					return;
				}
				const hsl = hexToHslShared(input.value);
				const next = hslToHexShared(hsl.h, hsl.s, parseInt(slider.value, 10));
				if (!isValidHex(next)) {
					showHexError(input, true);
					return;
				}
				input.value = next;
				clearHexError(input);
				updateContrastUI(wheel);
			});
		}
		return wheel;
	}

	let contrastBound = false;

	function initContrastChecker() {
		const bgInput = document.getElementById('cc_bg_hex');
		const textInput = document.getElementById('cc_text_hex');
		if (!bgInput || !textInput || contrastBound) return;
		contrastBound = true;

		bindContrastSide(textInput, document.getElementById('cc_text_light'),
			document.getElementById('cc_text_wheel'), document.getElementById('cc_text_cursor'));
		bindContrastSide(bgInput, document.getElementById('cc_bg_light'),
			document.getElementById('cc_bg_wheel'), document.getElementById('cc_bg_cursor'));

		const tip = document.getElementById('tip_card');
		if (tip) tip.addEventListener('click', updateRandomTip);
		const swap = document.getElementById('btn_contrast_swap');
		if (swap) swap.addEventListener('click', swapContrastColors);

		updateRandomTip();
		updateContrastUI(contrastWheels);

		[bgInput, textInput].forEach(inp => {
			const onEdit = () => updateContrastUI(inp._colorWheel);
			inp.addEventListener('input', onEdit);
			inp.addEventListener('change', onEdit);
		});
	}

	// WCAG ratio → one overall level and AA/AAA per text size.
	function overallLevel(ratio) {
		if (ratio < 3.0) return { level: 'fail', label: 'Very poor', stars: '★☆☆☆☆' };
		if (ratio < 4.5) return { level: 'fail', label: 'Poor', stars: '★★☆☆☆' };
		if (ratio < 7.0) return { level: 'warn', label: 'Good', stars: '★★★☆☆' };
		if (ratio < 12.0) return { level: 'pass', label: 'Very good', stars: '★★★★☆' };
		return { level: 'pass', label: 'Excellent', stars: '★★★★★' };
	}

	function boxLevel(ratio, limitAA, limitAAA) {
		if (ratio < limitAA) return { level: 'fail', stars: '★☆☆', text: 'fails' };
		if (ratio < limitAAA) return { level: 'aa', stars: '★★☆', text: 'passes AA' };
		return { level: 'aaa', stars: '★★★', text: 'passes AAA' };
	}

	function paintBox(boxId, starsId, labelText, state) {
		const box = document.getElementById(boxId);
		const stars = document.getElementById(starsId);
		if (box) {
			box.setAttribute('data-level', state.level);
			box.title = `${labelText} ${state.text}`;
		}
		if (stars) stars.textContent = state.stars;
	}

	function updateContrastUI(changedWheels) {
		const bgEl = document.getElementById('cc_bg_hex');
		const textEl = document.getElementById('cc_text_hex');
		if (!bgEl || !textEl) return;

		const bgHex = bgEl.value;
		const textHex = textEl.value;
		const bgOk = isValidHex(bgHex);
		const textOk = isValidHex(textHex);
		if (bgOk) clearHexError(bgEl);
		else showHexError(bgEl, false);
		if (textOk) clearHexError(textEl);
		else showHexError(textEl, false);
		if (!bgOk || !textOk) return;

		// Live preview: the tip card shows the pair as text on background.
		const tipCard = document.getElementById('tip_card');
		if (tipCard) {
			tipCard.style.setProperty('--tip-bg', bgHex);
			tipCard.style.setProperty('--tip-fg', textHex);
			tipCard.classList.toggle('is-same', bgHex.toLowerCase() === textHex.toLowerCase());
		}

		const ratio = getContrastRatio(bgHex, textHex);
		const overall = overallLevel(ratio);
		const card = document.getElementById('score_card');
		const scoreVal = document.getElementById('cc_score_val');
		const scoreText = document.getElementById('cc_score_text');
		const scoreStars = document.getElementById('cc_score_stars');
		if (card) card.setAttribute('data-level', overall.level);
		if (scoreVal) scoreVal.textContent = ratio.toFixed(2);
		if (scoreText) scoreText.textContent = overall.label;
		if (scoreStars) scoreStars.textContent = overall.stars;

		paintBox('cc_small_box', 'cc_small_stars', 'Small text', boxLevel(ratio, 4.5, 7.0));
		paintBox('cc_large_box', 'cc_large_stars', 'Large text', boxLevel(ratio, 3.0, 4.5));

		paintHexSurface(bgEl.parentElement, bgHex);
		paintHexSurface(textEl.parentElement, textHex);

		['cc_text', 'cc_bg'].forEach(id => {
			const field = document.getElementById(id + '_hex');
			const slider = document.getElementById(id + '_light');
			if (field && slider && isValidHex(field.value)) {
				slider.value = String(Math.round(hexToHslShared(field.value).l));
			}
		});
		scheduleWheelRefresh(changedWheels || contrastWheels);
	}

	// ==========================================
	// Custom Colors (2–8 slots)
	// ==========================================
	const CUSTOM_COLOR_KEY = 'tata_custom_colors';
	const DEFAULT_CUSTOM_COLORS = ['#e61919', '#ff8709', '#ffe500', '#b8f55f', '#9d95ff', '#ff9ecd'];
	const EXTRA_CUSTOM_COLORS = ['#00bae2', '#3a5bd9']; // used past the default six
	const MIN_CUSTOM_COLORS = 2;
	const MAX_CUSTOM_COLORS = 8;

	function fallbackCustomColor(index) {
		const all = DEFAULT_CUSTOM_COLORS.concat(EXTRA_CUSTOM_COLORS);
		return all[index % all.length];
	}

	function clampCustomCount(count) {
		const n = Math.round(Number(count));
		if (!isFinite(n)) return DEFAULT_CUSTOM_COLORS.length;
		return Math.max(MIN_CUSTOM_COLORS, Math.min(MAX_CUSTOM_COLORS, n));
	}

	function normalizeCustomColor(value) {
		const text = String(value == null ? '' : value).trim();
		if (/^#[0-9A-F]{6}$/i.test(text)) return text.toLowerCase();
		const short = /^#([0-9A-F])([0-9A-F])([0-9A-F])$/i.exec(text);
		if (!short) return '';
		return ('#' + short[1] + short[1] + short[2] + short[2] + short[3] + short[3]).toLowerCase();
	}

	// The saved list's length is the slot count (2–8); invalid entries fall back.
	function loadCustomColors() {
		let stored = null;
		try {
			stored = JSON.parse(localStorage.getItem(CUSTOM_COLOR_KEY) || 'null');
		} catch (e) {
			stored = null;
		}
		const count = Array.isArray(stored) && stored.length ? clampCustomCount(stored.length) : DEFAULT_CUSTOM_COLORS.length;
		const colors = [];
		for (let i = 0; i < count; i++) {
			const next = Array.isArray(stored) ? normalizeCustomColor(stored[i]) : '';
			colors.push(next || fallbackCustomColor(i));
		}
		return colors;
	}

	// Saves `colors`; its length sets the slot count. Invalid entries keep the
	// colour already in that slot.
	function saveCustomColors(colors) {
		const current = loadCustomColors();
		const list = Array.isArray(colors) && colors.length ? colors : current;
		const count = clampCustomCount(list.length);
		const next = [];
		for (let i = 0; i < count; i++) {
			next.push(normalizeCustomColor(list[i]) || current[i] || fallbackCustomColor(i));
		}
		try {
			localStorage.setItem(CUSTOM_COLOR_KEY, JSON.stringify(next));
		} catch (e) { /* storage can be unavailable in the panel */ }
		return next;
	}

	function initCustomColors() {
		const customColors = loadCustomColors();
		const container = document.getElementById('custom_colors_container');
		if (!container) return;

		let activeSlot = 0;
		const slotName = document.getElementById('custom_slot_name');
		const slotHex = document.getElementById('custom_slot_hex');
		const slotLight = document.getElementById('custom_slot_light');
		const countValue = document.getElementById('custom_count_value');
		const btnAdd = document.getElementById('btn_custom_add');
		const btnRemove = document.getElementById('btn_custom_remove');
		let slots = [];
		let customWheel = null;

		// One slot element per colour; rebuilt when the count changes.
		function buildSlots() {
			while (container.children.length > customColors.length) container.removeChild(container.lastElementChild);
			while (container.children.length < customColors.length) {
				const slot = document.createElement('button');
				slot.type = 'button';
				slot.className = 'custom-color-slot';
				container.appendChild(slot);
			}
			slots = Array.prototype.slice.call(container.children);
			slots.forEach((slot, index) => {
				slot.classList.add('custom-color-slot');
				slot.dataset.index = String(index);
				if (slot.tagName !== 'BUTTON') {
					slot.setAttribute('role', 'button');
					slot.setAttribute('tabindex', '0');
				}
				slot.setAttribute('aria-label', 'สีที่ ' + (index + 1));
				slot.onclick = () => selectSlot(index);
				slot.onkeydown = e => {
					if (slot.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) {
						e.preventDefault();
						selectSlot(index);
					}
				};
			});
			if (countValue) countValue.textContent = String(customColors.length);
			if (btnAdd) btnAdd.disabled = customColors.length >= MAX_CUSTOM_COLORS;
			if (btnRemove) btnRemove.disabled = customColors.length <= MIN_CUSTOM_COLORS;
		}

		function paintSlots() {
			slots.forEach((slot, index) => {
				// The slot is the colour: this is data, not styling.
				slot.style.backgroundColor = customColors[index];
				slot.title = customColors[index];
				slot.classList.toggle('is-selected', index === activeSlot);
				slot.setAttribute('aria-pressed', index === activeSlot ? 'true' : 'false');
			});
			if (slotName) slotName.textContent = `Slot ${activeSlot + 1}`;
			if (slotHex) slotHex.value = customColors[activeSlot];
		}

		function selectSlot(index) {
			activeSlot = index;
			if (slotLight) slotLight.value = String(Math.round(hexToHslShared(customColors[index]).l));
			paintSlots();
			if (customWheel) customWheel.refresh();
		}

		if (slotLight) slotLight.value = String(Math.round(hexToHslShared(customColors[0]).l));
		customWheel = mountColorWheel(
			document.getElementById('custom_wheel_canvas'),
			document.getElementById('custom_wheel_cursor'),
			{
				getHex: () => customColors[activeSlot],
				lightness: () => (slotLight ? parseInt(slotLight.value, 10) : hexToHslShared(customColors[activeSlot]).l),
				setHex: hex => {
					const safe = normalizeCustomColor(hex);
					if (!safe) return;
					customColors[activeSlot] = safe;
					saveCustomColors(customColors);
					paintSlots();
				}
			}
		);
		extraWheels.push(customWheel);
		buildSlots();

		function setCount(count) {
			const target = clampCustomCount(count);
			if (target === customColors.length) return;
			while (customColors.length < target) customColors.push(fallbackCustomColor(customColors.length));
			customColors.length = target;
			saveCustomColors(customColors);
			buildSlots();
			selectSlot(Math.min(activeSlot, customColors.length - 1));
		}
		if (btnAdd) btnAdd.onclick = () => setCount(customColors.length + 1);
		if (btnRemove) btnRemove.onclick = () => setCount(customColors.length - 1);

		if (slotHex) {
			slotHex.addEventListener('change', () => {
				const safe = normalizeCustomColor(slotHex.value);
				if (!safe) {
					showHexError(slotHex, true);
					return;
				}
				clearHexError(slotHex);
				customColors[activeSlot] = safe;
				saveCustomColors(customColors);
				if (slotLight) slotLight.value = String(Math.round(hexToHslShared(safe).l));
				paintSlots();
				customWheel.refresh();
			});
		}
		if (slotLight) {
			slotLight.addEventListener('input', () => {
				if (!isValidHex(customColors[activeSlot])) {
					showHexError(slotHex, true);
					return;
				}
				const hsl = hexToHslShared(customColors[activeSlot]);
				const safe = normalizeCustomColor(hslToHexShared(hsl.h, hsl.s, parseInt(slotLight.value, 10)));
				if (!safe) return;
				customColors[activeSlot] = safe;
				saveCustomColors(customColors);
				paintSlots();
				customWheel.refresh();
			});
		}

		const btnPlace = document.getElementById('btn_custom_place');
		if (btnPlace) btnPlace.onclick = () => placePalette(customColors);
		const btnSwatch = document.getElementById('btn_custom_swatch');
		if (btnSwatch) btnSwatch.onclick = () => exportPalette('Custom Colors', customColors);

		TATA.colorTools.setPalette = function (colors) {
			const next = saveCustomColors(colors);
			customColors.length = 0;
			next.forEach(color => customColors.push(color));
			buildSlots();
			selectSlot(0);
		};

		paintSlots();
	}

	// ==========================================
	// Illustrator scripts: swatches and placed palettes
	// ==========================================
	function reportResult(res, failure) {
		if (res === 'Success') return;
		const text = String(res || '').trim();
		toast(text ? `${failure}: ${text}` : failure, 'error');
	}

	function exportPalette(name, colors) {
		const paletteName = JSON.stringify(String(name || 'Palette') + ' Theme');
		const script = `try { var doc = app.activeDocument; var grp = doc.swatchGroups.add(); grp.name = ${paletteName}; var cols = ${JSON.stringify(colors)}; for(var i=0; i<cols.length; i++){ var hex = cols[i].replace('#',''); var r = parseInt(hex.substring(0,2), 16); var g = parseInt(hex.substring(2,4), 16); var b = parseInt(hex.substring(4,6), 16); var c = new RGBColor(); c.red=r; c.green=g; c.blue=b; var s = doc.swatches.add(); s.color = c; s.name = 'Hex '+hex; grp.addSwatch(s); } 'Success'; } catch(e){e.toString();}`;
		TATA.host.evalCode(script, res => {
			if (res === 'Success') toast('Added to Swatches', 'success');
			else reportResult(res, 'Could not add swatches');
		});
	}

	// Row 1 solid squares, row 2 pairwise gradients, row 3 one gradient of all,
	// 100pt above the active artboard, grouped as "TATA Palette".
	function placePalette(colors) {
		const script = [
			'try {',
			'var doc = app.activeDocument;',
			'var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];',
			'var rect = ab.artboardRect;',
			'var x = rect[0]; var top = rect[1] + 100; var size = 80; var gap = 10;',
			`var cols = ${JSON.stringify(colors)};`,
			"function getRGB(hex) { hex = hex.replace('#',''); var c = new RGBColor();",
			'  c.red = parseInt(hex.substring(0,2), 16); c.green = parseInt(hex.substring(2,4), 16); c.blue = parseInt(hex.substring(4,6), 16); return c; }',
			"function createGrad(name, list) { var g = doc.gradients.add(); g.name = name + '_' + Math.round(Math.random()*10000); g.type = GradientType.LINEAR;",
			'  var stops = g.gradientStops; while (stops.length < list.length) { stops.add(); } while (stops.length > list.length) { stops[stops.length-1].remove(); }',
			'  for (var i = 0; i < list.length; i++) { stops[i].rampPoint = (i / (list.length - 1)) * 100; stops[i].color = getRGB(list[i]); stops[i].midPoint = 50; }',
			'  var gc = new GradientColor(); gc.gradient = g; return gc; }',
			"var group = doc.groupItems.add(); group.name = 'TATA Palette';",
			'for (var i = 0; i < cols.length; i++) { var box = group.pathItems.rectangle(top, x + i * (size + gap), size, size); box.fillColor = getRGB(cols[i]); box.stroked = false; }',
			'var row2 = top - (size + gap);',
			"if (cols.length > 1) { for (var j = 0; j < cols.length - 1; j++) { var pair = group.pathItems.rectangle(row2, x + j * (size + gap), size, size); pair.fillColor = createGrad('Pair_' + j, [cols[j], cols[j+1]]); pair.stroked = false; } }",
			'var row3 = row2 - (size + gap);',
			"if (cols.length > 1) { var all = group.pathItems.rectangle(row3, x, cols.length * size + (cols.length - 1) * gap, size); all.fillColor = createGrad('Global', cols); all.stroked = false; }",
			"'Success';",
			"} catch(e) { e.message + ' line:' + e.line; }"
		].join('\n');
		TATA.host.evalCode(script, res => {
			if (res === 'Success') toast('Palette placed', 'success');
			else reportResult(res, 'Could not place the palette');
		});
	}

	// ==========================================
	// Tab lifecycle
	// ==========================================
	function refreshWheel() {
		if (typeof wheelPainter === 'function') wheelPainter();
		scheduleWheelRefresh(extraWheels);
	}

	function stopEyeDropper() {
		if (activePickerInterval) {
			clearInterval(activePickerInterval);
			activePickerInterval = null;
		}
	}

	function init() {
		setupCreative();
		initContrastChecker();
		initCustomColors();
	}

	TATA.colorTools = {
		init,
		swapContrastColors,
		initContrastChecker,
		setupCreative,
		exportPalette,
		placePalette,
		loadCustomColors,
		saveCustomColors,
		normalizeCustomColor,
		hslToHex: hslToHexShared,
		hexToHsl: hexToHslShared,
		isValidHex,
		contrastRatio: getContrastRatio,
		stopEyeDropper,
		refreshWheel
	};

	window.TATA = TATA;
})();
