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
const usersFile=path.join(DATA,'users.json');
const adminsFile=path.join(DATA,'admins.json');
const gamesFile=path.join(__dirname,'games.json');
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
app.use('/games',express.static(path.join(__dirname,'games')));
function readJSON(f,fb){try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return fb}}
function writeJSON(f,o){fs.writeFileSync(f,JSON.stringify(o,null,2))}
function games(){return readJSON(gamesFile,[])}
function users(){return readJSON(usersFile,{})}
function admins(){let a=readJSON(adminsFile,[]);return Array.isArray(a)?a:(a.admins||[])}
const rooms={}; const clients=new Set();
function id(n=4){return Math.random().toString(36).slice(2,2+n).toUpperCase()}
function safeUser(u){return {username:u.username,wins:u.wins||0,losses:u.losses||0,ties:u.ties||0,gamesPlayed:u.gamesPlayed||0,favoriteGame:u.favoriteGame||''}}
function roomPublic(r){return {id:r.id,owner:r.owner,private:!!r.private,closed:!!r.closed,selectedGame:r.selectedGame,started:r.started,seats:r.seats,players:r.players,chat:r.chat.slice(-50)}}
function presence(){return [...clients].filter(c=>c.username).map(c=>({username:c.username,location:c.location||'Home',roomId:c.roomId||'',gameId:c.gameId||'',privateRoom:c.roomId&&rooms[c.roomId]?!!rooms[c.roomId].private:false}))}
function broadcast(obj){let s=JSON.stringify(obj); clients.forEach(c=>{if(c.readyState===1)c.send(s)})}
function broadcastRoom(roomId,obj){let s=JSON.stringify(obj); clients.forEach(c=>{if(c.readyState===1&&c.roomId===roomId)c.send(s)})}
function pushPresence(){broadcast({type:'presence',users:presence(),rooms:Object.values(rooms).filter(r=>!r.closed).map(roomPublic)})}
app.get('/api/games',(req,res)=>res.json(games()));
app.post('/api/register',(req,res)=>{let {username,password}=req.body; if(!username||!password)return res.json({error:'Missing fields'}); username=String(username).trim(); let u=users(); if(u[username])return res.json({error:'User exists'}); u[username]={username,password,wins:0,losses:0,ties:0,gamesPlayed:0,favoriteGame:''}; writeJSON(usersFile,u); res.json({ok:true,user:safeUser(u[username]),admin:admins().includes(username)});});
app.post('/api/login',(req,res)=>{let {username,password}=req.body; let u=users(); if(!u[username]||u[username].password!==password)return res.json({error:'Bad login'}); res.json({ok:true,user:safeUser(u[username]),admin:admins().includes(username)});});
app.get('/api/admin/users',(req,res)=>{let user=req.query.user; if(!admins().includes(user))return res.status(403).json({error:'forbidden'}); res.json(Object.values(users()).map(safeUser));});
app.delete('/api/admin/users/:name',(req,res)=>{let user=req.query.user; if(!admins().includes(user))return res.status(403).json({error:'forbidden'}); let u=users(); delete u[req.params.name]; writeJSON(usersFile,u); res.json({ok:true});});
app.get('/api/admin/rooms',(req,res)=>{let user=req.query.user; if(!admins().includes(user))return res.status(403).json({error:'forbidden'}); res.json(Object.values(rooms).filter(r=>!r.closed).map(roomPublic));});
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
wss.on('connection',ws=>{clients.add(ws); ws.location='Home';
 ws.on('message',raw=>{let m; try{m=JSON.parse(raw)}catch(e){return}
  if(m.type==='hello'){ws.username=m.username||''; ws.location='Home'; pushPresence();}
  if(m.type==='createRoom'){let rid=id(); rooms[rid]={id:rid,owner:ws.username||'Guest',private:!!m.private,closed:false,selectedGame:null,started:false,seats:[],players:[],chat:[]}; ws.roomId=rid; ws.location='Room'; rooms[rid].players.push(ws.username||'Guest'); ws.send(JSON.stringify({type:'roomJoined',room:roomPublic(rooms[rid])})); pushPresence();}
  if(m.type==='joinRoom'){let r=rooms[String(m.roomId||'').toUpperCase()]; if(!r||r.closed){ws.send(JSON.stringify({type:'error',message:'Room not found'}));return} ws.roomId=r.id; ws.location='Room'; let name=ws.username||'Guest'; if(!r.players.includes(name))r.players.push(name); ws.send(JSON.stringify({type:'roomJoined',room:roomPublic(r)})); broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)}); pushPresence();}
  if(m.type==='leaveRoom'){let r=rooms[ws.roomId]; if(r){r.players=r.players.filter(p=>p!==(ws.username||'Guest')); r.seats=r.seats.map(s=>s&&s.name===(ws.username||'Guest')?null:s); broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)})} ws.roomId=''; ws.location='Home'; pushPresence();}
  if(m.type==='selectGame'){let r=rooms[ws.roomId]; let g=games().find(x=>x.id===m.gameId); if(r&&g){r.selectedGame=g; r.started=false; r.seats=Array(g.seats).fill(null); broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r),scroll:'table'}); pushPresence();}}
  if(m.type==='sit'){let r=rooms[ws.roomId]; if(!r||!r.selectedGame)return; let seat=Number(m.seat); if(seat<0||seat>=r.seats.length)return; let name=ws.username||'Guest'; r.seats=r.seats.map(s=>s&&s.name===name?null:s); if(!r.seats[seat])r.seats[seat]={name}; broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)}); pushPresence();}
  if(m.type==='stand'){let r=rooms[ws.roomId]; if(r){let name=ws.username||'Guest'; r.seats=r.seats.map(s=>s&&s.name===name?null:s); broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)}); pushPresence();}}
  if(m.type==='startGame'){let r=rooms[ws.roomId]; if(r&&r.owner===(ws.username||'Guest')&&r.selectedGame){r.started=true; broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r),scroll:'game'}); pushPresence();}}
  if(m.type==='passOwner'){let r=rooms[ws.roomId]; if(r&&r.owner===(ws.username||'Guest')&&m.to){r.owner=m.to; broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)}); pushPresence();}}
  if(m.type==='closeRoom'){let r=rooms[ws.roomId]; if(r&&(r.owner===(ws.username||'Guest')||admins().includes(ws.username))){r.closed=true; broadcastRoom(r.id,{type:'roomClosed'}); clients.forEach(c=>{if(c.roomId===r.id){c.roomId='';c.location='Home'}}); pushPresence();}}
  if(m.type==='chat'){let r=rooms[ws.roomId]; if(r&&m.text){let item={user:ws.username||'Guest',text:String(m.text).slice(0,300),time:Date.now()}; r.chat.push(item); broadcastRoom(r.id,{type:'chat',chat:r.chat.slice(-50)});}}
  if(m.type==='gameMove'){let r=rooms[ws.roomId]; if(r){ws.location='Game'; broadcastRoom(r.id,{type:'gameMove',data:m.data,from:ws.username}); pushPresence();}}
  if(m.type==='adminClose'){if(admins().includes(ws.username)){let r=rooms[m.roomId]; if(r){r.closed=true; broadcastRoom(r.id,{type:'roomClosed'}); pushPresence();}}}
 });
 ws.on('close',()=>{clients.delete(ws); pushPresence();});
});
server.listen(PORT,()=>console.log('GameForge running on '+PORT));
