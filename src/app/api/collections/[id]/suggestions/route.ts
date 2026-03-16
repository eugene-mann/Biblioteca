import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { Book } from "@/types/database";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get collection info
  const { data: collection, error: collErr } = await supabase
    .from("collections")
    .select("name")
    .eq("id", id)
    .single();

  if (collErr || !collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  // Get book IDs in this collection
  const { data: collBooks } = await supabase
    .from("collection_books")
    .select("book_id")
    .eq("collection_id", id);

  const bookIds = collBooks?.map((cb) => cb.book_id) ?? [];
  if (bookIds.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // Get full book data for collection books
  const { data: books } = await supabase
    .from("books")
    .select("*")
    .in("id", bookIds)
    .eq("user_id", DEFAULT_USER_ID);

  if (!books || books.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // Get all library book titles to exclude
  const { data: allBooks } = await supabase
    .from("books")
    .select("title, authors")
    .eq("user_id", DEFAULT_USER_ID);

  const libraryTitles = new Set(
    (allBooks ?? []).map((b: Pick<Book, "title">) => b.title.toLowerCase())
  );

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const bookList = books
    .map((b: Book) => `"${b.title}" by ${b.authors.join(", ")}`)
    .join("\n");

  const libraryList = (allBooks ?? [])
    .map((b) => `"${b.title}"`)
    .join(", ");

  const prompt = `You are a knowledgeable book curator. Given this "${collection.name}" collection, suggest exactly 3 books that would be a perfect fit.

Books in the collection:
${bookList}

Books already in the user's library (do NOT suggest these):
${libraryList}

RULES:
- Suggest books that match the theme/vibe of this specific collection
- Each suggestion: title, author, and one short sentence (15 words max) on why it fits
- Do NOT suggest any books already listed above or in the user's library
- Suggest well-known, acclaimed books that are easy to find

Respond in this exact JSON format (no markdown, no code fences):
{"suggestions": [{"title": "Book Title", "author": "Author Name", "reason": "Short reason why it fits this collection."}]}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Claude API error: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    let text = data.content?.[0]?.text;
    if (!text) return NextResponse.json({ suggestions: [] });

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const parsed = JSON.parse(text);
    // Filter out any that are already in the library
    const filtered = parsed.suggestions.filter(
      (s: { title: string }) => !libraryTitles.has(s.title.toLowerCase())
    );

    // If all got filtered, return unfiltered — user can decide
    const result = filtered.length > 0 ? filtered.slice(0, 3) : parsed.suggestions.slice(0, 3);
    return NextResponse.json({ suggestions: result });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
