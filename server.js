const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA, 'users.json');
const ADMINS_FILE = path.join(DATA, 'admins.json');
const GAMES_FILE = path.join(__dirname, 'games', '_games.json');

app.use(express.json());
app.use(express.static('public'));
app.use('/games', express.static('games'));

function readJson(file, fallback){ try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return fallback; } }
function writeJson(file, data){ fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, JSON.stringify(data,null,2)); }
function hash(pw){ return crypto.createHash('sha256').update(String(pw)).digest('hex'); }
function cleanUser(u){ return String(u||'').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,24); }
function isAdmin(username){ const a=readJson(ADMINS_FILE,{admins:[]}); return a.admins.includes(cleanUser(username)); }
function publicUser(username,u){ return {username, wins:u.wins||0, losses:u.losses||0, ties:u.ties||0, gamesPlayed:u.gamesPlayed||0, favoriteGame:u.favoriteGame||''}; }

const rooms = {}; // roomId -> {id, owner, users:{username:{name}}, chat:[], selectedGame, table:{gameId,seats,players,started}}
const sockets = new Map(); // ws -> {username, roomId}

function roomView(room){
  return {
    id: room.id,
    owner: room.owner,
    users: Object.keys(room.users),
    chat: room.chat.slice(-40),
    selectedGame: room.selectedGame,
    table: room.table
  };
}
function broadcast(roomId, msg){
  const text = JSON.stringify(msg);
  for (const [ws, meta] of sockets.entries()) {
    if (meta.roomId === roomId && ws.readyState === WebSocket.OPEN) ws.send(text);
  }
}
function getGames(){ return readJson(GAMES_FILE, {games:[]}).games; }
function getGame(id){ return getGames().find(g=>g.id===id); }
function makeRoomId(){ return Math.random().toString(36).slice(2,6).toUpperCase(); }

app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.get('/admin', (req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.get('/api/games', (req,res)=>res.json({games:getGames()}));

app.post('/api/create-account', (req,res)=>{
  const username = cleanUser(req.body.username);
  const password = String(req.body.password||'');
  if(!username || password.length<3) return res.status(400).json({error:'Use a username and password of at least 3 characters.'});
  const users = readJson(USERS_FILE,{});
  if(users[username]) return res.status(400).json({error:'User already exists.'});
  users[username] = { passwordHash: hash(password), wins:0, losses:0, ties:0, gamesPlayed:0, favoriteGame:'' };
  writeJson(USERS_FILE, users);
  res.json({user:publicUser(username,users[username]), admin:isAdmin(username)});
});

app.post('/api/login', (req,res)=>{
  const username = cleanUser(req.body.username);
  const password = String(req.body.password||'');
  const users = readJson(USERS_FILE,{});
  if(!users[username] || users[username].passwordHash !== hash(password)) return res.status(401).json({error:'Invalid login.'});
  res.json({user:publicUser(username,users[username]), admin:isAdmin(username)});
});

app.post('/api/create-room', (req,res)=>{
  const username = cleanUser(req.body.username) || 'guest';
  const id = makeRoomId();
  rooms[id] = { id, owner: username, users:{[username]:{name:username}}, chat:[], selectedGame:null, table:null };
  res.json({roomId:id});
});

app.get('/api/admin/users', (req,res)=>{
  if(!isAdmin(req.headers['x-user'])) return res.status(403).json({error:'Admin only.'});
  const users = readJson(USERS_FILE,{});
  res.json({users:Object.entries(users).map(([name,u])=>publicUser(name,u))});
});
app.delete('/api/admin/users/:username', (req,res)=>{
  if(!isAdmin(req.headers['x-user'])) return res.status(403).json({error:'Admin only.'});
  const username=cleanUser(req.params.username);
  if(isAdmin(username)) return res.status(400).json({error:'Do not delete admins from here.'});
  const users = readJson(USERS_FILE,{});
  delete users[username];
  writeJson(USERS_FILE, users);
  res.json({ok:true});
});
app.get('/api/admin/rooms', (req,res)=>{
  if(!isAdmin(req.headers['x-user'])) return res.status(403).json({error:'Admin only.'});
  res.json({rooms:Object.values(rooms).map(roomView)});
});
app.post('/api/admin/rooms/:roomId/close', (req,res)=>{
  if(!isAdmin(req.headers['x-user'])) return res.status(403).json({error:'Admin only.'});
  const id=String(req.params.roomId).toUpperCase();
  if(rooms[id]) { broadcast(id,{type:'closed'}); delete rooms[id]; }
  res.json({ok:true});
});

const server = app.listen(PORT, ()=>console.log('GameForge running on http://localhost:'+PORT));
const wss = new WebSocket.Server({server});

wss.on('connection', ws=>{
  sockets.set(ws, {username:'guest', roomId:null});
  ws.on('message', raw=>{
    let msg; try{ msg=JSON.parse(raw); }catch{return;}
    const meta=sockets.get(ws);
    const username=cleanUser(msg.username)||meta.username||'guest';

    if(msg.type==='joinRoom'){
      const roomId=String(msg.roomId||'').toUpperCase();
      if(!rooms[roomId]) return ws.send(JSON.stringify({type:'error', error:'Room not found.'}));
      meta.username=username; meta.roomId=roomId;
      rooms[roomId].users[username]={name:username};
      rooms[roomId].chat.push({system:true,text:username+' joined the room.'});
      broadcast(roomId,{type:'room', room:roomView(rooms[roomId])});
    }

    if(!meta.roomId || !rooms[meta.roomId]) return;
    const room=rooms[meta.roomId];

    if(msg.type==='chat'){
      const text=String(msg.text||'').slice(0,200);
      if(text){ room.chat.push({user:username,text}); broadcast(room.id,{type:'room',room:roomView(room)}); }
    }
    if(msg.type==='selectGame'){
      const game=getGame(msg.gameId); if(!game) return;
      room.selectedGame=game.id;
      room.table={gameId:game.id,seats:game.seats||2,players:Array(game.seats||2).fill(null),started:false};
      room.chat.push({system:true,text:username+' selected '+game.name+'. Sit at the table, then the owner starts.'});
      broadcast(room.id,{type:'room',room:roomView(room)});
    }
    if(msg.type==='sit'){
      if(!room.table) return;
      const idx=Number(msg.seat);
      if(idx<0 || idx>=room.table.seats) return;
      room.table.players=room.table.players.map(p=>p===username?null:p);
      if(!room.table.players[idx]) room.table.players[idx]=username;
      broadcast(room.id,{type:'room',room:roomView(room)});
    }
    if(msg.type==='stand'){
      if(room.table){ room.table.players=room.table.players.map(p=>p===username?null:p); broadcast(room.id,{type:'room',room:roomView(room)}); }
    }
    if(msg.type==='startGame'){
      if(room.owner!==username) return;
      if(!room.table) return;
      room.table.started=true;
      room.chat.push({system:true,text:'Game started.'});
      broadcast(room.id,{type:'room',room:roomView(room)});
      broadcast(room.id,{type:'startGame', table:room.table});
    }
    if(msg.type==='passOwner'){
      if(room.owner!==username) return;
      const target=cleanUser(msg.target);
      if(room.users[target]) { room.owner=target; room.chat.push({system:true,text:'Ownership passed to '+target+'.'}); broadcast(room.id,{type:'room',room:roomView(room)}); }
    }
    if(msg.type==='closeRoom'){
      if(room.owner!==username && !isAdmin(username)) return;
      broadcast(room.id,{type:'closed'}); delete rooms[room.id];
    }
    if(msg.type==='gameMove'){
      const payload=JSON.stringify({type:'gameMove', data:msg.data, from:username});
      for (const [client, m] of sockets.entries()) {
        if(client!==ws && m.roomId===room.id && client.readyState===WebSocket.OPEN) client.send(payload);
      }
    }
    if(msg.type==='gameResult'){
      const users=readJson(USERS_FILE,{});
      const result=msg.result; // {winner, loser, tieUsers, gameId}
      if(result && result.gameId){
        [result.winner,result.loser,...(result.tieUsers||[])].filter(Boolean).forEach(u=>{ if(users[u]) users[u].gamesPlayed=(users[u].gamesPlayed||0)+1; });
        if(result.winner && users[result.winner]) users[result.winner].wins=(users[result.winner].wins||0)+1;
        if(result.loser && users[result.loser]) users[result.loser].losses=(users[result.loser].losses||0)+1;
        (result.tieUsers||[]).forEach(u=>{ if(users[u]) users[u].ties=(users[u].ties||0)+1; });
        writeJson(USERS_FILE,users);
      }
    }
  });
  ws.on('close',()=>{
    const meta=sockets.get(ws); sockets.delete(ws);
    if(meta && meta.roomId && rooms[meta.roomId]){
      const room=rooms[meta.roomId];
      delete room.users[meta.username];
      if(room.table) room.table.players=room.table.players.map(p=>p===meta.username?null:p);
      if(room.owner===meta.username) room.owner=Object.keys(room.users)[0]||room.owner;
      room.chat.push({system:true,text:meta.username+' left.'});
      broadcast(room.id,{type:'room',room:roomView(room)});
    }
  });
});
