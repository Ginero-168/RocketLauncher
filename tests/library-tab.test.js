describe('Library tab: Style, Color and Keep behind one strip button (js/tabs.js)', function () {
    beforeEach(function () {
        localStorage.clear();
        document.body.className = '';
        document.body.removeAttribute('data-tab');
        document.body.innerHTML =
            '<nav class="tabs">' +
            '<button class="tab-btn active" data-tab="tab_button"></button>' +
            '<button class="tab-btn" id="tabbtn_library" data-tab="tab_styles"></button>' +
            '</nav>' +
            '<div class="subtabs">' +
            '<button data-subtab="tab_styles"></button><button data-subtab="tab_colors"></button><button data-subtab="tab_keep"></button>' +
            '</div>' +
            '<section id="tab_button" class="tab-content active"></section>' +
            '<section id="tab_styles" class="tab-content"></section>' +
            '<section id="tab_colors" class="tab-content"></section>' +
            '<section id="tab_keep" class="tab-content"></section>';
    });

    function boot() {
        window.loadPanelScript('js/tabs.js');
        TATA.bindTabList();
    }

    const library = () => document.getElementById('tabbtn_library');
    const chip = id => document.querySelector('[data-subtab="' + id + '"]');

    test('a section chip shows that section and keeps Library selected', function () {
        boot();
        library().click();
        expect(document.body.getAttribute('data-tab')).toBe('tab_styles');

        chip('tab_keep').click();
        expect(document.body.getAttribute('data-tab')).toBe('tab_keep');
        expect(document.getElementById('tab_keep').classList.contains('active')).toBe(true);
        expect(document.getElementById('tab_styles').classList.contains('active')).toBe(false);
        expect(library().classList.contains('active')).toBe(true);
        expect(library().getAttribute('aria-controls')).toBe('tab_keep');
        expect(chip('tab_keep').getAttribute('aria-pressed')).toBe('true');
        expect(chip('tab_styles').getAttribute('aria-pressed')).toBe('false');
    });

    test('Library reopens on the section used last, also after a restart', function () {
        boot();
        chip('tab_colors').click();
        document.querySelector('[data-tab="tab_button"]').click();
        library().click();
        expect(document.body.getAttribute('data-tab')).toBe('tab_colors');

        const strip = document.querySelector('.tabs');
        delete strip.dataset.tabsBound;
        library().setAttribute('data-tab', 'tab_styles');
        boot();
        expect(library().getAttribute('data-tab')).toBe('tab_colors');
    });

    test('code that names a section directly still lands in Library', function () {
        boot();
        TATA.activateTab('tab_keep');
        expect(library().classList.contains('active')).toBe(true);
        expect(document.body.getAttribute('data-tab')).toBe('tab_keep');
    });
});
