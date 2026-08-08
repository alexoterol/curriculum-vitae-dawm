import React, { useMemo, useState } from 'react';
import './Sudoku.css';

const EASY_GRID = [
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

const MEDIUM_GRID = [
    [1, 4, 7, 2, 5, 8, 3, 6, 9],
    [2, 5, 8, 3, 6, 9, 4, 7, 1],
    [3, 6, 9, 4, 7, 1, 5, 8, 2],
    [4, 7, 1, 5, 8, 2, 6, 9, 3],
    [5, 8, 2, 6, 9, 3, 7, 1, 4],
    [6, 9, 3, 7, 1, 4, 8, 2, 5],
    [7, 1, 4, 8, 2, 5, 9, 3, 6],
    [8, 2, 5, 9, 3, 6, 1, 4, 7],
    [9, 3, 6, 1, 4, 7, 2, 5, 8],
];

const HARD_GRID = [
    [2, 3, 4, 5, 6, 7, 8, 9, 1],
    [5, 6, 7, 8, 9, 1, 2, 3, 4],
    [8, 9, 1, 2, 3, 4, 5, 6, 7],
    [3, 4, 5, 6, 7, 8, 9, 1, 2],
    [6, 7, 8, 9, 1, 2, 3, 4, 5],
    [9, 1, 2, 3, 4, 5, 6, 7, 8],
    [4, 5, 6, 7, 8, 9, 1, 2, 3],
    [7, 8, 9, 1, 2, 3, 4, 5, 6],
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
];

const PUZZLES = [
    { id: 'easy', solution: EASY_GRID, seed: 7, clues: 42 },
    { id: 'medium', solution: MEDIUM_GRID, seed: 21, clues: 34 },
    { id: 'hard', solution: HARD_GRID, seed: 99, clues: 27 },
];

function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function buildGivenBoard(solution, seed, clueCount) {
    const cells = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) cells.push([r, c]);
    }
    const rand = seededRandom(seed);
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const clueSet = new Set(cells.slice(0, clueCount).map(([r, c]) => `${r},${c}`));
    return solution.map((row, r) => row.map((val, c) => (clueSet.has(`${r},${c}`) ? val : 0)));
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
    const [puzzleIndex, setPuzzleIndex] = useState(0);
    const puzzle = PUZZLES[puzzleIndex];
    const givenBoard = useMemo(
        () => buildGivenBoard(puzzle.solution, puzzle.seed, puzzle.clues),
        [puzzle]
    );
    const [board, setBoard] = useState(() => cloneBoard(givenBoard));
    const [selected, setSelected] = useState(null);

    const changePuzzle = (index) => {
        const nextPuzzle = PUZZLES[index];
        const nextGiven = buildGivenBoard(nextPuzzle.solution, nextPuzzle.seed, nextPuzzle.clues);
        setPuzzleIndex(index);
        setBoard(cloneBoard(nextGiven));
        setSelected(null);
    };

    const resetBoard = () => {
        setBoard(cloneBoard(givenBoard));
        setSelected(null);
    };

    const conflicts = useMemo(() => getConflicts(board), [board]);
    const isComplete = board.every((row) => row.every((v) => v !== 0));
    const isSolved = isComplete && conflicts.size === 0;

    const setCellValue = (r, c, value) => {
        if (givenBoard[r][c] !== 0) return;
        setBoard((prev) => {
            const next = cloneBoard(prev);
            next[r][c] = value;
            return next;
        });
    };

    const handleKeyDown = (e, r, c) => {
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            setCellValue(r, c, Number(e.key));
        } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
            e.preventDefault();
            setCellValue(r, c, 0);
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
                    {PUZZLES.map((p, index) => (
                        <button
                            key={p.id}
                            type="button"
                            className={`sudoku-game__diff-btn ${
                                index === puzzleIndex ? 'sudoku-game__diff-btn--active' : ''
                            }`}
                            onClick={() => changePuzzle(index)}
                        >
                            {p.id.toUpperCase()}
                        </button>
                    ))}
                </div>
                <button type="button" className="sudoku-game__reset" onClick={resetBoard}>
                    RESET
                </button>
            </div>

            <div className="sudoku-game__board">
                {board.map((row, r) =>
                    row.map((val, c) => {
                        const key = `${r}-${c}`;
                        const isGiven = givenBoard[r][c] !== 0;
                        const isSelected = selected && selected.r === r && selected.c === c;
                        const hasConflict = conflicts.has(`${r},${c}`);
                        return (
                            <button
                                key={key}
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
                                {val !== 0 ? val : ''}
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
                        onClick={() => selected && setCellValue(selected.r, selected.c, n)}
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
