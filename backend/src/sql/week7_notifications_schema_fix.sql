-- notifications tablosunun eksik kolonlarını tamamla

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
