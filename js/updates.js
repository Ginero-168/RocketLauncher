/**
 * Manual update check against GitHub Releases.
 */
(() => {
    'use strict';

    window.TATA = window.TATA || {};

    const RELEASES_API_URL = 'https://api.github.com/repos/Ginero-168/RocketLauncher/releases/latest';

    function versionFromManifestXml(xml) {
        const match = String(xml || '').match(/ExtensionBundleVersion="([^"]+)"/);
        return match ? match[1] : '';
    }

    function extensionRoot() {
        const fromState = (typeof TATA.getExtensionPath === 'function' && TATA.getExtensionPath()) || TATA.extensionPath || '';
        if (fromState) return fromState;
        try {
            let loc = (window.location && window.location.href) || '';
            if (loc.indexOf('file://') === 0) loc = loc.substring(7);
            const slash = loc.lastIndexOf('/');
            if (slash > 0) return decodeURIComponent(loc.substring(0, slash));
        } catch (e) { /* the page URL is only a fallback */ }
        return '';
    }

    function nodeRequire(name) {
        try {
            if (typeof window.require === 'function') return window.require(name);
        } catch (e) { /* CEP require can throw */ }
        try {
            if (typeof require === 'function') return require(name);
        } catch (e2) { /* browser preview has no Node */ }
        return null;
    }

    function currentExtensionVersion() {
        const root = extensionRoot();
        const fs = nodeRequire('fs');
        const pathMod = nodeRequire('path');
        if (!root || !fs || !pathMod) return '';
        try {
            return versionFromManifestXml(fs.readFileSync(pathMod.join(root, 'CSXS', 'manifest.xml'), 'utf8'));
        } catch (e) {
            return '';
        }
    }

    const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-((0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(\.(0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;

    function parseSemver(value) {
        const match = SEMVER.exec(String(value || '').trim());
        if (!match) return null;
        return {
            major: match[1],
            minor: match[2],
            patch: match[3],
            pre: match[4] ? match[4].slice(1).split('.') : null
        };
    }

    function compareId(left, right) {
        const leftNum = /^[0-9]+$/.test(left);
        const rightNum = /^[0-9]+$/.test(right);
        if (leftNum && rightNum) {
            if (left.length !== right.length) return left.length < right.length ? -1 : 1;
            if (left < right) return -1;
            if (left > right) return 1;
            return 0;
        }
        if (leftNum) return -1;
        if (rightNum) return 1;
        if (left < right) return -1;
        if (left > right) return 1;
        return 0;
    }

    function comparePre(left, right) {
        if (!left && !right) return 0;
        if (!left) return 1;
        if (!right) return -1;
        const length = Math.max(left.length, right.length);
        for (let i = 0; i < length; i++) {
            if (left[i] == null) return -1;
            if (right[i] == null) return 1;
            const diff = compareId(left[i], right[i]);
            if (diff) return diff;
        }
        return 0;
    }

    function compareVersions(v1, v2) {
        const left = parseSemver(v1);
        const right = parseSemver(v2);
        if (!left && !right) return 0;
        if (!left) return -1;
        if (!right) return 1;
        const major = compareId(left.major, right.major);
        if (major) return major;
        const minor = compareId(left.minor, right.minor);
        if (minor) return minor;
        const patch = compareId(left.patch, right.patch);
        if (patch) return patch;
        return comparePre(left.pre, right.pre);
    }

    function hideUpdateAvailable() {
        const available = document.getElementById('update_available');
        const download = document.getElementById('download_link');
        if (available) available.hidden = true;
        if (download) download.removeAttribute('href');
    }

    function fillUpdateChecksum(container, checksum) {
        if (!container) return;
        container.textContent = '';
        if (checksum && checksum.browser_download_url) {
            container.appendChild(document.createTextNode('Checksum: '));
            const link = document.createElement('a');
            link.href = checksum.browser_download_url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = checksum.name || 'SHA-256';
            container.appendChild(link);
            return;
        }
        container.textContent = 'Checksum file is not available for this release.';
    }

    async function checkForUpdates() {
        const btnCheck = document.getElementById('btn_check_update');
        const status = document.getElementById('update_status');
        const available = document.getElementById('update_available');
        const showToast = TATA.showToast;
        if (btnCheck) {
            btnCheck.textContent = 'Checking…';
            btnCheck.disabled = true;
        }
        if (status) status.textContent = 'Checking GitHub Releases...';
        hideUpdateAvailable();

        try {
            const fetchTimed = TATA.fetchWithTimeout || fetch;
            const res = await fetchTimed(RELEASES_API_URL, {
                headers: { Accept: 'application/vnd.github+json' },
                cache: 'no-store'
            }, 20000);
            if (!res.ok) throw new Error(`GitHub returned HTTP ${res.status}`);
            const release = await res.json();
            const latestVersion = String(release.tag_name || '').replace(/^v/i, '');
            const platform = /win/i.test(navigator.platform) ? 'windows' : 'macos';
            const asset = (release.assets || []).find(item =>
                item.name === `RocketLauncher-v${latestVersion}-${platform}.zxp`
            );
            const checksum = (release.assets || []).find(item =>
                item.name === `RocketLauncher-v${latestVersion}-${platform}.sha256`
            );
            if (!latestVersion || !asset) throw new Error('Release ZXP is missing');

            const installed = currentExtensionVersion();
            if (compareVersions(latestVersion, installed) > 0) {
                const versionEl = document.getElementById('new_version');
                const download = document.getElementById('download_link');
                const notes = document.getElementById('update_notes');
                if (versionEl) versionEl.textContent = `v${latestVersion}`;
                if (download) download.href = asset.browser_download_url;
                if (notes) notes.textContent = release.body || 'Release notes are not available.';
                fillUpdateChecksum(document.getElementById('update_checksum'), checksum);
                if (available) available.hidden = false;
                if (status) status.textContent = `Update available: v${latestVersion}`;
                if (showToast) showToast(`Update available: v${latestVersion}`);
            } else {
                if (available) available.hidden = true;
                if (status) status.textContent = `You have the latest version (${installed ? 'v' + installed : 'unknown'}).`;
                if (showToast) showToast('You have the latest version!');
            }
        } catch (err) {
            hideUpdateAvailable();
            if (status) status.textContent = `Update check failed: ${err.message}`;
            console.error('[Updates]', err);
            if (showToast) showToast('Could not check for updates', 'error');
        } finally {
            if (btnCheck) {
                btnCheck.textContent = 'Check for updates';
                btnCheck.disabled = false;
            }
        }
    }

    function bindUpdates() {
        const versionEl = document.getElementById('current_version');
        const installed = currentExtensionVersion();
        if (versionEl) versionEl.textContent = installed ? `v${installed}` : 'unknown';
        const btnCheckUpdate = document.getElementById('btn_check_update');
        if (btnCheckUpdate && !btnCheckUpdate._bound) {
            btnCheckUpdate._bound = true;
            btnCheckUpdate.addEventListener('click', checkForUpdates);
        }
    }

    TATA.bindUpdates = bindUpdates;
    TATA.checkForUpdates = checkForUpdates;
    TATA.compareVersions = compareVersions;
    TATA.SEMVER_PATTERN = SEMVER.source;
    TATA.fillUpdateChecksum = fillUpdateChecksum;
    TATA.versionFromManifestXml = versionFromManifestXml;
    TATA.currentExtensionVersion = currentExtensionVersion;
    Object.defineProperty(TATA, 'CURRENT_VERSION', {
        configurable: true,
        get: function () { return currentExtensionVersion(); }
    });
})();
