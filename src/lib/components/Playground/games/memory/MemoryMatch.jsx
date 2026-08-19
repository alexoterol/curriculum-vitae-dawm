import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './MemoryMatch.css';

const DIFFICULTIES = [
    { id: 'easy', label: 'EASY', columns: 4, pairs: 6 },
    { id: 'normal', label: 'NORMAL', columns: 4, pairs: 8 },
    { id: 'hard', label: 'HARD', columns: 6, pairs: 12 },
];

// Desk clutter, roughly in the spirit of the rest of the site.
const SYMBOLS = ['☕', '🎧', '💾', '📼', '🕹️', '📚', '🌙', '🍄', '✿', '★', '🎲', '🪐'];

const BEST_KEY = (difficulty) => `playground-memory-best-${difficulty}`;
const FLIP_BACK_MS = 750;

function shuffled(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildDeck(pairs) {
    const chosen = shuffled(SYMBOLS).slice(0, pairs);
    return shuffled(
        chosen.flatMap((symbol, index) => [
            { id: `${index}a`, symbol },
            { id: `${index}b`, symbol },
        ]),
    );
}

function formatTime(totalSeconds) {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function MemoryMatch() {
    const [difficultyId, setDifficultyId] = useState('normal');
    const difficulty = DIFFICULTIES.find((d) => d.id === difficultyId) || DIFFICULTIES[1];

    const [deck, setDeck] = useState(() => buildDeck(difficulty.pairs));
    const [flipped, setFlipped] = useState([]);   // ids of the at most two open cards
    const [matched, setMatched] = useState([]);   // ids that stay open
    const [moves, setMoves] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY('normal'))) || 0);

    const won = matched.length === deck.length && deck.length > 0;
    const locked = flipped.length === 2;

    const matchedSet = useMemo(() => new Set(matched), [matched]);
    const flippedSet = useMemo(() => new Set(flipped), [flipped]);

    const startGame = useCallback((id) => {
        const next = DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[1];
        setDifficultyId(next.id);
        setDeck(buildDeck(next.pairs));
        setFlipped([]);
        setMatched([]);
        setMoves(0);
        setSeconds(0);
        setBest(Number(localStorage.getItem(BEST_KEY(next.id))) || 0);
    }, []);

    useEffect(() => {
        if (won || moves === 0) return undefined;
        const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(timer);
    }, [won, moves]);

    // Two cards left face up never match — give the player a beat to memorise
    // them, then turn them back over.
    useEffect(() => {
        if (flipped.length !== 2) return undefined;
        const timer = setTimeout(() => setFlipped([]), FLIP_BACK_MS);
        return () => clearTimeout(timer);
    }, [flipped]);

    function recordBest(moveNumber) {
        const stored = Number(localStorage.getItem(BEST_KEY(difficultyId))) || 0;
        if (stored !== 0 && stored <= moveNumber) return;
        localStorage.setItem(BEST_KEY(difficultyId), String(moveNumber));
        setBest(moveNumber);
    }

    function flip(card) {
        if (locked || won) return;
        if (flippedSet.has(card.id) || matchedSet.has(card.id)) return;

        if (flipped.length === 0) {
            setFlipped([card.id]);
            return;
        }

        const first = deck.find((entry) => entry.id === flipped[0]);
        const moveNumber = moves + 1;
        setMoves(moveNumber);

        if (first.symbol === card.symbol) {
            setMatched((prev) => [...prev, first.id, card.id]);
            setFlipped([]);
            if (matched.length + 2 === deck.length) recordBest(moveNumber);
        } else {
            setFlipped([first.id, card.id]);
        }
    }

    return (
        <div className="memory">
            <div className="memory__toolbar">
                <div className="memory__group">
                    {DIFFICULTIES.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={`memory__btn ${difficultyId === option.id ? 'memory__btn--active' : ''}`}
                            onClick={() => startGame(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <button type="button" className="memory__btn" onClick={() => startGame(difficultyId)}>
                    NEW
                </button>
            </div>

            <div className="memory__hud">
                <span>MOVES {moves}</span>
                <span>PAIRS {matched.length / 2}/{difficulty.pairs}</span>
                <span>TIME {formatTime(seconds)}</span>
                <span>BEST {best || '--'}</span>
            </div>

            <div
                className="memory__board"
                style={{ '--memory-columns': difficulty.columns }}
            >
                {deck.map((card) => {
                    const isOpen = flippedSet.has(card.id) || matchedSet.has(card.id);
                    return (
                        <button
                            key={card.id}
                            type="button"
                            className={[
                                'memory-card',
                                isOpen ? 'memory-card--open' : '',
                                matchedSet.has(card.id) ? 'memory-card--matched' : '',
                            ].filter(Boolean).join(' ')}
                            onClick={() => flip(card)}
                            aria-label={isOpen ? card.symbol : 'Hidden card'}
                        >
                            <span className="memory-card__inner">
                                <span className="memory-card__face memory-card__face--back">?</span>
                                <span className="memory-card__face memory-card__face--front">{card.symbol}</span>
                            </span>
                        </button>
                    );
                })}

                {won && (
                    <div className="memory__overlay">
                        <p>ALL PAIRS FOUND</p>
                        <p className="memory__overlay-score">{moves} MOVES - {formatTime(seconds)}</p>
                        <button
                            type="button"
                            className="memory__button"
                            onClick={() => startGame(difficultyId)}
                        >
                            PLAY AGAIN
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MemoryMatch;
