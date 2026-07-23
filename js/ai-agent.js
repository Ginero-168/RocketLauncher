/**
 * TATA Panel - AI Agent Module
 * Chat-based AI assistant for script generation
 * @version 1.0
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    // ==========================================
    // State
    // ==========================================
    let chatHistory = [];
    let isProcessing = false;

    // ==========================================
    // System Prompt
    // ==========================================
    function getAgentSystemPrompt() {
        return "You are an expert Adobe Illustrator automation assistant for the TATA Panel (Rocket Launcher) extension.\n" +
            "You help users create scripts for Adobe Illustrator.\n\n" +
            "===== RESPONSE FORMAT =====\n" +
            "For script generation, use [NAME][/NAME] [CODE][/CODE] tags.\n" +
            "For execution plans, use [PLAN]...[/PLAN] tags.\n" +
            "For general conversation, just respond normally.\n\n" +
            "===== CRITICAL ILLUSTRATOR RULES =====\n" +
            "1. This is Adobe Illustrator ONLY\n" +
            "2. Use doc.layers (not artLayers)\n" +
            "3. Always check app.documents.length > 0\n" +
            "4. Always use try-catch\n" +
            "5. Color objects need 'new' keyword\n\n";
    }

    // ==========================================
    // Chat UI Functions
    // ==========================================
    function addMessage(role, content, type) {
        type = type || 'text';
        const container = document.getElementById('chat_history');
        if (!container) return;

        const msg = document.createElement('div');
        msg.className = `agent-msg ${role}`;

        if (role === 'user') {
            msg.style.cssText = 'align-self:flex-end;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:8px 12px;border-radius:12px 12px 4px 12px;font-size:11px;max-width:80%;line-height:1.4;';
        } else if (role === 'assistant') {
            msg.style.cssText = 'align-self:flex-start;background:#1e1e3a;border:1px solid #2a2a4a;color:#d1d5db;padding:8px 12px;border-radius:12px 12px 12px 4px;font-size:11px;max-width:85%;line-height:1.5;white-space:pre-wrap;word-break:break-word;';
        } else if (role === 'system') {
            msg.style.cssText = 'padding:6px 10px;background:#0a0a1a;border-radius:6px;font-size:10px;color:#666;text-align:center;';
        }

        // Handle special content types
        if (type === 'code') {
            const codeBlock = document.createElement('pre');
            codeBlock.style.cssText = 'background:#0d0d1a;border:1px solid #2a2a4a;border-radius:6px;padding:8px;margin:6px 0;font-family:monospace;font-size:10px;overflow-x:auto;color:#a5b4fc;';
            codeBlock.textContent = content;

            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

            const actionRow = document.createElement('div');
            actionRow.style.cssText = 'display:flex;gap:4px;justify-content:flex-end;';

            const useBtn = document.createElement('button');
            useBtn.textContent = '📋 Use Code';
            useBtn.style.cssText = 'padding:2px 8px;font-size:9px;background:#6366f130;border:1px solid #6366f150;border-radius:4px;color:#a5b4fc;cursor:pointer;';
            useBtn.onclick = () => {
                const codeEl = document.getElementById('script_code');
                if (codeEl) {
                    codeEl.value = content;
                    const modal = document.getElementById('script_modal');

                    TATA.showToast && TATA.showToast('Code copied to editor!', 'success');
                }
            };
            actionRow.appendChild(useBtn);

            const saveBtn = document.createElement('button');
            saveBtn.textContent = '💾 Save as Button';
            saveBtn.style.cssText = 'padding:2px 8px;font-size:9px;background:#10b98130;border:1px solid #10b98150;border-radius:4px;color:#6ee7b7;cursor:pointer;';
            saveBtn.onclick = () => {
                if (typeof TATA.saveUserScript === 'function') {
                    const scriptName = `AI Script ${Math.floor(Math.random() * 1000)}`;
                    TATA.saveUserScript(scriptName, '🤖', content, 'purple', false, null, false);
                    TATA.showToast && TATA.showToast(`✅ Saved as button: ${scriptName}`, 'success');
                    saveBtn.textContent = '✅ Saved!';
                    saveBtn.disabled = true;
                } else {
                    TATA.showToast && TATA.showToast('saveUserScript not available', 'error');
                }
            };
            actionRow.appendChild(saveBtn);
            wrapper.appendChild(codeBlock);
            wrapper.appendChild(actionRow);
            msg.appendChild(wrapper);
        } else if (type === 'plan') {
            msg.innerHTML = `<div style="margin-bottom:4px;">📝 <b>Plan:</b></div><div style="font-size:10px;white-space:pre-wrap;color:#c4b5fd;line-height:1.5;">${escapeHtml(content)}</div>`;
        } else {
            msg.textContent = content;
        }

        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    }

    function setTyping(show) {
        const el = document.getElementById('agent_typing');
        if (el) el.style.display = show ? 'block' : 'none';
    }

    function clearChat() {
        const container = document.getElementById('chat_history');
        if (container) {
            container.innerHTML = '';
            addMessage('system', '💬 Chat cleared. Ready for new conversation.');
        }
        chatHistory = [];
    }

    // ==========================================
    // Core: Send Message
    // ==========================================
    async function sendMessage(text) {
        if (!text || !text.trim() || isProcessing) return;

        const userText = text.trim();
        addMessage('user', userText);

        // Build messages
        let systemPrompt = getAgentSystemPrompt();

        // Workspace Context: scan the active Illustrator document
        try {
            const wsContext = await new Promise(resolve => {
                if (TATA.host && TATA.host.run) {
                    TATA.host.run('getWorkspaceContext', undefined, result => {
                        resolve(result);
                    });
                } else {
                    resolve(null);
                }
            });
            if (wsContext && wsContext !== "EvalScript error." && wsContext.indexOf('{') === 0) {
                systemPrompt += `\n===== CURRENT WORKSPACE (Illustrator Document) =====\n${wsContext}\n\nUse this workspace data to answer questions about the document.\nWhen the user asks about objects, layers, colors, or text — reference THIS data.\nWhen generating code, use the object names and layer structure from THIS context.\nIf the user asks to modify specific text, find the matching TextFrame from the data.\n\n`;
            }
        } catch (wsErr) {
            // Workspace context is optional — continue without it
        }

        // Build conversation for API
        const messages = [];

        messages.push({
            role: "system",
            content: systemPrompt
        });

        if (chatHistory.length > 0) {
            for (let i = 0; i < chatHistory.length; i++) {
                let c = chatHistory[i].content;
                if (typeof c !== 'string') c = String(c);
                messages.push({
                    role: chatHistory[i].role === 'user' ? 'user' : 'model',
                    content: c
                });
            }
        }

        messages.push({
            role: "user",
            content: userText
        });



        isProcessing = true;
        setTyping(true);

        try {
            const geminiCall = TATA.callGemini || (window.TATA && window.TATA.callGemini);
            if (!geminiCall) {
                throw new Error('TATA.callGemini not available. Please refresh panel.');
            }
            const result = await geminiCall(messages);
            const responseText = result.text;

            // Update model badge
            const badge = document.getElementById('agent_model_badge');
            if (badge) badge.textContent = `(${result.model})`;

            chatHistory.push({ role: 'assistant', content: responseText });

            // Parse response for special tags
            parseAndDisplayResponse(responseText);

        } catch (e) {
            addMessage('system', `❌ Error: ${e.message}`);
        } finally {
            isProcessing = false;
            setTyping(false);
        }
    }

    // ==========================================
    // Parse AI Response Tags
    // ==========================================
    function parseAndDisplayResponse(text) {
        let remaining = text;

        // Check for [CODE] tags
        const codeMatch = text.match(/\[CODE\]([\s\S]*?)\[\/CODE\]/i);
        const nameMatch = text.match(/\[NAME\]([\s\S]*?)\[\/NAME\]/i);
        if (codeMatch) {
            remaining = remaining.replace(codeMatch[0], '').trim();
            if (nameMatch) remaining = remaining.replace(nameMatch[0], '').trim();
            if (remaining) addMessage('assistant', remaining);
            addMessage('assistant', codeMatch[1].trim(), 'code');
            return;
        }

        // Check for [PLAN] tags
        const planMatch = text.match(/\[PLAN\]([\s\S]*?)\[\/PLAN\]/i);
        if (planMatch) {
            remaining = remaining.replace(planMatch[0], '').trim();
            if (remaining) addMessage('assistant', remaining);
            addMessage('assistant', planMatch[1].trim(), 'plan');
            return;
        }

        // Plain text
        addMessage('assistant', text);
    }

    // ==========================================
    // UI Initialization
    // ==========================================

    function initAgent() {
        // AI chat is wired by scripting.js; no mode switching needed.
    }



    function openAgentModal() {
        const aiTabBtn = document.querySelector('.tab-btn[data-tab="tab_ai"]');
        if (aiTabBtn) {
            // Because TATA.switchTab might not be exposed exactly this way depending on how core.js loaded it
            // Let's just directly call the click event which is guaranteed to work
            aiTabBtn.click();
        }

        const input = document.getElementById('prompt_input');
        if (input) {
            setTimeout(() => { input.focus(); }, 100);
        }
    }


    // ==========================================
    // Utility
    // ==========================================
    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ==========================================
    // Export to TATA namespace
    // ==========================================
    TATA.AIAgent = {
        init: initAgent,
        sendMessage,
        openChat: openAgentModal,
        clearChat
    };

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAgent);
    } else {
        initAgent();
    }

})();
