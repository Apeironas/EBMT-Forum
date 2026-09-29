import React, { useState, useEffect, useRef } from 'react'; 
import { useNavigate } from 'react-router-dom';
import './Header.css';

function Header({ user, searchQuery, setSearchQuery, unreadCount, notifications = [] }) {
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);

    const isLoggedIn = user !== null;

    // Relational Profile Toleransları
    const username = user?.profiles?.username || user?.username || 'Profil';
    const avatarUrl = user?.profiles?.avatar_url || user?.avatar || null;

    // Sayfa boşluğuna tıklanınca veya Esc'ye basılınca bildirim kutusunu kapatan hook
    useEffect(() => {
        function handleClickOutside(event) {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setShowNotifications(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const toggleNotifications = () => {
        setShowNotifications(!showNotifications);
    };

    const handleNotificationClick = (postId, commentId) => {
        setShowNotifications(false);
        if (postId && commentId) {
            navigate(`/post/${postId}#comment-${commentId}`);
        } else if (postId) {
            navigate(`/post/${postId}`);
        } else {
            navigate('/notifications');
        }
    };

    // Güvenlik Düzeltmesi (XSS Koruması): HTML stringlerini güvenli JSX parçalarına dönüştürür
    const renderNotificationText = (text) => {
        if (!text) return null;
        const parts = text.split(/(<strong>.*?<\/strong>)/g);
        return parts.map((part, index) => {
            if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
                const content = part.replace(/<\/?strong>/g, '');
                return <strong key={index}>{content}</strong>;
            }
            return part;
        });
    };

    return (
        <header className="top-bar">
            {/* Sol Kısım: Logo */}
            <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
    EGE FORUM
</div>
            
            {/* Orta Kısım: Arama Çubuğu */}
            <div className="search-box">
                <input 
                    type="text" 
                    placeholder="Soru ara (React, C++...)" 
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        navigate('/'); 
                    }}
                />
            </div>

            {/* Sağ Kısım: İşlemler */}
            <div className="top-actions">
                {isLoggedIn ? (
                    <div className="user-section" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        
                        <div className="notification-wrapper" ref={notificationRef} style={{ position: 'relative' }}>
                            <div className="notification-icon" onClick={toggleNotifications} style={{ cursor: 'pointer' }}>
                                <span className="icon">🔔</span>
                                {unreadCount > 0 && (
                                    <span className="badge">{unreadCount}</span>
                                )}
                            </div>

                            {showNotifications && (
                                <div className="notification-dropdown">
                                    <div className="dropdown-header">Bildirimler</div>
                                    <div className="notification-list">
                                        {notifications.length === 0 ? (
                                            <div className="notification-item">Henüz bildirimin yok.</div>
                                        ) : (
                                            notifications.slice(0, 5).map(notif => {
                                                const isRead = notif.is_read ?? notif.isRead ?? false;
                                                const targetPostId = notif.post_id || notif.postId;
                                                const targetCommentId = notif.comment_id || notif.commentId;

                                                return (
                                                    <div
                                                        key={notif.id}
                                                        className={`notification-item ${isRead ? '' : 'unread'}`}
                                                        onClick={() =>
                                                            targetPostId
                                                                ? handleNotificationClick(targetPostId, targetCommentId)
                                                                : navigate('/notifications')
                                                        }
                                                    >
                                                        {renderNotificationText(notif.text || notif.content)}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div className="dropdown-footer" onClick={() => { setShowNotifications(false); navigate('/notifications'); }}>
                                        Tümünü Gör
                                    </div>
                                </div>
                            )}
                        </div>

                        <div 
                            className="user-profile-header" 
                            onClick={() => navigate('/profile')}
                            title={username}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {avatarUrl ? (
                                <img 
                                    src={avatarUrl} 
                                    alt={username} 
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} 
                                />
                            ) : (
                                <span className="user-icon">👤</span>
                            )}
                            <span className="user-name-label" style={{ fontSize: '14px', fontWeight: '500' }}>
                                {username}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="auth-btns">
                        <button className="login-btn" onClick={() => navigate('/login')}>Giriş</button>
                        <button className="register-btn" onClick={() => navigate('/register')}>Üye Ol</button>
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;