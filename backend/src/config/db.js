const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// ---------------------------------------------------------------------------
// SSL yapılandırması
// ---------------------------------------------------------------------------
// Supabase pooler kendi (self-signed) sertifikasını sunar; bu yüzden Node'un
// varsayılan CA'sıyla doğrulama başarısız olur. İki mod destekleniyor:
//   1) GÜVENLİ: DB_CA_CERT (PEM içeriği) veya DB_SSL_CA_PATH (dosya yolu)
//      verilirse sunucu kimliği DOĞRULANIR (rejectUnauthorized: true).
//      Supabase CA: Dashboard > Project Settings > Database > SSL Configuration.
//   2) VARSAYILAN: CA verilmezse bağlantı yine TLS ile ŞİFRELİDİR ama sunucu
//      kimliği doğrulanmaz. Üretimde CA verip 1. modu kullanmanız önerilir.
let sslConfig;
if (process.env.DB_CA_CERT) {
    sslConfig = { ca: process.env.DB_CA_CERT, rejectUnauthorized: true };
} else if (process.env.DB_SSL_CA_PATH) {
    sslConfig = { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8'), rejectUnauthorized: true };
} else {
    sslConfig = { rejectUnauthorized: false };
}

// Bağlantı havuzu (Connection Pool) oluşturuluyor.
// Pool, aynı anda birden fazla isteğe cevap vermek için
// birden fazla veritabanı bağlantısını hazır tutar.
const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    ssl: sslConfig,

    // Havuz ayarları
    max: 10,                 // aynı anda en fazla 10 bağlantı açık tutulur
    idleTimeoutMillis: 30000, // 30 saniye atıl kalan bağlantı kapatılır
    connectionTimeoutMillis: 5000 // 5 saniyede bağlantı kurulamazsa hata verir
});

// Bağlantı havuzu hazır olduğunda (ilk kullanımda) log basar
pool.on('connect', () => {
    console.log('[DB] PostgreSQL bağlantı havuzuna yeni bağlantı eklendi.');
});

pool.on('error', (err) => {
    console.error('[DB] Beklenmeyen PostgreSQL havuz hatası:', err.message);
});

module.exports = pool;
