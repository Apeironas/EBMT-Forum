import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from 'react-simple-code-editor';

// Prism.js modül bağımlılıkları
import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

function CodeSoruSor({ addPost, user }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleShare = async () => {
    if (!user) {
      alert('Kod paylaşmak için giriş yapmalısın.');
      return;
    }
    if (!title.trim()) {
      alert('Lütfen sorunun başlığını yaz.');
      return;
    }
    if (!code.trim()) {
      alert('Lütfen bir kod parçası ekle.');
      return;
    }

    try {
      setIsSubmitting(true);

      // categoryId: kategori seçimi UI'a henüz eklenmediği için (bkz.
      // "category kavramı" tartışması) şimdilik "Genel" (id:1) sabit.
      const createdPost = await addPost({
        title: title.trim(),
        content: code,
        categoryId: 1,
        tags: [language, 'code-question']
      });

      // Inputları sıfırla ve yeni post detayına yönlendir
      setTitle('');
      setCode('');
      navigate(`/post/${createdPost.id}`);

    } catch (err) {
      alert('Gönderi paylaşılırken bir hata oluştu: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const diller = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'java', label: 'Java' },
    { value: 'other', label: 'Diğer' }
  ];

  return (
    <div className="code-soru-container" style={{ padding: '20px' }}>
      <h2>Kodunu Paylaş, Çözüm Ara</h2>
      
      {/* Başlık Girişi */}
      <input
        type="text"
        placeholder="Sorunun başlığı nedir? (Örn: Bu fonksiyon neden undefined dönüyor?)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
      />
      
      {/* Dil Seçimi */}
      <div className="language-selector" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label htmlFor="lang-select">Kod Türü:</label>
        <select 
          id="lang-select" 
          value={language} 
          onChange={(e) => setLanguage(e.target.value)}
          style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          {diller.map(dil => (
            <option key={dil.value} value={dil.value}>{dil.label}</option>
          ))}
        </select>
      </div>

      {/* Editor */}
      <div className="editor-wrapper" style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          backgroundColor: '#2d2d2d' 
      }}>
        <Editor
          value={code}
          onValueChange={code => setCode(code)}
          highlight={code => Prism.highlight(code, Prism.languages[language] || Prism.languages.javascript, language)}
          padding={10}
          placeholder="// Kodunu buraya yaz..."
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 14,
            backgroundColor: '#2d2d2d',
            color: '#f8f8f2',
            minHeight: '200px',
          }}
        />
      </div>

      {/* Footer & Buton */}
      <div className="paylas-footer" style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
        <span style={{ fontSize: '12px', color: '#666' }}>{code.length} / 5000</span>
        <button
          onClick={handleShare}
          disabled={isSubmitting}
          style={{ 
            backgroundColor: isSubmitting ? '#999' : '#0074cc', 
            color: 'white', 
            border: 'none', 
            padding: '8px 20px', 
            borderRadius: '4px', 
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
        }}>
          {isSubmitting ? 'Paylaşılıyor...' : 'Kod Sorunu Paylaş'}
        </button>
      </div>
    </div>
  );
}

export default CodeSoruSor;