# BM Forum — Bölüm Forum Platformu

Bilgisayar Mühendisliği bölümü öğrencileri için geliştirilmiş, tam kapsamlı (full-stack) bir soru-cevap / tartışma forumu. Öğrenciler gönderi açabilir, birbirlerinin sorularına cevap verebilir, oylama yapabilir ve kabul edilen cevabı işaretleyebilir.

## ✨ Özellikler

- 🔐 **Kimlik doğrulama** — Supabase Auth (kayıt / giriş / oturum yenileme), JWT (ES256) doğrulaması
- 📝 **Gönderiler** — oluşturma, güncelleme, soft-delete, etiketleme, kategoriler
- 💬 **Yorumlar** — iç içe (nested) yorum ağacı
- 👍 **Oylama & Karma** — gönderi ve yorumlara oy, kullanıcı itibar (reputation) puanı
- ✅ **Kabul edilen cevap** — gönderi sahibi bir yorumu "çözüm" olarak işaretleyebilir
- 🔔 **Bildirimler** — yoruma gerçek zamanlı bildirim (Socket.io) + kalıcı kayıt
- 🔍 **Tam metin arama** — Türkçe aksana duyarsız (unaccent) arama ("ogrenci" → "öğrenci")
- ⭐ **Favoriler** — gönderi kaydetme
- 🛡️ **Güvenlik** — Row Level Security (RLS), ban'li kullanıcı engeli, rate limiting, Helmet, CORS izin listesi

## 🧱 Teknolojiler

**Backend:** Node.js, Express, Socket.io, Supabase (PostgreSQL + Auth), Zod (validasyon), Winston (loglama)
**Frontend:** React (Create React App), React Router
**Veritabanı:** PostgreSQL (Supabase) — RLS politikaları, SECURITY DEFINER RPC'ler, tam metin arama (tsvector + GIN)

## 📁 Proje Yapısı

```
.
├── backend/     # Express API + Supabase + SQL migration'lar
│   └── src/
│       ├── controllers/   # iş mantığı (post, comment, vote, auth, ...)
│       ├── routes/        # API uçları
│       ├── middlewares/   # auth, RLS/yetki, validasyon, rate limit
│       ├── sql/           # migration zinciri (RLS, RPC, trigger, FTS)
│       └── scripts/       # db:init, seed
└── frontend/    # React arayüzü
    └── src/
        ├── components/    # Login, Register, PostCard, Comment, ...
        ├── pages/         # Home, Profile, Notifications, ...
        └── services/      # API katmanı (token, refresh, unwrap)
```

## 🚀 Kurulum

### Backend
```bash
cd backend
npm install
cp .env.example .env      # Supabase URL/anahtarlar ve DB bilgilerini doldur
npm run db:init           # SQL migration zincirini çalıştır
npm run seed              # (opsiyonel) gerçekçi test verisi
npm start                 # http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
# .env dosyası oluştur:
#   REACT_APP_API_URL=http://localhost:3000/api
#   REACT_APP_USE_MOCK=false
$env:PORT=3001; npm start   # http://localhost:3001
```

## 🔑 Ortam Değişkenleri (backend)

`.env.example` dosyasına bakın. Özet: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DB_*` (PostgreSQL), `CORS_ORIGIN`.

> ⚠️ `.env` dosyaları depoya dahil edilmez (gizli anahtarlar).

## 👥 Ekip

Bölüm dönem projesi olarak bir ekip tarafından geliştirilmiştir (backend, veritabanı ve frontend ekipleri).

---

*Bu depo projenin bir kopyasıdır; portfolyo amaçlı yayınlanmıştır.*
