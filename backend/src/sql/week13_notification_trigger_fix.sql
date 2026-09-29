-- Yorum bildirimi triggerini yeniden olustur

DROP TRIGGER IF EXISTS tr_notify_post_author_on_comment ON public.comments;
CREATE TRIGGER tr_notify_post_author_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_post_author_on_comment();
