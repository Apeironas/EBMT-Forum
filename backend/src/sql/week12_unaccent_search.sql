-- Aramayi Turkce karakterlere duyarsiz yap (unaccent)

CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent(text) STABLE'dır; generated column için IMMUTABLE sarmalayıcı:
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$;

-- search_tsv'yi unaccent'li yeniden üret (eski sütun + index düşürülüp kurulur)
ALTER TABLE public.posts DROP COLUMN IF EXISTS search_tsv;

ALTER TABLE public.posts
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', public.f_unaccent(coalesce(title, '') || ' ' || coalesce(body, '')))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_posts_search_tsv ON public.posts USING gin (search_tsv);
