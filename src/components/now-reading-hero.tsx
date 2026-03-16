"use client";

import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/types/database";

interface NowReadingHeroProps {
  books: Book[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function ReadingCard({ book }: { book: Book }) {
  return (
    <Link
      href={`/library/${book.slug || book.id}`}
      className="flex min-w-[340px] gap-5 rounded-lg p-2 transition-colors hover:bg-amber/5"
    >
      <div className="shrink-0">
        <BookCover title={book.title} coverUrl={book.cover_image_url} size="lg" priority />
      </div>
      <div className="flex flex-col justify-center gap-1.5 py-2">
        <h3 className="font-serif text-2xl font-bold text-foreground leading-tight">
          {book.title}
        </h3>
        <p className="font-sans text-sm text-warm-gray">
          {book.authors.join(", ")}
        </p>
        {book.date_started && (
          <p className="font-sans text-xs text-warm-gray">
            Started {formatDate(book.date_started)}
          </p>
        )}
        {book.page_count && (
          <p className="font-sans text-xs text-warm-gray">
            {book.page_count} pages
          </p>
        )}
      </div>
    </Link>
  );
}

export function NowReadingHero({ books }: NowReadingHeroProps) {
  const reading = books.filter((b) => b.status === "reading");

  if (reading.length === 0) return null;

  return (
    <div className="animate-in fade-in duration-500 rounded-xl bg-gradient-to-r from-amber/5 to-amber/10 border border-amber/20 p-6 mb-8">
      <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-warm-gray mb-4">
        Now Reading
      </h2>
      {reading.length === 1 ? (
        <ReadingCard book={reading[0]} />
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-2 -mx-2">
          {reading.map((book) => (
            <ReadingCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
