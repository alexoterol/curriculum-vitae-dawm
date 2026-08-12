import React, { useCallback, useEffect, useRef, useState } from 'react';
import './Game2048.css';

const SIZE = 4;
const HIGH_SCORE_KEY = 'playground-2048-highscore';

const KEY_DIRECTIONS = {
    ArrowUp: 'up',
    w: 'up',
    W: 'up',
    ArrowDown: 'down',
    s: 'down',
    S: 'down',
    ArrowLeft: 'left',
    a: 'left',
    A: 'left',
    ArrowRight: 'right',
    d: 'right',
    D: 'right',
};

function emptyBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function emptyCells(board) {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] === 0) cells.push([r, c]);
        }
    }
    return cells;
}

function spawnTile(board) {
    const cells = emptyCells(board);
    if (cells.length === 0) return board;
    const [r, c] = cells[Math.floor(Math.random() * cells.length)];
    const next = board.map((row) => [...row]);
    next[r][c] = Math.random() < 0.9 ? 2 : 4;
    return next;
}

function initialBoard() {
    return spawnTile(spawnTile(emptyBoard()));
}

// Slides+merges a single row toward the left; returns [newRow, gained, moved]
function slideRow(row) {
    const values = row.filter((v) => v !== 0);
    const merged = [];
    let gained = 0;
    for (let i = 0; i < values.length; i++) {
        if (values[i] === values[i + 1]) {
            const sum = values[i] * 2;
            merged.push(sum);
            gained += sum;
            i++;
        } else {
            merged.push(values[i]);
        }
    }
    while (merged.length < SIZE) merged.push(0);
    const moved = merged.some((v, i) => v !== row[i]);
    return [merged, gained, moved];
}

function rotateLeft(board) {
    return Array.from({ length: SIZE }, (_, r) => Array.from({ length: SIZE }, (_, c) => board[c][SIZE - 1 - r]));
}

function move(board, direction) {
    // Normalize every direction to a left-slide by rotating, then rotate back.
    const rotations = { left: 0, up: 1, right: 2, down: 3 };
    let rotated = board;
    for (let i = 0; i < rotations[direction]; i++) rotated = rotateLeft(rotated);

    let gained = 0;
    let moved = false;
    const slid = rotated.map((row) => {
        const [newRow, rowGained, rowMoved] = slideRow(row);
        gained += rowGained;
        moved = moved || rowMoved;
        return newRow;
    });

    let result = slid;
    for (let i = 0; i < (4 - rotations[direction]) % 4; i++) result = rotateLeft(result);

    return [result, gained, moved];
}

function canMove(board) {
    if (emptyCells(board).length > 0) return true;
    for (const dir of ['left', 'right', 'up', 'down']) {
        const [, , moved] = move(board, dir);
        if (moved) return true;
    }
    return false;
}

function Game2048() {
    const [board, setBoard] = useState(initialBoard);
    const [score, setScore] = useState(0);
    const [status, setStatus] = useState('playing'); // playing | won | over
    const [highScore, setHighScore] = useState(
        () => Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0
    );
    const touchStart = useRef(null);
    const hasWon = useRef(false);

    const restart = useCallback(() => {
        hasWon.current = false;
        setBoard(initialBoard());
        setScore(0);
        setStatus('playing');
    }, []);

    const keepGoing = useCallback(() => setStatus('playing'), []);

    const applyMove = useCallback(
        (direction) => {
            if (status === 'over') return;
            setBoard((prev) => {
                const [moved, gained, didMove] = move(prev, direction);
                if (!didMove) return prev;

                const next = spawnTile(moved);
                if (gained) {
                    setScore((s) => {
                        const newScore = s + gained;
                        setHighScore((prevHigh) => {
                            if (newScore > prevHigh) {
                                localStorage.setItem(HIGH_SCORE_KEY, String(newScore));
                                return newScore;
                            }
                            return prevHigh;
                        });
                        return newScore;
                    });
                }
                if (!hasWon.current && next.some((row) => row.some((v) => v === 2048))) {
                    hasWon.current = true;
                    setStatus('won');
                } else if (!canMove(next)) {
                    setStatus('over');
                }
                return next;
            });
        },
        [status]
    );

    useEffect(() => {
        function handleKey(e) {
            const dir = KEY_DIRECTIONS[e.key];
            if (!dir) return;
            e.preventDefault();
            applyMove(dir);
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [applyMove]);

    function handleTouchStart(e) {
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
    }

    function handleTouchEnd(e) {
        if (!touchStart.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.current.x;
        const dy = t.clientY - touchStart.current.y;
        touchStart.current = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) {
            applyMove(dx > 0 ? 'right' : 'left');
        } else {
            applyMove(dy > 0 ? 'down' : 'up');
        }
    }

    return (
        <div className="game2048">
            <div className="game2048__hud">
                <span>SCORE {score}</span>
                <span>BEST {highScore}</span>
            </div>

            <div
                className="game2048__board"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {board.map((row, r) =>
                    row.map((value, c) => (
                        <div
                            key={`${r},${c}`}
                            className="game2048-cell"
                            data-value={value || undefined}
                        >
                            {value !== 0 && value}
                        </div>
                    ))
                )}

                {status !== 'playing' && (
                    <div className="game2048__overlay">
                        {status === 'won' && <p>YOU MADE 2048!</p>}
                        {status === 'over' && <p>GAME OVER</p>}
                        <p className="game2048__overlay-score">SCORE {score}</p>
                        <button
                            type="button"
                            className="game2048__button"
                            onClick={status === 'won' ? keepGoing : restart}
                        >
                            {status === 'won' ? 'KEEP GOING' : 'RETRY'}
                        </button>
                    </div>
                )}
            </div>

            <div className="game2048__dpad">
                <button type="button" className="game2048-dpad__btn game2048-dpad__btn--up" aria-label="up" onClick={() => applyMove('up')}>▲</button>
                <button type="button" className="game2048-dpad__btn game2048-dpad__btn--left" aria-label="left" onClick={() => applyMove('left')}>◂</button>
                <button type="button" className="game2048-dpad__btn game2048-dpad__btn--right" aria-label="right" onClick={() => applyMove('right')}>▸</button>
                <button type="button" className="game2048-dpad__btn game2048-dpad__btn--down" aria-label="down" onClick={() => applyMove('down')}>▾</button>
            </div>
        </div>
    );
}

export default Game2048;
