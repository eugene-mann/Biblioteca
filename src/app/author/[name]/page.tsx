"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookGrid, BookGridSkeleton } from "@/components/book-grid";
import type { Book } from "@/types/database";

export default function AuthorPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const authorName = decodeURIComponent(name);
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBooks() {
      const res = await fetch(`/api/authors/${encodeURIComponent(authorName)}/books`);
      if (res.ok) {
        setBooks(await res.json());
      }
      setIsLoading(false);
    }
    fetchBooks();
  }, [authorName]);

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in duration-300">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 font-sans text-sm text-warm-gray hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </button>

      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold">{authorName}</h1>
        {!isLoading && (
          <p className="mt-1 text-sm tracking-[0.12em] text-warm-gray">
            {books.length} {books.length === 1 ? "volume" : "volumes"} in your library
          </p>
        )}
      </div>

      {isLoading ? (
        <BookGridSkeleton />
      ) : books.length === 0 ? (
        <p className="py-12 text-center font-sans text-sm text-warm-gray">
          No books by this author in your library.
        </p>
      ) : (
        <BookGrid books={books} />
      )}
    </div>
  );
}
