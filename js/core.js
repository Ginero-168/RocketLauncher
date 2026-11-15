/**
 * Rocket Launcher - Core Module
 * Contains: CSInterface, globals, utilities, storage versioning, size-capped fetch
 */
(() => {
    'use strict';

    // ==========================================
    // Global Namespace
    // ==========================================
    window.TATA = window.TATA || {};

    // ==========================================
    // Global Error Handler
    // ==========================================
    window.onerror = (msg, url, line, col, error) => {
        console.error('[TATA Error]', { msg, url, line, col, error });
        if (typeof TATA.showToast === 'function') {
            TATA.showToast(`Error: ${msg}`, 'error');
        }
        return true;
    };

    // ==========================================
    // Debounce Utility
    // ==========================================
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // ==========================================
    // Safe JSON Parse Utility
    // ==========================================
    function safeParse(jsonString, fallback) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('[TATA] JSON Parse Error:', e);
            return fallback;
        }
    }

    // ==========================================
    // CSInterface & Globals
    // ==========================================
    const csInterface = new CSInterface();
    let extensionPath = '';
    try {
        extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
    } catch (e) { /* fallback below */ }

    // Fallback: derive from URL
    if (!extensionPath) {
        let loc = window.location.href;
        if (loc.startsWith('file://')) loc = loc.substring(7);
        const ls = loc.lastIndexOf('/');
        if (ls !== -1) loc = loc.substring(0, ls);
        extensionPath = decodeURIComponent(loc);
    }
    const userScripts = {};

    // ==========================================
    // Storage Versioning
    // ==========================================
    const STORAGE_VERSION = 3;
    function checkStorageVersion() {
        const currentVersion = parseInt(localStorage.getItem('tata_storage_version') || '0', 10);
        if (currentVersion < STORAGE_VERSION) {
            console.log('[TATA] Migrating to V7 Layout (4-tab restructure)...');
            TATA.backupBeforeSave('tata_v2_layout');

            // Migrate: merge old tabs into single 'tab_button'
            const oldLayout = localStorage.getItem('tata_v2_layout');
            if (oldLayout) {
                try {
                    const parsed = JSON.parse(oldLayout);
                    const merged = [];
                    ['swift', 'creative', 'organize', 'tools'].forEach((tab) => {
                        if (parsed[tab] && Array.isArray(parsed[tab])) {
                            parsed[tab].forEach((item) => {
                                if (!item || (item.id && String(item.id).startsWith('btn_'))) return;
                                if (item.type === 'subpanel') return;
                                merged.push(item);
                            });
                        }
                    });
                    // Also carry over if already migrated
                    if (parsed.tab_button && Array.isArray(parsed.tab_button)) {
                        parsed.tab_button.forEach((item) => merged.push(item));
                    }
                    localStorage.setItem('tata_v2_layout', JSON.stringify({ tab_button: merged }));
                } catch (e) {
                    console.error('[TATA] Migration error:', e);
                    localStorage.removeItem('tata_v2_layout');
                }
            }

            localStorage.removeItem('tata_tab_names');
            localStorage.setItem('tata_storage_version', STORAGE_VERSION.toString());
            setTimeout(() => {
                if (typeof TATA.showToast === 'function') TATA.showToast('Panel updated!', 'success');
            }, 1000);
        }
    }

    // ==========================================
    // Backup Utility
    // ==========================================
    function backupBeforeSave(key) {
        const current = localStorage.getItem(key);
        if (current) {
            localStorage.setItem(`${key}_backup`, current);
        }
    }

    // ==========================================
    // localStorage Cache for Hot Keys
    // ==========================================
    const storageCache = new Map();
    function getStored(key, fallback) {
        if (storageCache.has(key)) return storageCache.get(key);
        const value = localStorage.getItem(key);
        if (value === null) return fallback;
        storageCache.set(key, value);
        return value;
    }
    function setStored(key, value) {
        if (value === undefined || value === null) {
            storageCache.delete(key);
            localStorage.removeItem(key);
        } else {
            storageCache.set(key, value);
            localStorage.setItem(key, value);
        }
    }
    function clearStored(key) {
        storageCache.delete(key);
        localStorage.removeItem(key);
    }

    // ==========================================
    // Fetch with Timeout (AbortController)
    // ==========================================
    function fetchWithTimeout(url, options, timeoutMs) {
        const controller = new AbortController();
        const timeout = timeoutMs || 30000;
        const timer = setTimeout(() => controller.abort(), timeout);
        const request = Object.assign({}, options || {});
        const maxBytes = request.maxBytes > 0 ? request.maxBytes : 2 * 1024 * 1024;
        delete request.maxBytes;
        request.signal = controller.signal;

        function finish() {
            clearTimeout(timer);
        }

        return fetch(url, request).then(response => readCappedBody(response, maxBytes, controller).then(text => {
            finish();
            return {
                ok: response.ok,
                status: response.status,
                headers: response.headers,
                text: () => Promise.resolve(text),
                json: () => Promise.resolve(text ? JSON.parse(text) : null)
            };
        }, error => {
            finish();
            throw error;
        }), error => {
            finish();
            throw error;
        });
    }

    function decodeBytes(bytes) {
        if (typeof TextDecoder === 'function') return new TextDecoder().decode(bytes);
        let text = '';
        for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
        return text;
    }

    function contentLength(response) {
        if (!response.headers || typeof response.headers.get !== 'function') return 0;
        const size = parseInt(response.headers.get('content-length'), 10);
        return size > 0 ? size : 0;
    }

    function oversized(controller, maxBytes) {
        try { if (controller) controller.abort(); } catch (e) { /* already aborted */ }
        throw new Error(`Response exceeds ${maxBytes} bytes`);
    }

    function asBytes(chunk) {
        if (chunk instanceof Uint8Array) return chunk;
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(chunk)) {
            return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        }
        if (typeof chunk === 'string') {
            const bytes = new Uint8Array(chunk.length);
            for (let i = 0; i < chunk.length; i++) bytes[i] = chunk.charCodeAt(i) & 255;
            return bytes;
        }
        return new Uint8Array(chunk || 0);
    }

    function mergeChunks(chunks, received) {
        const merged = new Uint8Array(received);
        let offset = 0;
        chunks.forEach(chunk => {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
        });
        return decodeBytes(merged);
    }

    function readReader(reader, maxBytes, controller) {
        const chunks = [];
        let received = 0;
        function pump() {
            return reader.read().then(step => {
                if (step.done) return mergeChunks(chunks, received);
                const bytes = asBytes(step.value);
                received += bytes.byteLength;
                if (received > maxBytes) oversized(controller, maxBytes);
                chunks.push(bytes);
                return pump();
            });
        }
        return pump();
    }

    function readAsyncIterable(body, maxBytes, controller) {
        const iterator = body[Symbol.asyncIterator]();
        const chunks = [];
        let received = 0;
        function pump() {
            return iterator.next().then(step => {
                if (step.done) return mergeChunks(chunks, received);
                const bytes = asBytes(step.value);
                received += bytes.byteLength;
                if (received > maxBytes) {
                    if (typeof iterator.return === 'function') {
                        try { iterator.return(); } catch (e) { /* stop the source */ }
                    }
                    oversized(controller, maxBytes);
                }
                chunks.push(bytes);
                return pump();
            });
        }
        return pump();
    }

    function readNodeStream(body, maxBytes, controller) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            let received = 0;
            let settled = false;
            function fail() {
                if (settled) return;
                settled = true;
                try { body.destroy(); } catch (e) { /* source may already be closed */ }
                try { if (controller) controller.abort(); } catch (e2) { /* already aborted */ }
                reject(new Error(`Response exceeds ${maxBytes} bytes`));
            }
            body.on('data', chunk => {
                if (settled) return;
                const bytes = asBytes(chunk);
                received += bytes.byteLength;
                if (received > maxBytes) {
                    fail();
                    return;
                }
                chunks.push(bytes);
            });
            body.on('end', () => {
                if (settled) return;
                settled = true;
                resolve(mergeChunks(chunks, received));
            });
            body.on('error', err => {
                if (settled) return;
                settled = true;
                reject(err);
            });
        });
    }

    function oversizedError(controller, maxBytes) {
        try { if (controller) controller.abort(); } catch (e) { /* already aborted */ }
        return new Error(`Response exceeds ${maxBytes} bytes`);
    }

    function readCappedBody(response, maxBytes, controller) {
        if (contentLength(response) > maxBytes) {
            return Promise.reject(oversizedError(controller, maxBytes));
        }
        const body = response.body;
        if (body && typeof body.getReader === 'function') {
            return readReader(body.getReader(), maxBytes, controller);
        }
        if (body && typeof body.on === 'function') {
            return readNodeStream(body, maxBytes, controller);
        }
        if (body && typeof body[Symbol.asyncIterator] === 'function') {
            return readAsyncIterable(body, maxBytes, controller);
        }
        if (body && typeof body.byteLength === 'number') {
            const bytes = asBytes(body);
            if (bytes.byteLength > maxBytes) return Promise.reject(oversizedError(controller, maxBytes));
            return Promise.resolve(decodeBytes(bytes));
        }
        if (typeof response.blob === 'function' || typeof response.text === 'function') {
            try { if (controller) controller.abort(); } catch (e) { /* already aborted */ }
            return Promise.reject(new Error('Response body cannot be size-capped'));
        }
        return Promise.resolve('');
    }

    // ==========================================
    // Export to Global Namespace
    // ==========================================
    TATA.debounce = debounce;
    TATA.safeParse = safeParse;
    TATA.csInterface = csInterface;
    TATA.extensionPath = extensionPath;
    TATA.userScripts = userScripts;
    TATA.checkStorageVersion = checkStorageVersion;
    TATA.backupBeforeSave = backupBeforeSave;
    TATA.fetchWithTimeout = fetchWithTimeout;
    TATA.getStored = getStored;
    TATA.setStored = setStored;
    TATA.clearStored = clearStored;

})();
