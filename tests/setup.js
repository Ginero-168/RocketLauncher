/**
 * TATA V3 - Jest Setup
 * Mocks for CEP environment
 */

// Mock CSInterface
global.CSInterface = function () {
    return {
        evalScript: jest.fn((script, callback) => callback && callback('')),
        getSystemPath: jest.fn(() => '/mock/path'),
        addEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        resizeContent: jest.fn()
    };
};

// Mock SystemPath
global.SystemPath = {
    EXTENSION: 'EXTENSION'
};

// Mock CSEvent
global.CSEvent = function (type, scope) {
    return { type, scope, data: null };
};

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: jest.fn((key) => localStorageMock.store[key] || null),
    setItem: jest.fn((key, value) => { localStorageMock.store[key] = value; }),
    removeItem: jest.fn((key) => { delete localStorageMock.store[key]; }),
    clear: jest.fn(() => { localStorageMock.store = {}; })
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
