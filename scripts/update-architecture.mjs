/**
 * Auto-update ARCHITECTURE.md and architecture.html when src/ or api/ changes.
 * Called by the update-architecture GitHub Actions workflow.
 *
 * Usage: node scripts/update-architecture.mjs
 * Requires: ANTHROPIC_API_KEY env var, run from repo root.
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

// ── 1. Get diff ──────────────────────────────────────────────────────────────

let diff;
try {
  diff = execSync("git diff HEAD~1 HEAD -- src/ api/", { encoding: "utf-8" });
} catch {
  console.log("Could not compute diff — skipping.");
  process.exit(0);
}

if (!diff.trim()) {
  console.log("No src/ or api/ changes in this commit — skipping.");
  process.exit(0);
}

// Truncate large diffs so the prompt stays reasonable
const MAX_DIFF_CHARS = 6000;
const diffSnippet =
  diff.length > MAX_DIFF_CHARS
    ? diff.slice(0, MAX_DIFF_CHARS) + "\n\n[diff truncated]"
    : diff;

// ── 2. Read current docs ─────────────────────────────────────────────────────

const architectureMd = readFileSync("ARCHITECTURE.md", "utf-8");

// ── 3. Ask Claude whether diagrams need updating ─────────────────────────────

const system = `You are a technical documentation assistant. Your job is to keep Mermaid architecture diagrams accurate as code evolves.

You will receive a git diff of changes to src/ and api/ directories, and the current ARCHITECTURE.md file containing three Mermaid diagrams:
  1. System Layers (flowchart TD) — four runtime tiers and their connections
  2. Hook & Component Wiring (flowchart LR) — how App.jsx connects hooks and components
  3. AI Request & Cache Data Flow (sequenceDiagram) — the AI/caching request lifecycle

Rules:
- Only update diagrams when the diff contains ARCHITECTURAL changes: new or removed hooks, new or removed components, changed data flows, new external services, new API patterns, changed caching strategy, etc.
- Minor refactors, bug fixes, style tweaks, and test changes do NOT require diagram updates.
- If updates are needed, return the COMPLETE updated ARCHITECTURE.md content — nothing else, no commentary.
- If no updates are needed, return exactly the string NO_CHANGES — nothing else.
- Preserve the existing format, heading structure, and descriptive writing style.
- Do not add new diagrams unless the changes clearly warrant one.`;

const userMessage = `Git diff (src/ and api/ only):

\`\`\`diff
${diffSnippet}
\`\`\`

Current ARCHITECTURE.md:

${architectureMd}

Return the updated ARCHITECTURE.md content, or NO_CHANGES.`;

console.log("Asking Claude to review architectural changes…");

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userMessage }],
  }),
});

if (!res.ok) {
  console.error(`Anthropic API error: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const data = await res.json();
const updatedMd = data.content?.[0]?.text?.trim() ?? "";

if (!updatedMd || updatedMd === "NO_CHANGES") {
  console.log("Claude found no architectural changes — skipping.");
  process.exit(0);
}

// Basic sanity check: response should contain Mermaid fences
if (!updatedMd.includes("```mermaid")) {
  console.error("Unexpected Claude response format — aborting to avoid corrupting docs.");
  console.error(updatedMd.slice(0, 300));
  process.exit(1);
}

// ── 4. Write ARCHITECTURE.md ─────────────────────────────────────────────────

writeFileSync("ARCHITECTURE.md", updatedMd);
console.log("ARCHITECTURE.md updated.");

// ── 5. Sync Mermaid blocks into architecture.html ────────────────────────────
//
// The HTML wraps each diagram in:
//   <pre class="mermaid">
//   %%{init: {...}}%%     ← theming line — keep as-is
//   <diagram content>
//   </pre>
//
// We extract fresh diagram content from the updated MD and splice it in,
// preserving the %%{init…}%% theming lines that only exist in the HTML.

const mermaidBlocks = [...updatedMd.matchAll(/```mermaid\n([\s\S]*?)```/g)].map(
  (m) => m[1].trimEnd()
);

if (mermaidBlocks.length === 0) {
  console.warn("No mermaid blocks found in updated MD — skipping HTML sync.");
  process.exit(0);
}

let html = readFileSync("architecture.html", "utf-8");
let blockIdx = 0;

html = html.replace(
  /(<pre class="mermaid">\n)(%%\{init:.*?%%\n)([\s\S]*?)(\s*<\/pre>)/g,
  (_, openTag, initLine, _oldContent, closeTag) => {
    if (blockIdx >= mermaidBlocks.length) return _;
    const newContent = mermaidBlocks[blockIdx++];
    return `${openTag}${initLine}${newContent}\n    ${closeTag.trim()}`;
  }
);

writeFileSync("architecture.html", html);
console.log(`architecture.html updated (${blockIdx} diagram(s) synced).`);
