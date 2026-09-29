import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, deal, combination, canBeat, findMove, newGame, takeTurn } from './game.js';
const deck = createDeck();
const cards = (...ids) => ids.map(id => deck[id]);

test('52 unique cards, 13 cards per player, no duplicate deals', () => {
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map(c => c.id)).size, 52);
  for (const count of [2, 3, 4]) {
    const hands = deal(count);
    assert.equal(hands.length, count);
    assert.ok(hands.every(h => h.length === 13));
    assert.equal(new Set(hands.flat().map(c => c.id)).size, 13 * count);
  }
});
test('recognizes sets, straights and consecutive pairs; rejects 2 in straights', () => {
  assert.equal(combination(cards(0, 1)).type, 'pair');
  assert.equal(combination(cards(0, 1, 2)).type, 'triple');
  assert.equal(combination(cards(0, 5, 10)).type, 'straight');
  assert.equal(combination(cards(0, 1, 4, 5, 8, 9)).type, 'pairs');
  assert.equal(combination(cards(40, 44, 48)), null);
  assert.equal(combination(cards(0, 4)), null);
});
test('suit breaks ties and different-size sets cannot normally beat each other', () => {
  assert.ok(canBeat(cards(3), cards(2)));
  assert.ok(!canBeat(cards(2), cards(3)));
  assert.ok(!canBeat(cards(4, 5), cards(0)));
  assert.ok(!canBeat(cards(4, 8, 12, 16), cards(0, 4, 8)));
});
test('chopping a two and counter-chopping', () => {
  assert.ok(canBeat(cards(0, 1, 4, 5, 8, 9), cards(51)));
  assert.ok(canBeat(cards(0, 1, 2, 3), cards(50, 51)));
  assert.ok(!canBeat(cards(0, 1, 4, 5, 8, 9), cards(50, 51)));
  assert.ok(canBeat(cards(0, 1, 4, 5, 8, 9, 12, 13), cards(40, 41, 42, 43)));
});
test('enforces turn, opening lowest card and ownership', () => {
  const g = { hands: [cards(0, 4), cards(1, 5)], turn: 0, pile: [], lastPlayer: null, passed: [], requiredId: 0, winner: null, move: 0 };
  assert.ok(takeTurn(g, 1, cards(1)).error);
  assert.ok(takeTurn(g, 0, cards(4)).error);
  assert.ok(takeTurn(g, 0, cards(8)).error);
  assert.ok(takeTurn(g, 0, []).error);
  assert.equal(takeTurn(g, 0, cards(0)).game.turn, 1);
});
test('passed players remain out until the leader opens a fresh round', () => {
  let g = { hands: [cards(0, 8), cards(1, 5), cards(2, 6)], turn: 0, pile: [], lastPlayer: null, passed: [], requiredId: 0, winner: null, move: 0 };
  g = takeTurn(g, 0, cards(0)).game;
  g = takeTurn(g, 1, []).game;
  g = takeTurn(g, 2, cards(2)).game;
  assert.deepEqual(g.passed, [1]);
  g = takeTurn(g, 0, []).game;
  assert.equal(g.turn, 2);
  assert.deepEqual(g.pile, []);
  assert.deepEqual(g.passed, []);
});
test('full AI games finish legally for 2, 3 and 4 players', () => {
  for (const count of [2, 3, 4]) for (let round = 0; round < 8; round++) {
    let game = newGame(count), moves = 0;
    while (game.winner === null && moves < 500) {
      const selected = findMove(game.hands[game.turn], game.pile, game.requiredId) || [];
      const result = takeTurn(game, game.turn, selected);
      assert.ok(!result.error, result.error);
      game = result.game; moves++;
    }
    assert.notEqual(game.winner, null);
    assert.equal(game.hands[game.winner].length, 0);
  }
});
