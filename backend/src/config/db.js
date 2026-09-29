const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// CA sertifikası verilirse doğrulamalı, verilmezse (Supabase pooler self-signed
// sertifika sunduğu için) şifreli ama doğrulamasız SSL kullan.
let sslConfig;
if (process.env.DB_CA_CERT) {
    sslConfig = { ca: process.env.DB_CA_CERT, rejectUnauthorized: true };
} else if (process.env.DB_SSL_CA_PATH) {
    sslConfig = { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8'), rejectUnauthorized: true };
} else {
    sslConfig = { rejectUnauthorized: false };
}

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
