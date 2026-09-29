const { supabaseAdmin, createSupabaseUserClient } = require('../config/supabase');

// =============================================================
// YORUM OLUŞTURMA (Hem üst-düzey hem de cevap/reply)
// POST /api/posts/:postId/comments
// Body: { body, parent_id? }
// =============================================================
const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { body, parent_id } = req.body;
    const authorId = req.user.userId;

    if (!body || body.trim().length === 0) {
      return res.status(400).json({ error: 'Yorum içeriği boş olamaz.', status: 400 });
    }

    const supabase = supabaseAdmin || createSupabaseUserClient(req.accessToken);

    const { data: postCheck, error: postErr } = await supabase
      .from('posts')
      .select('id,is_locked,deleted_at,author_id')
      .eq('id', postId)
      .is('deleted_at', null)
      .maybeSingle();
    if (postErr) {
      return res.status(400).json({ error: postErr.message || 'İstek başarısız.', status: 400 });
    }
    if (!postCheck) {
      return res.status(404).json({ error: 'Bu gönderi bulunamadı.', status: 404 });
    }
    if (postCheck.is_locked) {
      return res.status(403).json({ error: 'Bu gönderi kilitlenmiş, yorum yapılamaz.', status: 403 });
    }

    if (parent_id) {
      const { data: parentCheck, error: parentErr } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parent_id)
        .eq('post_id', postId)
        .is('deleted_at', null)
        .maybeSingle();
      if (parentErr) {
        return res.status(400).json({ error: parentErr.message || 'İstek başarısız.', status: 400 });
      }
      if (!parentCheck) {
        return res.status(404).json({
          error: 'Cevap verilmek istenen üst yorum bulunamadı veya bu gönderiye ait değil.',
          status: 404
        });
      }
    }

    const supabaseUser = createSupabaseUserClient(req.accessToken);
    const { data: inserted, error: insErr } = await supabaseUser
      .from('comments')
      .insert([{ body: body.trim(), author_id: authorId, post_id: postId, parent_id: parent_id || null }])
      .select()
      .single();
    if (insErr) {
      // RLS insert reddi = ban'li kullanıcı (author_id zaten doğru atanıyor)
      if (insErr.code === '42501' || (insErr.message || '').includes('row-level security')) {
        return res.status(403).json({ error: 'Hesabınız askıya alınmış; yorum yapamazsınız.', status: 403 });
      }
      return res.status(400).json({ error: insErr.message || 'Yorum eklenemedi.', status: 400 });
    }

    const { emitToUser } = require('../helpers/realtime');
    const postAuthorId = postCheck.author_id;
    if (postAuthorId && postAuthorId !== authorId) {
      emitToUser(req, postAuthorId, 'notification', {
        type: 'comment_on_post',
        post_id: postId,
        comment_id: inserted.id,
        actor_id: authorId
      });
    }

    res.status(201).json({
      mesaj: 'Yorum başarıyla eklendi.',
      data: inserted
    });
  } catch (error) {
    console.error('[commentController] createComment hatası:', error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? error.message || 'Sunucu hatası.'
          : 'Sunucu hatası.',
      status: 500
    });
  }
};

// =============================================================
// BİR GÖNDERİNİN TÜM YORUMLARINI GETİRME (Ağaç Yapısında)
// GET /api/posts/:postId/comments
// =============================================================
const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const supabase = supabaseAdmin || createSupabaseUserClient(req.accessToken);
    const { data: postRow, error: postErr } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .is('deleted_at', null)
      .maybeSingle();
    if (postErr) {
      return res.status(400).json({ error: postErr.message || 'İstek başarısız.', status: 400 });
    }
    if (!postRow) {
      return res.status(404).json({ error: 'Bu gönderi bulunamadı.', status: 404 });
    }

    const { data: comments, error } = await supabase.rpc('get_post_comments_tree', { p_post_id: postId });
    if (error) {
      return res.status(400).json({ error: error.message || 'Yorumlar getirilemedi.', status: 400 });
    }

    const tree = buildCommentTree(comments || []);

    res.status(200).json({
      mesaj: 'Yorumlar başarıyla getirildi.',
      data: tree,
      meta: { count: (comments || []).length }
    });
  } catch (error) {
    console.error('[commentController] getCommentsByPost hatası:', error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? error.message || 'Sunucu hatası.'
          : 'Sunucu hatası.',
      status: 500
    });
  }
};

// =============================================================
// TEK YORUM GETİRME (alt yorumlarıyla birlikte)
// GET /api/comments/:commentId
// =============================================================
const getCommentById = async (req, res) => {
  try {
    const { commentId } = req.params;

    const supabase = supabaseAdmin || createSupabaseUserClient(req.accessToken);
    const { data: comment, error } = await supabase
      .from('comments')
      .select('*, profiles(username,avatar_url)')
      .eq('id', commentId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) {
      return res.status(400).json({ error: error.message || 'İstek başarısız.', status: 400 });
    }
    if (!comment) {
      return res.status(404).json({ error: 'Yorum bulunamadı.', status: 404 });
    }

    const { data: allComments, error: treeErr } = await supabase.rpc('get_post_comments_tree', {
      p_post_id: comment.post_id
    });
    if (treeErr) {
      return res.status(400).json({ error: treeErr.message || 'Yorum ağacı getirilemedi.', status: 400 });
    }
    const subtree = buildSubtree(allComments || [], commentId);

    res.status(200).json({
      mesaj: 'Yorum getirildi.',
      data: {
        id: comment.id,
        body: comment.body,
        author_id: comment.author_id,
        post_id: comment.post_id,
        parent_id: comment.parent_id,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        author_username: comment.profiles?.username,
        author_avatar: comment.profiles?.avatar_url,
        replies: subtree
      }
    });
  } catch (error) {
    console.error('[commentController] getCommentById hatası:', error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? error.message || 'Sunucu hatası.'
          : 'Sunucu hatası.',
      status: 500
    });
  }
};

// =============================================================
// YORUM GÜNCELLEME
// PUT /api/comments/:commentId
// Body: { body }
// =============================================================
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { body } = req.body;

    if (!body || body.trim().length === 0) {
      return res.status(400).json({ error: 'Yorum içeriği boş olamaz.', status: 400 });
    }

    const supabaseUser = createSupabaseUserClient(req.accessToken);
    const { data: updated, error } = await supabaseUser
      .from('comments')
      .update({ body: body.trim(), updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .is('deleted_at', null)
      .select()
      .maybeSingle();
    if (error) {
      return res.status(400).json({ error: error.message || 'Güncelleme başarısız.', status: 400 });
    }
    if (!updated) {
      return res.status(404).json({ error: 'Yorum bulunamadı veya yetkiniz yok.', status: 404 });
    }

    res.status(200).json({
      mesaj: 'Yorum başarıyla güncellendi.',
      data: updated
    });
  } catch (error) {
    console.error('[commentController] updateComment hatası:', error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? error.message || 'Sunucu hatası.'
          : 'Sunucu hatası.',
      status: 500
    });
  }
};

// =============================================================
// YORUM SİLME (Cascade: alt yorumlar da silinir)
// DELETE /api/comments/:commentId
// =============================================================
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const supabaseUser = createSupabaseUserClient(req.accessToken);
    const { error } = await supabaseUser.rpc('soft_delete_comment_subtree', {
      p_comment_id: commentId
    });
    if (error) {
      const msg = error.message || '';
      if (msg.includes('forbidden')) {
        return res.status(403).json({ error: 'Bu yorumu silme yetkiniz yok.', status: 403 });
      }
      return res.status(400).json({ error: error.message || 'Silme başarısız.', status: 400 });
    }

    res.status(200).json({ mesaj: 'Yorum(lar) silindi (soft delete).', data: null });
  } catch (error) {
    console.error('[commentController] deleteComment hatası:', error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? error.message || 'Sunucu hatası.'
          : 'Sunucu hatası.',
      status: 500
    });
  }
};

// =============================================================
// YARDIMCI FONKSİYONLAR (Ağaç Yapısı Oluşturma)
// =============================================================

function buildCommentTree(comments) {
  const map = {};
  const roots = [];

  comments.forEach((comment) => {
    map[comment.id] = { ...comment, replies: [] };
  });

  comments.forEach((comment) => {
    if (comment.parent_id && map[comment.parent_id]) {
      map[comment.parent_id].replies.push(map[comment.id]);
    } else {
      roots.push(map[comment.id]);
    }
  });

  return roots;
}

function buildSubtree(allComments, rootId) {
  const map = {};
  const children = [];

  allComments.forEach((c) => {
    map[c.id] = { ...c, replies: [] };
  });

  allComments.forEach((c) => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].replies.push(map[c.id]);
    }
  });

  if (map[rootId]) {
    return map[rootId].replies;
  }
  return children;
}

module.exports = {
  createComment,
  getCommentsByPost,
  getCommentById,
  updateComment,
  deleteComment
};
