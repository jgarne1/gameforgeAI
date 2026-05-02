```js
// ==========================================================
// GameForge AI SERVER
// ==========================================================
// MAINTAINER NOTES FOR FUTURE AI CHATS:
//
// - ALWAYS update comments when behavior changes
// - Keep comments meaningful (no obvious comments)
// - DO NOT break:
//   - account system
//   - room system
//   - websocket flow
//   - iframe game contract
//
// - Multiplayer games MUST:
//   sendMove({ type:'state', state })
//   and handle:
//   window.onMove(data)
//
// - Server is now authoritative for:
//   - room gameState
//   - versioning
//   - reconnect sync
//
// - Future:
//   - move to DB AFTER interactions stabilize
//   - add player market system (coins/items trading)
// ==========================================================

const express=require('express');
const fs=require('fs');
const path=require('path');
const http=require('http');
const WebSocket=require('ws');

const app=express();
const server=http.createServer(app);
const wss=new WebSocket.Server({server});
const PORT=process.env.PORT||3000;

// ================= FILE SETUP =================

const DATA=path.join(__dirname,'data');
if(!fs.existsSync(DATA))fs.mkdirSync(DATA,{recursive:true});

const usersFile=path.join(DATA,'users.json');
const adminsFile=path.join(DATA,'admins.json');
const petsFile=path.join(DATA,'pets.json');
const movesFile=path.join(DATA,'pet_moves.json');
const gamesFile=path.join(__dirname,'games.json');

app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
app.use('/games',express.static(path.join(__dirname,'games')));

// ================= HELPERS =================

function readJSON(f,fb){
  try{return JSON.parse(fs.readFileSync(f,'utf8'))}
  catch(e){return fb}
}

function writeJSON(f,o){
  fs.writeFileSync(f,JSON.stringify(o,null,2));
}

function games(){return readJSON(gamesFile,[])}
function users(){return readJSON(usersFile,{})}
function pets(){return readJSON(petsFile,{})}

function admins(){
  let a=readJSON(adminsFile,[]);
  return Array.isArray(a)?a:(a.admins||[]);
}

// ================= ROOMS =================

// 🔥 IMPORTANT: In-memory authoritative game state
const rooms={};
const clients=new Set();

function id(n=4){
  return Math.random().toString(36).slice(2,2+n).toUpperCase();
}

// ================= PRESENCE =================

function presence(){
  return [...clients].filter(c=>c.username).map(c=>({
    username:c.username,
    location:c.location||'Home',
    roomId:c.roomId||'',
    privateRoom:c.roomId&&rooms[c.roomId]?!!rooms[c.roomId].private:false
  }));
}

function broadcast(obj){
  let s=JSON.stringify(obj);
  clients.forEach(c=>{
    if(c.readyState===1)c.send(s);
  });
}

function broadcastRoom(roomId,obj){
  let s=JSON.stringify(obj);
  clients.forEach(c=>{
    if(c.readyState===1&&c.roomId===roomId)c.send(s);
  });
}

function pushPresence(){
  broadcast({
    type:'presence',
    users:presence(),
    rooms:Object.values(rooms).filter(r=>!r.closed)
  });
}

// ================= ROOM PUBLIC VIEW =================

function roomPublic(r){
  return {
    id:r.id,
    owner:r.owner,
    private:!!r.private,
    closed:!!r.closed,
    selectedGame:r.selectedGame,
    started:r.started,
    seats:r.seats,
    players:r.players,
    chat:r.chat.slice(-50)
  };
}

// ================= API =================

app.get('/api/games',(req,res)=>res.json(games()));

// ================= WEBSOCKET =================

wss.on('connection',ws=>{
  clients.add(ws);
  ws.location='Home';

  ws.on('message',raw=>{
    let m;
    try{m=JSON.parse(raw)}catch(e){return}

    // ===== HELLO =====
    if(m.type==='hello'){
      ws.username=m.username||'';
      pushPresence();
    }

    // ===== CREATE ROOM =====
    if(m.type==='createRoom'){
      let rid=id();

      rooms[rid]={
        id:rid,
        owner:ws.username||'Guest',
        private:!!m.private,
        closed:false,
        selectedGame:null,
        started:false,
        seats:[],
        players:[],
        chat:[],

        // 🔥 GAME STATE SYSTEM
        gameState:null,
        gameVersion:0,
        gameUpdatedAt:0
      };

      ws.roomId=rid;
      rooms[rid].players.push(ws.username||'Guest');

      ws.send(JSON.stringify({type:'roomJoined',room:roomPublic(rooms[rid])}));
      pushPresence();
    }

    // ===== JOIN ROOM =====
    if(m.type==='joinRoom'){
      let r=rooms[String(m.roomId||'').toUpperCase()];

      if(!r||r.closed){
        ws.send(JSON.stringify({type:'error',message:'Room not found'}));
        return;
      }

      ws.roomId=r.id;

      let name=ws.username||'Guest';
      if(!r.players.includes(name))r.players.push(name);

      ws.send(JSON.stringify({type:'roomJoined',room:roomPublic(r)}));

      // 🔥 SEND CURRENT GAME STATE (IMPORTANT)
      if(r.gameState){
        ws.send(JSON.stringify({
          type:'gameMove',
          data:{type:'state',state:r.gameState},
          version:r.gameVersion
        }));
      }

      broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)});
      pushPresence();
    }

    // ===== SELECT GAME =====
    if(m.type==='selectGame'){
      let r=rooms[ws.roomId];
      let g=games().find(x=>x.id===m.gameId);

      if(r&&g){
        r.selectedGame=g;
        r.started=false;
        r.seats=Array(g.seats).fill(null);

        // 🔥 RESET GAME STATE
        r.gameState=null;
        r.gameVersion=0;
        r.gameUpdatedAt=0;

        broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)});
        pushPresence();
      }
    }

    // ===== START GAME =====
    if(m.type==='startGame'){
      let r=rooms[ws.roomId];

      if(r&&r.owner===(ws.username||'Guest')&&r.selectedGame){
        r.started=true;

        // 🔥 RESET STATE FOR NEW MATCH
        r.gameState=null;
        r.gameVersion=0;
        r.gameUpdatedAt=Date.now();

        broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)});
        pushPresence();
      }
    }

    // ===== GAME MOVE =====
    if(m.type==='gameMove'){
      let r=rooms[ws.roomId];

      if(r){
        ws.location='Game';

        // 🔥 STORE STATE
        if(m.data && m.data.type === 'state'){
          r.gameState = m.data.state;
          r.gameVersion++;
          r.gameUpdatedAt = Date.now();
        }

        broadcastRoom(r.id,{
          type:'gameMove',
          data:m.data,
          from:ws.username,
          version:r.gameVersion
        });

        pushPresence();
      }
    }

    // ===== CHAT =====
    if(m.type==='chat'){
      let r=rooms[ws.roomId];

      if(r&&m.text){
        let item={
          user:ws.username||'Guest',
          text:String(m.text).slice(0,300),
          time:Date.now()
        };

        r.chat.push(item);
        broadcastRoom(r.id,{type:'chat',chat:r.chat.slice(-50)});
      }
    }

  });

  ws.on('close',()=>{
    clients.delete(ws);
    pushPresence();
  });
});

// ================= START =================

server.listen(PORT,()=>console.log('GameForge running on '+PORT));
```
