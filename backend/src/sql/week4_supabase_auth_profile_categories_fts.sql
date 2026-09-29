-- Hafta 4: Supabase Auth → public.profiles senkronu, kategori tohumları, post tam metin araması (FTS)
-- Supabase SQL Editor veya: npm run db:init (tüm migration zinciri)
-- Not: auth şeması yalnızca Supabase PostgreSQL üzerinde mevcuttur.

-- ---------------------------------------------------------------------------
-- 1) Yeni kayıt: auth.users → profiles (id = auth kullanıcı id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
BEGIN
  uname := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  );
  IF length(uname) > 50 THEN
    uname := left(uname, 50);
  END IF;

  INSERT INTO public.profiles (id, username, email, password_hash, role)
  VALUES (NEW.id, uname, NEW.email, NULL, 'user')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        username = CASE
          WHEN public.profiles.username IS NULL OR public.profiles.username = ''
          THEN EXCLUDED.username
          ELSE public.profiles.username
        END,
        updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2) Başlangıç kategorileri (post oluşturmak için en az bir kategori gerekir)
-- ---------------------------------------------------------------------------
INSERT INTO public.categories (name, slug, description)
VALUES
  ('Genel', 'genel', 'Genel tartışmalar ve duyurular'),
  ('Dersler', 'dersler', 'Ders içeriği ve sorular'),
  ('Proje', 'proje', 'Proje ve ödev yardımı'),
  ('Kariyer', 'kariyer', 'Staj, iş ve kariyer')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Post tam metin araması: tsvector + GIN (PostgreSQL 12+ GENERATED STORED)
-- ---------------------------------------------------------------------------
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(body, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_posts_search_tsv ON public.posts USING gin (search_tsv);
