import { test, expect } from '@playwright/test';
import { mockClaudeAPI, login, logout, clickTab, clickSubTab, waitForAppReady } from './helpers.js';

test.describe('Recap — AI-generated series summaries', () => {
  test.beforeEach(async ({ page }) => {
    await mockClaudeAPI(page);
    await page.goto('/');
    await waitForAppReady(page);
    await login(page);
    await clickTab(page, 'Recommendations');
    await clickSubTab(page, 'Recap');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('recap tab renders custom input and series picker', async ({ page }) => {
    await expect(
      page.locator('input[placeholder="Enter any series or book name…"]')
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      page.locator('text=Pick a series to get an AI catch-up')
    ).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('button', { hasText: 'Wheel of Time' }).first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test('custom recap input generates a recap for any series or book', async ({ page }) => {
    const input = page.locator('input[placeholder="Enter any series or book name…"]');
    await expect(input).toBeVisible({ timeout: 8_000 });
    await input.fill('The Lord of the Rings');

    const recapBtn = page.locator('button.btn-gold', { hasText: /^✦ Recap$/ });
    await expect(recapBtn).toBeVisible();
    await recapBtn.click();

    await expect(page.locator('text=/Recapping "The Lord of the Rings"/')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Book 1 Recap')).toBeVisible({ timeout: 15_000 });
  });

  test('custom recap can be triggered with Enter key', async ({ page }) => {
    const input = page.locator('input[placeholder="Enter any series or book name…"]');
    await input.fill('Dune');
    await input.press('Enter');
    await expect(page.locator('text=Book 1 Recap')).toBeVisible({ timeout: 15_000 });
  });

  test('clicking a series shows its books and the Generate Recap button', async ({ page }) => {
    const seriesBtn = page.locator('button', { hasText: 'Wheel of Time' }).first();
    await expect(seriesBtn).toBeVisible({ timeout: 8_000 });
    await seriesBtn.click();

    await expect(page.locator('text=Wheel of Time').first()).toBeVisible({ timeout: 5_000 });
    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).not.toBeDisabled();
  });

  test('Generate Recap produces an AI summary with What to Remember section', async ({ page }) => {
    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });
    await expect(generateBtn).not.toBeDisabled();

    await generateBtn.click();

    await expect(page.locator('text=/Recapping your journey/')).toBeVisible({ timeout: 8_000 });
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
    await expect(page.locator('text=Book 1 Recap')).toBeVisible();
  });

  test('Generate Recap button is disabled when not logged in', async ({ page }) => {
    await logout(page);
    await clickTab(page, 'Recommendations');
    await clickSubTab(page, 'Recap');

    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });
    await expect(generateBtn).toBeDisabled();
  });

  test('selecting a different series clears the previous recap', async ({ page }) => {
    const generateBtn = page.locator('button.btn-gold', { hasText: /Generate Recap/ });
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });
    await generateBtn.click();
    await expect(page.locator('text=Book 1 Recap')).toBeVisible({ timeout: 15_000 });

    const anotherSeries = page
      .locator('button', { hasText: /Mistborn|Stormlight|ACOTAR|Empyrean/ })
      .first();
    if (await anotherSeries.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await anotherSeries.click();
      await expect(page.locator('text=Book 1 Recap')).not.toBeVisible({ timeout: 5_000 });
    }
  });
});
