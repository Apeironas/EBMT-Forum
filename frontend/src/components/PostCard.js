import React from 'react';
import './PostCard.css';
import { Link } from 'react-router-dom';

function PostCard({ post, toggleSavePost, savedPosts = [] }) {
  // Post kaydedildi mi kontrolü
  const isSaved = savedPosts.some(p => p.id === post.id);

  // Backend Relational Data Toleransı
  // Backend artık author'ı obje olarak dönüyor: { username, avatar_url }.
  // Eski string/profiles biçimlerine de tolerans gösteriyoruz.
  const authorName = post.author?.username
    || post.profiles?.username
    || (typeof post.author === 'string' ? post.author : null)
    || 'Anonim';
  const authorAvatar = post.author?.avatar_url || post.profiles?.avatar_url || post.authorAvatar || null;

  // Net oy hesabı — backend artık her zaman upvote_count/downvote_count döndürüyor
  const votesCount = (post.upvote_count !== undefined || post.downvote_count !== undefined)
    ? ((post.upvote_count || 0) - (post.downvote_count || 0))
    : (post.votes ?? 0);

  const answersCount = post.comment_count ?? post.answers ?? post.comments_count ?? 0;
  const viewsCount = post.view_count ?? post.views ?? 0;
  const isResolved = post.is_resolved || post.hasAcceptedAnswer || false;
  const descriptionText = post.body || post.description || post.content || '';

  // Tarih formatlama helper'ı
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
  };

  return (
    <div className="post-card">
      {/* Sol Taraf: İstatistikler */}
      <div className="post-stats">
        <div><strong>{votesCount}</strong> oy</div>
        <div className={`answer-box ${isResolved ? 'accepted' : ''}`}>
          {answersCount} cevap
        </div>
        <div>{viewsCount} izlenme</div>
      </div>

      {/* Sağ Taraf: İçerik */}
      <div className="post-content">
        
        {/* INSTAGRAM TARZI KAYDETME BUTONU */}
        <button 
          className={`instagram-save-btn ${isSaved ? 'saved' : ''}`}
          onClick={() => toggleSavePost && toggleSavePost(post)}
          aria-label="Kaydet"
        >
          {isSaved ? (
            <svg aria-label="Kaydedildi" color="#262626" fill="#262626" height="24" role="img" viewBox="0 0 24 24" width="24">
              <path d="M20 22a.75.75 0 0 1-.516-.2l-7.484-6.804-7.484 6.804A.75.75 0 0 1 3.25 22V3.75A2.75 2.75 0 0 1 6 1h12a2.75 2.75 0 0 1 2.75 2.75Z"></path>
            </svg>
          ) : (
            <svg aria-label="Kaydet" color="#6a737c" fill="#6a737c" height="24" role="img" viewBox="0 0 24 24" width="24">
              <path d="M20 22a.75.75 0 0 1-.516-.2l-7.484-6.804-7.484 6.804A.75.75 0 0 1 3.25 22V3.75A2.75 2.75 0 0 1 6 1h12a2.75 2.75 0 0 1 2.75 2.75ZM4.75 3.75V19.041l6.734-6.122a.75.75 0 0 1 1.032 0l6.734 6.122V3.75A1.25 1.25 0 0 0 18 2.5H6a1.25 1.25 0 0 0-1.25 1.25Z"></path>
            </svg>
          )}
        </button>

        <Link to={`/post/${post.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{ color: '#0074cc', cursor: 'pointer', margin: '0 0 8px 0' }}>{post.title}</h3>
        </Link>
        
        <p className="post-description-text" style={{ margin: '0 0 12px 0', color: '#3c4146', fontSize: '14px' }}>
          {descriptionText.length > 200 ? `${descriptionText.substring(0, 200)}...` : descriptionText}
        </p>

        <div className="post-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="post-tags">
            {post.tags && Array.isArray(post.tags) && post.tags.map((tag, index) => (
              <span key={index} className="tag-item">{tag}</span>
            ))}
          </div>

          <div className="post-author-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6a737c' }}>
            {authorAvatar && (
              <img 
                src={authorAvatar} 
                alt={authorName} 
                style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} 
              />
            )}
            <span>@{authorName}</span>
            {post.created_at && <span>• {formatDate(post.created_at)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostCard;