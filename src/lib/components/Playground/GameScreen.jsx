import React from 'react';
import PropTypes from 'prop-types';
import './GameScreen.css';
import Window from '../Music/Window';

function GameScreen({ title, backLabel, onBack, children }) {
    return (
        <div className="game-screen">
            <button type="button" className="game-screen__back" onClick={onBack}>
                {backLabel}
            </button>
            <Window title={title} className="window-container--pixel">
                <div className="game-screen__stage">{children}</div>
            </Window>
        </div>
    );
}

GameScreen.propTypes = {
    title: PropTypes.string.isRequired,
    backLabel: PropTypes.string.isRequired,
    onBack: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
};

export default GameScreen;
