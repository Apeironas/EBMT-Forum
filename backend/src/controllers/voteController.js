const { createSupabaseUserClient, supabaseAdmin } = require('../config/supabase');
const { emitToUser } = require('../helpers/realtime');

exports.castVote = async (req, res, next) => {
  const { target_type, target_id, vote_value } = req.body;

  try {
    const supabaseUser = createSupabaseUserClient(req.accessToken);
    const { data, error } = await supabaseUser.rpc('cast_vote', {
      p_target_type: target_type,
      p_target_id: target_id,
      p_vote_value: vote_value
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('target_not_found')) {
        return res.status(404).json({ error: 'Hedef bulunamadı veya silinmiş.', status: 404 });
      }
      if (msg.includes('not_authenticated')) {
        return res.status(401).json({ error: 'Oturum gerekli.', status: 401 });
      }
      if (msg.includes('user_banned')) {
        return res.status(403).json({ error: 'Hesabınız askıya alınmış; oy veremezsiniz.', status: 403 });
      }
      return res.status(400).json({ error: error.message, status: 400 });
    }

    const removed = data && data.removed;

    if (!removed) {
      const sb = supabaseAdmin || createSupabaseUserClient(req.accessToken);
      let authorRow = null;
      if (target_type === 'post') {
        const { data: row } = await sb
          .from('posts')
          .select('author_id')
          .eq('id', target_id)
          .is('deleted_at', null)
          .maybeSingle();
        authorRow = row;
      } else {
        const { data: row } = await sb
          .from('comments')
          .select('author_id')
          .eq('id', target_id)
          .is('deleted_at', null)
          .maybeSingle();
        authorRow = row;
      }
      const authorId = authorRow?.author_id;
      const voterId = req.user.userId;
      if (authorId && authorId !== voterId) {
        emitToUser(req, authorId, 'notification', {
          type: 'vote_received',
          target_type,
          target_id,
          vote_value,
          actor_id: voterId
        });
      }
    }

    res.status(removed ? 200 : 201).json({
      mesaj: removed ? 'Oy kaldırıldı.' : 'Oy kaydedildi.',
      data
    });
  } catch (error) {
    next(error);
  }
};
