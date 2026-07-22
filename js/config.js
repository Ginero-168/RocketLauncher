/**
 * Rocket Launcher Extension - Configuration Loader
 *
 * Loads public defaults here and merges private credentials from
 * js/config.local.json (not tracked in git). To configure cloud sync,
 * create js/config.local.json with:
 *
 *   {
 *       "SUPABASE_URL": "https://your-project.supabase.co",
 *       "SUPABASE_KEY": "your-anon-key"
 *   }
 */

(function (window) {
    'use strict';

    var config = {
        DEBUG: false,

        log: function () {
            if (this.DEBUG) {
                console.log.apply(console, ['[Rocket Launcher]'].concat(Array.prototype.slice.call(arguments)));
            }
        }
    };

    function loadLocalConfig() {
        if (typeof window.require === 'undefined') return;

        try {
            var fs = window.require('fs');
            var href = window.location.href || '';
            var root = href.substring(0, href.lastIndexOf('/') + 1);
            // Strip file:// protocol and decode, then point to js/config.local.json
            var localPath = decodeURIComponent(root.replace(/^file:\/\//, '').replace(/^file:/, '')) + 'js/config.local.json';

            if (fs.existsSync(localPath)) {
                var raw = fs.readFileSync(localPath, 'utf8');
                var local = JSON.parse(raw);
                if (local.SUPABASE_URL) config.SUPABASE_URL = local.SUPABASE_URL;
                if (local.SUPABASE_KEY) config.SUPABASE_KEY = local.SUPABASE_KEY;
                if (local.DEBUG !== undefined) config.DEBUG = !!local.DEBUG;
            }
        } catch (e) {
            console.warn('[Config] Could not load local config:', e.message);
        }
    }

    loadLocalConfig();

    window.TATA_CONFIG = config;

})(window);
