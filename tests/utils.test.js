// TATA Pro - Unit Tests Example
// Simple standalone tests for utility functions
// Run with: node tests/utils.test.js (or in browser console)

// Simple test framework
function assert(condition, message) {
    if (!condition) {
        throw new Error('Test failed: ' + message);
    }
}

function test(name, fn) {
    try {
        fn();
        console.log('✓ ' + name);
    } catch (e) {
        console.error('✗ ' + name);
        console.error('  ' + e.message);
    }
}

// ====================================================================================
// ====================================   COLOR CONVERSION TESTS   ====================
// ====================================================================================

test('hexToRgb converts #FF0000 to {r:255, g:0, b:0}', function () {
    // Mock the function for testing (in real scenario, load from utils.jsx)
    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);
        return { r: r, g: g, b: b };
    }

    var result = hexToRgb('#FF0000');
    assert(result.r === 255, 'Red should be 255');
    assert(result.g === 0, 'Green should be 0');
    assert(result.b === 0, 'Blue should be 0');
});

test('hexToRgb handles lowercase hex', function () {
    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);
        return { r: r, g: g, b: b };
    }

    var result = hexToRgb('#00ff00');
    assert(result.r === 0, 'Red should be 0');
    assert(result.g === 255, 'Green should be 255');
    assert(result.b === 0, 'Blue should be 0');
});

test('rgbToHex converts {red:255, green:0, blue:0} to #FF0000', function () {
    function rgbToHex(rgb) {
        function toHex(n) {
            var h = Math.round(n).toString(16).toUpperCase();
            return h.length == 1 ? "0" + h : h;
        }
        return "#" + toHex(rgb.red) + toHex(rgb.green) + toHex(rgb.blue);
    }

    var result = rgbToHex({ red: 255, green: 0, blue: 0 });
    assert(result === '#FF0000', 'Should convert to #FF0000');
});

// ====================================================================================
// ====================================   VALIDATION TESTS   ==========================
// ====================================================================================

test('validateNumber accepts valid numbers', function () {
    function validateNumber(value, name, min, max) {
        var num = parseFloat(value);
        if (isNaN(num)) {
            return { valid: false, error: name + " must be a valid number" };
        }
        if (min !== undefined && num < min) {
            return { valid: false, error: name + " must be at least " + min };
        }
        if (max !== undefined && num > max) {
            return { valid: false, error: name + " must be no more than " + max };
        }
        return { valid: true, error: null, value: num };
    }

    var result = validateNumber('50', 'width', 0, 100);
    assert(result.valid === true, 'Should accept valid number');
    assert(result.value === 50, 'Should return parsed value');
});

test('validateNumber rejects invalid numbers', function () {
    function validateNumber(value, name, min, max) {
        var num = parseFloat(value);
        if (isNaN(num)) {
            return { valid: false, error: name + " must be a valid number" };
        }
        if (min !== undefined && num < min) {
            return { valid: false, error: name + " must be at least " + min };
        }
        if (max !== undefined && num > max) {
            return { valid: false, error: name + " must be no more than " + max };
        }
        return { valid: true, error: null, value: num };
    }

    var result = validateNumber('abc', 'width', 0, 100);
    assert(result.valid === false, 'Should reject non-number');
    assert(result.error !== null, 'Should have error message');
});

test('validateNumber enforces min/max bounds', function () {
    function validateNumber(value, name, min, max) {
        var num = parseFloat(value);
        if (isNaN(num)) {
            return { valid: false, error: name + " must be a valid number" };
        }
        if (min !== undefined && num < min) {
            return { valid: false, error: name + " must be at least " + min };
        }
        if (max !== undefined && num > max) {
            return { valid: false, error: name + " must be no more than " + max };
        }
        return { valid: true, error: null, value: num };
    }

    var tooLow = validateNumber('-5', 'width', 0, 100);
    assert(tooLow.valid === false, 'Should reject value below min');

    var tooHigh = validateNumber('200', 'width', 0, 100);
    assert(tooHigh.valid === false, 'Should reject value above max');
});

// ====================================================================================
// ====================================   UI UTILS TESTS   ============================
// ====================================================================================

test('isValidHex accepts valid hex colors', function () {
    function isValidHex(hex) {
        return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
    }

    assert(isValidHex('#FF0000') === true, '6-digit hex should be valid');
    assert(isValidHex('#F00') === true, '3-digit hex should be valid');
    assert(isValidHex('#ff0000') === true, 'Lowercase should be valid');
});

test('isValidHex rejects invalid hex colors', function () {
    function isValidHex(hex) {
        return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
    }

    assert(isValid Hex('FF0000') === false, 'Should require # prefix');
    assert(isValidHex('#GG0000') === false, 'Should reject invalid characters');
    assert(isValidHex('#FF00') === false, 'Should reject wrong length');
});

// Run all tests
console.log('\n=== TATA Pro Unit Tests ===\n');
console.log('All tests completed!');
console.log('\nNote: These are example tests. In a real test suite, you would:');
console.log('  1. Load actual utility functions from source files');
console.log('  2. Use a proper test framework (Jest, Mocha, etc.)');
console.log('  3. Run tests as part of CI/CD pipeline');
console.log('  4. Add integration tests for CEP functionality');
