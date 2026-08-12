import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Peer from 'peerjs';
import './Minesweeper.css';
import { DIFFICULTIES, createGameState, reveal, toggleFlag, chordReveal, buildView, generateRoomCode } from './boardUtils';

function applyAction(engine, kind, r, c) {
    if (kind === 'flag') return toggleFlag(engine, r, c);
    if (kind === 'chord') return chordReveal(engine, r, c);
    return reveal(engine, r, c);
}

// Wider boards (e.g. Demon's 25 cols) get more room so cells don't shrink
// below a usable tap size; narrower boards keep the original 420px cap.
function boardWidth(cols) {
    return `min(100%, ${Math.max(420, cols * 20)}px)`;
}

const CELL_ICON = { hidden: '', flag: '🚩', 'flag-mine': '🚩', mine: '💣', 'mine-hit': '💣' };

const PEER_ERROR_MESSAGES = {
    'peer-unavailable': 'No existe ninguna sala con ese código.',
    network: 'Sin conexión de red.',
    'server-error': 'El servidor de emparejamiento no responde. Intenta de nuevo.',
    disconnected: 'Se perdió la conexión con el servidor de emparejamiento.',
    webrtc: 'Fallo de conexión WebRTC entre los navegadores.',
};

function mapPeerError(err) {
    return PEER_ERROR_MESSAGES[err?.type] || 'Ocurrió un error de conexión inesperado.';
}

// Keyed by startedAt from the caller so a new game (or a null startedAt)
// remounts this with a fresh elapsed=0 instead of needing an effect-driven reset.
function Timer({ startedAt, status }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!startedAt || status !== 'playing') return undefined;
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
        return () => clearInterval(id);
    }, [startedAt, status]);

    return <span>⏱ {elapsed}s</span>;
}

function Board({ view, flagMode, onCellAction, interactive }) {
    if (!view) return null;
    const handleClick = (r, c) => {
        if (!interactive || view.status === 'won' || view.status === 'lost') return;
        const cell = view.grid[r][c];
        if (!flagMode && typeof cell === 'number' && cell > 0) {
            onCellAction(r, c, 'chord');
            return;
        }
        onCellAction(r, c, flagMode ? 'flag' : 'reveal');
    };
    const handleContextMenu = (e, r, c) => {
        e.preventDefault();
        if (!interactive || view.status === 'won' || view.status === 'lost') return;
        onCellAction(r, c, 'flag');
    };

    return (
        <div
            className="minesweeper-board"
            style={{
                gridTemplateColumns: `repeat(${view.cols}, 1fr)`,
                gridTemplateRows: `repeat(${view.rows}, 1fr)`,
                aspectRatio: `${view.cols} / ${view.rows}`,
                width: boardWidth(view.cols),
            }}
        >
            {view.grid.map((row, r) =>
                row.map((cell, c) => {
                    const isNumber = typeof cell === 'number';
                    return (
                        <button
                            key={`${r},${c}`}
                            type="button"
                            className={[
                                'minesweeper-cell',
                                isNumber ? 'minesweeper-cell--revealed' : '',
                                cell === 'mine-hit' ? 'minesweeper-cell--mine-hit' : '',
                                cell === 'flag-mine' ? 'minesweeper-cell--flag-correct' : '',
                            ].filter(Boolean).join(' ')}
                            data-count={isNumber && cell > 0 ? cell : undefined}
                            onClick={() => handleClick(r, c)}
                            onContextMenu={(e) => handleContextMenu(e, r, c)}
                        >
                            {isNumber ? (cell > 0 ? cell : '') : CELL_ICON[cell]}
                        </button>
                    );
                })
            )}
        </div>
    );
}

function Hud({ view, flagMode, onToggleFlagMode, extra }) {
    return (
        <div className="minesweeper-hud" style={{ width: boardWidth(view.cols) }}>
            <span>💣 {Math.max(0, view.mineCount - view.flaggedCount)}</span>
            <Timer key={view.startedAt || 'idle'} startedAt={view.startedAt} status={view.status} />
            <button
                type="button"
                className={`minesweeper-flagmode ${flagMode ? 'minesweeper-flagmode--active' : ''}`}
                onClick={onToggleFlagMode}
                title="Alternar modo bandera (toque)"
            >
                🚩
            </button>
            {extra}
        </div>
    );
}

function DifficultyPicker({ value, onChange }) {
    return (
        <div className="minesweeper-difficulty">
            {DIFFICULTIES.map((d) => (
                <button
                    key={d.id}
                    type="button"
                    className={`minesweeper-diff-btn ${value === d.id ? 'minesweeper-diff-btn--active' : ''}`}
                    onClick={() => onChange(d.id)}
                >
                    {d.id.toUpperCase()}
                </button>
            ))}
        </div>
    );
}

function Minesweeper() {
    const [screen, setScreen] = useState('menu'); // menu | solo | host | join-entering | join
    const [difficultyId, setDifficultyId] = useState('easy');
    const [flagMode, setFlagMode] = useState(false);

    // solo
    const [soloEngine, setSoloEngine] = useState(null);
    const soloView = useMemo(() => (soloEngine ? buildView(soloEngine) : null), [soloEngine]);

    // multiplayer
    const [roomCode, setRoomCode] = useState('');
    const [roomStatus, setRoomStatus] = useState('idle'); // creating | waiting | connecting | connected | peer-left | error
    const [errorMessage, setErrorMessage] = useState('');
    const [codeInput, setCodeInput] = useState('');
    const [hostView, setHostView] = useState(null);
    const [guestView, setGuestView] = useState(null);

    const peerRef = useRef(null);
    const connRef = useRef(null);
    const hostEngineRef = useRef(null);
    const roomStatusRef = useRef(roomStatus);
    useEffect(() => { roomStatusRef.current = roomStatus; }, [roomStatus]);

    const leaveRoom = useCallback(() => {
        connRef.current?.close();
        peerRef.current?.destroy();
        connRef.current = null;
        peerRef.current = null;
        hostEngineRef.current = null;
        setHostView(null);
        setGuestView(null);
        setRoomStatus('idle');
        setErrorMessage('');
    }, []);

    useEffect(() => () => leaveRoom(), [leaveRoom]);

    const goToMenu = useCallback(() => {
        leaveRoom();
        setScreen('menu');
    }, [leaveRoom]);

    // --- solo ---
    const startSolo = useCallback((diff) => {
        setSoloEngine(createGameState(diff));
        setScreen('solo');
    }, []);
    const soloAction = useCallback((r, c, kind) => {
        setSoloEngine((prev) => applyAction(prev, kind, r, c));
    }, []);
    const soloRestart = useCallback(() => setSoloEngine((prev) => createGameState(prev.difficultyId)), []);

    // --- host ---
    const broadcastHostState = useCallback((nextEngine) => {
        hostEngineRef.current = nextEngine;
        const view = buildView(nextEngine);
        setHostView(view);
        connRef.current?.send({ kind: 'view', view });
    }, []);

    const startHost = useCallback((diff) => {
        leaveRoom();
        setScreen('host');
        setRoomStatus('creating');
        setDifficultyId(diff);

        const tryCreate = (attemptsLeft) => {
            const code = generateRoomCode();
            const peer = new Peer(`msw-${code}`);
            peerRef.current = peer;

            peer.on('open', () => {
                if (peerRef.current !== peer) return; // superseded by a later start/leave
                setRoomCode(code);
                setRoomStatus('waiting');
                hostEngineRef.current = createGameState(diff);
                setHostView(buildView(hostEngineRef.current));
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
                    conn.close(); // stale peer, or a guest room already taken
                    return;
                }
                connRef.current = conn;
                conn.on('open', () => {
                    if (connRef.current !== conn) return;
                    setRoomStatus('connected');
                    conn.send({ kind: 'view', view: buildView(hostEngineRef.current) });
                });
                conn.on('data', (msg) => {
                    if (connRef.current !== conn) return;
                    if (msg?.kind !== 'action' || !hostEngineRef.current) return;
                    const next = applyAction(hostEngineRef.current, msg.action, msg.r, msg.c);
                    broadcastHostState(next);
                });
                conn.on('close', () => {
                    if (connRef.current !== conn) return;
                    connRef.current = null;
                    setRoomStatus('waiting'); // keep the room open for a reconnect
                });
            });
        };
        tryCreate(3);
    }, [leaveRoom, broadcastHostState]);

    const hostAction = useCallback((r, c, kind) => {
        if (!hostEngineRef.current) return;
        broadcastHostState(applyAction(hostEngineRef.current, kind, r, c));
    }, [broadcastHostState]);

    const hostRestart = useCallback(() => {
        if (!hostEngineRef.current) return;
        broadcastHostState(createGameState(hostEngineRef.current.difficultyId));
    }, [broadcastHostState]);

    // --- guest ---
    const joinRoom = useCallback((code) => {
        leaveRoom();
        setScreen('join');
        setRoomStatus('connecting');

        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', () => {
            if (peerRef.current !== peer) return;
            const conn = peer.connect(`msw-${code.trim().toUpperCase()}`, { reliable: true });
            connRef.current = conn;

            setTimeout(() => {
                if (connRef.current === conn && roomStatusRef.current === 'connecting') {
                    setRoomStatus('error');
                    setErrorMessage('No se pudo conectar. Verifica el código e intenta de nuevo.');
                }
            }, 10000);

            conn.on('open', () => {
                if (connRef.current === conn) setRoomStatus('connected');
            });
            conn.on('data', (msg) => {
                if (connRef.current !== conn) return;
                if (msg?.kind === 'view') setGuestView(msg.view);
            });
            conn.on('close', () => {
                if (connRef.current === conn) setRoomStatus('peer-left');
            });
            conn.on('error', () => {
                if (connRef.current !== conn) return;
                setRoomStatus('error');
                setErrorMessage('Error de conexión con la sala.');
            });
        });

        peer.on('error', (err) => {
            if (peerRef.current !== peer) return;
            setRoomStatus('error');
            setErrorMessage(mapPeerError(err));
        });
    }, [leaveRoom]);

    const guestAction = useCallback((r, c, kind) => {
        connRef.current?.send({ kind: 'action', action: kind, r, c });
    }, []);

    // ---------- render ----------

    if (screen === 'menu') {
        return (
            <div className="minesweeper-menu">
                <DifficultyPicker value={difficultyId} onChange={setDifficultyId} />
                <div className="minesweeper-menu__actions">
                    <button type="button" className="minesweeper-menu__btn" onClick={() => startSolo(difficultyId)}>
                        🧑 1 JUGADOR
                    </button>
                    <button type="button" className="minesweeper-menu__btn" onClick={() => startHost(difficultyId)}>
                        🌐 CREAR SALA
                    </button>
                    <button type="button" className="minesweeper-menu__btn" onClick={() => setScreen('join-entering')}>
                        🔑 UNIRSE A SALA
                    </button>
                </div>
            </div>
        );
    }

    if (screen === 'join-entering') {
        return (
            <div className="minesweeper-menu">
                <p className="minesweeper-menu__hint">Ingresa el código de la sala:</p>
                <input
                    type="text"
                    className="minesweeper-code-input"
                    value={codeInput}
                    maxLength={5}
                    autoFocus
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && codeInput.length === 5 && joinRoom(codeInput)}
                    placeholder="ABCDE"
                />
                <div className="minesweeper-menu__actions">
                    <button
                        type="button"
                        className="minesweeper-menu__btn"
                        disabled={codeInput.length !== 5}
                        onClick={() => joinRoom(codeInput)}
                    >
                        CONECTAR
                    </button>
                    <button type="button" className="minesweeper-menu__btn minesweeper-menu__btn--ghost" onClick={goToMenu}>
                        VOLVER
                    </button>
                </div>
            </div>
        );
    }

    if (screen === 'solo') {
        return (
            <div className="minesweeper-game">
                <Hud
                    view={soloView}
                    flagMode={flagMode}
                    onToggleFlagMode={() => setFlagMode((v) => !v)}
                    extra={<button type="button" className="minesweeper-restart" onClick={soloRestart}>🔄</button>}
                />
                <Board view={soloView} flagMode={flagMode} onCellAction={soloAction} interactive />
                {soloView.status === 'won' && <p className="minesweeper-banner minesweeper-banner--won">▸ GANASTE ◂</p>}
                {soloView.status === 'lost' && <p className="minesweeper-banner minesweeper-banner--lost">▸ BOOM ◂</p>}
                <button type="button" className="minesweeper-back" onClick={goToMenu}>‹ MENÚ</button>
            </div>
        );
    }

    if (screen === 'host') {
        return (
            <div className="minesweeper-game">
                {roomStatus === 'creating' && (
                    <>
                        <p className="minesweeper-status">Creando sala…</p>
                        <button type="button" className="minesweeper-back" onClick={goToMenu}>‹ MENÚ</button>
                    </>
                )}
                {roomStatus === 'error' && (
                    <>
                        <p className="minesweeper-status minesweeper-status--error">{errorMessage}</p>
                        <button type="button" className="minesweeper-back" onClick={goToMenu}>‹ MENÚ</button>
                    </>
                )}
                {(roomStatus === 'waiting' || roomStatus === 'connected') && hostView && (
                    <>
                        <div className="minesweeper-room-code">
                            <span>SALA: <strong>{roomCode}</strong></span>
                            <button
                                type="button"
                                className="minesweeper-copy"
                                onClick={() => navigator.clipboard?.writeText(roomCode)}
                            >
                                📋
                            </button>
                        </div>
                        {roomStatus === 'waiting' && (
                            <p className="minesweeper-status">Esperando a que otro jugador se una…</p>
                        )}
                        <Hud
                            view={hostView}
                            flagMode={flagMode}
                            onToggleFlagMode={() => setFlagMode((v) => !v)}
                            extra={<button type="button" className="minesweeper-restart" onClick={hostRestart}>🔄</button>}
                        />
                        <Board
                            view={hostView}
                            flagMode={flagMode}
                            onCellAction={hostAction}
                            interactive={roomStatus === 'connected'}
                        />
                        {hostView.status === 'won' && <p className="minesweeper-banner minesweeper-banner--won">▸ GANARON ◂</p>}
                        {hostView.status === 'lost' && <p className="minesweeper-banner minesweeper-banner--lost">▸ BOOM ◂</p>}
                        <button type="button" className="minesweeper-back" onClick={goToMenu}>‹ MENÚ</button>
                    </>
                )}
            </div>
        );
    }

    if (screen === 'join') {
        return (
            <div className="minesweeper-game">
                {roomStatus === 'connecting' && (
                    <>
                        <p className="minesweeper-status">Conectando…</p>
                        <button type="button" className="minesweeper-back" onClick={goToMenu}>‹ MENÚ</button>
                    </>
                )}
                {(roomStatus === 'error' || roomStatus === 'peer-left') && (
                    <>
                        <p className="minesweeper-status minesweeper-status--error">
                            {roomStatus === 'peer-left' ? 'El anfitrión se desconectó.' : errorMessage}
                        </p>
                        <button type="button" className="minesweeper-back" onClick={goToMenu}>‹ MENÚ</button>
                    </>
                )}
                {roomStatus === 'connected' && guestView && (
                    <>
                        <Hud view={guestView} flagMode={flagMode} onToggleFlagMode={() => setFlagMode((v) => !v)} />
                        <Board view={guestView} flagMode={flagMode} onCellAction={guestAction} interactive />
                        {guestView.status === 'won' && <p className="minesweeper-banner minesweeper-banner--won">▸ GANARON ◂</p>}
                        {guestView.status === 'lost' && <p className="minesweeper-banner minesweeper-banner--lost">▸ BOOM ◂</p>}
                        {(guestView.status === 'won' || guestView.status === 'lost') && (
                            <p className="minesweeper-status">Esperando a que el anfitrión reinicie…</p>
                        )}
                        <button type="button" className="minesweeper-back" onClick={goToMenu}>‹ MENÚ</button>
                    </>
                )}
                {roomStatus === 'connected' && !guestView && <p className="minesweeper-status">Cargando tablero…</p>}
            </div>
        );
    }

    return null;
}

export default Minesweeper;
