// src/services/mockApi.js
//
// Backend'e hiç bağlanmadan sadece frontend'i (login akışı, sayfalar arası
// gezinme, formlar) denemek için kullanılan sahte istek katmanı.
//
// api.js içindeki request()/upload() fonksiyonları, .env'de
// REACT_APP_USE_MOCK=true olduğunda gerçek fetch() yerine buradaki
// fonksiyonu çağırır. Dönen JSON şekli GERÇEK backend'inkiyle AYNI
// tutuluyor ({ mesaj, data, meta }) — böylece authService.js ve diğer
// servisler mock/gerçek ayrımını hiç bilmek zorunda kalmıyor.
//
// NOT: Bu tamamen localStorage üzerinde çalışan, şifreyi doğrulamayan,
// sahte bir simülasyondur. Sadece UI'ı test etmek içindir, gerçek
// backend entegrasyonunun yerini TUTMAZ.

const MOCK_SESSION_KEY = 'ebmt_mock_session_user';
const MOCK_POSTS_KEY = 'ebmt_mock_posts';
const MOCK_FAVORITES_KEY = 'ebmt_mock_favorites';

function getMockPosts() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_POSTS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMockPosts(posts) {
  localStorage.setItem(MOCK_POSTS_KEY, JSON.stringify(posts));
}

function getMockFavoriteIds() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_FAVORITES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMockFavoriteIds(ids) {
  localStorage.setItem(MOCK_FAVORITES_KEY, JSON.stringify(ids));
}

function fakeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function buildSupabaseLikeUser({ email, username }) {
  return {
    id: fakeId('mock-user'),
    email,
    user_metadata: { username: username || (email ? email.split('@')[0] : 'kullanici') }
  };
}

function buildSession() {
  return {
    access_token: fakeId('mock-access'),
    refresh_token: fakeId('mock-refresh')
  };
}

export async function mockRequest(path, { method = 'GET', body } = {}) {
  // Gerçek network'ü simüle etmek için ufak bir gecikme (isteğe bağlı, kaldırılabilir)
  await new Promise((resolve) => setTimeout(resolve, 250));

  // --- AUTH ---
  if (path === '/auth/register' && method === 'POST') {
    const user = buildSupabaseLikeUser({ email: body?.email, username: body?.username });
    const session = buildSession();
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
    return { mesaj: '[MOCK] Kayıt başarılı.', data: { user, session } };
  }

  if (path === '/auth/login' && method === 'POST') {
    // Mock modda şifre kontrol edilmiyor, sadece e-posta ile sahte kullanıcı üretiliyor.
    const user = buildSupabaseLikeUser({ email: body?.email });
    const session = buildSession();
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
    return { mesaj: '[MOCK] Giriş başarılı.', data: { user, session } };
  }

  if (path === '/auth/refresh' && method === 'POST') {
    const session = buildSession();
    return { mesaj: '[MOCK] Oturum yenilendi.', data: { session } };
  }

  if (path === '/auth/me' && method === 'GET') {
    const saved = localStorage.getItem(MOCK_SESSION_KEY);
    if (!saved) {
      const err = new Error('[MOCK] Oturum bulunamadı.');
      err.status = 401;
      throw err;
    }
    return { mesaj: '[MOCK] Kullanıcı doğrulandı.', data: { user: JSON.parse(saved) } };
  }

  // --- POSTS (Home'daki gerçek akışı mock modda da test edebilmek için) ---
  if (path === '/posts' && method === 'GET') {
    return { mesaj: '[MOCK] Gönderiler listelendi.', data: getMockPosts(), meta: { total: getMockPosts().length } };
  }

  if (path === '/posts' && method === 'POST') {
    const savedSession = JSON.parse(localStorage.getItem(MOCK_SESSION_KEY) || 'null');
    const newPost = {
      id: fakeId('mock-post'),
      title: body?.title,
      body: body?.content,
      categoryId: body?.categoryId,
      tags: body?.tags || [],
      author: {
        username: savedSession?.user_metadata?.username || 'ben',
        avatar_url: null
      },
      author_id: savedSession?.id || null,
      upvote_count: 0,
      downvote_count: 0,
      comment_count: 0,
      view_count: 0,
      is_resolved: false,
      accepted_comment_id: null,
      created_at: new Date().toISOString()
    };
    const posts = getMockPosts();
    posts.unshift(newPost);
    saveMockPosts(posts);
    return { mesaj: '[MOCK] Gönderi oluşturuldu.', data: { postId: newPost.id } };
  }

  const postDetailMatch = path.match(/^\/posts\/([^/]+)$/);
  if (postDetailMatch && method === 'GET') {
    const found = getMockPosts().find(p => p.id === postDetailMatch[1]);
    if (!found) {
      const err = new Error('[MOCK] Gönderi bulunamadı.');
      err.status = 404;
      throw err;
    }
    return { mesaj: '[MOCK] Gönderi detayı.', data: found };
  }

  // --- CEVABI KABUL ET / KALDIR ---
  const acceptMatch = path.match(/^\/posts\/([^/]+)\/accept-answer$/);
  if (acceptMatch && method === 'POST') {
    const posts = getMockPosts();
    const target = posts.find(p => p.id === acceptMatch[1]);
    if (target) {
      target.accepted_comment_id = body?.commentId || null;
      target.is_resolved = true;
      saveMockPosts(posts);
    }
    return { mesaj: '[MOCK] Cevap kabul edildi.', data: { accepted_comment_id: body?.commentId || null } };
  }
  if (acceptMatch && method === 'DELETE') {
    const posts = getMockPosts();
    const target = posts.find(p => p.id === acceptMatch[1]);
    if (target) {
      target.accepted_comment_id = null;
      target.is_resolved = false;
      saveMockPosts(posts);
    }
    return { mesaj: '[MOCK] Kabul kaldırıldı.', data: null };
  }

  // --- FAVORITES ---
  if (path === '/favorites' && method === 'GET') {
    const ids = getMockFavoriteIds();
    const favPosts = getMockPosts().filter(p => ids.includes(p.id));
    return { mesaj: '[MOCK] Favoriler listelendi.', data: favPosts };
  }

  if (path === '/favorites' && method === 'POST') {
    const ids = getMockFavoriteIds();
    if (!ids.includes(body?.postId)) {
      ids.push(body?.postId);
      saveMockFavoriteIds(ids);
    }
    return { mesaj: '[MOCK] Favorilere eklendi.', data: { postId: body?.postId } };
  }

  const favoriteDeleteMatch = path.match(/^\/favorites\/([^/]+)$/);
  if (favoriteDeleteMatch && method === 'DELETE') {
    const ids = getMockFavoriteIds().filter(id => id !== favoriteDeleteMatch[1]);
    saveMockFavoriteIds(ids);
    return { mesaj: '[MOCK] Favorilerden çıkarıldı.', data: null };
  }

  // --- Diğer her şey: gerçek veri yok, boş/empty dönüyoruz ki UI çökmesin ---
  // Listeler (posts, notifications, favorites, comments, tags, categories...) -> []
  // Tekil kayıt oluşturma istekleri -> gönderilen body'i olduğu gibi geri yansıt
  if (method === 'GET') {
    return { mesaj: '[MOCK] Boş liste (backend bağlı değil).', data: [], meta: { total: 0 } };
  }

  return { mesaj: '[MOCK] İstek simüle edildi, gerçek backend yok.', data: { ...body, id: fakeId('mock') } };
}
