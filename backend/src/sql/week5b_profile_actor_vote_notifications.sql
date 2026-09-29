-- Hafta 4–5 tamamlama: profil alanları, bildirimde tetikleyen kullanıcı, oy bildirimi
-- init_db zincirinde week5_notifications.sql sonrası çalışır.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bio TEXT;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Auth → profil: görünen ad ve bio (metadata'dan)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
  dname text;
  bio text;
BEGIN
  uname := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  );
  IF length(uname) > 50 THEN
    uname := left(uname, 50);
  END IF;

  dname := NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), '');
  IF dname IS NOT NULL AND length(dname) > 100 THEN
    dname := left(dname, 100);
  END IF;

  bio := NULLIF(trim(NEW.raw_user_meta_data->>'bio'), '');
  IF bio IS NOT NULL AND length(bio) > 2000 THEN
    bio := left(bio, 2000);
  END IF;

  INSERT INTO public.profiles (id, username, email, password_hash, role, display_name, bio)
  VALUES (NEW.id, uname, NEW.email, NULL, 'user', dname, bio)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        username = CASE
          WHEN public.profiles.username IS NULL OR public.profiles.username = ''
          THEN EXCLUDED.username
          ELSE public.profiles.username
        END,
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
        bio = COALESCE(public.profiles.bio, EXCLUDED.bio),
        updated_at = now();

  RETURN NEW;
END;
$$;

-- Yorum bildirimi: tetikleyen kullanıcı
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

  INSERT INTO public.notifications (user_id, type, body, data, actor_user_id)
  VALUES (
    post_author,
    'comment_on_post',
    'Gönderinize yeni bir yorum yapıldı.',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'comment_id', NEW.id,
      'comment_author_id', NEW.author_id
    ),
    NEW.author_id
  );

  RETURN NEW;
END;
$$;

-- Oy bildirimi (yalnızca INSERT; cast_vote RPC satır eklediğinde tetiklenir)
CREATE OR REPLACE FUNCTION public.notify_content_author_on_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_author uuid;
BEGIN
  IF NEW.target_type = 'post' THEN
    SELECT author_id INTO content_author
    FROM public.posts
    WHERE id = NEW.target_id AND deleted_at IS NULL;
  ELSE
    SELECT author_id INTO content_author
    FROM public.comments
    WHERE id = NEW.target_id AND deleted_at IS NULL;
  END IF;

  IF content_author IS NULL OR content_author = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, body, data, actor_user_id)
  VALUES (
    content_author,
    'vote_received',
    'İçeriğinize oy verildi.',
    jsonb_build_object(
      'target_type', NEW.target_type,
      'target_id', NEW.target_id,
      'vote_value', NEW.vote_value
    ),
    NEW.user_id
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_content_author_on_vote() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_notify_content_author_on_vote ON public.votes;
CREATE TRIGGER tr_notify_content_author_on_vote
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_content_author_on_vote();
