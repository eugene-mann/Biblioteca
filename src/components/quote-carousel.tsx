"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface BookQuote {
  text: string;
  bookTitle: string;
  author: string;
  bookSlug: string;
}

const ACCENT_COLORS = [
  "bg-amber",
  "bg-[#8B6F4E]",
  "bg-[#6B8E7B]",
  "bg-[#9B7B6B]",
  "bg-[#7B8EA6]",
  "bg-[#A67B7B]",
  "bg-[#8B9B6B]",
  "bg-[#7B6B9B]",
];

// Shared quote cache — fetched once, reused across instances
let quotesCache: BookQuote[] | null = null;
let fetchPromise: Promise<BookQuote[]> | null = null;

function fetchQuotes(): Promise<BookQuote[]> {
  if (quotesCache) return Promise.resolve(quotesCache);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/quotes")
    .then((r) => r.json())
    .then((data: BookQuote[]) => {
      // Shuffle once
      for (let i = data.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [data[i], data[j]] = [data[j], data[i]];
      }
      quotesCache = data;
      return data;
    })
    .catch(() => {
      fetchPromise = null;
      return [];
    });
  return fetchPromise;
}

interface QuoteDividerProps {
  colorIndex?: number;
}

export function QuoteDivider({ colorIndex = 0 }: QuoteDividerProps) {
  const [quotes, setQuotes] = useState<BookQuote[]>([]);
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const startOffset = useRef(colorIndex * 7); // Different starting quote per instance

  useEffect(() => {
    fetchQuotes().then((data) => {
      if (data.length > 0) {
        setQuotes(data);
        setIndex(startOffset.current % data.length);
      }
    });
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
    // Stagger the auto-advance interval slightly per instance
    const interval = 12000 + colorIndex * 1500;
    const timer = setInterval(advance, interval);
    return () => clearInterval(timer);
  }, [advance, quotes.length, colorIndex]);

  if (quotes.length === 0) return null;

  const quote = quotes[index % quotes.length];
  const accentColor = ACCENT_COLORS[colorIndex % ACCENT_COLORS.length];

  return (
    <div className="w-full py-2">
      <div
        className="group relative w-full rounded-sm border border-warm-border bg-card px-8 py-7 shadow-sm transition-shadow hover:shadow-md md:px-12 md:py-9"
      >
        {/* Accent bar */}
        <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${accentColor}`} />

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
