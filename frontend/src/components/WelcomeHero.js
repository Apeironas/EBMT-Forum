import React from 'react';
import { FaInstagram, FaLinkedin } from 'react-icons/fa';
import './WelcomeHero.css';

function WelcomeHero({ user }) {
  return (
    <section className="welcome-hero" aria-label="Karşılama">
      <div className="welcome-hero__glyphs" aria-hidden="true">
        <span>&lt;/&gt;</span>
        <span>&lt;/&gt;</span>
        <span>&lt;/&gt;</span>
      </div>

      <div className="welcome-hero__content">
        <div className="welcome-hero__text">
          {user?.username && (
            <p className="welcome-hero__eyebrow">Merhaba, {user.username} 👋</p>
          )}
          <h1 className="welcome-hero__title">
            Ege Bilgisayar Mühendisliği Topluluğu<br />Forumu'na Hoş Geldin
          </h1>
          <span className="welcome-hero__rule" aria-hidden="true"></span>
          <p className="welcome-hero__subtitle">
            Kod sorularını sor, aklına takılan her şeyi paylaş, topluluktan gelen
            yanıtlarla birlikte çöz. Burası bilgi paylaşmak için var.
          </p>
        </div>

        <div className="welcome-hero__follow">
          <span className="welcome-hero__follow-label">Bizi takip et</span>
          <div className="welcome-hero__follow-links">
            <a
              href="https://www.instagram.com/egebilmuhtoplulugu/"
              target="_blank"
              rel="noreferrer"
              className="welcome-hero__follow-pill"
            >
              <FaInstagram />
              <span>Instagram</span>
            </a>

            <a
              href="https://www.linkedin.com/company/ege-%C3%BCniversitesi-bilgisayar-m%C3%BChendisli%C4%9Fi-toplulu%C4%9Fu/"
              target="_blank"
              rel="noreferrer"
              className="welcome-hero__follow-pill"
            >
              <FaLinkedin />
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WelcomeHero;