-- ===========================================================================
-- Hafta 7: notifications tablosu şema kayması düzeltmesi
-- ---------------------------------------------------------------------------
-- SORUN: notifications tablosu week5_notifications.sql'den ÖNCE farklı bir
-- şemayla oluşturulmuştu. Gerçek tablo: target_type, target_id, is_read içeriyor;
-- ama kod (notificationController + notify_post_author_on_comment trigger'ı)
-- type, body, data, read_at bekliyor.
--
-- BELİRTİ 1: GET /api/notifications → "column 'type' does not exist"
-- BELİRTİ 2 (gizli): Başka bir kullanıcı bir gönderiye yorum yapınca notify
--   trigger'ı notifications'a INSERT ediyor ama target_type/target_id NOT NULL
--   olduğu ve trigger bunları doldurmadığı için INSERT patlıyor → yorum eklenmesi
--   komple geri alınıyor. (Kendi postuna yorumda trigger erken çıktığı için görünmüyor.)
--
-- ÇÖZÜM:
--   1) Kodun beklediği kolonları ekle (type, body, data, read_at).
--   2) Kullanılmayan target_type/target_id'nin NOT NULL kısıtını gevşet
--      (taze DB'de bu kolonlar olmayabileceği için IF EXISTS ile korumalı).
--
-- Idempotent. Supabase SQL Editor veya: npm run db:init
-- ===========================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type    text  NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS body    text,
  ADD COLUMN IF NOT EXISTS data    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Kodun kullanmadığı eski NOT NULL kolonların kısıtını gevşet (varsa).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='notifications' AND column_name='target_type') THEN
    ALTER TABLE public.notifications ALTER COLUMN target_type DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='notifications' AND column_name='target_id') THEN
    ALTER TABLE public.notifications ALTER COLUMN target_id DROP NOT NULL;
  END IF;
END $$;
