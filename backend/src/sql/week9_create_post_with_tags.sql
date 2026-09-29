-- ===========================================================================
-- Hafta 9 (B5): create_post_with_tags — post + etiketler tek transaction
-- ---------------------------------------------------------------------------
-- ÖNCE: postController.createPost önce postu ekliyor, sonra etiketleri tek tek
-- döngüyle upsert ediyordu. Ortada bir hata olursa etiketsiz/yarım post kalıyor
-- ve kullanıcıya 400 dönüyordu (atomik değil). Ayrıca farklı iki isim aynı slug'a
-- normalize olursa (ör. "C++" ve "c") slug UNIQUE çakışması patlıyordu.
--
-- ÇÖZÜM: Her şeyi tek RPC'de (tek transaction) yap. Hata olursa tamamı geri alınır.
--   * author_id = auth.uid() (istemciden gelen değere güvenilmez)
--   * SECURITY DEFINER: tags/post_tags'e yazmak için (kullanıcıların doğrudan
--     yazma yetkisi yok); ama author_id ve kategori kontrolüyle güvenli.
--   * slug çakışmasında sona kısa ek koyar; aynı isim tekrar gelirse mevcut tag'i kullanır.
--
-- Idempotent: CREATE OR REPLACE. Supabase SQL Editor veya: npm run db:init
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.create_post_with_tags(
  p_title       text,
  p_body        text,
  p_category_id integer,
  p_tags        text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid          uuid := auth.uid();
  new_post_id  uuid;
  t            text;
  tag_name     text;
  tag_slug     text;
  tag_id_var   integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'title_required';
  END IF;
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'body_required';
  END IF;
  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'category_required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_category_id) THEN
    RAISE EXCEPTION 'category_not_found';
  END IF;

  -- 1) Postu ekle (author_id her zaman giriş yapan kullanıcı)
  INSERT INTO public.posts (title, body, author_id, category_id)
  VALUES (trim(p_title), p_body, uid, p_category_id)
  RETURNING id INTO new_post_id;

  -- 2) Etiketler (varsa)
  IF p_tags IS NOT NULL THEN
    FOREACH t IN ARRAY p_tags LOOP
      tag_name := trim(t);
      CONTINUE WHEN tag_name IS NULL OR tag_name = '';

      -- slug üret: küçük harf, alfanumerik + tire
      tag_slug := lower(tag_name);
      tag_slug := regexp_replace(tag_slug, '[^a-z0-9\s-]', '', 'g');
      tag_slug := regexp_replace(tag_slug, '[\s_-]+', '-', 'g');
      tag_slug := trim(both '-' from tag_slug);
      IF tag_slug = '' THEN
        tag_slug := 'tag';
      END IF;

      -- Aynı isimde etiket var mı? Varsa onu kullan.
      SELECT id INTO tag_id_var FROM public.tags WHERE name = tag_name;

      IF tag_id_var IS NULL THEN
        -- Yeni etiket: slug başka bir isim tarafından kullanılıyorsa benzersiz yap
        IF EXISTS (SELECT 1 FROM public.tags WHERE slug = tag_slug) THEN
          tag_slug := left(tag_slug, 40) || '-' || substr(md5(tag_name), 1, 4);
        END IF;

        INSERT INTO public.tags (name, slug)
        VALUES (tag_name, tag_slug)
        ON CONFLICT (name) DO NOTHING
        RETURNING id INTO tag_id_var;

        -- Eşzamanlı ekleme yarışı olduysa tekrar oku
        IF tag_id_var IS NULL THEN
          SELECT id INTO tag_id_var FROM public.tags WHERE name = tag_name;
        END IF;
      END IF;

      -- Post ↔ etiket bağla
      INSERT INTO public.post_tags (post_id, tag_id)
      VALUES (new_post_id, tag_id_var)
      ON CONFLICT (post_id, tag_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN new_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_post_with_tags(text, text, integer, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_post_with_tags(text, text, integer, text[]) TO authenticated;
