import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { ApiError } from '../services/api';
import './Login.css';

function Login({ setUser }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password.trim()) {
            setError('Lütfen tüm alanları doldurun.');
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            setError('Geçerli bir e-posta adresi girin.');
            return;
        }

        // Güncellenen backend kuralı: En az 8 karakter
        if (password.length < 8) {
            setError('Şifre en az 8 karakter olmalı.');
            return;
        }

        setLoading(true);

        try {
            // authService.login() zaten access/refresh token'ları saklıyor,
            // ve backend'in Supabase user objesini { id, username, email, avatar }
            // şekline çeviriyor.
            const user = await login({ email, password });

            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            navigate('/');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Giriş yapılırken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Hoş Geldiniz</h2>
                <p>Devam etmek için lütfen giriş yapın.</p>

                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>E-posta</label>
                        <input
                            type="email"
                            placeholder="ornek@mail.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Şifre</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            required
                        />
                    </div>

                    {error && (
                        <p className="login-error" style={{ color: '#e74c3c', fontSize: '0.9rem', marginTop: '-6px', marginBottom: '10px' }}>
                            {error}
                        </p>
                    )}

                    <button type="submit" className="login-submit-btn" disabled={loading}>
                        {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>

                <div className="login-footer">
                    <span>Hesabın yok mu? </span>
                    <button onClick={() => navigate('/register')} className="link-btn">Üye Ol</button>
                </div>
            </div>
        </div>
    );
}

export default Login;