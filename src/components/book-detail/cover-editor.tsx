"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Link, Upload, X } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/types/database";

interface CoverEditorProps {
  book: Book;
  onUpdate: (updates: Partial<Book>) => void;
}

export function CoverEditor({ book, onUpdate }: CoverEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  async function handleUrlSave() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onUpdate({ cover_image_url: trimmed });
    setUrlInput("");
    setIsOpen(false);
  }

  async function handleFileUpload(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/books/${book.id}/cover`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const updated = await res.json();
        onUpdate({ cover_image_url: updated.cover_image_url });
        setIsOpen(false);
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="relative shrink-0" ref={popoverRef}>
      <div
        className="group relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <BookCover title={book.title} coverUrl={book.cover_image_url} size="lg" />
        <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/0 transition-colors group-hover:bg-black/40">
          <Camera className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-sm border border-warm-border bg-card p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-sans text-xs font-medium uppercase tracking-wider text-warm-gray">
              Update Cover
            </span>
            <button onClick={() => setIsOpen(false)} className="text-warm-gray hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="mb-3 flex gap-1 rounded-sm border border-warm-border p-0.5">
            <button
              onClick={() => setMode("url")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1 text-xs transition-colors ${
                mode === "url" ? "bg-foreground text-background" : "text-warm-gray hover:text-foreground"
              }`}
            >
              <Link className="h-3 w-3" />
              URL
            </button>
            <button
              onClick={() => setMode("upload")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1 text-xs transition-colors ${
                mode === "upload" ? "bg-foreground text-background" : "text-warm-gray hover:text-foreground"
              }`}
            >
              <Upload className="h-3 w-3" />
              Upload
            </button>
          </div>

          {mode === "url" ? (
            <div className="space-y-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUrlSave();
                }}
                placeholder="Paste image URL..."
                className="w-full rounded-sm border border-warm-border bg-background px-2.5 py-1.5 font-sans text-xs focus:border-amber focus:outline-none"
              />
              <button
                onClick={handleUrlSave}
                disabled={!urlInput.trim()}
                className="w-full rounded-sm bg-foreground px-3 py-1.5 font-sans text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-warm-border px-3 py-3 font-sans text-xs text-warm-gray transition-colors hover:border-amber hover:text-foreground disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "Choose image file"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
