"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface BookQuote {
  text: string;
  bookTitle: string;
  author: string;
  bookSlug: string;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function QuoteDivider() {
  const [quotes, setQuotes] = useState<BookQuote[]>([]);
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    fetch("/api/quotes")
      .then((r) => r.json())
      .then((data: BookQuote[]) => {
        if (data.length > 0) {
          setQuotes(shuffleArray(data));
        }
      })
      .catch(() => {});
  }, []);

  const advance = useCallback(() => {
    setFade(false);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % (quotes.length || 1));
      setFade(true);
    }, 400);
  }, [quotes.length]);

  useEffect(() => {
    if (quotes.length === 0) return;
    const timer = setInterval(advance, 12000);
    return () => clearInterval(timer);
  }, [advance, quotes.length]);

  if (quotes.length === 0) return null;

  const quote = quotes[index % quotes.length];

  return (
    <div className="w-full py-2">
      <div
        className="group relative w-full rounded-sm border border-warm-border bg-card px-8 py-7 shadow-sm transition-shadow hover:shadow-md md:px-12 md:py-9"
      >
        {/* Amber accent bar */}
        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-amber" />

        <div
          className={`transition-opacity duration-400 ${fade ? "opacity-100" : "opacity-0"}`}
        >
          <Link href={`/library/${quote.bookSlug}`} className="block">
            <blockquote className="font-serif text-lg leading-relaxed text-foreground/90 italic md:text-xl">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <p className="mt-4 font-sans text-sm text-warm-gray">
              &mdash;{" "}
              <span className="font-medium text-amber">{quote.author}</span>
              ,{" "}
              <span className="italic underline decoration-warm-border underline-offset-2 transition-colors group-hover:decoration-amber">
                {quote.bookTitle}
              </span>
            </p>
          </Link>
        </div>

        {/* Advance button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={advance}
            className="font-sans text-xs text-warm-gray transition-colors hover:text-amber"
          >
            Next quote &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
