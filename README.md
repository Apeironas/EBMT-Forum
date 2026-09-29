# EBMT Forum

Bilgisayar Mühendisliği bölümü için yaptığımız forum sitesi. Öğrenciler soru sorabiliyor, cevap yazabiliyor, gönderileri oylayabiliyor. Dönem projesi olarak bir ekiple geliştirdik. Bu repoda backend ve frontend birlikte duruyor.

Canlı demo: https://ebmtforum.netlify.app/

## Neler yapabiliyor

- Kayıt / giriş (Supabase Auth, JWT)
- Gönderi açma, düzenleme, silme, etiketleme ve kategoriler
- Yorum yazma, yorumlara yanıt verme (iç içe)
- Gönderi ve yorumlara oy verme, kullanıcı itibar puanı
- Gönderi sahibinin bir cevabı "kabul edilen cevap" olarak işaretlemesi
- Yorum gelince bildirim (Socket.io ile anlık)
- Arama — Türkçe karakterlere duyarsız ("ogrenci" yazınca "öğrenci"yi de buluyor)
- Gönderileri favorilere ekleme
- Güvenlik: Supabase RLS, ban'lanan kullanıcının yazamaması, rate limit

## Kullandığımız teknolojiler

- **Backend:** Node.js, Express, Socket.io, Supabase (PostgreSQL + Auth)
- **Frontend:** React

## Klasörler

- `backend/` — API ve veritabanı (SQL migration dosyaları dahil)
- `frontend/` — React arayüzü

## Nasıl çalıştırılır

Backend:

```
cd backend
npm install
# .env dosyasını oluştur (.env.example'a bakarak Supabase bilgilerini doldur)
npm run db:init    # veritabanı tablolarını kurar
npm start
```

Frontend:

```
cd frontend
npm install
# .env oluştur:  REACT_APP_API_URL=http://localhost:3000/api
npm start
```

Backend 3000, frontend 3001 portunda çalışır. `.env` dosyaları repoda yok (Supabase anahtarları içerdiği için), kendiniz oluşturmanız gerekiyor.
