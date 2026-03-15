# Biblioteca

Personal reading curator — organize books, extract knowledge, and recommend new reading lists.

## Project Management

- **Linear Project**: [Biblioteca](https://linear.app/mavenagi/project/biblioteca-9f8986ed8b00) in Eugene HQ team (EUG)
- **Status updates**: Store in the Linear Project's status updates
- **Reference material**: Store as Resources on the Linear Project (documents, links, attachments)
- **Future work**: Create Linear issues under the Biblioteca project

## Features

1. **Ingestion** — Add manually, Kindle import
2. **Metadata generation** — Augment book names with author, topic, summary, key quotes
3. **Display books** — Visually appealing way to explore books
4. **Recommend** — Identify new books to read, with links to Amazon to purchase
5. **Collections** — User-defined book groupings with carousel display, drag-to-reorder, delete with confirmation

## Architecture Patterns

### Supabase Joins
- **No FK on `book_changelog`**: The `book_changelog.book_id` column has no foreign key to `books`. Supabase `.select("*, books:book_id(slug)")` will 500. Use a two-step pattern: fetch changelog rows, then batch-fetch related data with `.in("id", bookIds)` and merge via a map.
- **`book_insights` has FK**: `book_insights.book_id` references `books(id)` with `ON DELETE CASCADE`, so Supabase joins work there.

### Explore Page
- **Thematic clustering**: `/api/explore` fetches all `book_insights` + `books`, clusters by 2+ shared themes, picks highest-rated as hero, shuffles cluster order per request.
- **5 rotating accent colors**: emerald, amber, blue, purple, rose — applied per cluster.

### Search (EUG-71)
- **Three-tier search**: Fuse.js instant search (library + popular books cache) → localStorage API cache → Google Books API (debounced 300ms)
- **SearchBar requires `libraryBooks` prop** from page.tsx for instant local search
- **Popular books cache**: `public/data/popular-books.json` — 506 books, lazy-loaded on module import via `ensurePopularBooks()`
- **Deduplication**: External results filtered by ISBN-13 first, then title+author fuzzy match
- **Book grid uses `data-book-id` attributes** for scroll-to-highlight from search results
- **Fuse.js type caveat**: Don't use `as const` on the full options object — Fuse expects mutable arrays. Use `as const` on individual key `name` properties instead.

## Brainstorming

- **Always use visual companion**: When brainstorming features, always enable the browser-based visual companion for mockups and design options. Don't ask — just start it.

## Build & Deploy

- **Always do a local build before pushing**: Run `npx next build` from `/tmp/biblioteca-dev` (after rsync) to catch TypeScript and SSR errors before Vercel deploys. Vercel builds will fail on errors that the dev server ignores.
- **Commit all new files**: When adding features that introduce new modules (e.g., `src/lib/changelog.ts`), verify all imports resolve on the remote — untracked files that only exist locally cause `Module not found` build failures on Vercel.
- **React 19 `useRef` requires initial arg**: `useRef<T>()` without an argument is a type error in strict mode. Always pass `useRef<T>(null)` or `useRef<T>(undefined)`.
- **`useSearchParams` needs Suspense**: Any page using `useSearchParams()` must wrap the component in `<Suspense>` or the production build will fail with a prerender error.

## Dev Environment

- **Spaces in path**: The repo lives under iCloud Drive (`Mobile Documents/com~apple~CloudDocs`). Next.js Turbopack crashes on paths with spaces. Workaround: copy to `/tmp/biblioteca-dev` and run `npm run dev` from there. The `.claude/launch.json` is configured for this.
- **File sync**: After editing source files in the real repo, copy them to `/tmp/biblioteca-dev` for the dev server to pick up changes.
- **Supabase**: No service role key or CLI auth configured. SQL migrations must be run manually in the Supabase dashboard.
- **Default user**: Hardcoded `DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"` (no auth yet).
- **Google Books API key**: Stored in `.env.local`.

## Tech Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4
- shadcn/ui components, Playfair Display + Libre Franklin fonts
- Supabase (PostgreSQL), Google Books API, Claude API (recommendations)
- @dnd-kit for drag-and-drop
- Vercel for hosting, GitHub for source
