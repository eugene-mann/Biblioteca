import type { Book, BookStatus } from "../types/database";

export type SortKey = "default" | "date_added" | "title" | "author" | "rating";
export type ShelfFilters = {
  status: BookStatus | "all";
  favorites: boolean;
  category: string;
  query: string;
  sort: SortKey;
  collectionIds: Set<string> | null;
};
const STATUS_ORDER = { read: 0, reading: 1, want_to_read: 2 };
export function filterBooks(books: Book[], filters: ShelfFilters): Book[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return books
    .filter(
      (book) =>
        (!filters.collectionIds || filters.collectionIds.has(book.id)) &&
        (filters.status === "all" || book.status === filters.status) &&
        (!filters.favorites || book.is_favorite) &&
        (filters.category === "all" || book.category === filters.category) &&
        (!query ||
          [book.title, ...book.authors, book.category ?? ""].some((value) =>
            value.toLocaleLowerCase().includes(query),
          )),
    )
    .sort((a, b) => {
      switch (filters.sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "author":
          return (
            (a.authors[0] ?? "").localeCompare(b.authors[0] ?? "") ||
            a.title.localeCompare(b.title)
          );
        case "date_added":
          return Date.parse(b.date_added) - Date.parse(a.date_added);
        case "rating":
          return (
            (b.rating ?? b.external_rating ?? 0) -
            (a.rating ?? a.external_rating ?? 0)
          );
        default:
          return (
            (b.rating ?? 0) - (a.rating ?? 0) ||
            (b.external_rating ?? 0) - (a.external_rating ?? 0) ||
            STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
          );
      }
    });
}
