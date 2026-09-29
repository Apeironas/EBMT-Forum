const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../config/logger');

// Token doğrulama istemcisi (ES256 asimetrik anahtarları JWKS ile doğrular).
const verifyClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

/**
 * Hafta 5 — Socket.io (backend-2 ile uyumlu oda adı: user_<uuid>).
 * handshake.auth.token veya Authorization header ile JWT doğrulanır;
 * doğrulanırsa otomatik olarak user_<sub> odasına eklenir.
 */
function setupSockets(io) {
  io.use(async (socket, next) => {
    try {
      const rawAuth =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
      if (!rawAuth) {
        socket.userId = null;
        return next();
      }

      const { data, error } = await verifyClient.auth.getClaims(rawAuth);
      const sub = data?.claims?.sub;
      if (error || !sub) {
        socket.userId = null;
        return next();
      }
      socket.userId = sub;
      socket.join(`user_${sub}`);
      logger.info(`[socket] Kullanıcı odaya katıldı: user_${sub} (socket ${socket.id})`);
      next();
    } catch (e) {
      logger.warn(`[socket] JWT doğrulanamadı: ${e.message}`);
      socket.userId = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`[socket] Bağlantı: ${socket.id}`);

    // Eski istemciler için (backend-2): token yoksa join_user_room ile oda (dikkat: prod için JWT önerilir)
    socket.on('join_user_room', (userId) => {
      if (!userId || typeof userId !== 'string') return;
      if (socket.userId && socket.userId !== userId) {
        logger.warn('[socket] join_user_room reddedildi: token kullanıcısı ile uyuşmuyor.');
        return;
      }
      socket.join(`user_${userId}`);
      if (!socket.userId) socket.userId = userId;
      logger.info(`[socket] join_user_room: user_${userId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`[socket] Ayrıldı: ${socket.id}`);
    });
  });
}

module.exports = setupSockets;
