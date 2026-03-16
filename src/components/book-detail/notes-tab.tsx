"use client";

import { useState, useRef } from "react";

interface NotesTabProps {
  bookId: string;
  initialNotes: string | null;
  bookStatus?: string;
}

const REFLECTION_PROMPTS = [
  "What's the one idea you'll carry forward?",
  "How did this book change your thinking?",
  "Who should read this and why?",
];

export function NotesTab({ bookId, initialNotes, bookStatus }: NotesTabProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSave() {
    setIsSaving(true);
    try {
      await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setLastSaved(new Date());
    } catch {
      // Silent fail — user can retry
    } finally {
      setIsSaving(false);
    }
  }

  function insertPrompt(prompt: string) {
    const prefix = notes.trim() ? `${notes}\n\n` : "";
    const newNotes = `${prefix}${prompt}\n`;
    setNotes(newNotes);
    // Focus textarea and move cursor to end
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = newNotes.length;
        textareaRef.current.selectionEnd = newNotes.length;
      }
    }, 0);
  }

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleSave}
        placeholder="Your personal notes about this book... Who recommended it, when you read it, what it meant to you."
        className="w-full min-h-[200px] bg-transparent border border-warm-border rounded-lg p-4 font-sans text-sm resize-y focus:outline-none focus:ring-1 focus:ring-amber/50 text-foreground placeholder:text-warm-gray/60"
      />
      <div className="mt-1.5 h-4">
        {isSaving && (
          <p className="text-warm-gray text-xs font-sans">Saving...</p>
        )}
        {!isSaving && lastSaved && (
          <p className="text-warm-gray text-xs font-sans">Saved</p>
        )}
      </div>

      {bookStatus === "read" && (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-widest text-warm-gray mb-3 font-sans">
            Reflection prompts
          </p>
          <div className="flex flex-wrap gap-2">
            {REFLECTION_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => insertPrompt(prompt)}
                className="rounded-full border border-warm-border px-3 py-1.5 font-sans text-xs text-warm-gray transition-colors hover:border-amber hover:text-amber"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
