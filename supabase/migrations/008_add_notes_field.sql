-- Add personal notes field to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
