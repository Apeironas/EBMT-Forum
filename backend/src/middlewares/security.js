const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 *  AUTH LIMITER (Giriş/Kayıt Koruması)
 * Brute-force (kaba kuvvet) saldırılarını durdurmak için.
 * Sadece hatalı denemeleri sayarak kullanıcıyı üzmez.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika 
    max: 5, // 5 deneme hakkı
    message: {
        success: false,
        message: "Çok fazla giriş denemesi yaptınız. Güvenliğiniz için 15 dakika bekleyiniz."
    },
    standardHeaders: true, 
    legacyHeaders: false,
    
    //Başarılı girişler bu hakkı tüketmez.
    skipSuccessfulRequests: true, 

    keyGenerator: (req) => {
        /**
         * IPv6 uyumluluğu için ipKeyGenerator kullanıyoruz.
         * Email normalizasyonu (küçük harf + boşluk temizleme) ile 
         * saldırganları engelliyoruz.
         */
        const clientIp = ipKeyGenerator(req);
        const normalizedEmail = req.body?.email 
            ? req.body.email.toLowerCase().trim() 
            : 'unknown';

        return `${clientIp}-${normalizedEmail}`;
    },
});

/**
 *  GLOBAL LIMITER (Genel API Zırhı)
 * Sunucunun genel trafiğini dengelemek ve her türlü isteği 
 * (health check dahil) kontrol altında tutmak içindir.
 */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // 15 dakikada toplam 1000 istek hakkı
    message: {
        success: false,
        message: "Çok fazla istek attınız. Lütfen daha sonra tekrar deneyin."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 *  STRICT LIMITER (Hassas İşlemler)
 * Şifre sıfırlama gibi çok kritik noktalar için kullanılır.
 */
const strictLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30, // 10 dakikada 30 istek denge noktasıdır
    message: {
        success: false,
        message: "Bu işlem için çok fazla istek gönderdiniz."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    globalLimiter,
    authLimiter,
    strictLimiter
};