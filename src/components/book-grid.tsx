"use client";

import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { BookCover } from "./book-cover";
import type { Book } from "@/types/database";

interface BookGridProps {
  books: Book[];
  renderAfter?: React.ReactNode;
}

function RatingPill({ rating, externalRating }: { rating: number | null; externalRating: number | null }) {
  if (rating === null && externalRating === null) return null;
  return (
    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-warm-border px-2 py-0.5">
      {externalRating != null && (
        <>
          <Star className="h-2.5 w-2.5 fill-amber text-amber" />
          <span className="font-sans text-[10px] text-foreground">{externalRating}</span>
          {rating != null && <span className="mx-0.5 text-[10px] text-warm-border">|</span>}
        </>
      )}
      {rating != null && (
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`h-2.5 w-2.5 ${
                n <= rating ? "fill-amber text-amber" : "text-warm-border"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function BookGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 p-1">
          <div
            className="animate-pulse rounded-sm bg-muted"
            style={{ width: 128, height: 192 }}
          />
          <div className="flex w-full flex-col items-center gap-1.5">
            <div className="h-4 w-3/4 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded-sm bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BookGrid({ books, renderAfter }: BookGridProps) {
  if (books.length === 0 && !renderAfter) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((book, index) => (
        <Link
          key={book.id}
          data-book-id={book.id}
          href={`/library/${book.slug || book.id}`}
          className="group flex flex-col items-center gap-2 p-1 transition-all duration-200"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <div className="relative transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-warm-gray/10 rounded-sm">
            <BookCover
              title={book.title}
              coverUrl={book.cover_image_url}
              size="md"
            />
            {book.is_favorite && (
              <div className="absolute right-1.5 top-1.5">
                <Heart className="h-4 w-4 fill-amber text-amber drop-shadow" />
              </div>
            )}
          </div>
          <div className="w-full text-center">
            <p className="truncate font-serif text-sm font-medium">{book.title}</p>
            <p className="truncate font-sans text-xs text-warm-gray">
              {book.authors.join(", ")}
            </p>
            {book.category && (
              <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-warm-gray">
                {book.category}
              </p>
            )}
            <RatingPill rating={book.rating} externalRating={book.external_rating} />
          </div>
        </Link>
      ))}
      {renderAfter}
    </div>
  );
}
