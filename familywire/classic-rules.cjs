const crypto = require('node:crypto');

const ranks = 'A23456789TJQK';
const suits = 'CDHS';

function shuffledDeck() {
  const deck = [...suits].flatMap(suit => [...ranks].map(rank => rank + suit));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function startEights(ids) {
  if (ids.length < 2 || ids.length > 4) throw new Error('Crazy Eights needs 2–4 players');
  const deck = shuffledDeck(), count = ids.length === 2 ? 7 : 5;
  const hands = Object.fromEntries(ids.map(id => [id, deck.splice(0, count)]));
  let starter = deck.pop();
  while (starter[0] === '8') { deck.unshift(starter); starter = deck.pop(); }
  return { hands, deck, pile: [starter], suit: starter[1], turn: ids[0], revision: 0, winner: null, passes: 0, last: null };
}

function playEights(state, ids, userId, action, card, chosenSuit) {
  if (state.winner || state.turn !== userId) throw new Error('Wait for your turn');
  const hand = state.hands[userId], next = structuredClone(state);
  if (!hand || !ids.includes(userId)) throw new Error('Player is not at this table');
  if (action === 'play') {
    if (typeof card !== 'string' || !hand.includes(card)) throw new Error('Choose a card in your hand');
    const top = state.pile.at(-1);
    if (card[0] !== '8' && card[0] !== top[0] && card[1] !== state.suit) throw new Error('Match the rank or suit, or play an eight');
    if (card[0] === '8' && !suits.includes(chosenSuit)) throw new Error('Choose a suit for the eight');
    next.hands[userId].splice(next.hands[userId].indexOf(card), 1);
    next.pile.push(card); next.suit = card[0] === '8' ? chosenSuit : card[1];
    next.passes = 0;
    next.last = { kind: 'play', player: userId, card, suit: next.suit };
    if (!next.hands[userId].length) next.winner = userId;
  } else if (action === 'draw') {
    const top = state.pile.at(-1);
    if (hand.some(held => held[0] === '8' || held[0] === top[0] || held[1] === state.suit)) throw new Error('Play a matching card first');
    if (!next.deck.length) {
      const top = next.pile.pop();
      next.deck = next.pile.splice(0);
      for (let i = next.deck.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1); [next.deck[i], next.deck[j]] = [next.deck[j], next.deck[i]];
      }
      next.pile = [top];
    }
    if (next.deck.length) { next.hands[userId].push(next.deck.pop()); next.passes = 0; }
    else { next.passes = (next.passes || 0) + 1; if (next.passes >= ids.length) { const fewest = Math.min(...ids.map(id => next.hands[id].length)); const leaders = ids.filter(id => next.hands[id].length === fewest); next.winner = leaders.length === 1 ? leaders[0] : 'draw'; } }
    next.last = { kind: 'draw', player: userId };
  } else throw new Error('Invalid card action');
  next.turn = next.winner ? null : ids[(ids.indexOf(userId) + 1) % ids.length];
  next.revision++;
  return next;
}

const dark = (row, col) => (row + col) % 2 === 1;
const at = (row, col) => row * 8 + col;
function startCheckers(ids) {
  if (ids.length !== 2) throw new Error('Checkers needs two players');
  const board = Array(64).fill(null);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 8; col++) if (dark(row, col)) board[at(row, col)] = { player: ids[0], king: false };
  for (let row = 5; row < 8; row++) for (let col = 0; col < 8; col++) if (dark(row, col)) board[at(row, col)] = { player: ids[1], king: false };
  return { board, turn: ids[0], revision: 0, forcedFrom: null, winner: null, last: null };
}

function options(board, ids, player, onlyFrom = null) {
  const moves = [], jumps = [], side = ids.indexOf(player);
  for (let from = 0; from < 64; from++) {
    const piece = board[from]; if (!piece || piece.player !== player || (onlyFrom !== null && from !== onlyFrom)) continue;
    const row = Math.floor(from / 8), col = from % 8;
    for (const dr of piece.king ? [-1, 1] : [side === 0 ? 1 : -1]) for (const dc of [-1, 1]) {
      const r = row + dr, c = col + dc;
      if (r < 0 || r > 7 || c < 0 || c > 7) continue;
      const mid = at(r, c);
      if (!board[mid] && onlyFrom === null) moves.push({ from, to: mid, capture: null });
      if (!board[mid] || board[mid].player === player) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && !board[at(rr, cc)]) jumps.push({ from, to: at(rr, cc), capture: mid });
    }
  }
  return jumps.length ? jumps : onlyFrom === null ? moves : [];
}

function playCheckers(state, ids, userId, from, to) {
  if (state.winner || state.turn !== userId) throw new Error('Wait for your turn');
  const move = options(state.board, ids, userId, state.forcedFrom).find(item => item.from === from && item.to === to);
  if (!move) throw new Error('That move is not legal');
  const next = structuredClone(state), piece = next.board[from];
  next.board[from] = null; next.board[to] = piece;
  if (move.capture !== null) next.board[move.capture] = null;
  const row = Math.floor(to / 8);
  const promoted = !piece.king && (ids.indexOf(userId) === 0 ? row === 7 : row === 0);
  if (promoted) piece.king = true;
  const further = move.capture !== null && !promoted ? options(next.board, ids, userId, to) : [];
  next.forcedFrom = further.length ? to : null;
  if (!further.length) {
    const other = ids.find(id => id !== userId);
    next.turn = other;
    if (!options(next.board, ids, other).length) { next.winner = userId; next.turn = null; }
  }
  next.last = { from, to, capture: move.capture, promoted };
  next.revision++;
  return next;
}

module.exports = { startEights, playEights, startCheckers, playCheckers, options };

