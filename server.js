const express=require('express');
const fs=require('fs');
const path=require('path');
const http=require('http');
const WebSocket=require('ws');

const app=express();
const server=http.createServer(app);
const wss=new WebSocket.Server({server});
const PORT=process.env.PORT||3000;

const REPO_DATA=path.join(__dirname,'data');
const PERSIST_ROOT=process.env.PERSIST_ROOT || path.join(__dirname,'persist');
const HAS_PERSIST=fs.existsSync(PERSIST_ROOT);
const DATA=HAS_PERSIST ? path.join(PERSIST_ROOT,'data') : REPO_DATA;
const UPLOADS_ROOT=HAS_PERSIST ? path.join(PERSIST_ROOT,'uploads') : path.join(__dirname,'uploads');

function ensurePersistentStorage(){
  fs.mkdirSync(DATA,{recursive:true});
  fs.mkdirSync(UPLOADS_ROOT,{recursive:true});

  if(!HAS_PERSIST){
    console.log('[storage] Persistent disk not detected. Using repo-local data.');
    return;
  }

  console.log('[storage] Persistent disk detected:',PERSIST_ROOT);
  console.log('[storage] Data path:',DATA);
  console.log('[storage] Uploads path:',UPLOADS_ROOT);

  const seedFiles=[
    'users.json',
    'admins.json',
    'pets.json',
    'market.json',
    'items.json',
    'shops.json',
    'pet_moves.json',
    'pet_species.json'
  ];

  seedFiles.forEach(file=>{
    const src=path.join(REPO_DATA,file);
    const dest=path.join(DATA,file);

    if(!fs.existsSync(dest)&&fs.existsSync(src)){
      fs.copyFileSync(src,dest);
      console.log('[storage] Seeded persistent data file:',file);
    }
  });
}

ensurePersistentStorage();

const usersFile=path.join(DATA,'users.json');
const adminsFile=path.join(DATA,'admins.json');
const petsFile=path.join(DATA,'pets.json');
const movesFile=path.join(DATA,'pet_moves.json');
const marketFile=path.join(DATA,'market.json');
const itemsFile=path.join(DATA,'items.json');
const shopsFile=path.join(DATA,'shops.json');
const gamesFile=path.join(__dirname,'games.json');
const petSpeciesFile=path.join(DATA,'pet_species.json');
const repoPetSpeciesFile=path.join(REPO_DATA,'pet_species.json');
const repoMovesFile=path.join(REPO_DATA,'pet_moves.json');

app.use(express.json({limit:'12mb'}));
app.use(express.static(path.join(__dirname,'public')));
app.use('/games',express.static(path.join(__dirname,'games')));
// Admin-uploaded image previews live here before approval. On Render this uses the persistent disk when mounted.
app.use('/uploads',express.static(UPLOADS_ROOT));

/*
GameForge AI server maintainer notes for future AI chats/editors:
- Keep comments useful. Add, edit, or remove comments whenever behavior changes.
- Preserve account, admin, room, WebSocket, iframe game, chat, marketplace, and pet APIs unless explicitly redesigning them.
- Pets store move IDs only. Move definitions come from data/pet_moves.json or DEFAULT_MOVES fallback.
- Pet progression, quests, exploration, rewards, roster ownership, future gifting/trading, and egg-help must stay server-authoritative.
- Do not add a generic client-side /api/pet/update that overwrites the whole pet profile. That is unsafe.
- Marketplace listings escrow items on the server when listed.
- Room gameState is in-memory for reconnect/late-join support. Games should send {type:'state',state} or {type:'battleState',state}.
- Real-time pet updates are pushed with WebSocket message {type:'petUpdate',profile} after server-side pet/profile mutations.
*/

function readJSON(f,fb){
  try{return JSON.parse(fs.readFileSync(f,'utf8'))}
  catch(e){return fb}
}

function writeJSON(f,o){
  fs.writeFileSync(f,JSON.stringify(o,null,2));
}

function stableJSONString(o){
  return JSON.stringify(o,null,2);
}

function syncDataFileFromRepo(fileName,options={}){
  const force=options.force===true;
  const repoFile=path.join(REPO_DATA,fileName);
  const liveFile=path.join(DATA,fileName);

  if(!fs.existsSync(repoFile)){
    return {file:fileName,ok:false,changed:false,message:'Repo file missing.'};
  }

  const repoData=readJSON(repoFile,{});
  const liveData=readJSON(liveFile,{});
  const nextData=force ? repoData : {...liveData,...repoData};
  const before=stableJSONString(liveData);
  const after=stableJSONString(nextData);
  const changed=before!==after;

  if(changed){
    writeJSON(liveFile,nextData);
  }

  return {
    file:fileName,
    ok:true,
    changed,
    mode:force?'replace':'merge_repo_wins',
    repoCount:Object.keys(repoData||{}).length,
    liveCount:Object.keys(nextData||{}).length
  };
}

function syncLivePetDataFromRepo(options={}){
  if(!HAS_PERSIST){
    return {ok:true,skipped:true,message:'Persistent disk not detected; repo data is already live.',results:[]};
  }

  const results=[
    syncDataFileFromRepo('pet_species.json',options),
    syncDataFileFromRepo('pet_moves.json',options)
  ];

  console.log('[storage] Pet data repo sync:',results);
  return {ok:true,skipped:false,results};
}

// Keep Render persistent pet data aligned with the GitHub/repo JSON on every deploy.
// This prevents stale live species/move data from surviving redeploys forever.
syncLivePetDataFromRepo({force:false,reason:'startup'});

function games(){return readJSON(gamesFile,[])}
function users(){return readJSON(usersFile,{})}
function pets(){return readJSON(petsFile,{})}
function moves(){return readJSON(movesFile,DEFAULT_MOVES)}
function market(){return readJSON(marketFile,{listings:{},nextId:1})}
function saveMarket(m){writeJSON(marketFile,m)}

function itemCatalog(){
  return readJSON(itemsFile,SHOP_ITEMS);
}

function shopCatalog(){
  return readJSON(shopsFile,{});
}

function getItemDef(itemId){
  return itemCatalog()[itemId]||null;
}

function getItemName(itemId){
  let item=getItemDef(itemId);
  return item ? item.name : itemId;
}

function getShopSale(itemId){
  let shops=shopCatalog();

  for(let shopId of Object.keys(shops)){
    let shop=shops[shopId];
    if(shop.items&&shop.items[itemId]){
      return {
        shopId,
        shop,
        sale:shop.items[itemId]
      };
    }
  }

  return null;
}

function itemBasePrice(itemId){
  let sale=getShopSale(itemId);
  let item=getItemDef(itemId);

  if(sale&&sale.sale&&sale.sale.price!==undefined){
    return Number(sale.sale.price||0);
  }

  if(item&&item.basePrice!==undefined){
    return Number(item.basePrice||0);
  }

  if(item&&item.price!==undefined){
    return Number(item.price||0);
  }

  return 0;
}

function normalizeHour(value,fallback){
  let n=Math.floor(Number(value));
  if(!Number.isFinite(n))return fallback;
  return Math.max(0,Math.min(23,n));
}

function isShopOpen(shop,now=new Date()){
  if(!shop)return true;
  if(shop.forceClosed===true)return false;
  if(shop.forceOpen===true)return true;

  let open=normalizeHour(shop.openHour,0);
  let close=normalizeHour(shop.closeHour,24);
  let hour=now.getHours();

  if(close>=24)return hour>=open;
  if(open===close)return true;
  if(open<close)return hour>=open&&hour<close;
  return hour>=open||hour<close;
}

function publicShopCatalog(){
  let catalog=shopCatalog();
  Object.keys(catalog||{}).forEach(id=>{
    let shop=catalog[id]||{};
    shop.id=shop.id||id;
    shop.openHour=normalizeHour(shop.openHour,0);
    shop.closeHour=shop.closeHour===24?24:normalizeHour(shop.closeHour,24);
    shop.bannerImage=shop.bannerImage||('/assets/shops/'+id+'_banner.png');
    shop.keeperImage=shop.keeperImage||('/assets/shops/'+id+'_keeper.png');
    shop.isOpen=isShopOpen(shop);
    catalog[id]=shop;
  });
  return catalog;
}

function allShopItemIds(){
  let ids={};
  let shops=shopCatalog();

  Object.keys(shops).forEach(shopId=>{
    let shop=shops[shopId]||{};
    Object.keys(shop.items||{}).forEach(itemId=>{
      ids[itemId]=true;
    });
  });

  return Object.keys(ids);
}

function purchasableItemCatalog(){
  let catalog=itemCatalog();
  let out={};
  let shopIds=allShopItemIds();

  if(!shopIds.length){
    return catalog;
  }

  shopIds.forEach(id=>{
    if(catalog[id])out[id]=catalog[id];
  });

  return out;
}


const CORE_FREE_GAME_IDS=new Set(['petbattle','petworld','market','inventory','launcher']);
const MASTER_GAME_ITEM_IDS=new Set(['master_game_key','gameforge_master_key','all_games_key']);

function itemUnlocksGame(item,itemId,gameId){
  item=item||{};
  return item.unlocksGame===gameId||item.gameId===gameId||item.hostsGame===gameId;
}

function itemUnlocksAllGames(item,itemId){
  item=item||{};
  return MASTER_GAME_ITEM_IDS.has(itemId)||item.unlocksAllGames===true||item.masterGameKey===true;
}

function canUsernameHostGame(username,gameId){
  username=String(username||'').trim();
  gameId=String(gameId||'').trim();

  if(!gameId)return false;
  if(CORE_FREE_GAME_IDS.has(gameId))return true;
  if(username&&admins().includes(username))return true;

  let profile=username?getPetProfile(username):null;
  let inv=(profile&&profile.inventory)||{};
  let catalog=itemCatalog();

  return Object.keys(inv).some(itemId=>{
    if(Number(inv[itemId]||0)<=0)return false;
    let item=catalog[itemId]||{};
    return itemUnlocksAllGames(item,itemId)||itemUnlocksGame(item,itemId,gameId);
  });
}



function admins(){
  let a=readJSON(adminsFile,[]);
  return Array.isArray(a)?a:(a.admins||[]);
}

function saveAdmins(list){
  let unique=[...new Set((list||[]).map(x=>String(x||'').trim()).filter(Boolean))];
  writeJSON(adminsFile,unique);
  return unique;
}

function ownerUsernames(){
  return String(process.env.GAMEFORGE_OWNER_USERS||'')
    .split(',')
    .map(x=>x.trim())
    .filter(Boolean);
}

function isOwnerUsername(username){
  username=String(username||'').trim();
  if(!username)return false;

  let ownerList=ownerUsernames();
  if(ownerList.includes(username))return true;

  let u=users();
  return !!(u[username]&&u[username].owner===true);
}

function normalizeUserRecord(u,username){
  u=u||{};
  username=String(username||u.username||'').trim();

  u.username=username;
  u.displayName=String(u.displayName||username).slice(0,40);
  u.avatar=u.avatar||'/assets/users/default_avatar.png';
  u.bio=String(u.bio||'').slice(0,280);
  u.title=String(u.title||'New Player').slice(0,40);
  u.joinedAt=Number(u.joinedAt||u.createdAt||Date.now());
  u.createdAt=Number(u.createdAt||u.joinedAt||Date.now());
  u.lastLoginAt=Number(u.lastLoginAt||0);
  u.lastSeenAt=Number(u.lastSeenAt||0);
  u.role=String(u.role||'player').slice(0,24);
  u.owner=!!u.owner || ownerUsernames().includes(username);
  u.forumStats=u.forumStats||{};
  u.forumStats.posts=Number(u.forumStats.posts||0);
  u.forumStats.replies=Number(u.forumStats.replies||0);
  u.forumStats.likesReceived=Number(u.forumStats.likesReceived||0);
  u.forumStats.reputation=Number(u.forumStats.reputation||0);
  u.wins=Number(u.wins||0);
  u.losses=Number(u.losses||0);
  u.ties=Number(u.ties||0);
  u.gamesPlayed=Number(u.gamesPlayed||0);
  u.favoriteGame=String(u.favoriteGame||'').slice(0,80);

  return u;
}

function normalizeAllUsers(){
  let u=users();
  let changed=false;

  Object.keys(u).forEach(username=>{
    let before=JSON.stringify(u[username]);
    u[username]=normalizeUserRecord(u[username],username);
    if(before!==JSON.stringify(u[username]))changed=true;
  });

  if(changed)writeJSON(usersFile,u);
  return u;
}

function maybeBootstrapOwner(username){
  username=String(username||'').trim();
  if(!username||!ownerUsernames().includes(username))return;

  let u=users();
  if(u[username]){
    u[username]=normalizeUserRecord(u[username],username);
    u[username].owner=true;
    u[username].role='owner';
    writeJSON(usersFile,u);
  }

  let a=admins();
  if(!a.includes(username)){
    a.push(username);
    saveAdmins(a);
  }
}

const rooms={};
const clients=new Set();

function sendToUser(username,obj){
  clients.forEach(c=>{
    if(c.username===username&&c.readyState===1){
      c.send(JSON.stringify(obj));
    }
  });
}

const DEFAULT_MOVES={
  tackle:{name:'Tackle',type:'normal',category:'physical',power:30,accuracy:95,crit:5,description:'A reliable basic attack.'},
  quick_jab:{name:'Quick Jab',type:'normal',category:'physical',power:24,accuracy:100,crit:12,description:'A fast strike with a higher critical chance.'},
  guard_up:{name:'Guard Up',type:'earth',category:'status',power:0,accuracy:100,crit:0,status:{effect:'defense_up',chance:100,amount:2,duration:3},description:'Raises defense for a few turns.'},

  ember_nip:{name:'Ember Nip',type:'fire',category:'special',power:42,accuracy:90,crit:8,status:{effect:'burn',chance:25,duration:3},description:'A fiery bite that may burn.'},
  flame_burst:{name:'Flame Burst',type:'fire',category:'special',power:46,accuracy:88,crit:7,status:{effect:'burn',chance:18,duration:3},description:'A burst of flame that may burn.'},
  heat_up:{name:'Heat Up',type:'fire',category:'buff',power:0,accuracy:100,crit:0,status:{effect:'attack_up',chance:100,amount:1,duration:3},description:'Focuses inner heat to raise attack.'},

  bubble_snap:{name:'Bubble Snap',type:'water',category:'special',power:40,accuracy:92,crit:6,status:{effect:'slow',chance:20,duration:2},description:'A snapping water burst that may slow.'},
  tidal_hit:{name:'Tidal Hit',type:'water',category:'special',power:48,accuracy:86,crit:6,status:{effect:'defense_down',chance:16,amount:1,duration:3},description:'A heavy wave strike that may lower defense.'},
  soak:{name:'Soak',type:'water',category:'debuff',power:0,accuracy:92,crit:0,status:{effect:'slow',chance:80,duration:2},description:'Soaks the target and slows them.'},

  vine_bop:{name:'Vine Bop',type:'nature',category:'physical',power:38,accuracy:95,crit:7,status:{effect:'snare',chance:18,duration:2},description:'A vine strike that may snare.'},
  spore_cloud:{name:'Spore Cloud',type:'nature',category:'status',power:0,accuracy:82,crit:0,status:{effect:'sleep',chance:55,duration:1},description:'A drifting spore cloud that may cause sleep.'},
  growth:{name:'Growth',type:'nature',category:'buff',power:0,accuracy:100,crit:0,status:{effect:'attack_up',chance:100,amount:1,duration:3},description:'Grows stronger for a few turns.'},

  shadow_pounce:{name:'Shadow Pounce',type:'shadow',category:'physical',power:46,accuracy:86,crit:18,description:'A risky shadow attack with high critical chance.'},
  night_drain:{name:'Night Drain',type:'shadow',category:'special',power:36,accuracy:90,crit:12,status:{effect:'attack_down',chance:20,amount:1,duration:3},description:'A draining shadow hit that may weaken attack.'},
  fear_glare:{name:'Fear Glare',type:'shadow',category:'debuff',power:0,accuracy:88,crit:0,status:{effect:'defense_down',chance:80,amount:1,duration:3},description:'An intimidating glare that lowers defense.'},

  stone_bump:{name:'Stone Bump',type:'earth',category:'physical',power:44,accuracy:88,crit:5,status:{effect:'stun',chance:12,duration:1},description:'A heavy impact that may stun.'},
  quake_roll:{name:'Quake Roll',type:'earth',category:'physical',power:52,accuracy:82,crit:6,status:{effect:'slow',chance:22,duration:2},description:'A rolling quake that may slow.'},
  harden:{name:'Harden',type:'earth',category:'buff',power:0,accuracy:100,crit:0,status:{effect:'defense_up',chance:100,amount:2,duration:3},description:'Raises defense for a few turns.'},

  dino_chomp:{name:'Dino Chomp',type:'earth',category:'physical',power:48,accuracy:88,crit:10,status:{effect:'defense_down',chance:18,amount:2,duration:3},description:'A heavy prehistoric bite that may lower defense.'},
  tail_thump:{name:'Tail Thump',type:'normal',category:'physical',power:36,accuracy:95,crit:5,status:{effect:'stun',chance:10,duration:1},description:'A solid tail hit with a small chance to stun.'},
  wing_gust:{name:'Wing Gust',type:'fire',category:'special',power:34,accuracy:96,crit:7,status:{effect:'slow',chance:18,duration:2},description:'A heated gust that may slow the target.'},
  flame_breath:{name:'Flame Breath',type:'fire',category:'special',power:52,accuracy:84,crit:9,status:{effect:'burn',chance:30,duration:3},description:'A powerful breath attack that may burn.'},
  dragon_breath:{name:'Dragon Breath',type:'fire',category:'special',power:56,accuracy:82,crit:10,status:{effect:'burn',chance:25,duration:3},description:'A rare breath attack with high power.'},
  sky_dive:{name:'Sky Dive',type:'normal',category:'physical',power:50,accuracy:86,crit:14,description:'A fast aerial dive.'},
  aura_boost:{name:'Aura Boost',type:'normal',category:'buff',power:0,accuracy:100,crit:0,status:{effect:'attack_up',chance:100,amount:1,duration:3},description:'Boosts fighting spirit.'}
};

function safeUser(u){
  u=normalizeUserRecord(u,u&&u.username);

  return {
    username:u.username,
    displayName:u.displayName,
    avatar:u.avatar,
    bio:u.bio,
    title:u.title,
    role:u.role,
    owner:!!u.owner,
    joinedAt:u.joinedAt,
    createdAt:u.createdAt,
    lastLoginAt:u.lastLoginAt,
    lastSeenAt:u.lastSeenAt,
    wins:u.wins||0,
    losses:u.losses||0,
    ties:u.ties||0,
    gamesPlayed:u.gamesPlayed||0,
    favoriteGame:u.favoriteGame||'',
    forumStats:u.forumStats||{posts:0,replies:0,likesReceived:0,reputation:0}
  };
}

function id(n=4){
  return Math.random().toString(36).slice(2,2+n).toUpperCase();
}

function petId(){
  return 'pet_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);
}

const PET_LIMITS={
  maxRoster:6,
  newEggBaseCost:75
};

const MARKET_LIMITS={
  maxListingsPerUser:20,
  maxQuantityPerListing:99,
  minPrice:1,
  maxPrice:99999,
  marketTaxRate:0
};

const PET_PERSONALITIES=['playful','lazy','aggressive','calm','curious','moody'];
const TRAINABLE_STATS=['attack','defense','speed'];

const EXPLORE_ZONES={
  meadow:{
    id:'meadow',
    name:'Sunny Meadow',
    minLevel:1,
    energyCost:10,
    description:'Balanced beginner zone with coins, berries, XP, and small surprises.',
    rewards:[
      {kind:'coins',weight:44,min:8,max:22},
      {kind:'item',weight:30,item:'berry',quantity:1},
      {kind:'item',weight:12,item:'sparkle_treat',quantity:1},
      {kind:'xp',weight:20,min:5,max:11}
    ]
  },
  tidepools:{
    id:'tidepools',
    name:'Tide Pools',
    minLevel:2,
    energyCost:12,
    description:'Water-themed zone with soap, treats, and water move discovery chances.',
    rewards:[
      {kind:'coins',weight:30,min:10,max:24},
      {kind:'item',weight:25,item:'soap',quantity:1},
      {kind:'item',weight:16,item:'mist_spray',quantity:1},
      {kind:'xp',weight:24,min:7,max:13},
      {kind:'move',weight:5,type:'water'}
    ]
  },
  embercave:{
    id:'embercave',
    name:'Ember Cave',
    minLevel:3,
    energyCost:14,
    description:'Fire-themed zone with higher coin swings and fire move discovery chances.',
    rewards:[
      {kind:'coins',weight:36,min:12,max:32},
      {kind:'item',weight:18,item:'warm_pad',quantity:1},
      {kind:'item',weight:12,item:'sun_lamp',quantity:1},
      {kind:'xp',weight:24,min:8,max:15},
      {kind:'move',weight:6,type:'fire'}
    ]
  },
  shadowwoods:{
    id:'shadowwoods',
    name:'Shadow Woods',
    minLevel:4,
    energyCost:15,
    description:'Riskier zone with stronger XP and shadow move discovery chances.',
    rewards:[
      {kind:'coins',weight:26,min:12,max:36},
      {kind:'item',weight:16,item:'shade_cover',quantity:1},
      {kind:'item',weight:10,item:'nap_blanket',quantity:1},
      {kind:'xp',weight:30,min:10,max:18},
      {kind:'move',weight:8,type:'shadow'}
    ]
  },
  fossilridge:{
    id:'fossilridge',
    name:'Fossil Ridge',
    minLevel:5,
    energyCost:16,
    description:'Earth-themed zone with sturdy rewards and earth move discovery chances.',
    rewards:[
      {kind:'coins',weight:28,min:14,max:38},
      {kind:'item',weight:16,item:'dry_towel',quantity:1},
      {kind:'item',weight:12,item:'cool_cloth',quantity:1},
      {kind:'xp',weight:30,min:10,max:18},
      {kind:'move',weight:8,type:'earth'}
    ]
  }
};

const QUEST_POOL=[
  {id:'care_egg_3',title:'Egg Tender',type:'eggCare',target:3,reward:{coins:18,item:'warm_pad',quantity:1}},
  {id:'play_1',title:'Play Time',type:'play',target:1,reward:{coins:20,xp:5}},
  {id:'train_2',title:'Training Day',type:'train',target:2,reward:{coins:24,xp:8}},
  {id:'explore_2',title:'Little Explorer',type:'explore',target:2,reward:{coins:28,item:'berry',quantity:1}},
  {id:'feed_1',title:'Snack Break',type:'feed',target:1,reward:{coins:15,item:'sparkle_treat',quantity:1}},
  {id:'clean_1',title:'Fresh & Clean',type:'clean',target:1,reward:{coins:15,item:'soap',quantity:1}},
  {id:'rest_1',title:'Rested Companion',type:'rest',target:1,reward:{coins:15,item:'nap_blanket',quantity:1}},
  {id:'bond_3',title:'Build the Bond',type:'bondGain',target:3,reward:{coins:25,xp:6}},
  {id:'coins_25',title:'Coin Finder',type:'coinsEarned',target:25,reward:{coins:30}}
];

const MOVE_UNLOCKS={
  fire:['flame_burst','heat_up','flame_breath','dragon_breath'],
  water:['tidal_hit','soak'],
  nature:['spore_cloud','growth'],
  shadow:['night_drain','fear_glare'],
  earth:['quake_roll','harden'],
  normal:['quick_jab','guard_up','tail_thump','sky_dive','aura_boost']
};

function randomPersonality(){
  return PET_PERSONALITIES[Math.floor(Math.random()*PET_PERSONALITIES.length)];
}

function todayKey(){
  return new Date().toISOString().slice(0,10);
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
    training:{attackXp:0,defenseXp:0,speedXp:0},
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
  pet.training=pet.training||{attackXp:0,defenseXp:0,speedXp:0};
  pet.social=pet.social||{};
  pet.social.helpedBy=Array.isArray(pet.social.helpedBy)?pet.social.helpedBy:[];
  pet.social.tradeLockedUntil=Number(pet.social.tradeLockedUntil||0);
  pet.social.giftLockedUntil=Number(pet.social.giftLockedUntil||0);

  return pet;
}

function normalizeDaily(profile){
  let key=todayKey();

  if(!profile.daily||profile.daily.date!==key){
    let pool=QUEST_POOL.slice();
    let selected=[];

    while(selected.length<3&&pool.length){
      let idx=Math.floor(Math.random()*pool.length);
      let q=pool.splice(idx,1)[0];
      selected.push({
        id:q.id,
        title:q.title,
        type:q.type,
        target:q.target,
        progress:0,
        claimed:false,
        reward:q.reward
      });
    }

    profile.daily={
      date:key,
      quests:selected
    };
  }

  return profile.daily;
}

function normalizePetProfile(profile,username){
  profile.username=profile.username||username;
  profile.money=Number(profile.money||0);
  profile.inventory=profile.inventory||{};
  profile.market=profile.market||{};
  profile.market.shopOpen=!!profile.market.shopOpen;
  profile.market.shopName=String(profile.market.shopName||((username||'Player')+"'s Stall")).slice(0,32);
  profile.market.shopTheme=String(profile.market.shopTheme||'classic').slice(0,24);
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

  normalizeDaily(profile);

  return profile;
}

function petCount(profile){
  return Object.keys(profile.pets||{}).length;
}

function petSellValue(pet){
  pet=pet||{};
  let stage=String(pet.stage||'egg');
  let level=Number((pet.stats&&pet.stats.level)||1);
  let stageValue={
    egg:5,
    baby:20,
    young:40,
    teen:40,
    adult:75
  }[stage]||20;

  let catalog=mergedPetSpecies();
  let species=pet.species&&catalog[pet.species] ? catalog[pet.species] : {};
  let rarity=String(species.rarity||pet.rarity||'common').toLowerCase();
  let rarityMult={
    common:1,
    uncommon:1.25,
    rare:1.75,
    epic:3,
    legendary:6
  }[rarity]||1;

  return Math.max(1,Math.floor((stageValue+(level*2))*rarityMult));
}

function defaultPetProfile(username){
  let pet=createEggPet(username);

  return normalizePetProfile({
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
  },username);
}
function petSpeciesCatalog(){
  return readJSON(petSpeciesFile,{});
}

function mergedPetSpecies(){
  let raw={
    ...PET_SPECIES,
    ...petSpeciesCatalog()
  };

  let out={};

  Object.keys(raw).forEach(id=>{
    let species=raw[id]||{};
    let base=species.base||{};

    out[id]={
      id,
      name:species.name||id,
      type:species.type||'normal',
      emoji:species.emoji||'🐾',
      rarity:species.rarity||'common',
      hatchWeight:Number(
        species.hatchWeight!==undefined ? species.hatchWeight :
        species.weight!==undefined ? species.weight : 100
      ),
      enabled:species.enabled!==false,
      hatchable:species.hatchable!==false,
      base:{
        hp:Number(base.hp||24),
        attack:Number(base.attack||5),
        defense:Number(base.defense||5),
        speed:Number(base.speed||5)
      },
      moves:Array.isArray(species.moves)&&species.moves.length?species.moves.map(String):['tackle'],
      description:String(species.description||'')
    };
  });

  return out;
}

function adminPetSpeciesCatalog(){
  let catalog=mergedPetSpecies();

  return Object.keys(catalog).map(id=>{
    let species=catalog[id]||{};
    let base=species.base||{};

    return {
      id,
      name:species.name||id,
      type:species.type||'neutral',
      emoji:species.emoji||'🐾',
      rarity:species.rarity||'common',
      hatchWeight:Number(species.hatchWeight!==undefined?species.hatchWeight:(species.weight!==undefined?species.weight:100)),
      enabled:species.enabled!==false,
      hatchable:species.hatchable!==false,
      base:{
        hp:Number(base.hp||24),
        attack:Number(base.attack||5),
        defense:Number(base.defense||5),
        speed:Number(base.speed||5)
      },
      moves:Array.isArray(species.moves)?species.moves.map(String):[],
      description:String(species.description||'')
    };
  }).sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id)));
}

function normalizeAdminPetSpeciesPayload(body){
  let id=safeAssetId(body.id||body.speciesId);
  if(!id)throw new Error('Missing species id.');

  let name=String(body.name||id).trim().slice(0,64)||id;
  let type=String(body.type||'neutral').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,32)||'neutral';
  let emoji=String(body.emoji||'🐾').trim().slice(0,8)||'🐾';
  let rarity=String(body.rarity||'common').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,32)||'common';

  let hatchWeight=Math.floor(Number(body.hatchWeight));
  if(!Number.isFinite(hatchWeight)||hatchWeight<0)throw new Error('Invalid hatch weight.');
  if(hatchWeight>9999)throw new Error('Hatch weight is too high.');

  let baseIn=body.base||{};
  function stat(name,fallback){
    let value=Math.floor(Number(baseIn[name]!==undefined?baseIn[name]:body[name]));
    if(!Number.isFinite(value))value=fallback;
    if(value<1||value>999)throw new Error('Invalid '+name+' stat.');
    return value;
  }

  let moves=[];
  if(Array.isArray(body.moves)){
    moves=body.moves;
  }else if(body.movesRaw!==undefined){
    moves=String(body.movesRaw||'').split(/[\n,]+/);
  }
  moves=[...new Set(moves.map(x=>String(x||'').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'_')).filter(Boolean))].slice(0,12);

  return {
    id,
    name,
    type,
    emoji,
    rarity,
    hatchWeight,
    enabled:body.enabled===false?false:true,
    hatchable:body.hatchable===false?false:true,
    base:{
      hp:stat('hp',24),
      attack:stat('attack',5),
      defense:stat('defense',5),
      speed:stat('speed',5)
    },
    moves,
    description:String(body.description||'').trim().slice(0,700)
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


const HATCH_TYPES=['fire','water','nature','shadow','earth'];

// Hatch influence is accumulated across the egg's full care history. No single last action determines the species.
const TRAIT_TYPE_INFLUENCE={
  warm:{fire:4,earth:1},
  cold:{water:3,shadow:1},
  wet:{water:3,nature:1},
  dry:{earth:3,shadow:1},
  light:{nature:3,fire:1},
  dark:{shadow:3,earth:1}
};

const SPECIES_HATCH_REGISTRY={
  flarecub:{type:'fire',rarity:'common',weight:100},
  emberwing:{type:'fire',rarity:'rare',weight:24},
  frostfin:{type:'water',rarity:'common',weight:100},
  leafbun:{type:'nature',rarity:'common',weight:100},
  shadepup:{type:'shadow',rarity:'common',weight:100},
  pebblet:{type:'earth',rarity:'common',weight:100},
  chompasaur:{type:'earth',rarity:'rare',weight:24}
};

const HATCH_RARITY_BONUS={
  common:1,
  uncommon:.65,
  rare:.42,
  epic:.16,
  legendary:.05
};

const EGG_CARE_ACTIONS={
  warm:{traits:{warm:1},affection:1,label:'kept the egg warm'},
  cold:{traits:{cold:1},affection:1,label:'cooled the egg'},
  wet:{traits:{wet:1},affection:1,label:'misted the egg'},
  dry:{traits:{dry:1},affection:1,label:'dried the egg'},
  light:{traits:{light:1},affection:1,label:'gave the egg light'},
  dark:{traits:{dark:1},affection:1,label:'kept the egg shaded'},
  balance:{balanced:true,affection:1,label:"balanced the egg's energy"},
  bond:{traits:{},affection:2,label:'bonded quietly with the egg'}
};

// Fallback item data only. Main scalable catalog should come from data/items.json and data/shops.json.
const SHOP_ITEMS={
  berry:{name:'Berry',price:10,description:'Restores hunger.',effect:{hunger:18},questType:'feed'},
  sparkle_treat:{name:'Sparkle Treat',price:25,description:'Boosts happiness.',effect:{happiness:18}},
  soap:{name:'Bubble Soap',price:20,description:'Improves cleanliness.',effect:{cleanliness:25},questType:'clean'},
  nap_blanket:{name:'Nap Blanket',price:30,description:'Restores energy.',effect:{energy:22},questType:'rest'},
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

function savePetProfile(username,profile,options={}){
  let all=pets();
  all[username]=normalizePetProfile(profile,username);
  writeJSON(petsFile,all);

  if(options.push!==false){
    sendToUser(username,{type:'petUpdate',profile:all[username]});
  }
}

function activePet(profile){
  return profile.pets[profile.activePetId];
}

function clamp(n,min,max){
  return Math.max(min,Math.min(max,n));
}

function randInt(min,max){
  return Math.floor(Math.random()*(max-min+1))+min;
}

function weightedPick(items){
  let total=items.reduce((sum,x)=>sum+Number(x.weight||0),0);
  let roll=Math.random()*total;

  for(let item of items){
    roll-=Number(item.weight||0);
    if(roll<=0)return item;
  }

  return items[items.length-1];
}

function trackQuest(profile,type,amount=1){
  normalizeDaily(profile);
  let changed=false;

  profile.daily.quests.forEach(q=>{
    if(q.type===type&&!q.claimed&&q.progress<q.target){
      q.progress=clamp(Number(q.progress||0)+amount,0,q.target);
      changed=true;
    }
  });

  return changed;
}

function grantReward(profile,pet,reward){
  let granted={coins:0,items:[],xpResult:null};

  if(reward.coins){
    profile.money=(profile.money||0)+Number(reward.coins);
    granted.coins=Number(reward.coins);
    trackQuest(profile,'coinsEarned',Number(reward.coins));
  }

  if(reward.item){
    let qty=Number(reward.quantity||1);
    profile.inventory[reward.item]=(profile.inventory[reward.item]||0)+qty;
    granted.items.push({item:reward.item,quantity:qty});
  }

  if(reward.xp&&pet&&pet.stage!=='egg'){
    granted.xpResult=addPetXp(pet,Number(reward.xp));
  }

  return granted;
}

function buildHatchProfile(traits){
  traits=traits||{};
  let typeScores={};
  HATCH_TYPES.forEach(type=>typeScores[type]=1);

  Object.keys(TRAIT_TYPE_INFLUENCE).forEach(trait=>{
    let amount=Number(traits[trait]||0);
    let influence=TRAIT_TYPE_INFLUENCE[trait]||{};
    Object.keys(influence).forEach(type=>{
      typeScores[type]=(typeScores[type]||1)+(amount*Number(influence[type]||0));
    });
  });

  let ranked=Object.keys(typeScores)
    .map(type=>({type,score:Number(typeScores[type]||0)}))
    .sort((a,b)=>b.score-a.score);

  let dominant=ranked[0]||{type:'fire',score:1};
  let second=ranked[1]||{type:'water',score:1};
  let totalTraits=Object.values(traits).reduce((sum,x)=>sum+Number(x||0),0);
  let balanced=totalTraits>=8&&(dominant.score-second.score)<=4;

  return {typeScores,ranked,dominantType:dominant.type,balanced,totalTraits};
}

function chooseHatchType(traits){
  let profile=buildHatchProfile(traits);
  let choices=profile.ranked.map(x=>({key:x.type,weight:Math.max(1,x.score)}));
  return weightedPick(choices).key;
}

function chooseSpeciesForType(type,traits){
  let profile=buildHatchProfile(traits);
  let entries=Object.keys(SPECIES_HATCH_REGISTRY)
    .map(id=>({id,...SPECIES_HATCH_REGISTRY[id]}))
    .filter(x=>x.type===type);

  if(profile.balanced&&Math.random()<.18){
    entries=Object.keys(SPECIES_HATCH_REGISTRY).map(id=>({id,...SPECIES_HATCH_REGISTRY[id]}));
  }

  if(!entries.length){
    entries=Object.keys(SPECIES_HATCH_REGISTRY).map(id=>({id,...SPECIES_HATCH_REGISTRY[id]}));
  }

  let choices=entries.map(x=>({
    key:x.id,
    weight:Math.max(1,Number(x.weight||10)*Number(HATCH_RARITY_BONUS[x.rarity]||1))
  }));

  return weightedPick(choices).key;
}

function hatchSpecies(traits){
  traits=traits||{};
  let catalog=mergedPetSpecies();
  let hatchProfile=buildHatchProfile(traits);

  let available=Object.values(catalog).filter(p=>{
    return p&&p.enabled!==false&&p.hatchable!==false;
  });

  if(!available.length){
    return 'flarecub';
  }

  let weighted=available.map(p=>{
    let weight=Math.max(1,Number(p.hatchWeight||10));
    let typeScore=Number((hatchProfile.typeScores&&hatchProfile.typeScores[p.type])||1);

    // Egg care should matter, but it should not completely lock out other pets.
    weight*=Math.max(1,typeScore);

    // Balanced eggs get a small chance to favor anything, which keeps rare surprises possible.
    if(hatchProfile.balanced){
      weight*=1.12;
    }

    return {
      key:p.id,
      weight
    };
  });

  return weightedPick(weighted).key;
}

function hatchPersonality(traits,affection){
  traits=traits||{};
  let weights={playful:10,lazy:10,aggressive:10,calm:10,curious:10,moody:10};

  weights.aggressive+=Number(traits.warm||0)*1.5+Number(traits.dark||0)*.7;
  weights.calm+=Number(traits.cold||0)*1.4+Number(traits.dry||0)*.7;
  weights.curious+=Number(traits.wet||0)*1.1+Number(traits.light||0)*1.1;
  weights.playful+=Number(traits.light||0)*1.2+Number(affection||0)*.15;
  weights.lazy+=Number(traits.cold||0)*.7+Number(traits.dark||0)*.4;
  weights.moody+=Math.abs(Number(traits.warm||0)-Number(traits.cold||0))*.35+Number(traits.dark||0)*.8;

  let choices=Object.keys(weights).map(key=>({key,weight:Math.max(1,weights[key])}));
  return weightedPick(choices).key;
}

function hatchPet(pet){
  let speciesKey=hatchSpecies(pet.eggTraits||{});
let species=mergedPetSpecies()[speciesKey];

  let traits=pet.eggTraits||{};
  let totalTraits=Object.values(traits).reduce((a,b)=>a+b,0)||1;

  function traitBias(trait){
    return (traits[trait]||0)/totalTraits;
  }

  function roll(base,variance=2){
    return base + randInt(-variance,variance);
  }

  let careBonus=Math.floor((pet.affection||0)/10);

  let hp = roll(species.base.hp + Math.floor(traitBias('wet')*4) + careBonus,3);
  let atk= roll(species.base.attack + Math.floor(traitBias('warm')*3),2);
  let def= roll(species.base.defense + Math.floor(traitBias('dry')*3),2);
  let spd= roll(species.base.speed + Math.floor(traitBias('light')*3),2);

  pet.stage='baby';
  pet.species=speciesKey;
  pet.name=species.name;
  pet.emoji=species.emoji;
  pet.type=species.type;

  pet.personality=pet.personality||hatchPersonality(traits,pet.affection||0);
  pet.affection=Number(pet.affection||5);

  pet.stats.hp=hp;
  pet.stats.maxHp=hp;
  pet.stats.attack=atk;
  pet.stats.defense=def;
  pet.stats.speed=spd;

  pet.moves=species.moves.slice(0,3);
  pet.lastUpdated=Date.now();

  return pet;
}

function requireUser(req,res){
  let username=(req.body&&req.body.username)||req.query.user;
  if(!username){
    res.status(400).json({error:'Missing username'});
    return null;
  }

  let u=users();
  if(!u[username]){
    res.status(404).json({error:'User not found'});
    return null;
  }

  // 🔥 CRITICAL FIX: ensure marketplace/pet profile exists
  let p=pets();
  if(!p[username]){
    p[username]=defaultPetProfile(username);
    writeJSON(petsFile,p);
  }

  return username;
}

function xpToNextLevel(pet){
  return Math.max(20,Number(pet.stats.level||1)*20);
}
function petCareAverage(pet){
  let n=pet.needs||{};
  return ((n.hunger||0)+(n.happiness||0)+(n.energy||0)+(n.cleanliness||0))/4;
}

function checkPetGrowth(pet){
  if(!pet || pet.stage==='egg') return null;

  let stage=pet.stage||'baby';
  let level=Number(pet.stats.level||1);
  let bond=Number(pet.affection||0);
  let care=petCareAverage(pet);

  // Ensure legacy pets get stage
  if(!pet.stage){
    pet.stage = pet.species ? 'baby' : 'egg';
    return null;
  }

  // BABY → YOUNG
  if(stage==='baby'){
    if(level>=5 && bond>=20 && care>=60){
      pet.stage='young';

      // stat boost
      pet.stats.maxHp += 5;
      pet.stats.attack += 2;
      pet.stats.defense += 2;
      pet.stats.speed += 2;
      pet.stats.hp = pet.stats.maxHp;

      let move=maybeLearnMove(pet,0.8);

      return {
        stage:'young',
        message:`✨ ${pet.name} has grown into a Young companion!`,
        move
      };
    }

    return {
      hint:
        level<5 ? `${pet.name} needs more experience to grow.` :
        bond<20 ? `${pet.name} needs more bonding.` :
        `${pet.name} needs better care.`
    };
  }

  // YOUNG → ADULT
  if(stage==='young'){
    if(level>=15 && bond>=55 && care>=70){
      pet.stage='adult';

      // bigger stat boost
      pet.stats.maxHp += 10;
      pet.stats.attack += 4;
      pet.stats.defense += 4;
      pet.stats.speed += 3;
      pet.stats.hp = pet.stats.maxHp;

      let move=maybeLearnMove(pet,1);

      return {
        stage:'adult',
        message:`✨ ${pet.name} has matured into an Adult companion!`,
        move
      };
    }

    return {
      hint:
        level<15 ? `${pet.name} needs more experience.` :
        bond<55 ? `${pet.name} needs stronger bonding.` :
        `${pet.name} needs better care.`
    };
  }

  return null;
}
function addPetXp(pet,amount){
  let result={xpGained:amount,leveled:false,levelsGained:0,learnedMove:null,growth:null};
  pet.stats.xp=Number(pet.stats.xp||0)+amount;

  function careScore(p){
    let n=p.needs||{};
    return ((n.hunger||0)+(n.happiness||0)+(n.energy||0)+(n.cleanliness||0))/4;
  }

  while(pet.stats.xp>=xpToNextLevel(pet)){
    pet.stats.xp-=xpToNextLevel(pet);
    pet.stats.level=Number(pet.stats.level||1)+1;

    let care=careScore(pet);

    let hpGain=3 + Math.floor(care/40);
    let atkGain=1;
    let defGain=1;
    let spdGain=1;

    if(pet.personality==='aggressive') atkGain+=1;
    if(pet.personality==='calm') defGain+=1;
    if(pet.personality==='playful') spdGain+=1;
    if(pet.personality==='lazy') hpGain+=1;

    if(care>80){
      hpGain+=1;
      atkGain+=1;
    }

    pet.stats.maxHp+=hpGain;
    pet.stats.hp=pet.stats.maxHp;
    pet.stats.attack+=atkGain;
    pet.stats.defense+=defGain;
    pet.stats.speed+=spdGain;

    result.leveled=true;
    result.levelsGained++;
  }

  // ✅ ONLY CHECK GROWTH ONCE HERE
  if(result.leveled){
    result.growth = checkPetGrowth(pet);
    result.learnedMove=maybeLearnMove(pet,.45);
  }

  return result;
}
function maybeLearnMove(pet,chance,typeHint){
  if((pet.moves||[]).length>=4)return null;
  if(Math.random()>chance)return null;

  let book=moves();
  let typeList=MOVE_UNLOCKS[typeHint]||MOVE_UNLOCKS[pet.type]||[];
  let normalList=MOVE_UNLOCKS.normal||[];
  let candidates=typeList.concat(normalList).filter(id=>book[id]&&!pet.moves.includes(id));

  if(!candidates.length)return null;

  let moveId=candidates[Math.floor(Math.random()*candidates.length)];
  pet.moves.push(moveId);

  return {
    id:moveId,
    name:book[moveId].name||moveId,
    type:book[moveId].type||'normal'
  };
}

function trainPetStat(pet,stat){
  let gain=1;
  let xpGain=4;
  let energyCost=12;

  if(pet.personality==='aggressive'&&stat==='attack')gain++;
  if(pet.personality==='calm'&&stat==='defense')gain++;
  if(pet.personality==='playful')xpGain++;
  if(pet.personality==='lazy')energyCost=8;
  if(pet.personality==='curious'&&Math.random()<.18)xpGain+=3;
  if(pet.personality==='moody'&&Math.random()<.25)gain++;

  pet.training=pet.training||{attackXp:0,defenseXp:0,speedXp:0};
  pet.training[stat+'Xp']=Number(pet.training[stat+'Xp']||0)+gain;
  pet.stats[stat]=Number(pet.stats[stat]||0)+gain;
  pet.needs.energy=clamp(Number(pet.needs.energy||0)-energyCost,0,100);
  pet.needs.happiness=clamp(Number(pet.needs.happiness||0)+2,0,100);
  pet.affection=clamp(Number(pet.affection||0)+1,0,100);

  let xpResult=addPetXp(pet,xpGain);
  return {stat,gain,energyCost,xp:xpGain,xpResult};
}

function resolveExplore(profile,pet,zoneId){
  let zone=EXPLORE_ZONES[zoneId]||EXPLORE_ZONES.meadow;
  let level=Number(pet.stats.level||1);

  if(!pet||pet.stage==='egg')return {error:'Eggs cannot explore yet'};
  if(level<zone.minLevel)return {error:zone.name+' requires level '+zone.minLevel};
  if(Number(pet.needs.energy||0)<zone.energyCost)return {error:pet.name+' is too tired to explore'};

  let reward=weightedPick(zone.rewards);
  let result={
    zone:zone.id,
    zoneName:zone.name,
    kind:reward.kind,
    bonus:[],
    learnedMove:null,
    leveled:false
  };

  pet.needs.energy=clamp(Number(pet.needs.energy||0)-zone.energyCost,0,100);
  pet.needs.happiness=clamp(Number(pet.needs.happiness||0)+4,0,100);
  pet.affection=clamp(Number(pet.affection||0)+2,0,100);

  if(reward.kind==='coins'){
    let amount=randInt(reward.min,reward.max);
    if(pet.personality==='curious'&&Math.random()<.35){
      amount+=5;
      result.bonus.push('Curious bonus +5 coins');
    }
    profile.money=(profile.money||0)+amount;
    result.amount=amount;
    result.message=pet.name+' explored '+zone.name+' and found '+amount+' coins.';
    trackQuest(profile,'coinsEarned',amount);
  }

  if(reward.kind==='item'){
    let quantity=Number(reward.quantity||1);
    if(pet.personality==='curious'&&Math.random()<.25){
      quantity++;
      result.bonus.push('Curious bonus found one extra');
    }
    profile.inventory[reward.item]=(profile.inventory[reward.item]||0)+quantity;
    result.item=reward.item;
    result.quantity=quantity;
    result.message=pet.name+' explored '+zone.name+' and found '+quantity+' '+itemName(reward.item)+'.';
  }

  if(reward.kind==='xp'){
    let xp=randInt(reward.min,reward.max);
    if(pet.personality==='playful')xp+=2;
    let xpResult=addPetXp(pet,xp);
    result.amount=xp;
    result.xpResult=xpResult;
    result.learnedMove=xpResult.learnedMove;
    result.leveled=!!xpResult.leveled;
    result.message=pet.name+' explored '+zone.name+' and gained '+xp+' XP.';
  }

  if(reward.kind==='move'){
    let learned=maybeLearnMove(pet,.75,reward.type);
    result.learnedMove=learned;
    result.message=learned
      ? pet.name+' explored '+zone.name+' and discovered '+learned.name+'!'
      : pet.name+' explored '+zone.name+' and practiced battle instincts.';
    if(!learned){
      let xpResult=addPetXp(pet,8);
      result.xpResult=xpResult;
      result.leveled=!!xpResult.leveled;
    }
  }

  let extraMove=maybeLearnMove(pet,pet.personality==='curious'?.18:.08);
  if(extraMove&&!result.learnedMove){
    result.learnedMove=extraMove;
    result.message+=' '+pet.name+' discovered '+extraMove.name+'!';
  }

  trackQuest(profile,'explore',1);
  trackQuest(profile,'bondGain',2);

  pet.lastUpdated=Date.now();
  return result;
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

  u[username]=normalizeUserRecord({
    username,
    password,
    wins:0,
    losses:0,
    ties:0,
    gamesPlayed:0,
    favoriteGame:'',
    joinedAt:Date.now(),
    createdAt:Date.now(),
    lastLoginAt:Date.now(),
    lastSeenAt:Date.now()
  },username);
  writeJSON(usersFile,u);

  maybeBootstrapOwner(username);
  getPetProfile(username);

  let refreshed=users();
  res.json({ok:true,user:safeUser(refreshed[username]),admin:admins().includes(username)});
});

app.post('/api/login',(req,res)=>{
  let {username,password}=req.body;
  let u=users();

  if(!u[username]||u[username].password!==password)return res.json({error:'Bad login'});

  u[username]=normalizeUserRecord(u[username],username);
  u[username].lastLoginAt=Date.now();
  u[username].lastSeenAt=Date.now();
  writeJSON(usersFile,u);

  maybeBootstrapOwner(username);
  getPetProfile(username);

  let refreshed=users();
  res.json({ok:true,user:safeUser(refreshed[username]),admin:admins().includes(username)});
});

app.get('/api/admin/users',(req,res)=>{
  let user=req.query.user;
  if(!admins().includes(user))return res.status(403).json({error:'forbidden'});
  res.json(Object.values(normalizeAllUsers()).map(safeUser));
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

  let mk=market();
  Object.keys(mk.listings||{}).forEach(id=>{
    if(mk.listings[id].seller===req.params.name)delete mk.listings[id];
  });
  saveMarket(mk);

  res.json({ok:true});
});


app.post('/api/admin/users/:name/profile',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let target=String(req.params.name||'').trim();
  let u=users();

  if(!u[target])return res.status(404).json({error:'User not found'});

  u[target]=normalizeUserRecord(u[target],target);

  if(req.body.displayName!==undefined)u[target].displayName=String(req.body.displayName||target).trim().slice(0,40)||target;
  if(req.body.bio!==undefined)u[target].bio=String(req.body.bio||'').trim().slice(0,280);
  if(req.body.title!==undefined)u[target].title=String(req.body.title||'Player').trim().slice(0,40)||'Player';
  if(req.body.avatar!==undefined)u[target].avatar=String(req.body.avatar||'/assets/users/default_avatar.png').trim().slice(0,160)||'/assets/users/default_avatar.png';

  writeJSON(usersFile,u);

  res.json({
    ok:true,
    message:'User profile updated.',
    user:safeUser(u[target])
  });
});

app.post('/api/admin/users/:name/admin',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  if(!isOwnerUsername(adminUser)){
    return res.status(403).json({error:'Only an owner can change admin status.'});
  }

  let target=String(req.params.name||'').trim();
  let makeAdmin=req.body.makeAdmin!==false;
  let u=users();

  if(!u[target])return res.status(404).json({error:'User not found'});

  u[target]=normalizeUserRecord(u[target],target);

  let a=admins();

  if(makeAdmin){
    if(!a.includes(target))a.push(target);
    u[target].role=u[target].owner?'owner':'admin';
  }else{
    a=a.filter(x=>x!==target);
    if(!u[target].owner)u[target].role='player';
  }

  saveAdmins(a);
  writeJSON(usersFile,u);

  res.json({
    ok:true,
    message:makeAdmin ? (target+' is now an admin.') : (target+' is no longer an admin.'),
    user:safeUser(u[target]),
    admins:a
  });
});

app.get('/api/admin/rooms',(req,res)=>{
  let user=req.query.user;
  if(!admins().includes(user))return res.status(403).json({error:'forbidden'});
  res.json(Object.values(rooms).filter(r=>!r.closed).map(roomPublic));
});


function requireAdmin(req,res){
  let username=(req.body&&req.body.username)||req.query.user;

  if(!username){
    res.status(400).json({error:'Missing admin username'});
    return null;
  }

  if(!admins().includes(username)){
    res.status(403).json({error:'forbidden'});
    return null;
  }

  return username;
}



/* ===== ADMIN ASSET MANAGER API =====
   No extra npm packages required. The browser sends images as base64 JSON.
   Flow: upload preview -> review -> approve -> commit correctly named asset to GitHub.
*/

const ADMIN_ASSET_TYPES=['items','pets','eggs','shops','backgrounds'];
const ADMIN_ASSET_SLOTS={
  items:['image'],
  pets:['idle','battle','portrait','egg','baby','young','adult'],
  eggs:['idle','cracked','hatch'],
  shops:['banner','keeper','background'],
  backgrounds:['image']
};

function safeAssetId(value){
  return String(value||'')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g,'_')
    .replace(/_+/g,'_')
    .replace(/^_+|_+$/g,'')
    .slice(0,80);
}

function safeAssetSlot(type,slot){
  slot=String(slot||'image').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'_');
  let allowed=ADMIN_ASSET_SLOTS[type]||['image'];
  return allowed.includes(slot)?slot:allowed[0];
}

function parseImageDataUrl(dataUrl){
  let match=String(dataUrl||'').match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if(!match)return null;
  let ext=match[1]==='jpeg'?'jpg':match[1];
  let buffer=Buffer.from(match[2],'base64');
  return {ext,buffer};
}

function pendingAssetDir(type){
  return path.join(UPLOADS_ROOT,'pending',type);
}

function pendingAssetPath(type,tempFile){
  return path.join(pendingAssetDir(type),path.basename(String(tempFile||'')));
}

function finalAssetRepoPath(type,targetId,slot,ext){
  targetId=safeAssetId(targetId);
  slot=safeAssetSlot(type,slot);
  ext=String(ext||'png').replace(/[^a-z0-9]/g,'')||'png';

  if(type==='items')return `public/assets/items/${targetId}.${ext}`;
  if(type==='pets')return `public/assets/pets/${targetId}/${slot}.${ext}`;
  if(type==='eggs')return `public/assets/pets/egg/${slot}.${ext}`;
  if(type==='shops')return `public/assets/shops/${targetId}_${slot}.${ext}`;
  if(type==='backgrounds')return `public/assets/backgrounds/${targetId}.${ext}`;

  return `public/assets/misc/${targetId}.${ext}`;
}

function publicPathFromRepoPath(repoPath){
  return '/'+String(repoPath||'').replace(/^public\//,'');
}

async function githubJson(method,url,body){
  let token=process.env.GITHUB_TOKEN;
  if(!token)throw new Error('Missing GITHUB_TOKEN environment variable.');

  let response=await fetch(url,{
    method,
    headers:{
      'Authorization':'Bearer '+token,
      'Accept':'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
      'Content-Type':'application/json'
    },
    body:body?JSON.stringify(body):undefined
  });

  let text=await response.text();
  let data={};
  try{data=text?JSON.parse(text):{};}catch(e){data={raw:text};}

  if(!response.ok){
    throw new Error((data&&data.message)||('GitHub request failed: '+response.status));
  }

  return data;
}

async function getGithubFileSha(repoPath){
  let owner=process.env.GITHUB_OWNER;
  let repo=process.env.GITHUB_REPO;
  let branch=process.env.GITHUB_BRANCH||'main';
  let url=`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(repoPath).replace(/%2F/g,'/')}?ref=${encodeURIComponent(branch)}`;

  try{
    let data=await githubJson('GET',url);
    return data.sha||null;
  }catch(err){
    if(String(err.message||'').includes('Not Found'))return null;
    return null;
  }
}

async function commitFileToGithub(repoPath,buffer,message){
  let owner=process.env.GITHUB_OWNER;
  let repo=process.env.GITHUB_REPO;
  let branch=process.env.GITHUB_BRANCH||'main';

  if(!owner||!repo)throw new Error('Missing GITHUB_OWNER or GITHUB_REPO environment variable.');

  let url=`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(repoPath).replace(/%2F/g,'/')}`;
  let sha=await getGithubFileSha(repoPath);
  let body={
    message,
    content:buffer.toString('base64'),
    branch
  };
  if(sha)body.sha=sha;

  return githubJson('PUT',url,body);
}

app.post('/api/admin/assets/upload-preview',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let type=String(req.body.type||'').trim().toLowerCase();
  let targetId=safeAssetId(req.body.targetId);
  let slot=String(req.body.slot||'image').trim().toLowerCase();
  let parsed=parseImageDataUrl(req.body.dataUrl);

  if(!ADMIN_ASSET_TYPES.includes(type))return res.status(400).json({error:'Invalid asset type'});
  if(!targetId)return res.status(400).json({error:'Missing targetId'});
  if(!parsed)return res.status(400).json({error:'Image must be PNG, JPG, or WEBP'});
  if(parsed.buffer.length>5*1024*1024)return res.status(400).json({error:'Image must be under 5MB'});

  slot=safeAssetSlot(type,slot);

  let dir=pendingAssetDir(type);
  fs.mkdirSync(dir,{recursive:true});

  let tempFile=`${targetId}_${slot}_${Date.now()}.${parsed.ext}`;
  fs.writeFileSync(path.join(dir,tempFile),parsed.buffer);

  res.json({
    ok:true,
    message:'Preview uploaded.',
    type,
    targetId,
    slot,
    tempFile,
    previewUrl:`/uploads/pending/${type}/${tempFile}`
  });
});

app.get('/api/admin/assets/pending',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let out=[];

  ADMIN_ASSET_TYPES.forEach(type=>{
    let dir=pendingAssetDir(type);
    if(!fs.existsSync(dir))return;

    fs.readdirSync(dir).forEach(file=>{
      let full=path.join(dir,file);
      let stat=fs.statSync(full);
      out.push({
        type,
        tempFile:file,
        previewUrl:`/uploads/pending/${type}/${file}`,
        size:stat.size,
        createdAt:stat.mtimeMs
      });
    });
  });

  out.sort((a,b)=>Number(b.createdAt)-Number(a.createdAt));
  res.json({ok:true,pending:out});
});

app.post('/api/admin/assets/reject',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let type=String(req.body.type||'').trim().toLowerCase();
  let tempFile=path.basename(String(req.body.tempFile||''));

  if(!ADMIN_ASSET_TYPES.includes(type))return res.status(400).json({error:'Invalid asset type'});
  if(!tempFile)return res.status(400).json({error:'Missing tempFile'});

  let full=pendingAssetPath(type,tempFile);
  if(fs.existsSync(full))fs.unlinkSync(full);

  res.json({ok:true,message:'Pending asset rejected.'});
});

app.post('/api/admin/assets/approve',async (req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  try{
    let type=String(req.body.type||'').trim().toLowerCase();
    let targetId=safeAssetId(req.body.targetId);
    let slot=String(req.body.slot||'image').trim().toLowerCase();
    let tempFile=path.basename(String(req.body.tempFile||''));

    if(!ADMIN_ASSET_TYPES.includes(type))return res.status(400).json({error:'Invalid asset type'});
    if(!targetId)return res.status(400).json({error:'Missing targetId'});
    if(!tempFile)return res.status(400).json({error:'Missing tempFile'});

    slot=safeAssetSlot(type,slot);

    let pending=pendingAssetPath(type,tempFile);
    if(!fs.existsSync(pending))return res.status(404).json({error:'Pending file not found'});

    let ext=(path.extname(tempFile).replace('.','')||'png').toLowerCase();
    let repoPath=finalAssetRepoPath(type,targetId,slot,ext);
    let publicPath=publicPathFromRepoPath(repoPath);
    let buffer=fs.readFileSync(pending);

    await commitFileToGithub(repoPath,buffer,`Admin asset update: ${repoPath}`);

    // Also copy locally so the current Render instance can display it until redeploy.
    let localFinal=path.join(__dirname,repoPath);
    fs.mkdirSync(path.dirname(localFinal),{recursive:true});
    fs.writeFileSync(localFinal,buffer);

    // Keep item/shop JSON paths aligned for systems that read image fields.
    if(type==='items'){
      let catalog=itemCatalog();
      catalog[targetId]=catalog[targetId]||{name:targetId};
      catalog[targetId].image=publicPath;
      writeJSON(itemsFile,catalog);
      await commitFileToGithub('data/items.json',Buffer.from(JSON.stringify(catalog,null,2)),`Admin item image path update: ${targetId}`);
    }

    if(type==='shops'){
      let catalog=shopCatalog();
      catalog[targetId]=catalog[targetId]||{id:targetId,name:targetId,items:{}};
      if(slot==='banner')catalog[targetId].bannerImage=publicPath;
      if(slot==='keeper')catalog[targetId].keeperImage=publicPath;
      if(slot==='background')catalog[targetId].backgroundImage=publicPath;
      writeJSON(shopsFile,catalog);
      await commitFileToGithub('data/shops.json',Buffer.from(JSON.stringify(catalog,null,2)),`Admin shop image path update: ${targetId}`);
    }

    fs.unlinkSync(pending);

    res.json({
      ok:true,
      message:'Asset approved and committed to GitHub.',
      type,
      targetId,
      slot,
      repoPath,
      publicPath
    });
  }catch(err){
    console.error(err);
    res.status(500).json({error:err.message||'Asset approval failed'});
  }
});



app.get('/api/admin/pet-species',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;
  res.json({ok:true,petSpecies:adminPetSpeciesCatalog()});
});

app.post('/api/admin/pet-data/sync-from-repo',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  try{
    // Merge mode keeps any live-only custom entries, but GitHub/repo wins when the same id exists in both places.
    // That fixes stale Render persistent data like an old type or hatchWeight.
    let sync=syncLivePetDataFromRepo({force:false,reason:'admin:'+adminUser});
    res.json({
      ok:true,
      message:sync.skipped?'Repo data is already live.':'Pet species and moves synced from GitHub/repo into live persistent data.',
      sync,
      petSpecies:adminPetSpeciesCatalog()
    });
  }catch(err){
    console.error(err);
    res.status(500).json({error:err.message||'Pet data sync failed'});
  }
});

app.post('/api/admin/pet-species/update',async (req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  try{
    let species=normalizeAdminPetSpeciesPayload(req.body||{});
    let catalog=petSpeciesCatalog();
    catalog[species.id]=species;

    writeJSON(petSpeciesFile,catalog);
    await commitFileToGithub('data/pet_species.json',Buffer.from(JSON.stringify(catalog,null,2)),`Admin pet species update: ${species.id}`);

    res.json({
      ok:true,
      message:'Pet species saved.',
      species,
      petSpecies:adminPetSpeciesCatalog()
    });
  }catch(err){
    console.error(err);
    res.status(400).json({error:err.message||'Pet species update failed'});
  }
});

app.post('/api/admin/items/update',async (req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  try{
    let itemId=safeAssetId(req.body.itemId);
    if(!itemId)return res.status(400).json({error:'Missing itemId'});

    let catalog=itemCatalog();
    let item=catalog[itemId]||{id:itemId,name:itemId};

    let name=String(req.body.name||item.name||itemId).trim().slice(0,64);
    let description=String(req.body.description||'').trim().slice(0,700);
    let category=String(req.body.category||'other').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,40)||'other';
    let itemType=String(req.body.itemType||'general').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,40)||'general';
    let rarity=String(req.body.rarity||'common').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,32)||'common';
    let price=Math.floor(Number(req.body.price));
    if(!Number.isFinite(price)||price<0)return res.status(400).json({error:'Invalid price'});
    if(price>999999)return res.status(400).json({error:'Price is too high'});

    let effects=[];
    if(req.body.effectsRaw!==undefined&&String(req.body.effectsRaw||'').trim()){
      try{
        effects=JSON.parse(String(req.body.effectsRaw||'[]'));
      }catch(err){
        return res.status(400).json({error:'Effects must be valid JSON'});
      }
      if(!Array.isArray(effects))return res.status(400).json({error:'Effects JSON must be an array'});
    }else if(Array.isArray(req.body.effects)){
      effects=req.body.effects;
    }else if(Array.isArray(item.effects)){
      effects=item.effects;
    }

    item.id=itemId;
    item.name=name||itemId;
    item.description=description;
    item.category=category;
    item.itemType=itemType;
    item.type=itemType;
    item.rarity=rarity;
    item.price=price;
    item.basePrice=price;
    item.image='/assets/items/'+itemId+'.png';
    item.effects=effects;
    item.usable=req.body.usable===false?false:true;

    catalog[itemId]=item;
    writeJSON(itemsFile,catalog);

    // Keep NPC shop sale price aligned when this item is already sold by a shop.
    let shops=shopCatalog();
    let shopChanged=false;
    Object.keys(shops||{}).forEach(shopId=>{
      let shop=shops[shopId]||{};
      if(shop.items&&shop.items[itemId]){
        if(typeof shop.items[itemId]==='object'){
          shop.items[itemId].price=price;
        }else{
          shop.items[itemId]={price};
        }
        shopChanged=true;
      }
    });
    if(shopChanged)writeJSON(shopsFile,shops);

    await commitFileToGithub('data/items.json',Buffer.from(JSON.stringify(catalog,null,2)),`Admin item metadata update: ${itemId}`);
    if(shopChanged){
      await commitFileToGithub('data/shops.json',Buffer.from(JSON.stringify(shops,null,2)),`Admin shop price sync: ${itemId}`);
    }

    res.json({
      ok:true,
      message:'Item updated.',
      item,
      items:adminItemCatalog(),
      npcShops:publicShopCatalog()
    });
  }catch(err){
    console.error(err);
    res.status(500).json({error:err.message||'Item update failed'});
  }
});

function adminItemCatalog(){
  let catalog=itemCatalog();

  return Object.keys(catalog).map(id=>{
    let item=catalog[id]||{};

    return {
      id,
      name:item.name||id,
      price:itemBasePrice(id),
      category:item.category||'other',
      itemType:item.itemType||item.type||'general',
      rarity:item.rarity||'common',
      description:item.description||'',
      image:item.image||('/assets/items/'+id+'.png'),
      effects:Array.isArray(item.effects)?item.effects:[],
      usable:item.usable!==false
    };
  }).sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id)));
}

function adminRoomSummary(){
  return Object.values(rooms).filter(r=>!r.closed).map(roomPublic);
}

function adminListingArray(){
  let mk=market();
  return Object.values(mk.listings||{})
    .filter(x=>x&&Number(x.quantity||0)>0)
    .sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
}

function adminPlayerPayload(targetUsername){
  let allUsers=normalizeAllUsers();
  let allPets=pets();

  if(!allUsers[targetUsername])return null;

  if(!allPets[targetUsername]){
    allPets[targetUsername]=defaultPetProfile(targetUsername);
    writeJSON(petsFile,allPets);
  }

  let profile=normalizePetProfile(allPets[targetUsername],targetUsername);
  allPets[targetUsername]=profile;
  writeJSON(petsFile,allPets);

  return {
    user:safeUser(allUsers[targetUsername]),
    admin:admins().includes(targetUsername),
    profile,
    listings:adminListingArray().filter(x=>x.seller===targetUsername)
  };
}

function saveAdminTargetProfile(targetUsername,profile){
  savePetProfile(targetUsername,profile);
  return adminPlayerPayload(targetUsername);
}

function adminAgePet(pet,stage,level){
  const stages=['egg','baby','young','adult'];

  if(stage&&stages.includes(stage)){
    if(stage!=='egg'&&pet.stage==='egg'){
      hatchPet(pet);
    }

    pet.stage=stage;

    if(stage==='egg'){
      pet.species=null;
      pet.type=null;
      pet.personality=null;
      pet.name=pet.name||'Mystery Egg';
      pet.moves=['tackle'];
    }
  }

  if(level!==undefined&&level!==null&&level!==''){
    let nextLevel=clamp(Math.floor(Number(level||1)),1,100);
    let currentLevel=Number(pet.stats.level||1);
    let diff=nextLevel-currentLevel;

    pet.stats.level=nextLevel;
    pet.stats.xp=0;

    if(diff>0){
      pet.stats.maxHp=Number(pet.stats.maxHp||20)+(diff*2);
      pet.stats.attack=Number(pet.stats.attack||5)+Math.floor(diff/2);
      pet.stats.defense=Number(pet.stats.defense||4)+Math.floor(diff/3);
      pet.stats.speed=Number(pet.stats.speed||5)+Math.floor(diff/3);
    }

    pet.stats.hp=pet.stats.maxHp;
  }

  pet.lastUpdated=Date.now();
  return pet;
}

app.get('/api/admin/dashboard',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let allUsers=users();
  let allPets=pets();
  let listings=adminListingArray();
  let openRooms=adminRoomSummary();

  res.json({
    ok:true,
    admin:adminUser,
    counts:{
      users:Object.keys(allUsers).length,
      petProfiles:Object.keys(allPets).length,
      openRooms:openRooms.length,
      onlineUsers:presence().length,
      listings:listings.length
    },
    onlineUsers:presence(),
    rooms:openRooms,
    recentListings:listings.slice(0,20),
    items:adminItemCatalog(),
    petSpecies:adminPetSpeciesCatalog()
  });
});


app.post('/api/admin/users/reset-defaults',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let allUsers=normalizeAllUsers();
  let resetPets={};

  Object.keys(allUsers).forEach(username=>{
    resetPets[username]=defaultPetProfile(username);
  });

  writeJSON(petsFile,resetPets);

  let mk=market();
  mk.listings={};
  saveMarket(mk);

  Object.keys(resetPets).forEach(username=>{
    sendToUser(username,{type:'petUpdate',profile:resetPets[username]});
  });

  res.json({
    ok:true,
    message:'All users reset to default coins, starter egg, and starter inventory. Marketplace listings were cleared.',
    resetUsers:Object.keys(resetPets).length
  });
});

app.get('/api/admin/player',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let target=String(req.query.target||'').trim();
  if(!target)return res.status(400).json({error:'Missing target username'});

  let payload=adminPlayerPayload(target);
  if(!payload)return res.status(404).json({error:'Player not found'});

  res.json({ok:true,...payload,items:adminItemCatalog()});
});

app.post('/api/admin/player/coins',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let target=String(req.body.target||req.body.targetUsername||'').trim();
  let mode=String(req.body.mode||'add');
  let amount=Math.floor(Number(req.body.amount||0));

  if(!target)return res.status(400).json({error:'Missing target username'});
  if(!['add','set'].includes(mode))return res.status(400).json({error:'Invalid coin mode'});

  let payload=adminPlayerPayload(target);
  if(!payload)return res.status(404).json({error:'Player not found'});

  let profile=payload.profile;

  if(mode==='set'){
    profile.money=clamp(amount,0,999999999);
  }else{
    profile.money=clamp(Number(profile.money||0)+amount,0,999999999);
  }

  let updated=saveAdminTargetProfile(target,profile);

  res.json({
    ok:true,
    message:'Coins updated for '+target+'.',
    ...updated,
    items:adminItemCatalog()
  });
});

app.post('/api/admin/player/item',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let target=String(req.body.target||req.body.targetUsername||'').trim();
  let itemId=String(req.body.itemId||'').trim();
  let mode=String(req.body.mode||'add');
  let quantity=Math.floor(Number(req.body.quantity||0));

  if(!target)return res.status(400).json({error:'Missing target username'});
  if(!getItemDef(itemId))return res.status(400).json({error:'Unknown item'});
  if(!['add','remove','set'].includes(mode))return res.status(400).json({error:'Invalid item mode'});
  if(quantity<0)return res.status(400).json({error:'Invalid quantity'});

  let payload=adminPlayerPayload(target);
  if(!payload)return res.status(404).json({error:'Player not found'});

  let profile=payload.profile;
  profile.inventory=profile.inventory||{};

  if(mode==='set'){
    profile.inventory[itemId]=quantity;
  }else if(mode==='remove'){
    profile.inventory[itemId]=Math.max(0,Number(profile.inventory[itemId]||0)-quantity);
  }else{
    profile.inventory[itemId]=Number(profile.inventory[itemId]||0)+quantity;
  }

  if(profile.inventory[itemId]<=0)delete profile.inventory[itemId];

  let updated=saveAdminTargetProfile(target,profile);

  res.json({
    ok:true,
    message:'Inventory updated for '+target+'.',
    ...updated,
    items:adminItemCatalog()
  });
});

app.post('/api/admin/player/pet-age',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let target=String(req.body.target||req.body.targetUsername||'').trim();
  let selectedPetId=String(req.body.petId||'').trim();
  let stage=String(req.body.stage||'').trim();
  let level=req.body.level;

  if(!target)return res.status(400).json({error:'Missing target username'});
  if(stage&&!['egg','baby','young','adult'].includes(stage))return res.status(400).json({error:'Invalid pet stage'});

  let payload=adminPlayerPayload(target);
  if(!payload)return res.status(404).json({error:'Player not found'});

  let profile=payload.profile;
  let pet=selectedPetId?profile.pets[selectedPetId]:activePet(profile);

  if(!pet)return res.status(404).json({error:'Pet not found'});

  adminAgePet(pet,stage,level);
  let updated=saveAdminTargetProfile(target,profile);

  res.json({
    ok:true,
    message:'Pet updated for '+target+'.',
    ...updated,
    items:adminItemCatalog()
  });
});

app.post('/api/admin/player/restore-pet',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let target=String(req.body.target||req.body.targetUsername||'').trim();
  let selectedPetId=String(req.body.petId||'').trim();

  if(!target)return res.status(400).json({error:'Missing target username'});

  let payload=adminPlayerPayload(target);
  if(!payload)return res.status(404).json({error:'Player not found'});

  let profile=payload.profile;
  let pet=selectedPetId?profile.pets[selectedPetId]:activePet(profile);

  if(!pet)return res.status(404).json({error:'Pet not found'});

  pet.needs={hunger:100,happiness:100,energy:100,cleanliness:100};
  pet.stats.hp=pet.stats.maxHp;
  pet.lastUpdated=Date.now();

  let updated=saveAdminTargetProfile(target,profile);

  res.json({
    ok:true,
    message:'Pet restored for '+target+'.',
    ...updated,
    items:adminItemCatalog()
  });
});

app.get('/api/admin/market',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  res.json({
    ok:true,
    listings:adminListingArray(),
    shops:publicShopProfiles(),
    items:itemCatalog(),
    npcShops:publicShopCatalog(),
    limits:MARKET_LIMITS
  });
});

app.post('/api/admin/shops/update',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let shopId=String(req.body.shopId||'').trim();
  let catalog=shopCatalog();
  let shop=catalog[shopId];

  if(!shop)return res.status(404).json({error:'Shop not found'});

  shop.name=String(req.body.name||shop.name||shopId).trim().slice(0,40)||shopId;
  shop.icon=String(req.body.icon||shop.icon||'🏪').trim().slice(0,4)||'🏪';
  shop.theme=String(req.body.theme||shop.theme||'classic').trim().slice(0,32)||'classic';
  shop.description=String(req.body.description||shop.description||'').trim().slice(0,180);
  shop.openHour=normalizeHour(req.body.openHour,0);
  shop.closeHour=Number(req.body.closeHour)===24?24:normalizeHour(req.body.closeHour,24);
  shop.bannerImage=String(req.body.bannerImage||shop.bannerImage||('/assets/shops/'+shopId+'_banner.png')).trim().slice(0,160);
  shop.keeperImage=String(req.body.keeperImage||shop.keeperImage||('/assets/shops/'+shopId+'_keeper.png')).trim().slice(0,160);
  shop.forceOpen=!!req.body.forceOpen;
  shop.forceClosed=!!req.body.forceClosed;
  if(shop.forceOpen&&shop.forceClosed)shop.forceClosed=false;

  catalog[shopId]=shop;
  writeJSON(shopsFile,catalog);

  res.json({
    ok:true,
    message:'Shop updated.',
    npcShops:publicShopCatalog()
  });
});

app.post('/api/admin/market/remove',(req,res)=>{
  let adminUser=requireAdmin(req,res);
  if(!adminUser)return;

  let listingId=String(req.body.listingId||'');
  let returnEscrow=req.body.returnEscrow!==false;
  let mk=market();
  let listing=mk.listings&&mk.listings[listingId];

  if(!listing)return res.status(404).json({error:'Listing not found'});

  let sellerUsername=listing.seller;
  let sellerProfile=null;

  if(returnEscrow&&sellerUsername){
    let all=pets();
    sellerProfile=normalizePetProfile(all[sellerUsername]||defaultPetProfile(sellerUsername),sellerUsername);
    sellerProfile.inventory[listing.itemId]=(sellerProfile.inventory[listing.itemId]||0)+Number(listing.quantity||0);
    all[sellerUsername]=sellerProfile;
    writeJSON(petsFile,all);
    sendToUser(sellerUsername,{type:'petUpdate',profile:sellerProfile});
  }

  delete mk.listings[listingId];
  saveMarket(mk);

  res.json({
    ok:true,
    message:'Listing removed.',
    listings:adminListingArray(),
    sellerProfile
  });
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
    species:mergedPetSpecies(),
    limits:PET_LIMITS,
    shop:itemCatalog(),
    shops:publicShopCatalog(),
    moves:moves(),
    zones:EXPLORE_ZONES,
    daily:normalizeDaily(profile),
    hatchSystem:{types:HATCH_TYPES,traitInfluence:TRAIT_TYPE_INFLUENCE,speciesRegistry:SPECIES_HATCH_REGISTRY}
  });
});

app.get('/api/pet/daily',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let profile=getPetProfile(username);

  res.json({
    ok:true,
    daily:normalizeDaily(profile),
    profile
  });
});

app.post('/api/pet/claim-quest',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let questId=String(req.body.questId||'');
  let profile=getPetProfile(username);
  let pet=activePet(profile);
  let daily=normalizeDaily(profile);
  let quest=daily.quests.find(q=>q.id===questId);

  if(!quest)return res.json({error:'Quest not found'});
  if(quest.claimed)return res.json({error:'Quest already claimed'});
  if(Number(quest.progress||0)<Number(quest.target||1))return res.json({error:'Quest is not complete yet'});

  quest.claimed=true;
  let granted=grantReward(profile,pet,quest.reward||{});

  savePetProfile(username,profile);

  res.json({
    ok:true,
    message:'Claimed '+quest.title+' reward!',
    reward:granted,
    daily:profile.daily,
    profile
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

  let a=EGG_CARE_ACTIONS[action];
  if(!a)return res.json({error:'Unknown egg care action'});

  if(a.balanced){
    let traits=['warm','cold','wet','dry','light','dark'];
    let lowest=traits
      .map(trait=>({trait,value:Number(pet.eggTraits[trait]||0)}))
      .sort((x,y)=>x.value-y.value)[0];
    if(lowest)pet.eggTraits[lowest.trait]=Number(pet.eggTraits[lowest.trait]||0)+1;
  }

  Object.keys(a.traits||{}).forEach(trait=>{
    pet.eggTraits[trait]=Number(pet.eggTraits[trait]||0)+Number(a.traits[trait]||0);
  });

  pet.needs.happiness=clamp((pet.needs.happiness||70)+1,0,100);
  pet.affection=clamp(Number(pet.affection||0)+Number(a.affection||1),0,100);
  pet.lastUpdated=Date.now();

  trackQuest(profile,'eggCare',1);
  trackQuest(profile,'bondGain',1);

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
  let item=getItemDef(itemId);

  if(!item)return res.json({error:'Unknown item'});

  let sale=getShopSale(itemId);
  if(!sale)return res.json({error:'This item is not currently sold in shops'});
  if(!isShopOpen(sale.shop))return res.json({error:(sale.shop.name||'This shop')+' is currently closed'});

  let price=Number((sale.sale&&sale.sale.price)!==undefined?sale.sale.price:itemBasePrice(itemId));
  if(price<0)return res.json({error:'Invalid item price'});

  let profile=getPetProfile(username);

  if((profile.money||0)<price)return res.json({error:'Not enough coins'});

  profile.money-=price;
  profile.inventory[itemId]=(profile.inventory[itemId]||0)+1;

  savePetProfile(username,profile);

  res.json({
    ok:true,
    profile,
    item,
    price
  });
});

app.post('/api/pet/use-item',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let itemId=String(req.body.itemId||'');
  let item=getItemDef(itemId);

  if(!item)return res.json({error:'Unknown item'});
  if(item.usable===false)return res.json({error:'This item cannot be used directly'});

  let profile=getPetProfile(username);

  if((profile.inventory[itemId]||0)<=0)return res.json({error:'You do not have this item'});

  let pet=activePet(profile);
  let effects=Array.isArray(item.effects)?item.effects:[];
  let hatched=false;
  let messages=[];

  function applyPetNeed(target,value){
    if(!pet.needs)pet.needs={hunger:80,happiness:70,energy:80,cleanliness:90};
    pet.needs[target]=clamp(Number(pet.needs[target]||0)+Number(value||0),0,100);
  }

  function applyEggInfluence(target,value){
    if(!pet||pet.stage!=='egg'){
      throw new Error('That item only works on eggs');
    }

    pet.eggTraits=pet.eggTraits||{warm:0,cold:0,wet:0,dry:0,light:0,dark:0};

    if(target==='all'){
      ['warm','cold','wet','dry','light','dark'].forEach(k=>{
        pet.eggTraits[k]=Number(pet.eggTraits[k]||0)+Number(value||0);
      });
    }else{
      pet.eggTraits[target]=Number(pet.eggTraits[target]||0)+Number(value||0);
    }

    trackQuest(profile,'eggCare',1);
    trackQuest(profile,'bondGain',1);
  }

  try{
    effects.forEach(effect=>{
      if(!effect||!effect.type)return;

      if(effect.type==='pet_need'){
        applyPetNeed(effect.target,effect.value);
        if(effect.target==='hunger')trackQuest(profile,'feed',1);
        if(effect.target==='cleanliness')trackQuest(profile,'clean',1);
        if(effect.target==='energy')trackQuest(profile,'rest',1);
        messages.push('Updated '+effect.target+'.');
      }

      if(effect.type==='random_pet_need'){
        let targets=effect.targets||['hunger','happiness','energy','cleanliness'];
        let target=targets[Math.floor(Math.random()*targets.length)];
        let amount=randInt(Number(effect.min||0),Number(effect.max||1));
        applyPetNeed(target,amount);
        messages.push('Randomly changed '+target+'.');
      }

      if(effect.type==='egg_influence'){
        applyEggInfluence(effect.target,effect.value);
        messages.push('Adjusted egg '+effect.target+'.');
      }

      if(effect.type==='egg_progress'){
        if(!pet||pet.stage!=='egg')throw new Error('That item only works on eggs');
        pet.eggTraits=pet.eggTraits||{warm:0,cold:0,wet:0,dry:0,light:0,dark:0};
        pet.eggTraits.warm=Number(pet.eggTraits.warm||0)+Number(effect.value||0);
        messages.push('Advanced egg progress.');
      }

      if(effect.type==='egg_balance'){
        if(!pet||pet.stage!=='egg')throw new Error('That item only works on eggs');
        let traits=['warm','cold','wet','dry','light','dark'];
        let values=traits.map(k=>Number(pet.eggTraits[k]||0));
        let avg=Math.floor(values.reduce((a,b)=>a+b,0)/traits.length);
        traits.forEach(k=>{ pet.eggTraits[k]=avg; });
        messages.push('Balanced egg traits.');
      }

      if(effect.type==='random_egg_influence'){
        if(!pet||pet.stage!=='egg')throw new Error('That item only works on eggs');
        let targets=effect.targets||['warm','cold','wet','dry','light','dark'];
        let target=targets[Math.floor(Math.random()*targets.length)];
        let amount=randInt(Number(effect.min||0),Number(effect.max||1));
        pet.eggTraits[target]=Number(pet.eggTraits[target]||0)+amount;
        messages.push('Randomly adjusted '+target+'.');
      }

      if(effect.type==='training'){
        if(!pet||pet.stage==='egg')throw new Error('Eggs cannot use training items');
        let target=effect.target||'all';
        let value=Number(effect.value||1);
        if(target==='all'){
          TRAINABLE_STATS.forEach(stat=>{ pet.stats[stat]=Number(pet.stats[stat]||0)+value; });
        }else if(TRAINABLE_STATS.includes(target)){
          pet.stats[target]=Number(pet.stats[target]||0)+value;
        }
        trackQuest(profile,'train',1);
        messages.push('Training improved.');
      }

      if(effect.type==='random_training'){
        if(!pet||pet.stage==='egg')throw new Error('Eggs cannot use training items');
        let targets=effect.targets||TRAINABLE_STATS;
        let target=targets[Math.floor(Math.random()*targets.length)];
        let value=Number(effect.value||1);
        if(TRAINABLE_STATS.includes(target)){
          pet.stats[target]=Number(pet.stats[target]||0)+value;
        }
        trackQuest(profile,'train',1);
        messages.push('Random training improved '+target+'.');
      }

      if(effect.type==='unlock'){
        profile.unlocks=profile.unlocks||{};
        profile.unlocks[effect.target]=profile.unlocks[effect.target]||[];
        if(Array.isArray(profile.unlocks[effect.target])){
          if(!profile.unlocks[effect.target].includes(effect.value)){
            profile.unlocks[effect.target].push(effect.value);
          }
        }else{
          profile.unlocks[effect.target]=effect.value;
        }
        messages.push('Unlocked '+effect.target+'.');
      }

      if(effect.type==='profile_cosmetic'||effect.type==='temporary_effect'||effect.type==='site_effect'||effect.type==='explore_boost'||effect.type==='battle_boost'||effect.type==='training_boost'||effect.type==='currency_alt'||effect.type==='info_reveal'||effect.type==='egg_trait_lock'){
        profile.effects=profile.effects||[];
        profile.effects.push({
          id:'eff_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6),
          itemId,
          type:effect.type,
          target:effect.target||'',
          value:effect.value,
          createdAt:Date.now(),
          durationHours:effect.durationHours,
          durationMinutes:effect.durationMinutes,
          durationActions:effect.durationActions,
          durationTurns:effect.durationTurns
        });
        messages.push('Effect stored.');
      }
    });
  }catch(err){
    return res.json({error:err.message});
  }

  profile.inventory[itemId]--;
  if(profile.inventory[itemId]<=0)delete profile.inventory[itemId];

  pet.affection=clamp(Number(pet.affection||0)+1,0,100);
  trackQuest(profile,'bondGain',1);

  if(pet.stage==='egg'){
    let total=Object.values(pet.eggTraits||{}).reduce((x,y)=>x+Number(y||0),0);
    if(total>=18){
      hatchPet(pet);
      hatched=true;
    }
  }

  pet.lastUpdated=Date.now();

  savePetProfile(username,profile);

  res.json({
    ok:true,
    hatched,
    message:hatched ? 'Your egg hatched into '+pet.name+'!' : (messages.join(' ')||'Used '+(item.name||itemId)+'.'),
    profile
  });
});

app.post('/api/pet/play',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let profile=getPetProfile(username);
  let pet=activePet(profile);

  pet.needs.happiness=clamp((pet.needs.happiness||0)+12,0,100);
  pet.needs.energy=clamp((pet.needs.energy||0)-8,0,100);
  pet.affection=clamp(Number(pet.affection||0)+2,0,100);

  let xpGain=pet.personality==='playful'?5:3;
  let xpResult=addPetXp(pet,xpGain);

  profile.money=(profile.money||0)+5;
  pet.lastUpdated=Date.now();

  trackQuest(profile,'play',1);
  trackQuest(profile,'bondGain',2);
  trackQuest(profile,'coinsEarned',5);

  savePetProfile(username,profile);
  res.json({
    ok:true,
    message:'You played together. +5 coins, +'+xpGain+' XP.',
    reward:{coins:5,xp:xpGain,xpResult},
    profile
  });
});

app.post('/api/pet/train',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let stat=String(req.body.stat||'').toLowerCase();
  if(!TRAINABLE_STATS.includes(stat))return res.json({error:'Invalid training stat'});

  let profile=getPetProfile(username);
  let pet=activePet(profile);

  if(!pet||pet.stage==='egg')return res.json({error:'Eggs cannot train yet'});
  if(Number(pet.needs.energy||0)<8)return res.json({error:pet.name+' is too tired to train'});

  let result=trainPetStat(pet,stat);
  pet.lastUpdated=Date.now();

  trackQuest(profile,'train',1);
  trackQuest(profile,'bondGain',1);

  let moveText=result.xpResult.learnedMove?' Learned '+result.xpResult.learnedMove.name+'!':'';
  let levelText=result.xpResult.leveled?' Level up!':'';

  savePetProfile(username,profile);

  res.json({
    ok:true,
    message:pet.name+' trained '+stat+' +'+result.gain+'.'+levelText+moveText,
    result,
    profile
  });
});

app.post('/api/pet/explore',(req,res)=>{
  req.body.zoneId='meadow';
  return handleExploreRequest(req,res);
});

app.post('/api/pet/explore-zone',handleExploreRequest);

function handleExploreRequest(req,res){
  let username=requireUser(req,res);
  if(!username)return;

  let zoneId=String(req.body.zoneId||'meadow');
  let profile=getPetProfile(username);
  let pet=activePet(profile);
  let result=resolveExplore(profile,pet,zoneId);

  if(result.error)return res.json({error:result.error});

  savePetProfile(username,profile);

  res.json({
    ok:true,
    message:result.message,
    result,
    profile
  });
}

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

app.post('/api/pet/convert-to-egg',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let petIdToConvert=String(req.body.petId||'');
  let profile=getPetProfile(username);
  let targetPet=profile.pets&&profile.pets[petIdToConvert];

  if(!targetPet){
    return res.json({error:'Pet not found'});
  }

  if((targetPet.stage||'egg')==='egg'){
    return res.json({error:'Eggs cannot be converted into eggs.'});
  }

  let nonEggIds=Object.keys(profile.pets||{}).filter(pid=>{
    let pet=profile.pets[pid];
    return pet&&(pet.stage||'egg')!=='egg';
  });

  if(nonEggIds.length<=1){
    return res.json({error:'You cannot convert your last hatched pet.'});
  }

  let oldName=targetPet.name||'your pet';

  delete profile.pets[petIdToConvert];

  let newPet=createEggPet(username);
  profile.pets[newPet.id]=newPet;

  if(profile.activePetId===petIdToConvert){
    let nextActiveId=Object.keys(profile.pets).find(pid=>{
      let pet=profile.pets[pid];
      return pet&&(pet.stage||'egg')!=='egg';
    })||newPet.id;

    profile.activePetId=nextActiveId;
  }

  savePetProfile(username,profile);

  res.json({
    ok:true,
    message:oldName+' was rescued and you received a fresh Mystery Egg.',
    egg:newPet,
    profile
  });
});

app.post('/api/pet/sell',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let petIdToSell=String(req.body.petId||'');
  let profile=getPetProfile(username);
  let targetPet=profile.pets&&profile.pets[petIdToSell];

  if(!targetPet){
    return res.json({error:'Pet not found'});
  }

  let ids=Object.keys(profile.pets||{});

  if(ids.length<=1){
    return res.json({error:'You cannot sell your last pet.'});
  }

  let oldName=targetPet.name||'your pet';
  let value=petSellValue(targetPet);

  delete profile.pets[petIdToSell];
  profile.money=Number(profile.money||0)+value;

  if(profile.activePetId===petIdToSell){
    profile.activePetId=Object.keys(profile.pets||{})[0]||null;
  }

  savePetProfile(username,profile);

  res.json({
    ok:true,
    message:oldName+' was released for '+value+' coins.',
    coins:value,
    profile
  });
});


/* ===== MARKETPLACE API ===== */

function marketListingsArray(){
  let mk=market();
  return Object.values(mk.listings||{})
    .filter(x=>x&&Number(x.quantity||0)>0)
    .sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
}

function publicShopProfiles(){
  let listings=marketListingsArray();
  let all=pets();

  return Object.keys(all).map(username=>{
    let profile=normalizePetProfile(all[username],username);
    let active=activePet(profile);
    let listingCount=listings.filter(x=>x.seller===username).length;
    if(!profile.market.shopOpen&&listingCount<=0)return null;

    return {
      username,
      shopOpen:!!profile.market.shopOpen,
      shopName:profile.market.shopName||username+"'s Stall",
      shopTheme:profile.market.shopTheme||'classic',
      listingCount,
      pet:active?{
        id:active.id,
        name:active.name,
        stage:active.stage,
        species:active.species,
        type:active.type,
        emoji:active.emoji,
        eggTraits:active.eggTraits||{}
      }:null
    };
  }).filter(Boolean);
}

function itemName(itemId){
  return getItemName(itemId);
}

app.get('/api/market/listings',(req,res)=>{
  res.json({
    ok:true,
    listings:marketListingsArray(),
    shops:publicShopProfiles(),
    items:itemCatalog(),
    npcShops:publicShopCatalog(),
    limits:MARKET_LIMITS
  });
});

app.get('/api/market/profile',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let profile=getPetProfile(username);
  let listings=marketListingsArray().filter(x=>x.seller===username);

  res.json({
    ok:true,
    profile,
    listings,
    shops:publicShopProfiles(),
    items:itemCatalog(),
    npcShops:publicShopCatalog(),
    limits:MARKET_LIMITS
  });
});

app.post('/api/market/shop-settings',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let profile=getPetProfile(username);
  profile.market=profile.market||{};
  profile.market.shopOpen=!!req.body.shopOpen;
  profile.market.shopName=String(req.body.shopName||profile.market.shopName||username+"'s Stall").trim().slice(0,32)||username+"'s Stall";
  profile.market.shopTheme=String(req.body.shopTheme||profile.market.shopTheme||'classic').trim().slice(0,24)||'classic';

  savePetProfile(username,profile);

  res.json({ok:true,profile,shops:publicShopProfiles()});
});

app.post('/api/market/list',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let itemId=String(req.body.itemId||'').trim();
  let quantity=Math.floor(Number(req.body.quantity||1));
  let price=Math.floor(Number(req.body.price||0));

  if(!getItemDef(itemId))return res.json({error:'Unknown item'});
  if(quantity<1||quantity>MARKET_LIMITS.maxQuantityPerListing)return res.json({error:'Invalid quantity'});
  if(price<MARKET_LIMITS.minPrice||price>MARKET_LIMITS.maxPrice)return res.json({error:'Invalid price'});

  let mk=market();
  mk.listings=mk.listings||{};
  mk.nextId=Number(mk.nextId||1);

  let activeListings=Object.values(mk.listings).filter(x=>x.seller===username&&Number(x.quantity||0)>0).length;
  if(activeListings>=MARKET_LIMITS.maxListingsPerUser)return res.json({error:'You have too many active listings'});

  let all=pets();
  let profile=normalizePetProfile(all[username]||defaultPetProfile(username),username);

  if((profile.inventory[itemId]||0)<quantity)return res.json({error:'Not enough '+itemName(itemId)+' in inventory'});

  profile.inventory[itemId]-=quantity;

  let listingId='lst_'+Date.now().toString(36)+'_'+(mk.nextId++).toString(36);
  mk.listings[listingId]={
    id:listingId,
    seller:username,
    itemId,
    itemName:itemName(itemId),
    price,
    quantity,
    createdAt:Date.now()
  };

  all[username]=profile;
  writeJSON(petsFile,all);
  saveMarket(mk);
  sendToUser(username,{type:'petUpdate',profile});

  res.json({ok:true,profile,listing:mk.listings[listingId],listings:marketListingsArray()});
});

app.post('/api/market/cancel',(req,res)=>{
  let username=requireUser(req,res);
  if(!username)return;

  let listingId=String(req.body.listingId||'');
  let mk=market();
 let listing=mk.listings && mk.listings[listingId];
if(!listing) return res.json({error:'Listing not found'});

// 🔥 lock seller before mutation
let sellerUsername = listing.seller;

  if(!listing)return res.json({error:'Listing not found'});
  if(listing.seller!==username)return res.status(403).json({error:'You do not own this listing'});

  let all=pets();
  let profile=normalizePetProfile(all[username]||defaultPetProfile(username),username);
  let qty=Number(listing.quantity||0);

  if(qty>0){
    profile.inventory[listing.itemId]=(profile.inventory[listing.itemId]||0)+qty;
  }

  delete mk.listings[listingId];
  all[username]=profile;
  writeJSON(petsFile,all);
  saveMarket(mk);
  sendToUser(username,{type:'petUpdate',profile});

  res.json({ok:true,profile,listings:marketListingsArray()});
});

app.post('/api/market/buy',(req,res)=>{
  let buyer=requireUser(req,res);
  if(!buyer)return;

  let listingId=String(req.body.listingId||'');
  let quantity=Math.floor(Number(req.body.quantity||1));

  let mk=market();
  let listing=mk.listings && mk.listings[listingId];

  if(!listing)return res.json({error:'Listing not found'});
  if(quantity<1)return res.json({error:'Invalid quantity'});
  if(quantity>Number(listing.quantity||0))return res.json({error:'Not enough quantity available'});
  if(listing.seller===buyer)return res.json({error:'You cannot buy your own listing'});

  // ✅ FIX: define seller FIRST
  let sellerUsername = listing.seller;

  let all=pets();

  let buyerProfile=normalizePetProfile(
    all[buyer] || defaultPetProfile(buyer),
    buyer
  );

  // ✅ ensure seller exists
  if(!all[sellerUsername]){
    all[sellerUsername]=defaultPetProfile(sellerUsername);
  }

  let sellerProfile=normalizePetProfile(
    all[sellerUsername],
    sellerUsername
  );

  let total=Number(listing.price||0)*quantity;
  let tax=Math.floor(total*MARKET_LIMITS.marketTaxRate);
  let sellerReceives=total-tax;

  if((buyerProfile.money||0)<total){
    return res.json({error:'Not enough coins'});
  }

  // 💰 transaction
  buyerProfile.money-=total;
  sellerProfile.money=(sellerProfile.money||0)+sellerReceives;

  buyerProfile.inventory[listing.itemId]=
    (buyerProfile.inventory[listing.itemId]||0)+quantity;

  // 📉 update listing
  listing.quantity-=quantity;
  listing.lastPurchasedAt=Date.now();
  listing.lastBuyer=buyer;

  if(listing.quantity<=0){
    delete mk.listings[listingId];
  }

  // 💾 save
  all[buyer]=buyerProfile;
  all[sellerUsername]=sellerProfile;

  writeJSON(petsFile,all);
  saveMarket(mk);

  // 🔄 realtime updates
  sendToUser(buyer,{type:'petUpdate',profile:buyerProfile});
  sendToUser(sellerUsername,{type:'petUpdate',profile:sellerProfile});

  res.json({
    ok:true,
    message:'Purchased '+quantity+' '+itemName(listing.itemId)+' for '+total+' coins.',
    profile:buyerProfile,
    listings:marketListingsArray(),
    shops:publicShopProfiles()
  });
});
/* ===== ROOM / WEBSOCKET ===== */

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
    chat:r.chat.slice(-50),
    ready:r.ready||{}
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
      let name=ws.username||'Guest';
      let oldRoom=rooms[ws.roomId];

      if(oldRoom&&oldRoom.id){
        oldRoom.players=oldRoom.players.filter(p=>p!==name);
        oldRoom.seats=oldRoom.seats.map(s=>s&&s.name===name?null:s);
        if(oldRoom.ready)delete oldRoom.ready[name];
        if(oldRoom.ready)delete oldRoom.ready[name];
        broadcastRoom(oldRoom.id,{type:'roomUpdate',room:roomPublic(oldRoom)});
      }

      let rid=id();

      rooms[rid]={
        id:rid,
        owner:name,
        private:!!m.private,
        closed:false,
        selectedGame:null,
        started:false,
        seats:[],
        players:[],
        chat:[],
        gameState:null,
        gameStateType:'state',
        gameVersion:0,
        gameUpdatedAt:0,
        ready:{}
      };

      ws.roomId=rid;
      ws.location='Room';
      rooms[rid].players.push(name);

      ws.send(JSON.stringify({type:'roomJoined',room:roomPublic(rooms[rid])}));
      pushPresence();
    }

    if(m.type==='setRoomPrivacy'){
      let r=rooms[ws.roomId];

      if(!r){
        ws.send(JSON.stringify({type:'error',message:'Join or create a room first.'}));
        return;
      }

      let name=ws.username||'Guest';
      if(r.owner!==name&&!admins().includes(name)){
        ws.send(JSON.stringify({type:'error',message:'Only the room owner can change room privacy.'}));
        return;
      }

      r.private=!!m.private;
      broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)});
      pushPresence();
    }

    if(m.type==='joinRoom'){
      let targetId=String(m.roomId||'').toUpperCase();
      let r=rooms[targetId];

      if(!r||r.closed){
        ws.send(JSON.stringify({type:'error',message:'Room not found'}));
        return;
      }

      let name=ws.username||'Guest';
      let oldRoom=rooms[ws.roomId];

      if(oldRoom&&oldRoom.id!==r.id){
        oldRoom.players=oldRoom.players.filter(p=>p!==name);
        oldRoom.seats=oldRoom.seats.map(s=>s&&s.name===name?null:s);

        if(oldRoom.owner===name||m.closeCurrent){
          oldRoom.closed=true;
          broadcastRoom(oldRoom.id,{type:'roomClosed'});
          wss.clients.forEach(c=>{
            if(c.readyState===1&&c.roomId===oldRoom.id){
              c.roomId='';
              c.location='Home';
            }
          });
        }else{
          broadcastRoom(oldRoom.id,{type:'roomUpdate',room:roomPublic(oldRoom)});
        }
      }

      ws.roomId=r.id;
      ws.location='Room';

      if(!r.players.includes(name))r.players.push(name);

      ws.send(JSON.stringify({type:'roomJoined',room:roomPublic(r)}));

      if(r.gameState){
        ws.send(JSON.stringify({
          type:'gameMove',
          data:{type:r.gameStateType||'state',state:r.gameState},
          version:r.gameVersion||0
        }));
      }

      broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)});
      pushPresence();
    }

    if(m.type==='leaveRoom'){
      let r=rooms[ws.roomId];

      if(r){
        r.players=r.players.filter(p=>p!==(ws.username||'Guest'));
        r.seats=r.seats.map(s=>s&&s.name===(ws.username||'Guest')?null:s);
        if(r.ready)delete r.ready[ws.username||'Guest'];
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
        if(!canUsernameHostGame(ws.username,g.id)){
          ws.send(JSON.stringify({type:'error',message:'You need the '+(g.name||g.id)+' game cartridge from the Game Shop before you can host this game.'}));
          return;
        }

        r.selectedGame=g;
        r.started=false;
        r.seats=Array(g.seats).fill(null);
        r.gameState=null;
        r.gameStateType='state';
        r.gameVersion=0;
        r.gameUpdatedAt=0;
        r.ready={};
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
      if(r.ready)delete r.ready[name];

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
        let seated=r.seats.filter(Boolean).length;
        let minPlayers=Number(r.selectedGame.minPlayers||1);

        if(seated<minPlayers){
          ws.send(JSON.stringify({
            type:'error',
            message:'Not enough players to start. Need '+minPlayers+', seated '+seated+'.'
          }));
          return;
        }

        if(r.selectedGame.id==='petbattle'){
          let seatedNames=r.seats.filter(Boolean).map(s=>s.name);
          let notReady=seatedNames.filter(name=>!(r.ready&&r.ready[name]));
          if(notReady.length){
            ws.send(JSON.stringify({
              type:'error',
              message:'Both battlers must ready up before Pet Battle starts. Waiting on: '+notReady.join(', ')+'.'
            }));
            return;
          }
        }

        r.started=true;
        r.gameState=null;
        r.gameStateType='state';
        r.gameVersion=0;
        r.gameUpdatedAt=Date.now();
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

        if(m.data&&m.data.type==='lobbyReady'){
          r.ready=r.ready||{};
          r.ready[m.data.username||ws.username||'Guest']=!!m.data.ready;
          broadcastRoom(r.id,{type:'roomUpdate',room:roomPublic(r)});
        }

        if(m.data&&(m.data.type==='state'||m.data.type==='battleState')){
          r.gameState=m.data.state||m.data.battleState||m.data;
          r.gameStateType=m.data.type;
          r.gameVersion=(r.gameVersion||0)+1;
          r.gameUpdatedAt=Date.now();
        }

        broadcastRoom(r.id,{
          type:'gameMove',
          data:m.data,
          from:ws.username,
          version:r.gameVersion||0
        });
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
