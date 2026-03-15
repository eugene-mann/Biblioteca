"use client";

import { Plus } from "lucide-react";

interface AddBookCardProps {
  onClick: () => void;
}

export function AddBookCard({ onClick }: AddBookCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-2 p-1"
    >
      <div
        className="flex aspect-[2/3] w-full items-center justify-center rounded-sm border border-warm-border bg-background/60 transition-colors group-hover:border-amber/50 group-hover:bg-amber/5"
        style={{ minHeight: 192 }}
      >
        <div className="flex flex-col items-center gap-2 text-warm-gray transition-colors group-hover:text-amber">
          <Plus className="h-8 w-8" strokeWidth={1.5} />
          <span className="font-sans text-xs uppercase tracking-wider">
            Add Book
          </span>
        </div>
      </div>
    </button>
  );
}
