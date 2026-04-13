/**
 * Shared test helpers for nairrative E2E tests.
 * Provides API mocking, auth helpers, and navigation utilities.
 */

/**
 * Intercepts all /api/claude requests and returns deterministic mock responses.
 * This makes tests fast, free, and independent of the real Anthropic API.
 * Must be called before page.goto().
 */
export async function mockClaudeAPI(page) {
  await page.route('**/api/claude', async (route) => {
    const body = route.request().postDataJSON();
    const system = body.system || '';
    const maxTokens = body.max_tokens || 400;
    const messages = body.messages || [];
    const userContent = messages[0]?.content || '';

    let responseText;

    if (maxTokens <= 20) {
      // Author country lookup
      responseText = 'Unknown';
    } else if (
      system.includes('recap') ||
      system.includes('catch up on a book series') ||
      system.includes('literary companion')
    ) {
      // Series recap (haiku, max 800 tokens)
      responseText = [
        '**Book 1 Recap**',
        '',
        'The hero begins their journey in a richly imagined world full of intrigue.',
        'Key alliances are forged and the central conflict becomes clear.',
        '',
        '**Book 2 Recap**',
        '',
        'The stakes escalate as loyalties are tested and truths are revealed.',
        'The protagonist must confront the cost of their choices.',
        '',
        '**What to Remember:**',
        '1. The protagonist\'s core motivation drives every major decision',
        '2. The main antagonist controls power through hidden networks',
        '3. The magical system requires a personal sacrifice to use',
        '4. The central romantic arc remains unresolved heading into the next book',
      ].join('\n');
    } else if (
      maxTokens >= 1200 ||
      system.includes('reading assistant') ||
      system.includes('DATABASE SUMMARY')
    ) {
      // AI Chat response
      responseText =
        "Based on your reading history, I can see you're an avid reader who has explored an impressive range of genres over 17+ years. Your peak reading year was 2021 with 40 books, and you have a strong preference for fantasy and thrillers, with a notable recent shift toward romantasy.";
    } else if (
      system.includes('Return ONLY a valid JSON object') ||
      system.includes('exactly one key')
    ) {
      // Single analysis panel regeneration — extract dimension from system prompt
      const dimMatch = system.match(/"(\w+)"/);
      const dim = dimMatch ? dimMatch[1] : 'temporal';
      responseText = JSON.stringify({
        [dim]:
          'You demonstrate consistent and engaged reading patterns across multiple genres and time periods. Your reading journey reflects a curious mind drawn to both escapism and intellectual challenge, evolving significantly over the past decade.',
      });
    } else if (
      system.includes('JSON array') ||
      system.includes('recommendation engine') ||
      system.includes('unread books')
    ) {
      // Book recommendations — single item array
      responseText =
        '[{"title":"The Name of the Wind","author":"Patrick Rothfuss","year":2007,"reason":"A perfect match for your love of immersive epic fantasy with rich world-building and a compelling protagonist."}]';
    } else if (
      system.includes('extract') ||
      system.includes('book details') ||
      (maxTokens <= 500 && userContent.includes('JSON'))
    ) {
      // AI book chat fill
      responseText = JSON.stringify({
        title: 'Dune',
        authors: [{ name: 'Frank Herbert' }],
        genres: ['Science Fiction'],
        fiction: true,
        format: 'Novel',
        year: 1965,
        pages: 688,
      });
    } else {
      // Generic fallback
      responseText = 'This is a mock response for automated testing.';
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [{ type: 'text', text: responseText }],
      }),
    });
  });
}

/**
 * Logs in to the app using TEST_EMAIL and TEST_PASSWORD env vars.
 * Call after page.goto() has loaded the app.
 */
export async function login(page) {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'TEST_EMAIL and TEST_PASSWORD environment variables are required for auth tests.\n' +
        'Add them to your .env.local file or CI secrets.'
    );
  }

  // Click the lock icon to open sign-in modal
  await page.locator('button[title="Sign in"]').click();

  // Fill credentials
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait for the modal to close — indicates successful login
  await page.waitForSelector('.modal-box', { state: 'detached', timeout: 20_000 });

  // Brief wait for auth state to propagate through the app
  await page.waitForTimeout(800);
}

/**
 * Logs out of the app if currently signed in.
 */
export async function logout(page) {
  const signOutBtn = page.locator('button[title="Sign out"]');
  const isVisible = await signOutBtn.isVisible({ timeout: 2_000 }).catch(() => false);
  if (isVisible) {
    await signOutBtn.click();
    await page.waitForTimeout(600);
  }
}

/**
 * Clicks a top-level tab by its label text.
 */
export async function clickTab(page, label) {
  await page.locator('.tab-btn', { hasText: label }).click();
  await page.waitForTimeout(300);
}

/**
 * Waits until the app has finished its initial Supabase book fetch.
 * Uses the presence of the tab navigation as a ready signal.
 */
export async function waitForAppReady(page) {
  await page.waitForSelector('.tab-btn', { timeout: 20_000 });
  // Give Supabase data fetch a moment to settle
  await page.waitForTimeout(1_200);
}
