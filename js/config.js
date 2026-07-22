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

(window => {
    'use strict';

    const config = {
        DEBUG: false,

        log(...args) {
            if (this.DEBUG) {
                console.log.apply(console, ['[Rocket Launcher]'].concat(Array.prototype.slice.call(args)));
            }
        }
    };

    function loadLocalConfig() {
        if (typeof window.require === 'undefined') return;

        try {
            const fs = window.require('fs');
            const href = window.location.href || '';
            const root = href.substring(0, href.lastIndexOf('/') + 1);
            // Strip file:// protocol and decode, then point to js/config.local.json
            const localPath = `${decodeURIComponent(root.replace(/^file:\/\//, '').replace(/^file:/, ''))}js/config.local.json`;

            if (fs.existsSync(localPath)) {
                const raw = fs.readFileSync(localPath, 'utf8');
                const local = JSON.parse(raw);
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
