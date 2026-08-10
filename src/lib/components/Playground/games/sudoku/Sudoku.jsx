import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Sudoku.css';

// One verified-valid solved grid. Every new game is derived from it via
// randomized, validity-preserving symmetries (row/column/band/stack
// permutations, an optional transpose, and digit relabeling), so each
// play — including every page load — gets a fresh, still-valid puzzle
// instead of one of a few fixed boards.
const BASE_SOLUTION = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [4, 5, 6, 7, 8, 9, 1, 2, 3],
    [7, 8, 9, 1, 2, 3, 4, 5, 6],
    [2, 3, 4, 5, 6, 7, 8, 9, 1],
    [5, 6, 7, 8, 9, 1, 2, 3, 4],
    [8, 9, 1, 2, 3, 4, 5, 6, 7],
    [3, 4, 5, 6, 7, 8, 9, 1, 2],
    [6, 7, 8, 9, 1, 2, 3, 4, 5],
    [9, 1, 2, 3, 4, 5, 6, 7, 8],
];

const DIFFICULTIES = [
    { id: 'easy', clueRange: [42, 48] },
    { id: 'medium', clueRange: [32, 38] },
    { id: 'hard', clueRange: [24, 30] },
];

function shuffle(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function randomizeSolution(base) {
    let grid = base.map((row) => [...row]);

    // shuffle the 3 rows within each band, then shuffle the band order itself
    const bandOrder = shuffle([0, 1, 2]);
    const rowsPerBand = [shuffle([0, 1, 2]), shuffle([0, 1, 2]), shuffle([0, 1, 2])];
    grid = bandOrder.flatMap((band) => rowsPerBand[band].map((r) => grid[band * 3 + r]));

    // same for columns within each stack, then the stack order
    const stackOrder = shuffle([0, 1, 2]);
    const colsPerStack = [shuffle([0, 1, 2]), shuffle([0, 1, 2]), shuffle([0, 1, 2])];
    const colOrder = stackOrder.flatMap((stack) => colsPerStack[stack].map((c) => stack * 3 + c));
    grid = grid.map((row) => colOrder.map((c) => row[c]));

    if (Math.random() < 0.5) {
        grid = grid[0].map((_, c) => grid.map((row) => row[c]));
    }

    const digitMap = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    grid = grid.map((row) => row.map((v) => digitMap[v - 1]));

    return grid;
}

function buildGivenBoard(solution, clueCount) {
    const cells = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) cells.push([r, c]);
    }
    const clueSet = new Set(shuffle(cells).slice(0, clueCount).map(([r, c]) => `${r},${c}`));
    return solution.map((row, r) => row.map((val, c) => (clueSet.has(`${r},${c}`) ? val : 0)));
}

function generateGame(difficultyId) {
    const difficulty =
        DIFFICULTIES.find((d) => d.id === difficultyId) ||
        DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];
    const solution = randomizeSolution(BASE_SOLUTION);
    const [min, max] = difficulty.clueRange;
    const clueCount = min + Math.floor(Math.random() * (max - min + 1));
    return {
        difficultyId: difficulty.id,
        givenBoard: buildGivenBoard(solution, clueCount),
    };
}

function getConflicts(board) {
    const conflicts = new Set();
    const flagDuplicates = (coords) => {
        const seen = new Map();
        coords.forEach(([r, c]) => {
            const val = board[r][c];
            if (!val) return;
            const key = `${r},${c}`;
            if (seen.has(val)) {
                conflicts.add(seen.get(val));
                conflicts.add(key);
            } else {
                seen.set(val, key);
            }
        });
    };

    for (let r = 0; r < 9; r++) {
        flagDuplicates(Array.from({ length: 9 }, (_, c) => [r, c]));
    }
    for (let c = 0; c < 9; c++) {
        flagDuplicates(Array.from({ length: 9 }, (_, r) => [r, c]));
    }
    for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
            const box = [];
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) box.push([br * 3 + r, bc * 3 + c]);
            }
            flagDuplicates(box);
        }
    }
    return conflicts;
}

function cloneBoard(board) {
    return board.map((row) => [...row]);
}

function Sudoku() {
    const [game, setGame] = useState(() => generateGame());
    const [board, setBoard] = useState(() => cloneBoard(game.givenBoard));
    const [notes, setNotes] = useState({});
    const [notesMode, setNotesMode] = useState(false);
    const [selected, setSelected] = useState(null);
    const cellRefs = useRef({});

    // keeps DOM focus in sync with `selected` so a digit typed right after an
    // arrow-key move lands on the newly selected cell, not the one focus never left
    useEffect(() => {
        if (selected) cellRefs.current[`${selected.r},${selected.c}`]?.focus();
    }, [selected]);

    const startNewGame = (difficultyId) => {
        const nextGame = generateGame(difficultyId);
        setGame(nextGame);
        setBoard(cloneBoard(nextGame.givenBoard));
        setNotes({});
        setSelected(null);
    };

    const conflicts = useMemo(() => getConflicts(board), [board]);
    const isComplete = board.every((row) => row.every((v) => v !== 0));
    const isSolved = isComplete && conflicts.size === 0;

    const clearNotes = (r, c) => {
        setNotes((prev) => {
            const key = `${r},${c}`;
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const setCellValue = (r, c, value) => {
        if (game.givenBoard[r][c] !== 0) return;
        setBoard((prev) => {
            const next = cloneBoard(prev);
            next[r][c] = value;
            return next;
        });
        clearNotes(r, c);
    };

    const toggleNote = (r, c, value) => {
        if (game.givenBoard[r][c] !== 0 || board[r][c] !== 0) return;
        setNotes((prev) => {
            const key = `${r},${c}`;
            const current = new Set(prev[key] || []);
            current.has(value) ? current.delete(value) : current.add(value);
            const next = { ...prev };
            if (current.size) next[key] = Array.from(current).sort();
            else delete next[key];
            return next;
        });
    };

    const handleKeyDown = (e, r, c) => {
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            notesMode ? toggleNote(r, c, Number(e.key)) : setCellValue(r, c, Number(e.key));
        } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
            e.preventDefault();
            setCellValue(r, c, 0);
        } else if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            setNotesMode((prev) => !prev);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelected({ r: Math.max(0, r - 1), c });
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelected({ r: Math.min(8, r + 1), c });
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setSelected({ r, c: Math.max(0, c - 1) });
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            setSelected({ r, c: Math.min(8, c + 1) });
        }
    };

    return (
        <div className="sudoku-game">
            <div className="sudoku-game__hud">
                <div className="sudoku-game__difficulty">
                    {DIFFICULTIES.map((d) => (
                        <button
                            key={d.id}
                            type="button"
                            className={`sudoku-game__diff-btn ${
                                d.id === game.difficultyId ? 'sudoku-game__diff-btn--active' : ''
                            }`}
                            onClick={() => startNewGame(d.id)}
                        >
                            {d.id.toUpperCase()}
                        </button>
                    ))}
                </div>
                <button type="button" className="sudoku-game__new" onClick={() => startNewGame()}>
                    🎲 NEW
                </button>
            </div>

            <div className="sudoku-game__board">
                {board.map((row, r) =>
                    row.map((val, c) => {
                        const key = `${r},${c}`;
                        const isGiven = game.givenBoard[r][c] !== 0;
                        const isSelected = selected && selected.r === r && selected.c === c;
                        const hasConflict = conflicts.has(key);
                        const cellNotes = notes[key];
                        return (
                            <button
                                key={key}
                                ref={(el) => { cellRefs.current[key] = el; }}
                                type="button"
                                className={[
                                    'sudoku-cell',
                                    isGiven ? 'sudoku-cell--given' : '',
                                    isSelected ? 'sudoku-cell--selected' : '',
                                    hasConflict ? 'sudoku-cell--conflict' : '',
                                    c % 3 === 0 ? 'sudoku-cell--border-left' : '',
                                    r % 3 === 0 ? 'sudoku-cell--border-top' : '',
                                ].filter(Boolean).join(' ')}
                                onClick={() => setSelected({ r, c })}
                                onKeyDown={(e) => handleKeyDown(e, r, c)}
                            >
                                {val !== 0 ? (
                                    val
                                ) : cellNotes ? (
                                    <span className="sudoku-cell__notes">
                                        {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                                            <span key={n} className="sudoku-cell__note">
                                                {cellNotes.includes(n) ? n : ''}
                                            </span>
                                        ))}
                                    </span>
                                ) : (
                                    ''
                                )}
                            </button>
                        );
                    })
                )}
            </div>

            <div className="sudoku-game__numpad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <button
                        key={n}
                        type="button"
                        className="sudoku-numpad__btn"
                        disabled={!selected}
                        onClick={() =>
                            selected &&
                            (notesMode
                                ? toggleNote(selected.r, selected.c, n)
                                : setCellValue(selected.r, selected.c, n))
                        }
                    >
                        {n}
                    </button>
                ))}
                <button
                    type="button"
                    className="sudoku-numpad__btn sudoku-numpad__btn--clear"
                    disabled={!selected}
                    onClick={() => selected && setCellValue(selected.r, selected.c, 0)}
                >
                    ✕
                </button>
                <button
                    type="button"
                    className={`sudoku-numpad__btn sudoku-numpad__btn--notes ${
                        notesMode ? 'sudoku-numpad__btn--active' : ''
                    }`}
                    onClick={() => setNotesMode((prev) => !prev)}
                    title="Toggle notes (N)"
                >
                    ✎
                </button>
            </div>

            {isSolved && (
                <div className="sudoku-game__win">
                    <p>▸ SOLVED! ◂</p>
                </div>
            )}
        </div>
    );
}

export default Sudoku;
