import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; bookId: string }> }
) {
  const { id, bookId } = await params;

  const { error } = await supabase
    .from("collection_books")
    .delete()
    .eq("collection_id", id)
    .eq("book_id", bookId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
