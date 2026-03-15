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

  return `You are a knowledgeable, warm book curator — like a well-read friend who always knows the perfect next book. Given this reader's personal library, recommend 10 books they haven't read yet.

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

function trimBooks(books: Book[]): Book[] {
  return [...books]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || new Date(b.date_added).getTime() - new Date(a.date_added).getTime())
    .slice(0, 30);
}

export async function getRecommendations(
  books: Book[],
  topic?: string
): Promise<LLMRecommendation[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const prompt = buildPrompt(trimBooks(books), topic);

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
 * Extract complete JSON objects from a partial JSON array string.
 * Tracks brace depth to find complete {...} objects within the recommendations array.
 */
function extractCompleteObjects(text: string): LLMRecommendation[] {
  const results: LLMRecommendation[] = [];
  // Find the start of the array
  const arrayStart = text.indexOf("[");
  if (arrayStart === -1) return results;

  let depth = 0;
  let objStart = -1;

  for (let i = arrayStart; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try {
          const obj = JSON.parse(text.slice(objStart, i + 1));
          if (obj.title && obj.author) {
            results.push(obj);
          }
        } catch {
          // Incomplete object, skip
        }
        objStart = -1;
      }
    }
  }
  return results;
}

/**
 * Stream recommendations from Claude API, yielding each rec as it completes.
 * Returns a ReadableStream that emits newline-delimited JSON objects.
 */
export function streamRecommendations(
  books: Book[],
  topic?: string
): ReadableStream<Uint8Array> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const prompt = buildPrompt(trimBooks(books), topic);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
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
            stream: true,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          controller.enqueue(encoder.encode(JSON.stringify({ error: `Claude API error: ${res.status}` }) + "\n"));
          controller.close();
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let emittedCount = 0;
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);
              if (event.type === "content_block_delta" && event.delta?.text) {
                accumulated += event.delta.text;
                const recs = extractCompleteObjects(accumulated);
                while (emittedCount < recs.length) {
                  const rec = recs[emittedCount];
                  controller.enqueue(encoder.encode(JSON.stringify({
                    type: "rec",
                    data: {
                      title: rec.title,
                      authors: [rec.author],
                      reasoning: rec.reasoning,
                      inspired_by: rec.inspired_by,
                      cover_image_url: null,
                      isbn: null,
                      amazon_link: `https://www.amazon.com/s?k=${encodeURIComponent(`${rec.title} ${rec.author}`)}`,
                    }
                  }) + "\n"));
                  emittedCount++;
                }
              }
            } catch {
              // Skip malformed SSE events
            }
          }
        }

        controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(JSON.stringify({ error: err instanceof Error ? err.message : "Stream failed" }) + "\n"));
        controller.close();
      }
    },
  });
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
  // Award lists
  "Hugo Award Winners",
  "Pulitzer Fiction",
  "National Book Award",
  "Man Booker Prize",
  "Nebula Award Winners",
  "Nobel Literature Laureates",
  // Celebrity picks
  "Bill Gates Reading List",
  "Obama Summer Reading",
  "Oprah Book Club",
  "NYT Best of 2025",
  // Genre exploration
  "Epic Fantasy",
  "Hard Sci-Fi",
  "True Crime",
  "Narrative Nonfiction",
  "Military History",
  "Ancient Civilizations",
  "Startup & Entrepreneurship",
  "Stoicism & Philosophy",
  "Space Exploration",
  "Economics & Markets",
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
