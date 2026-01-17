// TATA UI Utilities
// Helper functions for tooltips, loading states, and validation
// Version: 2.1

(function (window) {
    'use strict';

    // ====================================================================================
    // ====================================   TOOLTIP SYSTEM   ============================
    // ====================================================================================

    const tooltip = document.getElementById('tooltip');
    let tooltipTimeout;

    /**
     * Show tooltip
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {string} text - Tooltip text
     */
    function showTooltip(element, text) {
        if (!text || !tooltip) return;

        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        tooltip.textContent = text;
        tooltip.style.display = 'block';

        // Calculate position (above the element, centered)
        let left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
        let top = rect.top - tooltip.offsetHeight - 8;

        // Keep tooltip within window bounds
        const padding = 5;
        if (left < padding) left = padding;
        if (left + tooltip.offsetWidth > window.innerWidth - padding) {
            left = window.innerWidth - tooltip.offsetWidth - padding;
        }

        // If no room above, show below
        if (top < padding) {
            top = rect.bottom + 8;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    /**
     * Hide tooltip
     */
    function hideTooltip() {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * Initialize tooltips for all elements with data-tooltip attribute
     */
    function initTooltips() {
        document.addEventListener('mouseover', function (e) {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                clearTimeout(tooltipTimeout);
                tooltipTimeout = setTimeout(() => {
                    showTooltip(target, target.getAttribute('data-tooltip'));
                }, 500); // Delay before showing
            }
        });

        document.addEventListener('mouseout', function (e) {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                clearTimeout(tooltipTimeout);
                hideTooltip();
            }
        });
    }

    // ====================================================================================
    // ====================================   LOADING STATE   =============================
    // ====================================================================================

    const loadingOverlay = document.getElementById('loading_overlay');
    const loadingText = document.getElementById('loading_text');

    /**
     * Show loading overlay
     * @param {string} message - Loading message to display
     */
    function showLoading(message) {
        if (loadingOverlay) {
            loadingText.textContent = message || 'Processing...';
            loadingOverlay.style.display = 'flex';
        }
    }

    /**
     * Hide loading overlay
     */
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Execute function with loading state
     * @param {Function} fn - Async function to execute
     * @param {string} message - Loading message
     * @returns {Promise} Result from function
     */
    async function withLoading(fn, message) {
        showLoading(message);
        try {
            const result = await fn();
            return result;
        } finally {
            hideLoading();
        }
    }

    // ====================================================================================
    // ====================================   VALIDATION   ================================
    // ====================================================================================

    /**
     * Validate hex color format
     * @param {string} hex - Hex color string
     * @returns {boolean} Whether valid
     */
    function isValidHex(hex) {
        return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
    }

    /**
     * Validate API key format (basic check)
     * @param {string} key - API key string
     * @returns {Object} {valid: boolean, error: string}
     */
    function validateAPIKey(key) {
        if (!key || key.trim().length === 0) {
            return { valid: false, error: 'API key is required' };
        }
        if (key.trim().length < 20) {
            return { valid: false, error: 'API key appears too short' };
        }
        return { valid: true, error: null };
    }

    /**
     * Validate number input
     * @param {string} value - Input value
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {Object} {valid: boolean, error: string, value: number}
     */
    function validateNumber(value, min, max) {
        const num = parseFloat(value);
        if (isNaN(num)) {
            return { valid: false, error: 'Must be a valid number', value: null };
        }
        if (min !== undefined && num < min) {
            return { valid: false, error: `Must be at least ${min}`, value: null };
        }
        if (max !== undefined && num > max) {
            return { valid: false, error: `Must be no more than ${max}`, value: null };
        }
        return { valid: true, error: null, value: num };
    }

    /**
     * Show validation error inline
     * @param {HTMLElement} input - Input element
     * @param {string} message - Error message
     */
    function showValidationError(input, message) {
        // Add error class
        input.classList.add('validation-error');

        // Create or update error message
        let errorEl = input.nextElementSibling;
        if (!errorEl || !errorEl.classList.contains('validation-message')) {
            errorEl = document.createElement('div');
            errorEl.className = 'validation-message';
            input.parentNode.insertBefore(errorEl, input.nextSibling);
        }
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    /**
     * Clear validation error
     * @param {HTMLElement} input - Input element
     */
    function clearValidationError(input) {
        input.classList.remove('validation-error');
        const errorEl = input.nextElementSibling;
        if (errorEl && errorEl.classList.contains('validation-message')) {
            errorEl.style.display = 'none';
        }
    }

    // ====================================================================================
    // ====================================   ERROR DISPLAY   =============================
    // ====================================================================================

    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {number} duration - Duration in ms (default 3000)
     */
    function showError(message, duration) {
        // You can use the existing error modal or create a toast notification
        const errorModal = document.getElementById('error_modal');
        const errorDisplay = document.getElementById('error_message_display');

        if (errorModal && errorDisplay) {
            errorDisplay.textContent = message;
            errorModal.style.display = 'flex';

            // Hide "Fix with AI" button for generic errors
            const fixBtn = document.getElementById('btn_fix_ai');
            if (fixBtn) fixBtn.style.display = 'none';
        } else {
            // Fallback to alert
            alert('Error: ' + message);
        }
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     */
    function showSuccess(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #27ae60;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      font-size: 13px;
      animation: slideIn 0.3s ease-out;
    `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ====================================================================================
    // ====================================   EXPORTS   ===================================
    // ====================================================================================

    // Expose functions globally
    window.TATAUtils = {
        // Tooltips
        initTooltips,
        showTooltip,
        hideTooltip,

        // Loading
        showLoading,
        hideLoading,
        withLoading,

        // Validation
        isValidHex,
        validateAPIKey,
        validateNumber,
        showValidationError,
        clearValidationError,

        // Notifications
        showError,
        showSuccess
    };

    // Auto-initialize tooltips when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTooltips);
    } else {
        initTooltips();
    }

})(window);
