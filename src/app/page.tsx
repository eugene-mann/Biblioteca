"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SearchBar } from "@/components/search-bar";
import { BookGrid, BookGridSkeleton } from "@/components/book-grid";
import { QuoteDivider } from "@/components/quote-carousel";
import { BookOpen, Heart } from "lucide-react";
import type { Book, BookStatus, BookCategory } from "@/types/database";
import { BOOK_CATEGORIES } from "@/types/database";

type SortKey = "date_added" | "title" | "author" | "rating";

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BookStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("date_added");
  const [showFavorites, setShowFavorites] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<BookCategory | "all">("all");

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/books");
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const filteredBooks = useMemo(
    () =>
      books
        .filter((b) => statusFilter === "all" || b.status === statusFilter)
        .filter((b) => !showFavorites || b.is_favorite)
        .filter((b) => categoryFilter === "all" || b.category === categoryFilter)
        .sort((a, b) => {
          switch (sortBy) {
            case "title":
              return a.title.localeCompare(b.title);
            case "author":
              return (a.authors[0] ?? "").localeCompare(b.authors[0] ?? "");
            case "rating":
              return (b.rating ?? 0) - (a.rating ?? 0);
            default:
              return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
          }
        }),
    [books, statusFilter, showFavorites, categoryFilter, sortBy]
  );

  const statusOptions: { value: BookStatus | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "want_to_read", label: "Want to Read" },
    { value: "reading", label: "Reading" },
    { value: "read", label: "Read" },
  ];

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "date_added", label: "Date Added" },
    { value: "title", label: "Title" },
    { value: "author", label: "Author" },
    { value: "rating", label: "Rating" },
  ];

  const availableCategories = useMemo(
    () => BOOK_CATEGORIES.filter((cat) => books.some((b) => b.category === cat)),
    [books]
  );

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex w-full flex-col items-center gap-1 pt-4">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Your Library</h1>
        <p className="text-warm-gray text-sm tracking-[0.12em]">
          {books.length > 0
            ? `${filteredBooks.length} volume${filteredBooks.length !== 1 ? "s" : ""}`
            : "Search for a book to add it to your collection"}
        </p>
      </div>

      <SearchBar onBookAdded={fetchBooks} />

      {books.length > 0 && (
        <div className="flex w-full flex-wrap items-center gap-4">
          {/* Status filter — slash-separated links */}
          <div className="flex items-center gap-1 font-sans text-sm">
            {statusOptions.map((opt, i) => (
              <span key={opt.value} className="flex items-center">
                {i > 0 && <span className="mx-1.5 text-warm-gray/40">/</span>}
                <button
                  onClick={() => setStatusFilter(opt.value)}
                  className={`pb-0.5 transition-colors ${
                    statusFilter === opt.value
                      ? "border-b-2 border-amber text-amber"
                      : "text-warm-gray hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              </span>
            ))}
          </div>

          {/* Favorites toggle */}
          <button
            onClick={() => setShowFavorites((v) => !v)}
            className={`flex items-center gap-1 rounded-sm px-2 py-1 text-sm transition-colors ${
              showFavorites
                ? "text-amber"
                : "text-warm-gray hover:text-foreground"
            }`}
            title="Show favorites only"
          >
            <Heart className={`h-3.5 w-3.5 ${showFavorites ? "fill-amber" : ""}`} />
          </button>

          <div className="ml-auto flex items-center gap-3">
            {/* Category filter */}
            {availableCategories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as BookCategory | "all")}
                className="rounded-sm border border-warm-border bg-background px-3 py-1.5 font-sans text-sm outline-none focus:border-amber"
              >
                <option value="all">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-sm border border-warm-border bg-background px-3 py-1.5 font-sans text-sm outline-none focus:border-amber"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {books.length > 0 && <QuoteDivider />}

      {isLoading ? (
        <BookGridSkeleton />
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <BookOpen className="h-16 w-16 text-warm-gray/50" />
          <div>
            <h2 className="font-serif text-lg font-semibold">Your library is empty</h2>
            <p className="font-sans text-sm text-warm-gray">
              Search for a book above to start building your collection
            </p>
          </div>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="font-sans text-sm text-warm-gray">
            No books match the current filter.
          </p>
          <button
            onClick={() => {
              setStatusFilter("all");
              setShowFavorites(false);
              setCategoryFilter("all");
            }}
            className="font-sans text-sm font-medium text-amber underline"
          >
            Show all books
          </button>
        </div>
      ) : (
        <div className="w-full animate-in fade-in duration-300">
          <BookGrid books={filteredBooks} />
        </div>
      )}
    </div>
  );
}
