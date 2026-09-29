-- RLS'i aktifleştir ve tablolar için erişim politikalarını tanımla

CREATE OR REPLACE FUNCTION public.is_elevated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.role) IN ('admin', 'moderator')
  );
$$;

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Herkes profilleri okuyabilir (kullanıcı adı/avatar gönderilerde gösteriliyor).
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

-- Kullanıcı sadece kendi profilini güncelleyebilir.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- NOT: INSERT politikası bilinçli olarak yok. Profil kaydı handle_new_user()
-- trigger'ı (SECURITY DEFINER) ile açılır; o RLS'yi baypas eder.

-- posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read non-deleted posts" ON public.posts;
DROP POLICY IF EXISTS "posts_select_public" ON public.posts;
CREATE POLICY "posts_select_public"
  ON public.posts FOR SELECT
  USING (deleted_at IS NULL);

-- Giriş yapmış kullanıcı sadece kendi adına post açabilir.
DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;
CREATE POLICY "posts_insert_own"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Sahibi veya admin/moderatör güncelleyebilir (soft delete RPC üzerinden gider).
DROP POLICY IF EXISTS "Elevated can update any post" ON public.posts;
DROP POLICY IF EXISTS "posts_update_owner_or_elevated" ON public.posts;
CREATE POLICY "posts_update_owner_or_elevated"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id OR public.is_elevated())
  WITH CHECK (auth.uid() = author_id OR public.is_elevated());

-- comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_public" ON public.comments;
CREATE POLICY "comments_select_public"
  ON public.comments FOR SELECT
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
CREATE POLICY "comments_insert_own"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Elevated can update any comment" ON public.comments;
DROP POLICY IF EXISTS "comments_update_owner_or_elevated" ON public.comments;
CREATE POLICY "comments_update_owner_or_elevated"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id OR public.is_elevated())
  WITH CHECK (auth.uid() = author_id OR public.is_elevated());

-- votes  (doğrudan yazma yok; cast_vote RPC'si yönetir)
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Kullanıcı sadece kendi oylarını okuyabilir (ör. "bu gönderiye oy verdim mi").
DROP POLICY IF EXISTS "votes_select_own" ON public.votes;
CREATE POLICY "votes_select_own"
  ON public.votes FOR SELECT
  USING (auth.uid() = user_id);

-- NOT: INSERT/UPDATE/DELETE politikası YOK. Oylama yalnızca cast_vote()
-- (SECURITY DEFINER) üzerinden yapılır; doğrudan tabloya yazma engellenir.

-- tags / post_tags / categories  (yazma backend'de service_role ile)
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_select_public" ON public.tags;
CREATE POLICY "tags_select_public"
  ON public.tags FOR SELECT
  USING (true);

ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_tags_select_public" ON public.post_tags;
CREATE POLICY "post_tags_select_public"
  ON public.post_tags FOR SELECT
  USING (true);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public"
  ON public.categories FOR SELECT
  USING (true);

-- NOT: tags/post_tags/categories için INSERT/UPDATE/DELETE politikası yok.
-- Bu işlemler backend'de supabaseAdmin (service_role) ile yapılır ve RLS baypas edilir.
-- İleride kullanıcıya doğrudan etiket ekletmek istersen buraya INSERT politikası eklenir.
