# EUG-81: Author as First-Class Object

## Problem

Author names in Biblioteca are plain text with no interactivity. Users can't browse by author, discover other books by the same author, or search by author name.

## Approach

Derive author pages from the existing `books.authors` array — no new database table. Author identity is the exact string in the array (e.g., "Iain M. Banks"). This keeps the system simple and works immediately with the existing 487-book library.

## Design

### 1. Author Page — `/author/[name]`

**Route**: `src/app/author/[name]/page.tsx`

The `[name]` param is the URL-encoded author name. Page layout:

- Back button ("Back to Library")
- Author name as `h1` (serif, large)
- Book count subtitle (e.g., "12 volumes")
- Full `BookGrid` of all books by this author in the library

**API**: `GET /api/authors/[name]/books`

- Route: `src/app/api/authors/[name]/books/route.ts`
- Query: `SELECT * FROM books WHERE $1 = ANY(authors) AND user_id = $DEFAULT_USER_ID ORDER BY date_added DESC`
- Supabase: `.contains('authors', [decodedName])`
- Returns: `Book[]`

### 2. Author Links on Book Detail

In `src/app/library/[id]/page.tsx`, change the author line from:

```
<p>by {book.authors.join(", ")}</p>
```

to linked names:

```
<p>by <Link href="/author/Iain M. Banks">Iain M. Banks</Link></p>
```

For multi-author books, each name is a separate `<Link>` with comma separators between them.

### 3. "More by This Author" Section

**Component**: `src/components/book-detail/author-books-section.tsx`

**Props**: `{ authorName: string; currentBookId: string }`

**Behavior**:
- Fetches `GET /api/authors/[name]/books`
- Filters out the current book from results
- If no remaining books, renders nothing
- If books exist, renders a card matching the insights section style:
  - Label: "MORE BY {AUTHOR NAME}" (uppercase, tracking-widest)
  - Small cover thumbnails + titles, linked to book detail pages
  - Same layout as "Related in Your Library" in the insights section

**Placement**: On the book detail page, between Insights and Metadata sections. For multi-author books, uses the first author.

### 4. Search Integration

The existing `SearchBar` component filters the library client-side. Extend the filter logic in `src/app/page.tsx` (the `filteredBooks` useMemo) to also match against author names.

Current search likely matches `book.title`. Add: `book.authors.some(a => a.toLowerCase().includes(query))`.

This means typing "Banks" in the search bar surfaces all Iain M. Banks books even if "Banks" isn't in the title.

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/author/[name]/page.tsx` | Author page |
| `src/app/api/authors/[name]/books/route.ts` | Author books API |
| `src/components/book-detail/author-books-section.tsx` | "More by this author" section |

## Files to Modify

| File | Change |
|------|--------|
| `src/app/library/[id]/page.tsx` | Author names become Links; add AuthorBooksSection |
| `src/app/page.tsx` or `src/components/search-bar.tsx` | Add author name matching to search filter |

## Out of Scope

- Author bio, photo, or metadata (can add later with an `authors` table)
- Author page for authors not in the library
- Deduplication of author name variants (e.g., "Iain Banks" vs "Iain M. Banks")
