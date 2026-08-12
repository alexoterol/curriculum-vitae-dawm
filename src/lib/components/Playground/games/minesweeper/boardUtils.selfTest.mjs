// Run with: node boardUtils.selfTest.mjs
import assert from 'node:assert';
import { createGameState, reveal, toggleFlag, chordReveal, buildView } from './boardUtils.js';

// first click is always safe, and never even mine-adjacent, so it opens a patch
let state = createGameState('easy');
state = reveal(state, 4, 4);
assert.strictEqual(state.status, 'playing');
assert.ok(!state.mineSet.has('4,4'), 'first click must not be a mine');
assert.ok(state.revealed.size > 1, 'zero-count first click should flood open neighbors');

// flagged cells can't be revealed until unflagged
state = toggleFlag(state, 0, 0);
const beforeFlagReveal = state.revealed.size;
state = reveal(state, 0, 0);
assert.strictEqual(state.revealed.size, beforeFlagReveal, 'flagged cell must stay hidden');
state = toggleFlag(state, 0, 0);

// clicking every mine-free cell wins
for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
        if (!state.mineSet.has(`${r},${c}`)) state = reveal(state, r, c);
    }
}
assert.strictEqual(state.status, 'won');

// once won/lost, further reveals/flags are no-ops
const view = buildView(state);
assert.strictEqual(view.status, 'won');
assert.ok(!view.grid.flat().includes('hidden'), 'winning view should have no hidden safe cells');
const frozen = reveal(state, 0, 0);
assert.strictEqual(frozen, state, 'reveal after win must be a no-op');

// losing exposes only the hit mine as mine-hit, others as plain mine
let lossState = createGameState('easy');
lossState = reveal(lossState, 4, 4);
const [mineKey] = lossState.mineSet;
const [mr, mc] = mineKey.split(',').map(Number);
lossState = reveal(lossState, mr, mc);
assert.strictEqual(lossState.status, 'lost');
const lossView = buildView(lossState);
assert.strictEqual(lossView.grid[mr][mc], 'mine-hit');

// chording: a manually built 3x3 board, single mine at 0,0
function makeChordState() {
    return {
        difficultyId: 'test',
        rows: 3,
        cols: 3,
        mineCount: 1,
        mineSet: new Set(['0,0']),
        revealed: new Set(),
        flagged: new Set(),
        status: 'playing',
        hitMine: null,
        startedAt: Date.now(),
    };
}

// chording with no flags yet must be a no-op
let chordState = makeChordState();
chordState = reveal(chordState, 1, 1); // center cell, count = 1 (only 0,0 is a mine)
const beforeChord = chordState.revealed.size;
chordState = chordReveal(chordState, 1, 1);
assert.strictEqual(chordState.revealed.size, beforeChord, 'chord must no-op until flag count matches');

// flagging the actual mine and chording opens every other neighbor
chordState = toggleFlag(chordState, 0, 0);
chordState = chordReveal(chordState, 1, 1);
assert.strictEqual(chordState.revealed.size, 8, 'chord should open all 7 unflagged neighbors + itself');
assert.ok(!chordState.revealed.has('0,0'), 'the flagged mine itself must stay hidden');
assert.strictEqual(chordState.status, 'won', 'revealing every safe cell via chord should win');

// flagging the wrong cell and chording detonates the real mine
let badChordState = makeChordState();
badChordState = reveal(badChordState, 1, 1);
badChordState = toggleFlag(badChordState, 0, 1); // wrong cell, but count still matches (1 flag == 1)
badChordState = chordReveal(badChordState, 1, 1);
assert.strictEqual(badChordState.status, 'lost', 'chording past a wrongly-flagged mine must lose');

// demon is a non-square board (25 cols x 20 rows) — make sure rows/cols
// aren't swapped anywhere (an out-of-bounds mine or a lopsided view would
// give it away)
let demonState = createGameState('demon');
assert.strictEqual(demonState.rows, 20);
assert.strictEqual(demonState.cols, 25);
demonState = reveal(demonState, 10, 12);
assert.strictEqual(demonState.mineSet.size, 99);
for (const key of demonState.mineSet) {
    const [mr, mc] = key.split(',').map(Number);
    assert.ok(mr >= 0 && mr < 20, `mine row ${mr} out of bounds`);
    assert.ok(mc >= 0 && mc < 25, `mine col ${mc} out of bounds`);
}
const demonView = buildView(demonState);
assert.strictEqual(demonView.grid.length, 20, 'view must have 20 rows');
assert.strictEqual(demonView.grid[0].length, 25, 'each row must have 25 cols');

console.log('boardUtils self-test passed');
