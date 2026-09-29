-- Hafta 5: Bildirimler tablosu + yorum geldiğinde gönderi sahibine bildirim
-- Supabase SQL Editor veya: npm run db:init

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  body        TEXT,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sunucu (service role / postgres pool) RLS'yi baypas eder; istemci SDK için yukarıdaki politikalar geçerlidir.

CREATE OR REPLACE FUNCTION public.notify_post_author_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author uuid;
BEGIN
  SELECT p.author_id INTO post_author
  FROM public.posts p
  WHERE p.id = NEW.post_id AND p.deleted_at IS NULL;

  IF post_author IS NULL OR post_author = NEW.author_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, body, data)
  VALUES (
    post_author,
    'comment_on_post',
    'Gönderinize yeni bir yorum yapıldı.',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'comment_id', NEW.id,
      'comment_author_id', NEW.author_id
    )
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_post_author_on_comment() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_notify_post_author_on_comment ON public.comments;
CREATE TRIGGER tr_notify_post_author_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_post_author_on_comment();
