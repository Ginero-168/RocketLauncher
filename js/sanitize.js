/**
 * Allowlist SVG sanitizer and JSX run confirmation.
 * Untrusted icons and imported SVG must pass through here before touching the DOM.
 * AI-generated, auto-fixed and Marketplace ExtendScript must pass through
 * requestJsxConfirmation before TATA.host.evalCode.
 */
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var XLINK_NS = 'http://www.w3.org/1999/xlink';
    var MAX_SVG_CHARS = 2000000;
    var MAX_SVG_DEPTH = 48;
    var MAX_SVG_ELEMENTS = 2000;

    var ALLOWED_ELEMENTS = {
        svg: 1, g: 1, path: 1, circle: 1, ellipse: 1, rect: 1, line: 1,
        polyline: 1, polygon: 1, text: 1, tspan: 1, textpath: 1,
        defs: 1, symbol: 1, use: 1, clippath: 1, mask: 1, marker: 1, pattern: 1,
        lineargradient: 1, radialgradient: 1, stop: 1, title: 1, desc: 1,
        filter: 1, fegaussianblur: 1, feoffset: 1, feblend: 1, fecolormatrix: 1,
        femerge: 1, femergenode: 1, feflood: 1, fecomposite: 1, femorphology: 1,
        fecomponenttransfer: 1, fefuncr: 1, fefuncg: 1, fefuncb: 1, fefunca: 1
    };

    var DROP_ENTIRELY = {
        script: 1, style: 1, foreignobject: 1, iframe: 1, image: 1, canvas: 1,
        audio: 1, video: 1, object: 1, embed: 1, link: 1, handler: 1,
        animate: 1, set: 1, feimage: 1, mpath: 1
    };

    var TEXT_PARENTS = { text: 1, tspan: 1, textpath: 1, title: 1, desc: 1 };

    var ELEMENT_TAG = {
        svg: 'svg', g: 'g', path: 'path', circle: 'circle', ellipse: 'ellipse',
        rect: 'rect', line: 'line', polyline: 'polyline', polygon: 'polygon',
        text: 'text', tspan: 'tspan', textpath: 'textPath', defs: 'defs',
        symbol: 'symbol', use: 'use', clippath: 'clipPath', mask: 'mask',
        marker: 'marker', pattern: 'pattern', lineargradient: 'linearGradient',
        radialgradient: 'radialGradient', stop: 'stop', title: 'title', desc: 'desc',
        filter: 'filter', fegaussianblur: 'feGaussianBlur', feoffset: 'feOffset',
        feblend: 'feBlend', fecolormatrix: 'feColorMatrix', femerge: 'feMerge',
        femergenode: 'feMergeNode', feflood: 'feFlood', fecomposite: 'feComposite',
        femorphology: 'feMorphology', fecomponenttransfer: 'feComponentTransfer',
        fefuncr: 'feFuncR', fefuncg: 'feFuncG', fefuncb: 'feFuncB', fefunca: 'feFuncA'
    };

    var PAINT_ATTRS = { fill: 1, stroke: 1, color: 1, 'stop-color': 1, 'flood-color': 1 };
    var LOCAL_URL_ATTRS = { 'clip-path': 1, mask: 1, filter: 1 };
    var ALLOWED_ATTRS = {
        id: 'id', class: 'class', transform: 'transform', opacity: 'opacity',
        fill: 'fill', 'fill-opacity': 'fill-opacity', 'fill-rule': 'fill-rule',
        stroke: 'stroke', 'stroke-width': 'stroke-width', 'stroke-linecap': 'stroke-linecap',
        'stroke-linejoin': 'stroke-linejoin', 'stroke-miterlimit': 'stroke-miterlimit',
        'stroke-dasharray': 'stroke-dasharray', 'stroke-dashoffset': 'stroke-dashoffset',
        'stroke-opacity': 'stroke-opacity', 'clip-path': 'clip-path', 'clip-rule': 'clip-rule',
        mask: 'mask', display: 'display', visibility: 'visibility', color: 'color',
        overflow: 'overflow', 'pointer-events': 'pointer-events', style: 'style',
        'stop-color': 'stop-color', 'stop-opacity': 'stop-opacity', offset: 'offset',
        cx: 'cx', cy: 'cy', r: 'r', rx: 'rx', ry: 'ry', x: 'x', y: 'y',
        x1: 'x1', y1: 'y1', x2: 'x2', y2: 'y2', width: 'width', height: 'height',
        d: 'd', points: 'points', dx: 'dx', dy: 'dy', 'text-anchor': 'text-anchor',
        'font-family': 'font-family', 'font-size': 'font-size', 'font-weight': 'font-weight',
        'font-style': 'font-style', viewbox: 'viewBox', preserveaspectratio: 'preserveAspectRatio',
        gradientunits: 'gradientUnits', gradienttransform: 'gradientTransform',
        spreadmethod: 'spreadMethod', fx: 'fx', fy: 'fy', patternunits: 'patternUnits',
        patterncontentunits: 'patternContentUnits', clippathunits: 'clipPathUnits',
        maskunits: 'maskUnits', maskcontentunits: 'maskContentUnits',
        markerwidth: 'markerWidth', markerheight: 'markerHeight', refx: 'refX', refy: 'refY',
        orient: 'orient', markerunits: 'markerUnits', xmlns: 'xmlns', 'xmlns:xlink': 'xmlns:xlink',
        href: 'href', 'xlink:href': 'href', role: 'role', 'aria-hidden': 'aria-hidden',
        in: 'in', in2: 'in2', result: 'result', mode: 'mode', stddeviation: 'stdDeviation',
        values: 'values', type: 'type', operator: 'operator', k1: 'k1', k2: 'k2', k3: 'k3', k4: 'k4',
        radius: 'radius', filterunits: 'filterUnits', primitiveunits: 'primitiveUnits',
        'flood-color': 'flood-color', 'flood-opacity': 'flood-opacity'
    };

    var SOURCE_LABELS = {
        ai: 'AI-generated JSX',
        'auto-fix': 'Auto-fixed JSX',
        market: 'Marketplace script'
    };

    function isTrackedSource(source) {
        return source === 'ai' || source === 'auto-fix' || source === 'market';
    }

    // The one list of sources whose code must be confirmed before each run.
    function trackedSource(source) {
        return isTrackedSource(source) ? source : '';
    }

    function elementKey(node) {
        return String(node && (node.localName || node.nodeName) || '').toLowerCase();
    }

    function isSafeLiteral(value, maxLen) {
        var text = String(value == null ? '' : value);
        if (!text || text.length > (maxLen || 100000)) return false;
        if (/[<>`]|javascript\s*:|expression\s*\(|url\s*\(/i.test(text)) return false;
        return true;
    }

    function sanitizeFragmentRef(value) {
        var match = String(value || '').trim().match(/^#([\w:.-]+)$/);
        return match ? '#' + match[1] : null;
    }

    function sanitizeLocalUrl(value) {
        var match = String(value || '').trim().match(/^url\(\s*#([\w:.-]+)\s*\)$/i);
        return match ? 'url(#' + match[1] + ')' : null;
    }

    function sanitizePaint(value) {
        var text = String(value || '').trim();
        if (/^(none|currentcolor|inherit|transparent)$/i.test(text)) return text;
        if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)) return text;
        if (/^(?:rgb|rgba|hsl|hsla)\(\s*[\d.%\s,/]+\)$/i.test(text)) return text;
        return sanitizeLocalUrl(text);
    }

    function decodeCssEscapes(value) {
        return String(value || '').replace(/\\(?:([0-9a-fA-F]{1,6})[ \t\n\f]?|(\r\n|[\n\r\f])|([^\n\r\f]))/g, function (_, hex, brk, char) {
            if (hex) return String.fromCharCode(parseInt(hex, 16));
            if (brk) return '';
            return char;
        });
    }

    function sanitizeStyleValue(prop, raw) {
        var value = String(raw || '').trim();
        if (!value || value.length > 200 || /\\/.test(value)) return null;
        if (/expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding|@import|\/\*|\*\/|<|>|url\s*\(\s*(?!#)/i.test(value)) return null;
        if (prop === 'fill' || prop === 'stroke' || prop === 'color' || prop === 'stop-color') return sanitizePaint(value);
        if (prop === 'stroke-width' || prop === 'font-size') return /^[0-9.]+(?:px|em|%|pt)?$/.test(value) ? value : null;
        if (prop === 'opacity' || prop === 'fill-opacity' || prop === 'stroke-opacity' || prop === 'stop-opacity') {
            return /^(?:0|1|0?\.\d+|[0-9.]+%)$/.test(value) ? value : null;
        }
        if (prop === 'font-family') return /^[A-Za-z0-9 ,"'-]{1,80}$/.test(value) ? value : null;
        if (prop === 'font-weight') return /^(?:normal|bold|bolder|lighter|[1-9]00)$/.test(value) ? value : null;
        if (prop === 'display') return /^(?:inline|block|none|inherit)$/.test(value) ? value : null;
        if (prop === 'visibility') return /^(?:visible|hidden|collapse|inherit)$/.test(value) ? value : null;
        return null;
    }

    function sanitizeStyle(value) {
        var decoded = decodeCssEscapes(value);
        var kept = [];
        decoded.split(';').forEach(function (part) {
            var idx = part.indexOf(':');
            if (idx < 1) return;
            var prop = part.slice(0, idx).trim().toLowerCase();
            var clean = sanitizeStyleValue(prop, part.slice(idx + 1));
            if (clean) kept.push(prop + ':' + clean);
        });
        return kept.length ? kept.join(';') : null;
    }

    function sanitizeAttr(name, value, namespaceURI) {
        var attr = String(name || '').toLowerCase();
        if (!attr || attr.indexOf('on') === 0 || !ALLOWED_ATTRS[attr]) return null;
        var canonical = ALLOWED_ATTRS[attr];
        if (namespaceURI === XLINK_NS || attr === 'href' || attr === 'xlink:href') {
            var ref = sanitizeFragmentRef(value);
            return ref ? { name: 'href', value: ref } : null;
        }
        if (attr === 'xmlns') {
            return value === SVG_NS ? { name: 'xmlns', value: SVG_NS } : null;
        }
        if (attr === 'xmlns:xlink') {
            return value === XLINK_NS ? { name: 'xmlns:xlink', value: XLINK_NS } : null;
        }
        if (attr === 'style') {
            var style = sanitizeStyle(value);
            return style ? { name: canonical, value: style } : null;
        }
        if (PAINT_ATTRS[attr]) {
            var paint = sanitizePaint(value);
            return paint ? { name: canonical, value: paint } : null;
        }
        if (LOCAL_URL_ATTRS[attr]) {
            var localUrl = sanitizeLocalUrl(value);
            return localUrl ? { name: canonical, value: localUrl } : null;
        }
        if (attr === 'class') {
            return /^[A-Za-z_][\w -]{0,80}$/.test(String(value || '')) ? { name: canonical, value: String(value) } : null;
        }
        if (attr === 'id') {
            return /^[\w:.-]{1,160}$/.test(String(value || '')) ? { name: canonical, value: String(value) } : null;
        }
        if (attr === 'aria-hidden') {
            return /^(true|false)$/i.test(String(value || '')) ? { name: canonical, value: String(value).toLowerCase() } : null;
        }
        if (attr === 'role') {
            return /^(img|presentation|none)$/i.test(String(value || '')) ? { name: canonical, value: String(value).toLowerCase() } : null;
        }
        if (!isSafeLiteral(value)) return null;
        return { name: canonical, value: String(value) };
    }

    function copySafeAttrs(source, target) {
        var attrs = source.attributes;
        if (!attrs) return;
        for (var a = 0; a < attrs.length; a++) {
            var attr = attrs[a];
            var safe = sanitizeAttr(attr.localName || attr.name, attr.value, attr.namespaceURI);
            if (!safe || safe.name === 'xmlns' || safe.name === 'xmlns:xlink') continue;
            target.setAttribute(safe.name, safe.value);
        }
    }

    function appendCleanChildren(source, target) {
        var stack = [];
        var count = 1;
        function enqueue(parentSource, parentTarget, depth) {
            var children = parentSource.childNodes;
            for (var i = children.length - 1; i >= 0; i--) {
                stack.push({ node: children[i], parent: parentTarget, depth: depth });
            }
        }
        enqueue(source, target, 1);
        while (stack.length) {
            if (count >= MAX_SVG_ELEMENTS) break;
            var frame = stack.pop();
            var child = frame.node;
            if (!child || frame.depth > MAX_SVG_DEPTH) continue;
            if (child.nodeType === 3) {
                if (TEXT_PARENTS[elementKey(frame.parent)] && child.nodeValue) {
                    frame.parent.appendChild(document.createTextNode(child.nodeValue));
                }
                continue;
            }
            if (child.nodeType !== 1) continue;
            var key = elementKey(child);
            if (DROP_ENTIRELY[key]) continue;
            if (!ALLOWED_ELEMENTS[key]) {
                enqueue(child, frame.parent, frame.depth + 1);
                continue;
            }
            var clean = document.createElementNS(SVG_NS, ELEMENT_TAG[key]);
            copySafeAttrs(child, clean);
            frame.parent.appendChild(clean);
            count += 1;
            enqueue(child, clean, frame.depth + 1);
        }
    }

    function sanitizeSvg(markup) {
        var raw = String(markup == null ? '' : markup).replace(/^\uFEFF/, '').trim();
        if (!raw || raw.charAt(0) !== '<' || raw.length > MAX_SVG_CHARS) return '';
        if (/<!DOCTYPE|<!ENTITY/i.test(raw)) return '';

        var parsed;
        try {
            parsed = new DOMParser().parseFromString(raw, 'image/svg+xml');
        } catch (e) {
            return '';
        }
        if (!parsed || !parsed.documentElement) return '';
        if (elementKey(parsed.documentElement) === 'parsererror' || parsed.querySelector('parsererror')) return '';
        if (elementKey(parsed.documentElement) !== 'svg') return '';

        var root = document.createElementNS(SVG_NS, 'svg');
        var rootAttrs = parsed.documentElement.attributes;
        for (var i = 0; i < rootAttrs.length; i++) {
            var attr = rootAttrs[i];
            var attrName = String(attr.localName || attr.name || '').toLowerCase();
            if (attrName === 'xmlns' || attrName === 'xmlns:xlink') continue;
            var safe = sanitizeAttr(attr.localName || attr.name, attr.value, attr.namespaceURI);
            if (!safe || safe.name === 'xmlns' || safe.name === 'xmlns:xlink') continue;
            root.setAttribute(safe.name, safe.value);
        }
        appendCleanChildren(parsed.documentElement, root);
        return new XMLSerializer().serializeToString(root);
    }

    function plainIconText(value) {
        var text = String(value == null ? '' : value).trim();
        if (!text || text.charAt(0) === '<') return '';
        return Array.from(text).slice(0, 8).join('');
    }

    function mountSanitizedIcon(container, markup, fallbackText) {
        if (!container) return false;
        while (container.firstChild) container.removeChild(container.firstChild);

        var safe = sanitizeSvg(markup);
        if (safe) {
            var parsed = new DOMParser().parseFromString(safe, 'image/svg+xml');
            var svg = parsed && parsed.documentElement;
            if (svg && elementKey(svg) === 'svg' && !parsed.querySelector('parsererror')) {
                container.appendChild(document.importNode(svg, true));
                return true;
            }
        }

        var plain = plainIconText(markup) || plainIconText(fallbackText);
        if (!plain) return false;
        container.textContent = plain;
        return true;
    }

    function shouldConfirmJsxRun(source) {
        return isTrackedSource(source);
    }

    function previewCode(code) {
        return String(code == null ? '' : code);
    }

    function buildJsxConfirmDetails(options) {
        var opts = options || {};
        var source = isTrackedSource(opts.source) ? opts.source : 'user';
        var code = String(opts.code == null ? '' : opts.code);
        return {
            title: 'Run this script in Illustrator?',
            source: source,
            sourceLabel: SOURCE_LABELS[source] || 'Editor',
            code: code,
            preview: previewCode(code)
        };
    }

    function openJsxConfirmDialog(details) {
        var modal = document.getElementById('jsx_confirm_modal');
        var sourceEl = document.getElementById('jsx_confirm_source');
        var codeEl = document.getElementById('jsx_confirm_code');
        var okBtn = document.getElementById('jsx_confirm_ok');
        var cancelBtn = document.getElementById('jsx_confirm_cancel');
        // Without the dialog nothing can be reviewed, so nothing runs.
        if (!modal || !sourceEl || !codeEl || !okBtn || !cancelBtn) return Promise.resolve(false);

        sourceEl.textContent = 'Source: ' + details.sourceLabel;
        codeEl.textContent = details.preview;
        var openDialog = window.TATA && window.TATA.openDialog;

        return new Promise(function (resolve) {
            var close = null;
            var previous = document.activeElement;
            function finish(value) {
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                document.removeEventListener('keydown', onKey);
                if (close) {
                    close();
                } else {
                    modal.classList.remove('active');
                    if (previous && previous.isConnected !== false && typeof previous.focus === 'function') {
                        try { previous.focus(); } catch (e) { }
                    }
                }
                resolve(value === true);
            }
            function onOk() { finish(true); }
            function onCancel() { finish(false); }
            function onKey(event) {
                if (event.key === 'Escape') finish(false);
            }
            okBtn.addEventListener('click', onOk);
            cancelBtn.addEventListener('click', onCancel);
            // Cancel has focus, so Enter never runs code by accident.
            if (typeof openDialog === 'function') {
                close = openDialog(modal, { onCancel: onCancel, focus: cancelBtn, closeOnBackdrop: false });
            } else {
                modal.classList.add('active');
                document.addEventListener('keydown', onKey);
                try { cancelBtn.focus(); } catch (e) { }
            }
        });
    }

    function requestJsxConfirmation(options) {
        var details = buildJsxConfirmDetails(options);
        if (!shouldConfirmJsxRun(details.source)) return Promise.resolve(true);
        if (options && typeof options.ask === 'function') {
            return Promise.resolve(options.ask(details)).then(function (value) {
                return value === true;
            });
        }
        return openJsxConfirmDialog(details);
    }

    function runConfirmedJsx(code, source) {
        var confirmFn = (window.TATA && window.TATA.requestJsxConfirmation) || requestJsxConfirmation;
        return Promise.resolve(confirmFn({ code: code, source: source })).then(function (ok) {
            if (ok !== true) return { ran: false, res: null };
            return new Promise(function (resolve) {
                var host = window.TATA && window.TATA.host;
                if (!host || typeof host.evalCode !== 'function') {
                    resolve({ ran: false, res: null });
                    return;
                }
                host.evalCode(code, function (res) {
                    resolve({ ran: true, res: res });
                });
            });
        });
    }

    window.TATA = window.TATA || {};
    window.TATA.sanitizeSvg = sanitizeSvg;
    window.TATA.plainIconText = plainIconText;
    window.TATA.mountSanitizedIcon = mountSanitizedIcon;
    window.TATA.shouldConfirmJsxRun = shouldConfirmJsxRun;
    window.TATA.trackedSource = trackedSource;
    window.TATA.buildJsxConfirmDetails = buildJsxConfirmDetails;
    window.TATA.requestJsxConfirmation = requestJsxConfirmation;
    window.TATA.runConfirmedJsx = runConfirmedJsx;
})();
