import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/authService';
import { ApiError } from '../services/api';
import './Register.css';

function Register({ setUser }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            setError('Lütfen tüm alanları doldurun.');
            return;
        }

        if (username.length < 3) {
            setError('Kullanıcı adı en az 3 karakter olmalı.');
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            setError('Geçerli bir e-posta adresi girin.');
            return;
        }

        // Backend kuralı: En az 8 karakter
        if (password.length < 8) {
            setError('Şifre en az 8 karakter olmalı.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Şifreler birbiriyle eşleşmiyor.');
            return;
        }

        setLoading(true);

        try {
            const { user, requiresEmailConfirmation } = await register({ username, email, password });

            if (requiresEmailConfirmation) {
                // Supabase projesinde e-posta doğrulama zorunluysa backend session
                // döndürmez; kullanıcı otomatik giriş yapamaz.
                setError('');
                alert('Kayıt başarılı! Devam etmeden önce e-postana gelen bağlantıyla hesabını onaylaman gerekiyor.');
                navigate('/login');
                return;
            }

            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            navigate('/');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Kayıt olunurken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-box">
                <h2>Aramıza Katıl</h2>
                <p>Forum topluluğuna üye olmak için formu doldurun.</p>

                <form onSubmit={handleRegister}>
                    <div className="input-group">
                        <label>Kullanıcı Adı</label>
                        <input
                            type="text"
                            placeholder="johndoe"
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); setError(''); }}
                            required
                        />
                    </div>

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

                    <div className="input-group">
                        <label>Şifre Tekrar</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                            required
                        />
                    </div>

                    {error && (
                        <p className="register-error" style={{ color: '#e74c3c', fontSize: '0.9rem', marginTop: '-6px', marginBottom: '10px' }}>
                            {error}
                        </p>
                    )}

                    <button type="submit" className="register-submit-btn" disabled={loading}>
                        {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
                    </button>
                </form>

                <div className="register-footer">
                    <span>Zaten hesabın var mı? </span>
                    <button onClick={() => navigate('/login')} className="link-btn">Giriş Yap</button>
                </div>
            </div>
        </div>
    );
}

export default Register;