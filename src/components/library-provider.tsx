"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Book } from "@/types/database";

const LibraryContext = createContext<{
  books: Book[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} | null>(null);

/** One library request shared by the shelf and both search surfaces. */
export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError(null);
    try {
      const res = await fetch("/api/books", { signal: controller.signal });
      if (!res.ok)
        throw new Error("Your library couldn’t load. Please try again.");
      const data = await res.json();
      if (!Array.isArray(data))
        throw new Error("Your library couldn’t load. Please try again.");
      setBooks(data);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Your library couldn’t load.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const handler = () => {
      void refresh();
    };
    window.addEventListener("biblioteca:book-added", handler);
    return () => {
      request.current?.abort();
      window.removeEventListener("biblioteca:book-added", handler);
    };
  }, [refresh]);
  return (
    <LibraryContext.Provider value={{ books, loading, error, refresh }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary requires LibraryProvider");
  return value;
}
