const pool = require('../config/db');

exports.listNotifications = async (req, res, next) => {
  const userId = req.user.userId;
  const unreadOnly = String(req.query.unread || '').toLowerCase() === '1' || req.query.unread === 'true';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  try {
    const whereUnread = unreadOnly ? 'AND read_at IS NULL' : '';
    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS c FROM public.notifications WHERE user_id = $1::uuid ${whereUnread}`,
      [userId]
    );
    const total = countRows[0].c;

    const { rows } = await pool.query(
      `SELECT id, type, body, data, read_at, created_at, actor_user_id
       FROM public.notifications
       WHERE user_id = $1::uuid ${whereUnread}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return res.status(200).json({
      mesaj: 'Bildirimler getirildi.',
      data: rows,
      meta: { currentPage: page, limit, total }
    });
  } catch (err) {
    if (err.message && err.message.includes('notifications')) {
      return res.status(503).json({
        error: 'Bildirim tablosu henüz oluşturulmamış. npm run db:init veya SQL migration çalıştırın.',
        status: 503
      });
    }
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `UPDATE public.notifications
       SET read_at = COALESCE(read_at, now())
       WHERE id = $1::uuid AND user_id = $2::uuid
       RETURNING id, read_at`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bildirim bulunamadı veya size ait değil.', status: 404 });
    }

    return res.status(200).json({ mesaj: 'Okundu olarak işaretlendi.', data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  const userId = req.user.userId;
  try {
    await pool.query(
      `UPDATE public.notifications
       SET read_at = now()
       WHERE user_id = $1::uuid AND read_at IS NULL`,
      [userId]
    );
    return res.status(200).json({ mesaj: 'Tüm bildirimler okundu olarak işaretlendi.', data: null });
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  const userId = req.user.userId;
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `DELETE FROM public.notifications
       WHERE id = $1::uuid AND user_id = $2::uuid
       RETURNING id`,
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bildirim bulunamadı veya size ait değil.', status: 404 });
    }
    return res.status(200).json({ mesaj: 'Bildirim silindi.', data: { id: rows[0].id } });
  } catch (err) {
    next(err);
  }
};
