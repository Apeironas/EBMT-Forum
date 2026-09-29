import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import API from '../services/api';
import Comment from '../components/Comment';
import './PostDetail.css';

function PostDetail({ user }) {
    const { id } = useParams();
    const { hash } = useLocation();

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Vote state'leri
    const [votes, setVotes] = useState(0);
    const [userVoteStatus, setUserVoteStatus] = useState(0); // 1: Up, -1: Down, 0: Oy yok

    // 1. Post Detayı ve Yorumları API'den Çekme
    const fetchPostDetail = useCallback(async () => {
        try {
            setLoading(true);
            const [postRes, commentsRes] = await Promise.all([
                API.get(`/posts/${id}`),
                API.get(`/posts/${id}/comments`)
            ]);

            const fetchedPost = postRes.data;
            setPost(fetchedPost);
            setComments(commentsRes.data || []);

            // Net oy hesabı — backend artık her zaman upvote_count/downvote_count döndürüyor
            const netVotes = (fetchedPost.upvote_count !== undefined || fetchedPost.downvote_count !== undefined)
                ? ((fetchedPost.upvote_count || 0) - (fetchedPost.downvote_count || 0))
                : (fetchedPost.votes ?? 0);
            setVotes(netVotes);
            setUserVoteStatus(fetchedPost.user_vote || 0);

            // NOT: backend'de görüntülenme sayısını artıran bir endpoint
            // henüz yok (bkz. ortak checklist) — bu yüzden burada bilerek
            // istek atılmıyor.
        } catch (err) {
            setError(err.message || "Gönderi yüklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPostDetail();
    }, [fetchPostDetail]);

    // 2. Hash (#comment-id) kaydırma efekti
    useEffect(() => {
        if (hash && !loading) {
            const targetId = hash.replace('#', '');
            const element = document.getElementById(targetId);

            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('highlight-comment');

                    setTimeout(() => {
                        element.classList.remove('highlight-comment');
                    }, 2000);
                }, 100);
            }
        }
    }, [hash, loading]);

    // 3. BEĞENİ (VOTE / RPC cast_vote) FONKSİYONU
    // NOT: backend "toggle" mantığıyla çalışıyor — aynı vote_value'yu tekrar
    // gönderirsen oyu geri çeker (response.removed:true döner), farklı
    // gönderirsen oyu değiştirir. 0 diye bir değer YOK, hep 1 ya da -1
    // gönderiyoruz; kaldırılıp kaldırılmadığına backend'in cevabına göre karar veriyoruz.
    const handleVote = async (type) => {
        if (!user) {
            alert("Oy kullanmak için giriş yapmalısın.");
            return;
        }

        try {
            const response = await API.post('/votes', {
                target_type: 'post',
                target_id: id,
                vote_value: type
            });

            const removed = response.data?.removed;
            const newVoteType = removed ? 0 : type;
            const diff = newVoteType - userVoteStatus;
            setVotes(prev => prev + diff);
            setUserVoteStatus(newVoteType);
        } catch (err) {
            alert("Oy kaydedilirken hata oluştu: " + err.message);
        }
    };

    // 4. YENİ ANA YORUM EKLEME
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newCommentText.trim()) return;

        if (!user) {
            alert("Yorum yapmak için giriş yapmalısın.");
            return;
        }

        try {
            // NOT: backend createCommentSchema alan adı "body" bekliyor (content değil).
            const response = await API.post(`/posts/${id}/comments`, {
                body: newCommentText.trim(),
                parent_id: null
            });

            // Backend ham insert satırını dönüyor (author_username/avatar içermiyor),
            // ekranda hemen doğru görünsün diye kullanıcı bilgisini burada ekliyoruz.
            const newComment = {
                ...response.data,
                author_username: user.username,
                author_avatar: user.avatar,
                replies: []
            };

            setComments(prev => [...prev, newComment]);
            setNewCommentText("");
            
            // Post yorum sayısını UI üzerinde artır (backend alanı: comment_count)
            setPost(prev => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev);
        } catch (err) {
            alert("Yorum gönderilirken hata oluştu: " + err.message);
        }
    };

    // 5. YORUMA YANIT EKLEME (RECURSIVE UI GÜNCELLEMESİ)
    const handleReplySubmit = async (targetCommentId, replyText) => {
        if (!replyText.trim()) return;

        if (!user) {
            alert("Yanıt yazmak için giriş yapmalısın.");
            return;
        }

        try {
            // NOT: backend createCommentSchema alan adı "body" bekliyor (content değil).
            const response = await API.post(`/posts/${id}/comments`, {
                body: replyText.trim(),
                parent_id: targetCommentId
            });

            const newReplyObj = {
                ...response.data,
                author_username: user.username,
                author_avatar: user.avatar,
                replies: []
            };

            const addReplyRecursive = (commentList) => {
                return commentList.map(comment => {
                    if (comment.id === targetCommentId) {
                        return {
                            ...comment,
                            replies: [...(comment.replies || []), newReplyObj]
                        };
                    }
                    if (comment.replies && comment.replies.length > 0) {
                        return {
                            ...comment,
                            replies: addReplyRecursive(comment.replies)
                        };
                    }
                    return comment;
                });
            };

            setComments(prev => addReplyRecursive(prev));
        } catch (err) {
            alert("Yanıt gönderilirken hata oluştu: " + err.message);
        }
    };

    // 6. CEVABI KABUL ET / KALDIR (backend'de yeni eklendi)
    // Sadece gönderi sahibi kabul edebilir; backend zaten 403 ile bunu koruyor,
    // ama buton da sadece sahibine gösteriliyor.
    const handleAcceptAnswer = async (commentId) => {
        try {
            await API.post(`/posts/${id}/accept-answer`, { commentId });
            setPost(prev => prev ? { ...prev, accepted_comment_id: commentId, is_resolved: true } : prev);
        } catch (err) {
            alert("Cevap kabul edilirken hata oluştu: " + err.message);
        }
    };

    const handleUnacceptAnswer = async () => {
        try {
            await API.delete(`/posts/${id}/accept-answer`);
            setPost(prev => prev ? { ...prev, accepted_comment_id: null, is_resolved: false } : prev);
        } catch (err) {
            alert("Kabul kaldırılırken hata oluştu: " + err.message);
        }
    };

    if (loading) return <div className="post-detail-container">Yükleniyor...</div>;
    if (error || !post) return <div className="post-detail-container">{error || "Gönderi bulunamadı."}</div>;

    // Backend artık author'ı obje olarak dönüyor ({username, avatar_url});
    // eski string/profiles biçimlerine de tolerans gösteriyoruz.
    const authorName = post.author?.username
        || post.profiles?.username
        || (typeof post.author === 'string' ? post.author : null)
        || "Anonim";
    const viewsCount = post.view_count ?? post.views ?? 0;
    const descriptionText = post.body || post.description || post.content || '';

    return (
        <div className="post-detail-container">
            {/* Gönderi Kısmı */}
            <div className="post-full-content">
                {/* Sol Taraf: Oy Butonu */}
                <div className="post-vote-side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '20px' }}>
                    <button
                        className={`vote-btn ${userVoteStatus === 1 ? 'voted' : ''}`}
                        onClick={() => handleVote(1)}
                        style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: userVoteStatus === 1 ? '#007bff' : '#ccc' }}
                        aria-label="Upvote"
                    >
                        ▲
                    </button>
                    <span className="vote-count" style={{ fontWeight: 'bold', fontSize: '16px' }}>{votes}</span>
                </div>

                {/* Sağ Taraf: İçerik */}
                <div className="post-main-side" style={{ flex: 1 }}>
                    <h1>
                        {post.title}
                        {post.is_resolved && (
                            <span style={{ marginLeft: '10px', fontSize: '13px', color: '#28a745', border: '1px solid #28a745', borderRadius: '4px', padding: '2px 8px', verticalAlign: 'middle' }}>
                                ✓ Çözüldü
                            </span>
                        )}
                    </h1>
                    <div className="post-meta">
                        <span>Yazan: @{authorName}</span> • <span>{viewsCount} izlenme</span>
                    </div>
                    <hr />
                    <div className="post-text">
                        {descriptionText}
                    </div>
                    <div className="post-tags">
                        {post.tags && Array.isArray(post.tags) && post.tags.map((tag, index) => (
                            <span key={index} className="tag-item">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Yorumlar Kısmı */}
            <div className="comments-section">
                <h3>{comments.length} Yorum</h3>

                <form className="comment-input-area" onSubmit={handleCommentSubmit}>
                    <textarea
                        placeholder={user ? "Düşüncelerini paylaş..." : "Yorum yapmak için giriş yapmalısın"}
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        disabled={!user}
                    ></textarea>
                    <button type="submit" className="comment-btn-submit" disabled={!user}>Yorum Yap</button>
                </form>

                <div className="comments-list">
                    {comments.map(comment => (
                        <Comment
                            key={comment.id}
                            comment={comment}
                            onReplySubmit={handleReplySubmit}
                            postOwnerId={post.author_id}
                            currentUserId={user?.id}
                            acceptedCommentId={post.accepted_comment_id}
                            onAccept={handleAcceptAnswer}
                            onUnaccept={handleUnacceptAnswer}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PostDetail;