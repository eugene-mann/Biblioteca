import { NextRequest, NextResponse } from "next/server";
import { searchBookByTitleAuthor } from "@/lib/google-books";
import { searchBookByTitleAuthorOL } from "@/lib/open-library";
import { supabase } from "@/lib/supabase";

function cacheKey(title: string, author?: string): string {
  return `${title}|${author ?? ""}`.toLowerCase();
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title");
  const author = request.nextUrl.searchParams.get("author");

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const key = cacheKey(title, author ?? undefined);

  // Check cache first
  const { data: cached } = await supabase
    .from("cover_cache")
    .select("cover_image_url, isbn_13, amazon_link")
    .eq("lookup_key", key)
    .single();

  if (cached) {
    return NextResponse.json({
      cover_image_url: cached.cover_image_url,
      isbn: cached.isbn_13,
      amazon_link: cached.amazon_link,
    });
  }

  // Cache miss — hit external APIs
  let cover_image_url: string | null = null;
  let isbn: string | null = null;
  let amazon_link: string | null = null;

  // Open Library first — no rate limits
  try {
    const olBook = await searchBookByTitleAuthorOL(title, author ?? undefined);
    if (olBook) {
      cover_image_url = olBook.cover_image_url;
      isbn = olBook.isbn_13;
      amazon_link = olBook.amazon_link;
    }
  } catch {
    // silent
  }

  // Google Books fallback
  if (!cover_image_url) {
    try {
      const gbBook = await searchBookByTitleAuthor(title, author ?? undefined);
      if (gbBook) {
        cover_image_url = gbBook.cover_image_url ?? cover_image_url;
        isbn = isbn ?? gbBook.isbn_13;
        amazon_link = amazon_link ?? gbBook.amazon_link;
      }
    } catch {
      // silent
    }
  }

  if (!amazon_link) {
    const query = encodeURIComponent(`${title} ${author ?? ""}`);
    amazon_link = `https://www.amazon.com/s?k=${query}`;
  }

  // Write to cache (fire and forget)
  supabase
    .from("cover_cache")
    .upsert({ lookup_key: key, cover_image_url, isbn_13: isbn, amazon_link }, { onConflict: "lookup_key" })
    .then();

  return NextResponse.json({ cover_image_url, isbn, amazon_link });
}
