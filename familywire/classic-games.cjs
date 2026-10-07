const crypto = require('node:crypto');
const { startEights, playEights, startCheckers, playCheckers, options } = require('./classic-rules.cjs');

const {startFamily,playFamily,familyView}=require('./family-rules.cjs');
const {startAlgebra,playAlgebra,algebraView}=require('./algebra-rules.cjs');
const kinds = new Set(['checkers', 'eights', 'signal', 'words', 'algebra']);

function createClassicGamesStore(db, { now = Date.now, canAccessChat, isOnline, onEvent = () => {} }) {
  const fleet=require('./fleet-duel.cjs').createFleetStore(db,{now,canAccessChat,onEvent});
  const game = id => db.prepare('SELECT * FROM fw_games WHERE id=?').get(id);
  const players = id => db.prepare('SELECT user_id,accepted FROM fw_game_players WHERE game_id=? ORDER BY rowid').all(id);
  const record = (row, kind, actor, detail = null) => db.prepare('INSERT INTO fw_game_events(game_id,chat_id,kind,actor_id,detail,created_at) VALUES (?,?,?,?,?,?)').run(row.id, row.chat_id, kind, actor, detail ? JSON.stringify(detail) : null, now());
  const transaction = work => { db.exec('BEGIN IMMEDIATE'); try { const result = work(); db.exec('COMMIT'); onEvent(); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } };
  function requirePlayer(id, userId) {
    const row = game(id);
    if (!row || !kinds.has(row.kind) || !players(id).some(item => item.user_id === userId) || !canAccessChat(row.chat_id, userId)) throw new Error('Game access denied');
    return row;
  }
  function create(kind, chatId, userId, targetIds) {
    if(kind==='fleet')return fleet.create(chatId,userId,targetIds);
    if (!kinds.has(kind) || chatId === 'family' || !Array.isArray(targetIds) || targetIds.length < 1 || targetIds.length > (kind === 'checkers' ? 1 : 3) || new Set([userId, ...targetIds]).size !== targetIds.length + 1) throw new Error('Choose eligible players');
    const ids = [userId, ...targetIds];
    const chat = db.prepare('SELECT ended_at FROM chats WHERE id=?').get(chatId);
    if (!chat || chat.ended_at || ids.some(id => !canAccessChat(chatId, id))) throw new Error('Use an active private or group chat');
    if (kind === 'checkers' && db.prepare('SELECT COUNT(*) AS n FROM chat_members WHERE chat_id=?').get(chatId).n !== 2) throw new Error('Checkers needs a two-person chat');
    return transaction(() => {
      if (db.prepare("SELECT id FROM fw_games WHERE chat_id=? AND kind=? AND status IN ('invited','active')").get(chatId, kind)) throw new Error('This game is already open here');
      const id = crypto.randomUUID(), time = now();
      db.prepare('INSERT INTO fw_games(id,chat_id,kind,status,state,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id, chatId, kind, 'invited', JSON.stringify({ turn: null, revision: 0 }), time, time);
      for (const [index, playerId] of ids.entries()) db.prepare('INSERT INTO fw_game_players(game_id,user_id,accepted) VALUES (?,?,?)').run(id, playerId, index === 0 ? 1 : 0);
      record({ id, chat_id: chatId }, `${kind}-invite`, userId);
      return { id };
    });
  }
  function add(id,userId,targetId){return transaction(()=>{const row=requirePlayer(id,userId),ps=players(id);if(!['eights','signal','words','algebra'].includes(row.kind))throw new Error('This is a two-player game');if(!['invited','finished'].includes(row.status))throw new Error('Invite players between rounds');if(ps.length>=4)throw new Error('All four places are filled');if(!canAccessChat(row.chat_id,targetId)||ps.some(p=>p.user_id===targetId))throw new Error('Choose another member of this chat');db.prepare('INSERT INTO fw_game_players(game_id,user_id,accepted) VALUES (?,?,0)').run(id,targetId);const revision=(JSON.parse(row.state).revision||0)+1;db.prepare("UPDATE fw_games SET status='invited',state=?,updated_at=? WHERE id=?").run(JSON.stringify({turn:null,revision}),now(),id);record(row,row.kind+'-invite',userId);return {id};});}
  function accept(id, userId) {
    const row = requirePlayer(id, userId);
    if (row.status !== 'invited') throw new Error('Invitation is no longer open');
    if (players(id).find(p => p.user_id === userId)?.accepted) throw new Error('Already accepted');
    return transaction(() => {
      db.prepare('UPDATE fw_game_players SET accepted=1 WHERE game_id=? AND user_id=?').run(id, userId);
      record(row, `${row.kind}-accept`, userId);
      return { id };
    });
  }
  function start(id, userId, body={}) {
    const row = requirePlayer(id, userId), ps = players(id);
    if (!['invited','finished'].includes(row.status) || ps.some(p => !p.accepted || !isOnline(p.user_id))) throw new Error('All players must join and be online');
    const ids = ps.map(p => p.user_id), state = row.kind === 'eights' ? startEights(ids) : row.kind === 'checkers' ? startCheckers(ids) : row.kind==='algebra'?startAlgebra(ids,body.difficulty||'foundations'):startFamily(row.kind,ids);
    if(row.status==='finished')state.revision=JSON.parse(row.state).revision+1;
    return transaction(() => {
      db.prepare("UPDATE fw_games SET status='active',state=?,updated_at=? WHERE id=?").run(JSON.stringify(state), now(), id);
      record(row, `${row.kind}-start`, userId);
      return { id };
    });
  }
  function act(id, userId, body) {
    if(game(id)?.kind==='fleet')return fleet.act(id,userId,body);
    const row = requirePlayer(id, userId);
    if (row.status !== 'active') throw new Error('Game is not active');
    const state = JSON.parse(row.state), ids = players(id).map(p => p.user_id);
    if (body.revision !== state.revision) throw new Error('Board changed; try again');
    const next = row.kind === 'eights' ? playEights(state, ids, userId, body.action, body.card, body.suit) : row.kind === 'checkers' ? playCheckers(state, ids, userId, body.from, body.to) : row.kind==='algebra'?playAlgebra(state,ids,userId,body):playFamily(row.kind,state,ids,userId,body);
    return transaction(() => {
      db.prepare('UPDATE fw_games SET status=?,state=?,updated_at=? WHERE id=?').run(next.winner ? 'finished' : 'active', JSON.stringify(next), now(), id);
      record(row, next.winner === 'draw' ? `${row.kind}-draw` : next.winner ? `${row.kind}-win` : `${row.kind}-turn`, userId, next.last);
      return { id, status: next.winner ? 'finished' : 'active' };
    });
  }
  function close(id, userId) {
    const row = requirePlayer(id, userId);
    if (row.status === 'closed') return { id, status: 'closed' };
    return transaction(() => {
      db.prepare("UPDATE fw_games SET status='closed',updated_at=? WHERE id=?").run(now(), id);
      record(row, `${row.kind}-close`, userId);
      return { id, status: 'closed' };
    });
  }
  function endForChat(chatId, actorId) {
    fleet.endForChat(chatId,actorId);
    const rows = db.prepare("SELECT * FROM fw_games WHERE chat_id=? AND kind IN ('checkers','eights','signal','words','algebra') AND status IN ('invited','active')").all(chatId);
    if (!rows.length) return;
    transaction(() => { for (const row of rows) { db.prepare("UPDATE fw_games SET status='closed',updated_at=? WHERE id=?").run(now(), row.id); record(row, `${row.kind}-close`, actorId); } });
  }
  function view(kind, state, userId, ids = []) {
    if(kind==='fleet')return fleet.view(state,userId,ids);
    if(kind==='algebra')return algebraView(state);
    if (kind === 'signal' || kind === 'words') return familyView(kind,state,userId,ids);
    if (kind === 'checkers') return { ...state, legal: state.turn === userId ? options(state.board, ids, userId, state.forcedFrom) : [] };
    if (kind !== 'eights') return state;
    const { hands = {}, deck = [], ...publicState } = state;
    return { ...publicState, hand: hands[userId] || [], counts: Object.fromEntries(Object.entries(hands).map(([id, cards]) => [id, cards.length])), deckCount: deck.length };
  }
  return { create, add, accept, start, act, close, endForChat, view };
}

module.exports = { createClassicGamesStore };
