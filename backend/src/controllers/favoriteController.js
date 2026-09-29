const { supabaseAdmin, createSupabaseUserClient } = require('../config/supabase');

exports.addFavorite = async (req, res, next) => {
  const { postId } = req.body || {};
  const userId = req.user.userId;

  try {
    const sbRead = supabaseAdmin || createSupabaseUserClient(req.accessToken);
    const { data: postRow, error: postErr } = await sbRead
      .from('posts')
      .select('id')
      .eq('id', postId)
      .is('deleted_at', null)
      .maybeSingle();
    if (postErr) return res.status(400).json({ error: postErr.message, status: 400 });
    if (!postRow) return res.status(404).json({ error: 'Post bulunamadı.', status: 404 });

    const sb = createSupabaseUserClient(req.accessToken);
    const { error } = await sb
      .from('post_favorites')
      .insert([{ user_id: userId, post_id: postId }]);

    if (error) {
      if (error.code === '23505') {
        return res.status(200).json({ mesaj: 'Zaten favorilerde.', data: { duplicate: true } });
      }
      return res.status(400).json({ error: error.message, status: 400 });
    }
    return res.status(201).json({ mesaj: 'Favorilere eklendi.', data: null });
  } catch (e) {
    next(e);
  }
};

exports.removeFavorite = async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user.userId;

  try {
    const sb = createSupabaseUserClient(req.accessToken);
    const { error } = await sb
      .from('post_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    if (error) return res.status(400).json({ error: error.message, status: 400 });
    return res.status(200).json({ mesaj: 'Favorilerden çıkarıldı.', data: null });
  } catch (e) {
    next(e);
  }
};

exports.listMyFavorites = async (req, res, next) => {
  const userId = req.user.userId;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    const sb = createSupabaseUserClient(req.accessToken);
    const { data, error, count } = await sb
      .from('post_favorites')
      .select('created_at, posts(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return res.status(400).json({ error: error.message, status: 400 });

    const rows = (data || [])
      .map((r) => r.posts)
      .filter((p) => p && !p.deleted_at);

    return res.status(200).json({
      mesaj: 'Favoriler getirildi.',
      data: rows,
      meta: { currentPage: page, limit, total: count ?? null }
    });
  } catch (e) {
    next(e);
  }
};
