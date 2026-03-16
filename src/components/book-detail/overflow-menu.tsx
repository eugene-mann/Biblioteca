"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Heart, Tag, FolderPlus, Trash2 } from "lucide-react";
import type { Book, BookCategory } from "@/types/database";
import { BOOK_CATEGORIES } from "@/types/database";

interface OverflowMenuProps {
  book: Book;
  onUpdate: (updates: Partial<Book>) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function OverflowMenu({ book, onUpdate, onDelete, isDeleting }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCategories(false);
        setConfirmDelete(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  function handleToggle() {
    setIsOpen(!isOpen);
    setShowCategories(false);
    setConfirmDelete(false);
  }

  function handleCategorySelect(category: BookCategory | null) {
    onUpdate({ category: category as BookCategory });
    setShowCategories(false);
    setIsOpen(false);
  }

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleToggle}
        className="rounded-full p-2 transition-colors hover:bg-accent"
      >
        <MoreHorizontal className="h-5 w-5 text-warm-gray" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] bg-card border border-warm-border rounded-lg shadow-lg py-1">
          {/* Category */}
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="flex w-full items-center gap-2.5 px-3 py-2 font-sans text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <Tag className="h-4 w-4 text-warm-gray" />
            <span className="flex-1 text-left">Category</span>
            <span className="text-xs text-warm-gray">{book.category || "None"}</span>
          </button>
          {showCategories && (
            <div className="max-h-48 overflow-y-auto border-t border-b border-warm-border my-1">
              <button
                onClick={() => handleCategorySelect(null)}
                className={`flex w-full items-center px-8 py-1.5 text-left text-xs transition-colors hover:bg-secondary ${
                  !book.category ? "font-semibold text-foreground" : "text-warm-gray"
                }`}
              >
                No category
              </button>
              {BOOK_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`flex w-full items-center px-8 py-1.5 text-left text-xs transition-colors hover:bg-secondary ${
                    book.category === cat ? "font-semibold text-foreground" : "text-warm-gray"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Collections */}
          <button
            onClick={() => {
              setIsOpen(false);
              // Trigger collection manager — parent should handle this
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 font-sans text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <FolderPlus className="h-4 w-4 text-warm-gray" />
            <span className="flex-1 text-left">Add to Collection</span>
          </button>

          {/* Favorite */}
          <button
            onClick={() => {
              onUpdate({ is_favorite: !book.is_favorite });
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 font-sans text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <Heart
              className={`h-4 w-4 ${
                book.is_favorite ? "fill-amber text-amber" : "text-warm-gray"
              }`}
            />
            <span className="flex-1 text-left">
              {book.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
            </span>
          </button>

          {/* Divider */}
          <div className="border-t border-warm-border my-1" />

          {/* Delete */}
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="flex w-full items-center gap-2.5 px-3 py-2 font-sans text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span className="flex-1 text-left">
              {isDeleting
                ? "Deleting..."
                : confirmDelete
                  ? "Confirm delete?"
                  : "Delete Book"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
