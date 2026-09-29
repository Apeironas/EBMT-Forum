-- Hafta 3: Oylama (polimorfik + transaction RPC), karma, favoriler, soft delete, unique vote
-- Supabase SQL Editor veya migration ile çalıştırın.

-- ---------------------------------------------------------------------------
-- Sütunlar: oy sayaçları, soft delete
-- ---------------------------------------------------------------------------
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS upvote_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvote_count integer NOT NULL DEFAULT 0;

-- Silinmiş postlar herkese açık listelerde görünmesin
DROP POLICY IF EXISTS "Herkes postları görebilir" ON public.posts;
DROP POLICY IF EXISTS "Public can read posts" ON public.posts;
CREATE POLICY "Public can read non-deleted posts"
  ON public.posts FOR SELECT
  USING (deleted_at IS NULL);

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS upvote_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvote_count integer NOT NULL DEFAULT 0;

-- Mevcut satırlar için sayaçları sıfırda bırak (isteğe bağlı backfill yapılabilir)

-- ---------------------------------------------------------------------------
-- Polimorfik oy: kullanıcı + hedef tipi + hedef id tek oylama
-- ---------------------------------------------------------------------------
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_user_id_target_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'votes_user_target_unique'
  ) THEN
    ALTER TABLE public.votes
      ADD CONSTRAINT votes_user_target_unique UNIQUE (user_id, target_type, target_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Favoriler
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_favorites (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_favorites_post_id ON public.post_favorites(post_id);

ALTER TABLE public.post_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own favorites" ON public.post_favorites;
CREATE POLICY "Users read own favorites"
  ON public.post_favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own favorites" ON public.post_favorites;
CREATE POLICY "Users insert own favorites"
  ON public.post_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own favorites" ON public.post_favorites;
CREATE POLICY "Users delete own favorites"
  ON public.post_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Moderatör / admin: başkasının post ve yorumunu güncelleyebilir (soft delete dahil)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Elevated can update any post" ON public.posts;
CREATE POLICY "Elevated can update any post"
  ON public.posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(p.role) IN ('admin', 'moderator')
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "Elevated can update any comment" ON public.comments;
CREATE POLICY "Elevated can update any comment"
  ON public.comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(p.role) IN ('admin', 'moderator')
    )
  )
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- cast_vote: tek transaction içinde oy + sayaç + karma (içerik sahibi)
-- Aynı değere tekrar oy: oy kaldırılır (toggle off).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_target_type text,
  p_target_id uuid,
  p_vote_value integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  old_val integer;
  author uuid;
  removed boolean := false;
  out_row public.votes%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_target_type NOT IN ('post', 'comment') THEN
    RAISE EXCEPTION 'invalid_target_type';
  END IF;
  IF p_vote_value NOT IN (1, -1) THEN
    RAISE EXCEPTION 'invalid_vote_value';
  END IF;

  IF p_target_type = 'post' THEN
    SELECT author_id INTO author
    FROM public.posts
    WHERE id = p_target_id AND deleted_at IS NULL;
  ELSE
    SELECT author_id INTO author
    FROM public.comments
    WHERE id = p_target_id AND deleted_at IS NULL;
  END IF;

  IF author IS NULL THEN
    RAISE EXCEPTION 'target_not_found';
  END IF;

  SELECT vote_value INTO old_val
  FROM public.votes
  WHERE user_id = uid AND target_type = p_target_type AND target_id = p_target_id;

  IF old_val IS NULL THEN
    INSERT INTO public.votes (user_id, target_type, target_id, vote_value)
    VALUES (uid, p_target_type, p_target_id, p_vote_value);

    IF p_vote_value = 1 THEN
      IF p_target_type = 'post' THEN
        UPDATE public.posts SET upvote_count = upvote_count + 1 WHERE id = p_target_id;
      ELSE
        UPDATE public.comments SET upvote_count = upvote_count + 1 WHERE id = p_target_id;
      END IF;
    ELSE
      IF p_target_type = 'post' THEN
        UPDATE public.posts SET downvote_count = downvote_count + 1 WHERE id = p_target_id;
      ELSE
        UPDATE public.comments SET downvote_count = downvote_count + 1 WHERE id = p_target_id;
      END IF;
    END IF;

    UPDATE public.profiles
    SET reputation_score = reputation_score + p_vote_value
    WHERE id = author;

  ELSIF old_val = p_vote_value THEN
    DELETE FROM public.votes
    WHERE user_id = uid AND target_type = p_target_type AND target_id = p_target_id;
    removed := true;

    IF p_vote_value = 1 THEN
      IF p_target_type = 'post' THEN
        UPDATE public.posts SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = p_target_id;
      ELSE
        UPDATE public.comments SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = p_target_id;
      END IF;
    ELSE
      IF p_target_type = 'post' THEN
        UPDATE public.posts SET downvote_count = GREATEST(0, downvote_count - 1) WHERE id = p_target_id;
      ELSE
        UPDATE public.comments SET downvote_count = GREATEST(0, downvote_count - 1) WHERE id = p_target_id;
      END IF;
    END IF;

    UPDATE public.profiles
    SET reputation_score = reputation_score - p_vote_value
    WHERE id = author;

  ELSE
    UPDATE public.votes
    SET vote_value = p_vote_value
    WHERE user_id = uid AND target_type = p_target_type AND target_id = p_target_id;

    IF old_val = 1 AND p_vote_value = -1 THEN
      IF p_target_type = 'post' THEN
        UPDATE public.posts
        SET upvote_count = GREATEST(0, upvote_count - 1), downvote_count = downvote_count + 1
        WHERE id = p_target_id;
      ELSE
        UPDATE public.comments
        SET upvote_count = GREATEST(0, upvote_count - 1), downvote_count = downvote_count + 1
        WHERE id = p_target_id;
      END IF;
    ELSE
      IF p_target_type = 'post' THEN
        UPDATE public.posts
        SET downvote_count = GREATEST(0, downvote_count - 1), upvote_count = upvote_count + 1
        WHERE id = p_target_id;
      ELSE
        UPDATE public.comments
        SET downvote_count = GREATEST(0, downvote_count - 1), upvote_count = upvote_count + 1
        WHERE id = p_target_id;
      END IF;
    END IF;

    UPDATE public.profiles
    SET reputation_score = reputation_score + (p_vote_value - old_val)
    WHERE id = author;
  END IF;

  IF removed THEN
    RETURN json_build_object('removed', true, 'vote', NULL);
  END IF;

  SELECT * INTO out_row
  FROM public.votes
  WHERE user_id = uid AND target_type = p_target_type AND target_id = p_target_id;

  RETURN json_build_object('removed', false, 'vote', row_to_json(out_row));
END;
$$;

REVOKE ALL ON FUNCTION public.cast_vote(text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cast_vote(text, uuid, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- Yorum alt ağacı soft delete (sahip veya admin/moderatör)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_comment_subtree(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  ok boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.comments c
    WHERE c.id = p_comment_id
      AND c.deleted_at IS NULL
      AND (
        c.author_id = uid
        OR EXISTS (
          SELECT 1 FROM public.profiles prof
          WHERE prof.id = uid
            AND lower(prof.role) IN ('admin', 'moderator')
        )
      )
  ) INTO ok;

  IF NOT ok THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH RECURSIVE subtree AS (
    SELECT id FROM public.comments WHERE id = p_comment_id AND deleted_at IS NULL
    UNION ALL
    SELECT c.id
    FROM public.comments c
    JOIN subtree s ON c.parent_id = s.id
    WHERE c.deleted_at IS NULL
  )
  UPDATE public.comments c
  SET deleted_at = now(), updated_at = now()
  FROM subtree s
  WHERE c.id = s.id;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_comment_subtree(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_comment_subtree(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Post soft delete (sahip veya admin/moderatör)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_post(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  ok boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = p_post_id
      AND p.deleted_at IS NULL
      AND (
        p.author_id = uid
        OR EXISTS (
          SELECT 1 FROM public.profiles prof
          WHERE prof.id = uid
            AND lower(prof.role) IN ('admin', 'moderator')
        )
      )
  ) INTO ok;

  IF NOT ok THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.posts
  SET deleted_at = now(), updated_at = now()
  WHERE id = p_post_id AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_post(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Yorum ağacı: silinmiş yorumları gösterme
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_post_comments_tree(p_post_id uuid)
RETURNS TABLE (
  id uuid,
  body text,
  author_id uuid,
  post_id uuid,
  parent_id uuid,
  depth int,
  path uuid[],
  created_at timestamptz,
  updated_at timestamptz,
  author_username text,
  author_avatar text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH RECURSIVE t AS (
    SELECT
      c.id,
      c.body,
      c.author_id,
      c.post_id,
      c.parent_id,
      0 AS depth,
      ARRAY[c.id] AS path,
      c.created_at,
      c.updated_at
    FROM public.comments c
    WHERE c.post_id = p_post_id
      AND c.parent_id IS NULL
      AND c.deleted_at IS NULL

    UNION ALL

    SELECT
      c.id,
      c.body,
      c.author_id,
      c.post_id,
      c.parent_id,
      t.depth + 1,
      t.path || c.id,
      c.created_at,
      c.updated_at
    FROM public.comments c
    JOIN t ON c.parent_id = t.id
    WHERE c.post_id = p_post_id
      AND c.deleted_at IS NULL
  )
  SELECT
    t.id,
    t.body,
    t.author_id,
    t.post_id,
    t.parent_id,
    t.depth,
    t.path,
    t.created_at,
    t.updated_at,
    p.username AS author_username,
    p.avatar_url AS author_avatar
  FROM t
  JOIN public.profiles p ON p.id = t.author_id
  ORDER BY t.path;
$$;
