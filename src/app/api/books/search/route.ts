import { NextRequest, NextResponse } from "next/server";
import { searchBooks } from "@/lib/google-books";
import { searchBooksOpenLibrary } from "@/lib/open-library";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || !query.trim()) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchBooks(query);
    return NextResponse.json(results);
  } catch {
    // Google Books failed (rate limit, network error, etc.) — fall back to Open Library
    try {
      const results = await searchBooksOpenLibrary(query);
      return NextResponse.json(results);
    } catch {
      return NextResponse.json(
        { error: "Search is temporarily unavailable. Please try again in a moment." },
        { status: 500 }
      );
    }
  }
}
