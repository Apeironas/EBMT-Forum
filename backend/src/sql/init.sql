-- ============================================================
-- EBMT Forum - Veritabanı Başlatma Scripti (init.sql)
-- Bu script, projenin çalışması için gerekli olan temel
-- tabloları güvenli bir şekilde (IF NOT EXISTS) oluşturur.
-- Birden fazla kez çalıştırmak güvenlidir.
-- ============================================================

-- UUID üretimi için (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Kullanıcı Profil Tablosu
-- (Supabase Auth'un auth.users tablosunu temel alır)
CREATE TABLE IF NOT EXISTS profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(50)  UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,                  -- Supabase Auth kullanılıyorsa NULL bırakılabilir
    avatar_url  TEXT,
    role        VARCHAR(20)  NOT NULL DEFAULT 'user', -- 'user', 'moderator', 'admin'
    reputation_score INT NOT NULL DEFAULT 0,
    is_banned   BOOLEAN NOT NULL DEFAULT FALSE,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Kategori Tablosu
CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Varsayılan forum kategorileri (yalnızca tablo yeni oluşturulduysa / slug çakışması yoksa eklenir)
INSERT INTO public.categories (name, slug, description)
VALUES
  ('Genel', 'genel', 'Genel tartışmalar ve duyurular'),
  ('Dersler', 'dersler', 'Ders içeriği ve sorular'),
  ('Proje', 'proje', 'Proje ve ödev yardımı')
ON CONFLICT (slug) DO NOTHING;

-- Forum Konuları (Post/Thread) Tablosu
CREATE TABLE IF NOT EXISTS posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(300) NOT NULL,
    body        TEXT NOT NULL,
    author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id INT  NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked   BOOLEAN NOT NULL DEFAULT FALSE,
    view_count  INT NOT NULL DEFAULT 0,
    upvote_count   INT NOT NULL DEFAULT 0,
    downvote_count INT NOT NULL DEFAULT 0,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Yorumlar Tablosu (Self-Referencing: Yorumun Yorumu)
-- parent_id NULL ise bu bir üst-düzey yorumdur (root comment).
-- parent_id doluysa, o yorum başka bir yorumun cevabıdır (reply).
CREATE TABLE IF NOT EXISTS comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    body        TEXT NOT NULL,
    author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_id   UUID          REFERENCES comments(id) ON DELETE CASCADE,
    upvote_count   INT NOT NULL DEFAULT 0,
    downvote_count INT NOT NULL DEFAULT 0,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Creating the polymorphic votes table
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    -- user_id tipini UUID yaptık ve profiles tablosuna bağladık
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, 
    
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id UUID NOT NULL,
    vote_value INTEGER NOT NULL CHECK (vote_value IN (1, -1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT votes_user_target_unique UNIQUE (user_id, target_type, target_id)
);

-- Favoriler (Hafta 3)
CREATE TABLE IF NOT EXISTS post_favorites (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_favorites_post_id ON post_favorites(post_id);

-- Bir post'un tüm yorumlarını ve iç içe ağaç yapısını hızlıca
-- çekebilmek için bileşik indeks (composite index)
CREATE INDEX IF NOT EXISTS idx_comments_post_parent
    ON comments (post_id, parent_id);

--Index işleri için
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'profiles'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower 
        ON profiles (LOWER(username));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_pagination 
ON posts (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_posts_author_created 
ON posts (author_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_posts_category_created 
ON posts (category_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_comments_parent_id 
ON comments (parent_id);

--CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id_post_id 
--ON post_tags (tag_id, post_id);

--CREATE INDEX IF NOT EXISTS idx_post_tags_post_id 
--ON post_tags (post_id);

-- M2M mantığı için eklendi --
-- Ana Etiketler Tablosu
CREATE TABLE IF NOT EXISTS tags (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL,
    slug        VARCHAR(50) UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Many-to-Many İlişki Tablosu (Postlar ve Etiketleri Bağlayan Köprü)
CREATE TABLE IF NOT EXISTS post_tags (
    post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
    tag_id      INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Performans İndeksi
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);