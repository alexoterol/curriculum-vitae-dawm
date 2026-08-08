import React, { useState } from 'react';
import './Playground.css';
import Separator from '../Separator';
import FolderView from './FolderView';
import ArcadeCard from './ArcadeCard';
import GameScreen from './GameScreen';
import { PLAYGROUND_GAMES } from './games/registry';
import { useLanguage } from '../../contexts/LanguageContext';

const APPS_META = [
    { tags: ['Godot', 'C#'], downloadUrl: '#', sourceUrl: 'https://github.com/' },
    { tags: ['Rust', 'CLI'], downloadUrl: '#', sourceUrl: 'https://github.com/' },
    { tags: ['Electron', 'JS'], downloadUrl: '#' },
];

function Playground() {
    const { t } = useLanguage();
    const [activeGameId, setActiveGameId] = useState(null);

    const apps = t('playground.apps').map((app, index) => ({
        ...app,
        ...APPS_META[index],
    }));

    const games = PLAYGROUND_GAMES.map((game) => ({
        ...game,
        name: t(`playground.games.${game.id}.name`),
        description: t(`playground.games.${game.id}.description`),
    }));

    const activeGame = games.find((game) => game.id === activeGameId) || null;
    const ActiveGameComponent = activeGame?.component;

    return (
        <div className="app-container">
            <main className="about-me-content">
                <div className="playground-container">
                    <h1 className="main-title">{t('playground.title')}</h1>
                    <Separator margin={false} />
                    <p className="playground-intro">{t('playground.intro')}</p>

                    <section className="playground-section playground-section--apps">
                        <div className="playground-section__heading">
                            <span className="pixel-tag pixel-tag--apps">📁 FOLDER.SYS</span>
                            <h2>{t('playground.folderView.title')}</h2>
                            <p>{t('playground.folderView.subtitle')}</p>
                        </div>
                        <FolderView apps={apps} />
                    </section>

                    <div className="playground-divider" role="presentation">
                        <span className="playground-divider__line" />
                        <span className="playground-divider__badge">▸▸ LEVEL 2 ▸▸</span>
                        <span className="playground-divider__line" />
                    </div>

                    <section className="playground-section playground-section--arcade">
                        <div className="playground-section__heading">
                            <span className="pixel-tag pixel-tag--arcade">🕹️ ARCADE.EXE</span>
                            <h2>{t('playground.arcade.title')}</h2>
                            <p>{t('playground.arcade.subtitle')}</p>
                        </div>

                        {ActiveGameComponent ? (
                            <GameScreen
                                title={activeGame.name}
                                backLabel={t('playground.arcade.back')}
                                onBack={() => setActiveGameId(null)}
                            >
                                <ActiveGameComponent />
                            </GameScreen>
                        ) : (
                            <div className="playground-arcade-grid">
                                {games.map((game) => (
                                    <ArcadeCard
                                        key={game.id}
                                        name={game.name}
                                        description={game.description}
                                        tags={game.tags}
                                        emoji={game.emoji}
                                        accent={game.accent}
                                        onPlay={() => setActiveGameId(game.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Playground;
