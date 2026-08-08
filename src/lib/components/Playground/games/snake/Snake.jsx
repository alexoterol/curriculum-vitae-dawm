import React, { useCallback, useEffect, useRef, useState } from 'react';
import './Snake.css';

const GRID_SIZE = 15;
const TICK_MS = 140;
const HIGH_SCORE_KEY = 'playground-snake-highscore';

const INITIAL_SNAKE = [
    { x: 7, y: 7 },
    { x: 6, y: 7 },
    { x: 5, y: 7 },
];
const INITIAL_DIRECTION = { x: 1, y: 0 };

const KEY_DIRECTIONS = {
    ArrowUp: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    W: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    S: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    A: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
    D: { x: 1, y: 0 },
};

function randomEmptyCell(snake) {
    let cell;
    do {
        cell = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
        };
    } while (snake.some((segment) => segment.x === cell.x && segment.y === cell.y));
    return cell;
}

function Snake() {
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [food, setFood] = useState(() => randomEmptyCell(INITIAL_SNAKE));
    const [status, setStatus] = useState('idle'); // idle | playing | paused | gameover
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(
        () => Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0
    );

    const directionRef = useRef(INITIAL_DIRECTION);
    const nextDirectionRef = useRef(INITIAL_DIRECTION);

    const start = useCallback(() => {
        directionRef.current = INITIAL_DIRECTION;
        nextDirectionRef.current = INITIAL_DIRECTION;
        setSnake(INITIAL_SNAKE);
        setFood(randomEmptyCell(INITIAL_SNAKE));
        setScore(0);
        setStatus('playing');
    }, []);

    const queueDirection = useCallback(
        (dir) => {
            const isFreshStart = status === 'idle' || status === 'gameover';
            const baseDirection = isFreshStart ? INITIAL_DIRECTION : directionRef.current;
            if (dir.x === -baseDirection.x && dir.y === -baseDirection.y) return;
            if (isFreshStart) start();
            nextDirectionRef.current = dir;
        },
        [status, start]
    );

    useEffect(() => {
        function handleKey(e) {
            const dir = KEY_DIRECTIONS[e.key];
            if (dir) {
                e.preventDefault();
                queueDirection(dir);
                return;
            }
            if (e.key === ' ') {
                e.preventDefault();
                setStatus((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s));
            }
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [queueDirection]);

    useEffect(() => {
        if (status !== 'playing') return undefined;

        const id = setInterval(() => {
            setSnake((prev) => {
                directionRef.current = nextDirectionRef.current;
                const dir = directionRef.current;
                const head = prev[0];
                const newHead = { x: head.x + dir.x, y: head.y + dir.y };

                const outOfBounds =
                    newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE;
                const ateFood = !outOfBounds && newHead.x === food.x && newHead.y === food.y;
                // the tail cell is vacated this tick unless the snake is about to grow,
                // so only treat it as solid when we're eating (and the tail stays put)
                const bodyToCheck = ateFood ? prev : prev.slice(0, -1);
                const collided =
                    outOfBounds ||
                    bodyToCheck.some((segment) => segment.x === newHead.x && segment.y === newHead.y);

                if (collided) {
                    setStatus('gameover');
                    setScore((currentScore) => {
                        setHighScore((prevHigh) => {
                            if (currentScore > prevHigh) {
                                localStorage.setItem(HIGH_SCORE_KEY, String(currentScore));
                                return currentScore;
                            }
                            return prevHigh;
                        });
                        return currentScore;
                    });
                    return prev;
                }

                const newSnake = [newHead, ...prev];
                if (ateFood) {
                    setScore((s) => s + 1);
                    setFood(randomEmptyCell(newSnake));
                } else {
                    newSnake.pop();
                }
                return newSnake;
            });
        }, TICK_MS);

        return () => clearInterval(id);
    }, [status, food]);

    const snakeSet = new Set(snake.map((s) => `${s.x},${s.y}`));
    const headKey = `${snake[0].x},${snake[0].y}`;

    return (
        <div className="snake-game">
            <div className="snake-game__hud">
                <span>SCORE {score}</span>
                <span>BEST {highScore}</span>
            </div>

            <div
                className="snake-game__board"
                style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
            >
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                    const x = i % GRID_SIZE;
                    const y = Math.floor(i / GRID_SIZE);
                    const key = `${x},${y}`;
                    const isFood = food.x === x && food.y === y;
                    const isHead = key === headKey;
                    const isBody = !isHead && snakeSet.has(key);
                    return (
                        <div
                            key={key}
                            className={[
                                'snake-cell',
                                isHead ? 'snake-cell--head' : '',
                                isBody ? 'snake-cell--body' : '',
                                isFood ? 'snake-cell--food' : '',
                            ].filter(Boolean).join(' ')}
                        />
                    );
                })}

                {status !== 'playing' && (
                    <div className="snake-game__overlay">
                        {status === 'idle' && <p>ARROWS / WASD TO MOVE</p>}
                        {status === 'paused' && <p>PAUSED</p>}
                        {status === 'gameover' && (
                            <>
                                <p>GAME OVER</p>
                                <p className="snake-game__overlay-score">SCORE {score}</p>
                            </>
                        )}
                        <button type="button" className="snake-game__button" onClick={start}>
                            {status === 'gameover' ? 'RETRY' : 'START'}
                        </button>
                    </div>
                )}
            </div>

            <div className="snake-game__dpad">
                <button
                    type="button"
                    className="snake-dpad__btn snake-dpad__btn--up"
                    aria-label="up"
                    onClick={() => queueDirection({ x: 0, y: -1 })}
                >
                    ▲
                </button>
                <button
                    type="button"
                    className="snake-dpad__btn snake-dpad__btn--left"
                    aria-label="left"
                    onClick={() => queueDirection({ x: -1, y: 0 })}
                >
                    ◂
                </button>
                <button
                    type="button"
                    className="snake-dpad__btn snake-dpad__btn--right"
                    aria-label="right"
                    onClick={() => queueDirection({ x: 1, y: 0 })}
                >
                    ▸
                </button>
                <button
                    type="button"
                    className="snake-dpad__btn snake-dpad__btn--down"
                    aria-label="down"
                    onClick={() => queueDirection({ x: 0, y: 1 })}
                >
                    ▾
                </button>
            </div>
        </div>
    );
}

export default Snake;
