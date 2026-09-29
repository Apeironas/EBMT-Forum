import React, { useState } from 'react';
import PostCard from '../components/PostCard';

function Kaydedilenler({ savedPosts = [], toggleSavePost }) {
  const [filter, setFilter] = useState('all');

  // Filtreleme mantığını genişletip veritabanı alan tipleriyle tam uyumlu hale getiriyoruz
  const filteredItems = savedPosts.filter(post => {
    if (filter === 'all') return true;
    
    if (filter === 'code') {
      return post.category === 'code' || Boolean(post.code_snippet) || Boolean(post.code);
    }
    
    if (filter === 'sohbet') {
      return post.type === 'sohbet' || post.category === 'sohbet' || post.category === 'Genel Soru';
    }
    
    return false;
  });

  // Sekmelerdeki dinamik sayı bildirimleri
  const codeCount = savedPosts.filter(p => p.category === 'code' || Boolean(p.code_snippet) || Boolean(p.code)).length;
  const sohbetCount = savedPosts.filter(p => p.type === 'sohbet' || p.category === 'sohbet' || p.category === 'Genel Soru').length;

  return (
    <div className="saved-page" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>📌 Kaydedilen Sorular & İçerikler</h1>
        <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
          Toplam {savedPosts.length} içerikten {filteredItems.length} tanesi listeleniyor.
        </p>
      </header>

      {/* Kategorilere Göre Sekmeler (Tabs) */}
      <div className="tabs" style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e0e0e0', marginBottom: '20px' }}>
        <button onClick={() => setFilter('all')} style={tabStyle(filter === 'all')}>
          Tümü ({savedPosts.length})
        </button>
        <button onClick={() => setFilter('code')} style={tabStyle(filter === 'code')}>
          Kodlar ({codeCount})
        </button>
        <button onClick={() => setFilter('sohbet')} style={tabStyle(filter === 'sohbet')}>
          Sohbet ({sohbetCount})
        </button>
      </div>

      {/* Kaydedilen Postların Listelendiği Alan */}
      <div className="saved-list">
        {filteredItems.length > 0 ? (
          filteredItems.map(post => (
            <div key={post.id || post.topic_id} style={{ marginBottom: '15px' }}>
              <PostCard 
                post={post} 
                toggleSavePost={toggleSavePost} 
                savedPosts={savedPosts} 
              />
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', marginTop: '40px', color: '#888', padding: '40px', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ccc' }}>
            <p style={{ fontSize: '16px', margin: 0 }}>Bu kategoride kaydedilmiş bir içerik bulunmuyor... 🏜️</p>
            <p style={{ fontSize: '13px', color: '#a0a0a0', marginTop: '8px' }}>
              Soruların veya tartışmaların sağ üstündeki kaydet butonuna basarak bu alana ekleyebilirsin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Sekme Stil Dinamiği
const tabStyle = (isActive) => ({
  padding: '10px 18px',
  border: 'none',
  backgroundColor: 'transparent',
  borderBottom: isActive ? '3px solid #0074cc' : '3px solid transparent',
  color: isActive ? '#0074cc' : '#555',
  cursor: 'pointer',
  fontWeight: isActive ? '600' : 'normal',
  fontSize: '14px',
  transition: 'all 0.2s ease'
});

export default Kaydedilenler;