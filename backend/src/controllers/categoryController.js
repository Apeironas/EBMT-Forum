const pool = require('../config/db');

exports.listCategories = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, description, created_at
       FROM public.categories
       ORDER BY name ASC`
    );
    return res.status(200).json({ mesaj: 'Kategoriler getirildi.', data: rows });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Kategoriler getirilemedi.',
      status: 500
    });
  }
};

exports.getCategoryBySlug = async (req, res) => {
  const slug = (req.params.slug || '').trim();
  if (!slug) {
    return res.status(400).json({ error: 'slug zorunludur.', status: 400 });
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, description, created_at
       FROM public.categories
       WHERE slug = $1`,
      [slug]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Kategori bulunamadı.', status: 404 });
    }
    return res.status(200).json({ mesaj: 'Kategori getirildi.', data: rows[0] });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Kategori getirilemedi.',
      status: 500
    });
  }
};
