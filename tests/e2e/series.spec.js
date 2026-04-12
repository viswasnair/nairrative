import { test, expect } from '@playwright/test';
import { mockClaudeAPI, clickTab, waitForAppReady } from './helpers.js';

test.describe('Series Recap — AI-generated series summaries', () => {
  test.beforeEach(async ({ page }) => {
    await mockClaudeAPI(page);
    await page.goto('/');
    await waitForAppReady(page);
    await clickTab(page, 'Series Recap');
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

    // The selected series card should appear
    await expect(
      page.locator('[style*="background"]', { hasText: 'Wheel of Time' }).first()
    ).toBeVisible({ timeout: 5_000 });

    const generateBtn = page.locator('button.btn-gold', { hasText: 'Generate Recap' });
    await expect(generateBtn).toBeVisible();
  });

  test('Generate Recap produces an AI summary with What to Remember section', async ({ page }) => {
    // Wheel of Time is pre-selected by default
    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });

    await generateBtn.click();

    // Loading indicator should appear
    await expect(page.locator('text=/Recapping your journey/')).toBeVisible({ timeout: 8_000 });

    // Mock resolves quickly — recap text should appear
    await expect(page.locator('text=Book 1 Recap')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=What to Remember')).toBeVisible({ timeout: 5_000 });
  });

  test('loading indicator disappears when recap is ready', async ({ page }) => {
    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });
    await generateBtn.click();

    // Wait for loading
    const loadingMsg = page.locator('text=/Recapping your journey/');
    // Loading state fires before mock resolves
    await expect(loadingMsg).toBeVisible({ timeout: 8_000 });

    // Loading should disappear once recap is ready
    await expect(loadingMsg).not.toBeVisible({ timeout: 20_000 });

    // Content should now be visible
    await expect(page.locator('text=Book 1 Recap')).toBeVisible();
  });

  test('selecting a different series clears the previous recap', async ({ page }) => {
    // Generate a recap for Wheel of Time
    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });
    await generateBtn.click();
    await expect(page.locator('text=Book 1 Recap')).toBeVisible({ timeout: 15_000 });

    // Click a different series — recap should be cleared
    const anotherSeries = page
      .locator('button', { hasText: /Mistborn|Stormlight|ACOTAR|Empyrean/ })
      .first();
    if (await anotherSeries.isVisible()) {
      await anotherSeries.click();
      await expect(page.locator('text=Book 1 Recap')).not.toBeVisible({ timeout: 5_000 });
    }
  });
});
