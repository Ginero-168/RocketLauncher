/**
 * Rocket Launcher - Shared State Module
 * Contains: Global state object, getters/setters for controlled access
 */
(() => {
    'use strict';

    // Ensure namespace exists
    window.TATA = window.TATA || {};

    // ==========================================
    // Standard Color Palette
    // ==========================================
    const STANDARD_COLORS = {
        red: '#e61919',
        orange: '#ff8709',
        yellow: '#ffe500',
        lime: '#b8f55f',
        purple: '#9d95ff',
        pink: '#ff9ecd',
        green: '#0ae448',
        cyan: '#00bae2',
        black: '#171717',
        slate: '#687174',
        gray: '#ded9cc',
        paper: '#f5f2e9'
    };

    TATA.resolveColor = (color) => {
        if (!color || color === '') return '';
        if (STANDARD_COLORS[color]) return STANDARD_COLORS[color];
        if (/^#[0-9A-F]{6}$/i.test(color)) return color.toLowerCase();
        return '';
    };

    TATA.PRESET_COLORS = [
        '#e61919',
        '#ff8709',
        '#ffe500',
        '#b8f55f',
        '#9d95ff',
        '#ff9ecd',
        '#0ae448',
        '#00bae2'
    ];

    // One palette for every place a button colour is chosen
    // (context menu, editor colour dialog). '' means no colour.
    TATA.BUTTON_COLORS = ['', '#e61919', '#ff8709', '#ffe500', '#b8f55f', '#9d95ff', '#ff9ecd',
        '#0ae448', '#00bae2', '#171717', '#687174', '#ded9cc', '#f5f2e9'];

    // ==========================================
    // Tinted glass for user colours (grid buttons, hotkeys)
    // ==========================================
    // CSS cannot hue-shift a colour in CEP's Chromium, so the second gradient
    // stop and the readable ink are worked out here and handed to CSS as
    // custom properties (--tint-rgb, --tint-rgb-2, --tint-ink, --tint-shadow).
    const GROUND = [10, 10, 10];
    const TINT_ALPHA = 0.68;

    function parseRgb(value) {
        const text = String(value || '').trim();
        let match = /^#([0-9a-f]{6})$/i.exec(text);
        if (match) return [0, 2, 4].map(i => parseInt(match[1].slice(i, i + 2), 16));
        match = /^#([0-9a-f]{3})$/i.exec(text);
        if (match) return [0, 1, 2].map(i => parseInt(match[1][i] + match[1][i], 16));
        match = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(text);
        if (match) return [+match[1], +match[2], +match[3]].map(v => Math.max(0, Math.min(255, v)));
        return null;
    }

    function toHsl(rgb) {
        const r = rgb[0] / 255;
        const g = rgb[1] / 255;
        const b = rgb[2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;
        if (d) {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
        }
        return [h, s, l];
    }

    function fromHsl(h, s, l) {
        const a = s * Math.min(l, 1 - l);
        const f = n => {
            const k = (n + h / 30) % 12;
            return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
        };
        return [f(0), f(8), f(4)];
    }

    // The same colour moved ~24° round the wheel and lifted a little:
    // orange → yellow, red → orange, blue → violet. Greys only lift.
    function neighbourHue(rgb) {
        const hsl = toHsl(rgb);
        if (hsl[1] < 0.08) return fromHsl(hsl[0], hsl[1], Math.min(1, hsl[2] + 0.12));
        return fromHsl((hsl[0] + 24) % 360, Math.min(1, hsl[1] * 1.05), Math.min(0.92, hsl[2] + 0.06));
    }

    function luminance(rgb) {
        const channel = v => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
    }

    function contrast(a, b) {
        const la = luminance(a);
        const lb = luminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    // White ink unless the glass is too light for it (yellow, lime, paper).
    function tintFor(color) {
        const rgb = parseRgb(TATA.resolveColor(color) || color);
        if (!rgb) return null;
        const rgb2 = neighbourHue(rgb);
        const seen = rgb.map((v, i) => TINT_ALPHA * (v + rgb2[i]) / 2 + (1 - TINT_ALPHA) * GROUND[i]);
        const light = contrast(seen, [255, 255, 255]) < 3 && contrast(seen, GROUND) > contrast(seen, [255, 255, 255]);
        return {
            rgb: rgb.join(', '),
            rgb2: rgb2.join(', '),
            ink: light ? '#0a0a0a' : '#ffffff',
            shadow: light ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.45)'
        };
    }

    function applyTint(el, color) {
        if (!el || !el.style) return false;
        const tint = color ? tintFor(color) : null;
        el.classList.toggle('has-tint', !!tint);
        if (!tint) {
            ['--tint-rgb', '--tint-rgb-2', '--tint-ink', '--tint-shadow'].forEach(name => el.style.removeProperty(name));
            return false;
        }
        el.style.setProperty('--tint-rgb', tint.rgb);
        el.style.setProperty('--tint-rgb-2', tint.rgb2);
        el.style.setProperty('--tint-ink', tint.ink);
        el.style.setProperty('--tint-shadow', tint.shadow);
        return true;
    }

    TATA.tintFor = tintFor;
    TATA.applyTint = applyTint;

    // ==========================================
    // Shared State Object
    // ==========================================
    TATA.state = {
        // CSInterface (set in main.js init)
        csInterface: TATA.csInterface || null,
        extensionPath: TATA.extensionPath || '',

        // User Scripts
        userScripts: TATA.userScripts || {},

        // Context Menu
        currentContextScriptId: null
    };

    // ==========================================
    // User Scripts Getters/Setters
    // ==========================================
    TATA.getUserScripts = () => TATA.state.userScripts;
    TATA.setUserScripts = (scripts) => { TATA.state.userScripts = scripts; };

    // ==========================================
    // Context Menu State
    // ==========================================
    TATA.setCurrentContextId = (id) => {
        TATA.state.currentContextScriptId = id;
        // Also set on window for backward compatibility
        window.currentContextScriptId = id;
    };

    // ==========================================
    // CSInterface Accessor
    // ==========================================
    TATA.getCSInterface = () => TATA.state.csInterface;
    TATA.setCSInterface = (csInterface) => { TATA.state.csInterface = csInterface; };

    // ==========================================
    // Extension Path
    // ==========================================
    TATA.getExtensionPath = () => TATA.state.extensionPath;
    TATA.setExtensionPath = (path) => { TATA.state.extensionPath = path; };

})();
