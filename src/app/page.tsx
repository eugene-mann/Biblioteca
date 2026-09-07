"use client";

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useDeferredValue,
} from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Heart,
  LayoutGrid,
  List,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { BookGrid, BookGridSkeleton } from "@/components/book-grid";
import { CollectionCarousel } from "@/components/collection-carousel";
import { AddBookCard } from "@/components/add-book-card";
import { AddBookToCollectionModal } from "@/components/add-book-to-collection-modal";
import { NowReadingHero } from "@/components/now-reading-hero";
import { ReadingStats } from "@/components/reading-stats";
import { useLibrary } from "@/components/library-provider";
import { filterBooks, type SortKey } from "@/lib/library-view";
import type { BookStatus } from "@/types/database";
import { BOOK_CATEGORIES } from "@/types/database";

const STATUSES = [
  { value: "all", label: "All books" },
  { value: "reading", label: "Reading" },
  { value: "want_to_read", label: "To read" },
  { value: "read", label: "Finished" },
] as const;
const SORTS = [
  { value: "default", label: "Your top rated" },
  { value: "date_added", label: "Recently added" },
  { value: "title", label: "Title A–Z" },
  { value: "author", label: "Author A–Z" },
  { value: "rating", label: "Highest rated" },
] as const;

export default function LibraryPage() {
  return (
    <Suspense fallback={<BookGridSkeleton />}>
      <LibraryContent />
    </Suspense>
  );
}
function LibraryContent() {
  const params = useSearchParams();
  const { books, loading, error, refresh } = useLibrary();
  const status = (
    STATUSES.some((x) => x.value === params.get("status"))
      ? params.get("status")
      : "all"
  ) as BookStatus | "all";
  const sort = (
    SORTS.some((x) => x.value === params.get("sort"))
      ? params.get("sort")
      : "default"
  ) as SortKey;
  const category =
    BOOK_CATEGORIES.find((x) => x === params.get("category")) ?? "all";
  const favorites = params.get("favorites") === "1";
  const collectionSlug = params.get("collection");
  const query = params.get("q") ?? "";
  const deferredQuery = useDeferredValue(query);
  const view = params.get("view") === "list" ? "list" : "grid";
  const [selection, setSelection] = useState<{
    slug: string | null;
    id: string | null;
  }>({ slug: null, id: null });
  const collectionId = selection.slug === collectionSlug ? selection.id : null;
  const [collectionResult, setCollectionResult] = useState<{
    key: string;
    ids: Set<string>;
    error: string | null;
  } | null>(null);
  const [collectionVersion, setCollectionVersion] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [collectionKey, setCollectionKey] = useState(0);

  const setParams = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    window.history.replaceState(null, "", next.size ? `?${next}` : "/");
  }, []);
  const selectCollection = useCallback(
    (slug: string | null, id: string | null) => {
      setParams({ collection: slug });
      setSelection({ slug, id });
    },
    [setParams],
  );
  const collectionRequestKey = `${collectionId}:${collectionVersion}`;
  const collectionIds =
    collectionSlug && collectionResult?.key === collectionRequestKey
      ? collectionResult.ids
      : null;
  const collectionError =
    collectionSlug && collectionResult?.key === collectionRequestKey
      ? collectionResult.error
      : null;
  const collectionLoading =
    !!collectionSlug &&
    (!collectionId || collectionResult?.key !== collectionRequestKey);
  useEffect(() => {
    if (!collectionSlug || !collectionId) return;
    const controller = new AbortController();
    fetch(`/api/collections/${collectionId}/books`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data.bookIds)) throw new Error();
        setCollectionResult({
          key: collectionRequestKey,
          ids: new Set(data.bookIds),
          error: null,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setCollectionResult({
            key: collectionRequestKey,
            ids: new Set(),
            error: "This collection couldn’t load. Try again.",
          });
      });
    return () => controller.abort();
  }, [collectionId, collectionSlug, collectionRequestKey]);

  const filtered = useMemo(
    () =>
      filterBooks(books, {
        status,
        sort,
        category,
        favorites,
        query: deferredQuery,
        collectionIds: collectionSlug ? collectionIds : null,
      }),
    [
      books,
      status,
      sort,
      category,
      favorites,
      deferredQuery,
      collectionIds,
      collectionSlug,
    ],
  );
  const categories = useMemo(
    () =>
      BOOK_CATEGORIES.filter((cat) => books.some((b) => b.category === cat)),
    [books],
  );
  const counts = useMemo(
    () => ({
      all: books.length,
      reading: books.filter((b) => b.status === "reading").length,
      want_to_read: books.filter((b) => b.status === "want_to_read").length,
      read: books.filter((b) => b.status === "read").length,
    }),
    [books],
  );
  const hasFilters =
    status !== "all" ||
    category !== "all" ||
    favorites ||
    !!query ||
    !!collectionSlug;
  const openSearch = () => window.dispatchEvent(new Event("biblioteca:search"));
  const clear = () => {
    setParams({
      status: null,
      category: null,
      favorites: null,
      q: null,
      collection: null,
    });
    setSelection({ slug: null, id: null });
  };
  const shelfKey = [
    status,
    sort,
    category,
    favorites,
    query,
    collectionSlug,
    collectionVersion,
  ].join("|");
  return (
    <div className="library-room">
      <header className="room-header">
        <div>
          <p className="eyebrow">A life between the pages</p>
          <h1>
            Your reading room<span>.</span>
          </h1>
          <p className="room-subtitle">
            The books you keep. The ideas that stay.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings" className="quiet-button">
            <Upload className="h-3.5 w-3.5" />
            Import
          </Link>
          <button className="primary-button" onClick={openSearch}>
            <Plus className="h-4 w-4" />
            Find a book
          </button>
        </div>
      </header>
      {!loading && books.length > 0 && (
        <>
          <NowReadingHero books={books} />
          <ReadingStats books={books} />
        </>
      )}
      {error && (
        <div className="error-panel" role="alert">
          <p>{error}</p>
          <button onClick={() => void refresh()} className="quiet-button">
            Try again
          </button>
        </div>
      )}
      {!loading && !error && !books.length && (
        <div className="empty-shelf">
          <BookOpen />
          <h2>A home for your books.</h2>
          <p>Start with a favorite, or bring your existing library with you.</p>
          <button onClick={openSearch} className="primary-button">
            Find your first book
          </button>
          <Link href="/settings" className="quiet-button">
            Import a reading list
          </Link>
        </div>
      )}
      {books.length > 0 && (
        <>
          <CollectionCarousel
            key={collectionKey}
            selectedCollectionSlug={collectionSlug}
            onSelectCollection={selectCollection}
            onCollectionChange={() => setCollectionKey((k) => k + 1)}
          />
          <section className="shelf-section" aria-labelledby="shelf-title">
            <div className="shelf-heading">
              <div>
                <p className="eyebrow">Collected, not forgotten</p>
                <h2 id="shelf-title">
                  On your shelves <span>{books.length}</span>
                </h2>
              </div>
              <Link href="/explore" className="text-link">
                Explore connections <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="shelf-controls">
              <div className="shelf-tabs" aria-label="Reading status">
                {STATUSES.map((item) => (
                  <button
                    key={item.value}
                    aria-pressed={status === item.value}
                    onClick={() =>
                      setParams({
                        status: item.value === "all" ? null : item.value,
                      })
                    }
                  >
                    {item.label}
                    <span>{counts[item.value]}</span>
                  </button>
                ))}
              </div>
              <div className="shelf-tools">
                <label className="shelf-search">
                  <Search className="h-4 w-4" />
                  <input
                    aria-label="Filter your library"
                    placeholder="Find on your shelves…"
                    value={query}
                    onChange={(e) => setParams({ q: e.target.value })}
                  />
                  {query && (
                    <button
                      onClick={() => setParams({ q: null })}
                      aria-label="Clear shelf search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </label>
                <select
                  aria-label="Filter by category"
                  value={category}
                  onChange={(e) =>
                    setParams({
                      category:
                        e.target.value === "all" ? null : e.target.value,
                    })
                  }
                >
                  <option value="all">All genres</option>
                  {categories.map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  aria-label="Sort books"
                  value={sort}
                  onChange={(e) => setParams({ sort: e.target.value })}
                >
                  {SORTS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <button
                  className="shelf-favorite"
                  aria-label="Favorites only"
                  aria-pressed={favorites}
                  onClick={() =>
                    setParams({ favorites: favorites ? null : "1" })
                  }
                >
                  <Heart
                    className={`h-4 w-4 ${favorites ? "fill-burgundy text-burgundy" : ""}`}
                  />
                </button>
                <div className="view-switch" aria-label="Shelf view">
                  <button
                    aria-label="Grid view"
                    aria-pressed={view === "grid"}
                    onClick={() => setParams({ view: null })}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="List view"
                    aria-pressed={view === "list"}
                    onClick={() => setParams({ view: "list" })}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="shelf-results" aria-live="polite">
              <span>
                {collectionLoading
                  ? "Loading collection…"
                  : `${filtered.length} ${filtered.length === 1 ? "book" : "books"}${query ? ` matching “${query}”` : ""}`}
              </span>
              {hasFilters && (
                <button onClick={clear}>
                  Clear filters <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {collectionError ? (
              <div className="error-panel" role="alert">
                {collectionError}
                <button
                  className="quiet-button"
                  onClick={() => setCollectionVersion((v) => v + 1)}
                >
                  Try again
                </button>
              </div>
            ) : collectionLoading || (collectionSlug && !collectionId) ? (
              <BookGridSkeleton count={6} />
            ) : filtered.length ? (
              <Shelf
                key={shelfKey}
                books={filtered}
                view={view}
                renderAfter={
                  collectionId ? (
                    <AddBookCard onClick={() => setModalOpen(true)} />
                  ) : undefined
                }
              />
            ) : (
              <div className="empty-shelf">
                <Search />
                <h2>No books on this shelf.</h2>
                <p>Try another title, author, or a wider set of filters.</p>
                <button className="quiet-button" onClick={clear}>
                  Show all books
                </button>
              </div>
            )}
          </section>
        </>
      )}
      {loading && <BookGridSkeleton />}
      {collectionId && (
        <AddBookToCollectionModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setCollectionVersion((v) => v + 1);
          }}
          collectionId={collectionId}
          collectionName={collectionSlug?.replace(/-/g, " ") ?? "Collection"}
          collectionBookIds={[...(collectionIds ?? [])]}
        />
      )}
    </div>
  );
}
function Shelf({
  books,
  view,
  renderAfter,
}: {
  books: ReturnType<typeof filterBooks>;
  view: "grid" | "list";
  renderAfter?: React.ReactNode;
}) {
  const [limit, setLimit] = useState(24);
  return (
    <>
      <BookGrid
        books={books.slice(0, limit)}
        view={view}
        renderAfter={renderAfter}
      />
      {limit < books.length && (
        <div className="shelf-more">
          <p>
            Showing {Math.min(limit, books.length)} of {books.length} books
          </p>
          <button
            className="quiet-button"
            onClick={() => setLimit((n) => n + 24)}
          >
            Show 24 more <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
