-- Biblioteca v1 Schema

-- Enums
CREATE TYPE book_source AS ENUM ('manual', 'csv', 'kindle', 'search');
CREATE TYPE book_status AS ENUM ('want_to_read', 'reading', 'read');
CREATE TYPE topic_source AS ENUM ('library_derived', 'reading_list');

-- Books table
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  authors TEXT[] NOT NULL DEFAULT '{}',
  cover_image_url TEXT,
  isbn_10 TEXT,
  isbn_13 TEXT,
  publisher TEXT,
  published_date TEXT,
  page_count INTEGER,
  description TEXT,
  categories TEXT[] DEFAULT '{}',
  language TEXT,
  amazon_link TEXT,
  source book_source NOT NULL DEFAULT 'manual',
  status book_status NOT NULL DEFAULT 'want_to_read',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  date_added TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_started TIMESTAMPTZ,
  date_finished TIMESTAMPTZ,
  user_id UUID NOT NULL
);

-- Reading lists (pre-seeded reference data)
CREATE TABLE reading_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_url TEXT,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Recommendation topics
CREATE TABLE recommendation_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  source topic_source NOT NULL,
  reading_list_id UUID REFERENCES reading_lists(id),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  authors TEXT[] NOT NULL DEFAULT '{}',
  isbn TEXT,
  cover_image_url TEXT,
  amazon_link TEXT,
  reasoning TEXT NOT NULL,
  based_on_book_ids UUID[] DEFAULT '{}',
  dismissed BOOLEAN NOT NULL DEFAULT false,
  added_to_library BOOLEAN NOT NULL DEFAULT false,
  topic_id UUID REFERENCES recommendation_topics(id),
  library_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Library version tracking
CREATE TABLE library_metadata (
  user_id UUID PRIMARY KEY,
  library_version INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_books_user_id ON books(user_id);
CREATE INDEX idx_books_status ON books(user_id, status);
CREATE INDEX idx_books_isbn ON books(isbn_13);
CREATE INDEX idx_recommendations_user_topic ON recommendations(user_id, topic_id);
CREATE INDEX idx_recommendations_dismissed ON recommendations(user_id, dismissed);
CREATE INDEX idx_recommendation_topics_user ON recommendation_topics(user_id);

-- Seed reading lists
INSERT INTO reading_lists (name, category) VALUES
  ('Bill Gates Reading List', 'celebrity'),
  ('Hugo Award Winners', 'award'),
  ('Pulitzer Prize Fiction', 'award'),
  ('NYT Best of 2025', 'publication'),
  ('Obama Summer Reading', 'celebrity'),
  ('Booker Prize Winners', 'award'),
  ('National Book Award Winners', 'award');
