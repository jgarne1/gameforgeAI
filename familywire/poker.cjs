const crypto = require('node:crypto');
const { deck: shuffledDeck, settle } = require('./poker-rules.cjs');

function createPokerStore(db, { now = Date.now, canAccessChat, isOnline, wallet, onEvent = () => {}, makeDeck = shuffledDeck }) {
  const get = id => db.prepare("SELECT * FROM fw_games WHERE id=? AND kind='poker'").get(id);
  const memberIds = chatId => db.prepare('SELECT user_id FROM chat_members WHERE chat_id=?').all(chatId).map(row => row.user_id);
  const tx = work => { if(db.isTransaction)return work();db.exec('BEGIN IMMEDIATE'); try { const value = work(); db.exec('COMMIT'); onEvent(); return value; } catch (error) { db.exec('ROLLBACK'); throw error; } };
  const event = (row, kind, actor, detail) => db.prepare('INSERT INTO fw_game_events(game_id,chat_id,kind,actor_id,detail,created_at) VALUES (?,?,?,?,?,?)')
    .run(row.id, row.chat_id, `poker-${kind}`, actor, detail ? JSON.stringify(detail) : null, now());
  const save = (row, status, state) => db.prepare('UPDATE fw_games SET status=?,state=?,updated_at=? WHERE id=?').run(status, JSON.stringify(state), now(), row.id);
  function requireSeat(id, userId) {
    const row = get(id);
    if (!row || !canAccessChat(row.chat_id, userId)) throw new Error('Game access denied');
    const state = JSON.parse(row.state);
    if (!state.seats.some(seat => seat.userId === userId)) throw new Error('Game access denied');
    return { row, state };
  }
  const playerIndex = (seats, id) => seats.findIndex(seat => seat.userId === id);
  const nextLive = (seats, from) => {
    for (let step = 1; step <= seats.length; step++) {
      const index = (from + step) % seats.length;
      if (!seats[index].folded && seats[index].stack > 0) return index;
    }
    return -1;
  };
  const totalPot = seats => seats.reduce((sum, seat) => sum + seat.total, 0);
  function contribute(seat, amount) {
    const paid = Math.min(seat.stack, amount);
    seat.stack -= paid; seat.round += paid; seat.total += paid;
    return paid;
  }
  function create(chatId, actorId, invitedIds) {
    const requested = [...new Set([actorId, ...(Array.isArray(invitedIds) ? invitedIds : [])])];
    if (chatId === 'family' || requested.length < 2 || requested.length > 4 || !requested.every(id => canAccessChat(chatId, id))) throw new Error('Poker needs 2–4 chat members');
    const chat = db.prepare('SELECT ended_at FROM chats WHERE id=?').get(chatId);
    if (!chat || chat.ended_at || !requested.every(id => memberIds(chatId).includes(id))) throw new Error('Poker chat is unavailable');
    return tx(() => {
      if (db.prepare("SELECT id FROM fw_games WHERE chat_id=? AND kind='poker' AND status IN ('invited','active','finished')").get(chatId)) throw new Error('A poker table is already open here');
      const id = crypto.randomUUID(), time = now();
      const state = { seats: requested.map(userId => ({ userId, accepted: userId === actorId, stack: 0, cards: [], folded: false, round: 0, total: 0, acted: false })), dealer: -1, hand: 0, phase: 'lobby', board: [], deck: [], pot: 0, currentBet: 0, turn: null, revision: 0, awards: null };
      db.prepare('INSERT INTO fw_games(id,chat_id,kind,status,state,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id, chatId, 'poker', 'invited', JSON.stringify(state), time, time);
      for (const seat of state.seats) db.prepare('INSERT INTO fw_game_players(game_id,user_id,accepted) VALUES (?,?,?)').run(id, seat.userId, seat.accepted ? 1 : 0);
      event({ id, chat_id: chatId }, 'invite', actorId);
      return { id };
    });
  }
  function accept(id, userId) {
    const { row, state } = requireSeat(id, userId);
    if (row.status !== 'invited') throw new Error('Invitation is no longer open');
    const seat = state.seats.find(item => item.userId === userId);
    if (seat.accepted) throw new Error('Already accepted');
    return tx(() => {
      seat.accepted = true; state.revision++;
      db.prepare('UPDATE fw_game_players SET accepted=1 WHERE game_id=? AND user_id=?').run(id, userId);
      save(row, 'invited', state); event(row, 'accept', userId);
      return { id, status: 'invited' };
    });
  }
  function add(id, actorId, targetId) {
    const { row, state } = requireSeat(id, actorId);
    if (!['invited', 'finished'].includes(row.status) || state.seats.length >= 4) throw new Error('Join between hands, up to four players');
    if (!canAccessChat(row.chat_id, targetId) || !memberIds(row.chat_id).includes(targetId) || state.seats.some(seat => seat.userId === targetId)) throw new Error('Choose another chat member');
    return tx(() => {
      state.seats.push({ userId: targetId, accepted: false, stack: 0, cards: [], folded: false, round: 0, total: 0, acted: false });
      state.revision++; save(row, 'invited', state);
      db.prepare('INSERT INTO fw_game_players(game_id,user_id,accepted) VALUES (?,?,0)').run(id, targetId);
      event(row, 'invite', actorId, { targetId }); return { id };
    });
  }
  function start(id, actorId) {
    const { row, state } = requireSeat(id, actorId);
    if (!['invited', 'finished'].includes(row.status) || state.seats.length < 2 || state.seats.length > 4 || !state.seats.every(seat => seat.accepted && isOnline(seat.userId))) throw new Error('All invited players must accept and be online');
    for (const seat of state.seats) if (!seat.stack) wallet.account(seat.userId);
    return tx(() => {
      for (const seat of state.seats) {
        if (seat.stack) continue;
        const account = db.prepare('SELECT balance FROM chip_accounts WHERE user_id=?').get(seat.userId);
        if (!account?.balance) throw new Error('A player needs chips or a reset');
        const buyin = Math.min(200, account.balance);
        db.prepare('UPDATE chip_accounts SET balance=balance-?,updated_at=? WHERE user_id=?').run(buyin, now(), seat.userId);
        db.prepare('INSERT INTO chip_ledger(id,user_id,delta,reason,reference,created_at) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), seat.userId, -buyin, 'poker-buyin', `${id}:${seat.userId}:${state.hand + 1}`, now());
        seat.stack = buyin;
      }
      const live = state.seats.filter(seat => seat.stack > 0);
      if (live.length < 2) throw new Error('Two players need chips');
      state.dealer = (state.dealer + 1) % state.seats.length;
      state.hand++; state.phase = 'preflop'; state.board = []; state.deck = makeDeck(); state.awards = null;
      for (const seat of state.seats) { seat.cards = [state.deck.pop(), state.deck.pop()]; seat.folded = seat.stack === 0; seat.round = 0; seat.total = 0; seat.acted = false; }
      const dealer = state.dealer;
      const small = live.length === 2 ? dealer : nextLive(state.seats, dealer);
      const big = nextLive(state.seats, small);
      contribute(state.seats[small], 10); contribute(state.seats[big], 20);
      state.currentBet = Math.max(...state.seats.map(seat => seat.round));
      state.turn = state.seats[nextLive(state.seats, big)]?.userId || null;
      state.pot = totalPot(state.seats); state.revision++;
      save(row, 'active', state); event(row, 'start', actorId, { hand: state.hand });
      return { id, status: 'active' };
    });
  }
  function advance(state) {
    const live = state.seats.filter(seat => !seat.folded);
    if (live.length === 1) return finish(state);
    if (live.every(seat => seat.stack === 0 || (seat.acted && seat.round === state.currentBet))) {
      if (state.phase === 'river') return finish(state);
      state.phase = { preflop: 'flop', flop: 'turn', turn: 'river' }[state.phase];
      state.deck.pop();
      for (let i = 0; i < (state.phase === 'flop' ? 3 : 1); i++) state.board.push(state.deck.pop());
      state.currentBet = 0;
      for (const seat of state.seats) { seat.round = 0; seat.acted = false; }
      state.turn = state.seats[nextLive(state.seats, state.dealer)]?.userId || null;
      if (!state.turn) return advance(state);
    }
    return false;
  }
  function finish(state) {
    while (state.board.length < 5 && state.seats.filter(seat => !seat.folded).length > 1) {
      state.deck.pop(); for (let i = 0; i < (state.board.length === 0 ? 3 : 1); i++) state.board.push(state.deck.pop());
    }
    state.awards = settle(state.seats, state.board, totalPot(state.seats));
    for (const seat of state.seats) { seat.stack += state.awards[seat.userId]; seat.total = 0; seat.round = 0; }
    state.pot = 0; state.turn = null; state.phase = 'finished'; return true;
  }
  function act(id, userId, kind, amount, revision) {
    const { row, state } = requireSeat(id, userId);
    if (row.status !== 'active' || state.turn !== userId || state.revision !== revision) throw new Error('Poker hand changed; refresh your turn');
    const seat = state.seats.find(item => item.userId === userId), due = Math.max(0, state.currentBet - seat.round);
    if (!['fold', 'check', 'call', 'raise'].includes(kind)) throw new Error('Invalid poker action');
    if (kind === 'check' && due) throw new Error('You need to call or fold');
    if (kind === 'raise' && (seat.stack < due + 20 || amount !== 20)) throw new Error('Raise requires 20 chips beyond the call');
    return tx(() => {
      if (kind === 'fold') seat.folded = true;
      else if (kind === 'call') contribute(seat, due);
      else if (kind === 'raise') {
        contribute(seat, due + 20);
        state.currentBet = seat.round;
        for (const other of state.seats) if (other !== seat && !other.folded && other.stack > 0) other.acted = false;
      }
      seat.acted = true;
      state.pot = totalPot(state.seats);
      const previousPhase = state.phase;
      let ended = advance(state);
      if (!ended && state.phase === previousPhase) {
        const next = nextLive(state.seats, playerIndex(state.seats, userId));
        state.turn = state.seats[next]?.userId || null;
        if (!state.turn) ended = advance(state);
      }
      state.revision++;
      save(row, ended ? 'finished' : 'active', state);
      event(row, ended ? 'result' : 'action', userId, { action: kind, phase: state.phase, amount: kind === 'raise' ? 20 : undefined });
      return { id, status: ended ? 'finished' : 'active' };
    });
  }
  function closeRow(row, state, userId) {
    if (row.status === 'closed') return { id: row.id, status: 'closed' };
    return tx(() => {
      // A mid-hand close cancels that hand: each player's committed chips return to their own stack.
      for (const seat of state.seats) {
        const amount = seat.stack + seat.total;
        if (amount) {
          db.prepare('UPDATE chip_accounts SET balance=balance+?,updated_at=? WHERE user_id=?').run(amount, now(), seat.userId);
          db.prepare('INSERT INTO chip_ledger(id,user_id,delta,reason,reference,created_at) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), seat.userId, amount, 'poker-cashout', `${row.id}:${seat.userId}`, now());
        }
        seat.stack = 0; seat.total = 0;
      }
      state.pot = 0; state.turn = null; state.phase = 'closed'; state.deck = []; state.revision++;
      save(row, 'closed', state); event(row, 'close', userId); return { id: row.id, status: 'closed' };
    });
  }
  function close(id, userId) {
    const { row, state } = requireSeat(id, userId);
    return closeRow(row, state, userId);
  }
  function endForChat(chatId, actorId) {
    for (const row of db.prepare("SELECT * FROM fw_games WHERE chat_id=? AND kind='poker' AND status!='closed'").all(chatId)) closeRow(row, JSON.parse(row.state), actorId);
  }
  function endForMember(userId,actorId){for(const row of db.prepare("SELECT g.* FROM fw_games g JOIN fw_game_players p ON p.game_id=g.id WHERE p.user_id=? AND g.kind='poker' AND g.status!='closed'").all(userId))closeRow(row,JSON.parse(row.state),actorId);}
  function expire(cutoff) {
    for (const row of db.prepare("SELECT * FROM fw_games WHERE kind='poker' AND status!='closed' AND updated_at<=?").all(cutoff)) closeRow(row, JSON.parse(row.state), 'system');
  }
  function view(state, userId) {
    const showdown = state.phase === 'finished' && state.board.length === 5;
    return { ...state, deck: undefined, seats: state.seats.map(seat => ({ ...seat, cards: seat.userId === userId || (showdown && !seat.folded) ? seat.cards : seat.cards.map(() => null) })) };
  }
  return { create, accept, add, start, act, close, endForChat, endForMember, expire, view };
}

module.exports = { createPokerStore };
