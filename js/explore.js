/**
 * TATA Explore Panel - JavaScript V2
 * Compact cards with expand/collapse + Upload functionality
 */

(function () {
    'use strict';

    // ==========================================
    // Supabase Configuration
    // ==========================================
    var SUPABASE_URL = 'https://ocglwbaobmsmuwdpcvqw.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZ2x3YmFvYm1zbXV3ZHBjdnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDQ4MDEsImV4cCI6MjA4NDMyMDgwMX0.ZZDik1x-S3CxO7trJV68oc0Ncdr50LuTwMR6J4fZ5v4';

    // ==========================================
    // State
    // ==========================================
    var currentType = 'scripts';
    var currentCategory = 'all';
    var currentSort = 'trending';
    var searchQuery = '';
    var csInterface = new CSInterface();

    // ==========================================
    // API Functions
    // ==========================================
    function apiRequest(endpoint, options) {
        options = options || {};
        var url = SUPABASE_URL + '/rest/v1/' + endpoint;

        var headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };

        return fetch(url, {
            method: options.method || 'GET',
            headers: headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        }).then(function (res) {
            if (!res.ok) throw new Error('API Error: ' + res.status);
            return res.json();
        });
    }

    function getSortOrder() {
        switch (currentSort) {
            case 'newest': return 'created_at.desc';
            case 'downloads': return 'downloads.desc';
            case 'trending':
            default: return 'votes.desc';
        }
    }

    function fetchScripts() {
        var query = 'scripts?order=' + getSortOrder();

        if (currentCategory !== 'all') {
            query += '&category=eq.' + currentCategory;
        }

        if (searchQuery) {
            query += '&name=ilike.*' + encodeURIComponent(searchQuery) + '*';
        }

        return apiRequest(query);
    }

    function fetchColors() {
        var query = 'colors?order=' + getSortOrder();

        if (searchQuery) {
            query += '&name=ilike.*' + encodeURIComponent(searchQuery) + '*';
        }

        return apiRequest(query);
    }

    function uploadScript(data) {
        return apiRequest('scripts', {
            method: 'POST',
            body: data
        });
    }

    function incrementDownload(table, id) {
        return apiRequest(table + '?id=eq.' + id + '&select=downloads')
            .then(function (data) {
                if (data && data[0]) {
                    var newCount = (data[0].downloads || 0) + 1;
                    return apiRequest(table + '?id=eq.' + id, {
                        method: 'PATCH',
                        body: { downloads: newCount, last_used_at: new Date().toISOString() }
                    });
                }
            });
    }

    function incrementVote(table, id, delta) {
        delta = delta || 1;
        return apiRequest(table + '?id=eq.' + id + '&select=votes')
            .then(function (data) {
                if (data && data[0]) {
                    var newCount = (data[0].votes || 0) + delta;
                    return apiRequest(table + '?id=eq.' + id, {
                        method: 'PATCH',
                        body: { votes: newCount }
                    });
                }
            });
    }

    // ==========================================
    // UI Functions
    // ==========================================
    function showToast(message, type) {
        var toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show ' + (type || '');

        setTimeout(function () {
            toast.className = 'toast';
        }, 3000);
    }

    function renderScripts(scripts) {
        var container = document.getElementById('explore_content');
        var emptyState = document.getElementById('empty_state');

        if (!scripts || scripts.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = '';

        scripts.forEach(function (script) {
            var card = createCompactCard(script, 'scripts');
            container.appendChild(card);
        });
    }

    function createCompactCard(item, type) {
        var card = document.createElement('div');
        card.className = 'script-card';
        card.dataset.id = item.id;

        var categoryClass = 'category-' + (item.category || 'tools');

        // Compact Header (Always Visible)
        var compact = document.createElement('div');
        compact.className = 'card-compact';
        compact.innerHTML =
            '<div class="card-icon-small">' + (item.icon || '⭐') + '</div>' +
            '<span class="card-name">' + escapeHtml(item.name) + '</span>' +
            '<span class="category-badge ' + categoryClass + '">' + (item.category || 'tools') + '</span>' +
            '<span class="card-stats-mini">' +
            '<span>👍' + (item.votes || 0) + '</span>' +
            '<span>📥' + (item.downloads || 0) + '</span>' +
            '</span>' +
            '<span class="expand-icon">▼</span>';

        // Click to expand/collapse
        compact.addEventListener('click', function (e) {
            if (e.target.closest('.btn-install') || e.target.closest('.btn-vote')) return;
            card.classList.toggle('expanded');
        });

        card.appendChild(compact);

        // Calculate lifetime
        var lifetimeInfo = calculateLifetime(item);

        // Expanded Details (Hidden by Default)
        var details = document.createElement('div');
        details.className = 'card-details';
        details.innerHTML =
            '<div class="card-author">by ' + escapeHtml(item.author_name || 'Anonymous') + '</div>' +
            '<div class="card-desc">' + escapeHtml(item.description || 'No description provided') + '</div>' +
            '<div class="card-lifetime ' + lifetimeInfo.class + '">' + lifetimeInfo.text + '</div>' +
            '<div class="card-actions">' +
            '<button class="btn-vote btn-upvote" data-id="' + item.id + '">👍 +1</button>' +
            '<button class="btn-vote btn-downvote" data-id="' + item.id + '">👎 -1</button>' +
            '<button class="btn-install" data-id="' + item.id + '">Install</button>' +
            '</div>';

        // Event: Install
        var btnInstall = details.querySelector('.btn-install');
        btnInstall.addEventListener('click', function (e) {
            e.stopPropagation();
            installScript(item);
        });

        // Event: Upvote
        var btnUpvote = details.querySelector('.btn-upvote');
        btnUpvote.addEventListener('click', function (e) {
            e.stopPropagation();
            voteForItem(type, item.id, 1);
        });

        // Event: Downvote
        var btnDownvote = details.querySelector('.btn-downvote');
        btnDownvote.addEventListener('click', function (e) {
            e.stopPropagation();
            voteForItem(type, item.id, -1);
        });

        card.appendChild(details);

        return card;
    }

    // Calculate script lifetime based on votes and creation date
    function calculateLifetime(item) {
        var votes = item.votes || 0;
        var createdAt = new Date(item.created_at);
        var now = new Date();
        var ageMs = now - createdAt;
        var ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

        // Rule: votes >= 30 = permanent
        if (votes >= 30) {
            return { text: '✨ Permanent (30+ votes)', class: 'lifetime-safe' };
        }

        // Rule: negative votes → expires in 1 day
        if (votes < 0) {
            var daysLeft = 1 - ageDays;
            if (daysLeft <= 0) {
                return { text: '💀 Expiring soon (negative votes)', class: 'lifetime-danger' };
            } else {
                return { text: '⚠️ ' + daysLeft + ' day left (negative votes!)', class: 'lifetime-danger' };
            }
        }

        // Rule: votes = 0 → expires in 3 days
        if (votes === 0) {
            var daysLeft = 3 - ageDays;
            if (daysLeft <= 0) {
                return { text: '⚠️ Expiring soon', class: 'lifetime-danger' };
            } else if (daysLeft === 1) {
                return { text: '⏰ 1 day left (needs votes)', class: 'lifetime-warning' };
            } else {
                return { text: '⏰ ' + daysLeft + ' days left (needs votes)', class: 'lifetime-warning' };
            }
        }

        // Rule: votes 1-29 → expires in 14 days
        var daysLeft14 = 14 - ageDays;
        if (daysLeft14 <= 0) {
            return { text: '⚠️ Expiring soon (needs 30+ votes)', class: 'lifetime-danger' };
        } else if (daysLeft14 <= 3) {
            return { text: '⏰ ' + daysLeft14 + ' days left (needs ' + (30 - votes) + ' more votes)', class: 'lifetime-warning' };
        } else {
            return { text: '📅 ' + daysLeft14 + ' days left (needs ' + (30 - votes) + ' more votes)', class: 'lifetime-info' };
        }
    }

    function renderColors(colors) {
        var container = document.getElementById('explore_content');
        var emptyState = document.getElementById('empty_state');

        if (!colors || colors.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = '';

        colors.forEach(function (color) {
            var card = createColorCard(color);
            container.appendChild(card);
        });
    }

    function createColorCard(item) {
        var card = document.createElement('div');
        card.className = 'color-harmony-card';
        card.dataset.id = item.id;

        // Force styles to ensure visibility
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.overflow = 'visible';
        card.style.height = 'auto';
        card.style.border = '1px solid #444';
        card.style.borderRadius = '6px';
        card.style.marginBottom = '10px';
        card.style.background = '#252525';

        var colorArray = [];
        try {
            colorArray = typeof item.colors === 'string' ? JSON.parse(item.colors) : item.colors;
        } catch (e) { colorArray = []; }

        // 1. Header Row
        var header = document.createElement('div');
        header.className = 'harmony-header';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.padding = '8px 10px';
        header.innerHTML =
            '<div class="harmony-name" style="font-weight:600; font-size:12px; color:#eee;">' + escapeHtml(item.name) + '</div>';

        // Buttons
        var btnContainer = document.createElement('div');
        btnContainer.className = 'harmony-buttons';
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '5px';

        // Place Button
        var btnPlace = document.createElement('button');
        btnPlace.innerText = 'Place';
        btnPlace.className = 'harmony-btn';
        btnPlace.style.padding = '4px 10px';
        btnPlace.style.background = '#0078d4';
        btnPlace.style.color = 'white';
        btnPlace.style.border = 'none';
        btnPlace.style.borderRadius = '4px';
        btnPlace.style.cursor = 'pointer';
        btnPlace.onclick = function (e) {
            e.stopPropagation();
            placeColorPalette(colorArray);
        };
        btnContainer.appendChild(btnPlace);

        // Swatch Button
        var btnSwatch = document.createElement('button');
        btnSwatch.innerText = 'Swatch';
        btnSwatch.className = 'harmony-btn';
        btnSwatch.style.padding = '4px 10px';
        btnSwatch.style.background = '#444';
        btnSwatch.style.color = 'white';
        btnSwatch.style.border = 'none';
        btnSwatch.style.borderRadius = '4px';
        btnSwatch.style.cursor = 'pointer';
        btnSwatch.onclick = function (e) {
            e.stopPropagation();
            saveToSwatches(item.name, colorArray);
        };
        btnContainer.appendChild(btnSwatch);

        header.appendChild(btnContainer);
        card.appendChild(header);

        // 2. Color Bar
        var colorBar = document.createElement('div');
        colorBar.className = 'harmony-color-bar';
        colorBar.style.display = 'flex';
        colorBar.style.height = '40px'; // Slightly taller
        colorBar.style.width = '100%';

        colorArray.forEach(function (c) {
            var swatch = document.createElement('div');
            swatch.className = 'harmony-swatch';
            swatch.style.flex = '1';
            swatch.style.backgroundColor = c;
            swatch.title = c;
            swatch.style.cursor = 'pointer';
            swatch.onclick = function () {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(c);
                    showToast('📋 Copied: ' + c);
                }
            };
            colorBar.appendChild(swatch);
        });
        card.appendChild(colorBar);

        // 3. Vote Row (Explicit Construction)
        var voteRow = document.createElement('div');
        voteRow.className = 'harmony-vote-row';
        voteRow.style.display = 'flex';
        voteRow.style.alignItems = 'center';
        voteRow.style.justifyContent = 'space-between';
        voteRow.style.padding = '8px 12px';
        voteRow.style.background = '#1e1e1e';
        voteRow.style.borderTop = '1px solid #333';
        voteRow.style.color = '#ccc';
        voteRow.style.fontSize = '11px';

        // Left: Voting Buttons
        var leftDiv = document.createElement('div');
        leftDiv.style.display = 'flex';
        leftDiv.style.gap = '8px';

        var btnUp = document.createElement('button');
        btnUp.className = 'vote-btn vote-up';
        btnUp.innerHTML = '👍 +1';
        btnUp.style.background = 'transparent';
        btnUp.style.border = '1px solid #555';
        btnUp.style.color = '#aaa';
        btnUp.style.padding = '4px 8px';
        btnUp.style.borderRadius = '4px';
        btnUp.style.cursor = 'pointer';
        btnUp.addEventListener('click', function (e) {
            e.stopPropagation();
            voteForItem('colors', item.id, 1);
        });

        var btnDown = document.createElement('button');
        btnDown.className = 'vote-btn vote-down';
        btnDown.innerHTML = '👎 -1';
        btnDown.style.background = 'transparent';
        btnDown.style.border = '1px solid #555';
        btnDown.style.color = '#aaa';
        btnDown.style.padding = '4px 8px';
        btnDown.style.borderRadius = '4px';
        btnDown.style.cursor = 'pointer';
        btnDown.addEventListener('click', function (e) {
            e.stopPropagation();
            voteForItem('colors', item.id, -1);
        });

        leftDiv.appendChild(btnUp);
        leftDiv.appendChild(btnDown);
        voteRow.appendChild(leftDiv);

        // Right: Stats
        var rightDiv = document.createElement('div');
        rightDiv.style.display = 'flex';
        rightDiv.style.gap = '12px';

        var voteCount = document.createElement('span');
        voteCount.innerHTML = '👍 ' + (item.votes || 0);

        var dlCount = document.createElement('span');
        dlCount.innerHTML = '📥 ' + (item.downloads || 0);

        rightDiv.appendChild(voteCount);
        rightDiv.appendChild(dlCount);
        voteRow.appendChild(rightDiv);

        card.appendChild(voteRow);

        return card;
    }

    function placeColorPalette(colors) {
        csInterface.evalScript('placePaletteOnArtboard(' + JSON.stringify(colors) + ')', function (result) {
            if (result === 'success') {
                showToast('🎨 Palette placed!', 'success');
            } else {
                showToast('⚠️ Place failed', 'error');
            }
        });
    }

    function saveToSwatches(name, colors) {
        csInterface.evalScript('saveToSwatches("' + name + '", ' + JSON.stringify(colors) + ')', function (result) {
            if (result === 'success') {
                showToast('✅ Saved to Swatches!', 'success');
            } else {
                showToast('⚠️ Swatch save failed', 'error');
            }
        });
    }

    function applyColorPalette(colorItem) {
        var colorArray = [];
        try {
            colorArray = typeof colorItem.colors === 'string' ? JSON.parse(colorItem.colors) : colorItem.colors;
        } catch (e) { colorArray = []; }

        // Send to T Colors panel
        var evt = new CSEvent('com.tata.pro.applyColors', 'APPLICATION');
        evt.data = JSON.stringify({
            name: colorItem.name,
            colors: colorArray
        });
        csInterface.dispatchEvent(evt);

        // Increment download
        incrementDownload('colors', colorItem.id)
            .then(function () {
                showToast('🎨 "' + colorItem.name + '" applied!', 'success');
                loadContent();
            })
            .catch(function () {
                showToast('🎨 Applied!', 'success');
            });
    }

    // ==========================================
    // Actions
    // ==========================================
    function installScript(script) {
        var eventData = {
            id: 'explore_' + script.id.substring(0, 8),
            name: script.name,
            code: script.code,
            icon: script.icon || '⭐',
            color: getCategoryColor(script.category)
        };

        // Send event to main panel
        function sendInstallEvent() {
            var evt = new CSEvent('com.tata.pro.importScript', 'APPLICATION');
            evt.data = JSON.stringify(eventData);
            csInterface.dispatchEvent(evt);
        }

        // Send immediately
        sendInstallEvent();

        // Retry after short delay (ensures main panel is ready)
        setTimeout(sendInstallEvent, 200);

        // Switch focus to main TATA panel
        setTimeout(function () {
            csInterface.requestOpenExtension('com.tata.pro.panel', '');
        }, 300);

        // Increment download count
        incrementDownload('scripts', script.id)
            .then(function () {
                showToast('✅ "' + script.name + '" installed!', 'success');
                loadContent();
            })
            .catch(function () {
                showToast('✅ Installed!', 'success');
            });
    }

    // ==========================================
    // Vote Limit System (5 votes per day)
    // ==========================================
    var DAILY_VOTE_LIMIT = 5;

    function getVoteData() {
        var data = localStorage.getItem('tata_explore_votes');
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) { }
        }
        return { date: '', count: 0 };
    }

    function getTodayString() {
        var d = new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    function getRemainingVotes() {
        var data = getVoteData();
        var today = getTodayString();
        if (data.date !== today) {
            return DAILY_VOTE_LIMIT;
        }
        return Math.max(0, DAILY_VOTE_LIMIT - data.count);
    }

    function useVote() {
        var today = getTodayString();
        var data = getVoteData();

        if (data.date !== today) {
            data = { date: today, count: 0 };
        }

        data.count++;
        localStorage.setItem('tata_explore_votes', JSON.stringify(data));
        return DAILY_VOTE_LIMIT - data.count;
    }

    function voteForItem(type, id, delta) {
        delta = delta || 1;

        // Check vote limit
        var remaining = getRemainingVotes();
        if (remaining <= 0) {
            showToast('❌ No votes left today! (Resets tomorrow)', 'error');
            return;
        }

        var emoji = delta > 0 ? '👍' : '👎';
        incrementVote(type, id, delta)
            .then(function () {
                var left = useVote();
                showToast(emoji + ' Vote recorded! (' + left + ' votes left today)', 'success');
                loadContent();
            })
            .catch(function () {
                showToast('Vote failed', 'error');
            });
    }

    function getCategoryColor(category) {
        var colors = {
            'swift': '#ef4444',
            'creative': '#f59e0b',
            'tools': '#8b5cf6'
        };
        return colors[category] || '#3b82f6';
    }

    // ==========================================
    // Upload Functions
    // ==========================================
    function openUploadModal() {
        document.getElementById('upload_modal').classList.add('active');
        document.getElementById('upload_name').focus();
    }

    function closeUploadModal() {
        document.getElementById('upload_modal').classList.remove('active');
        // Clear form
        document.getElementById('upload_name').value = '';
        document.getElementById('upload_icon').value = '⭐';
        document.getElementById('upload_desc').value = '';
        document.getElementById('upload_author').value = '';
        document.getElementById('upload_code').value = '';
    }

    function submitUpload() {
        var name = document.getElementById('upload_name').value.trim();
        var icon = document.getElementById('upload_icon').value.trim() || '⭐';
        var category = document.getElementById('upload_category').value;
        var description = document.getElementById('upload_desc').value.trim();
        var author = document.getElementById('upload_author').value.trim() || 'Anonymous';
        var code = document.getElementById('upload_code').value.trim();

        // Validation
        if (!name) {
            showToast('Please enter a script name', 'error');
            return;
        }
        if (!code) {
            showToast('Please enter the script code', 'error');
            return;
        }

        var data = {
            name: name,
            icon: icon,
            category: category,
            description: description,
            author_name: author,
            code: code,
            votes: 0,
            downloads: 0
        };

        // Show loading
        var btn = document.getElementById('btn_submit_upload');
        var originalText = btn.textContent;
        btn.textContent = 'Uploading...';
        btn.disabled = true;

        uploadScript(data)
            .then(function () {
                showToast('🎉 Script uploaded successfully!', 'success');
                closeUploadModal();
                loadContent();
            })
            .catch(function (err) {
                showToast('Upload failed: ' + err.message, 'error');
            })
            .finally(function () {
                btn.textContent = originalText;
                btn.disabled = false;
            });
    }

    // ==========================================
    // Helpers
    // ==========================================
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function debounce(func, wait) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                func.apply(context, args);
            }, wait);
        };
    }

    // ==========================================
    // Load Content
    // ==========================================
    function loadContent() {
        var container = document.getElementById('explore_content');
        container.innerHTML = '<div class="loading">Loading...</div>';

        if (currentType === 'scripts') {
            fetchScripts()
                .then(renderScripts)
                .catch(function (err) {
                    container.innerHTML = '<div class="loading">Error loading scripts</div>';
                    console.error(err);
                });
        } else if (currentType === 'colors') {
            fetchColors()
                .then(renderColors)
                .catch(function (err) {
                    container.innerHTML = '<div class="loading">Error loading colors</div>';
                    console.error(err);
                });
        }
    }

    // ==========================================
    // Event Listeners
    // ==========================================
    function setupEventListeners() {
        // Tab switching
        var tabs = document.querySelectorAll('.explore-tab');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('active'); });
                this.classList.add('active');
                currentType = this.dataset.type;
                loadContent();
            });
        });

        // Category filter
        var categoryFilter = document.getElementById('category_filter');
        categoryFilter.addEventListener('change', function () {
            currentCategory = this.value;
            loadContent();
        });

        // Sort filter
        var sortFilter = document.getElementById('sort_filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', function () {
                currentSort = this.value;
                loadContent();
            });
        }

        // Search
        var searchInput = document.getElementById('search_input');
        searchInput.addEventListener('input', debounce(function () {
            searchQuery = this.value.trim();
            loadContent();
        }, 300));

        // Upload Modal
        document.getElementById('btn_open_upload').addEventListener('click', openUploadModal);
        document.getElementById('btn_close_upload').addEventListener('click', closeUploadModal);
        document.getElementById('btn_cancel_upload').addEventListener('click', closeUploadModal);
        document.getElementById('btn_submit_upload').addEventListener('click', submitUpload);

        // Close modal on overlay click
        document.getElementById('upload_modal').addEventListener('click', function (e) {
            if (e.target === this) closeUploadModal();
        });
    }

    // ==========================================
    // Initialize
    // ==========================================
    window.addEventListener('load', function () {
        setupEventListeners();
        loadContent();
    });

})();
