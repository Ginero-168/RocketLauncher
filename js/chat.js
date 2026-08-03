/**
 * TATA Panel - Chat Module
 * Public and password-protected text chat with button sharing.
 * Polls every 10 seconds (non-real-time).
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    const POLL_INTERVAL = 10000; // 10 seconds
    const MAX_MESSAGES = 200;    // keep last N in DOM

    let chatState = {
        username: localStorage.getItem('tata_chat_username') || '',
        lastId: 0,
        polling: false,
        pollTimer: null,
        active: false,
        sending: false,
        chatColor: localStorage.getItem('tata_chat_color') || '#6366f1',
        room: { slug: 'public', name: 'Public Lounge', is_private: false },
        roomPassword: '',
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

    async function sendMessage(content, messageType, buttonData) {
        const url = getBackendUrl();
        if (!url) {
            safeToast('Chat backend not configured', 'error');
            return false;
        }

        try {
            const res = await fetch(`${url}/send.php`, {
                method: 'POST',
                headers: getRoomHeaders(true),
                body: JSON.stringify({
                    username: chatState.username,
                    content,
                    message_type: messageType || 'text',
                    button_data: buttonData || null,
                }),
            });
            const data = await res.json();
            if (!data.ok) {
                safeToast(`Chat error: ${data.error}`, 'error');
                return false;
            }
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
    function copyTextWithSelection(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        let copied = false;
        try {
            copied = document.execCommand('copy');
        } finally {
            textarea.remove();
        }
        if (!copied) throw new Error('Clipboard unavailable');
    }

    async function copyText(value) {
        const text = String(value || '');

        // Chromium exposes navigator.clipboard inside CEP, but Adobe's embedded
        // origin commonly rejects writes with "Write permission denied." Use
        // the selection-based clipboard path synchronously in that environment.
        if (window.__adobe_cep__) {
            copyTextWithSelection(text);
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return;
            } catch (e) {
                // Fall through for browsers/embedded runtimes that expose the
                // API without granting clipboard-write permission.
            }
        }
        copyTextWithSelection(text);
    }

    async function copyMessage(msg) {
        if (msg.message_type === 'button_config' && msg.button_data) {
            await copyText(JSON.stringify(msg.button_data, null, 2));
            return 'Button configuration copied';
        }
        await copyText(msg.content || '');
        return 'Message copied';
    }

    async function renderMessage(msg, expectedRoomSlug) {
        const container = $('chat_messages');
        if (!container) return;
        const roomSlug = expectedRoomSlug || chatState.room.slug;

        const wrapper = document.createElement('div');
        wrapper.className = 'chat-msg';
        wrapper.dataset.id = msg.id;

        const isMe = msg.username === chatState.username;
        if (isMe) {
            wrapper.classList.add('chat-msg-me');
            wrapper.style.setProperty('--chat-accent', chatState.chatColor);
        }

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
            const iconLabel = bd.icon || '★';
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

        if (chatState.room.slug !== roomSlug) return;
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

    function isValidColor(value) {
        return /^#[0-9a-f]{6}$/i.test(value || '');
    }

    function setChatColor(value) {
        const color = isValidColor(value) ? value.toLowerCase() : '#6366f1';
        chatState.chatColor = color;
        localStorage.setItem('tata_chat_color', color);
        const input = $('chat_color');
        const label = $('chat_color_value');
        if (input) input.value = color;
        if (label) label.textContent = color;
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

    async function submitChat() {
        if (chatState.sending) return;
        const input = $('chat_input');
        const text = input ? input.value.trim() : '';
        if (!text) return;

        chatState.sending = true;
        const sendBtn = $('chat_send');
        if (sendBtn) sendBtn.disabled = true;
        try {
            if (await sendMessage(text, 'text', null) && input) input.value = '';
        } finally {
            chatState.sending = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    function initChat() {
        const input = $('chat_input');
        const sendBtn = $('chat_send');
        const nameInput = $('chat_username');
        const nameBtn = $('chat_join');
        const chatSetup = $('chat_setup');
        const chatMain = $('chat_main');
        const settingsBtn = $('chat_settings_btn');
        const settingsPanel = $('chat_settings');
        const renameInput = $('chat_rename');
        const renameSave = $('chat_rename_save');
        const colorInput = $('chat_color');
        const colorReset = $('chat_color_reset');
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
        setChatColor(chatState.chatColor);

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

        if (colorInput) {
            colorInput.oninput = () => setChatColor(colorInput.value);
        }
        if (colorReset) {
            colorReset.onclick = () => setChatColor('#6366f1');
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
