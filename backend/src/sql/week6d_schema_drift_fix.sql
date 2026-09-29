-- ===========================================================================
-- Hafta 6d: Kalan şema kaymalarının tamamlanması (Enis'in categories bulgusu dahil)
-- ---------------------------------------------------------------------------
-- init.sql'deki CREATE TABLE IF NOT EXISTS, tablolar önceden var olduğu için
-- atlanmıştı. Bu yüzden bazı tablolarda init.sql'in tanımladığı kolonlar eksik.
-- (profiles kolonları week6c'de eklendi; burada categories/posts/tags tamamlanıyor.)
--
-- Tespit (gerçek DB vs init.sql):
--   categories : description, created_at eksik
--   posts      : is_pinned, view_count eksik
--   tags       : created_at eksik
--   comments   : tam
--
-- Idempotent: ADD COLUMN IF NOT EXISTS. Supabase SQL Editor veya: npm run db:init
-- ===========================================================================

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_pinned  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
