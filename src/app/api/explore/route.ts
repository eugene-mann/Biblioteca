import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { Book, BookInsight } from "@/types/database";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export type ExploreBook = Pick<
  Book,
  "id" | "slug" | "title" | "authors" | "cover_image_url" | "category" | "rating"
> & {
  insight: Pick<BookInsight, "why_read" | "themes" | "quotes">;
};

export interface ExploreCluster {
  clusterName: string;
  heroBook: ExploreBook;
  compactBooks: ExploreBook[];
}

function clusterByThemes(books: ExploreBook[]): ExploreCluster[] {
  const assigned = new Set<string>();
  const clusters: ExploreCluster[] = [];

  // Sort by rating descending so best books become heroes
  const sorted = [...books].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
  );

  for (const book of sorted) {
    if (assigned.has(book.id)) continue;

    // Find unassigned books sharing 2+ themes with this book
    const group: ExploreBook[] = [book];
    assigned.add(book.id);

    const bookThemes = new Set(book.insight.themes.map((t) => t.toLowerCase()));

    for (const candidate of sorted) {
      if (assigned.has(candidate.id)) continue;
      const overlap = candidate.insight.themes.filter((t) =>
        bookThemes.has(t.toLowerCase())
      ).length;
      if (overlap >= 2) {
        group.push(candidate);
        assigned.add(candidate.id);
      }
    }

    // If no overlap found, try 1-theme match
    if (group.length === 1) {
      for (const candidate of sorted) {
        if (assigned.has(candidate.id)) continue;
        const overlap = candidate.insight.themes.filter((t) =>
          bookThemes.has(t.toLowerCase())
        ).length;
        if (overlap >= 1) {
          group.push(candidate);
          assigned.add(candidate.id);
          if (group.length >= 4) break;
        }
      }
    }

    // Derive cluster name from the most common themes in the group
    const themeCounts = new Map<string, number>();
    for (const b of group) {
      for (const t of b.insight.themes) {
        themeCounts.set(t, (themeCounts.get(t) || 0) + 1);
      }
    }
    const topThemes = [...themeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([t]) => t);
    const clusterName = topThemes.join(" & ") || "Miscellaneous";

    clusters.push({
      clusterName,
      heroBook: group[0],
      compactBooks: group.slice(1),
    });
  }

  return clusters;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function GET() {
  const { data: insights, error: insightsError } = await supabase
    .from("book_insights")
    .select("book_id, why_read, themes, quotes")
    .eq("user_id", DEFAULT_USER_ID);

  if (insightsError) {
    return NextResponse.json({ error: insightsError.message }, { status: 500 });
  }

  if (!insights || insights.length === 0) {
    return NextResponse.json([]);
  }

  const bookIds = insights.map((i) => i.book_id);

  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("id, slug, title, authors, cover_image_url, category, rating")
    .in("id", bookIds);

  if (booksError) {
    return NextResponse.json({ error: booksError.message }, { status: 500 });
  }

  const bookMap = new Map((books ?? []).map((b) => [b.id, b]));

  const exploreBooks: ExploreBook[] = insights
    .map((insight) => {
      const book = bookMap.get(insight.book_id);
      if (!book) return null;
      return {
        id: book.id,
        slug: book.slug,
        title: book.title,
        authors: book.authors,
        cover_image_url: book.cover_image_url,
        category: book.category,
        rating: book.rating,
        insight: {
          why_read: insight.why_read,
          themes: insight.themes,
          quotes: insight.quotes,
        },
      };
    })
    .filter((b): b is ExploreBook => b !== null);

  const clusters = clusterByThemes(exploreBooks);

  return NextResponse.json(shuffle(clusters));
}
