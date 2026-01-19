/**
 * TATA Extension - Supabase Configuration
 * Centralized API configuration for all panels
 */

(function (window) {
    'use strict';

    window.TATA_CONFIG = {
        SUPABASE_URL: 'https://ocglwbaobmsmuwdpcvqw.supabase.co',
        SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZ2x3YmFvYm1zbXV3ZHBjdnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDQ4MDEsImV4cCI6MjA4NDMyMDgwMX0.ZZDik1x-S3CxO7trJV68oc0Ncdr50LuTwMR6J4fZ5v4',

        // Debug mode - set to false for production
        DEBUG: false,

        // Helper to log only in debug mode
        log: function () {
            if (this.DEBUG) {
                console.log.apply(console, ['[TATA]'].concat(Array.prototype.slice.call(arguments)));
            }
        }
    };

})(window);
