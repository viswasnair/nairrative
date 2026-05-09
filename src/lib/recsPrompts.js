// Builds the per-lens prompt strings for the recommendations tab.
export function buildLensPrompts({ lastBook, lastAuthor, randomSeries, today, input, variationNote }) {
  return {
    "more-like":      `The user's most recent read is "${lastBook?.title}" by ${lastAuthor}. Recommend 1 unread book with the same feel, themes, or writing style that this reader would love.${variationNote}`,
    "more-by-last":   `The user's most recent author is ${lastAuthor}. Recommend 1 other book by ${lastAuthor} that the reader hasn't read yet. If all are read, recommend 1 book by an author with very similar style.${variationNote}`,
    "similar-author": `Based on the reader loving ${lastAuthor}, recommend 1 book by an author with a very similar writing style, themes, or storytelling approach.${variationNote}`,
    "trending":       `Today is ${today}. Recommend 1 book that is critically acclaimed, culturally buzzy, or award-shortlisted in 2024–2026 that fits this reader's taste profile. Use web search to verify it is actually available and well-reviewed.${variationNote}`,
    "challenge":      `This reader favors accessible genre fiction. Recommend 1 genuinely challenging, rewarding read — dense classic, experimental fiction, or demanding long-form non-fiction.${variationNote}`,
    "quick":          `Recommend 1 book under 300 pages that is deeply rewarding given this reader's taste (thrillers, literary fiction, fantasy).${variationNote}`,
    "gaps":           `This reader's library skews Western/Indian/anglophone. Recommend 1 book from an underrepresented literary tradition — Japanese, African, Latin American, Nordic, Arabic, or Southeast Asian voices.${variationNote}`,
    "surprise":       `Give 1 wildly unexpected book recommendation that this reader would never pick for themselves but would secretly love. Bold, surprising, off-pattern pick.${variationNote}`,
    "finish":         `This reader has read books from the series "${randomSeries}". Recommend 1 book that is either the next unread entry in this series or a very similar series with satisfying completions.${variationNote}`,
    "loved":          `The user loved: "${input}". Recommend 1 book with similar appeal — themes, pacing, emotional tone, or narrative style.${variationNote}`,
    "authors-like":   `The user loves authors like ${input}. Recommend 1 book by a different author with very similar style, subject matter, or storytelling sensibility.${variationNote}`,
    "mood":           `The user is in the mood for: "${input}". Recommend 1 book that perfectly matches this emotional register or atmosphere.${variationNote}`,
    "genre-pick":     `Recommend 1 excellent book in the genre: "${input}". Today is ${today} — consider recent releases as well as classics.${variationNote}`,
    "topic":          `Recommend 1 book about: "${input}". Cross genre if needed — fiction, non-fiction, memoir. Today is ${today}.${variationNote}`,
    "pair":           `The user wants to pair a book with: "${input}" (a film, show, event, or experience). Recommend 1 ideal companion read.${variationNote}`,
  };
}
