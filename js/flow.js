/**
 * Rocket Launcher - Flow Module v2.1
 * Advanced Action Playlist with Control Flow
 * Step Types: script, code, loop, condition, stop, input, alert, flow
 * Features: disable, onError, progress, edit all types, duplicate, import/export
 * @version 2.1
 */
(function () {
	'use strict';

	window.TATA = window.TATA || {};

	var FLOW_KEY = 'rocket_launcher_flows';
	var flows = [];
	var currentFlowId = null;
	var isPlaying = false;
	var MAX_LOOP = 100;
	var MAX_DEPTH = 5;
	var TIMEOUT_MS = 30000;

	// Execution state for progress UI
	var executionState = { currentStep: 0, totalSteps: 0, flowId: null };

	// ==========================================
	// Step Type Config (color + icon + label)
	// ==========================================
	var STEP_TYPES = {
		script: { color: '#3b82f6', icon: '▶', label: 'Script' },
		code: { color: '#8b5cf6', icon: '{ }', label: 'Code' },
		loop: { color: '#f59e0b', icon: '🔁', label: 'Loop' },
		condition: { color: '#06b6d4', icon: '⑂', label: 'If / Else' },
		stop: { color: '#ef4444', icon: '⏹', label: 'Stop' },
		input: { color: '#10b981', icon: '📝', label: 'Input' },
		alert: { color: '#f97316', icon: '💬', label: 'Alert' },
		flow: { color: '#a855f7', icon: '🎬', label: 'Flow' }
	};

	// ==========================================
	// Script Parameter Registry
	// ==========================================
	var SCRIPT_PARAM_REGISTRY = {
		'ArrangeDialog.jsx': {
			name: 'Arrange Objects',
			params: [
				{ key: 'cols', label: 'Columns', type: 'number', default: '5' },
				{ key: 'gap', label: 'Gap (px)', type: 'number', default: '20' }
			]
		},
		'ResizeDialog.jsx': {
			name: 'Resize Objects',
			params: [
				{ key: 'width', label: 'Width (px)', type: 'number', default: '100' }
			]
		},
		'DimensionDialog.jsx': {
			name: 'Dimension Tool',
			params: [
				{ key: 'size', label: 'Label Size %', type: 'number', default: '100' },
				{ key: 'name', label: 'Artboard Name', type: 'text', default: '' },
				{ key: 'allArtboards', label: 'All Artboards', type: 'checkbox', default: false }
			]
		},
		'SmartClean.jsx': {
			name: 'Smart Clean',
			params: [
				{ key: 'stray', label: 'Remove Stray Points', type: 'checkbox', default: true },
				{ key: 'empty', label: 'Remove Empty Frames', type: 'checkbox', default: true },
				{ key: 'outline', label: 'Text to Outlines', type: 'checkbox', default: false },
				{ key: 'unlock', label: 'Unlock Objects', type: 'checkbox', default: false }
			]
		}
	};

	// ==========================================
	// Data Management
	// ==========================================
	function loadFlows() {
		try {
			var data = localStorage.getItem(FLOW_KEY);
			flows = data ? JSON.parse(data) : [];
		} catch (e) { flows = []; }
		return flows;
	}

	function saveFlows() {
		localStorage.setItem(FLOW_KEY, JSON.stringify(flows));
	}

	function createFlow(name, description) {
		var flow = { id: 'flow_' + Date.now(), name: name || 'New Flow', description: description || '', steps: [], created: Date.now() };
		flows.push(flow);
		saveFlows();
		renderFlowList();
		return flow;
	}

	function deleteFlow(id) {
		flows = flows.filter(function (f) { return f.id !== id; });
		saveFlows();
		currentFlowId = null;
		renderFlowList();
	}

	function getFlow(id) {
		return flows.find(function (f) { return f.id === id; });
	}

	function generateId() {
		return 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
	}

	// Deep clone step with new IDs (for duplication)
	function regenerateIds(step) {
		var clone = JSON.parse(JSON.stringify(step));
		clone.id = generateId();
		if (clone.children) clone.children.forEach(function (c, i) { clone.children[i] = regenerateIds(c); });
		if (clone.thenSteps) clone.thenSteps.forEach(function (c, i) { clone.thenSteps[i] = regenerateIds(c); });
		if (clone.elseSteps) clone.elseSteps.forEach(function (c, i) { clone.elseSteps[i] = regenerateIds(c); });
		return clone;
	}

	// ==========================================
	// Step CRUD
	// ==========================================
	function addStepToList(stepsList, step) {
		stepsList.push(step);
		saveFlows();
	}

	function removeStepFromList(stepsList, stepId) {
		for (var i = 0; i < stepsList.length; i++) {
			if (stepsList[i].id === stepId) {
				stepsList.splice(i, 1);
				saveFlows();
				return true;
			}
			if (stepsList[i].children && removeStepFromList(stepsList[i].children, stepId)) return true;
			if (stepsList[i].thenSteps && removeStepFromList(stepsList[i].thenSteps, stepId)) return true;
			if (stepsList[i].elseSteps && removeStepFromList(stepsList[i].elseSteps, stepId)) return true;
		}
		return false;
	}

	function reorderSteps(stepsList, fromIdx, toIdx) {
		var item = stepsList.splice(fromIdx, 1)[0];
		stepsList.splice(toIdx, 0, item);
		saveFlows();
	}

	function duplicateStep(step, idx, stepsList, flowId) {
		var clone = regenerateIds(step);
		clone.name = step.name + ' (copy)';
		stepsList.splice(idx + 1, 0, clone);
		saveFlows();
		renderFlowDetail(flowId);
	}

	function duplicateFlow(flowId) {
		var original = getFlow(flowId);
		if (!original) return;
		var clone = JSON.parse(JSON.stringify(original));
		clone.id = 'flow_' + Date.now();
		clone.name = original.name + ' (copy)';
		clone.created = Date.now();
		// Regenerate all step IDs
		clone.steps = clone.steps.map(function (s) { return regenerateIds(s); });
		flows.push(clone);
		saveFlows();
		renderFlowList();
	}

	// ==========================================
	// Import / Export
	// ==========================================
	function exportFlow(flowId) {
		var flow = getFlow(flowId);
		if (!flow) return;
		var json = JSON.stringify(flow, null, 2);
		var blob = new Blob([json], { type: 'application/json' });
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		a.href = url;
		a.download = flow.name.replace(/[^a-zA-Z0-9]/g, '_') + '.flow.json';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showToast('Flow exported!');
	}

	function importFlow() {
		var input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = function (e) {
			var file = e.target.files[0];
			if (!file) return;
			var reader = new FileReader();
			reader.onload = function (ev) {
				try {
					var data = JSON.parse(ev.target.result);
					if (!data.name || !data.steps) { showToast('Invalid flow file'); return; }
					data.id = 'flow_' + Date.now();
					data.created = Date.now();
					data.steps = data.steps.map(function (s) { return regenerateIds(s); });
					flows.push(data);
					saveFlows();
					renderFlowList();
					showToast('Flow imported: ' + data.name);
				} catch (err) {
					showToast('Failed to import flow');
				}
			};
			reader.readAsText(file);
		};
		input.click();
	}

	// ==========================================
	// Execution Engine
	// ==========================================
	function playFlow(flowId) {
		var flow = getFlow(flowId);
		if (!flow || flow.steps.length === 0) { showToast('No steps to run'); return; }
		if (isPlaying) { showToast('Flow already running'); return; }

		// Count runnable steps for progress
		executionState.totalSteps = countRunnableSteps(flow.steps);
		executionState.currentStep = 0;
		executionState.flowId = flowId;

		// Phase 1: Collect all input steps (skip disabled)
		var inputSteps = collectInputSteps(flow.steps);
		if (inputSteps.length > 0) {
			showInputCollectionForm(inputSteps, function (vars) {
				startExecution(flow, vars);
			});
		} else {
			startExecution(flow, {});
		}
	}

	function countRunnableSteps(steps) {
		var count = 0;
		for (var i = 0; i < steps.length; i++) {
			if (steps[i].disabled) continue;
			count++;
			if (steps[i].children) count += countRunnableSteps(steps[i].children);
			if (steps[i].thenSteps) count += countRunnableSteps(steps[i].thenSteps);
			if (steps[i].elseSteps) count += countRunnableSteps(steps[i].elseSteps);
		}
		return count;
	}

	function collectInputSteps(steps) {
		var inputs = [];
		for (var i = 0; i < steps.length; i++) {
			if (steps[i].disabled) continue;
			if (steps[i].type === 'input') inputs.push(steps[i]);
			if (steps[i].children) inputs = inputs.concat(collectInputSteps(steps[i].children));
			if (steps[i].thenSteps) inputs = inputs.concat(collectInputSteps(steps[i].thenSteps));
			if (steps[i].elseSteps) inputs = inputs.concat(collectInputSteps(steps[i].elseSteps));
		}
		return inputs;
	}

	function startExecution(flow, vars) {
		isPlaying = true;
		var cs = TATA.getCSInterface ? TATA.getCSInterface() : null;
		if (!cs) { showToast('CSInterface not available'); isPlaying = false; return; }

		var context = { cs: cs, vars: vars, depth: 0 };
		updateProgressUI();

		executeSteps(flow.steps, context, 0, function () {
			isPlaying = false;
			clearStepHighlights();
			executionState.flowId = null;
			updateProgressUI();
			showToast('Flow completed!');
		});
	}

	function executeSteps(steps, context, index, done) {
		if (index >= steps.length || !isPlaying) {
			if (done) done();
			return;
		}
		if (context.depth > MAX_DEPTH) {
			showToast('Max nesting depth exceeded');
			isPlaying = false;
			return;
		}

		var step = steps[index];

		// Skip disabled steps
		if (step.disabled) {
			executeSteps(steps, context, index + 1, done);
			return;
		}

		var delay = step.delay || 0;

		// Update progress
		executionState.currentStep++;
		updateProgressUI();
		highlightStep(step.id, 'running');

		setTimeout(function () {
			if (!isPlaying) return;

			var onStepDone = function (err) {
				if (err) {
					highlightStep(step.id, 'error');
					var errorAction = step.onError || 'stop';
					if (errorAction === 'stop') {
						isPlaying = false;
						showToast('Step failed: ' + step.name);
						return;
					} else if (errorAction === 'skip' || errorAction === 'continue') {
						showToast('Step error (skipped): ' + step.name);
						executeSteps(steps, context, index + 1, done);
						return;
					}
				}
				highlightStep(step.id, 'completed');
				executeSteps(steps, context, index + 1, done);
			};

			switch (step.type) {

				case 'script':
					executeScriptStep(step, context, onStepDone);
					break;

				case 'code':
					executeCodeStep(step, context, onStepDone);
					break;

				case 'loop':
					executeLoopStep(step, context, function () {
						highlightStep(step.id, 'completed');
						executeSteps(steps, context, index + 1, done);
					});
					break;

				case 'condition':
					executeConditionStep(step, context, function () {
						highlightStep(step.id, 'completed');
						executeSteps(steps, context, index + 1, done);
					});
					break;

				case 'stop':
					isPlaying = false;
					highlightStep(step.id, 'completed');
					showToast(step.message || 'Flow stopped');
					break;

				case 'input':
					// Already collected before execution
					highlightStep(step.id, 'completed');
					executeSteps(steps, context, index + 1, done);
					break;

				case 'alert':
					showAlertModal(step.message || 'Alert', function () {
						highlightStep(step.id, 'completed');
						executeSteps(steps, context, index + 1, done);
					});
					break;

				case 'flow':
					executeFlowStep(step, context, onStepDone);
					break;

				default:
					executeSteps(steps, context, index + 1, done);
			}
		}, delay);
	}

	function executeScriptStep(step, context, callback) {
		var extensionPath = TATA.getExtensionPath ? TATA.getExtensionPath() : '';
		var scriptPath = extensionPath + '/jsx/' + step.scriptFile;

		// Build params with variable substitution
		var params = {};
		if (step.params) {
			for (var key in step.params) {
				var val = step.params[key];
				if (typeof val === 'string' && val.indexOf('{{') !== -1) {
					val = val.replace(/\{\{(\w+)\}\}/g, function (m, vName) {
						return context.vars[vName] !== undefined ? context.vars[vName] : '';
					});
				}
				params[key] = val;
			}
		}

		var code = 'try { var params = ' + JSON.stringify(params) + '; $.evalFile("' + scriptPath.replace(/\\/g, '/') + '"); } catch(e) { "Error: " + e.message; }';

		executeWithTimeout(context.cs, code, function (res) {
			var hasError = res && /Error|Exception/.test(res);
			context.vars['_lastResult'] = res || '';
			callback(hasError ? res : null);
		});
	}

	function executeCodeStep(step, context, callback) {
		if (!step.code || !step.code.trim()) { callback(null); return; }

		var code = step.code.replace(/\{\{(\w+)\}\}/g, function (m, vName) {
			return context.vars[vName] !== undefined ? context.vars[vName] : '';
		});

		executeWithTimeout(context.cs, code, function (res) {
			var hasError = res && /Error|Exception/.test(res);
			context.vars['_lastResult'] = res || '';
			callback(hasError ? res : null);
		});
	}

	function executeLoopStep(step, context, done) {
		var count = Math.min(parseInt(step.count) || 1, MAX_LOOP);
		var iteration = 0;

		function nextIteration() {
			if (iteration >= count || !isPlaying) { done(); return; }
			context.vars['_loopIndex'] = iteration;
			context.depth++;
			executeSteps(step.children || [], context, 0, function () {
				context.depth--;
				iteration++;
				nextIteration();
			});
		}
		nextIteration();
	}

	function executeConditionStep(step, context, done) {
		var expr = step.expression || 'false';

		expr = expr.replace(/\{\{(\w+)\}\}/g, function (m, vName) {
			return context.vars[vName] !== undefined ? context.vars[vName] : '';
		});

		context.cs.evalScript('(function(){ try { return (' + expr + ') ? "true" : "false"; } catch(e) { return "false"; } })()', function (res) {
			var isTruthy = res === 'true';
			var branch = isTruthy ? (step.thenSteps || []) : (step.elseSteps || []);
			context.depth++;
			executeSteps(branch, context, 0, function () {
				context.depth--;
				done();
			});
		});
	}

	function executeFlowStep(step, context, callback) {
		var targetFlow = getFlow(step.targetFlowId);
		if (!targetFlow) { callback('Target flow not found'); return; }
		if (context.depth >= MAX_DEPTH) { callback('Max nesting depth exceeded'); return; }

		context.depth++;
		executeSteps(targetFlow.steps, context, 0, function () {
			context.depth--;
			callback(null);
		});
	}

	// Timeout wrapper for evalScript
	function executeWithTimeout(cs, code, callback) {
		var timedOut = false;
		var timer = setTimeout(function () {
			timedOut = true;
			callback('Error: Step timed out after ' + (TIMEOUT_MS / 1000) + 's');
		}, TIMEOUT_MS);

		cs.evalScript(code, function (res) {
			if (timedOut) return;
			clearTimeout(timer);
			callback(res);
		});
	}

	// ==========================================
	// Progress & Highlighting
	// ==========================================
	function updateProgressUI() {
		var el = document.getElementById('flow_progress_indicator');
		if (!el) return;
		if (!isPlaying || !executionState.flowId) {
			el.style.display = 'none';
			return;
		}
		el.style.display = 'inline-flex';
		el.textContent = 'Step ' + executionState.currentStep + ' / ' + executionState.totalSteps;
	}

	function highlightStep(stepId, state) {
		var el = document.querySelector('[data-step-id="' + stepId + '"]');
		if (!el) return;
		el.classList.remove('running', 'completed', 'error');
		if (state) el.classList.add(state);
	}

	function clearStepHighlights() {
		var els = document.querySelectorAll('.flow-step.running, .flow-step.completed, .flow-step.error');
		for (var i = 0; i < els.length; i++) {
			els[i].classList.remove('running', 'completed', 'error');
		}
	}

	// ==========================================
	// Input Collection Form (Pre-run)
	// ==========================================
	function showInputCollectionForm(inputSteps, onComplete) {
		var overlay = createOverlay();
		var panel = createPanel('Flow Inputs', 300);

		var desc = document.createElement('div');
		desc.style.cssText = 'font-size: 10px; color: #888; margin-bottom: 8px;';
		desc.textContent = 'Fill in values before running the flow:';
		panel.appendChild(desc);

		var fields = [];
		inputSteps.forEach(function (step) {
			var group = document.createElement('div');
			group.style.cssText = 'display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px;';
			var label = document.createElement('label');
			label.style.cssText = 'font-size: 10px; color: #a0a0a0; text-transform: uppercase;';
			label.textContent = step.label || step.varName;
			var input = document.createElement('input');
			input.type = 'text';
			input.value = step.defaultValue || '';
			input.placeholder = step.varName;
			input.style.cssText = 'background: #1a1a2e; border: 1px solid #3a3a5c; color: #e0e0e0; padding: 8px 10px; border-radius: 6px; font-size: 11px; outline: none; width: 100%; box-sizing: border-box;';
			group.appendChild(label);
			group.appendChild(input);
			panel.appendChild(group);
			fields.push({ varName: step.varName, input: input });
		});

		var btnRow = createButtonRow();
		addCancelButton(btnRow, overlay);
		var runBtn = document.createElement('button');
		runBtn.textContent = '▶ Run Flow';
		runBtn.style.cssText = 'padding: 8px 16px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 6px; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer; margin: 0; width: auto;';
		runBtn.onclick = function () {
			var vars = {};
			fields.forEach(function (f) { vars[f.varName] = f.input.value; });
			document.body.removeChild(overlay);
			onComplete(vars);
		};
		btnRow.appendChild(runBtn);
		panel.appendChild(btnRow);

		overlay.appendChild(panel);
		document.body.appendChild(overlay);
	}

	// ==========================================
	// Alert Modal (During execution)
	// ==========================================
	function showAlertModal(message, onContinue) {
		var overlay = createOverlay();
		var panel = createPanel('Flow Alert', 280);

		var msg = document.createElement('div');
		msg.style.cssText = 'font-size: 12px; color: #e0e0e0; padding: 12px 0; text-align: center; line-height: 1.5;';
		msg.textContent = message;
		panel.appendChild(msg);

		var btnRow = createButtonRow();
		var okBtn = document.createElement('button');
		okBtn.textContent = 'Continue';
		okBtn.style.cssText = 'padding: 8px 20px; background: linear-gradient(135deg, #f97316, #ea580c); border: none; border-radius: 6px; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer; margin: 0 auto; width: auto; display: block;';
		okBtn.onclick = function () {
			document.body.removeChild(overlay);
			onContinue();
		};
		btnRow.style.justifyContent = 'center';
		btnRow.appendChild(okBtn);
		panel.appendChild(btnRow);

		overlay.appendChild(panel);
		document.body.appendChild(overlay);
	}

	function stopFlow() {
		isPlaying = false;
		clearStepHighlights();
		executionState.flowId = null;
		updateProgressUI();
		showToast('Flow stopped');
	}

	// ==========================================
	// UI - Initialize
	// ==========================================
	function initFlow() {
		loadFlows();
		renderFlowList();
	}

	// ==========================================
	// UI - Flow List
	// ==========================================
	function renderFlowList() {
		var container = document.getElementById('tab_flow');
		if (!container) return;
		currentFlowId = null;
		container.innerHTML = '';

		// Header
		var header = document.createElement('div');
		header.className = 'flow-list-header';

		var headerLeft = document.createElement('div');
		headerLeft.style.cssText = 'display: flex; align-items: center; gap: 6px;';
		headerLeft.innerHTML = '<span style="font-size: 11px; color: #888; font-weight: 600; text-transform: uppercase;">FLOWS</span>';

		var headerRight = document.createElement('div');
		headerRight.style.cssText = 'display: flex; gap: 4px;';

		// Import button
		var importBtn = document.createElement('button');
		importBtn.innerHTML = '↑';
		importBtn.title = 'Import Flow';
		importBtn.className = 'flow-header-btn';
		importBtn.onclick = function () { importFlow(); };

		// New Flow button
		var addBtn = document.createElement('button');
		addBtn.textContent = '+ New';
		addBtn.className = 'flow-header-btn flow-header-btn-primary';
		addBtn.onclick = function () { showCreateFlowModal(); };

		headerRight.appendChild(importBtn);
		headerRight.appendChild(addBtn);
		header.appendChild(headerLeft);
		header.appendChild(headerRight);
		container.appendChild(header);

		if (flows.length === 0) {
			var empty = document.createElement('div');
			empty.style.cssText = 'text-align: center; padding: 40px 20px; color: #666;';
			empty.innerHTML = '<div style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;">🎬</div><div style="font-size: 12px;">No flows yet</div><div style="font-size: 11px; color: #555; margin-top: 4px;">Create a flow to automate sequences of scripts</div>';
			container.appendChild(empty);
			return;
		}

		var list = document.createElement('div');
		list.style.cssText = 'display: flex; flex-direction: column; gap: 6px; flex: 1; overflow-y: auto;';

		flows.forEach(function (flow) {
			var item = document.createElement('div');
			item.className = 'flow-item';
			item.draggable = true;

			// Drag for hotkey bar
			item.addEventListener('dragstart', function (e) {
				e.dataTransfer.setData('text/plain', JSON.stringify({
					id: flow.id,
					label: flow.name,
					icon: null,
					type: 'flow',
					color: '#8b5cf6'
				}));
				document.body.classList.add('dragging-mode');
			});
			item.addEventListener('dragend', function () {
				document.body.classList.remove('dragging-mode');
			});

			var icon = document.createElement('div');
			icon.className = 'flow-item-icon';
			icon.textContent = '🎬';

			var info = document.createElement('div');
			info.className = 'flow-item-info';
			var stepCount = countAllSteps(flow.steps);
			var nameDiv = document.createElement('div');
			nameDiv.className = 'flow-item-name';
			nameDiv.textContent = flow.name;
			var metaDiv = document.createElement('div');
			metaDiv.className = 'flow-item-meta';
			metaDiv.textContent = stepCount + ' step' + (stepCount !== 1 ? 's' : '') + (flow.description ? ' — ' + flow.description : '');
			info.appendChild(nameDiv);
			info.appendChild(metaDiv);

			// Action buttons container
			var actions = document.createElement('div');
			actions.className = 'flow-item-actions';

			var playBtn = document.createElement('button');
			playBtn.textContent = '▶';
			playBtn.title = 'Play Flow';
			playBtn.className = 'flow-item-play';
			playBtn.onclick = function (e) { e.stopPropagation(); playFlow(flow.id); };

			// Export button
			var expBtn = document.createElement('button');
			expBtn.textContent = '↓';
			expBtn.title = 'Export Flow';
			expBtn.className = 'flow-item-action-btn';
			expBtn.onclick = function (e) { e.stopPropagation(); exportFlow(flow.id); };

			// Duplicate button
			var dupBtn = document.createElement('button');
			dupBtn.textContent = '📋';
			dupBtn.title = 'Duplicate Flow';
			dupBtn.className = 'flow-item-action-btn';
			dupBtn.onclick = function (e) { e.stopPropagation(); duplicateFlow(flow.id); };

			var delBtn = document.createElement('button');
			delBtn.textContent = '×';
			delBtn.title = 'Delete Flow';
			delBtn.className = 'flow-item-delete';
			delBtn.onclick = function (e) { e.stopPropagation(); if (confirm('Delete "' + flow.name + '"?')) deleteFlow(flow.id); };

			actions.appendChild(playBtn);
			actions.appendChild(expBtn);
			actions.appendChild(dupBtn);
			actions.appendChild(delBtn);

			item.onclick = function () { renderFlowDetail(flow.id); };

			item.appendChild(icon);
			item.appendChild(info);
			item.appendChild(actions);
			list.appendChild(item);
		});

		container.appendChild(list);
	}

	// Create Flow Modal (with description)
	function showCreateFlowModal() {
		var overlay = createOverlay();
		var panel = createPanel('Create Flow', 280);

		appendField(panel, 'Flow Name', 'flow_create_name', 'text', 'My Flow');
		appendField(panel, 'Description (optional)', 'flow_create_desc', 'text', 'What does this flow do?');

		var btnRow = createButtonRow();
		addCancelButton(btnRow, overlay);
		addConfirmButton(btnRow, 'Create', '#8b5cf6', '#7c3aed', function () {
			var name = panel.querySelector('#flow_create_name').value.trim();
			if (!name) { showToast('Please enter a name'); return; }
			var desc = panel.querySelector('#flow_create_desc').value.trim();
			document.body.removeChild(overlay);
			createFlow(name, desc);
		});
		panel.appendChild(btnRow);

		overlay.appendChild(panel);
		overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
		document.body.appendChild(overlay);
	}

	function countAllSteps(steps) {
		var count = 0;
		for (var i = 0; i < steps.length; i++) {
			count++;
			if (steps[i].children) count += countAllSteps(steps[i].children);
			if (steps[i].thenSteps) count += countAllSteps(steps[i].thenSteps);
			if (steps[i].elseSteps) count += countAllSteps(steps[i].elseSteps);
		}
		return count;
	}

	// ==========================================
	// UI - Flow Detail
	// ==========================================
	function renderFlowDetail(flowId) {
		var flow = getFlow(flowId);
		if (!flow) return;
		currentFlowId = flowId;

		var container = document.getElementById('tab_flow');
		if (!container) return;
		container.innerHTML = '';

		// Header
		var header = document.createElement('div');
		header.className = 'flow-detail-header';

		var backBtn = document.createElement('button');
		backBtn.textContent = '←';
		backBtn.className = 'flow-detail-back';
		backBtn.onclick = function () { renderFlowList(); };

		var titleWrap = document.createElement('div');
		titleWrap.style.cssText = 'flex: 1; min-width: 0;';
		var title = document.createElement('div');
		title.className = 'flow-detail-title';
		title.textContent = flow.name;
		titleWrap.appendChild(title);
		if (flow.description) {
			var desc = document.createElement('div');
			desc.style.cssText = 'font-size: 9px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
			desc.textContent = flow.description;
			titleWrap.appendChild(desc);
		}

		// Progress indicator
		var progressEl = document.createElement('span');
		progressEl.id = 'flow_progress_indicator';
		progressEl.className = 'flow-progress';
		progressEl.style.display = 'none';

		var stopBtn = document.createElement('button');
		stopBtn.innerHTML = '⏹';
		stopBtn.title = 'Stop Flow';
		stopBtn.className = 'flow-detail-stop';
		stopBtn.onclick = function () { stopFlow(); };

		var bigPlayBtn = document.createElement('button');
		bigPlayBtn.innerHTML = '▶ Play';
		bigPlayBtn.className = 'flow-detail-play';
		bigPlayBtn.onclick = function () { playFlow(flowId); };

		header.appendChild(backBtn);
		header.appendChild(titleWrap);
		header.appendChild(progressEl);
		header.appendChild(stopBtn);
		header.appendChild(bigPlayBtn);
		container.appendChild(header);

		// Steps container
		var stepsList = document.createElement('div');
		stepsList.id = 'flow_steps_' + flowId;
		stepsList.style.cssText = 'display: flex; flex-direction: column; gap: 4px; flex: 1; overflow-y: auto; padding: 4px 0;';

		if (flow.steps.length === 0) {
			stepsList.innerHTML = '<div style="text-align: center; padding: 30px; color: #666;"><div style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;">📋</div><div style="font-size: 11px;">No steps yet. Add steps below.</div></div>';
		} else {
			renderStepsList(stepsList, flow.steps, flowId, 0);
		}
		container.appendChild(stepsList);

		// Toolbar
		var toolbar = document.createElement('div');
		toolbar.className = 'flow-add-toolbar';

		var toolbarButtons = [
			{ type: 'script', label: '+ Script', handler: function () { showAddScriptModal(flowId, flow.steps); } },
			{ type: 'code', label: '+ Code', handler: function () { showAddCodeModal(flowId, flow.steps); } },
			{ type: 'loop', label: '+ Loop', handler: function () { showAddLoopModal(flowId, flow.steps); } },
			{ type: 'condition', label: '+ If/Else', handler: function () { showAddConditionModal(flowId, flow.steps); } },
			{ type: 'stop', label: '+ Stop', handler: function () { addStepToList(flow.steps, { id: generateId(), name: 'Stop', type: 'stop', message: 'Flow stopped', delay: 0, onError: 'stop' }); renderFlowDetail(flowId); } },
			{ type: 'input', label: '+ Input', handler: function () { showAddInputModal(flowId, flow.steps); } },
			{ type: 'alert', label: '+ Alert', handler: function () { showAddAlertModal(flowId, flow.steps); } },
			{ type: 'flow', label: '+ Flow', handler: function () { showAddFlowStepModal(flowId, flow.steps); } }
		];

		toolbarButtons.forEach(function (btn) {
			var el = document.createElement('button');
			el.textContent = btn.label;
			var cfg = STEP_TYPES[btn.type];
			el.className = 'flow-add-btn';
			el.style.cssText = 'background: ' + cfg.color + '22; border-color: ' + cfg.color + '44; color: ' + cfg.color + ';';
			el.onmouseenter = function () { this.style.background = cfg.color + '44'; };
			el.onmouseleave = function () { this.style.background = cfg.color + '22'; };
			el.onclick = btn.handler;
			toolbar.appendChild(el);
		});

		container.appendChild(toolbar);

		// Update progress if running
		updateProgressUI();
	}

	// ==========================================
	// UI - Render Steps (Recursive)
	// ==========================================
	function renderStepsList(container, steps, flowId, depth) {
		steps.forEach(function (step, idx) {
			var el = createStepElement(step, idx, steps, flowId, depth);
			container.appendChild(el);

			// Render nested children for loop
			if (step.type === 'loop' && step.children) {
				var nested = createNestedContainer('Loop Body (' + (step.count || 1) + 'x)', STEP_TYPES.loop.color);
				renderStepsList(nested.body, step.children, flowId, depth + 1);
				addNestedToolbar(nested.body, step.children, flowId, step);
				container.appendChild(nested.wrapper);
			}

			// Render nested children for condition
			if (step.type === 'condition') {
				if (step.thenSteps) {
					var thenNested = createNestedContainer('Then', STEP_TYPES.condition.color);
					renderStepsList(thenNested.body, step.thenSteps, flowId, depth + 1);
					addNestedToolbar(thenNested.body, step.thenSteps, flowId, step);
					container.appendChild(thenNested.wrapper);
				}
				if (step.elseSteps) {
					var elseNested = createNestedContainer('Else', '#f472b6');
					renderStepsList(elseNested.body, step.elseSteps, flowId, depth + 1);
					addNestedToolbar(elseNested.body, step.elseSteps, flowId, step);
					container.appendChild(elseNested.wrapper);
				}
			}
		});
	}

	function createNestedContainer(label, color) {
		var wrapper = document.createElement('div');
		wrapper.style.cssText = 'margin-left: 20px; border-left: 2px solid ' + color + '66; padding-left: 8px; margin-bottom: 4px;';

		var labelEl = document.createElement('div');
		labelEl.style.cssText = 'font-size: 9px; color: ' + color + '; text-transform: uppercase; font-weight: 600; padding: 2px 0; letter-spacing: 0.5px;';
		labelEl.textContent = label;
		wrapper.appendChild(labelEl);

		var body = document.createElement('div');
		body.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
		wrapper.appendChild(body);

		return { wrapper: wrapper, body: body };
	}

	function addNestedToolbar(body, stepsList, flowId, parentStep) {
		var addRow = document.createElement('div');
		addRow.style.cssText = 'display: flex; gap: 4px; padding: 4px 0;';

		['script', 'code', 'alert', 'stop'].forEach(function (type) {
			var btn = document.createElement('button');
			var cfg = STEP_TYPES[type];
			btn.textContent = '+' + cfg.label;
			btn.style.cssText = 'flex: 1; padding: 4px; background: transparent; border: 1px dashed ' + cfg.color + '44; border-radius: 3px; color: ' + cfg.color + '99; font-size: 9px; cursor: pointer; margin: 0;';
			btn.onclick = (function (t) {
				return function () {
					if (t === 'script') showAddScriptModal(flowId, stepsList);
					else if (t === 'code') showAddCodeModal(flowId, stepsList);
					else if (t === 'alert') showAddAlertModal(flowId, stepsList);
					else if (t === 'stop') {
						addStepToList(stepsList, { id: generateId(), name: 'Stop', type: 'stop', message: 'Flow stopped', delay: 0, onError: 'stop' });
						renderFlowDetail(flowId);
					}
				};
			})(type);
			addRow.appendChild(btn);
		});

		body.appendChild(addRow);
	}

	// ==========================================
	// Step Element (v2.1 — full controls)
	// ==========================================
	function createStepElement(step, idx, stepsList, flowId, depth) {
		var cfg = STEP_TYPES[step.type] || STEP_TYPES.code;
		var el = document.createElement('div');
		el.className = 'flow-step' + (step.disabled ? ' disabled' : '');
		el.dataset.index = idx;
		el.dataset.stepId = step.id;
		el.draggable = true;
		el.style.borderLeftColor = cfg.color;

		// Drag handle
		var handle = document.createElement('div');
		handle.className = 'flow-step-handle';
		handle.textContent = '⠿';

		// Type badge
		var badge = document.createElement('div');
		badge.className = 'flow-step-badge';
		badge.style.cssText = 'background: ' + cfg.color + '33; color: ' + cfg.color + ';';
		badge.textContent = cfg.icon;

		// Info
		var info = document.createElement('div');
		info.className = 'flow-step-info';
		var subtitle = getStepSubtitle(step);
		var nameEl = document.createElement('div');
		nameEl.className = 'flow-step-name';
		nameEl.textContent = step.name;
		var subEl = document.createElement('div');
		subEl.className = 'flow-step-subtitle';
		subEl.textContent = subtitle;
		info.appendChild(nameEl);
		info.appendChild(subEl);

		// Controls container
		var controls = document.createElement('div');
		controls.className = 'flow-step-controls';

		// 👁 Disable toggle
		var disableBtn = createControlButton(step.disabled ? '👁' : '👁', step.disabled ? 'Enable' : 'Disable', step.disabled ? '#888' : '#666');
		disableBtn.style.opacity = step.disabled ? '1' : '0.5';
		disableBtn.onclick = function (e) {
			e.stopPropagation();
			step.disabled = !step.disabled;
			saveFlows();
			renderFlowDetail(flowId);
		};

		// ▲ Move Up
		var upBtn = createControlButton('▲', 'Move Up', '#666');
		upBtn.onclick = function (e) {
			e.stopPropagation();
			if (idx > 0) { reorderSteps(stepsList, idx, idx - 1); renderFlowDetail(flowId); }
		};

		// ▼ Move Down
		var downBtn = createControlButton('▼', 'Move Down', '#666');
		downBtn.onclick = function (e) {
			e.stopPropagation();
			if (idx < stepsList.length - 1) { reorderSteps(stepsList, idx, idx + 1); renderFlowDetail(flowId); }
		};

		// ⚙ Edit (for ALL step types)
		var editBtn = createControlButton('⚙', 'Edit', '#888');
		editBtn.onclick = function (e) {
			e.stopPropagation();
			showEditStepModal(step, flowId, stepsList);
		};

		// 📋 Duplicate
		var dupBtn = createControlButton('📋', 'Duplicate', '#666');
		dupBtn.onclick = function (e) {
			e.stopPropagation();
			duplicateStep(step, idx, stepsList, flowId);
		};

		// × Remove
		var removeBtn = createControlButton('×', 'Remove', '#555');
		removeBtn.style.fontSize = '14px';
		removeBtn.onmouseenter = function () { this.style.color = '#ef4444'; };
		removeBtn.onmouseleave = function () { this.style.color = '#555'; };
		removeBtn.onclick = function (e) {
			e.stopPropagation();
			removeStepFromList(stepsList, step.id);
			renderFlowDetail(flowId);
		};

		controls.appendChild(disableBtn);
		controls.appendChild(upBtn);
		controls.appendChild(downBtn);
		controls.appendChild(editBtn);
		controls.appendChild(dupBtn);
		controls.appendChild(removeBtn);

		el.appendChild(handle);
		el.appendChild(badge);
		el.appendChild(info);
		el.appendChild(controls);

		// Drag & Drop
		el.addEventListener('dragstart', function (e) {
			e.dataTransfer.setData('text/plain', idx.toString());
			el.style.opacity = '0.5';
			e.stopPropagation();
		});
		el.addEventListener('dragend', function () { el.style.opacity = '1'; });
		el.addEventListener('dragover', function (e) { e.preventDefault(); el.style.borderColor = '#8b5cf6'; });
		el.addEventListener('dragleave', function () { el.style.borderColor = '#3a3a3a'; el.style.borderLeftColor = cfg.color; });
		el.addEventListener('drop', function (e) {
			e.preventDefault();
			e.stopPropagation();
			el.style.borderColor = '#3a3a3a';
			el.style.borderLeftColor = cfg.color;
			var fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
			var toIdx = parseInt(el.dataset.index);
			if (!isNaN(fromIdx) && !isNaN(toIdx) && fromIdx !== toIdx) {
				reorderSteps(stepsList, fromIdx, toIdx);
				renderFlowDetail(flowId);
			}
		});

		return el;
	}

	function createControlButton(text, title, color) {
		var btn = document.createElement('button');
		btn.textContent = text;
		btn.title = title;
		btn.className = 'flow-step-ctrl-btn';
		btn.style.color = color || '#666';
		return btn;
	}

	function getStepSubtitle(step) {
		switch (step.type) {
			case 'script':
				var paramStr = '';
				if (step.params) {
					var keys = Object.keys(step.params);
					paramStr = keys.map(function (k) { return k + '=' + step.params[k]; }).join(', ');
				}
				var extra = '';
				if (step.delay) extra += ' delay:' + step.delay + 'ms';
				if (step.onError && step.onError !== 'stop') extra += ' on-err:' + step.onError;
				return step.scriptFile + (paramStr ? ' (' + paramStr + ')' : '') + extra;
			case 'code':
				return step.code ? step.code.substring(0, 50) : 'No code';
			case 'loop':
				return 'Repeat ' + (step.count || 1) + ' times';
			case 'condition':
				return step.expression || 'No condition';
			case 'stop':
				return step.message || 'Stop flow';
			case 'input':
				return '{{' + (step.varName || '?') + '}} — ' + (step.label || 'No label');
			case 'alert':
				return step.message || 'No message';
			case 'flow':
				var target = getFlow(step.targetFlowId);
				return target ? 'Run: ' + target.name : 'Target not found';
			default:
				return '';
		}
	}

	// ==========================================
	// Universal Edit Step Modal
	// ==========================================
	function showEditStepModal(step, flowId, stepsList) {
		var overlay = createOverlay();
		var panel = createPanel('Edit: ' + step.name, 300);

		// Common: Name
		appendField(panel, 'Step Name', 'edit_step_name', 'text', step.name);
		panel.querySelector('#edit_step_name').value = step.name;

		// Common: Delay (for actionable types)
		if (['script', 'code', 'flow', 'alert'].indexOf(step.type) !== -1) {
			appendField(panel, 'Delay (ms)', 'edit_step_delay', 'number', '0');
			panel.querySelector('#edit_step_delay').value = step.delay || 0;
		}

		// Common: onError (for script, code, flow)
		if (['script', 'code', 'flow'].indexOf(step.type) !== -1) {
			appendSelectField(panel, 'On Error', 'edit_step_onerror', [
				{ value: 'stop', label: 'Stop Flow' },
				{ value: 'skip', label: 'Skip Step' },
				{ value: 'continue', label: 'Continue' }
			], step.onError || 'stop');
		}

		// Type-specific fields
		switch (step.type) {
			case 'script':
				appendReadOnlyField(panel, 'Script File', step.scriptFile || 'N/A');
				// Param fields
				var schema = step.paramSchema || (SCRIPT_PARAM_REGISTRY[step.scriptFile] || {}).params || [];
				var paramFields = [];
				schema.forEach(function (p) {
					if (p.type === 'checkbox') {
						var cbGroup = document.createElement('div');
						cbGroup.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
						var cb = document.createElement('input');
						cb.type = 'checkbox';
						cb.id = 'edit_param_' + p.key;
						cb.checked = step.params[p.key] === true || step.params[p.key] === 'true';
						cb.style.cssText = 'width: 14px; height: 14px;';
						var cbLabel = document.createElement('label');
						cbLabel.style.cssText = 'font-size: 10px; color: #a0a0a0;';
						cbLabel.textContent = p.label;
						cbGroup.appendChild(cb);
						cbGroup.appendChild(cbLabel);
						panel.appendChild(cbGroup);
						paramFields.push({ key: p.key, el: cb, type: 'checkbox' });
					} else {
						appendField(panel, p.label, 'edit_param_' + p.key, p.type === 'number' ? 'number' : 'text', p.default || '');
						var inp = panel.querySelector('#edit_param_' + p.key);
						inp.value = step.params[p.key] !== undefined ? step.params[p.key] : (p.default || '');
						paramFields.push({ key: p.key, el: inp, type: 'text' });
					}
				});
				break;

			case 'code':
				appendTextarea(panel, 'JSX Code', 'edit_step_code', '// JSX code...');
				panel.querySelector('#edit_step_code').value = step.code || '';
				break;

			case 'loop':
				appendField(panel, 'Repeat Count', 'edit_step_count', 'number', '5');
				panel.querySelector('#edit_step_count').value = step.count || 1;
				break;

			case 'condition':
				appendTextarea(panel, 'JSX Condition', 'edit_step_expr', 'app.activeDocument.selection.length > 0');
				panel.querySelector('#edit_step_expr').value = step.expression || '';
				break;

			case 'stop':
				appendField(panel, 'Message', 'edit_step_msg', 'text', 'Flow stopped');
				panel.querySelector('#edit_step_msg').value = step.message || '';
				break;

			case 'input':
				appendField(panel, 'Variable Name', 'edit_step_var', 'text', 'myValue');
				panel.querySelector('#edit_step_var').value = step.varName || '';
				appendField(panel, 'Label', 'edit_step_label', 'text', 'Enter value:');
				panel.querySelector('#edit_step_label').value = step.label || '';
				appendField(panel, 'Default Value', 'edit_step_default', 'text', '');
				panel.querySelector('#edit_step_default').value = step.defaultValue || '';
				break;

			case 'alert':
				appendTextarea(panel, 'Message', 'edit_step_alertmsg', 'Step completed!');
				panel.querySelector('#edit_step_alertmsg').value = step.message || '';
				break;

			case 'flow':
				var flowOptions = flows.filter(function (f) { return f.id !== flowId; }).map(function (f) { return { value: f.id, label: f.name }; });
				if (flowOptions.length === 0) flowOptions = [{ value: '', label: '(no other flows)' }];
				appendSelectField(panel, 'Target Flow', 'edit_step_targetflow', flowOptions, step.targetFlowId || '');
				break;
		}

		// Hint
		if (['script', 'code'].indexOf(step.type) !== -1) {
			var hint = document.createElement('div');
			hint.style.cssText = 'font-size: 9px; color: #666; margin-bottom: 4px;';
			hint.textContent = 'Use {{varName}} to reference Input step values.';
			panel.appendChild(hint);
		}

		// Buttons
		var btnRow = createButtonRow();
		addCancelButton(btnRow, overlay);
		addConfirmButton(btnRow, 'Save', '#3b82f6', '#2563eb', function () {
			// Read common fields
			step.name = panel.querySelector('#edit_step_name').value.trim() || step.name;

			var delayEl = panel.querySelector('#edit_step_delay');
			if (delayEl) step.delay = parseInt(delayEl.value) || 0;

			var onErrEl = panel.querySelector('#edit_step_onerror');
			if (onErrEl) step.onError = onErrEl.value;

			// Read type-specific fields
			switch (step.type) {
				case 'script':
					if (paramFields) {
						paramFields.forEach(function (f) {
							step.params[f.key] = f.type === 'checkbox' ? f.el.checked : f.el.value;
						});
					}
					break;
				case 'code':
					step.code = panel.querySelector('#edit_step_code').value;
					break;
				case 'loop':
					step.count = Math.min(Math.max(parseInt(panel.querySelector('#edit_step_count').value) || 1, 1), MAX_LOOP);
					break;
				case 'condition':
					step.expression = panel.querySelector('#edit_step_expr').value.trim() || 'false';
					break;
				case 'stop':
					step.message = panel.querySelector('#edit_step_msg').value.trim();
					break;
				case 'input':
					step.varName = panel.querySelector('#edit_step_var').value.trim() || step.varName;
					step.label = panel.querySelector('#edit_step_label').value.trim();
					step.defaultValue = panel.querySelector('#edit_step_default').value;
					step.name = 'Input: ' + step.varName;
					break;
				case 'alert':
					step.message = panel.querySelector('#edit_step_alertmsg').value.trim();
					break;
				case 'flow':
					step.targetFlowId = panel.querySelector('#edit_step_targetflow').value;
					break;
			}

			saveFlows();
			document.body.removeChild(overlay);
			renderFlowDetail(flowId);
		});
		panel.appendChild(btnRow);

		overlay.appendChild(panel);
		overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
		document.body.appendChild(overlay);
	}

	// ==========================================
	// Add Step Modals
	// ==========================================

	// --- Script ---
	function showAddScriptModal(flowId, stepsList) {
		var v2Layout = TATA.getV2Layout ? TATA.getV2Layout() : {};
		var items = v2Layout['tab_button'] || [];
		if (items.length === 0) { showToast('No scripts in Button tab'); return; }

		var overlay = createOverlay();
		var panel = createPanel('Add Script Step', 280);

		var list = document.createElement('div');
		list.style.cssText = 'overflow-y: auto; max-height: 50vh; display: flex; flex-direction: column; gap: 4px;';

		items.forEach(function (item) {
			var row = document.createElement('div');
			row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #1a1a2e; border: 1px solid #3a3a5c; border-radius: 6px; cursor: pointer; transition: all 0.15s;';
			row.onmouseenter = function () { this.style.borderColor = '#3b82f6'; this.style.background = '#252542'; };
			row.onmouseleave = function () { this.style.borderColor = '#3a3a5c'; this.style.background = '#1a1a2e'; };

			var iconDiv = document.createElement('div');
			iconDiv.style.cssText = 'width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;';
			iconDiv.innerHTML = item.icon || '▶';
			var svg = iconDiv.querySelector('svg');
			if (svg) { svg.setAttribute('width', '16'); svg.setAttribute('height', '16'); }

			var labelSpan = document.createElement('span');
			labelSpan.style.cssText = 'font-size: 11px; color: #e0e0e0; flex: 1;';
			labelSpan.textContent = item.label || 'Script';

			var scriptFile = item.script || '';
			var hasParams = SCRIPT_PARAM_REGISTRY[scriptFile];
			if (hasParams) {
				var paramBadge = document.createElement('span');
				paramBadge.style.cssText = 'font-size: 9px; color: #3b82f6; background: #3b82f622; padding: 1px 6px; border-radius: 10px;';
				paramBadge.textContent = 'params';
				row.appendChild(iconDiv);
				row.appendChild(labelSpan);
				row.appendChild(paramBadge);
			} else {
				row.appendChild(iconDiv);
				row.appendChild(labelSpan);
			}

			row.onclick = function () {
				document.body.removeChild(overlay);

				var newStep = {
					id: generateId(),
					name: item.label || 'Script',
					type: 'script',
					scriptFile: scriptFile,
					params: {},
					delay: 0,
					onError: 'stop'
				};

				if (hasParams) {
					var schema = SCRIPT_PARAM_REGISTRY[scriptFile];
					schema.params.forEach(function (p) {
						newStep.params[p.key] = p.default;
					});
					newStep.paramSchema = schema.params;
					addStepToList(stepsList, newStep);
					renderFlowDetail(flowId);
					showEditStepModal(newStep, flowId, stepsList);
				} else {
					if (scriptFile) {
						newStep.scriptFile = scriptFile;
					} else if (item.code) {
						newStep.type = 'code';
						newStep.code = item.code;
					}
					addStepToList(stepsList, newStep);
					renderFlowDetail(flowId);
				}
			};

			list.appendChild(row);
		});

		panel.appendChild(list);
		overlay.appendChild(panel);
		overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
		document.body.appendChild(overlay);
	}

	// --- Code ---
	function showAddCodeModal(flowId, stepsList) {
		var overlay = createOverlay();
		var panel = createPanel('Custom Code Step', 280);

		appendField(panel, 'Step Name', 'flow_code_name', 'text', 'My Step');
		appendTextarea(panel, 'JSX Code', 'flow_code_code', '// Enter JSX code...');
		appendField(panel, 'Delay (ms)', 'flow_code_delay', 'number', '0');
		appendSelectField(panel, 'On Error', 'flow_code_onerror', [
			{ value: 'stop', label: 'Stop Flow' },
			{ value: 'skip', label: 'Skip Step' },
			{ value: 'continue', label: 'Continue' }
		], 'stop');

		var btnRow = createButtonRow();
		addCancelButton(btnRow, overlay);
		addConfirmButton(btnRow, 'Add Step', '#8b5cf6', '#7c3aed', function () {
			var name = panel.querySelector('#flow_code_name').value.trim() || 'Custom Step';
			var code = panel.querySelector('#flow_code_code').value.trim();
			if (!code) { showToast('Please enter code'); return; }
			var delay = parseInt(panel.querySelector('#flow_code_delay').value) || 0;
			var onError = panel.querySelector('#flow_code_onerror').value;
			addStepToList(stepsList, { id: generateId(), name: name, type: 'code', code: code, delay: delay, onError: onError });
			document.body.removeChild(overlay);
			renderFlowDetail(flowId);
		});
		panel.appendChild(btnRow);

		overlay.appendChild(panel);
		overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
		document.body.appendChild(overlay);
	}

	// --- Loop ---
	function showAddLoopModal(flowId, stepsList) {
		var overlay = createOverlay();
		var panel = createPanel('Add Loop', 260);

		appendField(panel, 'Loop Name', 'flow_loop_name', 'text', 'Loop');
		appendField(panel, 'Repeat Count', 'flow_loop_count', 'number', '5');

		var btnRow = createButtonRow();
		addCancelButton(btnRow, overlay);
		addConfirmButton(btnRow, 'Add Loop', '#f59e0b', '#d97706', function () {
			var name = panel.querySelector('#flow_loop_name').value.trim() || 'Loop';
			var count = parseInt(panel.querySelector('#flow_loop_count').value) || 5;
			count = Math.min(Math.max(count, 1), MAX_LOOP);
			addStepToList(stepsList, { id: generateId(), name: name, type: 'loop', count: count, children: [], delay: 0 });
			document.body.removeChild(overlay);
			renderFlowDetail(flowId);
		});
		panel.appendChild(btnRow);

		overlay.appendChild(panel);
		overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
		document.body.appendChild(overlay);
	}

	// --- Condition ---
	function showAddConditionModal(flowId, stepsList) {
		var overlay = createOverlay();
		var panel = createPanel('Add Condition', 300);

		appendField(panel, 'Name', 'flow_cond_name', 'text', 'Check Selection');
		appendTextarea(panel, 'JSX Condition (must return truthy/falsy)', 'flow_cond_expr', 'app.activeDocument.selection.length > 0');

		var btnRow = createButtonRow();
		addCancelButton(btnRow, overlay);
		addConfirmButton(btnRow, 'Add Condition', '#06b6d4', '#0891b2', function () {
			var name = panel.querySelector('#flow_cond_name').value.trim() || 'Condition';
			var expr = panel.querySelector('#flow_cond_expr').value.trim() || 'false';
			addStepToList(stepsList, { id: generateId(), name: name, type: 'condition', expression: expr, thenSteps: [], elseSteps: [], delay: 0 });
			document.body.removeChild(overlay);
			renderFlowDetail(flowId);
		});
		panel.appendChild(btnRow);

		overlay.appendChild(panel);
		overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
		document.body.appendChild(overlay);
	}

	// --- Input ---
	function showAddInputModal(flowId, stepsList) {
		var overlay = createOverlay();
		var panel = createPanel('Add Input', 280);

		appendField(panel, 'Variable Name', 'flow_input_var', 'text', 'myValue');
		appendField(panel, 'Label (shown to user)', 'flow_input_label', 'text', 'Enter value:');
		appendField(panel, 'Default Value', 'flow_input_default', 'text', '');

		var btnRow = createButtonRow();
		addCancelButton(btnRow, overlay);
		addConfirmButton(btnRow, 'Add Input', '#10b981', '#059669', function () {
			var varName = panel.querySelector('#flow_input_var').value.trim();
			if (!varName) { showToast('Variable name is required'); return; }
			var label = panel.querySelector('#flow_input_label').value.trim() || varName;
			var def = panel.querySelector('#flow_input_default').value;
			addStepToList(stepsList, { id: generateId(), name: 'Input: ' + varName, type: 'input', varName: varName, label: label, defaultValue: def, delay: 0 });
			document.body.removeChild(overlay);
			renderFlowDetail(flowId);
		});
		panel.appendChild(btnRow);

		overlay.appendChild(panel);
		overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
		document.body.appendChild(overlay);
	}

	// --- Alert ---
	function showAddAlertModal(flowId, stepsList) {
		var overlay = createOverlay();
		var panel = createPanel('Add Alert', 280);

		appendTextarea(panel, 'Message', 'flow_alert_msg', 'Step completed!');

		var btnRow = createButtonRow();
		addCancelButton(btnRow, overlay);
		addConfirmButton(btnRow, 'Add Alert', '#f97316', '#ea580c', function () {
			var msg = panel.querySelector('#flow_alert_msg').value.trim() || 'Alert';
			addStepToList(stepsList, { id: generateId(), name: 'Alert', type: 'alert', message: msg, delay: 0 });
			document.body.removeChild(overlay);
			renderFlowDetail(flowId);
		});
		panel.appendChild(btnRow);

		overlay.appendChild(panel);
		overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
		document.body.appendChild(overlay);
	}

	// --- Flow Step ---
	function showAddFlowStepModal(flowId, stepsList) {
		var availableFlows = flows.filter(function (f) { return f.id !== flowId; });
		if (availableFlows.length === 0) { showToast('No other flows to reference'); return; }

		var overlay = createOverlay();
		var panel = createPanel('Add Flow Step', 280);

		var desc = document.createElement('div');
		desc.style.cssText = 'font-size: 10px; color: #888; margin-bottom: 8px;';
		desc.textContent = 'Select a flow to run as a sub-step:';
		panel.appendChild(desc);

		var list = document.createElement('div');
		list.style.cssText = 'overflow-y: auto; max-height: 40vh; display: flex; flex-direction: column; gap: 4px;';

		availableFlows.forEach(function (f) {
			var row = document.createElement('div');
			row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #1a1a2e; border: 1px solid #3a3a5c; border-radius: 6px; cursor: pointer; transition: all 0.15s;';
			row.onmouseenter = function () { this.style.borderColor = '#a855f7'; this.style.background = '#252542'; };
			row.onmouseleave = function () { this.style.borderColor = '#3a3a5c'; this.style.background = '#1a1a2e'; };

			var iconDiv = document.createElement('div');
			iconDiv.style.cssText = 'font-size: 16px; flex-shrink: 0;';
			iconDiv.textContent = '🎬';

			var labelSpan = document.createElement('span');
			labelSpan.style.cssText = 'font-size: 11px; color: #e0e0e0; flex: 1;';
			labelSpan.textContent = f.name;

			var stepCount = document.createElement('span');
			stepCount.style.cssText = 'font-size: 9px; color: #888;';
			stepCount.textContent = countAllSteps(f.steps) + ' steps';

			row.appendChild(iconDiv);
			row.appendChild(labelSpan);
			row.appendChild(stepCount);

			row.onclick = function () {
				document.body.removeChild(overlay);
				addStepToList(stepsList, {
					id: generateId(),
					name: 'Flow: ' + f.name,
					type: 'flow',
					targetFlowId: f.id,
					delay: 0,
					onError: 'stop'
				});
				renderFlowDetail(flowId);
			};

			list.appendChild(row);
		});

		panel.appendChild(list);
		overlay.appendChild(panel);
		overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
		document.body.appendChild(overlay);
	}

	// ==========================================
	// "Add to Flow" Picker (from context menu)
	// ==========================================
	function showAddToFlowPicker(item) {
		if (flows.length === 0) { showToast('Create a flow first'); return; }

		var overlay = createOverlay();
		var panel = createPanel('Add to Flow', 280);

		var desc = document.createElement('div');
		desc.style.cssText = 'font-size: 10px; color: #888; margin-bottom: 8px;';
		desc.textContent = 'Select a flow to add "' + (item.label || 'Script') + '" to:';
		panel.appendChild(desc);

		var list = document.createElement('div');
		list.style.cssText = 'overflow-y: auto; max-height: 50vh; display: flex; flex-direction: column; gap: 4px;';

		flows.forEach(function (flow) {
			var row = document.createElement('div');
			row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #1a1a2e; border: 1px solid #3a3a5c; border-radius: 6px; cursor: pointer; transition: all 0.15s;';
			row.onmouseenter = function () { this.style.borderColor = '#8b5cf6'; this.style.background = '#252542'; };
			row.onmouseleave = function () { this.style.borderColor = '#3a3a5c'; this.style.background = '#1a1a2e'; };

			var iconDiv = document.createElement('div');
			iconDiv.style.cssText = 'font-size: 16px; flex-shrink: 0;';
			iconDiv.textContent = '🎬';

			var labelSpan = document.createElement('span');
			labelSpan.style.cssText = 'font-size: 11px; color: #e0e0e0; flex: 1;';
			labelSpan.textContent = flow.name;

			var stepCountSpan = document.createElement('span');
			stepCountSpan.style.cssText = 'font-size: 9px; color: #888;';
			stepCountSpan.textContent = countAllSteps(flow.steps) + ' steps';

			row.appendChild(iconDiv);
			row.appendChild(labelSpan);
			row.appendChild(stepCountSpan);

			row.onclick = function () {
				document.body.removeChild(overlay);

				var scriptFile = item.script || '';
				var newStep;

				if (scriptFile) {
					newStep = {
						id: generateId(),
						name: item.label || 'Script',
						type: 'script',
						scriptFile: scriptFile,
						params: {},
						delay: 0,
						onError: 'stop'
					};
					// Add default params if available
					var schema = SCRIPT_PARAM_REGISTRY[scriptFile];
					if (schema) {
						schema.params.forEach(function (p) { newStep.params[p.key] = p.default; });
						newStep.paramSchema = schema.params;
					}
				} else if (item.code) {
					newStep = {
						id: generateId(),
						name: item.label || 'Code Step',
						type: 'code',
						code: item.code,
						delay: 0,
						onError: 'stop'
					};
				} else {
					showToast('Cannot add this item to flow');
					return;
				}

				addStepToList(flow.steps, newStep);
				saveFlows();
				showToast('Added to "' + flow.name + '"');
			};

			list.appendChild(row);
		});

		panel.appendChild(list);
		overlay.appendChild(panel);
		overlay.onclick = function (e) { if (e.target === overlay) document.body.removeChild(overlay); };
		document.body.appendChild(overlay);
	}

	// ==========================================
	// UI Helpers
	// ==========================================
	function createOverlay() {
		var overlay = document.createElement('div');
		overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);';
		return overlay;
	}

	function createPanel(title, width) {
		var panel = document.createElement('div');
		panel.style.cssText = 'background: #1e1e2e; border: 1px solid #333; border-radius: 12px; width: ' + (width || 280) + 'px; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.6); padding: 16px; gap: 4px;';
		var h = document.createElement('div');
		h.style.cssText = 'font-size: 13px; font-weight: 600; color: #e0e0e0; margin-bottom: 8px;';
		h.textContent = title;
		panel.appendChild(h);
		return panel;
	}

	function appendField(panel, label, id, type, placeholder) {
		var g = document.createElement('div');
		g.style.cssText = 'display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px;';
		var l = document.createElement('label');
		l.style.cssText = 'font-size: 10px; color: #888; text-transform: uppercase;';
		l.textContent = label;
		var i = document.createElement('input');
		i.type = type || 'text';
		i.id = id;
		i.placeholder = placeholder || '';
		i.style.cssText = 'background: #111; border: 1px solid #333; color: #e0e0e0; padding: 8px 10px; border-radius: 6px; font-size: 11px; outline: none; width: 100%; box-sizing: border-box;';
		g.appendChild(l);
		g.appendChild(i);
		panel.appendChild(g);
	}

	function appendTextarea(panel, label, id, placeholder) {
		var g = document.createElement('div');
		g.style.cssText = 'display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px;';
		var l = document.createElement('label');
		l.style.cssText = 'font-size: 10px; color: #888; text-transform: uppercase;';
		l.textContent = label;
		var t = document.createElement('textarea');
		t.id = id;
		t.placeholder = placeholder || '';
		t.style.cssText = 'background: #111; border: 1px solid #333; color: #e0e0e0; padding: 8px 10px; border-radius: 6px; font-size: 11px; font-family: monospace; height: 80px; resize: vertical; outline: none; width: 100%; box-sizing: border-box;';
		g.appendChild(l);
		g.appendChild(t);
		panel.appendChild(g);
	}

	function appendSelectField(panel, label, id, options, selected) {
		var g = document.createElement('div');
		g.style.cssText = 'display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px;';
		var l = document.createElement('label');
		l.style.cssText = 'font-size: 10px; color: #888; text-transform: uppercase;';
		l.textContent = label;
		var s = document.createElement('select');
		s.id = id;
		s.style.cssText = 'background: #111; border: 1px solid #333; color: #e0e0e0; padding: 8px 10px; border-radius: 6px; font-size: 11px; outline: none; width: 100%; box-sizing: border-box;';
		options.forEach(function (opt) {
			var o = document.createElement('option');
			o.value = opt.value;
			o.textContent = opt.label;
			if (opt.value === selected) o.selected = true;
			s.appendChild(o);
		});
		g.appendChild(l);
		g.appendChild(s);
		panel.appendChild(g);
	}

	function appendReadOnlyField(panel, label, value) {
		var g = document.createElement('div');
		g.style.cssText = 'display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px;';
		var l = document.createElement('label');
		l.style.cssText = 'font-size: 10px; color: #888; text-transform: uppercase;';
		l.textContent = label;
		var v = document.createElement('div');
		v.style.cssText = 'background: #111; border: 1px solid #222; color: #888; padding: 8px 10px; border-radius: 6px; font-size: 11px; font-family: monospace;';
		v.textContent = value;
		g.appendChild(l);
		g.appendChild(v);
		panel.appendChild(g);
	}

	function createButtonRow() {
		var row = document.createElement('div');
		row.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;';
		return row;
	}

	function addCancelButton(row, overlay) {
		var btn = document.createElement('button');
		btn.textContent = 'Cancel';
		btn.style.cssText = 'padding: 6px 14px; background: transparent; border: 1px solid #444; border-radius: 6px; color: #888; font-size: 11px; cursor: pointer; margin: 0; width: auto;';
		btn.onclick = function () { document.body.removeChild(overlay); };
		row.appendChild(btn);
	}

	function addConfirmButton(row, label, color1, color2, handler) {
		var btn = document.createElement('button');
		btn.textContent = label;
		btn.style.cssText = 'padding: 6px 14px; background: linear-gradient(135deg, ' + color1 + ', ' + color2 + '); border: none; border-radius: 6px; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer; margin: 0; width: auto;';
		btn.onclick = handler;
		row.appendChild(btn);
	}

	// ==========================================
	// Utilities
	// ==========================================
	function showToast(msg) {
		if (typeof TATA.showToast === 'function') {
			TATA.showToast(msg);
		} else {
			var t = document.getElementById('toast');
			if (t) { t.innerText = msg; t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 3000); }
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
	TATA.getFlows = function () { return flows; };
	TATA.getFlow = getFlow;
	TATA.SCRIPT_PARAM_REGISTRY = SCRIPT_PARAM_REGISTRY;
	TATA.showAddToFlowPicker = showAddToFlowPicker;
	TATA.exportFlow = exportFlow;
	TATA.importFlow = importFlow;

})();
