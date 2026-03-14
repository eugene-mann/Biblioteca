-- Collections: user-defined groupings of books
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS collection_books (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, book_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_books_book_id ON collection_books(book_id);
CREATE INDEX IF NOT EXISTS idx_collection_books_collection_id ON collection_books(collection_id);
