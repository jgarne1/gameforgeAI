/*
  GameForge AI Adventure Engine v7
  Purpose: reusable pet-first side-scrolling exploration layer for PetWorld activities.
  - Not a standalone game.
  - The active pet is the controllable character; no human avatar is shown in the main wilderness mode.
  - Client handles feel, movement, solid platforms, hazards, local collectibles, puzzles, creatures, and interactions.
  - Server remains authoritative for profile rewards through /api/pet/adventure/complete.
  - Combat is quick encounter mode: visible roaming creatures spot the pet, walk up, trigger a message, then battle begins. v7 expands Ember Hollow into a three-act adventure with denser exploration, more encounters, mini-boss/final-boss pacing, and a cinematic completion ritual.
*/
(function(){
  'use strict';

  var GROUND_H=98;

  var DEFAULT_ZONE={
    id:'ember_hollow',
    name:'Ember Hollow',
    subtitle:'Guide your companion through Outer Hollow, Deep Roots, and the Ember Core. Calm the guardian and awaken the Ember Tree.',
    width:5400,
    timeLimitMs:540000,
    player:{x:90,y:0,w:62,h:74,maxSpeed:5.15,accel:.46,friction:.80,jump:14.4,gravity:.60,coyoteMs:145,jumpBufferMs:155},
    goalX:5120,
    exitX:5260,
    requiredGateShards:3,
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
      {id:'shard_18',type:'ember_shard',x:4970,y:118,emoji:'✦',hint:'Tree crown spark'}
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
      {id:'core_ledge_2',x:4755,y:88,w:390,h:24,label:'solid ledge'}
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
      {id:'core_bramble_1',kind:'bramble',x:4685,y:0,w:190,h:24,emoji:'♨️',damage:1,text:'Guardian roots spark across the path.'}
    ],
    gates:[
      {id:'root_gate',x:1330,y:0,w:82,h:150,requires:{ember_shard:3},title:'Root Gate',text:'The roots are sealed. Three sparks will wake the gate.'}
    ],
    creatures:[
      {id:'ember_wisp_1',name:'Ember Wisp',type:'fire',x:1045,y:0,w:74,h:74,emoji:'🔥',image:'/assets/creatures/ember_wisp/idle.png',patrolMin:935,patrolMax:1210,speed:.9,facing:-1,vision:230,visionY:88,hp:16,attack:4,xp:4,coin:3,message:'An Ember Wisp noticed your companion!'},
      {id:'ember_wisp_2',name:'Ash Wisp',type:'fire',x:2180,y:96,w:74,h:74,emoji:'🔥',image:'/assets/creatures/ember_wisp/idle.png',patrolMin:2045,patrolMax:2395,speed:.82,facing:1,vision:225,visionY:82,hp:18,attack:5,xp:5,coin:4,message:'The Ash Wisp drifts forward, blocking the old branch.'},
      {id:'ember_wisp_3',name:'Deep Wisp',type:'fire',x:3395,y:0,w:76,h:76,emoji:'🔥',image:'/assets/creatures/ember_wisp/idle.png',patrolMin:3295,patrolMax:3560,speed:.78,facing:1,vision:220,visionY:82,hp:20,attack:5,xp:5,coin:4,message:'A Deep Wisp flickers awake in the roots.'},
      {id:'root_beetle_1',name:'Root Beetle',type:'earth',x:2865,y:0,w:86,h:64,emoji:'🪲',image:'/assets/creatures/root_beetle/idle.png',patrolMin:2760,patrolMax:3050,speed:.58,facing:-1,vision:175,visionY:70,hp:22,attack:4,xp:6,coin:5,message:'A Root Beetle stomps toward your pet!'},
      {id:'ashroot_sentinel',name:'Ashroot Sentinel',type:'earth',x:3820,y:126,w:102,h:86,emoji:'🪵',image:'/assets/creatures/ashroot_sentinel/idle.png',patrolMin:3700,patrolMax:3960,speed:.46,facing:-1,vision:205,visionY:76,hp:34,attack:6,xp:10,coin:8,miniBoss:true,message:'The Ashroot Sentinel blocks the Deep Root path!'},
      {id:'ember_wisp_4',name:'Core Wisp',type:'fire',x:4310,y:118,w:78,h:78,emoji:'🔥',image:'/assets/creatures/ember_wisp/idle.png',patrolMin:4205,patrolMax:4515,speed:.86,facing:1,vision:225,visionY:82,hp:22,attack:6,xp:6,coin:5,message:'A Core Wisp spins toward your pet!'},
      {id:'root_guardian',name:'Corrupted Root Guardian',type:'earth',x:4935,y:0,w:148,h:132,emoji:'🌲',image:'/assets/creatures/root_guardian/idle.png',patrolMin:4935,patrolMax:4935,speed:0,facing:-1,vision:999,visionY:180,hp:58,attack:8,xp:24,coin:20,boss:true,finalBoss:true,message:'The Corrupted Root Guardian rises before the Ember Tree!'}
    ],
    interactables:[
      {id:'trail_sign',kind:'sign',x:145,y:0,emoji:'🪧',title:'Trail Sign',text:'Guide your pet to the Ember Tree. Sparks collect on touch. Glowing objects use E or the small Use bubble.'},
      {id:'mira_marker',kind:'npc',x:565,y:0,emoji:'🧭',title:'Scout Marker',text:'Mira left a marker: “Stay above a wisp to slip past. The ledges are the quiet path.”'},
      {id:'root_gate_note',kind:'puzzle',x:1230,y:0,emoji:'🗝️',title:'Root Gate Hint',text:'Collect three ember sparks, then press E at the gate. Your pet will feel the roots loosen.'},
      {id:'ember_relic',kind:'relic',x:1870,y:0,emoji:'🔥',title:'Faded Ember Relic',text:'The relic hums. Your pet remembers warmth from a place it has never been.',discoveryId:'ember_relic'},
      {id:'hidden_cache',kind:'chest',x:2060,y:96,emoji:'📦',title:'Root-Tucked Cache',text:'A tucked-away scout cache! The hollow rewards pets that explore upward.',discoveryId:'ember_cache'},
      {id:'deep_roots_marker',kind:'relic',x:3590,y:0,emoji:'🌀',title:'Deep Roots',text:'The outer trail ends. Below, roots twist into tunnels lit by old embers.',discoveryId:'deep_roots'},
      {id:'sentinel_warning',kind:'sign',x:3740,y:126,emoji:'⚠️',title:'Scorched Warning',text:'Charred claw marks cover the stone. Something guards the way forward.'},
      {id:'core_relic',kind:'relic',x:4305,y:118,emoji:'💠',title:'Core Ember Relic',text:'A relic vibrates with your pet’s heartbeat. The Ember Core is close.',discoveryId:'core_relic'},
      {id:'guardian_marker',kind:'story',x:4760,y:0,emoji:'🌑',title:'Guardian Ring',text:'The roots curl into a circle. The air goes still. The guardian is near.',discoveryId:'guardian_ring'},
      {id:'ember_tree',kind:'story',x:5120,y:0,emoji:'🌳',title:'The Ember Tree',text:'The tree pulses. Your pet steps forward, and the bark glows like it recognizes them.',discoveryId:'ember_tree'}
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
    creatures:[],mode:'explore',encounter:null,battle:null,completion:null,completionOverlay:null
  };

  function mergeZone(zone){
    var z=Object.assign({},DEFAULT_ZONE,zone||{});
    z.player=Object.assign({},DEFAULT_ZONE.player,(zone&&zone.player)||{});
    ['collectibles','platforms','hazards','gates','creatures','interactables','ambientEvents'].forEach(function(k){z[k]=(zone&&zone[k])?zone[k].slice():DEFAULT_ZONE[k].slice();});
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
        '<div class="gfAdvCompletion hidden" id="gfAdvCompletion"></div>',
      '</div>',
      '<div class="gfAdventureBottom"><span>Pet-first Adventure v6</span><span>World-first UI. Touch sides to move, swipe up to jump, use the small action bubble near objects.</span></div>'
    ].join('');
    document.body.appendChild(engine.root);
    engine.scene=document.getElementById('gfAdvScene');engine.world=document.getElementById('gfAdvWorld');engine.hud=document.getElementById('gfAdvStats');engine.objective=document.getElementById('gfAdvObjective');engine.prompt=document.getElementById('gfAdvPrompt');engine.skillBar=document.getElementById('gfAdvSkillBar');engine.actionBtn=document.getElementById('gfAdvTouchAction');engine.completionOverlay=document.getElementById('gfAdvCompletion');
    document.getElementById('gfAdvClose').onclick=function(){stop(false)};document.getElementById('gfAdvComplete').onclick=function(){complete()};
    window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKey,true);
    setupTouchControls();
    engine.mounted=true;
  }

  function start(options){
    mount(options||{});engine.zone=mergeZone((options&&options.zone)||{});engine.callbacks=(options&&options.callbacks)||engine.callbacks||{};engine.pet=(options&&options.pet)||{};
    engine.collected={};engine.collectedIds={};engine.touched={};engine.discoveries={};engine.openedGates={};engine.hazardsHit={};engine.puzzlesSolved={};engine.defeatedCreatures={};engine.goalReached=false;
    engine.startedAt=Date.now();engine.lastAmbientAt=Date.now();engine.lastHitAt=0;engine.lastLandingAt=0;engine.lastSightAt=0;engine.lastGroundedAt=Date.now();engine.jumpQueuedUntil=0;engine.cameraX=0;engine.mode='explore';engine.encounter=null;engine.battle=null;engine.completion=null;engine.touch=null;if(engine.completionOverlay){engine.completionOverlay.classList.add('hidden');engine.completionOverlay.innerHTML='';}
    engine.state={x:engine.zone.player.x,y:0,prevY:0,vx:0,vy:0,onGround:true,facing:1,health:3,landed:false,locked:false};
    engine.creatures=(engine.zone.creatures||[]).map(function(c){return Object.assign({state:'roam',homeX:c.x||0,facing:c.facing||1},c)});
    document.getElementById('gfAdvTitle').innerText=engine.zone.name;document.getElementById('gfAdvSub').innerText=engine.zone.subtitle||'Guide your companion.';
    renderWorld();engine.root.classList.remove('hidden');engine.skillBar.classList.add('hidden');engine.running=true;engine.raf=requestAnimationFrame(loop);
    say('Guide your pet to the Ember Tree. On mobile, hold left or right side to move and swipe up to jump.');pop('+ Start',engine.state.x,engine.state.y+90,'info');
    if(engine.callbacks.onStart)engine.callbacks.onStart(engine.zone);
  }

  function renderWorld(){
    var z=engine.zone,html='';
    html+='<div class="gfAdvLayer mountains"></div><div class="gfAdvLayer trees"></div><div class="gfAdvPathGlow"></div><div class="gfAdvGround"></div>';
    html+='<div class="gfAdvActShade outer" style="left:0;width:1650px"><b>Outer Hollow</b></div><div class="gfAdvActShade deep" style="left:1650px;width:1800px"><b>Deep Roots</b></div><div class="gfAdvActShade core" style="left:3450px;width:1950px"><b>Ember Core</b></div>';
    html+='<div class="gfAdvLandmark start">Camp Trail</div><div class="gfAdvLandmark deep" style="left:3425px">Deep Roots</div><div class="gfAdvLandmark core" style="left:4580px">Guardian Ring</div><div class="gfAdvLandmark tree" style="left:'+(z.goalX-60)+'px">Ember Tree</div>';
    (z.platforms||[]).forEach(function(p){html+='<div class="gfAdvPlatform" data-pid="'+esc(p.id)+'" style="left:'+num(p.x)+'px;bottom:'+(GROUND_H+num(p.y))+'px;width:'+num(p.w)+'px;height:'+num(p.h)+'px"><span></span></div>';});
    (z.hazards||[]).forEach(function(h){var cls=' '+(h.kind||'hazard');html+='<div class="gfAdvHazard'+cls+'" data-hid="'+esc(h.id)+'" style="left:'+num(h.x)+'px;bottom:'+(GROUND_H+num(h.y))+'px;width:'+num(h.w)+'px;height:'+num(h.h)+'px"><span>'+esc(h.emoji||'⚠️')+'</span></div>';});
    (z.gates||[]).forEach(function(g){html+='<button class="gfAdvGate gfAdvUsable" data-gid="'+esc(g.id)+'" style="left:'+num(g.x)+'px;bottom:'+(GROUND_H+num(g.y))+'px;width:'+num(g.w)+'px;height:'+num(g.h)+'px"><b>Root Gate</b><span>Need 3 ✦</span></button>';});
    engine.creatures.forEach(function(c){html+='<div class="gfAdvCreature" data-eid="'+esc(c.id)+'" style="left:'+num(c.x)+'px;bottom:'+(GROUND_H+num(c.y))+'px;width:'+num(c.w||74)+'px;height:'+num(c.h||74)+'px">'+creatureMarkup(c)+'</div>';});
    (z.interactables||[]).forEach(function(o){html+='<button class="gfAdvThing gfAdvUsable '+esc(o.kind||'thing')+'" data-iid="'+esc(o.id)+'" style="left:'+num(o.x)+'px;bottom:'+(GROUND_H+12+num(o.y))+'px"><span>'+esc(o.emoji||'✨')+'</span><i>Use E</i></button>';});
    (z.collectibles||[]).forEach(function(c){html+='<button class="gfAdvCollectible" data-cid="'+esc(c.id)+'" title="'+esc(c.hint||'Collect')+'" style="left:'+num(c.x)+'px;bottom:'+(GROUND_H+42+num(c.y))+'px"><span>'+esc(c.emoji||'✦')+'</span></button>';});
    html+='<div id="gfAdvPet" class="gfAdvPet gfAdvHeroPet">'+petMarkup(engine.pet)+'</div>';
    html+='<div class="gfAdvExit" style="left:'+num(z.exitX||2785)+'px"><b>Home Trail</b><span>Return when ready</span></div>';
    engine.world.style.width=z.width+'px';engine.world.innerHTML=html;engine.petEl=document.getElementById('gfAdvPet');
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-cid]'),function(btn){btn.onclick=function(){collect(btn.getAttribute('data-cid'))};});
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-iid]'),function(btn){btn.onclick=function(){interact(btn.getAttribute('data-iid'))};});
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-gid]'),function(btn){btn.onclick=function(){tryGate(btn.getAttribute('data-gid'))};});
    updateHud();
  }

  function creatureMarkup(c){var img=c.image?'<img src="'+esc(c.image)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-flex\'">':'';return img+'<span '+(c.image?'style="display:none"':'')+'>'+esc(c.emoji||'👾')+'</span><em>'+esc(c.name||'Creature')+'</em>';}
  function petMarkup(pet){pet=pet||{};var src=pet.asset||pet.image||'';var emoji=pet.emoji||'🐾';var label=pet.name?'<em>'+esc(pet.name)+'</em>':'';if(src)return '<img src="'+esc(src)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-flex\'"><span style="display:none">'+esc(emoji)+'</span>'+label;return '<span>'+esc(emoji)+'</span>'+label;}

  function loop(){if(!engine.running)return;if(engine.mode==='explore'){updatePhysics();updateCreatures();checkCreatureSight();checkHazards();checkCollectibles();checkBossTriggers();checkGoal();maybeAmbient();}else if(engine.mode==='encounterIntro'){updateEncounterIntro();}else if(engine.mode==='ending'){updateEnding();}updateCamera();updatePositions();updateCreaturePositions();updateNearest();engine.raf=requestAnimationFrame(loop);}

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
    resolveWalls(prevX);
  }

  function resolveWalls(prevX){(engine.zone.gates||[]).forEach(function(g){if(engine.openedGates[g.id])return;var petBox=petRect();if(rectsOverlap(petBox.x,petBox.y,petBox.w,petBox.h,g.x,GROUND_H+g.y,g.w,g.h)){if(prevX<g.x)engine.state.x=g.x-petBox.w*.5-8;else engine.state.x=g.x+g.w+petBox.w*.5+8;engine.state.vx=0;say('The root gate blocks the trail. Collect 3 sparks and press E here.');}});}
  function findLandingSurface(prevY,newY,x){var best=null;if(newY<=0)best=0;(engine.zone.platforms||[]).forEach(function(p){var top=Number(p.y||0)+Number(p.h||0);var withinX=x+34>=p.x&&x-34<=p.x+p.w;var crossed=prevY>=top-6&&newY<=top+15;var falling=engine.state.vy<=1;if(withinX&&crossed&&falling)best=Math.max(best===null?-999:best,top);});return best;}

  function updateCreatures(){engine.creatures.forEach(function(c){if(c.defeated||c.state!=='roam')return;c.x+=Number(c.speed||.8)*Number(c.facing||1);if(c.x<Number(c.patrolMin||c.homeX-120)){c.x=Number(c.patrolMin||c.homeX-120);c.facing=1;}if(c.x>Number(c.patrolMax||c.homeX+120)){c.x=Number(c.patrolMax||c.homeX+120);c.facing=-1;}});}
  function checkCreatureSight(){var now=Date.now();if(now-engine.lastSightAt<650)return;var s=engine.state;for(var i=0;i<engine.creatures.length;i++){var c=engine.creatures[i];if(c.defeated||c.state!=='roam')continue;if(c.finalBoss&&s.x<4720)continue;var dx=s.x-c.x,dy=Math.abs(s.y-(c.y||0));var inFront=(c.facing>0&&dx>0)||(c.facing<0&&dx<0);var inVision=Math.abs(dx)<Number(c.vision||220)&&dy<Number(c.visionY||88);var jumpedOver=s.y>Number(c.y||0)+90;var moving=Math.abs(s.vx)>0.25||!s.onGround;if(inFront&&inVision&&!jumpedOver&&moving){engine.lastSightAt=now;beginEncounterIntro(c);break;}}}
  function beginEncounterIntro(c){engine.mode='encounterIntro';c.state='alert';engine.encounter={creature:c,phase:'noticed',startedAt:Date.now(),targetX:engine.state.x-(c.x<engine.state.x?118:-118),messageShown:false,backflip:false};engine.state.vx=0;engine.state.vy=0;say(c.message||((c.name||'A creature')+' spotted your pet!'));pop('!',c.x,c.y+96,'bad');pulseWorld('danger');}
  function updateEncounterIntro(){var e=engine.encounter;if(!e||!e.creature){engine.mode='explore';return;}var c=e.creature,now=Date.now(),age=now-e.startedAt;if(age<450){return;}if(!e.messageShown){e.messageShown=true;say((c.name||'The creature')+' moves closer. Get ready!');}
    var desiredGap=118;var dir=c.x<engine.state.x?1:-1;c.facing=dir;var target=engine.state.x-dir*desiredGap;c.x+=(target-c.x)*.075;
    if(!e.backflip&&Math.abs(c.x-target)<26){e.backflip=true;engine.state.facing=-dir;engine.state.x=clamp(engine.state.x+(dir*76),42,engine.zone.width-80);engine.state.vy=8.5;engine.state.onGround=false;engine.petEl.classList.add('backflip');setTimeout(function(){if(engine.petEl)engine.petEl.classList.remove('backflip');},520);pop('Backflip!',engine.state.x,engine.state.y+90,'info');}
    if(age>1500&&Math.abs(c.x-target)<44){startBattle(c);}
  }

  function startBattle(c){forceBattleSpacing(c);engine.mode='battle';engine.battle={creature:c,petHp:30,enemyHp:Number(c.hp||18),turn:'player',busy:false,guard:false,log:''};c.state='battle';engine.state.vx=0;engine.state.vy=0;say('Battle start! Choose a move.');renderSkillBar();engine.skillBar.classList.remove('hidden');updateHud();}
  function renderSkillBar(){var b=engine.battle;if(!b){engine.skillBar.classList.add('hidden');return;}var list=buildMoves();var c=b.creature;var html='<div class="gfBattleMini"><b>'+(engine.pet.name||'Your pet')+' HP '+b.petHp+'</b><span>vs</span><b>'+esc(c.name||'Creature')+' HP '+Math.max(0,b.enemyHp)+'</b></div><div class="gfBattleMoves">';list.forEach(function(m,i){html+='<button data-move="'+i+'"><strong>'+esc(m.name)+'</strong><small>'+esc(m.type||'normal')+' · '+m.power+'</small></button>';});html+='</div>';engine.skillBar.innerHTML=html;Array.prototype.forEach.call(engine.skillBar.querySelectorAll('[data-move]'),function(btn){btn.onclick=function(){useMove(list[Number(btn.getAttribute('data-move'))]||list[0]);};});}
  function buildMoves(){var defs=engine.pet.moveDefs||{},ids=Array.isArray(engine.pet.moves)?engine.pet.moves.slice():[];if(!ids.length)ids=['tackle'];var out=ids.slice(0,4).map(function(id){var d=defs[id]||{};return {id:id,name:d.name||niceMoveName(id),type:d.type||engine.pet.type||'normal',power:Number(d.power||d.damage||d.value||8),cost:Number(d.cost||0)};});if(out.length<2)out.push({id:'guard',name:'Guard',type:'defense',power:0});if(out.length<3)out.push({id:'quick_hop',name:'Quick Hop',type:'agility',power:6});return out.slice(0,4);}
  function useMove(m){var b=engine.battle;if(!b||b.turn!=='player'||b.busy)return;b.busy=true;if(m.id==='guard'||m.power<=0){b.guard=true;say((engine.pet.name||'Your pet')+' braces for impact.');pop('Guard',engine.state.x,engine.state.y+92,'info');}else{var dmg=Math.max(3,Math.round(Number(m.power||7)+Math.random()*4));b.enemyHp=Math.max(0,b.enemyHp-dmg);say((engine.pet.name||'Your pet')+' used '+m.name+'!');pop('-'+dmg,b.creature.x,b.creature.y+90,'bad');burst(b.creature.x,GROUND_H+(b.creature.y||0)+50,'danger');}
    renderSkillBar();setTimeout(function(){if(!engine.battle)return;if(engine.battle.enemyHp<=0)return winBattle();enemyTurn();},650);}
  function enemyTurn(){var b=engine.battle;if(!b)return;b.turn='enemy';var dmg=Math.max(1,Math.round(Number(b.creature.attack||4)+Math.random()*3));if(b.guard){dmg=Math.max(1,Math.floor(dmg*.45));b.guard=false;}b.petHp=Math.max(1,b.petHp-dmg);say((b.creature.name||'Creature')+' strikes back!');pop('-'+dmg,engine.state.x,engine.state.y+92,'bad');pulseWorld('danger');setTimeout(function(){if(!engine.battle)return;b.turn='player';b.busy=false;renderSkillBar();say('Choose your next move.');},700);}
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
  function updateNearest(){var s=engine.state,nearest=null,dist=9999;Array.prototype.forEach.call(engine.world.querySelectorAll('.gfAdvUsable'),function(node){node.classList.remove('near');});(engine.zone.interactables||[]).forEach(function(o){var d=Math.abs(s.x-o.x)+Math.abs(s.y-o.y)*.8;if(d<105&&d<dist){nearest={type:'interact',id:o.id,obj:o};dist=d;}});(engine.zone.gates||[]).forEach(function(g){if(engine.openedGates[g.id])return;var d=Math.abs(s.x-(g.x+g.w/2))+Math.abs(s.y-g.y)*.8;if(d<126&&d<dist){nearest={type:'gate',id:g.id,obj:g};dist=d;}});engine.nearest=nearest;if(nearest){var sel=nearest.type==='gate'?'[data-gid="'+cssEscape(nearest.id)+'"]':'[data-iid="'+cssEscape(nearest.id)+'"]';var n=engine.world.querySelector(sel);if(n)n.classList.add('near');}
    updateTouchAction();}
  function tryInteract(){if(engine.mode!=='explore')return;if(!engine.nearest){say('Move near a glowing object, then press E.');return;}if(engine.nearest.type==='gate')tryGate(engine.nearest.id);else interact(engine.nearest.id);}
  function interact(id){var o=findById(engine.zone.interactables,id);if(!o)return;engine.touched[id]=true;var node=engine.world.querySelector('[data-iid="'+cssEscape(id)+'"]');if(node)node.classList.add('used');if(o.discoveryId)engine.discoveries[o.discoveryId]=true;say((o.title?o.title+': ':'')+(o.text||'Your pet investigates.'));pop(o.discoveryId?'Discovery!':'Use',o.x,o.y+108,o.discoveryId?'good':'info');pulseWorld(o.kind==='story'?'story':'soft');if(engine.callbacks.onInteract)engine.callbacks.onInteract(o);updateHud();}
  function tryGate(id){var g=findById(engine.zone.gates,id);if(!g)return;if(engine.openedGates[id])return;var need=(g.requires&&g.requires.ember_shard)||engine.zone.requiredGateShards||3;var have=Number(engine.collected.ember_shard||0);if(have<need){say((g.text||'The gate is sealed.')+' You have '+have+'/'+need+' sparks.');pop(have+'/'+need+' sparks',g.x+g.w/2,g.y+130,'bad');return;}engine.openedGates[id]=true;engine.puzzlesSolved[id]=true;var node=engine.world.querySelector('[data-gid="'+cssEscape(id)+'"]');if(node)node.classList.add('open');say('The root gate opens. Your pet pushes forward as the hollow gets warmer.');pop('Gate opened!',g.x+g.w/2,g.y+155,'good');burst(g.x+g.w/2,GROUND_H+90,'solve');pulseWorld('solve');updateHud();}
  function checkBossTriggers(){
    if(engine.mode!=='explore')return;
    var guardian=findById(engine.creatures,'root_guardian');
    if(guardian&&!guardian.defeated&&guardian.state==='roam'&&engine.state.x>4685){
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
  function complete(){var duration=Date.now()-engine.startedAt;var payload={zoneId:engine.zone.id,items:Object.assign({},engine.collected),collectedIds:Object.keys(engine.collectedIds),discoveries:Object.keys(engine.discoveries),puzzlesSolved:Object.keys(engine.puzzlesSolved),defeatedCreatures:Object.keys(engine.defeatedCreatures),stumbles:Object.keys(engine.hazardsHit).reduce(function(a,k){return a+Number(engine.hazardsHit[k]||0)},0),goalReached:!!engine.goalReached,durationMs:duration};stop(true,payload);}
  function stop(completed,payload){if(!engine.running)return;engine.running=false;cancelAnimationFrame(engine.raf);engine.root.classList.add('hidden');engine.skillBar.classList.add('hidden');engine.mode='explore';if(completed&&engine.callbacks.onComplete)engine.callbacks.onComplete(payload||{});if(!completed&&engine.callbacks.onCancel)engine.callbacks.onCancel();}

  function updateHud(){var shards=Number(engine.collected.ember_shard||0),stumbles=Object.keys(engine.hazardsHit).reduce(function(a,k){return a+Number(engine.hazardsHit[k]||0)},0),wins=Object.keys(engine.defeatedCreatures).length;engine.hud.innerText=shards+' sparks • '+stumbles+' stumbles • '+wins+' calmed';var gateOpen=!!engine.openedGates.root_gate;if(engine.mode==='ending')engine.objective.innerText='Ember Hollow Cleared';else if(engine.mode==='battle')engine.objective.innerText='Choose a move';else if(!gateOpen)engine.objective.innerText='Open the Root Gate';else if(!engine.goalReached)engine.objective.innerText='Reach the Ember Tree';else engine.objective.innerText='Return Home';}
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
    if(engine.mode==='explore'&&engine.nearest){engine.actionBtn.classList.remove('hidden');engine.actionBtn.textContent=engine.nearest.type==='gate'?'Open':'Use';}
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
+'.gfAdventure{position:fixed;inset:0;z-index:99999;background:#0f172a;color:#fff;display:grid;grid-template-rows:auto minmax(0,1fr);font-family:Arial,Helvetica,sans-serif;touch-action:none}.gfAdventure.hidden{display:none}.gfAdventureTop{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;background:rgba(15,23,42,.86);border-bottom:1px solid rgba(255,255,255,.10);box-shadow:0 10px 24px rgba(0,0,0,.18);z-index:50}.gfAdvTitleBlock b{display:block;font-size:17px;letter-spacing:-.35px}.gfAdvTitleBlock span{display:block;font-size:10px;color:#fed7aa;font-weight:800;max-width:560px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gfAdvControls{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.gfAdvControls span{font-size:11px;font-weight:1000;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:5px 8px}.gfAdvControls button{border:0;border-radius:999px;padding:6px 9px;font-size:12px;font-weight:1000;background:rgba(255,255,255,.14);color:white;cursor:pointer}.gfAdvControls button.primary{background:linear-gradient(135deg,#f97316,#facc15);color:#1c1007}.gfAdventureScene{position:relative;overflow:hidden;background:linear-gradient(180deg,#3b1d12 0%,#6b2e11 48%,#1c1007 100%)}.gfAdvSky,.gfAdvSun,.gfAdvGlow{position:absolute;inset:0;pointer-events:none}.gfAdvSky{background:radial-gradient(circle at 20% 12%,rgba(253,186,116,.22),transparent 21%),radial-gradient(circle at 85% 18%,rgba(248,113,113,.18),transparent 22%)}.gfAdvSun{width:280px;height:280px;border-radius:50%;left:68%;top:8%;background:radial-gradient(circle,rgba(250,204,21,.38),transparent 64%);filter:blur(3px);animation:gfGlow 4s ease-in-out infinite}.gfAdvGlow{background:radial-gradient(circle at 50% 84%,rgba(249,115,22,.24),transparent 36%)}.gfAdventureWorld{position:absolute;left:0;top:0;bottom:0;width:5400px;transform:translateX(0);will-change:transform}.gfAdvLayer{position:absolute;left:0;right:0;bottom:98px;height:64%;pointer-events:none}.gfAdvLayer.mountains{opacity:.38;background:linear-gradient(135deg,transparent 0 12%,rgba(15,23,42,.55) 12% 22%,transparent 22% 38%,rgba(67,20,7,.62) 38% 48%,transparent 48% 64%,rgba(15,23,42,.5) 64% 76%,transparent 76%)}.gfAdvLayer.trees{bottom:88px;height:42%;opacity:.34;background:radial-gradient(ellipse at 10% 80%,rgba(67,20,7,.78),transparent 13%),radial-gradient(ellipse at 28% 78%,rgba(67,20,7,.72),transparent 12%),radial-gradient(ellipse at 52% 78%,rgba(67,20,7,.72),transparent 13%),radial-gradient(ellipse at 76% 78%,rgba(67,20,7,.76),transparent 13%),radial-gradient(ellipse at 94% 78%,rgba(67,20,7,.7),transparent 12%)}.gfAdvPathGlow{position:absolute;left:0;right:0;bottom:98px;height:58px;background:linear-gradient(90deg,rgba(251,191,36,.08),rgba(251,191,36,.24),rgba(251,191,36,.09));filter:blur(9px);animation:gfTrail 3.2s ease-in-out infinite}.gfAdvGround{position:absolute;left:0;right:0;bottom:0;height:98px;background:linear-gradient(180deg,#92400e,#431407 58%,#1c1007);border-top:5px solid rgba(253,186,116,.72);box-shadow:0 -16px 40px rgba(251,146,60,.18)}.gfAdvLandmark{position:absolute;bottom:107px;width:130px;text-align:center;font-size:12px;font-weight:1000;color:#fed7aa;text-shadow:0 2px 8px #000}.gfAdvLandmark.start{left:40px}.gfAdvLandmark.tree{width:185px;font-size:14px;color:#fef3c7}.gfAdvHeroPet{position:absolute;width:92px;height:98px;z-index:13;display:flex;align-items:center;justify-content:center;transform:translateX(-50%) scaleX(var(--petFace,1)) scale(var(--squash,1),var(--stretch,1));transform-origin:center bottom;transition:filter .15s}.gfAdvHeroPet img{max-width:90px;max-height:90px;object-fit:contain;filter:drop-shadow(0 14px 12px rgba(0,0,0,.3));animation:gfPetIdle 1.35s ease-in-out infinite}.gfAdvHeroPet span{width:90px;height:90px;display:inline-flex;align-items:center;justify-content:center;font-size:58px;filter:drop-shadow(0 14px 12px rgba(0,0,0,.3));animation:gfPetIdle 1.35s ease-in-out infinite}.gfAdvHeroPet em{position:absolute;bottom:-10px;left:50%;transform:translateX(-50%) scaleX(var(--petFace,1));font-size:10px;font-style:normal;font-weight:1000;color:#fff;background:rgba(15,23,42,.55);padding:2px 6px;border-radius:999px;white-space:nowrap}.gfAdvHeroPet.moving img,.gfAdvHeroPet.moving span{animation:gfPetRun .38s ease-in-out infinite}.gfAdvHeroPet.jumping img,.gfAdvHeroPet.jumping span{animation:gfPetJump .55s ease-in-out infinite}.gfAdvHeroPet.landed img,.gfAdvHeroPet.landed span{animation:gfPetLand .16s ease}.gfAdvHeroPet.backflip img,.gfAdvHeroPet.backflip span{animation:gfBackflip .5s ease}.gfAdvHeroPet.alert{filter:drop-shadow(0 0 14px rgba(250,204,21,.95))}.gfAdvCollectible,.gfAdvThing,.gfAdvGate{position:absolute;z-index:7;border:0;background:transparent;color:white;cursor:pointer;transform:translate(-50%,0);filter:drop-shadow(0 10px 10px rgba(0,0,0,.35));transition:.18s ease}.gfAdvCollectible{font-size:34px;animation:gfShard 1.2s ease-in-out infinite}.gfAdvCollectible span{display:grid;place-items:center;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle,rgba(254,240,138,.9),rgba(249,115,22,.34) 48%,transparent 72%);border:1px solid rgba(254,240,138,.5)}.gfAdvCollectible.taken{opacity:0!important;transform:translate(-50%,-38px) scale(1.6)!important;pointer-events:none}.gfAdvThing{font-size:42px}.gfAdvThing span{display:grid;place-items:center;width:58px;height:58px;border-radius:20px;background:rgba(15,23,42,.42);border:1px solid rgba(255,255,255,.2)}.gfAdvThing i{position:absolute;left:50%;bottom:-16px;transform:translateX(-50%);font-style:normal;font-size:10px;font-weight:1000;background:rgba(15,23,42,.72);color:#fff;border-radius:999px;padding:2px 6px;opacity:0}.gfAdvThing.near,.gfAdvGate.near{filter:drop-shadow(0 0 16px rgba(250,204,21,.95));transform:translate(-50%,-5px) scale(1.04)}.gfAdvThing.near i{opacity:1}.gfAdvThing.used:not(.npc):not(.sign){opacity:.58;filter:grayscale(.2) drop-shadow(0 10px 10px rgba(0,0,0,.35))}.gfAdvPlatform{position:absolute;z-index:5;border-radius:18px;background:linear-gradient(180deg,#7c2d12,#431407);border-top:7px solid #fdba74;box-shadow:0 14px 24px rgba(0,0,0,.28),inset 0 4px 0 rgba(254,240,138,.24)}.gfAdvPlatform:before{content:"";position:absolute;left:10px;right:10px;top:-10px;height:8px;border-radius:999px;background:rgba(254,240,138,.52);box-shadow:0 0 18px rgba(250,204,21,.3)}.gfAdvPlatform span{display:none}.gfAdvHazard{position:absolute;z-index:6;display:flex;align-items:center;justify-content:center;pointer-events:none}.gfAdvHazard span{font-size:28px;filter:drop-shadow(0 8px 8px rgba(0,0,0,.45))}.gfAdvHazard.bramble{height:24px!important;background:linear-gradient(180deg,rgba(251,146,60,.7),rgba(124,45,18,.86));border-radius:999px;border-top:2px solid rgba(254,240,138,.55);box-shadow:0 0 18px rgba(249,115,22,.32)}.gfAdvHazard.bramble span{font-size:20px}.gfAdvHazard.vent{border-radius:999px 999px 12px 12px;background:linear-gradient(180deg,rgba(250,204,21,.10),rgba(249,115,22,.18));opacity:.58;box-shadow:inset 0 0 18px rgba(250,204,21,.2)}.gfAdvHazard.vent.hot{opacity:1;background:linear-gradient(180deg,rgba(250,204,21,.18),rgba(249,115,22,.72));box-shadow:0 0 22px rgba(249,115,22,.52)}.gfAdvHazard.emberfall{height:120px!important;background:linear-gradient(180deg,rgba(250,204,21,.05),rgba(249,115,22,.38));border-radius:999px;animation:gfEmberFall 1.65s ease-in-out infinite}.gfAdvGate{z-index:9;border-radius:24px;background:linear-gradient(180deg,#78350f,#1c1007);border:2px solid rgba(253,186,116,.65);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#fef3c7;box-shadow:0 18px 36px rgba(0,0,0,.32)}.gfAdvGate b{font-size:13px}.gfAdvGate span{font-size:11px;color:#fdba74}.gfAdvGate.open{opacity:.25;transform:translate(-50%,-18px) scale(.75);pointer-events:none}.gfAdvCreature{position:absolute;z-index:11;display:flex;align-items:center;justify-content:center;transform:translateX(-50%) scaleX(var(--creatureFace,1));transform-origin:center bottom;filter:drop-shadow(0 16px 14px rgba(0,0,0,.32));transition:filter .15s}.gfAdvCreature img{max-width:100%;max-height:100%;object-fit:contain}.gfAdvCreature span{width:100%;height:100%;display:inline-flex;align-items:center;justify-content:center;font-size:52px}.gfAdvCreature em{position:absolute;bottom:-13px;left:50%;transform:translateX(-50%) scaleX(var(--creatureFace,1));font-size:9px;font-style:normal;font-weight:1000;color:#fff;background:rgba(15,23,42,.58);padding:2px 6px;border-radius:999px;white-space:nowrap}.gfAdvCreature.roaming{animation:gfCreatureBob 1.2s ease-in-out infinite}.gfAdvCreature.alert{filter:drop-shadow(0 0 16px rgba(248,113,113,.85)) drop-shadow(0 16px 14px rgba(0,0,0,.32))}.gfAdvCreature.defeated{opacity:0;transform:translateX(-50%) translateY(-30px) scale(.6);transition:.45s ease;pointer-events:none}.gfAdvExit{position:absolute;bottom:118px;width:145px;min-height:68px;border-radius:18px;background:rgba(15,23,42,.56);border:1px solid rgba(255,255,255,.22);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:white;font-weight:1000;box-shadow:0 18px 36px rgba(0,0,0,.24)}.gfAdvExit span{font-size:11px;color:#fed7aa}.gfAdvPrompt{position:absolute;left:50%;top:8px;transform:translateX(-50%);width:min(640px,calc(100% - 110px));background:rgba(15,23,42,.58);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:6px 11px;text-align:center;font-size:12px;font-weight:1000;color:#fff;box-shadow:0 12px 28px rgba(0,0,0,.12);pointer-events:none}.gfAdvPrompt.pulse{animation:gfPrompt .32s ease}.gfAdvToastLayer{position:absolute;inset:0;z-index:30;pointer-events:none}.gfAdvPop{position:absolute;transform:translate(-50%,0);font-size:13px;font-weight:1000;text-shadow:0 2px 8px rgba(0,0,0,.7);animation:gfPop 1s ease forwards;white-space:nowrap}.gfAdvPop.good{color:#fef3c7}.gfAdvPop.bad{color:#fecaca}.gfAdvPop.info{color:#dbeafe}.gfAdvBurst{position:absolute;z-index:31;width:8px;height:8px;border-radius:50%;background:#fde68a;pointer-events:none;animation:gfBurst .62s ease forwards}.gfAdvBurst.danger{background:#fb7185}.gfAdvBurst.solve{background:#facc15}.gfAdvBurst.story{background:#a7f3d0}.gfAdvSkillBar{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:42;width:min(700px,calc(100% - 22px));padding:6px;border-radius:16px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.16);box-shadow:0 14px 36px rgba(0,0,0,.22)}.gfAdvSkillBar.hidden{display:none}.gfBattleMini{display:flex;justify-content:center;gap:9px;align-items:center;font-size:11px;font-weight:1000;color:#fed7aa;margin-bottom:5px}.gfBattleMoves{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.gfBattleMoves button{border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.08));color:#fff;border-radius:12px;padding:7px 6px;font-weight:1000;cursor:pointer}.gfBattleMoves strong{display:block;font-size:11px}.gfBattleMoves small{display:block;font-size:9px;color:#fed7aa}.gfAdvTouchAction{position:absolute;right:14px;bottom:14px;z-index:45;border:1px solid rgba(255,255,255,.22);background:rgba(15,23,42,.76);color:#fff;border-radius:999px;padding:10px 14px;font-weight:1000;box-shadow:0 12px 30px rgba(0,0,0,.22)}.gfAdvTouchAction.hidden{display:none}.gfAdvMobile{display:none!important}.gfAdvActShade{position:absolute;bottom:98px;top:0;pointer-events:none;opacity:.22}.gfAdvActShade b{position:absolute;left:32px;top:52px;color:#fed7aa;font-size:18px;text-shadow:0 2px 10px #000}.gfAdvActShade.outer{background:linear-gradient(90deg,rgba(251,146,60,.12),transparent)}.gfAdvActShade.deep{background:linear-gradient(90deg,rgba(88,28,135,.18),rgba(15,23,42,.16),transparent)}.gfAdvActShade.core{background:radial-gradient(circle at 70% 55%,rgba(250,204,21,.16),transparent 32%),linear-gradient(90deg,rgba(124,45,18,.18),rgba(127,29,29,.16))}.gfAdvLandmark.deep,.gfAdvLandmark.core{font-size:13px;color:#fde68a}.gfAdvCreature[data-eid="root_guardian"]{filter:drop-shadow(0 0 18px rgba(250,204,21,.42)) drop-shadow(0 18px 18px rgba(0,0,0,.42));}.gfAdvCreature[data-eid="root_guardian"].alert{filter:drop-shadow(0 0 28px rgba(248,113,113,.92)) drop-shadow(0 20px 22px rgba(0,0,0,.45));}.gfAdvCompletion{position:absolute;inset:0;z-index:90;display:grid;place-items:center;background:radial-gradient(circle at 50% 46%,rgba(250,204,21,.24),rgba(15,23,42,.72));backdrop-filter:blur(6px)}.gfAdvCompletion.hidden{display:none}.gfCompleteCard{width:min(560px,calc(100% - 32px));border-radius:28px;padding:24px;background:rgba(15,23,42,.88);border:1px solid rgba(255,255,255,.18);box-shadow:0 28px 90px rgba(0,0,0,.42);text-align:center}.gfCompleteIcon{font-size:52px;filter:drop-shadow(0 0 22px rgba(250,204,21,.7));animation:gfCompleteGlow 2s ease-in-out infinite}.gfCompleteCard h2{margin:8px 0 6px;font-size:28px}.gfCompleteCard p{margin:0 auto 16px;color:#fed7aa;font-weight:800;line-height:1.35;max-width:440px}.gfCompleteStats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:14px 0}.gfCompleteStats span{padding:10px;border-radius:16px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.13);font-weight:1000}.gfCompleteActions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.gfCompleteActions button{border:0;border-radius:999px;padding:11px 15px;font-weight:1000;cursor:pointer;background:rgba(255,255,255,.16);color:#fff}.gfCompleteActions button.primary{background:linear-gradient(135deg,#f97316,#facc15);color:#1c1007}@keyframes gfCompleteGlow{0%,100%{transform:scale(.96);opacity:.86}50%{transform:scale(1.05);opacity:1}}.gfAdventureBottom{display:none}.gfAdventure button:focus-visible{outline:3px solid rgba(255,255,255,.8);outline-offset:2px}.gfAdventure.pulseDanger .gfAdventureWorld{filter:saturate(1.35) brightness(1.1)}.gfAdventure.pulseSolve .gfAdventureWorld{filter:drop-shadow(0 0 18px rgba(250,204,21,.55))}.gfAdventure.pulseStory .gfAdventureWorld{filter:drop-shadow(0 0 22px rgba(254,240,138,.7)) saturate(1.25)}.gfAdventure.pulseSoft .gfAdventureWorld{filter:brightness(1.05)}@keyframes gfGlow{0%,100%{opacity:.75;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}@keyframes gfTrail{0%,100%{opacity:.5}50%{opacity:1}}@keyframes gfPetIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes gfPetRun{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-9px) rotate(2deg)}}@keyframes gfPetJump{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(.96,1.06)}}@keyframes gfPetLand{0%{transform:scale(1.12,.84)}100%{transform:scale(1)}}@keyframes gfBackflip{0%{transform:rotate(0deg) translateY(0)}55%{transform:rotate(-210deg) translateY(-22px)}100%{transform:rotate(-360deg) translateY(0)}}@keyframes gfCreatureBob{0%,100%{margin-bottom:0}50%{margin-bottom:8px}}@keyframes gfShard{0%,100%{transform:translate(-50%,0) rotate(-8deg)}50%{transform:translate(-50%,-10px) rotate(8deg)}}@keyframes gfEmberFall{0%,100%{transform:translateY(-26px);opacity:.55}50%{transform:translateY(18px);opacity:1}}@keyframes gfPrompt{0%{transform:translateX(-50%) scale(.98)}70%{transform:translateX(-50%) scale(1.015)}100%{transform:translateX(-50%) scale(1)}}@keyframes gfPop{0%{opacity:0;transform:translate(-50%,12px) scale(.9)}18%{opacity:1}100%{opacity:0;transform:translate(-50%,-45px) scale(1.04)}}@keyframes gfBurst{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) * -1)) scale(.25)}}@media(max-width:800px){.gfCompleteStats{grid-template-columns:1fr}.gfCompleteCard{padding:18px}.gfCompleteCard h2{font-size:23px}.gfAdventureTop{padding:5px 8px}.gfAdvTitleBlock span{display:none}.gfAdvControls{gap:5px}.gfAdvControls span{font-size:10px;padding:4px 7px}.gfAdvControls button{font-size:11px;padding:5px 8px}.gfAdvPrompt{top:7px;width:min(520px,calc(100% - 88px));font-size:11px;padding:5px 9px}.gfAdvThing{font-size:36px}.gfAdvSkillBar{bottom:8px;width:calc(100% - 16px)}.gfBattleMoves{grid-template-columns:repeat(2,minmax(0,1fr))}.gfAdvTouchAction{display:block}.gfAdvPlatform span{display:none}}';
    document.head.appendChild(s);
  }

  window.PetWorldAdventureEngine={mount:mount,start:start,stop:stop,isRunning:function(){return engine.running;}};
})();
