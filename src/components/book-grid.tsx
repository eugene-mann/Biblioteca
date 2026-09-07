"use client";

import Link from "next/link";
import { Heart, Star, ArrowUpRight } from "lucide-react";
import { BookCover } from "./book-cover";
import type { Book } from "@/types/database";

const STATUS = {
  read: "Finished",
  reading: "Reading",
  want_to_read: "To read",
};
interface BookGridProps {
  books: Book[];
  renderAfter?: React.ReactNode;
  priority?: boolean;
  view?: "grid" | "list";
}
export function BookGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="shelf-grid" aria-label="Loading books" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-56 animate-pulse rounded-lg bg-secondary" />
          <div className="h-4 w-3/4 animate-pulse bg-secondary" />
          <div className="h-3 w-1/2 animate-pulse bg-secondary" />
        </div>
      ))}
    </div>
  );
}
export function BookGrid({
  books,
  renderAfter,
  priority = false,
  view = "grid",
}: BookGridProps) {
  return (
    <div className={view === "grid" ? "shelf-grid" : "shelf-list"}>
      {books.map((book, index) => (
        <Link
          prefetch={false}
          key={book.id}
          data-book-id={book.id}
          href={`/library/${book.slug || book.id}`}
          className={`shelf-book group ${view === "list" ? "shelf-book-row" : ""}`}
        >
          <div className="shelf-cover-stage">
            <BookCover
              title={book.title}
              coverUrl={book.cover_image_url}
              size="md"
              priority={priority && index < 6}
            />
            {book.is_favorite && (
              <Heart
                aria-label="Favorite"
                className="absolute right-3 top-3 h-4 w-4 fill-burgundy text-burgundy"
              />
            )}
            <span className="shelf-book-open">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-[.16em] text-warm-gray">
              {book.category || "On your shelf"}
            </p>
            <h3 className="line-clamp-2 font-serif text-base leading-snug group-hover:text-burgundy">
              {book.title}
            </h3>
            <p className="mt-1 truncate text-xs text-warm-gray">
              {book.authors.join(", ")}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 text-[10px]">
              <span
                className={`book-status ${book.status === "reading" ? "is-reading" : ""}`}
              >
                <span />
                {STATUS[book.status]}
              </span>
              {(book.rating ?? book.external_rating) !== null && (
                <span
                  className="flex items-center gap-1 text-warm-gray"
                  title={
                    book.rating !== null ? "Your rating" : "Community rating"
                  }
                >
                  <Star className="h-3 w-3 fill-amber text-amber" />
                  {book.rating ?? book.external_rating}
                  {book.rating !== null && (
                    <span className="sr-only">Your rating</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
      {renderAfter}
    </div>
  );
}
