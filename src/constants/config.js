export const TABS = [
  { id: "overview",   icon: "◎", label: "Overview" },
  { id: "analysis",   icon: "▦", label: "Analysis" },
  { id: "recs",       icon: "✦", label: "Recommendations" },
  { id: "library",    icon: "≡", label: "Library" },
  { id: "chat",       icon: "◈", label: "Chat" },
];

export const AUTO_RECS = [
  "more-like", "more-by-last", "similar-author", "trending",
  "challenge", "quick", "gaps", "surprise", "finish",
];

// Semantic model tiers — change these to switch the active LLM provider.
// Model name prefix determines routing: "claude-*" → Anthropic, "gpt-*" → OpenAI.
export const DEFAULT_MODELS = {
  fast:     "claude-haiku-4-5-20251001", // country lookup, color generation, recs
  standard: "claude-sonnet-4-6",          // book fill, analysis initial fetch
  quality:  "claude-opus-4-6",            // analysis regenerate
};

export const DEFAULT_PANEL_PROMPTS = {
  temporal:   "Analyse the rhythm of reading — peaks, lulls, and gaps — as a record of life intensity. What does the pattern of engagement (not what was read, but when and how much) suggest about how life shaped the habit? Do not discuss genre or taste. Keep it concise — 3-4 sentences.",
  genre:      "Trace how taste has evolved over time — what genres and forms dominated each era, and what the migrations between them reveal about changing intellectual and emotional appetites. Do not discuss pace or volume. Keep it concise — 3-4 sentences, focus on the arc not a catalogue.",
  thematic:   "Surface the 2-3 most significant recurring themes or intellectual preoccupations across the library. Each book includes tagged themes — use these to identify the strongest recurring patterns rather than inferring from titles alone. Do not reference specific years. Keep it concise — 3-4 sentences.",
  contextual: "Infer what life events, transitions, or phases might explain shifts and clusters in the reading list. What does the data suggest about what was happening off the page? Speculate thoughtfully where the evidence implies a story. Keep it concise — 3-4 sentences.",
  complexity: "Describe the balance between stretching and comfort reading this library reveals. Consider both the ratio of demanding to accessible reads and the variety of narrative styles across the library. What does this say about how this person engages with books? Do not reference specific years. Keep it concise — 3-4 sentences, mention at most one or two specific examples.",
  emotional:  "Describe the dominant emotional palette of this library as a whole. Each book has a tagged mood — use these to surface which tones this reader consistently seeks out or avoids. Treat the library as a single body of work, not a timeline. Do not reference specific years. Keep it concise — 3-4 sentences.",
  blindspots: "Identify what's conspicuously absent from this library given the reader's apparent interests and patterns. Consider missing themes, moods, archetypes, setting eras, and cultural perspectives — not just genres. What do the gaps reveal about the reader? Do not reference specific years. Keep it concise — 3-4 sentences.",
  recent:     "Focus exclusively on the books provided (read in the last 12 months). What themes, moods, or interests define this window? Does the mood or archetype pattern in this recent window differ from the broader reading history? Do not reference specific calendar years. Keep it concise — 3-4 sentences.",
};

