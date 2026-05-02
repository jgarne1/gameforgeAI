```js
// ==========================================================
// GameForge AI SERVER (PATCHED)
// ==========================================================
// Includes:
// - Real-time pet updates (WebSocket push)
// - Game state sync fix (state + battleState)
// - Minimum player enforcement before start
// - Marketplace system
//
// IMPORTANT:
// - Always update comments when modifying logic
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

const DATA=path.join(__dirname,'data');
if(!fs.existsSync(DATA))fs.mkdirSync(DATA,{recursive:true});

const usersFile=path.join(DATA,'users.json');
const petsFile=path.join(DATA,'pets.json');
const marketFile=path.join(DATA,'market.json');
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

function users(){return readJSON(usersFile,{})}
function pets(){return readJSON(petsFile,{})}
function market(){return readJSON(marketFile,{listings:{}})}
function games(){return readJSON(gamesFile,[])}

// ================= WEBSOCKET =================

const clients=new Set();
const rooms={};

function sendToUser(username,obj){
  clients.forEach(c=>{
    if(c.username===username && c.readyState===1){
      c.send(JSON.stringify(obj));
    }
  });
}

// ================= ROOMS =================

function broadcastRoom(roomId,obj){
  let s=JSON.stringify(obj);
  clients.forEach(c=>{
    if(c.readyState===1&&c.roomId===roomId)c.send(s);
  });
}

// ================= WEBSOCKET =================

wss.on('connection',ws=>{
  clients.add(ws);
  ws.location='Home';

  ws.on('message',raw=>{
    let m;
    try{m=JSON.parse(raw)}catch(e){return}

    if(m.type==='hello'){
      ws.username=m.username||'';
    }

    // ===== CREATE ROOM =====
    if(m.type==='createRoom'){
      let rid=Math.random().toString(36).slice(2,6).toUpperCase();

      rooms[rid]={
        id:rid,
        owner:ws.username,
        private:!!m.private,
        selectedGame:null,
        started:false,
        seats:[],
        players:[],
        chat:[],

        gameState:null,
        gameVersion:0
      };

      ws.roomId=rid;
      rooms[rid].players.push(ws.username);

      ws.send(JSON.stringify({type:'roomJoined',room:rooms[rid]}));
    }

    // ===== JOIN ROOM =====
    if(m.type==='joinRoom'){
      let r=rooms[m.roomId];
      if(!r)return;

      ws.roomId=r.id;
      if(!r.players.includes(ws.username))r.players.push(ws.username);

      ws.send(JSON.stringify({type:'roomJoined',room:r}));

      if(r.gameState){
        ws.send(JSON.stringify({
          type:'gameMove',
          data:{type:'state',state:r.gameState}
        }));
      }
    }

    // ===== SELECT GAME =====
    if(m.type==='selectGame'){
      let r=rooms[ws.roomId];
      let g=games().find(x=>x.id===m.gameId);

      if(r&&g){
        r.selectedGame=g;
        r.started=false;
        r.seats=Array(g.seats).fill(null);

        r.gameState=null;
        r.gameVersion=0;

        broadcastRoom(r.id,{type:'roomUpdate',room:r});
      }
    }

    // ===== START GAME =====
    if(m.type==='startGame'){
      let r=rooms[ws.roomId];

      if(r && r.owner===ws.username && r.selectedGame){

        let seated=r.seats.filter(Boolean).length;
        let minPlayers=r.selectedGame.minPlayers||1;

        if(seated<minPlayers){
          ws.send(JSON.stringify({
            type:'error',
            message:'Not enough players to start'
          }));
          return;
        }

        r.started=true;
        r.gameState=null;
        r.gameVersion=0;

        broadcastRoom(r.id,{type:'roomUpdate',room:r});
      }
    }

    // ===== GAME MOVE =====
    if(m.type==='gameMove'){
      let r=rooms[ws.roomId];

      if(r){
        if(m.data&&(m.data.type==='state'||m.data.type==='battleState')){
          r.gameState=m.data.state||m.data.battleState||m.data;
          r.gameVersion++;
        }

        broadcastRoom(r.id,{
          type:'gameMove',
          data:m.data
        });
      }
    }

  });

  ws.on('close',()=>clients.delete(ws));
});

// ================= PET API =================

app.post('/api/pet/update',(req,res)=>{
  let {username,profile}=req.body;

  let all=pets();
  all[username]=profile;
  writeJSON(petsFile,all);

  // 🔥 REAL-TIME UPDATE
  sendToUser(username,{
    type:'petUpdate',
    profile
  });

  res.json({ok:true});
});

// ================= MARKET =================

app.get('/api/market/list',(req,res)=>{
  res.json(market().listings);
});

app.post('/api/market/list',(req,res)=>{
  let {username,itemId,price,quantity}=req.body;

  let allPets=pets();
  let p=allPets[username];

  if(!p)return res.json({error:'No profile'});

  if((p.inventory[itemId]||0)<quantity){
    return res.json({error:'Not enough items'});
  }

  p.inventory[itemId]-=quantity;

  let mk=market();
  let id=Date.now().toString();

  mk.listings[id]={
    seller:username,
    itemId,
    price,
    quantity
  };

  writeJSON(marketFile,mk);
  writeJSON(petsFile,allPets);

  sendToUser(username,{type:'petUpdate',profile:p});

  res.json({ok:true});
});

app.post('/api/market/buy',(req,res)=>{
  let {username,id}=req.body;

  let mk=market();
  let listing=mk.listings[id];

  if(!listing)return res.json({error:'Listing missing'});

  let allPets=pets();
  let buyer=allPets[username];
  let seller=allPets[listing.seller];

  if(!buyer||!seller)return res.json({error:'Invalid users'});

  let total=listing.price*listing.quantity;

  if(buyer.money<total){
    return res.json({error:'Not enough money'});
  }

  buyer.money-=total;
  seller.money+=total;

  buyer.inventory[listing.itemId]=(buyer.inventory[listing.itemId]||0)+listing.quantity;

  delete mk.listings[id];

  writeJSON(petsFile,allPets);
  writeJSON(marketFile,mk);

  sendToUser(username,{type:'petUpdate',profile:buyer});
  sendToUser(listing.seller,{type:'petUpdate',profile:seller});

  res.json({ok:true});
});

// ================= START =================

server.listen(PORT,()=>console.log('Server running on '+PORT));
```
