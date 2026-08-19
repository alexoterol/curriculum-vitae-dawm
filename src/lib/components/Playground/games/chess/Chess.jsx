import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Peer from 'peerjs';
import './Chess.css';
import {
    BLACK,
    PIECE_GLYPHS,
    VALUES,
    WHITE,
    colorOf,
    findBestMove,
    findKing,
    gameStatus,
    initialState,
    legalMoves,
    makeMove,
    positionKey,
    squareName,
    toSAN,
    typeOf,
} from './chessEngine';

const LEVELS = [
    { id: 'easy', label: 'EASY', depth: 1, jitter: 70 },
    { id: 'normal', label: 'NORMAL', depth: 3, jitter: 0 },
    { id: 'hard', label: 'HARD', depth: 4, jitter: 0 },
];

const PROMOTION_CHOICES = ['q', 'r', 'b', 'n'];
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_PREFIX = 'chs-';

// A closed tab does not reliably fire WebRTC's `close`, so each side pings and
// declares the other gone once it has been quiet for too long.
const HEARTBEAT_MS = 2000;
const PEER_TIMEOUT_MS = 8000;

const STATUS_TEXT = {
    checkmate: 'CHECKMATE',
    stalemate: 'DRAW - STALEMATE',
    fifty: 'DRAW - 50 MOVE RULE',
    repetition: 'DRAW - REPETITION',
    material: 'DRAW - NO MATERIAL',
};

const PEER_ERROR_MESSAGES = {
    'peer-unavailable': 'No room exists with that code.',
    network: 'No network connection.',
    'server-error': 'The matchmaking server is not responding. Try again.',
    disconnected: 'Lost connection to the matchmaking server.',
    webrtc: 'WebRTC connection between the browsers failed.',
};

const mapPeerError = (err) => PEER_ERROR_MESSAGES[err?.type] || 'An unexpected connection error occurred.';

function generateRoomCode() {
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
    return code;
}

const sameSquare = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
const sameMove = (move, from, to, promotion) => (
    sameSquare(move.from, from) && sameSquare(move.to, to) && (move.promotion || null) === (promotion || null)
);

const newHistory = () => [{ state: initialState(), san: null, move: null }];

/**
 * Everything a board needs to render one position. The host sends this over the
 * wire verbatim, and local games build the same shape, so one renderer serves both.
 */
function buildView(history) {
    const current = history[history.length - 1];
    return {
        state: current.state,
        lastMove: current.move,
        sans: history.slice(1).map((entry) => entry.san),
        status: gameStatus(current.state, history.map((entry) => positionKey(entry.state))),
    };
}

/** Material each side has captured, plus the running point advantage. */
function capturedPieces(board) {
    const startCounts = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
    const alive = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };

    for (const row of board) {
        for (const piece of row) {
            if (piece) alive[colorOf(piece)][typeOf(piece)] += 1;
        }
    }

    const lost = {};
    let balance = 0;
    for (const color of [WHITE, BLACK]) {
        lost[color] = [];
        for (const type of ['q', 'r', 'b', 'n', 'p']) {
            const missing = startCounts[type] - alive[color][type];
            for (let i = 0; i < missing; i++) lost[color].push(`${color}${type}`);
            balance += (color === WHITE ? -1 : 1) * missing * VALUES[type];
        }
    }
    // lost[w] holds White's dead pieces, which are Black's trophies.
    return { white: lost[BLACK], black: lost[WHITE], balance: Math.round(balance / 100) };
}

function statusLineFor(view, { thinking, orientation, online }) {
    const { status, state } = view;
    if (status.result === 'checkmate') {
        const winnerIsMe = online && status.winner === orientation;
        const who = status.winner === WHITE ? 'WHITE' : 'BLACK';
        return online
            ? `${STATUS_TEXT.checkmate} - ${winnerIsMe ? 'YOU WIN' : 'YOU LOSE'}`
            : `${STATUS_TEXT.checkmate} - ${who} WINS`;
    }
    if (status.over) return STATUS_TEXT[status.result];
    if (thinking) return 'CPU IS THINKING...';

    const turnLabel = state.turn === WHITE ? 'WHITE' : 'BLACK';
    if (status.check) return `${turnLabel} IS IN CHECK`;
    if (online) return state.turn === orientation ? 'YOUR TURN' : "OPPONENT'S TURN";
    return `${turnLabel} TO MOVE`;
}

function Board({ view, targets, selected, onSquare, orientation, pending, onPromote, interactive }) {
    const { state, lastMove, status } = view;

    // Seen from Black's side, both axes run the other way.
    const flip = orientation === BLACK;
    const rowOrder = flip ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const colOrder = flip ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    const checkedKing = status.check ? findKing(state.board, state.turn) : null;

    return (
        <div className="chess__board">
            {rowOrder.map((r, displayRow) => colOrder.map((c, displayCol) => {
                const piece = state.board[r][c];
                const isTarget = targets.some((m) => sameSquare(m.to, [r, c]));
                const isCapture = isTarget && (piece || targets.some((m) => sameSquare(m.to, [r, c]) && m.ep));

                return (
                    <button
                        key={`${r},${c}`}
                        type="button"
                        className={[
                            'chess-square',
                            (r + c) % 2 === 0 ? 'chess-square--light' : 'chess-square--dark',
                            sameSquare(selected, [r, c]) ? 'chess-square--selected' : '',
                            isTarget ? 'chess-square--target' : '',
                            isCapture ? 'chess-square--capture' : '',
                            lastMove && (sameSquare(lastMove.from, [r, c]) || sameSquare(lastMove.to, [r, c]))
                                ? 'chess-square--last' : '',
                            sameSquare(checkedKing, [r, c]) ? 'chess-square--check' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => interactive && onSquare(r, c)}
                        aria-label={`${squareName([r, c])}${piece ? ` ${piece}` : ' empty'}`}
                    >
                        {displayCol === 0 && <span className="chess-square__rank">{8 - r}</span>}
                        {displayRow === 7 && <span className="chess-square__file">{'abcdefgh'[c]}</span>}
                        {piece && (
                            <span className={`chess-piece chess-piece--${colorOf(piece)}`}>
                                {PIECE_GLYPHS[piece]}
                            </span>
                        )}
                        {isTarget && !piece && <span className="chess-square__dot" />}
                    </button>
                );
            }))}

            {pending && (
                <div className="chess__promotion">
                    <p>PROMOTE TO</p>
                    <div className="chess__promotion-row">
                        {PROMOTION_CHOICES.map((type) => (
                            <button
                                key={type}
                                type="button"
                                className="chess__promotion-btn"
                                onClick={() => onPromote(type)}
                            >
                                {PIECE_GLYPHS[`${state.turn}${type}`]}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function Captures({ pieces, balance }) {
    return (
        <div className="chess__captures">
            <span className="chess__captures-row">
                {pieces.map((piece, i) => (
                    <span key={`${piece}${i}`} className="chess__captured">{PIECE_GLYPHS[piece]}</span>
                ))}
            </span>
            {balance > 0 && <span className="chess__balance">+{balance}</span>}
        </div>
    );
}

function MoveList({ sans }) {
    const listRef = useRef(null);

    useEffect(() => {
        const list = listRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [sans.length]);

    // Two plies per numbered row, as on a score sheet.
    const rows = [];
    for (let i = 0; i < sans.length; i += 2) {
        rows.push({ number: i / 2 + 1, white: sans[i], black: sans[i + 1] });
    }

    return (
        <div className="chess__moves" ref={listRef}>
            <p className="chess__moves-title">MOVES</p>
            {rows.length === 0 && <p className="chess__moves-empty">No moves yet.</p>}
            {rows.map((row) => (
                <p key={row.number} className="chess__moves-row">
                    <span className="chess__moves-num">{row.number}.</span>
                    <span>{row.white}</span>
                    <span>{row.black || ''}</span>
                </p>
            ))}
        </div>
    );
}

function Chess() {
    const [screen, setScreen] = useState('menu'); // menu | local | join-entering | host | guest
    const [mode, setMode] = useState('cpu');      // cpu | duo, within the local screen
    const [level, setLevel] = useState('normal');

    const [history, setHistory] = useState(newHistory);
    const [selected, setSelected] = useState(null);
    const [pending, setPending] = useState(null); // promotion awaiting a piece choice

    const [roomCode, setRoomCode] = useState('');
    const [roomStatus, setRoomStatus] = useState('idle'); // creating | waiting | connecting | connected | peer-left | error
    const [errorMessage, setErrorMessage] = useState('');
    const [codeInput, setCodeInput] = useState('');
    const [netView, setNetView] = useState(null);

    const peerRef = useRef(null);
    const connRef = useRef(null);
    const hostHistoryRef = useRef(null);
    const roomStatusRef = useRef(roomStatus);
    const lastSeenRef = useRef(0);
    const pingRef = useRef(null);
    const watchdogRef = useRef(null);
    useEffect(() => { roomStatusRef.current = roomStatus; }, [roomStatus]);

    const online = screen === 'host' || screen === 'guest';
    const myColor = screen === 'guest' ? BLACK : WHITE;

    const localView = useMemo(() => buildView(history), [history]);
    const view = online ? netView : localView;

    const clearSelection = useCallback(() => {
        setSelected(null);
        setPending(null);
    }, []);

    const clearHeartbeat = useCallback(() => {
        clearInterval(pingRef.current);
        clearInterval(watchdogRef.current);
        pingRef.current = null;
        watchdogRef.current = null;
    }, []);

    /** Keeps `conn` under observation, calling `onLost` if the peer goes quiet. */
    const attachHeartbeat = useCallback((conn, onLost) => {
        clearHeartbeat();
        lastSeenRef.current = Date.now();

        pingRef.current = setInterval(() => {
            if (connRef.current !== conn) return;
            try {
                conn.send({ kind: 'ping' });
            } catch {
                /* channel already torn down; the watchdog below handles it */
            }
        }, HEARTBEAT_MS);

        watchdogRef.current = setInterval(() => {
            if (connRef.current !== conn) return;
            if (Date.now() - lastSeenRef.current > PEER_TIMEOUT_MS) {
                clearHeartbeat();
                onLost();
            }
        }, HEARTBEAT_MS);
    }, [clearHeartbeat]);

    const leaveRoom = useCallback(() => {
        clearHeartbeat();
        connRef.current?.close();
        peerRef.current?.destroy();
        connRef.current = null;
        peerRef.current = null;
        hostHistoryRef.current = null;
        setNetView(null);
        setRoomStatus('idle');
        setErrorMessage('');
    }, [clearHeartbeat]);

    useEffect(() => () => leaveRoom(), [leaveRoom]);

    const goToMenu = useCallback(() => {
        leaveRoom();
        clearSelection();
        setHistory(newHistory());
        setScreen('menu');
    }, [leaveRoom, clearSelection]);

    // ---------------------------------------------------------------- local

    const startLocal = useCallback((nextMode) => {
        setMode(nextMode);
        setHistory(newHistory());
        clearSelection();
        setScreen('local');
    }, [clearSelection]);

    const localPlay = useCallback((move) => {
        setHistory((prev) => {
            const from = prev[prev.length - 1].state;
            return [...prev, { state: makeMove(from, move), san: toSAN(from, move), move }];
        });
        clearSelection();
    }, [clearSelection]);

    // Step back a full move so the human lands on their own turn again.
    const undo = useCallback(() => {
        setHistory((prev) => {
            const back = mode === 'cpu' && prev.length > 2 ? 2 : 1;
            return prev.length > 1 ? prev.slice(0, Math.max(1, prev.length - back)) : prev;
        });
        clearSelection();
    }, [mode, clearSelection]);

    const cpuTurn = screen === 'local' && mode === 'cpu' && localView.state.turn === BLACK;
    const thinking = cpuTurn && !localView.status.over;

    // The engine runs on a timeout so React can paint the human's move first.
    useEffect(() => {
        if (!cpuTurn || localView.status.over) return undefined;

        let cancelled = false;
        const { depth, jitter } = LEVELS.find((l) => l.id === level) || LEVELS[1];
        const timer = setTimeout(() => {
            const move = findBestMove(localView.state, depth, jitter);
            if (!cancelled && move) localPlay(move);
        }, 180);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [cpuTurn, localView.status.over, localView.state, level, localPlay]);

    // --------------------------------------------------------------- online

    const broadcast = useCallback((nextHistory) => {
        hostHistoryRef.current = nextHistory;
        const nextView = buildView(nextHistory);
        setNetView(nextView);
        connRef.current?.send({ kind: 'view', view: nextView });
    }, []);

    const appendMove = useCallback((base, move) => {
        const from = base[base.length - 1].state;
        return [...base, { state: makeMove(from, move), san: toSAN(from, move), move }];
    }, []);

    const startHost = useCallback(() => {
        leaveRoom();
        clearSelection();
        setScreen('host');
        setRoomStatus('creating');

        const tryCreate = (attemptsLeft) => {
            const code = generateRoomCode();
            const peer = new Peer(`${ROOM_PREFIX}${code}`);
            peerRef.current = peer;

            peer.on('open', () => {
                if (peerRef.current !== peer) return; // superseded by a later start/leave
                setRoomCode(code);
                setRoomStatus('waiting');
                hostHistoryRef.current = newHistory();
                setNetView(buildView(hostHistoryRef.current));
            });

            peer.on('error', (err) => {
                if (peerRef.current !== peer) return;
                if (err?.type === 'unavailable-id' && attemptsLeft > 0) {
                    peer.destroy();
                    tryCreate(attemptsLeft - 1);
                    return;
                }
                setRoomStatus('error');
                setErrorMessage(mapPeerError(err));
            });

            peer.on('connection', (conn) => {
                if (peerRef.current !== peer || connRef.current) {
                    conn.close(); // stale peer, or this room already has a guest
                    return;
                }
                connRef.current = conn;

                conn.on('open', () => {
                    if (connRef.current !== conn) return;
                    setRoomStatus('connected');
                    conn.send({ kind: 'view', view: buildView(hostHistoryRef.current) });
                    attachHeartbeat(conn, () => {
                        connRef.current?.close();
                        connRef.current = null;
                        setRoomStatus('waiting'); // room stays open for a reconnect
                    });
                });

                conn.on('data', (msg) => {
                    if (connRef.current !== conn || !hostHistoryRef.current) return;
                    lastSeenRef.current = Date.now();

                    if (msg?.kind === 'ping') return;
                    if (msg?.kind === 'rematch') {
                        broadcast(newHistory());
                        return;
                    }
                    if (msg?.kind !== 'move') return;

                    // The host is the referee: the guest only ever plays Black,
                    // and only a move that is legal right now is accepted.
                    const current = hostHistoryRef.current[hostHistoryRef.current.length - 1].state;
                    if (current.turn !== BLACK) return;
                    const move = legalMoves(current)
                        .find((m) => sameMove(m, msg.from, msg.to, msg.promotion));
                    if (!move) return;

                    broadcast(appendMove(hostHistoryRef.current, move));
                });

                conn.on('close', () => {
                    if (connRef.current !== conn) return;
                    clearHeartbeat();
                    connRef.current = null;
                    setRoomStatus('waiting'); // keep the room open for a reconnect
                });
            });
        };

        tryCreate(3);
    }, [leaveRoom, clearSelection, broadcast, appendMove, attachHeartbeat, clearHeartbeat]);

    const joinRoom = useCallback((code) => {
        leaveRoom();
        clearSelection();
        setScreen('guest');
        setRoomStatus('connecting');

        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', () => {
            if (peerRef.current !== peer) return;
            const conn = peer.connect(`${ROOM_PREFIX}${code.trim().toUpperCase()}`, { reliable: true });
            connRef.current = conn;

            setTimeout(() => {
                if (connRef.current === conn && roomStatusRef.current === 'connecting') {
                    setRoomStatus('error');
                    setErrorMessage('Could not connect. Check the code and try again.');
                }
            }, 10000);

            conn.on('open', () => {
                if (connRef.current !== conn) return;
                setRoomStatus('connected');
                attachHeartbeat(conn, () => setRoomStatus('peer-left'));
            });
            conn.on('data', (msg) => {
                if (connRef.current !== conn) return;
                lastSeenRef.current = Date.now();
                if (msg?.kind === 'view') {
                    setNetView(msg.view);
                    setSelected(null);
                    setPending(null);
                }
            });
            conn.on('close', () => {
                if (connRef.current !== conn) return;
                clearHeartbeat();
                setRoomStatus('peer-left');
            });
            conn.on('error', () => {
                if (connRef.current !== conn) return;
                setRoomStatus('error');
                setErrorMessage('Connection error with the room.');
            });
        });

        peer.on('error', (err) => {
            if (peerRef.current !== peer) return;
            setRoomStatus('error');
            setErrorMessage(mapPeerError(err));
        });
    }, [leaveRoom, clearSelection, attachHeartbeat, clearHeartbeat]);

    const netPlay = useCallback((move) => {
        if (screen === 'host') {
            if (!hostHistoryRef.current) return;
            broadcast(appendMove(hostHistoryRef.current, move));
        } else {
            connRef.current?.send({
                kind: 'move',
                from: move.from,
                to: move.to,
                promotion: move.promotion || null,
            });
        }
        clearSelection();
    }, [screen, broadcast, appendMove, clearSelection]);

    const newOnlineGame = useCallback(() => {
        clearSelection();
        if (screen === 'host') broadcast(newHistory());
        else connRef.current?.send({ kind: 'rematch' });
    }, [screen, broadcast, clearSelection]);

    // ------------------------------------------------------------ interaction

    const canInteract = view
        && !view.status.over
        && (online
            ? roomStatus === 'connected' && view.state.turn === myColor
            : !cpuTurn);

    const moves = useMemo(
        () => (view && !view.status.over ? legalMoves(view.state) : []),
        [view],
    );

    const targets = useMemo(
        () => (selected ? moves.filter((m) => sameSquare(m.from, selected)) : []),
        [moves, selected],
    );

    const play = online ? netPlay : localPlay;

    function handleSquare(r, c) {
        if (!canInteract || pending) return;

        const move = targets.find((m) => sameSquare(m.to, [r, c]));
        if (move) {
            if (move.promotion) {
                setPending({ from: move.from, to: move.to });
                return;
            }
            play(move);
            return;
        }

        const piece = view.state.board[r][c];
        if (piece && colorOf(piece) === view.state.turn) {
            setSelected(sameSquare(selected, [r, c]) ? null : [r, c]);
        } else {
            setSelected(null);
        }
    }

    function choosePromotion(type) {
        const move = moves.find((m) => sameMove(m, pending.from, pending.to, type));
        if (move) play(move);
    }

    // ---------------------------------------------------------------- render

    if (screen === 'menu') {
        return (
            <div className="chess__menu">
                <div className="chess__group">
                    {LEVELS.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={`chess__btn ${level === option.id ? 'chess__btn--active' : ''}`}
                            onClick={() => setLevel(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div className="chess__menu-actions">
                    <button type="button" className="chess__menu-btn" onClick={() => startLocal('cpu')}>
                        🤖 VS CPU
                    </button>
                    <button type="button" className="chess__menu-btn" onClick={() => startLocal('duo')}>
                        👥 SAME SCREEN
                    </button>
                    <button type="button" className="chess__menu-btn" onClick={startHost}>
                        🌐 CREATE ROOM
                    </button>
                    <button type="button" className="chess__menu-btn" onClick={() => setScreen('join-entering')}>
                        🔑 JOIN ROOM
                    </button>
                </div>
                <p className="chess__menu-hint">Create a room to play someone else in real time — you take White.</p>
            </div>
        );
    }

    if (screen === 'join-entering') {
        return (
            <div className="chess__menu">
                <p className="chess__menu-hint">Enter the room code:</p>
                <input
                    type="text"
                    className="chess__code-input"
                    value={codeInput}
                    maxLength={5}
                    autoFocus
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && codeInput.length === 5 && joinRoom(codeInput)}
                    placeholder="ABCDE"
                />
                <div className="chess__menu-actions">
                    <button
                        type="button"
                        className="chess__menu-btn"
                        disabled={codeInput.length !== 5}
                        onClick={() => joinRoom(codeInput)}
                    >
                        CONNECT
                    </button>
                    <button type="button" className="chess__menu-btn chess__menu-btn--ghost" onClick={goToMenu}>
                        BACK
                    </button>
                </div>
            </div>
        );
    }

    if (online && roomStatus !== 'connected' && roomStatus !== 'waiting') {
        const message = roomStatus === 'creating' ? 'Creating room…'
            : roomStatus === 'connecting' ? 'Connecting…'
                : roomStatus === 'peer-left' ? 'The other player disconnected.'
                    : errorMessage;
        return (
            <div className="chess__menu">
                <p className={`chess__status ${roomStatus === 'error' || roomStatus === 'peer-left' ? 'chess__status--over' : ''}`}>
                    {message}
                </p>
                <button type="button" className="chess__menu-btn chess__menu-btn--ghost" onClick={goToMenu}>
                    ‹ MENU
                </button>
            </div>
        );
    }

    if (!view) return <p className="chess__status">Loading board…</p>;

    const captured = capturedPieces(view.state.board);
    const orientation = online ? myColor : WHITE;
    // The strip above the board always shows the far side's trophies.
    const topPieces = orientation === WHITE ? captured.black : captured.white;
    const bottomPieces = orientation === WHITE ? captured.white : captured.black;
    const topBalance = orientation === WHITE ? -captured.balance : captured.balance;

    return (
        <div className="chess">
            <div className="chess__toolbar">
                {screen === 'local' && mode === 'cpu' && (
                    <div className="chess__group">
                        {LEVELS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                className={`chess__btn ${level === option.id ? 'chess__btn--active' : ''}`}
                                onClick={() => setLevel(option.id)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="chess__group">
                    {screen === 'local' && (
                        <>
                            <button type="button" className="chess__btn" onClick={undo} disabled={history.length < 2}>
                                UNDO
                            </button>
                            <button
                                type="button"
                                className="chess__btn"
                                onClick={() => { setHistory(newHistory()); clearSelection(); }}
                            >
                                NEW
                            </button>
                        </>
                    )}
                    {online && (
                        <button
                            type="button"
                            className="chess__btn"
                            onClick={newOnlineGame}
                            disabled={roomStatus !== 'connected'}
                        >
                            {screen === 'host' ? 'NEW' : 'ASK REMATCH'}
                        </button>
                    )}
                    <button type="button" className="chess__btn" onClick={goToMenu}>‹ MENU</button>
                </div>
            </div>

            {online && (
                <div className="chess__room">
                    {screen === 'host' && (
                        <span className="chess__room-code">
                            ROOM: <strong>{roomCode}</strong>
                            <button
                                type="button"
                                className="chess__copy"
                                onClick={() => navigator.clipboard?.writeText(roomCode)}
                                title="Copy room code"
                            >
                                📋
                            </button>
                        </span>
                    )}
                    <span className="chess__room-side">
                        YOU ARE {myColor === WHITE ? 'WHITE' : 'BLACK'} {PIECE_GLYPHS[`${myColor}k`]}
                    </span>
                </div>
            )}

            {online && roomStatus === 'waiting' && (
                <p className="chess__status">Waiting for another player to join…</p>
            )}

            <p className={`chess__status ${view.status.over ? 'chess__status--over' : ''}`}>
                {statusLineFor(view, { thinking, orientation, online })}
            </p>

            <div className="chess__layout">
                <div className="chess__board-side">
                    <Captures pieces={topPieces} balance={topBalance} />
                    <Board
                        view={view}
                        targets={targets}
                        selected={selected}
                        onSquare={handleSquare}
                        orientation={orientation}
                        pending={pending}
                        onPromote={choosePromotion}
                        interactive={!!canInteract}
                    />
                    <Captures pieces={bottomPieces} balance={-topBalance} />
                </div>

                <MoveList sans={view.sans} />
            </div>
        </div>
    );
}

export default Chess;
