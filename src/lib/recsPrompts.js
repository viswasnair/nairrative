import { sanitizeShortInput, sanitizePromptInput } from "./textUtils";

/**
 * @param {{ lastBook: object|null, lastAuthor: string, randomSeries: string, today: string, input: string, variationNote: string }} params
 * @returns {Record<string, string>} Map of lens key → prompt string (15 entries)
 */
export function buildLensPrompts({ lastBook, lastAuthor, randomSeries, today, input, variationNote }) {
  const title  = lastBook?.title  ? sanitizeShortInput(lastBook.title)  : "";
  const author = sanitizeShortInput(lastAuthor || "");
  const series = sanitizeShortInput(randomSeries || "");
  const safeInput = sanitizePromptInput(input || "");
  return {
    "more-like":      `The user's most recent read is "${title}" by ${author}. Recommend 1 unread book with the same feel, themes, or writing style that this reader would love.${variationNote}`,
    "more-by-last":   `The user's most recent author is ${author}. Recommend 1 other book by ${author} that the reader hasn't read yet. If all are read, recommend 1 book by an author with very similar style.${variationNote}`,
    "similar-author": `Based on the reader loving ${author}, recommend 1 book by an author with a very similar writing style, themes, or storytelling approach.${variationNote}`,
    "trending":       `Today is ${today}. Recommend 1 book that is critically acclaimed, culturally buzzy, or award-shortlisted in 2024–2026 that fits this reader's taste profile. Use web search to verify it is actually available and well-reviewed.${variationNote}`,
    "challenge":      `This reader favors accessible genre fiction. Recommend 1 genuinely challenging, rewarding read — dense classic, experimental fiction, or demanding long-form non-fiction.${variationNote}`,
    "quick":          `Recommend 1 book under 300 pages that is deeply rewarding given this reader's taste (thrillers, literary fiction, fantasy).${variationNote}`,
    "gaps":           `This reader's library skews Western/Indian/anglophone. Recommend 1 book from an underrepresented literary tradition — Japanese, African, Latin American, Nordic, Arabic, or Southeast Asian voices.${variationNote}`,
    "surprise":       `Give 1 wildly unexpected book recommendation that this reader would never pick for themselves but would secretly love. Bold, surprising, off-pattern pick.${variationNote}`,
    "finish":         `This reader has read books from the series "${series}". Recommend 1 book that is either the next unread entry in this series or a very similar series with satisfying completions.${variationNote}`,
    "loved":          `The user loved: "${safeInput}". Recommend 1 book with similar appeal — themes, pacing, emotional tone, or narrative style.${variationNote}`,
    "authors-like":   `The user loves authors like ${safeInput}. Recommend 1 book by a different author with very similar style, subject matter, or storytelling sensibility.${variationNote}`,
    "mood":           `The user is in the mood for: "${safeInput}". Recommend 1 book that perfectly matches this emotional register or atmosphere.${variationNote}`,
    "genre-pick":     `Recommend 1 excellent book in the genre: "${safeInput}". Today is ${today} — consider recent releases as well as classics.${variationNote}`,
    "topic":          `Recommend 1 book about: "${safeInput}". Cross genre if needed — fiction, non-fiction, memoir. Today is ${today}.${variationNote}`,
    "pair":           `The user wants to pair a book with: "${safeInput}" (a film, show, event, or experience). Recommend 1 ideal companion read.${variationNote}`,
  };
}
