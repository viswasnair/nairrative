import { test, expect } from '@playwright/test';
import { mockClaudeAPI, login, logout, clickTab, waitForAppReady } from './helpers.js';

test.describe('Authentication — login and logout lock', () => {
  test.beforeEach(async ({ page }) => {
    await mockClaudeAPI(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('lock icon is visible in locked state by default', async ({ page }) => {
    await expect(page.locator('button[title="Sign in"]')).toBeVisible();
    await expect(page.locator('button[title="Sign out"]')).not.toBeVisible();
  });

  test('+ Add Book button is disabled when not authenticated', async ({ page }) => {
    await clickTab(page, 'Library');
    const addBtn = page.locator('button.btn-gold', { hasText: '+ Add Book' });
    await expect(addBtn).toBeVisible();
    // The button has opacity 0.35 and cursor: not-allowed — clicking should not open modal
    await addBtn.click();
    await expect(page.locator('.modal-box')).not.toBeVisible();
  });

  test('login modal opens when lock icon clicked', async ({ page }) => {
    await page.locator('button[title="Sign in"]').click();
    await expect(page.locator('.modal-box')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]', { hasText: 'Sign In' })).toBeVisible();
  });

  test('login modal closes when × is clicked', async ({ page }) => {
    await page.locator('button[title="Sign in"]').click();
    await expect(page.locator('.modal-box')).toBeVisible();
    await page.locator('.modal-box button', { hasText: '×' }).click();
    await expect(page.locator('.modal-box')).not.toBeVisible();
  });

  test('login modal closes when clicking outside overlay', async ({ page }) => {
    await page.locator('button[title="Sign in"]').click();
    await expect(page.locator('.modal-box')).toBeVisible();
    // Click on the overlay background (not the modal box itself)
    await page.locator('.modal-overlay').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.modal-box')).not.toBeVisible();
  });

  test('invalid credentials show an error message', async ({ page }) => {
    await page.locator('button[title="Sign in"]').click();
    await page.locator('input[type="email"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword123');
    await page.locator('button[type="submit"]').click();
    // Should show an error (Supabase returns "Invalid login credentials")
    await expect(page.locator('.modal-box')).toContainText(
      /invalid|credentials|error/i,
      { timeout: 12_000 }
    );
    // Modal should still be open
    await expect(page.locator('.modal-box')).toBeVisible();
  });

  test('successful login unlocks the app and changes lock icon', async ({ page }) => {
    await login(page);
    // Lock should now show "Sign out" state (gold icon)
    await expect(page.locator('button[title="Sign out"]')).toBeVisible();
    await expect(page.locator('button[title="Sign in"]')).not.toBeVisible();
    await logout(page);
  });

  test('successful login enables Add Book button', async ({ page }) => {
    await login(page);
    await clickTab(page, 'Library');
    // The Add Book button should now open a modal when clicked
    await page.locator('button.btn-gold', { hasText: '+ Add Book' }).click();
    await expect(page.locator('.modal-box')).toBeVisible();
    await page.locator('.modal-box button', { hasText: '×' }).click();
    await logout(page);
  });

  test('Chat is accessible after login', async ({ page }) => {
    await login(page);
    await clickTab(page, 'Chat');
    await expect(page.locator('text=Sign in to use Chat')).not.toBeVisible();
    await expect(
      page.locator('text=Hello! I know your complete reading history')
    ).toBeVisible({ timeout: 5_000 });
    await logout(page);
  });

  test('logout re-locks the app', async ({ page }) => {
    await login(page);
    await expect(page.locator('button[title="Sign out"]')).toBeVisible();
    await logout(page);
    // Back to locked state
    await expect(page.locator('button[title="Sign in"]')).toBeVisible({ timeout: 8_000 });
  });

  test('Chat shows sign-in gate after logout', async ({ page }) => {
    await login(page);
    await clickTab(page, 'Chat');
    await expect(
      page.locator('text=Hello! I know your complete reading history')
    ).toBeVisible();
    await logout(page);
    // Chat tab should re-lock
    await clickTab(page, 'Chat');
    await expect(page.locator('text=Sign in to use Chat')).toBeVisible({ timeout: 5_000 });
  });
});
