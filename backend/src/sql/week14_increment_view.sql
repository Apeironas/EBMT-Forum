-- ===========================================================================
-- Hafta 14: Gönderi görüntülenme sayacı (view_count) artışı
-- ---------------------------------------------------------------------------
-- Tekil gönderi açıldığında (GET /api/posts/:id) view_count 1 artar.
-- RPC ile yapılır ki REST üzerinden atomik "col = col + 1" çalışsın.
-- Herkese açık (anon dahil) — görüntülenme oturum gerektirmez.
--
-- Idempotent. Supabase SQL Editor veya: npm run db:init
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.increment_post_view(p_post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts
  SET view_count = view_count + 1
  WHERE id = p_post_id AND deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.increment_post_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_post_view(uuid) TO anon, authenticated;
