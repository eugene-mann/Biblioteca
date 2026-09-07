"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { SuggestedBookCard } from "@/components/suggested-book-card";
import { useLibrary } from "@/components/library-provider";
import type { SuggestedBook } from "@/types/database";

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
  const { books, loading: libraryLoading } = useLibrary();
  const [topics, setTopics] = useState<Topics>({ library: [], curated: [] });
  const [topic, setTopic] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [suggested, setSuggested] = useState<SuggestedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(6);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/recommendations?topics_only=true", {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        if (d.topics) setTopics(d.topics);
      })
      .catch(() => {});
    fetch("/api/explore", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((clusters) => {
        if (!Array.isArray(clusters)) return;
        const seen = new Set<string>();
        const results: SuggestedBook[] = [];
        for (const cluster of clusters)
          for (const book of cluster.suggestedBooks ?? []) {
            const key = book.title.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              results.push(book);
            }
          }
        setSuggested(results);
      })
      .catch(() => {});
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, []);
  const choices = useMemo(
    () =>
      [...new Set([...topics.library.slice(0, 6), ...topics.curated])].slice(
        0,
        10,
      ),
    [topics],
  );
  const libraryTitles = useMemo(
    () => new Set(books.map((book) => book.title.toLowerCase())),
    [books],
  );
  const suggestions = suggested.filter(
    (book) => !libraryTitles.has(book.title.toLowerCase()),
  );
  async function hydrate(rec: Recommendation, signal: AbortSignal) {
    try {
      const r = await fetch(
        `/api/recommendations/hydrate?${new URLSearchParams({ title: rec.title, author: rec.authors[0] ?? "" })}`,
        { signal },
      );
      if (!r.ok) return;
      const data = await r.json();
      if (signal.aborted) return;
      setRecommendations((current) =>
        current.map((book) =>
          book.title === rec.title
            ? {
                ...book,
                cover_image_url: data.cover_image_url,
                isbn: data.isbn,
                amazon_link: data.amazon_link ?? book.amazon_link,
              }
            : book,
        ),
      );
    } catch {
      /* Covers are optional; text recommendations remain usable. */
    }
  }
  async function generate() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    setRecommendations([]);
    setDismissed(new Set());
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (prompt.trim()) params.set("prompt", prompt.trim());
    let count = 0;
    try {
      const res = await fetch(`/api/recommendations?${params}`, {
        signal: controller.signal,
      });
      if (!res.ok)
        throw new Error("Recommendations couldn’t load. Please try again.");
      if (res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        throw new Error(
          data.message || data.error || "No recommendations yet.",
        );
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const seen = new Set<string>();
      const consume = (line: string) => {
        if (!line.trim() || controller.signal.aborted) return;
        const message = JSON.parse(line);
        if (message.error)
          throw new Error(
            "Your reading curator is unavailable. Please try again.",
          );
        if (message.type === "rec" && message.data?.title) {
          const rec = message.data as Recommendation;
          if (seen.has(rec.title)) return;
          seen.add(rec.title);
          count++;
          setRecommendations((current) => [...current, rec]);
          void hydrate(rec, controller.signal);
        }
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) consume(line);
      }
      buffer += decoder.decode();
      consume(buffer);
      if (!count)
        throw new Error("No recommendations arrived. Try another topic.");
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error ? err.message : "Recommendations couldn’t load.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  async function add(rec: Recommendation) {
    if (adding) return;
    setAdding(rec.title);
    setError(null);
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
      if (!res.ok && res.status !== 409) throw new Error();
      setAdded((current) => new Set(current).add(rec.title));
      window.dispatchEvent(new Event("biblioteca:book-added"));
    } catch {
      setError(`“${rec.title}” wasn’t added. Please try again.`);
    } finally {
      setAdding(null);
    }
  }
  const visible = recommendations
    .filter((rec) => !dismissed.has(rec.title))
    .slice(0, 6);
  return (
    <div>
      <header className="room-header">
        <div>
          <p className="eyebrow">For your next chapter</p>
          <h1>
            Follow your curiosity<span>.</span>
          </h1>
          <p className="room-subtitle">
            Thoughtful recommendations, drawn from the books you love.
          </p>
        </div>
        <span className="eyebrow hidden sm:block">Your personal curator</span>
      </header>
      <section
        className="discover-intro"
        aria-label="Personalize recommendations"
      >
        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-amber" />
          <h2 className="font-serif text-xl">What are you in the mood for?</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            aria-label="Describe your next read"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A sweeping history, a new perspective, a book I can’t put down…"
            className="min-w-0 flex-1 rounded-md border border-warm-border bg-card px-4 py-3 text-sm"
          />
          <button
            className="primary-button"
            disabled={loading || libraryLoading || !books.length}
          >
            {loading ? "Finding your next read…" : "Find my next read"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        <div className="discovery-topics">
          <button
            aria-pressed={!topic}
            onClick={() => setTopic(null)}
            className={`quiet-button !py-1 !text-[10px] ${!topic ? "!bg-primary !text-white" : ""}`}
          >
            For you
          </button>
          {choices.map((choice) => (
            <button
              key={choice}
              aria-pressed={topic === choice}
              onClick={() => setTopic(topic === choice ? null : choice)}
              className={`quiet-button !py-1 !text-[10px] ${topic === choice ? "!bg-primary !text-white" : ""}`}
            >
              {choice}
            </button>
          ))}
        </div>
        {!libraryLoading && !books.length && (
          <p className="mt-4 text-sm text-warm-gray">
            Add a few books to your{" "}
            <Link href="/" className="underline">
              library
            </Link>{" "}
            to give your curator a place to start.
          </p>
        )}
      </section>
      {error && (
        <div className="error-panel" role="alert">
          {error}
        </div>
      )}
      {loading && (
        <div
          role="status"
          className="mt-6 flex items-center justify-between text-xs text-warm-gray"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-pulse" />
            {recommendations.length
              ? `${recommendations.length} ideas found. Still exploring…`
              : "Looking for connections in your library…"}
          </span>
          <button
            className="quiet-button"
            onClick={() => {
              request.current?.abort();
              setLoading(false);
            }}
          >
            Stop
          </button>
        </div>
      )}
      {visible.length > 0 && (
        <section className="mt-9" aria-label="Your recommendations">
          <div className="shelf-heading">
            <h2>A few books for you</h2>
            <span className="eyebrow">Selected with your library in mind</span>
          </div>
          <div className="recommendation-grid">
            {visible.map((rec) => (
              <article key={rec.title} className="recommendation-card">
                <div className="shrink-0">
                  <BookCover title={rec.title} coverUrl={rec.cover_image_url} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h3 className="font-serif text-xl leading-snug">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-warm-gray">
                    {rec.authors.join(", ")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-warm-gray">
                    {rec.reasoning}
                  </p>
                  {rec.inspired_by?.length > 0 && (
                    <p className="mt-2 text-[10px] leading-relaxed text-amber">
                      Because you read {rec.inspired_by.join(", ")}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      className="quiet-button !px-2.5 !text-[10px]"
                      onClick={() => void add(rec)}
                      disabled={!!adding || added.has(rec.title)}
                    >
                      {added.has(rec.title) ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      {added.has(rec.title)
                        ? "On your shelf"
                        : adding === rec.title
                          ? "Adding…"
                          : "Want to read"}
                    </button>
                    {rec.amazon_link && (
                      <a
                        href={rec.amazon_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Find ${rec.title} on Amazon`}
                        className="p-2 text-warm-gray"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      className="ml-auto p-2 text-warm-gray"
                      aria-label={`Dismiss ${rec.title}`}
                      onClick={() =>
                        setDismissed((current) =>
                          new Set(current).add(rec.title),
                        )
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {!recommendations.length && !loading && suggestions.length > 0 && (
        <section className="mt-10">
          <div className="shelf-heading">
            <div>
              <p className="eyebrow">From the threads in your library</p>
              <h2>You might find a favorite here.</h2>
            </div>
            <span className="eyebrow hidden sm:block">
              A little serendipity
            </span>
          </div>
          <div className="recommendation-grid">
            {suggestions.slice(0, limit).map((book) => (
              <SuggestedBookCard
                key={book.title}
                book={book}
                variant="compact"
              />
            ))}
          </div>
          {suggestions.length > limit && (
            <div className="shelf-more">
              <button
                className="quiet-button"
                onClick={() => setLimit((n) => n + 6)}
              >
                More to explore <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      )}
      {!!recommendations.length && !visible.length && !loading && (
        <div className="empty-shelf">
          <h2>A different direction?</h2>
          <p>Pick another topic above and find a fresh set of books.</p>
        </div>
      )}
    </div>
  );
}
