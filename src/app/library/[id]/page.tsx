"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { BookCover } from "@/components/book-cover";
import { ArrowLeft, Star, ExternalLink, Trash2, Heart } from "lucide-react";
import type { Book, BookStatus, BookCategory } from "@/types/database";
import { BOOK_CATEGORIES } from "@/types/database";

const statusLabels: Record<BookStatus, string> = {
  want_to_read: "Want to Read",
  reading: "Reading",
  read: "Read",
};

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchBook() {
      const res = await fetch(`/api/books/${id}`);
      if (res.ok) {
        setBook(await res.json());
      }
      setIsLoading(false);
    }
    fetchBook();
  }, [id]);

  async function updateBook(updates: Partial<Book>) {
    if (!book) return;
    setBook({ ...book, ...updates });
    const res = await fetch(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setBook(await res.json());
    }
  }

  async function deleteBook() {
    if (!book) return;
    setIsDeleting(true);
    const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
    } else {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
        <div className="flex flex-col gap-8 sm:flex-row">
          <div className="shrink-0 rounded-lg bg-muted" style={{ width: 200, height: 300 }} />
          <div className="flex flex-1 flex-col gap-4">
            <div className="h-7 w-3/4 rounded bg-muted" />
            <div className="h-5 w-1/2 rounded bg-muted" />
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 w-24 rounded-sm bg-muted" />
              ))}
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-5 w-5 rounded bg-muted" />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="py-20 text-center">
        <p className="text-warm-gray">Book not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-in fade-in duration-300">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 font-sans text-sm text-warm-gray hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </button>

        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="font-sans text-sm text-warm-gray">Delete this book?</span>
            <button
              onClick={deleteBook}
              disabled={isDeleting}
              className="rounded-sm bg-destructive px-3 py-1.5 font-sans text-sm font-medium text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Yes, delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-sm border border-warm-border px-3 py-1.5 font-sans text-sm font-medium transition-colors hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm text-warm-gray transition-colors hover:text-burgundy"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>

      <div className="flex flex-col gap-8 sm:flex-row">
        <div className="shrink-0">
          <BookCover
            title={book.title}
            coverUrl={book.cover_image_url}
            size="lg"
          />
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div>
            <div className="flex items-start gap-2">
              <h1 className="font-serif text-3xl font-semibold">{book.title}</h1>
              <button
                onClick={() => updateBook({ is_favorite: !book.is_favorite })}
                className="mt-1.5 shrink-0 p-0.5"
              >
                <Heart
                  className={`h-5 w-5 transition-colors ${
                    book.is_favorite
                      ? "fill-amber text-amber"
                      : "text-warm-gray hover:text-amber"
                  }`}
                />
              </button>
            </div>
            {book.subtitle && (
              <p className="font-serif text-lg italic text-warm-gray">{book.subtitle}</p>
            )}
            <p className="mt-1 font-sans text-base text-warm-gray">
              {book.authors.join(", ")}
            </p>
          </div>

          {/* Status toggle */}
          <div className="flex items-center gap-1 rounded-sm border border-warm-border p-1 w-fit">
            {(Object.keys(statusLabels) as BookStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => updateBook({ status })}
                className={`rounded-sm px-3 py-1.5 font-sans text-sm font-medium transition-colors ${
                  book.status === status
                    ? "bg-foreground text-background"
                    : "text-warm-gray hover:text-foreground"
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>

          {/* Rating */}
          <div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => updateBook({ rating: n === book.rating ? null : n })}
                  className="p-0.5"
                >
                  <Star
                    className={`h-5 w-5 ${
                      n <= (book.rating ?? 0)
                        ? "fill-amber text-amber"
                        : "text-warm-border"
                    }`}
                  />
                </button>
              ))}
            </div>
            {book.external_rating != null && (
              <p className="mt-1 font-sans text-xs text-warm-gray">
                Goodreads: {book.external_rating}/5
              </p>
            )}
          </div>

          {/* Category selector */}
          <div>
            <select
              value={book.category ?? ""}
              onChange={(e) =>
                updateBook({
                  category: (e.target.value || null) as BookCategory | null,
                })
              }
              className="border border-warm-border bg-background font-sans text-sm rounded-sm px-3 py-1.5"
            >
              <option value="">No category</option>
              {BOOK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Google Books category tags */}
          <div className="flex flex-wrap gap-2">
            {book.categories.map((cat) => (
              <span
                key={cat}
                className="rounded-sm bg-secondary px-3 py-1 text-xs text-warm-gray"
              >
                {cat}
              </span>
            ))}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-sans text-sm">
            {book.page_count && (
              <>
                <dt className="text-warm-gray">Pages</dt>
                <dd className="text-foreground">{book.page_count}</dd>
              </>
            )}
            {book.publisher && (
              <>
                <dt className="text-warm-gray">Publisher</dt>
                <dd className="text-foreground">{book.publisher}</dd>
              </>
            )}
            {book.published_date && (
              <>
                <dt className="text-warm-gray">Published</dt>
                <dd className="text-foreground">{book.published_date}</dd>
              </>
            )}
            {book.language && (
              <>
                <dt className="text-warm-gray">Language</dt>
                <dd className="text-foreground">{book.language.toUpperCase()}</dd>
              </>
            )}
          </dl>

          {book.amazon_link && (
            <a
              href={book.amazon_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-sm bg-amber px-4 py-2 font-sans text-sm font-medium text-amber-foreground transition-colors hover:bg-amber/90"
            >
              View on Amazon
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {book.description && (
            <div className="border-t border-warm-border pt-4">
              <h2 className="mb-2 font-serif text-sm font-semibold">Description</h2>
              <p className="font-sans text-sm leading-relaxed text-warm-gray">
                {book.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
