/*
  GameForge AI Adventure Engine v9
  Purpose: reusable pet-first side-scrolling exploration layer for PetWorld activities.
  - Not a standalone game.
  - The active pet is the controllable character; no human avatar is shown in the main wilderness mode.
  - Client handles feel, movement, solid platforms, hazards, local collectibles, puzzles, creatures, and interactions.
  - Server remains authoritative for profile rewards through /api/pet/adventure/complete.
  - Combat is quick encounter mode: visible roaming creatures spot the pet, walk up, trigger a message, then battle begins. v9 refactors Ember Hollow toward a Metroid/Zelda-style connected companion adventure: rooms, vertical passages, touch pickups, meaningful chests/upgrades, stronger combat visuals, and fewer meaningless E prompts.
*/
(function(){
  'use strict';

  var GROUND_H=98;

  var DEFAULT_ZONE={
    id:'ember_hollow',
    name:'Ember Hollow',
    subtitle:'Mira vanished while tracing the Ember Tree pulse. Guide your pet through the hollow, recover old tools, calm the guardian, and awaken the tree.',
    width:7600,
    timeLimitMs:720000,
    player:{x:90,y:0,w:62,h:74,maxSpeed:5.15,accel:.46,friction:.80,jump:14.4,gravity:.60,coyoteMs:145,jumpBufferMs:155},
    goalX:7240,
    exitX:7420,
    requiredGateShards:3,
    rooms:[
      {id:'camp_trail',name:'Camp Trail',from:0,to:980,subtitle:'Mira’s abandoned camp and the first warm trail.',mood:'safe'},
      {id:'upper_boughs',name:'Upper Boughs',from:980,to:1980,subtitle:'A quiet high route above the first wisps.',mood:'safe'},
      {id:'root_gate',name:'Root Gate Chamber',from:1980,to:2920,subtitle:'The old root gate blocks the lower hollow.',mood:'mystery'},
      {id:'lantern_grotto',name:'Lantern Grotto',from:2920,to:3860,subtitle:'A buried tool room lit by old scout embers.',mood:'mystery'},
      {id:'deep_shaft',name:'Deep Root Shaft',from:3860,to:4920,subtitle:'The hollow drops downward through glowing roots.',mood:'danger'},
      {id:'burrow_return',name:'Hidden Burrow',from:4920,to:5860,subtitle:'A loop-back tunnel filled with secret sparks.',mood:'secret'},
      {id:'ember_core',name:'Ember Core',from:5860,to:6880,subtitle:'The guardian’s roots twist around the tree heart.',mood:'boss'},
      {id:'tree_crown',name:'Ember Tree Crown',from:6880,to:7600,subtitle:'The awakened tree waits beyond the guardian.',mood:'clear'}
    ],
    keyItems:[
      {id:'ember_lantern',name:'Ember Lantern',x:3305,y:0,emoji:'🏮',text:"The lantern catches your pet's glow. Dark roots and hidden passages now shimmer."},
      {id:'root_claw',name:'Root Claw',x:4625,y:152,emoji:'🪝',text:'An old root-claw clicks open. Your pet can pry tangled root barriers apart.'},
      {id:'mira_charm',name:'Mira’s Ember Charm',x:5485,y:72,emoji:'🔶',text:'Mira left this charm behind. It pulses toward the Guardian Ring.'}
    ],
    barriers:[
      {id:'dark_root_veil',name:'Dark Root Veil',x:3735,y:0,w:96,h:154,requiresItem:'ember_lantern',emoji:'🌘',closedText:'The path is swallowed by dark roots. A lantern glow could reveal it.',openText:'The Ember Lantern glows. The dark roots peel back and reveal a lower passage.'},
      {id:'claw_root_tangle',name:'Root Tangle',x:5785,y:0,w:104,h:150,requiresItem:'root_claw',emoji:'🌿',closedText:'The roots are woven too tight. A claw tool could pry them open.',openText:'The Root Claw hooks into the vines. The tangle snaps open.'},
      {id:'guardian_seal',name:'Guardian Seal',x:6750,y:0,w:110,h:162,requiresItem:'mira_charm',emoji:'🔶',closedText:'A warm seal blocks the final path. Mira’s charm belongs here.',openText:'Mira’s charm answers the seal. The Guardian Ring opens.'}
    ],
    portals:[
      {id:'shaft_down',x:2790,y:0,w:96,h:130,toX:3920,toY:0,name:'Down to Deep Roots',direction:'down',text:'The floor falls away into a warm root shaft.'},
      {id:'shaft_up',x:3925,y:0,w:96,h:130,toX:2860,toY:0,name:'Back to Root Gate',direction:'up',text:'Your pet climbs back toward the root gate chamber.'},
      {id:'burrow_drop',x:4825,y:0,w:96,h:130,toX:4985,toY:0,name:'Hidden Burrow',direction:'down',requiresItem:'root_claw',text:'The Root Claw opens a low burrow beneath the shaft.'},
      {id:'burrow_exit',x:5750,y:0,w:96,h:130,toX:6020,toY:0,name:'Ember Core Return',direction:'right',text:'The burrow curls back toward the core.'}
    ],
    collectibles:[
      {id:'shard_1',type:'ember_shard',x:245,y:18,emoji:'✦',hint:'Trail spark'},
      {id:'shard_2',type:'ember_shard',x:455,y:108,emoji:'✦',hint:'Low ledge spark'},
      {id:'shard_3',type:'ember_shard',x:705,y:18,emoji:'✦',hint:'Root spark'},
      {id:'shard_4',type:'ember_shard',x:950,y:154,emoji:'✦',hint:'Safe-route spark'},
      {id:'shard_5',type:'ember_shard',x:1185,y:18,emoji:'✦',hint:'Gate spark'},
      {id:'shard_6',type:'ember_shard',x:1515,y:92,emoji:'✦',hint:'Ash ledge spark'},
      {id:'shard_7',type:'ember_shard',x:1760,y:18,emoji:'✦',hint:'Vent spark'},
      {id:'shard_8',type:'ember_shard',x:2055,y:128,emoji:'✦',hint:'Branch spark'},
      {id:'shard_9',type:'ember_shard',x:2310,y:18,emoji:'✦',hint:'Tunnel spark'},
      {id:'shard_10',type:'ember_shard',x:2625,y:118,emoji:'✦',hint:'Watcher spark'},
      {id:'shard_11',type:'ember_shard',x:2920,y:18,emoji:'✦',hint:'Root beetle spark'},
      {id:'shard_12',type:'ember_shard',x:3235,y:112,emoji:'✦',hint:'Tree spark'},
      {id:'shard_13',type:'ember_shard',x:3560,y:18,emoji:'✦',hint:'Deep root spark'},
      {id:'shard_14',type:'ember_shard',x:3795,y:176,emoji:'✦',hint:'Sentinel ledge spark'},
      {id:'shard_15',type:'ember_shard',x:4070,y:18,emoji:'✦',hint:'Core trail spark'},
      {id:'shard_16',type:'ember_shard',x:4325,y:142,emoji:'✦',hint:'Guardian approach spark'},
      {id:'shard_17',type:'ember_shard',x:4620,y:18,emoji:'✦',hint:'Boss arena spark'},
      {id:'shard_18',type:'ember_shard',x:4970,y:118,emoji:'✦',hint:'Tree crown spark'},
      {id:'shard_19',type:'ember_shard',x:1885,y:64,emoji:'✦',hint:'Lantern chamber spark'},
      {id:'shard_20',type:'ember_shard',x:4130,y:168,emoji:'✦',hint:'Root claw route spark'},
      {id:'shard_21',type:'ember_shard',x:5270,y:88,emoji:'✦',hint:'Burrow secret spark'},
      {id:'shard_22',type:'ember_shard',x:5650,y:18,emoji:'✦',hint:'Mira charm spark'},
      {id:'shard_23',type:'ember_shard',x:6150,y:112,emoji:'✦',hint:'Core climb spark'},
      {id:'shard_24',type:'ember_shard',x:6660,y:18,emoji:'✦',hint:'Guardian seal spark'},
      {id:'shard_25',type:'ember_shard',x:7120,y:124,emoji:'✦',hint:'Tree crown spark'}
    ],
    platforms:[
      {id:'ledge_1',x:345,y:64,w:300,h:24,label:'solid ledge'},
      {id:'ledge_2',x:850,y:112,w:370,h:24,label:'solid ledge'},
      {id:'ledge_3',x:1410,y:72,w:340,h:24,label:'solid ledge'},
      {id:'ledge_4',x:1985,y:96,w:420,h:24,label:'solid ledge'},
      {id:'ledge_5',x:2550,y:82,w:380,h:24,label:'solid ledge'},
      {id:'ledge_6',x:3140,y:78,w:340,h:24,label:'solid ledge'},
      {id:'deep_ledge_1',x:3605,y:126,w:360,h:24,label:'solid ledge'},
      {id:'deep_ledge_2',x:3970,y:78,w:310,h:24,label:'solid ledge'},
      {id:'core_ledge_1',x:4270,y:118,w:370,h:24,label:'solid ledge'},
      {id:'core_ledge_2',x:4755,y:88,w:390,h:24,label:'solid ledge'},
      {id:'burrow_ledge_1',x:5050,y:72,w:360,h:24,label:'solid ledge'},
      {id:'burrow_ledge_2',x:5400,y:128,w:340,h:24,label:'solid ledge'},
      {id:'core_rise_1',x:6040,y:82,w:360,h:24,label:'solid ledge'},
      {id:'core_rise_2',x:6380,y:132,w:320,h:24,label:'solid ledge'},
      {id:'crown_ledge_1',x:7045,y:96,w:390,h:24,label:'solid ledge'}
    ],
    hazards:[
      {id:'bramble_1',kind:'bramble',x:760,y:0,w:155,h:24,emoji:'♨️',damage:1,text:'Hot ember brambles flare underpaw. Your companion hops back.'},
      {id:'vent_1',kind:'vent',x:1265,y:0,w:126,h:86,emoji:'🔥',damage:1,text:'An ember vent exhales. Watch for the glow before crossing.'},
      {id:'bramble_2',kind:'bramble',x:1815,y:0,w:170,h:24,emoji:'♨️',damage:1,text:'The warm roots snap with sparks. Time the crossing.'},
      {id:'ash_1',kind:'emberfall',x:2380,y:0,w:112,h:124,emoji:'🔥',damage:1,text:'Falling ash bursts across the trail.'},
      {id:'vent_2',kind:'vent',x:3005,y:0,w:142,h:92,emoji:'🔥',damage:1,text:'The ground glows before the vent opens. Keep moving.'},
      {id:'deep_bramble_1',kind:'bramble',x:3480,y:0,w:185,h:24,emoji:'♨️',damage:1,text:'The Deep Roots bite back with ember heat.'},
      {id:'deep_vent_1',kind:'vent',x:3890,y:0,w:146,h:96,emoji:'🔥',damage:1,text:'A deep vent breathes fire. Wait for the dim moment.'},
      {id:'core_ash_1',kind:'emberfall',x:4385,y:0,w:128,h:132,emoji:'🔥',damage:1,text:'Ash falls faster near the Ember Core.'},
      {id:'core_bramble_1',kind:'bramble',x:4685,y:0,w:190,h:24,emoji:'♨️',damage:1,text:'Guardian roots spark across the path.'},
      {id:'burrow_bramble_1',kind:'bramble',x:5205,y:0,w:150,h:24,emoji:'♨️',damage:1,text:'The hidden burrow is warm underpaw.'},
      {id:'core_vent_2',kind:'vent',x:6230,y:0,w:150,h:96,emoji:'🔥',damage:1,text:'The Ember Core exhales in pulses.'},
      {id:'seal_ash_1',kind:'emberfall',x:6605,y:0,w:128,h:132,emoji:'🔥',damage:1,text:'The Guardian Seal shakes loose burning ash.'}
    ],
    gates:[
      {id:'root_gate',x:1330,y:0,w:82,h:150,requires:{ember_shard:3},title:'Root Gate',text:'The roots are sealed. Three sparks will wake the gate.'}
    ],
    creatures:[
      {id:'ember_wisp_1',name:'Ember Wisp',type:'fire',x:1045,y:0,w:74,h:74,emoji:'🔥',image:'/assets/creatures/ember_wisp/idle.png',patrolMin:935,patrolMax:1210,speed:.9,facing:-1,vision:230,visionY:88,hp:34,attack:4,xp:4,coin:3,message:'An Ember Wisp noticed your companion!'},
      {id:'ashling_1',name:'Ashling',type:'fire',x:1520,y:72,w:68,h:58,emoji:'🦊',image:'/assets/creatures/ashling/idle.png',patrolMin:1425,patrolMax:1760,speed:.72,facing:1,vision:205,visionY:72,hp:30,attack:4,xp:4,coin:3,message:'A nervous Ashling blocks the high bough.'},
      {id:'ember_wisp_2',name:'Ash Wisp',type:'fire',x:2180,y:96,w:74,h:74,emoji:'🔥',image:'/assets/creatures/ember_wisp/idle.png',patrolMin:2045,patrolMax:2395,speed:.82,facing:1,vision:225,visionY:82,hp:38,attack:5,xp:5,coin:4,message:'The Ash Wisp drifts forward, blocking the old branch.'},
      {id:'root_beetle_1',name:'Root Beetle',type:'earth',x:2865,y:0,w:86,h:64,emoji:'🪲',image:'/assets/creatures/root_beetle/idle.png',patrolMin:2760,patrolMax:3050,speed:.58,facing:-1,vision:175,visionY:70,hp:44,attack:5,xp:6,coin:5,message:'A Root Beetle stomps toward your pet!'},
      {id:'ember_wisp_3',name:'Deep Wisp',type:'fire',x:3395,y:0,w:76,h:76,emoji:'🔥',image:'/assets/creatures/ember_wisp/idle.png',patrolMin:3295,patrolMax:3560,speed:.78,facing:1,vision:220,visionY:82,hp:42,attack:5,xp:5,coin:4,message:'A Deep Wisp flickers awake in the roots.'},
      {id:'root_beetle_2',name:'Burrow Beetle',type:'earth',x:5300,y:0,w:86,h:64,emoji:'🪲',image:'/assets/creatures/root_beetle/idle.png',patrolMin:5105,patrolMax:5520,speed:.52,facing:1,vision:190,visionY:72,hp:48,attack:5,xp:7,coin:5,message:'A Burrow Beetle guards Mira’s charm!'},
      {id:'ashroot_sentinel',name:'Ashroot Sentinel',type:'earth',x:3820,y:126,w:102,h:86,emoji:'🪵',image:'/assets/creatures/ashroot_sentinel/idle.png',patrolMin:3700,patrolMax:3960,speed:.46,facing:-1,vision:205,visionY:76,hp:76,attack:7,xp:10,coin:8,miniBoss:true,message:'The Ashroot Sentinel blocks the Deep Root path!'},
      {id:'ember_wisp_4',name:'Core Wisp',type:'fire',x:4310,y:118,w:78,h:78,emoji:'🔥',image:'/assets/creatures/ember_wisp/idle.png',patrolMin:4205,patrolMax:4515,speed:.86,facing:1,vision:225,visionY:82,hp:46,attack:6,xp:6,coin:5,message:'A Core Wisp spins toward your pet!'},
      {id:'root_guardian',name:'Corrupted Root Guardian',type:'earth',x:7040,y:0,w:168,h:142,emoji:'🌲',image:'/assets/creatures/root_guardian/idle.png',patrolMin:7040,patrolMax:7040,speed:0,facing:-1,vision:999,visionY:190,hp:135,attack:10,xp:24,coin:20,boss:true,finalBoss:true,message:'The Corrupted Root Guardian rises before the Ember Tree!'}
    ],
    interactables:[
      {id:'mira_supply_chest',kind:'chest',x:610,y:0,emoji:'📦',title:'Mira’s Supply Chest',text:'Inside is Mira’s note: “The tree pulsed from below. I marked a quiet upper path.”',discoveryId:'mira_note',effect:'guide_trail',auto:true},
      {id:'lantern_chest',kind:'chest',x:3215,y:0,emoji:'📦',title:'Lantern Chest',text:'The chest opens by your pet’s warmth. The Ember Lantern wakes inside.',effect:'awaken_lantern',auto:true},
      {id:'deep_roots_scene',kind:'scene',x:3570,y:0,emoji:'🌀',title:'Broken Rope',text:'Mira’s rope is snapped. Something dragged the trail downward into the roots.',discoveryId:'deep_roots',effect:'root_pulse',auto:true},
      {id:'mira_charm_cache',kind:'chest',x:5485,y:72,emoji:'📦',title:'Mira’s Hidden Cache',text:'The cache is scratched open from inside. Mira’s charm still glows.',discoveryId:'mira_cache',auto:true},
      {id:'guardian_ring_scene',kind:'scene',x:6680,y:0,emoji:'🌑',title:'Guardian Ring',text:'Mira’s final mark is scorched into stone: “It is not evil. It is guarding something afraid.”',discoveryId:'guardian_ring',effect:'guardian_whisper',auto:true}
    ],
    ambientEvents:[
      'Tiny sparks drift toward your companion, then fade.',
      'Your pet ears perk up. Something ahead is calling.',
      'A small ashling skitters into the roots.',
      'The glowing trail brightens for a breath, pointing forward.',
      'The Ember Tree trembles softly in the distance.'
    ]
  };

  var engine={
    mounted:false,running:false,zone:null,root:null,scene:null,world:null,hud:null,objective:null,prompt:null,skillBar:null,
    petEl:null,cameraX:0,keys:{},collected:{},collectedIds:{},touched:{},discoveries:{},openedGates:{},hazardsHit:{},puzzlesSolved:{},defeatedCreatures:{},
    goalReached:false,startedAt:0,raf:0,lastAmbientAt:0,lastHitAt:0,lastLandingAt:0,lastSightAt:0,lastGroundedAt:0,jumpQueuedUntil:0,state:null,callbacks:{},pet:null,nearest:null,actionBtn:null,touch:null,
    creatures:[],mode:'explore',encounter:null,battle:null,completion:null,completionOverlay:null,roomOverlay:null,currentRoomId:'',keyItems:{},openedBarriers:{},worldFlags:{},transition:null
  };

  function mergeZone(zone){
    var z=Object.assign({},DEFAULT_ZONE,zone||{});
    z.player=Object.assign({},DEFAULT_ZONE.player,(zone&&zone.player)||{});
    ['collectibles','platforms','hazards','gates','creatures','interactables','portals','ambientEvents'].forEach(function(k){z[k]=(zone&&zone[k])?zone[k].slice():DEFAULT_ZONE[k].slice();});
    return z;
  }

  function mount(options){
    if(engine.mounted)return;
    engine.callbacks=(options&&options.callbacks)||{};
    injectStyles();
    engine.root=document.createElement('div');
    engine.root.id='gfAdventureRoot';
    engine.root.className='gfAdventure hidden';
    engine.root.innerHTML=[
      '<div class="gfAdventureTop">',
        '<div class="gfAdvTitleBlock"><b id="gfAdvTitle">Ember Hollow</b><span id="gfAdvSub">Guide your companion.</span></div>',
        '<div class="gfAdvControls">',
          '<span id="gfAdvObjective">Reach the Ember Tree</span>',
          '<span id="gfAdvStats">0 sparks • 0 stumbles</span>',
          '<button id="gfAdvComplete" class="primary">Return Home</button>',
          '<button id="gfAdvClose">Leave</button>',
        '</div>',
      '</div>',
      '<div class="gfAdventureScene" id="gfAdvScene">',
        '<div class="gfAdvSky"></div><div class="gfAdvSun"></div><div class="gfAdvGlow"></div>',
        '<div class="gfAdventureWorld" id="gfAdvWorld"></div>',
        '<div class="gfAdvToastLayer" id="gfAdvToastLayer"></div>',
        '<div class="gfAdvPrompt" id="gfAdvPrompt">Move with ← → / A D, jump with Space, interact with E.</div>',
        '<div class="gfAdvSkillBar hidden" id="gfAdvSkillBar"></div>',
        '<button class="gfAdvTouchAction hidden" id="gfAdvTouchAction">Use</button>',
        '<div class="gfAdvRoomTransition hidden" id="gfAdvRoomTransition"></div>',
        '<div class="gfAdvCompletion hidden" id="gfAdvCompletion"></div>',
      '</div>',
      '<div class="gfAdventureBottom"><span>Pet-first Adventure v9</span><span>World-first UI. Touch sides to move, swipe up to jump, use the small action bubble near objects.</span></div>'
    ].join('');
    document.body.appendChild(engine.root);
    engine.scene=document.getElementById('gfAdvScene');engine.world=document.getElementById('gfAdvWorld');engine.hud=document.getElementById('gfAdvStats');engine.objective=document.getElementById('gfAdvObjective');engine.prompt=document.getElementById('gfAdvPrompt');engine.skillBar=document.getElementById('gfAdvSkillBar');engine.actionBtn=document.getElementById('gfAdvTouchAction');engine.roomOverlay=document.getElementById('gfAdvRoomTransition');engine.completionOverlay=document.getElementById('gfAdvCompletion');
    document.getElementById('gfAdvClose').onclick=function(){stop(false)};document.getElementById('gfAdvComplete').onclick=function(){complete()};
    window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKey,true);
    setupTouchControls();
    engine.mounted=true;
  }

  function start(options){
    mount(options||{});engine.zone=mergeZone((options&&options.zone)||{});engine.callbacks=(options&&options.callbacks)||engine.callbacks||{};engine.pet=(options&&options.pet)||{};
    engine.collected={};engine.collectedIds={};engine.touched={};engine.discoveries={};engine.openedGates={};engine.hazardsHit={};engine.puzzlesSolved={};engine.defeatedCreatures={};engine.keyItems={};engine.openedBarriers={};engine.worldFlags={};engine.goalReached=false;
    engine.startedAt=Date.now();engine.lastAmbientAt=Date.now();engine.lastHitAt=0;engine.lastLandingAt=0;engine.lastSightAt=0;engine.lastGroundedAt=Date.now();engine.jumpQueuedUntil=0;engine.cameraX=0;engine.mode='explore';engine.encounter=null;engine.battle=null;engine.completion=null;engine.transition=null;engine.currentRoomId='';engine.touch=null;if(engine.roomOverlay){engine.roomOverlay.classList.add('hidden');engine.roomOverlay.innerHTML='';}if(engine.completionOverlay){engine.completionOverlay.classList.add('hidden');engine.completionOverlay.innerHTML='';}
    engine.state={x:engine.zone.player.x,y:0,prevY:0,vx:0,vy:0,onGround:true,facing:1,health:3,landed:false,locked:false};
    engine.creatures=(engine.zone.creatures||[]).map(function(c){return Object.assign({state:'roam',homeX:c.x||0,facing:c.facing||1},c)});engine.currentRoomId=(getRoomForX(engine.state.x)||{}).id||'';
    document.getElementById('gfAdvTitle').innerText=engine.zone.name;document.getElementById('gfAdvSub').innerText=engine.zone.subtitle||'Guide your companion.';
    renderWorld();engine.root.classList.remove('hidden');engine.skillBar.classList.add('hidden');engine.running=true;engine.raf=requestAnimationFrame(loop);
    say('Find Mira, recover the Ember Lantern and Root Claw, then calm the Guardian. Touch sparks, tools, and chests to collect them.');pop('+ Start',engine.state.x,engine.state.y+90,'info');
    if(engine.callbacks.onStart)engine.callbacks.onStart(engine.zone);
  }

  function renderWorld(){
    var z=engine.zone,html='';
    html+='<div class="gfAdvLayer mountains"></div><div class="gfAdvLayer trees"></div><div class="gfAdvPathGlow"></div><div class="gfAdvGround"></div>';
    html+=renderRooms();html+=renderEnvironmentScenes();
    html+='<div class="gfAdvLandmark start">Camp Trail</div><div class="gfAdvLandmark deep" style="left:3425px">Deep Roots</div><div class="gfAdvLandmark core" style="left:4580px">Guardian Ring</div><div class="gfAdvLandmark tree" style="left:'+(z.goalX-60)+'px">Ember Tree</div>';
    (z.platforms||[]).forEach(function(p){html+='<div class="gfAdvPlatform" data-pid="'+esc(p.id)+'" style="left:'+num(p.x)+'px;bottom:'+(GROUND_H+num(p.y))+'px;width:'+num(p.w)+'px;height:'+num(p.h)+'px"><span></span></div>';});
    (z.hazards||[]).forEach(function(h){var cls=' '+(h.kind||'hazard');html+='<div class="gfAdvHazard'+cls+'" data-hid="'+esc(h.id)+'" style="left:'+num(h.x)+'px;bottom:'+(GROUND_H+num(h.y))+'px;width:'+num(h.w)+'px;height:'+num(h.h)+'px"><span>'+esc(h.emoji||'⚠️')+'</span></div>';});
    (z.keyItems||[]).forEach(function(k){html+='<button class="gfAdvKeyItem gfAdvUsable" data-kid="'+esc(k.id)+'" style="left:'+num(k.x)+'px;bottom:'+(GROUND_H+34+num(k.y))+'px"><span>'+esc(k.emoji||'🔑')+'</span><b>'+esc(k.name||'Item')+'</b></button>';});
    (z.barriers||[]).forEach(function(b){html+='<button class="gfAdvBarrier gfAdvUsable" data-bid="'+esc(b.id)+'" style="left:'+num(b.x)+'px;bottom:'+(GROUND_H+num(b.y))+'px;width:'+num(b.w)+'px;height:'+num(b.h)+'px"><span>'+esc(b.emoji||'🚪')+'</span><b>'+esc(b.name||'Barrier')+'</b></button>';});
    (z.portals||[]).forEach(function(pt){html+='<div class="gfAdvPortal '+esc(pt.direction||'right')+'" data-ptid="'+esc(pt.id)+'" style="left:'+num(pt.x)+'px;bottom:'+(GROUND_H+num(pt.y))+'px;width:'+num(pt.w||90)+'px;height:'+num(pt.h||120)+'px"><span>'+esc(pt.direction==='down'?'↓':(pt.direction==='up'?'↑':'→'))+'</span><b>'+esc(pt.name||'Passage')+'</b></div>';});
    (z.gates||[]).forEach(function(g){html+='<button class="gfAdvGate gfAdvUsable" data-gid="'+esc(g.id)+'" style="left:'+num(g.x)+'px;bottom:'+(GROUND_H+num(g.y))+'px;width:'+num(g.w)+'px;height:'+num(g.h)+'px"><b>Root Gate</b><span>Need 3 ✦</span></button>';});
    engine.creatures.forEach(function(c){html+='<div class="gfAdvCreature" data-eid="'+esc(c.id)+'" style="left:'+num(c.x)+'px;bottom:'+(GROUND_H+num(c.y))+'px;width:'+num(c.w||74)+'px;height:'+num(c.h||74)+'px">'+creatureMarkup(c)+'</div>';});
    (z.interactables||[]).forEach(function(o){html+='<div class="gfAdvThing gfAdvScenePickup '+esc(o.kind||'thing')+'" data-iid="'+esc(o.id)+'" style="left:'+num(o.x)+'px;bottom:'+(GROUND_H+12+num(o.y))+'px"><span>'+esc(o.emoji||'✨')+'</span></div>';});
    (z.collectibles||[]).forEach(function(c){html+='<button class="gfAdvCollectible" data-cid="'+esc(c.id)+'" title="'+esc(c.hint||'Collect')+'" style="left:'+num(c.x)+'px;bottom:'+(GROUND_H+42+num(c.y))+'px"><span>'+esc(c.emoji||'✦')+'</span></button>';});
    html+='<div id="gfAdvPet" class="gfAdvPet gfAdvHeroPet">'+petMarkup(engine.pet)+'</div>';
    html+='<div class="gfAdvExit" style="left:'+num(z.exitX||2785)+'px"><b>Home Trail</b><span>Return when ready</span></div>';
    engine.world.style.width=z.width+'px';engine.world.innerHTML=html;engine.petEl=document.getElementById('gfAdvPet');
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-cid]'),function(btn){btn.onclick=function(){collect(btn.getAttribute('data-cid'))};});
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-iid]'),function(btn){btn.onclick=function(){interact(btn.getAttribute('data-iid'))};});
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-gid]'),function(btn){btn.onclick=function(){tryGate(btn.getAttribute('data-gid'))};});
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-kid]'),function(btn){btn.onclick=function(){collectKeyItem(btn.getAttribute('data-kid'))};});
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-bid]'),function(btn){btn.onclick=function(){tryBarrier(btn.getAttribute('data-bid'))};});
    updateHud();
  }

  function creatureMarkup(c){var img=c.image?'<img src="'+esc(c.image)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-flex\'">':'';return img+'<span '+(c.image?'style="display:none"':'')+'>'+esc(c.emoji||'👾')+'</span><em>'+esc(c.name||'Creature')+'</em>';}
  function petMarkup(pet){pet=pet||{};var src=pet.asset||pet.image||'';var emoji=pet.emoji||'🐾';var label=pet.name?'<em>'+esc(pet.name)+'</em>':'';if(src)return '<img src="'+esc(src)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-flex\'"><span style="display:none">'+esc(emoji)+'</span>'+label;return '<span>'+esc(emoji)+'</span>'+label;}

  function loop(){if(!engine.running)return;if(engine.mode==='explore'){updatePhysics();updateCreatures();checkCreatureSight();checkHazards();checkCollectibles();checkAbilityItems();checkSceneDiscoveries();checkPortals();checkBossTriggers();checkRoomTransition();checkGoal();maybeAmbient();}else if(engine.mode==='encounterIntro'){updateEncounterIntro();}else if(engine.mode==='roomTransition'){updateRoomTransition();}else if(engine.mode==='ending'){updateEnding();}updateCamera();updatePositions();updateCreaturePositions();updateNearest();engine.raf=requestAnimationFrame(loop);}

  function updatePhysics(){
    var s=engine.state,z=engine.zone,p=z.player,now=Date.now();
    var left=engine.keys.ArrowLeft||engine.keys.KeyA,right=engine.keys.ArrowRight||engine.keys.KeyD;
    var target=0;if(left){target=-p.maxSpeed;s.facing=-1;}if(right){target=p.maxSpeed;s.facing=1;}
    if(target!==0)s.vx+=(target-s.vx)*p.accel;else s.vx*=p.friction;
    if(Math.abs(s.vx)<.05)s.vx=0;
    var canJump=s.onGround||(now-engine.lastGroundedAt<Number(p.coyoteMs||130));
    if((engine.keys.Space||engine.keys.ArrowUp||engine.keys.KeyW)&&!engine._heldJump){requestJump();engine._heldJump=true;}
    if(!(engine.keys.Space||engine.keys.ArrowUp||engine.keys.KeyW))engine._heldJump=false;
    if(engine.jumpQueuedUntil>now&&canJump){
      engine.jumpQueuedUntil=0;s.vy=p.jump;s.onGround=false;s.landed=false;
      sayOnce('jump_tip','Use broad ledges and timing to avoid wisps. Jumps are forgiving — exploration matters more than precision.');
      pop('Jump',s.x,s.y+88,'info');
    }
    var prevX=s.x,prevY=s.y;s.prevY=prevY;s.x=clamp(s.x+s.vx,42,z.width-80);s.y+=s.vy;s.vy-=p.gravity;
    var surface=findLandingSurface(prevY,s.y,s.x);
    if(surface!==null){
      s.y=surface;s.vy=0;
      if(!s.onGround&&Date.now()-engine.lastLandingAt>180){engine.lastLandingAt=Date.now();s.landed=true;setTimeout(function(){if(engine.state)engine.state.landed=false;},160);}s.onGround=true;engine.lastGroundedAt=Date.now();
    }else{s.onGround=false;}
    resolveWalls(prevX);resolveAbilityBarriers(prevX);
  }

  function resolveWalls(prevX){(engine.zone.gates||[]).forEach(function(g){if(engine.openedGates[g.id])return;var petBox=petRect();if(rectsOverlap(petBox.x,petBox.y,petBox.w,petBox.h,g.x,GROUND_H+g.y,g.w,g.h)){var need=(g.requires&&g.requires.ember_shard)||engine.zone.requiredGateShards||3;if(Number(engine.collected.ember_shard||0)>=need){tryGate(g.id);return;}if(prevX<g.x)engine.state.x=g.x-petBox.w*.5-8;else engine.state.x=g.x+g.w+petBox.w*.5+8;engine.state.vx=0;say('The root gate blocks the trail. Collect '+need+' sparks to wake it.');}});}
  function findLandingSurface(prevY,newY,x){var best=null;if(newY<=0)best=0;(engine.zone.platforms||[]).forEach(function(p){var top=Number(p.y||0)+Number(p.h||0);var withinX=x+34>=p.x&&x-34<=p.x+p.w;var crossed=prevY>=top-6&&newY<=top+15;var falling=engine.state.vy<=1;if(withinX&&crossed&&falling)best=Math.max(best===null?-999:best,top);});return best;}

  function updateCreatures(){engine.creatures.forEach(function(c){if(c.defeated||c.state!=='roam')return;c.x+=Number(c.speed||.8)*Number(c.facing||1);if(c.x<Number(c.patrolMin||c.homeX-120)){c.x=Number(c.patrolMin||c.homeX-120);c.facing=1;}if(c.x>Number(c.patrolMax||c.homeX+120)){c.x=Number(c.patrolMax||c.homeX+120);c.facing=-1;}});}
  function checkCreatureSight(){var now=Date.now();if(now-engine.lastSightAt<650)return;var s=engine.state;for(var i=0;i<engine.creatures.length;i++){var c=engine.creatures[i];if(c.defeated||c.state!=='roam')continue;if(c.finalBoss&&s.x<6800)continue;var dx=s.x-c.x,dy=Math.abs(s.y-(c.y||0));var inFront=(c.facing>0&&dx>0)||(c.facing<0&&dx<0);var inVision=Math.abs(dx)<Number(c.vision||220)&&dy<Number(c.visionY||88);var jumpedOver=s.y>Number(c.y||0)+90;var moving=Math.abs(s.vx)>0.25||!s.onGround;if(inFront&&inVision&&!jumpedOver&&moving){engine.lastSightAt=now;beginEncounterIntro(c);break;}}}
  function beginEncounterIntro(c){engine.mode='encounterIntro';c.state='alert';engine.encounter={creature:c,phase:'noticed',startedAt:Date.now(),targetX:engine.state.x-(c.x<engine.state.x?118:-118),messageShown:false,backflip:false};engine.state.vx=0;engine.state.vy=0;say(c.message||((c.name||'A creature')+' spotted your pet!'));pop('!',c.x,c.y+96,'bad');pulseWorld('danger');}
  function updateEncounterIntro(){var e=engine.encounter;if(!e||!e.creature){engine.mode='explore';return;}var c=e.creature,now=Date.now(),age=now-e.startedAt;if(age<450){return;}if(!e.messageShown){e.messageShown=true;say((c.name||'The creature')+' moves closer. Get ready!');}
    var desiredGap=118;var dir=c.x<engine.state.x?1:-1;c.facing=dir;var target=engine.state.x-dir*desiredGap;c.x+=(target-c.x)*.075;
    if(!e.backflip&&Math.abs(c.x-target)<26){e.backflip=true;engine.state.facing=-dir;engine.state.x=clamp(engine.state.x+(dir*76),42,engine.zone.width-80);engine.state.vy=8.5;engine.state.onGround=false;engine.petEl.classList.add('backflip');setTimeout(function(){if(engine.petEl)engine.petEl.classList.remove('backflip');},520);pop('Backflip!',engine.state.x,engine.state.y+90,'info');}
    if(age>1500&&Math.abs(c.x-target)<44){startBattle(c);}
  }

  function startBattle(c){forceBattleSpacing(c);engine.mode='battle';engine.battle={creature:c,petHp:34,enemyHp:Number(c.hp||18),turn:'player',busy:false,guard:false,log:''};c.state='battle';engine.state.vx=0;engine.state.vy=0;say('Battle start! Choose a move.');renderSkillBar();engine.skillBar.classList.remove('hidden');updateHud();}
  function renderSkillBar(){var b=engine.battle;if(!b){engine.skillBar.classList.add('hidden');return;}var list=buildMoves();var c=b.creature;var html='<div class="gfBattleMini"><b>'+(engine.pet.name||'Your pet')+' HP '+b.petHp+'</b><span>vs</span><b>'+esc(c.name||'Creature')+' HP '+Math.max(0,b.enemyHp)+'</b></div><div class="gfBattleMoves">';list.forEach(function(m,i){html+='<button data-move="'+i+'"><strong>'+esc(m.name)+'</strong><small>'+esc(m.type||'normal')+' · '+m.power+'</small></button>';});html+='</div>';engine.skillBar.innerHTML=html;Array.prototype.forEach.call(engine.skillBar.querySelectorAll('[data-move]'),function(btn){btn.onclick=function(){useMove(list[Number(btn.getAttribute('data-move'))]||list[0]);};});}
  function buildMoves(){var defs=engine.pet.moveDefs||{},ids=Array.isArray(engine.pet.moves)?engine.pet.moves.slice():[];if(!ids.length)ids=['tackle'];var out=ids.slice(0,4).map(function(id){var d=defs[id]||{};return {id:id,name:d.name||niceMoveName(id),type:d.type||engine.pet.type||'normal',power:Number(d.power||d.damage||d.value||8),cost:Number(d.cost||0)};});if(out.length<2)out.push({id:'guard',name:'Guard',type:'defense',power:0});if(out.length<3)out.push({id:'quick_hop',name:'Quick Hop',type:'agility',power:6});return out.slice(0,4);}
  function useMove(m){var b=engine.battle;if(!b||b.turn!=='player'||b.busy)return;b.busy=true;if(m.id==='guard'||m.power<=0){b.guard=true;say((engine.pet.name||'Your pet')+' braces for impact.');pop('Guard',engine.state.x,engine.state.y+92,'info');attackVisual('guard',engine.state.x,engine.state.y,b.creature);}else{var base=Number(m.power||8);var bossMod=b.creature.boss?.72:1;var dmg=Math.max(5,Math.round((base*.45+4+Math.random()*5)*bossMod));b.enemyHp=Math.max(0,b.enemyHp-dmg);var kind=moveVisualKind(m);say((engine.pet.name||'Your pet')+' used '+m.name+'!');attackVisual(kind,engine.state.x,engine.state.y,b.creature);pop('-'+dmg,b.creature.x,b.creature.y+90,'bad');burst(b.creature.x,GROUND_H+(b.creature.y||0)+50,kind);} 
    renderSkillBar();setTimeout(function(){if(!engine.battle)return;if(engine.battle.enemyHp<=0)return winBattle();enemyTurn();},760);}
  function moveVisualKind(m){var t=String((m&&m.type)||'').toLowerCase(),id=String((m&&m.id)||'').toLowerCase(),name=String((m&&m.name)||'').toLowerCase();if(t.indexOf('fire')>=0||id.indexOf('ember')>=0||name.indexOf('ember')>=0||name.indexOf('flame')>=0)return 'fire';if(t.indexOf('nature')>=0||t.indexOf('earth')>=0||id.indexOf('root')>=0||name.indexOf('vine')>=0)return 'root';if(t.indexOf('shadow')>=0||id.indexOf('shadow')>=0)return 'shadow';if(id.indexOf('quick')>=0||name.indexOf('dash')>=0||name.indexOf('hop')>=0)return 'dash';return 'strike';}
  function attackVisual(kind,x,y,target){
    var cls='attack_'+kind;engine.petEl.classList.remove('attack_fire','attack_root','attack_shadow','attack_dash','attack_strike','attack_guard');void engine.petEl.offsetWidth;engine.petEl.classList.add(cls);
    setTimeout(function(){if(engine.petEl)engine.petEl.classList.remove(cls);},520);
    if(target){var node=engine.world&&engine.world.querySelector('[data-eid="'+cssEscape(target.id)+'"]');if(node){node.classList.add('hit_'+kind);setTimeout(function(){node.classList.remove('hit_'+kind);},520);}}
    burst(target?target.x:x,GROUND_H+(target?target.y:y||0)+55,kind);
  }
  function enemyTurn(){var b=engine.battle;if(!b)return;b.turn='enemy';var dmg=Math.max(2,Math.round(Number(b.creature.attack||4)+Math.random()*4));if(b.guard){dmg=Math.max(1,Math.floor(dmg*.45));b.guard=false;}b.petHp=Math.max(1,b.petHp-dmg);var node=engine.world&&engine.world.querySelector('[data-eid="'+cssEscape(b.creature.id)+'"]');if(node){node.classList.add('enemyAttack');setTimeout(function(){node.classList.remove('enemyAttack');},520);}say((b.creature.name||'Creature')+' strikes back!');pop('-'+dmg,engine.state.x,engine.state.y+92,'bad');burst(engine.state.x,GROUND_H+engine.state.y+50,String(b.creature.type||'danger').toLowerCase());pulseWorld('danger');setTimeout(function(){if(!engine.battle)return;b.turn='player';b.busy=false;renderSkillBar();say('Choose your next move.');},820);}
  function winBattle(){
    var b=engine.battle;if(!b)return;var c=b.creature;
    c.defeated=true;c.state='defeated';engine.defeatedCreatures[c.id]=true;
    var node=engine.world.querySelector('[data-eid="'+cssEscape(c.id)+'"]');if(node)node.classList.add('defeated');
    engine.skillBar.classList.add('hidden');engine.battle=null;engine.encounter=null;
    if(c.finalBoss){
      engine.discoveries.root_guardian=true;
      say('The Corrupted Root Guardian calms. The roots open toward the Ember Tree.');
      pop('Guardian Calmed!',engine.state.x,engine.state.y+110,'good');burst(engine.state.x,GROUND_H+engine.state.y+62,'story');pulseWorld('story');
      beginCompletionSequence();
      return;
    }
    engine.mode='explore';
    if(c.miniBoss){engine.discoveries.ashroot_sentinel=true;say('The Ashroot Sentinel settles into the soil. A deeper path opens ahead.');}
    else say((c.name||'The creature')+' calmed down and drifted away.');
    pop(c.miniBoss?'Path Opened!':'Victory!',engine.state.x,engine.state.y+98,'good');burst(engine.state.x,GROUND_H+engine.state.y+50,'solve');updateHud();
  }


  function renderRooms(){
    return (engine.zone.rooms||[]).map(function(r){
      return '<div class="gfAdvRoomBand '+esc(r.mood||'')+'" style="left:'+num(r.from)+'px;width:'+(num(r.to)-num(r.from))+'px"><b>'+esc(r.name)+'</b><span>'+esc(r.subtitle||'')+'</span></div>';
    }).join('');
  }
  function renderEnvironmentScenes(){
    return [
      '<div class="gfEnvScene camp" style="left:220px"><i></i><b>Mira’s camp</b></div>',
      '<div class="gfEnvScene footprints" style="left:760px"><i></i><b>small tracks</b></div>',
      '<div class="gfEnvScene brokenBridge" style="left:1680px"><i></i><b>collapsed scout bridge</b></div>',
      '<div class="gfEnvScene carvings" style="left:2505px"><i></i><b>old root carvings</b></div>',
      '<div class="gfEnvScene deepPulse" style="left:3565px"><i></i><b>deep pulse</b></div>',
      '<div class="gfEnvScene guardianRoots" style="left:4700px"><i></i><b>guardian roots</b></div>'
    ].join('');
  }
  function getRoomForX(x){
    var rooms=engine.zone.rooms||[];
    for(var i=0;i<rooms.length;i++){if(x>=rooms[i].from&&x<rooms[i].to)return rooms[i];}
    return rooms[rooms.length-1]||null;
  }
  function checkRoomTransition(){
    var r=getRoomForX(engine.state.x);if(!r||!r.id||r.id===engine.currentRoomId)return;
    engine.currentRoomId=r.id;engine.transition={room:r,startedAt:Date.now()};engine.mode='roomTransition';engine.state.vx=0;engine.state.vy=0;
    if(engine.roomOverlay){engine.roomOverlay.innerHTML='<div><b>'+esc(r.name)+'</b><span>'+esc(r.subtitle||'')+'</span></div>';engine.roomOverlay.classList.remove('hidden');}
    say(r.name+': '+(r.subtitle||'Keep moving.'));
  }
  function updateRoomTransition(){
    if(!engine.transition){engine.mode='explore';return;}
    var age=Date.now()-engine.transition.startedAt;
    if(engine.transition.portal&&engine.transition.phase==='fade'&&age>260){
      var pt=engine.transition.portal;engine.state.x=pt.toX;engine.state.y=Number(pt.toY||0);engine.state.vx=0;engine.state.vy=0;engine.currentRoomId=(getRoomForX(engine.state.x)||{}).id||engine.currentRoomId;engine.transition.phase='arrived';
    }
    if(age>760){
      if(engine.roomOverlay)engine.roomOverlay.classList.add('hidden');
      engine.transition=null;engine.mode='explore';
    }
  }
  function checkAbilityItems(){
    (engine.zone.keyItems||[]).forEach(function(k){
      if(engine.keyItems[k.id])return;
      if(Math.abs(engine.state.x-k.x)<42&&Math.abs(engine.state.y-k.y)<78)collectKeyItem(k.id);
    });
  }

  function checkSceneDiscoveries(){
    (engine.zone.interactables||[]).forEach(function(o){
      if(!o.auto||engine.touched[o.id])return;
      if(Math.abs(engine.state.x-o.x)<52&&Math.abs(engine.state.y-o.y)<86)interact(o.id);
    });
  }
  function checkPortals(){
    if(engine.mode!=='explore')return;
    var pts=engine.zone.portals||[];
    for(var i=0;i<pts.length;i++){
      var pt=pts[i],px=pt.x+(pt.w||90)/2;
      if(Math.abs(engine.state.x-px)<42&&Math.abs(engine.state.y-(pt.y||0))<96){
        if(pt.requiresItem&&!engine.keyItems[pt.requiresItem]){say('A passage is here, but '+friendly(pt.requiresItem)+' is needed.');return;}
        beginPortalTransition(pt);return;
      }
    }
  }
  function beginPortalTransition(pt){
    engine.mode='roomTransition';engine.transition={portal:pt,startedAt:Date.now(),phase:'fade'};engine.state.vx=0;engine.state.vy=0;
    if(engine.roomOverlay){engine.roomOverlay.innerHTML='<div><b>'+esc(pt.name||'Passage')+'</b><span>'+esc(pt.text||'The room shifts around your companion.')+'</span></div>';engine.roomOverlay.classList.remove('hidden');}
    say(pt.text||'The room shifts around your companion.');
  }
  function collectKeyItem(id){
    var k=findById(engine.zone.keyItems,id);if(!k||engine.keyItems[id])return;
    engine.keyItems[id]=true;engine.discoveries[id]=true;
    var node=engine.world.querySelector('[data-kid="'+cssEscape(id)+'"]');if(node)node.classList.add('taken');
    applyWorldEffect(id,k);pulseWorld('solve');burst(k.x,GROUND_H+52+k.y,'story');pop('New Tool: '+(k.name||id),k.x,k.y+118,'good');say((k.name||'A tool')+': '+(k.text||'This will help your pet explore.'));updateHud();
  }
  function tryBarrier(id){
    var b=findById(engine.zone.barriers,id);if(!b||engine.openedBarriers[id])return;
    if(!engine.keyItems[b.requiresItem]){say(b.closedText||'Something blocks the way.');pop('Need '+friendly(b.requiresItem),b.x+b.w/2,b.y+132,'bad');return;}
    engine.openedBarriers[id]=true;engine.puzzlesSolved[id]=true;
    var node=engine.world.querySelector('[data-bid="'+cssEscape(id)+'"]');if(node)node.classList.add('open');
    pulseWorld('solve');burst(b.x+b.w/2,GROUND_H+96+b.y,'solve');pop('Path Open!',b.x+b.w/2,b.y+150,'good');say(b.openText||'The path opens.');updateHud();
  }
  function resolveAbilityBarriers(prevX){
    (engine.zone.barriers||[]).forEach(function(b){
      if(engine.openedBarriers[b.id])return;
      var petBox=petRect();
      if(rectsOverlap(petBox.x,petBox.y,petBox.w,petBox.h,b.x,GROUND_H+b.y,b.w,b.h)){
        if(prevX<b.x)engine.state.x=b.x-petBox.w*.5-8;else engine.state.x=b.x+b.w+petBox.w*.5+8;
        engine.state.vx=0;if(engine.keyItems[b.requiresItem]){tryBarrier(b.id);}else say(b.closedText||'The way is blocked.');
      }
    });
  }
  function applyWorldEffect(effect,obj){
    if(!effect)return;
    engine.worldFlags[effect]=true;
    engine.root.classList.add('flag_'+effect);
    if(effect==='guide_trail')say('Mira’s ember trail flares for a moment, pointing toward the upper route.');
    if(effect==='awaken_lantern')say('The lantern nearby wakes. It may reveal dark roots.');
    if(effect==='root_pulse')say('The deep roots pulse. A tool glints above the sentinel ledge.');
    if(effect==='guardian_whisper')say('The guardian is afraid, not evil. Calm it to wake the tree.');
  }
  function updateCamera(){var sceneW=engine.scene.clientWidth||900,target=engine.state.x-sceneW*.42,max=Math.max(0,engine.zone.width-sceneW);engine.cameraX+=((clamp(target,0,max)-engine.cameraX)*.13);engine.world.style.transform='translateX('+(-engine.cameraX)+'px)';}
  function updatePositions(){var s=engine.state,facing=s.facing<0?-1:1,b=petBehavior(engine.pet);engine.petEl.style.left=s.x+'px';engine.petEl.style.bottom=(GROUND_H+s.y)+'px';engine.petEl.style.setProperty('--petFace',facing);engine.petEl.classList.toggle('moving',Math.abs(s.vx)>1&&engine.mode==='explore');engine.petEl.classList.toggle('jumping',!s.onGround);engine.petEl.classList.toggle('landed',!!s.landed);engine.petEl.classList.toggle('alert',nearUntouchedDiscovery()||nearClosedGate()||engine.mode!=='explore');engine.petEl.style.setProperty('--squash',s.landed?'.9':(!s.onGround?'1.04':(Math.abs(s.vx)>1?'.98':'1')));engine.petEl.style.setProperty('--stretch',s.landed?'1.12':(!s.onGround?'.96':'1'));engine.petEl.dataset.behavior=b.name;}
  function updateCreaturePositions(){engine.creatures.forEach(function(c){var n=engine.world&&engine.world.querySelector('[data-eid="'+cssEscape(c.id)+'"]');if(!n)return;n.style.left=c.x+'px';n.style.bottom=(GROUND_H+Number(c.y||0))+'px';n.style.setProperty('--creatureFace',c.facing<0?-1:1);n.classList.toggle('alert',c.state==='alert'||c.state==='battle');n.classList.toggle('roaming',c.state==='roam');});}
  function petBehavior(pet){var personality=String((pet&&pet.personality)||'').toLowerCase(),type=String((pet&&pet.type)||'').toLowerCase();if(personality==='playful'||type==='fire')return {name:'playful'};if(personality==='timid'||type==='shadow')return {name:'timid'};if(personality==='curious'||type==='nature')return {name:'curious'};if(personality==='lazy')return {name:'lazy'};return {name:'steady'};}

  function checkCollectibles(){var s=engine.state;(engine.zone.collectibles||[]).forEach(function(c){if(engine.collectedIds[c.id])return;var node=engine.world.querySelector('[data-cid="'+cssEscape(c.id)+'"]');var dx=s.x-c.x,dy=(s.y+38)-(c.y+42);if(Math.abs(dx)<130&&Math.abs(dy)<130&&node){var pull=Math.max(0,1-(Math.sqrt(dx*dx+dy*dy)/150));node.style.transform='translate(-50%,0) translate('+dx*pull*.18+'px,'+(-dy*pull*.18)+'px) scale('+(1+pull*.18)+')';}if(Math.abs(dx)<46&&Math.abs(dy)<70)collect(c.id);});}
  function collect(id){var c=findById(engine.zone.collectibles,id);if(!c||engine.collectedIds[id])return;engine.collectedIds[id]=true;engine.collected[c.type]=Number(engine.collected[c.type]||0)+1;var node=engine.world.querySelector('[data-cid="'+cssEscape(id)+'"]');if(node)node.classList.add('taken');burst(c.x,GROUND_H+42+c.y,'spark');pop('+1 '+friendly(c.type),c.x,c.y+92,'good');say('Collected '+friendly(c.type)+'. Sparks collect on touch.');updateHud();if(engine.callbacks.onCollect)engine.callbacks.onCollect(c);}
  function checkHazards(){
    var now=Date.now();if(now-engine.lastHitAt<1050)return;var r=petRect();
    (engine.zone.hazards||[]).forEach(function(h){
      var hx=h.x,hy=GROUND_H+h.y,hw=h.w,hh=h.h;
      if(h.kind==='emberfall'){
        var phase=((now/820)+(h.x%7))%2;var drop=phase<1?phase:(2-phase);hy=GROUND_H+8+(drop*90);hh=42;
      }else if(h.kind==='vent'){
        var hot=((now+Number(h.x||0)*9)%2200)>980;
        var node=engine.world&&engine.world.querySelector('[data-hid="'+cssEscape(h.id)+'"]');if(node)node.classList.toggle('hot',hot);
        if(!hot)return;
        hy=GROUND_H+6;hh=Math.max(38,Number(h.h||70));
      }else if(h.kind==='bramble'){
        hy=GROUND_H+2;hh=Math.max(18,Number(h.h||24));
      }
      var pad=h.kind==='bramble'?18:12;
      if(rectsOverlap(r.x+pad,r.y+8,Math.max(12,r.w-pad*2),Math.max(18,r.h-16),hx+8,hy,Math.max(10,hw-16),hh)){
        engine.lastHitAt=now;engine.hazardsHit[h.id]=Number(engine.hazardsHit[h.id]||0)+1;engine.state.health=Math.max(1,Number(engine.state.health||3)-Number(h.damage||1));
        var oldX=engine.state.x;engine.state.x=clamp(engine.state.x-(engine.state.facing*62),44,engine.zone.width-88);engine.state.vx=0;engine.state.vy=Math.max(engine.state.vy,6.2);resolveWalls(oldX);
        pulseWorld('danger');burst(engine.state.x,GROUND_H+engine.state.y+44,'danger');pop('Stumble!',engine.state.x,engine.state.y+86,'bad');say(h.text||'Your companion stumbles.');updateHud();
      }
    });
  }
  function updateNearest(){var s=engine.state,nearest=null,dist=9999;Array.prototype.forEach.call(engine.world.querySelectorAll('.gfAdvUsable'),function(node){node.classList.remove('near');});
    (engine.zone.barriers||[]).forEach(function(b){if(engine.openedBarriers[b.id])return;var d=Math.abs(s.x-(b.x+b.w/2))+Math.abs(s.y-b.y)*.8;if(d<135&&d<dist){nearest={type:'barrier',id:b.id,obj:b};dist=d;}});
    (engine.zone.gates||[]).forEach(function(g){if(engine.openedGates[g.id])return;var d=Math.abs(s.x-(g.x+g.w/2))+Math.abs(s.y-g.y)*.8;if(d<126&&d<dist){nearest={type:'gate',id:g.id,obj:g};dist=d;}});engine.nearest=nearest;if(nearest){var sel=nearest.type==='gate'?'[data-gid="'+cssEscape(nearest.id)+'"]':'[data-bid="'+cssEscape(nearest.id)+'"]';var n=engine.world.querySelector(sel);if(n)n.classList.add('near');}
    updateTouchAction();}
  function tryInteract(){if(engine.mode!=='explore')return;if(!engine.nearest){say('Sparks, tools, chests, and discoveries are collected by touch. Only sealed paths need Use.');return;}if(engine.nearest.type==='gate')tryGate(engine.nearest.id);else if(engine.nearest.type==='barrier')tryBarrier(engine.nearest.id);}
  function interact(id){var o=findById(engine.zone.interactables,id);if(!o)return;engine.touched[id]=true;var node=engine.world.querySelector('[data-iid="'+cssEscape(id)+'"]');if(node)node.classList.add('used');if(o.discoveryId)engine.discoveries[o.discoveryId]=true;applyWorldEffect(o.effect,o);say((o.title?o.title+': ':'')+(o.text||'Your pet investigates.'));pop(o.discoveryId?'Discovery!':'Use',o.x,o.y+108,o.discoveryId?'good':'info');pulseWorld(o.kind==='story'?'story':'soft');if(engine.callbacks.onInteract)engine.callbacks.onInteract(o);updateHud();}
  function tryGate(id){var g=findById(engine.zone.gates,id);if(!g)return;if(engine.openedGates[id])return;var need=(g.requires&&g.requires.ember_shard)||engine.zone.requiredGateShards||3;var have=Number(engine.collected.ember_shard||0);if(have<need){say((g.text||'The gate is sealed.')+' You have '+have+'/'+need+' sparks.');pop(have+'/'+need+' sparks',g.x+g.w/2,g.y+130,'bad');return;}engine.openedGates[id]=true;engine.puzzlesSolved[id]=true;var node=engine.world.querySelector('[data-gid="'+cssEscape(id)+'"]');if(node)node.classList.add('open');say('The root gate opens. Your pet pushes forward as the hollow gets warmer.');pop('Gate opened!',g.x+g.w/2,g.y+155,'good');burst(g.x+g.w/2,GROUND_H+90,'solve');pulseWorld('solve');updateHud();}
  function checkBossTriggers(){
    if(engine.mode!=='explore')return;
    var guardian=findById(engine.creatures,'root_guardian');
    if(guardian&&!guardian.defeated&&guardian.state==='roam'&&engine.state.x>6800){
      beginEncounterIntro(guardian);
    }
  }
  function beginCompletionSequence(){
    engine.mode='ending';engine.completion={phase:'walk',startedAt:Date.now(),done:false};engine.state.vx=0;engine.state.vy=0;
    engine.skillBar.classList.add('hidden');updateHud();
    say('The Ember Tree calls softly. Your pet walks forward.');
  }
  function updateEnding(){
    if(!engine.completion)return;
    var age=Date.now()-engine.completion.startedAt;
    var target=engine.zone.goalX||5120;
    engine.state.facing=1;
    if(engine.state.x<target-40){engine.state.x+=Math.min(2.2,target-engine.state.x);engine.state.vx=1.6;}
    else{engine.state.vx=0;engine.goalReached=true;engine.discoveries.ember_tree=true;}
    if(age>1700&&!engine.completion.pulsed){engine.completion.pulsed=true;pulseWorld('story');burst(target,GROUND_H+150,'story');say('The Ember Tree awakens. Warm light rolls through the hollow.');}
    if(age>3000&&!engine.completion.done){engine.completion.done=true;showCompletionOverlay();}
  }
  function showCompletionOverlay(){
    if(!engine.completionOverlay)return;
    var shards=Number(engine.collected.ember_shard||0),total=(engine.zone.collectibles||[]).length;
    var discoveries=Object.keys(engine.discoveries).length,wins=Object.keys(engine.defeatedCreatures).length,stumbles=Object.keys(engine.hazardsHit).reduce(function(a,k){return a+Number(engine.hazardsHit[k]||0)},0);
    engine.completionOverlay.innerHTML='<div class="gfCompleteCard"><div class="gfCompleteIcon">🌳</div><h2>Ember Hollow Cleared</h2><p>The guardian calmed, the tree awakened, and your companion carries the hollow’s warmth home.</p><div class="gfCompleteStats"><span>'+shards+'/'+total+' Sparks</span><span>'+discoveries+' Discoveries</span><span>'+wins+' Creatures Calmed</span><span>'+stumbles+' Stumbles</span></div><div class="gfCompleteActions"><button id="gfCompleteReturn" class="primary">Return Home</button><button id="gfCompleteExplore">Keep Exploring</button></div></div>';
    engine.completionOverlay.classList.remove('hidden');
    var ret=document.getElementById('gfCompleteReturn'),exp=document.getElementById('gfCompleteExplore');
    if(ret)ret.onclick=function(){complete();};
    if(exp)exp.onclick=function(){engine.completionOverlay.classList.add('hidden');engine.mode='explore';say('The hollow is calm. You can keep exploring or return home.');};
  }
  function checkGoal(){
    if(engine.goalReached||engine.mode==='ending')return;
    if(engine.state.x>engine.zone.goalX-60){
      var guardian=findById(engine.creatures,'root_guardian');
      if(guardian&&!guardian.defeated){say('The Ember Tree is guarded. Calm the Root Guardian first.');beginEncounterIntro(guardian);return;}
      beginCompletionSequence();
    }
  }
  function complete(){var duration=Date.now()-engine.startedAt;var payload={zoneId:engine.zone.id,items:Object.assign({},engine.collected),collectedIds:Object.keys(engine.collectedIds),discoveries:Object.keys(engine.discoveries),puzzlesSolved:Object.keys(engine.puzzlesSolved),keyItems:Object.keys(engine.keyItems),openedBarriers:Object.keys(engine.openedBarriers),defeatedCreatures:Object.keys(engine.defeatedCreatures),stumbles:Object.keys(engine.hazardsHit).reduce(function(a,k){return a+Number(engine.hazardsHit[k]||0)},0),goalReached:!!engine.goalReached,durationMs:duration};stop(true,payload);}
  function stop(completed,payload){if(!engine.running)return;engine.running=false;cancelAnimationFrame(engine.raf);engine.root.classList.add('hidden');engine.skillBar.classList.add('hidden');engine.mode='explore';if(completed&&engine.callbacks.onComplete)engine.callbacks.onComplete(payload||{});if(!completed&&engine.callbacks.onCancel)engine.callbacks.onCancel();}

  function updateHud(){var shards=Number(engine.collected.ember_shard||0),stumbles=Object.keys(engine.hazardsHit).reduce(function(a,k){return a+Number(engine.hazardsHit[k]||0)},0),wins=Object.keys(engine.defeatedCreatures).length;engine.hud.innerText=shards+' sparks • '+Object.keys(engine.keyItems).length+' tools • '+wins+' calmed';var gateOpen=!!engine.openedGates.root_gate;if(engine.mode==='ending')engine.objective.innerText='Ember Hollow Cleared';else if(engine.mode==='battle')engine.objective.innerText='Choose a move';else if(!gateOpen)engine.objective.innerText='Open the Root Gate';else if(!engine.keyItems.ember_lantern)engine.objective.innerText='Find the Ember Lantern';else if(!engine.openedBarriers.dark_root_veil)engine.objective.innerText='Reveal the dark roots';else if(!engine.keyItems.root_claw)engine.objective.innerText='Find the Root Claw';else if(!engine.openedBarriers.claw_root_tangle)engine.objective.innerText='Open the core path';else if(!engine.goalReached)engine.objective.innerText='Reach the Ember Tree';else engine.objective.innerText='Return Home';}
  function maybeAmbient(){var now=Date.now();if(now-engine.lastAmbientAt<9000)return;engine.lastAmbientAt=now;var arr=engine.zone.ambientEvents||[];if(arr.length)say(arr[Math.floor(Math.random()*arr.length)]);}
  function say(text){engine.prompt.innerText=text;engine.prompt.classList.remove('pulse');void engine.prompt.offsetWidth;engine.prompt.classList.add('pulse');}
  function sayOnce(key,text){engine._said=engine._said||{};if(engine._said[key])return;engine._said[key]=true;say(text);}
  function pop(text,x,y,type){var layer=document.getElementById('gfAdvToastLayer');if(!layer)return;var el=document.createElement('div');el.className='gfAdvPop '+(type||'info');el.innerText=text;el.style.left=(x-engine.cameraX)+'px';el.style.bottom=(GROUND_H+y)+'px';layer.appendChild(el);setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},1050);}
  function burst(x,y,type){var layer=document.getElementById('gfAdvToastLayer');if(!layer)return;for(var i=0;i<12;i++){var p=document.createElement('div');p.className='gfAdvBurst '+(type||'spark');p.style.left=(x-engine.cameraX)+'px';p.style.bottom=y+'px';p.style.setProperty('--dx',((Math.random()*80)-40)+'px');p.style.setProperty('--dy',(20+Math.random()*55)+'px');layer.appendChild(p);setTimeout((function(n){return function(){if(n.parentNode)n.parentNode.removeChild(n);};})(p),650);}}
  function pulseWorld(kind){engine.root.classList.remove('pulseDanger','pulseSolve','pulseStory','pulseSoft');var cls=kind==='danger'?'pulseDanger':kind==='solve'?'pulseSolve':kind==='story'?'pulseStory':'pulseSoft';engine.root.classList.add(cls);setTimeout(function(){if(engine.root)engine.root.classList.remove(cls);},420);}
  function petRect(){var s=engine.state,p=engine.zone.player;return {x:s.x-p.w/2,y:GROUND_H+s.y,w:p.w,h:p.h};}
  function nearUntouchedDiscovery(){return (engine.zone.interactables||[]).some(function(o){return o.discoveryId&&!engine.touched[o.id]&&Math.abs(engine.state.x-o.x)<90&&Math.abs(engine.state.y-o.y)<80;});}
  function nearClosedGate(){return (engine.zone.gates||[]).some(function(g){return !engine.openedGates[g.id]&&Math.abs(engine.state.x-(g.x+g.w/2))<105;});}
  function requestJump(){engine.jumpQueuedUntil=Date.now()+Number((engine.zone&&engine.zone.player&&engine.zone.player.jumpBufferMs)||150);}
  function updateTouchAction(){
    if(!engine.actionBtn)return;
    if(engine.mode==='explore'&&engine.nearest){engine.actionBtn.classList.remove('hidden');engine.actionBtn.textContent=engine.nearest.type==='gate'||engine.nearest.type==='barrier'?'Open':(engine.nearest.type==='keyItem'?'Take':'Use');}
    else engine.actionBtn.classList.add('hidden');
  }
  function setupTouchControls(){
    if(!engine.scene)return;
    if(engine.actionBtn)engine.actionBtn.onclick=function(e){e.preventDefault();tryInteract();};
    engine.scene.addEventListener('pointerdown',function(e){
      if(!engine.running||engine.mode!=='explore')return;
      if(e.target&&String(e.target.tagName||'').toLowerCase()==='button')return;
      var r=engine.scene.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      engine.touch={id:e.pointerId,x:x,y:y,moved:false,dir:0};
      if(x<r.width*.38){engine.keys.ArrowLeft=true;engine.touch.dir=-1;}
      else if(x>r.width*.62){engine.keys.ArrowRight=true;engine.touch.dir=1;}
      try{engine.scene.setPointerCapture(e.pointerId);}catch(_e){}
    },{passive:false});
    engine.scene.addEventListener('pointermove',function(e){
      if(!engine.touch||engine.touch.id!==e.pointerId)return;
      var r=engine.scene.getBoundingClientRect(),dy=e.clientY-r.top-engine.touch.y;
      if(dy<-34&&!engine.touch.moved){engine.touch.moved=true;requestJump();}
    },{passive:false});
    function endTouch(e){
      if(!engine.touch||engine.touch.id!==e.pointerId)return;
      var r=engine.scene.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,dy=y-engine.touch.y,dx=x-engine.touch.x;
      if(engine.touch.dir<0)engine.keys.ArrowLeft=false;if(engine.touch.dir>0)engine.keys.ArrowRight=false;
      if(dy<-30)requestJump();
      if(Math.abs(dx)<12&&Math.abs(dy)<12&&x>r.width*.38&&x<r.width*.62&&engine.nearest)tryInteract();
      engine.touch=null;
    }
    engine.scene.addEventListener('pointerup',endTouch,{passive:false});engine.scene.addEventListener('pointercancel',endTouch,{passive:false});
  }
  function forceBattleSpacing(c){
    if(!c||!engine.state)return;
    var desired=132,dir=c.x<engine.state.x?1:-1;
    c.facing=dir;engine.state.facing=-dir;
    if(Math.abs(engine.state.x-c.x)<desired){engine.state.x=clamp(c.x+(dir*desired),42,engine.zone.width-80);}
    c.x=clamp(engine.state.x-(dir*desired),42,engine.zone.width-80);
    engine.state.vx=0;engine.state.vy=0;engine.state.y=Math.max(0,engine.state.y||0);
  }
  function onKey(e){if(!engine.running)return;var codes=['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW','KeyE'];if(codes.indexOf(e.code)<0)return;if(e.type==='keydown'){engine.keys[e.code]=true;if(e.code==='KeyE')tryInteract();if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')requestJump();}else engine.keys[e.code]=false;if(['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW','KeyE'].indexOf(e.code)>=0)e.preventDefault();}
  function findById(arr,id){return (arr||[]).find(function(x){return String(x.id)===String(id);});}
  function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;}
  function niceMoveName(id){return String(id||'Move').replace(/[_-]+/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});}
  function num(v){return Number(v||0)}function clamp(v,min,max){return Math.max(min,Math.min(max,v))}function friendly(s){return String(s||'item').replace(/_/g,' ')}function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}function cssEscape(s){return String(s).replace(/"/g,'\\"')}

  function injectStyles(){
    if(document.getElementById('gfAdventureStyles'))return;
    var s=document.createElement('style');s.id='gfAdventureStyles';s.textContent=''
+'.gfAdventure{position:fixed;inset:0;z-index:99999;background:#0f172a;color:#fff;display:grid;grid-template-rows:auto minmax(0,1fr);font-family:Arial,Helvetica,sans-serif;touch-action:none}.gfAdventure.hidden{display:none}.gfAdventureTop{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;background:rgba(15,23,42,.86);border-bottom:1px solid rgba(255,255,255,.10);box-shadow:0 10px 24px rgba(0,0,0,.18);z-index:50}.gfAdvTitleBlock b{display:block;font-size:17px;letter-spacing:-.35px}.gfAdvTitleBlock span{display:block;font-size:10px;color:#fed7aa;font-weight:800;max-width:560px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gfAdvControls{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.gfAdvControls span{font-size:11px;font-weight:1000;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:5px 8px}.gfAdvControls button{border:0;border-radius:999px;padding:6px 9px;font-size:12px;font-weight:1000;background:rgba(255,255,255,.14);color:white;cursor:pointer}.gfAdvControls button.primary{background:linear-gradient(135deg,#f97316,#facc15);color:#1c1007}.gfAdventureScene{position:relative;overflow:hidden;background:linear-gradient(180deg,#3b1d12 0%,#6b2e11 48%,#1c1007 100%)}.gfAdvSky,.gfAdvSun,.gfAdvGlow{position:absolute;inset:0;pointer-events:none}.gfAdvSky{background:radial-gradient(circle at 20% 12%,rgba(253,186,116,.22),transparent 21%),radial-gradient(circle at 85% 18%,rgba(248,113,113,.18),transparent 22%)}.gfAdvSun{width:280px;height:280px;border-radius:50%;left:68%;top:8%;background:radial-gradient(circle,rgba(250,204,21,.38),transparent 64%);filter:blur(3px);animation:gfGlow 4s ease-in-out infinite}.gfAdvGlow{background:radial-gradient(circle at 50% 84%,rgba(249,115,22,.24),transparent 36%)}.gfAdventureWorld{position:absolute;left:0;top:0;bottom:0;width:7600px;transform:translateX(0);will-change:transform}.gfAdvLayer{position:absolute;left:0;right:0;bottom:98px;height:64%;pointer-events:none}.gfAdvLayer.mountains{opacity:.38;background:linear-gradient(135deg,transparent 0 12%,rgba(15,23,42,.55) 12% 22%,transparent 22% 38%,rgba(67,20,7,.62) 38% 48%,transparent 48% 64%,rgba(15,23,42,.5) 64% 76%,transparent 76%)}.gfAdvLayer.trees{bottom:88px;height:42%;opacity:.34;background:radial-gradient(ellipse at 10% 80%,rgba(67,20,7,.78),transparent 13%),radial-gradient(ellipse at 28% 78%,rgba(67,20,7,.72),transparent 12%),radial-gradient(ellipse at 52% 78%,rgba(67,20,7,.72),transparent 13%),radial-gradient(ellipse at 76% 78%,rgba(67,20,7,.76),transparent 13%),radial-gradient(ellipse at 94% 78%,rgba(67,20,7,.7),transparent 12%)}.gfAdvPathGlow{position:absolute;left:0;right:0;bottom:98px;height:58px;background:linear-gradient(90deg,rgba(251,191,36,.08),rgba(251,191,36,.24),rgba(251,191,36,.09));filter:blur(9px);animation:gfTrail 3.2s ease-in-out infinite}.gfAdvGround{position:absolute;left:0;right:0;bottom:0;height:98px;background:linear-gradient(180deg,#92400e,#431407 58%,#1c1007);border-top:5px solid rgba(253,186,116,.72);box-shadow:0 -16px 40px rgba(251,146,60,.18)}.gfAdvLandmark{position:absolute;bottom:107px;width:130px;text-align:center;font-size:12px;font-weight:1000;color:#fed7aa;text-shadow:0 2px 8px #000}.gfAdvLandmark.start{left:40px}.gfAdvLandmark.tree{width:185px;font-size:14px;color:#fef3c7}.gfAdvHeroPet{position:absolute;width:92px;height:98px;z-index:13;display:flex;align-items:center;justify-content:center;transform:translateX(-50%) scaleX(var(--petFace,1)) scale(var(--squash,1),var(--stretch,1));transform-origin:center bottom;transition:filter .15s}.gfAdvHeroPet img{max-width:90px;max-height:90px;object-fit:contain;filter:drop-shadow(0 14px 12px rgba(0,0,0,.3));animation:gfPetIdle 1.35s ease-in-out infinite}.gfAdvHeroPet span{width:90px;height:90px;display:inline-flex;align-items:center;justify-content:center;font-size:58px;filter:drop-shadow(0 14px 12px rgba(0,0,0,.3));animation:gfPetIdle 1.35s ease-in-out infinite}.gfAdvHeroPet em{position:absolute;bottom:-10px;left:50%;transform:translateX(-50%) scaleX(var(--petFace,1));font-size:10px;font-style:normal;font-weight:1000;color:#fff;background:rgba(15,23,42,.55);padding:2px 6px;border-radius:999px;white-space:nowrap}.gfAdvHeroPet.moving img,.gfAdvHeroPet.moving span{animation:gfPetRun .38s ease-in-out infinite}.gfAdvHeroPet.jumping img,.gfAdvHeroPet.jumping span{animation:gfPetJump .55s ease-in-out infinite}.gfAdvHeroPet.landed img,.gfAdvHeroPet.landed span{animation:gfPetLand .16s ease}.gfAdvHeroPet.backflip img,.gfAdvHeroPet.backflip span{animation:gfBackflip .5s ease}.gfAdvHeroPet.alert{filter:drop-shadow(0 0 14px rgba(250,204,21,.95))}.gfAdvCollectible,.gfAdvThing,.gfAdvGate{position:absolute;z-index:7;border:0;background:transparent;color:white;cursor:pointer;transform:translate(-50%,0);filter:drop-shadow(0 10px 10px rgba(0,0,0,.35));transition:.18s ease}.gfAdvCollectible{font-size:34px;animation:gfShard 1.2s ease-in-out infinite}.gfAdvCollectible span{display:grid;place-items:center;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle,rgba(254,240,138,.9),rgba(249,115,22,.34) 48%,transparent 72%);border:1px solid rgba(254,240,138,.5)}.gfAdvCollectible.taken{opacity:0!important;transform:translate(-50%,-38px) scale(1.6)!important;pointer-events:none}.gfAdvThing{font-size:42px}.gfAdvThing span{display:grid;place-items:center;width:58px;height:58px;border-radius:20px;background:rgba(15,23,42,.42);border:1px solid rgba(255,255,255,.2)}.gfAdvThing i{position:absolute;left:50%;bottom:-16px;transform:translateX(-50%);font-style:normal;font-size:10px;font-weight:1000;background:rgba(15,23,42,.72);color:#fff;border-radius:999px;padding:2px 6px;opacity:0}.gfAdvThing.near,.gfAdvGate.near{filter:drop-shadow(0 0 16px rgba(250,204,21,.95));transform:translate(-50%,-5px) scale(1.04)}.gfAdvThing.near i{opacity:1}.gfAdvThing.used:not(.npc):not(.sign){opacity:.58;filter:grayscale(.2) drop-shadow(0 10px 10px rgba(0,0,0,.35))}.gfAdvPlatform{position:absolute;z-index:5;border-radius:18px;background:linear-gradient(180deg,#7c2d12,#431407);border-top:7px solid #fdba74;box-shadow:0 14px 24px rgba(0,0,0,.28),inset 0 4px 0 rgba(254,240,138,.24)}.gfAdvPlatform:before{content:"";position:absolute;left:10px;right:10px;top:-10px;height:8px;border-radius:999px;background:rgba(254,240,138,.52);box-shadow:0 0 18px rgba(250,204,21,.3)}.gfAdvPlatform span{display:none}.gfAdvHazard{position:absolute;z-index:6;display:flex;align-items:center;justify-content:center;pointer-events:none}.gfAdvHazard span{font-size:28px;filter:drop-shadow(0 8px 8px rgba(0,0,0,.45))}.gfAdvHazard.bramble{height:24px!important;background:linear-gradient(180deg,rgba(251,146,60,.7),rgba(124,45,18,.86));border-radius:999px;border-top:2px solid rgba(254,240,138,.55);box-shadow:0 0 18px rgba(249,115,22,.32)}.gfAdvHazard.bramble span{font-size:20px}.gfAdvHazard.vent{border-radius:999px 999px 12px 12px;background:linear-gradient(180deg,rgba(250,204,21,.10),rgba(249,115,22,.18));opacity:.58;box-shadow:inset 0 0 18px rgba(250,204,21,.2)}.gfAdvHazard.vent.hot{opacity:1;background:linear-gradient(180deg,rgba(250,204,21,.18),rgba(249,115,22,.72));box-shadow:0 0 22px rgba(249,115,22,.52)}.gfAdvHazard.emberfall{height:120px!important;background:linear-gradient(180deg,rgba(250,204,21,.05),rgba(249,115,22,.38));border-radius:999px;animation:gfEmberFall 1.65s ease-in-out infinite}.gfAdvGate{z-index:9;border-radius:24px;background:linear-gradient(180deg,#78350f,#1c1007);border:2px solid rgba(253,186,116,.65);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#fef3c7;box-shadow:0 18px 36px rgba(0,0,0,.32)}.gfAdvGate b{font-size:13px}.gfAdvGate span{font-size:11px;color:#fdba74}.gfAdvGate.open{opacity:.25;transform:translate(-50%,-18px) scale(.75);pointer-events:none}.gfAdvCreature{position:absolute;z-index:11;display:flex;align-items:center;justify-content:center;transform:translateX(-50%) scaleX(var(--creatureFace,1));transform-origin:center bottom;filter:drop-shadow(0 16px 14px rgba(0,0,0,.32));transition:filter .15s}.gfAdvCreature img{max-width:100%;max-height:100%;object-fit:contain}.gfAdvCreature span{width:100%;height:100%;display:inline-flex;align-items:center;justify-content:center;font-size:52px}.gfAdvCreature em{position:absolute;bottom:-13px;left:50%;transform:translateX(-50%) scaleX(var(--creatureFace,1));font-size:9px;font-style:normal;font-weight:1000;color:#fff;background:rgba(15,23,42,.58);padding:2px 6px;border-radius:999px;white-space:nowrap}.gfAdvCreature.roaming{animation:gfCreatureBob 1.2s ease-in-out infinite}.gfAdvCreature.alert{filter:drop-shadow(0 0 16px rgba(248,113,113,.85)) drop-shadow(0 16px 14px rgba(0,0,0,.32))}.gfAdvCreature.defeated{opacity:0;transform:translateX(-50%) translateY(-30px) scale(.6);transition:.45s ease;pointer-events:none}.gfAdvExit{position:absolute;bottom:118px;width:145px;min-height:68px;border-radius:18px;background:rgba(15,23,42,.56);border:1px solid rgba(255,255,255,.22);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:white;font-weight:1000;box-shadow:0 18px 36px rgba(0,0,0,.24)}.gfAdvExit span{font-size:11px;color:#fed7aa}.gfAdvPrompt{position:absolute;left:50%;top:8px;transform:translateX(-50%);width:min(640px,calc(100% - 110px));background:rgba(15,23,42,.58);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:6px 11px;text-align:center;font-size:12px;font-weight:1000;color:#fff;box-shadow:0 12px 28px rgba(0,0,0,.12);pointer-events:none}.gfAdvPrompt.pulse{animation:gfPrompt .32s ease}.gfAdvToastLayer{position:absolute;inset:0;z-index:30;pointer-events:none}.gfAdvPop{position:absolute;transform:translate(-50%,0);font-size:13px;font-weight:1000;text-shadow:0 2px 8px rgba(0,0,0,.7);animation:gfPop 1s ease forwards;white-space:nowrap}.gfAdvPop.good{color:#fef3c7}.gfAdvPop.bad{color:#fecaca}.gfAdvPop.info{color:#dbeafe}.gfAdvBurst{position:absolute;z-index:31;width:8px;height:8px;border-radius:50%;background:#fde68a;pointer-events:none;animation:gfBurst .62s ease forwards}.gfAdvBurst.danger,.gfAdvBurst.fire{background:#fb7185}.gfAdvBurst.root,.gfAdvBurst.earth{background:#86efac}.gfAdvBurst.shadow{background:#c4b5fd}.gfAdvBurst.dash,.gfAdvBurst.strike{background:#fef3c7}.gfAdvBurst.solve{background:#facc15}.gfAdvBurst.story{background:#a7f3d0}.gfAdvSkillBar{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:42;width:min(700px,calc(100% - 22px));padding:6px;border-radius:16px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.16);box-shadow:0 14px 36px rgba(0,0,0,.22)}.gfAdvSkillBar.hidden{display:none}.gfBattleMini{display:flex;justify-content:center;gap:9px;align-items:center;font-size:11px;font-weight:1000;color:#fed7aa;margin-bottom:5px}.gfBattleMoves{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.gfBattleMoves button{border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.08));color:#fff;border-radius:12px;padding:7px 6px;font-weight:1000;cursor:pointer}.gfBattleMoves strong{display:block;font-size:11px}.gfBattleMoves small{display:block;font-size:9px;color:#fed7aa}.gfAdvTouchAction{position:absolute;right:14px;bottom:14px;z-index:45;border:1px solid rgba(255,255,255,.22);background:rgba(15,23,42,.76);color:#fff;border-radius:999px;padding:10px 14px;font-weight:1000;box-shadow:0 12px 30px rgba(0,0,0,.22)}.gfAdvTouchAction.hidden{display:none}.gfAdvMobile{display:none!important}.gfAdvActShade{position:absolute;bottom:98px;top:0;pointer-events:none;opacity:.22}.gfAdvActShade b{position:absolute;left:32px;top:52px;color:#fed7aa;font-size:18px;text-shadow:0 2px 10px #000}.gfAdvActShade.outer{background:linear-gradient(90deg,rgba(251,146,60,.12),transparent)}.gfAdvActShade.deep{background:linear-gradient(90deg,rgba(88,28,135,.18),rgba(15,23,42,.16),transparent)}.gfAdvActShade.core{background:radial-gradient(circle at 70% 55%,rgba(250,204,21,.16),transparent 32%),linear-gradient(90deg,rgba(124,45,18,.18),rgba(127,29,29,.16))}.gfAdvLandmark.deep,.gfAdvLandmark.core{font-size:13px;color:#fde68a}.gfAdvCreature[data-eid="root_guardian"]{filter:drop-shadow(0 0 18px rgba(250,204,21,.42)) drop-shadow(0 18px 18px rgba(0,0,0,.42));}.gfAdvCreature[data-eid="root_guardian"].alert{filter:drop-shadow(0 0 28px rgba(248,113,113,.92)) drop-shadow(0 20px 22px rgba(0,0,0,.45));}.gfAdvCompletion{position:absolute;inset:0;z-index:90;display:grid;place-items:center;background:radial-gradient(circle at 50% 46%,rgba(250,204,21,.24),rgba(15,23,42,.72));backdrop-filter:blur(6px)}.gfAdvCompletion.hidden{display:none}.gfCompleteCard{width:min(560px,calc(100% - 32px));border-radius:28px;padding:24px;background:rgba(15,23,42,.88);border:1px solid rgba(255,255,255,.18);box-shadow:0 28px 90px rgba(0,0,0,.42);text-align:center}.gfCompleteIcon{font-size:52px;filter:drop-shadow(0 0 22px rgba(250,204,21,.7));animation:gfCompleteGlow 2s ease-in-out infinite}.gfCompleteCard h2{margin:8px 0 6px;font-size:28px}.gfCompleteCard p{margin:0 auto 16px;color:#fed7aa;font-weight:800;line-height:1.35;max-width:440px}.gfCompleteStats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:14px 0}.gfCompleteStats span{padding:10px;border-radius:16px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.13);font-weight:1000}.gfCompleteActions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.gfCompleteActions button{border:0;border-radius:999px;padding:11px 15px;font-weight:1000;cursor:pointer;background:rgba(255,255,255,.16);color:#fff}.gfCompleteActions button.primary{background:linear-gradient(135deg,#f97316,#facc15);color:#1c1007}@keyframes gfCompleteGlow{0%,100%{transform:scale(.96);opacity:.86}50%{transform:scale(1.05);opacity:1}}.gfAdventureBottom{display:none}.gfAdventure button:focus-visible{outline:3px solid rgba(255,255,255,.8);outline-offset:2px}.gfAdventure.pulseDanger .gfAdventureWorld{filter:saturate(1.35) brightness(1.1)}.gfAdventure.pulseSolve .gfAdventureWorld{filter:drop-shadow(0 0 18px rgba(250,204,21,.55))}.gfAdventure.pulseStory .gfAdventureWorld{filter:drop-shadow(0 0 22px rgba(254,240,138,.7)) saturate(1.25)}.gfAdventure.pulseSoft .gfAdventureWorld{filter:brightness(1.05)}.gfAdvPortal{position:absolute;z-index:8;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;border-radius:22px;background:radial-gradient(circle,rgba(254,240,138,.2),rgba(15,23,42,.36));border:1px solid rgba(254,240,138,.28);box-shadow:0 0 26px rgba(250,204,21,.18);color:#fef3c7;font-weight:1000;pointer-events:none}.gfAdvPortal span{font-size:30px;animation:gfPortalPulse 1.2s ease-in-out infinite}.gfAdvPortal b{font-size:10px;background:rgba(15,23,42,.55);padding:2px 6px;border-radius:999px}.gfAdvScenePickup{opacity:.92}.gfAdvKeyItem.taken{opacity:0;transform:translate(-50%,-36px) scale(1.5);pointer-events:none}.gfAdvBarrier.open{opacity:.20;transform:translate(-50%,-14px) scale(.78);pointer-events:none}.gfAdvScenePickup.used{opacity:.25;filter:grayscale(.4)}.gfAdvHeroPet.attack_fire img,.gfAdvHeroPet.attack_fire span{animation:gfAtkFire .42s ease}.gfAdvHeroPet.attack_root img,.gfAdvHeroPet.attack_root span{animation:gfAtkRoot .48s ease}.gfAdvHeroPet.attack_shadow img,.gfAdvHeroPet.attack_shadow span{animation:gfAtkShadow .44s ease}.gfAdvHeroPet.attack_dash img,.gfAdvHeroPet.attack_dash span{animation:gfAtkDash .36s ease}.gfAdvHeroPet.attack_strike img,.gfAdvHeroPet.attack_strike span{animation:gfAtkStrike .36s ease}.gfAdvHeroPet.attack_guard{filter:drop-shadow(0 0 18px rgba(147,197,253,.95))}.gfAdvCreature.enemyAttack{animation:gfEnemyLunge .42s ease}.gfAdvCreature.hit_fire{filter:drop-shadow(0 0 20px rgba(249,115,22,.95)) drop-shadow(0 16px 14px rgba(0,0,0,.32))}.gfAdvCreature.hit_root{filter:drop-shadow(0 0 20px rgba(34,197,94,.9)) drop-shadow(0 16px 14px rgba(0,0,0,.32))}.gfAdvCreature.hit_shadow{filter:drop-shadow(0 0 20px rgba(168,85,247,.95)) drop-shadow(0 16px 14px rgba(0,0,0,.32))}.gfAdvCreature.hit_dash,.gfAdvCreature.hit_strike{filter:drop-shadow(0 0 20px rgba(255,255,255,.9)) drop-shadow(0 16px 14px rgba(0,0,0,.32))}@keyframes gfPortalPulse{0%,100%{transform:translateY(0);opacity:.65}50%{transform:translateY(-8px);opacity:1}}@keyframes gfAtkFire{0%{transform:translateY(0) scale(1)}40%{transform:translateY(-10px) scale(1.14) rotate(-5deg)}100%{transform:translateY(0) scale(1)}}@keyframes gfAtkRoot{0%{transform:translateY(0)}45%{transform:translateY(6px) scale(1.12,.86)}100%{transform:translateY(0)}}@keyframes gfAtkShadow{0%{opacity:1;filter:brightness(1)}35%{opacity:.35;filter:brightness(2)}65%{opacity:1;transform:translateX(18px)}100%{transform:translateX(0)}}@keyframes gfAtkDash{0%{transform:translateX(0)}50%{transform:translateX(34px) scale(1.06)}100%{transform:translateX(0)}}@keyframes gfAtkStrike{0%{transform:rotate(0)}45%{transform:rotate(-12deg) scale(1.08)}100%{transform:rotate(0)}}@keyframes gfEnemyLunge{0%,100%{transform:translateX(-50%) scaleX(var(--creatureFace,1))}45%{transform:translateX(calc(-50% + (var(--creatureFace,1) * 24px))) scaleX(var(--creatureFace,1)) scale(1.08)}}@keyframes gfGlow{0%,100%{opacity:.75;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}@keyframes gfTrail{0%,100%{opacity:.5}50%{opacity:1}}@keyframes gfPetIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes gfPetRun{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-9px) rotate(2deg)}}@keyframes gfPetJump{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(.96,1.06)}}@keyframes gfPetLand{0%{transform:scale(1.12,.84)}100%{transform:scale(1)}}@keyframes gfBackflip{0%{transform:rotate(0deg) translateY(0)}55%{transform:rotate(-210deg) translateY(-22px)}100%{transform:rotate(-360deg) translateY(0)}}@keyframes gfCreatureBob{0%,100%{margin-bottom:0}50%{margin-bottom:8px}}@keyframes gfShard{0%,100%{transform:translate(-50%,0) rotate(-8deg)}50%{transform:translate(-50%,-10px) rotate(8deg)}}@keyframes gfEmberFall{0%,100%{transform:translateY(-26px);opacity:.55}50%{transform:translateY(18px);opacity:1}}@keyframes gfPrompt{0%{transform:translateX(-50%) scale(.98)}70%{transform:translateX(-50%) scale(1.015)}100%{transform:translateX(-50%) scale(1)}}@keyframes gfPop{0%{opacity:0;transform:translate(-50%,12px) scale(.9)}18%{opacity:1}100%{opacity:0;transform:translate(-50%,-45px) scale(1.04)}}@keyframes gfBurst{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) * -1)) scale(.25)}}.gfAdvRoomBand{position:absolute;bottom:0;height:100%;z-index:1;pointer-events:none;border-left:1px solid rgba(255,255,255,.06)}.gfAdvRoomBand b{position:absolute;left:22px;top:56px;font-size:24px;letter-spacing:-.7px;color:rgba(255,255,255,.22);text-shadow:0 3px 14px rgba(0,0,0,.45)}.gfAdvRoomBand span{position:absolute;left:24px;top:84px;width:280px;font-size:11px;font-weight:900;color:rgba(254,215,170,.33)}.gfAdvRoomBand.safe{background:linear-gradient(90deg,rgba(34,197,94,.08),transparent)}.gfAdvRoomBand.mystery{background:linear-gradient(90deg,rgba(124,58,237,.09),transparent)}.gfAdvRoomBand.danger{background:linear-gradient(90deg,rgba(239,68,68,.08),transparent)}.gfAdvRoomBand.boss{background:linear-gradient(90deg,rgba(2,6,23,.24),rgba(249,115,22,.07))}.gfEnvScene{position:absolute;bottom:104px;z-index:3;min-width:118px;text-align:center;color:#fed7aa;font-size:10px;font-weight:1000;text-shadow:0 2px 8px #000;opacity:.86;pointer-events:none}.gfEnvScene i{display:block;margin:0 auto 3px;width:86px;height:44px;border-radius:24px;background:rgba(15,23,42,.36);border:1px solid rgba(255,255,255,.12);box-shadow:inset 0 0 18px rgba(251,146,60,.14),0 10px 25px rgba(0,0,0,.22)}.gfEnvScene.camp i:after{content:"⛺";font-style:normal;font-size:30px}.gfEnvScene.footprints i:after{content:"🐾";font-style:normal;font-size:28px}.gfEnvScene.brokenBridge i:after{content:"🪵";font-style:normal;font-size:30px}.gfEnvScene.carvings i:after{content:"🗿";font-style:normal;font-size:30px}.gfEnvScene.deepPulse i:after{content:"🌀";font-style:normal;font-size:30px}.gfEnvScene.guardianRoots i:after{content:"🌑";font-style:normal;font-size:30px}.gfAdvKeyItem{position:absolute;z-index:8;border:0;background:transparent;color:white;cursor:pointer;transform:translate(-50%,0);filter:drop-shadow(0 0 14px rgba(250,204,21,.75))}.gfAdvKeyItem span{display:grid;place-items:center;width:62px;height:62px;border-radius:22px;background:radial-gradient(circle,rgba(254,240,138,.95),rgba(249,115,22,.28) 55%,rgba(15,23,42,.5));border:1px solid rgba(254,240,138,.55);font-size:31px;animation:gfKeyPulse 1.4s ease-in-out infinite}.gfAdvKeyItem b{position:absolute;left:50%;bottom:-16px;transform:translateX(-50%);white-space:nowrap;font-size:10px;background:rgba(15,23,42,.72);border-radius:999px;padding:2px 7px}.gfAdvKeyItem.near{transform:translate(-50%,-6px) scale(1.05)}.gfAdvKeyItem.taken{opacity:0;pointer-events:none;transform:translate(-50%,-38px) scale(1.5)}.gfAdvBarrier{position:absolute;z-index:9;border-radius:26px;border:2px solid rgba(254,215,170,.46);background:linear-gradient(180deg,rgba(30,20,35,.92),rgba(10,6,16,.92));color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;box-shadow:0 18px 36px rgba(0,0,0,.38),inset 0 0 28px rgba(124,58,237,.18)}.gfAdvBarrier span{font-size:31px}.gfAdvBarrier b{font-size:11px;color:#fed7aa}.gfAdvBarrier.near{filter:drop-shadow(0 0 18px rgba(250,204,21,.85));transform:translate(-50%,-5px) scale(1.03)}.gfAdvBarrier.open{opacity:.18;transform:translate(-50%,-30px) scale(.72);pointer-events:none}.gfAdvRoomTransition{position:absolute;inset:0;z-index:70;display:grid;place-items:center;background:radial-gradient(circle,rgba(251,191,36,.16),rgba(15,23,42,.86));pointer-events:none;animation:gfRoomIn .72s ease forwards}.gfAdvRoomTransition.hidden{display:none}.gfAdvRoomTransition div{padding:20px 28px;border-radius:28px;background:rgba(15,23,42,.74);border:1px solid rgba(255,255,255,.18);text-align:center;box-shadow:0 22px 70px rgba(0,0,0,.35)}.gfAdvRoomTransition b{display:block;font-size:30px;letter-spacing:-1px}.gfAdvRoomTransition span{display:block;margin-top:5px;color:#fed7aa;font-size:13px;font-weight:900;max-width:420px}.flag_guide_trail .gfAdvPathGlow{opacity:1!important;filter:blur(5px) drop-shadow(0 0 14px rgba(250,204,21,.7))}.flag_awaken_lantern .gfAdvBarrier[data-bid="dark_root_veil"]{box-shadow:0 0 28px rgba(250,204,21,.38),inset 0 0 30px rgba(250,204,21,.12)}@keyframes gfKeyPulse{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-8px) rotate(4deg)}}@keyframes gfRoomIn{0%{opacity:0}18%{opacity:1}76%{opacity:1}100%{opacity:0}}@media(max-width:800px){.gfCompleteStats{grid-template-columns:1fr}.gfCompleteCard{padding:18px}.gfCompleteCard h2{font-size:23px}.gfAdventureTop{padding:5px 8px}.gfAdvTitleBlock span{display:none}.gfAdvControls{gap:5px}.gfAdvControls span{font-size:10px;padding:4px 7px}.gfAdvControls button{font-size:11px;padding:5px 8px}.gfAdvPrompt{top:7px;width:min(520px,calc(100% - 88px));font-size:11px;padding:5px 9px}.gfAdvThing{font-size:36px}.gfAdvSkillBar{bottom:8px;width:calc(100% - 16px)}.gfBattleMoves{grid-template-columns:repeat(2,minmax(0,1fr))}.gfAdvTouchAction{display:block}.gfAdvPlatform span{display:none}}';
    document.head.appendChild(s);
  }

  window.PetWorldAdventureEngine={mount:mount,start:start,stop:stop,isRunning:function(){return engine.running;}};
})();
