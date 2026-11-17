const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

describe('Graphic Style tab (js/graphic-styles.js)', function () {
    let presets, evalCode, toast, inputAnswer, confirmAnswer;

    function boot() {
        document.body.innerHTML =
            '<section id="tab_styles">' +
            '<button id="btn_add_style">Collect</button>' +
            '<div class="style-size"><button id="btn_style_size"></button>' +
            '<div id="style_size_menu" hidden>' +
            '<button data-size="100"></button><button data-size="75"></button>' +
            '<button data-size="50"></button><button data-size="25"></button>' +
            '</div></div>' +
            '<div id="style_list"></div>' +
            '</section>';
        Object.assign(window.TATA, {
            host: { evalCode: evalCode },
            showToast: toast,
            showInputModal: jest.fn((title, fields, done) => done(inputAnswer)),
            showConfirmModal: jest.fn((title, message, done) => done(confirmAnswer))
        });
        window.loadPanelScript('js/graphic-styles.js');
        return TATA.graphicStyles.refresh();
    }

    function preset(label) {
        fs.mkdirSync(presets, { recursive: true });
        const file = path.join(presets, label + '_data.ai');
        fs.writeFileSync(file, 'carrier');
        fs.writeFileSync(path.join(presets, label + '_text.png'), 'png');
        return file;
    }

    function cards() {
        return Array.from(document.querySelectorAll('#style_list .style-card'));
    }

    function hostScript(call) {
        return evalCode.mock.calls[call][0];
    }

    // Runs a generated ExtendScript in a fake Illustrator and reports what the
    // script handed to `new File(...)`, so a literal that broke out of its
    // string shows up as a syntax error or a different path.
    function runInFakeIllustrator(script) {
        const opened = [];
        const sandbox = {
            alert: function () {},
            File: function (p) { opened.push(p); this.exists = false; },
            app: { documents: { length: 1 }, activeDocument: { selection: [{ typename: 'PathItem' }] } }
        };
        const result = new vm.Script(script).runInNewContext(sandbox);
        return { result: result, opened: opened };
    }

    beforeEach(function () {
        window.require = require;
        presets = path.join(os.homedir(), 'Documents', 'Illustrator_Style_Presets');
        fs.rmSync(presets, { recursive: true, force: true });
        evalCode = jest.fn();
        toast = jest.fn();
        inputAnswer = { name: 'Style' };
        confirmAnswer = true;
    });

    test('lists each carrier file in the presets folder as a card', async function () {
        preset('Neon');
        preset('Chrome');
        fs.writeFileSync(path.join(presets, 'notes.txt'), 'not a style');
        await boot();

        expect(cards().map(card => card.textContent)).toEqual(['Chrome', 'Neon']);
    });

    test('a style name cannot write outside the presets folder', async function () {
        await boot();
        for (const name of ['../../escape', '..\\..\\escape', '/etc/passwd', 'a:b*c?"<>|']) {
            evalCode.mockClear();
            inputAnswer = { name: name };
            document.getElementById('btn_add_style').click();

            expect(evalCode).toHaveBeenCalledTimes(1);
            expect(() => new vm.Script(hostScript(0))).not.toThrow();
            const saved = hostScript(0).match(/tempDoc\.saveAs\(new File\(("(?:[^"\\]|\\.)*")\)/)[1];
            const target = JSON.parse(saved);
            expect(path.dirname(target)).toBe(presets);
            expect(path.basename(target)).toMatch(/_data\.ai$/);
        }
    });

    test('a path with quotes, backslashes and a newline stays one ExtendScript string', function () {
        window.loadPanelScript('js/graphic-styles.js');
        const hostile = 'C:\\Styles\\a"); app.quit(); ("\nb_data.ai';
        const script = TATA.graphicStyles.buildApplyScript(hostile, 'Style_x"; app.quit(); "');

        const run = runInFakeIllustrator(script);
        expect(run.result).toBe('Error: missing file');
        expect(run.opened).toEqual([hostile]);
    });

    test('clicking a card applies that style and marks it selected', async function () {
        const file = preset('Neon');
        await boot();
        cards()[0].click();

        expect(evalCode).toHaveBeenCalledTimes(1);
        expect(hostScript(0)).toContain(JSON.stringify(file));
        expect(cards()[0].classList.contains('is-selected')).toBe(true);
        expect(cards()[0].classList.contains('is-busy')).toBe(true);

        cards()[0].click();
        expect(evalCode).toHaveBeenCalledTimes(1);

        evalCode.mock.calls[0][1]('ok');
        expect(toast).toHaveBeenLastCalledWith(expect.any(String), 'success');
        expect(cards()[0].classList.contains('is-busy')).toBe(false);
    });

    test('a failed apply in Illustrator shows an error and frees the card', async function () {
        preset('Neon');
        await boot();
        cards()[0].click();
        evalCode.mock.calls[0][1]('Error: no selection');

        expect(toast).toHaveBeenLastCalledWith(expect.any(String), 'error');
        expect(cards()[0].classList.contains('is-busy')).toBe(false);
        cards()[0].click();
        expect(evalCode).toHaveBeenCalledTimes(2);
    });

    test('delete removes the style and its preview only after the user confirms', async function () {
        const file = preset('Neon');
        const png = file.replace(/_data\.ai$/, '_text.png');
        await boot();

        confirmAnswer = false;
        cards()[0].querySelector('.style-delete').click();
        expect(fs.existsSync(file)).toBe(true);
        expect(evalCode).not.toHaveBeenCalled();

        confirmAnswer = true;
        cards()[0].querySelector('.style-delete').click();
        await TATA.graphicStyles.refresh();
        expect(fs.existsSync(file)).toBe(false);
        expect(fs.existsSync(png)).toBe(false);
        expect(cards()).toHaveLength(0);
    });

    test('collecting over an existing name asks first and keeps the file when declined', async function () {
        preset('Neon');
        await boot();
        inputAnswer = { name: 'Neon' };
        confirmAnswer = false;
        document.getElementById('btn_add_style').click();

        expect(TATA.showConfirmModal).toHaveBeenCalledTimes(1);
        expect(evalCode).not.toHaveBeenCalled();
    });

    test('card size is remembered and a bad stored value falls back to 50%', async function () {
        localStorage.setItem('tata_style_card_size', '999');
        await boot();
        expect(document.getElementById('style_list').getAttribute('data-size')).toBe('50');

        document.querySelector('#style_size_menu [data-size="25"]').click();
        expect(localStorage.getItem('tata_style_card_size')).toBe('25');

        await boot();
        expect(document.getElementById('style_list').getAttribute('data-size')).toBe('25');
    });
});
