# Astra library experience review

Branch: `feature/astra-library-experience`. Local implementation, September 7, 2026.

The review focused on the shelf, shared navigation/search, book detail and notes, collections, Discover, Explore, and their API boundaries.

## Findings and changes

- Library and search separately downloaded the library. A shared provider now loads it once and refreshes after book mutations, with cancellation and visible recovery.
- Large shelves mounted hundreds of cards and repeated quote components. The shelf now starts with 24 books, adds 24 on demand, and removes unused quote timers and duplicate search UI. Explore starts with four connections. This reduces mounted UI; it is not a measured latency claim.
- Filters were difficult to combine and revisit. Query, status, category, favorites, sorting, collection and grid/list mode now use URL state. Filtering is deferred while typing.
- The home page lacked a clear reading hierarchy. A warm paper and deep green reading room now emphasizes the current book, followed by collections and a searchable shelf. Navigation adapts to a phone bottom bar; controls expose labels and selected states.
- Notes appeared editable but the PATCH whitelist discarded notes. The API accepts validated notes, and the editor verifies the returned value before showing Saved. Failed saves retain the draft; switching detail tabs preserves it. Browser unload prompts protect unsaved work, but in-app route changes are not yet guarded.
- Status updates could overwrite reading dates. Existing dates now survive repeated status selection. Failed book and collection mutations have visible error states.
- Discover mixed a mutable recommendation pool with random topic ordering. Results now stream into a single deduplicated list, remain visible during generation, and support cancellation. Explore preserves deterministic API ordering and filters connections locally.
- Suggested-book imports could substitute the first unrelated Google result. Metadata is adopted only for an ISBN match or matching title and author.
- Broken image URLs now fall back to a book cover rather than leaving a broken image. Unsupported image hosts bypass the optimizer safely.
- Mobile browser testing found that an old search mousedown listener moved the Close button before click completion. Removed the redundant listener; the dialog owns dismissal.

## Verification

Run commands from `/tmp/biblioteca-astra-20260907` after syncing source:

- `npm run build`: successful optimized Next.js build including TypeScript validation.
- `node --test tests/*.test.mjs`: seven regression tests for filter intersections, source order, collection clearing, notes persistence and failure, invalid notes, and date preservation. Database writes are mocked; tests do not alter personal books.
- `npx eslint src tests`: no errors; four pre-existing warnings in import, insights-section, CSV parser and recommendations. Repository-wide lint also includes historical backup scripts with existing CommonJS lint errors.
- `git diff --check`: canonical checkout whitespace check.
- Browser checks use the production build with real library data: search, pagination, mobile navigation and responsive overflow, plus Discover and Explore rendering. Screenshots are stored outside the repository under `.codex/artifacts/biblioteca-astra-20260907`.

## Release boundary

This redesign has not been pushed or deployed. Original staged documentation changes and existing untracked files remain untouched. The earlier Sonnet model repair is present in the working tree and predates this feature.

The app retains its existing single-user authentication/data model. Real database writes, collection reordering, imports and AI generation were not exercised as destructive browser tests during this UI review. No claim of comparative world-best performance or full accessibility certification is made.
