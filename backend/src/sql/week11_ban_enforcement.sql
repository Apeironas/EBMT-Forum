-- Ban'lı kullanıcının post/yorum/oy yapmasını engelle (RLS + RPC)

CREATE OR REPLACE FUNCTION public.is_banned()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- RLS: insert politikalarına ban kontrolü ekle (doğrudan erişim için savunma)
DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;
CREATE POLICY "posts_insert_own"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id AND NOT public.is_banned());

DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
CREATE POLICY "comments_insert_own"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id AND NOT public.is_banned());

-- create_post_with_tags: başına ban kontrolü (RPC RLS'i baypas ettiği için)
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
  IF public.is_banned() THEN
    RAISE EXCEPTION 'user_banned';
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

  INSERT INTO public.posts (title, body, author_id, category_id)
  VALUES (trim(p_title), p_body, uid, p_category_id)
  RETURNING id INTO new_post_id;

  IF p_tags IS NOT NULL THEN
    FOREACH t IN ARRAY p_tags LOOP
      tag_name := trim(t);
      CONTINUE WHEN tag_name IS NULL OR tag_name = '';

      tag_slug := lower(tag_name);
      tag_slug := regexp_replace(tag_slug, '[^a-z0-9\s-]', '', 'g');
      tag_slug := regexp_replace(tag_slug, '[\s_-]+', '-', 'g');
      tag_slug := trim(both '-' from tag_slug);
      IF tag_slug = '' THEN
        tag_slug := 'tag';
      END IF;

      SELECT id INTO tag_id_var FROM public.tags WHERE name = tag_name;

      IF tag_id_var IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.tags WHERE slug = tag_slug) THEN
          tag_slug := left(tag_slug, 40) || '-' || substr(md5(tag_name), 1, 4);
        END IF;

        INSERT INTO public.tags (name, slug)
        VALUES (tag_name, tag_slug)
        ON CONFLICT (name) DO NOTHING
        RETURNING id INTO tag_id_var;

        IF tag_id_var IS NULL THEN
          SELECT id INTO tag_id_var FROM public.tags WHERE name = tag_name;
        END IF;
      END IF;

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

-- cast_vote: başına ban kontrolü
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
  IF public.is_banned() THEN
    RAISE EXCEPTION 'user_banned';
  END IF;
  IF p_target_type NOT IN ('post', 'comment') THEN
    RAISE EXCEPTION 'invalid_target_type';
  END IF;
  IF p_vote_value NOT IN (1, -1) THEN
    RAISE EXCEPTION 'invalid_vote_value';
  END IF;

  IF p_target_type = 'post' THEN
    SELECT author_id INTO author FROM public.posts WHERE id = p_target_id AND deleted_at IS NULL;
  ELSE
    SELECT author_id INTO author FROM public.comments WHERE id = p_target_id AND deleted_at IS NULL;
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

    UPDATE public.profiles SET reputation_score = reputation_score + p_vote_value WHERE id = author;

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

    UPDATE public.profiles SET reputation_score = reputation_score - p_vote_value WHERE id = author;

  ELSE
    UPDATE public.votes SET vote_value = p_vote_value
    WHERE user_id = uid AND target_type = p_target_type AND target_id = p_target_id;

    IF old_val = 1 AND p_vote_value = -1 THEN
      IF p_target_type = 'post' THEN
        UPDATE public.posts SET upvote_count = GREATEST(0, upvote_count - 1), downvote_count = downvote_count + 1 WHERE id = p_target_id;
      ELSE
        UPDATE public.comments SET upvote_count = GREATEST(0, upvote_count - 1), downvote_count = downvote_count + 1 WHERE id = p_target_id;
      END IF;
    ELSE
      IF p_target_type = 'post' THEN
        UPDATE public.posts SET downvote_count = GREATEST(0, downvote_count - 1), upvote_count = upvote_count + 1 WHERE id = p_target_id;
      ELSE
        UPDATE public.comments SET downvote_count = GREATEST(0, downvote_count - 1), upvote_count = upvote_count + 1 WHERE id = p_target_id;
      END IF;
    END IF;

    UPDATE public.profiles SET reputation_score = reputation_score + (p_vote_value - old_val) WHERE id = author;
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
