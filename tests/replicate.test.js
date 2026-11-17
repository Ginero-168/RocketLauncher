describe('Replicate client (js/scripting.js)', function () {
    function reply(body) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve('') });
    }

    beforeEach(function () {
        window.loadPanelScript('js/sanitize.js');
        window.loadPanelScript('js/scripting.js');
    });

    test('a prediction still running when the panel stops waiting is cancelled', async function () {
        const calls = [];
        TATA.fetchWithTimeout = jest.fn((url, options) => {
            calls.push({ url: url, method: (options && options.method) || 'GET' });
            if (url.endsWith('/cancel')) return reply({});
            return reply({ id: 'p1', status: 'processing', urls: { get: 'https://api.replicate.com/v1/predictions/p1' } });
        });

        await expect(TATA.runReplicate('r8_x', 'owner/model', { prompt: 'hi' }, { maxPolls: 2, pollDelayMs: 0 }))
            .rejects.toThrow('timed out');
        expect(calls[calls.length - 1]).toEqual({ url: 'https://api.replicate.com/v1/predictions/p1/cancel', method: 'POST' });
    });

    test('a finished prediction is not cancelled', async function () {
        TATA.fetchWithTimeout = jest.fn(() => reply({ id: 'p2', status: 'succeeded', output: ['ok'] }));
        await expect(TATA.runReplicate('r8_x', 'owner/model', { prompt: 'hi' }, { maxPolls: 2, pollDelayMs: 0 })).resolves.toBe('ok');
        expect(TATA.fetchWithTimeout).toHaveBeenCalledTimes(1);
    });
});
