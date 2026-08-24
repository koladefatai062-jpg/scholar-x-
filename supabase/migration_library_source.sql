-- ============================================================
-- ScholarX — Migration: fix library_items schema
-- Adds missing columns: type, content, source
-- Run this in the Supabase SQL editor if columns are missing.
-- ============================================================

ALTER TABLE library_items ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'note';
ALTER TABLE library_items ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE library_items ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'custom';
