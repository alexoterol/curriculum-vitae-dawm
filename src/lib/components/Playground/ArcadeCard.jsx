import React from 'react';
import PropTypes from 'prop-types';
import './ArcadeCard.css';
import { useLanguage } from '../../contexts/LanguageContext';

function PlayIcon() {
    return (
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 1l12 7-12 7V1z" />
        </svg>
    );
}

function ArcadeCard({ name, description, tags, emoji, accent, playUrl, onPlay, sourceUrl }) {
    const { t } = useLanguage();

    return (
        <div className="arcade-card" style={{ '--arcade-accent': accent }}>
            <div className="arcade-card__thumb">
                <span aria-hidden="true">{emoji}</span>
            </div>

            <div className="arcade-card__body">
                <h3 className="arcade-card__title">{name}</h3>
                <p className="arcade-card__desc">{description}</p>

                <div className="arcade-card__tags">
                    {tags.map((tag) => (
                        <span key={tag} className="arcade-card__tag">{tag}</span>
                    ))}
                </div>
            </div>

            <div className="arcade-card__actions">
                {onPlay ? (
                    <button
                        type="button"
                        className="arcade-card__button arcade-card__button--primary"
                        onClick={onPlay}
                    >
                        <PlayIcon />
                        {t('playground.arcade.playLive')}
                    </button>
                ) : (
                    <a
                        className="arcade-card__button arcade-card__button--primary"
                        href={playUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <PlayIcon />
                        {t('playground.arcade.playLive')}
                    </a>
                )}
                {sourceUrl && (
                    <a
                        className="arcade-card__button"
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t('playground.arcade.source')}
                    </a>
                )}
            </div>
        </div>
    );
}

ArcadeCard.propTypes = {
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string).isRequired,
    emoji: PropTypes.string.isRequired,
    accent: PropTypes.string.isRequired,
    playUrl: PropTypes.string,
    onPlay: PropTypes.func,
    sourceUrl: PropTypes.string,
};

export default ArcadeCard;
