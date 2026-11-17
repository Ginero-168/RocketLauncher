describe('core utilities (js/core.js)', function () {
    let lastRequest;

    function reader(chunks) {
        const queue = chunks.map(text => Buffer.from(text));
        const read = jest.fn(() => Promise.resolve(queue.length ? { done: false, value: queue.shift() } : { done: true }));
        return { getReader: () => ({ read: read }), read: read };
    }

    function respond(response) {
        global.fetch = jest.fn((url, request) => {
            lastRequest = request;
            return Promise.resolve(response);
        });
    }

    beforeEach(function () {
        window.CSInterface = function () {
            this.getSystemPath = () => '/ext';
        };
        window.SystemPath = { EXTENSION: 'extension' };
        lastRequest = null;
        jest.spyOn(console, 'log').mockImplementation(() => {});
        window.loadPanelScript('js/core.js');
    });

    afterEach(function () {
        delete global.fetch;
        jest.restoreAllMocks();
    });

    test('a normal response passes through with status, text and parsed JSON', async function () {
        const body = reader(['{"name":', '"rocket"}']);
        respond({ ok: true, status: 200, headers: new Headers(), body: body });

        const response = await TATA.fetchWithTimeout('https://example.test/x', { method: 'POST', maxBytes: 1000 }, 50);

        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);
        await expect(response.text()).resolves.toBe('{"name":"rocket"}');
        await expect(response.json()).resolves.toEqual({ name: 'rocket' });
        expect(lastRequest.method).toBe('POST');
        expect(lastRequest.maxBytes).toBeUndefined();
        await new Promise(resolve => setTimeout(resolve, 80));
        expect(lastRequest.signal.aborted).toBe(false);
    });

    test('a request that never answers is aborted after the timeout', async function () {
        global.fetch = jest.fn((url, request) => {
            lastRequest = request;
            return new Promise((resolve, reject) => {
                request.signal.addEventListener('abort', () => reject(new Error('aborted')));
            });
        });

        await expect(TATA.fetchWithTimeout('https://example.test/slow', {}, 20)).rejects.toThrow('aborted');
        expect(lastRequest.signal.aborted).toBe(true);
    });

    test('a declared body larger than maxBytes is refused before it is read', async function () {
        const body = reader(['tiny']);
        respond({ ok: true, status: 200, headers: new Headers({ 'content-length': '5000' }), body: body });

        await expect(TATA.fetchWithTimeout('https://example.test/big', { maxBytes: 100 }))
            .rejects.toThrow('Response exceeds 100 bytes');
        expect(body.read).not.toHaveBeenCalled();
        expect(lastRequest.signal.aborted).toBe(true);
    });

    test('a streamed body with no length header stops at maxBytes', async function () {
        const body = reader(['a'.repeat(60), 'b'.repeat(60), 'c'.repeat(60), 'd'.repeat(60)]);
        respond({ ok: true, status: 200, headers: new Headers(), body: body });

        await expect(TATA.fetchWithTimeout('https://example.test/stream', { maxBytes: 100 }))
            .rejects.toThrow('Response exceeds 100 bytes');
        expect(body.read).toHaveBeenCalledTimes(2);
        expect(lastRequest.signal.aborted).toBe(true);
    });

    test('a body that cannot be size-capped is refused rather than read whole', async function () {
        const text = jest.fn(() => Promise.resolve('x'.repeat(10)));
        respond({ ok: true, status: 200, headers: new Headers(), body: null, text: text });

        await expect(TATA.fetchWithTimeout('https://example.test/opaque', {}))
            .rejects.toThrow('cannot be size-capped');
        expect(text).not.toHaveBeenCalled();
    });

    test('the storage upgrade folds the old tabs into one grid and keeps the original in a backup', function () {
        const old = JSON.stringify({
            swift: [{ id: 'btn_builtin' }, { id: 'u1', name: 'Mine' }, { id: 'sp', type: 'subpanel' }],
            tools: [{ id: 'u2' }, null],
            tab_button: [{ id: 'u3' }]
        });
        localStorage.setItem('tata_v2_layout', old);
        localStorage.setItem('tata_tab_names', '{"swift":"S"}');

        TATA.checkStorageVersion();

        expect(JSON.parse(localStorage.getItem('tata_v2_layout'))).toEqual({
            tab_button: [{ id: 'u1', name: 'Mine' }, { id: 'u2' }, { id: 'u3' }]
        });
        expect(localStorage.getItem('tata_v2_layout_backup')).toBe(old);
        expect(localStorage.getItem('tata_tab_names')).toBeNull();
        expect(localStorage.getItem('tata_storage_version')).toBe('3');

        const migrated = localStorage.getItem('tata_v2_layout');
        TATA.checkStorageVersion();
        expect(localStorage.getItem('tata_v2_layout')).toBe(migrated);
        expect(localStorage.getItem('tata_v2_layout_backup')).toBe(old);
    });

    test('an unreadable layout during the upgrade stays recoverable from the backup', function () {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        localStorage.setItem('tata_v2_layout', '{broken');

        expect(() => TATA.checkStorageVersion()).not.toThrow();

        expect(localStorage.getItem('tata_v2_layout')).toBeNull();
        expect(localStorage.getItem('tata_v2_layout_backup')).toBe('{broken');
        console.error.mockRestore();
    });

    test('stored settings read back, fall back when missing, and clear on null', function () {
        expect(TATA.getStored('tata_ai_model', 'default')).toBe('default');
        TATA.setStored('tata_ai_model', 'model-a');
        expect(localStorage.getItem('tata_ai_model')).toBe('model-a');
        expect(TATA.getStored('tata_ai_model', 'default')).toBe('model-a');

        TATA.setStored('tata_ai_model', null);
        expect(localStorage.getItem('tata_ai_model')).toBeNull();
        expect(TATA.getStored('tata_ai_model', 'default')).toBe('default');

        expect(TATA.safeParse('{"a":1}', null)).toEqual({ a: 1 });
        jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(TATA.safeParse('{oops', 'fallback')).toBe('fallback');
        console.error.mockRestore();
    });
});
