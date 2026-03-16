import Fuse from "fuse.js";
import type { Book } from "@/types/database";

export type BookResult = Omit<Book, "id" | "date_added" | "user_id">;

export interface LibrarySearchResult {
  book: Book;
  score: number;
}

export interface ExternalSearchResult {
  book: BookResult;
  source: "cache" | "api";
}

const FUSE_OPTIONS = {
  keys: [
    { name: "title" as const, weight: 0.6 },
    { name: "authors" as const, weight: 0.3 },
    { name: "category" as const, weight: 0.1 },
  ],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 1,
};

// --- Library search (instant, client-side) ---

let libraryIndex: Fuse<Book> | null = null;
let lastLibraryBooks: Book[] | null = null;

export function searchLibrary(books: Book[], query: string): LibrarySearchResult[] {
  if (!query.trim()) return [];

  // Rebuild index only when books array changes (reference equality)
  if (books !== lastLibraryBooks) {
    libraryIndex = new Fuse(books, FUSE_OPTIONS);
    lastLibraryBooks = books;
  }

  return libraryIndex!.search(query, { limit: 5 }).map((r) => ({
    book: r.item,
    score: r.score ?? 1,
  }));
}

// --- Popular books cache (lazy-loaded static JSON) ---

interface PopularBook {
  title: string;
  authors: string[];
  isbn_13: string | null;
  category: string;
}

let popularBooksIndex: Fuse<PopularBook> | null = null;
let popularBooksData: PopularBook[] | null = null;
let popularBooksLoading: Promise<void> | null = null;

async function ensurePopularBooks(): Promise<void> {
  if (popularBooksData) return;
  if (popularBooksLoading) return popularBooksLoading;

  popularBooksLoading = fetch("/data/popular-books.json")
    .then((res) => res.json())
    .then((data: PopularBook[]) => {
      popularBooksData = data;
      popularBooksIndex = new Fuse(data, FUSE_OPTIONS);
    })
    .catch(() => {
      // Silent fail — popular books cache is optional
      popularBooksData = [];
      popularBooksIndex = new Fuse([], FUSE_OPTIONS);
    });

  return popularBooksLoading;
}

// Kick off loading immediately on module import (client-side only)
if (typeof window !== "undefined") {
  ensurePopularBooks();
}

export function searchPopularBooks(query: string): PopularBook[] {
  if (!query.trim() || !popularBooksIndex) return [];
  return popularBooksIndex.search(query, { limit: 10 }).map((r) => r.item);
}

// --- Google Books localStorage cache ---

const CACHE_PREFIX = "biblioteca_search_";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedSearch {
  results: BookResult[];
  timestamp: number;
}

export function getCachedSearch(query: string): BookResult[] | null {
  if (typeof window === "undefined") return null;
  try {
    const key = CACHE_PREFIX + query.toLowerCase().trim();
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached: CachedSearch = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.results;
  } catch {
    return null;
  }
}

export function setCachedSearch(query: string, results: BookResult[]): void {
  if (typeof window === "undefined") return;
  try {
    const key = CACHE_PREFIX + query.toLowerCase().trim();
    const cached: CachedSearch = { results, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

// --- Deduplication ---

export function deduplicateExternal(
  external: BookResult[],
  library: Book[]
): BookResult[] {
  const libraryISBNs = new Set(
    library.map((b) => b.isbn_13).filter(Boolean)
  );
  const libraryKeys = new Set(
    library.map((b) => `${b.title.toLowerCase()}|${b.authors[0]?.toLowerCase()}`)
  );

  return external.filter((book) => {
    if (book.isbn_13 && libraryISBNs.has(book.isbn_13)) return false;
    const key = `${book.title.toLowerCase()}|${book.authors[0]?.toLowerCase()}`;
    return !libraryKeys.has(key);
  });
}

// --- Popular books to BookResult conversion ---

export function popularBookToResult(book: PopularBook): BookResult {
  return {
    title: book.title,
    subtitle: null,
    authors: book.authors,
    cover_image_url: null,
    isbn_10: null,
    isbn_13: book.isbn_13,
    publisher: null,
    published_date: null,
    page_count: null,
    description: null,
    categories: book.category ? [book.category] : [],
    category: null,
    language: null,
    amazon_link: null,
    slug: null,
    source: "search",
    status: "want_to_read",
    rating: null,
    external_rating: null,
    is_favorite: false,
    date_started: null,
    date_finished: null,
    notes: null,
  };
}
