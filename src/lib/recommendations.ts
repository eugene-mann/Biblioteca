import type { Book } from "@/types/database";

interface LLMRecommendation {
  title: string;
  author: string;
  reasoning: string;
  inspired_by: string[];
}

interface RecommendationResponse {
  recommendations: LLMRecommendation[];
}

function buildPrompt(books: Book[], topic?: string): string {
  const libraryDescription = books
    .map((b) => {
      const parts = [`"${b.title}" by ${b.authors.join(", ")}`];
      if (b.categories.length) parts.push(`(${b.categories.join(", ")})`);
      if (b.rating) parts.push(`— rated ${b.rating}/5`);
      if (b.status === "read") parts.push("[read]");
      if (b.status === "reading") parts.push("[currently reading]");
      return parts.join(" ");
    })
    .join("\n");

  const topicInstruction = topic
    ? `Focus your recommendations specifically on the topic: "${topic}". Recommend books related to this topic that would complement this reader's library.`
    : `Give general recommendations based on the reader's overall taste and interests.`;

  return `You are a knowledgeable, warm book curator — like a well-read friend who always knows the perfect next book. Given this reader's personal library, recommend 5 books they haven't read yet.

${topicInstruction}

The reader's library:
${libraryDescription}

IMPORTANT RULES:
- Do NOT recommend any books already in the library above
- Each recommendation should feel personally relevant, not generic bestsellers
- Explain in 2-3 sentences WHY this reader specifically would enjoy each book, referencing books from their library
- Be specific about which library books inspired each pick

Respond in this exact JSON format (no markdown, no code fences):
{"recommendations": [{"title": "Book Title", "author": "Author Name", "reasoning": "2-3 sentences explaining why this reader would love this book, referencing specific books from their library.", "inspired_by": ["Title from library that inspired this pick"]}]}`;
}

export async function getRecommendations(
  books: Book[],
  topic?: string
): Promise<LLMRecommendation[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const prompt = buildPrompt(books, topic);

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

  const parsed: RecommendationResponse = JSON.parse(text);
  return parsed.recommendations;
}

/**
 * Extract topic lenses from a user's library based on categories/genres.
 */
export function extractTopicsFromLibrary(books: Book[]): string[] {
  const categoryCounts = new Map<string, number>();

  for (const book of books) {
    for (const cat of book.categories) {
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }
  }

  // Sort by frequency, return top topics
  return [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cat]) => cat);
}

/**
 * Curated reading lists for topic steering.
 */
export const CURATED_TOPICS = [
  "Bill Gates Reading List",
  "Obama Summer Reading",
  "Hugo Award Winners",
  "Pulitzer Fiction",
  "NYT Best of 2025",
];

/**
 * Library topics to hide from the chip display.
 */
export const HIDDEN_LIBRARY_TOPICS = [
  "Self-Help",
  "Political Science",
];

/**
 * Extra topics always shown in the chip list (in addition to library-derived ones).
 */
export const EXTRA_TOPICS = [
  "Artificial Intelligence",
];
