// src/services/authService.js
//
// Backend'in Supabase Auth tabanlı /api/auth/* uçlarıyla konuşan servis.
// Login.js / Register.js / App.js SADECE bu fonksiyonları çağırır,
// fetch/token detaylarıyla hiç uğraşmaz.

import { apiClient, tokenStorage } from './api';

// Backend'den dönen Supabase user objesini bizim uygulamanın kullandığı
// sade { id, username, email, avatar } şekline çevirir.
export function mapSupabaseUserToAppUser(supabaseUser) {
  if (!supabaseUser) return null;
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    username: meta.username || (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'kullanici'),
    avatar: meta.avatar_url || null
  };
}

// POST /api/auth/register  Body: { email, password, username }
// NOT: Supabase projesinde "e-posta doğrulama zorunlu" ayarı açıksa
// dönen session null olabilir (kullanıcı e-postasını onaylayana kadar
// giriş yapamaz). Çağıran taraf (Register.js) bunu kontrol etmeli.
export async function register({ email, password, username }) {
  const res = await apiClient.post('/auth/register', { email, password, username });
  const { user, session } = res.data || {};

  if (session?.access_token) {
    tokenStorage.setTokens(session.access_token, session.refresh_token);
  }

  return {
    user: mapSupabaseUserToAppUser(user),
    requiresEmailConfirmation: !session
  };
}

// POST /api/auth/login  Body: { email, password }
export async function login({ email, password }) {
  const res = await apiClient.post('/auth/login', { email, password });
  const { user, session } = res.data || {};

  if (session?.access_token) {
    tokenStorage.setTokens(session.access_token, session.refresh_token);
  }

  return mapSupabaseUserToAppUser(user);
}

// GET /api/auth/me  -> sayfa yenilendiğinde token'ın hâlâ geçerli olup
// olmadığını ve güncel kullanıcı bilgisini doğrulamak için kullanılır.
export async function fetchCurrentUser() {
  const res = await apiClient.get('/auth/me');
  return mapSupabaseUserToAppUser(res.data?.user);
}

export function logout() {
  tokenStorage.clearTokens();
}

export function isAuthenticated() {
  return tokenStorage.hasSession();
}
