"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/types/database";

interface AuthorBooksSectionProps {
  authorName: string;
  currentBookId: string;
}

export function AuthorBooksSection({ authorName, currentBookId }: AuthorBooksSectionProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBooks() {
      const res = await fetch(`/api/authors/${encodeURIComponent(authorName)}/books`);
      if (res.ok) {
        const data: Book[] = await res.json();
        setBooks(data.filter((b) => b.id !== currentBookId));
      }
      setIsLoading(false);
    }
    fetchBooks();
  }, [authorName, currentBookId]);

  if (isLoading) return null;
  if (books.length === 0) return null;

  return (
    <div className="rounded-lg border border-warm-border bg-card p-4">
      <p className="mb-3 font-sans text-[10px] uppercase tracking-widest text-warm-gray">
        More by{" "}
        <Link
          href={`/author/${encodeURIComponent(authorName)}`}
          className="text-amber hover:text-amber/80"
        >
          {authorName}
        </Link>
      </p>
      <div className="flex flex-col gap-3">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/library/${book.slug || book.id}`}
            className="flex items-center gap-3 rounded-sm p-1 transition-colors hover:bg-secondary"
          >
            <BookCover
              title={book.title}
              coverUrl={book.cover_image_url}
              size="sm"
              className="!h-[48px] !w-[32px]"
            />
            <div className="min-w-0">
              <p className="truncate font-sans text-sm font-medium text-foreground">
                {book.title}
              </p>
              <p className="truncate font-sans text-xs text-warm-gray">
                {book.category || "Uncategorized"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
