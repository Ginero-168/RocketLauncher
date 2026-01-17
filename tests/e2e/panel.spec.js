/**
 * TATA V3 - E2E Tests
 * Playwright tests for UI interactions
 * 
 * Note: These tests run against a local server serving the extension HTML.
 * CEP panels cannot be directly tested in a browser, so we test the HTML/JS logic.
 */

const { test, expect } = require('@playwright/test');

test.describe('TATA Panel UI', () => {

    test.beforeEach(async ({ page }) => {
        // Serve index.html locally (requires http-server or similar)
        // For now, we'll use file:// protocol
        await page.goto('file://' + process.cwd() + '/index.html');
    });

    test('should load the panel', async ({ page }) => {
        await expect(page.locator('.tabs')).toBeVisible();
    });

    test('should have tab buttons', async ({ page }) => {
        const tabButtons = page.locator('.tab-btn');
        await expect(tabButtons).toHaveCount(4); // Swift, Creative, etc.
    });

    test('should switch tabs on click', async ({ page }) => {
        const firstTab = page.locator('.tab-btn').first();
        const secondTab = page.locator('.tab-btn').nth(1);

        await secondTab.click();
        await expect(secondTab).toHaveClass(/active/);
    });

    test('should have hotkey bar', async ({ page }) => {
        await expect(page.locator('#hotkey-bar')).toBeVisible();
    });

    test('should have footer toolbar', async ({ page }) => {
        await expect(page.locator('.footer-toolbar')).toBeVisible();
    });

    test('should open settings modal', async ({ page }) => {
        const settingsBtn = page.locator('#btn_setting');
        if (await settingsBtn.isVisible()) {
            await settingsBtn.click();
            await expect(page.locator('#settings_modal')).toHaveClass(/active/);
        }
    });

    test('should have theme toggle in settings', async ({ page }) => {
        const settingsBtn = page.locator('#btn_setting');
        if (await settingsBtn.isVisible()) {
            await settingsBtn.click();
            await expect(page.locator('#setting_theme')).toBeVisible();
        }
    });
});

test.describe('TATA Scripting Panel UI', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('file://' + process.cwd() + '/scripting.html');
    });

    test('should load the scripting panel', async ({ page }) => {
        await expect(page.locator('.scripting-container')).toBeVisible();
    });

    test('should have editor tab', async ({ page }) => {
        await expect(page.locator('[data-tab="tab_editor"]')).toBeVisible();
    });

    test('should have AI helper tab', async ({ page }) => {
        await expect(page.locator('[data-tab="tab_ai"]')).toBeVisible();
    });

    test('should have code editor', async ({ page }) => {
        await expect(page.locator('#code_editor')).toBeVisible();
    });

    test('should have model selector', async ({ page }) => {
        // Switch to AI tab first
        await page.locator('[data-tab="tab_ai"]').click();
        await expect(page.locator('#ai_model_selector')).toBeVisible();
    });

    test('should have version history button', async ({ page }) => {
        await expect(page.locator('#btn_version_history')).toBeVisible();
    });
});
