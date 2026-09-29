/**
 * Socket.io ile kullanıcı odasına olay gönderir (Hafta 5).
 * Oda adı backend-2 ile uyumlu: user_<uuid>
 */
function emitToUser(req, userId, eventName, payload) {
  const io = req.app.get('io');
  if (!io || !userId) return;
  io.to(`user_${userId}`).emit(eventName, payload);
}

module.exports = { emitToUser };
