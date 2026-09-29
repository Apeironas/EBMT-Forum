const pool = require('../config/db');

/**
 * Tam metin arama (Hafta 4): search_tsv sütunu week4 migration ile eklenir.
 * Eski veritabanında sütun yoksa ILIKE ile geri dönüş.
 */
exports.searchPosts = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) {
    return res.status(400).json({
      error: 'Arama için en az 2 karakter girin (q).',
      status: 400
    });
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  try {
    let rows;
    let total;

    try {
      const countResult = await pool.query(
        `SELECT count(*)::int AS c
         FROM public.posts
         WHERE deleted_at IS NULL
           AND search_tsv @@ plainto_tsquery('simple', public.f_unaccent($1))`,
        [q]
      );
      total = countResult.rows[0].c;

      const dataResult = await pool.query(
        `SELECT id, title, body, author_id, category_id, created_at, upvote_count, downvote_count
         FROM public.posts
         WHERE deleted_at IS NULL
           AND search_tsv @@ plainto_tsquery('simple', public.f_unaccent($1))
         ORDER BY created_at DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [q, limit, offset]
      );
      rows = dataResult.rows;
    } catch (ftsErr) {
      if (!ftsErr.message || !ftsErr.message.includes('search_tsv')) {
        throw ftsErr;
      }
      const like = `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      const countResult = await pool.query(
        `SELECT count(*)::int AS c
         FROM public.posts
         WHERE deleted_at IS NULL
           AND (title ILIKE $1 ESCAPE '\\' OR body ILIKE $1 ESCAPE '\\')`,
        [like]
      );
      total = countResult.rows[0].c;

      const dataResult = await pool.query(
        `SELECT id, title, body, author_id, category_id, created_at, upvote_count, downvote_count
         FROM public.posts
         WHERE deleted_at IS NULL
           AND (title ILIKE $1 ESCAPE '\\' OR body ILIKE $1 ESCAPE '\\')
         ORDER BY created_at DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [like, limit, offset]
      );
      rows = dataResult.rows;
    }

    return res.status(200).json({
      mesaj: 'Arama sonuçları getirildi.',
      data: rows,
      meta: { currentPage: page, limit, total }
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Arama sırasında sunucu hatası.',
      status: 500
    });
  }
};
