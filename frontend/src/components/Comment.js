import React, { useState } from 'react';
import API from '../services/api';
import './Comment.css';

function Comment({ comment, onReplySubmit, postOwnerId, currentUserId, acceptedCommentId, onAccept, onUnaccept }) {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyText, setReplyText] = useState("");

    // --- YORUM BEĞENİ STATE'LERİ ---
    const [likes, setLikes] = useState(comment.likes ?? comment.like_count ?? 0);
    const [isLiked, setIsLiked] = useState(comment.is_liked || false);

    // Relational Profile Verileri Toleransı — get_post_comments_tree RPC'si
    // author_username/author_avatar döner, ama eski profiles/author string
    // biçimlerine de tolerans gösteriyoruz.
    const authorName = comment.author_username || comment.profiles?.username || comment.author || 'Anonim';
    const authorAvatar = comment.author_avatar || comment.profiles?.avatar_url || comment.authorAvatar || null;

    const isAccepted = comment.is_accepted_answer || (acceptedCommentId && comment.id === acceptedCommentId);
    const canAccept = Boolean(currentUserId && postOwnerId && currentUserId === postOwnerId);

    // Tarih formatlama helper'ı
    const formatDate = (dateString) => {
        if (!dateString) return comment.date || 'Şimdi';
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Yanıt formunu onaylayınca çalışan fonksiyon
    const handleReplySubmit = (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        
        if (onReplySubmit) {
            onReplySubmit(comment.id, replyText);
        }
        setReplyText("");
        setShowReplyForm(false);
    };

    // Kalp ikonuna basınca çalışan beğeni — backend'de yorumlar için ayrı bir
    // "like" ucu yok, oy verme (/api/votes) target_type:'comment' ile kullanılıyor.
    // Backend toggle mantığıyla çalışıyor: aynı vote_value tekrar gönderilirse
    // oy geri çekilir (response.removed:true).
    const handleLikeClick = async () => {
        const nextLikedState = !isLiked;
        const diff = nextLikedState ? 1 : -1;

        // İyimser Güncelleme (Optimistic UI Update)
        setIsLiked(nextLikedState);
        setLikes(prev => prev + diff);

        try {
            await API.post('/votes', {
                target_type: 'comment',
                target_id: comment.id,
                vote_value: 1
            });
        } catch (error) {
            // Hata durumunda UI'ı eski haline döndür
            setIsLiked(!nextLikedState);
            setLikes(prev => prev - diff);
        }
    };

    return (
        <div id={`comment-${comment.id}`} className="comment-container">
            <div className="comment-main">
                {/* Yorum Üst Bilgisi */}
                <div className="comment-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {authorAvatar && (
                        <img 
                            src={authorAvatar} 
                            alt={authorName} 
                            style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                    )}
                    <span className="comment-author">@{authorName}</span>
                    <span className="comment-date">{formatDate(comment.created_at)}</span>
                    
                    {isAccepted && (
                        <span className="accepted-answer-badge" style={{ marginLeft: '10px', color: '#28a745', fontWeight: 'bold' }}>
                            ✓ Doğru Cevap
                        </span>
                    )}
                </div>

                {/* Yorum Metni */}
                <div className="comment-body">
                    {comment.body || comment.content || comment.text}
                    
                    {comment.code_snippet && (
                        <pre className="comment-code-snippet" style={{ background: '#2d2d2d', color: '#ccc', padding: '10px', borderRadius: '5px', overflowX: 'auto', marginTop: '10px' }}>
                            <code>{comment.code_snippet}</code>
                        </pre>
                    )}
                </div>

                {/* İşlemler */}
                <div className="comment-actions">
                    <button 
                        className={`comment-btn like-btn ${isLiked ? 'liked' : ''}`} 
                        onClick={handleLikeClick}
                    >
                        ❤️ {likes} Beğeni
                    </button>

                    <button 
                        className="comment-btn reply-btn" 
                        onClick={() => setShowReplyForm(!showReplyForm)}
                    >
                        ↩ Yanıtla
                    </button>

                    {/* Sadece gönderi sahibi görür — backend de zaten bunu 403 ile koruyor */}
                    {canAccept && !isAccepted && (
                        <button
                            className="comment-btn accept-btn"
                            onClick={() => onAccept && onAccept(comment.id)}
                            style={{ color: '#28a745' }}
                        >
                            ✓ Cevap Olarak Kabul Et
                        </button>
                    )}
                    {canAccept && isAccepted && (
                        <button
                            className="comment-btn accept-btn"
                            onClick={() => onUnaccept && onUnaccept()}
                            style={{ color: '#dc3545' }}
                        >
                            Kabulü Kaldır
                        </button>
                    )}
                </div>
            </div>

            {/* Yanıt Formu */}
            {showReplyForm && (
                <form className="reply-input-form" onSubmit={handleReplySubmit}>
                    <input 
                        type="text" 
                        placeholder={`@${authorName} kullanıcısına yanıt ver...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        autoFocus
                    />
                    <div className="reply-form-btns">
                        <button type="button" className="cancel-btn" onClick={() => setShowReplyForm(false)}>İptal</button>
                        <button type="submit" className="submit-btn">Yanıtla</button>
                    </div>
                </form>
            )}

            {/* ALT YORUMLAR (Recursive Yapı) */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="replies-container">
                    {comment.replies.map((reply) => (
                        <Comment 
                            key={reply.id} 
                            comment={reply} 
                            onReplySubmit={onReplySubmit}
                            postOwnerId={postOwnerId}
                            currentUserId={currentUserId}
                            acceptedCommentId={acceptedCommentId}
                            onAccept={onAccept}
                            onUnaccept={onUnaccept}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Comment;