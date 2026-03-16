"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Bookmark, ArrowRight } from "lucide-react";
import { SuggestedBookCard } from "@/components/suggested-book-card";
import type { ExploreCluster, ExploreBook } from "@/app/api/explore/route";

const ACCENT_CLASSES = [
  { pill: "border-emerald-300/60 text-emerald-700 bg-emerald-50", quote: "border-emerald-300" },
  { pill: "border-amber/60 text-amber-800 bg-amber-50", quote: "border-amber" },
  { pill: "border-blue-300/60 text-blue-700 bg-blue-50", quote: "border-blue-300" },
  { pill: "border-purple-300/60 text-purple-700 bg-purple-50", quote: "border-purple-300" },
  { pill: "border-rose-300/60 text-rose-700 bg-rose-50", quote: "border-rose-300" },
];

function stars(rating: number | null): string {
  if (!rating) return "";
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function BookLink({
  book,
  children,
  className,
}: {
  book: ExploreBook;
  children: React.ReactNode;
  className?: string;
}) {
  if (!book.slug) return <div className={className}>{children}</div>;
  return (
    <Link href={`/library/${book.slug}`} className={className}>
      {children}
    </Link>
  );
}

function HeroCard({ book, accent }: { book: ExploreBook; accent: (typeof ACCENT_CLASSES)[0] }) {
  return (
    <BookLink book={book} className="flex flex-col md:flex-row gap-6 md:gap-10 mb-10 group">
      {/* Cover */}
      {book.cover_image_url && (
        <div className="shrink-0 w-[180px] md:w-[250px]">
          <Image
            src={book.cover_image_url}
            alt={book.title}
            width={250}
            height={375}
            className="w-full h-auto rounded-sm shadow-md group-hover:shadow-lg transition-shadow"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Meta */}
        <div className="flex items-center gap-3 flex-wrap mb-2">
          {book.category && (
            <span className="font-sans text-[11px] font-semibold tracking-[0.12em] uppercase text-warm-gray">
              {book.category}
            </span>
          )}
          {book.rating && (
            <span className="text-sm text-amber tracking-wider">{stars(book.rating)}</span>
          )}
        </div>

        <h3 className="font-serif text-2xl font-bold leading-tight mb-1">{book.title}</h3>
        <p className="text-[15px] text-warm-gray italic mb-4">
          by {book.authors.join(", ")}
        </p>

        {/* Why Read */}
        <p className="text-[15px] leading-relaxed text-foreground/80 mb-5">
          {book.insight.why_read}
        </p>

        {/* Theme pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {book.insight.themes.map((theme) => (
            <span
              key={theme}
              className={`font-sans text-xs font-medium px-3.5 py-1 rounded-full border ${accent.pill}`}
            >
              {theme}
            </span>
          ))}
        </div>

        {/* Quotes */}
        <div className="flex flex-col gap-4">
          {book.insight.quotes.slice(0, 2).map((quote, i) => (
            <blockquote
              key={i}
              className={`pl-5 border-l-[3px] ${accent.quote} font-serif italic text-[15px] leading-relaxed text-foreground/70`}
            >
              &ldquo;{quote}&rdquo;
            </blockquote>
          ))}
        </div>
      </div>
    </BookLink>
  );
}

function CompactCard({ book }: { book: ExploreBook }) {
  return (
    <BookLink
      book={book}
      className="flex gap-4 p-5 bg-card border border-warm-border rounded-sm hover:border-foreground/20 transition-colors group"
    >
      {book.cover_image_url && (
        <Image
          src={book.cover_image_url}
          alt={book.title}
          width={64}
          height={96}
          className="w-16 h-24 object-cover rounded-sm shrink-0"
        />
      )}
      <div className="min-w-0">
        <h4 className="font-serif text-base font-semibold leading-tight mb-0.5 truncate">
          {book.title}
        </h4>
        <p className="font-sans text-[13px] text-warm-gray mb-1">
          {book.authors.join(", ")}
        </p>
        <div className="flex items-center gap-2 mb-2.5">
          {book.rating && (
            <span className="text-xs text-amber tracking-wider">{stars(book.rating)}</span>
          )}
          {book.category && (
            <span className="font-sans text-[10px] font-semibold tracking-[0.1em] uppercase text-warm-gray">
              {book.category}
            </span>
          )}
        </div>
        {book.insight.quotes[0] && (
          <p className="font-serif italic text-[13px] leading-snug text-foreground/60 line-clamp-2">
            &ldquo;{book.insight.quotes[0]}&rdquo;
          </p>
        )}
      </div>
    </BookLink>
  );
}

async function saveAsCollection(clusterName: string, bookIds: string[]) {
  const res = await fetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: clusterName }),
  });
  if (!res.ok) return;
  const collection = await res.json();
  // Add books to the collection
  for (const bookId of bookIds) {
    await fetch(`/api/collections/${collection.id}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book_id: bookId }),
    });
  }
  return collection;
}

export default function ConnectionsPage() {
  const [clusters, setClusters] = useState<ExploreCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCluster, setSavingCluster] = useState<string | null>(null);
  const [savedClusters, setSavedClusters] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/explore")
      .then((r) => r.json())
      .then((data: ExploreCluster[]) => {
        setClusters(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSaveAsCollection(cluster: ExploreCluster) {
    const key = cluster.clusterName;
    setSavingCluster(key);
    const bookIds = [
      cluster.heroBook.id,
      ...cluster.compactBooks.map((b) => b.id),
    ];
    await saveAsCollection(cluster.clusterName, bookIds);
    setSavedClusters((prev) => new Set(prev).add(key));
    setSavingCluster(null);
  }

  return (
    <div className="max-w-[900px] mx-auto px-6 py-12 md:py-16">
      {/* Header */}
      <header className="text-center mb-16">
        <h1 className="font-serif text-4xl font-bold tracking-wide mb-2">Connections</h1>
        <p className="font-sans text-sm text-warm-gray tracking-[0.08em] uppercase font-medium">
          Themes and patterns across your library
        </p>
        <div className="w-[60px] h-0.5 bg-warm-gray mx-auto mt-5" />
      </header>

      {/* Content */}
      {loading ? (
        <div className="space-y-16">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-warm-border rounded w-40 mb-3" />
              <div className="h-7 bg-warm-border rounded w-64 mb-8" />
              <div className="flex gap-10">
                <div className="w-[250px] h-[375px] bg-warm-border rounded shrink-0 hidden md:block" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-warm-border rounded w-3/4" />
                  <div className="h-4 bg-warm-border rounded w-1/2" />
                  <div className="h-20 bg-warm-border rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : clusters.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-10 h-10 mx-auto text-warm-gray mb-3" />
          <p className="text-warm-gray font-sans">
            No insights yet. Generate insights on a book&apos;s detail page to see them here.
          </p>
        </div>
      ) : (
        <div>
          {clusters.map((cluster, idx) => {
            const accent = ACCENT_CLASSES[idx % ACCENT_CLASSES.length];
            const isSaved = savedClusters.has(cluster.clusterName);
            const isSaving = savingCluster === cluster.clusterName;
            return (
              <div key={cluster.clusterName + idx}>
                {/* Divider between clusters */}
                {idx > 0 && (
                  <div className="flex items-center gap-5 my-14 text-warm-border">
                    <span className="flex-1 h-px bg-warm-border" />
                    <span className="text-sm text-warm-gray/50">&#9830;</span>
                    <span className="flex-1 h-px bg-warm-border" />
                  </div>
                )}

                {/* Cluster */}
                <section>
                  {/* Header */}
                  <div className="mb-10">
                    <p className="font-sans text-xs font-semibold tracking-[0.16em] uppercase text-warm-gray mb-2">
                      Thematic Collection
                    </p>
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="font-serif text-[28px] font-bold mb-3">
                        {cluster.clusterName}
                      </h2>
                      <div className="flex items-center gap-3 shrink-0 mt-1">
                        <button
                          onClick={() => handleSaveAsCollection(cluster)}
                          disabled={isSaving || isSaved}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-warm-border rounded-sm font-sans text-xs font-medium text-warm-gray hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          {isSaved ? "Saved" : isSaving ? "Saving..." : "Save as Collection"}
                        </button>
                        <Link
                          href={`/discover?topic=${encodeURIComponent(cluster.clusterName)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-warm-border rounded-sm font-sans text-xs font-medium text-warm-gray hover:text-foreground hover:border-foreground/30 transition-colors"
                        >
                          Find more like this
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                    <div className="h-px bg-warm-border" />
                  </div>

                  {/* Hero */}
                  <HeroCard book={cluster.heroBook} accent={accent} />

                  {/* Compact cards */}
                  {cluster.compactBooks.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cluster.compactBooks.map((book) => (
                        <CompactCard key={book.id} book={book} />
                      ))}
                    </div>
                  )}

                  {/* Suggested books */}
                  {cluster.suggestedBooks?.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {cluster.suggestedBooks.map((sb) => (
                        <SuggestedBookCard
                          key={`${sb.title}-${sb.authors[0] ?? ""}`}
                          book={sb}
                          variant="compact"
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
