const pool = require('../config/db');
const { isCloudinaryConfigured, uploadBuffer } = require('../config/cloudinary');

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      `SELECT id, username, display_name, email, avatar_url, role, reputation_score,
              bio, is_banned, is_email_verified, created_at, updated_at
       FROM public.profiles
       WHERE id = $1::uuid`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı profili bulunamadı.', status: 404 });
    }

    return res.status(200).json({ mesaj: 'Profil getirildi.', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { username, display_name, bio, avatar_url } = req.body || {};

    const result = await pool.query(
      `UPDATE public.profiles
       SET
         username = COALESCE($1, username),
         display_name = COALESCE($2, display_name),
         bio = COALESCE($3, bio),
         avatar_url = COALESCE($4, avatar_url),
         updated_at = NOW()
       WHERE id = $5::uuid
       RETURNING id, username, display_name, email, avatar_url, role, reputation_score, bio, updated_at`,
      [username ?? null, display_name ?? null, bio ?? null, avatar_url ?? null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profil bulunamadı.', status: 404 });
    }

    return res.status(200).json({
      mesaj: 'Profil güncellendi.',
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor.', status: 409 });
    }
    next(error);
  }
};

const getPublicProfileByUsername = async (req, res, next) => {
  try {
    const raw = (req.params.username || '').trim();
    if (!raw) {
      return res.status(400).json({ error: 'username zorunludur.', status: 400 });
    }

    const result = await pool.query(
      `SELECT id, username, display_name, avatar_url, reputation_score, bio, created_at
       FROM public.profiles
       WHERE lower(username) = lower($1)
         AND is_banned = false`,
      [raw]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.', status: 404 });
    }

    return res.status(200).json({ mesaj: 'Profil getirildi.', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        error: 'Cloudinary yapılandırılmadı. CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET ekleyin.',
        status: 503
      });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Görüntü dosyası gerekli (multipart alan adı: photo).', status: 400 });
    }

    const url = await uploadBuffer(req.file.buffer, 'forum/avatars');
    const userId = req.user.userId;

    const { rows } = await pool.query(
      `UPDATE public.profiles
       SET avatar_url = $1, updated_at = NOW()
       WHERE id = $2::uuid
       RETURNING id, username, avatar_url`,
      [url, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profil bulunamadı.', status: 404 });
    }

    return res.status(200).json({
      mesaj: 'Profil fotoğrafı yüklendi.',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getPublicProfileByUsername,
  uploadAvatar
};
