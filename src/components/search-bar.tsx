"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLibrary } from "./library-provider";
import { Search, Plus, Loader2, ArrowRight } from "lucide-react";
import type { Book } from "@/types/database";
import {
  searchLibrary,
  searchPopularBooks,
  popularBookToResult,
  getCachedSearch,
  setCachedSearch,
  deduplicateExternal,
  type BookResult,
  type LibrarySearchResult,
} from "@/lib/book-search";

export function SearchBar({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { books: libraryBooks } = useLibrary();
  const [query, setQuery] = useState("");
  const [libraryResults, setLibraryResults] = useState<LibrarySearchResult[]>(
    [],
  );
  const [externalResults, setExternalResults] = useState<BookResult[]>([]);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasResults = libraryResults.length > 0 || externalResults.length > 0;

  // Instant local search on every keystroke
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      setError(null);

      if (!newQuery.trim()) {
        setLibraryResults([]);
        setExternalResults([]);
        setIsOpen(false);
        return;
      }

      // Instant: search library
      const libResults = searchLibrary(libraryBooks, newQuery);
      setLibraryResults(libResults);

      // Instant: search popular books cache + localStorage cache
      const cached = getCachedSearch(newQuery);
      if (cached) {
        setExternalResults(deduplicateExternal(cached, libraryBooks));
        setIsOpen(true);
      } else {
        // Show popular book matches while waiting for API
        const popular = searchPopularBooks(newQuery);
        if (popular.length > 0) {
          const asResults = popular.map(popularBookToResult);
          setExternalResults(deduplicateExternal(asResults, libraryBooks));
        } else {
          setExternalResults([]);
        }
        setIsOpen(true);
      }
    },
    [libraryBooks],
  );

  // Abort old requests so slower queries cannot replace newer results.
  useEffect(() => {
    if (!query.trim() || getCachedSearch(query)) {
      setIsLoadingExternal(false);
      return;
    }
    const controller = new AbortController();
    setIsLoadingExternal(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (!res.ok || !Array.isArray(data))
          throw new Error("Book search is unavailable. Please try again.");
        if (controller.signal.aborted) return;
        setCachedSearch(query, data);
        setExternalResults(deduplicateExternal(data, libraryBooks));
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        if (!controller.signal.aborted) setIsLoadingExternal(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, libraryBooks]);

  function handleLibraryBookClick(book: Book) {
    setQuery("");
    setLibraryResults([]);
    setExternalResults([]);
    setIsOpen(false);
    onNavigate?.();
    router.push(`/library/${book.slug || book.id}`);
  }

  async function handleAddBook(book: BookResult, index: number) {
    setAddingIndex(index);
    try {
      const res = await fetch("/api/books/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(book),
      });
      const data = await res.json();

      if (res.status === 409 && data.existing) {
        setQuery("");
        setLibraryResults([]);
        setExternalResults([]);
        setIsOpen(false);
        onNavigate?.();
        router.push(`/library/${data.slug || data.id}`);
        return;
      }
      if (!res.ok) throw new Error();

      setQuery("");
      setLibraryResults([]);
      setExternalResults([]);
      setIsOpen(false);
      window.dispatchEvent(new Event("biblioteca:book-added"));
      // Auto-generate insights (non-blocking)
      fetch(`/api/books/${data.id}/insights`, { method: "POST" }).catch(
        () => {},
      );
      onNavigate?.();
      router.push(`/library/${data.slug || data.id}`);
    } catch {
      setError("Failed to add book. Please try again.");
    } finally {
      setAddingIndex(null);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-warm-gray" />
        <input
          aria-label="Search titles and authors"
          autoFocus
          type="search"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder="Search a title or author…"
          className="w-full rounded-sm border border-warm-border bg-background/60 py-3 pl-9 pr-8 font-sans text-sm outline-none transition-colors placeholder:text-warm-gray/60 focus:border-amber focus:ring-0"
        />
        {isLoadingExternal && (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-warm-gray" />
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {isOpen && (hasResults || isLoadingExternal) && (
        <div className="relative mt-2 w-full rounded-sm border border-warm-border bg-card shadow-md">
          <div className="max-h-[50dvh] overflow-y-auto">
            {/* My Library section */}
            {libraryResults.length > 0 && (
              <div>
                <div className="px-3 pt-3 pb-1">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-warm-gray">
                    My Library
                  </p>
                </div>
                {libraryResults.map(({ book }) => (
                  <button
                    key={book.id}
                    onClick={() => handleLibraryBookClick(book)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    {book.cover_image_url ? (
                      <Image
                        src={book.cover_image_url}
                        alt={book.title}
                        width={32}
                        height={48}
                        className="h-12 w-8 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded-sm bg-muted font-serif text-[10px] text-muted-foreground">
                        {book.title.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-sm">{book.title}</p>
                      <p className="truncate font-sans text-xs text-warm-gray">
                        {book.authors.join(", ")}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-warm-gray" />
                  </button>
                ))}
              </div>
            )}

            {/* Divider */}
            {libraryResults.length > 0 && externalResults.length > 0 && (
              <div className="mx-3 border-t border-warm-border" />
            )}

            {/* Add to Library section */}
            {externalResults.length > 0 && (
              <div>
                <div className="px-3 pt-3 pb-1">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-warm-gray">
                    Add to Library
                  </p>
                </div>
                {externalResults.map((book, i) => (
                  <button
                    key={`${book.title}-${book.isbn_13 ?? i}`}
                    onClick={() => handleAddBook(book, i)}
                    disabled={addingIndex !== null}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {book.cover_image_url ? (
                      <Image
                        src={book.cover_image_url}
                        alt={book.title}
                        width={32}
                        height={48}
                        className="h-12 w-8 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded-sm bg-muted font-serif text-[10px] text-muted-foreground">
                        {book.title.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-sm">{book.title}</p>
                      <p className="truncate font-sans text-xs text-warm-gray">
                        {book.authors.join(", ")}
                      </p>
                    </div>
                    {addingIndex === i ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-warm-gray" />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0 text-amber" />
                    )}
                  </button>
                ))}
                {isLoadingExternal && (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-warm-gray" />
                    <span className="ml-2 font-sans text-xs text-warm-gray">
                      Searching more books...
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Loading state when no results yet */}
            {!hasResults && isLoadingExternal && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-warm-gray" />
              </div>
            )}
          </div>
        </div>
      )}

      {isOpen &&
        !hasResults &&
        !isLoadingExternal &&
        !error &&
        query.trim() && (
          <div className="relative mt-2 w-full rounded-sm border border-warm-border bg-card p-6 text-center shadow-md">
            <p className="font-sans text-sm text-warm-gray">
              No results found for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}
    </div>
  );
}
