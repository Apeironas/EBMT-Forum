import React from 'react';
import './footer.css';
import { FaInstagram, FaLinkedin, FaCode } from 'react-icons/fa';

function Footer() {
  return (
    <div className='footer-container'>
      

      <div className='footer-links'>
        <div className='footer-link-wrapper'>
          <div className='footer-link-items'>
            <h2>Social Media</h2>
            <a href='https://www.instagram.com/egebilmuhtoplulugu/' target='_blank' rel='noreferrer'>Instagram</a>
            <a href='https://www.linkedin.com/company/ege-%C3%BCniversitesi-bilgisayar-m%C3%BChendisli%C4%9Fi-toplulu%C4%9Fu/' target='_blank' rel='noreferrer'>LinkedIn</a>
          </div>
        </div>
      </div>

      <section className='social-media'>
        <div className='social-media-wrap'>
          <div className='footer-logo'>
            <a href='/' className='social-logo'>
              EBMT <FaCode />
            </a>
          </div>
          <small className='website-rights'>EBMT © 2026</small>
          <div className='social-icons'>
            <a className='social-icon-link instagram' href='https://www.instagram.com/egebilmuhtoplulugu/' target='_blank' rel='noreferrer' aria-label='Instagram'>
              <FaInstagram />
            </a>
            <a className='social-icon-link linkedin' href='https://www.linkedin.com/company/ege-%C3%BCniversitesi-bilgisayar-m%C3%BChendisli%C4%9Fi-toplulu%C4%9Fu/' target='_blank' rel='noreferrer' aria-label='LinkedIn'>
              <FaLinkedin />
            </a>
          </div>
        </div>
      </section>
      
    </div>
  );
}

export default Footer;