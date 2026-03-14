import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateSlug } from "@/lib/slug";
import { searchBookByTitleAuthor } from "@/lib/google-books";
import { parseGoodreadsCSV, parseKindleTitles } from "@/lib/csv-parser";
import type { ParsedBook } from "@/lib/csv-parser";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

async function isDuplicate(
  title: string,
  authors: string[],
  isbn13: string | null
): Promise<boolean> {
  if (isbn13) {
    const { data } = await supabase
      .from("books")
      .select("id")
      .eq("isbn_13", isbn13)
      .eq("user_id", DEFAULT_USER_ID)
      .limit(1);
    if (data?.length) return true;
  }
  const { data } = await supabase
    .from("books")
    .select("id")
    .eq("title", title)
    .contains("authors", authors.slice(0, 1))
    .eq("user_id", DEFAULT_USER_ID)
    .limit(1);
  return !!data?.length;
}

async function insertBook(book: Record<string, unknown>): Promise<boolean> {
  const { data: inserted, error: insertError } = await supabase
    .from("books")
    .insert({ ...book, user_id: DEFAULT_USER_ID })
    .select()
    .single();

  if (insertError || !inserted) return false;

  const slug = generateSlug(
    inserted.title as string,
    inserted.authors as string[],
    inserted.id as string
  );
  await supabase.from("books").update({ slug }).eq("id", inserted.id);
  return true;
}

/**
 * POST /api/books/import
 * Body: { type: "csv" | "kindle", content: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { type, content } = await request.json();

    if (!content || !type) {
      return NextResponse.json({ error: "Missing type or content" }, { status: 400 });
    }

    if (type === "csv") {
      return handleCSVImport(content);
    } else if (type === "kindle") {
      return handleKindleImport(content);
    }

    return NextResponse.json({ error: "Invalid import type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

async function handleCSVImport(csvText: string) {
  const { books, errors, total } = parseGoodreadsCSV(csvText);

  let imported = 0;
  let skippedDuplicates = 0;

  for (const parsed of books) {
    const dup = await isDuplicate(parsed.title, parsed.authors, parsed.isbn_13);
    if (dup) {
      skippedDuplicates++;
      continue;
    }

    // Try to enrich via Google Books API
    let enriched: Record<string, unknown> | null = null;
    try {
      const apiResult = await searchBookByTitleAuthor(
        parsed.title,
        parsed.authors[0]
      );
      if (apiResult) {
        enriched = { ...apiResult };
      }
    } catch {
      // API enrichment failed — continue with basic data
    }

    const bookData = enriched
      ? {
          ...enriched,
          // Preserve user's data from CSV over API defaults
          status: parsed.status,
          rating: parsed.rating ?? (enriched.rating as number | null),
          date_finished: parsed.date_finished,
          source: "csv" as const,
        }
      : {
          title: parsed.title,
          authors: parsed.authors,
          isbn_10: parsed.isbn_10,
          isbn_13: parsed.isbn_13,
          status: parsed.status,
          rating: parsed.rating,
          date_finished: parsed.date_finished,
          source: "csv" as const,
          categories: [],
          cover_image_url: null,
          subtitle: null,
          publisher: null,
          published_date: null,
          page_count: null,
          description: null,
          language: null,
          amazon_link: null,
          slug: null,
        };

    const success = await insertBook(bookData);
    if (success) imported++;
  }

  // Increment library version once for the batch
  if (imported > 0) {
    await supabase.rpc("increment_library_version", {
      p_user_id: DEFAULT_USER_ID,
    });
  }

  return NextResponse.json({
    imported,
    skipped_duplicates: skippedDuplicates,
    errors,
    total,
  });
}

async function handleKindleImport(text: string) {
  const titles = parseKindleTitles(text);

  if (titles.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped_duplicates: 0,
      errors: ["No book titles found in the file."],
      total: 0,
    });
  }

  let imported = 0;
  let skippedDuplicates = 0;
  const notFound: string[] = [];

  for (const title of titles) {
    // Try to find via Google Books
    let bookData: Record<string, unknown> | null = null;
    try {
      const apiResult = await searchBookByTitleAuthor(title);
      if (apiResult) {
        bookData = { ...apiResult, source: "kindle" as const };
      }
    } catch {
      // API failed for this title
    }

    if (!bookData) {
      notFound.push(title);
      continue;
    }

    const dup = await isDuplicate(
      bookData.title as string,
      bookData.authors as string[],
      bookData.isbn_13 as string | null
    );
    if (dup) {
      skippedDuplicates++;
      continue;
    }

    const success = await insertBook(bookData);
    if (success) imported++;
  }

  if (imported > 0) {
    await supabase.rpc("increment_library_version", {
      p_user_id: DEFAULT_USER_ID,
    });
  }

  return NextResponse.json({
    imported,
    skipped_duplicates: skippedDuplicates,
    errors: notFound.map((t) => `Could not find: "${t}"`),
    total: titles.length,
  });
}
