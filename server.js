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
const adminsFile=path.join(DATA,'admins.json');
const petsFile=path.join(DATA,'pets.json');
const movesFile=path.join(DATA,'pet_moves.json');
const gamesFile=path.join(__dirname,'games.json');

app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
app.use('/games',express.static(path.join(__dirname,'games')));

/*
GameForge AI server maintainer notes for future AI chats/editors:
- Keep comments useful. Add, edit, or remove comments whenever behavior changes.
- Do not add comments that simply repeat obvious code.
- Preserve the account, room, WebSocket, iframe game, chat, and pet APIs unless the user explicitly asks to redesign them.
- Pets store move IDs only. Move definitions come from data/pet_moves.json or DEFAULT_MOVES fallback.
- Pet roster ownership, active pet switching, future gifting, future trading, and egg-help features must stay server-authoritative.
- Do not trust client-provided pet objects for ownership transfers or rewards.
*/

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
function moves(){return readJSON(movesFile,DEFAULT_MOVES)}

function admins(){
  let a=readJSON(adminsFile,[]);
  return Array.isArray(a)?a:(a.admins||[]);
}

const DEFAULT_MOVES={
  tackle:{name:'Tackle',type:'normal',category:'physical',power:30,accuracy:95,crit:5,description:'A reliable basic attack.'},
  quick_jab:{name:'Quick Jab',type:'normal',category:'physical',power:24,accuracy:100,crit:12,description:'A fast strike with a higher critical chance.'},
  guard_up:{name:'Guard Up',type:'earth',category:'status',power:0,accuracy:100,crit:0,status:{effect:'defense_up',chance:100,amount:2,duration:3},description:'Raises defense for a few turns.'},

  ember_nip:{name:'Ember Nip',type:'fire',category:'special',power:42,accuracy:90,crit:8,status:{effect:'burn',chance:25,duration:3},description:'A fiery bite that may burn.'},
  bubble_snap:{name:'Bubble Snap',type:'water',category:'special',power:40,accuracy:92,crit:6,status:{effect:'slow',chance:20,duration:2},description:'A snapping water burst that may slow.'},
  vine_bop:{name:'Vine Bop',type:'nature',category:'physical',power:38,accuracy:95,crit:7,status:{effect:'snare',chance:18,duration:2},description:'A vine strike that may snare.'},
  shadow_pounce:{name:'Shadow Pounce',type:'shadow',category:'physical',power:46,accuracy:86,crit:18,description:'A risky shadow attack with high critical chance.'},
  stone_bump:{name:'Stone Bump',type:'earth',category:'physical',power:44,accuracy:88,crit:5,status:{effect:'stun',chance:12,duration:1},description:'A heavy impact that may stun.'},

  dino_chomp:{name:'Dino Chomp',type:'earth',category:'physical',power:48,accuracy:88,crit:10,status:{effect:'defense_down',chance:18,amount:2,duration:3},description:'A heavy prehistoric bite that may lower defense.'},
  tail_thump:{name:'Tail Thump',type:'normal',category:'physical',power:36,accuracy:95,crit:5,status:{effect:'stun',chance:10,duration:1},description:'A solid tail hit with a small chance to stun.'},
  wing_gust:{name:'Wing Gust',type:'fire',category:'special',power:34,accuracy:96,crit:7,status:{effect:'slow',chance:18,duration:2},description:'A heated gust that may slow the target.'},
  flame_breath:{name:'Flame Breath',type:'fire',category:'special',power:52,accuracy:84,crit:9,status:{effect:'burn',chance:30,duration:3},description:'A powerful breath attack that may burn.'}
};

function safeUser(u){
  return {
    username:u.username,
    wins:u.wins||0,
    losses:u.losses||0,
    ties:u.ties||0,
    gamesPlayed:u.gamesPlayed||0,
    favoriteGame:u.favoriteGame||''
  };
}

function id(n=4){
  return Math.random().toString(36).slice(2,2+n).toUpperCase();
}

function petId(){
  return 'pet_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);
}

/*
Pet roster/social design:
- Accounts may own several pets, but only activePetId appears in PetWorld and Pet Battle.
- maxRoster is a short-term collection cap until true storage boxes are added.
- New eggs cost coins and scale slightly so collection feels meaningful without becoming spammy.
- Future gifting/trading should use originalOwner, previousOwners, and social locks.
*/
const PET_LIMITS={
  maxRoster:6,
  newEggBaseCost:75
};

const PET_PERSONALITIES=['playful','lazy','aggressive','calm','curious','moody'];

function randomPersonality(){
  return PET_PERSONALITIES[Math.floor(Math.random()*PET_PERSONALITIES.length)];
}

function createEggPet(username){
  let pid=petId();

  return {
    id:pid,
    owner:username,
    originalOwner:username,
    previousOwners:[],
    name:'Mystery Egg',
    stage:'egg',
    species:null,
    personality:null,
    affection:0,
    createdAt:Date.now(),
    lastUpdated:Date.now(),
    eggTraits:{warm:0,cold:0,wet:0,dry:0,light:0,dark:0},
    stats:{level:1,xp:0,hp:20,maxHp:20,attack:5,defense:4,speed:5},
    needs:{hunger:80,happiness:70,energy:80,cleanliness:90},
    moves:['tackle'],
    battle:{wins:0,losses:0},
    social:{
      tradeLockedUntil:0,
      giftLockedUntil:0,
      helpedBy:[]
    }
  };
}

function normalizePet(pet,username){
  if(!pet)return pet;

  pet.owner=pet.owner||username;
  pet.originalOwner=pet.originalOwner||pet.owner||username;
  pet.previousOwners=Array.isArray(pet.previousOwners)?pet.previousOwners:[];
  pet.affection=Number(pet.affection||0);
  pet.eggTraits=pet.eggTraits||{warm:0,cold:0,wet:0,dry:0,light:0,dark:0};
  pet.stats=pet.stats||{level:1,xp:0,hp:20,maxHp:20,attack:5,defense:4,speed:5};
  pet.needs=pet.needs||{hunger:80,happiness:70,energy:80,cleanliness:90};
  pet.moves=Array.isArray(pet.moves)&&pet.moves.length?pet.moves:['tackle'];
  pet.battle=pet.battle||{wins:0,losses:0};
  pet.social=pet.social||{};
  pet.social.helpedBy=Array.isArray(pet.social.helpedBy)?pet.social.helpedBy:[];
  pet.social.tradeLockedUntil=Number(pet.social.tradeLockedUntil||0);
  pet.social.giftLockedUntil=Number(pet.social.giftLockedUntil||0);

  return pet;
}

function normalizePetProfile(profile,username){
  profile.username=profile.username||username;
  profile.money=Number(profile.money||0);
  profile.inventory=profile.inventory||{};
  profile.pets=profile.pets||{};

  Object.keys(profile.pets).forEach(pid=>{
    normalizePet(profile.pets[pid],username);
  });

  let ids=Object.keys(profile.pets);

  if(!ids.length){
    let pet=createEggPet(username);
    profile.pets[pet.id]=pet;
    profile.activePetId=pet.id;
  }

  if(!profile.activePetId||!profile.pets[profile.activePetId]){
    profile.activePetId=Object.keys(profile.pets)[0];
  }

  return profile;
}

function petCount(profile){
  return Object.keys(profile.pets||{}).length;
}

function defaultPetProfile(username){
  let pet=createEggPet(username);

  return {
    username,
    money:100,
    activePetId:pet.id,
    inventory:{
      warm_pad:1,
      cool_cloth:1,
      mist_spray:1,
      dry_towel:1,
      berry:2,
      toy_ball:1
    },
    pets:{
      [pet.id]:pet
    }
  };
}

const PET_SPECIES={
  flarecub:{name:'Flarecub',type:'fire',emoji:'🔥',base:{hp:24,attack:7,defense:4,speed:5},moves:['tackle','ember_nip']},
  frostfin:{name:'Frostfin',type:'water',emoji:'💧',base:{hp:22,attack:5,defense:6,speed:6},moves:['tackle','bubble_snap']},
  leafbun:{name:'Leafbun',type:'nature',emoji:'🌿',base:{hp:26,attack:5,defense:6,speed:4},moves:['tackle','vine_bop']},
  shadepup:{name:'Shadepup',type:'shadow',emoji:'🌙',base:{hp:20,attack:7,defense:4,speed:7},moves:['tackle','shadow_pounce']},
  pebblet:{name:'Pebblet',type:'earth',emoji:'🪨',base:{hp:28,attack:5,defense:8,speed:3},moves:['tackle','stone_bump']},

  chompasaur:{name:'Chompasaur',type:'earth',emoji:'🦖',base:{hp:30,attack:8,defense:7,speed:3},moves:['tackle','dino_chomp']},
  emberwing:{name:'Emberwing',type:'fire',emoji:'🐉',base:{hp:24,attack:7,defense:5,speed:7},moves:['tackle','ember_nip','wing_gust']}
};

const SHOP_ITEMS={
  berry:{name:'Berry',price:10,description:'Restores hunger.',effect:{hunger:18}},
  sparkle_treat:{name:'Sparkle Treat',price:25,description:'Boosts happiness.',effect:{happiness:18}},
  soap:{name:'Bubble Soap',price:20,description:'Improves cleanliness.',effect:{cleanliness:25}},
  nap_blanket:{name:'Nap Blanket',price:30,description:'Restores energy.',effect:{energy:22}},
  warm_pad:{name:'Warm Pad',price:20,description:'Egg care: increases warmth.',eggTrait:{warm:3}},
  cool_cloth:{name:'Cool Cloth',price:20,description:'Egg care: increases cold.',eggTrait:{cold:3}},
  mist_spray:{name:'Mist Spray',price:20,description:'Egg care: increases wet.',eggTrait:{wet:3}},
  dry_towel:{name:'Dry Towel',price:20,description:'Egg care: increases dry.',eggTrait:{dry:3}},
  sun_lamp:{name:'Sun Lamp',price:35,description:'Egg care: increases light.',eggTrait:{light:4}},
  shade_cover:{name:'Shade Cover',price:35,description:'Egg care: increases dark.',eggTrait:{dark:4}}
};

function getPetProfile(username){
  let all=pets();

  if(!all[username]){
    all[username]=defaultPetProfile(username);
    writeJSON(petsFile,all);
    return all[username];
  }

  all[username]=normalizePetProfile(all[username],username);
  writeJSON(petsFile,all);

  return all[username];
}

function savePetProfile(username,profile){
  let all=pets();
  all[username]=normalizePetProfile(profile,username);
  writeJSON(petsFile,all);
}

function activePet(profile){
  return profile.pets[profile.activePetId];
}

function clamp(n,min,max){
  return Math.max(min,Math.min(max,n));
}

/*
Hatching is still partly deterministic from the older implementation.
Next server improvement should convert this to full weighted RNG where traits influence odds
without guaranteeing a species.
*/
function hatchSpecies(traits){
  let warm=traits.warm||0;
  let cold=traits.cold||0;
  let wet=traits.wet||0;
  let dry=traits.dry||0;
  let light=traits.light||0;
  let dark=traits.dark||0;

  let total=warm+cold+wet+dry+light+dark;
  let rareRoll=Math.random();

  if(total>=18){
    if(warm>=7&&light>=5&&rareRoll<0.45)return 'emberwing';
    if(dry>=7&&warm>=4&&rareRoll<0.45)return 'chompasaur';
  }

  if(warm>=cold&&warm>=wet&&light>=dark)return 'flarecub';
  if(cold>warm&&wet>=dry)return 'frostfin';
  if(wet>=dry&&light>=dark)return 'leafbun';
  if(dark>light&&dry>=wet)return 'shadepup';
  return 'pebblet';
}

function hatchPet(pet){
  let speciesKey=hatchSpecies(pet.eggTraits||{});
  let species=PET_SPECIES[speciesKey];

  pet.stage='baby';
  pet.species=speciesKey;
  pet.name=species.name;
  pet.emoji=species.emoji;
  pet.type=species.type;
  pet.personality=pet.personality||randomPersonality();
  pet.affection=Number(pet.affection||5);
  pet.stats.hp=species.base.hp;
  pet.stats.maxHp=species.base.hp;
  pet.stats.attack=species.base.attack;
  pet.stats.defense=species.base.defense;
  pet.stats.speed=species.base.speed;
  pet.moves=species.moves.slice(0,3);
  pet.lastUpdated=Date.now();

  return pet;
}

function requireUser(req,res){
  let username=String(req.query.user||req.body.username||'').trim();
  if(!username){
    res.status(400).json({error:'Missing user'});
    return null;
  }

  let u=users();
  if(!u[username]){
    res.status(404).json({error:'User not found'});
    return null;
  }

  return username;
}

/* ===== API ===== */

app.get('/api/games',(req,res)=>res.json(games()));

app.get('/api/pet/moves',(req,res)=>{
  res.json({ok:true,moves:moves()});
});

app.post('/api/register',(req,res)=>{
  let {username,password}=req.body;
  if(!username||!password)return res.json({error:'Missing fields'});

  username=String(username).trim();

  let u=users();
  if(u[username])return res.json({error:'User exists'});

  u[username]={username,password,wins:0,losses:0,ties:0,gamesPlayed:0,favoriteGame:''};
  writeJSON(usersFile,u);

  getPetProfile(username);

  res.json({ok:true,user:safeUser(u[username]),admin:admins().includes(username)});
});

app.post('/api/login',(req,res)=>{
  let {username,password}=req.body;
  let u=users();

  if(!u[username]||u[username].password!==password)return res.json({error:'Bad login'});

  getPetProfile(username);

  res.json({ok:true,user:safeUser(u[username]),admin:admins().includes(username)});
});

app.get('/api/admin/users',(req,res)=>{
  let user=req.query.user;
  if(!admins().includes(user))return res.status(403).json({error:'forbidden'});
  res.json(Object.values(users()).map(safeUser));
});

app.delete('/api/admin/users/:name',(req,res)=>{
  let user=req.query.user;
  if(!admins().includes(user))return res.status(403).json({error:'forbidden'});

  let u=users();
  delete u[req.params.name];
  writeJSON(usersFile,u);

  let p=pets();
  delete p[req.params.name];
  writeJSON(petsFile,p);

  res.json({ok:true});
});

app.get('/api/admin/rooms',(req,res)=>{
  let user=req.query.user;
  if(!admins().includes(user))return res.status(403).json({error:'forbidden'});
  res.json(Object.values(rooms).filter(r=>!r.closed).map(roomPublic));
});

app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));

/* ===== PET API ===== */

app.get('/api/pet/profile',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let profile=getPetProfile(username);

  res.json({
    ok:true,
    profile,
    species:PET_SPECIES,
    limits:PET_LIMITS,
    shop:SHOP_ITEMS,
    moves:moves()
  });
});

app.post('/api/pet/rename',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let profile=getPetProfile(username);
  let pet=activePet(profile);
  let name=String(req.body.name||'').trim().slice(0,24);

  if(!name)return res.json({error:'Missing name'});

  pet.name=name;
  pet.lastUpdated=Date.now();

  savePetProfile(username,profile);
  res.json({ok:true,profile});
});

app.post('/api/pet/care-egg',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let action=String(req.body.action||'');
  let profile=getPetProfile(username);
  let pet=activePet(profile);

  if(!pet||pet.stage!=='egg')return res.json({error:'Active pet is not an egg'});

  const actions={
    warm:{trait:'warm',amount:1,label:'kept the egg warm'},
    cold:{trait:'cold',amount:1,label:'cooled the egg'},
    wet:{trait:'wet',amount:1,label:'misted the egg'},
    dry:{trait:'dry',amount:1,label:'dried the egg'},
    light:{trait:'light',amount:1,label:'gave the egg light'},
    dark:{trait:'dark',amount:1,label:'kept the egg shaded'}
  };

  let a=actions[action];
  if(!a)return res.json({error:'Unknown egg care action'});

  pet.eggTraits[a.trait]=(pet.eggTraits[a.trait]||0)+a.amount;
  pet.needs.happiness=clamp((pet.needs.happiness||70)+1,0,100);
  pet.affection=clamp(Number(pet.affection||0)+1,0,100);
  pet.lastUpdated=Date.now();

  let total=Object.values(pet.eggTraits).reduce((x,y)=>x+y,0);
  let hatched=false;

  if(total>=18){
    hatchPet(pet);
    hatched=true;
  }

  savePetProfile(username,profile);

  res.json({
    ok:true,
    message:hatched?'Your egg hatched into '+pet.name+'!':'You '+a.label+'.',
    hatched,
    profile
  });
});

app.post('/api/pet/buy',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let itemId=String(req.body.itemId||'');
  let item=SHOP_ITEMS[itemId];

  if(!item)return res.json({error:'Unknown item'});

  let profile=getPetProfile(username);

  if((profile.money||0)<item.price)return res.json({error:'Not enough coins'});

  profile.money-=item.price;
  profile.inventory[itemId]=(profile.inventory[itemId]||0)+1;

  savePetProfile(username,profile);

  res.json({ok:true,profile});
});

app.post('/api/pet/use-item',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let itemId=String(req.body.itemId||'');
  let item=SHOP_ITEMS[itemId];

  if(!item)return res.json({error:'Unknown item'});

  let profile=getPetProfile(username);

  if((profile.inventory[itemId]||0)<=0)return res.json({error:'You do not have this item'});

  let pet=activePet(profile);

  if(item.eggTrait&&pet.stage!=='egg'){
    return res.json({error:'That item only works on eggs'});
  }

  profile.inventory[itemId]--;

  if(item.effect){
    Object.keys(item.effect).forEach(k=>{
      pet.needs[k]=clamp((pet.needs[k]||0)+item.effect[k],0,100);
    });

    pet.affection=clamp(Number(pet.affection||0)+1,0,100);
  }

  if(item.eggTrait){
    Object.keys(item.eggTrait).forEach(k=>{
      pet.eggTraits[k]=(pet.eggTraits[k]||0)+item.eggTrait[k];
    });

    pet.affection=clamp(Number(pet.affection||0)+1,0,100);

    let total=Object.values(pet.eggTraits).reduce((x,y)=>x+y,0);
    if(total>=18)hatchPet(pet);
  }

  pet.lastUpdated=Date.now();

  savePetProfile(username,profile);
  res.json({ok:true,profile});
});

app.post('/api/pet/play',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let profile=getPetProfile(username);
  let pet=activePet(profile);

  pet.needs.happiness=clamp((pet.needs.happiness||0)+12,0,100);
  pet.needs.energy=clamp((pet.needs.energy||0)-8,0,100);
  pet.stats.xp=(pet.stats.xp||0)+3;
  pet.affection=clamp(Number(pet.affection||0)+2,0,100);

  profile.money=(profile.money||0)+5;

  if(pet.stats.xp>=pet.stats.level*20){
    pet.stats.xp=0;
    pet.stats.level++;
    pet.stats.maxHp+=2;
    pet.stats.hp=pet.stats.maxHp;
    pet.stats.attack++;
  }

  pet.lastUpdated=Date.now();

  savePetProfile(username,profile);
  res.json({ok:true,profile});
});

app.post('/api/pet/set-active',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let selectedPetId=String(req.body.petId||'');
  let profile=getPetProfile(username);

  if(!profile.pets[selectedPetId]){
    return res.json({error:'Pet not found'});
  }

  profile.activePetId=selectedPetId;
  profile.pets[selectedPetId].lastUpdated=Date.now();

  savePetProfile(username,profile);
  res.json({ok:true,profile});
});

app.post('/api/pet/new-egg',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let profile=getPetProfile(username);

  if(petCount(profile)>=PET_LIMITS.maxRoster){
    return res.json({error:'Your roster is full. Storage will be added later.'});
  }

  let cost=PET_LIMITS.newEggBaseCost + Math.max(0,petCount(profile)-1)*25;

  if((profile.money||0)<cost){
    return res.json({error:'Not enough coins for a new egg. Cost: '+cost});
  }

  profile.money-=cost;

  let newPet=createEggPet(username);
  profile.pets[newPet.id]=newPet;
  profile.activePetId=newPet.id;

  savePetProfile(username,profile);

  res.json({
    ok:true,
    message:'You adopted a new Mystery Egg.',
    cost,
    profile
  });
});

/* ===== ROOM / WEBSOCKET ===== */

const rooms={};
const clients=new Set();

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

function presence(){
  return [...clients].filter(c=>c.username).map(c=>({
    username:c.username,
    location:c.location||'Home',
    roomId:c.roomId||'',
    gameId:c.gameId||'',
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
    rooms:Object.values(rooms).filter(r=>!r.closed).map(roomPublic)
  });
}

wss.on('connection',ws=>{
  clients.add(ws);
  ws.location='Home';

  ws.on('message',raw=>{
    let m;
    try{m=JSON.parse(raw)}catch(e){return}

    if(m.type==='hello'){
      ws.username=m.username||'';
      ws.location='Home';
      pushPresence();
    }

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
        chat:[]
      };

      ws.roomId=rid;
      ws.location='Room';
      rooms[rid].players.push(ws.username||'Guest');

      ws.send(JSON.stringify({type:'roomJoined',room:roomPublic(rooms[rid])}));
      pushPresence();
    }

    if(m.type==='joinRoom'){
      let r=rooms[String(m.roomId||'').toUpperCase()];

      if(!r||r.closed){
        ws.send(JSON.stringify({type:'error',message:'Room not found'}));
        return;
      }

      ws.roomId=r.id;
      ws.location='Room';

      let name=ws.username||'Guest';
      if(!r.players.includes(name))r.players.push(name);

      ws.send(JSON.stringify({type:'roomJoined',room:roomPublic(r)}));
      broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)});
      pushPresence();
    }

    if(m.type==='leaveRoom'){
      let r=rooms[ws.roomId];

      if(r){
        r.players=r.players.filter(p=>p!==(ws.username||'Guest'));
        r.seats=r.seats.map(s=>s&&s.name===(ws.username||'Guest')?null:s);
        broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)});
      }

      ws.roomId='';
      ws.location='Home';
      pushPresence();
    }

    if(m.type==='selectGame'){
      let r=rooms[ws.roomId];
      let g=games().find(x=>x.id===m.gameId);

      if(r&&g){
        r.selectedGame=g;
        r.started=false;
        r.seats=Array(g.seats).fill(null);
        broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r),scroll:'table'});
        pushPresence();
      }
    }

    if(m.type==='sit'){
      let r=rooms[ws.roomId];
      if(!r||!r.selectedGame)return;

      let seat=Number(m.seat);
      if(seat<0||seat>=r.seats.length)return;

      let name=ws.username||'Guest';

      r.seats=r.seats.map(s=>s&&s.name===name?null:s);

      if(!r.seats[seat])r.seats[seat]={name};

      broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)});
      pushPresence();
    }

    if(m.type==='stand'){
      let r=rooms[ws.roomId];

      if(r){
        let name=ws.username||'Guest';
        r.seats=r.seats.map(s=>s&&s.name===name?null:s);
        broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)});
        pushPresence();
      }
    }

    if(m.type==='startGame'){
      let r=rooms[ws.roomId];

      if(r&&r.owner===(ws.username||'Guest')&&r.selectedGame){
        r.started=true;
        broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r),scroll:'game'});
        pushPresence();
      }
    }

    if(m.type==='passOwner'){
      let r=rooms[ws.roomId];

      if(r&&r.owner===(ws.username||'Guest')&&m.to){
        r.owner=m.to;
        broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)});
        pushPresence();
      }
    }

    if(m.type==='closeRoom'){
      let r=rooms[ws.roomId];

      if(r&&(r.owner===(ws.username||'Guest')||admins().includes(ws.username))){
        r.closed=true;

        broadcastRoom(r.id,{type:'roomClosed'});

        clients.forEach(c=>{
          if(c.roomId===r.id){
            c.roomId='';
            c.location='Home';
          }
        });

        pushPresence();
      }
    }

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

    if(m.type==='gameMove'){
      let r=rooms[ws.roomId];

      if(r){
        ws.location='Game';
        broadcastRoom(r.id,{type:'gameMove',data:m.data,from:ws.username});
        pushPresence();
      }
    }

    if(m.type==='adminClose'){
      if(admins().includes(ws.username)){
        let r=rooms[m.roomId];

        if(r){
          r.closed=true;
          broadcastRoom(r.id,{type:'roomClosed'});
          pushPresence();
        }
      }
    }
  });

  ws.on('close',()=>{
    clients.delete(ws);
    pushPresence();
  });
});

server.listen(PORT,()=>console.log('GameForge running on '+PORT));
