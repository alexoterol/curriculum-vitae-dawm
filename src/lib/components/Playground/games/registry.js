import Snake from './snake/Snake';
import Sudoku from './sudoku/Sudoku';
import Game2048 from './2048/Game2048';
import Minesweeper from './minesweeper/Minesweeper';
import Chess from './chess/Chess';
import Solitaire from './solitaire/Solitaire';
import ConnectFour from './connectfour/ConnectFour';
import MemoryMatch from './memory/MemoryMatch';

// Add a new playable game by dropping its folder here and adding one entry.
// `id` must match a key under the `playground.games` locale namespace.
export const PLAYGROUND_GAMES = [
    {
        id: 'snake',
        component: Snake,
        emoji: '🐍',
        accent: 'var(--color-sage)',
        tags: ['Web', 'React'],
    },
    {
        id: 'chess',
        component: Chess,
        emoji: '♟️',
        accent: 'var(--color-slate)',
        tags: ['Web', 'React', 'CPU', 'P2P'],
    },
    {
        id: 'solitaire',
        component: Solitaire,
        emoji: '🃏',
        accent: 'var(--color-sage)',
        tags: ['Web', 'React'],
    },
    {
        id: 'sudoku',
        component: Sudoku,
        emoji: '🔢',
        accent: 'var(--color-rose)',
        tags: ['Web', 'React'],
    },
    {
        id: '2048',
        component: Game2048,
        emoji: '🧩',
        accent: 'var(--color-accent)',
        tags: ['Web', 'React'],
    },
    {
        id: 'connectfour',
        component: ConnectFour,
        emoji: '🔴',
        accent: 'var(--color-warning)',
        tags: ['Web', 'React', 'CPU'],
    },
    {
        id: 'memory',
        component: MemoryMatch,
        emoji: '🧠',
        accent: 'var(--color-rose)',
        tags: ['Web', 'React'],
    },
    {
        id: 'minesweeper',
        component: Minesweeper,
        emoji: '💣',
        accent: 'var(--color-warning)',
        tags: ['Web', 'React', 'P2P'],
    },
];
