-- Kabul edilen cevap: accepted_comment_id + accept/unaccept fonksiyonları

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS accepted_comment_id uuid
  REFERENCES public.comments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_accepted_comment
  ON public.posts (accepted_comment_id)
  WHERE accepted_comment_id IS NOT NULL;

-- Cevabı kabul et
CREATE OR REPLACE FUNCTION public.accept_answer(p_post_id uuid, p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid       uuid := auth.uid();
  v_author  uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT author_id INTO v_author
  FROM public.posts
  WHERE id = p_post_id AND deleted_at IS NULL;

  IF v_author IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Yalnızca gönderi sahibi veya admin/moderatör
  IF NOT (v_author = uid OR public.is_elevated()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Yorum bu gönderiye ait ve silinmemiş olmalı
  IF NOT EXISTS (
    SELECT 1 FROM public.comments
    WHERE id = p_comment_id AND post_id = p_post_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'comment_not_found';
  END IF;

  UPDATE public.posts
  SET accepted_comment_id = p_comment_id, updated_at = now()
  WHERE id = p_post_id;
END;
$$;

-- Kabulü geri al
CREATE OR REPLACE FUNCTION public.unaccept_answer(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid       uuid := auth.uid();
  v_author  uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT author_id INTO v_author
  FROM public.posts
  WHERE id = p_post_id AND deleted_at IS NULL;

  IF v_author IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  IF NOT (v_author = uid OR public.is_elevated()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.posts
  SET accepted_comment_id = NULL, updated_at = now()
  WHERE id = p_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_answer(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_answer(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.unaccept_answer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unaccept_answer(uuid) TO authenticated;
