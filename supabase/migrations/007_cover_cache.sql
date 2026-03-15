-- Cache for book cover lookups to avoid repeated Open Library / Google Books API calls
CREATE TABLE IF NOT EXISTS cover_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_key TEXT NOT NULL UNIQUE, -- lowercase "title|author"
  cover_image_url TEXT,
  isbn_13 TEXT,
  amazon_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cover_cache_lookup_key ON cover_cache (lookup_key);

-- RLS
ALTER TABLE cover_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cover_cache_read" ON cover_cache FOR SELECT USING (true);
CREATE POLICY "cover_cache_write" ON cover_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "cover_cache_update" ON cover_cache FOR UPDATE USING (true);
