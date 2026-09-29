const { createClient } = require('@supabase/supabase-js');
const { supabaseAdmin, createSupabaseUserClient } = require('../config/supabase');

// Token'ı Supabase'in JWKS'i ile doğrulamak için istemci (getClaims kullanır).
const verifyClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({
      error: 'Erişim reddedildi. Geçerli bir Bearer token bulunamadı.',
      status: 403
    });
  }

  const token = authHeader.split(' ')[1];
  req.accessToken = token;

  try {
    const { data, error } = await verifyClient.auth.getClaims(token);

    if (error || !data || !data.claims) {
      return res.status(401).json({ error: 'Oturum süreniz dolmuş veya geçersiz token.', status: 401 });
    }

    const claims = data.claims;

    req.user = claims;
    req.user.userId = claims.sub;
    req.user.role = claims.role;

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Oturum süreniz dolmuş veya geçersiz token.', status: 401 });
  }
};

// Admin kontrolü: rol JWT'de değil profiles.role'de tutulur, oradan bakılır.
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Oturum gerekli.', status: 401 });
    }

    let role = req.profile && req.profile.role;

    if (role === undefined || role === null) {
      const sb = supabaseAdmin || createSupabaseUserClient(req.accessToken);
      const { data, error } = await sb
        .from('profiles')
        .select('role')
        .eq('id', req.user.userId)
        .maybeSingle();
      if (error) return res.status(400).json({ error: error.message, status: 400 });
      if (!data) return res.status(403).json({ error: 'Profil bulunamadı.', status: 403 });
      role = data.role;
      req.profile = { ...(req.profile || {}), role };
    }

    if (String(role).toLowerCase() === 'admin') {
      return next();
    }
    return res.status(403).json({
      error: 'Bu işlemi yapmak için Admin yetkisine sahip olmalısınız.',
      status: 403
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyToken, isAdmin };
