# Changelog

## 2026-03-14 — UI Polish, Cover Cleanup & Award Collections

### Changed
- **Quote block repositioned** — Moved from above the book grid to after the 3rd row of tiles, improving content flow

### Fixed
- **Missing book covers** — Found and updated cover images for 14 books via Google Books API

### Added
- **Hugo Award Winners collection** — 27 Hugo Best Novel winners identified and added
- **Pulitzer Prize Winners collection** — 8 Pulitzer winners (Fiction, Biography, History, Nonfiction) identified and added
- **Delete collections** — Hover-to-reveal X button on collection cards with inline Yes/No confirmation

## 2026-03-14 — Collections

### Added
- **Collections feature** — User-defined groupings of books displayed as a carousel on the Library page
  - Horizontally scrollable carousel with stacked book cover thumbnails, collection name, and book count
  - "All Books" default card and "+ New Collection" inline creation
  - Selecting a collection filters the book grid to show only its books
  - Drag-to-reorder collections via `@dnd-kit/sortable`
- **Collection management on book detail page** — Add/remove books from collections
  - Removable collection tags with "+" Add dropdown
  - Checkmark toggles for collection membership
  - Inline "Create new collection" from the dropdown
- **Database schema** — `collections` and `collection_books` tables with cascade deletes
- **API routes** — Full CRUD for collections plus membership and reorder endpoints
- **Seeded "Favorites" collection** with 3 example books

### Dependencies
- Added `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` for drag-and-drop

## 2026-03-12 — Initial Release

- Book library with search, import (CSV/Kindle), and Google Books metadata enrichment
- Editorial theme (Playfair Display + Libre Franklin, warm cream/amber palette)
- Book detail pages with status, rating, category, and favorites
- AI-powered recommendations via Claude
- Quote carousel divider
- Responsive design with mobile bottom navigation
