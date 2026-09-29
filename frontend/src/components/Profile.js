import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';
import './Profile.css';

function Profile({ user, posts = [], savedPosts: savedPostsProp = [] }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('paylasimlar');

    // NOT: backend'de "/users/me/posts", "/comments", "/saved-posts",
    // "/liked-posts" gibi uçlar yok — bu yüzden burada olmayan bir uca
    // istek atmak yerine, App.js'ten gelen gerçek verileri kullanıyoruz:
    //   - userPosts: paylaşılan gönderiler listesi (posts) yazara göre filtrelenmiş
    //   - savedPosts: gerçek /api/favorites verisi (prop olarak geliyor)
    //   - userComments / likedPosts: backend'de karşılığı olmadığı için şimdilik boş;
    //     bu iki sekme, backend'e ilgili endpoint eklenene kadar "yakında" gösterir.
    const userPosts = posts.filter(p => p.author_id === user?.id || p.author === user?.username);
    const savedPosts = savedPostsProp;
    const [userComments] = useState([]);
    const [likedPosts] = useState([]);
    // Veri artık App.js'ten prop olarak geldiği için ayrı bir fetch/loading
    // state'ine gerek kalmadı.
    const loading = false;

    // Oturumu Kapatma Fonksiyonu
    const handleLogout = () => {
        // Gerçek/mock access-refresh token'ları tek noktadan temizler
        logout();
        localStorage.removeItem("user");
        window.location.href = "/login";
    };

    // Giriş yapılmamışsa koruma ekranı
    if (!user) {
        return (
            <div className="profile-container">
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <h2>Profilini görmek için giriş yapmalısın.</h2>
                    <button className="login-submit-btn" style={{ marginTop: '16px' }} onClick={() => navigate('/login')}>
                        Giriş Yap
                    </button>
                </div>
            </div>
        );
    }

    const username = user.profiles?.username || user.username || 'Kullanıcı';
    const avatarUrl = user.profiles?.avatar_url || user.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(username) + "&background=random";

    // Sekme içeriklerini render eden fonksiyon
    const renderContent = () => {
        if (loading) return <div>İçerikler yükleniyor...</div>;

        switch (activeTab) {
            case 'paylasimlar':
                return userPosts.length > 0 ? (
                    <div className="profile-post-list">
                        {userPosts.map(post => (
                            <div
                                key={post.id}
                                className="profile-list-item"
                                onClick={() => navigate(`/post/${post.id}`)}
                                style={{ cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid #eee' }}
                            >
                                <strong>{post.title}</strong>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    {post.view_count ?? post.views ?? 0} Görüntülenme • {((post.upvote_count || 0) - (post.downvote_count || 0)) || post.votes || 0} Beğeni
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>Henüz bir paylaşım yapmadın.</div>
                );

            case 'yorumlar':
                return userComments.length > 0 ? (
                    <div className="profile-comment-list">
                        {userComments.map(comment => (
                            <div
                                key={comment.id}
                                className="profile-list-item"
                                onClick={() => navigate(`/post/${comment.topic_id || comment.post_id}#comment-${comment.id}`)}
                                style={{ cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid #eee' }}
                            >
                                <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>"{comment.content || comment.text}"</p>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    Gönderiye yazıldı • {new Date(comment.created_at).toLocaleDateString('tr-TR')}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>Henüz hiç yorum yapmadın.</div>
                );

            case 'kaydedilenler':
                return savedPosts.length > 0 ? (
                    <div className="profile-saved-list">
                        {savedPosts.map(post => (
                            <div
                                key={post.id}
                                className="profile-list-item"
                                onClick={() => navigate(`/post/${post.id}`)}
                                style={{ cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid #eee' }}
                            >
                                <strong>{post.title}</strong>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>Kaydedilen içerik bulunamadı.</div>
                );

            case 'beğenilenler':
                return likedPosts.length > 0 ? (
                    <div className="profile-liked-list">
                        {likedPosts.map(post => (
                            <div
                                key={post.id}
                                className="profile-list-item"
                                onClick={() => navigate(`/post/${post.id}`)}
                                style={{ cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid #eee' }}
                            >
                                <strong>{post.title}</strong>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>Beğendiğin gönderiler burada görünecek.</div>
                );

            default:
                return <div>İçerik bulunamadı.</div>;
        }
    };

    return (
        <div className="profile-container">
            {/* Profil Üst Bilgisi */}
            <div className="profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="profile-avatar">
                        <img 
                            src={avatarUrl} 
                            alt="User Avatar" 
                            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                    </div>
                    <div className="profile-info">
                        <h2>@{username}</h2>
                        <p style={{ color: '#666', margin: '2px 0' }}>{user.email}</p>
                        {user.role && <span className="user-role-badge" style={{ fontSize: '12px', background: '#e0e0e0', padding: '2px 8px', borderRadius: '4px' }}>{user.role}</span>}
                    </div>
                </div>

                <button 
                    onClick={handleLogout} 
                    style={{ padding: '8px 16px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Çıkış Yap
                </button>
            </div>

            {/* Sekme Menüsü (Tabs) */}
            <div className="profile-tabs" style={{ marginTop: '20px', borderBottom: '2px solid #f0f0f0' }}>
                <button
                    className={activeTab === 'paylasimlar' ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveTab('paylasimlar')}
                >
                    Paylaşımlar ({userPosts.length})
                </button>
                <button
                    className={activeTab === 'yorumlar' ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveTab('yorumlar')}
                >
                    Yorumlar ({userComments.length})
                </button>
                <button
                    className={activeTab === 'kaydedilenler' ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveTab('kaydedilenler')}
                >
                    Kaydedildi ({savedPosts.length})
                </button>
                <button
                    className={activeTab === 'beğenilenler' ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveTab('beğenilenler')}
                >
                    Beğenilenler ({likedPosts.length})
                </button>
            </div>

            {/* İçerik Alanı */}
            <div className="tab-content" style={{ paddingTop: '15px' }}>
                {renderContent()}
            </div>
        </div>
    );
}

export default Profile;