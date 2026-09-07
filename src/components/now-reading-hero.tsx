"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowRight, BookOpen } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/types/database";

export function NowReadingHero({ books }: { books: Book[] }) {
  const reading = books
    .filter((b) => b.status === "reading")
    .sort(
      (a, b) =>
        Date.parse(b.date_started ?? b.date_added) -
        Date.parse(a.date_started ?? a.date_added),
    );
  const featured = reading[0] ?? books.find((b) => b.status === "want_to_read");
  if (!featured) return null;
  return (
    <section className="reading-desk" aria-label="Your reading desk">
      <div className="reading-feature">
        <div className="reading-feature-copy">
          <p className="eyebrow flex items-center gap-2 !text-[#d6c49f]">
            <span className="reading-dot" />
            {reading.length ? "Currently reading" : "Next on your list"}
          </p>
          <h2 className="mt-4 font-serif text-3xl leading-[1.12] lg:text-[38px]">
            {featured.title}
          </h2>
          <p className="mt-3 text-sm text-white/65">
            {featured.authors.join(", ")}
          </p>
          <p className="mt-5 flex items-center gap-2 text-[11px] text-white/60">
            <BookOpen className="h-3.5 w-3.5" />
            {featured.page_count
              ? `${featured.page_count} pages`
              : "A good place to begin"}
            {featured.category && (
              <>
                <span className="mx-1">·</span>
                {featured.category}
              </>
            )}
          </p>
          <Link
            href={`/library/${featured.slug || featured.id}`}
            className="reading-continue"
          >
            {reading.length ? "Return to this book" : "Open this book"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Link
          href={`/library/${featured.slug || featured.id}`}
          className="reading-feature-cover"
          aria-label={`Open ${featured.title}`}
        >
          <BookCover
            title={featured.title}
            coverUrl={featured.cover_image_url}
            size="lg"
            priority
          />
        </Link>
        <span aria-hidden="true" className="reading-watermark">
          B.
        </span>
      </div>
      <aside className="reading-aside">
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow">On your nightstand</p>
          <span className="text-xs text-warm-gray">
            {reading.length || "—"}
          </span>
        </div>
        {reading.slice(1, 3).map((book) => (
          <Link
            key={book.id}
            href={`/library/${book.slug || book.id}`}
            className="nightstand-book"
          >
            <BookCover
              title={book.title}
              coverUrl={book.cover_image_url}
              size="sm"
              className="!h-[72px] !w-12"
            />
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 font-serif text-base leading-snug">
                {book.title}
              </h3>
              <p className="mt-1 text-[11px] text-warm-gray">
                {book.authors[0]}
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-warm-gray" />
          </Link>
        ))}
        {reading.length < 2 && (
          <p className="py-5 font-serif text-xl leading-relaxed text-warm-gray">
            There’s always room for another good book.
          </p>
        )}
        <Link
          href={reading.length > 1 ? "/?status=reading" : "/discover"}
          className="mt-auto flex items-center justify-between border-t border-warm-border pt-4 text-xs font-medium"
        >
          {reading.length > 1
            ? "View your reading shelf"
            : "Find your next read"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </aside>
    </section>
  );
}
