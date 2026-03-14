import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("collection_books")
    .select("collection_id, collections(*)")
    .eq("book_id", id)
    .eq("collections.user_id", DEFAULT_USER_ID);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const collections = (data ?? [])
    .map((row) => row.collections)
    .filter(Boolean);

  return NextResponse.json(collections);
}
