import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getRecommendations, extractTopicsFromLibrary, CURATED_TOPICS, HIDDEN_LIBRARY_TOPICS, EXTRA_TOPICS } from "@/lib/recommendations";

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

    // Return recs immediately without cover hydration — client hydrates async
    const recs = llmRecs.map((rec) => {
      const query = encodeURIComponent(`${rec.title} ${rec.author}`);
      return {
        title: rec.title,
        authors: [rec.author],
        reasoning: rec.reasoning,
        inspired_by: rec.inspired_by,
        cover_image_url: null as string | null,
        isbn: null as string | null,
        amazon_link: `https://www.amazon.com/s?k=${query}`,
      };
    });

    return NextResponse.json({
      recommendations: recs,
      topics: { library: libraryTopics, curated: CURATED_TOPICS },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate recommendations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
