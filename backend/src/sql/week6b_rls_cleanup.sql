-- ===========================================================================
-- Hafta 6b: Eski RLS politikalarının temizliği
-- ---------------------------------------------------------------------------
-- week6_rls.sql'den ÖNCE elle kurulmuş eski politikalar duruyordu. Aynı komuta
-- ait politikalar VEYA (OR) ile birleştiği için en gevşek kural kazanır; bu da
-- yeni sıkı kuralları etkisiz bırakıyordu. Aşağıdaki eski isimli politikalar
-- düşürülür; geriye yalnızca week6_rls.sql'in tutarlı seti kalır.
--
-- Kritik düzeltmeler:
--   * votes: doğrudan INSERT/DELETE/SELECT(true) kaldırıldı → oylama yalnızca
--     cast_vote() RPC'si üzerinden (sayaç + karma tutarlı kalır, gizlilik korunur).
--   * comments: "Public can read comments" (true) kaldırıldı → silinmiş yorumlar
--     artık görünmez.
--   * posts/comments/profiles: doğrudan hard-DELETE kaldırıldı → silme yalnızca
--     soft_delete_* RPC'leri üzerinden (profiles cascade ile içerik kaybı önlenir).
--
-- Idempotent: DROP POLICY IF EXISTS. Supabase SQL Editor veya: npm run db:init
-- ===========================================================================

-- categories
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;

-- comments
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
DROP POLICY IF EXISTS "Public can read comments"      ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;

-- post_tags
DROP POLICY IF EXISTS "Public can read post_tags" ON public.post_tags;

-- posts
DROP POLICY IF EXISTS "Users can delete own posts"               ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can create own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts"               ON public.posts;

-- profiles
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can read profiles"     ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- tags
DROP POLICY IF EXISTS "Public can read tags" ON public.tags;

-- votes  (en kritik: doğrudan yazma/okuma kaldırılır, sadece cast_vote RPC kalır)
DROP POLICY IF EXISTS "Users can delete own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can insert own votes" ON public.votes;
DROP POLICY IF EXISTS "Public can read votes"      ON public.votes;
