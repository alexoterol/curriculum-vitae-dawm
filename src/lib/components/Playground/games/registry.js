import Snake from './snake/Snake';
import Sudoku from './sudoku/Sudoku';

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
        id: 'sudoku',
        component: Sudoku,
        emoji: '🔢',
        accent: 'var(--color-rose)',
        tags: ['Web', 'React'],
    },
];
