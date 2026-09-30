const crypto = require('node:crypto');

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = '23456789TJQKA';
function deck() {
  const cards = SUITS.flatMap(suit => [...RANKS].map((rank, index) => ({ rank: index + 2, suit })));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function compare(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
  }
  return 0;
}

function rankFive(cards) {
  if (!Array.isArray(cards) || cards.length !== 5) throw new Error('Five cards required');
  const values = cards.map(card => card.rank).sort((a, b) => b - a);
  const counts = new Map(); for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every(card => card.suit === cards[0].suit);
  const unique = [...new Set(values)]; if (unique.includes(14)) unique.push(1);
  let straight = 0;
  for (let i = 0; i <= unique.length - 5; i++) if (unique[i] - unique[i + 4] === 4) { straight = unique[i]; break; }
  if (flush && straight) return [8, straight];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]];
  if (flush) return [5, ...values];
  if (straight) return [4, straight];
  if (groups[0][1] === 3) return [3, groups[0][0], ...groups.slice(1).map(group => group[0]).sort((a, b) => b - a)];
  if (groups[0][1] === 2 && groups[1][1] === 2) return [2, Math.max(groups[0][0], groups[1][0]), Math.min(groups[0][0], groups[1][0]), groups[2][0]];
  if (groups[0][1] === 2) return [1, groups[0][0], ...groups.slice(1).map(group => group[0]).sort((a, b) => b - a)];
  return [0, ...values];
}

function bestSeven(cards) {
  if (!Array.isArray(cards) || cards.length !== 7) throw new Error('Seven cards required');
  let best;
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
    const five = cards.filter((_, index) => index !== a && index !== b);
    const score = rankFive(five);
    if (!best || compare(score, best) > 0) best = score;
  }
  return best;
}

function settle(players, board, pot) {
  const awards = Object.fromEntries(players.map(player => [player.userId, 0]));
  const levels = [...new Set(players.map(player => player.total).filter(Boolean))].sort((a, b) => a - b);
  let previous = 0;
  for (const level of levels) {
    const contributors = players.filter(player => player.total >= level);
    const amount = (level - previous) * contributors.length;
    const eligible = contributors.filter(player => !player.folded);
    if (!eligible.length) {
      // An unmatched high bet is returned to its contributors.
      for (const contributor of contributors) awards[contributor.userId] += level - previous;
      previous = level;
      continue;
    }
    const scores = eligible.map(player => ({ player, score: board.length === 5 ? bestSeven([...player.cards, ...board]) : [0] }));
    scores.sort((a, b) => compare(b.score, a.score));
    const winners = scores.filter(entry => compare(entry.score, scores[0].score) === 0)
      .sort((a, b) => players.indexOf(a.player) - players.indexOf(b.player));
    const share = Math.floor(amount / winners.length);
    winners.forEach((entry, index) => { awards[entry.player.userId] += share + (index < amount % winners.length ? 1 : 0); });
    previous = level;
  }
  if (Object.values(awards).reduce((a, b) => a + b, 0) !== pot) throw new Error('Poker pot did not balance');
  return awards;
}

module.exports = { deck, compare, rankFive, bestSeven, settle };
