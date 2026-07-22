/**
 * Rocket Launcher - Cloud Sync Module
 * Synchronizes selected localStorage keys with Supabase.
 * Authentication must be provided externally (e.g. manually set token or future auth flow).
 */

(function () {
    'use strict';

    window.TATA = window.TATA || {};

    const SUPABASE_URL = (window.TATA_CONFIG && window.TATA_CONFIG.SUPABASE_URL) || '';
    const SUPABASE_KEY = (window.TATA_CONFIG && window.TATA_CONFIG.SUPABASE_KEY) || '';
    const AUTH_KEY = 'tata_supabase_auth'; // LocalStorage key to save token

    function hasSyncConfig() {
        return !!(SUPABASE_URL && SUPABASE_KEY);
    }

    function warnMissingConfig() {
        var msg = 'Sync not configured. Provide Supabase credentials in js/config.local.json';
        if (TATA.showToast) TATA.showToast(msg, 'error');
        else alert(msg);
    }

    let currentUser = null;

    // ==========================================
    // UI Updates
    // ==========================================
    function updateAuthUI() {
        const btnLogin = document.getElementById('btn_sync_login');
        const authInfo = document.getElementById('sync_user_info');
        const actionSection = document.getElementById('sync_actions_section');
        const emailEl = document.getElementById('sync_user_email');
        const avatarEl = document.getElementById('sync_user_avatar');

        if (currentUser) {
            if (btnLogin) btnLogin.style.display = 'none';
            if (authInfo) authInfo.style.display = 'flex';
            if (actionSection) actionSection.style.display = 'flex';

            if (emailEl) emailEl.textContent = currentUser.email || 'User';
            if (avatarEl) avatarEl.textContent = (currentUser.email || 'U').substring(0, 1).toUpperCase();
        } else {
            if (btnLogin) btnLogin.style.display = 'flex';
            if (authInfo) authInfo.style.display = 'none';
            if (actionSection) actionSection.style.display = 'none';
        }
    }

    // ==========================================
    // Core Auth Functions
    // ==========================================
    function getStoredAuth() {
        try {
            const raw = localStorage.getItem(AUTH_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function setStoredAuth(data) {
        if (!data) {
            localStorage.removeItem(AUTH_KEY);
            currentUser = null;
        } else {
            localStorage.setItem(AUTH_KEY, JSON.stringify(data));
        }
    }

    async function checkAuthStatus() {
        if (!hasSyncConfig()) { currentUser = null; updateAuthUI(); return; }
        const auth = getStoredAuth();
        if (!auth || !auth.access_token) {
            currentUser = null;
            updateAuthUI();
            return;
        }

        try {
            const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${auth.access_token}`
                }
            });

            if (res.ok) {
                const user = await res.json();
                currentUser = {
                    id: user.id,
                    email: user.email,
                    token: auth.access_token
                };

                // Auto-pull on init if not already pulled
                if (!window._tata_has_auto_pulled) {
                    window._tata_has_auto_pulled = true;
                    setTimeout(pullFromCloudSilent, 500);
                }

            } else {
                console.warn('[TATA Sync] Session expired.');
                setStoredAuth(null);
            }
        } catch (e) {
            console.error('[TATA Sync] Auth check failed:', e);
        }
        updateAuthUI();
    }

    function doLogout() {
        setStoredAuth(null);
        updateAuthUI();
        if (TATA.showToast) TATA.showToast('Logged out.', 'info');
    }

    // ==========================================
    // Auto-Sync Functions
    // ==========================================
    async function pushToCloudSilent() {
        if (!hasSyncConfig()) { warnMissingConfig(); return; }
        if (!currentUser || !TATA.getAllDataToSync) return;

        try {
            const payload = {
                id: currentUser.id,
                data: TATA.getAllDataToSync(),
                updated_at: new Date().toISOString()
            };

            const res = await fetch(`${SUPABASE_URL}/rest/v1/user_sync`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${currentUser.token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json();
                console.error('[TATA Auto-Sync] Push fetch error:', err);
                const msg = err.message || JSON.stringify(err);
                if (TATA.showToast) TATA.showToast('Sync Push Error: ' + msg, 'error');
                throw new Error(msg);
            }

            if (res.ok) {
                const lastSync = document.getElementById('sync_last_sync');
                if (lastSync) {
                    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    lastSync.textContent = 'Auto-saved at ' + time;
                }
            }
        } catch (e) {
            console.error('[TATA Auto-Sync] Push failed:', e);
            const lastSync = document.getElementById('sync_last_sync');
            if (lastSync) lastSync.textContent = 'Sync failed';
        }
    }

    async function pullFromCloudSilent() {
        if (!hasSyncConfig()) { warnMissingConfig(); return; }
        if (!currentUser || !TATA.restoreAllDataFromSync) return;

        const lastSync = document.getElementById('sync_last_sync');
        if (lastSync) lastSync.textContent = 'Syncing...';

        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/user_sync?select=data,updated_at&id=eq.${currentUser.id}`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });

            if (!res.ok) {
                const err = await res.json();
                console.error('[TATA Auto-Sync] Fetch error:', err);
                const msg = err.message || JSON.stringify(err);
                if (TATA.showToast) TATA.showToast('Sync Pull Error: ' + msg, 'error');
                throw new Error(msg);
            }

            const result = await res.json();

            // If no data exists yet, that's fine, just wait for the first push.
            if (!result || result.length === 0) {
                if (lastSync) lastSync.textContent = 'Ready to sync';
                return;
            }

            const cloudData = result[0].data;
            const success = TATA.restoreAllDataFromSync(cloudData);

            if (success) {
                if (lastSync) {
                    const time = new Date(result[0].updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    lastSync.textContent = 'Up to date (' + time + ')';
                }
                // Re-init panel to apply changes
                if (TATA.initUserScripts) setTimeout(TATA.initUserScripts, 200);
                if (typeof TATA.initHotkeys === 'function') setTimeout(TATA.initHotkeys, 300);
                if (typeof TATA.loadFlows === 'function') setTimeout(TATA.loadFlows, 400);
                if (typeof TATA.reloadV2Layout === 'function') setTimeout(TATA.reloadV2Layout, 500);
            }

        } catch (e) {
            console.error('[TATA Auto-Sync] Pull failed:', e);
            if (lastSync) lastSync.textContent = 'Sync failed';
        }
    }

    // ==========================================
    // Init
    // ==========================================
    function initSync() {
        checkAuthStatus();

        const btnLogout = document.getElementById('btn_sync_logout');
        const btnFolder = document.getElementById('btn_sync_folder');
        const btnRefresh = document.getElementById('btn_sync_refresh');

        if (btnLogout) btnLogout.addEventListener('click', doLogout);

        if (btnRefresh) {
            btnRefresh.addEventListener('click', function () {
                if (!currentUser) return;
                btnRefresh.style.opacity = '0.3';
                pullFromCloudSilent().finally(function () {
                    btnRefresh.style.opacity = '0.8';
                    if (TATA.showToast) TATA.showToast('Pull from Cloud complete', 'success');
                });
            });
        }

        if (btnFolder) {
            btnFolder.addEventListener('click', function () {
                if (typeof window.require !== 'undefined') {
                    try {
                        const path = window.require('path');
                        const cp = window.require('child_process');
                        const extPath = TATA.extensionPath || '';
                        const syncPath = path.join(extPath, 'jsx', 'cloud_sync');
                        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                        const cmd = isMac ? 'open' : 'explorer';

                        // Ensure the directory exists before opening
                        const fs = window.require('fs');
                        if (!fs.existsSync(syncPath)) {
                            fs.mkdirSync(syncPath, { recursive: true });
                        }

                        cp.exec(`${cmd} "${syncPath}"`);
                    } catch (e) {
                        console.error('[TATA] Failed to open folder:', e);
                    }
                }
            });
        }
    }

    // Attach to TATA global (Optional)
    TATA.Sync = {
        init: initSync,
        checkAuth: checkAuthStatus,
        autoPush: TATA.debounce ? TATA.debounce(pushToCloudSilent, 2000) : pushToCloudSilent
    };

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSync);
    } else {
        initSync();
    }

})();
