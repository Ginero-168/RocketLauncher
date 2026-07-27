/**
 * Chat rendering, copy actions, and room request contract.
 */

const fs = require('fs');
const path = require('path');

function loadChat() {
    document.body.innerHTML = `
        <div id="chat_main">
            <div id="chat_dropzone">
                <div class="chat-dropzone-inner"><div></div><div></div></div>
            </div>
        </div>
        <div id="chat_messages"></div>
        <span id="chat_room_name"></span>
        <span id="chat_room_badge"></span>
        <div id="chat_recent_rooms"></div>
        <div id="chat_rooms_panel"></div>
    `;
    window.TATA = { showToast: jest.fn() };
    window.TATA_CONFIG = { CHAT_BACKEND_URL: 'https://chat.example.test' };
    global.TATA = window.TATA;
    global.TATA_CONFIG = window.TATA_CONFIG;
    global.fetch = jest.fn();
    global.URL.createObjectURL = jest.fn(() => 'blob:test-media');
    global.URL.revokeObjectURL = jest.fn();
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: jest.fn(() => Promise.resolve()) },
    });

    const source = fs.readFileSync(path.join(__dirname, '../js/chat.js'), 'utf8');
    eval(source);
    return window.TATA.chat;
}

describe('chat messages', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        jest.clearAllMocks();
    });

    test('renders Copy on text and copies the complete message', async () => {
        const chat = loadChat();
        await chat._test.renderMessage({
            id: 1,
            username: 'A',
            message_type: 'text',
            content: 'hello\nworld',
            created_at: '2026-07-27 10:00:00',
        });

        const copy = document.querySelector('.chat-msg-copy');
        expect(copy).not.toBeNull();
        copy.click();
        await Promise.resolve();
        await Promise.resolve();
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello\nworld');
    });

    test('falls back when CEP denies navigator clipboard permission', async () => {
        const chat = loadChat();
        navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Write permission denied.'));
        document.execCommand = jest.fn(() => true);

        await expect(chat._test.copyMessage({
            id: 2,
            username: 'A',
            message_type: 'text',
            content: 'copy through fallback',
            created_at: '2026-07-27 10:00:00',
        })).resolves.toBe('Message copied');

        expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    test('renders text, bitmap, SVG, and panel button messages with Copy', async () => {
        const chat = loadChat();
        fetch
            .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['png'], { type: 'image/png' }) })
            .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }) });

        const messages = [
            { id: 1, username: 'A', message_type: 'text', content: 'Text', created_at: '2026-07-27 10:00:00' },
            { id: 2, username: 'A', message_type: 'image', content: 'Image', file_path: 'uploads/a.png', created_at: '2026-07-27 10:00:00' },
            { id: 3, username: 'A', message_type: 'image', content: 'SVG', file_path: 'uploads/a.svg', created_at: '2026-07-27 10:00:00' },
            { id: 4, username: 'A', message_type: 'button_config', content: 'Button', button_data: { label: 'Fit', code: 'fit();' }, created_at: '2026-07-27 10:00:00' },
        ];
        for (const message of messages) await chat._test.renderMessage(message);

        expect(document.querySelectorAll('.chat-msg')).toHaveLength(4);
        expect(document.querySelectorAll('.chat-msg-copy')).toHaveLength(4);
        expect(document.querySelectorAll('.chat-msg-image')).toHaveLength(2);
        expect(document.querySelectorAll('.chat-btn-card')).toHaveLength(1);
    });

    test('falls back to a validated legacy upload only in the public room', async () => {
        const chat = loadChat();
        fetch
            .mockResolvedValueOnce({ ok: false, status: 404 })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                blob: async () => new Blob(['jpeg'], { type: 'image/jpeg' }),
            });

        await chat._test.renderMessage({
            id: 10,
            username: 'mike',
            message_type: 'image',
            content: 'LINE_ALBUM.jpg',
            file_path: 'uploads/6029bd146041befce1a1bfcec6feb94d.jpg',
            created_at: '2026-07-27 08:57:16',
        });

        expect(fetch.mock.calls[0][0]).toBe('https://chat.example.test/media.php?id=10');
        expect(fetch.mock.calls[1][0]).toBe(
            'https://chat.example.test/uploads/6029bd146041befce1a1bfcec6feb94d.jpg'
        );
        expect(document.querySelectorAll('.chat-msg-image')).toHaveLength(1);
    });

    test('never falls back to direct uploads for private rooms', async () => {
        const chat = loadChat();
        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true, room: { slug: 'private-ab12', name: 'Private', is_private: true } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true, messages: [] }),
            })
            .mockResolvedValueOnce({ ok: false, status: 404 });

        await chat._test.enterRoom('private-ab12', 'secret12');
        await chat._test.renderMessage({
            id: 11,
            username: 'mike',
            message_type: 'image',
            content: 'private.jpg',
            file_path: 'uploads/6029bd146041befce1a1bfcec6feb94d.jpg',
            created_at: '2026-07-27 08:57:16',
        });

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(document.querySelectorAll('.chat-msg-image')).toHaveLength(0);
        expect(document.querySelector('.chat-msg-media-error').textContent).toBe('Media unavailable');
    });

    test('dropping Illustrator canvas data exports the selection as SVG', () => {
        jest.useFakeTimers();
        loadChat();
        window.TATA.host = { run: jest.fn() };
        window.require = jest.fn(name => require(name));

        const event = new Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'dataTransfer', {
            value: {
                types: [],
                files: [],
                getData: jest.fn(() => ''),
            },
        });
        document.getElementById('chat_main').dispatchEvent(event);

        // Illustrator must finish its native drag transaction before ExtendScript
        // performs copy/export, otherwise it raises [PARM] or cancels the operation.
        expect(window.TATA.host.run).not.toHaveBeenCalled();
        jest.advanceTimersByTime(200);
        expect(window.TATA.host.run).toHaveBeenCalledWith(
            'saveSelectionAsRichSvg',
            expect.objectContaining({
                path: expect.stringMatching(/tata_chat_\d+\.svg$/),
                useClipboard: false,
            }),
            expect.any(Function)
        );
        jest.useRealTimers();
    });

    test('keeps private room credentials in headers instead of the poll URL', async () => {
        const chat = loadChat();
        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true, room: { slug: 'studio-ab12', name: 'Studio', is_private: true } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true, messages: [] }),
            });

        await chat._test.enterRoom('studio-ab12', 'secret12');
        expect(chat._test.getRoomHeaders(false)).toEqual({
            'X-Chat-Room': 'studio-ab12',
            Authorization: 'Bearer secret12',
        });
        expect(fetch.mock.calls[1][0]).toBe('https://chat.example.test/poll.php?since=0');
    });

    test('does not render a stale poll response after switching rooms', async () => {
        const chat = loadChat();
        let resolvePublicPoll;
        const publicPollResponse = new Promise(resolve => {
            resolvePublicPoll = resolve;
        });
        fetch
            .mockImplementationOnce(() => publicPollResponse)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true, room: { slug: 'private-ab12', name: 'Private', is_private: true } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true, messages: [] }),
            });

        const originalPoll = chat._test.pollMessages();
        await chat._test.enterRoom('private-ab12', 'secret12');
        resolvePublicPoll({
            ok: true,
            json: async () => ({
                ok: true,
                messages: [{
                    id: 99,
                    username: 'Public user',
                    message_type: 'text',
                    content: 'must not leak',
                    created_at: '2026-07-27 10:00:00',
                }],
            }),
        });
        await originalPoll;
        await Promise.resolve();
        await Promise.resolve();

        expect(document.querySelectorAll('.chat-msg')).toHaveLength(0);
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch.mock.calls[2][1].headers).toEqual({
            'X-Chat-Room': 'private-ab12',
            Authorization: 'Bearer secret12',
        });
    });
});
