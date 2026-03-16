# V2 Design Spec: The Reading Companion

## Overview

Transform Biblioteca from a book catalog into a personal reading companion that creates emotional connection, surfaces reading patterns, and guides intellectual growth.

## Scope

### 1. Now Reading Hero (Library Homepage)
- Hero section at top of Library page showing books with status "reading"
- Large cover (200x300), title, author, date started, page count
- If multiple books reading: horizontal scroll of hero cards
- If no books reading: section hidden (no empty state clutter)
- Warm gradient background with subtle accent

### 2. Personal Notes Field (Book Detail)
- New `notes` text field on Book type and database
- Textarea on book detail page below description
- Auto-saves on blur with debounce
- Placeholder: "Add your personal notes..."
- Migration file: `supabase/migrations/add_notes_field.sql`

### 3. Mobile Search
- Add search icon to mobile bottom nav
- Tapping opens a full-screen search overlay (not a new page)
- Reuse existing SearchBar component internals
- Close button (X) to dismiss overlay

### 4. Reading Stats Dashboard
- New component on Library page, between hero and grid
- Stats row: Books Read (count), Average Rating (stars), Books This Year, Current Streak (days between finishes)
- Derived from existing book data (status, rating, date_finished, date_added)
- Minimal, elegant — single row of 4 stat cards
- Only shows when user has 3+ books

### 5. Book Detail Redesign
- Magazine-style hero: large cover with gradient overlay
- Promote Status + Rating to hero area as primary actions
- Move Category, Collection, Favorite to "..." overflow menu
- Tabbed sections below hero: About | Insights | Notes
- About tab: description + collapsed metadata details
- Insights tab: existing InsightsSection content
- Notes tab: personal notes textarea + AI reflection prompts
- Move Delete to overflow menu (never inline with metadata)

### 6. Navigation Consolidation
- 4 tabs: Library, Discover, Activity, Profile
- Merge Explore into Library as a "Themes" view mode toggle
- Transform Changelog into Activity (reading timeline)
- New Profile page: import/export + future settings
- Mobile: 4-icon bottom nav with search icon in top bar

### 7. Reading Timeline (Activity Page)
- Transform changelog from log entries into visual timeline
- Group by month with visual month headers
- Milestone badges: "First book", "10th book finished", "First 5-star"
- Reading streak visualization
- Stats summary at top of page

### 8. Connections Page (Renamed Explore)
- Rename "Explore" to "Connections"
- Add subtitle: "Themes and patterns across your library"
- Add "Save as Collection" button per cluster
- Add "Find more like this" CTA linking to Discover with topic pre-filled

## Database Changes

```sql
-- Migration: add_notes_field.sql
ALTER TABLE books ADD COLUMN notes TEXT DEFAULT NULL;
```

## Files to Create/Modify

### New Files
- `src/components/now-reading-hero.tsx`
- `src/components/reading-stats.tsx`
- `src/components/mobile-search-overlay.tsx`
- `src/components/book-detail/notes-tab.tsx`
- `src/components/book-detail/overflow-menu.tsx`
- `src/components/book-detail/detail-tabs.tsx`
- `src/app/activity/page.tsx`
- `src/app/profile/page.tsx`
- `supabase/migrations/add_notes_field.sql`

### Modified Files
- `src/app/page.tsx` — add hero + stats + themes toggle
- `src/app/library/[id]/page.tsx` — magazine redesign + tabs
- `src/app/explore/page.tsx` → move to connections route
- `src/app/connections/page.tsx` — renamed explore with enhancements
- `src/app/changelog/page.tsx` → transform to activity
- `src/components/nav.tsx` — 4 tabs + mobile search
- `src/components/action-pills.tsx` — split primary/overflow
- `src/components/book-detail/metadata-grid.tsx` — collapse, remove delete
- `src/types/database.ts` — add notes to Book type
- `src/app/layout.tsx` — update footer links

## Design Tokens (Existing)
- Background: #F8F5F0 (warm cream)
- Accent: #C8956C (amber)
- Foreground: #2C2416 (dark brown)
- Fonts: Playfair Display (serif), Libre Franklin (sans)
- All new components use existing Tailwind tokens
