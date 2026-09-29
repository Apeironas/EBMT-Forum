-- profiles tablosuna eksik kolonlari ekle

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash     text,
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_banned         boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_email_verified boolean     NOT NULL DEFAULT false;
