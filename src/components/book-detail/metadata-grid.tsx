"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import type { Book, BookSource } from "@/types/database";

interface MetadataGridProps {
  book: Book;
  onDelete: () => void;
  isDeleting: boolean;
}

const SOURCE_LABELS: Record<BookSource, string> = {
  manual: "Manual",
  csv: "CSV Import",
  kindle: "Kindle Import",
  search: "Search",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function MetadataGrid({ book, onDelete, isDeleting }: MetadataGridProps) {
  const fields: [string, string | null][] = [
    ["Pages", book.page_count?.toString() ?? null],
    ["Publisher", book.publisher],
    ["Published", book.published_date],
    ["Language", book.language?.toUpperCase() ?? null],
    ["Added", formatDate(book.date_added)],
    ["Source", SOURCE_LABELS[book.source] ?? book.source],
    ["ISBN", book.isbn_13 || book.isbn_10 || null],
    ["Started", book.date_started ? formatDate(book.date_started) : null],
    ["Finished", book.date_finished ? formatDate(book.date_finished) : null],
  ].filter(([, val]) => val != null) as [string, string][];

  return (
    <div>
      <h2 className="mb-3 font-serif text-lg font-semibold">Details</h2>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 font-sans text-sm">
        {fields.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between">
            <dt className="text-warm-gray">{label}</dt>
            <dd className="text-right text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-center gap-3">
        {book.amazon_link && (
          <a
            href={book.amazon_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 font-sans text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            View on Amazon
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-2 rounded-sm border border-destructive px-4 py-2 font-sans text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {isDeleting ? "Deleting..." : "Delete Book"}
        </button>
      </div>
    </div>
  );
}
