// TATA Error Handling and Undo Support Module
// Version: 2.1
// This file should be loaded before hostscript.jsx

// Load utilities
#include "utils.jsx"

// ====================================================================================
// ====================================   ERROR HANDLING   ============================
// ====================================================================================

/**
 * Standardized response wrapper for all TATA functions
 * @param {boolean} success - Whether the operation succeeded
 * @param {*} data - Data to return on success
 * @param {string} error - Error message on failure
 * @returns {string} JSON string with response
 */
function createResponse(success, data, error) {
    return JSON.stringify({
        success: success,
        data: data || null,
        error: error || null
    });
}

/**
 * Wrap function execution with error handling
 * @param {Function} fn - Function to execute
 * @param {string} functionName - Name for error messages
 * @returns {*} Result from function or error response
 */
function safeExecute(fn, functionName) {
    try {
        var result = fn();
        // If result is already a JSON response, pass it through
        if (typeof result === 'string' && result.indexOf('"success"') >= 0) {
            return result;
        }
        // Otherwise wrap in success response
        return createResponse(true, result, null);
    } catch (e) {
        var errorMsg = functionName + " failed: " + e.message;
        if (e.line) errorMsg += " (Line: " + e.line + ")";
        return createResponse(false, null, errorMsg);
    }
}

// ====================================================================================
// ====================================   UNDO SUPPORT   ==============================
// ====================================================================================

/**
 * Execute function with undo support for Illustrator.
 * Note: Illustrator ExtendScript does not support beginUndoGroup/endUndoGroup
 * (those are Photoshop APIs). In Illustrator, each script execution is
 * automatically a single undo step. This wrapper provides error handling
 * and can be used as a logical grouping boundary.
 *
 * @param {Document} doc - The Illustrator document
 * @param {string} undoName - Name for logging purposes
 * @param {Function} fn - Function to execute
 * @returns {*} Result from function
 */
function withUndoGroup(doc, undoName, fn) {
    try {
        var result = fn();
        return result;
    } catch (e) {
        logError("withUndoGroup[" + undoName + "]", e);
        throw e;
    }
}

// ====================================================================================
// ====================================   VALIDATORS   ================================
// ====================================================================================

/**
 * Validate that document is open
 * @returns {Object} {valid: boolean, error: string}
 */
function validateDocument() {
    if (app.documents.length === 0) {
        return { valid: false, error: "Please open a document first" };
    }
    return { valid: true, error: null };
}

/**
 * Validate selection exists
 * @param {Document} doc - The Illustrator document
 * @param {number} minCount - Minimum required selection count
 * @returns {Object} {valid: boolean, error: string}
 */
function validateSelection(doc, minCount) {
    if (!doc.selection || doc.selection.length === 0) {
        return { valid: false, error: "Please select at least one object" };
    }
    if (minCount && doc.selection.length < minCount) {
        return { valid: false, error: "Please select at least " + minCount + " objects" };
    }
    return { valid: true, error: null };
}

/**
 * Validate numeric parameter
 * @param {*} value - Value to validate
 * @param {string} name - Parameter name for error message
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {Object} {valid: boolean, error: string}
 */
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

// ====================================================================================
// ====================================   LOGGING   ===================================
// ====================================================================================

/**
 * Log error for debugging
 * @param {string} context - Context where error occurred
 * @param {Error} error - The error object
 */
function logError(context, error) {
    // In production, this could write to a file
    // For now, just construct a detailed message
    var msg = "[TATA ERROR] " + context;
    if (error) {
        msg += ": " + error.message;
        if (error.line) msg += " (Line: " + error.line + ")";
    }
    // Could use $.writeln(msg) for ExtendScript Toolkit debugging
    // Or write to file for persistent logging
}
