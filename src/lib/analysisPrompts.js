import { buildBookContext, toRow } from "./bookUtils";

const TEMPORAL_DIMS = new Set(["temporal", "genre", "contextual"]);

// Returns the full fetch body for a single analysis panel request.
export function buildAnalysisRequestBody({ dimension, books, panelPrompts, model = "claude-sonnet-4-6", maxTokens = 400 }) {
  const currentYear = new Date().getFullYear();
  const isRecent = dimension === "recent";
  const listSource = isRecent
    ? books.filter(b => (b.year_read_end || b.year) >= currentYear - 1)
    : books;

  const ctx = buildBookContext(books);
  const listLabel = isRecent
    ? `RECENT BOOKS — last 12 months (${listSource.length} books)`
    : `FULL BOOK LIST (${books.length} books)`;
  const listContent = listSource.map(toRow).join("\n");

  const effectivePrompt = panelPrompts[dimension]?.trim() || "";
  const customInstruction = effectivePrompt ? `\n\nFocus: ${effectivePrompt}` : "";
  const noYearsNote = TEMPORAL_DIMS.has(dimension)
    ? ""
    : "\n\nCRITICAL: Do not reference or cite any specific years in your response.";

  const systemPrompt = [
    `You are analyzing a personal reading database. Return ONLY a valid JSON object with exactly one key: "${dimension}". The value must be a JSON object with two fields: "insight" (3-4 concise sentences on patterns and arc — not catalogues, at most 1-2 illustrative mentions) and "evidence" (array of up to 3 exact book titles verbatim from the provided list that most directly support this insight). Do not use markdown. Do not invent facts or titles.`,
    customInstruction,
    "\n\nCRITICAL: Year 2010 is a placeholder for all books read 1998–2010. Never describe it as a peak or anomaly.",
    noYearsNote,
  ].join("");

  return {
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: `${ctx}\n\n--- ${listLabel} ---\n${listContent}\n\nGenerate insight for the "${dimension}" dimension only.` }],
  };
}

// Returns the full fetch body for a single panel regeneration (uses a stronger model).
export function buildRegenerateRequestBody({ dimension, books, panelPrompts }) {
  return buildAnalysisRequestBody({ dimension, books, panelPrompts, model: "claude-opus-4-6", maxTokens: 450 });
}

// Parses a JSON text response from an analysis panel into { insight, evidence }.
export function parseAnalysisResponse(text, dimension) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (!parsed[dimension]) return null;
    const val = parsed[dimension];
    return {
      insight: typeof val === "string" ? val : (val.insight || ""),
      evidence: typeof val === "string" ? [] : (Array.isArray(val.evidence) ? val.evidence : []),
    };
  } catch { return null; }
}
