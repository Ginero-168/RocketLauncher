(function () {
	'use strict';

	var TATA = window.TATA || {};

	function getCS() {
		if (TATA.getCSInterface) return TATA.getCSInterface();
		return TATA.csInterface || (typeof csInterface !== 'undefined' ? csInterface : null);
	}

	/**
	 * Central host execution gateway for all ExtendScript calls.
	 * Use this instead of calling csInterface.evalScript directly.
	 */
	TATA.host = {
		/**
		 * Load a JSX file into Illustrator.
		 * Supports (filePath, callback) or (filePath, params, callback).
		 */
		evalFile: function (filePath, params, callback) {
			if (typeof params === 'function') {
				callback = params;
				params = undefined;
			}
			var cs = getCS();
			if (!cs) return safeCall(callback, 'ERR: csInterface not available');

			var script = 'try { ';
			if (typeof params !== 'undefined') {
				script += 'var params = ' + JSON.stringify(params) + '; ';
			}
			script += '$.evalFile(' + JSON.stringify(filePath) + '); } catch(e) { "Error: " + e.message; }';
			cs.evalScript(script, callback);
		},

		/**
		 * Call a registered TATA.run(command, params) handler in hostscript.jsx.
		 * Supports (command, callback) or (command, params, callback).
		 */
		run: function (command, params, callback) {
			if (typeof params === 'function') {
				callback = params;
				params = undefined;
			}
			var cs = getCS();
			if (!cs) return safeCall(callback, 'ERR: csInterface not available');

			var script = 'try { TATA.run(' + JSON.stringify(command);
			if (typeof params !== 'undefined') {
				script += ', ' + JSON.stringify(params);
			}
			script += '); } catch(e) { "Error: " + e.message; }';
			cs.evalScript(script, callback);
		},

		/**
		 * Execute raw ExtendScript code (use only for trusted/generated code).
		 */
		evalCode: function (script, callback) {
			var cs = getCS();
			if (!cs) return safeCall(callback, 'ERR: csInterface not available');
			cs.evalScript(script, callback);
		}
	};

	function safeCall(fn, arg) {
		if (typeof fn === 'function') {
			try { fn(arg); } catch (e) { console.error('[TATA.host] callback error:', e); }
		}
	}

	window.TATA = TATA;
})();
