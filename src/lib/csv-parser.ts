import type { BookSource } from "@/types/database";

export interface ParsedBook {
  title: string;
  authors: string[];
  isbn_10: string | null;
  isbn_13: string | null;
  rating: number | null;
  status: "want_to_read" | "reading" | "read";
  date_started: string | null;
  date_finished: string | null;
}

interface ParseResult {
  books: ParsedBook[];
  errors: string[];
  total: number;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function mapStatus(shelf: string): ParsedBook["status"] {
  const normalized = shelf.toLowerCase().trim();
  if (normalized === "currently-reading" || normalized === "reading") return "reading";
  if (normalized === "read") return "read";
  return "want_to_read";
}

/**
 * Parse a Goodreads CSV export.
 * Expected columns: Title, Author, ISBN, ISBN13, My Rating, Exclusive Shelf, Date Read, etc.
 */
export function parseGoodreadsCSV(csvText: string): ParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { books: [], errors: ["File is empty or has no data rows."], total: 0 };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, " "));
  const titleIdx = headers.indexOf("title");
  const authorIdx = headers.indexOf("author");
  const isbnIdx = headers.indexOf("isbn");
  const isbn13Idx = headers.indexOf("isbn13");
  const ratingIdx = headers.indexOf("my rating");
  const shelfIdx = headers.indexOf("exclusive shelf");
  const dateReadIdx = headers.indexOf("date read");

  if (titleIdx === -1 || authorIdx === -1) {
    return { books: [], errors: ["Missing required columns: Title and Author."], total: 0 };
  }

  const books: ParsedBook[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const title = fields[titleIdx]?.trim();
    const author = fields[authorIdx]?.trim();

    if (!title) {
      errors.push(`Row ${i + 1}: Missing title, skipped.`);
      continue;
    }

    // Goodreads wraps ISBNs in ="..." — strip that
    const cleanISBN = (val: string | undefined) => {
      if (!val) return null;
      const cleaned = val.replace(/[="]/g, "").trim();
      return cleaned || null;
    };

    const rating = ratingIdx !== -1 ? parseInt(fields[ratingIdx]) : NaN;
    const dateRead = dateReadIdx !== -1 ? fields[dateReadIdx]?.trim() : null;

    books.push({
      title,
      authors: author ? [author] : ["Unknown Author"],
      isbn_10: cleanISBN(fields[isbnIdx]),
      isbn_13: cleanISBN(fields[isbn13Idx]),
      rating: !isNaN(rating) && rating >= 1 && rating <= 5 ? rating : null,
      status: shelfIdx !== -1 ? mapStatus(fields[shelfIdx]) : "want_to_read",
      date_started: null,
      date_finished: dateRead || null,
    });
  }

  return { books, errors, total: lines.length - 1 };
}

/**
 * Parse a Kindle library export (plain text, one title per line).
 * Kindle exports are just book titles — we'll match them via Google Books API later.
 */
export function parseKindleTitles(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}
