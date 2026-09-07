"use client";
import { useState, useRef, useEffect } from "react";
import { Check, PencilLine, Save } from "lucide-react";

interface NotesTabProps {
  bookId: string;
  initialNotes: string | null;
  bookStatus?: string;
  onSaved?: (notes: string) => void;
}
const PROMPTS = [
  "What’s the one idea you’ll carry forward?",
  "How did this book change your thinking?",
  "Who should read this and why?",
];
export function NotesTab({
  bookId,
  initialNotes,
  bookStatus,
  onSaved,
}: NotesTabProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const dirty = notes !== savedNotes;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save() {
    if (saving || !dirty) return;
    const snapshot = notes;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: snapshot }),
      });
      if (!res.ok) throw new Error();
      const book = await res.json();
      if (book.notes !== snapshot) throw new Error();
      setSavedNotes(snapshot);
      setHasSaved(true);
      onSaved?.(snapshot);
    } catch {
      setError(
        "Your notes weren’t saved. They’re still here — please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="notes-editor">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Your words, your margins</p>
          <h2 className="mt-2 font-serif text-2xl">A place to think.</h2>
        </div>
        <PencilLine className="h-5 w-5 text-amber" />
      </div>
      <textarea
        ref={textarea}
        aria-label="Personal notes"
        maxLength={50000}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
        placeholder="An idea to remember. A passage to return to. Something this book changed for you…"
        className="min-h-[280px] w-full resize-y rounded-md border border-warm-border bg-card p-5 font-serif text-base leading-8 placeholder:text-warm-gray/70"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-warm-gray"
        >
          {saving ? (
            "Saving…"
          ) : dirty ? (
            "Unsaved changes"
          ) : hasSaved ? (
            <>
              <Check className="h-3 w-3" />
              Saved to this book
            </>
          ) : (
            "Make this book your own."
          )}
        </p>
        <button
          className="primary-button"
          onClick={() => void save()}
          disabled={!dirty || saving}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save notes"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {bookStatus === "read" && (
        <div className="mt-8">
          <p className="eyebrow mb-3">A few starting points</p>
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map((prompt) => (
              <button
                className="quiet-button !whitespace-normal !text-left"
                key={prompt}
                onClick={() => {
                  setNotes(
                    (value) =>
                      `${value.trim() ? value + "\n\n" : ""}${prompt}\n`,
                  );
                  textarea.current?.focus();
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
