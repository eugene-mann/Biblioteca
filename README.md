# Biblioteca

A personal reading curator — organize your books, extract knowledge, and discover new reading lists.

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

## Features

- **Library management** — Add books manually or import from Kindle/Goodreads CSV
- **Smart search** — Three-tier search: instant local results, popular books cache, Google Books API fallback
- **AI-powered insights** — Key themes, quotes, and "Why Read This" summaries generated via Claude
- **Discover** — AI-driven book recommendations based on your reading history
- **Explore** — Thematic clusters that reveal connections across your library
- **Collections** — Custom groupings with drag-to-reorder and carousel display
- **Editorial design** — Warm cream palette, Playfair Display + Libre Franklin typography

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **APIs:** Google Books API, Claude API (Anthropic)
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- [Google Books API key](https://developers.google.com/books/docs/v1/using)
- [Anthropic API key](https://console.anthropic.com)

### Setup

```bash
git clone https://github.com/eugene-mann/Biblioteca.git
cd Biblioteca
npm install
```

Copy the example environment file and fill in your keys:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

[MIT](LICENSE)
