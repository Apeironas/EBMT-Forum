-- ===========================================================================
-- Hafta 8 (B3): handle_new_user — username çakışmasında kayıt patlamasın
-- ---------------------------------------------------------------------------
-- SORUN: profiles.username UNIQUE (profiles_username_key). Aynı username ile
-- ikinci kayıtta (ör. iki farklı email ama ayni 'testuser') trigger'ın INSERT'i
-- unique_violation atıyor, auth.users insert'i geri alınıyor ve Supabase
-- "Database error saving new user" (500) döndürüyor → kullanıcı kayıt olamıyor.
--
-- ÇÖZÜM: Çakışmada username'in sonuna otomatik ek koy (_1, _2, ...) ve boş bir
-- ad bulana kadar tekrar dene. Yalnızca username çakışmasında (profiles_username_key)
-- devreye girer; başka bir unique çakışması (ör. email) olduğu gibi hata verir.
--
-- Idempotent: CREATE OR REPLACE. Supabase SQL Editor veya: npm run db:init
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_uname text;
  uname      text;
  dname      text;
  ubio       text;
  attempt    int := 0;
  v_constraint text;
BEGIN
  -- Temel username: metadata'daki username, yoksa email'in @ öncesi
  base_uname := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  );
  base_uname := left(base_uname, 45);            -- ek (_NN) için yer bırak
  IF base_uname IS NULL OR base_uname = '' THEN
    base_uname := 'user';
  END IF;

  dname := NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), '');
  IF dname IS NOT NULL AND length(dname) > 100 THEN dname := left(dname, 100); END IF;

  ubio := NULLIF(trim(NEW.raw_user_meta_data->>'bio'), '');
  IF ubio IS NOT NULL AND length(ubio) > 2000 THEN ubio := left(ubio, 2000); END IF;

  uname := base_uname;

  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, email, password_hash, role, display_name, bio)
      VALUES (NEW.id, uname, NEW.email, NULL, 'user', dname, ubio)
      ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
            bio = COALESCE(public.profiles.bio, EXCLUDED.bio),
            updated_at = now();
      EXIT;  -- başarılı, döngüden çık
    EXCEPTION WHEN unique_violation THEN
      -- Hangi kısıt ihlal edildi?
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
      IF v_constraint <> 'profiles_username_key' THEN
        RAISE;  -- username dışı bir çakışma (ör. email) → olduğu gibi hata ver
      END IF;

      attempt := attempt + 1;
      IF attempt > 50 THEN
        -- Son çare: rastgele ek ile benzersizlik neredeyse garanti
        uname := left(base_uname, 38) || '_' || substr(md5(random()::text), 1, 6);
      ELSE
        uname := base_uname || '_' || attempt;   -- testuser_1, testuser_2, ...
      END IF;
      -- döngü tekrar dener
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
