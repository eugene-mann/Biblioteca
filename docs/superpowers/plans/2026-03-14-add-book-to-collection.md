# Add Book to Collection Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ghost "+" card at the end of the book grid in collection view that opens a tabbed modal to add books from the library or discover new ones via Google Books.

**Architecture:** Ghost card renders inside BookGrid via a `renderAfter` prop. Modal is a self-contained component using shadcn Dialog + Tabs. "My Library" tab uses Fuse.js for client-side search; "Search New" tab hits the existing `/api/books/search` endpoint. Both tabs POST to `/api/collections/{id}/books` to add.

**Tech Stack:** React 19, shadcn/ui (Dialog, Tabs), Fuse.js, Tailwind CSS v4, existing API routes

**Spec:** `docs/superpowers/specs/2026-03-14-add-book-to-collection-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/ui/dialog.tsx` | Create | shadcn Dialog component |
| `src/components/ui/tabs.tsx` | Create | shadcn Tabs component |
| `src/components/add-book-card.tsx` | Create | Ghost "+" card trigger |
| `src/components/add-book-to-collection-modal.tsx` | Create | Tabbed modal with search + add |
| `src/components/book-grid.tsx` | Modify | Add `renderAfter` prop |
| `src/app/page.tsx` | Modify | Wire up ghost card + modal, track collection name |

---

## Chunk 1: Prerequisites & Ghost Card

### Task 1: Install shadcn Dialog and Tabs

- [ ] **Step 1: Install Dialog component**

```bash
cd /tmp/biblioteca-dev && npx shadcn@latest add dialog -y
```

- [ ] **Step 2: Install Tabs component**

```bash
cd /tmp/biblioteca-dev && npx shadcn@latest add tabs -y
```

- [ ] **Step 3: Copy generated files to real repo**

```bash
cp /tmp/biblioteca-dev/src/components/ui/dialog.tsx "/Users/eugenemann/Library/Mobile Documents/com~apple~CloudDocs/Repos/Personal/Biblioteca/src/components/ui/dialog.tsx"
cp /tmp/biblioteca-dev/src/components/ui/tabs.tsx "/Users/eugenemann/Library/Mobile Documents/com~apple~CloudDocs/Repos/Personal/Biblioteca/src/components/ui/tabs.tsx"
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/dialog.tsx src/components/ui/tabs.tsx
git commit -m "feat: add shadcn dialog and tabs components"
```

### Task 2: Add `renderAfter` prop to BookGrid

**Files:**
- Modify: `src/components/book-grid.tsx:8-10,58-98`

- [ ] **Step 1: Update BookGridProps interface**

```typescript
interface BookGridProps {
  books: Book[];
  renderAfter?: React.ReactNode;
}
```

- [ ] **Step 2: Update BookGrid to render `renderAfter` inside grid**

```typescript
export function BookGrid({ books, renderAfter }: BookGridProps) {
  if (books.length === 0 && !renderAfter) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((book, index) => (
        // ... existing book rendering unchanged ...
      ))}
      {renderAfter}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/book-grid.tsx
git commit -m "feat: add renderAfter prop to BookGrid"
```

### Task 3: Create AddBookCard component

**Files:**
- Create: `src/components/add-book-card.tsx`

- [ ] **Step 1: Create the ghost card component**

```typescript
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
      <div className="flex aspect-[2/3] w-full items-center justify-center rounded-sm border border-warm-border bg-background/60 transition-colors group-hover:border-amber/50 group-hover:bg-amber/5"
        style={{ minHeight: 192 }}
      >
        <div className="flex flex-col items-center gap-2 text-warm-gray transition-colors group-hover:text-amber">
          <Plus className="h-8 w-8" strokeWidth={1.5} />
          <span className="font-sans text-xs uppercase tracking-wider">Add Book</span>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/add-book-card.tsx
git commit -m "feat: create AddBookCard ghost card component"
```

---

## Chunk 2: Modal Component

### Task 4: Create AddBookToCollectionModal

**Files:**
- Create: `src/components/add-book-to-collection-modal.tsx`

This is the largest component. It contains:
- shadcn Dialog wrapper
- Two tabs: "My Library" and "Search New"
- Fuse.js search for library tab
- Debounced API search for new tab
- Add-to-collection API calls
- Batch mode with checkmark state

- [ ] **Step 1: Create the modal component**

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Check, Search, Loader2 } from "lucide-react";
import { BookCover } from "./book-cover";
import Fuse from "fuse.js";
import type { Book } from "@/types/database";

interface AddBookToCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  collectionName: string;
  collectionBookIds: string[];
}

interface SearchResult {
  id?: string;
  title: string;
  authors: string[];
  cover_image_url: string | null;
  isbn_13?: string | null;
  // Other book fields from search
  [key: string]: unknown;
}

export function AddBookToCollectionModal({
  open,
  onOpenChange,
  collectionId,
  collectionName,
  collectionBookIds,
}: AddBookToCollectionModalProps) {
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedBookIds, setAddedBookIds] = useState<Set<string>>(new Set());
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setAddedBookIds(new Set());
      setLibraryQuery("");
      setSearchQuery("");
      setSearchResults([]);
      setError(null);
      // Fetch library books
      fetch("/api/books")
        .then((res) => res.json())
        .then(setLibraryBooks)
        .catch(() => {});
    }
  }, [open]);

  // Fuse.js for library search
  const fuse = useMemo(() => {
    return new Fuse(libraryBooks, {
      keys: [
        { name: "title" as const, weight: 2 },
        { name: "authors" as const, weight: 1 },
      ],
      threshold: 0.3,
    });
  }, [libraryBooks]);

  // Filter library books: exclude already in collection + already added this session
  const excludeIds = useMemo(() => {
    const ids = new Set(collectionBookIds);
    addedBookIds.forEach((id) => ids.add(id));
    return ids;
  }, [collectionBookIds, addedBookIds]);

  const filteredLibraryBooks = useMemo(() => {
    const base = libraryQuery
      ? fuse.search(libraryQuery).map((r) => r.item)
      : libraryBooks;
    return base.filter((b) => !excludeIds.has(b.id));
  }, [libraryQuery, fuse, libraryBooks, excludeIds]);

  // Debounced Google Books search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          setSearchResults(await res.json());
        }
      } catch {
        // Silent fail
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const addBookToCollection = useCallback(
    async (bookId: string) => {
      setAddingBookId(bookId);
      setError(null);
      try {
        const res = await fetch(`/api/collections/${collectionId}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId }),
        });
        if (!res.ok) throw new Error("Failed to add");
        setAddedBookIds((prev) => new Set(prev).add(bookId));
      } catch {
        setError("Failed to add book. Try again.");
      } finally {
        setAddingBookId(null);
      }
    },
    [collectionId]
  );

  const addNewBookToCollection = useCallback(
    async (book: SearchResult) => {
      const tempId = book.isbn_13 || book.title;
      setAddingBookId(tempId);
      setError(null);
      try {
        // Step 1: Add book to library
        const addRes = await fetch("/api/books/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(book),
        });

        let bookId: string;
        if (addRes.status === 409) {
          // Already exists — get existing ID
          const data = await addRes.json();
          bookId = data.id;
        } else if (addRes.status === 201) {
          const data = await addRes.json();
          bookId = data.id;
        } else {
          throw new Error("Failed to add book to library");
        }

        // Step 2: Add to collection
        await addBookToCollection(bookId);
      } catch {
        setError("Failed to add book. Try again.");
        setAddingBookId(null);
      }
    },
    [addBookToCollection]
  );

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && addedBookIds.size > 0) {
        window.dispatchEvent(new Event("biblioteca:book-added"));
      }
      onOpenChange(isOpen);
    },
    [addedBookIds, onOpenChange]
  );

  function BookRow({
    id,
    title,
    authors,
    coverUrl,
    isAdded,
    isAdding,
    onAdd,
  }: {
    id: string;
    title: string;
    authors: string[];
    coverUrl: string | null;
    isAdded: boolean;
    isAdding: boolean;
    onAdd: () => void;
  }) {
    return (
      <div className="flex items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-warm-bg/50">
        <div className="h-[52px] w-[36px] shrink-0 overflow-hidden rounded-[2px]">
          <BookCover title={title} coverUrl={coverUrl} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-sm">{title}</p>
          <p className="truncate font-sans text-xs text-warm-gray">
            {authors.join(", ")}
          </p>
        </div>
        {isAdded ? (
          <Check className="h-4 w-4 shrink-0 text-green-600" />
        ) : isAdding ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-warm-gray" />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="shrink-0 rounded-sm p-1 text-warm-gray transition-colors hover:text-amber"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Add to {collectionName}</DialogTitle>
        </DialogHeader>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <Tabs defaultValue="library" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="library" className="flex-1">My Library</TabsTrigger>
            <TabsTrigger value="search" className="flex-1">Search New</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-3">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-warm-gray" />
              <input
                ref={searchInputRef}
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Search your library..."
                className="w-full rounded-sm border border-warm-border bg-background py-2 pl-9 pr-3 font-sans text-sm outline-none placeholder:text-warm-gray/60 focus:border-amber"
                autoFocus
              />
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {filteredLibraryBooks.length === 0 ? (
                <p className="py-8 text-center font-sans text-sm text-warm-gray">
                  {libraryBooks.length === 0
                    ? "No books in your library yet. Use 'Search New' to discover books."
                    : libraryQuery
                      ? "No matching books found."
                      : "All your books are already in this collection."}
                </p>
              ) : (
                filteredLibraryBooks.map((book) => (
                  <BookRow
                    key={book.id}
                    id={book.id}
                    title={book.title}
                    authors={book.authors}
                    coverUrl={book.cover_image_url}
                    isAdded={addedBookIds.has(book.id)}
                    isAdding={addingBookId === book.id}
                    onAdd={() => addBookToCollection(book.id)}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="search" className="mt-3">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-warm-gray" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Google Books..."
                className="w-full rounded-sm border border-warm-border bg-background py-2 pl-9 pr-3 font-sans text-sm outline-none placeholder:text-warm-gray/60 focus:border-amber"
              />
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {isSearching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-warm-gray" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="py-8 text-center font-sans text-sm text-warm-gray">
                  {searchQuery ? "No books found. Try a different search." : "Type to search for books..."}
                </p>
              ) : (
                searchResults.map((book, i) => {
                  const key = book.isbn_13 || `${book.title}-${i}`;
                  return (
                    <BookRow
                      key={key}
                      id={key}
                      title={book.title}
                      authors={book.authors}
                      coverUrl={book.cover_image_url}
                      isAdded={addedBookIds.has(key)}
                      isAdding={addingBookId === key}
                      onAdd={() => addNewBookToCollection(book)}
                    />
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

Note: This component uses `useMemo` which must be imported — add it to the import line:
```typescript
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/add-book-to-collection-modal.tsx
git commit -m "feat: create AddBookToCollectionModal with tabbed search"
```

---

## Chunk 3: Wire Up in Page

### Task 5: Track collection name in page.tsx and wire up components

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add imports**

Add to imports at top of file:
```typescript
import { AddBookCard } from "@/components/add-book-card";
import { AddBookToCollectionModal } from "@/components/add-book-to-collection-modal";
```

- [ ] **Step 2: Add state for modal and collection name**

After line 96 (`const [collectionKey, setCollectionKey] = useState(0);`), add:
```typescript
const [addBookModalOpen, setAddBookModalOpen] = useState(false);
const [selectedCollectionName, setSelectedCollectionName] = useState<string | null>(null);
```

- [ ] **Step 3: Update `handleSelectCollection` to track name**

Update the `onSelectCollection` callback in `CollectionCarousel` to also pass name. This requires updating the callback and the carousel's interface.

Actually, the carousel already passes `slug` and `id`. We need the name too. Simplest approach: derive name from slug (reverse the slug transform) or fetch it. Deriving from slug is sufficient since slugs are `name.toLowerCase().replace(/\s+/g, "-")`:

```typescript
const handleSelectCollection = useCallback(
  (slug: string | null, id: string | null) => {
    setParams({ collection: slug });
    setSelectedCollectionId(id);
    // Derive display name from slug (good enough for modal title)
    setSelectedCollectionName(
      slug ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null
    );
  },
  [setParams]
);
```

- [ ] **Step 4: Add re-fetch of collection books on modal close**

After the `fetchBooks` useEffect block (line ~116), the existing collection books useEffect at lines 118-131 already handles this. We need to trigger a re-fetch when the modal closes with additions. Add a `collectionBookKey` state to force re-fetch:

Replace line 96's `collectionKey` usage — actually we can reuse the existing pattern. After the modal closes, we trigger a re-fetch by bumping a key:

Add state after `addBookModalOpen`:
```typescript
const [collectionBookVersion, setCollectionBookVersion] = useState(0);
```

Update the collection books useEffect dependency to include this version:
```typescript
useEffect(() => {
  if (!selectedCollectionId) {
    setCollectionBookIds(null);
    return;
  }
  async function fetchCollectionBooks() {
    const res = await fetch(`/api/collections/${selectedCollectionId}/books`);
    if (res.ok) {
      const data = await res.json();
      setCollectionBookIds(new Set(data.bookIds));
    }
  }
  fetchCollectionBooks();
}, [selectedCollectionId, collectionBookVersion]);
```

Handle modal close:
```typescript
const handleAddBookModalClose = useCallback((isOpen: boolean) => {
  setAddBookModalOpen(isOpen);
  if (!isOpen) {
    // Re-fetch collection books to show newly added ones
    setCollectionBookVersion((v) => v + 1);
  }
}, []);
```

- [ ] **Step 5: Render ghost card and modal**

In the JSX, update the BookGrid rendering section (lines 299-315). The ghost card should appear on the last BookGrid (or the only one if ≤15 books). Pass `renderAfter` prop:

Replace lines 299-315:
```typescript
<div className="w-full animate-in fade-in duration-300">
  <BookGrid
    books={filteredBooks.slice(0, 15)}
    renderAfter={
      !filteredBooks.slice(15).length && selectedCollectionId ? (
        <AddBookCard onClick={() => setAddBookModalOpen(true)} />
      ) : undefined
    }
  />
  {filteredBooks.length > 15 && (
    <>
      <div className="my-8">
        <QuoteDivider />
      </div>
      <BookGrid
        books={filteredBooks.slice(15)}
        renderAfter={
          selectedCollectionId ? (
            <AddBookCard onClick={() => setAddBookModalOpen(true)} />
          ) : undefined
        }
      />
    </>
  )}
  {filteredBooks.length <= 15 && (
    <div className="mt-8">
      <QuoteDivider />
    </div>
  )}
</div>
```

After the closing `</div>` of the main content (before the final `</div>` of the return), add the modal:
```typescript
{selectedCollectionId && selectedCollectionName && (
  <AddBookToCollectionModal
    open={addBookModalOpen}
    onOpenChange={handleAddBookModalClose}
    collectionId={selectedCollectionId}
    collectionName={selectedCollectionName}
    collectionBookIds={collectionBookIds ? Array.from(collectionBookIds) : []}
  />
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire up add-book-to-collection ghost card and modal"
```

---

## Chunk 4: Verify & Polish

### Task 6: Manual verification

- [ ] **Step 1: Copy files to dev server**

```bash
rsync -av --exclude=node_modules --exclude=.next "/Users/eugenemann/Library/Mobile Documents/com~apple~CloudDocs/Repos/Personal/Biblioteca/src/" /tmp/biblioteca-dev/src/
```

- [ ] **Step 2: Verify ghost card appears**

Navigate to the app, select a collection. The ghost "+" card should appear as the last item in the grid.

- [ ] **Step 3: Verify modal opens and library search works**

Click the ghost card. Modal should open with "Add to {collection name}" title. Type in the library search — books should filter. Click "+" on a book — should show checkmark.

- [ ] **Step 4: Verify "Search New" tab works**

Switch to "Search New" tab. Search for a book. Click "+" — should add to both library and collection. Check shows on the row.

- [ ] **Step 5: Verify modal close refreshes grid**

Close the modal. The newly added book(s) should appear in the collection grid.

- [ ] **Step 6: Final commit with any fixes**

```bash
git add -A
git commit -m "feat: add book to collection from grid — ghost card + tabbed modal"
```
