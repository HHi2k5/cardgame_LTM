export const SUITS = ['♠', '♣', '♦', '♥'];
export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
export const sortCards = cards => [...cards].sort((a, b) => a.value - b.value);
export function createDeck() {
  return RANKS.flatMap((rank, r) => SUITS.map((suit, s) => ({ id: r * 4 + s, rank, suit, value: r * 4 + s, r, red: s > 1 })));
}
export function deal(count = 4) {
  const deck = createDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return Array.from({ length: count }, (_, i) => sortCards(deck.slice(i * 13, (i + 1) * 13)));
}
export function combination(cards) {
  if (!cards.length) return null;
  const sorted = sortCards(cards), ranks = sorted.map(c => c.r), size = cards.length;
  const top = sorted.at(-1).value;
  if (size === 1) return { type: 'single', size, top };
  if (ranks.every(r => r === ranks[0]) && size <= 4) return { type: ['single', 'pair', 'triple', 'quad'][size - 1], size, top };
  if (size >= 3 && !ranks.includes(12) && ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1)) return { type: 'straight', size, top };
  if (size >= 6 && size % 2 === 0 && !ranks.includes(12) && ranks.every((r, i) => i % 2 ? r === ranks[i - 1] : i === 0 || r === ranks[i - 2] + 1)) return { type: 'pairs', size, top };
  return null;
}
export function canBeat(cards, previous = []) {
  const next = combination(cards), last = combination(previous);
  if (!next) return false;
  if (!last) return true;
  if (next.type === last.type && next.size === last.size && next.top > last.top) return true;
  const singleTwo = last.type === 'single' && previous[0].r === 12;
  const pairTwos = last.type === 'pair' && previous[0].r === 12;
  if (next.type === 'quad' && (singleTwo || pairTwos || (last.type === 'pairs' && last.size === 6))) return true;
  if (next.type === 'pairs' && next.size === 6 && singleTwo) return true;
  if (next.type === 'pairs' && next.size >= 8 && (singleTwo || pairTwos || last.type === 'quad' || (last.type === 'pairs' && last.size === 6))) return true;
  return false;
}
export function findMove(hand, previous = [], requiredId = null) {
  // At most 8191 combinations for a 13-card hand; also finds chopping combinations.
  let best = null;
  for (let mask = 1; mask < (1 << hand.length); mask++) {
    const cards = hand.filter((_, i) => mask & (1 << i));
    if (requiredId !== null && !cards.some(c => c.id === requiredId)) continue;
    if (canBeat(cards, previous) && (!best || cards.length < best.length || (cards.length === best.length && cards.at(-1).value < best.at(-1).value))) best = cards;
  }
  return best;
}
export function newGame(count = 4) {
  const hands = deal(count);
  const lowest = Math.min(...hands.flat().map(c => c.id));
  return { hands, turn: hands.findIndex(h => h.some(c => c.id === lowest)), pile: [], lastPlayer: null, passed: [], requiredId: lowest, winner: null, move: 0, notice: 'Người có lá thấp nhất được đi trước.' };
}
export function takeTurn(game, player, cards) {
  if (game.winner !== null || game.turn !== player) return { error: 'Chưa đến lượt của bạn.' };
  if (cards.length && (!cards.every(c => game.hands[player].some(h => h.id === c.id)) || new Set(cards.map(c => c.id)).size !== cards.length)) return { error: 'Bài được chọn không hợp lệ.' };
  if (cards.length && game.requiredId !== null && !cards.some(c => c.id === game.requiredId)) return { error: 'Lượt đầu phải có lá bài thấp nhất trên bàn.' };
  if (cards.length && !canBeat(cards, game.pile)) return { error: 'Bộ bài chưa hợp lệ hoặc chưa lớn hơn bài trên bàn.' };
  if (!cards.length && !game.pile.length) return { error: 'Bạn đang mở vòng mới, hãy đánh bài.' };
  const next = { ...game, hands: game.hands.map(h => [...h]), passed: [...game.passed], move: game.move + 1 };
  if (cards.length) {
    next.hands[player] = next.hands[player].filter(c => !cards.some(v => v.id === c.id));
    next.pile = sortCards(cards); next.lastPlayer = player; next.requiredId = null;
    next.notice = `${player === 0 ? 'Bạn' : `Người chơi ${player + 1}`} vừa đánh ${cards.length} lá.`;
    if (!next.hands[player].length) { next.winner = player; return { game: next }; }
  } else { next.passed.push(player); next.notice = `${player === 0 ? 'Bạn' : `Người chơi ${player + 1}`} bỏ lượt.`; }
  let turn = (player + 1) % next.hands.length;
  while (next.passed.includes(turn)) turn = (turn + 1) % next.hands.length;
  if (turn === next.lastPlayer) { next.pile = []; next.passed = []; next.notice = 'Vòng mới! Người thắng vòng được ra bài trước.'; }
  next.turn = turn;
  return { game: next };
}
