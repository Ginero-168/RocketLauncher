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

    let chatState = {
        username: localStorage.getItem('tata_chat_username') || '',
        lastId: 0,
        polling: false,
        pollTimer: null,
        active: false,
    };

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

    async function sendMessage(content, messageType, buttonData) {
        const url = getBackendUrl();
        if (!url) {
            TATA.showToast && TATA.showToast('Chat backend not configured', 'error');
            return false;
        }

        try {
            const res = await fetch(`${url}/send.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: chatState.username,
                    content,
                    message_type: messageType || 'text',
                    button_data: buttonData || null,
                    password: getRoomPassword(),
                }),
            });
            const data = await res.json();
            if (!data.ok) {
                TATA.showToast && TATA.showToast(`Chat error: ${data.error}`, 'error');
                return false;
            }
            // Immediately poll for new messages after sending
            pollMessages();
            return true;
        } catch (e) {
            TATA.showToast && TATA.showToast(`Chat send failed: ${e.message}`, 'error');
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
            TATA.showToast && TATA.showToast('Invalid button data', 'error');
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
            TATA.showToast && TATA.showToast(`Imported "${btnData.label}" to panel`, 'success');
            if (typeof TATA.renderGrid === 'function') TATA.renderGrid();
        } else {
            TATA.showToast && TATA.showToast('Panel not ready for import', 'error');
        }
    }

    // ==========================================
    // Share button to chat (called from context menu)
    // ==========================================
    async function shareButtonToChat(btnId) {
        if (!chatState.username) {
            TATA.showToast && TATA.showToast('Open Chat tab and enter your name first', 'error');
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
            TATA.showToast && TATA.showToast('Button not found', 'error');
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
            TATA.showToast && TATA.showToast(`Shared "${shareData.label}" to chat`, 'success');
        }
    }

    // ==========================================
    // Init / Activate / Deactivate
    // ==========================================
    function initChat() {
        const input = $('chat_input');
        const sendBtn = $('chat_send');
        const nameInput = $('chat_username');
        const nameBtn = $('chat_join');
        const chatSetup = $('chat_setup');
        const chatMain = $('chat_main');

        // Restore username
        if (nameInput && chatState.username) {
            nameInput.value = chatState.username;
        }

        // If already has username, show chat
        if (chatState.username && chatSetup && chatMain) {
            chatSetup.style.display = 'none';
            chatMain.style.display = 'flex';
            activateChat();
        }

        // Join button
        if (nameBtn) {
            nameBtn.onclick = () => {
                const name = nameInput.value.trim();
                if (!name) {
                    TATA.showToast && TATA.showToast('Enter your name', 'error');
                    return;
                }
                chatState.username = name;
                localStorage.setItem('tata_chat_username', name);
                if (chatSetup) chatSetup.style.display = 'none';
                if (chatMain) chatMain.style.display = 'flex';
                activateChat();
            };
        }

        // Send button
        if (sendBtn) {
            sendBtn.onclick = () => {
                const text = input ? input.value.trim() : '';
                if (!text) return;
                input.value = '';
                sendMessage(text, 'text', null);
            };
        }

        // Enter to send
        if (input) {
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendBtn.click();
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
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }

})();
