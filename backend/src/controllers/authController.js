const { createSupabaseUserClient } = require('../config/supabase');
const { logger } = require('../config/logger');

exports.register = async (req, res, next) => {
  const { email, password, username } = req.body || {};

  try {
    const supabase = createSupabaseUserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });

    if (error) return res.status(400).json({ error: error.message, status: 400 });

    logger.info(`[auth] register: ${email}`);
    return res.status(201).json({
      mesaj: 'Kayıt başarılı!',
      data: { user: data.user ?? null, session: data.session ?? null }
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body || {};

  try {
    const supabase = createSupabaseUserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: 'Giriş başarısız. Bilgileri kontrol edin.', status: 401 });
    }

    logger.info(`[auth] login: ${email}`);
    return res.status(200).json({
      mesaj: 'Giriş başarılı!',
      data: { user: data.user, session: data.session }
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  const refresh_token = req.body?.refresh_token;

  try {
    const supabase = createSupabaseUserClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: error.message, status: 401 });

    logger.info('[auth] refresh session');
    return res.status(200).json({
      mesaj: 'Token yenilendi.',
      data: { user: data.user, session: data.session }
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  return res.status(200).json({ mesaj: 'Kullanıcı bilgisi getirildi.', data: { user: req.user } });
};
