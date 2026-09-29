const { supabaseAdmin, createSupabaseUserClient } = require('../config/supabase');

const getAllTags = async (req, res) => {
  try {
    const supabase = supabaseAdmin || createSupabaseUserClient(req.accessToken);
    const { data, error } = await supabase.from('tags').select('*').order('name', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message || 'Etiketler getirilemedi.', status: 400 });
    }
    res.status(200).json({ mesaj: 'Etiketler getirildi.', data });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Etiketler yüklenemedi.',
      status: 500
    });
  }
};

const getPostsByTag = async (req, res) => {
  try {
    const { slug } = req.params;
    const supabase = supabaseAdmin || createSupabaseUserClient(req.accessToken);
    const { data, error } = await supabase
      .from('tags')
      .select('id,slug,post_tags(posts(*, profiles(username)))')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message || 'İstek başarısız.', status: 400 });
    }
    if (!data) {
      return res.status(404).json({ error: 'Etiket bulunamadı.', status: 404 });
    }

    const posts = (data.post_tags || []).map((pt) => pt.posts).filter(Boolean);

    res.status(200).json({ mesaj: 'Etikete ait gönderiler getirildi.', data: posts });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Filtreleme sırasında sunucu hatası.',
      status: 500
    });
  }
};

module.exports = { getAllTags, getPostsByTag };
