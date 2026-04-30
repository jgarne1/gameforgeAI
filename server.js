const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GAMES_DIR = path.join(__dirname, 'games');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/games', express.static(GAMES_DIR));

const rooms = {}; // roomCode -> room
const sessions = {}; // token -> username

function readUsers(){
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}'); }
  catch { return {}; }
}
function writeUsers(users){ fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); }
function hashPassword(password, salt){ return crypto.createHash('sha256').update(password + salt).digest('hex'); }
function makeToken(){ return crypto.randomBytes(20).toString('hex'); }
function makeRoomCode(){ return crypto.randomBytes(3).toString('hex').toUpperCase(); }
function safeUsername(name){ return String(name || '').trim().replace(/[^a-zA-Z0-9_-]/g,'').slice(0,20); }
function getGames(){
  if (!fs.existsSync(GAMES_DIR)) return [];
  return fs.readdirSync(GAMES_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => ({ id: f, name: f.replace('.html','').replace(/[-_]/g,' ') }));
}
function publicRoom(room){
  if (!room) return null;
  return {
    code: room.code,
    owner: room.owner,
    players: room.players,
    seats: room.seats,
    selectedGame: room.selectedGame,
    started: room.started,
    closed: room.closed
  };
}
function broadcast(roomCode, payload){
  const room = rooms[roomCode];
  if (!room) return;
  const msg = JSON.stringify(payload);
  room.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}
function updateRoom(roomCode){
  const room = rooms[roomCode];
  if (room) broadcast(roomCode, { type:'room', room: publicRoom(room), games:getGames() });
}
function addStat(username, field){
  if (!username) return;
  const users = readUsers();
  if (!users[username]) return;
  users[username].stats[field] = (users[username].stats[field] || 0) + 1;
  writeUsers(users);
}

app.get('/api/games', (req,res)=> res.json({ games:getGames() }));

app.post('/api/signup', (req,res)=>{
  const username = safeUsername(req.body.username);
  const password = String(req.body.password || '');
  if (!username || password.length < 4) return res.json({ error:'Use a username and password with at least 4 characters.' });
  const users = readUsers();
  if (users[username]) return res.json({ error:'Username already exists.' });
  const salt = crypto.randomBytes(8).toString('hex');
  users[username] = { username, salt, pass: hashPassword(password, salt), stats:{ wins:0, losses:0, ties:0, gamesPlayed:0 }, favoriteGame:'' };
  writeUsers(users);
  const token = makeToken();
  sessions[token] = username;
  res.json({ token, username, stats: users[username].stats, favoriteGame:'' });
});

app.post('/api/login', (req,res)=>{
  const username = safeUsername(req.body.username);
  const password = String(req.body.password || '');
  const users = readUsers();
  const user = users[username];
  if (!user || user.pass !== hashPassword(password, user.salt)) return res.json({ error:'Invalid username or password.' });
  const token = makeToken();
  sessions[token] = username;
  res.json({ token, username, stats:user.stats, favoriteGame:user.favoriteGame || '' });
});

app.post('/api/logout', (req,res)=>{
  delete sessions[req.body.token];
  res.json({ ok:true });
});

app.get('/api/me', (req,res)=>{
  const token = req.query.token;
  const username = sessions[token];
  if (!username) return res.json({ user:null });
  const users = readUsers();
  const user = users[username];
  res.json({ user:{ username, stats:user.stats, favoriteGame:user.favoriteGame || '' } });
});

app.post('/api/favorite', (req,res)=>{
  const username = sessions[req.body.token];
  if (!username) return res.json({ error:'Not logged in.' });
  const users = readUsers();
  users[username].favoriteGame = String(req.body.game || '').slice(0,80);
  writeUsers(users);
  res.json({ ok:true });
});

app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'public','index.html')));

const server = app.listen(PORT, () => console.log('GameForge running on port ' + PORT));
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const username = sessions[msg.token] || msg.guestName || 'Guest';

    if (msg.type === 'createRoom') {
      const code = makeRoomCode();
      rooms[code] = { code, owner:username, players:[username], seats:{}, selectedGame:null, started:false, closed:false, clients:new Set([ws]) };
      ws.roomCode = code; ws.username = username;
      updateRoom(code);
      return;
    }

    if (msg.type === 'joinRoom') {
      const code = String(msg.roomCode || '').toUpperCase();
      const room = rooms[code];
      if (!room || room.closed) { ws.send(JSON.stringify({ type:'error', message:'Room not found or closed.' })); return; }
      ws.roomCode = code; ws.username = username;
      room.clients.add(ws);
      if (!room.players.includes(username)) room.players.push(username);
      updateRoom(code);
      return;
    }

    const room = rooms[ws.roomCode];
    if (!room || room.closed) return;
    const isOwner = room.owner === ws.username;

    if (msg.type === 'sit') {
      const seat = msg.seat === 'p2' ? 'p2' : 'p1';
      if (room.seats[seat] && room.seats[seat] !== ws.username) return;
      if (room.seats.p1 === ws.username) delete room.seats.p1;
      if (room.seats.p2 === ws.username) delete room.seats.p2;
      room.seats[seat] = ws.username;
      updateRoom(room.code);
      return;
    }

    if (msg.type === 'stand') {
      if (room.seats.p1 === ws.username) delete room.seats.p1;
      if (room.seats.p2 === ws.username) delete room.seats.p2;
      updateRoom(room.code);
      return;
    }

    if (msg.type === 'selectGame') {
      room.selectedGame = msg.game;
      room.started = false;
      updateRoom(room.code);
      return;
    }

    if (msg.type === 'startGame' && isOwner) {
      if (!room.selectedGame) return;
      room.started = true;
      room.players.forEach(p => addStat(p, 'gamesPlayed'));
      broadcast(room.code, { type:'startGame', game:room.selectedGame, room:publicRoom(room) });
      updateRoom(room.code);
      return;
    }

    if (msg.type === 'passOwner' && isOwner) {
      if (room.players.includes(msg.to)) room.owner = msg.to;
      updateRoom(room.code);
      return;
    }

    if (msg.type === 'closeRoom' && isOwner) {
      room.closed = true;
      broadcast(room.code, { type:'roomClosed' });
      room.clients.forEach(c => c.close());
      delete rooms[room.code];
      return;
    }

    if (msg.type === 'gameResult') {
      // Game can report: {winnerSeat:'p1'|'p2'|'tie'}
      const winnerSeat = msg.winnerSeat;
      const mySeat = room.seats.p1 === ws.username ? 'p1' : room.seats.p2 === ws.username ? 'p2' : '';
      if (winnerSeat === 'tie') addStat(ws.username, 'ties');
      else if (winnerSeat && mySeat) addStat(ws.username, winnerSeat === mySeat ? 'wins' : 'losses');
      return;
    }

    if (msg.type === 'move') {
      broadcast(room.code, { type:'move', from:ws.username, data:msg.data });
      return;
    }
  });

  ws.on('close', () => {
    const room = rooms[ws.roomCode];
    if (!room) return;
    room.clients.delete(ws);
    updateRoom(room.code);
  });
});
