# Related Books — Design Spec

## Goal

Surface related books on the Book Detail page and Explore page, mixing library books with new external suggestions to turn both pages into discovery engines.

## Decisions

- **Mix**: Library books (already owned) + external suggested books (not in library)
- **Where**: Book Detail page + Explore page
- **Source**: Claude generates suggestions during insight generation, hydrated via Open Library / Google Books
- **Trigger**: Auto-generate insights when a book is added (client-side, non-blocking)
- **Visual distinction**: External books marked with "NEW" pill so they're clearly discoverable

## Data Model

### New column on `book_insights`

```sql
ALTER TABLE book_insights
ADD COLUMN suggested_books jsonb DEFAULT '[]';
```

### TypeScript type

```typescript
interface SuggestedBook {
  title: string;
  authors: string[];
  cover_image_url?: string;
  isbn_13?: string;
  reasoning: string; // 1 sentence on why it's related
}
```

Added to the existing `BookInsight` type in `src/types/database.ts`:

```typescript
export interface BookInsight {
  // ... existing fields
  suggested_books: SuggestedBook[];
}
```

The existing `related_book_ids: string[]` field continues to store library-internal related book IDs.

## Insight Generation Changes

### Claude prompt extension

The existing insight generation prompt in `src/lib/insights.ts` is extended to also return `suggested_books` in its JSON response:

```json
{
  "why_read": "...",
  "themes": ["..."],
  "quotes": ["..."],
  "related_books": ["uuid-1", "uuid-2"],
  "suggested_books": [
    {
      "title": "Book Title",
      "authors": ["Author Name"],
      "reasoning": "One sentence on thematic connection"
    }
  ]
}
```

Claude is instructed to:
- Return 3-5 suggested books that are NOT in the user's library
- Focus on thematic, stylistic, or topical connections
- Include a 1-sentence `reasoning` for each

### Hydration step

After Claude returns suggested books, a new `hydrateSuggestedBooks()` function in `src/lib/insights.ts` hydrates each with cover art and ISBN:

1. For each suggested book, search Open Library by title + author (free, no rate limits)
2. If no result or no cover, fall back to Google Books API search
3. Populate `cover_image_url` and `isbn_13`
4. If both sources fail, include the book without a cover — `SuggestedBookCard` renders a fallback placeholder (same as `BookCover` component's existing fallback)

This follows the same search pattern used in `src/lib/open-library.ts` and `src/lib/google-books.ts`.

### Auto-trigger on book add

The client triggers insight generation after a book is added. In the search bar's add handler (or wherever books are added from the UI), after receiving the 201 response, fire a `POST /api/books/[id]/insights` call without awaiting it. This avoids Vercel's serverless execution timeout — the insight generation runs as a separate request.

The book detail page already handles the "no insights yet" state with a "Generate Insights" button, so there's no loading state issue. If the user navigates to the book before insights finish, they see the manual trigger.

### Backfill

For existing books that already have insights but lack `suggested_books`, a one-time script or Settings button regenerates insights. This is a data task — can be done via direct API calls per CLAUDE.md guidance.

## Book Detail Page

### Current state

The `InsightsSection` component in `src/app/library/[id]/page.tsx` has a "Related in Your Library" section showing books from `related_book_ids`.

### Changes

1. Section header changes from "Related in Your Library" to "Related Books"
2. Library books (from `related_book_ids`) render first, same card style as today: cover + title + author + category
3. Suggested books (from `suggested_books`) render after, using a new `SuggestedBookCard` component with:
   - Book cover (from hydrated `cover_image_url`)
   - Title and authors
   - "NEW" pill (small, uppercase, amber-tinted)
   - 1-line reasoning text
   - "Add to Library" button
4. On add: dispatches `biblioteca:book-added` event, card transitions from "new" to "in library" state

## Explore Page

### Current state

The Explore page clusters library books by theme overlap. Each cluster has a hero book and compact books.

### Changes

Each cluster's compact books section gets appended with 1-2 suggested books drawn from the cluster hero's `suggested_books` field:
- Appear at the end of the compact row
- Use the same `SuggestedBookCard` component with "NEW" visual treatment
- On add: `biblioteca:book-added` event triggers library refresh

This keeps the Explore page library-centric while adding a discovery layer.

### Type changes

`ExploreCluster` gains a `suggestedBooks: SuggestedBook[]` field (1-2 books drawn from the hero's `suggested_books`). The Explore API route populates this when building clusters.

## New Component

### `SuggestedBookCard`

A reusable component for rendering external book suggestions. Used on both Book Detail and Explore pages.

**Props:**
```typescript
interface SuggestedBookCardProps {
  book: SuggestedBook;
  variant: "detail" | "compact"; // detail page vs explore page sizing
  onAdd?: () => void;
}
```

**Behavior:**
- Renders cover (with `BookCover` fallback for missing covers), title, authors, reasoning, "NEW" pill
- "Add to Library" button flow:
  1. Search Google Books API by ISBN (if available) or title+author to get full book metadata
  2. POST the full metadata to `/api/books/add`
  3. This is the same search→add flow used by the SearchBar component
- After successful add, card visually transitions to "in library" state (pill changes, button removed)
- `compact` variant shows smaller card matching Explore page grid

**Deduplication at render time:** Before rendering suggested books, filter out any whose `isbn_13` or `title+authors` match a book already in the user's library. This handles the case where a suggested book was added to the library after insights were generated.

## Migration

```sql
-- 006_suggested_books.sql
ALTER TABLE book_insights
ADD COLUMN suggested_books jsonb DEFAULT '[]';
```

## Files Changed

- `supabase/migrations/006_suggested_books.sql` — new migration
- `src/types/database.ts` — add `SuggestedBook` interface, extend `BookInsight`
- `src/lib/insights.ts` — extend Claude prompt, add hydration step
- `src/lib/insights.ts` — add `InsightResponse` type changes, `hydrateSuggestedBooks()` function
- Client-side add handlers — trigger insight generation after book add (non-blocking)
- `src/app/library/[id]/page.tsx` — update InsightsSection to show suggested books
- `src/app/api/explore/route.ts` — include suggested_books in cluster response
- `src/app/explore/page.tsx` — render suggested books in clusters
- `src/components/suggested-book-card.tsx` — new component
