const { supabaseAdmin, createSupabaseUserClient } = require('../config/supabase');

// Bir post satırını frontend'in beklediği sade şekle çevirir:
// - tags: isim dizisi
// - comment_count: silinmemiş yorum sayısı (embed'den)
// - is_resolved: kabul edilmiş cevap var mı
// - author: { username, avatar_url }
function normalizePost(p) {
  if (!p) return p;
  const { post_tags, comment_count, ...rest } = p;
  return {
    ...rest,
    tags: (post_tags || []).map((pt) => pt.tags?.name).filter(Boolean),
    comment_count: Array.isArray(comment_count) ? (comment_count[0]?.count ?? 0) : (comment_count ?? 0),
    is_resolved: Boolean(p.accepted_comment_id)
  };
}

// Post sorgularında ortak select (yazar + etiket + silinmemiş yorum sayısı)
// NOT: posts ↔ comments arasında iki ilişki var (comments.post_id ve
// posts.accepted_comment_id), o yüzden yorum sayısı embed'i FK adıyla
// (comments_post_id_fkey) netleştiriliyor; yazar da posts_author_id_fkey ile.
const POST_SELECT =
  'id,title,body,author_id,category_id,created_at,view_count,upvote_count,downvote_count,accepted_comment_id,' +
  'author:profiles!posts_author_id_fkey(username,avatar_url),' +
  'post_tags(tags(name,slug)),' +
  'comment_count:comments!comments_post_id_fkey(count)';

exports.createPost = async (req, res) => {
  try {
    const { title, content, categoryId, tags } = req.body;
    const userId = req.user.userId;

    if (!title || !content || !categoryId) {
      return res.status(400).json({
        error: 'Title, content ve categoryId zorunludur.',
        status: 400
      });
    }

    // Post + etiketler tek transaction (create_post_with_tags RPC).
    // Hata olursa tamamı geri alınır; yarım/etiketsiz post kalmaz.
    const supabaseUser = createSupabaseUserClient(req.accessToken);
    const { data: postId, error: rpcErr } = await supabaseUser.rpc('create_post_with_tags', {
      p_title: title,
      p_body: content,
      p_category_id: categoryId,
      p_tags: Array.isArray(tags) ? tags : []
    });

    if (rpcErr) {
      const msg = rpcErr.message || '';
      if (msg.includes('not_authenticated')) {
        return res.status(401).json({ error: 'Oturum gerekli.', status: 401 });
      }
      if (msg.includes('user_banned')) {
        return res.status(403).json({ error: 'Hesabınız askıya alınmış; gönderi oluşturamazsınız.', status: 403 });
      }
      if (msg.includes('category_not_found')) {
        return res.status(400).json({ error: 'Geçersiz kategori.', status: 400 });
      }
      return res.status(400).json({
        error: rpcErr.message || 'Post oluşturulamadı.',
        status: 400
      });
    }

    res.status(201).json({
      mesaj: 'Post başarıyla oluşturuldu.',
      data: { postId }
    });
  } catch (err) {
    console.error('Post Creation Error:', err.message);
    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? err.message || 'Sunucu hatası, post oluşturulamadı.'
          : 'Sunucu hatası, post oluşturulamadı.',
      status: 500
    });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { supabaseAdmin: adminClient, createSupabaseUserClient: makeUserClient } = require('../config/supabase');
    const supabase = adminClient || makeUserClient(req.accessToken);

    // Opsiyonel: belirli bir kullanıcının gönderileri (profil sayfası için)
    const authorId = req.query.author;

    let query = supabase
      .from('posts')
      .select(POST_SELECT, { count: 'exact' })
      .is('deleted_at', null)
      .is('comments.deleted_at', null); // yorum sayısı yalnızca silinmemişleri saysın

    if (authorId) {
      query = query.eq('author_id', authorId);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(400).json({
        error: error.message || 'Postlar getirilemedi.',
        status: 400
      });
    }

    const normalized = (data || []).map(normalizePost);

    res.status(200).json({
      mesaj: 'Postlar getirildi.',
      data: normalized,
      meta: { currentPage: page, limit, total: count ?? null, totalFetched: normalized.length }
    });
  } catch (err) {
    console.error('Postları çekerken hata oluştu:', err.message);
    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? err.message || 'Sunucu hatası, postlar getirilemedi.'
          : 'Sunucu hatası, postlar getirilemedi.',
      status: 500
    });
  }
};

exports.getPostById = async (req, res) => {
  const { postId } = req.params;
  try {
    const supabase = supabaseAdmin || createSupabaseUserClient(req.accessToken);

    // Görüntülenme sayacını artır (hata olsa da okuma engellenmez)
    const { error: viewErr } = await supabase.rpc('increment_post_view', { p_post_id: postId });
    if (viewErr) {
      // sessizce geç — view artışı kritik değil
    }

    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', postId)
      .is('deleted_at', null)
      .is('comments.deleted_at', null)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message || 'İstek başarısız.', status: 400 });
    }
    if (!data) {
      return res.status(404).json({ error: 'Post bulunamadı.', status: 404 });
    }

    return res.status(200).json({
      mesaj: 'Post getirildi.',
      data: normalizePost(data)
    });
  } catch (err) {
    return res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? err.message || 'Sunucu hatası.'
          : 'Sunucu hatası.',
      status: 500
    });
  }
};

exports.updatePost = async (req, res) => {
  const { postId } = req.params;
  const { title, content, categoryId } = req.body || {};
  try {
    const supabaseUser = createSupabaseUserClient(req.accessToken);
    const payload = {};
    if (typeof title === 'string') payload.title = title;
    if (typeof content === 'string') payload.body = content;
    if (categoryId) payload.category_id = categoryId;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabaseUser
      .from('posts')
      .update(payload)
      .eq('id', postId)
      .is('deleted_at', null)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message || 'Güncelleme başarısız.', status: 400 });
    }
    if (!data) {
      return res.status(404).json({ error: 'Post bulunamadı veya yetkiniz yok.', status: 404 });
    }
    return res.status(200).json({ mesaj: 'Post güncellendi.', data });
  } catch (err) {
    return res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? err.message || 'Sunucu hatası.'
          : 'Sunucu hatası.',
      status: 500
    });
  }
};

exports.deletePost = async (req, res) => {
  const { postId } = req.params;
  try {
    const supabaseUser = createSupabaseUserClient(req.accessToken);
    const { error } = await supabaseUser.rpc('soft_delete_post', { p_post_id: postId });
    if (error) {
      const msg = error.message || '';
      if (msg.includes('forbidden')) {
        return res.status(403).json({ error: 'Bu postu silme yetkiniz yok.', status: 403 });
      }
      return res.status(400).json({ error: error.message || 'Silme işlemi başarısız.', status: 400 });
    }
    return res.status(200).json({ mesaj: 'Post silindi (soft delete).', data: null });
  } catch (err) {
    return res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? err.message || 'Sunucu hatası.'
          : 'Sunucu hatası.',
      status: 500
    });
  }
};

// =============================================================
// CEVAP KABUL ET  POST /api/posts/:postId/accept-answer  Body: { commentId }
// Yalnızca gönderi sahibi (veya admin/mod) — accept_answer RPC yetkiyi doğrular.
// =============================================================
exports.acceptAnswer = async (req, res) => {
  const { postId } = req.params;
  const { commentId } = req.body || {};

  if (!commentId) {
    return res.status(400).json({ error: 'commentId zorunludur.', status: 400 });
  }

  try {
    const supabaseUser = createSupabaseUserClient(req.accessToken);
    const { error } = await supabaseUser.rpc('accept_answer', {
      p_post_id: postId,
      p_comment_id: commentId
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('forbidden')) {
        return res.status(403).json({ error: 'Yalnızca gönderi sahibi cevap kabul edebilir.', status: 403 });
      }
      if (msg.includes('post_not_found')) {
        return res.status(404).json({ error: 'Gönderi bulunamadı.', status: 404 });
      }
      if (msg.includes('comment_not_found')) {
        return res.status(404).json({ error: 'Yorum bu gönderiye ait değil veya silinmiş.', status: 404 });
      }
      if (msg.includes('not_authenticated')) {
        return res.status(401).json({ error: 'Oturum gerekli.', status: 401 });
      }
      return res.status(400).json({ error: msg || 'İşlem başarısız.', status: 400 });
    }

    return res.status(200).json({
      mesaj: 'Cevap kabul edildi.',
      data: { postId, acceptedCommentId: commentId }
    });
  } catch (err) {
    return res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? err.message || 'Sunucu hatası.'
          : 'Sunucu hatası.',
      status: 500
    });
  }
};

// =============================================================
// KABULÜ GERİ AL  DELETE /api/posts/:postId/accept-answer
// =============================================================
exports.unacceptAnswer = async (req, res) => {
  const { postId } = req.params;
  try {
    const supabaseUser = createSupabaseUserClient(req.accessToken);
    const { error } = await supabaseUser.rpc('unaccept_answer', { p_post_id: postId });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('forbidden')) {
        return res.status(403).json({ error: 'Yalnızca gönderi sahibi kabulü geri alabilir.', status: 403 });
      }
      if (msg.includes('post_not_found')) {
        return res.status(404).json({ error: 'Gönderi bulunamadı.', status: 404 });
      }
      if (msg.includes('not_authenticated')) {
        return res.status(401).json({ error: 'Oturum gerekli.', status: 401 });
      }
      return res.status(400).json({ error: msg || 'İşlem başarısız.', status: 400 });
    }

    return res.status(200).json({ mesaj: 'Kabul geri alındı.', data: { postId } });
  } catch (err) {
    return res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? err.message || 'Sunucu hatası.'
          : 'Sunucu hatası.',
      status: 500
    });
  }
};
