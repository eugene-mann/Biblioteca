"use client";

import { useState } from "react";
import { Plus, Check, Loader2 } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import type { SuggestedBook } from "@/types/database";

interface SuggestedBookCardProps {
  book: SuggestedBook;
  variant: "detail" | "compact";
  onAdd?: () => void;
}

export function SuggestedBookCard({ book, variant, onAdd }: SuggestedBookCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  async function handleAdd() {
    setIsAdding(true);
    try {
      // Search for full metadata first
      const query = book.isbn_13
        ? `isbn:${book.isbn_13}`
        : `${book.title} ${book.authors[0] ?? ""}`;
      const searchRes = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
      const results = await searchRes.json();

      // Use first result, or construct minimal book data
      const bookData = Array.isArray(results) && results.length > 0
        ? results[0]
        : {
            title: book.title,
            authors: book.authors,
            cover_image_url: book.cover_image_url ?? null,
            isbn_13: book.isbn_13 ?? null,
            source: "search",
            status: "want_to_read",
          };

      const addRes = await fetch("/api/books/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookData),
      });

      if (addRes.ok || addRes.status === 409) {
        setIsAdded(true);
        window.dispatchEvent(new Event("biblioteca:book-added"));
        onAdd?.();
      }
    } catch {
      // Silent fail — user can retry
    } finally {
      setIsAdding(false);
    }
  }

  if (variant === "compact") {
    return (
      <div className="flex gap-4 p-5 bg-card border border-dashed border-warm-border rounded-sm">
        <BookCover
          title={book.title}
          coverUrl={book.cover_image_url ?? null}
          size="sm"
          className="!w-16 !h-24 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-serif text-base font-semibold leading-tight truncate">
              {book.title}
            </h4>
            <span className="shrink-0 rounded-full bg-amber/10 px-2 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-widest text-amber">
              New
            </span>
          </div>
          <p className="font-sans text-[13px] text-warm-gray mb-1">
            {book.authors.join(", ")}
          </p>
          <p className="font-serif italic text-[13px] leading-snug text-foreground/60 line-clamp-2 mb-2">
            {book.reasoning}
          </p>
          {!isAdded ? (
            <button
              onClick={handleAdd}
              disabled={isAdding}
              className="flex items-center gap-1.5 font-sans text-xs font-medium text-amber transition-colors hover:text-amber/80 disabled:opacity-50"
            >
              {isAdding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Add to Library
            </button>
          ) : (
            <span className="flex items-center gap-1.5 font-sans text-xs text-emerald-600">
              <Check className="h-3 w-3" />
              Added
            </span>
          )}
        </div>
      </div>
    );
  }

  // detail variant
  return (
    <div className="flex items-center gap-3 rounded-sm border border-dashed border-warm-border p-2 transition-colors">
      <BookCover
        title={book.title}
        coverUrl={book.cover_image_url ?? null}
        size="sm"
        className="!h-[48px] !w-[32px]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-sans text-sm font-medium text-foreground">
            {book.title}
          </p>
          <span className="shrink-0 rounded-full bg-amber/10 px-1.5 py-0.5 font-sans text-[8px] font-semibold uppercase tracking-widest text-amber">
            New
          </span>
        </div>
        <p className="truncate font-sans text-xs text-warm-gray">
          {book.authors.join(", ")}
        </p>
        {book.reasoning && (
          <p className="mt-0.5 truncate font-sans text-[11px] italic text-foreground/50">
            {book.reasoning}
          </p>
        )}
      </div>
      {!isAdded ? (
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className="shrink-0 rounded-sm p-1 text-amber transition-colors hover:bg-amber/10 disabled:opacity-50"
          title="Add to Library"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      ) : (
        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
      )}
    </div>
  );
}
