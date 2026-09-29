import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Sayfalar ve Bileşenler
import Home from "./pages/Home";
import Sohbet from "./pages/Sohbet";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import Code from "./pages/Code";
import Kaydedilenler from "./pages/Kaydedilenler";
import Profile from './components/Profile';
import Login from './components/Login';
import Register from './components/Register';
import PostDetail from './components/PostDetail';
import Notifications from './pages/Notifications';
import SohbetDetail from './components/SohbetDetail';
import API from './services/api';
import { fetchCurrentUser, isAuthenticated, logout as clearSession } from './services/authService';

// Yetkisiz kullanıcıların korumalı sayfalara girmesini engelleyen sarmalayıcı bileşen
const ProtectedRoute = ({ user, loading, children }) => {
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>Yükleniyor...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedPosts, setSavedPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // 1. Uygulama Başladığında Oturum ve Profil Doğrulaması (JWT Auth)
  useEffect(() => {
    const checkAuth = async () => {
      // Not: token'lar authService/tokenStorage tarafından 'ebmt_access_token' /
      // 'ebmt_refresh_token' anahtarlarıyla saklanıyor — burada eskiden 'token'
      // anahtarına bakılıyordu, bu yüzden geçerli bir oturum bile sürekli
      // "yok" gibi görünüyordu.
      if (!isAuthenticated()) {
        setUser(null);
        localStorage.removeItem("user");
        setLoading(false);
        return;
      }

      try {
        // Token geçerliliğini backend'den kontrol et
        const freshUser = await fetchCurrentUser();
        setUser(freshUser);
        localStorage.setItem("user", JSON.stringify(freshUser));
      } catch (error) {
        // Token geçersiz/süresi dolmuş ve refresh de başarısız oldu
        clearSession();
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 2. Bildirimleri API'den Çekme
  useEffect(() => {
    if (user) {
      API.get('/notifications')
        .then(res => {
          // Backend read_at (timestamp|null) döner, UI isRead (boolean) bekliyor.
          // Backend type: 'comment_on_post' / 'vote_received' -> UI: 'reply' / 'like'.
          // postId/commentId, backend'in trigger'larda doldurduğu data (jsonb)
          // alanının içinde geliyor (bkz. week5/week5b sql dosyaları).
          const normalized = (res.data || []).map(n => {
            const uiType = n.type === 'comment_on_post' ? 'reply'
              : n.type === 'vote_received' ? 'like'
              : n.type;
            const postId = n.data?.post_id
              || (n.data?.target_type === 'post' ? n.data?.target_id : undefined);
            return {
              ...n,
              type: uiType,
              text: n.body,
              postId,
              commentId: n.data?.comment_id,
              isRead: Boolean(n.read_at),
              is_read: Boolean(n.read_at)
            };
          });
          setNotifications(normalized);
        })
        .catch(() => setNotifications([]));
    }
  }, [user]);

  // 3. Gönderileri (posts) API'den çekme — daha önce Home hep boş görünüyordu
  // çünkü bu istek hiç atılmıyordu.
  useEffect(() => {
    if (!user) {
      setPosts([]);
      setPostsLoading(false);
      return;
    }
    setPostsLoading(true);
    // NOT: backend artık GET /posts'ta sayfalama yapıyor (varsayılan limit=10).
    // Gerçek "daha fazla yükle" UI'ı henüz yok, bu yüzden şimdilik daha
    // yüksek bir limit istiyoruz — kalıcı çözüm değil, ileride sayfalama
    // UI'ı eklenmeli.
    API.get('/posts?limit=100')
      .then(res => setPosts(res.data || []))
      .catch(() => setPosts([]))
      .finally(() => setPostsLoading(false));
  }, [user]);

  // Yeni gönderi oluşturma (questionbox.js / CodeSoruSor.js buradan çağırır)
  // NOT: backend categoryId'yi zorunlu tutuyor; kategori seçimi UI'a henüz
  // eklenmediği için şimdilik "Genel" (id: 1) sabit gönderiliyor — kategori
  // konusu netleşince burası gerçek bir seçim alanına bağlanmalı.
  const addPost = async (newPost) => {
    const payload = {
      title: newPost.title,
      content: newPost.description || newPost.content || '',
      categoryId: newPost.categoryId || 1,
      tags: newPost.tags || []
    };

    const createRes = await API.post('/posts', payload);
    const newPostId = createRes.data?.postId;

    // create_post_with_tags RPC sadece yeni postun id'sini döner,
    // ekranda göstermek için tam post detayını ayrıca çekiyoruz.
    const detailRes = await API.get(`/posts/${newPostId}`);
    setPosts(prev => [detailRes.data, ...prev]);
    return detailRes.data;
  };

  // 4. Kaydedilmiş (favori) gönderileri backend'den yükleme — daha önce
  // sayfa yenilenince/oturum açılınca hiç çekilmiyordu, hep boş kalıyordu.
  useEffect(() => {
    if (!user) {
      setSavedPosts([]);
      return;
    }
    API.get('/favorites')
      .then(res => setSavedPosts(res.data || []))
      .catch(() => setSavedPosts([]));
  }, [user]);

  // Kaydedilen gönderi ekleme/çıkarma
  // NOT: backend'de "kaydet" endpoint'i /posts/:id/save değil /api/favorites'tir.
  const toggleSavePost = async (post) => {
    try {
      const isAlreadySaved = savedPosts.some((p) => p.id === post.id);
      if (isAlreadySaved) {
        await API.delete(`/favorites/${post.id}`);
        setSavedPosts(prev => prev.filter((p) => p.id !== post.id));
      } else {
        await API.post('/favorites', { postId: post.id });
        setSavedPosts(prev => [post, ...prev]);
      }
    } catch (err) {
      // Fallback UI State
      setSavedPosts(prev => {
        const isAlreadySaved = prev.some((p) => p.id === post.id);
        return isAlreadySaved ? prev.filter((p) => p.id !== post.id) : [post, ...prev];
      });
    }
  };

  // NOT: backend bu iki uçta POST değil PATCH bekliyor.
  const markAllAsRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, is_read: true })));
    } catch (err) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, is_read: true })));
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true, is_read: true } : n)
      );
    } catch (err) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true, is_read: true } : n)
      );
    }
  };

  return (
    <Router>
      <div className="App">
        <Header
          user={user}
          setUser={setUser}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          unreadCount={notifications.filter(n => !(n.isRead || n.is_read)).length}
          notifications={notifications}
        />
        <div className="main-container">
          <Sidebar user={user} setUser={setUser} />
          <div className="content">
            <Routes>
              {/* Korumalı Rotalar */}
              <Route
                path="/"
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <Home
                      searchQuery={searchQuery}
                      toggleSavePost={toggleSavePost}
                      savedPosts={savedPosts}
                      user={user}
                      posts={posts}
                      addPost={addPost}
                      postsLoading={postsLoading}
                    />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/Code" 
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <Code user={user} posts={posts} addPost={addPost} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/Sohbet" 
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <Sohbet user={user} toggleSavePost={toggleSavePost} savedPosts={savedPosts} />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/Kaydedilenler"
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <Kaydedilenler
                      savedPosts={savedPosts}
                      toggleSavePost={toggleSavePost}
                    />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/post/:id" 
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <PostDetail user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/sohbet/:id" 
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <SohbetDetail user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <Notifications
                      notifications={notifications}
                      markAllAsRead={markAllAsRead}
                      markAsRead={markAsRead}
                    />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute user={user} loading={loading}>
                    <Profile user={user} posts={posts} savedPosts={savedPosts} />
                  </ProtectedRoute>
                } 
              />
              {/* Küçük/Büyük harf uyumu için takma ad (alias) rota */}
              <Route path="/Profil" element={<Navigate to="/profile" replace />} />

              {/* Giriş & Kayıt Rotaları */}
              <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" replace />} />
              <Route path="/register" element={!user ? <Register setUser={setUser} /> : <Navigate to="/" replace />} />

              {/* Tanımsız URL yönlendirmesi */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;