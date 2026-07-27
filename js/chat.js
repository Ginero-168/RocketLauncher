/**
 * TATA Panel - Chat Module
 * Public and password-protected chat rooms with media/button sharing.
 * Polls every 10 seconds (non-real-time).
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    const POLL_INTERVAL = 10000; // 10 seconds
    const MAX_MESSAGES = 200;    // keep last N in DOM

    const MAX_ATTACHMENTS = 10;
    const ACCEPTED_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

    let chatState = {
        username: localStorage.getItem('tata_chat_username') || '',
        lastId: 0,
        polling: false,
        pollTimer: null,
        active: false,
        // Files staged for sending. Each entry: { file, url, kind }
        attachments: [],
        dragDepth: 0,
        sending: false,
        room: { slug: 'public', name: 'Public Lounge', is_private: false },
        roomPassword: '',
        mediaUrls: new Set(),
    };

    // ==========================================
    // Safe toast helper (TATA might not exist yet)
    // ==========================================
    function safeToast(message, type) {
        if (window.TATA && typeof TATA.showToast === 'function') {
            TATA.showToast(message, type);
        } else {
            console.log(`[Chat] ${type}: ${message}`);
        }
    }

    // ==========================================
    // DOM helpers
    // ==========================================
    function $(id) { return document.getElementById(id); }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function formatTime(ts) {
        try {
            const d = new Date(ts.replace(' ', 'T') + 'Z');
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    // ==========================================
    // API calls
    // ==========================================
    function getBackendUrl() {
        return (window.TATA_CONFIG && TATA_CONFIG.CHAT_BACKEND_URL) || '';
    }

    function getRoomHeaders(includeJson, roomSlug, roomPassword) {
        const headers = {
            'X-Chat-Room': roomSlug || chatState.room.slug,
        };
        const password = roomPassword === undefined ? chatState.roomPassword : roomPassword;
        if (password) {
            headers.Authorization = `Bearer ${password}`;
        }
        if (includeJson) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    }

    function clearRenderedMessages() {
        const container = $('chat_messages');
        if (container) container.textContent = '';
        for (const url of chatState.mediaUrls) URL.revokeObjectURL(url);
        chatState.mediaUrls.clear();
        chatState.lastId = 0;
    }

    function roomStorageKey(slug) {
        return `tata_chat_room_password_${slug}`;
    }

    function rememberRoom(room) {
        if (!room || room.slug === 'public') return;
        const saved = getRecentRooms().filter(item => item && item.slug !== room.slug);
        saved.unshift({ slug: room.slug, name: room.name, is_private: true });
        localStorage.setItem('tata_chat_recent_rooms', JSON.stringify(saved.slice(0, 8)));
        renderRecentRooms();
    }

    function updateRoomUi() {
        const name = $('chat_room_name');
        const badge = $('chat_room_badge');
        if (name) name.textContent = chatState.room.name;
        if (badge) {
            badge.textContent = chatState.room.is_private ? 'PRIVATE' : 'PUBLIC';
            badge.classList.toggle('private', !!chatState.room.is_private);
        }
    }

    async function roomRequest(payload) {
        const url = getBackendUrl();
        if (!url) throw new Error('Chat backend not configured');
        const res = await fetch(`${url}/rooms.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Room request failed');
        return data.room;
    }

    async function enterRoom(slug, password) {
        const room = await roomRequest({ action: 'join', room: slug || 'public', password: password || '' });
        chatState.room = room;
        chatState.roomPassword = password || '';
        if (room.is_private && password) {
            sessionStorage.setItem(roomStorageKey(room.slug), password);
            rememberRoom(room);
        }
        clearRenderedMessages();
        updateRoomUi();
        const panel = $('chat_rooms_panel');
        if (panel) panel.style.display = 'none';
        await pollMessages();
        safeToast(`Joined ${room.name}`, 'success');
        return room;
    }

    async function sendMessage(content, messageType, buttonData, imageFile) {
        const url = getBackendUrl();
        if (!url) {
            safeToast('Chat backend not configured', 'error');
            return false;
        }

        const type = messageType || 'text';
        const isImage = type === 'image' && imageFile;

        let body;
        let headers = getRoomHeaders(!isImage);
        if (isImage) {
            const isSvg = /svg/i.test(imageFile.type) || /\.svg$/i.test(imageFile.name || '');
            body = new FormData();
            body.append('username', chatState.username);
            body.append('content', content || (isSvg ? 'SVG selection' : imageFile.name || 'Image'));
            body.append('message_type', 'image');
            body.append('image', imageFile);
        } else {
            body = JSON.stringify({
                username: chatState.username,
                content,
                message_type: type,
                button_data: buttonData || null,
            });
        }

        try {
            const res = await fetch(`${url}/send.php`, {
                method: 'POST',
                headers,
                body,
            });
            const data = await res.json();
            if (!data.ok) {
                safeToast(`Chat error: ${data.error}`, 'error');
                return false;
            }
            // Immediately poll for new messages after sending
            pollMessages();
            return true;
        } catch (e) {
            safeToast(`Chat send failed: ${e.message}`, 'error');
            return false;
        }
    }

    async function pollMessages() {
        if (chatState.polling) return;
        const url = getBackendUrl();
        if (!url) return;

        const roomSlug = chatState.room.slug;
        const roomPassword = chatState.roomPassword;
        const since = chatState.lastId;
        chatState.polling = true;
        try {
            const res = await fetch(`${url}/poll.php?since=${since}`, {
                headers: getRoomHeaders(false, roomSlug, roomPassword),
            });
            const data = await res.json();
            // A slow response from the previous room must never render in the
            // newly selected room.
            if (chatState.room.slug !== roomSlug) return;
            if (data.ok && data.messages && data.messages.length > 0) {
                for (const msg of data.messages) {
                    await renderMessage(msg, roomSlug);
                    if (chatState.room.slug !== roomSlug) return;
                    if (msg.id > chatState.lastId) chatState.lastId = msg.id;
                }
                trimMessages();
                scrollToBottom();
            }
        } catch (e) {
            // Silent fail on poll — don't spam toast
            console.warn('[Chat] Poll failed:', e.message);
        } finally {
            chatState.polling = false;
            // If the room changed while this request was in flight, immediately
            // fetch the new room instead of waiting for the next 10-second tick.
            if (chatState.room.slug !== roomSlug) {
                pollMessages();
            }
        }
    }

    // ==========================================
    // Render
    // ==========================================
    async function copyText(value) {
        const text = String(value || '');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('Clipboard unavailable');
    }

    async function fetchMessageMedia(msg, roomSlug, roomPassword) {
        if (msg._mediaBlob) return msg._mediaBlob;
        const backendUrl = getBackendUrl();
        const selectedRoom = roomSlug || chatState.room.slug;
        let res = await fetch(`${backendUrl}/media.php?id=${encodeURIComponent(msg.id)}`, {
            headers: getRoomHeaders(false, selectedRoom, roomPassword),
        });
        // Compatibility bridge for the legacy public backend, which stored
        // uploads directly and did not have media.php. Never bypass room
        // authorization for private rooms.
        const legacyPath = String(msg.file_path || '');
        const safeLegacyPath = /^uploads\/[a-f0-9]{32}\.(?:png|jpe?g|gif|webp|svg)$/i.test(legacyPath);
        if (res.status === 404 && selectedRoom === 'public' && safeLegacyPath) {
            res = await fetch(`${backendUrl}/${legacyPath}`);
        }
        if (!res.ok) throw new Error('Media is unavailable');
        msg._mediaBlob = await res.blob();
        return msg._mediaBlob;
    }

    async function copyMessage(msg) {
        if (msg.message_type === 'button_config' && msg.button_data) {
            await copyText(JSON.stringify(msg.button_data, null, 2));
            return 'Button configuration copied';
        }
        if (msg.message_type === 'image' && msg.file_path) {
            const blob = await fetchMessageMedia(msg);
            if (/svg/i.test(blob.type) || /\.svg$/i.test(msg.file_path)) {
                await copyText(await blob.text());
                return 'SVG source copied';
            }
            if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
                try {
                    await navigator.clipboard.write([new window.ClipboardItem({ [blob.type]: blob })]);
                    return 'Image copied';
                } catch (e) {
                    // Older CEP builds only allow text clipboard writes.
                }
            }
            await copyText(msg.content || `Image message #${msg.id}`);
            return 'Image caption copied';
        }
        await copyText(msg.content || '');
        return 'Message copied';
    }

    async function renderMessage(msg, expectedRoomSlug) {
        const container = $('chat_messages');
        if (!container) return;
        const roomSlug = expectedRoomSlug || chatState.room.slug;
        const roomPassword = chatState.roomPassword;
        let createdMediaUrl = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'chat-msg';
        wrapper.dataset.id = msg.id;

        const isMe = msg.username === chatState.username;
        if (isMe) wrapper.classList.add('chat-msg-me');

        const header = document.createElement('div');
        header.className = 'chat-msg-header';
        const user = document.createElement('span');
        user.className = 'chat-msg-user';
        user.textContent = msg.username;
        const time = document.createElement('span');
        time.className = 'chat-msg-time';
        time.textContent = formatTime(msg.created_at);
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'chat-msg-copy';
        copyBtn.textContent = 'Copy';
        copyBtn.title = 'Copy this message';
        copyBtn.onclick = async () => {
            copyBtn.disabled = true;
            try {
                safeToast(await copyMessage(msg), 'success');
                copyBtn.textContent = 'Copied';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
            } catch (e) {
                safeToast(`Copy failed: ${e.message}`, 'error');
            } finally {
                copyBtn.disabled = false;
            }
        };
        header.appendChild(user);
        header.appendChild(time);
        header.appendChild(copyBtn);
        wrapper.appendChild(header);

        if (msg.message_type === 'button_config' && msg.button_data) {
            // Render button config card
            const card = document.createElement('div');
            card.className = 'chat-btn-card';

            const label = document.createElement('div');
            label.className = 'chat-btn-card-label';
            label.textContent = msg.content || 'Shared Button';
            card.appendChild(label);

            const meta = document.createElement('div');
            meta.className = 'chat-btn-card-meta';
            const bd = msg.button_data;
            const iconLabel = /^\s*<svg[\s>]/i.test(bd.icon || '') ? 'SVG icon' : (bd.icon || '★');
            meta.textContent = `${iconLabel} · ${bd.color || 'default'}`;
            card.appendChild(meta);

            const importBtn = document.createElement('button');
            importBtn.className = 'chat-btn-import';
            importBtn.textContent = 'Import to Panel';
            importBtn.onclick = () => importButtonConfig(msg.button_data);
            card.appendChild(importBtn);

            // Show code preview (collapsible)
            if (bd.code) {
                const codePreview = document.createElement('details');
                codePreview.className = 'chat-btn-code';
                const summary = document.createElement('summary');
                summary.textContent = 'View Code';
                codePreview.appendChild(summary);
                const pre = document.createElement('pre');
                pre.textContent = bd.code;
                codePreview.appendChild(pre);
                card.appendChild(codePreview);
            }

            wrapper.appendChild(card);
        } else if (msg.message_type === 'image' && msg.file_path) {
            // Render image or SVG message
            const isSvg = /\.svg$/i.test(msg.file_path);
            try {
                const blob = await fetchMessageMedia(msg, roomSlug, roomPassword);
                createdMediaUrl = URL.createObjectURL(blob);
                chatState.mediaUrls.add(createdMediaUrl);
            } catch (e) {
                const unavailable = document.createElement('div');
                unavailable.className = 'chat-msg-media-error';
                unavailable.textContent = 'Media unavailable';
                wrapper.appendChild(unavailable);
            }

            if (createdMediaUrl && isSvg) {
                const img = document.createElement('img');
                img.className = 'chat-msg-image';
                img.src = createdMediaUrl;
                img.alt = msg.content || 'SVG';
                img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40"><text y="20">SVG preview unavailable</text></svg>'; };
                img.onclick = () => {
                    try { window.open(createdMediaUrl, '_blank'); } catch (e) { }
                };
                wrapper.appendChild(img);
            } else if (createdMediaUrl) {
                const img = document.createElement('img');
                img.className = 'chat-msg-image';
                img.src = createdMediaUrl;
                img.alt = msg.content || 'Image';
                img.onclick = () => window.open(img.src, '_blank');
                wrapper.appendChild(img);
            }

            if (msg.content && msg.content !== msg.file_path.split('/').pop()) {
                const caption = document.createElement('div');
                caption.className = 'chat-msg-caption';
                caption.textContent = msg.content;
                caption.style.fontSize = '11px';
                caption.style.color = '#aaa';
                caption.style.marginTop = '4px';
                wrapper.appendChild(caption);
            }
        } else {
            // Regular text message
            const body = document.createElement('div');
            body.className = 'chat-msg-body';

            // Detect code blocks (triple backticks)
            const text = msg.content;
            if (text.includes('```')) {
                const parts = text.split(/```/);
                for (let i = 0; i < parts.length; i++) {
                    if (i % 2 === 0) {
                        if (parts[i].trim()) {
                            const p = document.createElement('div');
                            p.textContent = parts[i].trim();
                            body.appendChild(p);
                        }
                    } else {
                        const pre = document.createElement('pre');
                        pre.className = 'chat-code-block';
                        pre.textContent = parts[i].trim();
                        body.appendChild(pre);
                    }
                }
            } else {
                body.textContent = text;
            }
            wrapper.appendChild(body);
        }

        if (chatState.room.slug !== roomSlug) {
            if (createdMediaUrl) {
                URL.revokeObjectURL(createdMediaUrl);
                chatState.mediaUrls.delete(createdMediaUrl);
            }
            return;
        }
        container.appendChild(wrapper);
    }

    function trimMessages() {
        const container = $('chat_messages');
        if (!container) return;
        while (container.children.length > MAX_MESSAGES) {
            container.removeChild(container.firstChild);
        }
    }

    function scrollToBottom() {
        const container = $('chat_messages');
        if (container) container.scrollTop = container.scrollHeight;
    }

    // ==========================================
    // Import button config to panel
    // ==========================================
    function importButtonConfig(btnData) {
        if (!btnData || !btnData.label) {
            safeToast('Invalid button data', 'error');
            return;
        }
        if (!window.confirm(
            `Import "${btnData.label}"?\n\nShared buttons may contain Illustrator code. Review the code before running it.`
        )) {
            return;
        }

        // Use TATA.saveUserScript if available (same as script import)
        if (typeof TATA.saveUserScript === 'function') {
            const id = 'shared_' + Date.now();
            TATA.saveUserScript(
                btnData.label,
                btnData.icon || '★',
                btnData.code || '',
                btnData.color || 'gray',
                false,
                id,
                false
            );
            safeToast(`Imported "${btnData.label}" to panel`, 'success');
            if (typeof TATA.renderGrid === 'function') TATA.renderGrid();
        } else {
            safeToast('Panel not ready for import', 'error');
        }
    }

    // ==========================================
    // Share button to chat (called from context menu)
    // ==========================================
    async function shareButtonToChat(btnId) {
        if (!chatState.username) {
            safeToast('Open Chat tab and enter your name first', 'error');
            return;
        }

        // Get button data from layout
        const layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
        let btnData = null;
        for (const tab of Object.keys(layout)) {
            if (Array.isArray(layout[tab])) {
                const found = layout[tab].find(item => item.id === btnId);
                if (found) { btnData = found; break; }
            }
        }

        if (!btnData) {
            safeToast('Button not found', 'error');
            return;
        }

        // Build shareable config
        const shareData = {
            id: btnData.id,
            label: btnData.label || btnData.name || 'Shared Button',
            icon: btnData.icon || '★',
            color: btnData.color || 'gray',
            code: btnData.code || '',
            script: btnData.script || '',
            type: btnData.type || 'code',
        };

        const ok = await sendMessage(
            `Shared button: ${shareData.label}`,
            'button_config',
            shareData
        );
        if (ok) {
            safeToast(`Shared "${shareData.label}" to chat`, 'success');
        }
    }

    // ==========================================
    // Attachments
    // ==========================================
    function isAcceptedFile(file) {
        if (!file) return false;
        if (file.type && file.type.startsWith('image/')) return true;
        // Finder sometimes reports an empty type for .svg; fall back to the extension.
        return ACCEPTED_EXT.test(file.name || '');
    }

    function addAttachments(files) {
        const incoming = Array.from(files || []).filter(isAcceptedFile);
        if (!incoming.length) {
            safeToast('Only images and SVG files can be sent', 'error');
            return;
        }

        const room = MAX_ATTACHMENTS - chatState.attachments.length;
        if (room <= 0) {
            safeToast(`Attachment limit is ${MAX_ATTACHMENTS}`, 'error');
            return;
        }
        if (incoming.length > room) {
            safeToast(`Only the first ${room} file(s) were attached`, 'error');
        }

        for (const file of incoming.slice(0, room)) {
            chatState.attachments.push({
                file,
                url: URL.createObjectURL(file),
                kind: /svg/i.test(file.type) || /\.svg$/i.test(file.name || '') ? 'SVG' : '',
            });
        }
        renderAttachments();
    }

    function removeAttachment(index) {
        const item = chatState.attachments[index];
        if (item) URL.revokeObjectURL(item.url);
        chatState.attachments.splice(index, 1);
        renderAttachments();
    }

    function clearAttachments() {
        for (const item of chatState.attachments) URL.revokeObjectURL(item.url);
        chatState.attachments = [];
        const input = $('chat_image_input');
        if (input) input.value = '';
        renderAttachments();
    }

    function renderAttachments() {
        const tray = $('chat_attachments');
        if (!tray) return;

        tray.textContent = '';
        if (!chatState.attachments.length) {
            tray.style.display = 'none';
            return;
        }
        tray.style.display = 'flex';

        chatState.attachments.forEach((item, index) => {
            const cell = document.createElement('div');
            cell.className = 'chat-attach';

            const img = document.createElement('img');
            img.src = item.url;
            img.alt = item.file.name || 'attachment';
            cell.appendChild(img);

            if (item.kind) {
                const badge = document.createElement('span');
                badge.className = 'chat-attach-badge';
                badge.textContent = item.kind;
                cell.appendChild(badge);
            }

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'chat-attach-remove';
            remove.textContent = '×';
            remove.title = `Remove ${item.file.name || 'attachment'}`;
            remove.onclick = () => removeAttachment(index);
            cell.appendChild(remove);

            tray.appendChild(cell);
        });
    }

    // ==========================================
    // Illustrator selection -> SVG attachment
    // ==========================================
    function attachIllustratorSelection() {
        if (!TATA.host || typeof TATA.host.run !== 'function') {
            safeToast('Illustrator bridge not ready', 'error');
            return;
        }

        let fs;
        let path;
        let os;
        try {
            fs = window.require('fs');
            path = window.require('path');
            os = window.require('os');
        } catch (e) {
            safeToast('File access unavailable in this panel', 'error');
            return;
        }

        const tempPath = path.join(os.tmpdir(), `tata_chat_${Date.now()}.svg`);

        TATA.host.run('saveSelectionAsRichSvg', { path: tempPath }, res => {
            const result = String(res || '').replace(/^"|"$/g, '');

            if (result === 'No Selection') {
                safeToast('Select artwork in Illustrator first', 'error');
                return;
            }
            if (result === 'No Doc') {
                safeToast('Open a document in Illustrator first', 'error');
                return;
            }
            if (result !== 'Success') {
                safeToast(`Export failed: ${result}`, 'error');
                return;
            }

            try {
                const buffer = fs.readFileSync(tempPath);
                const file = new File(
                    [new Uint8Array(buffer)],
                    `selection_${Date.now()}.svg`,
                    { type: 'image/svg+xml' }
                );
                addAttachments([file]);
                safeToast('Selection attached', 'success');
            } catch (e) {
                safeToast(`Could not read exported SVG: ${e.message}`, 'error');
            } finally {
                try { fs.unlinkSync(tempPath); } catch (e) { /* temp file cleanup is best-effort */ }
            }
        });
    }

    // ==========================================
    // Drag & drop / paste
    // ==========================================
    function setDropActive(active, message) {
        const zone = $('chat_dropzone');
        if (!zone) return;
        zone.classList.toggle('active', active);
        if (message) {
            const text = zone.querySelector('.chat-dropzone-inner div:last-child');
            if (text) text.textContent = message;
        }
    }

    function isFileDrop(dt) {
        if (!dt) return false;
        // Native files or a file path passed as text.
        if (dt.types && Array.from(dt.types).some(t => t === 'Files')) return true;
        if (dt.files && dt.files.length) return true;
        return false;
    }

    function bindDropTarget(target) {
        if (!target) return;

        target.addEventListener('dragenter', e => {
            e.preventDefault();
            e.stopPropagation();
            chatState.dragDepth++;

            const dt = e.dataTransfer;
            if (isFileDrop(dt)) {
                setDropActive(true, 'Drop images or SVG files to send');
            } else {
                setDropActive(true, 'Drop to attach the Illustrator selection as SVG');
            }
        });

        target.addEventListener('dragover', e => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        });

        target.addEventListener('dragleave', e => {
            e.preventDefault();
            e.stopPropagation();
            chatState.dragDepth = Math.max(0, chatState.dragDepth - 1);
            if (chatState.dragDepth === 0) setDropActive(false);
        });

        target.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            chatState.dragDepth = 0;
            setDropActive(false);

            const dt = e.dataTransfer;
            if (!dt) return;

            if (dt.files && dt.files.length) {
                addAttachments(dt.files);
                return;
            }

            // Some sources hand over a file path or a URL instead of a File object.
            const text = dt.getData('text/uri-list') || dt.getData('text/plain');
            if (text) {
                attachFromPathOrUrl(text.trim());
                return;
            }

            // Illustrator canvas drags do not expose a File through CEP. Export
            // the current selection through the host bridge, matching the AI→SVG
            // button behavior.
            attachIllustratorSelection();
        });
    }

    function attachFromPathOrUrl(value) {
        if (!value) return;

        let fs;
        let path;
        try {
            fs = window.require('fs');
            path = window.require('path');
        } catch (e) {
            safeToast('Drop a file instead of a link', 'error');
            return;
        }

        const local = value.startsWith('file://')
            ? decodeURIComponent(value.replace(/^file:\/\//, ''))
            : value;

        try {
            if (!fs.existsSync(local)) {
                safeToast('Could not read the dropped item', 'error');
                return;
            }
            const name = path.basename(local);
            if (!ACCEPTED_EXT.test(name)) {
                safeToast('Only images and SVG files can be sent', 'error');
                return;
            }
            const buffer = fs.readFileSync(local);
            const type = /\.svg$/i.test(name) ? 'image/svg+xml' : '';
            addAttachments([new File([new Uint8Array(buffer)], name, { type })]);
        } catch (e) {
            safeToast(`Could not read the dropped file: ${e.message}`, 'error');
        }
    }

    function handlePaste(e) {
        const cd = e.clipboardData;
        const items = cd && cd.items;
        if (!items) return;

        // Prefer SVG if Illustrator put it on the clipboard.
        for (const item of items) {
            if (item.kind === 'file' && item.type === 'image/svg+xml') {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    addAttachments([file]);
                    return;
                }
            }
        }

        // If the only pasted image is a generic PNG, it is almost certainly the
        // bitmap preview Illustrator places on the clipboard. Export the current
        // selection as real SVG instead, but only when something is selected.
        const pastedImages = [];
        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) pastedImages.push(file);
            }
        }

        if (pastedImages.length === 1 && pastedImages[0].type === 'image/png') {
            e.preventDefault();
            attachIllustratorSelectionAsSvgFallback(pastedImages[0]);
            return;
        }

        if (pastedImages.length) {
            e.preventDefault();
            addAttachments(pastedImages);
        }
    }

    /**
     * When the user pastes a PNG from Illustrator, try to export the current
     * selection as SVG. If Illustrator has no selection, fall back to the PNG.
     */
    function attachIllustratorSelectionAsSvgFallback(fallbackPng) {
        if (!TATA.host || typeof TATA.host.run !== 'function') {
            addAttachments([fallbackPng]);
            return;
        }

        TATA.host.run('hasSelection', {}, res => {
            let data;
            try {
                data = JSON.parse(String(res || '').replace(/^"|"$/g, ''));
            } catch (e) {
                data = { hasSelection: false };
            }

            if (data && data.hasSelection) {
                attachIllustratorSelection();
            } else {
                addAttachments([fallbackPng]);
            }
        });
    }

    // ==========================================
    // Init / Activate / Deactivate
    // ==========================================
    function setUsername(name) {
        chatState.username = name;
        localStorage.setItem('tata_chat_username', name);
        const whoami = $('chat_whoami');
        if (whoami) whoami.textContent = `Chatting as ${name}`;
        const rename = $('chat_rename');
        if (rename) rename.value = name;
    }

    function getRecentRooms() {
        try {
            const parsed = JSON.parse(localStorage.getItem('tata_chat_recent_rooms') || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function renderRecentRooms() {
        const list = $('chat_recent_rooms');
        if (!list) return;
        list.textContent = '';
        const rooms = getRecentRooms();
        if (!rooms.length) {
            const empty = document.createElement('div');
            empty.className = 'chat-room-empty';
            empty.textContent = 'Private rooms you join will appear here.';
            list.appendChild(empty);
            return;
        }

        rooms.forEach(room => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chat-room-recent';
            button.innerHTML = `<span>◆</span><span>${escapeHtml(room.name)}</span><code>${escapeHtml(room.slug)}</code>`;
            button.onclick = async () => {
                const savedPassword = sessionStorage.getItem(roomStorageKey(room.slug)) || '';
                if (!savedPassword) {
                    const codeInput = $('chat_join_code');
                    if (codeInput) codeInput.value = room.slug;
                    const passwordInput = $('chat_join_password');
                    if (passwordInput) passwordInput.focus();
                    return;
                }
                try {
                    await enterRoom(room.slug, savedPassword);
                } catch (e) {
                    sessionStorage.removeItem(roomStorageKey(room.slug));
                    safeToast(e.message, 'error');
                }
            };
            list.appendChild(button);
        });
    }

    async function runRoomAction(button, action) {
        if (button) button.disabled = true;
        try {
            await action();
        } catch (e) {
            safeToast(e.message, 'error');
        } finally {
            if (button) button.disabled = false;
        }
    }

    /**
     * Send the typed text and every staged attachment.
     * Attachments go one per message so each renders on its own.
     */
    async function submitChat() {
        if (chatState.sending) return;

        const input = $('chat_input');
        const text = input ? input.value.trim() : '';
        const attachments = chatState.attachments.slice();

        if (!text && !attachments.length) return;

        chatState.sending = true;
        const sendBtn = $('chat_send');
        if (sendBtn) sendBtn.disabled = true;

        try {
            let allOk = true;

            if (attachments.length) {
                // The caption rides along with the first image.
                for (let i = 0; i < attachments.length; i++) {
                    const caption = i === 0 ? text : '';
                    const ok = await sendMessage(caption, 'image', null, attachments[i].file);
                    if (!ok) {
                        allOk = false;
                        break;
                    }
                }
            } else {
                allOk = await sendMessage(text, 'text', null, null);
            }

            if (allOk) {
                if (input) input.value = '';
                clearAttachments();
            }
        } finally {
            chatState.sending = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    function initChat() {
        const input = $('chat_input');
        const sendBtn = $('chat_send');
        const imageBtn = $('chat_image_btn');
        const imageInput = $('chat_image_input');
        const selectionBtn = $('chat_selection_btn');
        const nameInput = $('chat_username');
        const nameBtn = $('chat_join');
        const chatSetup = $('chat_setup');
        const chatMain = $('chat_main');
        const settingsBtn = $('chat_settings_btn');
        const settingsPanel = $('chat_settings');
        const renameInput = $('chat_rename');
        const renameSave = $('chat_rename_save');
        const roomToggle = $('chat_room_toggle');
        const roomsPanel = $('chat_rooms_panel');
        const roomsClose = $('chat_rooms_close');
        const publicJoin = $('chat_public_join');
        const privateJoin = $('chat_private_join');
        const privateCreate = $('chat_private_create');

        // Restore username
        if (nameInput && chatState.username) {
            nameInput.value = chatState.username;
        }
        updateRoomUi();
        renderRecentRooms();

        // If already has username, show chat
        if (chatState.username && chatSetup && chatMain) {
            chatSetup.style.display = 'none';
            chatMain.style.display = 'flex';
            setUsername(chatState.username);
            activateChat();
        }

        // Join button
        if (nameBtn) {
            nameBtn.onclick = () => {
                const name = nameInput.value.trim();
                if (!name) {
                    safeToast('Enter your name', 'error');
                    return;
                }
                setUsername(name);
                if (chatSetup) chatSetup.style.display = 'none';
                if (chatMain) chatMain.style.display = 'flex';
                activateChat();
            };
        }

        // Settings drawer
        if (settingsBtn && settingsPanel) {
            settingsBtn.onclick = () => {
                const open = settingsPanel.style.display !== 'none';
                settingsPanel.style.display = open ? 'none' : 'block';
                if (!open && renameInput) {
                    renameInput.value = chatState.username;
                    renameInput.focus();
                    renameInput.select();
                }
            };
        }

        if (renameSave && renameInput) {
            const saveName = () => {
                const name = renameInput.value.trim();
                if (!name) {
                    safeToast('Name cannot be empty', 'error');
                    return;
                }
                if (name === chatState.username) {
                    if (settingsPanel) settingsPanel.style.display = 'none';
                    return;
                }
                setUsername(name);
                if (settingsPanel) settingsPanel.style.display = 'none';
                safeToast(`Now chatting as ${name}`, 'success');
            };

            renameSave.onclick = saveName;
            renameInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveName();
                }
            });
        }

        if (roomToggle && roomsPanel) {
            roomToggle.onclick = () => {
                roomsPanel.style.display = roomsPanel.style.display === 'none' ? 'flex' : 'none';
            };
        }
        if (roomsClose && roomsPanel) {
            roomsClose.onclick = () => { roomsPanel.style.display = 'none'; };
        }
        if (publicJoin) {
            publicJoin.onclick = () => runRoomAction(publicJoin, () => enterRoom('public', ''));
        }
        if (privateJoin) {
            privateJoin.onclick = () => runRoomAction(privateJoin, async () => {
                const slug = ($('chat_join_code').value || '').trim();
                const password = $('chat_join_password').value || '';
                if (!slug || !password) throw new Error('Enter the room code and password');
                await enterRoom(slug, password);
                $('chat_join_password').value = '';
            });
        }
        if (privateCreate) {
            privateCreate.onclick = () => runRoomAction(privateCreate, async () => {
                const name = ($('chat_create_name').value || '').trim();
                const password = $('chat_create_password').value || '';
                if (!name || !password) throw new Error('Enter a room name and password');
                const room = await roomRequest({
                    action: 'create',
                    name,
                    password,
                    username: chatState.username,
                });
                chatState.room = room;
                chatState.roomPassword = password;
                sessionStorage.setItem(roomStorageKey(room.slug), password);
                rememberRoom(room);
                clearRenderedMessages();
                updateRoomUi();
                roomsPanel.style.display = 'none';
                $('chat_create_name').value = '';
                $('chat_create_password').value = '';
                await pollMessages();
                try {
                    await copyText(room.slug);
                    safeToast(`Created ${room.name}. Invite code copied.`, 'success');
                } catch (e) {
                    safeToast(`Created ${room.name}. Invite code: ${room.slug}`, 'success');
                }
            });
        }

        // Attach files
        if (imageBtn && imageInput) {
            imageBtn.onclick = () => imageInput.click();
            imageInput.onchange = () => {
                addAttachments(imageInput.files);
                imageInput.value = '';
            };
        }

        // Attach current Illustrator selection as SVG
        if (selectionBtn) {
            selectionBtn.onclick = attachIllustratorSelection;
        }

        // Drag & drop and paste
        bindDropTarget(chatMain);
        if (input) input.addEventListener('paste', handlePaste);

        // Send
        if (sendBtn) sendBtn.onclick = submitChat;

        if (input) {
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitChat();
                }
            });
        }
    }

    function activateChat() {
        if (chatState.active) return;
        chatState.active = true;

        // Initial poll
        pollMessages();

        // Start polling
        chatState.pollTimer = setInterval(pollMessages, POLL_INTERVAL);
    }

    function deactivateChat() {
        chatState.active = false;
        if (chatState.pollTimer) {
            clearInterval(chatState.pollTimer);
            chatState.pollTimer = null;
        }
    }

    // ==========================================
    // Export
    // ==========================================
    TATA.chat = {
        init: initChat,
        activate: activateChat,
        deactivate: deactivateChat,
        shareButton: shareButtonToChat,
        sendMessage,
        _test: {
            renderMessage,
            copyMessage,
            getRoomHeaders,
            enterRoom,
            pollMessages,
        },
    };

    // Auto-init when DOM ready
    // Wait for TATA core to be available before binding
    function bootChat() {
        if (typeof window.TATA === 'undefined') {
            setTimeout(bootChat, 50);
            return;
        }
        initChat();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootChat);
    } else {
        bootChat();
    }

})();
