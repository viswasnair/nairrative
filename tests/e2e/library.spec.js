import { test, expect } from '@playwright/test';
import { mockClaudeAPI, login, logout, clickTab, waitForAppReady } from './helpers.js';

// Use a unique title so it's easy to find and clean up
const testBookTitle = () => `Playwright Test Book ${Date.now()}`;
// Use an author who is already in the library to skip the AI country-lookup call
const TEST_AUTHOR = 'Jorge Luis Borges';

test.describe('Library — add and remove a book', () => {
  test.beforeEach(async ({ page }) => {
    await mockClaudeAPI(page);
    await page.goto('/');
    await waitForAppReady(page);
    await login(page);
    await clickTab(page, 'Library');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('full lifecycle: add book → verify in list → delete book', async ({ page }) => {
    const title = testBookTitle();

    // ── 1. Open Add Book modal ──
    await page.locator('button.btn-gold', { hasText: '+ Add Book' }).click();
    await expect(page.locator('.modal-box')).toBeVisible();
    await expect(page.locator('.modal-box', { hasText: 'Add Book' })).toBeVisible();

    // ── 2. Fill in required fields ──
    await page.locator('input[placeholder="Book title"]').fill(title);
    await page.locator('input[placeholder="Author name"]').first().fill(TEST_AUTHOR);

    // ── 3. Submit ──
    await page.locator('button.btn-gold', { hasText: 'Add to Library' }).click();

    // ── 4. Verify success message ──
    await expect(page.locator('.modal-box')).toContainText('✓ Book added!', {
      timeout: 20_000,
    });

    // ── 5. Modal auto-closes after ~1.2 s ──
    await page.waitForSelector('.modal-box', { state: 'detached', timeout: 6_000 });

    // ── 6. Find the book in the library list ──
    await page.locator('input[placeholder="Search…"]').fill(title);
    const bookRow = page.locator('.lib-row', { hasText: title });
    await expect(bookRow).toBeVisible({ timeout: 8_000 });

    // ── 7. Open the edit modal for that book ──
    await bookRow.locator('button[title="Edit"]').click();
    await expect(page.locator('.modal-box', { hasText: 'Edit Book' })).toBeVisible();
    await expect(page.locator('.modal-box input[placeholder="Book title"]')).toHaveValue(title);

    // ── 8. Delete the book (accept the confirmation dialog) ──
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.modal-box button', { hasText: 'Delete' }).click();

    // ── 9. Modal should close ──
    await page.waitForSelector('.modal-box', { state: 'detached', timeout: 10_000 });

    // ── 10. Verify book is gone from the library ──
    await expect(bookRow).not.toBeVisible({ timeout: 5_000 });
  });

  test('save is blocked when title or author is missing', async ({ page }) => {
    await page.locator('button.btn-gold', { hasText: '+ Add Book' }).click();
    await expect(page.locator('.modal-box')).toBeVisible();

    // Try to save with no fields filled
    await page.locator('button.btn-gold', { hasText: 'Add to Library' }).click();
    await expect(page.locator('.modal-box')).toContainText(
      'Title and at least one author are required',
      { timeout: 3_000 }
    );
    // Modal should remain open
    await expect(page.locator('.modal-box')).toBeVisible();
  });

  test('cancel / close modal without saving', async ({ page }) => {
    await page.locator('button.btn-gold', { hasText: '+ Add Book' }).click();
    await expect(page.locator('.modal-box')).toBeVisible();
    await page.locator('input[placeholder="Book title"]').fill('This should not be saved');
    // Close with the × button
    await page.locator('.modal-box button', { hasText: '×' }).click();
    await expect(page.locator('.modal-box')).not.toBeVisible();
    // Book should not exist in the library
    await page.locator('input[placeholder="Search…"]').fill('This should not be saved');
    await expect(page.locator('.lib-row', { hasText: 'This should not be saved' })).not.toBeVisible();
  });
});
