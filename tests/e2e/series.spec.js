import { test, expect } from '@playwright/test';
import { mockClaudeAPI, login, logout, clickTab, waitForAppReady } from './helpers.js';

test.describe('Series Recap — AI-generated series summaries', () => {
  test.beforeEach(async ({ page }) => {
    await mockClaudeAPI(page);
    await page.goto('/');
    await waitForAppReady(page);
    // Generate Recap requires a session — log in for all tests in this suite
    await login(page);
    await clickTab(page, 'Series Recap');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('series tab renders description and series picker', async ({ page }) => {
    await expect(
      page.locator('text=Pick a series to get an AI catch-up')
    ).toBeVisible({ timeout: 8_000 });
    // The library has many series — at least Wheel of Time should appear
    await expect(page.locator('button', { hasText: 'Wheel of Time' }).first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test('clicking a series shows its books and the Generate Recap button', async ({ page }) => {
    const seriesBtn = page.locator('button', { hasText: 'Wheel of Time' }).first();
    await expect(seriesBtn).toBeVisible({ timeout: 8_000 });
    await seriesBtn.click();

    // The selected series heading should appear
    await expect(page.locator('text=Wheel of Time').first()).toBeVisible({ timeout: 5_000 });

    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible();
    // Button should be enabled (we are logged in)
    await expect(generateBtn).not.toBeDisabled();
  });

  test('Generate Recap produces an AI summary with What to Remember section', async ({ page }) => {
    // Wheel of Time is pre-selected by default
    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });
    await expect(generateBtn).not.toBeDisabled();

    await generateBtn.click();

    // Loading indicator should appear
    await expect(page.locator('text=/Recapping your journey/')).toBeVisible({ timeout: 8_000 });

    // Mock resolves — recap text should appear
    await expect(page.locator('text=Book 1 Recap')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=What to Remember:').first()).toBeVisible({ timeout: 5_000 });
  });

  test('loading indicator disappears when recap is ready', async ({ page }) => {
    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });
    await generateBtn.click();

    const loadingMsg = page.locator('text=/Recapping your journey/');
    await expect(loadingMsg).toBeVisible({ timeout: 8_000 });
    await expect(loadingMsg).not.toBeVisible({ timeout: 20_000 });

    // Content should now be visible
    await expect(page.locator('text=Book 1 Recap')).toBeVisible();
  });

  test('Generate Recap button is disabled when not logged in', async ({ page }) => {
    // Log out mid-test to verify the locked state
    await logout(page);
    // Re-navigate to series tab
    await clickTab(page, 'Series Recap');

    // Wheel of Time is still selected — button should be visually disabled
    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });
    await expect(generateBtn).toBeDisabled();
  });

  test('selecting a different series clears the previous recap', async ({ page }) => {
    // Generate a recap for Wheel of Time
    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });
    await generateBtn.click();
    await expect(page.locator('text=Book 1 Recap')).toBeVisible({ timeout: 15_000 });

    // Click a different series — recap should be cleared immediately
    const anotherSeries = page
      .locator('button', { hasText: /Mistborn|Stormlight|ACOTAR|Empyrean/ })
      .first();
    if (await anotherSeries.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await anotherSeries.click();
      await expect(page.locator('text=Book 1 Recap')).not.toBeVisible({ timeout: 5_000 });
    }
  });
});
