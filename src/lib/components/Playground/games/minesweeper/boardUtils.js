// Pure game engine, shared by solo play and the multiplayer host. Guests
// never run this logic — the host is the single source of truth and ships
// guests a rendered `view`, which is what keeps the two sides from ever
// disagreeing about the board.

export const DIFFICULTIES = [
    { id: 'easy', size: 9, mines: 10 },
    { id: 'medium', size: 12, mines: 20 },
    { id: 'hard', size: 14, mines: 32 },
];

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export function generateRoomCode() {
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
    return code;
}

function neighborsOf(r, c, size) {
    const result = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) result.push([nr, nc]);
        }
    }
    return result;
}

function placeMines(size, mineCount, safeR, safeC) {
    const forbidden = new Set(
        [[safeR, safeC], ...neighborsOf(safeR, safeC, size)].map(([r, c]) => `${r},${c}`)
    );
    const cells = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
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

function countAdjacentMines(mineSet, size, r, c) {
    return neighborsOf(r, c, size).filter(([nr, nc]) => mineSet.has(`${nr},${nc}`)).length;
}

function floodReveal(mineSet, size, revealedSet, flaggedSet, startR, startC) {
    const revealed = new Set(revealedSet);
    const stack = [[startR, startC]];
    while (stack.length) {
        const [r, c] = stack.pop();
        const key = `${r},${c}`;
        if (revealed.has(key) || flaggedSet.has(key)) continue;
        revealed.add(key);
        if (mineSet.has(key)) continue;
        if (countAdjacentMines(mineSet, size, r, c) === 0) {
            neighborsOf(r, c, size).forEach(([nr, nc]) => {
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
        size: difficulty.size,
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

    const mineSet = state.mineSet || placeMines(state.size, state.mineCount, r, c);
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

    const revealed = floodReveal(mineSet, state.size, state.revealed, state.flagged, r, c);
    const totalSafe = state.size * state.size - mineSet.size;
    const won = revealed.size === totalSafe;
    return { ...state, mineSet, startedAt, revealed, status: won ? 'won' : 'playing' };
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
    const { size, mineSet, revealed, flagged, status, mineCount, startedAt } = state;
    const showMines = status === 'lost' || status === 'won';
    const grid = [];
    for (let r = 0; r < size; r++) {
        const row = [];
        for (let c = 0; c < size; c++) {
            const key = `${r},${c}`;
            const isMine = mineSet ? mineSet.has(key) : false;
            if (flagged.has(key) && !revealed.has(key)) {
                row.push(showMines && isMine ? 'flag-mine' : 'flag');
            } else if (revealed.has(key)) {
                row.push(isMine ? 'mine-hit' : countAdjacentMines(mineSet, size, r, c));
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
        size,
        status,
        mineCount,
        startedAt,
        flaggedCount: flagged.size,
    };
}
