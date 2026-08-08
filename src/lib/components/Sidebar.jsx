import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './Sidebar.css';
import { useLanguage } from '../contexts/LanguageContext';

function Sidebar({ onNavigate }) {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const handleLinkClick = (e, view) => {
        e.preventDefault();
        onNavigate(view);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsOpen(false);
    };

    return (
        <div className={`container ${isOpen ? 'container--open' : ''}`} id="sidebar">
            <button
                aria-label="menu switch"
                className={`container__switch ${isOpen ? 'switch-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <svg
                    className="container__switch__icon"
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M6.001 7.128L6 10.438l19.998-.005L26 7.124zM6.001 21.566L6 24.876l19.998-.006.002-3.308zM6.001 14.341L6 17.65l19.998-.004.002-3.309z"
                    />
                </svg>
            </button>

            <article className="container__content">
                <div className="sidebar-title">
                    <h3 className="subtitle">{t('sidebar.filesystem')}</h3>
                </div>

                <div className="sidebar-title__separator"></div>

                <a 
                    className="sidebar-link" 
                    href="/about"
                    onClick={(e) => handleLinkClick(e, 'about')}
                >
                    <svg
                        className="sidebar-link-icon"
                        viewBox="0 0 16 16"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M16 15a1 1 0 0 1-2 0V8A6 6 0 1 0 2 8v7a1 1 0 0 1-2 0V8a8 8 0 1 1 16 0v7zm-4-3a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zm-4 0a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zm-4 0a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zm2-6a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
                            fillRule="evenodd"
                        />
                    </svg>
                    <p>{t('sidebar.about')}</p>
                </a>

                <a 
                    className="sidebar-link" 
                    href="/projects"
                    onClick={(e) => handleLinkClick(e, 'projects')}
                >
                    <svg
                        className="sidebar-link-icon"
                        viewBox="0 0 16 16"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M4 10.171V0h12v6H6v7c0 1.657-1.347 3-3 3-1.657 0-3-1.347-3-3a3.002 3.002 0 0 1 4-2.829zM4 12H2v2h2v-2zM6 2v2h8V2H6zm8 6.171V6h2v5c0 1.657-1.347 3-3 3-1.657 0-3-1.347-3-3a3.002 3.002 0 0 1 4-2.829zM14 10h-2v2h2v-2z"
                            fillRule="evenodd"
                        />
                    </svg>
                    <p>{t('sidebar.projects')}</p>
                </a>

                <a 
                    className="sidebar-link" 
                    href="/contact"
                    onClick={(e) => handleLinkClick(e, 'contact')}
                >
                    <svg
                        className="sidebar-link-icon"
                        viewBox="0 0 16 16"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M 0,0 H 16 V 12 H 4 V 4 h 8 v 6 h 2 V 2 H 2 v 12 h 14 v 2 H 0 Z M 10,10 V 6 H 6 v 4 z"
                        />
                    </svg>
                    <p>{t('sidebar.contact')}</p>
                </a>

                <a 
                    className="sidebar-link" 
                    href="/tools"
                    onClick={(e) => handleLinkClick(e, 'games')}
                >
                    <svg
                        className="sidebar-link-icon"
                        viewBox="0 0 16 16"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M15.45 1.38l-.8-.8c-.73-.73-1.92-.73-2.65 0L10.38 2.2 13.8 5.62l1.65-1.62c.73-.73.73-1.92 0-2.65zM1 11.48l-.75 4.27 4.27-.75L14.25 5.27 10.73 1.75 1 11.48z"
                        />
                    </svg>
                    <p>{t('sidebar.games')}</p>
                </a>

                <a 
                    className="sidebar-link" 
                    href="/apps"
                    onClick={(e) => handleLinkClick(e, 'music')}
                >
                    <svg
                        className="sidebar-link-icon"
                        viewBox="0 0 16 16"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M0 0h7v7H0V0zm9 0h7v7H9V0zM0 9h7v7H0V9zm9 0h7v7H9V9z"
                        />
                    </svg>
                    <p>{t('sidebar.music')}</p>
                </a>

                <a
                    className="sidebar-link"
                    href="/playground"
                    onClick={(e) => handleLinkClick(e, 'playground')}
                >
                    <svg
                        className="sidebar-link-icon"
                        viewBox="0 0 16 16"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M2 1a1 1 0 0 0-1 1v1h4.586L7 4.414 8.414 3H14a1 1 0 0 0-1-1H7.5L6.5 1H2zM1 4v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5H8.586L7 3.586 6.586 4H1z"
                            fillRule="evenodd"
                        />
                    </svg>
                    <p>{t('sidebar.playground')}</p>
                </a>
            </article>
        </div>
    );
}

Sidebar.propTypes = {
    onNavigate: PropTypes.func.isRequired,
};

export default Sidebar;
