const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA = path.join(__dirname, 'data');
const GAMES = path.join(__dirname, 'games');
const usersFile = path.join(DATA, 'users.json');
const adminsFile = path.join(DATA, 'admins.json');
const metaFile = path.join(DATA, 'game-meta.json');

function ensure(){ if(!fs.existsSync(DATA)) fs.mkdirSync(DATA); if(!fs.existsSync(GAMES)) fs.mkdirSync(GAMES); if(!fs.existsSync(usersFile)) fs.writeFileSync(usersFile,'{}'); if(!fs.existsSync(adminsFile)) fs.writeFileSync(adminsFile,'["admin"]'); if(!fs.existsSync(metaFile)) fs.writeFileSync(metaFile,'{}'); }
ensure();
function readJSON(file, fallback){ try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return fallback; } }
function writeJSON(file, data){ fs.writeFileSync(file, JSON.stringify(data,null,2)); }
function roomCode(){ return Math.random().toString(36).substring(2,6).toUpperCase(); }
function safeUser(u){ return String(u||'').trim().replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24); }
function isAdminName(u){ return readJSON(adminsFile,[]).includes(u); }

const rooms = {}; // code -> room
const presence = {}; // username -> {location, roomId, game, privateRoom, lastSeen}
const sockets = new Set();

function publicRoom(room){
  if(!room) return null;
  return { id:room.id, owner:room.owner, private:!!room.private, users:room.users, chat:room.chat.slice(-50), selectedGame:room.selectedGame, selectedMeta:room.selectedMeta, seats:room.seats, started:room.started, closed:room.closed };
}
function broadcastPresence(){
  const now=Date.now();
  Object.keys(presence).forEach(u=>{ if(now-presence[u].lastSeen>1000*60*10) delete presence[u]; });
  const list=Object.keys(presence).sort().map(username=>({username,...presence[username]}));
  broadcastAll({type:'presence', users:list});
}
function broadcastAll(obj){ const msg=JSON.stringify(obj); sockets.forEach(s=>{ if(s.readyState===1) s.send(msg); }); }
function broadcastRoom(roomId,obj){ const msg=JSON.stringify(obj); sockets.forEach(s=>{ if(s.readyState===1 && s.roomId===roomId) s.send(msg); }); }
function updatePresence(username, patch){ if(!username) return; presence[username]={...(presence[username]||{}),...patch,lastSeen:Date.now()}; broadcastPresence(); }
function roomUserList(room){ return Object.keys(room.users || {}); }

app.get('/api/games',(req,res)=>{
  const meta=readJSON(metaFile,{});
  const files=fs.readdirSync(GAMES).filter(f=>f.endsWith('.html'));
  res.json(files.map(file=>({file, name:(meta[file]&&meta[file].name)||file.replace('.html',''), minSeats:(meta[file]&&meta[file].minSeats)||2, maxSeats:(meta[file]&&meta[file].maxSeats)||2})));
});
app.get('/game/:file',(req,res)=>{
  const f=path.basename(req.params.file);
  const p=path.join(GAMES,f);
  if(!fs.existsSync(p)) return res.status(404).send('Game not found');
  res.sendFile(p);
});
app.post('/api/register',(req,res)=>{
  const username=safeUser(req.body.username); const password=String(req.body.password||'');
  if(!username || !password) return res.json({ok:false,error:'Username and password required'});
  const users=readJSON(usersFile,{});
  if(users[username]) return res.json({ok:false,error:'User already exists'});
  users[username]={password, stats:{wins:0,losses:0,ties:0,gamesPlayed:0}, favoriteGame:''};
  writeJSON(usersFile,users); updatePresence(username,{location:'Home', roomId:null, game:null, privateRoom:false});
  res.json({ok:true, username, admin:isAdminName(username)});
});
app.post('/api/login',(req,res)=>{
  const username=safeUser(req.body.username); const password=String(req.body.password||'');
  const users=readJSON(usersFile,{});
  if(!users[username] || users[username].password!==password) return res.json({ok:false,error:'Invalid login'});
  updatePresence(username,{location:'Home', roomId:null, game:null, privateRoom:false});
  res.json({ok:true, username, admin:isAdminName(username), stats:users[username].stats||{}});
});
app.post('/api/logout',(req,res)=>{ const username=safeUser(req.body.username); delete presence[username]; broadcastPresence(); res.json({ok:true}); });
app.get('/api/admin/users',(req,res)=>{
  const admin=safeUser(req.query.admin); if(!isAdminName(admin)) return res.status(403).json({error:'Admin only'});
  const users=readJSON(usersFile,{}); res.json(Object.keys(users).map(u=>({username:u, stats:users[u].stats||{}, favoriteGame:users[u].favoriteGame||'', admin:isAdminName(u)})));
});
app.delete('/api/admin/users/:username',(req,res)=>{
  const admin=safeUser(req.query.admin); if(!isAdminName(admin)) return res.status(403).json({error:'Admin only'});
  const target=safeUser(req.params.username); const users=readJSON(usersFile,{}); delete users[target]; writeJSON(usersFile,users); delete presence[target]; broadcastPresence(); res.json({ok:true});
});
app.get('/api/admin/rooms',(req,res)=>{
  const admin=safeUser(req.query.admin); if(!isAdminName(admin)) return res.status(403).json({error:'Admin only'});
  res.json(Object.values(rooms).filter(r=>!r.closed).map(publicRoom));
});
app.post('/api/admin/rooms/:id/close',(req,res)=>{
  const admin=safeUser(req.body.admin); if(!isAdminName(admin)) return res.status(403).json({error:'Admin only'});
  const r=rooms[req.params.id]; if(r){ r.closed=true; broadcastRoom(r.id,{type:'roomClosed'}); delete rooms[r.id]; broadcastPresence(); }
  res.json({ok:true});
});

wss.on('connection', ws=>{
  sockets.add(ws);
  ws.on('close',()=>{ sockets.delete(ws); });
  ws.on('message', raw=>{
    let msg; try{ msg=JSON.parse(raw); }catch{return;}
    const username=safeUser(msg.username || ws.username);
    if(username) ws.username=username;

    if(msg.type==='hello') { updatePresence(username,{location:'Home', roomId:null, game:null, privateRoom:false}); ws.send(JSON.stringify({type:'presence',users:Object.keys(presence).map(u=>({username:u,...presence[u]}))})); return; }

    if(msg.type==='createRoom'){
      const id=roomCode();
      rooms[id]={id, owner:username, private:!!msg.private, users:{[username]:{username}}, chat:[], selectedGame:null, selectedMeta:null, seats:[], started:false, closed:false};
      ws.roomId=id; updatePresence(username,{location:'Room',roomId:id,game:null,privateRoom:!!msg.private});
      ws.send(JSON.stringify({type:'roomJoined', room:publicRoom(rooms[id])}));
      broadcastPresence(); return;
    }
    if(msg.type==='joinRoom'){
      const id=String(msg.roomId||'').trim().toUpperCase(); const r=rooms[id];
      if(!r||r.closed){ ws.send(JSON.stringify({type:'error',error:'Room not found'})); return; }
      r.users[username]={username}; ws.roomId=id; updatePresence(username,{location:'Room',roomId:id,game:r.started?'Game':null,privateRoom:!!r.private});
      broadcastRoom(id,{type:'roomUpdate',room:publicRoom(r)}); broadcastPresence(); return;
    }
    if(msg.type==='leaveRoom'){
      const r=rooms[ws.roomId]; if(r){ delete r.users[username]; r.seats=(r.seats||[]).map(s=>s===username?null:s); if(r.owner===username) r.owner=roomUserList(r)[0]||''; broadcastRoom(r.id,{type:'roomUpdate',room:publicRoom(r)}); }
      ws.roomId=null; updatePresence(username,{location:'Home',roomId:null,game:null,privateRoom:false}); return;
    }
    const r=rooms[ws.roomId];
    if(!r) return;
    if(msg.type==='chat') { r.chat.push({user:username,text:String(msg.text||'').slice(0,300),time:Date.now()}); broadcastRoom(r.id,{type:'roomUpdate',room:publicRoom(r)}); return; }
    if(msg.type==='selectGame'){
      const meta=readJSON(metaFile,{}); const file=path.basename(msg.file); const m=meta[file]||{name:file,minSeats:2,maxSeats:2};
      r.selectedGame=file; r.selectedMeta=m; r.started=false; r.seats=Array(m.maxSeats||2).fill(null);
      broadcastRoom(r.id,{type:'roomUpdate',room:publicRoom(r)}); return;
    }
    if(msg.type==='sit'){
      const idx=Number(msg.index); if(!r.seats||idx<0||idx>=r.seats.length)return;
      r.seats=r.seats.map(s=>s===username?null:s); if(!r.seats[idx]) r.seats[idx]=username;
      broadcastRoom(r.id,{type:'roomUpdate',room:publicRoom(r)}); return;
    }
    if(msg.type==='stand') { r.seats=r.seats.map(s=>s===username?null:s); broadcastRoom(r.id,{type:'roomUpdate',room:publicRoom(r)}); return; }
    if(msg.type==='startGame'){
      if(r.owner!==username) return;
      if(!r.selectedGame) return;
      r.started=true; r.seats.filter(Boolean).forEach(u=> updatePresence(u,{location:'Game',roomId:r.id,game:r.selectedMeta&&r.selectedMeta.name,privateRoom:!!r.private}));
      broadcastRoom(r.id,{type:'roomUpdate',room:publicRoom(r)}); broadcastPresence(); return;
    }
    if(msg.type==='passOwner') { if(r.owner===username && r.users[msg.to]){ r.owner=msg.to; broadcastRoom(r.id,{type:'roomUpdate',room:publicRoom(r)});} return; }
    if(msg.type==='closeRoom') { if(r.owner===username){ r.closed=true; broadcastRoom(r.id,{type:'roomClosed'}); roomUserList(r).forEach(u=>updatePresence(u,{location:'Home',roomId:null,game:null,privateRoom:false})); delete rooms[r.id]; } return; }
    if(msg.type==='move') { broadcastRoom(r.id,{type:'move',data:msg.data,from:username}); return; }
  });
});

server.listen(PORT,()=>console.log('GameForge running on port '+PORT));
