# Add Book to Collection

## Summary

Add a ghost card at the end of the book grid when viewing a collection. Clicking it opens a tabbed modal to search and add books from the user's library or discover new books via Google Books.

## Prerequisites

- Install shadcn/ui `Dialog` and `Tabs` components (`npx shadcn@latest add dialog tabs`)
- No toast library needed — use inline success/error states within the modal

## Ghost Card

- Rendered **inside** `BookGrid` as the last grid item (not after the grid), so it participates in the CSS grid layout
- `BookGrid` accepts an optional `renderAfter?: React.ReactNode` prop to append content inside the grid
- Style: subtle ghost card — light solid border (`border-warm-border`), soft background (`background/60`), rounded corners
- Content: centered "+" icon (Lucide `Plus`) with "Add Book" label below in sans-serif uppercase
- Hover: slight border darkening or background shift
- Same aspect ratio as book cover cards (~2:3) to maintain grid rhythm
- **Only visible when a collection is selected** — hidden on "All Books" view

## Modal

### Structure
- shadcn/ui `Dialog` component, centered, max-width ~md (448px)
- Title: "Add to {collectionName}"
- Two tabs using shadcn/ui `Tabs`: "My Library" (default active) | "Search New"
- Search input auto-focused on open, independent per tab (switching tabs clears search)
- Scrollable results list below search, max-height with overflow

### "My Library" Tab
- Fetches all library books via `/api/books` on modal open
- Client-side search with Fuse.js (title, author fields)
- Filters out books already in the collection OR already added in this session (union of `collectionBookIds` and `addedBookIds`)
- Each row: cover thumbnail (36x52px), title (serif), author (sans-serif, muted), "+" button on right
- Click "+" → POST `/api/collections/{collectionId}/books` with `{ bookId }`
- On success: row transitions to show checkmark instead of "+", book added to `addedBookIds`

### "Search New" Tab
- Search input with 300ms debounce
- Fetches from `/api/books/search?q={query}` (Google Books API)
- Results show: cover thumbnail, title, author, "+" button
- Click "+" → POST `/api/books/add` to create book in library
  - If 409 (duplicate): extract existing book ID from response, continue to next step
  - If 201 (created): use returned book ID
  - Then: POST `/api/collections/{collectionId}/books` with `{ bookId }` — adds to collection
- On success: row shows checkmark, book added to `addedBookIds`

### Batch Mode
- Modal stays open after each add for batch operations
- Added books show checkmark (non-reversible within modal — use collection page to remove)
- User closes modal manually via X button or clicking outside
- On modal close: dispatch `biblioteca:book-added` event to refresh library grid + collection view

## New Components

### `AddBookCard` (`src/components/add-book-card.tsx`)
- Props: `onClick: () => void`
- Renders the ghost card trigger
- Pure presentational component

### `AddBookToCollectionModal` (`src/components/add-book-to-collection-modal.tsx`)
- Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `collectionId: string`, `collectionName: string`, `collectionBookIds: string[]`
- Contains all modal logic: tabs, search, API calls, state management
- Internal state: `addedBookIds: Set<string>` to track what was added in this session
- Resets `addedBookIds` when modal opens
- On close with additions: dispatches `biblioteca:book-added` custom event

## Modified Files

### `src/components/book-grid.tsx`
- Add optional `renderAfter?: React.ReactNode` prop
- Render `{renderAfter}` as last child inside the grid container

### `src/app/page.tsx`
- Import `AddBookCard` and `AddBookToCollectionModal`
- Add state: `addBookModalOpen: boolean`
- Pass `AddBookCard` as `renderAfter` prop to `BookGrid` when `selectedCollectionId` is set
- Render `AddBookToCollectionModal` with collection context
- On modal close with changes: re-fetch collection book IDs to refresh the filtered view
- Pass `collectionBookIds` (already available from the collection fetch)

### `src/app/api/books/add/route.ts`
- Ensure 409 response includes the existing book's ID so the modal can use it for collection add

## Data Flow

```
Ghost Card click
  → open AddBookToCollectionModal(collectionId, collectionName, collectionBookIds)

"My Library" tab:
  fetch /api/books → Fuse.js filter → exclude (collectionBookIds ∪ addedBookIds) → render list
  click "+" → POST /api/collections/{id}/books → addedBookIds.add(bookId)

"Search New" tab:
  debounced fetch /api/books/search?q=... → render results
  click "+" → POST /api/books/add (handle 201 + 409) → POST /api/collections/{id}/books → addedBookIds.add(bookId)

Modal close:
  if addedBookIds.size > 0 → dispatch "biblioteca:book-added" + re-fetch collectionBookIds
```

## Edge Cases

- **Empty library**: "My Library" tab shows "No books in your library yet. Use 'Search New' to discover books."
- **All books already in collection**: "My Library" tab shows "All your books are already in this collection."
- **Search returns no results**: "No books found. Try a different search."
- **Network error on add**: Inline error text on the row, "+" button remains clickable for retry
- **Duplicate add race condition**: Backend uses upsert (`ON CONFLICT DO NOTHING`), so duplicates are safe
- **409 from /api/books/add**: Extract existing book ID from response body, proceed with collection add
