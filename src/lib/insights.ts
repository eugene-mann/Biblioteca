import type { Book, SuggestedBook } from "@/types/database";
import { searchBookByTitleAuthorOL } from "@/lib/open-library";
import { searchBooks } from "@/lib/google-books";

interface InsightResponse {
  why_read: string;
  themes: string[];
  quotes: string[];
  related_books: string[];
  suggested_books: { title: string; authors: string[]; reasoning: string }[];
}

function buildPrompt(book: Book, libraryBooks: Book[]): string {
  const libraryList = libraryBooks
    .filter((b) => b.id !== book.id)
    .map((b) => `- "${b.title}" by ${b.authors.join(", ")} [ID: ${b.id}]${b.category ? ` (${b.category})` : ""}`)
    .join("\n");

  return `You are a literary analyst with deep knowledge of books across all genres. Analyze the following book and provide insights.

BOOK TO ANALYZE:
Title: "${book.title}"${book.subtitle ? `\nSubtitle: "${book.subtitle}"` : ""}
Author(s): ${book.authors.join(", ")}${book.description ? `\nDescription: ${book.description}` : ""}${book.categories.length ? `\nCategories: ${book.categories.join(", ")}` : ""}

THE READER'S LIBRARY:
${libraryList || "(empty library)"}

Provide:
1. "why_read": A compelling 2-3 sentence summary of why someone should read this book. Focus on what makes it valuable and unique.
2. "themes": 3-4 key themes or concepts explored in the book (short phrases, 2-4 words each).
3. "quotes": 3-5 notable, well-known quotes from this book. Use real quotes that are widely attributed to this book. If you are not confident about exact wording, provide the closest well-known version.
4. "related_books": 2-3 book IDs from the reader's library that are most thematically connected to this book. Only use IDs from the library list above. If the library is empty, return an empty array.
5. "suggested_books": 3-5 books NOT in the reader's library that are thematically, stylistically, or topically related to this book. For each, provide the title, authors array, and a 1-sentence reasoning explaining the connection. Do not suggest any book that appears in the reader's library above.

Respond in this exact JSON format (no markdown, no code fences):
{"why_read": "...", "themes": ["...", "..."], "quotes": ["...", "..."], "related_books": ["uuid-1", "uuid-2"], "suggested_books": [{"title": "...", "authors": ["..."], "reasoning": "..."}]}`;
}

async function hydrateSuggestedBook(
  raw: { title: string; authors: string[]; reasoning: string }
): Promise<SuggestedBook> {
  // Try Open Library first (free, no rate limits)
  const olResult = await searchBookByTitleAuthorOL(raw.title, raw.authors[0]);
  if (olResult?.cover_image_url) {
    return {
      title: raw.title,
      authors: raw.authors,
      cover_image_url: olResult.cover_image_url,
      isbn_13: olResult.isbn_13 ?? undefined,
      reasoning: raw.reasoning,
    };
  }

  // Fall back to Google Books
  try {
    const gbResults = await searchBooks(`${raw.title} ${raw.authors[0] ?? ""}`);
    if (gbResults.length > 0) {
      const best = gbResults[0];
      return {
        title: raw.title,
        authors: raw.authors,
        cover_image_url: best.cover_image_url ?? undefined,
        isbn_13: best.isbn_13 ?? undefined,
        reasoning: raw.reasoning,
      };
    }
  } catch {
    // Google Books failed — continue without cover
  }

  // No cover found — include without
  return {
    title: raw.title,
    authors: raw.authors,
    reasoning: raw.reasoning,
  };
}

async function hydrateSuggestedBooks(
  raws: { title: string; authors: string[]; reasoning: string }[]
): Promise<SuggestedBook[]> {
  return Promise.all(raws.map(hydrateSuggestedBook));
}

export async function generateBookInsights(
  book: Book,
  libraryBooks: Book[]
): Promise<{
  why_read: string;
  themes: string[];
  quotes: string[];
  related_book_ids: string[];
  suggested_books: SuggestedBook[];
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const prompt = buildPrompt(book, libraryBooks);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Empty response from Claude API");

  const parsed: InsightResponse = JSON.parse(text);

  // Validate related_book_ids are actual UUIDs from the library
  const libraryIds = new Set(libraryBooks.map((b) => b.id));
  const validRelatedIds = (parsed.related_books || []).filter((id) => libraryIds.has(id));

  // Hydrate suggested books with covers
  const suggestedBooks = await hydrateSuggestedBooks(parsed.suggested_books || []);

  return {
    why_read: parsed.why_read,
    themes: parsed.themes,
    quotes: parsed.quotes,
    related_book_ids: validRelatedIds,
    suggested_books: suggestedBooks,
  };
}
