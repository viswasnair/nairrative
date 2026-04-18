import { test, expect } from '@playwright/test';
import { mockClaudeAPI, clickTab, waitForAppReady } from './helpers.js';

test.describe('Navigation — all pages render correctly', () => {
  test.beforeEach(async ({ page }) => {
    await mockClaudeAPI(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Overview tab shows stats and charts', async ({ page }) => {
    await clickTab(page, 'Overview');
    await expect(page.locator('text=Books Read')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Authors Read')).toBeVisible();
    await expect(page.locator('text=Peak Year')).toBeVisible();
    // At least one Recharts chart should be present
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
  });

  test('Analysis tab shows all dimension panels', async ({ page }) => {
    await clickTab(page, 'Analysis');
    await expect(page.locator('text=Volume & Pace')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Migration Over Time')).toBeVisible();
    await expect(page.locator('text=Recurring Intellectual Preoccupations')).toBeVisible();
    await expect(page.locator('text=Life Shapes the List')).toBeVisible();
    await expect(page.locator('text=Stretching vs. Comfort')).toBeVisible();
  });

  test('Library tab shows book table and controls', async ({ page }) => {
    await clickTab(page, 'Library');
    await expect(page.locator('input[placeholder="Search…"]')).toBeVisible();
    await expect(page.locator('button.btn-gold', { hasText: '+ Add Book' })).toBeVisible();
    // Table header columns — scope to .lib-row to avoid matching hidden <option> elements
    await expect(page.locator('.lib-row div', { hasText: 'Title' }).first()).toBeVisible();
    await expect(page.locator('.lib-row div', { hasText: 'Author' }).first()).toBeVisible();
  });

  test('Recommendations tab shows lens grid', async ({ page }) => {
    await clickTab(page, 'Recommendations');
    await expect(page.locator('.rec-grid')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=More Like Last Book')).toBeVisible();
    await expect(page.locator('text=Challenge Me')).toBeVisible();
    await expect(page.locator('text=If You Loved…')).toBeVisible();
  });

  test('Recap tab shows description and series list', async ({ page }) => {
    await clickTab(page, 'Recap');
    await expect(
      page.locator('text=Pick a series to get an AI catch-up')
    ).toBeVisible({ timeout: 8_000 });
    // The library has series — at least one should be shown (use button to avoid strict-mode violation)
    await expect(page.locator('button', { hasText: 'Wheel of Time' }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('Chat tab shows sign-in gate when not authenticated', async ({ page }) => {
    await clickTab(page, 'Chat');
    await expect(page.locator('text=Sign in to use Chat')).toBeVisible();
    await expect(
      page.locator('text=This feature is only available to the library owner')
    ).toBeVisible();
  });

  test('page loads without JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await waitForAppReady(page);
    // Filter out benign browser warnings (ResizeObserver, font loading)
    const critical = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('font') && !e.includes('favicon')
    );
    expect(critical, `JS errors on page load: ${critical.join('\n')}`).toHaveLength(0);
  });
});
