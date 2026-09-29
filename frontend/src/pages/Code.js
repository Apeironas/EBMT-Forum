import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CodeSoruSor from '../components/CodeSoruSor';

// NOT: Bu sayfa artık kendi başına localStorage'da tutmuyor;
// App.js'teki paylaşılan `posts` listesini kullanıyor (Home ile aynı
// backend feed'i), sadece 'code-question' etiketi olanları gösteriyor.
// Böylece kod soruları da gerçek post akışının bir parçası oluyor.
function Code({ user, posts = [], addPost }) {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(null);

  const codePosts = posts.filter(p => Array.isArray(p.tags) && p.tags.includes('code-question'));

  // Koda tıklayınca panoya kopyalama fonksiyonu
  const handleCopyCode = (id, codeText) => {
    navigator.clipboard.writeText(codeText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="code-page" style={{ padding: '20px 0' }}>
      <CodeSoruSor addPost={addPost} user={user} />

      <div className="past-questions" style={{ marginTop: '30px' }}>
        <h3>Son Paylaşılan Kodlar</h3>

        {codePosts.length === 0 ? (
          <p style={{ color: '#888', background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
            Henüz hiç kod paylaşılmamış. İlk paylaşımı sen yap!
          </p>
        ) : (
          codePosts.map(post => {
            const codeText = post.code || post.code_snippet || post.body || post.content || post.description || '';
            const language = post.language || post.code_language || (post.tags || []).find(t => t !== 'code-question') || 'code';

            return (
              <div
                key={post.id}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  backgroundColor: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4
                    onClick={() => navigate(`/post/${post.id}`)}
                    style={{ margin: '0 0 6px', color: '#0074cc', cursor: 'pointer' }}
                  >
                    {post.title}
                  </h4>

                  <span style={{
                    fontSize: '11px',
                    background: '#e1ecf4',
                    color: '#39739d',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: '600'
                  }}>
                    {String(language).toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                  Yazan: <strong>@{post.author?.username || post.author_username || (typeof post.author === 'string' ? post.author : null) || 'Anonim'}</strong> • {post.date || post.created_at || 'Yakın zamanda'}
                </div>

                {/* Kod Bloğu ve Kopyalama Butonu */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => handleCopyCode(post.id, codeText)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      backdropFilter: 'blur(2px)'
                    }}
                  >
                    {copiedId === post.id ? '✓ Kopyalandı' : '📋 Kopyala'}
                  </button>

                  <pre style={{
                    backgroundColor: '#2d2d2d',
                    color: '#f8f8f2',
                    padding: '14px',
                    borderRadius: '6px',
                    overflowX: 'auto',
                    fontSize: '13px',
                    margin: 0,
                    lineHeight: '1.4'
                  }}>
                    <code>{codeText}</code>
                  </pre>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Code;
