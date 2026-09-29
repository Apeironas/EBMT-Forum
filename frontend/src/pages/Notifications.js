import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';

// App.js'den gelen dinamik state ve fonksiyonları prop olarak içeri alıyoruz
function Notifications({ notifications = [], markAllAsRead, markAsRead }) {
    const navigate = useNavigate();

    const handleNotificationClick = (postId, commentId, notifId) => {
        // Tıklanan bildirimi anında okundu olarak işaretle
        if (markAsRead) {
            markAsRead(notifId);
        }
        
        // Eğer bir post ID'si varsa o sayfadaki yoruma yönlendir
        if (postId) {
            navigate(`/post/${postId}${commentId ? `#comment-${commentId}` : ''}`);
        }
    };

    // Bildirim tipine göre sol tarafa tatlı bir ikon yerleştiriyoruz
    const getIcon = (type) => {
        if (type === "reply") return "👤";
        if (type === "like") return "🔥";
        return "📢";
    };

    // XSS AÇIĞINI KAPATAN GÜVENLİ PARSER:
    // HTML enjeksiyon riski yaratmadan <strong> etiketlerini güvenli JSX parçalarına çevirir
    const renderSafeText = (text) => {
        if (!text) return null;
        const parts = text.split(/(<strong>.*?<\/strong>)/g);
        return parts.map((part, index) => {
            if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
                const cleanText = part.replace(/<\/?strong>/g, '');
                return <strong key={index}>{cleanText}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="notifications-page">
            <div className="notifications-header">
                <h2>Bildirimler</h2>
                {/* Tümünü okundu yapan fonksiyonu butona bağlıyoruz */}
                <button className="mark-all-read" onClick={markAllAsRead}>
                    Tümünü Okundu İşaretle
                </button>
            </div>

            <div className="notifications-container">
                {notifications.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                        Henüz bir bildiriminiz yok.
                    </p>
                ) : (
                    notifications.map((notif) => (
                        <div 
                            key={notif.id} 
                            // Okunma durumuna göre dinamik sınıf (CSS class) atıyoruz
                            className={`notification-card ${!notif.isRead ? 'unread' : 'read'}`} 
                            onClick={() => handleNotificationClick(notif.postId, notif.commentId, notif.id)}
                        >
                            <div className="notif-avatar">{getIcon(notif.type)}</div>
                            <div className="notif-content">
                                {/* XSS riskli dangerouslySetInnerHTML yerine güvenli renderSafeText kullandık */}
                                <p>{renderSafeText(notif.text)}</p>
                                <span className="notif-time">{notif.time}</span>
                            </div>
                            {/* Eğer bildirim henüz okunmadıysa sağ tarafa mavi bir nokta koyuyoruz */}
                            {!notif.isRead && <span className="unread-dot"></span>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Notifications;