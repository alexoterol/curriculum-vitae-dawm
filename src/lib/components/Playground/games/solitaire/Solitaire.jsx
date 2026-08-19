import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './Solitaire.css';

// Klondike. Piles hold card objects: { id, rank 1-13, suit, faceUp }.
const SUITS = [
    { id: 's', glyph: '♠', color: 'black' },
    { id: 'h', glyph: '♥', color: 'red' },
    { id: 'd', glyph: '♦', color: 'red' },
    { id: 'c', glyph: '♣', color: 'black' },
];

const SUIT_BY_ID = Object.fromEntries(SUITS.map((suit) => [suit.id, suit]));
const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const TABLEAU_COLUMNS = 7;
const HIGH_SCORE_KEY = 'playground-solitaire-best';

const colorOf = (card) => SUIT_BY_ID[card.suit].color;

function shuffled(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function createDeal() {
    const deck = shuffled(
        SUITS.flatMap((suit) => RANK_LABELS.slice(1).map((_, i) => ({
            id: `${suit.id}${i + 1}`,
            rank: i + 1,
            suit: suit.id,
            faceUp: false,
        }))),
    );

    const tableau = [];
    let cursor = 0;
    for (let column = 0; column < TABLEAU_COLUMNS; column++) {
        const pile = deck.slice(cursor, cursor + column + 1).map((card) => ({ ...card }));
        cursor += column + 1;
        pile[pile.length - 1].faceUp = true;
        tableau.push(pile);
    }

    return {
        stock: deck.slice(cursor).map((card) => ({ ...card })),
        waste: [],
        foundations: { s: [], h: [], d: [], c: [] },
        tableau,
    };
}

const cloneGame = (game) => ({
    stock: [...game.stock],
    waste: [...game.waste],
    foundations: Object.fromEntries(Object.entries(game.foundations).map(([k, pile]) => [k, [...pile]])),
    tableau: game.tableau.map((pile) => pile.map((card) => ({ ...card }))),
});

const top = (pile) => (pile.length ? pile[pile.length - 1] : null);

function canDropOnTableau(card, pile) {
    const target = top(pile);
    if (!target) return card.rank === 13;              // only a King starts an empty column
    return target.faceUp && colorOf(target) !== colorOf(card) && target.rank === card.rank + 1;
}

function canDropOnFoundation(card, foundation) {
    const target = top(foundation);
    return target ? target.rank === card.rank - 1 : card.rank === 1;
}

/** Flips the newly exposed card of every tableau column. */
function flipExposed(game) {
    game.tableau.forEach((pile) => {
        const card = top(pile);
        if (card && !card.faceUp) card.faceUp = true;
    });
    return game;
}

const isWon = (game) => Object.values(game.foundations).every((pile) => pile.length === 13);

function formatTime(totalSeconds) {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function Card({ card, stacked, selected, dimmed, onClick, onDoubleClick, style }) {
    if (!card.faceUp) {
        return (
            <div
                className={`solitaire-card solitaire-card--back ${stacked ? 'solitaire-card--stacked' : ''}`}
                style={style}
                onClick={onClick}
                role="presentation"
            />
        );
    }

    const suit = SUIT_BY_ID[card.suit];
    return (
        <div
            className={[
                'solitaire-card',
                `solitaire-card--${suit.color}`,
                stacked ? 'solitaire-card--stacked' : '',
                selected ? 'solitaire-card--selected' : '',
                dimmed ? 'solitaire-card--dimmed' : '',
            ].filter(Boolean).join(' ')}
            style={style}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            role="presentation"
        >
            <span className="solitaire-card__corner">{RANK_LABELS[card.rank]}{suit.glyph}</span>
            <span className="solitaire-card__pip">{suit.glyph}</span>
        </div>
    );
}

function Solitaire() {
    const [drawCount, setDrawCount] = useState(1);
    const [game, setGame] = useState(createDeal);
    const [past, setPast] = useState([]);
    const [selection, setSelection] = useState(null);
    const [moveCount, setMoveCount] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [autoPlaying, setAutoPlaying] = useState(false);
    const [best, setBest] = useState(() => Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0);

    const won = useMemo(() => isWon(game), [game]);

    const commit = useCallback((next) => {
        const settled = flipExposed(next);
        const moveNumber = moveCount + 1;

        setPast((prev) => [...prev.slice(-119), game]);
        setGame(settled);
        setMoveCount(moveNumber);
        setSelection(null);

        // Record the win here rather than from an effect: fewest moves wins.
        if (isWon(settled)) {
            setAutoPlaying(false);
            const stored = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
            if (stored === 0 || moveNumber < stored) {
                localStorage.setItem(HIGH_SCORE_KEY, String(moveNumber));
                setBest(moveNumber);
            }
        }
    }, [game, moveCount]);

    const newGame = useCallback(() => {
        setGame(createDeal());
        setPast([]);
        setSelection(null);
        setMoveCount(0);
        setSeconds(0);
        setAutoPlaying(false);
    }, []);

    const undo = useCallback(() => {
        setPast((prev) => {
            if (prev.length === 0) return prev;
            setGame(prev[prev.length - 1]);
            setSelection(null);
            return prev.slice(0, -1);
        });
    }, []);

    useEffect(() => {
        if (won || moveCount === 0) return undefined;
        const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(timer);
    }, [won, moveCount]);

    // Every face-up card with an empty stock means the deal can just run itself home.
    const canAutoFinish = !won
        && game.stock.length === 0
        && game.waste.length === 0
        && game.tableau.every((pile) => pile.every((card) => card.faceUp));

    // One card per tick, re-reading the board each time, so the finish animates.
    useEffect(() => {
        if (!autoPlaying) return undefined;

        const timer = setTimeout(() => {
            const column = game.tableau.findIndex((pile) => {
                const card = top(pile);
                return card && canDropOnFoundation(card, game.foundations[card.suit]);
            });
            if (column === -1) {
                setAutoPlaying(false);
                return;
            }
            const next = cloneGame(game);
            const card = next.tableau[column].pop();
            next.foundations[card.suit].push(card);
            commit(next);
        }, 90);

        return () => clearTimeout(timer);
    }, [autoPlaying, game, commit]);

    function drawFromStock() {
        const next = cloneGame(game);
        if (next.stock.length === 0) {
            if (next.waste.length === 0) return;
            next.stock = next.waste.reverse().map((card) => ({ ...card, faceUp: false }));
            next.waste = [];
        } else {
            for (let i = 0; i < drawCount && next.stock.length; i++) {
                next.waste.push({ ...next.stock.pop(), faceUp: true });
            }
        }
        commit(next);
    }

    /** Cards being carried by the current selection, source pile first. */
    function selectedCards(source = selection) {
        if (!source) return [];
        if (source.type === 'waste') return game.waste.slice(-1);
        if (source.type === 'foundation') return game.foundations[source.suit].slice(-1);
        return game.tableau[source.column].slice(source.index);
    }

    function removeSelected(next, source) {
        if (source.type === 'waste') return [next.waste.pop()];
        if (source.type === 'foundation') return [next.foundations[source.suit].pop()];
        return next.tableau[source.column].splice(source.index);
    }

    function moveToTableau(column) {
        const carried = selectedCards();
        if (!carried.length || !canDropOnTableau(carried[0], game.tableau[column])) return false;
        if (selection.type === 'tableau' && selection.column === column) return false;

        const next = cloneGame(game);
        next.tableau[column].push(...removeSelected(next, selection));
        commit(next);
        return true;
    }

    function moveToFoundation(suitId) {
        const carried = selectedCards();
        if (carried.length !== 1 || carried[0].suit !== suitId) return false;
        if (!canDropOnFoundation(carried[0], game.foundations[suitId])) return false;

        const next = cloneGame(game);
        next.foundations[suitId].push(...removeSelected(next, selection));
        commit(next);
        return true;
    }

    /** Double-click shortcut: send a single card straight to its foundation. */
    function sendHome(source) {
        const carried = selectedCards(source);
        if (carried.length !== 1) return;
        const card = carried[0];
        if (!card.faceUp || !canDropOnFoundation(card, game.foundations[card.suit])) return;

        const next = cloneGame(game);
        next.foundations[card.suit].push(...removeSelected(next, source));
        commit(next);
    }

    function isSelectable(source) {
        if (source.type === 'waste') return game.waste.length > 0;
        if (source.type === 'foundation') return game.foundations[source.suit].length > 0;
        const pile = game.tableau[source.column];
        return !!pile[source.index]?.faceUp;
    }

    function handleCardClick(source) {
        if (autoPlaying) return;

        if (selection) {
            if (source.type === 'tableau' && moveToTableau(source.column)) return;
            if (source.type === 'foundation' && moveToFoundation(source.suit)) return;
            // Clicking the held card again puts it back down.
            if (JSON.stringify(source) === JSON.stringify(selection)) {
                setSelection(null);
                return;
            }
        }

        if (isSelectable(source)) setSelection(source);
        else setSelection(null);
    }

    function handleEmptyPile(source) {
        if (autoPlaying || !selection) return;
        if (source.type === 'tableau') moveToTableau(source.column);
        else moveToFoundation(source.suit);
    }

    const isSelected = (source) => {
        if (!selection || selection.type !== source.type) return false;
        if (source.type === 'tableau') {
            return selection.column === source.column && source.index >= selection.index;
        }
        if (source.type === 'foundation') return selection.suit === source.suit;
        return true;
    };

    return (
        <div className="solitaire">
            <div className="solitaire__toolbar">
                <div className="solitaire__group">
                    {[1, 3].map((count) => (
                        <button
                            key={count}
                            type="button"
                            className={`solitaire__btn ${drawCount === count ? 'solitaire__btn--active' : ''}`}
                            onClick={() => { setDrawCount(count); newGame(); }}
                        >
                            DRAW {count}
                        </button>
                    ))}
                </div>
                <div className="solitaire__group">
                    <button type="button" className="solitaire__btn" onClick={undo} disabled={!past.length || autoPlaying}>
                        UNDO
                    </button>
                    <button
                        type="button"
                        className="solitaire__btn"
                        onClick={() => setAutoPlaying(true)}
                        disabled={!canAutoFinish || autoPlaying}
                    >
                        AUTO
                    </button>
                    <button type="button" className="solitaire__btn" onClick={newGame}>NEW</button>
                </div>
            </div>

            <div className="solitaire__hud">
                <span>MOVES {moveCount}</span>
                <span>TIME {formatTime(seconds)}</span>
                <span>BEST {best || '--'}</span>
            </div>

            <div className="solitaire__board">
                <div className="solitaire__top-row">
                    <button
                        type="button"
                        className="solitaire-slot solitaire-slot--stock"
                        onClick={drawFromStock}
                        aria-label="Draw from stock"
                    >
                        {game.stock.length > 0
                            ? <div className="solitaire-card solitaire-card--back" />
                            : <span className="solitaire-slot__recycle">↻</span>}
                        {game.stock.length > 0 && (
                            <span className="solitaire-slot__count">{game.stock.length}</span>
                        )}
                    </button>

                    <div className="solitaire-slot solitaire-slot--waste">
                        {game.waste.slice(-3).map((card, i, visible) => (
                            <Card
                                key={card.id}
                                card={card}
                                style={{ left: `${i * 14}%` }}
                                selected={i === visible.length - 1 && isSelected({ type: 'waste' })}
                                onClick={() => i === visible.length - 1 && handleCardClick({ type: 'waste' })}
                                onDoubleClick={() => i === visible.length - 1 && sendHome({ type: 'waste' })}
                            />
                        ))}
                    </div>

                    <span className="solitaire__spacer" />

                    {SUITS.map((suit) => {
                        const pile = game.foundations[suit.id];
                        const card = top(pile);
                        return (
                            <div
                                key={suit.id}
                                className="solitaire-slot solitaire-slot--foundation"
                                onClick={() => (card
                                    ? handleCardClick({ type: 'foundation', suit: suit.id })
                                    : handleEmptyPile({ type: 'foundation', suit: suit.id }))}
                                role="presentation"
                            >
                                {card ? (
                                    <Card
                                        card={card}
                                        selected={isSelected({ type: 'foundation', suit: suit.id })}
                                    />
                                ) : (
                                    <span className={`solitaire-slot__ghost solitaire-slot__ghost--${suit.color}`}>
                                        {suit.glyph}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="solitaire__tableau">
                    {game.tableau.map((pile, column) => (
                        <div
                            key={column}
                            className="solitaire-column"
                            onClick={() => pile.length === 0 && handleEmptyPile({ type: 'tableau', column })}
                            role="presentation"
                        >
                            {pile.length === 0 && <span className="solitaire-column__empty" />}
                            {pile.map((card, index) => (
                                <Card
                                    key={card.id}
                                    card={card}
                                    stacked={index > 0}
                                    selected={isSelected({ type: 'tableau', column, index })}
                                    onClick={() => handleCardClick({ type: 'tableau', column, index })}
                                    onDoubleClick={() => index === pile.length - 1
                                        && sendHome({ type: 'tableau', column, index })}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                {won && (
                    <div className="solitaire__overlay">
                        <p>YOU CLEARED THE BOARD</p>
                        <p className="solitaire__overlay-score">{moveCount} MOVES - {formatTime(seconds)}</p>
                        <button type="button" className="solitaire__button" onClick={newGame}>DEAL AGAIN</button>
                    </div>
                )}
            </div>

            <p className="solitaire__hint">
                Click a card to pick it up, click a pile to drop it. Double-click sends a card home.
            </p>
        </div>
    );
}

export default Solitaire;
