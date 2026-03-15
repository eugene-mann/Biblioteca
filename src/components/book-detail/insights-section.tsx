"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, RefreshCw, AlertCircle, X, Plus } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import { SuggestedBookCard } from "@/components/suggested-book-card";
import Link from "next/link";
import type { Book, BookInsight, SuggestedBook } from "@/types/database";

interface InsightsSectionProps {
  bookId: string;
}

interface RelatedBook {
  id: string;
  title: string;
  authors: string[];
  cover_image_url: string | null;
  slug: string | null;
}

export function InsightsSection({ bookId }: InsightsSectionProps) {
  const [insight, setInsight] = useState<BookInsight | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<RelatedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawSuggestedBooks, setRawSuggestedBooks] = useState<SuggestedBook[]>([]);
  const [newQuote, setNewQuote] = useState("");
  const [isAddingQuote, setIsAddingQuote] = useState(false);

  // Deduplicate suggested books against library books (handles books added after insights generated)
  const suggestedBooks = useMemo(() => {
    const libraryTitles = new Set(relatedBooks.map((b) => b.title.toLowerCase()));
    return rawSuggestedBooks.filter((sb) => !libraryTitles.has(sb.title.toLowerCase()));
  }, [rawSuggestedBooks, relatedBooks]);

  useEffect(() => {
    fetchInsight();
  }, [bookId]);

  async function fetchInsight() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/insights`);
      if (res.ok) {
        const data = await res.json();
        setInsight(data.insight);
        setRawSuggestedBooks(data.insight?.suggested_books ?? []);
        if (data.insight?.related_book_ids?.length) {
          fetchRelatedBooks(data.insight.related_book_ids);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchRelatedBooks(ids: string[]) {
    const books: RelatedBook[] = [];
    for (const id of ids) {
      try {
        const res = await fetch(`/api/books/${id}`);
        if (res.ok) {
          const book: Book = await res.json();
          books.push({
            id: book.id,
            title: book.title,
            authors: book.authors,
            cover_image_url: book.cover_image_url,
            slug: book.slug,
          });
        }
      } catch {
        // Skip books that no longer exist
      }
    }
    setRelatedBooks(books);
  }

  async function removeQuote(index: number) {
    if (!insight) return;
    const updated = insight.quotes.filter((_, i) => i !== index);
    setInsight({ ...insight, quotes: updated });
    await fetch(`/api/books/${bookId}/insights`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quotes: updated }),
    });
  }

  async function addQuote() {
    if (!insight || !newQuote.trim()) return;
    const updated = [...insight.quotes, newQuote.trim()];
    setInsight({ ...insight, quotes: updated });
    setNewQuote("");
    setIsAddingQuote(false);
    await fetch(`/api/books/${bookId}/insights`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quotes: updated }),
    });
  }

  async function generate() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/insights`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setInsight(data.insight);
        setRawSuggestedBooks(data.insight?.suggested_books ?? []);
        if (data.insight?.related_book_ids?.length) {
          fetchRelatedBooks(data.insight.related_book_ids);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to generate insights");
      }
    } catch {
      setError("Failed to generate insights");
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <div>
        <h2 className="mb-4 font-serif text-lg font-semibold">Insights & Quotes</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!insight && !isGenerating) {
    return (
      <div>
        <h2 className="mb-4 font-serif text-lg font-semibold">Insights & Quotes</h2>
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-sm bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
        <button
          onClick={generate}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded-full border border-amber px-5 py-2 font-sans text-sm font-medium text-amber transition-colors hover:bg-amber/10 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          Generate Insights
        </button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div>
        <h2 className="mb-4 font-serif text-lg font-semibold">Insights & Quotes</h2>
        <div className="space-y-3">
          {["Why Read This", "Key Themes", "Top Quotes"].map((label) => (
            <div
              key={label}
              className="rounded-lg border border-warm-border bg-card p-4"
            >
              <div className="mb-2 h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold">Insights & Quotes</h2>
        <button
          onClick={generate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 rounded-full border border-warm-border px-3 py-1 font-sans text-xs text-warm-gray transition-colors hover:border-amber hover:text-amber disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
          Regenerate
        </button>
      </div>

      <div className="space-y-3">
        {/* Why Read This */}
        <div className="rounded-lg border border-warm-border bg-card p-4">
          <p className="mb-2 font-sans text-[10px] uppercase tracking-widest text-warm-gray">
            Why Read This
          </p>
          <p className="font-sans text-sm leading-relaxed text-foreground">
            {insight!.why_read}
          </p>
        </div>

        {/* Key Themes */}
        {insight!.themes.length > 0 && (
          <div className="rounded-lg border border-warm-border bg-card p-4">
            <p className="mb-2 font-sans text-[10px] uppercase tracking-widest text-warm-gray">
              Key Themes
            </p>
            <div className="flex flex-wrap gap-2">
              {insight!.themes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-secondary px-3 py-1 font-sans text-xs text-foreground"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Quotes */}
        {insight!.quotes.length > 0 && (
          <div className="rounded-lg border border-warm-border bg-card p-4">
            <p className="mb-3 font-sans text-[10px] uppercase tracking-widest text-warm-gray">
              Top Quotes
            </p>
            <div className="space-y-3">
              {insight!.quotes.map((quote, i) => (
                <div key={i} className="group flex items-start gap-2">
                  <blockquote className="flex-1 border-l-2 border-amber pl-4 font-sans text-sm italic leading-relaxed text-foreground">
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                  <button
                    onClick={() => removeQuote(i)}
                    className="mt-0.5 shrink-0 rounded-sm p-0.5 text-warm-gray opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                    aria-label="Remove quote"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {isAddingQuote ? (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newQuote}
                  onChange={(e) => setNewQuote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addQuote();
                    if (e.key === "Escape") {
                      setIsAddingQuote(false);
                      setNewQuote("");
                    }
                  }}
                  placeholder="Enter a quote..."
                  autoFocus
                  className="flex-1 rounded-md border border-warm-border bg-background px-3 py-1.5 font-sans text-sm text-foreground placeholder:text-warm-gray/50 focus:border-amber focus:outline-none"
                />
                <button
                  onClick={addQuote}
                  disabled={!newQuote.trim()}
                  className="rounded-md bg-amber px-3 py-1.5 font-sans text-xs font-medium text-white transition-colors hover:bg-amber/90 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingQuote(false);
                    setNewQuote("");
                  }}
                  className="rounded-md border border-warm-border px-3 py-1.5 font-sans text-xs text-warm-gray transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingQuote(true)}
                className="mt-3 flex items-center gap-1.5 font-sans text-xs text-warm-gray transition-colors hover:text-amber"
              >
                <Plus className="h-3 w-3" />
                Add quote
              </button>
            )}
          </div>
        )}

        {/* Related Books */}
        {(relatedBooks.length > 0 || suggestedBooks.length > 0) && (
          <div className="rounded-lg border border-warm-border bg-card p-4">
            <p className="mb-3 font-sans text-[10px] uppercase tracking-widest text-warm-gray">
              Related Books
            </p>
            <div className="flex flex-col gap-3">
              {relatedBooks.map((rb) => (
                <Link
                  key={rb.id}
                  href={`/library/${rb.slug || rb.id}`}
                  className="flex items-center gap-3 rounded-sm p-1 transition-colors hover:bg-secondary"
                >
                  <BookCover
                    title={rb.title}
                    coverUrl={rb.cover_image_url}
                    size="sm"
                    className="!h-[48px] !w-[32px]"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-sans text-sm font-medium text-foreground">
                      {rb.title}
                    </p>
                    <p className="truncate font-sans text-xs text-warm-gray">
                      {rb.authors.join(", ")}
                    </p>
                  </div>
                </Link>
              ))}
              {suggestedBooks.map((sb) => (
                <SuggestedBookCard
                  key={`${sb.title}-${sb.authors[0] ?? ""}`}
                  book={sb}
                  variant="detail"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
