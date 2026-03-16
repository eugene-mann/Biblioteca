"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import type { Book, BookSource } from "@/types/database";

interface MetadataGridProps {
  book: Book;
}

const SOURCE_LABELS: Record<BookSource, string> = {
  manual: "Manual",
  csv: "CSV Import",
  kindle: "Kindle Import",
  search: "Search",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
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

export function MetadataGrid({ book }: MetadataGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Summary fields always visible
  const summaryFields: [string, string | null][] = [
    ["Pages", book.page_count?.toString() ?? null],
    ["Published", book.published_date],
  ].filter(([, val]) => val != null) as [string, string][];

  // Extended fields visible when expanded
  const extendedFields: [string, string | null][] = [
    ["Publisher", book.publisher],
    ["Language", book.language?.toUpperCase() ?? null],
    ["Added", formatDate(book.date_added)],
    ["Source", SOURCE_LABELS[book.source] ?? book.source],
    ["ISBN", book.isbn_13 || book.isbn_10 || null],
    ["Started", book.date_started ? formatDate(book.date_started) : null],
    ["Finished", book.date_finished ? formatDate(book.date_finished) : null],
  ].filter(([, val]) => val != null) as [string, string][];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-lg font-semibold">Details</h2>
        {extendedFields.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 font-sans text-xs text-warm-gray transition-colors hover:text-foreground"
          >
            {isExpanded ? "Hide details" : "Show details"}
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 font-sans text-sm">
        {summaryFields.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between">
            <dt className="text-warm-gray">{label}</dt>
            <dd className="text-right text-foreground">{value}</dd>
          </div>
        ))}
        {isExpanded &&
          extendedFields.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between">
              <dt className="text-warm-gray">{label}</dt>
              <dd className="text-right text-foreground">{value}</dd>
            </div>
          ))}
      </dl>

      {book.amazon_link && (
        <div className="mt-4">
          <a
            href={book.amazon_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 font-sans text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            View on Amazon
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
