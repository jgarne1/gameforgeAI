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
const marketFile=path.join(DATA,'market.json');
const gamesFile=path.join(__dirname,'games.json');

app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
app.use('/games',express.static(path.join(__dirname,'games')));

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

function games(){return readJSON(gamesFile,[])}
function users(){return readJSON(usersFile,{})}
function pets(){return readJSON(petsFile,{})}
function moves(){return readJSON(movesFile,DEFAULT_MOVES)}
function market(){return readJSON(marketFile,{listings:{},nextId:1})}
function saveMarket(m){writeJSON(marketFile,m)}

function admins(){
  let a=readJSON(adminsFile,[]);
  return Array.isArray(a)?a:(a.admins||[]);
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

function hatchSpecies(traits){
  let weights={
    flarecub:10,
    frostfin:10,
    leafbun:10,
    shadepup:10,
    pebblet:10,
    chompasaur:2,
    emberwing:2
  };

  let warm=Number(traits.warm||0);
  let cold=Number(traits.cold||0);
  let wet=Number(traits.wet||0);
  let dry=Number(traits.dry||0);
  let light=Number(traits.light||0);
  let dark=Number(traits.dark||0);

  weights.flarecub+=warm*3+light;
  weights.frostfin+=cold*3+wet*2;
  weights.leafbun+=wet*2+light*2;
  weights.shadepup+=dark*3+dry;
  weights.pebblet+=dry*3+cold;
  weights.chompasaur+=dry*3+warm*2;
  weights.emberwing+=warm*3+light*3;

  let choices=Object.keys(weights).map(k=>({key:k,weight:Math.max(1,weights[k])}));
  return weightedPick(choices).key;
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
    writeJSON(PETS_FILE,p);
  }

  return username;
}

function xpToNextLevel(pet){
  return Math.max(20,Number(pet.stats.level||1)*20);
}

function addPetXp(pet,amount){
  let result={xpGained:amount,leveled:false,levelsGained:0,learnedMove:null};
  pet.stats.xp=Number(pet.stats.xp||0)+amount;

  while(pet.stats.xp>=xpToNextLevel(pet)){
    pet.stats.xp-=xpToNextLevel(pet);
    pet.stats.level=Number(pet.stats.level||1)+1;
    pet.stats.maxHp=Number(pet.stats.maxHp||20)+2;
    pet.stats.hp=pet.stats.maxHp;
    pet.stats.attack=Number(pet.stats.attack||5)+1;
    result.leveled=true;
    result.levelsGained++;
  }

  if(result.leveled){
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

  let mk=market();
  Object.keys(mk.listings||{}).forEach(id=>{
    if(mk.listings[id].seller===req.params.name)delete mk.listings[id];
  });
  saveMarket(mk);

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
    moves:moves(),
    zones:EXPLORE_ZONES,
    daily:normalizeDaily(profile)
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

  let hatched=false;

  if(item.effect){
    Object.keys(item.effect).forEach(k=>{
      pet.needs[k]=clamp((pet.needs[k]||0)+item.effect[k],0,100);
    });

    pet.affection=clamp(Number(pet.affection||0)+1,0,100);

    if(item.questType)trackQuest(profile,item.questType,1);
    trackQuest(profile,'bondGain',1);
  }

  if(item.eggTrait){
    Object.keys(item.eggTrait).forEach(k=>{
      pet.eggTraits[k]=(pet.eggTraits[k]||0)+item.eggTrait[k];
    });

    pet.affection=clamp(Number(pet.affection||0)+1,0,100);
    trackQuest(profile,'eggCare',1);
    trackQuest(profile,'bondGain',1);

    let total=Object.values(pet.eggTraits).reduce((x,y)=>x+y,0);
    if(total>=18&&pet.stage==='egg'){
      hatchPet(pet);
      hatched=true;
    }
  }

  pet.lastUpdated=Date.now();

  savePetProfile(username,profile);
  res.json({ok:true,hatched,profile});
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
  return SHOP_ITEMS[itemId]?SHOP_ITEMS[itemId].name:itemId;
}

app.get('/api/market/listings',(req,res)=>{
  res.json({
    ok:true,
    listings:marketListingsArray(),
    shops:publicShopProfiles(),
    items:SHOP_ITEMS,
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
    items:SHOP_ITEMS,
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

  if(!SHOP_ITEMS[itemId])return res.json({error:'Unknown item'});
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
  let listing=mk.listings&&mk.listings[listingId];

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
  let listing=mk.listings&&mk.listings[listingId];

  if(!listing)return res.json({error:'Listing not found'});
  if(quantity<1)return res.json({error:'Invalid quantity'});
  if(quantity>Number(listing.quantity||0))return res.json({error:'Not enough quantity available'});
  if(listing.seller===buyer)return res.json({error:'You cannot buy your own listing'});

  let all=pets();
  let buyerProfile=normalizePetProfile(all[buyer]||defaultPetProfile(buyer),buyer);
 // 🔥 ensure seller exists
if(!all[listing.seller]){
  all[listing.seller]=defaultPetProfile(listing.seller);
}

let sellerProfile=normalizePetProfile(all[listing.seller],listing.seller);
  let total=Number(listing.price||0)*quantity;
  let tax=Math.floor(total*MARKET_LIMITS.marketTaxRate);
  let sellerReceives=total-tax;

  if((buyerProfile.money||0)<total)return res.json({error:'Not enough coins'});

  buyerProfile.money-=total;
  buyerProfile.inventory[listing.itemId]=(buyerProfile.inventory[listing.itemId]||0)+quantity;
  sellerProfile.money=(sellerProfile.money||0)+sellerReceives;

  listing.quantity-=quantity;
  listing.lastPurchasedAt=Date.now();
  listing.lastBuyer=buyer;

  if(listing.quantity<=0){
    delete mk.listings[listingId];
  }

  all[buyer]=buyerProfile;
  all[listing.seller]=sellerProfile;
  writeJSON(petsFile,all);
  saveMarket(mk);

  sendToUser(buyer,{type:'petUpdate',profile:buyerProfile});
  sendToUser(listing.seller,{type:'petUpdate',profile:sellerProfile});

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
        chat:[],
        gameState:null,
        gameStateType:'state',
        gameVersion:0,
        gameUpdatedAt:0
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
        r.gameState=null;
        r.gameStateType='state';
        r.gameVersion=0;
        r.gameUpdatedAt=0;
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
        let seated=r.seats.filter(Boolean).length;
        let minPlayers=Number(r.selectedGame.minPlayers||1);

        if(seated<minPlayers){
          ws.send(JSON.stringify({
            type:'error',
            message:'Not enough players to start. Need '+minPlayers+', seated '+seated+'.'
          }));
          return;
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
