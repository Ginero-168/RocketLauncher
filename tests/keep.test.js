const fs = require('fs');
const os = require('os');
const path = require('path');

describe('Keep tab (js/keep.js)', function () {
    let keeperDir, run, toast, confirmAnswer;

    function markup() {
        document.body.innerHTML =
            '<div id="tab_keep">' +
            '<span id="item_count"></span>' +
            '<div id="keeper_grid"><div id="empty_state">empty</div></div>' +
            '<button id="btn_add_selection">Add</button>' +
            '<div class="keep-footer"><button id="btn_clear">Clear</button></div>' +
            '</div>';
    }

    function boot() {
        markup();
        Object.assign(window.TATA, {
            host: { run: run },
            showToast: toast,
            askConfirm: jest.fn(() => Promise.resolve(confirmAnswer))
        });
        window.loadPanelScript('js/sanitize.js');
        window.loadPanelScript('js/keep.js');
        return TATA.keep.init();
    }

    function keepFile(name, content) {
        fs.mkdirSync(keeperDir, { recursive: true });
        const file = path.join(keeperDir, name);
        fs.writeFileSync(file, content);
        return file;
    }

    function cards() {
        return Array.from(document.querySelectorAll('#keeper_grid .keeper-card'));
    }

    function stored() {
        return JSON.parse(localStorage.getItem('tata_keeper') || '[]');
    }

    async function settle() {
        for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 0));
    }

    beforeEach(function () {
        window.require = require;
        keeperDir = path.join(os.homedir(), '.tata_keeper');
        fs.rmSync(keeperDir, { recursive: true, force: true });
        run = jest.fn();
        toast = jest.fn();
        confirmAnswer = true;
    });

    test('a hostile SVG on disk is cleaned before its preview reaches the page', async function () {
        const file = keepFile('keep_1.svg',
            '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" onload="window.pwned=1">' +
            '<script>window.pwned=1</script>' +
            '<a href="javascript:window.pwned=1"><rect id="r" width="5" height="5" onclick="window.pwned=1"/></a>' +
            '<foreignObject><iframe src="https://evil.example"></iframe></foreignObject>' +
            '</svg>');
        localStorage.setItem('tata_keeper', JSON.stringify([{ id: '1', type: 'file_svg', file_path: file }]));

        await boot();

        const svg = document.querySelector('.keeper-card svg.keeper-preview, .keeper-card .keeper-thumb svg');
        expect(svg).not.toBeNull();
        expect(svg.querySelector('rect')).not.toBeNull();
        const html = document.getElementById('keeper_grid').innerHTML;
        expect(html).not.toMatch(/<script|onload|onclick|javascript:|<iframe|foreignObject/i);
        expect(window.pwned).toBeUndefined();
    });

    test('Add saves the selection into the Keep folder, shows it, and it survives a reload', async function () {
        await boot();
        document.getElementById('btn_add_selection').click();

        expect(run).toHaveBeenCalledTimes(1);
        const [handler, params, callback] = run.mock.calls[0];
        expect(handler).toBe('saveSelectionAsRichSvg');
        expect(path.dirname(params.path)).toBe(keeperDir);

        keepFile(path.basename(params.path), '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>');
        callback('Success');
        await settle();

        expect(cards()).toHaveLength(1);
        expect(stored()).toEqual([expect.objectContaining({ type: 'file_svg', file_path: params.path })]);

        await boot();
        expect(cards()).toHaveLength(1);
        expect(document.querySelector('.keeper-card circle')).not.toBeNull();
    });

    test('Add with nothing selected stores nothing and says so', async function () {
        await boot();
        document.getElementById('btn_add_selection').click();
        run.mock.calls[0][2]('No Selection');
        await settle();

        expect(cards()).toHaveLength(0);
        expect(stored()).toEqual([]);
        expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
    });

    test('deleting a card after confirming removes the file, the card and the stored entry', async function () {
        const file = keepFile('keep_2.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
        const other = keepFile('keep_3.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
        localStorage.setItem('tata_keeper', JSON.stringify([
            { id: '2', type: 'file_svg', file_path: file },
            { id: '3', type: 'file_svg', file_path: other }
        ]));
        await boot();

        document.querySelector('.keeper-card[data-id="2"] .keeper-delete').click();
        await settle();

        expect(fs.existsSync(file)).toBe(false);
        expect(fs.existsSync(other)).toBe(true);
        expect(cards().map(card => card.dataset.id)).toEqual(['3']);
        expect(stored().map(item => item.id)).toEqual(['3']);
    });

    test('declining the delete prompt keeps the file and the card', async function () {
        const file = keepFile('keep_4.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
        localStorage.setItem('tata_keeper', JSON.stringify([{ id: '4', type: 'file_svg', file_path: file }]));
        confirmAnswer = false;
        await boot();

        document.querySelector('.keeper-card .keeper-delete').click();
        await settle();

        expect(fs.existsSync(file)).toBe(true);
        expect(cards()).toHaveLength(1);
        expect(stored()).toHaveLength(1);
    });

    test('an index entry pointing outside the Keep folder is dropped, and Clear all never deletes it', async function () {
        const outside = path.join(os.homedir(), 'precious.svg');
        fs.writeFileSync(outside, '<svg xmlns="http://www.w3.org/2000/svg"/>');
        const escape = path.join(keeperDir, '..', 'precious.svg');
        const inside = keepFile('keep_5.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
        localStorage.setItem('tata_keeper', JSON.stringify([
            { id: 'a', type: 'file_svg', file_path: outside },
            { id: 'b', type: 'file_svg', file_path: escape },
            { id: 'c', type: 'file_svg', file_path: inside }
        ]));
        await boot();

        expect(cards().map(card => card.dataset.id)).toEqual(['c']);
        await TATA.keep.clearAll();

        expect(fs.existsSync(outside)).toBe(true);
        expect(fs.existsSync(inside)).toBe(false);
        expect(cards()).toHaveLength(0);
    });

    test('clicking a card places its file in Illustrator', async function () {
        const file = keepFile('keep_6.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
        localStorage.setItem('tata_keeper', JSON.stringify([{ id: '6', type: 'file_svg', file_path: file }]));
        await boot();

        cards()[0].click();
        expect(run).toHaveBeenCalledWith('placeSvg', { path: file }, expect.any(Function));
        run.mock.calls[0][2]('"Success"');
        expect(toast).toHaveBeenLastCalledWith(expect.any(String), 'success');
    });
});
