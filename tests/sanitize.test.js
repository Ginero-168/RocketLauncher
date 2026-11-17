describe('SVG sanitizer and JSX run confirmation (js/sanitize.js)', function () {
    beforeEach(function () {
        window.loadPanelScript('js/sanitize.js');
    });

    function clean(markup) {
        return TATA.sanitizeSvg(markup);
    }

    test('a plain icon survives with its geometry', function () {
        const out = clean('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h4v2H4z" fill="#00bae2"/></svg>');
        expect(out).toContain('viewBox="0 0 24 24"');
        expect(out).toContain('d="M4 4h4v2H4z"');
        expect(out).toContain('fill="#00bae2"');
    });

    test.each([
        ['script element', '<svg><script>alert(1)</script><path d="M0 0"/></svg>', /script|alert/i],
        ['event handler', '<svg onload="alert(1)"><path d="M0 0" onclick="alert(2)"/></svg>', /onload|onclick|alert/i],
        ['javascript href', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="javascript:alert(1)"/></svg>', /javascript/i],
        ['external href', '<svg><use href="https://evil.example/x.svg#a"/></svg>', /evil/i],
        ['foreignObject html', '<svg><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror=alert(1)></div></foreignObject></svg>', /foreignobject|img|onerror/i],
        ['remote url in style', '<svg><path style="fill:url(https://evil.example/a)" d="M0 0"/></svg>', /evil/i],
        ['css escape trick', '<svg><path style="fill:\\75 rl(https://evil.example/a)" d="M0 0"/></svg>', /evil/i],
        ['image element', '<svg><image href="https://evil.example/a.png"/></svg>', /image|evil/i],
        ['animate that rewrites href', '<svg><a><animate attributeName="href" to="javascript:alert(1)"/></a></svg>', /animate|javascript/i]
    ])('%s is removed', function (_, markup, forbidden) {
        expect(clean(markup)).not.toMatch(forbidden);
    });

    test('documents with a DOCTYPE or entities are refused outright', function () {
        expect(clean('<!DOCTYPE svg [<!ENTITY x "y">]><svg>&x;</svg>')).toBe('');
    });

    test('non-SVG input is refused', function () {
        expect(clean('<html><body>hi</body></html>')).toBe('');
        expect(clean('not markup')).toBe('');
    });

    test('a local gradient reference is kept', function () {
        const out = clean('<svg><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect fill="url(#g)" width="4" height="4"/></svg>');
        expect(out).toContain('fill="url(#g)"');
    });

    test('mountSanitizedIcon falls back to short plain text for non-SVG labels', function () {
        const box = document.createElement('span');
        expect(TATA.mountSanitizedIcon(box, 'Rocket launcher label')).toBe(true);
        expect(box.textContent).toBe('Rocket l');
        expect(box.querySelector('svg')).toBeNull();
    });

    test('AI, auto-fix and Marketplace code needs confirmation; the editor does not', function () {
        expect(TATA.shouldConfirmJsxRun('ai')).toBe(true);
        expect(TATA.shouldConfirmJsxRun('auto-fix')).toBe(true);
        expect(TATA.shouldConfirmJsxRun('market')).toBe(true);
        expect(TATA.shouldConfirmJsxRun('user')).toBe(false);
    });

    test('declined Marketplace code never reaches Illustrator', async function () {
        const evalCode = jest.fn();
        TATA.host = { evalCode: evalCode };
        const real = TATA.requestJsxConfirmation;
        TATA.requestJsxConfirmation = opts => real(Object.assign({}, opts, { ask: () => false }));

        const result = await TATA.runConfirmedJsx('alert(1)', 'market');
        expect(result.ran).toBe(false);
        expect(evalCode).not.toHaveBeenCalled();
    });

    test('without the confirmation dialog in the page, tracked code does not run', async function () {
        const evalCode = jest.fn();
        TATA.host = { evalCode: evalCode };
        const result = await TATA.runConfirmedJsx('alert(1)', 'ai');
        expect(result.ran).toBe(false);
        expect(evalCode).not.toHaveBeenCalled();
    });

    test('accepted code runs and returns the host result', async function () {
        TATA.host = { evalCode: (code, cb) => cb('ok:' + code) };
        const real = TATA.requestJsxConfirmation;
        TATA.requestJsxConfirmation = opts => real(Object.assign({}, opts, { ask: () => true }));
        const result = await TATA.runConfirmedJsx('1+1', 'ai');
        expect(result).toEqual({ ran: true, res: 'ok:1+1' });
    });
});
