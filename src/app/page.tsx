"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BookGrid, BookGridSkeleton } from "@/components/book-grid";
import { CollectionCarousel } from "@/components/collection-carousel";
import { QuoteDivider } from "@/components/quote-carousel";
import { AddBookCard } from "@/components/add-book-card";
import { AddBookToCollectionModal } from "@/components/add-book-to-collection-modal";
import { BookOpen, Heart } from "lucide-react";
import type { Book, BookStatus, BookCategory } from "@/types/database";
import { BOOK_CATEGORIES } from "@/types/database";

type SortKey = "default" | "date_added" | "title" | "author" | "rating";

const STATUS_ORDER: Record<BookStatus, number> = {
  read: 0,
  reading: 1,
  want_to_read: 2,
};

const VALID_STATUSES = new Set<string>(["all", "want_to_read", "reading", "read"]);
const VALID_SORTS = new Set<string>(["default", "date_added", "title", "author", "rating"]);

function useUrlState() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const getParam = useCallback(
    (key: string, fallback: string, valid?: Set<string>) => {
      const val = searchParams.get(key);
      if (!val) return fallback;
      if (valid && !valid.has(val)) return fallback;
      return val;
    },
    [searchParams]
  );

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const str = params.toString();
      router.replace(str ? `?${str}` : "/", { scroll: false });
    },
    [searchParams, router]
  );

  return { getParam, setParams, searchParams };
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<BookGridSkeleton />}>
      <LibraryPageContent />
    </Suspense>
  );
}

function LibraryPageContent() {
  const { getParam, setParams } = useUrlState();

  const statusFilter = getParam("status", "all", VALID_STATUSES) as BookStatus | "all";
  const sortBy = getParam("sort", "default", VALID_SORTS) as SortKey;
  const showFavorites = getParam("favorites", "") === "1";
  const categoryFilter = getParam("category", "all") as BookCategory | "all";
  const selectedCollectionSlug = getParam("collection", "") || null;

  const setStatusFilter = useCallback(
    (v: BookStatus | "all") => setParams({ status: v === "all" ? null : v }),
    [setParams]
  );
  const setSortBy = useCallback(
    (v: SortKey) => setParams({ sort: v === "default" ? null : v }),
    [setParams]
  );
  const setShowFavorites = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(showFavorites) : v;
      setParams({ favorites: next ? "1" : null });
    },
    [setParams, showFavorites]
  );
  const setCategoryFilter = useCallback(
    (v: BookCategory | "all") => setParams({ category: v === "all" ? null : v }),
    [setParams]
  );
  const handleSelectCollection = useCallback(
    (slug: string | null, id: string | null) => {
      setParams({ collection: slug });
      setSelectedCollectionId(id);
      setSelectedCollectionName(
        slug
          ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : null
      );
    },
    [setParams]
  );

  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionBookIds, setCollectionBookIds] = useState<Set<string> | null>(null);
  const [collectionKey, setCollectionKey] = useState(0);
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string | null>(null);
  const [collectionBookVersion, setCollectionBookVersion] = useState(0);

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/books");
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
    const handler = () => fetchBooks();
    window.addEventListener("biblioteca:book-added", handler);
    return () => window.removeEventListener("biblioteca:book-added", handler);
  }, [fetchBooks]);

  useEffect(() => {
    if (!selectedCollectionId) {
      setCollectionBookIds(null);
      return;
    }
    async function fetchCollectionBooks() {
      const res = await fetch(`/api/collections/${selectedCollectionId}/books`);
      if (res.ok) {
        const data = await res.json();
        setCollectionBookIds(new Set(data.bookIds));
      }
    }
    fetchCollectionBooks();
  }, [selectedCollectionId, collectionBookVersion]);

  const filteredBooks = useMemo(
    () =>
      books
        .filter((b) => !collectionBookIds || collectionBookIds.has(b.id))
        .filter((b) => statusFilter === "all" || b.status === statusFilter)
        .filter((b) => !showFavorites || b.is_favorite)
        .filter((b) => categoryFilter === "all" || b.category === categoryFilter)
        .sort((a, b) => {
          switch (sortBy) {
            case "title":
              return a.title.localeCompare(b.title);
            case "author":
              return (a.authors[0] ?? "").localeCompare(b.authors[0] ?? "");
            case "rating": {
              const aScore = a.rating ?? a.external_rating ?? 0;
              const bScore = b.rating ?? b.external_rating ?? 0;
              return bScore - aScore;
            }
            case "date_added":
              return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
            default: {
              // Default: user rating → external rating → status (read > reading > want_to_read)
              const aUser = a.rating ?? 0;
              const bUser = b.rating ?? 0;
              if (aUser !== bUser) return bUser - aUser;
              const aExt = a.external_rating ?? 0;
              const bExt = b.external_rating ?? 0;
              if (aExt !== bExt) return bExt - aExt;
              return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
            }
          }
        }),
    [books, collectionBookIds, statusFilter, showFavorites, categoryFilter, sortBy]
  );

  const statusOptions: { value: BookStatus | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "want_to_read", label: "Want to Read" },
    { value: "reading", label: "Reading" },
    { value: "read", label: "Read" },
  ];

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "default", label: "Best" },
    { value: "date_added", label: "Date Added" },
    { value: "title", label: "Title" },
    { value: "author", label: "Author" },
    { value: "rating", label: "Rating" },
  ];

  const availableCategories = useMemo(
    () => BOOK_CATEGORIES.filter((cat) => books.some((b) => b.category === cat)),
    [books]
  );

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex w-full flex-col items-center gap-1 pt-4">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Your Library</h1>
        <p className="text-warm-gray text-sm tracking-[0.12em]">
          {books.length > 0
            ? `${filteredBooks.length} volume${filteredBooks.length !== 1 ? "s" : ""}`
            : "Search for a book to add it to your collection"}
        </p>
      </div>

      {books.length > 0 && (
        <CollectionCarousel
          key={collectionKey}
          selectedCollectionSlug={selectedCollectionSlug}
          onSelectCollection={handleSelectCollection}
          onCollectionChange={() => setCollectionKey((k) => k + 1)}
        />
      )}

      {books.length > 0 && (
        <div className="flex w-full flex-wrap items-center gap-4">
          {/* Status filter — slash-separated links */}
          <div className="flex items-center gap-1 font-sans text-sm">
            {statusOptions.map((opt, i) => (
              <span key={opt.value} className="flex items-center">
                {i > 0 && <span className="mx-1.5 text-warm-gray/40">/</span>}
                <button
                  onClick={() => setStatusFilter(opt.value)}
                  className={`pb-0.5 transition-colors ${
                    statusFilter === opt.value
                      ? "border-b-2 border-amber text-amber"
                      : "text-warm-gray hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              </span>
            ))}
          </div>

          {/* Favorites toggle */}
          <button
            onClick={() => setShowFavorites((v) => !v)}
            className={`flex items-center gap-1 rounded-sm px-2 py-1 text-sm transition-colors ${
              showFavorites
                ? "text-amber"
                : "text-warm-gray hover:text-foreground"
            }`}
            title="Show favorites only"
          >
            <Heart className={`h-3.5 w-3.5 ${showFavorites ? "fill-amber" : ""}`} />
          </button>

          <div className="ml-auto flex items-center gap-3">
            {/* Category filter */}
            {availableCategories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as BookCategory | "all")}
                className="rounded-sm border border-warm-border bg-background px-3 py-1.5 font-sans text-sm outline-none focus:border-amber"
              >
                <option value="all">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-sm border border-warm-border bg-background px-3 py-1.5 font-sans text-sm outline-none focus:border-amber"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isLoading ? (
        <BookGridSkeleton />
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <BookOpen className="h-16 w-16 text-warm-gray/50" />
          <div>
            <h2 className="font-serif text-lg font-semibold">Your library is empty</h2>
            <p className="font-sans text-sm text-warm-gray">
              Search for a book above to start building your collection
            </p>
          </div>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="font-sans text-sm text-warm-gray">
            No books match the current filter.
          </p>
          <button
            onClick={() => setParams({ status: null, favorites: null, category: null, collection: null, sort: null })}
            className="font-sans text-sm font-medium text-amber underline"
          >
            Show all books
          </button>
        </div>
      ) : (
        <div className="w-full animate-in fade-in duration-300">
          {(() => {
            const CHUNK_SIZE = 15;
            const chunks: Book[][] = [];
            for (let i = 0; i < filteredBooks.length; i += CHUNK_SIZE) {
              chunks.push(filteredBooks.slice(i, i + CHUNK_SIZE));
            }
            const isLastChunk = (i: number) => i === chunks.length - 1;
            return chunks.map((chunk, i) => (
              <div key={i}>
                <BookGrid
                  books={chunk}
                  priority={i === 0}
                  lazy={i > 0}
                  renderAfter={
                    isLastChunk(i) && selectedCollectionId ? (
                      <AddBookCard onClick={() => setAddBookModalOpen(true)} />
                    ) : undefined
                  }
                />
                {(i < chunks.length - 1 || filteredBooks.length <= CHUNK_SIZE) && (
                  <div className="my-6">
                    <QuoteDivider colorIndex={i} />
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {selectedCollectionId && selectedCollectionName && (
        <AddBookToCollectionModal
          open={addBookModalOpen}
          onOpenChange={(isOpen) => {
            setAddBookModalOpen(isOpen);
            if (!isOpen) {
              setCollectionBookVersion((v) => v + 1);
            }
          }}
          collectionId={selectedCollectionId}
          collectionName={selectedCollectionName}
          collectionBookIds={
            collectionBookIds ? Array.from(collectionBookIds) : []
          }
        />
      )}
    </div>
  );
}
