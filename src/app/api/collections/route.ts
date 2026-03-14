import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { CollectionWithCovers } from "@/types/database";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_books(book_id, books(cover_image_url))")
    .eq("user_id", DEFAULT_USER_ID)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const collections: CollectionWithCovers[] = (data ?? []).map((c) => {
    const collectionBooks = (c.collection_books ?? []) as Array<{
      book_id: string;
      books: { cover_image_url: string | null } | null;
    }>;
    return {
      id: c.id,
      name: c.name,
      sort_order: c.sort_order,
      user_id: c.user_id,
      created_at: c.created_at,
      book_count: collectionBooks.length,
      cover_urls: collectionBooks
        .slice(0, 3)
        .map((cb) => cb.books?.cover_image_url ?? null),
    };
  });

  return NextResponse.json(collections);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Get max sort_order
  const { data: existing } = await supabase
    .from("collections")
    .select("sort_order")
    .eq("user_id", DEFAULT_USER_ID)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("collections")
    .insert({ name, sort_order: nextOrder, user_id: DEFAULT_USER_ID })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
