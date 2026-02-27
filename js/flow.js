/**
 * Rocket Launcher - Flow Module v2
 * Advanced Action Playlist with Control Flow
 * Step Types: script, code, loop, condition, stop, input, alert
 * @version 2.0
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
		alert: { color: '#f97316', icon: '💬', label: 'Alert' }
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

	function createFlow(name) {
		var flow = { id: 'flow_' + Date.now(), name: name || 'New Flow', steps: [], created: Date.now() };
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
			// Recurse into children
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

	// ==========================================
	// Execution Engine
	// ==========================================
	function playFlow(flowId) {
		var flow = getFlow(flowId);
		if (!flow || flow.steps.length === 0) { showToast('No steps to run'); return; }
		if (isPlaying) { showToast('Flow already running'); return; }

		// Phase 1: Collect all input steps
		var inputSteps = collectInputSteps(flow.steps);
		if (inputSteps.length > 0) {
			showInputCollectionForm(inputSteps, function (vars) {
				startExecution(flow, vars);
			});
		} else {
			startExecution(flow, {});
		}
	}

	function collectInputSteps(steps) {
		var inputs = [];
		for (var i = 0; i < steps.length; i++) {
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

		executeSteps(flow.steps, context, 0, function () {
			isPlaying = false;
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
		var delay = step.delay || 0;

		setTimeout(function () {
			if (!isPlaying) return;

			switch (step.type) {

				case 'script':
					executeScriptStep(step, context, function (err) {
						if (err) { isPlaying = false; showToast('Step failed: ' + step.name); return; }
						executeSteps(steps, context, index + 1, done);
					});
					break;

				case 'code':
					executeCodeStep(step, context, function (err) {
						if (err) { isPlaying = false; showToast('Step failed: ' + step.name); return; }
						executeSteps(steps, context, index + 1, done);
					});
					break;

				case 'loop':
					executeLoopStep(step, context, function () {
						executeSteps(steps, context, index + 1, done);
					});
					break;

				case 'condition':
					executeConditionStep(step, context, function () {
						executeSteps(steps, context, index + 1, done);
					});
					break;

				case 'stop':
					isPlaying = false;
					showToast(step.message || 'Flow stopped');
					break;

				case 'input':
					// Already collected before execution
					executeSteps(steps, context, index + 1, done);
					break;

				case 'alert':
					showAlertModal(step.message || 'Alert', function () {
						executeSteps(steps, context, index + 1, done);
					});
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
				// Substitute {{varName}} with context.vars values
				if (typeof val === 'string' && val.indexOf('{{') !== -1) {
					val = val.replace(/\{\{(\w+)\}\}/g, function (m, vName) {
						return context.vars[vName] !== undefined ? context.vars[vName] : '';
					});
				}
				params[key] = val;
			}
		}

		var code = 'try { var params = ' + JSON.stringify(params) + '; $.evalFile("' + scriptPath.replace(/\\/g, '/') + '"); } catch(e) { "Error: " + e.message; }';

		context.cs.evalScript(code, function (res) {
			var hasError = res && /Error|Exception/.test(res);
			callback(hasError ? res : null);
		});
	}

	function executeCodeStep(step, context, callback) {
		if (!step.code || !step.code.trim()) { callback(null); return; }

		// Substitute {{varName}} in code
		var code = step.code.replace(/\{\{(\w+)\}\}/g, function (m, vName) {
			return context.vars[vName] !== undefined ? context.vars[vName] : '';
		});

		context.cs.evalScript(code, function (res) {
			var hasError = res && /Error|Exception/.test(res);
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

		// Substitute variables
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

		var list = document.createElement('div');
		list.style.cssText = 'display: flex; flex-direction: column; gap: 6px; flex: 1; overflow-y: auto;';

		flows.forEach(function (flow) {
			var item = document.createElement('div');
			item.className = 'flow-item';
			item.draggable = true;
			item.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px; cursor: pointer; transition: all 0.15s;';
			item.onmouseenter = function () { this.style.borderColor = '#8b5cf6'; this.style.background = '#302a3a'; };
			item.onmouseleave = function () { this.style.borderColor = '#3a3a3a'; this.style.background = '#2a2a2a'; };

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
			icon.style.cssText = 'width: 36px; height: 36px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;';
			icon.textContent = '🎬';

			var info = document.createElement('div');
			info.style.cssText = 'flex: 1; min-width: 0;';
			var stepCount = countAllSteps(flow.steps);
			info.innerHTML = '<div style="font-size: 13px; font-weight: 600; color: #e0e0e0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHtml(flow.name) + '</div>' +
				'<div style="font-size: 10px; color: #888; margin-top: 2px;">' + stepCount + ' step' + (stepCount !== 1 ? 's' : '') + '</div>';

			var playBtn = document.createElement('button');
			playBtn.textContent = '▶';
			playBtn.title = 'Play Flow';
			playBtn.style.cssText = 'width: 32px; height: 32px; padding: 0; background: #10b981; border: none; border-radius: 50%; color: #fff; font-size: 14px; cursor: pointer; flex-shrink: 0; margin: 0; display: flex; align-items: center; justify-content: center;';
			playBtn.onclick = function (e) { e.stopPropagation(); playFlow(flow.id); };

			var delBtn = document.createElement('button');
			delBtn.textContent = '×';
			delBtn.title = 'Delete Flow';
			delBtn.style.cssText = 'width: 24px; height: 24px; padding: 0; background: transparent; border: none; color: #666; font-size: 16px; cursor: pointer; flex-shrink: 0; margin: 0; display: flex; align-items: center; justify-content: center;';
			delBtn.onmouseenter = function () { this.style.color = '#ef4444'; };
			delBtn.onmouseleave = function () { this.style.color = '#666'; };
			delBtn.onclick = function (e) { e.stopPropagation(); if (confirm('Delete "' + flow.name + '"?')) deleteFlow(flow.id); };

			item.onclick = function () { renderFlowDetail(flow.id); };

			item.appendChild(icon);
			item.appendChild(info);
			item.appendChild(playBtn);
			item.appendChild(delBtn);
			list.appendChild(item);
		});

		container.appendChild(list);
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
		header.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid #333; margin-bottom: 8px;';

		var backBtn = document.createElement('button');
		backBtn.textContent = '←';
		backBtn.style.cssText = 'width: 28px; height: 28px; padding: 0; background: #333; border: 1px solid #444; border-radius: 4px; color: #ccc; font-size: 14px; cursor: pointer; margin: 0; display: flex; align-items: center; justify-content: center;';
		backBtn.onclick = function () { renderFlowList(); };

		var title = document.createElement('span');
		title.style.cssText = 'flex: 1; font-size: 13px; font-weight: 600; color: #e0e0e0;';
		title.textContent = flow.name;

		var stopBtn = document.createElement('button');
		stopBtn.innerHTML = '⏹';
		stopBtn.title = 'Stop Flow';
		stopBtn.style.cssText = 'width: 28px; height: 28px; padding: 0; background: #333; border: 1px solid #444; border-radius: 4px; color: #ef4444; font-size: 12px; cursor: pointer; margin: 0; display: flex; align-items: center; justify-content: center;';
		stopBtn.onclick = function () { stopFlow(); };

		var bigPlayBtn = document.createElement('button');
		bigPlayBtn.innerHTML = '▶ Play';
		bigPlayBtn.style.cssText = 'padding: 6px 16px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 20px; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; margin: 0; width: auto;';
		bigPlayBtn.onclick = function () { playFlow(flowId); };

		header.appendChild(backBtn);
		header.appendChild(title);
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
		toolbar.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 0; border-top: 1px solid #333; flex-shrink: 0;';

		var toolbarButtons = [
			{ type: 'script', label: '+ Script', handler: function () { showAddScriptModal(flowId, flow.steps); } },
			{ type: 'code', label: '+ Code', handler: function () { showAddCodeModal(flowId, flow.steps); } },
			{ type: 'loop', label: '+ Loop', handler: function () { showAddLoopModal(flowId, flow.steps); } },
			{ type: 'condition', label: '+ If/Else', handler: function () { showAddConditionModal(flowId, flow.steps); } },
			{ type: 'stop', label: '+ Stop', handler: function () { addStepToList(flow.steps, { id: generateId(), name: 'Stop', type: 'stop', message: 'Flow stopped', delay: 0 }); renderFlowDetail(flowId); } },
			{ type: 'input', label: '+ Input', handler: function () { showAddInputModal(flowId, flow.steps); } },
			{ type: 'alert', label: '+ Alert', handler: function () { showAddAlertModal(flowId, flow.steps); } }
		];

		toolbarButtons.forEach(function (btn) {
			var el = document.createElement('button');
			el.textContent = btn.label;
			var cfg = STEP_TYPES[btn.type];
			el.style.cssText = 'flex: 1; min-width: 60px; padding: 6px 4px; background: ' + cfg.color + '22; border: 1px solid ' + cfg.color + '44; border-radius: 4px; color: ' + cfg.color + '; font-size: 10px; font-weight: 600; cursor: pointer; margin: 0; transition: all 0.15s;';
			el.onmouseenter = function () { this.style.background = cfg.color + '44'; };
			el.onmouseleave = function () { this.style.background = cfg.color + '22'; };
			el.onclick = btn.handler;
			toolbar.appendChild(el);
		});

		container.appendChild(toolbar);
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
						addStepToList(stepsList, { id: generateId(), name: 'Stop', type: 'stop', message: 'Flow stopped', delay: 0 });
						renderFlowDetail(flowId);
					}
				};
			})(type);
			addRow.appendChild(btn);
		});

		body.appendChild(addRow);
	}

	function createStepElement(step, idx, stepsList, flowId, depth) {
		var cfg = STEP_TYPES[step.type] || STEP_TYPES.code;
		var el = document.createElement('div');
		el.className = 'flow-step';
		el.dataset.index = idx;
		el.draggable = true;
		el.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #2a2a2a; border: 1px solid #3a3a3a; border-left: 3px solid ' + cfg.color + '; border-radius: 6px; transition: all 0.2s;';

		// Drag handle
		var handle = document.createElement('div');
		handle.style.cssText = 'color: #555; cursor: grab; font-size: 12px; flex-shrink: 0;';
		handle.textContent = '⠿';

		// Type badge
		var badge = document.createElement('div');
		badge.style.cssText = 'width: 24px; height: 24px; background: ' + cfg.color + '33; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; color: ' + cfg.color + ';';
		badge.textContent = cfg.icon;

		// Info
		var info = document.createElement('div');
		info.style.cssText = 'flex: 1; min-width: 0;';
		var subtitle = getStepSubtitle(step);
		info.innerHTML = '<div style="font-size: 11px; color: #ddd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHtml(step.name) + '</div>' +
			'<div style="font-size: 9px; color: #666; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHtml(subtitle) + '</div>';

		// Edit button (for steps with params)
		var editBtn = null;
		if (step.type === 'script' && step.params) {
			editBtn = document.createElement('button');
			editBtn.textContent = '⚙';
			editBtn.title = 'Edit Parameters';
			editBtn.style.cssText = 'width: 20px; height: 20px; padding: 0; background: transparent; border: none; color: #888; font-size: 12px; cursor: pointer; flex-shrink: 0; margin: 0; display: flex; align-items: center; justify-content: center;';
			editBtn.onmouseenter = function () { this.style.color = '#3b82f6'; };
			editBtn.onmouseleave = function () { this.style.color = '#888'; };
			editBtn.onclick = function (e) {
				e.stopPropagation();
				showEditParamsModal(step, flowId);
			};
		}

		// Remove button
		var removeBtn = document.createElement('button');
		removeBtn.textContent = '×';
		removeBtn.style.cssText = 'width: 20px; height: 20px; padding: 0; background: transparent; border: none; color: #555; font-size: 14px; cursor: pointer; flex-shrink: 0; margin: 0; display: flex; align-items: center; justify-content: center;';
		removeBtn.onmouseenter = function () { this.style.color = '#ef4444'; };
		removeBtn.onmouseleave = function () { this.style.color = '#555'; };
		removeBtn.onclick = function (e) {
			e.stopPropagation();
			removeStepFromList(stepsList, step.id);
			renderFlowDetail(flowId);
		};

		el.appendChild(handle);
		el.appendChild(badge);
		el.appendChild(info);
		if (editBtn) el.appendChild(editBtn);
		el.appendChild(removeBtn);

		// Drag & Drop
		el.addEventListener('dragstart', function (e) {
			e.dataTransfer.setData('text/plain', idx.toString());
			el.style.opacity = '0.5';
			e.stopPropagation();
		});
		el.addEventListener('dragend', function () { el.style.opacity = '1'; });
		el.addEventListener('dragover', function (e) { e.preventDefault(); el.style.borderColor = '#8b5cf6'; });
		el.addEventListener('dragleave', function () { el.style.borderColor = '#3a3a3a'; });
		el.addEventListener('drop', function (e) {
			e.preventDefault();
			e.stopPropagation();
			el.style.borderColor = '#3a3a3a';
			var fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
			var toIdx = parseInt(el.dataset.index);
			if (!isNaN(fromIdx) && !isNaN(toIdx) && fromIdx !== toIdx) {
				reorderSteps(stepsList, fromIdx, toIdx);
				renderFlowDetail(flowId);
			}
		});

		return el;
	}

	function getStepSubtitle(step) {
		switch (step.type) {
			case 'script':
				var paramStr = '';
				if (step.params) {
					var keys = Object.keys(step.params);
					paramStr = keys.map(function (k) { return k + '=' + step.params[k]; }).join(', ');
				}
				return step.scriptFile + (paramStr ? ' (' + paramStr + ')' : '');
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
			default:
				return '';
		}
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

			// Show param indicator
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
					delay: 0
				};

				// If script has params, show params form
				if (hasParams) {
					var schema = SCRIPT_PARAM_REGISTRY[scriptFile];
					schema.params.forEach(function (p) {
						newStep.params[p.key] = p.default;
					});
					newStep.paramSchema = schema.params;
					addStepToList(stepsList, newStep);
					renderFlowDetail(flowId);
					// Auto-open params editor
					showEditParamsModal(newStep, flowId);
				} else {
					// No params — build evalFile code
					var extensionPath = TATA.getExtensionPath ? TATA.getExtensionPath() : '';
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

	// --- Edit Params ---
	function showEditParamsModal(step, flowId) {
		var schema = step.paramSchema || (SCRIPT_PARAM_REGISTRY[step.scriptFile] || {}).params || [];
		if (schema.length === 0) return;

		var overlay = createOverlay();
		var panel = createPanel('Parameters: ' + step.name, 280);

		var fields = [];
		schema.forEach(function (p) {
			var group = document.createElement('div');
			group.style.cssText = 'display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px;';

			var label = document.createElement('label');
			label.style.cssText = 'font-size: 10px; color: #a0a0a0;';
			label.textContent = p.label;

			group.appendChild(label);

			if (p.type === 'checkbox') {
				var cb = document.createElement('input');
				cb.type = 'checkbox';
				cb.checked = step.params[p.key] === true || step.params[p.key] === 'true';
				cb.style.cssText = 'width: 16px; height: 16px;';
				group.appendChild(cb);
				fields.push({ key: p.key, el: cb, type: 'checkbox' });
			} else {
				var input = document.createElement('input');
				input.type = p.type === 'number' ? 'number' : 'text';
				input.value = step.params[p.key] !== undefined ? step.params[p.key] : (p.default || '');
				input.placeholder = p.default || '';
				input.style.cssText = 'background: #1a1a2e; border: 1px solid #3a3a5c; color: #e0e0e0; padding: 6px 8px; border-radius: 4px; font-size: 11px; outline: none; width: 100%; box-sizing: border-box;';
				group.appendChild(input);
				fields.push({ key: p.key, el: input, type: 'text' });
			}

			panel.appendChild(group);
		});

		var hint = document.createElement('div');
		hint.style.cssText = 'font-size: 9px; color: #666; margin-bottom: 8px;';
		hint.textContent = 'Use {{varName}} to reference Input step values.';
		panel.appendChild(hint);

		var btnRow = createButtonRow();
		addCancelButton(btnRow, overlay);
		var saveBtn = document.createElement('button');
		saveBtn.textContent = 'Save';
		saveBtn.style.cssText = 'padding: 6px 14px; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; border-radius: 6px; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer; margin: 0; width: auto;';
		saveBtn.onclick = function () {
			fields.forEach(function (f) {
				step.params[f.key] = f.type === 'checkbox' ? f.el.checked : f.el.value;
			});
			saveFlows();
			document.body.removeChild(overlay);
			renderFlowDetail(flowId);
		};
		btnRow.appendChild(saveBtn);
		panel.appendChild(btnRow);

		overlay.appendChild(panel);
		document.body.appendChild(overlay);
	}

	// --- Code ---
	function showAddCodeModal(flowId, stepsList) {
		var overlay = createOverlay();
		var panel = createPanel('Custom Code Step', 280);

		appendField(panel, 'Step Name', 'flow_code_name', 'text', 'My Step');
		appendTextarea(panel, 'JSX Code', 'flow_code_code', '// Enter JSX code...');

		var btnRow = createButtonRow();
		addCancelButton(btnRow, overlay);
		addConfirmButton(btnRow, 'Add Step', '#8b5cf6', '#7c3aed', function () {
			var name = panel.querySelector('#flow_code_name').value.trim() || 'Custom Step';
			var code = panel.querySelector('#flow_code_code').value.trim();
			if (!code) { showToast('Please enter code'); return; }
			addStepToList(stepsList, { id: generateId(), name: name, type: 'code', code: code, delay: 0 });
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
	TATA.SCRIPT_PARAM_REGISTRY = SCRIPT_PARAM_REGISTRY;

})();
