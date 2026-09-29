import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';
import './Sidebar.css';

function Sidebar({ user, setUser }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        // App.js'deki kullanıcı durumunu sıfırla
        if (setUser) setUser(null);

        // Access/refresh token'ları ve eski kullanıcı önbelleğini temizle
        logout();
        localStorage.removeItem('user');

        console.log("Çıkış yapıldı");
        navigate('/login');
    };

    return (
        <nav className="sidebar">
            <ul className="nav-menu">
                <li>
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <span className="nav-name">Home</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/Sohbet" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <span className="nav-name">Sohbet</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/Code" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <span className="nav-name">Code</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/Kaydedilenler" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <span className="nav-name">Kaydedilenler</span>
                    </NavLink>
                </li>
            </ul>

            {/* Sadece kullanıcı giriş yapmışsa (user null değilse) alt kısmı göster */}
            {user && (
                <div className="sidebar-bottom">
                    <NavLink 
                        to="/Profil" 
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-name">Profil</span>
                    </NavLink>
                    
                    <button onClick={handleLogout} className="logout-button">
                        <span className="nav-name">Çıkış Yap</span>
                    </button>
                </div>
            )}
        </nav>
    );
}

export default Sidebar;