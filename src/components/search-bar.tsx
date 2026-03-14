"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Plus, Loader2 } from "lucide-react";
import type { Book } from "@/types/database";

type BookResult = Omit<Book, "id" | "date_added" | "user_id">;

interface SearchBarProps {
  onBookAdded?: () => void;
}

export function SearchBar({ onBookAdded }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed. Please try again.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        // Book already in library — navigate to it
        setQuery("");
        setResults([]);
        setIsOpen(false);
        router.push(`/library/${data.slug || data.id}`);
        return;
      }
      if (!res.ok) throw new Error();

      // New book added — navigate to its detail page
      setQuery("");
      setResults([]);
      setIsOpen(false);
      onBookAdded?.();
      router.push(`/library/${data.slug || data.id}`);
    } catch {
      setError("Failed to add book. Please try again.");
    } finally {
      setAddingIndex(null);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-gray" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search for a book..."
          className="w-full border-0 border-b border-warm-border bg-transparent py-3 pl-7 pr-4 font-serif text-lg italic outline-none transition-colors placeholder:text-warm-gray/60 focus:border-amber focus:ring-0"
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-warm-gray" />
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-sm border border-warm-border bg-card shadow-md">
          <div className="max-h-96 overflow-y-auto p-2">
            {results.map((book, i) => (
              <button
                key={`${book.title}-${book.isbn_13 ?? i}`}
                onClick={() => handleAddBook(book, i)}
                disabled={addingIndex !== null}
                className="flex w-full items-center gap-3 rounded-sm p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                {book.cover_image_url ? (
                  <Image
                    src={book.cover_image_url}
                    alt={book.title}
                    width={40}
                    height={60}
                    className="h-15 w-10 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <div className="flex h-15 w-10 shrink-0 items-center justify-center rounded-sm bg-muted font-serif text-xs text-muted-foreground">
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
                  <Plus className="h-4 w-4 shrink-0 text-warm-gray" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && results.length === 0 && !isLoading && query.trim() && (
        <div className="absolute z-50 mt-2 w-full rounded-sm border border-warm-border bg-card p-6 text-center shadow-md">
          <p className="font-sans text-sm text-warm-gray">
            No results found for &ldquo;{query}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
