-- ===========================================================================
-- Hafta 6c: profiles tablosundaki eksik kolonların tamamlanması
-- ---------------------------------------------------------------------------
-- SORUN: profiles tablosu init.sql'den ÖNCE (farklı bir şablonla) oluşturulmuştu.
-- init.sql'deki "CREATE TABLE IF NOT EXISTS profiles" bu yüzden hiç çalışmadı ve
-- şu kolonlar hiç eklenmedi: password_hash, updated_at, is_banned, is_email_verified.
--
-- BELİRTİ: Yeni kayıt (auth.users insert) sırasında handle_new_user trigger'ı
-- "column password_hash does not exist" ile patlıyor → Supabase "Database error
-- saving new user" (500) döndürüyor → kayıt hiç tamamlanmıyor.
--
-- ÇÖZÜM: Eksik kolonları ekle. Hem trigger hem de profileController.js bu
-- kolonları bekliyor (getProfile is_banned/is_email_verified/updated_at okuyor).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS. Supabase SQL Editor veya: npm run db:init
-- ===========================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash     text,
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_banned         boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_email_verified boolean     NOT NULL DEFAULT false;
