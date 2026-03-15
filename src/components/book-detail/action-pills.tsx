"use client";

import { useState, useRef, useEffect } from "react";
import { Star, Heart, ChevronDown } from "lucide-react";
import { CollectionManager } from "@/components/collection-manager";
import type { Book, BookStatus, BookCategory } from "@/types/database";
import { BOOK_CATEGORIES } from "@/types/database";

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

interface ActionPillsProps {
  book: Book;
  onUpdate: (updates: Partial<Book>) => void;
}

function Dropdown({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className="absolute left-0 z-20 mt-1 min-w-[160px] rounded-sm border border-warm-border bg-card p-1 shadow-lg">
          {children(() => setIsOpen(false))}
        </div>
      )}
    </div>
  );
}

export function ActionPills({ book, onUpdate }: ActionPillsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status pill */}
      <Dropdown
        trigger={
          <button className="flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 font-sans text-xs font-medium text-background transition-colors hover:bg-foreground/90">
            {STATUS_LABELS[book.status]}
            <ChevronDown className="h-3 w-3" />
          </button>
        }
      >
        {(close) => (
          <>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onUpdate({ status: opt.value });
                  close();
                }}
                className={`flex w-full items-center rounded-sm px-3 py-1.5 text-left text-xs transition-colors hover:bg-secondary ${
                  book.status === opt.value ? "font-semibold text-foreground" : "text-warm-gray"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </>
        )}
      </Dropdown>

      {/* Rating pill */}
      <div className="flex items-center gap-1 rounded-full border border-warm-border px-3 py-1">
        {book.external_rating != null && (
          <>
            <Star className="h-3 w-3 fill-amber text-amber" />
            <span className="font-sans text-xs text-foreground">{book.external_rating}</span>
            <span className="mx-1 text-warm-border">|</span>
          </>
        )}
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onUpdate({ rating: n === book.rating ? null : n })}
              className="p-0"
            >
              <Star
                className={`h-3 w-3 ${
                  n <= (book.rating ?? 0)
                    ? "fill-amber text-amber"
                    : "text-warm-border"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Category chip */}
      <Dropdown
        trigger={
          <button className="rounded-full bg-amber/15 px-3.5 py-1.5 font-sans text-xs font-medium text-amber transition-colors hover:bg-amber/25">
            {book.category || "Category"}
            <ChevronDown className="ml-1 inline h-3 w-3" />
          </button>
        }
      >
        {(close) => (
          <div className="max-h-60 overflow-y-auto">
            <button
              onClick={() => {
                onUpdate({ category: null as unknown as BookCategory });
                close();
              }}
              className={`flex w-full items-center rounded-sm px-3 py-1.5 text-left text-xs transition-colors hover:bg-secondary ${
                !book.category ? "font-semibold text-foreground" : "text-warm-gray"
              }`}
            >
              No category
            </button>
            {BOOK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  onUpdate({ category: cat });
                  close();
                }}
                className={`flex w-full items-center rounded-sm px-3 py-1.5 text-left text-xs transition-colors hover:bg-secondary ${
                  book.category === cat ? "font-semibold text-foreground" : "text-warm-gray"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </Dropdown>

      {/* Collection pills */}
      <CollectionManager bookId={book.id} />

      {/* Favorite heart */}
      <button
        onClick={() => onUpdate({ is_favorite: !book.is_favorite })}
        className="rounded-full p-1.5 transition-colors hover:bg-secondary"
      >
        <Heart
          className={`h-4 w-4 ${
            book.is_favorite
              ? "fill-amber text-amber"
              : "text-warm-gray hover:text-amber"
          }`}
        />
      </button>
    </div>
  );
}
