import { test, expect } from '@playwright/test';
import { mockClaudeAPI, clickTab, waitForAppReady } from './helpers.js';

test.describe('Recommendations — panels loading and refreshing', () => {
  test.beforeEach(async ({ page }) => {
    await mockClaudeAPI(page);
    await page.goto('/');
    await waitForAppReady(page);
    await clickTab(page, 'Recommendations');
  });

  test('all 15 recommendation lenses are present', async ({ page }) => {
    await expect(page.locator('.rec-grid')).toBeVisible({ timeout: 8_000 });

    // Auto-load lenses (9)
    const autoLenses = [
      'More Like Last Book',
      'More By Last Author',
      'Books By Similar Author',
      "What's Trending",
      'Challenge Me',
      'Quick Reads',
      'Fill My Gaps',
      'Surprise Me',
      'Finish the Series',
    ];
    for (const label of autoLenses) {
      await expect(page.locator('.rec-grid').locator(`text=${label}`)).toBeVisible({
        timeout: 5_000,
      });
    }

    // Manual-input lenses (6)
    const manualLenses = [
      'If You Loved…',
      'Books By Authors Like…',
      'Match My Mood',
      'By Genre',
      'By Topic',
      'Pair It',
    ];
    for (const label of manualLenses) {
      await expect(page.locator('.rec-grid').locator(`text=${label}`)).toBeVisible({
        timeout: 5_000,
      });
    }
  });

  test('auto-load lenses display recommendations from seed/cache', async ({ page }) => {
    // The app loads recs from Supabase/seed when the tab opens.
    // Wait for the first auto-lens card to have a title rendered beneath it.
    // Seed data always loads (SEED_RECS fallback), so at least one rec should appear.
    const firstAutoLens = page.locator('.rec-grid > div').first();
    await expect(firstAutoLens).toBeVisible({ timeout: 8_000 });

    // The rec title is in a div with fontWeight 600 inside the card.
    // Seed "more-like" lens has "Piranesi"; if cache differs it will be another title.
    // Just verify *something* rendered below the lens header (i.e. a rec title div exists).
    await expect(
      firstAutoLens.locator('div[style*="font-weight: 600"], div[style*="fontWeight"]').first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('refresh button (↺) re-fetches a recommendation', async ({ page }) => {
    // Wait for at least one auto-lens to have a result (seed loads fast)
    const firstAutoLens = page.locator('.rec-grid > div').first();
    // Wait for the refresh button to appear (it only shows when results are loaded)
    const refreshBtn = firstAutoLens.locator('button[title="Refresh"]');
    await expect(refreshBtn).toBeVisible({ timeout: 25_000 });

    // Click refresh and verify loading skeleton appears
    await refreshBtn.click();
    await expect(firstAutoLens.locator('.pulse')).toBeVisible({ timeout: 5_000 });
    // Wait for mock to resolve
    await expect(firstAutoLens.locator('.pulse')).not.toBeVisible({ timeout: 15_000 });
    // Should now show the mock recommendation title
    await expect(firstAutoLens).toContainText('The Name of the Wind', { timeout: 5_000 });
  });

  test('manual input lens fetches recommendation when value is entered', async ({ page }) => {
    const lovedLens = page.locator('.rec-grid > div', { hasText: 'If You Loved…' });
    await expect(lovedLens).toBeVisible();

    const input = lovedLens.locator('input.input-dark');
    await expect(input).toBeVisible();

    // Clear the pre-filled value and type a new book
    await input.fill('');
    await input.fill('The Hobbit');
    await input.press('Enter');

    // Should show loading skeleton then result
    await expect(lovedLens.locator('.pulse')).toBeVisible({ timeout: 5_000 });
    await expect(lovedLens).toContainText('The Name of the Wind', { timeout: 15_000 });
  });

  test('genre dropdown lens fetches recommendation on selection', async ({ page }) => {
    const genreLens = page.locator('.rec-grid > div', { hasText: 'By Genre' });
    await expect(genreLens).toBeVisible();

    const select = genreLens.locator('select.input-dark');
    await expect(select).toBeVisible();

    // Pick a genre from the dropdown
    await select.selectOption({ index: 1 }); // First real genre option (index 0 is placeholder)

    // Should trigger a fetch
    await expect(genreLens.locator('.pulse')).toBeVisible({ timeout: 5_000 });
    await expect(genreLens).toContainText('The Name of the Wind', { timeout: 15_000 });
  });
});
