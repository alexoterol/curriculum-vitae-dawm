// Pure game engine, shared by solo play and the multiplayer host. Guests
// never run this logic — the host is the single source of truth and ships
// guests a rendered `view`, which is what keeps the two sides from ever
// disagreeing about the board.

export const DIFFICULTIES = [
    { id: 'easy', rows: 9, cols: 9, mines: 10 },
    { id: 'medium', rows: 12, cols: 12, mines: 20 },
    { id: 'hard', rows: 14, cols: 14, mines: 32 },
    { id: 'demon', rows: 20, cols: 25, mines: 99 },
];

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export function generateRoomCode() {
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
    return code;
}

function neighborsOf(r, c, rows, cols) {
    const result = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.push([nr, nc]);
        }
    }
    return result;
}

function placeMines(rows, cols, mineCount, safeR, safeC) {
    const forbidden = new Set(
        [[safeR, safeC], ...neighborsOf(safeR, safeC, rows, cols)].map(([r, c]) => `${r},${c}`)
    );
    const cells = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const key = `${r},${c}`;
            if (!forbidden.has(key)) cells.push(key);
        }
    }
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return new Set(cells.slice(0, mineCount));
}

function countAdjacentMines(mineSet, rows, cols, r, c) {
    return neighborsOf(r, c, rows, cols).filter(([nr, nc]) => mineSet.has(`${nr},${nc}`)).length;
}

function floodReveal(mineSet, rows, cols, revealedSet, flaggedSet, startR, startC) {
    const revealed = new Set(revealedSet);
    const stack = [[startR, startC]];
    while (stack.length) {
        const [r, c] = stack.pop();
        const key = `${r},${c}`;
        if (revealed.has(key) || flaggedSet.has(key)) continue;
        revealed.add(key);
        if (mineSet.has(key)) continue;
        if (countAdjacentMines(mineSet, rows, cols, r, c) === 0) {
            neighborsOf(r, c, rows, cols).forEach(([nr, nc]) => {
                const nkey = `${nr},${nc}`;
                if (!revealed.has(nkey) && !flaggedSet.has(nkey)) stack.push([nr, nc]);
            });
        }
    }
    return revealed;
}

export function createGameState(difficultyId) {
    const difficulty = DIFFICULTIES.find((d) => d.id === difficultyId) || DIFFICULTIES[0];
    return {
        difficultyId: difficulty.id,
        rows: difficulty.rows,
        cols: difficulty.cols,
        mineCount: difficulty.mines,
        mineSet: null, // placed lazily on first reveal, so it can avoid that cell
        revealed: new Set(),
        flagged: new Set(),
        status: 'ready', // ready | playing | won | lost
        hitMine: null,
        startedAt: null,
    };
}

export function reveal(state, r, c) {
    if (state.status === 'won' || state.status === 'lost') return state;
    const key = `${r},${c}`;
    if (state.flagged.has(key) || state.revealed.has(key)) return state;

    const mineSet = state.mineSet || placeMines(state.rows, state.cols, state.mineCount, r, c);
    const startedAt = state.startedAt || Date.now();

    if (mineSet.has(key)) {
        return {
            ...state,
            mineSet,
            startedAt,
            revealed: new Set([...state.revealed, key]),
            status: 'lost',
            hitMine: key,
        };
    }

    const revealed = floodReveal(mineSet, state.rows, state.cols, state.revealed, state.flagged, r, c);
    const totalSafe = state.rows * state.cols - mineSet.size;
    const won = revealed.size === totalSafe;
    return { ...state, mineSet, startedAt, revealed, status: won ? 'won' : 'playing' };
}

// Clicking a revealed number whose flagged-neighbor count matches its own
// number opens the rest of its unflagged neighbors — classic "chording".
// A wrongly-placed flag just means one of those neighbors turns out to be
// a mine, which reveal() already turns into a normal loss.
export function chordReveal(state, r, c) {
    if (state.status === 'won' || state.status === 'lost') return state;
    const key = `${r},${c}`;
    if (!state.mineSet || !state.revealed.has(key)) return state;

    const count = countAdjacentMines(state.mineSet, state.rows, state.cols, r, c);
    if (count === 0) return state;

    const neighbors = neighborsOf(r, c, state.rows, state.cols);
    const flaggedCount = neighbors.filter(([nr, nc]) => state.flagged.has(`${nr},${nc}`)).length;
    if (flaggedCount !== count) return state;

    let next = state;
    for (const [nr, nc] of neighbors) {
        const nkey = `${nr},${nc}`;
        if (next.flagged.has(nkey) || next.revealed.has(nkey)) continue;
        next = reveal(next, nr, nc);
        if (next.status === 'lost') break;
    }
    return next;
}

export function toggleFlag(state, r, c) {
    if (state.status === 'won' || state.status === 'lost') return state;
    const key = `${r},${c}`;
    if (state.revealed.has(key)) return state;
    const flagged = new Set(state.flagged);
    flagged.has(key) ? flagged.delete(key) : flagged.add(key);
    return { ...state, flagged };
}

// Renders state into a plain, JSON-safe grid — the same shape solo play
// reads locally and the host sends to guests over the data channel.
export function buildView(state) {
    const { rows, cols, mineSet, revealed, flagged, status, mineCount, startedAt } = state;
    const showMines = status === 'lost' || status === 'won';
    const grid = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            const key = `${r},${c}`;
            const isMine = mineSet ? mineSet.has(key) : false;
            if (flagged.has(key) && !revealed.has(key)) {
                row.push(showMines && isMine ? 'flag-mine' : 'flag');
            } else if (revealed.has(key)) {
                row.push(isMine ? 'mine-hit' : countAdjacentMines(mineSet, rows, cols, r, c));
            } else if (showMines && isMine) {
                row.push('mine');
            } else {
                row.push('hidden');
            }
        }
        grid.push(row);
    }
    return {
        grid,
        rows,
        cols,
        status,
        mineCount,
        startedAt,
        flaggedCount: flagged.size,
    };
}
