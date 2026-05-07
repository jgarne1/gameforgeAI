/*
  GameForge AI Adventure Engine v3
  Purpose: reusable pet-first side-scrolling exploration layer for PetWorld activities.
  - Not a standalone game.
  - The active pet is the controllable character; no human avatar is shown in the main wilderness mode.
  - Client handles feel, movement, solid platforms, hazards, local collectibles, puzzles, and interactions.
  - Server remains authoritative for profile rewards through /api/pet/adventure/complete.
*/
(function(){
  'use strict';

  var GROUND_H=98;

  var DEFAULT_ZONE={
    id:'ember_hollow',
    name:'Ember Hollow',
    subtitle:'Guide your companion to the Ember Tree. Collect sparks, open the root gate, and avoid the hot trail.',
    width:2920,
    timeLimitMs:240000,
    player:{x:90,y:0,w:62,h:74,maxSpeed:5.2,accel:.52,friction:.76,jump:13.6,gravity:.66},
    goalX:2700,
    exitX:2785,
    requiredGateShards:3,
    collectibles:[
      {id:'shard_1',type:'ember_shard',x:240,y:18,emoji:'✦',hint:'Trail spark'},
      {id:'shard_2',type:'ember_shard',x:465,y:122,emoji:'✦',hint:'Ledge spark'},
      {id:'shard_3',type:'ember_shard',x:690,y:18,emoji:'✦',hint:'Root spark'},
      {id:'shard_4',type:'ember_shard',x:1005,y:188,emoji:'✦',hint:'High branch spark'},
      {id:'shard_5',type:'ember_shard',x:1245,y:18,emoji:'✦',hint:'Gate spark'},
      {id:'shard_6',type:'ember_shard',x:1585,y:106,emoji:'✦',hint:'Ash ledge spark'},
      {id:'shard_7',type:'ember_shard',x:1920,y:18,emoji:'✦',hint:'Tunnel spark'},
      {id:'shard_8',type:'ember_shard',x:2210,y:130,emoji:'✦',hint:'Tree spark'},
      {id:'shard_9',type:'ember_shard',x:2490,y:18,emoji:'✦',hint:'Final spark'}
    ],
    platforms:[
      {id:'ledge_1',x:365,y:72,w:215,h:22,label:'solid ledge'},
      {id:'ledge_2',x:900,y:132,w:245,h:22,label:'solid ledge'},
      {id:'ledge_3',x:1485,y:82,w:225,h:22,label:'solid ledge'},
      {id:'ledge_4',x:2100,y:96,w:285,h:22,label:'solid ledge'}
    ],
    hazards:[
      {id:'thorn_1',kind:'thorn',x:770,y:0,w:110,h:30,emoji:'🌵',damage:1,text:'Ouch — ember thorns! Your companion stumbles back.'},
      {id:'ash_1',kind:'emberfall',x:1165,y:0,w:92,h:120,emoji:'🔥',damage:1,text:'A falling ember lands close. Keep moving!'},
      {id:'thorn_2',kind:'thorn',x:1730,y:0,w:140,h:30,emoji:'🌵',damage:1,text:'The thorns snap at your companion’s paws.'},
      {id:'ash_2',kind:'emberfall',x:2320,y:0,w:96,h:120,emoji:'🔥',damage:1,text:'Hot ash bursts across the trail.'}
    ],
    gates:[
      {id:'root_gate',x:1330,y:0,w:82,h:150,requires:{ember_shard:3},title:'Root Gate',text:'The roots are sealed. Three sparks will wake the gate.'}
    ],
    interactables:[
      {id:'trail_sign',kind:'sign',x:145,y:0,emoji:'🪧',title:'Trail Sign',text:'Guide your pet to the Ember Tree. Bright sparks collect on touch. Glowing objects can be used with E.'},
      {id:'mira_marker',kind:'npc',x:565,y:0,emoji:'🧭',title:'Scout Marker',text:'Mira left a marker: “The safe path glows. The solid ledges have bright orange tops.”'},
      {id:'root_gate_note',kind:'puzzle',x:1230,y:0,emoji:'🗝️',title:'Root Gate Hint',text:'Collect three ember sparks, then press E at the gate. Your pet will feel the roots loosen.'},
      {id:'ember_relic',kind:'relic',x:1795,y:0,emoji:'🔥',title:'Faded Ember Relic',text:'The relic hums. Your pet remembers warmth from a place it has never been.',discoveryId:'ember_relic'},
      {id:'hidden_cache',kind:'chest',x:2060,y:96,emoji:'📦',title:'Root-Tucked Cache',text:'A tucked-away scout cache! The hollow rewards pets that explore upward.',discoveryId:'ember_cache'},
      {id:'ember_tree',kind:'story',x:2635,y:0,emoji:'🌳',title:'The Ember Tree',text:'The tree pulses. Your pet steps forward, and the bark glows like it recognizes them.',discoveryId:'ember_tree'}
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
    mounted:false,running:false,zone:null,root:null,scene:null,world:null,hud:null,objective:null,prompt:null,
    petEl:null,cameraX:0,keys:{},collected:{},collectedIds:{},touched:{},discoveries:{},openedGates:{},hazardsHit:{},puzzlesSolved:{},
    goalReached:false,startedAt:0,raf:0,lastAmbientAt:0,lastHitAt:0,lastLandingAt:0,state:null,callbacks:{},pet:null,nearest:null
  };

  function mergeZone(zone){
    var z=Object.assign({},DEFAULT_ZONE,zone||{});
    z.player=Object.assign({},DEFAULT_ZONE.player,(zone&&zone.player)||{});
    ['collectibles','platforms','hazards','gates','interactables','ambientEvents'].forEach(function(k){z[k]=(zone&&zone[k])?zone[k]:DEFAULT_ZONE[k].slice();});
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
        '<div class="gfAdvMobile">',
          '<button data-key="ArrowLeft">◀</button><button data-key="Space">Jump</button><button data-key="KeyE">Use</button><button data-key="ArrowRight">▶</button>',
        '</div>',
      '</div>',
      '<div class="gfAdventureBottom"><span>Pet-first Adventure v3</span><span>Bright sparks collect on touch. Glowing objects use E. Orange-topped ledges are solid.</span></div>'
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
    engine.collected={};engine.collectedIds={};engine.touched={};engine.discoveries={};engine.openedGates={};engine.hazardsHit={};engine.puzzlesSolved={};engine.goalReached=false;
    engine.startedAt=Date.now();engine.lastAmbientAt=Date.now();engine.lastHitAt=0;engine.lastLandingAt=0;engine.cameraX=0;
    engine.state={x:engine.zone.player.x,y:0,prevY:0,vx:0,vy:0,onGround:true,facing:1,health:3,landed:false};
    document.getElementById('gfAdvTitle').innerText=engine.zone.name;
    document.getElementById('gfAdvSub').innerText=engine.zone.subtitle||'Guide your companion.';
    renderWorld();
    engine.root.classList.remove('hidden');
    engine.running=true;
    engine.raf=requestAnimationFrame(loop);
    say('You are guiding your pet. Bright sparks collect on touch. Orange-topped ledges are safe to land on.');
    pop('+ Start',engine.state.x,engine.state.y+90,'info');
    if(engine.callbacks.onStart)engine.callbacks.onStart(engine.zone);
  }

  function renderWorld(){
    var z=engine.zone,html='';
    html+='<div class="gfAdvLayer mountains"></div><div class="gfAdvLayer trees"></div><div class="gfAdvPathGlow"></div><div class="gfAdvGround"></div>';
    html+='<div class="gfAdvLandmark start">Camp Trail</div><div class="gfAdvLandmark tree" style="left:'+(z.goalX-60)+'px">Ember Tree</div>';
    (z.platforms||[]).forEach(function(p){html+='<div class="gfAdvPlatform" data-pid="'+esc(p.id)+'" style="left:'+num(p.x)+'px;bottom:'+(GROUND_H+num(p.y))+'px;width:'+num(p.w)+'px;height:'+num(p.h)+'px"><span></span></div>';});
    (z.hazards||[]).forEach(function(h){var cls=h.kind==='emberfall'?' emberfall':' thorn';html+='<div class="gfAdvHazard'+cls+'" data-hid="'+esc(h.id)+'" style="left:'+num(h.x)+'px;bottom:'+(GROUND_H+num(h.y))+'px;width:'+num(h.w)+'px;height:'+num(h.h)+'px"><span>'+esc(h.emoji||'⚠️')+'</span></div>';});
    (z.gates||[]).forEach(function(g){html+='<button class="gfAdvGate gfAdvUsable" data-gid="'+esc(g.id)+'" style="left:'+num(g.x)+'px;bottom:'+(GROUND_H+num(g.y))+'px;width:'+num(g.w)+'px;height:'+num(g.h)+'px"><b>Root Gate</b><span>Need 3 ✦</span></button>';});
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

  function petMarkup(pet){
    pet=pet||{};var src=pet.asset||pet.image||'';var emoji=pet.emoji||'🐾';var label=pet.name?'<em>'+esc(pet.name)+'</em>':'';
    if(src)return '<img src="'+esc(src)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-flex\'"><span style="display:none">'+esc(emoji)+'</span>'+label;
    return '<span>'+esc(emoji)+'</span>'+label;
  }

  function loop(){
    if(!engine.running)return;
    updatePhysics();updateCamera();updatePositions();updateNearest();checkCollectibles();checkHazards();checkGoal();maybeAmbient();
    engine.raf=requestAnimationFrame(loop);
  }

  function updatePhysics(){
    var s=engine.state,z=engine.zone,p=z.player;
    var left=engine.keys.ArrowLeft||engine.keys.KeyA,right=engine.keys.ArrowRight||engine.keys.KeyD;
    var target=0;if(left){target=-p.maxSpeed;s.facing=-1;}if(right){target=p.maxSpeed;s.facing=1;}
    if(target!==0)s.vx+=(target-s.vx)*p.accel;else s.vx*=p.friction;
    if(Math.abs(s.vx)<.05)s.vx=0;
    if((engine.keys.Space||engine.keys.ArrowUp||engine.keys.KeyW)&&s.onGround){s.vy=p.jump;s.onGround=false;s.landed=false;sayOnce('jump_tip','Jump onto orange-topped ledges. They are solid surfaces, not background art.');pop('Jump',s.x,s.y+88,'info');}

    var prevX=s.x,prevY=s.y;
    s.prevY=prevY;s.x=clamp(s.x+s.vx,42,z.width-80);s.y+=s.vy;s.vy-=p.gravity;

    var surface=findLandingSurface(prevY,s.y,s.x);
    if(surface!==null){
      s.y=surface;s.vy=0;
      if(!s.onGround&&Date.now()-engine.lastLandingAt>180){engine.lastLandingAt=Date.now();s.landed=true;setTimeout(function(){if(engine.state)engine.state.landed=false;},160);}
      s.onGround=true;
    }else{s.onGround=false;}

    (z.gates||[]).forEach(function(g){
      if(engine.openedGates[g.id])return;
      var petBox=petRect();
      if(rectsOverlap(petBox.x,petBox.y,petBox.w,petBox.h,g.x,GROUND_H+g.y,g.w,g.h)){
        if(prevX<g.x)s.x=g.x-petBox.w*.5-8;else s.x=g.x+g.w+petBox.w*.5+8;
        s.vx=0;say('The root gate blocks the trail. Collect 3 sparks and press E here.');
      }
    });
  }

  function findLandingSurface(prevY,newY,x){
    var best=null;
    if(newY<=0)best=0;
    (engine.zone.platforms||[]).forEach(function(p){
      var top=Number(p.y||0)+Number(p.h||0);
      var withinX=x+24>=p.x && x-24<=p.x+p.w;
      var crossed=prevY>=top-4 && newY<=top+10;
      var falling=engine.state.vy<=1;
      if(withinX&&crossed&&falling)best=Math.max(best===null?-999:best,top);
    });
    return best;
  }

  function updateCamera(){
    var sceneW=engine.scene.clientWidth||900,target=engine.state.x-sceneW*.42,max=Math.max(0,engine.zone.width-sceneW);
    engine.cameraX+=((clamp(target,0,max)-engine.cameraX)*.13);
    engine.world.style.transform='translateX('+(-engine.cameraX)+'px)';
  }

  function updatePositions(){
    var s=engine.state,facing=s.facing<0?-1:1,b=petBehavior(engine.pet);
    engine.petEl.style.left=s.x+'px';engine.petEl.style.bottom=(GROUND_H+s.y)+'px';engine.petEl.style.setProperty('--petFace',facing);
    engine.petEl.classList.toggle('moving',Math.abs(s.vx)>1);engine.petEl.classList.toggle('jumping',!s.onGround);engine.petEl.classList.toggle('landed',!!s.landed);engine.petEl.classList.toggle('alert',nearUntouchedDiscovery()||nearClosedGate());
    engine.petEl.style.setProperty('--squash',s.landed?'.9':(!s.onGround?'1.04':(Math.abs(s.vx)>1?'.98':'1')));
    engine.petEl.style.setProperty('--stretch',s.landed?'1.12':(!s.onGround?'.96':'1'));
    engine.petEl.dataset.behavior=b.name;
  }

  function petBehavior(pet){
    var personality=String((pet&&pet.personality)||'').toLowerCase(),type=String((pet&&pet.type)||'').toLowerCase();
    if(personality==='playful'||type==='fire')return {name:'playful'};
    if(personality==='timid'||type==='shadow')return {name:'timid'};
    if(personality==='curious'||type==='nature')return {name:'curious'};
    if(personality==='lazy')return {name:'lazy'};
    return {name:'steady'};
  }

  function checkCollectibles(){
    var s=engine.state;
    (engine.zone.collectibles||[]).forEach(function(c){
      if(engine.collectedIds[c.id])return;
      var node=engine.world.querySelector('[data-cid="'+cssEscape(c.id)+'"]');
      var dx=s.x-c.x,dy=(s.y+38)-(c.y+42);
      if(Math.abs(dx)<130&&Math.abs(dy)<130&&node){
        var pull=Math.max(0,1-(Math.sqrt(dx*dx+dy*dy)/150));
        node.style.transform='translate(-50%,0) translate('+dx*pull*.18+'px,'+(-dy*pull*.18)+'px) scale('+(1+pull*.18)+')';
      }
      if(Math.abs(dx)<46&&Math.abs(dy)<70)collect(c.id);
    });
  }

  function collect(id){
    var c=findById(engine.zone.collectibles,id);if(!c||engine.collectedIds[id])return;
    engine.collectedIds[id]=true;engine.collected[c.type]=Number(engine.collected[c.type]||0)+1;
    var node=engine.world.querySelector('[data-cid="'+cssEscape(id)+'"]');if(node)node.classList.add('taken');
    burst(c.x,GROUND_H+42+c.y,'spark');pop('+1 '+friendly(c.type),c.x,c.y+92,'good');say('Collected '+friendly(c.type)+'. Sparks collect on touch.');updateHud();
    if(engine.callbacks.onCollect)engine.callbacks.onCollect(c);
  }

  function checkHazards(){
    var now=Date.now();if(now-engine.lastHitAt<1050)return;
    var r=petRect();
    (engine.zone.hazards||[]).forEach(function(h){
      var hx=h.x,hy=GROUND_H+h.y,hw=h.w,hh=h.h;
      if(h.kind==='emberfall'){
        var phase=((now/650)+(h.x%5))%2;var drop=phase<1?phase:(2-phase);hy=GROUND_H+8+(drop*90);hh=42;
      }
      if(rectsOverlap(r.x,r.y,r.w,r.h,hx,hy,hw,hh)){
        engine.lastHitAt=now;engine.hazardsHit[h.id]=Number(engine.hazardsHit[h.id]||0)+1;
        engine.state.health=Math.max(1,Number(engine.state.health||3)-Number(h.damage||1));
        engine.state.x=clamp(engine.state.x-(engine.state.facing*82),44,engine.zone.width-88);engine.state.vx=0;engine.state.vy=7;
        pulseWorld('danger');burst(engine.state.x,GROUND_H+engine.state.y+44,'danger');pop('Stumble!',engine.state.x,engine.state.y+96,'bad');say(h.text||'Careful!');updateHud();
      }
    });
  }

  function updateNearest(){
    var s=engine.state,best=null,bestDist=9999;
    Array.prototype.forEach.call(engine.world.querySelectorAll('.near'),function(n){n.classList.remove('near');});
    (engine.zone.gates||[]).forEach(function(g){var d=Math.abs(s.x-(g.x+g.w*.5));if(d<bestDist&&d<112&&!engine.openedGates[g.id]){best={gate:g};bestDist=d;}});
    (engine.zone.interactables||[]).forEach(function(o){var d=Math.abs(s.x-o.x);if(d<bestDist&&d<112){best={object:o};bestDist=d;}});
    engine.nearest=best;
    if(best&&best.gate){var gn=engine.world.querySelector('[data-gid="'+cssEscape(best.gate.id)+'"]');if(gn)gn.classList.add('near');}
    if(best&&best.object){var on=engine.world.querySelector('[data-iid="'+cssEscape(best.object.id)+'"]');if(on)on.classList.add('near');}
  }

  function tryInteract(){
    updateNearest();
    if(engine.nearest&&engine.nearest.gate)return tryGate(engine.nearest.gate.id);
    if(engine.nearest&&engine.nearest.object)return interact(engine.nearest.object.id);
    say('No glowing object nearby. Sparks collect automatically; signs, chests, relics, and gates use E.');
  }

  function interact(id){
    var o=findById(engine.zone.interactables,id);if(!o)return;
    engine.touched[id]=true;
    if(o.discoveryId){engine.discoveries[o.discoveryId]=true;var node=engine.world.querySelector('[data-iid="'+cssEscape(id)+'"]');if(node)node.classList.add('used');}
    if(o.kind==='story'){engine.goalReached=true;pulseWorld('story');burst(o.x,GROUND_H+105+o.y,'story');pop('Discovery!',o.x,o.y+135,'good');say((o.text||'A story moment unfolds.')+' Return home to save this discovery.');}
    else{pulseWorld(o.discoveryId?'solve':'soft');pop(o.title||'Used',o.x,o.y+120,'info');say(o.text||'You inspect it closely.');}
    updateHud();if(engine.callbacks.onInteract)engine.callbacks.onInteract(o);
  }

  function tryGate(id){
    var g=findById(engine.zone.gates,id);if(!g)return;
    if(engine.openedGates[id]){say('The root gate is open. Keep following the trail.');return;}
    var need=(g.requires&&g.requires.ember_shard)||engine.zone.requiredGateShards||3,have=Number(engine.collected.ember_shard||0);
    if(have<need){say('Root Gate: '+have+'/'+need+' sparks. Bright sparks collect when your pet touches them.');pop(have+'/'+need,g.x,g.y+125,'info');return;}
    engine.openedGates[id]=true;engine.puzzlesSolved[id]=true;engine.discoveries.root_gate=true;
    var node=engine.world.querySelector('[data-gid="'+cssEscape(id)+'"]');if(node)node.classList.add('open');
    pulseWorld('solve');burst(g.x+g.w/2,GROUND_H+95,'solve');pop('Gate Open!',g.x+g.w/2,g.y+150,'good');say('The sparks glow together. The root gate opens.');updateHud();
  }

  function checkGoal(){if(engine.goalReached)return;if(engine.state.x>=(engine.zone.goalX||2700)-60){var story=findById(engine.zone.interactables,'ember_tree');if(story)interact('ember_tree');}}

  function complete(){
    if(!engine.running)return;
    var payload={zoneId:engine.zone.id,elapsedMs:Date.now()-engine.startedAt,collected:engine.collected,discoveries:Object.keys(engine.discoveries),stats:{hazardsHit:Object.keys(engine.hazardsHit).reduce(function(n,k){return n+Number(engine.hazardsHit[k]||0)},0),puzzlesSolved:Object.keys(engine.puzzlesSolved).length,goalReached:!!engine.goalReached}};
    stop(true);if(engine.callbacks.onComplete)engine.callbacks.onComplete(payload);
  }

  function stop(completed){if(!engine.running)return;engine.running=false;cancelAnimationFrame(engine.raf);engine.root.classList.add('hidden');engine.keys={};if(!completed&&engine.callbacks.onCancel)engine.callbacks.onCancel();}

  function updateHud(){
    var sparks=Number(engine.collected.ember_shard||0),hits=Object.keys(engine.hazardsHit).reduce(function(n,k){return n+Number(engine.hazardsHit[k]||0)},0),gates=Object.keys(engine.puzzlesSolved).length;
    engine.hud.innerText=sparks+' sparks • '+hits+' stumbles • '+gates+' puzzle';
    var obj='Reach the Ember Tree';if(!engine.openedGates.root_gate)obj='Open Root Gate: '+Math.min(sparks,3)+'/3 sparks';if(engine.openedGates.root_gate&&!engine.goalReached)obj='Follow the trail to the Ember Tree';if(engine.goalReached)obj='Discovery found — Return Home';engine.objective.innerText=obj;
  }

  function maybeAmbient(){var now=Date.now();if(now-engine.lastAmbientAt<12500)return;engine.lastAmbientAt=now;var list=engine.zone.ambientEvents||[];if(list.length)say(list[Math.floor(Math.random()*list.length)]);}
  function sayOnce(key,msg){engine._said=engine._said||{};if(engine._said[key])return;engine._said[key]=true;say(msg);}
  function say(msg){if(!engine.prompt)return;engine.prompt.textContent=msg;engine.prompt.classList.remove('pulse');void engine.prompt.offsetWidth;engine.prompt.classList.add('pulse');}

  function pop(text,x,y,type){
    var layer=document.getElementById('gfAdvToastLayer');if(!layer)return;
    var n=document.createElement('div');n.className='gfAdvPop '+(type||'info');n.textContent=text;n.style.left=(x-engine.cameraX)+'px';n.style.bottom=(GROUND_H+y)+'px';layer.appendChild(n);setTimeout(function(){if(n.parentNode)n.parentNode.removeChild(n);},1050);
  }
  function burst(x,y,type){
    for(var i=0;i<8;i++){var p=document.createElement('i');p.className='gfAdvBurst '+(type||'spark');p.style.left=(x)+'px';p.style.bottom=(y)+'px';p.style.setProperty('--dx',((Math.random()*80)-40)+'px');p.style.setProperty('--dy',((Math.random()*70)+18)+'px');engine.world.appendChild(p);setTimeout((function(n){return function(){if(n.parentNode)n.parentNode.removeChild(n);};})(p),650);}
  }
  function pulseWorld(type){engine.root.classList.remove('pulseDanger','pulseSolve','pulseStory','pulseSoft');void engine.root.offsetWidth;if(type==='danger')engine.root.classList.add('pulseDanger');else if(type==='solve')engine.root.classList.add('pulseSolve');else if(type==='story')engine.root.classList.add('pulseStory');else engine.root.classList.add('pulseSoft');}
  function nearUntouchedDiscovery(){var s=engine.state;return (engine.zone.interactables||[]).some(function(o){return o.discoveryId&&!engine.discoveries[o.discoveryId]&&Math.abs(s.x-o.x)<120;});}
  function nearClosedGate(){var s=engine.state;return (engine.zone.gates||[]).some(function(g){return !engine.openedGates[g.id]&&Math.abs(s.x-(g.x+g.w*.5))<140;});}

  function onKey(e){if(!engine.running)return;var codes=['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW','KeyE'];if(codes.indexOf(e.code)===-1)return;e.preventDefault();engine.keys[e.code]=(e.type==='keydown');if(e.type==='keydown'&&e.code==='KeyE')tryInteract();}
  function petRect(){var s=engine.state,p=engine.zone.player;return {x:s.x-p.w*.5,y:GROUND_H+s.y,w:p.w,h:p.h};}
  function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;}
  function findById(list,id){return (list||[]).find(function(x){return String(x.id)===String(id)});}

  function injectStyles(){
    if(document.getElementById('gfAdventureStyles'))return;
    var s=document.createElement('style');s.id='gfAdventureStyles';
    s.textContent=[
      '.gfAdventure{position:fixed;inset:0;z-index:9999;display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#120805;color:#fff;font-family:Arial,Helvetica,sans-serif}.gfAdventure.hidden{display:none}.gfAdventureTop{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:rgba(15,23,42,.75);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.16)}.gfAdvTitleBlock{display:flex;flex-direction:column;gap:2px}.gfAdventureTop b{font-size:22px;letter-spacing:-.5px}.gfAdventureTop span{font-size:12px;color:#fed7aa}.gfAdvControls{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.gfAdvControls span{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);font-weight:1000;color:#fff}.gfAdvControls button{border:0;border-radius:999px;padding:8px 12px;font-weight:1000;cursor:pointer;background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.18)}.gfAdvControls button.primary{background:linear-gradient(135deg,#f97316,#facc15);color:#431407}.gfAdventureScene{position:relative;overflow:hidden;min-height:0;background:linear-gradient(180deg,#1e1b4b 0%,#7c2d12 48%,#291105 100%)}.gfAdvSky,.gfAdvSun,.gfAdvGlow{position:absolute;inset:0;pointer-events:none}.gfAdvSky{background:radial-gradient(circle at 14% 18%,rgba(251,191,36,.34),transparent 20%),radial-gradient(circle at 68% 24%,rgba(249,115,22,.22),transparent 25%),linear-gradient(180deg,rgba(15,23,42,.05),rgba(15,23,42,.6))}.gfAdvSun{position:absolute;left:auto;right:14%;top:11%;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(254,240,138,.78),rgba(249,115,22,.24) 46%,transparent 72%);filter:blur(1px);animation:gfGlow 4s ease-in-out infinite}.gfAdvGlow{background:radial-gradient(circle at 82% 58%,rgba(250,204,21,.28),transparent 28%),radial-gradient(circle at 48% 72%,rgba(251,146,60,.2),transparent 32%)}.gfAdventureWorld{position:absolute;left:0;top:0;bottom:0;width:2920px;transform:translateX(0);will-change:transform;transition:filter .18s ease}.gfAdvLayer{position:absolute;left:0;right:0;bottom:98px;height:64%;pointer-events:none}.gfAdvLayer.mountains{opacity:.38;background:linear-gradient(135deg,transparent 0 12%,rgba(15,23,42,.55) 12% 22%,transparent 22% 38%,rgba(67,20,7,.62) 38% 48%,transparent 48% 64%,rgba(15,23,42,.5) 64% 76%,transparent 76%)}.gfAdvLayer.trees{bottom:88px;height:42%;opacity:.34;background:radial-gradient(ellipse at 10% 80%,rgba(67,20,7,.78),transparent 13%),radial-gradient(ellipse at 28% 78%,rgba(67,20,7,.72),transparent 12%),radial-gradient(ellipse at 52% 78%,rgba(67,20,7,.72),transparent 13%),radial-gradient(ellipse at 76% 78%,rgba(67,20,7,.76),transparent 13%),radial-gradient(ellipse at 94% 78%,rgba(67,20,7,.7),transparent 12%)}.gfAdvPathGlow{position:absolute;left:0;right:0;bottom:98px;height:58px;background:linear-gradient(90deg,rgba(251,191,36,.08),rgba(251,191,36,.24),rgba(251,191,36,.09));filter:blur(9px);animation:gfTrail 3.2s ease-in-out infinite}.gfAdvGround{position:absolute;left:0;right:0;bottom:0;height:98px;background:linear-gradient(180deg,#92400e,#431407 58%,#1c1007);border-top:5px solid rgba(253,186,116,.72);box-shadow:0 -16px 40px rgba(251,146,60,.18)}.gfAdvLandmark{position:absolute;bottom:107px;width:130px;text-align:center;font-size:12px;font-weight:1000;color:#fed7aa;text-shadow:0 2px 8px #000}.gfAdvLandmark.start{left:40px}.gfAdvLandmark.tree{width:185px;font-size:14px;color:#fef3c7}.gfAdvHeroPet{position:absolute;width:92px;height:98px;z-index:10;display:flex;align-items:center;justify-content:center;transform:translateX(-50%) scaleX(var(--petFace,1)) scale(var(--squash,1),var(--stretch,1));transform-origin:center bottom;transition:filter .15s}.gfAdvHeroPet img{max-width:90px;max-height:90px;object-fit:contain;filter:drop-shadow(0 14px 12px rgba(0,0,0,.3));animation:gfPetIdle 1.35s ease-in-out infinite}.gfAdvHeroPet span{width:90px;height:90px;display:inline-flex;align-items:center;justify-content:center;font-size:58px;filter:drop-shadow(0 14px 12px rgba(0,0,0,.3));animation:gfPetIdle 1.35s ease-in-out infinite}.gfAdvHeroPet em{position:absolute;bottom:-10px;left:50%;transform:translateX(-50%) scaleX(var(--petFace,1));font-size:10px;font-style:normal;font-weight:1000;color:#fff;background:rgba(15,23,42,.55);padding:2px 6px;border-radius:999px;white-space:nowrap}.gfAdvHeroPet.moving img,.gfAdvHeroPet.moving span{animation:gfPetRun .38s ease-in-out infinite}.gfAdvHeroPet.jumping img,.gfAdvHeroPet.jumping span{animation:gfPetJump .55s ease-in-out infinite}.gfAdvHeroPet.landed img,.gfAdvHeroPet.landed span{animation:gfPetLand .16s ease}.gfAdvHeroPet.alert{filter:drop-shadow(0 0 14px rgba(250,204,21,.95))}.gfAdvCollectible,.gfAdvThing,.gfAdvGate{position:absolute;z-index:7;border:0;background:transparent;color:white;cursor:pointer;transform:translate(-50%,0);filter:drop-shadow(0 10px 10px rgba(0,0,0,.35));transition:.18s ease}.gfAdvCollectible{font-size:34px;animation:gfShard 1.2s ease-in-out infinite}.gfAdvCollectible span{display:grid;place-items:center;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle,rgba(254,240,138,.9),rgba(249,115,22,.34) 48%,transparent 72%);border:1px solid rgba(254,240,138,.5)}.gfAdvCollectible.taken{opacity:0!important;transform:translate(-50%,-38px) scale(1.6)!important;pointer-events:none}.gfAdvThing{font-size:42px}.gfAdvThing span{display:grid;place-items:center;width:58px;height:58px;border-radius:20px;background:rgba(15,23,42,.42);border:1px solid rgba(255,255,255,.2)}.gfAdvThing i{position:absolute;left:50%;bottom:-16px;transform:translateX(-50%);font-style:normal;font-size:10px;font-weight:1000;background:rgba(15,23,42,.72);color:#fff;border-radius:999px;padding:2px 6px;opacity:0}.gfAdvThing.near,.gfAdvGate.near{filter:drop-shadow(0 0 16px rgba(250,204,21,.95));transform:translate(-50%,-5px) scale(1.04)}.gfAdvThing.near i{opacity:1}.gfAdvThing.used:not(.npc):not(.sign){opacity:.58;filter:grayscale(.2) drop-shadow(0 10px 10px rgba(0,0,0,.35))}.gfAdvPlatform{position:absolute;z-index:5;border-radius:18px;background:linear-gradient(180deg,#7c2d12,#431407);border-top:6px solid #fdba74;box-shadow:0 14px 24px rgba(0,0,0,.28),inset 0 4px 0 rgba(254,240,138,.24)}.gfAdvPlatform:before{content:"";position:absolute;left:10px;right:10px;top:-10px;height:8px;border-radius:999px;background:rgba(254,240,138,.52);box-shadow:0 0 18px rgba(250,204,21,.3)}.gfAdvPlatform span{position:absolute;left:50%;top:-26px;transform:translateX(-50%);font-size:10px;font-weight:1000;color:#ffedd5;background:rgba(15,23,42,.55);border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:2px 7px}.gfAdvPlatform span:after{content:"SOLID"}.gfAdvHazard{position:absolute;z-index:6;display:flex;align-items:center;justify-content:center;pointer-events:none}.gfAdvHazard span{font-size:28px;filter:drop-shadow(0 8px 8px rgba(0,0,0,.45))}.gfAdvHazard.thorn{background:linear-gradient(180deg,rgba(22,101,52,.5),rgba(20,83,45,.75));border-radius:999px 999px 8px 8px;border-top:2px solid rgba(187,247,208,.5)}.gfAdvHazard.emberfall{height:120px!important;background:linear-gradient(180deg,rgba(250,204,21,.05),rgba(249,115,22,.38));border-radius:999px;animation:gfEmberFall 1.3s ease-in-out infinite}.gfAdvGate{z-index:9;border-radius:24px;background:linear-gradient(180deg,#78350f,#1c1007);border:2px solid rgba(253,186,116,.65);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#fef3c7;box-shadow:0 18px 36px rgba(0,0,0,.32)}.gfAdvGate b{font-size:13px}.gfAdvGate span{font-size:11px;color:#fdba74}.gfAdvGate.open{opacity:.25;transform:translate(-50%,-18px) scale(.75);pointer-events:none}.gfAdvExit{position:absolute;bottom:118px;width:145px;min-height:68px;border-radius:18px;background:rgba(15,23,42,.56);border:1px solid rgba(255,255,255,.22);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:white;font-weight:1000;box-shadow:0 18px 36px rgba(0,0,0,.24)}.gfAdvExit span{font-size:11px;color:#fed7aa}.gfAdvPrompt{position:absolute;left:50%;bottom:72px;transform:translateX(-50%);width:min(860px,calc(100% - 32px));background:rgba(15,23,42,.82);border:1px solid rgba(255,255,255,.20);border-radius:20px;padding:12px 15px;text-align:center;font-weight:1000;color:#fff;box-shadow:0 18px 45px rgba(0,0,0,.24)}.gfAdvPrompt.pulse{animation:gfPrompt .32s ease}.gfAdvToastLayer{position:absolute;inset:0;z-index:30;pointer-events:none}.gfAdvPop{position:absolute;transform:translate(-50%,0);font-size:13px;font-weight:1000;text-shadow:0 2px 8px rgba(0,0,0,.7);animation:gfPop 1s ease forwards;white-space:nowrap}.gfAdvPop.good{color:#fef3c7}.gfAdvPop.bad{color:#fecaca}.gfAdvPop.info{color:#dbeafe}.gfAdvBurst{position:absolute;z-index:31;width:8px;height:8px;border-radius:50%;background:#fde68a;pointer-events:none;animation:gfBurst .62s ease forwards}.gfAdvBurst.danger{background:#fb7185}.gfAdvBurst.solve{background:#facc15}.gfAdvBurst.story{background:#a7f3d0}.gfAdvMobile{display:none;position:absolute;left:12px;right:12px;bottom:10px;z-index:40;justify-content:space-between;gap:8px;pointer-events:none}.gfAdvMobile button{pointer-events:auto;min-width:64px;border:1px solid rgba(255,255,255,.22);background:rgba(15,23,42,.72);color:#fff;border-radius:999px;padding:11px 13px;font-weight:1000}.gfAdventureBottom{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 14px;background:rgba(15,23,42,.78);border-top:1px solid rgba(255,255,255,.14);font-size:12px;color:#fed7aa}.gfAdventure button:focus-visible{outline:3px solid rgba(255,255,255,.8);outline-offset:2px}.gfAdventure.pulseDanger .gfAdventureWorld{filter:saturate(1.35) brightness(1.1)}.gfAdventure.pulseSolve .gfAdventureWorld{filter:drop-shadow(0 0 18px rgba(250,204,21,.55))}.gfAdventure.pulseStory .gfAdventureWorld{filter:drop-shadow(0 0 22px rgba(254,240,138,.7)) saturate(1.25)}.gfAdventure.pulseSoft .gfAdventureWorld{filter:brightness(1.05)}@keyframes gfGlow{0%,100%{opacity:.75;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}@keyframes gfTrail{0%,100%{opacity:.5}50%{opacity:1}}@keyframes gfPetIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes gfPetRun{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-9px) rotate(2deg)}}@keyframes gfPetJump{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(.96,1.06)}}@keyframes gfPetLand{0%{transform:scale(1.12,.84)}100%{transform:scale(1)}}@keyframes gfShard{0%,100%{transform:translate(-50%,0) rotate(-8deg)}50%{transform:translate(-50%,-10px) rotate(8deg)}}@keyframes gfEmberFall{0%,100%{transform:translateY(-26px);opacity:.55}50%{transform:translateY(18px);opacity:1}}@keyframes gfPrompt{0%{transform:translateX(-50%) scale(.98)}70%{transform:translateX(-50%) scale(1.015)}100%{transform:translateX(-50%) scale(1)}}@keyframes gfPop{0%{opacity:0;transform:translate(-50%,12px) scale(.9)}18%{opacity:1}100%{opacity:0;transform:translate(-50%,-45px) scale(1.04)}}@keyframes gfBurst{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) * -1)) scale(.25)}}@media(max-width:800px){.gfAdventureTop{align-items:flex-start;flex-direction:column}.gfAdvControls{justify-content:flex-start}.gfAdventureTop b{font-size:18px}.gfAdventureBottom{display:none}.gfAdvPrompt{bottom:74px;font-size:12px;padding:10px 12px}.gfAdvThing{font-size:36px}.gfAdvMobile{display:flex}.gfAdvPlatform span{display:none}}'
    ].join('');document.head.appendChild(s);
  }

  function num(v){return Number(v||0)}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function friendly(s){return String(s||'item').replace(/_/g,' ')}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function cssEscape(s){return String(s).replace(/"/g,'\\"')}

  window.PetWorldAdventureEngine={mount:mount,start:start,stop:stop,isRunning:function(){return engine.running;}};
})();
