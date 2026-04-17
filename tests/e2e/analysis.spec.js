import { test, expect } from '@playwright/test';
import { mockClaudeAPI, login, logout, clickTab, waitForAppReady } from './helpers.js';

test.describe('Analysis Panels — loading, refresh, and prompt editing', () => {
  test.beforeEach(async ({ page }) => {
    await mockClaudeAPI(page);
    await page.goto('/');
    await waitForAppReady(page);
    await clickTab(page, 'Analysis');
  });

  // ── PANEL RENDERING ────────────────────────────────────────────────────────

  test('all 6 dimension panels are visible', async ({ page }) => {
    // Use the badge spans inside the analysis grid to avoid matching AI-generated text
    const grid = page.locator('.analysis-grid');
    await expect(grid.locator('span', { hasText: 'Temporal' }).first()).toBeVisible({ timeout: 10_000 });
    await expect(grid.locator('span', { hasText: 'Genre & Form' }).first()).toBeVisible();
    await expect(grid.locator('span', { hasText: 'Thematic' }).first()).toBeVisible();
    await expect(grid.locator('span', { hasText: 'Social & Contextual' }).first()).toBeVisible();
    await expect(grid.locator('span', { hasText: 'Complexity & Challenge' }).first()).toBeVisible();
    await expect(grid.locator('span', { hasText: 'Emotional Arc' }).first()).toBeVisible();
  });

  test('panels load content from seed/cache without triggering new AI calls', async ({ page }) => {
    // The seed analysis text is always present; no loading spinners should remain
    await page.waitForFunction(
      () => {
        const pulsing = document.querySelectorAll('.pulse');
        return !Array.from(pulsing).some((el) =>
          el.textContent.includes('Generating')
        );
      },
      {},
      { timeout: 15_000 }
    );
    // At least the Temporal panel heading should be visible
    await expect(page.locator('text=Volume & Pace')).toBeVisible();
  });

  test('stat numbers in panels are rendered (not empty)', async ({ page }) => {
    // The Temporal panel shows numeric stats (peak year books count, avg / active year, hiatus)
    const temporalPanel = page.locator('.analysis-grid > div').first();
    await expect(temporalPanel).toBeVisible({ timeout: 8_000 });
    // Should contain at least one multi-digit number
    const text = await temporalPanel.innerText();
    expect(/\d+/.test(text)).toBe(true);
  });

  // ── AUTHENTICATED ACTIONS ──────────────────────────────────────────────────

  test('refresh (↻) button triggers panel regeneration', async ({ page }) => {
    await login(page);
    const temporalPanel = page.locator('.analysis-grid > div').first();
    await temporalPanel.locator('button[title="Refresh with Opus"]').click();
    // Loading indicator should appear
    await expect(page.locator('text=Regenerating…')).toBeVisible({ timeout: 8_000 });
    // Wait for mock response to complete
    await expect(page.locator('text=Regenerating…')).not.toBeVisible({ timeout: 15_000 });
    // Panel should still be visible with content
    await expect(temporalPanel).toBeVisible();
    await logout(page);
  });

  test('edit prompt, save change, verify it persisted, then revert', async ({ page }) => {
    await login(page);

    const temporalPanel = page.locator('.analysis-grid > div').first();

    // ── 1. Open the edit panel ──
    await temporalPanel.locator('button[title="Edit prompt"]').click();
    const textarea = temporalPanel.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5_000 });

    // ── 2. Capture the original prompt text ──
    const originalPrompt = await textarea.inputValue();
    expect(originalPrompt.trim().length, 'Expected a non-empty default prompt').toBeGreaterThan(0);

    // ── 3. Type a distinctive test prompt ──
    const testPrompt =
      'TEST_AUTOMATION: Focus exclusively on books read after 2020 and ignore earlier entries.';
    await textarea.fill(testPrompt);

    // ── 4. Save without regenerating ──
    await temporalPanel.locator('button', { hasText: 'Save' }).click();

    // ── 5. Textarea should disappear (edit mode closed) ──
    await expect(textarea).not.toBeVisible({ timeout: 5_000 });

    // ── 6. Reopen edit to verify the change was persisted ──
    await temporalPanel.locator('button[title="Edit prompt"]').click();
    await expect(temporalPanel.locator('textarea')).toBeVisible();
    await expect(temporalPanel.locator('textarea')).toHaveValue(testPrompt);

    // ── 7. Revert back to the original prompt ──
    await temporalPanel.locator('textarea').fill(originalPrompt);
    await temporalPanel.locator('button', { hasText: 'Save' }).click();
    await expect(temporalPanel.locator('textarea')).not.toBeVisible({ timeout: 5_000 });

    // ── 8. Verify the revert was saved ──
    await temporalPanel.locator('button[title="Edit prompt"]').click();
    await expect(temporalPanel.locator('textarea')).toHaveValue(originalPrompt);
    await temporalPanel.locator('button', { hasText: 'Save' }).click();

    await logout(page);
  });

  test('edit prompt then click Regenerate updates panel content', async ({ page }) => {
    await login(page);

    const temporalPanel = page.locator('.analysis-grid > div').first();
    await temporalPanel.locator('button[title="Edit prompt"]').click();
    await expect(temporalPanel.locator('textarea')).toBeVisible();

    // Slightly tweak the prompt
    const currentPrompt = await temporalPanel.locator('textarea').inputValue();
    await temporalPanel.locator('textarea').fill(currentPrompt + ' [test]');

    // Click Regenerate (not Save)
    await temporalPanel.locator('button', { hasText: 'Regenerate' }).click();

    // Should show loading indicator
    await expect(page.locator('text=Regenerating…')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Regenerating…')).not.toBeVisible({ timeout: 15_000 });

    // Panel content should update with mock response
    await expect(temporalPanel).toContainText(
      'consistent and engaged reading patterns',
      { timeout: 5_000 }
    );

    // Restore original prompt
    await temporalPanel.locator('button[title="Edit prompt"]').click();
    await temporalPanel.locator('textarea').fill(currentPrompt);
    await temporalPanel.locator('button', { hasText: 'Save' }).click();

    await logout(page);
  });

  // ── UNAUTHENTICATED VIEW ───────────────────────────────────────────────────

  test('view prompt button (⊙) shows prompt text when not authenticated', async ({ page }) => {
    const temporalPanel = page.locator('.analysis-grid > div').first();
    // Not logged in — should have ⊙ (view prompt) button, not ✎ (edit) button
    await expect(temporalPanel.locator('button[title="View prompt"]')).toBeVisible();
    await expect(temporalPanel.locator('button[title="Edit prompt"]')).not.toBeVisible();
    // Click view
    await temporalPanel.locator('button[title="View prompt"]').click();
    // Should show the "PROMPT" label (read-only display)
    await expect(temporalPanel.locator('text=PROMPT')).toBeVisible({ timeout: 3_000 });
    // Should NOT have an editable textarea
    await expect(temporalPanel.locator('textarea')).not.toBeVisible();
  });
});
