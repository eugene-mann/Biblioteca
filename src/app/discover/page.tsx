"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { BookCover } from "@/components/book-cover";
import { SuggestedBookCard } from "@/components/suggested-book-card";
import { RefreshCw, ExternalLink, Plus, X, Sparkles } from "lucide-react";
import type { SuggestedBook } from "@/types/database";

const VISIBLE_COUNT = 7;

interface Recommendation {
  title: string;
  authors: string[];
  reasoning: string;
  inspired_by: string[];
  cover_image_url: string | null;
  isbn: string | null;
  amazon_link: string | null;
}

interface Topics {
  library: string[];
  curated: string[];
}

export default function DiscoverPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [topics, setTopics] = useState<Topics>({ library: [], curated: [] });
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingTitle, setAddingTitle] = useState<string | null>(null);
  const [dismissedTitles, setDismissedTitles] = useState<Set<string>>(new Set());
  const [emptyLibrary, setEmptyLibrary] = useState(false);
  const [freeformPrompt, setFreeformPrompt] = useState("");
  const [suggestedBooks, setSuggestedBooks] = useState<SuggestedBook[]>([]);
  // Pool: all recs from LLM. We show VISIBLE_COUNT, rest are backfill.
  const [recPool, setRecPool] = useState<Recommendation[]>([]);
  const recPoolRef = useRef<Recommendation[]>([]);

  // Load topics and suggested books on mount
  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch("/api/recommendations?topics_only=true");
        const data = await res.json();
        if (data.message) {
          setEmptyLibrary(true);
        }
        if (data.topics) {
          setTopics(data.topics);
        }
      } catch {
        // Non-critical — topics will just be empty
      }
      setIsLoadingTopics(false);
    }
    async function fetchSuggested() {
      try {
        const res = await fetch("/api/explore");
        if (!res.ok) return;
        const clusters = await res.json();
        if (!Array.isArray(clusters)) return;
        // Flatten and deduplicate suggested books from all clusters
        const seen = new Set<string>();
        const all: SuggestedBook[] = [];
        for (const cluster of clusters) {
          for (const sb of cluster.suggestedBooks ?? []) {
            const key = sb.title.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              all.push(sb);
            }
          }
        }
        setSuggestedBooks(all);
      } catch {
        // Non-critical
      }
    }
    fetchTopics();
    fetchSuggested();
  }, []);

  // Hydrate a single rec's cover in the background
  async function hydrateRec(rec: Recommendation) {
    try {
      const params = new URLSearchParams({ title: rec.title, author: rec.authors[0] ?? "" });
      const res = await fetch(`/api/recommendations/hydrate?${params}`);
      if (res.ok) {
        const data = await res.json();
        const updater = (r: Recommendation) =>
          r.title === rec.title
            ? { ...r, cover_image_url: data.cover_image_url, isbn: data.isbn, amazon_link: data.amazon_link ?? r.amazon_link }
            : r;
        setRecPool((prev) => {
          const updated = prev.map(updater);
          recPoolRef.current = updated;
          return updated;
        });
        setRecommendations((prev) =>
          prev.map((r) =>
            r.title === rec.title
              ? { ...r, cover_image_url: data.cover_image_url, isbn: data.isbn, amazon_link: data.amazon_link ?? r.amazon_link }
              : r
          )
        );
      }
    } catch {
      // silent
    }
  }

  async function fetchRecommendations(topic?: string | null, prompt?: string) {
    setIsLoading(true);
    setError(null);
    setDismissedTitles(new Set());
    setRecommendations([]);
    setRecPool([]);
    recPoolRef.current = [];

    try {
      const params = new URLSearchParams();
      if (topic) params.set("topic", topic);
      if (prompt) params.set("prompt", prompt);
      const res = await fetch(`/api/recommendations?${params}`);

      // Non-streaming fallback (topics_only, empty library)
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.error) setError(data.error);
        if (data.topics) setTopics(data.topics);
        if (data.message) setEmptyLibrary(true);
        setIsLoading(false);
        return;
      }

      // Streaming response — read line by line
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const seen = new Set<string>();
      const allRecs: Recommendation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "topics") {
              setTopics(msg.data);
            } else if (msg.type === "rec" && msg.data) {
              const rec: Recommendation = msg.data;
              if (seen.has(rec.title)) continue;
              seen.add(rec.title);
              // Append to pool using functional updates to preserve hydrated covers
              setRecPool((prev) => {
                const updated = [...prev, rec];
                recPoolRef.current = updated;
                return updated;
              });
              // Append to visible recs (up to VISIBLE_COUNT) without clobbering hydrated covers
              setRecommendations((prev) =>
                prev.length < VISIBLE_COUNT ? [...prev, rec] : prev
              );
              // Stop showing loading skeleton after first rec
              setIsLoading(false);
              // Hydrate cover in background
              hydrateRec(rec);
            } else if (msg.type === "done") {
              // Stream complete
            } else if (msg.error) {
              setError(msg.error);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch {
      setError("Failed to load recommendations. Please try again.");
    }
    setIsLoading(false);
  }

  async function addToLibrary(rec: Recommendation) {
    setAddingTitle(rec.title);
    try {
      const res = await fetch("/api/books/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: rec.title,
          authors: rec.authors,
          cover_image_url: rec.cover_image_url,
          isbn_13: rec.isbn,
          amazon_link: rec.amazon_link,
          categories: [],
          source: "manual",
          status: "want_to_read",
          rating: null,
        }),
      });
      if (res.ok) {
        dismiss(rec.title);
      }
    } catch {
      // Silent fail
    }
    setAddingTitle(null);
  }

  function dismiss(title: string) {
    setDismissedTitles((prev) => new Set(prev).add(title));
    // Replenish from pool using ref to avoid stale closures
    setRecommendations((recs) => {
      const shownTitles = new Set(recs.map((r) => r.title));
      shownTitles.add(title);
      const backfill = recPoolRef.current.find(
        (r) => !shownTitles.has(r.title)
      );
      return backfill ? [...recs, backfill] : recs;
    });
  }

  // Shuffle library + curated topics together, cap to ~3 rows (~15 chips)
  const shuffledTopics = useMemo(() => {
    const all = [...topics.library, ...topics.curated];
    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 15);
  }, [topics.library, topics.curated]);

  const visibleRecs = recommendations.filter((r) => !dismissedTitles.has(r.title));

  if (emptyLibrary && !isLoading && recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Sparkles className="h-16 w-16 text-warm-gray/50" />
        <div>
          <h1 className="font-serif text-3xl font-semibold">Discover</h1>
          <p className="font-sans text-sm text-warm-gray">
            Add some books to your library first, then come back for personalized recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Discover</h1>
          <p className="mt-1 font-sans text-sm text-warm-gray">
            AI-powered recommendations based on your library
          </p>
        </div>
        <button
          onClick={() => fetchRecommendations(selectedTopic, freeformPrompt || undefined)}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 font-sans text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {recommendations.length === 0 ? "Get Recommendations" : "Refresh"}
        </button>
      </div>

      {/* Topic chips — shuffled mix of library + curated, 3 rows */}
      {!isLoadingTopics && (topics.library.length > 0 || topics.curated.length > 0) && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedTopic(null);
                if (recommendations.length > 0) fetchRecommendations(null, freeformPrompt || undefined);
              }}
              className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedTopic === null
                  ? "bg-amber text-amber-foreground"
                  : "border border-warm-border text-warm-gray hover:text-foreground"
              }`}
            >
              For You
            </button>
            {shuffledTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => {
                  setSelectedTopic(topic);
                  if (recommendations.length > 0) fetchRecommendations(topic, freeformPrompt || undefined);
                }}
                className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedTopic === topic
                    ? "bg-amber text-amber-foreground"
                    : "border border-warm-border text-warm-gray hover:text-foreground"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Free-form prompt input */}
      {!isLoadingTopics && (
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-warm-border" />
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-warm-gray">
              or describe what you want
            </span>
            <div className="h-px flex-1 bg-warm-border" />
          </div>
          <div className="relative">
            <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-gray" />
            <input
              type="text"
              value={freeformPrompt}
              onChange={(e) => setFreeformPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && freeformPrompt.trim()) {
                  fetchRecommendations(selectedTopic, freeformPrompt);
                }
              }}
              placeholder='e.g. "Books about the fall of civilizations"'
              className="w-full rounded-sm border border-warm-border bg-card py-3 pl-10 pr-4 font-serif text-sm italic outline-none transition-colors placeholder:text-warm-gray/60 focus:border-amber focus:ring-0"
            />
          </div>
        </div>
      )}

      {/* Suggested books from insights — zero state */}
      {!isLoading && !error && recommendations.length === 0 && suggestedBooks.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-warm-border" />
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-warm-gray">
              Books you might enjoy
            </span>
            <div className="h-px flex-1 bg-warm-border" />
          </div>
          <div className="flex flex-col gap-4">
            {suggestedBooks.map((sb) => (
              <SuggestedBookCard
                key={`${sb.title}-${sb.authors[0] ?? ""}`}
                book={sb}
                variant="compact"
              />
            ))}
          </div>
        </div>
      )}

      {/* Loading state — skeleton cards */}
      {isLoading && (
        <div className="mt-8 space-y-6">
          <p className="text-center font-sans text-sm text-warm-gray">
            Finding books you&apos;ll love...
          </p>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-sm border border-warm-border bg-card p-6 animate-pulse shadow-sm"
            >
              <div
                className="shrink-0 rounded-sm bg-muted"
                style={{ width: 128, height: 192 }}
              />
              <div className="flex flex-1 flex-col gap-3">
                <div className="h-5 w-2/3 rounded-sm bg-muted" />
                <div className="h-4 w-1/3 rounded-sm bg-muted" />
                <div className="space-y-2">
                  <div className="h-3.5 w-full rounded-sm bg-muted" />
                  <div className="h-3.5 w-5/6 rounded-sm bg-muted" />
                  <div className="h-3.5 w-2/3 rounded-sm bg-muted" />
                </div>
                <div className="mt-auto flex gap-2 pt-2">
                  <div className="h-8 w-28 rounded-sm bg-muted" />
                  <div className="h-8 w-20 rounded-sm bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="mt-8 rounded-sm border border-destructive/30 bg-destructive/5 p-4 text-center">
          <p className="font-sans text-sm text-destructive">{error}</p>
          <button
            onClick={() => fetchRecommendations(selectedTopic)}
            className="mt-2 font-sans text-sm font-medium text-foreground underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Recommendations */}
      {!isLoading && !error && visibleRecs.length > 0 && (
        <div className="mt-8 space-y-6 animate-in fade-in duration-300">
          {visibleRecs.map((rec) => (
            <div
              key={rec.title}
              className="flex gap-4 rounded-sm border border-warm-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <div className="shrink-0">
                <BookCover
                  title={rec.title}
                  coverUrl={rec.cover_image_url}
                  size="md"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div>
                  <h3 className="font-serif text-lg font-semibold">{rec.title}</h3>
                  <p className="font-sans text-sm text-warm-gray">
                    {rec.authors.join(", ")}
                  </p>
                </div>
                <p className="font-sans text-sm italic leading-relaxed text-warm-gray">
                  {rec.reasoning}
                </p>
                {rec.inspired_by.length > 0 && (
                  <p className="text-xs uppercase tracking-wider text-warm-gray">
                    Inspired by:{" "}
                    <span className="font-medium normal-case tracking-normal text-foreground">
                      {rec.inspired_by.join(", ")}
                    </span>
                  </p>
                )}
                <div className="mt-auto flex items-center gap-2 pt-2">
                  <button
                    onClick={() => addToLibrary(rec)}
                    disabled={addingTitle === rec.title}
                    className="flex items-center gap-1.5 rounded-sm bg-amber px-3 py-1.5 font-sans text-sm font-medium text-amber-foreground transition-colors hover:bg-amber/90 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {addingTitle === rec.title ? "Adding..." : "Add to Library"}
                  </button>
                  {rec.amazon_link && (
                    <a
                      href={rec.amazon_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-sm border border-warm-border px-3 py-1.5 font-sans text-sm font-medium text-warm-gray transition-colors hover:text-foreground"
                    >
                      Amazon
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <button
                    onClick={() => dismiss(rec.title)}
                    className="ml-auto rounded-sm p-1.5 text-warm-gray transition-colors hover:bg-burgundy/10 hover:text-burgundy"
                    title="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state after generation */}
      {!isLoading && !error && recommendations.length > 0 && visibleRecs.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20">
          <p className="font-serif text-lg text-warm-gray">
            All recommendations dismissed.
          </p>
          <button
            onClick={() => fetchRecommendations(selectedTopic, freeformPrompt || undefined)}
            className="font-sans text-sm font-medium underline"
          >
            Get fresh recommendations
          </button>
        </div>
      )}
    </div>
  );
}
