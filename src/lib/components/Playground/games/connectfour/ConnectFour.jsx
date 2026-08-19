import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './ConnectFour.css';

const COLUMNS = 7;
const ROWS = 6;
const RED = 'r';   // always the human in CPU games
const YELLOW = 'y';

const LEVELS = [
    // Easy still looks one reply ahead, so it blocks the obvious wins, but it
    // throws a random drop often enough to be beatable.
    { id: 'easy', label: 'EASY', depth: 2, blunder: 0.35 },
    { id: 'normal', label: 'NORMAL', depth: 4, blunder: 0 },
    { id: 'hard', label: 'HARD', depth: 6, blunder: 0 },
];

// Searching the middle first makes alpha-beta cut far more branches.
const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];
const WIN_SCORE = 1000000;

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null));
const other = (player) => (player === RED ? YELLOW : RED);

/** Every straight line of four squares on the board, precomputed once. */
const WINDOWS = (() => {
    const lines = [];
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
            for (const [dr, dc] of directions) {
                const cells = [];
                for (let i = 0; i < 4; i++) {
                    const [nr, nc] = [r + dr * i, c + dc * i];
                    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLUMNS) break;
                    cells.push([nr, nc]);
                }
                if (cells.length === 4) lines.push(cells);
            }
        }
    }
    return lines;
})();

function dropRow(board, column) {
    for (let r = ROWS - 1; r >= 0; r--) {
        if (!board[r][column]) return r;
    }
    return -1;
}

const validColumns = (board) => COLUMN_ORDER.filter((c) => !board[0][c]);

function drop(board, column, player) {
    const row = dropRow(board, column);
    if (row === -1) return null;
    const next = board.map((r) => [...r]);
    next[row][column] = player;
    return next;
}

/** The four cells of the winning line, or null. */
function winningLine(board) {
    for (const cells of WINDOWS) {
        const [first] = cells;
        const player = board[first[0]][first[1]];
        if (player && cells.every(([r, c]) => board[r][c] === player)) return cells;
    }
    return null;
}

const isFull = (board) => board[0].every(Boolean);

function scoreWindow(cells, board, player) {
    let mine = 0;
    let theirs = 0;
    for (const [r, c] of cells) {
        const cell = board[r][c];
        if (cell === player) mine += 1;
        else if (cell) theirs += 1;
    }
    if (mine && theirs) return 0;
    if (mine === 4) return 500;
    if (mine === 3) return 50;
    if (mine === 2) return 10;
    if (theirs === 4) return -500;
    if (theirs === 3) return -80;   // block threats a little harder than we build them
    if (theirs === 2) return -10;
    return 0;
}

function evaluate(board, player) {
    let score = 0;
    for (const cells of WINDOWS) score += scoreWindow(cells, board, player);
    for (let r = 0; r < ROWS; r++) {
        if (board[r][3] === player) score += 6;
        else if (board[r][3]) score -= 6;
    }
    return score;
}

function negamax(board, depth, alpha, beta, player) {
    // A line on the board means the side that just moved — our opponent — won.
    if (winningLine(board)) return -WIN_SCORE - depth;

    const options = validColumns(board);
    if (options.length === 0) return 0;
    if (depth === 0) return evaluate(board, player);

    let best = -Infinity;
    for (const column of options) {
        const score = -negamax(drop(board, column, player), depth - 1, -beta, -alpha, other(player));
        if (score > best) best = score;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
    }
    return best;
}

function chooseColumn(board, player, depth) {
    const options = validColumns(board);
    if (options.length === 0) return null;

    let best = -Infinity;
    let picks = [];
    for (const column of options) {
        const score = -negamax(drop(board, column, player), depth - 1, -Infinity, Infinity, other(player));
        if (score > best) {
            best = score;
            picks = [column];
        } else if (score === best) {
            picks.push(column);
        }
    }
    return picks[Math.floor(Math.random() * picks.length)];
}

function ConnectFour() {
    const [mode, setMode] = useState('cpu');
    const [level, setLevel] = useState('normal');
    const [board, setBoard] = useState(emptyBoard);
    const [turn, setTurn] = useState(RED);
    const [scores, setScores] = useState({ r: 0, y: 0, draw: 0 });

    const line = useMemo(() => winningLine(board), [board]);
    const winner = line ? board[line[0][0]][line[0][1]] : null;
    const draw = !winner && isFull(board);
    const over = !!winner || draw;
    const cpuTurn = mode === 'cpu' && turn === YELLOW;

    const winningCells = useMemo(
        () => new Set((line || []).map(([r, c]) => `${r},${c}`)),
        [line],
    );

    const play = useCallback((column) => {
        if (over) return;
        const next = drop(board, column, turn);
        if (!next) return;
        setBoard(next);
        setTurn(other(turn));

        // Tally the result here rather than from an effect, so a replayed
        // render can never score the same game twice.
        const result = winningLine(next) ? turn : isFull(next) ? 'draw' : null;
        if (result) setScores((prev) => ({ ...prev, [result]: prev[result] + 1 }));
    }, [board, turn, over]);

    const reset = useCallback(() => {
        setBoard(emptyBoard());
        setTurn(RED);
    }, []);

    useEffect(() => {
        if (!cpuTurn || over) return undefined;

        let cancelled = false;
        const { depth, blunder } = LEVELS.find((l) => l.id === level) || LEVELS[1];

        const timer = setTimeout(() => {
            if (cancelled) return;
            const options = validColumns(board);
            const column = blunder && Math.random() < blunder
                ? options[Math.floor(Math.random() * options.length)]
                : chooseColumn(board, YELLOW, depth);
            if (column !== null && column !== undefined) play(column);
        }, 260);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [cpuTurn, over, board, level, play]);

    const thinking = cpuTurn && !over;
    const canDrop = !over && !cpuTurn;

    let statusLine;
    if (winner) {
        const name = mode === 'cpu'
            ? (winner === RED ? 'YOU WIN' : 'CPU WINS')
            : `${winner === RED ? 'RED' : 'YELLOW'} WINS`;
        statusLine = name;
    } else if (draw) {
        statusLine = 'BOARD FULL - DRAW';
    } else if (thinking) {
        statusLine = 'CPU IS THINKING...';
    } else if (mode === 'cpu') {
        statusLine = turn === RED ? 'YOUR TURN' : 'CPU TURN';
    } else {
        statusLine = `${turn === RED ? 'RED' : 'YELLOW'} TO DROP`;
    }

    return (
        <div className="connect4">
            <div className="connect4__toolbar">
                <div className="connect4__group">
                    <button
                        type="button"
                        className={`connect4__btn ${mode === 'cpu' ? 'connect4__btn--active' : ''}`}
                        onClick={() => { setMode('cpu'); reset(); }}
                    >
                        VS CPU
                    </button>
                    <button
                        type="button"
                        className={`connect4__btn ${mode === 'duo' ? 'connect4__btn--active' : ''}`}
                        onClick={() => { setMode('duo'); reset(); }}
                    >
                        2 PLAYERS
                    </button>
                </div>

                {mode === 'cpu' && (
                    <div className="connect4__group">
                        {LEVELS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                className={`connect4__btn ${level === option.id ? 'connect4__btn--active' : ''}`}
                                onClick={() => setLevel(option.id)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}

                <button type="button" className="connect4__btn" onClick={reset}>NEW</button>
            </div>

            <div className="connect4__hud">
                <span className="connect4__score connect4__score--red">RED {scores.r}</span>
                <span>DRAW {scores.draw}</span>
                <span className="connect4__score connect4__score--yellow">YELLOW {scores.y}</span>
            </div>

            <p className={`connect4__status ${over ? 'connect4__status--over' : ''}`}>{statusLine}</p>

            <div className="connect4__board">
                {board.map((row, r) => row.map((cell, c) => (
                    <button
                        key={`${r},${c}`}
                        type="button"
                        className={[
                            'connect4-cell',
                            cell ? `connect4-cell--${cell}` : '',
                            winningCells.has(`${r},${c}`) ? 'connect4-cell--win' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => canDrop && play(c)}
                        disabled={!canDrop || !!board[0][c]}
                        aria-label={`Column ${c + 1}, row ${ROWS - r}`}
                    >
                        <span className="connect4-cell__disc" />
                    </button>
                )))}

                {over && (
                    <div className="connect4__overlay">
                        <p>{statusLine}</p>
                        <button type="button" className="connect4__button" onClick={reset}>PLAY AGAIN</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ConnectFour;
