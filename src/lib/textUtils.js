// ── Text / input utilities ────────────────────────────────────────────────
// Extracted here so they can be unit-tested independently of the hook.

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) dp[i] = [i];
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

/**
 * Strips control chars (except \n/\t) and truncates — for free-form inputs sent to Claude.
 * @param {string} str
 * @param {number} [max]
 * @returns {string}
 */
export function sanitizePromptInput(str, max = 500) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "").slice(0, max).trim();
}

/**
 * Strips ALL control chars including newlines and truncates — for short structured fields.
 * @param {string} str
 * @param {number} [max]
 * @returns {string}
 */
export function sanitizeShortInput(str, max = 100) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x1f\x7f]/g, "").slice(0, max).trim();
}

/**
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function sanitizeCoverUrl(url) {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return (protocol === "https:" || protocol === "http:") ? url : null;
  } catch { return null; }
}

/**
 * @param {string} input
 * @param {string[]} list
 * @returns {string[]}
 */
export function fuzzyMatches(input, list) {
  if (!input || !list.length) return [];
  const lower = input.toLowerCase().trim();
  const threshold = lower.length <= 5 ? 1 : lower.length <= 10 ? 2 : 3;
  const results = [];
  for (const item of list) {
    if (item.toLowerCase() === lower) return []; // exact match — no suggestion needed
    const d = levenshtein(lower, item.toLowerCase());
    if (d <= threshold) results.push({ item, d });
  }
  return results.sort((a, b) => a.d - b.d).map(r => r.item);
}
