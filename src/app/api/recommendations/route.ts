import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { streamRecommendations, extractTopicsFromLibrary, CURATED_TOPICS, HIDDEN_LIBRARY_TOPICS, EXTRA_TOPICS } from "@/lib/recommendations";

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

  // Stream recommendations — first emit topics, then individual recs
  const combinedTopic = [topic, prompt].filter(Boolean).join(" — ") || undefined;
  const encoder = new TextEncoder();
  const recStream = streamRecommendations(books, combinedTopic);
  const recReader = recStream.getReader();

  const stream = new ReadableStream({
    async start(controller) {
      // Emit topics first
      controller.enqueue(encoder.encode(JSON.stringify({
        type: "topics",
        data: { library: libraryTopics, curated: CURATED_TOPICS },
      }) + "\n"));

      // Pipe rec stream through
      try {
        while (true) {
          const { done, value } = await recReader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch {
        controller.enqueue(encoder.encode(JSON.stringify({ error: "Stream failed" }) + "\n"));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
