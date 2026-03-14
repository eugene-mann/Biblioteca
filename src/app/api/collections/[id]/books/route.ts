import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("collection_books")
    .select("book_id")
    .eq("collection_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookIds = (data ?? []).map((row) => row.book_id);
  return NextResponse.json({ bookIds });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { bookId } = body;

  if (!bookId || typeof bookId !== "string") {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("collection_books")
    .upsert(
      { collection_id: id, book_id: bookId },
      { onConflict: "collection_id,book_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
