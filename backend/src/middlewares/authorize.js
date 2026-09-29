const { supabaseAdmin, createSupabaseUserClient } = require('../config/supabase');

function isElevated(profile) {
  if (!profile || !profile.role) return false;
  const r = String(profile.role).toLowerCase();
  return r === 'admin' || r === 'moderator';
}

/**
 * JWT sonrası profiles.role için DB'den profil yükler.
 */
async function loadProfile(req, res, next) {
  try {
    const sb = createSupabaseUserClient(req.accessToken);
    const { data, error } = await sb
      .from('profiles')
      .select('id,role')
      .eq('id', req.user.userId)
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message, status: 400 });
    if (!data) return res.status(403).json({ error: 'Profil bulunamadı.', status: 403 });

    req.profile = data;
    next();
  } catch (e) {
    next(e);
  }
}

async function requirePostOwnerOrElevated(req, res, next) {
  const postId = req.params.postId;
  const sb = supabaseAdmin || createSupabaseUserClient(req.accessToken);
  const { data: post, error } = await sb
    .from('posts')
    .select('author_id,deleted_at')
    .eq('id', postId)
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message, status: 400 });
  if (!post || post.deleted_at) {
    return res.status(404).json({ error: 'Post bulunamadı.', status: 404 });
  }

  const uid = req.user.userId;
  if (post.author_id === uid || isElevated(req.profile)) return next();
  return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.', status: 403 });
}

async function requireCommentOwnerOrElevated(req, res, next) {
  const commentId = req.params.commentId;
  const sb = supabaseAdmin || createSupabaseUserClient(req.accessToken);
  const { data: row, error } = await sb
    .from('comments')
    .select('author_id,deleted_at')
    .eq('id', commentId)
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message, status: 400 });
  if (!row || row.deleted_at) {
    return res.status(404).json({ error: 'Yorum bulunamadı.', status: 404 });
  }

  const uid = req.user.userId;
  if (row.author_id === uid || isElevated(req.profile)) return next();
  return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.', status: 403 });
}

module.exports = {
  loadProfile,
  isElevated,
  requirePostOwnerOrElevated,
  requireCommentOwnerOrElevated
};
