import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateBookInsights } from "@/lib/insights";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("book_insights")
    .select("*")
    .eq("book_id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ insight: data || null });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch the target book
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  // Fetch user's library for related books context
  const { data: libraryBooks } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", DEFAULT_USER_ID)
    .order("date_added", { ascending: false });

  // Generate insights via Claude
  const insights = await generateBookInsights(book, libraryBooks || []);

  // Upsert into book_insights
  const { data, error } = await supabase
    .from("book_insights")
    .upsert(
      {
        book_id: id,
        why_read: insights.why_read,
        themes: insights.themes,
        quotes: insights.quotes,
        related_book_ids: insights.related_book_ids,
        generated_at: new Date().toISOString(),
        user_id: DEFAULT_USER_ID,
      },
      { onConflict: "book_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ insight: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if ("quotes" in body) updates.quotes = body.quotes;
  if ("themes" in body) updates.themes = body.themes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("book_insights")
    .update(updates)
    .eq("book_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ insight: data });
}
