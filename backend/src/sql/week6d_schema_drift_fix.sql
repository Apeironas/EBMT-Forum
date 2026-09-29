-- categories/posts/tags tablolarına eksik kolonları ekle

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_pinned  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
