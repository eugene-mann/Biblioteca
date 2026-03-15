-- Book changelog / activity feed
-- Tracks additions, removals, and field changes for library books

CREATE TABLE book_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID,  -- nullable: book may be deleted
  book_title TEXT NOT NULL,
  book_cover_url TEXT,
  action TEXT NOT NULL CHECK (action IN (
    'added', 'removed',
    'rating_changed', 'category_changed', 'status_changed', 'favorite_changed'
  )),
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

CREATE INDEX idx_changelog_user_date ON book_changelog (user_id, created_at DESC);
CREATE INDEX idx_changelog_book ON book_changelog (book_id);

-- Seed changelog with existing books' date_added
INSERT INTO book_changelog (book_id, book_title, book_cover_url, action, created_at, user_id)
SELECT id, title, cover_image_url, 'added', date_added, user_id
FROM books;
