import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logChange } from "@/lib/changelog";
import type { ChangelogAction } from "@/types/database";

// Lookup by UUID or slug
async function findBook(idOrSlug: string) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

  if (isUUID) {
    return supabase.from("books").select("*").eq("id", idOrSlug).single();
  }
  return supabase.from("books").select("*").eq("slug", idOrSlug).single();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await findBook(id);

  if (error || !data) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: book } = await findBook(id);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const body = await request.json();

  // Whitelist allowed fields
  const allowedFields = [
    "title",
    "subtitle",
    "authors",
    "status",
    "rating",
    "external_rating",
    "category",
    "is_favorite",
    "description",
    "cover_image_url",
    "amazon_link",
    "date_started",
    "date_finished",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  // Auto-set dates based on status changes
  if (updates.status === "reading" && !updates.date_started) {
    updates.date_started = new Date().toISOString();
  }
  if (updates.status === "read" && !updates.date_finished) {
    updates.date_finished = new Date().toISOString();
  }

  // Track field changes for changelog
  const trackedFields: { field: string; action: ChangelogAction }[] = [
    { field: "rating", action: "rating_changed" },
    { field: "category", action: "category_changed" },
    { field: "status", action: "status_changed" },
    { field: "is_favorite", action: "favorite_changed" },
  ];

  const { data, error } = await supabase
    .from("books")
    .update(updates)
    .eq("id", book.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log changes for tracked fields
  for (const { field, action } of trackedFields) {
    if (field in updates && String(book[field] ?? "") !== String(updates[field] ?? "")) {
      await logChange({
        bookId: book.id,
        bookTitle: book.title,
        bookCoverUrl: book.cover_image_url,
        action,
        oldValue: book[field] != null ? String(book[field]) : null,
        newValue: updates[field] != null ? String(updates[field]) : null,
      });
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: book } = await findBook(id);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  // Log removal before deleting
  await logChange({
    bookId: book.id,
    bookTitle: book.title,
    bookCoverUrl: book.cover_image_url,
    action: "removed",
  });

  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", book.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
