-- Eski/cakisan RLS politikalarini temizle

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
