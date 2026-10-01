const crypto = require('node:crypto');

const COLUMNS = 7;
const ROWS = 6;
const emptyBoard = () => Array(COLUMNS * ROWS).fill(null);
const index = (row, column) => row * COLUMNS + column;

function drop(board, column, player) {
  if (!Array.isArray(board) || board.length !== COLUMNS * ROWS ||
      !Number.isInteger(column) || column < 0 || column >= COLUMNS || !player) {
    throw new Error('Invalid Connect Four move');
  }
  const next = board.slice();
  for (let row = ROWS - 1; row >= 0; row--) {
    if (next[index(row, column)] !== null) continue;
    next[index(row, column)] = player;
    const winner = hasFour(next, row, column, player) ? player : null;
    return { board: next, row, column, winner, draw: !winner && next.every(Boolean) };
  }
  throw new Error('Column is full');
}

function hasFour(board, row, column, player) {
  return [[1, 0], [0, 1], [1, 1], [1, -1]].some(([dr, dc]) => {
    let count = 1;
    for (const sign of [-1, 1]) {
      for (let step = 1; step < 4; step++) {
        const r = row + dr * step * sign, c = column + dc * step * sign;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLUMNS || board[index(r, c)] !== player) break;
        count++;
      }
    }
    return count >= 4;
  });
}

function createConnectFourStore(db, { now = Date.now, canAccessChat, isOnline, onEvent = () => {}, pokerView = null }) {
  db.exec(`CREATE TABLE IF NOT EXISTS fw_games (
    id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL,
    state TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS fw_game_players (
    game_id TEXT NOT NULL, user_id TEXT NOT NULL, accepted INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(game_id,user_id)
  );
  CREATE TABLE IF NOT EXISTS fw_game_events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT, game_id TEXT NOT NULL, chat_id TEXT NOT NULL,
    kind TEXT NOT NULL, actor_id TEXT NOT NULL, detail TEXT, created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS fw_connect_four_scores (
    pair_key TEXT PRIMARY KEY, first_id TEXT NOT NULL, second_id TEXT NOT NULL,
    first_wins INTEGER NOT NULL DEFAULT 0, second_wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0
  );`);
  const transaction = work => { db.exec('BEGIN IMMEDIATE'); try { const value = work(); db.exec('COMMIT'); onEvent(); return value; } catch (error) { db.exec('ROLLBACK'); throw error; } };
  const players = id => db.prepare('SELECT user_id,accepted FROM fw_game_players WHERE game_id=? ORDER BY rowid').all(id).map(row => ({ ...row }));
  const game = id => db.prepare('SELECT * FROM fw_games WHERE id=?').get(id);
  const record = (id, chatId, kind, actor, detail = null) => db.prepare('INSERT INTO fw_game_events(game_id,chat_id,kind,actor_id,detail,created_at) VALUES (?,?,?,?,?,?)').run(id, chatId, kind, actor, detail === null ? null : JSON.stringify(detail), now());
  const pairKey = ids => ids.slice().sort().join(':');
  const scoreFor = ids => {
    const sorted = ids.slice().sort(), found = db.prepare('SELECT * FROM fw_connect_four_scores WHERE pair_key=?').get(pairKey(ids));
    return { [sorted[0]]: found?.first_wins || 0, [sorted[1]]: found?.second_wins || 0, draws: found?.draws || 0 };
  };
  function requirePlayer(id, userId) {
    const found = game(id);
    if (!found || !players(id).some(player => player.user_id === userId) || !canAccessChat(found.chat_id, userId)) throw new Error('Game access denied');
    return found;
  }
  function create(chatId, userId, targetId) {
    if (chatId === 'family' || userId === targetId || !canAccessChat(chatId, userId) || !canAccessChat(chatId, targetId)) throw new Error('Connect Four needs a private chat');
    const chatMembers = db.prepare('SELECT user_id FROM chat_members WHERE chat_id=?').all(chatId).map(row => row.user_id);
    if (chatMembers.length !== 2 || !chatMembers.includes(userId) || !chatMembers.includes(targetId)) throw new Error('Connect Four needs exactly two players');
    const chat = db.prepare('SELECT ended_at FROM chats WHERE id=?').get(chatId);
    if (!chat || chat.ended_at) throw new Error('Chat has ended');
    return transaction(() => {
      const existing = db.prepare("SELECT id FROM fw_games WHERE chat_id=? AND kind='connect4' AND status IN ('invited','active')").get(chatId);
      if (existing) throw new Error('A Connect Four game is already open here');
      const id = crypto.randomUUID(), time = now();
      const state = { board: emptyBoard(), turn: userId, moves: 0, winner: null, lastMove: null };
      db.prepare('INSERT INTO fw_games(id,chat_id,kind,status,state,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id, chatId, 'connect4', 'invited', JSON.stringify(state), time, time);
      db.prepare('INSERT INTO fw_game_players(game_id,user_id,accepted) VALUES (?,?,1)').run(id, userId);
      db.prepare('INSERT INTO fw_game_players(game_id,user_id,accepted) VALUES (?,?,0)').run(id, targetId);
      record(id, chatId, 'invite', userId);
      return { id };
    });
  }
  function accept(id, userId) {
    const current = requirePlayer(id, userId);
    if (current.status !== 'invited') throw new Error('Invitation is no longer open');
    const gamePlayers = players(id);
    if (gamePlayers.find(player => player.user_id === userId)?.accepted) throw new Error('Already accepted');
    if (!gamePlayers.every(player => isOnline(player.user_id))) throw new Error('Both players must be online to start');
    return transaction(() => {
      db.prepare('UPDATE fw_game_players SET accepted=1 WHERE game_id=? AND user_id=?').run(id, userId);
      db.prepare("UPDATE fw_games SET status='active',updated_at=? WHERE id=?").run(now(), id);
      record(id, current.chat_id, 'start', userId);
      return { id, status: 'active' };
    });
  }
  function move(id, userId, column, expectedMoves) {
    const current = requirePlayer(id, userId);
    if (current.status !== 'active') throw new Error('Game is not active');
    const state = JSON.parse(current.state), gamePlayers = players(id);
    if (state.turn !== userId) throw new Error('Wait for your turn');
    if (state.moves !== expectedMoves) throw new Error('Board changed; try again');
    const other = gamePlayers.find(player => player.user_id !== userId)?.user_id;
    if (!other) throw new Error('Opponent is missing');
    const result = drop(state.board, column, userId);
    const next = { ...state, board: result.board, turn: result.winner || result.draw ? null : other, moves: state.moves + 1, winner: result.winner, lastMove: { row: result.row, column: result.column } };
    return transaction(() => {
      db.prepare('UPDATE fw_games SET status=?,state=?,updated_at=? WHERE id=?').run(result.winner || result.draw ? 'finished' : 'active', JSON.stringify(next), now(), id);
      record(id, current.chat_id, result.winner ? 'win' : result.draw ? 'draw' : 'move', userId, { column, row: result.row });
      if (result.winner || result.draw) {
        const sorted = gamePlayers.map(player => player.user_id).sort();
        db.prepare('INSERT OR IGNORE INTO fw_connect_four_scores(pair_key,first_id,second_id) VALUES (?,?,?)').run(pairKey(sorted), ...sorted);
        const field = result.draw ? 'draws' : userId === sorted[0] ? 'first_wins' : 'second_wins';
        db.prepare(`UPDATE fw_connect_four_scores SET ${field}=${field}+1 WHERE pair_key=?`).run(pairKey(sorted));
      }
      return { id, state: next, status: result.winner || result.draw ? 'finished' : 'active' };
    });
  }
  function close(id, userId) {
    const current = requirePlayer(id, userId);
    if (current.status === 'closed') return { id, status: 'closed' };
    return transaction(() => {
      db.prepare("UPDATE fw_games SET status='closed',updated_at=? WHERE id=?").run(now(), id);
      record(id, current.chat_id, 'close', userId);
      return { id, status: 'closed' };
    });
  }
  function endForChat(chatId, actorId) {
    const rows = db.prepare("SELECT id FROM fw_games WHERE chat_id=? AND kind='connect4' AND status IN ('invited','active')").all(chatId);
    if (!rows.length) return 0;
    return transaction(() => {
      for (const row of rows) {
        db.prepare("UPDATE fw_games SET status='closed',updated_at=? WHERE id=?").run(now(), row.id);
        record(row.id, chatId, 'close', actorId);
      }
      return rows.length;
    });
  }
  function resetScore(id, userId) {
    const current = requirePlayer(id, userId), ids = players(id).map(player => player.user_id).sort();
    return transaction(() => {
      db.prepare('INSERT OR IGNORE INTO fw_connect_four_scores(pair_key,first_id,second_id) VALUES (?,?,?)').run(pairKey(ids), ...ids);
      db.prepare('UPDATE fw_connect_four_scores SET first_wins=0,second_wins=0,draws=0 WHERE pair_key=?').run(pairKey(ids));
      record(id, current.chat_id, 'score-reset', userId);
      return { id, score: scoreFor(ids) };
    });
  }
  function list(userId, after = 0) {
    const supported=new Set(['connect4','poker','checkers','eights']);
    const visibleKind=kind=>supported.has(kind)&&(kind==='connect4'||typeof pokerView==='function');
    const rows = db.prepare('SELECT g.* FROM fw_games g JOIN fw_game_players p ON p.game_id=g.id WHERE p.user_id=? ORDER BY g.updated_at DESC LIMIT 50').all(userId);
    const games = rows.filter(row => visibleKind(row.kind) && canAccessChat(row.chat_id, userId)).map(row => {
      const participants = players(row.id).map(player => ({ userId: player.user_id, accepted: !!player.accepted }));
      return { id: row.id, chatId: row.chat_id, kind: row.kind, status: row.status, state: ['poker','eights','checkers'].includes(row.kind) ? pokerView(JSON.parse(row.state), userId, row.kind, participants.map(p => p.userId)) : JSON.parse(row.state), players: participants, score: row.kind === 'connect4' ? scoreFor(participants.map(p => p.userId)) : null };
    });
    const eventRows = db.prepare('SELECT e.*, g.kind AS game_kind FROM fw_game_events e JOIN fw_games g ON g.id=e.game_id JOIN fw_game_players p ON p.game_id=e.game_id WHERE p.user_id=? AND e.seq>? ORDER BY e.seq LIMIT 100').all(userId, after);
    const events=eventRows.filter(row => visibleKind(row.game_kind) && canAccessChat(row.chat_id, userId)).map(row => ({ seq: row.seq, gameId: row.game_id, chatId: row.chat_id, kind: row.kind, actorId: row.actor_id, detail: row.detail ? JSON.parse(row.detail) : null, time: row.created_at }));
    return { games, events, cursor: eventRows.at(-1)?.seq || after };
  }
  function prune(cutoff) {
    const expired = db.prepare("SELECT id FROM fw_games WHERE updated_at<=? AND (status IN ('closed','finished') OR kind IN ('connect4','checkers','eights'))").all(cutoff);
    for (const row of expired) {
      db.prepare('DELETE FROM fw_game_events WHERE game_id=?').run(row.id);
      db.prepare('DELETE FROM fw_game_players WHERE game_id=?').run(row.id);
      db.prepare('DELETE FROM fw_games WHERE id=?').run(row.id);
    }
    return expired.length;
  }
  return { create, accept, move, close, endForChat, resetScore, list, scoreFor, prune };
}

module.exports = { COLUMNS, ROWS, emptyBoard, drop, createConnectFourStore };

