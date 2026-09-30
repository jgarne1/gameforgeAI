const crypto = require('node:crypto');

// Play chips belong to the server-side FamilyWire identity, never the device or name.
function createChipWallet(db, { startingChips = 1000, now = Date.now } = {}) {
  if (!Number.isSafeInteger(startingChips) || startingChips <= 0) throw new Error('Invalid starting chips');
  db.exec(`CREATE TABLE IF NOT EXISTS chip_accounts (
    user_id TEXT PRIMARY KEY,
    balance INTEGER NOT NULL CHECK(balance >= 0),
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chip_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS chip_ledger_reference ON chip_ledger(reason, reference, user_id)
    WHERE reference IS NOT NULL;`);

  function transaction(work) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = work(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function account(userId) {
    if (typeof userId !== 'string' || !/^[a-f0-9-]{36}$/i.test(userId)) throw new Error('Invalid user');
    return transaction(() => {
      const existing = db.prepare('SELECT balance FROM chip_accounts WHERE user_id=?').get(userId);
      if (existing) return { balance: existing.balance, startingChips };
      const time = now();
      db.prepare('INSERT INTO chip_accounts(user_id,balance,updated_at) VALUES (?,?,?)').run(userId, startingChips, time);
      db.prepare('INSERT INTO chip_ledger(id,user_id,delta,reason,reference,created_at) VALUES (?,?,?,?,?,?)')
        .run(crypto.randomUUID(), userId, startingChips, 'initial', null, time);
      return { balance: startingChips, startingChips };
    });
  }
  function reset(userId) {
    account(userId);
    return transaction(() => {
      const current = db.prepare('SELECT balance FROM chip_accounts WHERE user_id=?').get(userId).balance;
      if (current !== 0) return { balance: current, startingChips, reset: false };
      const hasGames = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='fw_games'").get();
      const committed = hasGames && db.prepare("SELECT g.state FROM fw_games g JOIN fw_game_players p ON p.game_id=g.id WHERE g.kind='poker' AND g.status!='closed' AND p.user_id=?").all(userId)
        .some(row => { const seat = JSON.parse(row.state).seats.find(item => item.userId === userId); return seat && (seat.stack > 0 || seat.total > 0); });
      if (committed) throw new Error('Cash out of poker before resetting chips');
      const time = now();
      db.prepare('UPDATE chip_accounts SET balance=?,updated_at=? WHERE user_id=?').run(startingChips, time, userId);
      db.prepare('INSERT INTO chip_ledger(id,user_id,delta,reason,reference,created_at) VALUES (?,?,?,?,?,?)')
        .run(crypto.randomUUID(), userId, startingChips-current, 'manual-reset', null, time);
      return { balance: startingChips, startingChips, reset: true };
    });
  }
  return { account, reset };
}

module.exports = { createChipWallet };
