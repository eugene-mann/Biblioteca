# Collections — Design Spec

## Context

Biblioteca users accumulate books in a flat library grid. As the library grows, there's no way to organize books into meaningful groups beyond status and category filters. Collections let users create custom groupings (e.g., "Summer Reading", "Philosophy Essentials", "Must Re-read") that surface on the Library page as a visual carousel and filter the book grid when selected.

## Requirements

- Users can create, rename, delete, and reorder Collections
- Books can be added to and removed from Collections
- A book can belong to multiple Collections
- Collections display as a horizontally scrollable carousel on the Library page, above the book grid
- Each collection card shows 2-3 stacked/overlapping book cover thumbnails, the collection name, and book count
- Selecting a collection filters the book grid to show only its books
- "All Books" is the default selection (no filter)
- Books can be added/removed from collections via the book detail page
- Collections can be created from both the carousel ("+ New Collection") and the book detail page dropdown
- Collections support manual drag-to-reorder

## Data Model

### `collections` table

| Column     | Type         | Constraints                  |
|------------|--------------|------------------------------|
| id         | uuid         | PK, default gen_random_uuid() |
| name       | text         | NOT NULL                     |
| sort_order | integer      | NOT NULL, default 0          |
| user_id    | text         | NOT NULL                     |
| created_at | timestamptz  | NOT NULL, default now()      |

### `collection_books` table (junction)

| Column        | Type        | Constraints                              |
|---------------|-------------|------------------------------------------|
| collection_id | uuid        | FK → collections.id, ON DELETE CASCADE   |
| book_id       | uuid        | FK → books.id, ON DELETE CASCADE         |
| added_at      | timestamptz | NOT NULL, default now()                  |

- **Primary key**: composite (collection_id, book_id)
- Cascade deletes ensure removing a collection cleans up memberships, and removing a book cleans up its collection associations

## API Routes

| Method | Route                              | Purpose                                     |
|--------|------------------------------------|--------------------------------------------|
| GET    | /api/collections                   | List all collections with first 3 book covers |
| POST   | /api/collections                   | Create a new collection                     |
| PATCH  | /api/collections/[id]              | Update name or sort_order                   |
| DELETE | /api/collections/[id]              | Delete a collection                         |
| POST   | /api/collections/[id]/books        | Add a book to a collection                  |
| DELETE | /api/collections/[id]/books/[bookId] | Remove a book from a collection           |
| GET    | /api/books/[id]/collections        | Get all collections a book belongs to       |

### Reorder endpoint

`PATCH /api/collections/reorder` accepts `{ orderedIds: string[] }` and bulk-updates `sort_order` values.

## Components

### `collection-carousel.tsx`
- Client component on the Library page
- Fetches collections via `GET /api/collections`
- Renders horizontally scrollable row of `collection-card` components
- Includes "All Books" card (always first, not draggable) and "+ New Collection" card (always last, not draggable)
- Drag-to-reorder via `@dnd-kit/core` + `@dnd-kit/sortable`
- Emits selected collection ID to parent for filtering
- Active card gets amber border (`border-amber`)

### `collection-card.tsx`
- Displays 2-3 overlapping book cover thumbnails with slight rotation
- Collection name and book count below covers
- Click handler for selection
- Drag handle for reordering

### `collection-manager.tsx`
- Dropdown component on the book detail page
- Shows current collections as removable tags (with ✕)
- "+ Add" button opens popover listing all collections with checkmarks
- Toggle collection membership on click
- "Create new collection" option at bottom opens inline name input

### `create-collection-modal.tsx`
- Simple modal/dialog with name text input and Create/Cancel buttons
- Used from both the carousel "+ New Collection" card and the book detail dropdown
- On create, POSTs to `/api/collections` and refreshes the carousel

## Library Page Changes

**File**: `src/app/page.tsx`

- Add `collection-carousel` component between the search/filter bar and book grid
- Add `selectedCollectionId` state (null = "All Books")
- When a collection is selected, fetch its book IDs and add to the existing `filteredBooks` memoization logic
- Selecting "All Books" clears the collection filter

## Book Detail Page Changes

**File**: `src/app/library/[id]/page.tsx`

- Add `collection-manager` component in the metadata section
- Fetch book's collections via `GET /api/books/[id]/collections` on mount
- Optimistic updates on add/remove

## Drag-to-Reorder

- `@dnd-kit/core` + `@dnd-kit/sortable` for the carousel
- On drag end, compute new `sort_order` values and call `PATCH /api/collections/reorder`
- Optimistic reorder in state, rollback on error

## UI/UX Details

- Carousel cards: 140px wide, white background, 1px warm-border, rounded-sm
- Stacked covers: 2-3 book covers with slight rotation (-5° to +5°), overlapping
- Active state: 2px amber border
- Empty collection: show a placeholder icon instead of covers
- "+ New Collection" card: dashed border, centered + icon
- Book detail tags: white bg, warm-border, 13px text, ✕ to remove
- Dropdown: white bg, shadow, checkmarks for selected collections, amber text for "Create new"

## Error Handling

- Optimistic UI updates with rollback on API failure
- Duplicate book add silently ignored (composite PK constraint)
- Deleting a collection cascades junction rows, does not affect books
- Empty collection name prevented client-side (disabled Create button)

## Verification

1. Create a collection from the carousel → appears in carousel with "+ New Collection" still at end
2. Add books to the collection from book detail page → covers appear on collection card
3. Select collection in carousel → grid filters to only those books
4. Select "All Books" → grid shows all books again
5. Drag to reorder collections → order persists on reload
6. Remove a book from collection via book detail ✕ → card updates, grid updates if filtered
7. Delete a collection → removed from carousel, books unaffected
8. Create collection from book detail dropdown → appears in carousel
