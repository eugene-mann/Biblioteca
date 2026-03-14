# Biblioteca — Session Context (2026-03-14)

## What Was Done This Session

### 1. UX Design Exploration
Created 6 self-contained HTML prototypes in `WIP/` to explore different aesthetic directions for the Library UI:

| File | Concept | Status |
|------|---------|--------|
| `concept-a-editorial.html` | Warm ivory editorial (Cormorant Garamond) | Original winner |
| `concept-b-warm-shelf.html` | Cozy warm shelf with 3D tilted covers | Explored |
| `concept-c-brutalist.html` | Neon green on black, dense grid | Explored |
| `concept-1.1-editorial-dark.html` | Dark reading room (Playfair Display + amber) | User's favorite layout |
| `concept-1.2-editorial-coastal.html` | Mediterranean bright (Lora + blue) | Explored |
| `concept-1.3-editorial-japanese.html` | Japanese minimalism (EB Garamond) | Explored |
| `concept-1.1-light.html` | 1.1 converted to light mode | **Final winner** |

**Decision**: User chose Concept 1.1's layout/typography but in light mode → Playfair Display + Libre Franklin, warm cream `#F8F5F0`, amber `#C8956C` accent.

### 2. Database Schema Changes
Added 3 new columns to `books` table via Supabase migration `add_category_external_rating_favorite`:

```sql
ALTER TABLE books ADD COLUMN category text;
ALTER TABLE books ADD COLUMN external_rating numeric(3,1);
ALTER TABLE books ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;
```

- **category**: Normalized primary category (Fiction, Business, History, etc.). Backfilled 475/487 books from Google Books `categories[]` array.
- **external_rating**: Google Books `averageRating` field. Populated for new books at ingestion.
- **is_favorite**: User-togglable boolean. Filterable on library page.

### 3. Full Theme Refactor (M9: Editorial Theme Refactor)
Replaced the entire UI from generic Geist Sans/shadcn defaults to the editorial design:

**Typography**: Playfair Display (serif, display/headings) + Libre Franklin (sans, body/UI)
**Palette**: Warm cream background, espresso text, amber accent, burgundy for destructive

**Files modified:**
- `src/app/globals.css` — New CSS variables, warm palette, paper texture
- `src/app/layout.tsx` — Font imports changed to Playfair + Libre Franklin
- `src/components/nav.tsx` — Italic amber wordmark, small-caps links, frosted glass
- `src/app/page.tsx` — Serif title, slash filters, category/favorite filter controls
- `src/components/search-bar.tsx` — Underline-only serif input
- `src/components/book-grid.tsx` — Editorial cards, rating dots, category badges, hearts
- `src/components/book-cover.tsx` — Rounded-sm, serif initials
- `src/app/library/[id]/page.tsx` — Favorite toggle, category dropdown, dual rating
- `src/app/api/books/[id]/route.ts` — PATCH whitelist for new fields
- `src/app/discover/page.tsx` — Editorial recommendation cards
- `src/app/settings/page.tsx` — Editorial import UI
- `src/lib/google-books.ts` — Category mapping + external_rating extraction
- `src/types/database.ts` — BookCategory type, BOOK_CATEGORIES, new Book fields

### 4. Search → Navigate Flow
Updated search behavior so clicking a result always navigates to the book detail page:
- If the book is already in the library → navigates to existing book's detail page
- If the book is new → adds it to library, then navigates to its detail page

**Files modified:**
- `src/app/api/books/add/route.ts` — On duplicate, returns `{ existing: true, id, slug }` instead of error-only response
- `src/components/search-bar.tsx` — Added `useRouter`, navigates to `/library/${slug || id}` on both 409 (existing) and 201 (new)

### 5. Linear Project Management
- Created milestone **M9: Editorial Theme Refactor** with 5 issues (EUG-65 through EUG-69), all completed
- Posted status update to Linear project

## What's Uncommitted
All changes are local and uncommitted. Run `git status` to see the full diff. Key areas:
- Modified source files (theme refactor + data model changes)
- New `WIP/` folder with HTML prototypes
- New `.claude/launch.json` for preview server

## What's Next

### Immediate
- **Visual QA**: Run `npm run dev` and verify all pages render correctly with new theme
- **Commit**: Stage and commit all changes
- **Vercel deployment** (EUG-41): Needs user's Vercel account setup

### Open Issues
- **EUG-41**: Vercel deployment pipeline (needs user's Vercel account)
- **EUG-59**: Production deployment and final QA
- **EUG-61-64**: M8 UX Redesign issues (superseded by M9, can be closed)

### Future Enhancements
- Dark mode variant of the editorial theme (Concept 1.1 dark already prototyped)
- "Currently Reading" hero section on library page (from prototype, not yet in production)
- Pull-quote / editorial callout panels
- Category auto-suggestion improvements (12 books still uncategorized)

## Design System Reference

### CSS Variables (globals.css)
```
--background: #F8F5F0    (warm cream)
--foreground: #2C2416    (espresso)
--card: #FFFFFF           (white surface)
--amber: #C8956C          (primary accent)
--burgundy: #7A2E2E       (destructive/alert)
--warm-border: #E0D8CC    (borders)
--warm-gray: #8A7E6F      (secondary text)
--muted: #F0EBE4          (subtle backgrounds)
--secondary: #F0EBE4      (tag/badge backgrounds)
```

### Tailwind Custom Classes
- `font-serif` → Playfair Display
- `font-sans` → Libre Franklin
- `text-amber`, `bg-amber` → `#C8956C`
- `text-warm-gray` → `#8A7E6F`
- `text-burgundy` → `#7A2E2E`
- `border-warm-border` → `#E0D8CC`

### Typography Patterns
- Page titles: `font-serif text-3xl font-semibold`
- Section headings: `font-serif text-lg font-semibold`
- Body: `font-sans text-sm`
- Labels: `font-sans text-xs uppercase tracking-wider text-warm-gray`
- Buttons: `font-sans text-sm font-medium rounded-sm`
