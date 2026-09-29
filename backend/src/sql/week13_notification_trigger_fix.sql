-- ===========================================================================
-- Hafta 13: Bildirim trigger'ının onarımı
-- ---------------------------------------------------------------------------
-- SORUN: notify_post_author_on_comment() fonksiyonu vardı ama onu çağıran
-- tr_notify_post_author_on_comment trigger'ı comments tablosunda YOKTU
-- (muhtemelen comments tablosu bir noktada yeniden oluşturulunca düştü).
-- Sonuç: bir gönderiye yorum yapılınca gönderi sahibine bildirim OLUŞMUYORDU.
--
-- ÇÖZÜM: Trigger'ı yeniden kur. (Fonksiyon week5b'de tanımlı; garanti için
-- burada da yeniden tanımlanabilir ama mevcut olanı bozmuyoruz.)
--
-- Idempotent. Supabase SQL Editor veya: npm run db:init
-- ===========================================================================

DROP TRIGGER IF EXISTS tr_notify_post_author_on_comment ON public.comments;
CREATE TRIGGER tr_notify_post_author_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_post_author_on_comment();
