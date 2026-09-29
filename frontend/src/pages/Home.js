import React, { useState } from 'react';
import './Home.css';
import AskQuestion from '../components/questionbox';
import PostCard from '../components/PostCard';
import WelcomeHero from '../components/WelcomeHero';

function Home({ searchQuery, toggleSavePost, savedPosts, posts = [], addPost, user }) {
    const [sortBy, setSortBy] = useState('popular'); // 'popular' | 'latest'

    // Arama kelimesine ve veritabanı alanlarına göre filtreleme
    const filteredPosts = posts.filter((post) => {
        const query = searchQuery ? searchQuery.toLowerCase().trim() : "";
        if (!query) return true;

        const titleMatch = post.title ? post.title.toLowerCase().includes(query) : false;
        const descSource = post.body || post.description || post.content || '';
        const descMatch = descSource.toLowerCase().includes(query);
        const tagMatch = post.tags && Array.isArray(post.tags) 
            ? post.tags.some(tag => tag.toLowerCase().includes(query)) 
            : false;

        return titleMatch || descMatch || tagMatch;
    });

    // Net oy hesabı — backend upvote_count/downvote_count döndürüyor, tek bir
    // "votes" alanı yok (PostCard'daki mantıkla aynı).
    const getNetVotes = (post) =>
        (post.upvote_count !== undefined || post.downvote_count !== undefined)
            ? ((post.upvote_count || 0) - (post.downvote_count || 0))
            : (post.votes ?? 0);

    // Sabitlenmiş gönderiler (is_pinned) üstte, ardından sıralama tercihine göre dizilim
    const sortedPosts = [...filteredPosts].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;

        if (sortBy === 'latest') {
            return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
        }
        // 'popular' sıralaması
        return getNetVotes(b) - getNetVotes(a);
    });

    return (
        <div className="Home">
    <WelcomeHero user={user} />

    {/* Soru sorma kutusu */}
    <AskQuestion onAddPost={addPost} user={user} />

            <div className="home-content-wrapper">
                <section className="posts-section">
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h2 className="section-title" style={{ margin: 0 }}>
                            {searchQuery ? `"${searchQuery}" İçin Arama Sonuçları` : "Sorular & Tartışmalar"}
                        </h2>

                        {/* Sıralama Filtresi */}
                        <div className="sort-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className={`sort-btn ${sortBy === 'popular' ? 'active' : ''}`}
                                onClick={() => setSortBy('popular')}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    cursor: 'pointer',
                                    background: sortBy === 'popular' ? '#007bff' : '#fff',
                                    color: sortBy === 'popular' ? '#fff' : '#333'
                                }}
                            >
                                Popüler
                            </button>
                            <button
                                className={`sort-btn ${sortBy === 'latest' ? 'active' : ''}`}
                                onClick={() => setSortBy('latest')}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    cursor: 'pointer',
                                    background: sortBy === 'latest' ? '#007bff' : '#fff',
                                    color: sortBy === 'latest' ? '#fff' : '#333'
                                }}
                            >
                                En Yeni
                            </button>
                        </div>
                    </div>
                    
                    <div className="posts-container">
                        {sortedPosts.length === 0 ? (
                            <div className="no-results" style={{ padding: '30px', color: '#666', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px' }}>
                                Aradığınız kriterlere uygun bir soru bulunamadı.
                            </div>
                        ) : (
                            sortedPosts.map((post) => (
                                <PostCard 
                                    key={post.id} 
                                    post={post} 
                                    toggleSavePost={toggleSavePost}
                                    savedPosts={savedPosts}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Home;