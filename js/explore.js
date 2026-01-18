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

    function fetchPlugins() {
        var query = 'plugins?order=' + getSortOrder();

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

    function renderPlugins(plugins) {
        var container = document.getElementById('explore_content');
        var emptyState = document.getElementById('empty_state');

        if (!plugins || plugins.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = '';

        plugins.forEach(function (plugin) {
            var card = createCompactCard(plugin, 'plugins');
            container.appendChild(card);
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
        } else {
            fetchPlugins()
                .then(renderPlugins)
                .catch(function (err) {
                    container.innerHTML = '<div class="loading">Error loading plugins</div>';
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
