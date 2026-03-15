"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Check, Search, Loader2 } from "lucide-react";
import Image from "next/image";
import Fuse from "fuse.js";
import type { Book } from "@/types/database";

type SearchResult = Omit<Book, "id" | "date_added" | "user_id">;

interface AddBookToCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  collectionName: string;
  collectionBookIds: string[];
}

function BookRow({
  title,
  authors,
  coverUrl,
  isAdded,
  isAdding,
  onAdd,
}: {
  title: string;
  authors: string[];
  coverUrl: string | null;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      onClick={onAdd}
      disabled={isAdded || isAdding}
      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent disabled:opacity-70"
    >
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={title}
          width={32}
          height={48}
          className="h-12 w-8 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded-sm bg-muted font-serif text-[10px] text-muted-foreground">
          {title.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm">{title}</p>
        <p className="truncate font-sans text-xs text-warm-gray">
          {authors.join(", ")}
        </p>
      </div>
      {isAdded ? (
        <Check className="h-4 w-4 shrink-0 text-green-600" />
      ) : isAdding ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-warm-gray" />
      ) : (
        <Plus className="h-4 w-4 shrink-0 text-amber" />
      )}
    </button>
  );
}

export function AddBookToCollectionModal({
  open,
  onOpenChange,
  collectionId,
  collectionName,
  collectionBookIds,
}: AddBookToCollectionModalProps) {
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedBookIds, setAddedBookIds] = useState<Set<string>>(new Set());
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setAddedBookIds(new Set());
      setLibraryQuery("");
      setSearchQuery("");
      setSearchResults([]);
      setError(null);
      fetch("/api/books")
        .then((res) => res.json())
        .then(setLibraryBooks)
        .catch(() => {});
    }
  }, [open]);

  const fuse = useMemo(
    () =>
      new Fuse(libraryBooks, {
        keys: [
          { name: "title" as const, weight: 2 },
          { name: "authors" as const, weight: 1 },
        ],
        threshold: 0.3,
      }),
    [libraryBooks]
  );

  const excludeIds = useMemo(() => {
    const ids = new Set(collectionBookIds);
    addedBookIds.forEach((id) => ids.add(id));
    return ids;
  }, [collectionBookIds, addedBookIds]);

  const filteredLibraryBooks = useMemo(() => {
    const base = libraryQuery
      ? fuse.search(libraryQuery).map((r) => r.item)
      : libraryBooks;
    return base.filter((b) => !excludeIds.has(b.id));
  }, [libraryQuery, fuse, libraryBooks, excludeIds]);

  // Debounced Google Books search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          setSearchResults(await res.json());
        }
      } catch {
        // Silent fail
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const addBookToCollection = useCallback(
    async (bookId: string) => {
      setAddingBookId(bookId);
      setError(null);
      try {
        const res = await fetch(`/api/collections/${collectionId}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId }),
        });
        if (!res.ok) throw new Error("Failed to add");
        setAddedBookIds((prev) => new Set(prev).add(bookId));
      } catch {
        setError("Failed to add book. Try again.");
      } finally {
        setAddingBookId(null);
      }
    },
    [collectionId]
  );

  const addNewBookToCollection = useCallback(
    async (book: SearchResult) => {
      const tempId = book.isbn_13 || book.title;
      setAddingBookId(tempId);
      setError(null);
      try {
        // Add book to library
        const addRes = await fetch("/api/books/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(book),
        });

        let bookId: string;
        if (addRes.status === 409) {
          const data = await addRes.json();
          bookId = data.id;
        } else if (addRes.status === 201) {
          const data = await addRes.json();
          bookId = data.id;
        } else {
          throw new Error("Failed to add book to library");
        }

        // Add to collection
        const colRes = await fetch(`/api/collections/${collectionId}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId }),
        });
        if (!colRes.ok) throw new Error("Failed to add to collection");

        setAddedBookIds((prev) => new Set(prev).add(tempId));
      } catch {
        setError("Failed to add book. Try again.");
      } finally {
        setAddingBookId(null);
      }
    },
    [collectionId]
  );

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && addedBookIds.size > 0) {
        window.dispatchEvent(new Event("biblioteca:book-added"));
      }
      onOpenChange(isOpen);
    },
    [addedBookIds, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            Add to {collectionName}
          </DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Tabs defaultValue="library" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="library" className="flex-1">
              My Library
            </TabsTrigger>
            <TabsTrigger value="search" className="flex-1">
              Search New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-warm-gray" />
              <input
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Search your library..."
                className="w-full rounded-sm border border-warm-border bg-background/60 py-2 pl-9 pr-3 font-sans text-sm outline-none transition-colors placeholder:text-warm-gray/60 focus:border-amber focus:ring-0"
                autoFocus
              />
            </div>
            <div className="max-h-[480px] overflow-y-auto rounded-sm border border-warm-border bg-card">
              {filteredLibraryBooks.length === 0 ? (
                <p className="py-12 text-center font-sans text-sm text-warm-gray">
                  {libraryBooks.length === 0
                    ? "No books in your library yet. Use 'Search New' to discover books."
                    : libraryQuery
                      ? "No matching books found."
                      : "All your books are already in this collection."}
                </p>
              ) : (
                <>
                  <div className="px-3 pt-3 pb-1">
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-warm-gray">
                      Available Books
                    </p>
                  </div>
                  {filteredLibraryBooks.map((book) => (
                    <BookRow
                      key={book.id}
                      title={book.title}
                      authors={book.authors}
                      coverUrl={book.cover_image_url}
                      isAdded={addedBookIds.has(book.id)}
                      isAdding={addingBookId === book.id}
                      onAdd={() => addBookToCollection(book.id)}
                    />
                  ))}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="search" className="mt-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-warm-gray" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Google Books..."
                className="w-full rounded-sm border border-warm-border bg-background/60 py-2 pl-9 pr-3 font-sans text-sm outline-none transition-colors placeholder:text-warm-gray/60 focus:border-amber focus:ring-0"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-warm-gray" />
              )}
            </div>
            <div className="max-h-[480px] overflow-y-auto rounded-sm border border-warm-border bg-card">
              {isSearching && searchResults.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-4 w-4 animate-spin text-warm-gray" />
                  <span className="ml-2 font-sans text-xs text-warm-gray">
                    Searching books...
                  </span>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="py-12 text-center font-sans text-sm text-warm-gray">
                  {searchQuery
                    ? "No books found. Try a different search."
                    : "Type to search for books..."}
                </p>
              ) : (
                <>
                  <div className="px-3 pt-3 pb-1">
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-warm-gray">
                      Add to Library & Collection
                    </p>
                  </div>
                  {searchResults.map((book, i) => {
                    const key = book.isbn_13 || `${book.title}-${i}`;
                    return (
                      <BookRow
                        key={key}
                        title={book.title}
                        authors={book.authors}
                        coverUrl={book.cover_image_url}
                        isAdded={addedBookIds.has(key)}
                        isAdding={addingBookId === key}
                        onAdd={() => addNewBookToCollection(book)}
                      />
                    );
                  })}
                  {isSearching && (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-warm-gray" />
                      <span className="ml-2 font-sans text-xs text-warm-gray">
                        Searching more books...
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
