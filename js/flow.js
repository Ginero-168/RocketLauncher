/**
 * Rocket Launcher - Flow Module
 * Action Playlist System (like Photoshop Actions)
 * @version 1.0
 */
(function () {
    'use strict';

    window.TATA = window.TATA || {};

    var FLOW_KEY = 'rocket_launcher_flows';
    var flows = [];
    var currentFlowId = null;
    var isPlaying = false;

    // ==========================================
    // Data Management
    // ==========================================
    function loadFlows() {
        try {
            var data = localStorage.getItem(FLOW_KEY);
            flows = data ? JSON.parse(data) : [];
        } catch (e) {
            flows = [];
        }
        return flows;
    }

    function saveFlows() {
        localStorage.setItem(FLOW_KEY, JSON.stringify(flows));
    }

    function createFlow(name) {
        var flow = {
            id: 'flow_' + Date.now(),
            name: name || 'New Flow',
            steps: [],
            created: Date.now()
        };
        flows.push(flow);
        saveFlows();
        renderFlowList();
        return flow;
    }

    function deleteFlow(id) {
        flows = flows.filter(function (f) { return f.id !== id; });
        saveFlows();
        if (currentFlowId === id) {
            currentFlowId = null;
            renderFlowList();
        } else {
            renderFlowList();
        }
    }

    function getFlow(id) {
        return flows.find(function (f) { return f.id === id; });
    }

    // ==========================================
    // Step Management
    // ==========================================
    function addStep(flowId, step) {
        var flow = getFlow(flowId);
        if (!flow) return;
        flow.steps.push({
            id: 'step_' + Date.now(),
            name: step.name || 'Step ' + (flow.steps.length + 1),
            type: 'code',
            code: step.code || '',
            icon: step.icon || '▶',
            delay: step.delay || 0
        });
        saveFlows();
        renderFlowDetail(flowId);
    }

    function removeStep(flowId, stepId) {
        var flow = getFlow(flowId);
        if (!flow) return;
        flow.steps = flow.steps.filter(function (s) { return s.id !== stepId; });
        saveFlows();
        renderFlowDetail(flowId);
    }

    function reorderSteps(flowId, fromIdx, toIdx) {
        var flow = getFlow(flowId);
        if (!flow) return;
        var item = flow.steps.splice(fromIdx, 1)[0];
        flow.steps.splice(toIdx, 0, item);
        saveFlows();
    }

    // ==========================================
    // Execution
    // ==========================================
    function playFlow(flowId) {
        var flow = getFlow(flowId);
        if (!flow || flow.steps.length === 0) {
            showToast('No steps to run');
            return;
        }
        if (isPlaying) {
            showToast('Flow already running');
            return;
        }

        isPlaying = true;
        var cs = TATA.csInterface || new CSInterface();

        function runStep(index) {
            if (index >= flow.steps.length || !isPlaying) {
                isPlaying = false;
                updateStepStates(flowId, -1, 'done');
                showToast('Flow completed!');
                return;
            }

            var step = flow.steps[index];
            updateStepStates(flowId, index, 'running');

            var delay = step.delay || 0;
            setTimeout(function () {
                if (!step.code || !step.code.trim()) {
                    updateStepStates(flowId, index, 'completed');
                    runStep(index + 1);
                    return;
                }

                cs.evalScript(step.code, function (res) {
                    var hasError = res && /Error|Exception/.test(res);
                    updateStepStates(flowId, index, hasError ? 'error' : 'completed');

                    if (hasError) {
                        isPlaying = false;
                        showToast('Step failed: ' + step.name);
                        return;
                    }
                    runStep(index + 1);
                });
            }, delay);
        }

        runStep(0);
    }

    function stopFlow() {
        isPlaying = false;
        showToast('Flow stopped');
    }

    // ==========================================
    // UI Rendering
    // ==========================================
    function initFlow() {
        loadFlows();
        renderFlowList();
    }

    function renderFlowList() {
        var container = document.getElementById('tab_flow');
        if (!container) return;

        currentFlowId = null;
        container.innerHTML = '';

        // Header
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #333; margin-bottom: 8px;';
        header.innerHTML = '<span style="font-size: 11px; color: #888; font-weight: 600; text-transform: uppercase;">FLOWS</span>';

        var addBtn = document.createElement('button');
        addBtn.textContent = '+ New Flow';
        addBtn.style.cssText = 'padding: 4px 10px; background: #8b5cf6; border: none; border-radius: 4px; color: #fff; font-size: 11px; cursor: pointer; margin: 0; width: auto;';
        addBtn.onclick = function () {
            var name = prompt('Flow name:');
            if (name) createFlow(name);
        };
        header.appendChild(addBtn);
        container.appendChild(header);

        if (flows.length === 0) {
            var empty = document.createElement('div');
            empty.style.cssText = 'text-align: center; padding: 40px 20px; color: #666;';
            empty.innerHTML = '<div style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;">🎬</div><div style="font-size: 12px;">No flows yet</div><div style="font-size: 11px; color: #555; margin-top: 4px;">Create a flow to automate sequences of scripts</div>';
            container.appendChild(empty);
            return;
        }

        // Flow list
        var list = document.createElement('div');
        list.style.cssText = 'display: flex; flex-direction: column; gap: 6px; flex: 1; overflow-y: auto;';

        flows.forEach(function (flow) {
            var item = document.createElement('div');
            item.className = 'flow-item';
            item.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; cursor: pointer; transition: all 0.15s;';
            item.onmouseenter = function () { this.style.borderColor = '#8b5cf6'; this.style.background = '#302a3a'; };
            item.onmouseleave = function () { this.style.borderColor = '#3a3a3a'; this.style.background = '#2a2a2a'; };

            var icon = document.createElement('div');
            icon.style.cssText = 'width: 36px; height: 36px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;';
            icon.textContent = '🎬';

            var info = document.createElement('div');
            info.style.cssText = 'flex: 1; min-width: 0;';
            info.innerHTML = '<div style="font-size: 13px; font-weight: 600; color: #e0e0e0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHtml(flow.name) + '</div>' +
                '<div style="font-size: 10px; color: #888; margin-top: 2px;">' + flow.steps.length + ' step' + (flow.steps.length !== 1 ? 's' : '') + '</div>';

            var playBtn = document.createElement('button');
            playBtn.textContent = '▶';
            playBtn.title = 'Play Flow';
            playBtn.style.cssText = 'width: 32px; height: 32px; padding: 0; background: #10b981; border: none; border-radius: 50%; color: #fff; font-size: 14px; cursor: pointer; flex-shrink: 0; margin: 0; display: flex; align-items: center; justify-content: center;';
            playBtn.onclick = function (e) {
                e.stopPropagation();
                playFlow(flow.id);
            };

            var delBtn = document.createElement('button');
            delBtn.textContent = '×';
            delBtn.title = 'Delete Flow';
            delBtn.style.cssText = 'width: 24px; height: 24px; padding: 0; background: transparent; border: none; color: #666; font-size: 16px; cursor: pointer; flex-shrink: 0; margin: 0; display: flex; align-items: center; justify-content: center;';
            delBtn.onmouseenter = function () { this.style.color = '#ef4444'; };
            delBtn.onmouseleave = function () { this.style.color = '#666'; };
            delBtn.onclick = function (e) {
                e.stopPropagation();
                if (confirm('Delete "' + flow.name + '"?')) deleteFlow(flow.id);
            };

            item.onclick = function () { renderFlowDetail(flow.id); };

            item.appendChild(icon);
            item.appendChild(info);
            item.appendChild(playBtn);
            item.appendChild(delBtn);
            list.appendChild(item);
        });

        container.appendChild(list);
    }

    function renderFlowDetail(flowId) {
        var flow = getFlow(flowId);
        if (!flow) return;

        currentFlowId = flowId;
        var container = document.getElementById('tab_flow');
        if (!container) return;
        container.innerHTML = '';

        // Back + Title
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid #333; margin-bottom: 8px;';

        var backBtn = document.createElement('button');
        backBtn.textContent = '←';
        backBtn.style.cssText = 'width: 28px; height: 28px; padding: 0; background: #333; border: 1px solid #444; border-radius: 4px; color: #ccc; font-size: 14px; cursor: pointer; margin: 0; display: flex; align-items: center; justify-content: center;';
        backBtn.onclick = function () { renderFlowList(); };

        var title = document.createElement('span');
        title.style.cssText = 'flex: 1; font-size: 13px; font-weight: 600; color: #e0e0e0;';
        title.textContent = flow.name;

        var bigPlayBtn = document.createElement('button');
        bigPlayBtn.innerHTML = '▶ Play';
        bigPlayBtn.style.cssText = 'padding: 6px 16px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 20px; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; margin: 0; width: auto;';
        bigPlayBtn.onclick = function () { playFlow(flowId); };

        header.appendChild(backBtn);
        header.appendChild(title);
        header.appendChild(bigPlayBtn);
        container.appendChild(header);

        // Steps
        var stepsList = document.createElement('div');
        stepsList.id = 'flow_steps_' + flowId;
        stepsList.style.cssText = 'display: flex; flex-direction: column; gap: 6px; flex: 1; overflow-y: auto; padding: 4px 0;';

        if (flow.steps.length === 0) {
            stepsList.innerHTML = '<div style="text-align: center; padding: 30px; color: #666;"><div style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;">📋</div><div style="font-size: 11px;">No steps yet. Add steps below.</div></div>';
        } else {
            flow.steps.forEach(function (step, idx) {
                var stepEl = createStepElement(step, idx, flowId);
                stepsList.appendChild(stepEl);
            });
        }

        container.appendChild(stepsList);

        // Add Step Area
        var addArea = document.createElement('div');
        addArea.style.cssText = 'display: flex; gap: 8px; padding: 8px 0; border-top: 1px solid #333; flex-shrink: 0;';

        var addFromScripts = document.createElement('button');
        addFromScripts.textContent = '+ From Scripts';
        addFromScripts.style.cssText = 'flex: 1; padding: 8px; background: #333; border: 1px solid #444; border-radius: 6px; color: #ccc; font-size: 11px; cursor: pointer; margin: 0;';
        addFromScripts.onclick = function () { showAddFromScriptsModal(flowId); };

        var addCustom = document.createElement('button');
        addCustom.textContent = '+ Custom Code';
        addCustom.style.cssText = 'flex: 1; padding: 8px; background: #333; border: 1px solid #444; border-radius: 6px; color: #ccc; font-size: 11px; cursor: pointer; margin: 0;';
        addCustom.onclick = function () {
            showAddCustomCodeModal(flowId);
        };

        addArea.appendChild(addFromScripts);
        addArea.appendChild(addCustom);
        container.appendChild(addArea);
    }

    function createStepElement(step, idx, flowId) {
        var el = document.createElement('div');
        el.className = 'flow-step';
        el.dataset.stepId = step.id;
        el.dataset.index = idx;
        el.draggable = true;
        el.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; transition: all 0.2s;';

        // Drag handle
        var handle = document.createElement('div');
        handle.style.cssText = 'color: #555; cursor: grab; font-size: 12px; flex-shrink: 0;';
        handle.textContent = '⠿';

        // Number
        var num = document.createElement('div');
        num.style.cssText = 'width: 22px; height: 22px; background: #3a3a3a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa; flex-shrink: 0; font-weight: 600;';
        num.textContent = (idx + 1);

        // Info
        var info = document.createElement('div');
        info.style.cssText = 'flex: 1; min-width: 0;';
        info.innerHTML = '<div style="font-size: 12px; color: #ddd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHtml(step.name) + '</div>' +
            '<div style="font-size: 9px; color: #666; margin-top: 2px;">' + (step.code ? step.code.substring(0, 40) + '...' : 'No code') + '</div>';

        // Remove
        var removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.style.cssText = 'width: 20px; height: 20px; padding: 0; background: transparent; border: none; color: #555; font-size: 14px; cursor: pointer; flex-shrink: 0; margin: 0; display: flex; align-items: center; justify-content: center;';
        removeBtn.onmouseenter = function () { this.style.color = '#ef4444'; };
        removeBtn.onmouseleave = function () { this.style.color = '#555'; };
        removeBtn.onclick = function (e) {
            e.stopPropagation();
            removeStep(flowId, step.id);
        };

        el.appendChild(handle);
        el.appendChild(num);
        el.appendChild(info);
        el.appendChild(removeBtn);

        // Drag & Drop
        el.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData('text/plain', idx.toString());
            el.style.opacity = '0.5';
        });
        el.addEventListener('dragend', function () { el.style.opacity = '1'; });
        el.addEventListener('dragover', function (e) {
            e.preventDefault();
            el.style.borderColor = '#8b5cf6';
        });
        el.addEventListener('dragleave', function () { el.style.borderColor = '#3a3a3a'; });
        el.addEventListener('drop', function (e) {
            e.preventDefault();
            el.style.borderColor = '#3a3a3a';
            var fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            var toIdx = parseInt(el.dataset.index);
            if (fromIdx !== toIdx) {
                reorderSteps(flowId, fromIdx, toIdx);
                renderFlowDetail(flowId);
            }
        });

        return el;
    }

    function updateStepStates(flowId, activeIdx, state) {
        var stepsContainer = document.getElementById('flow_steps_' + flowId);
        if (!stepsContainer) return;

        var steps = stepsContainer.querySelectorAll('.flow-step');
        steps.forEach(function (el, idx) {
            if (idx < activeIdx) {
                el.style.borderColor = '#10b981';
                el.style.background = 'rgba(16, 185, 129, 0.1)';
            } else if (idx === activeIdx && state === 'running') {
                el.style.borderColor = '#f59e0b';
                el.style.background = 'rgba(245, 158, 11, 0.1)';
                el.style.animation = 'pulse 1s infinite';
            } else if (idx === activeIdx && state === 'error') {
                el.style.borderColor = '#ef4444';
                el.style.background = 'rgba(239, 68, 68, 0.1)';
                el.style.animation = 'none';
            } else if (idx === activeIdx && state === 'completed') {
                el.style.borderColor = '#10b981';
                el.style.background = 'rgba(16, 185, 129, 0.1)';
                el.style.animation = 'none';
            } else if (state === 'done') {
                el.style.borderColor = '#10b981';
                el.style.background = 'rgba(16, 185, 129, 0.05)';
                el.style.animation = 'none';
            } else {
                el.style.borderColor = '#3a3a3a';
                el.style.background = '#2a2a2a';
                el.style.animation = 'none';
            }
        });
    }

    // ==========================================
    // Add From Scripts — In-Panel Overlay
    // ==========================================
    function showAddFromScriptsModal(flowId) {
        var userScripts = TATA.getUserScripts ? TATA.getUserScripts() : {};
        var v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
        var items = v2Layout['tab_button'] || [];

        if (items.length === 0) {
            showToast('No scripts in Button tab to add');
            return;
        }

        // Create overlay
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);';

        var panel = document.createElement('div');
        panel.style.cssText = 'background: #252542; border: 1px solid #3a3a5c; border-radius: 12px; width: 260px; max-height: 70vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.6);';

        // Header
        var header = document.createElement('div');
        header.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid #3a3a5c; display: flex; justify-content: space-between; align-items: center;';
        header.innerHTML = '<span style="font-size: 12px; font-weight: 600; color: #e0e0e0;">Select Script</span>';
        var closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'width: 24px; height: 24px; padding: 0; background: transparent; border: none; color: #888; font-size: 18px; cursor: pointer; margin: 0; display: flex; align-items: center; justify-content: center;';
        closeBtn.onclick = function () { document.body.removeChild(overlay); };
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // List
        var list = document.createElement('div');
        list.style.cssText = 'overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px;';

        items.forEach(function (item) {
            var row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #1a1a2e; border: 1px solid #3a3a5c; border-radius: 8px; cursor: pointer; transition: all 0.15s;';
            row.onmouseenter = function () { this.style.borderColor = '#6366f1'; this.style.background = '#252542'; };
            row.onmouseleave = function () { this.style.borderColor = '#3a3a5c'; this.style.background = '#1a1a2e'; };

            var iconDiv = document.createElement('div');
            iconDiv.style.cssText = 'width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;';
            iconDiv.innerHTML = item.icon || '▶';
            var svg = iconDiv.querySelector('svg');
            if (svg) { svg.setAttribute('width', '18'); svg.setAttribute('height', '18'); }

            var label = document.createElement('span');
            label.style.cssText = 'font-size: 12px; color: #e0e0e0; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
            label.textContent = item.label || item.name || 'Script';

            row.appendChild(iconDiv);
            row.appendChild(label);

            row.onclick = function () {
                addStep(flowId, {
                    name: item.label || item.name || 'Script',
                    code: item.code || (item.script ? ('$.evalFile("' + (TATA.extensionPath || '') + '/jsx/' + item.script + '")') : ''),
                    icon: '▶'
                });
                document.body.removeChild(overlay);
            };

            list.appendChild(row);
        });

        panel.appendChild(list);
        overlay.appendChild(panel);
        overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
        document.body.appendChild(overlay);
    }

    // ==========================================
    // Add Custom Code — In-Panel Overlay
    // ==========================================
    function showAddCustomCodeModal(flowId) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);';

        var panel = document.createElement('div');
        panel.style.cssText = 'background: #252542; border: 1px solid #3a3a5c; border-radius: 12px; width: 280px; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.6); padding: 16px; gap: 12px;';

        panel.innerHTML =
            '<div style="font-size: 12px; font-weight: 600; color: #e0e0e0;">Custom Code Step</div>' +
            '<div style="display: flex; flex-direction: column; gap: 4px;">' +
            '  <label style="font-size: 10px; color: #888; text-transform: uppercase;">Step Name</label>' +
            '  <input type="text" id="flow_custom_name" placeholder="My Step" style="background: #1a1a2e; border: 1px solid #3a3a5c; color: #e0e0e0; padding: 8px 10px; border-radius: 6px; font-size: 11px; outline: none; width: 100%; box-sizing: border-box;">' +
            '</div>' +
            '<div style="display: flex; flex-direction: column; gap: 4px;">' +
            '  <label style="font-size: 10px; color: #888; text-transform: uppercase;">JSX Code</label>' +
            '  <textarea id="flow_custom_code" placeholder="// Enter JSX code..." style="background: #1a1a2e; border: 1px solid #3a3a5c; color: #e0e0e0; padding: 8px 10px; border-radius: 6px; font-size: 11px; font-family: monospace; height: 100px; resize: vertical; outline: none; width: 100%; box-sizing: border-box;"></textarea>' +
            '</div>';

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';

        var cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'padding: 6px 14px; background: transparent; border: 1px solid #3a3a5c; border-radius: 6px; color: #888; font-size: 11px; cursor: pointer; margin: 0; width: auto;';
        cancelBtn.onclick = function () { document.body.removeChild(overlay); };

        var addBtn = document.createElement('button');
        addBtn.textContent = 'Add Step';
        addBtn.style.cssText = 'padding: 6px 14px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 6px; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer; margin: 0; width: auto;';
        addBtn.onclick = function () {
            var code = panel.querySelector('#flow_custom_code').value.trim();
            var name = panel.querySelector('#flow_custom_name').value.trim() || 'Custom Step';
            if (!code) { showToast('Please enter JSX code'); return; }
            addStep(flowId, { name: name, code: code });
            document.body.removeChild(overlay);
        };

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(addBtn);
        panel.appendChild(btnRow);

        overlay.appendChild(panel);
        overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
        document.body.appendChild(overlay);
    }

    // ==========================================
    // Utilities
    // ==========================================
    function showToast(msg) {
        if (typeof TATA.showToast === 'function') {
            TATA.showToast(msg);
        } else {
            var t = document.getElementById('toast');
            if (t) {
                t.innerText = msg;
                t.classList.add('show');
                setTimeout(function () { t.classList.remove('show'); }, 3000);
            }
        }
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==========================================
    // Export
    // ==========================================
    TATA.initFlow = initFlow;
    TATA.playFlow = playFlow;
    TATA.stopFlow = stopFlow;

})();
