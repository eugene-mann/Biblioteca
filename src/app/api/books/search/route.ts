import { NextRequest, NextResponse } from "next/server";
import { searchBooks } from "@/lib/google-books";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || !query.trim()) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchBooks(query);
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to search books. Please try again.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
