// src/services/api.js
//
// Backend'e giden TÜM isteklerin geçtiği tek nokta.
// Sorumlulukları:
//   1) Base URL'i .env'den okumak
//   2) Access token'ı her isteğe otomatik Authorization: Bearer header'ı olarak eklemek
//   3) Backend'in { mesaj, data, meta } / { error, status } zarfını çözmek (unwrap)
//   4) 401 alınca refresh_token ile bir kez otomatik yenileyip isteği tekrar denemek
//
// Diğer servis dosyaları (authService, postService, ...) HTTP detaylarıyla
// uğraşmaz, sadece apiClient.get/post/put/patch/delete/upload çağırır.

import { mockRequest } from './mockApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Backend'e hiç bağlanmadan sadece frontend'i denemek için:
// .env dosyasına REACT_APP_USE_MOCK=true yazın.
const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

const ACCESS_TOKEN_KEY = 'ebmt_access_token';
const REFRESH_TOKEN_KEY = 'ebmt_refresh_token';

// ---------------------------------------------------------------------------
// Token depolama (şimdilik localStorage; ileride httpOnly cookie'ye taşınabilir)
// ---------------------------------------------------------------------------
export const tokenStorage = {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Mock modda (.env REACT_APP_USE_MOCK=true) oturum ayrı bir anahtarda
    // tutuluyor; gerçek logout ile mock logout'un tek noktadan yönetilmesi
    // için onu da burada temizliyoruz.
    localStorage.removeItem('ebmt_mock_session_user');
  },
  hasSession() {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  }
};

// ---------------------------------------------------------------------------
// Hata sınıfı: component'lerde err.status / err.message ile kolay yakalama
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message || 'Bilinmeyen bir hata oluştu.');
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

// ---------------------------------------------------------------------------
// Refresh: aynı anda birden fazla istek 401 alırsa tek bir refresh çağrısı
// yapılsın diye promise paylaşılıyor.
// ---------------------------------------------------------------------------
let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new ApiError('Oturum bulunamadı.', 401);
    }

    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.data?.session) {
      tokenStorage.clearTokens();
      throw new ApiError(json?.error || 'Oturum yenilenemedi.', res.status);
    }

    const { access_token, refresh_token } = json.data.session;
    tokenStorage.setTokens(access_token, refresh_token);
    return access_token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// ---------------------------------------------------------------------------
// Ana istek fonksiyonu
// ---------------------------------------------------------------------------
async function request(path, { method = 'GET', body, headers = {}, isRetry = false } = {}) {
  if (USE_MOCK) {
    try {
      return await mockRequest(path, { method, body });
    } catch (mockErr) {
      throw new ApiError(mockErr.message, mockErr.status || 401);
    }
  }

  const accessToken = tokenStorage.getAccessToken();

  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  if (accessToken) {
    finalHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    // Backend ayakta değil / CORS / DNS vb.
    throw new ApiError('Sunucuya ulaşılamıyor. Backend çalışıyor mu ve CORS_ORIGIN doğru mu kontrol edin.', 0);
  }

  const json = await res.json().catch(() => null);

  // 401 -> refresh_token varsa bir kez dene, sonra isteği tekrar yolla
  if (res.status === 401 && !isRetry && tokenStorage.getRefreshToken()) {
    try {
      await refreshAccessToken();
      return request(path, { method, body, headers, isRetry: true });
    } catch (refreshErr) {
      throw new ApiError('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 401);
    }
  }

  if (!res.ok) {
    throw new ApiError(json?.error || `İstek başarısız (HTTP ${res.status}).`, res.status, json);
  }

  // Backend zarfı: { mesaj, data, meta }
  return json;
}

// ---------------------------------------------------------------------------
// Dosya yükleme (avatar vb.) — FormData kullanılırken Content-Type header'ını
// ELLE koymuyoruz; tarayıcı boundary'yi kendi ekler.
// ---------------------------------------------------------------------------
async function upload(path, formData, { isRetry = false } = {}) {
  if (USE_MOCK) {
    return { mesaj: '[MOCK] Dosya yüklendi (simülasyon).', data: { url: 'https://via.placeholder.com/150' } };
  }

  const accessToken = tokenStorage.getAccessToken();
  const headers = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData
    });
  } catch (networkErr) {
    throw new ApiError('Sunucuya ulaşılamıyor.', 0);
  }

  const json = await res.json().catch(() => null);

  if (res.status === 401 && !isRetry && tokenStorage.getRefreshToken()) {
    try {
      await refreshAccessToken();
      return upload(path, formData, { isRetry: true });
    } catch (refreshErr) {
      throw new ApiError('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 401);
    }
  }

  if (!res.ok) {
    throw new ApiError(json?.error || 'Yükleme başarısız.', res.status, json);
  }

  return json;
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  upload
};

// Bazı component'ler "import API from '../services/api'" (default export,
// axios benzeri .get/.post/.data kullanımı) şeklinde çağırıyor.
// apiClient'in metotları zaten backend'in { mesaj, data, meta } JSON'ını
// olduğu gibi döndürüyor, yani response.data component'lerin beklediği
// gerçek veri. Bu yüzden aynı objeyi default export olarak da veriyoruz.
export default apiClient;
