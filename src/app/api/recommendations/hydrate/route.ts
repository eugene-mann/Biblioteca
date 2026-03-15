import { NextRequest, NextResponse } from "next/server";
import { searchBookByTitleAuthor } from "@/lib/google-books";
import { searchBookByTitleAuthorOL } from "@/lib/open-library";

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title");
  const author = request.nextUrl.searchParams.get("author");

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

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

  return NextResponse.json({ cover_image_url, isbn, amazon_link });
}
