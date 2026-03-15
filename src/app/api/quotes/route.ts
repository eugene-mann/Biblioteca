import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const { data, error } = await supabase
    .from("book_insights")
    .select("quotes, book_id, books!inner(id, title, authors, slug)")
    .eq("user_id", DEFAULT_USER_ID)
    .neq("quotes", "{}");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten: one entry per quote with book info
  const quotes = (data || []).flatMap((row) => {
    const book = row.books as unknown as { id: string; title: string; authors: string[]; slug: string | null };
    return (row.quotes as string[]).map((text) => ({
      text,
      bookTitle: book.title,
      author: book.authors[0] ?? "Unknown",
      bookSlug: book.slug || book.id,
    }));
  });

  return NextResponse.json(quotes);
}
