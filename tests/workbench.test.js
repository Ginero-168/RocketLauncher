describe('Tool tab workbench (js/tabs.js)', function () {
    beforeEach(function () {
        document.body.className = '';
        document.body.removeAttribute('data-tab');
        document.body.innerHTML =
            '<nav class="tabs">' +
            '<button class="tab-btn active" data-tab="tab_button"></button>' +
            '<button class="tab-btn" data-tab="tab_colors"></button>' +
            '</nav>' +
            '<section id="tab_button" class="tab-content active"></section>' +
            '<section id="workbench" data-view="editor">' +
            '<button data-workbench-view="editor"></button><button data-workbench-view="ai"></button>' +
            '<textarea id="prompt_input"></textarea><button id="btn_workbench_close"></button></section>' +
            '<section id="tab_colors" class="tab-content"></section>';
        window.loadPanelScript('js/tabs.js');
        TATA.bindTabList();
        TATA.activateTab('tab_button');
    });

    function strip(index) {
        document.querySelectorAll('.tab-btn')[index].click();
    }

    test('the old Edit and AI names open the workbench inside Tool', function () {
        TATA.activateTab('tab_editor');
        expect(document.body.getAttribute('data-tab')).toBe('tab_button');
        expect(TATA.workbench.isOpen()).toBe(true);
        expect(document.getElementById('tab_button').classList.contains('active')).toBe(true);

        TATA.activateTab('tab_button');
        expect(TATA.workbench.isOpen()).toBe(false);

        TATA.activateTab('tab_ai');
        expect(TATA.workbench.isOpen()).toBe(true);
        expect(document.activeElement.id).toBe('prompt_input');
    });

    test('visiting another tab keeps the workbench; Tool pressed twice returns to the buttons', function () {
        TATA.activateTab('tab_editor');
        strip(1);
        expect(TATA.workbench.isOpen()).toBe(false);          // another tab is showing
        strip(0);
        expect(TATA.workbench.isOpen()).toBe(true);           // back where the user was
        strip(0);
        expect(TATA.workbench.isOpen()).toBe(false);
    });

    test('Code and AI are separate views; the switch and the old names choose between them', function () {
        TATA.activateTab('tab_ai');
        expect(TATA.workbench.view()).toBe('ai');
        expect(document.getElementById('workbench').getAttribute('data-view')).toBe('ai');
        expect(document.querySelector('[data-workbench-view="ai"]').getAttribute('aria-pressed')).toBe('true');

        document.querySelector('[data-workbench-view="editor"]').click();
        expect(TATA.workbench.view()).toBe('editor');
        expect(TATA.workbench.isOpen()).toBe(true);

        // AI writes code, the panel shows it in the Code view.
        document.querySelector('[data-workbench-view="ai"]').click();
        TATA.activateTab('tab_editor');
        expect(TATA.workbench.view()).toBe('editor');
    });

    test('leaving and coming back keeps the view that was open', function () {
        TATA.activateTab('tab_ai');
        strip(1);
        strip(0);
        expect(TATA.workbench.isOpen()).toBe(true);
        expect(TATA.workbench.view()).toBe('ai');
    });

    test('the back button returns to the buttons', function () {
        TATA.activateTab('tab_editor');
        document.getElementById('btn_workbench_close').click();
        expect(TATA.workbench.isOpen()).toBe(false);
        expect(document.body.getAttribute('data-tab')).toBe('tab_button');
    });
});
