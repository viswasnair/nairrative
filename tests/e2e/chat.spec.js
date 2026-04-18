import { test, expect } from '@playwright/test';
import { mockClaudeAPI, login, logout, clickTab, waitForAppReady } from './helpers.js';

test.describe('Chat — conversational reading assistant', () => {
  test.beforeEach(async ({ page }) => {
    await mockClaudeAPI(page);
    await page.goto('/');
    await waitForAppReady(page);
    await login(page);
    await clickTab(page, 'Chat');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('chat interface renders with welcome message and input', async ({ page }) => {
    await expect(
      page.locator('text=Hello! I know your complete reading history')
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      page.locator('input[placeholder*="Ask about your reading"]')
    ).toBeVisible();
    await expect(page.locator('button.btn-gold', { hasText: 'Send' })).toBeVisible();
  });

  test('suggestion chips are displayed before first message', async ({ page }) => {
    await expect(page.locator('text=What were my peak reading years?')).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.locator('text=Which authors have I read the most?')).toBeVisible();
    await expect(page.locator('text=Analyze my genre evolution')).toBeVisible();
  });

  test('clicking a suggestion chip populates the input field', async ({ page }) => {
    const chip = page.locator('button.btn-ghost', { hasText: 'What were my peak reading years?' });
    await chip.click();
    await expect(
      page.locator('input[placeholder*="Ask about your reading"]')
    ).toHaveValue('What were my peak reading years?');
  });

  test('sending a message via Send button gets an AI response', async ({ page }) => {
    const input = page.locator('input[placeholder*="Ask about your reading"]');
    await input.fill('What were my peak reading years?');
    await page.locator('button.btn-gold', { hasText: 'Send' }).click();

    // Input should clear immediately
    await expect(input).toHaveValue('', { timeout: 3_000 });

    // Thinking indicator should appear
    await expect(page.locator('text=Thinking…')).toBeVisible({ timeout: 5_000 });

    // AI response should arrive (mock is fast)
    await expect(page.locator('text=Based on your reading history')).toBeVisible({
      timeout: 15_000,
    });

    // Thinking indicator should disappear
    await expect(page.locator('text=Thinking…')).not.toBeVisible();
  });

  test('pressing Enter sends the message', async ({ page }) => {
    const input = page.locator('input[placeholder*="Ask about your reading"]');
    await input.fill('How many books have I read in total?');
    await input.press('Enter');

    await expect(input).toHaveValue('', { timeout: 3_000 });
    await expect(page.locator('text=Based on your reading history')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('suggestion chips disappear after first message is sent', async ({ page }) => {
    await expect(page.locator('text=What were my peak reading years?')).toBeVisible();

    const input = page.locator('input[placeholder*="Ask about your reading"]');
    await input.fill('Tell me about my reading patterns.');
    await page.locator('button.btn-gold', { hasText: 'Send' }).click();

    // Wait for response
    await expect(page.locator('text=Based on your reading history')).toBeVisible({
      timeout: 15_000,
    });

    // Chips should be gone after the first exchange
    await expect(page.locator('text=What were my peak reading years?')).not.toBeVisible();
  });

  test('chat is disabled (sign-in gate) when not authenticated', async ({ page }) => {
    // This test intentionally starts logged in (beforeEach) then logs out
    await logout(page);
    // Navigate away and back to the chat tab
    await clickTab(page, 'Overview');
    await clickTab(page, 'Chat');
    await expect(page.locator('text=Sign in to use Chat')).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator('input[placeholder*="Ask about your reading"]')
    ).not.toBeVisible();
  });

  test('◈ Reading AI label appears on AI message bubbles', async ({ page }) => {
    // The welcome message already has the ◈ Reading AI label
    await expect(page.locator('text=◈ Reading AI')).toBeVisible({ timeout: 5_000 });
  });
});
