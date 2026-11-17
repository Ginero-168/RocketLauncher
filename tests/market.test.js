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
});
