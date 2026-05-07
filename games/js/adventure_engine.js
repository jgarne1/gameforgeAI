/*
  GameForge AI Adventure Engine v2
  Purpose: reusable cozy side-scrolling exploration layer for PetWorld activities.
  - Not a standalone game.
  - Client handles feel, movement, collisions, hazards, local collectibles, puzzles, and interactions.
  - Server remains authoritative for profile rewards through /api/pet/adventure/complete.
*/
(function(){
  'use strict';

  var DEFAULT_ZONE={
    id:'ember_hollow',
    name:'Ember Hollow',
    subtitle:'Follow the ember trail, open the root gate, and reach the Ember Tree.',
    width:2820,
    timeLimitMs:240000,
    player:{x:90,y:0,w:42,h:74,speed:4.35,jump:13.2,gravity:.62},
    pet:{followDistance:76,offsetY:6},
    goalX:2650,
    exitX:2700,
    requiredGateShards:3,
    collectibles:[
      {id:'shard_1',type:'ember_shard',x:235,y:88,emoji:'✦',hint:'First spark'},
      {id:'shard_2',type:'ember_shard',x:445,y:154,emoji:'✦',hint:'Ridge spark'},
      {id:'shard_3',type:'ember_shard',x:685,y:90,emoji:'✦',hint:'Root spark'},
      {id:'shard_4',type:'ember_shard',x:1010,y:214,emoji:'✦',hint:'High branch spark'},
      {id:'shard_5',type:'ember_shard',x:1265,y:92,emoji:'✦',hint:'Gate spark'},
      {id:'shard_6',type:'ember_shard',x:1590,y:160,emoji:'✦',hint:'Ash ledge spark'},
      {id:'shard_7',type:'ember_shard',x:1915,y:92,emoji:'✦',hint:'Tunnel spark'},
      {id:'shard_8',type:'ember_shard',x:2200,y:176,emoji:'✦',hint:'Tree spark'},
      {id:'shard_9',type:'ember_shard',x:2465,y:92,emoji:'✦',hint:'Final spark'}
    ],
    platforms:[
      {id:'ledge_1',x:365,y:82,w:190,h:18},
      {id:'ledge_2',x:910,y:142,w:210,h:18},
      {id:'ledge_3',x:1495,y:90,w:190,h:18},
      {id:'ledge_4',x:2100,y:104,w:250,h:18}
    ],
    hazards:[
      {id:'thorn_1',kind:'thorn',x:775,y:0,w:105,h:30,emoji:'🌵',damage:1,text:'Careful — ember thorns sting.'},
      {id:'ash_1',kind:'emberfall',x:1175,y:0,w:70,h:48,emoji:'🔥',damage:1,text:'Falling embers scorch the trail.'},
      {id:'thorn_2',kind:'thorn',x:1725,y:0,w:135,h:30,emoji:'🌵',damage:1,text:'Your pet pulls back from the thorns.'},
      {id:'ash_2',kind:'emberfall',x:2325,y:0,w:80,h:48,emoji:'🔥',damage:1,text:'A hot ember crashes down.'}
    ],
    gates:[
      {id:'root_gate',x:1325,y:0,w:78,h:145,requires:{ember_shard:3},title:'Root Gate',text:'The roots twist into a sealed arch. Three ember shards will wake it.'}
    ],
    interactables:[
      {id:'trail_sign',kind:'sign',x:145,y:0,emoji:'🪧',title:'Trail Sign',text:'Goal: follow the glowing trail to the Ember Tree. Collect shards, press E near objects, and dodge hazards.'},
      {id:'mira',kind:'npc',x:565,y:0,emoji:'🧭',title:'Mira the Scout',text:'The Hollow is longer than it looks. If your companion reacts, slow down and check nearby roots.'},
      {id:'root_gate_note',kind:'puzzle',x:1240,y:0,emoji:'🗝️',title:'Root Gate Puzzle',text:'The gate opens only when three ember shards are carried together. Collect nearby sparks, then press E at the gate.'},
      {id:'ember_relic',kind:'relic',x:1780,y:0,emoji:'🔥',title:'Faded Ember Relic',text:'The relic hums with a memory. Your pet remembers warmth from a place it has never been.',discoveryId:'ember_relic'},
      {id:'hidden_cache',kind:'chest',x:2055,y:104,emoji:'📦',title:'Root-Tucked Cache',text:'Behind the ash grass, you found a scout cache.',discoveryId:'ember_cache'},
      {id:'ember_tree',kind:'story',x:2585,y:0,emoji:'🌳',title:'The Ember Tree',text:'The tree pulses. Your pet steps forward, and the bark glows like it recognizes them.',discoveryId:'ember_tree'}
    ],
    ambientEvents:[
      'A warm breeze carries tiny sparks across the path.',
      'Your pet looks ahead. Something deeper in the Hollow is calling.',
      'A shadow slips behind the roots, then vanishes.',
      'The ember trail brightens for a moment, pointing forward.',
      'The air trembles softly near the Ember Tree.'
    ]
  };

  var engine={
    mounted:false,
    running:false,
    zone:null,
    root:null,
    scene:null,
    world:null,
    hud:null,
    objective:null,
    prompt:null,
    playerEl:null,
    petEl:null,
    cameraX:0,
    keys:{},
    collected:{},
    collectedIds:{},
    touched:{},
    discoveries:{},
    openedGates:{},
    hazardsHit:{},
    puzzlesSolved:{},
    goalReached:false,
    startedAt:0,
    raf:0,
    lastAmbientAt:0,
    lastHitAt:0,
    state:null,
    callbacks:{},
    pet:null
  };

  function mergeZone(zone){
    var z=Object.assign({},DEFAULT_ZONE,zone||{});
    z.player=Object.assign({},DEFAULT_ZONE.player,(zone&&zone.player)||{});
    z.pet=Object.assign({},DEFAULT_ZONE.pet,(zone&&zone.pet)||{});
    ['collectibles','platforms','hazards','gates','interactables','ambientEvents'].forEach(function(k){
      z[k]=(zone&&zone[k])?zone[k]:DEFAULT_ZONE[k].slice();
    });
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
        '<div class="gfAdvTitleBlock"><b id="gfAdvTitle">Ember Hollow</b><span id="gfAdvSub">Explore with your companion.</span></div>',
        '<div class="gfAdvControls">',
          '<span id="gfAdvObjective">Reach the Ember Tree</span>',
          '<span id="gfAdvStats">0 shards • 0 hits</span>',
          '<button id="gfAdvComplete" class="primary">Return Home</button>',
          '<button id="gfAdvClose">Leave</button>',
        '</div>',
      '</div>',
      '<div class="gfAdventureScene" id="gfAdvScene">',
        '<div class="gfAdvSky"></div>',
        '<div class="gfAdvSun"></div>',
        '<div class="gfAdvGlow"></div>',
        '<div class="gfAdventureWorld" id="gfAdvWorld"></div>',
        '<div class="gfAdvPrompt" id="gfAdvPrompt">Move with ← → / A D, jump with Space, interact with E.</div>',
        '<div class="gfAdvMobile">',
          '<button data-key="ArrowLeft">◀</button>',
          '<button data-key="Space">Jump</button>',
          '<button data-key="KeyE">Use</button>',
          '<button data-key="ArrowRight">▶</button>',
        '</div>',
      '</div>',
      '<div class="gfAdventureBottom">',
        '<span>Side-scroll Adventure v2</span><span>Goal: collect shards, solve the root gate, dodge hazards, and reach the Ember Tree.</span>',
      '</div>'
    ].join('');

    document.body.appendChild(engine.root);
    engine.scene=document.getElementById('gfAdvScene');
    engine.world=document.getElementById('gfAdvWorld');
    engine.hud=document.getElementById('gfAdvStats');
    engine.objective=document.getElementById('gfAdvObjective');
    engine.prompt=document.getElementById('gfAdvPrompt');

    document.getElementById('gfAdvClose').onclick=function(){stop(false)};
    document.getElementById('gfAdvComplete').onclick=function(){complete()};

    window.addEventListener('keydown',onKey,true);
    window.addEventListener('keyup',onKey,true);

    Array.prototype.forEach.call(engine.root.querySelectorAll('.gfAdvMobile button'),function(btn){
      var code=btn.getAttribute('data-key');
      btn.addEventListener('pointerdown',function(e){e.preventDefault();engine.keys[code]=true;if(code==='KeyE')tryInteract();});
      btn.addEventListener('pointerup',function(e){e.preventDefault();engine.keys[code]=false;});
      btn.addEventListener('pointerleave',function(){engine.keys[code]=false;});
    });

    engine.mounted=true;
  }

  function start(options){
    mount(options||{});
    engine.zone=mergeZone((options&&options.zone)||{});
    engine.callbacks=(options&&options.callbacks)||engine.callbacks||{};
    engine.pet=(options&&options.pet)||{};
    engine.collected={};
    engine.collectedIds={};
    engine.touched={};
    engine.discoveries={};
    engine.openedGates={};
    engine.hazardsHit={};
    engine.puzzlesSolved={};
    engine.goalReached=false;
    engine.startedAt=Date.now();
    engine.lastAmbientAt=Date.now();
    engine.lastHitAt=0;
    engine.cameraX=0;
    engine.state={x:engine.zone.player.x,y:0,vx:0,vy:0,onGround:true,facing:1,health:3};
    document.getElementById('gfAdvTitle').innerText=engine.zone.name;
    document.getElementById('gfAdvSub').innerText=engine.zone.subtitle||'Explore with your companion.';
    renderWorld();
    engine.root.classList.remove('hidden');
    engine.running=true;
    engine.raf=requestAnimationFrame(loop);
    say('Goal: reach the Ember Tree. Collect shards, dodge hazards, and press E near objects.');
    if(engine.callbacks.onStart)engine.callbacks.onStart(engine.zone);
  }

  function renderWorld(){
    var z=engine.zone;
    var html='';
    html+='<div class="gfAdvLayer mountains"></div><div class="gfAdvLayer trees"></div><div class="gfAdvPathGlow"></div>';
    html+='<div class="gfAdvGround"></div>';
    html+='<div class="gfAdvLandmark start">Camp Trail</div>';
    html+='<div class="gfAdvLandmark tree" style="left:'+(z.goalX-50)+'px">Ember Tree</div>';
    html+='<div id="gfAdvPlayer" class="gfAdvPlayer"><div class="head"></div><div class="cloak"></div><div class="feet"></div></div>';
    html+='<div id="gfAdvPet" class="gfAdvPet">'+petMarkup(engine.pet)+'</div>';

    (z.platforms||[]).forEach(function(p){
      html+='<div class="gfAdvPlatform" data-pid="'+esc(p.id)+'" style="left:'+num(p.x)+'px;bottom:'+(96+num(p.y))+'px;width:'+num(p.w)+'px;height:'+num(p.h)+'px"></div>';
    });

    (z.collectibles||[]).forEach(function(c){
      html+='<button class="gfAdvCollectible" data-cid="'+esc(c.id)+'" title="'+esc(c.hint||'Collect')+'" style="left:'+num(c.x)+'px;bottom:'+(118+num(c.y))+'px">'+esc(c.emoji||'✦')+'</button>';
    });

    (z.hazards||[]).forEach(function(h){
      var cls=h.kind==='emberfall'?' emberfall':' thorn';
      html+='<div class="gfAdvHazard'+cls+'" data-hid="'+esc(h.id)+'" style="left:'+num(h.x)+'px;bottom:'+(96+num(h.y))+'px;width:'+num(h.w)+'px;height:'+num(h.h)+'px"><span>'+esc(h.emoji||'⚠️')+'</span></div>';
    });

    (z.gates||[]).forEach(function(g){
      html+='<button class="gfAdvGate" data-gid="'+esc(g.id)+'" style="left:'+num(g.x)+'px;bottom:'+(96+num(g.y))+'px;width:'+num(g.w)+'px;height:'+num(g.h)+'px"><b>Root Gate</b><span>Need 3 ✦</span></button>';
    });

    (z.interactables||[]).forEach(function(o){
      html+='<button class="gfAdvThing '+esc(o.kind||'thing')+'" data-iid="'+esc(o.id)+'" style="left:'+num(o.x)+'px;bottom:'+(105+num(o.y))+'px"><span>'+esc(o.emoji||'✨')+'</span></button>';
    });

    html+='<div class="gfAdvExit" style="left:'+num(z.exitX||2700)+'px"><b>Home Trail</b><span>Return when ready</span></div>';
    engine.world.style.width=z.width+'px';
    engine.world.innerHTML=html;
    engine.playerEl=document.getElementById('gfAdvPlayer');
    engine.petEl=document.getElementById('gfAdvPet');

    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-cid]'),function(btn){
      btn.onclick=function(){collect(btn.getAttribute('data-cid'))};
    });
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-iid]'),function(btn){
      btn.onclick=function(){interact(btn.getAttribute('data-iid'))};
    });
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-gid]'),function(btn){
      btn.onclick=function(){tryGate(btn.getAttribute('data-gid'))};
    });

    updateHud();
  }

  function petMarkup(pet){
    pet=pet||{};
    var src=pet.asset||pet.image||'';
    var emoji=pet.emoji||'🐾';
    var label=pet.name?'<em>'+esc(pet.name)+'</em>':'';
    if(src)return '<img src="'+esc(src)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-block\'"><span style="display:none">'+esc(emoji)+'</span>'+label;
    return '<span>'+esc(emoji)+'</span>'+label;
  }

  function loop(){
    if(!engine.running)return;
    updatePhysics();
    updateCamera();
    updatePositions();
    checkCollectibles();
    checkHazards();
    checkGoal();
    maybeAmbient();
    engine.raf=requestAnimationFrame(loop);
  }

  function updatePhysics(){
    var s=engine.state,z=engine.zone,p=z.player;
    var left=engine.keys.ArrowLeft||engine.keys.KeyA;
    var right=engine.keys.ArrowRight||engine.keys.KeyD;

    s.vx=0;
    if(left){s.vx=-p.speed;s.facing=-1;}
    if(right){s.vx=p.speed;s.facing=1;}

    if((engine.keys.Space||engine.keys.ArrowUp||engine.keys.KeyW) && s.onGround){
      s.vy=p.jump;
      s.onGround=false;
      sayOnce('jump_tip','Use short jumps to reach ledges and avoid thorns.');
    }

    s.x=clamp(s.x+s.vx,40,z.width-90);
    s.y+=s.vy;
    s.vy-=p.gravity;

    var floor=groundAt(s.x);
    if(s.y<=floor){
      s.y=floor;
      s.vy=0;
      s.onGround=true;
    }else{
      s.onGround=false;
    }

    // Solid root gates block progress until solved.
    (z.gates||[]).forEach(function(g){
      if(engine.openedGates[g.id])return;
      if(s.x+p.w>g.x && s.x<g.x+g.w && s.y<g.y+150){
        if(s.vx>0)s.x=g.x-p.w-2;
        if(s.vx<0)s.x=g.x+g.w+2;
        say('The root gate blocks the trail. Collect 3 ember shards and press E here.');
      }
    });
  }

  function groundAt(x){
    var y=0;
    (engine.zone.platforms||[]).forEach(function(p){
      var s=engine.state;
      var withinX=(x+s.w*.5)>=p.x && (x-s.w*.5)<=p.x+p.w;
      var above=s.y>=p.y-10;
      var falling=s.vy<=0;
      if(withinX&&above&&falling&&s.y<=p.y+36)y=Math.max(y,p.y);
    });
    return y;
  }

  function updateCamera(){
    var sceneW=engine.scene.clientWidth||900;
    var target=engine.state.x-sceneW*.42;
    var max=Math.max(0,engine.zone.width-sceneW);
    engine.cameraX=clamp(target,0,max);
    engine.world.style.transform='translateX('+(-engine.cameraX)+'px)';
  }

  function updatePositions(){
    var s=engine.state;
    var facing=s.facing<0?-1:1;
    engine.playerEl.style.left=s.x+'px';
    engine.playerEl.style.bottom=(96+s.y)+'px';
    engine.playerEl.style.setProperty('--face',facing);
    engine.playerEl.classList.toggle('moving',Math.abs(s.vx)>0);
    engine.playerEl.classList.toggle('jumping',!s.onGround);

    var behavior=petBehavior(engine.pet);
    var desiredX=s.x-(engine.zone.pet.followDistance*behavior.distance*facing);
    var petLag=behavior.lag;
    var currentX=Number(engine.petEl.dataset.x||desiredX);
    var currentY=Number(engine.petEl.dataset.y||s.y);
    currentX+=((desiredX-currentX)*petLag);
    currentY+=(((s.y+engine.zone.pet.offsetY)-currentY)*(petLag*.85));
    engine.petEl.dataset.x=currentX;
    engine.petEl.dataset.y=currentY;
    engine.petEl.style.left=currentX+'px';
    engine.petEl.style.bottom=(100+currentY)+'px';
    engine.petEl.style.setProperty('--petFace',facing);
    engine.petEl.classList.toggle('moving',Math.abs(s.vx)>0);
    engine.petEl.classList.toggle('alert',nearUntouchedDiscovery()||nearClosedGate());
  }

  function petBehavior(pet){
    var personality=String((pet&&pet.personality)||'').toLowerCase();
    var type=String((pet&&pet.type)||'').toLowerCase();
    var b={lag:.11,distance:1};
    if(personality==='playful'||type==='fire')b={lag:.15,distance:.82};
    if(personality==='timid'||type==='shadow')b={lag:.08,distance:1.25};
    if(personality==='curious'||type==='nature')b={lag:.13,distance:.95};
    if(personality==='lazy')b={lag:.07,distance:1.12};
    return b;
  }

  function checkCollectibles(){
    var s=engine.state;
    (engine.zone.collectibles||[]).forEach(function(c){
      if(engine.collectedIds[c.id])return;
      if(Math.abs(s.x-c.x)<48 && Math.abs((s.y+35)-c.y)<92)collect(c.id);
    });
  }

  function collect(id){
    var c=findById(engine.zone.collectibles,id);
    if(!c||engine.collectedIds[id])return;
    engine.collectedIds[id]=true;
    engine.collected[c.type]=Number(engine.collected[c.type]||0)+1;
    var node=engine.world.querySelector('[data-cid="'+cssEscape(id)+'"]');
    if(node)node.classList.add('taken');
    say('Collected '+friendly(c.type)+'.');
    updateHud();
    if(engine.callbacks.onCollect)engine.callbacks.onCollect(c);
  }

  function checkHazards(){
    var now=Date.now();
    if(now-engine.lastHitAt<1100)return;
    var s=engine.state;
    (engine.zone.hazards||[]).forEach(function(h){
      if(rectsOverlap(s.x-18,96+s.y,36,64,h.x,96+h.y,h.w,h.h)){
        engine.lastHitAt=now;
        engine.hazardsHit[h.id]=Number(engine.hazardsHit[h.id]||0)+1;
        s.health=Math.max(1,Number(s.health||3)-Number(h.damage||1));
        s.x=clamp(s.x-(s.facing*70),40,engine.zone.width-90);
        s.vy=7;
        pulseWorld('danger');
        say(h.text||'Careful! Your pet pulls you away from danger.');
        updateHud();
      }
    });
  }

  function tryInteract(){
    var best=null,bestDist=9999,s=engine.state;
    (engine.zone.gates||[]).forEach(function(g){
      var d=Math.abs(s.x-(g.x+g.w*.5));
      if(d<bestDist&&d<95){best={gate:g};bestDist=d;}
    });
    (engine.zone.interactables||[]).forEach(function(o){
      var d=Math.abs(s.x-o.x);
      if(d<bestDist&&d<95){best={object:o};bestDist=d;}
    });
    if(best&&best.gate)return tryGate(best.gate.id);
    if(best&&best.object)return interact(best.object.id);
    say('Nothing to use here. Follow the glowing trail forward.');
  }

  function interact(id){
    var o=findById(engine.zone.interactables,id);
    if(!o)return;
    engine.touched[id]=true;
    if(o.discoveryId){
      engine.discoveries[o.discoveryId]=true;
      var node=engine.world.querySelector('[data-iid="'+cssEscape(id)+'"]');
      if(node)node.classList.add('used');
    }
    if(o.kind==='story'){
      engine.goalReached=true;
      pulseWorld('story');
      say((o.text||'A story moment unfolds.')+' Return home to save this discovery.');
    }else{
      say(o.text||'You inspect it closely.');
    }
    updateHud();
    if(engine.callbacks.onInteract)engine.callbacks.onInteract(o);
  }

  function tryGate(id){
    var g=findById(engine.zone.gates,id);
    if(!g)return;
    if(engine.openedGates[id]){
      say('The root gate is open. Keep following the trail.');
      return;
    }
    var need=(g.requires&&g.requires.ember_shard)||engine.zone.requiredGateShards||3;
    var have=Number(engine.collected.ember_shard||0);
    if(have<need){
      say('Root Gate: '+have+'/'+need+' ember shards. Explore nearby ledges and sparks.');
      return;
    }
    engine.openedGates[id]=true;
    engine.puzzlesSolved[id]=true;
    var node=engine.world.querySelector('[data-gid="'+cssEscape(id)+'"]');
    if(node)node.classList.add('open');
    engine.discoveries.root_gate=true;
    pulseWorld('solve');
    say('The ember shards glow together. The root gate opens.');
    updateHud();
  }

  function checkGoal(){
    if(engine.goalReached)return;
    if(engine.state.x>=(engine.zone.goalX||2600)-40){
      var story=findById(engine.zone.interactables,'ember_tree');
      if(story)interact('ember_tree');
    }
  }

  function complete(){
    if(!engine.running)return;
    var elapsed=Date.now()-engine.startedAt;
    var discoveries=Object.keys(engine.discoveries);
    var payload={
      zoneId:engine.zone.id,
      elapsedMs:elapsed,
      collected:engine.collected,
      discoveries:discoveries,
      stats:{
        hazardsHit:Object.keys(engine.hazardsHit).reduce(function(n,k){return n+Number(engine.hazardsHit[k]||0)},0),
        puzzlesSolved:Object.keys(engine.puzzlesSolved).length,
        goalReached:!!engine.goalReached
      }
    };
    stop(true);
    if(engine.callbacks.onComplete)engine.callbacks.onComplete(payload);
  }

  function stop(completed){
    if(!engine.running)return;
    engine.running=false;
    cancelAnimationFrame(engine.raf);
    engine.root.classList.add('hidden');
    engine.keys={};
    if(!completed&&engine.callbacks.onCancel)engine.callbacks.onCancel();
  }

  function updateHud(){
    var shards=Number(engine.collected.ember_shard||0);
    var hits=Object.keys(engine.hazardsHit).reduce(function(n,k){return n+Number(engine.hazardsHit[k]||0)},0);
    var gates=Object.keys(engine.puzzlesSolved).length;
    engine.hud.innerText=shards+' shards • '+hits+' hits • '+gates+' puzzle';
    var obj='Reach the Ember Tree';
    if(!engine.openedGates.root_gate)obj='Open Root Gate: '+Math.min(shards,3)+'/3 shards';
    if(engine.openedGates.root_gate&&!engine.goalReached)obj='Follow the trail to the Ember Tree';
    if(engine.goalReached)obj='Story found — Return Home';
    engine.objective.innerText=obj;
  }

  function maybeAmbient(){
    var now=Date.now();
    if(now-engine.lastAmbientAt<12500)return;
    engine.lastAmbientAt=now;
    var list=engine.zone.ambientEvents||[];
    if(list.length)say(list[Math.floor(Math.random()*list.length)]);
  }

  function sayOnce(key,msg){
    engine._said=engine._said||{};
    if(engine._said[key])return;
    engine._said[key]=true;
    say(msg);
  }

  function say(msg){
    if(!engine.prompt)return;
    engine.prompt.textContent=msg;
    engine.prompt.classList.remove('pulse');
    void engine.prompt.offsetWidth;
    engine.prompt.classList.add('pulse');
  }

  function pulseWorld(type){
    engine.root.classList.remove('pulseDanger','pulseSolve','pulseStory');
    void engine.root.offsetWidth;
    if(type==='danger')engine.root.classList.add('pulseDanger');
    if(type==='solve')engine.root.classList.add('pulseSolve');
    if(type==='story')engine.root.classList.add('pulseStory');
  }

  function nearUntouchedDiscovery(){
    var s=engine.state;
    return (engine.zone.interactables||[]).some(function(o){
      return o.discoveryId&&!engine.discoveries[o.discoveryId]&&Math.abs(s.x-o.x)<120;
    });
  }

  function nearClosedGate(){
    var s=engine.state;
    return (engine.zone.gates||[]).some(function(g){
      return !engine.openedGates[g.id]&&Math.abs(s.x-(g.x+g.w*.5))<140;
    });
  }

  function onKey(e){
    if(!engine.running)return;
    var codes=['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW','KeyE'];
    if(codes.indexOf(e.code)===-1)return;
    engine.keys[e.code]=e.type==='keydown';
    if(e.type==='keydown'&&e.code==='KeyE')tryInteract();
    e.preventDefault();
    e.stopPropagation();
  }

  function findById(arr,id){
    id=String(id||'');
    for(var i=0;i<(arr||[]).length;i++)if(String(arr[i].id)===id)return arr[i];
    return null;
  }

  function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
  }

  function injectStyles(){
    if(document.getElementById('gfAdventureStyles'))return;
    var s=document.createElement('style');
    s.id='gfAdventureStyles';
    s.textContent=[
'.gfAdventure{position:fixed;inset:0;z-index:9999;background:linear-gradient(180deg,#451a03,#7c2d12 45%,#111827);color:#fff;font-family:Arial,Helvetica,sans-serif;display:grid;grid-template-rows:auto minmax(0,1fr)auto}.gfAdventure.hidden{display:none}.gfAdventureTop{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:rgba(15,23,42,.72);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.16)}.gfAdvTitleBlock{display:flex;flex-direction:column;gap:2px}.gfAdventureTop b{font-size:22px;letter-spacing:-.5px}.gfAdventureTop span{font-size:12px;color:#fed7aa}.gfAdvControls{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.gfAdvControls span{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);font-weight:1000;color:#fff}.gfAdvControls button{border:0;border-radius:999px;padding:8px 12px;font-weight:1000;cursor:pointer;background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.18)}.gfAdvControls button.primary{background:linear-gradient(135deg,#f97316,#facc15);color:#431407}.gfAdventureScene{position:relative;overflow:hidden;min-height:0;background:linear-gradient(180deg,#1e1b4b 0%,#7c2d12 48%,#291105 100%)}.gfAdvSky,.gfAdvSun,.gfAdvGlow{position:absolute;inset:0;pointer-events:none}.gfAdvSky{background:radial-gradient(circle at 14% 18%,rgba(251,191,36,.34),transparent 20%),radial-gradient(circle at 68% 24%,rgba(249,115,22,.22),transparent 25%),linear-gradient(180deg,rgba(15,23,42,.05),rgba(15,23,42,.6))}.gfAdvSun{left:auto;right:14%;top:11%;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(254,240,138,.78),rgba(249,115,22,.24) 46%,transparent 72%);filter:blur(1px);animation:gfGlow 4s ease-in-out infinite}.gfAdvGlow{background:radial-gradient(circle at 82% 58%,rgba(250,204,21,.28),transparent 28%),radial-gradient(circle at 48% 72%,rgba(251,146,60,.2),transparent 32%)}.gfAdventureWorld{position:absolute;left:0;top:0;bottom:0;width:2800px;transform:translateX(0);will-change:transform;transition:filter .18s ease}.gfAdvLayer{position:absolute;left:0;right:0;bottom:96px;height:64%;pointer-events:none}.gfAdvLayer.mountains{opacity:.45;background:linear-gradient(135deg,transparent 0 12%,rgba(15,23,42,.55) 12% 22%,transparent 22% 38%,rgba(67,20,7,.62) 38% 48%,transparent 48% 64%,rgba(15,23,42,.5) 64% 76%,transparent 76%)}.gfAdvLayer.trees{bottom:88px;height:42%;opacity:.55;background:radial-gradient(ellipse at 10% 80%,rgba(67,20,7,.78),transparent 13%),radial-gradient(ellipse at 28% 78%,rgba(67,20,7,.72),transparent 12%),radial-gradient(ellipse at 52% 78%,rgba(67,20,7,.72),transparent 13%),radial-gradient(ellipse at 76% 78%,rgba(67,20,7,.76),transparent 13%),radial-gradient(ellipse at 94% 78%,rgba(67,20,7,.7),transparent 12%)}.gfAdvPathGlow{position:absolute;left:0;right:0;bottom:96px;height:58px;background:linear-gradient(90deg,rgba(251,191,36,.08),rgba(251,191,36,.24),rgba(251,191,36,.09));filter:blur(9px);animation:gfTrail 3.2s ease-in-out infinite}.gfAdvGround{position:absolute;left:0;right:0;bottom:0;height:96px;background:linear-gradient(180deg,#92400e,#431407 58%,#1c1007);border-top:3px solid rgba(253,186,116,.42);box-shadow:0 -16px 40px rgba(251,146,60,.18)}.gfAdvLandmark{position:absolute;bottom:103px;width:130px;text-align:center;font-size:12px;font-weight:1000;color:#fed7aa;text-shadow:0 2px 8px #000}.gfAdvLandmark.start{left:40px}.gfAdvLandmark.tree{width:185px;font-size:14px;color:#fef3c7}.gfAdvPlayer{position:absolute;width:44px;height:76px;z-index:8;transform:translateX(-50%) scaleX(var(--face,1));transform-origin:center bottom}.gfAdvPlayer .head{position:absolute;left:10px;top:0;width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#fef3c7,#f59e0b);box-shadow:0 4px 12px rgba(0,0,0,.28)}.gfAdvPlayer .cloak{position:absolute;left:3px;top:22px;width:38px;height:48px;border-radius:16px 16px 10px 10px;background:linear-gradient(180deg,#334155,#111827);box-shadow:0 14px 20px rgba(0,0,0,.24)}.gfAdvPlayer .feet{position:absolute;left:8px;bottom:0;width:28px;height:10px;border-radius:999px;background:#0f172a}.gfAdvPlayer.moving .cloak{animation:gfWalk .38s ease-in-out infinite}.gfAdvPlayer.jumping .cloak{transform:translateY(-3px)}.gfAdvPet{position:absolute;width:86px;height:94px;z-index:7;display:flex;align-items:center;justify-content:center;transition:filter .15s;transform:translateX(-50%) scaleX(var(--petFace,1));transform-origin:center bottom}.gfAdvPet img{max-width:84px;max-height:84px;object-fit:contain;filter:drop-shadow(0 14px 12px rgba(0,0,0,.28));animation:gfPetBob 1s ease-in-out infinite}.gfAdvPet span{font-size:56px;filter:drop-shadow(0 14px 12px rgba(0,0,0,.28));animation:gfPetBob 1s ease-in-out infinite}.gfAdvPet em{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%) scaleX(var(--petFace,1));font-size:10px;font-style:normal;font-weight:1000;color:#fff;background:rgba(15,23,42,.55);padding:2px 6px;border-radius:999px;white-space:nowrap}.gfAdvPet.moving img,.gfAdvPet.moving span{animation:gfPetRun .42s ease-in-out infinite}.gfAdvPet.alert{filter:drop-shadow(0 0 12px rgba(250,204,21,.92))}.gfAdvCollectible,.gfAdvThing,.gfAdvGate{position:absolute;z-index:6;border:0;background:transparent;color:white;cursor:pointer;transform:translate(-50%,0);filter:drop-shadow(0 10px 10px rgba(0,0,0,.35));transition:.18s ease}.gfAdvCollectible{font-size:33px;animation:gfShard 1.35s ease-in-out infinite}.gfAdvCollectible.taken{opacity:0;transform:translate(-50%,-34px) scale(1.5);pointer-events:none}.gfAdvThing{font-size:42px}.gfAdvThing:hover,.gfAdvCollectible:hover{transform:translate(-50%,-8px) scale(1.08)}.gfAdvThing.used:not(.npc):not(.sign){opacity:.55;filter:grayscale(.2) drop-shadow(0 10px 10px rgba(0,0,0,.35))}.gfAdvPlatform{position:absolute;z-index:4;border-radius:999px;background:linear-gradient(180deg,#9a3412,#431407);border-top:2px solid rgba(253,186,116,.68);box-shadow:0 14px 24px rgba(0,0,0,.22)}.gfAdvHazard{position:absolute;z-index:5;display:flex;align-items:center;justify-content:center;pointer-events:none}.gfAdvHazard span{font-size:28px;filter:drop-shadow(0 8px 8px rgba(0,0,0,.45))}.gfAdvHazard.thorn{background:linear-gradient(180deg,rgba(22,101,52,.5),rgba(20,83,45,.75));border-radius:999px 999px 8px 8px;border-top:2px solid rgba(187,247,208,.5)}.gfAdvHazard.emberfall{height:72px!important;background:linear-gradient(180deg,rgba(250,204,21,.05),rgba(249,115,22,.38));border-radius:999px;animation:gfEmberFall 1.25s ease-in-out infinite}.gfAdvGate{z-index:9;border-radius:24px;background:linear-gradient(180deg,#78350f,#1c1007);border:2px solid rgba(253,186,116,.65);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#fef3c7;box-shadow:0 18px 36px rgba(0,0,0,.32)}.gfAdvGate b{font-size:13px}.gfAdvGate span{font-size:11px;color:#fdba74}.gfAdvGate.open{opacity:.25;transform:translate(-50%,-18px) scale(.75);pointer-events:none}.gfAdvExit{position:absolute;bottom:116px;width:145px;min-height:68px;border-radius:18px;background:rgba(15,23,42,.56);border:1px solid rgba(255,255,255,.22);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:white;font-weight:1000;box-shadow:0 18px 36px rgba(0,0,0,.24)}.gfAdvExit span{font-size:11px;color:#fed7aa}.gfAdvPrompt{position:absolute;left:50%;bottom:72px;transform:translateX(-50%);width:min(820px,calc(100% - 32px));background:rgba(15,23,42,.80);border:1px solid rgba(255,255,255,.20);border-radius:20px;padding:12px 15px;text-align:center;font-weight:1000;color:#fff;box-shadow:0 18px 45px rgba(0,0,0,.24)}.gfAdvPrompt.pulse{animation:gfPrompt .32s ease}.gfAdvMobile{display:none;position:absolute;left:12px;right:12px;bottom:10px;z-index:20;justify-content:space-between;gap:8px;pointer-events:none}.gfAdvMobile button{pointer-events:auto;min-width:64px;border:1px solid rgba(255,255,255,.22);background:rgba(15,23,42,.72);color:#fff;border-radius:999px;padding:11px 13px;font-weight:1000}.gfAdventureBottom{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 14px;background:rgba(15,23,42,.78);border-top:1px solid rgba(255,255,255,.14);font-size:12px;color:#fed7aa}.gfAdventure button:focus-visible{outline:3px solid rgba(255,255,255,.8);outline-offset:2px}.gfAdventure.pulseDanger .gfAdventureWorld{filter:saturate(1.3) brightness(1.08)}.gfAdventure.pulseSolve .gfAdventureWorld{filter:drop-shadow(0 0 18px rgba(250,204,21,.55))}.gfAdventure.pulseStory .gfAdventureWorld{filter:drop-shadow(0 0 22px rgba(254,240,138,.7)) saturate(1.25)}@keyframes gfGlow{0%,100%{opacity:.75;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}@keyframes gfTrail{0%,100%{opacity:.5}50%{opacity:1}}@keyframes gfWalk{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(2deg) translateY(-2px)}}@keyframes gfPetBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes gfPetRun{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}@keyframes gfShard{0%,100%{transform:translate(-50%,0) rotate(-8deg)}50%{transform:translate(-50%,-9px) rotate(8deg)}}@keyframes gfEmberFall{0%,100%{transform:translateY(-18px);opacity:.65}50%{transform:translateY(16px);opacity:1}}@keyframes gfPrompt{0%{transform:translateX(-50%) scale(.98)}70%{transform:translateX(-50%) scale(1.015)}100%{transform:translateX(-50%) scale(1)}}@media(max-width:800px){.gfAdventureTop{align-items:flex-start;flex-direction:column}.gfAdvControls{justify-content:flex-start}.gfAdventureTop b{font-size:18px}.gfAdventureBottom{display:none}.gfAdvPrompt{bottom:74px;font-size:12px;padding:10px 12px}.gfAdvThing{font-size:36px}.gfAdvMobile{display:flex}}'
    ].join('');
    document.head.appendChild(s);
  }

  function num(v){return Number(v||0)}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function friendly(s){return String(s||'item').replace(/_/g,' ')}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function cssEscape(s){return String(s).replace(/"/g,'\\"')}

  window.PetWorldAdventureEngine={mount:mount,start:start,stop:stop,isRunning:function(){return engine.running;}};
})();
