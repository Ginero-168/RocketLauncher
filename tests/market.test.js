describe('Marketplace requests (js/market.js)', function () {
    afterEach(function () {
        jest.useRealTimers();
        delete global.fetch;
    });

    test('a server that never answers ends in a message, and the list can load again', async function () {
        jest.useFakeTimers();
        document.body.innerHTML = '<div id="market_list"></div><div id="market_note"></div>';
        global.fetch = jest.fn((url, options) => new Promise((resolve, reject) => {
            options.signal.addEventListener('abort', () => {
                const err = new Error('aborted');
                err.name = 'AbortError';
                reject(err);
            });
        }));
        window.loadPanelScript('js/market.js');

        TATA.market.refresh();
        expect(global.fetch).toHaveBeenCalledTimes(1);
        await jest.advanceTimersByTimeAsync(30000);

        expect(document.body.textContent).toContain('Marketplace ไม่ตอบ');
        TATA.market.refresh();
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('while connecting, the panel shows the code the browser page must match', async function () {
        document.body.innerHTML = '<p id="market_account"></p><button id="btn_market_connect"></button>';
        const opened = [];
        const pending = { setTimeout() {}, on() {}, write() {}, end() {} };
        window.require = name => (name === 'http' || name === 'https') ? { request: () => pending } : require(name);
        TATA.getCSInterface = () => ({ openURLInDefaultBrowser: url => opened.push(url) });
        TATA.marketRequest = () => Promise.resolve({
            ok: true, device_code: 'a'.repeat(32), user_code: 'ABCD-EF23',
            verify_url: 'https://rl.kirita.me/auth/panel.php?code=ABCD-EF23', interval: 2, expires_in: 600
        });
        window.loadPanelScript('js/market.js');

        document.getElementById('btn_market_connect').click();
        await new Promise(r => setTimeout(r, 0));

        expect(opened).toHaveLength(1);
        expect(document.getElementById('market_account').textContent).toContain('ABCD-EF23');
        delete window.require;
    });
});
