import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getRecommendations, extractTopicsFromLibrary, CURATED_TOPICS, HIDDEN_LIBRARY_TOPICS, EXTRA_TOPICS } from "@/lib/recommendations";
import { searchBookByTitleAuthor } from "@/lib/google-books";
import { searchBookByTitleAuthorOL } from "@/lib/open-library";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get("topic") ?? undefined;
  const prompt = request.nextUrl.searchParams.get("prompt") ?? undefined;

  // Fetch user's library
  const { data: books, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", DEFAULT_USER_ID)
    .order("date_added", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!books || books.length === 0) {
    return NextResponse.json({
      recommendations: [],
      topics: { library: [], curated: CURATED_TOPICS },
      message: "Add some books to your library first to get recommendations!",
    });
  }

  // Extract topics from library, filtering hidden ones and adding extras
  const rawLibraryTopics = extractTopicsFromLibrary(books);
  const libraryTopics = [
    ...rawLibraryTopics.filter((t) => !HIDDEN_LIBRARY_TOPICS.includes(t)),
    ...EXTRA_TOPICS.filter((t) => !rawLibraryTopics.includes(t)),
  ];

  // If only topics were requested (no generation)
  if (request.nextUrl.searchParams.get("topics_only") === "true") {
    return NextResponse.json({
      topics: { library: libraryTopics, curated: CURATED_TOPICS },
    });
  }

  try {
    // Get LLM recommendations
    // Combine topic chip and free-form prompt
    const combinedTopic = [topic, prompt].filter(Boolean).join(" — ") || undefined;
    const llmRecs = await getRecommendations(books, combinedTopic);

    // Hydrate with covers via Google Books API
    const hydrated = await Promise.all(
      llmRecs.map(async (rec) => {
        let cover_image_url: string | null = null;
        let isbn: string | null = null;
        let amazon_link: string | null = null;

        try {
          const apiBook = await searchBookByTitleAuthor(rec.title, rec.author);
          if (apiBook) {
            cover_image_url = apiBook.cover_image_url;
            isbn = apiBook.isbn_13;
            amazon_link = apiBook.amazon_link;
          }
        } catch {
          // Google Books failed — silent
        }

        // Fallback to Open Library if no cover found
        if (!cover_image_url) {
          try {
            const olBook = await searchBookByTitleAuthorOL(rec.title, rec.author);
            if (olBook) {
              cover_image_url = olBook.cover_image_url ?? cover_image_url;
              isbn = isbn ?? olBook.isbn_13;
              amazon_link = amazon_link ?? olBook.amazon_link;
            }
          } catch {
            // Open Library also failed — proceed without cover
          }
        }

        // Fallback Amazon link
        if (!amazon_link) {
          const query = encodeURIComponent(`${rec.title} ${rec.author}`);
          amazon_link = `https://www.amazon.com/s?k=${query}`;
        }

        return {
          title: rec.title,
          authors: [rec.author],
          reasoning: rec.reasoning,
          inspired_by: rec.inspired_by,
          cover_image_url,
          isbn,
          amazon_link,
        };
      })
    );

    return NextResponse.json({
      recommendations: hydrated,
      topics: { library: libraryTopics, curated: CURATED_TOPICS },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate recommendations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
