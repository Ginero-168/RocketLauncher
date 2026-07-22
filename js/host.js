(function () {
	'use strict';

	const TATA = window.TATA || {};

	function getCS() {
		if (TATA.getCSInterface) return TATA.getCSInterface();
		return TATA.csInterface || (typeof csInterface !== 'undefined' ? csInterface : null);
	}

	function safeCall(fn, arg) {
		if (typeof fn === 'function') {
			try { fn(arg); } catch (e) { console.error('[TATA.host] callback error:', e); }
		}
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
		evalFile(filePath, params, callback) {
			if (typeof params === 'function') {
				callback = params;
				params = undefined;
			}
			const cs = getCS();
			if (!cs) return safeCall(callback, 'ERR: csInterface not available');

			const paramsPart = typeof params !== 'undefined' ? `var params = ${JSON.stringify(params)}; ` : '';
			const script = `try { ${paramsPart}$.evalFile(${JSON.stringify(filePath)}); } catch(e) { "Error: " + e.message; }`;
			cs.evalScript(script, callback);
		},

		/**
		 * Call a registered TATA.run(command, params) handler in hostscript.jsx.
		 * Supports (command, callback) or (command, params, callback).
		 */
		run(command, params, callback) {
			if (typeof params === 'function') {
				callback = params;
				params = undefined;
			}
			const cs = getCS();
			if (!cs) return safeCall(callback, 'ERR: csInterface not available');

			const paramsPart = typeof params !== 'undefined' ? `, ${JSON.stringify(params)}` : '';
			const script = `try { TATA.run(${JSON.stringify(command)}${paramsPart}); } catch(e) { "Error: " + e.message; }`;
			cs.evalScript(script, callback);
		},

		/**
		 * Execute raw ExtendScript code (use only for trusted/generated code).
		 */
		evalCode(script, callback) {
			const cs = getCS();
			if (!cs) return safeCall(callback, 'ERR: csInterface not available');
			cs.evalScript(script, callback);
		}
	};

	window.TATA = TATA;
})();
