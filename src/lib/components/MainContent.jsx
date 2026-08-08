import React from 'react';
import PropTypes from 'prop-types';
import './MainContent.css';
import SpaceAesthetic from './SpaceAesthetic';
import Separator from './Separator';
import CharacterContainer from './CharacterContainer';
import CardContainer from './CardContainer';
import { useLanguage } from '../contexts/LanguageContext';

import imgCuadrada from '../assets/images/ref_square.jpg';
import imgRectangular from '../assets/images/ref_rectangle.jpg';

function MainContent({ onNavigate }) {
    const { t } = useLanguage();
    
    const imageNames = [
        'GOW_logo.png',
        'Akira_logo.png',
        'Bloodborne_logo.png',
        'VinlandSaga_logo.png',
        'Berserk_logo.png',
    ];

    return (
            <div className="app-container">
                <main className="main-content">
                    <h1 className="main-title">{t('mainContent.title')}</h1>
                    <Separator margin={true} />
                    <div className="content-grid">
                        <div className="images-showcase">
                            <img src={imgCuadrada} alt="Square" className="img-square" />
                            <img src={imgRectangular} alt="Rectangular" className="img-rect" />
                        </div>

                        <div className="bottom-section">
                            <div className="interaction-area">
                                <CharacterContainer />
                            </div>
                            <div className="currently-into">
                                <p className="section-label">{t('mainContent.currentlyInto')}</p>
                                <SpaceAesthetic imageNames={imageNames} />
                            </div>
                        </div>
                    </div>
                    <div className='slow-separator'>
                        <p className='slow-text'>{t('mainContent.slowText')}</p>
                    </div>
                    <p className="section-label section-label--center">{t('mainContent.explore')}</p>
                    <CardContainer onNavigate={onNavigate} />
                </main>
            </div>
    );
}
MainContent.propTypes = {
    onNavigate: PropTypes.func.isRequired,
};
export default MainContent;
