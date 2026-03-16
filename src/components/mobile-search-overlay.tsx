"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Search, Plus, Loader2, ArrowRight } from "lucide-react";
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

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSearchOverlay({ isOpen, onClose }: MobileSearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [libraryResults, setLibraryResults] = useState<LibrarySearchResult[]>([]);
  const [externalResults, setExternalResults] = useState<BookResult[]>([]);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load library books
  useEffect(() => {
    if (!isOpen) return;
    async function fetchBooks() {
      try {
        const res = await fetch("/api/books");
        if (res.ok) setLibraryBooks(await res.json());
      } catch {
        /* silent */
      }
    }
    fetchBooks();
  }, [isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setLibraryResults([]);
      setExternalResults([]);
      setError(null);
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      setError(null);

      if (!newQuery.trim()) {
        setLibraryResults([]);
        setExternalResults([]);
        return;
      }

      const libResults = searchLibrary(libraryBooks, newQuery);
      setLibraryResults(libResults);

      const cached = getCachedSearch(newQuery);
      if (cached) {
        setExternalResults(deduplicateExternal(cached, libraryBooks));
      } else {
        const popular = searchPopularBooks(newQuery);
        if (popular.length > 0) {
          const asResults = popular.map(popularBookToResult);
          setExternalResults(deduplicateExternal(asResults, libraryBooks));
        } else {
          setExternalResults([]);
        }
      }
    },
    [libraryBooks]
  );

  // Debounced API search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) return;
    if (getCachedSearch(query)) return;

    setIsLoadingExternal(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");

        setCachedSearch(query, data);
        const deduplicated = deduplicateExternal(data, libraryBooks);
        setExternalResults(deduplicated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed. Please try again.");
      } finally {
        setIsLoadingExternal(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, libraryBooks]);

  function handleLibraryBookClick(book: Book) {
    onClose();
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
        onClose();
        router.push(`/library/${data.slug || data.id}`);
        return;
      }
      if (!res.ok) throw new Error();

      window.dispatchEvent(new Event("biblioteca:book-added"));
      fetch(`/api/books/${data.id}/insights`, { method: "POST" }).catch(() => {});
      onClose();
      router.push(`/library/${data.slug || data.id}`);
    } catch {
      setError("Failed to add book. Please try again.");
    } finally {
      setAddingIndex(null);
    }
  }

  if (!isOpen) return null;

  const hasResults = libraryResults.length > 0 || externalResults.length > 0;

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-warm-border">
        <button
          onClick={onClose}
          className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-secondary"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-warm-gray" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search books..."
            className="w-full rounded-sm border border-warm-border bg-background/60 py-2 pl-9 pr-4 font-sans text-sm outline-none placeholder:text-warm-gray/60 focus:border-amber focus:ring-0"
          />
          {isLoadingExternal && (
            <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-warm-gray" />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {error && (
          <p className="py-2 text-sm text-destructive">{error}</p>
        )}

        {/* My Library results */}
        {libraryResults.length > 0 && (
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-warm-gray pt-3 pb-1">
              My Library
            </p>
            {libraryResults.map(({ book }) => (
              <button
                key={book.id}
                onClick={() => handleLibraryBookClick(book)}
                className="flex w-full items-center gap-3 py-3 border-b border-warm-border/50 text-left"
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
                  <p className="truncate font-sans text-sm text-foreground">{book.title}</p>
                  <p className="truncate font-sans text-xs text-warm-gray">
                    {book.authors.join(", ")}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-warm-gray" />
              </button>
            ))}
          </div>
        )}

        {/* Add to Library results */}
        {externalResults.length > 0 && (
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-warm-gray pt-3 pb-1">
              Add to Library
            </p>
            {externalResults.map((book, i) => (
              <button
                key={`${book.title}-${book.isbn_13 ?? i}`}
                onClick={() => handleAddBook(book, i)}
                disabled={addingIndex !== null}
                className="flex w-full items-center gap-3 py-3 border-b border-warm-border/50 text-left disabled:opacity-50"
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
                  <p className="truncate font-sans text-sm text-foreground">{book.title}</p>
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
                <span className="ml-2 font-sans text-xs text-warm-gray">Searching more books...</span>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {!hasResults && isLoadingExternal && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-warm-gray" />
          </div>
        )}

        {/* No results */}
        {!hasResults && !isLoadingExternal && query.trim() && (
          <div className="flex items-center justify-center py-12">
            <p className="font-sans text-sm text-warm-gray">
              No results found for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
