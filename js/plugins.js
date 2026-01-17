/**
 * TATA V3 - Plugins Module
 * Allows loading user-created plugins from the plugins/ folder
 */
(function (global) {
    'use strict';

    var loadedPlugins = [];
    var TATA = global.TATA || {};

    /**
     * Load all plugins from the plugins/ folder
     * Plugins are JS files that export to window.TATA.plugins
     */
    function loadPlugins(extensionPath) {
        var pluginsPath = extensionPath + '/plugins';

        // Use Node.js fs to scan directory (CEP has Node integration)
        try {
            var fs = require('fs');
            var path = require('path');

            if (!fs.existsSync(pluginsPath)) {
                console.log('[TATA] No plugins folder found');
                return;
            }

            var files = fs.readdirSync(pluginsPath);
            files.forEach(function (file) {
                if (file.endsWith('.js') && !file.startsWith('_')) {
                    try {
                        var pluginPath = path.join(pluginsPath, file);
                        var pluginCode = fs.readFileSync(pluginPath, 'utf8');

                        // Execute plugin in sandboxed context
                        var pluginFn = new Function('TATA', pluginCode);
                        pluginFn(TATA);

                        loadedPlugins.push({
                            name: file,
                            path: pluginPath,
                            loaded: true
                        });

                        console.log('[TATA] Loaded plugin: ' + file);
                    } catch (e) {
                        console.error('[TATA] Failed to load plugin: ' + file, e);
                    }
                }
            });
        } catch (e) {
            console.log('[TATA] Plugin loading not available in this context');
        }
    }

    /**
     * Get list of loaded plugins
     */
    function getLoadedPlugins() {
        return loadedPlugins;
    }

    /**
     * Register a plugin manually
     */
    function registerPlugin(name, pluginObj) {
        if (!TATA.plugins) TATA.plugins = {};
        TATA.plugins[name] = pluginObj;
        loadedPlugins.push({ name: name, loaded: true });
    }

    // Export
    TATA.loadPlugins = loadPlugins;
    TATA.getLoadedPlugins = getLoadedPlugins;
    TATA.registerPlugin = registerPlugin;
    global.TATA = TATA;

})(window);
