export const READING_CONTEXT = `This reader has consumed 345 books across 17 years (2010–2026). Key patterns:

TOP AUTHORS: Brandon Sanderson (many books – Mistborn, Stormlight Archive, Skyward, Cosmere novellas), Sidney Sheldon (thrillers), Sarah J. Maas (ACOTAR series), Rebecca Yarros (Empyrean series), J.K. Rowling (Harry Potter), Christopher Paolini (Eragon), Ken Follett (Kingsbridge), Agatha Christie (mysteries), Amish Tripathi (Indian mythology fantasy), Robert Jordan (Wheel of Time), Dan Brown (thrillers), Andy Weir (sci-fi), Walter Isaacson (biographies), Yuval Noah Harari (non-fiction), Perumal Murugan (Indian literary), Arundhati Roy (Indian literary), Appupen (Indian graphic novels).

GENRES (ranked): Thriller (~83 books) > Literary Fiction (~55) > Fantasy (~54) > Sci-Fi (~47) > Biography (~19) > Popular Science (~17) > History (~17) > Philosophy (~9) > Politics (~8) > Historical Fiction (~8) > Mystery (~6) > Economics (~5) > Graphic Novel (~5) > Non-Fiction (~5) > Psychology (~3) > Self-Help (~2) > Horror (~1) > Business (~1).

CRITICAL NOTE ON 2010: The year 2010 in this database is a collective placeholder representing ALL books read between 1998 and 2010 — roughly 12 years of reading before annual tracking began. It is NOT a single year with unusually high volume. Do not describe it as a peak year, anomaly, or outlier. Never say the reader read 130 books in 2010.

YEAR HIGHLIGHTS: Pre-2011 (collective 1998–2010 reading, entered as a single block before annual tracking began), 2011-2014 (fantasy exploration), 2015-2017 (diverse non-fiction phase), 2018-19 (literary fiction surge), 2020-21 (pandemic reading peak – 24+40 books), 2022 (sudden drop to 3), 2023-24 (hiatus), 2025-26 (comeback with romantasy – ACOTAR + Empyrean).

STRONG INTERESTS: Thrillers and crime fiction, epic fantasy, Indian literature, science non-fiction, literary fiction, biographies of scientists/leaders, graphic novels, history and politics.

POTENTIAL GAPS: Literary romance, poetry, westerns, African literature, Japanese fiction beyond manga, Latin American magical realism beyond Marquez, contemporary cozy mysteries, Nordic noir beyond Nesbo.

RECENT DIRECTION (2025-26): Clear romantasy and fantasy phase – ACOTAR series, Empyrean series, Cosmere. Also some literary fiction. Suggests appetite for character-driven fantasy with romance, not just plot-heavy epic fantasy.`;

export const TABS = [
  { id: "overview",   icon: "◎", label: "Overview" },
  { id: "analysis",   icon: "▦", label: "Analysis" },
  { id: "library",    icon: "≡", label: "Library" },
  { id: "bookshelf",  icon: "▣", label: "Bookshelf" },
  { id: "recs",       icon: "✦", label: "Recommendations" },
  { id: "series",     icon: "⊙", label: "Series Recap" },
  { id: "chat",       icon: "◈", label: "AI Chat" },
];

export const AUTO_RECS = [
  "more-like", "more-by-last", "similar-author", "trending",
  "challenge", "quick", "gaps", "surprise", "finish",
];

export const DEFAULT_PANEL_PROMPTS = {
  temporal:   "Analyse reading pace and volume over time. Note key shifts and how habits evolved. Keep it concise — 3-4 sentences, no exhaustive author lists.",
  genre:      "Examine how genre preferences shifted across eras. Identify dominant genres and notable transitions. Keep it concise — 3-4 sentences, focus on patterns not catalogues.",
  thematic:   "Surface the 2-3 most significant recurring themes or intellectual preoccupations across the library. Keep it concise — 3-4 sentences.",
  contextual: "Connect reading choices to life phases and context. Keep it concise — 3-4 sentences, focus on the narrative arc not individual books.",
  complexity: "Evaluate the balance between challenging and accessible reading over time. Keep it concise — 3-4 sentences, mention at most one or two specific examples.",
  emotional:  "Map the emotional arc of the library across eras. Keep it concise — 3-4 sentences, describe the shift in register without listing many titles.",
};

export const INPUT_DEFAULTS = {
  "loved":       ["Dune", "The Name of the Wind", "The White Tiger", "Gone Girl", "Foundation", "The Remains of the Day"],
  "authors-like":["Brandon Sanderson", "Agatha Christie", "Yuval Noah Harari", "Arundhati Roy", "Michael Crichton", "Neil Gaiman"],
  "mood":        ["dark and atmospheric", "light and funny", "epic and sweeping", "thought-provoking non-fiction", "cozy and comforting", "fast-paced thriller"],
  "topic":       ["artificial intelligence", "Indian history", "climate and environment", "espionage", "philosophy of mind", "exploration and adventure"],
  "occasion":    ["a long flight", "book club", "summer reading", "a lazy weekend", "gift for a friend who loves thrillers", "something to read before bed"],
  "pair":        ["Oppenheimer (film)", "Shogun (TV series)", "a trip to Japan", "watching the World Cup", "Interstellar (film)", "reading about WW2"],
};
