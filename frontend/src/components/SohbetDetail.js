import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import '../pages/Sohbet.css';

function SohbetDetail({ user }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { id: paramId } = useParams();

    // Sohbet.js sayfasından yönlendirilen konu verisini alıyoruz
    const { topic } = location.state || {};

    const topicId = topic?.id || Number(paramId) || 1;

    // Fallback konu verisi
    const currentTopic = topic || {
        id: topicId,
        title: "Ege Bilgisayar vize haftası yaklaşıyor, durumlar ne?",
        author: "yazilimci_abi",
        author_id: 101,
        date: "2 saat önce",
        category: "Genel Soru"
    };

    const initialComments = [
        {
            id: 101,
            topic_id: topicId,
            author: "shrekdonkey800",
            author_id: 102,
            date: "1 saat önce",
            created_at: new Date().toISOString(),
            text: "Matematik vizesi beni korkutuyor, onun dışında diğer dersler bir şekilde halledilir gibi.",
            parent_id: null
        },
        {
            id: 102,
            topic_id: topicId,
            author: "yazilimci_abi",
            author_id: 101,
            date: "45 dk önce",
            created_at: new Date().toISOString(),
            text: "Geçen seneki çıkmış sorulara bak mutlaka, hoca benzer mantıkta soruyor.",
            parent_id: 101 // İlk yoruma verilmiş yanıt
        }
    ];

    // Yorumları localStorage'dan okuyoruz
    const [comments, setComments] = useState(() => {
        const saved = localStorage.getItem(`sohbet_comments_${topicId}`);
        return saved ? JSON.parse(saved) : initialComments;
    });

    const [newCommentText, setNewCommentText] = useState("");
    const [replyingToId, setReplyingToId] = useState(null);
    const [replyText, setReplyText] = useState("");

    // --- YENİ YORUM / YANIT EKLEME FONKSİYONU ---
    const handleAddComment = (e, parentId = null) => {
        e.preventDefault();
        const textToSend = parentId ? replyText : newCommentText;

        if (!textToSend.trim()) return;

        if (!user) {
            alert("Yanıt yazmak için giriş yapmalısın.");
            return;
        }

        const newComment = {
            id: Date.now(),
            topic_id: topicId,
            author: user.username || user.email || 'Anonim',
            author_id: user.id || null,
            date: "Şimdi",
            created_at: new Date().toISOString(),
            text: textToSend.trim(),
            parent_id: parentId
        };

        const updated = [...comments, newComment];
        setComments(updated);
        localStorage.setItem(`sohbet_comments_${topicId}`, JSON.stringify(updated));

        if (parentId) {
            setReplyText("");
            setReplyingToId(null);
        } else {
            setNewCommentText("");
        }
    };

    // Ana yorumlar ve alt yanıtların ayrıştırılması
    const rootComments = comments.filter(c => !c.parent_id);

    return (
        <div className="sohbet-forum-page">
            {/* Geri Dön Butonu */}
            <button className="sohbet-back-btn" onClick={() => navigate('/sohbet')}>
                ← Sohbet Odalarına Dön
            </button>

            {/* Ana Başlık Kartı */}
            <div className="sohbet-detail-header-card">
                <span className="topic-category-tag">{currentTopic.category}</span>
                <h1 style={{ marginTop: '10px', marginBottom: '10px' }}>{currentTopic.title}</h1>
                <div className="topic-row-meta">
                    <span>Başlatan: <strong>@{currentTopic.author || 'Anonim'}</strong></span> • <span>{currentTopic.date || 'Yakın zamanda'}</span>
                </div>
            </div>

            {/* Yorumlar Bölümü */}
            <div className="sohbet-comments-section">
                <h3>💬 {comments.length} Yanıt</h3>

                {/* Ana Yorum Formu */}
                <form className="sohbet-comment-form" onSubmit={(e) => handleAddComment(e, null)}>
                    <textarea
                        placeholder={user ? "Bu tartışmaya sen de katıl, fikrini yaz..." : "Yanıt yazmak için giriş yapmalısın"}
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        disabled={!user}
                    />
                    <button type="submit" disabled={!user || !newCommentText.trim()}>
                        Yanıtı Gönder
                    </button>
                </form>

                {/* Yorum Ağacı Listesi */}
                <div className="sohbet-comments-list" style={{ marginTop: '20px' }}>
                    {rootComments.map(comment => {
                        const childReplies = comments.filter(c => c.parent_id === comment.id);

                        return (
                            <div key={comment.id} className="sohbet-comment-card" style={{ marginBottom: '16px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                                <div className="sohbet-comment-meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                    <strong>@{comment.author}</strong>
                                    <span className="sohbet-comment-date" style={{ color: '#888' }}>{comment.date}</span>
                                </div>
                                <div className="sohbet-comment-text" style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '10px' }}>
                                    {comment.text}
                                </div>

                                {/* Yanıtla Butonu */}
                                <button
                                    onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                                    style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                                >
                                    {replyingToId === comment.id ? 'Vazgeç' : 'Yanıtla'}
                                </button>

                                {/* Alt Yanıt Formu */}
                                {replyingToId === comment.id && (
                                    <form onSubmit={(e) => handleAddComment(e, comment.id)} style={{ marginTop: '10px' }}>
                                        <input
                                            type="text"
                                            placeholder={`@${comment.author} kullanıcısına yanıt ver...`}
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                                        />
                                        <button type="submit" style={{ marginTop: '6px', padding: '4px 12px', fontSize: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                            Gönder
                                        </button>
                                    </form>
                                )}

                                {/* Alt Yanıtlar (Child Replies) */}
                                {childReplies.length > 0 && (
                                    <div style={{ marginLeft: '20px', marginTop: '12px', borderLeft: '2px solid #e0e0e0', paddingLeft: '12px' }}>
                                        {childReplies.map(reply => (
                                            <div key={reply.id} style={{ marginTop: '8px', background: '#f9f9f9', padding: '10px', borderRadius: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                                    <strong>@{reply.author}</strong>
                                                    <span style={{ color: '#888' }}>{reply.date}</span>
                                                </div>
                                                <div style={{ fontSize: '13px' }}>{reply.text}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default SohbetDetail;