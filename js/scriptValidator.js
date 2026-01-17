/**
 * Script Validation Utilities for TATA Pro AI
 * 
 * Validates generated JSX scripts before execution to catch common errors
 */

var ScriptValidator = (function () {
    'use strict';

    /**
     * Validate JavaScript syntax
     */
    function validateSyntax(code) {
        try {
            // Try to create a function from the code
            // This catches syntax errors without executing
            new Function(code);
            return { valid: true };
        } catch (e) {
            return {
                valid: false,
                error: "Syntax Error: " + e.message,
                type: 'syntax'
            };
        }
    }

    /**
     * Check for forbidden APIs (After Effects, Photoshop, etc.)
     */
    function checkForbiddenAPIs(code) {
        var forbidden = [
            {
                pattern: /app\.beginUndoGroup\s*\(/,
                message: "Use ErrorHandler.withUndoGroup() instead of app.beginUndoGroup()",
                severity: 'error'
            },
            {
                pattern: /app\.endUndoGroup\s*\(/,
                message: "Use ErrorHandler.withUndoGroup() instead of app.endUndoGroup()",
                severity: 'error'
            },
            {
                pattern: /\.artLayers/,
                message: "artLayers is Photoshop API. Use doc.layers for Illustrator",
                severity: 'error'
            },
            {
                pattern: /\.suspendRedraw/,
                message: "suspendRedraw is not supported in Illustrator",
                severity: 'error'
            },
            {
                pattern: /\.suspendHistory/,
                message: "suspendHistory is Photoshop API, not available in Illustrator",
                severity: 'error'
            },
            {
                pattern: /activeDocument\.layers\[/,
                message: "Use doc.layers for Illustrator, not activeDocument.layers[]",
                severity: 'warning'
            }
        ];

        var errors = [];

        for (var i = 0; i < forbidden.length; i++) {
            var rule = forbidden[i];
            if (rule.pattern.test(code)) {
                errors.push({
                    valid: false,
                    error: rule.message,
                    type: 'forbidden_api',
                    severity: rule.severity
                });
            }
        }

        if (errors.length > 0) {
            return errors[0]; // Return first error
        }

        return { valid: true };
    }

    /**
     * Validate common Illustrator patterns
     */
    function validateIllustratorPatterns(code) {
        var warnings = [];

        // Should check documents exist
        if (code.indexOf('activeDocument') !== -1 &&
            code.indexOf('documents.length') === -1 &&
            code.indexOf('app.documents.length') === -1) {
            warnings.push({
                message: "Missing document check. Add: if (app.documents.length === 0) return;",
                type: 'missing_check',
                severity: 'warning'
            });
        }

        // Should check selection when accessing it
        if ((code.indexOf('selection[') !== -1 || code.indexOf('selection.length') !== -1) &&
            code.indexOf('selection.length') === -1) {
            warnings.push({
                message: "Check selection exists before accessing: if (doc.selection.length === 0) return;",
                type: 'missing_check',
                severity: 'warning'
            });
        }

        // Should use try-catch for risky operations
        if ((code.indexOf('position') !== -1 ||
            code.indexOf('resize') !== -1 ||
            code.indexOf('rotate') !== -1) &&
            code.indexOf('try') === -1) {
            warnings.push({
                message: "Consider wrapping operations in try-catch for better error handling",
                type: 'missing_error_handling',
                severity: 'info'
            });
        }

        // Check for proper color creation
        if ((code.indexOf('RGBColor') !== -1 || code.indexOf('CMYKColor') !== -1) &&
            code.indexOf('new ') === -1) {
            warnings.push({
                message: "Color objects must be created with 'new' keyword: var color = new RGBColor();",
                type: 'api_usage',
                severity: 'error'
            });
        }

        return {
            valid: warnings.filter(w => w.severity === 'error').length === 0,
            warnings: warnings
        };
    }

    /**
     * Check for potentially unsafe operations
     */
    function checkSafetyPatterns(code) {
        var safetyIssues = [];

        // Infinite loops
        if (/while\s*\(\s*true\s*\)/.test(code) && code.indexOf('break') === -1) {
            safetyIssues.push({
                message: "Potential infinite loop detected (while(true) without break)",
                type: 'safety',
                severity: 'error'
            });
        }

        // File system operations without checks
        if ((code.indexOf('File(') !== -1 || code.indexOf('Folder(') !== -1) &&
            code.indexOf('exists') === -1) {
            safetyIssues.push({
                message: "File/Folder operations should check for existence first",
                type: 'safety',
                severity: 'warning'
            });
        }

        // Recursive functions without exit condition check
        if (code.indexOf('function') !== -1 && code.match(/function\s+(\w+)/)) {
            var funcName = code.match(/function\s+(\w+)/)[1];
            var funcBody = code.substring(code.indexOf('{', code.indexOf('function ' + funcName)));
            if (funcBody.indexOf(funcName + '(') !== -1) {
                // It's recursive
                safetyIssues.push({
                    message: "Recursive function detected. Ensure proper exit conditions exist.",
                    type: 'safety',
                    severity: 'warning'
                });
            }
        }

        return {
            valid: safetyIssues.filter(i => i.severity === 'error').length === 0,
            warnings: safetyIssues
        };
    }

    /**
     * Master validation function
     */
    function validateScript(code) {
        if (!code || code.trim().length === 0) {
            return {
                valid: false,
                errors: ["Script is empty"],
                warnings: []
            };
        }

        var results = {
            syntax: validateSyntax(code),
            forbidden: checkForbiddenAPIs(code),
            patterns: validateIllustratorPatterns(code),
            safety: checkSafetyPatterns(code)
        };

        var errors = [];
        var warnings = [];

        // Collect syntax errors
        if (!results.syntax.valid) {
            errors.push(results.syntax.error);
        }

        // Collect forbidden API errors
        if (!results.forbidden.valid) {
            errors.push(results.forbidden.error);
        }

        // Collect pattern issues
        if (results.patterns.warnings) {
            results.patterns.warnings.forEach(function (w) {
                if (w.severity === 'error') {
                    errors.push(w.message);
                } else {
                    warnings.push(w.message);
                }
            });
        }

        // Collect safety issues
        if (results.safety.warnings) {
            results.safety.warnings.forEach(function (w) {
                if (w.severity === 'error') {
                    errors.push(w.message);
                } else {
                    warnings.push(w.message);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            details: results
        };
    }

    /**
     * Format validation results as HTML
     */
    function formatValidationHTML(validationResult) {
        if (!validationResult) return '';

        var html = '';

        if (validationResult.valid) {
            html += '<div class="validation-success">';
            html += '✅ Script validation passed!';
            if (validationResult.warnings && validationResult.warnings.length > 0) {
                html += '<br><small>' + validationResult.warnings.length + ' warning(s) - review recommended</small>';
            }
            html += '</div>';
        } else {
            html += '<div class="validation-errors">';
            html += '<div class="error-header">❌ Validation Failed</div>';

            if (validationResult.errors && validationResult.errors.length > 0) {
                html += '<div class="error-section"><strong>Errors:</strong><ul>';
                validationResult.errors.forEach(function (err) {
                    html += '<li class="validation-error">' + escapeHtml(err) + '</li>';
                });
                html += '</ul></div>';
            }
ttt// Add Auto-Fix button when errors exist
ttthtml += '<button id="btn_auto_fix" class="btn-auto-fix" style="margin-top: 10px;">';
ttthtml += 'ud83dudd27 Auto-Fix with AI';
ttthtml += '</button>';
        }

        if (validationResult.warnings && validationResult.warnings.length > 0) {
            html += '<div class="warning-section"><strong>Warnings:</strong><ul>';
            validationResult.warnings.forEach(function (warn) {
                html += '<li class="validation-warning">' + escapeHtml(warn) + '</li>';
            });
            html += '</ul></div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Escape HTML for safe display
     */
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    return {
        validateScript: validateScript,
        validateSyntax: validateSyntax,
        checkForbiddenAPIs: checkForbiddenAPIs,
        validateIllustratorPatterns: validateIllustratorPatterns,
        checkSafetyPatterns: checkSafetyPatterns,
        formatValidationHTML: formatValidationHTML
    };

})();

// Make available globally
if (typeof window !== 'undefined') {
    window.ScriptValidator = ScriptValidator;
}
