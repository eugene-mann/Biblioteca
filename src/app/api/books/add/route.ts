import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateSlug } from "@/lib/slug";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(request: NextRequest) {
  try {
    const book = await request.json();

    // Check for duplicates by ISBN or title+author
    let existing: { id: string; slug: string | null } | null = null;
    if (book.isbn_13) {
      const { data } = await supabase
        .from("books")
        .select("id, slug")
        .eq("isbn_13", book.isbn_13)
        .eq("user_id", DEFAULT_USER_ID)
        .limit(1);
      if (data?.length) existing = data[0];
    }
    if (!existing) {
      const { data } = await supabase
        .from("books")
        .select("id, slug")
        .eq("title", book.title)
        .contains("authors", book.authors?.slice(0, 1) ?? [])
        .eq("user_id", DEFAULT_USER_ID)
        .limit(1);
      if (data?.length) existing = data[0];
    }

    if (existing) {
      return NextResponse.json(
        { existing: true, id: existing.id, slug: existing.slug },
        { status: 409 }
      );
    }

    // First insert to get the UUID, then generate slug from it
    const { data: inserted, error: insertError } = await supabase
      .from("books")
      .insert({
        ...book,
        user_id: DEFAULT_USER_ID,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? "Insert failed" },
        { status: 500 }
      );
    }

    // Generate and set slug
    const slug = generateSlug(inserted.title, inserted.authors, inserted.id);
    const { data, error } = await supabase
      .from("books")
      .update({ slug })
      .eq("id", inserted.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Increment library version
    await supabase.rpc("increment_library_version", {
      p_user_id: DEFAULT_USER_ID,
    });

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to add book." },
      { status: 500 }
    );
  }
}
