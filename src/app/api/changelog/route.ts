import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const offset = Number(searchParams.get("offset") || 0);

  const { data, error } = await supabase
    .from("book_changelog")
    .select("*")
    .eq("user_id", DEFAULT_USER_ID)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Batch-fetch slugs for all book_ids in the changelog
  const bookIds = [...new Set((data ?? []).map((r) => r.book_id).filter(Boolean))];
  let slugMap: Record<string, string> = {};

  if (bookIds.length > 0) {
    const { data: books } = await supabase
      .from("books")
      .select("id, slug")
      .in("id", bookIds);
    if (books) {
      slugMap = Object.fromEntries(books.map((b) => [b.id, b.slug]));
    }
  }

  const entries = (data ?? []).map((row) => ({
    ...row,
    book_slug: row.book_id ? slugMap[row.book_id] ?? null : null,
  }));

  return NextResponse.json(entries);
}
