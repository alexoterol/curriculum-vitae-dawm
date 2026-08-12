// Run with: node boardUtils.selfTest.mjs
import assert from 'node:assert';
import { createGameState, reveal, toggleFlag, buildView } from './boardUtils.js';

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
for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
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

console.log('boardUtils self-test passed');
