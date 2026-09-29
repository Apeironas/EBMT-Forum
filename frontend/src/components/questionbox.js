import React, { useState } from 'react';
import './questionbox.css';

const AskQuestion = ({ onAddPost, addPost, user }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prop olarak onAddPost veya addPost hangisi gelirse onu tetikler
  const handleAddPost = onAddPost || addPost;

  const handleSubmit = async () => {
    if (!user) {
      setError('Soru sormak için giriş yapman gerekiyor.');
      return;
    }
    if (!title.trim()) {
      setError('Başlık alanı boş bırakılamaz.');
      return;
    }
    if (title.length < 10) {
      setError('Başlık en az 10 karakter olmalı.');
      return;
    }
    // NOT: Backend açıklama (content) alanını ZORUNLU tutuyor, formda
    // "isteğe bağlı" yazsa da boş göndermek backend'den hata döndürüyor.
    if (!description.trim()) {
      setError('Soru açıklaması boş bırakılamaz.');
      return;
    }

    const newTopic = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      votes: 0,
      answers: 0,
      views: 0,
      view_count: 0,
      author: user.username || user.email || 'Anonim',
      author_id: user.id || null,
      is_resolved: false,
      is_pinned: false,
      category: 'soru',
      createdAt: new Date().toISOString()
    };

    if (!handleAddPost) return;

    try {
      setIsSubmitting(true);
      setError('');
      await handleAddPost(newTopic);

      // Formu temizle (sadece başarılı olursa)
      setTitle('');
      setDescription('');
      setTags('');
      setIsExpanded(false);
    } catch (err) {
      // Backend'den gelen gerçek hatayı göster, sayfayı çökertme
      setError(err.message || 'Gönderi paylaşılırken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ask-box-container">
      <div className="input-wrapper">
        <input
          className="ask-title-input"
          type="text"
          placeholder="Sorunun başlığı nedir? (Örn: React'te state nasıl çalışır?)"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(''); }}
          onFocus={() => setIsExpanded(true)}
          maxLength={150}
        />

        {isExpanded && (
          <>
            <textarea
              className="ask-description-input"
              placeholder="Soruyu detaylı açıkla..."
              value={description}
              onChange={(e) => { setDescription(e.target.value); setError(''); }}
              rows={4}
            />
            <input
              className="ask-tags-input"
              type="text"
              placeholder="Etiketler: react, javascript, python (virgülle ayır)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </>
        )}

        {error && <p className="ask-error">{error}</p>}

        <div className="ask-box-footer">
          <span className="char-count">{title.length} / 150</span>
          <div className="ask-box-actions">
            {isExpanded && (
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setIsExpanded(false);
                  setTitle('');
                  setDescription('');
                  setTags('');
                  setError('');
                }}
              >
                İptal
              </button>
            )}
            <button
              type="button"
              className="post-button"
              disabled={!title.trim() || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Paylaşılıyor...' : 'Paylaş'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AskQuestion;