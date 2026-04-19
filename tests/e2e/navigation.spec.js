import { test, expect } from '@playwright/test';
import { mockClaudeAPI, clickTab, clickSubTab, waitForAppReady } from './helpers.js';

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

  test('Library subtabs are present and in correct order', async ({ page }) => {
    await clickTab(page, 'Library');
    const subtabs = page.locator('.subtab-btn');
    await expect(subtabs).toHaveCount(2, { timeout: 8_000 });
    await expect(subtabs.nth(0)).toHaveText('List');
    await expect(subtabs.nth(1)).toHaveText('Bookshelf');
  });

  test('Library Bookshelf subtab shows timeline mosaic view', async ({ page }) => {
    await clickTab(page, 'Library');
    await clickSubTab(page, 'Bookshelf');
    // Grid and Shelf views must not exist
    await expect(page.locator('button', { hasText: 'Grid' })).not.toBeVisible();
    await expect(page.locator('button', { hasText: 'Shelf' })).not.toBeVisible();
    // Search box must not exist in bookshelf
    await expect(page.locator('input[placeholder="Search…"]')).not.toBeVisible();
    // Timeline mosaic renders year labels for books
    await expect(page.locator('text=Recently Read')).toBeVisible({ timeout: 8_000 });
  });

  test('New Releases subtab renders without errors', async ({ page }) => {
    await clickTab(page, 'Recommendations');
    await clickSubTab(page, 'New Releases');
    // Should show either releases grid or empty state — either is valid
    const hasReleases = await page.locator('text=New books from authors in your library').isVisible({ timeout: 8_000 }).catch(() => false);
    const hasEmpty = await page.locator('text=No new releases found yet').isVisible({ timeout: 8_000 }).catch(() => false);
    expect(hasReleases || hasEmpty).toBe(true);
  });

  test('Recommendations tab shows Picks subtab by default with lens grid', async ({ page }) => {
    await clickTab(page, 'Recommendations');
    await expect(page.locator('.rec-grid')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=More Like Last Book')).toBeVisible();
    await expect(page.locator('text=Challenge Me')).toBeVisible();
    await expect(page.locator('text=If You Loved…')).toBeVisible();
  });

  test('Recommendations subtabs are centered and in correct order', async ({ page }) => {
    await clickTab(page, 'Recommendations');
    const subtabs = page.locator('.subtab-btn');
    await expect(subtabs).toHaveCount(3, { timeout: 8_000 });
    await expect(subtabs.nth(0)).toHaveText('Picks');
    await expect(subtabs.nth(1)).toHaveText('New Releases');
    await expect(subtabs.nth(2)).toHaveText('Recap');
  });

  test('Recap subtab shows custom input and series picker', async ({ page }) => {
    await clickTab(page, 'Recommendations');
    await clickSubTab(page, 'Recap');
    await expect(
      page.locator('text=Or pick a series from your library')
    ).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Recap anything')).toBeVisible();
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
