// Self-contained chess rules + a small alpha-beta engine.
// Board is an 8x8 array of row-major squares where row 0 is rank 8 and row 7
// is rank 1, so the array reads exactly like a board seen from White's side.
// A piece is a two-character string: colour ('w' | 'b') + type ('p n b r q k').

export const WHITE = 'w';
export const BLACK = 'b';

const START_ROWS = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

const KNIGHT_STEPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

export const colorOf = (piece) => (piece ? piece[0] : null);
export const typeOf = (piece) => (piece ? piece[1] : null);
export const opponent = (color) => (color === WHITE ? BLACK : WHITE);

export function squareName([r, c]) {
    return `${'abcdefgh'[c]}${8 - r}`;
}

export function initialState() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    START_ROWS.forEach((type, c) => {
        board[0][c] = `b${type}`;
        board[7][c] = `w${type}`;
    });
    for (let c = 0; c < 8; c++) {
        board[1][c] = 'bp';
        board[6][c] = 'wp';
    }
    return {
        board,
        turn: WHITE,
        castling: { wk: true, wq: true, bk: true, bq: true },
        ep: null,        // square a pawn may capture onto, as [r, c]
        halfmove: 0,     // plies since the last capture or pawn push (50-move rule)
        fullmove: 1,
    };
}

function cloneBoard(board) {
    return board.map((row) => [...row]);
}

/** Is square (r, c) attacked by any piece of `by`? Drives check and castling. */
export function isAttacked(board, r, c, by) {
    // A `by` pawn attacks "forwards", so look backwards from (r, c).
    const pawnRow = by === WHITE ? r + 1 : r - 1;
    for (const dc of [-1, 1]) {
        if (inside(pawnRow, c + dc) && board[pawnRow][c + dc] === `${by}p`) return true;
    }

    for (const [dr, dc] of KNIGHT_STEPS) {
        const [nr, nc] = [r + dr, c + dc];
        if (inside(nr, nc) && board[nr][nc] === `${by}n`) return true;
    }

    for (const [dr, dc] of KING_STEPS) {
        const [nr, nc] = [r + dr, c + dc];
        if (inside(nr, nc) && board[nr][nc] === `${by}k`) return true;
    }

    for (const [dirs, slider] of [[ROOK_DIRS, 'r'], [BISHOP_DIRS, 'b']]) {
        for (const [dr, dc] of dirs) {
            let nr = r + dr;
            let nc = c + dc;
            while (inside(nr, nc)) {
                const piece = board[nr][nc];
                if (piece) {
                    if (colorOf(piece) === by && (typeOf(piece) === slider || typeOf(piece) === 'q')) {
                        return true;
                    }
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }
    }

    return false;
}

export function findKing(board, color) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === `${color}k`) return [r, c];
        }
    }
    return null;
}

export function inCheck(state, color) {
    const king = findKing(state.board, color);
    return king ? isAttacked(state.board, king[0], king[1], opponent(color)) : false;
}

function pushMove(list, move) {
    // A pawn arriving on the far rank becomes four distinct moves.
    if (typeOf(move.piece) === 'p' && (move.to[0] === 0 || move.to[0] === 7)) {
        for (const promotion of ['q', 'r', 'b', 'n']) {
            list.push({ ...move, promotion });
        }
        return;
    }
    list.push(move);
}

function pseudoMoves(state, color) {
    const { board } = state;
    const moves = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece || colorOf(piece) !== color) continue;
            const type = typeOf(piece);
            const base = { piece, from: [r, c], promotion: null, castle: null, ep: false };

            if (type === 'p') {
                const dir = color === WHITE ? -1 : 1;
                const startRow = color === WHITE ? 6 : 1;

                if (inside(r + dir, c) && !board[r + dir][c]) {
                    pushMove(moves, { ...base, to: [r + dir, c], captured: null });
                    if (r === startRow && !board[r + 2 * dir][c]) {
                        pushMove(moves, { ...base, to: [r + 2 * dir, c], captured: null });
                    }
                }
                for (const dc of [-1, 1]) {
                    const [nr, nc] = [r + dir, c + dc];
                    if (!inside(nr, nc)) continue;
                    const target = board[nr][nc];
                    if (target && colorOf(target) !== color) {
                        pushMove(moves, { ...base, to: [nr, nc], captured: target });
                    } else if (!target && state.ep && state.ep[0] === nr && state.ep[1] === nc) {
                        pushMove(moves, { ...base, to: [nr, nc], captured: `${opponent(color)}p`, ep: true });
                    }
                }
                continue;
            }

            if (type === 'n' || type === 'k') {
                const steps = type === 'n' ? KNIGHT_STEPS : KING_STEPS;
                for (const [dr, dc] of steps) {
                    const [nr, nc] = [r + dr, c + dc];
                    if (!inside(nr, nc)) continue;
                    const target = board[nr][nc];
                    if (target && colorOf(target) === color) continue;
                    moves.push({ ...base, to: [nr, nc], captured: target || null });
                }

                if (type === 'k') {
                    const [kingSide, queenSide] = color === WHITE ? ['wk', 'wq'] : ['bk', 'bq'];
                    const homeRow = color === WHITE ? 7 : 0;
                    const enemy = opponent(color);
                    const kingSafe = !isAttacked(board, homeRow, 4, enemy);

                    if (kingSafe && state.castling[kingSide]
                        && !board[homeRow][5] && !board[homeRow][6]
                        && board[homeRow][7] === `${color}r`
                        && !isAttacked(board, homeRow, 5, enemy)
                        && !isAttacked(board, homeRow, 6, enemy)) {
                        moves.push({ ...base, to: [homeRow, 6], captured: null, castle: 'k' });
                    }
                    if (kingSafe && state.castling[queenSide]
                        && !board[homeRow][1] && !board[homeRow][2] && !board[homeRow][3]
                        && board[homeRow][0] === `${color}r`
                        && !isAttacked(board, homeRow, 3, enemy)
                        && !isAttacked(board, homeRow, 2, enemy)) {
                        moves.push({ ...base, to: [homeRow, 2], captured: null, castle: 'q' });
                    }
                }
                continue;
            }

            const dirs = type === 'r' ? ROOK_DIRS
                : type === 'b' ? BISHOP_DIRS
                    : [...ROOK_DIRS, ...BISHOP_DIRS];
            for (const [dr, dc] of dirs) {
                let nr = r + dr;
                let nc = c + dc;
                while (inside(nr, nc)) {
                    const target = board[nr][nc];
                    if (target && colorOf(target) === color) break;
                    moves.push({ ...base, to: [nr, nc], captured: target || null });
                    if (target) break;
                    nr += dr;
                    nc += dc;
                }
            }
        }
    }

    return moves;
}

export function makeMove(state, move) {
    const board = cloneBoard(state.board);
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const color = colorOf(move.piece);
    const type = typeOf(move.piece);

    board[fr][fc] = null;
    board[tr][tc] = move.promotion ? `${color}${move.promotion}` : move.piece;

    if (move.ep) board[fr][tc] = null;

    if (move.castle) {
        const rookFrom = move.castle === 'k' ? 7 : 0;
        const rookTo = move.castle === 'k' ? 5 : 3;
        board[tr][rookTo] = board[tr][rookFrom];
        board[tr][rookFrom] = null;
    }

    const castling = { ...state.castling };
    if (type === 'k') {
        if (color === WHITE) { castling.wk = false; castling.wq = false; }
        else { castling.bk = false; castling.bq = false; }
    }
    // A rook leaving a corner — or being captured on one — kills that right.
    const cornerRights = { '7,0': 'wq', '7,7': 'wk', '0,0': 'bq', '0,7': 'bk' };
    const vacated = cornerRights[`${fr},${fc}`];
    if (vacated) castling[vacated] = false;
    const taken = cornerRights[`${tr},${tc}`];
    if (taken) castling[taken] = false;

    return {
        board,
        turn: opponent(color),
        castling,
        ep: type === 'p' && Math.abs(tr - fr) === 2 ? [(tr + fr) / 2, fc] : null,
        halfmove: type === 'p' || move.captured ? 0 : state.halfmove + 1,
        fullmove: color === BLACK ? state.fullmove + 1 : state.fullmove,
    };
}

export function legalMoves(state, color = state.turn) {
    return pseudoMoves(state, color).filter((move) => !inCheck(makeMove(state, move), color));
}

/** Compact key for repetition detection — placement + turn + rights + ep square. */
export function positionKey(state) {
    const rows = state.board.map((row) => row.map((p) => p || '.').join('')).join('/');
    const rights = Object.entries(state.castling).filter(([, on]) => on).map(([k]) => k).join('') || '-';
    return `${rows} ${state.turn} ${rights} ${state.ep ? squareName(state.ep) : '-'}`;
}

function hasInsufficientMaterial(board) {
    const minors = [];
    for (const row of board) {
        for (const piece of row) {
            if (!piece) continue;
            const type = typeOf(piece);
            if (type === 'k') continue;
            if (type === 'p' || type === 'r' || type === 'q') return false;
            minors.push(piece);
        }
    }
    // K vs K, K+minor vs K and B vs B are all dead positions here.
    return minors.length <= 1 || (minors.length === 2 && minors.every((p) => typeOf(p) === 'b'));
}

/**
 * @returns {{ over: boolean, result: string, winner: ?string, check: boolean }}
 * `result` is playing | checkmate | stalemate | fifty | repetition | material.
 */
export function gameStatus(state, seenKeys = []) {
    const check = inCheck(state, state.turn);

    if (legalMoves(state).length === 0) {
        return check
            ? { over: true, result: 'checkmate', winner: opponent(state.turn), check }
            : { over: true, result: 'stalemate', winner: null, check };
    }
    if (hasInsufficientMaterial(state.board)) {
        return { over: true, result: 'material', winner: null, check };
    }
    if (state.halfmove >= 100) {
        return { over: true, result: 'fifty', winner: null, check };
    }
    const key = positionKey(state);
    if (seenKeys.filter((k) => k === key).length >= 3) {
        return { over: true, result: 'repetition', winner: null, check };
    }
    return { over: false, result: 'playing', winner: null, check };
}

/** Standard algebraic notation, disambiguation rules included. */
export function toSAN(state, move) {
    if (move.castle) return move.castle === 'k' ? 'O-O' : 'O-O-O';

    const type = typeOf(move.piece);
    const target = squareName(move.to);
    let text;

    if (type === 'p') {
        text = move.captured ? `${'abcdefgh'[move.from[1]]}x${target}` : target;
    } else {
        const rivals = legalMoves(state, colorOf(move.piece)).filter((m) => (
            typeOf(m.piece) === type
            && m.to[0] === move.to[0] && m.to[1] === move.to[1]
            && !(m.from[0] === move.from[0] && m.from[1] === move.from[1])
        ));
        let hint = '';
        if (rivals.length) {
            if (!rivals.some((m) => m.from[1] === move.from[1])) hint = 'abcdefgh'[move.from[1]];
            else if (!rivals.some((m) => m.from[0] === move.from[0])) hint = String(8 - move.from[0]);
            else hint = squareName(move.from);
        }
        text = `${type.toUpperCase()}${hint}${move.captured ? 'x' : ''}${target}`;
    }

    if (move.promotion) text += `=${move.promotion.toUpperCase()}`;

    const next = makeMove(state, move);
    if (inCheck(next, next.turn)) text += legalMoves(next).length ? '+' : '#';

    return text;
}

// ---------------------------------------------------------------- evaluation

export const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
    p: [
        0, 0, 0, 0, 0, 0, 0, 0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
        5, 5, 10, 25, 25, 10, 5, 5,
        0, 0, 0, 20, 20, 0, 0, 0,
        5, -5, -10, 0, 0, -10, -5, 5,
        5, 10, 10, -20, -20, 10, 10, 5,
        0, 0, 0, 0, 0, 0, 0, 0,
    ],
    n: [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20, 0, 0, 0, 0, -20, -40,
        -30, 0, 10, 15, 15, 10, 0, -30,
        -30, 5, 15, 20, 20, 15, 5, -30,
        -30, 0, 15, 20, 20, 15, 0, -30,
        -30, 5, 10, 15, 15, 10, 5, -30,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50,
    ],
    b: [
        -20, -10, -10, -10, -10, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 10, 10, 5, 0, -10,
        -10, 5, 5, 10, 10, 5, 5, -10,
        -10, 0, 10, 10, 10, 10, 0, -10,
        -10, 10, 10, 10, 10, 10, 10, -10,
        -10, 5, 0, 0, 0, 0, 5, -10,
        -20, -10, -10, -10, -10, -10, -10, -20,
    ],
    r: [
        0, 0, 0, 0, 0, 0, 0, 0,
        5, 10, 10, 10, 10, 10, 10, 5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        0, 0, 0, 5, 5, 0, 0, 0,
    ],
    q: [
        -20, -10, -10, -5, -5, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 5, 5, 5, 0, -10,
        -5, 0, 5, 5, 5, 5, 0, -5,
        0, 0, 5, 5, 5, 5, 0, -5,
        -10, 5, 5, 5, 5, 5, 0, -10,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -20, -10, -10, -5, -5, -10, -10, -20,
    ],
    k: [
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -20, -30, -30, -40, -40, -30, -30, -20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        20, 20, 0, 0, 0, 0, 20, 20,
        20, 30, 10, 0, 0, 10, 30, 20,
    ],
    kEnd: [
        -50, -40, -30, -20, -20, -30, -40, -50,
        -30, -20, -10, 0, 0, -10, -20, -30,
        -30, -10, 20, 30, 30, 20, -10, -30,
        -30, -10, 30, 40, 40, 30, -10, -30,
        -30, -10, 30, 40, 40, 30, -10, -30,
        -30, -10, 20, 30, 30, 20, -10, -30,
        -30, -30, 0, 0, 0, 0, -30, -30,
        -50, -30, -30, -30, -30, -30, -30, -50,
    ],
};

function isEndgame(board) {
    let material = 0;
    for (const row of board) {
        for (const piece of row) {
            const type = typeOf(piece);
            if (type && type !== 'k' && type !== 'p') material += VALUES[type];
        }
    }
    return material <= 1300;
}

/** Score from White's point of view, in centipawns. */
function evaluate(board) {
    const endgame = isEndgame(board);
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            const type = typeOf(piece);
            const table = type === 'k' && endgame ? PST.kEnd : PST[type];
            const white = colorOf(piece) === WHITE;
            const value = VALUES[type] + table[white ? r * 8 + c : (7 - r) * 8 + c];
            score += white ? value : -value;
        }
    }
    return score;
}

const MATE = 100000;

function orderMoves(moves) {
    // Most-valuable-victim / least-valuable-attacker keeps alpha-beta narrow.
    const rank = (m) => (m.captured ? VALUES[typeOf(m.captured)] * 10 - VALUES[typeOf(m.piece)] : 0)
        + (m.promotion ? VALUES[m.promotion] : 0);
    return [...moves].sort((a, b) => rank(b) - rank(a));
}

/** Plays out the captures left at the horizon so the engine stops hanging pieces. */
function quiesce(state, alpha, beta, depth) {
    const standPat = evaluate(state.board) * (state.turn === WHITE ? 1 : -1);
    if (depth === 0 || standPat >= beta) return standPat;

    let best = Math.max(alpha, standPat);
    for (const move of orderMoves(legalMoves(state).filter((m) => m.captured))) {
        const score = -quiesce(makeMove(state, move), -beta, -best, depth - 1);
        if (score >= beta) return score;
        if (score > best) best = score;
    }
    return best;
}

function negamax(state, depth, alpha, beta, ply) {
    const moves = legalMoves(state);
    if (moves.length === 0) return inCheck(state, state.turn) ? -MATE + ply : 0;
    if (depth === 0) return quiesce(state, alpha, beta, 3);

    let best = -Infinity;
    for (const move of orderMoves(moves)) {
        const score = -negamax(makeMove(state, move), depth - 1, -beta, -alpha, ply + 1);
        if (score > best) best = score;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
    }
    return best;
}

/**
 * Picks a move for the side to play. `jitter` (centipawns) loosens the choice
 * so the easier levels do not replay the same game every time.
 */
export function findBestMove(state, depth, jitter = 0) {
    const moves = orderMoves(legalMoves(state));
    if (moves.length === 0) return null;

    const scored = moves.map((move) => ({
        move,
        score: -negamax(makeMove(state, move), depth - 1, -Infinity, Infinity, 1)
            + (jitter ? Math.random() * jitter : 0),
    }));

    const best = Math.max(...scored.map((entry) => entry.score));
    const top = scored.filter((entry) => entry.score >= best - 1e-9);
    return top[Math.floor(Math.random() * top.length)].move;
}

export const PIECE_GLYPHS = {
    wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
    bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};
