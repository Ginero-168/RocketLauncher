/**
 * Publish a panel button, a custom color set, or a graphic style.
 * The website does not accept these uploads. A signed-in Google
 * account is the credential, so people never paste the setup token.
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    const DEFAULT_URL = 'https://rl.kirita.me';
    const SCRIPT_LIMIT = 2 * 1024 * 1024;
    const STYLE_LIMIT = 40 * 1024 * 1024;
    const PREVIEW_LIMIT = 2 * 1024 * 1024;

    function nodeRequire(name) {
        try {
            if (typeof window.require === 'function') return window.require(name);
        } catch (e) { /* CEP require throws when the module is missing */ }
        try {
            if (typeof require === 'function') return require(name);
        } catch (e2) { /* a browser preview has no Node */ }
        return null;
    }

    function toast(message, type) {
        if (TATA.showToast) TATA.showToast(message, type || 'info');
    }

    function endpoint(base, apiPath) {
        const clean = String(base || '').trim().replace(/\/+$/, '');
        const match = /^(https?):\/\/([^\/?#]+)(\/[^?#]*)?$/i.exec(clean);
        if (!match || match[2].indexOf('[') !== -1) return null;
        const hostPort = match[2];
        const colon = hostPort.lastIndexOf(':');
        let hostname = hostPort;
        let port = '';
        if (colon > 0 && /^\d+$/.test(hostPort.slice(colon + 1))) {
            hostname = hostPort.slice(0, colon);
            port = hostPort.slice(colon + 1);
        }
        if (!hostname) return null;
        return {
            protocol: match[1].toLowerCase(),
            hostname: hostname,
            port: port,
            path: (match[3] || '') + (apiPath || '/api/upload.php')
        };
    }

    function marketSession() {
        try {
            const saved = JSON.parse(localStorage.getItem('tata_market_session') || 'null');
            if (!saved || !/^[a-f0-9]{48}$/.test(saved.token || '')) return null;
            return {
                token: saved.token,
                name: String(saved.name || 'Member').slice(0, 80),
                picture: safePicture(saved.picture)
            };
        } catch (e) {
            return null;
        }
    }

    function marketSettings() {
        const session = marketSession();
        return {
            url: DEFAULT_URL,
            token: session ? session.token : '',
            name: session ? session.name : '',
            picture: session ? session.picture : '',
            target: endpoint(DEFAULT_URL)
        };
    }

    function safePicture(url) {
        let parsed;
        try { parsed = new URL(String(url || '')); } catch (e) { return ''; }
        if (parsed.protocol !== 'https:') return '';
        const host = parsed.hostname.toLowerCase();
        if (host !== 'googleusercontent.com' && host.slice(-22) !== '.googleusercontent.com') return '';
        return parsed.href;
    }

    function saveSession(session) {
        localStorage.setItem('tata_market_session', JSON.stringify({
            token: session.token,
            name: String(session.name || 'Member').slice(0, 80),
            picture: safePicture(session.picture)
        }));
    }

    function allowedVerifyUrl(base, url) {
        const site = endpoint(base, '/');
        const page = endpoint(String(url || '').split('?')[0], '/');
        if (!site || !page) return false;
        if (site.protocol !== page.protocol || site.hostname !== page.hostname || String(site.port) !== String(page.port)) return false;
        return page.path.indexOf('/auth/panel.php') !== -1;
    }

    function colorToHex(value) {
        const text = String(value || '').trim();
        const full = /^#([0-9A-F]{6})$/i.exec(text);
        if (full) return '#' + full[1].toUpperCase();
        const short = /^#([0-9A-F])([0-9A-F])([0-9A-F])$/i.exec(text);
        if (short) {
            return ('#' + short[1] + short[1] + short[2] + short[2] + short[3] + short[3]).toUpperCase();
        }
        const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(text);
        if (!rgb) return '';
        function byte(part) {
            const number = Math.max(0, Math.min(255, parseInt(part, 10) || 0));
            const hex = number.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }
        return ('#' + byte(rgb[1]) + byte(rgb[2]) + byte(rgb[3])).toUpperCase();
    }

    function paletteFromValues(values) {
        const colors = [];
        const list = values || [];
        for (let i = 0; i < list.length && colors.length < 8; i++) {
            const hex = colorToHex(list[i]);
            if (hex) colors.push(hex);
        }
        return colors;
    }

    function livePalette() {
        const slots = document.querySelectorAll('.custom-color-slot');
        const values = [];
        for (let i = 0; i < slots.length; i++) values.push(slots[i].style.backgroundColor || slots[i].title);
        const colors = paletteFromValues(values);
        if (colors.length) return colors;
        try {
            return paletteFromValues(JSON.parse(localStorage.getItem('tata_custom_colors') || '[]'));
        } catch (e) {
            return [];
        }
    }

    function fieldPart(boundary, name, value) {
        return Buffer.from(
            '--' + boundary + '\r\n' +
            'Content-Disposition: form-data; name="' + name + '"\r\n\r\n' +
            String(value) + '\r\n'
        );
    }

    function filePart(boundary, name, filename, buffer) {
        return [
            Buffer.from(
                '--' + boundary + '\r\n' +
                'Content-Disposition: form-data; name="' + name + '"; filename="' + filename + '"\r\n' +
                'Content-Type: application/octet-stream\r\n\r\n'
            ),
            buffer,
            Buffer.from('\r\n')
        ];
    }

    function buildBody(fields, files) {
        const boundary = '----TATA' + Date.now().toString(16) + Math.random().toString(16).slice(2);
        const chunks = [];
        Object.keys(fields || {}).forEach(key => {
            if (fields[key] == null || fields[key] === '') return;
            chunks.push(fieldPart(boundary, key, fields[key]));
        });
        (files || []).forEach(file => {
            filePart(boundary, file.field, file.filename, file.buffer).forEach(part => chunks.push(part));
        });
        chunks.push(Buffer.from('--' + boundary + '--\r\n'));
        return { boundary: boundary, buffer: Buffer.concat(chunks) };
    }

    function extensionRoot() {
        if (TATA.extensionPath) return TATA.extensionPath;
        const href = window.location && window.location.href ? window.location.href : '';
        const path = href.replace(/^file:\/\//, '').replace(/^file:/, '');
        const slash = path.lastIndexOf('/');
        return slash === -1 ? '' : decodeURIComponent(path.slice(0, slash));
    }

    function scriptFile(item, deps) {
        const fs = (deps && deps.fs) || nodeRequire('fs');
        const path = (deps && deps.path) || nodeRequire('path');
        const root = (deps && deps.root) || extensionRoot();
        const script = item && item.script ? String(item.script) : '';
        const code = item && item.code ? String(item.code) : '';
        if (script && fs && path) {
            const filePath = path.isAbsolute(script) ? script : (root ? path.join(root, 'jsx', script) : '');
            if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                return { filename: 'button.jsx', buffer: fs.readFileSync(filePath) };
            }
        }
        const text = code || (script && script.slice(-4).toLowerCase() !== '.jsx' ? script : '');
        if (!String(text).trim()) return null;
        return { filename: 'button.jsx', buffer: Buffer.from(text, 'utf8') };
    }

    function readBounded(filePath, limit) {
        const fs = nodeRequire('fs');
        if (!fs || !filePath || !fs.existsSync(filePath)) return null;
        const stat = fs.statSync(filePath);
        if (!stat.isFile() || stat.size < 1 || stat.size > limit) return false;
        return fs.readFileSync(filePath);
    }

    function explain(error) {
        const text = String(error && error.message ? error.message : error || '');
        const map = {
            'Invalid upload token': 'โทเคน Marketplace ไม่ถูกต้อง',
            'Panel session expired': 'การเชื่อมต่อหมดอายุ เชื่อมต่อด้วย Google อีกครั้ง',
            'Could not start a connection': 'เชื่อมต่อ Marketplace ไม่ได้',
            'Marketplace is not set up': 'Marketplace ยังไม่ได้ตั้งค่า',
            'หมดเวลาเชื่อมต่อ': 'หมดเวลาเชื่อมต่อ ลองใหม่',
            'Name is required': 'ต้องใส่ชื่อ',
            'At least one hex color is required': 'ต้องมีรหัสสีอย่างน้อย 1 สี',
            'File is empty or too large': 'ไฟล์ว่างหรือใหญ่เกินกำหนด',
            'Change something before sharing a remix': 'ยังไม่ได้แก้อะไรจากต้นฉบับ แก้ก่อนแล้วค่อยแชร์เป็น Remix',
            'Expected a .jsx file': 'ต้องเป็นไฟล์ .jsx',
            'Expected a .ai file': 'ต้องเป็นไฟล์ .ai',
            'Preview must be a PNG or JPEG under 2 MB': 'รูปตัวอย่างต้องเป็น PNG หรือ JPEG ไม่เกิน 2 MB'
        };
        if (text.indexOf('HTTP 404') !== -1) return 'Marketplace ยังไม่พร้อมเชื่อมต่อ ต้องอัปเดตเว็บก่อน';
        return map[text] || text || 'อัปโหลดไม่สำเร็จ';
    }

    function absoluteUrl(target) {
        return target.protocol + '://' + target.hostname + (target.port ? ':' + target.port : '') + target.path;
    }

    function transfer(target, method, body, headers) {
        const https = nodeRequire('https');
        const http = nodeRequire('http');
        const lib = target.protocol === 'http' ? http : https;
        if (!lib) return Promise.reject(new Error('เปิดพาเนลใน Illustrator เพื่อเชื่อม Marketplace'));
        return new Promise((resolve, reject) => {
            const req = lib.request({
                protocol: target.protocol + ':',
                hostname: target.hostname,
                port: target.port || undefined,
                path: target.path,
                method: method,
                headers: headers || {}
            }, res => {
                const parts = [];
                res.on('data', chunk => parts.push(chunk));
                res.on('end', () => {
                    resolve({ status: res.statusCode, buffer: Buffer.concat(parts) });
                });
            });
            req.on('error', reject);
            if (body) req.write(body);
            req.end();
        });
    }

    function readJson(res) {
        try { return JSON.parse(textFrom(res)); } catch (e) { return null; }
    }

    function postFields(target, fields, files) {
        const body = buildBody(fields, files || []);
        if (typeof TATA.marketRequest === 'function') {
            return TATA.marketRequest(target, body);
        }
        return transfer(target, 'POST', body.buffer, {
            'Content-Type': 'multipart/form-data; boundary=' + body.boundary,
            'Content-Length': body.buffer.length
        }).then(res => {
            const data = readJson(res);
            if (res.status >= 200 && res.status < 300 && data && data.ok) return data;
            throw new Error(data && data.error ? data.error : ('HTTP ' + res.status));
        });
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function openBrowser(url) {
        try {
            const cs = TATA.getCSInterface ? TATA.getCSInterface() : null;
            if (cs && typeof cs.openURLInDefaultBrowser === 'function') {
                cs.openURLInDefaultBrowser(url);
                return true;
            }
        } catch (e) { /* a browser preview has no CEP */ }
        if (typeof window.open === 'function') return !!window.open(url, '_blank', 'noopener');
        return false;
    }

    function pollGrant(device, interval, expiresIn) {
        const deadline = Date.now() + Math.max(30, Math.min(600, Number(expiresIn) || 600)) * 1000;
        const wait = Math.max(1, Math.min(5, Number(interval) || 2)) * 1000;
        function once() {
            if (Date.now() > deadline) return Promise.reject(new Error('หมดเวลาเชื่อมต่อ'));
            const target = endpoint(marketSettings().url, '/api/panel.php?device=' + device);
            if (!target) return Promise.reject(new Error('ที่อยู่ Marketplace ไม่ถูกต้อง'));
            return transfer(target, 'GET').then(res => {
                const data = readJson(res);
                if (!data || data.ok === false) throw new Error(data && data.error ? data.error : 'เชื่อมต่อไม่ได้');
                if (data.status === 'approved' && /^[a-f0-9]{48}$/.test(data.token || '')) {
                    return {
                        token: data.token,
                        name: String(data.name || 'Member').slice(0, 80),
                        picture: safePicture(data.picture)
                    };
                }
                if (data.status === 'expired') throw new Error('หมดเวลาเชื่อมต่อ');
                return delay(wait).then(once);
            });
        }
        return once();
    }

    let connecting = null;

    function paintAccount() {
        const settings = marketSettings();
        const status = document.getElementById('market_account');
        const button = document.getElementById('btn_market_connect');
        if (status) status.textContent = settings.token ? ('เชื่อมต่อแล้ว · ' + settings.name) : 'ยังไม่ได้เชื่อมต่อ';
        if (button) {
            button.textContent = settings.token ? 'ออกจากบัญชี' : 'เชื่อมต่อด้วย Google';
            button.disabled = !!connecting;
        }
        paintProfile();
    }

    function paintProfile() {
        const settings = marketSettings();
        const photo = document.getElementById('profile_photo');
        const fallback = document.getElementById('profile_fallback');
        const name = document.getElementById('profile_name');
        const account = document.getElementById('profile_account');
        const button = document.getElementById('btn_profile');
        if (name) name.textContent = settings.token ? settings.name : 'ยังไม่ได้เชื่อมต่อ';
        if (account) account.textContent = settings.token ? 'ออกจากบัญชี' : 'เชื่อมต่อด้วย Google';
        if (button) button.title = settings.token ? settings.name : 'บัญชี';
        if (!photo || !fallback) return;
        if (!settings.picture) {
            photo.hidden = true;
            photo.removeAttribute('src');
            fallback.hidden = false;
            return;
        }
        photo.onload = function () {
            photo.hidden = false;
            fallback.hidden = true;
        };
        photo.onerror = function () {
            photo.hidden = true;
            fallback.hidden = false;
        };
        if (photo.getAttribute('src') !== settings.picture) photo.setAttribute('src', settings.picture);
    }

    function setProfileMenu(open) {
        const menu = document.getElementById('profile_menu');
        const button = document.getElementById('btn_profile');
        if (!menu || !button) return;
        menu.hidden = !open;
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function refreshProfile() {
        const settings = marketSettings();
        paintProfile();
        if (!settings.token) return;
        const target = endpoint(settings.url, '/api/panel.php');
        if (!target) return;
        const body = 'action=profile&panel_token=' + encodeURIComponent(settings.token);
        const done = data => {
            if (!data || !data.ok || !data.name) return;
            const session = marketSession();
            if (!session) return;
            saveSession({ token: session.token, name: data.name, picture: data.picture });
            paintAccount();
        };
        if (typeof fetch === 'function') {
            fetch(absoluteUrl(target), {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            }).then(res => res.json()).then(done).catch(function () {});
            return;
        }
        transfer(target, 'POST', body, {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': body.length
        }).then(res => done(readJson(res))).catch(function () {});
    }

    function connectGoogle() {
        const settings = marketSettings();
        if (settings.token) return Promise.resolve(true);
        if (!settings.target) {
            toast('ที่อยู่ Marketplace ไม่ถูกต้อง', 'error');
            return Promise.resolve(false);
        }
        if (connecting) return connecting;
        const target = endpoint(settings.url, '/api/panel.php');
        if (!target) {
            toast('ที่อยู่ Marketplace ไม่ถูกต้อง', 'error');
            return Promise.resolve(false);
        }
        if (typeof Buffer === 'undefined') {
            toast('เปิดพาเนลใน Illustrator เพื่อเชื่อม Marketplace', 'error');
            return Promise.resolve(false);
        }
        toast('กำลังเปิด Google เพื่อเชื่อมต่อ', 'info');
        connecting = postFields(target, { action: 'start' }).then(data => {
            if (!data.device_code || !/^[a-f0-9]{32}$/.test(data.device_code) || !allowedVerifyUrl(settings.url, data.verify_url)) {
                throw new Error('เชื่อมต่อไม่ได้');
            }
            if (!openBrowser(data.verify_url)) toast('เปิดเบราว์เซอร์ไม่สำเร็จ', 'error');
            return pollGrant(data.device_code, data.interval, data.expires_in);
        }).then(session => {
            saveSession(session);
            localStorage.removeItem('tata_market_token');
            toast('เชื่อมต่อในชื่อ ' + session.name + ' แล้ว', 'success');
            return true;
        }).catch(error => {
            toast(explain(error), 'error');
            return false;
        }).then(result => {
            connecting = null;
            paintAccount();
            return result;
        });
        paintAccount();
        return connecting;
    }

    function withAccount(done) {
        const settings = marketSettings();
        if (!settings.target) {
            toast('ที่อยู่ Marketplace ไม่ถูกต้อง', 'error');
            return;
        }
        if (settings.token) {
            done();
            return;
        }
        connectGoogle().then(ok => {
            if (ok) done();
        });
    }

    let sending = false;

    function publish(fields, files) {
        const settings = marketSettings();
        if (!settings.token) {
            return connectGoogle().then(ok => (ok ? publish(fields, files) : false));
        }
        if (!settings.target) {
            toast('ที่อยู่ Marketplace ไม่ถูกต้อง', 'error');
            return Promise.resolve(false);
        }
        if (typeof Buffer === 'undefined') {
            toast('เปิดพาเนลใน Illustrator เพื่อเชื่อม Marketplace', 'error');
            return Promise.resolve(false);
        }
        if (sending) return Promise.resolve(false);
        sending = true;
        toast('กำลังอัปโหลด...', 'info');
        return postFields(settings.target, Object.assign({ panel_token: settings.token }, fields), files).then(() => {
            toast(fields.parent ? 'ขึ้น Marketplace แล้ว พร้อมเครดิตของต้นฉบับ' : 'ขึ้น Marketplace แล้ว', 'success');
            return true;
        }).catch(error => {
            const reason = String(error && error.message ? error.message : error);
            // The original has expired: share it on its own instead of failing.
            if (fields.parent && reason === ORIGINAL_GONE) {
                sending = false;
                const plain = Object.assign({}, fields);
                delete plain.parent;
                return publish(plain, files);
            }
            if (String(error && error.message ? error.message : error) === 'Panel session expired') {
                localStorage.removeItem('tata_market_session');
                paintAccount();
            }
            toast(explain(error), 'error');
            return false;
        }).then(result => {
            sending = false;
            return result;
        });
    }

    // Which Marketplace item each installed script came from, so that sharing
    // an edited copy is recorded as a remix with the original's credit.
    const ORIGIN_KEY = 'tata_market_origin';
    const ORIGINAL_GONE = 'The original is no longer in the Marketplace';

    function origins() {
        try {
            const data = JSON.parse(localStorage.getItem(ORIGIN_KEY) || '{}');
            return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
        } catch (e) {
            return {};
        }
    }

    function rememberOrigin(scriptId, marketId) {
        if (!scriptId || !/^[a-f0-9]{16}$/.test(marketId || '')) return;
        const map = origins();
        map[scriptId] = marketId;
        const keys = Object.keys(map);
        // Old entries go first; 300 is far more than a panel holds.
        while (keys.length > 300) delete map[keys.shift()];
        try { localStorage.setItem(ORIGIN_KEY, JSON.stringify(map)); } catch (e) { /* storage full: lineage is optional */ }
    }

    function originOf(scriptId) {
        const id = origins()[scriptId];
        return /^[a-f0-9]{16}$/.test(id || '') ? id : '';
    }

    function uploadScriptItem(item) {
        withAccount(() => {
            if (!item) {
                toast('ไม่พบปุ่มนี้', 'error');
                return;
            }
            const file = scriptFile(item);
            if (!file) {
                toast('ปุ่มนี้ไม่มีสคริปต์ให้อัปโหลด', 'error');
                return;
            }
            if (file.buffer.length > SCRIPT_LIMIT) {
                toast('สคริปต์ใหญ่เกิน 2 MB', 'error');
                return;
            }
            const name = String(item.label || item.name || 'Script').trim() || 'Script';
            const fields = { type: 'script', name: name };
            const parent = originOf(item.id);
            if (parent) fields.parent = parent;
            publish(fields, [{ field: 'file', filename: 'button.jsx', buffer: file.buffer }]);
        });
    }

    let pickHandler = null;
    let exitPickMode = null;

    function stopPicking() {
        if (exitPickMode) {
            const exit = exitPickMode;
            exitPickMode = null;
            exit();
        }
        document.body.classList.remove('market-mode');
        if (!pickHandler) return;
        document.querySelectorAll('.grid-btn').forEach(button => {
            button.removeEventListener('click', pickHandler, true);
        });
        pickHandler = null;
    }

    // Upload: wait for a click on a script button (Escape or Cancel stops).
    function uploadPickedScript() {
        if (document.body.classList.contains('market-mode')) {
            stopPicking();
            return;
        }
        withAccount(() => {
            if (TATA.activateTab) TATA.activateTab('tab_button');
            pickHandler = function (event) {
                event.preventDefault();
                event.stopPropagation();
                const item = TATA.getItemDataFromElement ? TATA.getItemDataFromElement(this) : null;
                stopPicking();
                uploadScriptItem(item);
            };
            document.querySelectorAll('.grid-btn').forEach(button => {
                button.addEventListener('click', pickHandler, true);
            });
            if (typeof TATA.enterPickMode === 'function') {
                exitPickMode = TATA.enterPickMode({
                    bodyClass: 'market-mode',
                    message: 'คลิกปุ่มที่ต้องการอัปโหลด',
                    cancelLabel: 'ยกเลิก',
                    onCancel: stopPicking
                });
            } else {
                document.body.classList.add('market-mode');
                toast('คลิกปุ่มที่ต้องการอัปโหลด', 'info');
            }
        });
    }

    function uploadContextScript() {
        const id = window.currentContextScriptId || '';
        if (typeof TATA.closeContextMenu === 'function') TATA.closeContextMenu();
        const layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
        const buttons = layout.tab_button || [];
        let item = null;
        for (let i = 0; i < buttons.length; i++) {
            if (buttons[i].id === id) item = buttons[i];
        }
        uploadScriptItem(item);
    }

    function uploadPalette() {
        withAccount(() => {
            const colors = livePalette();
            if (!colors.length) {
                toast('ยังไม่มีสีในชุดนี้', 'error');
                return;
            }
            publish({ type: 'color', name: 'ชุดสี', colors: colors.join(', ') }, []);
        });
    }

    function uploadStyle(card) {
        const target = card && card.getAttribute ? card : document.querySelector('.style-card.is-selected');
        withAccount(() => {
            if (!target) {
                toast('เลือก Graphic Style ก่อน', 'info');
                return;
            }
            const aiPath = target.getAttribute('data-style-path') || '';
            const ai = readBounded(aiPath, STYLE_LIMIT);
            if (ai === false) {
                toast('ไฟล์สไตล์ว่างหรือใหญ่เกิน 40 MB', 'error');
                return;
            }
            if (!ai) {
                toast('ไม่พบไฟล์สไตล์', 'error');
                return;
            }
            const label = target.querySelector('.style-name');
            const previewPath = TATA.graphicStyles && TATA.graphicStyles.previewFile
                ? TATA.graphicStyles.previewFile(aiPath)
                : String(aiPath).replace(/_data\.ai$/i, '_text.png');
            const preview = readBounded(previewPath, PREVIEW_LIMIT);
            const styleName = label ? String(label.textContent || '').trim() : '';
            const files = [{ field: 'file', filename: 'style.ai', buffer: ai }];
            if (preview && preview !== false) {
                files.push({ field: 'preview', filename: 'preview.png', buffer: preview });
            }
            publish({ type: 'style', name: styleName || 'Style' }, files);
        });
    }

    const PALETTE_DEFAULTS = ['#e61919', '#ff8709', '#ffe500', '#b8f55f', '#9d95ff', '#ff9ecd'];
    let catalog = [];
    let marketFilter = '';
    let loaded = false;
    let loading = false;

    function visibleItems(items, type) {
        const list = [];
        (items || []).forEach(item => {
            if (!item || !/^[a-f0-9]{16}$/.test(item.id || '')) return;
            if (item.days_left != null && Number(item.days_left) < 1) return;
            if (type && item.type !== type) return;
            list.push(item);
        });
        return list;
    }

    function typeLabel(type) {
        if (type === 'script') return 'Script';
        if (type === 'color') return 'Color';
        return 'Graphic Style';
    }

    function useLabel() {
        return 'ดาวน์โหลด';
    }

    function styleFileName(label) {
        const clean = String(label || '').replace(/[\\/:*?"<>|]/g, '').trim();
        return clean || 'Style';
    }

    function styleFiles(name, home, pathApi) {
        const path = pathApi || nodeRequire('path');
        if (!path || !home) return null;
        const base = styleFileName(name);
        const dir = path.join(home, 'Documents', 'Illustrator_Style_Presets');
        const ai = path.join(dir, base + '_data.ai');
        return {
            dir: dir,
            base: base,
            ai: ai,
            png: ai.replace(/_data\.ai$/i, '_text.png')
        };
    }

    function lifeText(days) {
        const count = parseInt(days, 10);
        if (!count || count < 1) return '';
        return 'อีก ' + count + ' วัน';
    }

    function loadText(count) {
        if (count == null || count === '') return '';
        const total = parseInt(count, 10);
        if (isNaN(total) || total < 0) return '';
        return 'โหลด ' + total;
    }

    function cardStat(item) {
        return loadText(item && item.downloads);
    }

    function marketNote(message) {
        const list = document.getElementById('market_list');
        if (!list) return;
        list.textContent = '';
        const note = document.createElement('p');
        note.className = 'market-empty';
        note.lang = 'th';
        note.textContent = message;
        list.appendChild(note);
    }

    const SCRIPT_GLYPH = '<svg class="market-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4Zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4Z"/></svg>';

    function cardArt(item, base) {
        const art = document.createElement('span');
        art.className = 'market-art';
        if (item.type === 'style' && item.preview) {
            art.classList.add('market-art--style');
            const image = document.createElement('img');
            image.className = 'market-preview';
            image.alt = '';
            image.src = base + '/api/preview.php?id=' + item.id;
            art.appendChild(image);
        } else if (item.type === 'color') {
            const row = document.createElement('span');
            row.className = 'market-swatches';
            paletteFromValues(item.colors || []).forEach(color => {
                const swatch = document.createElement('span');
                swatch.style.setProperty('--swatch', color);
                swatch.title = color;
                row.appendChild(swatch);
            });
            art.appendChild(row);
        } else {
            art.innerHTML = SCRIPT_GLYPH;
        }
        return art;
    }

    function paintMarket() {
        const list = document.getElementById('market_list');
        if (!list) return;
        const items = visibleItems(catalog, marketFilter);
        list.textContent = '';
        if (!items.length) {
            marketNote(loaded ? 'ยังไม่มีรายการ' : 'กำลังโหลด...');
            return;
        }
        const base = marketSettings().url;
        items.forEach(item => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'market-card';
            button.title = 'ดาวน์โหลด ' + (item.name || '');
            button.appendChild(cardArt(item, base));
            const kind = document.createElement('span');
            kind.className = 'market-type';
            kind.textContent = typeLabel(item.type);
            const name = document.createElement('span');
            name.className = 'market-name';
            name.textContent = item.name || '';
            const foot = document.createElement('span');
            foot.className = 'market-foot';
            foot.lang = 'th';
            const stat = cardStat(item);
            if (stat) {
                const remaining = document.createElement('span');
                remaining.className = 'market-life';
                remaining.textContent = stat;
                foot.appendChild(remaining);
            }
            const action = document.createElement('span');
            action.className = 'market-use';
            action.textContent = useLabel(item.type);
            foot.appendChild(action);
            button.appendChild(kind);
            button.appendChild(name);
            if (Array.isArray(item.credits) && item.credits.length) {
                const from = item.credits[item.credits.length - 1];
                const credit = document.createElement('span');
                credit.className = 'market-credit';
                credit.lang = 'th';
                credit.textContent = 'ดัดแปลงจาก ' + (from.name || '') + (from.by ? ' · ' + from.by : '');
                button.appendChild(credit);
            }
            button.appendChild(foot);
            button.addEventListener('click', () => chooseItem(item, button));
            list.appendChild(button);
        });
    }

    function textFrom(result) {
        if (!result) return '';
        if (typeof result.text === 'string') return result.text;
        if (result.buffer && typeof result.buffer.toString === 'function') return result.buffer.toString('utf8');
        return '';
    }

    function readCatalog(apiPath) {
        const target = endpoint(marketSettings().url, apiPath);
        if (!target) return Promise.reject(new Error('ที่อยู่ Marketplace ไม่ถูกต้อง'));
        if (typeof fetch === 'function') {
            return fetch(absoluteUrl(target)).then(res => res.text().then(text => ({ status: res.status, text: text })));
        }
        return transfer(target, 'GET').then(res => ({ status: res.status, text: textFrom(res) }));
    }

    function readFile(id) {
        const target = endpoint(marketSettings().url, '/api/download.php?id=' + id);
        if (!target) return Promise.reject(new Error('ที่อยู่ Marketplace ไม่ถูกต้อง'));
        if (typeof fetch === 'function') {
            return fetch(absoluteUrl(target)).then(res => {
                if (!res.ok) {
                    return res.text().then(text => {
                        let message = 'ดาวน์โหลดไม่สำเร็จ';
                        try { message = JSON.parse(text).error || message; } catch (e) { /* keep the fallback */ }
                        throw new Error(message);
                    });
                }
                return res.arrayBuffer().then(buf => (typeof Buffer !== 'undefined' ? Buffer.from(buf) : new Uint8Array(buf)));
            });
        }
        return transfer(target, 'GET').then(res => {
            if (res.status < 200 || res.status >= 300) {
                let message = 'ดาวน์โหลดไม่สำเร็จ';
                try { message = JSON.parse(textFrom(res)).error || message; } catch (e) { /* keep the fallback */ }
                throw new Error(message);
            }
            return res.buffer;
        });
    }

    function fileText(data) {
        if (typeof Buffer !== 'undefined') return Buffer.from(data).toString('utf8');
        if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(data);
        return '';
    }

    function refreshMarket() {
        if (loading) return;
        const list = document.getElementById('market_list');
        if (!list) return;
        loading = true;
        marketNote('กำลังโหลด...');
        readCatalog('/api/list.php').then(result => {
            let data = null;
            try { data = JSON.parse(result.text); } catch (e) { data = null; }
            if (!result.status || result.status < 200 || result.status >= 300 || !data || !data.ok) {
                throw new Error(data && data.error ? data.error : 'โหลดรายการไม่ได้');
            }
            catalog = data.items || [];
            loaded = true;
            paintMarket();
        }).catch(error => {
            loaded = false;
            marketNote(explain(error));
        }).then(() => {
            loading = false;
        });
    }

    function openMarket() {
        if (!loaded && !loading) refreshMarket();
    }

    function installScript(item) {
        return readFile(item.id).then(data => {
            const code = fileText(data).replace(/^\uFEFF/, '');
            if (!code.trim()) throw new Error('สคริปต์ว่าง');
            if (code.length > SCRIPT_LIMIT) throw new Error('สคริปต์ใหญ่เกิน 2 MB');
            if (typeof TATA.saveUserScript !== 'function') throw new Error('ดาวน์โหลดได้เมื่อเปิดพาเนลใน Illustrator');
            const review = TATA.scriptReview
                ? TATA.scriptReview.open({ name: item.name, by: item.owner_name, code: code, credits: item.credits })
                : Promise.resolve('install');
            return review.then(choice => {
                if (!choice) return false;
                const icon = (TATA.ICONS && TATA.ICONS.stars) || '★';
                const base = String(item.name || 'Script').slice(0, 72);
                const name = choice === 'remix' ? base + ' (remix)' : base;
                // Source 'market': the code is shown and confirmed before every run.
                const scriptId = TATA.saveUserScript(name, icon, code, '', false, null, false, 'market');
                rememberOrigin(scriptId, item.id);
                if (choice === 'remix' && typeof TATA.openEditorForItem === 'function') {
                    TATA.openEditorForItem({ id: scriptId, label: name, icon: icon, code: code, color: '' });
                    toast('เปิดในตัวแก้โค้ดแล้ว แก้แล้วกด Upload เพื่อแชร์เป็น Remix', 'success');
                } else {
                    toast('ดาวน์โหลดลง Tools แล้ว — จะแสดงโค้ดให้ยืนยันก่อนรัน', 'success');
                }
                return true;
            });
        });
    }

    function installPalette(item) {
        const colors = paletteFromValues(item.colors || []);
        if (!colors.length) {
            toast('ชุดสีนี้ไม่มีรหัสสี', 'error');
            return Promise.resolve(false);
        }
        return readFile(item.id).then(() => {
            // Keep the palette's own size (2–8 slots); a single colour pads with defaults.
            const next = colors.slice(0, 8).map(color => color.toLowerCase());
            for (let i = next.length; i < 2; i++) next.push(PALETTE_DEFAULTS[i]);
            localStorage.setItem('tata_custom_colors', JSON.stringify(next));
            if (TATA.colorTools && typeof TATA.colorTools.setPalette === 'function') {
                TATA.colorTools.setPalette(next);
            }
            toast('ดาวน์โหลดลง Colors แล้ว', 'success');
            return true;
        });
    }

    function savePreview(item, pngPath, fs) {
        if (!item.preview) {
            if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
            return Promise.resolve();
        }
        const target = endpoint(marketSettings().url, '/api/preview.php?id=' + encodeURIComponent(item.id));
        const drop = () => {
            if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
        };
        const finish = buffer => {
            if (!buffer || buffer.length < 1 || buffer.length > PREVIEW_LIMIT) {
                drop();
                return;
            }
            fs.writeFileSync(pngPath, buffer);
        };
        if (!target) {
            drop();
            return Promise.resolve();
        }
        if (typeof fetch === 'function') {
            return fetch(absoluteUrl(target)).then(res => {
                if (!res.ok) throw new Error('preview');
                return res.arrayBuffer();
            }).then(buf => {
                finish(typeof Buffer !== 'undefined' ? Buffer.from(buf) : null);
            }).catch(drop);
        }
        return transfer(target, 'GET').then(res => {
            if (res.status < 200 || res.status >= 300) throw new Error('preview');
            finish(res.buffer);
        }).catch(drop);
    }

    function writeStyle(item, files, fs) {
        return readFile(item.id).then(data => {
            const buffer = typeof Buffer !== 'undefined' ? Buffer.from(data) : null;
            if (!buffer || buffer.length < 1 || buffer.length > STYLE_LIMIT) throw new Error('ไฟล์สไตล์ว่างหรือใหญ่เกิน 40 MB');
            if (!fs.existsSync(files.dir)) fs.mkdirSync(files.dir);
            fs.writeFileSync(files.ai, buffer);
            return savePreview(item, files.png, fs);
        }).then(() => {
            if (TATA.graphicStyles && typeof TATA.graphicStyles.refresh === 'function') {
                TATA.graphicStyles.refresh();
            }
            toast('ดาวน์โหลดลง Graphic Style แล้ว', 'success');
            return true;
        });
    }

    function installStyle(item) {
        const fs = nodeRequire('fs');
        const os = nodeRequire('os');
        const path = nodeRequire('path');
        const files = fs && os && path ? styleFiles(item.name, os.homedir(), path) : null;
        if (!files || typeof Buffer === 'undefined') {
            toast('ดาวน์โหลดได้เมื่อเปิดพาเนลใน Illustrator', 'info');
            return Promise.resolve(false);
        }
        if (fs.existsSync(files.ai) && typeof TATA.showConfirmModal === 'function') {
            return new Promise((resolve, reject) => {
                TATA.showConfirmModal('แทนที่สไตล์', 'มีชื่อ "' + files.base + '" อยู่แล้ว แทนที่หรือไม่', yes => {
                    if (!yes) {
                        resolve(false);
                        return;
                    }
                    writeStyle(item, files, fs).then(resolve, reject);
                }, { confirmLabel: 'แทนที่' });
            });
        }
        return writeStyle(item, files, fs);
    }

    function chooseItem(item, button) {
        if (!item || button.disabled) return;
        button.disabled = true;
        const job = item.type === 'script'
            ? installScript(item)
            : (item.type === 'color' ? installPalette(item) : installStyle(item));
        Promise.resolve(job).then(result => {
            if (result === false) {
                button.disabled = false;
                return;
            }
            item.days_left = 10;
            item.downloads = (parseInt(item.downloads, 10) || 0) + 1;
            paintMarket();
        }).catch(error => {
            toast(explain(error), 'error');
            button.disabled = false;
        });
    }

    function bind() {
        const scriptButton = document.getElementById('btn_upload_script');
        const colorButton = document.getElementById('btn_upload_colors');
        const styleButton = document.getElementById('btn_upload_style');
        const contextButton = document.getElementById('ctx_market');
        if (scriptButton && !scriptButton._marketBound) {
            scriptButton._marketBound = true;
            scriptButton.addEventListener('click', uploadPickedScript);
        }
        if (colorButton && !colorButton._marketBound) {
            colorButton._marketBound = true;
            colorButton.addEventListener('click', uploadPalette);
        }
        if (styleButton && !styleButton._marketBound) {
            styleButton._marketBound = true;
            styleButton.addEventListener('click', uploadStyle);
        }
        if (contextButton && !contextButton._marketBound) {
            contextButton._marketBound = true;
            contextButton.addEventListener('click', event => {
                event.stopPropagation();
                uploadContextScript();
            });
        }
        const refreshButton = document.getElementById('btn_market_refresh');
        if (refreshButton && !refreshButton._marketBound) {
            refreshButton._marketBound = true;
            refreshButton.addEventListener('click', () => {
                loaded = false;
                refreshMarket();
            });
        }
        document.querySelectorAll('[data-market-type]').forEach(button => {
            if (button._marketBound) return;
            button._marketBound = true;
            button.addEventListener('click', () => {
                marketFilter = button.getAttribute('data-market-type') || '';
                document.querySelectorAll('[data-market-type]').forEach(item => {
                    item.classList.toggle('is-on', item === button);
                    item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
                });
                if (loaded) paintMarket();
            });
        });
        const connectButton = document.getElementById('btn_market_connect');
        if (connectButton && !connectButton._marketBound) {
            connectButton._marketBound = true;
            connectButton.addEventListener('click', () => {
                if (marketSettings().token) {
                    localStorage.removeItem('tata_market_session');
                    paintAccount();
                    toast('ออกจากบัญชี Marketplace แล้ว', 'info');
                    return;
                }
                connectGoogle();
            });
        }
        if (!TATA._marketEscape) {
            TATA._marketEscape = true;
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    stopPicking();
                    setProfileMenu(false);
                }
            });
        }
        try {
            localStorage.removeItem('tata_market_token');
            localStorage.removeItem('tata_market_url');
        } catch (e) { /* storage can be blocked in a preview */ }
        const profileButton = document.getElementById('btn_profile');
        const profileAccount = document.getElementById('profile_account');
        const profileWrap = document.querySelector('.profile-slot');
        if (profileButton && !profileButton._marketBound) {
            profileButton._marketBound = true;
            profileButton.addEventListener('click', event => {
                event.stopPropagation();
                const menu = document.getElementById('profile_menu');
                setProfileMenu(!menu || menu.hidden);
            });
        }
        if (profileAccount && !profileAccount._marketBound) {
            profileAccount._marketBound = true;
            profileAccount.addEventListener('click', event => {
                event.stopPropagation();
                setProfileMenu(false);
                if (marketSettings().token) {
                    localStorage.removeItem('tata_market_session');
                    paintAccount();
                    toast('ออกจากบัญชี Marketplace แล้ว', 'info');
                    return;
                }
                connectGoogle();
            });
        }
        const settingsItem = document.getElementById('btn_settings');
        if (settingsItem && !settingsItem._profileBound) {
            settingsItem._profileBound = true;
            settingsItem.addEventListener('click', () => setProfileMenu(false));
        }
        if (profileWrap && !profileWrap._marketBound) {
            profileWrap._marketBound = true;
            document.addEventListener('click', event => {
                if (profileWrap.contains(event.target)) return;
                setProfileMenu(false);
            });
        }
        paintAccount();
        refreshProfile();
    }

    TATA.market = {
        endpoint: endpoint,
        allowedVerifyUrl: allowedVerifyUrl,
        colorToHex: colorToHex,
        paletteFromValues: paletteFromValues,
        buildBody: buildBody,
        scriptFile: scriptFile,
        visibleItems: visibleItems,
        lifeText: lifeText,
        loadText: loadText,
        cardStat: cardStat,
        useLabel: useLabel,
        styleFiles: styleFiles,
        safePicture: safePicture,
        uploadStyle: uploadStyle,
        paintAccount: paintAccount,
        bind: bind,
        open: openMarket,
        refresh: refreshMarket
    };

    bind();
})();
