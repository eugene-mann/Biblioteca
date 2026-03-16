"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, ChevronDown } from "lucide-react";
import { AuthorBooksSection } from "@/components/book-detail/author-books-section";
import { CoverEditor } from "@/components/book-detail/cover-editor";
import { DescriptionSection } from "@/components/book-detail/description-section";
import { DetailTabs } from "@/components/book-detail/detail-tabs";
import { InsightsSection } from "@/components/book-detail/insights-section";
import { MetadataGrid } from "@/components/book-detail/metadata-grid";
import { NotesTab } from "@/components/book-detail/notes-tab";
import { OverflowMenu } from "@/components/book-detail/overflow-menu";
import type { Book, BookStatus } from "@/types/database";

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: "want_to_read", label: "Want to Read" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
];

const STATUS_LABELS: Record<BookStatus, string> = {
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
  const [activeTab, setActiveTab] = useState<string>("About");

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
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="mb-6 h-5 w-32 rounded bg-muted" />
        <div className="flex flex-col gap-8 sm:flex-row">
          <div className="shrink-0 rounded-lg bg-muted" style={{ width: 200, height: 300 }} />
          <div className="flex flex-1 flex-col gap-4">
            <div className="h-8 w-3/4 rounded bg-muted" />
            <div className="h-5 w-1/2 rounded bg-muted" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-7 w-20 rounded-full bg-muted" />
              ))}
            </div>
            <div className="space-y-2 pt-4">
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
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-amber/5 to-transparent rounded-xl p-6 sm:p-8 mb-8">
        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          className="mb-5 flex items-center gap-1.5 font-sans text-xs text-warm-gray hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
          {/* Cover */}
          <div className="shrink-0 self-start">
            <CoverEditor book={book} onUpdate={updateBook} />
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col gap-3">
            {/* Title */}
            <h1 className="font-serif text-3xl font-bold leading-tight sm:text-4xl">
              {book.title}
            </h1>

            {/* Subtitle */}
            {book.subtitle && (
              <p className="font-sans text-base text-warm-gray italic">{book.subtitle}</p>
            )}

            {/* Author(s) */}
            <p className="font-sans text-lg text-warm-gray">
              by{" "}
              {book.authors.map((author, i) => (
                <span key={author}>
                  {i > 0 && ", "}
                  <Link
                    href={`/author/${encodeURIComponent(author)}`}
                    className="text-warm-gray underline decoration-warm-border underline-offset-2 transition-colors hover:text-amber hover:decoration-amber"
                  >
                    {author}
                  </Link>
                </span>
              ))}
            </p>

            {/* Primary Actions Row */}
            <div className="flex items-center gap-3 mt-4">
              {/* Status dropdown */}
              <StatusDropdown
                status={book.status}
                onChange={(status) => updateBook({ status })}
              />

              {/* Star rating */}
              <RatingStars
                rating={book.rating}
                externalRating={book.external_rating}
                onChange={(rating) => updateBook({ rating })}
              />

              {/* Overflow menu */}
              <OverflowMenu
                book={book}
                onUpdate={updateBook}
                onDelete={deleteBook}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <DetailTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === "About" && (
          <div className="space-y-6">
            {book.description && <DescriptionSection description={book.description} />}
            <MetadataGrid book={book} />
          </div>
        )}

        {activeTab === "Insights" && <InsightsSection bookId={book.id} />}

        {activeTab === "Notes" && (
          <NotesTab
            bookId={book.id}
            initialNotes={book.notes}
            bookStatus={book.status}
          />
        )}
      </div>

      {/* More by Author — always visible below tabs */}
      {book.authors.length > 0 && (
        <div className="mt-8">
          <AuthorBooksSection
            authorName={book.authors[0]}
            currentBookId={book.id}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Inline sub-components ─── */

function StatusDropdown({
  status,
  onChange,
}: {
  status: BookStatus;
  onChange: (status: BookStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-full border border-warm-border px-4 py-1.5 font-sans text-sm bg-card transition-colors hover:border-foreground/20"
      >
        {STATUS_LABELS[status]}
        <ChevronDown className="h-3.5 w-3.5 text-warm-gray" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 min-w-[160px] rounded-lg border border-warm-border bg-card p-1 shadow-lg">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center rounded-sm px-3 py-1.5 text-left text-sm transition-colors hover:bg-secondary ${
                  status === opt.value ? "font-semibold text-foreground" : "text-warm-gray"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RatingStars({
  rating,
  externalRating,
  onChange,
}: {
  rating: number | null;
  externalRating: number | null;
  onChange: (rating: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-warm-border px-3 py-1.5 bg-card">
      {externalRating != null && (
        <>
          <Star className="h-3.5 w-3.5 fill-amber text-amber" />
          <span className="font-sans text-xs text-foreground">{externalRating}</span>
          <span className="mx-1 text-warm-border">|</span>
        </>
      )}
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n === rating ? null : n)}
            className="p-0"
          >
            <Star
              className={`h-3.5 w-3.5 ${
                n <= (rating ?? 0) ? "fill-amber text-amber" : "text-warm-border"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
