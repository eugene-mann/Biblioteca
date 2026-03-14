"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { BookCover } from "./book-cover";
import type { Book } from "@/types/database";

interface BookGridProps {
  books: Book[];
}

function RatingDots({ rating }: { rating: number | null }) {
  if (rating === null || rating === undefined) return null;
  const filled = Math.round(rating);
  return (
    <div className="mt-1 flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            i < filled ? "bg-amber" : "bg-warm-border"
          }`}
        />
      ))}
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

export function BookGrid({ books }: BookGridProps) {
  if (books.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((book, index) => (
        <Link
          key={book.id}
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
            <RatingDots rating={book.rating} />
          </div>
        </Link>
      ))}
    </div>
  );
}
