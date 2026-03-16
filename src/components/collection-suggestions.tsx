"use client";

import { useState, useEffect } from "react";
import { Sparkles, Plus, Check } from "lucide-react";

interface Suggestion {
  title: string;
  author: string;
  reason: string;
}

interface CollectionSuggestionsProps {
  collectionId: string;
  collectionName: string;
  onBookAdded?: () => void;
}

export function CollectionSuggestions({
  collectionId,
  collectionName,
  onBookAdded,
}: CollectionSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [addingTitle, setAddingTitle] = useState<string | null>(null);
  const [addedTitles, setAddedTitles] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSuggestions([]);
    setHasFetched(false);
    setAddedTitles(new Set());
  }, [collectionId]);

  async function fetchSuggestions() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}/suggestions`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      }
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }

  async function addBook(suggestion: Suggestion) {
    setAddingTitle(suggestion.title);
    try {
      // Add to library
      const addRes = await fetch("/api/books/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestion.title,
          authors: [suggestion.author],
          category: "History",
        }),
      });

      let bookId: string | null = null;
      if (addRes.ok) {
        const book = await addRes.json();
        bookId = book.id;
      } else if (addRes.status === 409) {
        const existing = await addRes.json();
        bookId = existing.id;
      }

      // Add to collection
      if (bookId) {
        await fetch(`/api/collections/${collectionId}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId }),
        });
        setAddedTitles((prev) => new Set([...prev, suggestion.title]));
        onBookAdded?.();
        window.dispatchEvent(new CustomEvent("biblioteca:book-added"));
      }
    } finally {
      setAddingTitle(null);
    }
  }

  if (!hasFetched) {
    return (
      <button
        onClick={fetchSuggestions}
        disabled={isLoading}
        className="flex items-center gap-2 self-start rounded-sm border border-warm-border px-3 py-2 font-sans text-xs font-medium text-warm-gray transition-colors hover:border-amber hover:text-foreground disabled:opacity-50"
      >
        <Sparkles className={`h-3.5 w-3.5 ${isLoading ? "animate-pulse text-amber" : ""}`} />
        {isLoading ? "Finding suggestions..." : `Suggest books for ${collectionName}`}
      </button>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-amber" />
        <span className="font-sans text-xs font-medium uppercase tracking-[0.12em] text-warm-gray">
          Suggested for {collectionName}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {suggestions.map((s) => {
          const added = addedTitles.has(s.title);
          const adding = addingTitle === s.title;
          return (
            <div
              key={s.title}
              className="flex items-start gap-3 rounded-sm border border-warm-border bg-card p-3 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-serif text-sm font-medium leading-tight truncate">
                  {s.title}
                </p>
                <p className="font-sans text-xs text-warm-gray truncate">{s.author}</p>
                <p className="mt-1 font-sans text-xs italic text-warm-gray/80 line-clamp-2">
                  {s.reason}
                </p>
              </div>
              <button
                onClick={() => addBook(s)}
                disabled={adding || added}
                className={`mt-0.5 shrink-0 rounded-sm p-1 transition-colors ${
                  added
                    ? "text-green-600"
                    : "text-warm-gray hover:text-amber"
                } disabled:opacity-50`}
                title={added ? "Added" : "Add to library & collection"}
              >
                {added ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className={`h-4 w-4 ${adding ? "animate-spin" : ""}`} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
