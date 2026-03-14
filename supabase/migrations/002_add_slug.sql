-- Add slug column to books
ALTER TABLE books ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX idx_books_slug ON books(slug);
