"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ActionPills } from "@/components/book-detail/action-pills";
import { AuthorBooksSection } from "@/components/book-detail/author-books-section";
import { CoverEditor } from "@/components/book-detail/cover-editor";
import { DescriptionSection } from "@/components/book-detail/description-section";
import { InsightsSection } from "@/components/book-detail/insights-section";
import { MetadataGrid } from "@/components/book-detail/metadata-grid";
import type { Book } from "@/types/database";

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
      {/* Back navigation */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 font-sans text-sm text-warm-gray hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </button>

      {/* Hero: Cover + Title + Actions */}
      <div className="flex flex-col gap-8 sm:flex-row">
        <CoverEditor book={book} onUpdate={updateBook} />

        <div className="flex flex-1 flex-col gap-4">
          {/* Title block */}
          <div>
            <h1 className="font-serif text-2xl font-semibold leading-tight sm:text-3xl">
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="mt-1 font-sans text-base text-warm-gray">{book.subtitle}</p>
            )}
            <p className="mt-1.5 font-sans text-sm text-warm-gray">
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
          </div>

          {/* Consolidated action pills */}
          <ActionPills book={book} onUpdate={updateBook} />

          {/* Description */}
          {book.description && (
            <div className="pt-2">
              <DescriptionSection description={book.description} />
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="my-8 border-t border-warm-border" />

      {/* Insights & Quotes */}
      <InsightsSection bookId={book.id} />

      {/* More by Author */}
      {book.authors.length > 0 && (
        <div className="mt-6">
          <AuthorBooksSection
            authorName={book.authors[0]}
            currentBookId={book.id}
          />
        </div>
      )}

      {/* Divider */}
      <div className="my-8 border-t border-warm-border" />

      {/* Metadata + Actions */}
      <MetadataGrid book={book} onDelete={deleteBook} isDeleting={isDeleting} />
    </div>
  );
}
