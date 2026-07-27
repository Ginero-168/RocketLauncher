/**
 * TATA Panel - Chat Module
 * Private team chat with code/button sharing via Hostinger PHP backend.
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

    function getRoomPassword() {
        return (window.TATA_CONFIG && TATA_CONFIG.CHAT_ROOM_PASSWORD) || '';
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
        let headers = {};
        if (isImage) {
            const isSvg = /svg/i.test(imageFile.type) || /\.svg$/i.test(imageFile.name || '');
            body = new FormData();
            body.append('username', chatState.username);
            body.append('content', content || (isSvg ? 'SVG selection' : imageFile.name || 'Image'));
            body.append('message_type', 'image');
            body.append('password', getRoomPassword());
            body.append('image', imageFile);
        } else {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify({
                username: chatState.username,
                content,
                message_type: type,
                button_data: buttonData || null,
                password: getRoomPassword(),
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

        chatState.polling = true;
        try {
            const res = await fetch(
                `${url}/poll.php?since=${chatState.lastId}&password=${encodeURIComponent(getRoomPassword())}`
            );
            const data = await res.json();
            if (data.ok && data.messages && data.messages.length > 0) {
                for (const msg of data.messages) {
                    renderMessage(msg);
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
        }
    }

    // ==========================================
    // Render
    // ==========================================
    function renderMessage(msg) {
        const container = $('chat_messages');
        if (!container) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'chat-msg';
        wrapper.dataset.id = msg.id;

        const isMe = msg.username === chatState.username;
        if (isMe) wrapper.classList.add('chat-msg-me');

        const header = document.createElement('div');
        header.className = 'chat-msg-header';
        header.innerHTML = `<span class="chat-msg-user">${escapeHtml(msg.username)}</span><span class="chat-msg-time">${formatTime(msg.created_at)}</span>`;
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
            meta.textContent = `${bd.icon || '★'} · ${bd.color || 'default'}`;
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
            const mediaUrl = `${getBackendUrl()}/${msg.file_path}`;

            if (isSvg) {
                const img = document.createElement('img');
                img.className = 'chat-msg-image';
                img.src = mediaUrl;
                img.alt = msg.content || 'SVG';
                img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40"><text y="20">SVG preview unavailable</text></svg>'; };
                img.onclick = () => {
                    try { window.open(mediaUrl, '_blank'); } catch (e) { }
                };
                wrapper.appendChild(img);
            } else {
                const img = document.createElement('img');
                img.className = 'chat-msg-image';
                img.src = mediaUrl;
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
    function setDropActive(active) {
        const zone = $('chat_dropzone');
        if (zone) zone.classList.toggle('active', active);
    }

    function bindDropTarget(target) {
        if (!target) return;

        target.addEventListener('dragenter', e => {
            e.preventDefault();
            e.stopPropagation();
            chatState.dragDepth++;
            setDropActive(true);
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
            if (text) attachFromPathOrUrl(text.trim());
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
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;

        const files = [];
        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) files.push(file);
            }
        }
        if (files.length) {
            e.preventDefault();
            addAttachments(files);
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

        // Restore username
        if (nameInput && chatState.username) {
            nameInput.value = chatState.username;
        }

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
