import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sohbet.css';

const initialTopics = [
    {
        id: 1,
        title: "Ege Bilgisayar vize haftası yaklaşıyor, durumlar ne?",
        author: "yazilimci_abi",
        author_id: 101,
        date: "2 saat önce",
        created_at: new Date().toISOString(),
        replyCount: 5,
        category: "Genel Soru",
        type: "sohbet"
    },
    {
        id: 2,
        title: "Computational Biology seçmeli dersini alan var mı? Slaytlar çok yoğun.",
        author: "shrekdonkey800",
        author_id: 102,
        date: "5 saat önce",
        created_at: new Date().toISOString(),
        replyCount: 3,
        category: "Ders Seçimi",
        type: "sohbet"
    },
    {
        id: 3,
        title: "İzmir içinde yazılım stajı için şirket önerileri (Ulusal Staj Programı dışı)",
        author: "ege_ogrencisi",
        author_id: 103,
        date: "Dün",
        created_at: new Date().toISOString(),
        replyCount: 12,
        category: "Staj/Kariyer",
        type: "sohbet"
    }
];

function Sohbet({ user, toggleSavePost, savedPosts = [] }) {
    const navigate = useNavigate();

    // Konu başlıkları localStorage'dan okunur
    const [topics, setTopics] = useState(() => {
        const saved = localStorage.getItem('sohbet_topics');
        return saved ? JSON.parse(saved) : initialTopics;
    });

    const [newTitle, setNewTitle] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Genel");
    const [filterCategory, setFilterCategory] = useState("Tümü");

    // --- YENİ SOHBET BAŞLIĞI AÇMA FONKSİYONU ---
    const handleCreateTopic = (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        if (!user) {
            alert("Konu açmak için giriş yapmalısın.");
            return;
        }

        // Veritabanı 'Topic' tablosuna tam uyumlu yeni sohbet nesnesi
        const newTopic = {
            id: Date.now(),
            title: newTitle.trim(),
            author: user.username || user.email || 'Anonim',
            author_id: user.id || null,
            date: "Şimdi",
            created_at: new Date().toISOString(),
            replyCount: 0,
            view_count: 0,
            category: selectedCategory,
            type: 'sohbet'
        };

        const updated = [newTopic, ...topics];
        setTopics(updated);
        localStorage.setItem('sohbet_topics', JSON.stringify(updated));
        setNewTitle("");
    };

    // Kategori filtresine göre konuları süz
    const filteredTopics = topics.filter(t => {
        if (filterCategory === "Tümü") return true;
        return t.category === filterCategory;
    });

    return (
        <div className="sohbet-forum-page">
            <div className="sohbet-welcome">
                <h1>Serbest Kürsü & Sohbet Odası</h1>
                <p>İstediğin konuda yeni bir tartışma başlığı aç, toplulukla fikir alışverişi yap.</p>
            </div>

            {/* Konu Açma Kutusu */}
            <form className="create-topic-box" onSubmit={handleCreateTopic}>
                <h3>💬 Yeni Bir Sohbet Başlığı Aç</h3>
                <input
                    type="text"
                    placeholder={user ? "Tartışmak istediğin konunun başlığı nedir? (Örn: Mantık tasarımı ödevi hakkında...)" : "Konu açmak için giriş yapmalısın"}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    disabled={!user}
                />
                <div className="create-topic-footer">
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} disabled={!user}>
                        <option value="Genel">Genel</option>
                        <option value="Ders Ödev">Ders & Ödev</option>
                        <option value="Staj Kariyer">Staj & Kariyer</option>
                        <option value="Geyik Kahve">Geyik & Kahve</option>
                    </select>
                    <button type="submit" disabled={!user || !newTitle.trim()}>Konuyu Başlat</button>
                </div>
            </form>

            {/* Konu Başlıkları Listesi */}
            <div className="topics-list-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2>Aktif Tartışmalar</h2>

                    {/* Kategori Filtre Butonları */}
                    <div className="category-filter-bar" style={{ display: 'flex', gap: '8px' }}>
                        {["Tümü", "Genel", "Ders Ödev", "Staj Kariyer", "Geyik Kahve"].map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setFilterCategory(cat)}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '15px',
                                    border: '1px solid #ddd',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    background: filterCategory === cat ? '#007bff' : '#f8f9fa',
                                    color: filterCategory === cat ? '#fff' : '#333'
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredTopics.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666', background: '#fff', borderRadius: '8px' }}>
                        Bu kategoride henüz hiç sohbet başlığı bulunmuyor.
                    </div>
                ) : (
                    filteredTopics.map(topic => {
                        const isSaved = savedPosts.some(p => p.id === topic.id);
                        return (
                            <div 
                                key={topic.id} 
                                className="topic-row-card"
                                onClick={() => navigate(`/sohbet/${topic.id}`, { state: { topic } })}
                            >
                                <button
                                    className={`instagram-save-btn ${isSaved ? 'saved' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Kart tıklamasını engeller
                                        toggleSavePost && toggleSavePost(topic);
                                    }}
                                    aria-label="Kaydet"
                                >
                                    {isSaved ? (
                                        <svg aria-label="Kaydedildi" color="#262626" fill="#262626" height="22" role="img" viewBox="0 0 24 24" width="22">
                                            <path d="M20 22a.75.75 0 0 1-.516-.2l-7.484-6.804-7.484 6.804A.75.75 0 0 1 3.25 22V3.75A2.75 2.75 0 0 1 6 1h12a2.75 2.75 0 0 1 2.75 2.75Z"></path>
                                        </svg>
                                    ) : (
                                        <svg aria-label="Kaydet" color="#6a737c" fill="#6a737c" height="22" role="img" viewBox="0 0 24 24" width="22">
                                            <path d="M20 22a.75.75 0 0 1-.516-.2l-7.484-6.804-7.484 6.804A.75.75 0 0 1 3.25 22V3.75A2.75 2.75 0 0 1 6 1h12a2.75 2.75 0 0 1 2.75 2.75ZM4.75 3.75V19.041l6.734-6.122a.75.75 0 0 1 1.032 0l6.734 6.122V3.75A1.25 1.25 0 0 0 18 2.5H6a1.25 1.25 0 0 0-1.25 1.25Z"></path>
                                        </svg>
                                    )}
                                </button>

                                <div className="topic-info-side">
                                    <span className="topic-category-tag">{topic.category}</span>
                                    <h3 className="topic-row-title">{topic.title}</h3>
                                    <div className="topic-row-meta">
                                        <span>Açan: <strong>@{topic.author || 'Anonim'}</strong></span> • <span>{topic.date || 'Yakın zamanda'}</span>
                                    </div>
                                </div>
                                <div className="topic-stats-side">
                                    <span className="reply-number">💬 {topic.replyCount ?? 0}</span>
                                    <span className="reply-text">yanıt</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default Sohbet;