import type { Book, BookCategory } from "@/types/database";

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
  publisher?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  subject?: string[];
  ratings_average?: number;
  language?: string[];
}

interface OpenLibrarySearchResponse {
  numFound: number;
  docs: OpenLibraryDoc[];
}

const OL_CATEGORY_MAP: Record<string, BookCategory> = {
  "fiction": "Fiction",
  "science fiction": "Sci-Fi",
  "fantasy": "Fantasy",
  "mystery": "Mystery",
  "romance": "Romance",
  "biography": "Biography",
  "history": "History",
  "business": "Business",
  "self-help": "Self-Help",
  "philosophy": "Philosophy",
  "science": "Science",
  "technology": "Technology",
  "psychology": "Psychology",
  "health": "Health",
  "cooking": "Cooking",
  "art": "Art",
  "poetry": "Poetry",
  "religion": "Religion",
};

function mapOLCategory(subjects: string[]): BookCategory | null {
  const lower = subjects.map((s) => s.toLowerCase());
  for (const sub of lower) {
    for (const [key, cat] of Object.entries(OL_CATEGORY_MAP)) {
      if (sub.includes(key)) return cat;
    }
  }
  return subjects.length > 0 ? "Other" : null;
}

function getCoverUrl(coverId: number | undefined, isbn: string | undefined): string | null {
  if (coverId) {
    return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
  }
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  }
  return null;
}

function buildAmazonLink(isbn13: string | null, title: string, authors: string[]): string {
  if (isbn13) {
    return `https://www.amazon.com/dp/${isbn13}`;
  }
  const query = encodeURIComponent(`${title} ${authors.join(" ")}`);
  return `https://www.amazon.com/s?k=${query}`;
}

function docToBookPartial(doc: OpenLibraryDoc): Omit<Book, "id" | "date_added" | "user_id"> {
  const authors = doc.author_name ?? ["Unknown Author"];
  const title = doc.title ?? "Untitled";
  const subjects = doc.subject ?? [];
  const isbns = doc.isbn ?? [];
  const isbn13 = isbns.find((i) => i.length === 13) ?? null;
  const isbn10 = isbns.find((i) => i.length === 10) ?? null;

  return {
    title,
    subtitle: null,
    authors,
    cover_image_url: getCoverUrl(doc.cover_i, isbn13 ?? isbn10 ?? undefined),
    isbn_10: isbn10,
    isbn_13: isbn13,
    publisher: doc.publisher?.[0] ?? null,
    published_date: doc.first_publish_year?.toString() ?? null,
    page_count: doc.number_of_pages_median ?? null,
    description: null,
    categories: subjects.slice(0, 5),
    category: mapOLCategory(subjects),
    language: doc.language?.[0] ?? null,
    amazon_link: buildAmazonLink(isbn13, title, authors),
    slug: null,
    source: "search",
    status: "want_to_read",
    rating: null,
    external_rating: doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : null,
    is_favorite: false,
    date_started: null,
    date_finished: null,
    notes: null,
  };
}

export async function searchBooksOpenLibrary(
  query: string
): Promise<Omit<Book, "id" | "date_added" | "user_id">[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    limit: "10",
    fields: "key,title,author_name,isbn,cover_i,publisher,first_publish_year,number_of_pages_median,subject,ratings_average,language",
  });

  const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data: OpenLibrarySearchResponse = await res.json();
  if (!data.docs) return [];

  return data.docs.map(docToBookPartial);
}

function titleMatches(resultTitle: string, searchTitle: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const a = normalize(resultTitle);
  const b = normalize(searchTitle);
  return a.includes(b) || b.includes(a);
}

export async function searchBookByTitleAuthorOL(
  title: string,
  author?: string
): Promise<Omit<Book, "id" | "date_added" | "user_id"> | null> {
  const query = author ? `${title} ${author}` : title;
  const results = await searchBooksOpenLibrary(query);
  // Find first result with matching title AND a cover
  const matched = results.filter((r) => titleMatches(r.title, title));
  return matched.find((r) => r.cover_image_url) ?? matched[0] ?? null;
}
