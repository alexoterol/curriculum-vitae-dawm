import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './FolderView.css';
import Window from '../Music/Window';
import { useLanguage } from '../../contexts/LanguageContext';

function FileIcon() {
    return (
        <svg viewBox="0 0 16 16" shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="14" height="14" fill="currentColor" />
            <rect x="3" y="1" width="8" height="4" fill="var(--color-bg)" />
            <rect x="4" y="2" width="4" height="2" fill="currentColor" />
            <rect x="3" y="9" width="10" height="5" fill="var(--color-bg)" />
            <rect x="5" y="10" width="6" height="3" fill="currentColor" />
        </svg>
    );
}

function DownloadIcon() {
    return (
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 0h2v8.5l2.6-2.6 1.4 1.4-5 5-5-5 1.4-1.4L7 8.5V0zM1 14h14v2H1v-2z" />
        </svg>
    );
}

function FolderView({ apps }) {
    const { t } = useLanguage();
    const [selected, setSelected] = useState(0);
    const active = apps[selected];

    return (
        <Window title={t('playground.folderView.windowTitle')} className="window-container--pixel">
            <div className="folder-view">
                <div className="folder-view__grid" role="listbox" aria-label={t('playground.folderView.title')}>
                    {apps.map((app, index) => (
                        <button
                            key={app.name}
                            type="button"
                            role="option"
                            aria-selected={index === selected}
                            className={`folder-view__file ${index === selected ? 'folder-view__file--active' : ''}`}
                            onClick={() => setSelected(index)}
                        >
                            <span className="folder-view__file-icon" aria-hidden="true">
                                <FileIcon />
                            </span>
                            <span className="folder-view__file-name">{app.name}</span>
                        </button>
                    ))}
                </div>

                {active && (
                    <div className="folder-view__details">
                        <h3 className="folder-view__details-title">{active.name}</h3>
                        <p className="folder-view__details-desc">{active.description}</p>

                        <div className="folder-view__meta">
                            {active.platform && <span>{active.platform}</span>}
                            {active.version && <span>{active.version}</span>}
                            {active.size && <span>{active.size}</span>}
                        </div>

                        <div className="folder-view__tags">
                            {active.tags?.map((tag) => (
                                <span key={tag} className="folder-view__tag">{tag}</span>
                            ))}
                        </div>

                        <div className="folder-view__actions">
                            <a
                                className="folder-view__button folder-view__button--primary"
                                href={active.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <DownloadIcon />
                                {t('playground.folderView.download')}
                            </a>
                            {active.sourceUrl && (
                                <a
                                    className="folder-view__button"
                                    href={active.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {t('playground.folderView.viewSource')}
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Window>
    );
}

FolderView.propTypes = {
    apps: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            description: PropTypes.string.isRequired,
            platform: PropTypes.string,
            version: PropTypes.string,
            size: PropTypes.string,
            tags: PropTypes.arrayOf(PropTypes.string),
            downloadUrl: PropTypes.string.isRequired,
            sourceUrl: PropTypes.string,
        })
    ).isRequired,
};

export default FolderView;
