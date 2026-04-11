import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nhcmtjmqpahlrvbcyksl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cCmmWZJrBU2Voi9VehZJUg_o895iWyC";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data: rawBooks } = await supabase
  .from("books")
  .select("*, book_authors(author_order, authors(id, name, country))")
  .order("year_read_end", { ascending: true });

const books = rawBooks.map(b => ({
  ...b,
  author: b.book_authors?.sort((a,z) => a.author_order - z.author_order)[0]?.authors?.name || "",
  country: b.book_authors?.[0]?.authors?.country || "",
  year: b.year_read_end || b.year_read_start,
}));

console.error(`Loaded ${books.length} books`);

const buildContext = () => {
  const byYear = {}, byGenre = {}, byAuthor = {}, byCountry = {};
  books.forEach(b => {
    const yr = b.year_read_end || b.year_read_start;
    byYear[yr] = (byYear[yr] || 0) + 1;
    (b.genre || []).forEach(g => { byGenre[g] = (byGenre[g] || 0) + 1; });
    byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
    if (b.country) byCountry[b.country] = (byCountry[b.country] || 0) + 1;
  });
  const topAuthors = Object.entries(byAuthor).sort((a,b)=>b[1]-a[1]).slice(0,25).map(([a,c])=>`${a}(${c})`).join(", ");
  const genres = Object.entries(byGenre).sort((a,b)=>b[1]-a[1]).map(([g,c])=>`${g}(${c})`).join(", ");
  const years = Object.entries(byYear).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([y,c])=>`${y}:${c}`).join(", ");
  const countries = Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([c,n])=>`${c}(${n})`).join(", ");
  const fictionCount = books.filter(b=>b.fiction).length;
  const readTitles = books.map(b => b.title).join(", ");
  return { summary: `READING DATABASE: ${books.length} books.\nNOTE: Year 2010 is a collective entry representing all books read 1998–2010.\nBOOKS BY YEAR: ${years}\nTOP AUTHORS: ${topAuthors}\nGENRES: ${genres}\nCOUNTRIES: ${countries}\nFICTION: ${fictionCount} (${Math.round(fictionCount/books.length*100)}%) | NON-FICTION: ${books.length-fictionCount}`, readTitles };
};

const { summary, readTitles } = buildContext();
// For seed generation, pin the reference book so the output is reproducible.
// Update these when you want to regenerate with a different starting point.
const SEED_LAST_BOOK = { title: "Yumi and the Nightmare Painter", author: "Brandon Sanderson" };
const lastBook = SEED_LAST_BOOK;
const lastAuthor = SEED_LAST_BOOK.author;
const seriesList = [...new Set(books.filter(b => b.series?.trim()).map(b => b.series))];
const randomSeries = seriesList[Math.floor(Math.random() * seriesList.length)] || "Wheel of Time";
const today = new Date().toISOString().slice(0, 10);

const AUTO_RECS = ["more-like", "more-by-last", "similar-author", "trending", "challenge", "quick", "gaps", "surprise", "finish"];

const prompts = {
  "more-like": `The user's most recent read is "${lastBook?.title}" by ${lastAuthor}. Recommend 1 unread book with the same feel, themes, or writing style that this reader would love.`,
  "more-by-last": `The user's most recent author is ${lastAuthor}. Recommend 1 other book by ${lastAuthor} that the reader hasn't read yet. If all are read, recommend 1 book by an author with very similar style.`,
  "similar-author": `Based on the reader loving ${lastAuthor}, recommend 1 book by an author with a very similar writing style, themes, or storytelling approach.`,
  "trending": `Today is ${today}. Recommend 1 book that is critically acclaimed, culturally buzzy, or award-shortlisted in 2024–2026 that fits this reader's taste profile.`,
  "challenge": `This reader favors accessible genre fiction. Recommend 1 genuinely challenging, rewarding read — dense classic, experimental fiction, or demanding long-form non-fiction.`,
  "quick": `Recommend 1 book under 300 pages that is deeply rewarding given this reader's taste.`,
  "gaps": `This reader's library skews Western/Indian/anglophone. Recommend 1 book from an underrepresented literary tradition — Japanese, African, Latin American, Nordic, Arabic, or Southeast Asian voices.`,
  "surprise": `Give 1 wildly unexpected book recommendation that this reader would never pick for themselves but would secretly love. Bold, surprising, off-pattern pick.`,
  "finish": `This reader has read books from the series "${randomSeries}". Recommend 1 book that is either the next unread entry in this series or a very similar series with satisfying completions.`,
};

const result = {};

for (const id of AUTO_RECS) {
  console.error(`Generating: ${id}...`);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: `You are a precise book recommendation engine. Today is ${today}. Reader history:\n${summary}\n\nDo NOT recommend any of these already-read titles: ${readTitles}.\n\nOnly recommend unread books published up to ${today}.\n\n${prompts[id]}\n\nReturn ONLY a JSON array — no markdown, no explanation. Exactly 1 item. Format: [{"title": "...", "author": "...", "year": 2024, "reason": "1-2 sentences why it fits this reader"}].`,
      messages: [{ role: "user", content: "JSON array only." }],
    })
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "[]";
  const match = text.match(/\[[\s\S]*?\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length) {
        result[id] = parsed.slice(0, 1);
        console.error(`  ✓ ${id}: "${parsed[0].title}" by ${parsed[0].author}`);
      }
    } catch { console.error(`  ✗ ${id}: parse error`); }
  }
}

console.log(JSON.stringify(result, null, 2));
