export type BookSource = "manual" | "csv" | "kindle" | "search";
export type BookStatus = "want_to_read" | "reading" | "read";
export type TopicSource = "library_derived" | "reading_list";

export type BookCategory =
  | "Fiction"
  | "Sci-Fi"
  | "Fantasy"
  | "Mystery"
  | "Romance"
  | "Biography"
  | "History"
  | "Business"
  | "Self-Help"
  | "Philosophy"
  | "Science"
  | "Technology"
  | "Psychology"
  | "Health"
  | "Travel"
  | "Cooking"
  | "Art"
  | "Poetry"
  | "Religion"
  | "Other";

export const BOOK_CATEGORIES: BookCategory[] = [
  "Fiction",
  "Sci-Fi",
  "Fantasy",
  "Mystery",
  "Romance",
  "Biography",
  "History",
  "Business",
  "Self-Help",
  "Philosophy",
  "Science",
  "Technology",
  "Psychology",
  "Health",
  "Travel",
  "Cooking",
  "Art",
  "Poetry",
  "Religion",
  "Other",
];

export interface Book {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  cover_image_url: string | null;
  isbn_10: string | null;
  isbn_13: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  description: string | null;
  categories: string[];
  category: BookCategory | null;
  language: string | null;
  amazon_link: string | null;
  source: BookSource;
  status: BookStatus;
  rating: number | null;
  external_rating: number | null;
  is_favorite: boolean;
  date_added: string;
  date_started: string | null;
  date_finished: string | null;
  user_id: string;
}

export interface ReadingList {
  id: string;
  name: string;
  source_url: string | null;
  category: string;
  is_active: boolean;
}

export interface RecommendationTopic {
  id: string;
  label: string;
  source: TopicSource;
  reading_list_id: string | null;
  user_id: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  title: string;
  authors: string[];
  isbn: string | null;
  cover_image_url: string | null;
  amazon_link: string | null;
  reasoning: string;
  based_on_book_ids: string[];
  dismissed: boolean;
  added_to_library: boolean;
  topic_id: string | null;
  library_version: number;
  created_at: string;
  user_id: string;
}
