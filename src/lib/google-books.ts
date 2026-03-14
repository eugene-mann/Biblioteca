import type { Book, BookSource } from "@/types/database";

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    language?: string;
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

function buildAmazonLink(
  isbn13: string | null,
  title: string,
  authors: string[]
): string {
  if (isbn13) {
    return `https://www.amazon.com/dp/${isbn13}`;
  }
  const query = encodeURIComponent(`${title} ${authors.join(" ")}`);
  return `https://www.amazon.com/s?k=${query}`;
}

function extractISBN(
  identifiers?: { type: string; identifier: string }[]
): { isbn_10: string | null; isbn_13: string | null } {
  if (!identifiers) return { isbn_10: null, isbn_13: null };
  const isbn10 = identifiers.find((id) => id.type === "ISBN_10");
  const isbn13 = identifiers.find((id) => id.type === "ISBN_13");
  return {
    isbn_10: isbn10?.identifier ?? null,
    isbn_13: isbn13?.identifier ?? null,
  };
}

import type { BookCategory } from "@/types/database";

const CATEGORY_MAP: Record<string, BookCategory> = {
  "Fiction": "Fiction",
  "Juvenile Fiction": "Fiction",
  "Literary Fiction": "Fiction",
  "Science fiction": "Sci-Fi",
  "Fantasy": "Fantasy",
  "Mystery": "Mystery",
  "True Crime": "Mystery",
  "Romance": "Romance",
  "Biography & Autobiography": "Biography",
  "History": "History",
  "Political Science": "History",
  "Social Science": "History",
  "Business & Economics": "Business",
  "BUSINESS & ECONOMICS": "Business",
  "Business communication": "Business",
  "Self-Help": "Self-Help",
  "Family & Relationships": "Self-Help",
  "Philosophy": "Philosophy",
  "Science": "Science",
  "Medical": "Science",
  "Computers": "Technology",
  "Technology & Engineering": "Technology",
  "Psychology": "Psychology",
  "Health & Fitness": "Health",
  "Travel": "Travel",
  "Cooking": "Cooking",
  "Art": "Art",
  "Design": "Art",
  "Architecture": "Art",
  "Poetry": "Poetry",
  "Religion": "Religion",
};

function mapCategory(categories: string[]): BookCategory | null {
  for (const cat of categories) {
    if (CATEGORY_MAP[cat]) return CATEGORY_MAP[cat];
  }
  return categories.length > 0 ? "Other" : null;
}

function volumeToBookPartial(
  volume: GoogleBooksVolume,
  source: BookSource = "search"
): Omit<Book, "id" | "date_added" | "user_id"> {
  const info = volume.volumeInfo;
  const { isbn_10, isbn_13 } = extractISBN(info.industryIdentifiers);
  const authors = info.authors ?? ["Unknown Author"];
  const title = info.title ?? "Untitled";
  const categories = info.categories ?? [];

  // Google Books thumbnail URLs use http — upgrade to https and increase size
  let coverUrl = info.imageLinks?.thumbnail ?? null;
  if (coverUrl) {
    coverUrl = coverUrl.replace("http://", "https://").replace("zoom=1", "zoom=3");
  }

  return {
    title,
    subtitle: info.subtitle ?? null,
    authors,
    cover_image_url: coverUrl,
    isbn_10,
    isbn_13,
    publisher: info.publisher ?? null,
    published_date: info.publishedDate ?? null,
    page_count: info.pageCount ?? null,
    description: info.description ?? null,
    categories,
    category: mapCategory(categories),
    language: info.language ?? null,
    amazon_link: buildAmazonLink(isbn_13, title, authors),
    slug: null,
    source,
    status: "want_to_read",
    rating: null,
    external_rating: info.averageRating ?? null,
    is_favorite: false,
    date_started: null,
    date_finished: null,
  };
}

export async function searchBooks(query: string): Promise<Omit<Book, "id" | "date_added" | "user_id">[]> {
  if (!query.trim()) return [];

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const params = new URLSearchParams({
    q: query,
    maxResults: "10",
    printType: "books",
  });
  if (apiKey) params.set("key", apiKey);

  let res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params}`,
    { next: { revalidate: 3600 } }
  );

  // Retry once after a short delay on rate limit
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?${params}`,
      { next: { revalidate: 3600 } }
    );
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Google Books API rate limit reached. Please wait a moment and try again.");
    }
    throw new Error(`Google Books API error: ${res.status}`);
  }

  const data: GoogleBooksResponse = await res.json();
  if (!data.items) return [];

  return data.items.map((vol) => volumeToBookPartial(vol));
}

export async function searchBookByTitleAuthor(
  title: string,
  author?: string
): Promise<Omit<Book, "id" | "date_added" | "user_id"> | null> {
  const query = author ? `intitle:${title}+inauthor:${author}` : `intitle:${title}`;
  const results = await searchBooks(query);
  return results[0] ?? null;
}
