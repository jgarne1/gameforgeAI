/*
  GameForge AI Adventure Engine v1
  Purpose: reusable cozy exploration layer for PetWorld activities.
  - Not a standalone game.
  - Client handles feel, movement, collisions, local collectibles, and interactions.
  - Server remains authoritative for profile rewards through /api/pet/adventure/complete.
*/
(function(){
  'use strict';

  var DEFAULT_ZONE={
    id:'ember_hollow',
    name:'Ember Hollow',
    subtitle:'The first ember fragments are waking up under the old roots.',
    width:1680,
    timeLimitMs:95000,
    player:{x:110,y:0,w:42,h:74,speed:4.1,jump:12.6,gravity:.62},
    pet:{followDistance:74,offsetY:8},
    exitX:1540,
    collectibles:[
      {id:'shard_1',type:'ember_shard',x:265,y:318,emoji:'✦'},
      {id:'shard_2',type:'ember_shard',x:448,y:278,emoji:'✦'},
      {id:'shard_3',type:'ember_shard',x:675,y:322,emoji:'✦'},
      {id:'shard_4',type:'ember_shard',x:902,y:250,emoji:'✦'},
      {id:'shard_5',type:'ember_shard',x:1160,y:318,emoji:'✦'},
      {id:'shard_6',type:'ember_shard',x:1360,y:288,emoji:'✦'}
    ],
    interactables:[
      {id:'scout_sign',kind:'sign',x:180,y:322,emoji:'🪧',title:'Trail Sign',text:'Warm sparks drift from the hollow. Your pet leans forward, curious.'},
      {id:'mira',kind:'npc',x:540,y:316,emoji:'🧭',title:'Mira the Scout',text:'These fragments did not appear yesterday. Bring back what you find, but do not rush your companion.'},
      {id:'ember_relic',kind:'relic',x:840,y:318,emoji:'🔥',title:'Faded Ember Relic',text:'A cracked relic hums when your pet gets close. This discovery is now marked in your journal.',discoveryId:'ember_relic'},
      {id:'hidden_cache',kind:'chest',x:1265,y:318,emoji:'📦',title:'Root-Tucked Cache',text:'You found a small cache under the roots.',discoveryId:'ember_cache'}
    ],
    ambientEvents:[
      'A warm breeze carries tiny sparks across the path.',
      'Your pet pauses and listens to something under the roots.',
      'A distant glow flickers, then disappears behind the trees.',
      'The hollow feels alive, but not dangerous.'
    ]
  };

  var engine={
    mounted:false,
    running:false,
    zone:null,
    root:null,
    world:null,
    hud:null,
    prompt:null,
    playerEl:null,
    petEl:null,
    cameraX:0,
    keys:{},
    collected:{},
    touched:{},
    discoveries:{},
    startedAt:0,
    raf:0,
    lastAmbientAt:0,
    state:null,
    callbacks:{},
    pet:null
  };

  function mergeZone(zone){
    var z=Object.assign({},DEFAULT_ZONE,zone||{});
    z.player=Object.assign({},DEFAULT_ZONE.player,(zone&&zone.player)||{});
    z.pet=Object.assign({},DEFAULT_ZONE.pet,(zone&&zone.pet)||{});
    z.collectibles=(zone&&zone.collectibles)||DEFAULT_ZONE.collectibles.slice();
    z.interactables=(zone&&zone.interactables)||DEFAULT_ZONE.interactables.slice();
    z.ambientEvents=(zone&&zone.ambientEvents)||DEFAULT_ZONE.ambientEvents.slice();
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
        '<div><b id="gfAdvTitle">Ember Hollow</b><span id="gfAdvSub">Explore with your companion.</span></div>',
        '<div class="gfAdvControls"><span id="gfAdvStats">0 shards</span><button id="gfAdvComplete" class="primary">Return Home</button><button id="gfAdvClose">Leave</button></div>',
      '</div>',
      '<div class="gfAdventureScene" id="gfAdvScene">',
        '<div class="gfAdvSky"></div><div class="gfAdvGlow"></div>',
        '<div class="gfAdventureWorld" id="gfAdvWorld"></div>',
        '<div class="gfAdvPrompt" id="gfAdvPrompt">Move with ← → / A D, jump with Space, interact with E.</div>',
      '</div>',
      '<div class="gfAdventureBottom">',
        '<span>Cozy Adventure v1</span><span>Collect fragments, discover story objects, and bring rewards home.</span>',
      '</div>'
    ].join('');
    document.body.appendChild(engine.root);
    engine.world=document.getElementById('gfAdvWorld');
    engine.hud=document.getElementById('gfAdvStats');
    engine.prompt=document.getElementById('gfAdvPrompt');
    document.getElementById('gfAdvClose').onclick=function(){stop(false)};
    document.getElementById('gfAdvComplete').onclick=function(){complete()};
    window.addEventListener('keydown',onKey,true);
    window.addEventListener('keyup',onKey,true);
    engine.mounted=true;
  }

  function start(options){
    mount(options||{});
    engine.zone=mergeZone((options&&options.zone)||{});
    engine.callbacks=(options&&options.callbacks)||engine.callbacks||{};
    engine.pet=(options&&options.pet)||{};
    engine.collected={};
    engine.touched={};
    engine.discoveries={};
    engine.startedAt=Date.now();
    engine.lastAmbientAt=Date.now();
    engine.cameraX=0;
    engine.state={x:engine.zone.player.x,y:0,vx:0,vy:0,onGround:true,facing:1};
    document.getElementById('gfAdvTitle').innerText=engine.zone.name;
    document.getElementById('gfAdvSub').innerText=engine.zone.subtitle||'Explore with your companion.';
    renderWorld();
    engine.root.classList.remove('hidden');
    engine.running=true;
    engine.raf=requestAnimationFrame(loop);
    say('Move with ← → / A D. Jump with Space. Press E near glowing objects.');
    if(engine.callbacks.onStart)engine.callbacks.onStart(engine.zone);
  }

  function renderWorld(){
    var z=engine.zone;
    var html='<div class="gfAdvGround"></div><div class="gfAdvBackHill one"></div><div class="gfAdvBackHill two"></div>';
    html+='<div id="gfAdvPlayer" class="gfAdvPlayer"><div class="body"></div></div>';
    html+='<div id="gfAdvPet" class="gfAdvPet">'+petMarkup(engine.pet)+'</div>';
    z.collectibles.forEach(function(c){
      html+='<button class="gfAdvCollectible" data-cid="'+esc(c.id)+'" style="left:'+num(c.x)+'px;bottom:'+num(c.y)+'px">'+esc(c.emoji||'✦')+'</button>';
    });
    z.interactables.forEach(function(o){
      html+='<button class="gfAdvThing '+esc(o.kind||'thing')+'" data-iid="'+esc(o.id)+'" style="left:'+num(o.x)+'px;bottom:'+num(o.y)+'px"><span>'+esc(o.emoji||'✨')+'</span></button>';
    });
    html+='<div class="gfAdvExit" style="left:'+num(z.exitX||1500)+'px"><b>Home Trail</b><span>Return when ready</span></div>';
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
    updateHud();
  }

  function petMarkup(pet){
    pet=pet||{};
    var src=pet.asset||pet.image||'';
    var emoji=pet.emoji||'🐾';
    if(src)return '<img src="'+esc(src)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-block\'"><span style="display:none">'+esc(emoji)+'</span>';
    return '<span>'+esc(emoji)+'</span>';
  }

  function loop(){
    if(!engine.running)return;
    step();
    draw();
    engine.raf=requestAnimationFrame(loop);
  }

  function step(){
    var p=engine.state,z=engine.zone.player;
    var left=engine.keys.ArrowLeft||engine.keys.a||engine.keys.A;
    var right=engine.keys.ArrowRight||engine.keys.d||engine.keys.D;
    if(left&&!right){p.vx=-z.speed;p.facing=-1;}
    else if(right&&!left){p.vx=z.speed;p.facing=1;}
    else p.vx*=.78;
    if((engine.keys[' ']||engine.keys.Spacebar||engine.keys.w||engine.keys.W||engine.keys.ArrowUp)&&p.onGround){p.vy=z.jump;p.onGround=false;}
    p.vy-=z.gravity;
    p.x+=p.vx;
    p.y+=p.vy;
    if(p.y<=0){p.y=0;p.vy=0;p.onGround=true;}
    p.x=Math.max(28,Math.min(engine.zone.width-50,p.x));
    if(engine.keys.e||engine.keys.E)tryNearbyInteraction();
    autoCollectNearby();
    maybeAmbient();
  }

  function draw(){
    var scene=document.getElementById('gfAdvScene');
    var viewport=scene?scene.clientWidth:900;
    var p=engine.state;
    engine.cameraX=Math.max(0,Math.min(engine.zone.width-viewport,p.x-viewport*.44));
    engine.world.style.transform='translateX('+(-engine.cameraX)+'px)';
    engine.playerEl.style.left=p.x+'px';
    engine.playerEl.style.bottom=(114+p.y)+'px';
    engine.playerEl.style.transform='scaleX('+p.facing+')';
    var pet=engine.petEl;
    var petX=p.x-(engine.zone.pet.followDistance*p.facing);
    var bob=Math.sin(Date.now()/240)*3;
    pet.style.left=petX+'px';
    pet.style.bottom=(104+p.y*.72+(engine.zone.pet.offsetY||0)+bob)+'px';
    pet.style.transform='scaleX('+p.facing+')';
  }

  function autoCollectNearby(){
    var p=engine.state;
    engine.zone.collectibles.forEach(function(c){
      if(engine.collected[c.id])return;
      if(Math.abs(p.x-c.x)<46&&Math.abs((114+p.y)-c.y)<120)collect(c.id);
    });
  }

  function collect(id){
    if(engine.collected[id])return;
    var c=engine.zone.collectibles.filter(function(x){return x.id===id})[0];
    if(!c)return;
    engine.collected[id]=c.type||'ember_shard';
    var node=engine.world.querySelector('[data-cid="'+cssEscape(id)+'"]');
    if(node)node.classList.add('taken');
    say('Collected '+friendly(c.type||'ember shard')+'.');
    updateHud();
    if(engine.callbacks.onCollect)engine.callbacks.onCollect(c);
  }

  function tryNearbyInteraction(){
    var p=engine.state;
    var nearest=null,dist=9999;
    engine.zone.interactables.forEach(function(o){
      var d=Math.abs(p.x-o.x);
      if(d<dist){dist=d;nearest=o;}
    });
    if(nearest&&dist<72)interact(nearest.id);
  }

  function interact(id){
    var o=engine.zone.interactables.filter(function(x){return x.id===id})[0];
    if(!o)return;
    if(engine.touched[id]&&o.kind!=='sign'&&o.kind!=='npc')return say('You already checked this spot.');
    engine.touched[id]=true;
    if(o.discoveryId)engine.discoveries[o.discoveryId]=true;
    var node=engine.world.querySelector('[data-iid="'+cssEscape(id)+'"]');
    if(node)node.classList.add('used');
    say((o.title?o.title+': ':'')+(o.text||'Your pet notices something interesting.'));
    updateHud();
    if(engine.callbacks.onInteract)engine.callbacks.onInteract(o);
  }

  function maybeAmbient(){
    if(Date.now()-engine.lastAmbientAt<11500)return;
    engine.lastAmbientAt=Date.now();
    var list=engine.zone.ambientEvents||[];
    if(list.length&&Math.random()<.65)say(list[Math.floor(Math.random()*list.length)]);
  }

  function complete(){
    if(!engine.running)return;
    var payload=getPayload();
    stop(true);
    if(engine.callbacks.onComplete)engine.callbacks.onComplete(payload);
  }

  function stop(completed){
    if(!engine.running)return;
    engine.running=false;
    cancelAnimationFrame(engine.raf);
    engine.root.classList.add('hidden');
    if(!completed&&engine.callbacks.onCancel)engine.callbacks.onCancel();
  }

  function getPayload(){
    var counts={};
    Object.keys(engine.collected).forEach(function(k){counts[engine.collected[k]]=(counts[engine.collected[k]]||0)+1;});
    return {
      zoneId:engine.zone.id,
      durationMs:Date.now()-engine.startedAt,
      collected:counts,
      collectedIds:Object.keys(engine.collected),
      interactions:Object.keys(engine.touched),
      discoveries:Object.keys(engine.discoveries)
    };
  }

  function updateHud(){
    var count=Object.keys(engine.collected).length;
    var disc=Object.keys(engine.discoveries).length;
    engine.hud.innerText=count+' shard'+(count===1?'':'s')+' · '+disc+' discover'+(disc===1?'y':'ies');
  }

  function say(text){
    if(!engine.prompt)return;
    engine.prompt.innerText=text;
    engine.prompt.classList.remove('pulse');
    void engine.prompt.offsetWidth;
    engine.prompt.classList.add('pulse');
  }

  function onKey(e){
    if(!engine.running)return;
    if(['ArrowLeft','ArrowRight','ArrowUp',' ','Spacebar','a','A','d','D','w','W','e','E'].indexOf(e.key)>=0){
      engine.keys[e.key]=e.type==='keydown';
      if(e.key==='e'||e.key==='E')e.preventDefault();
    }
  }

  function injectStyles(){
    if(document.getElementById('gfAdventureStyles'))return;
    var s=document.createElement('style');
    s.id='gfAdventureStyles';
    s.textContent='\
.gfAdventure{position:fixed;inset:0;z-index:96;background:linear-gradient(180deg,#261b31,#44231d 58%,#160f16);color:white;display:grid;grid-template-rows:auto minmax(0,1fr) auto;font-family:Arial,Helvetica,sans-serif}.gfAdventure.hidden{display:none}.gfAdventureTop,.gfAdventureBottom{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:rgba(15,23,42,.58);backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.14)}.gfAdventureBottom{border-top:1px solid rgba(255,255,255,.14);border-bottom:0;color:#cbd5e1;font-size:12px;font-weight:900}.gfAdventureTop b{display:block;font-size:22px;letter-spacing:-.5px}.gfAdventureTop span{display:block;color:#fed7aa;font-size:12px;font-weight:900;margin-top:2px}.gfAdvControls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.gfAdvControls button{border:0;border-radius:999px;padding:9px 13px;font-weight:1000;cursor:pointer;background:rgba(255,255,255,.16);color:white;border:1px solid rgba(255,255,255,.18)}.gfAdvControls button.primary{background:linear-gradient(135deg,#f59e0b,#f97316);color:#1f1300}.gfAdvControls #gfAdvStats{padding:8px 11px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);color:#fff}.gfAdventureScene{position:relative;overflow:hidden;min-height:0;background:radial-gradient(circle at 50% 18%,rgba(251,191,36,.24),transparent 27%),linear-gradient(180deg,#312e81 0%,#7c2d12 66%,#1c1917 100%)}.gfAdvSky,.gfAdvGlow{position:absolute;inset:0;pointer-events:none}.gfAdvSky{background:radial-gradient(circle at 16% 22%,rgba(255,255,255,.18),transparent 4%),radial-gradient(circle at 72% 14%,rgba(255,237,213,.28),transparent 5%),radial-gradient(circle at 38% 18%,rgba(255,255,255,.16),transparent 3%);opacity:.8}.gfAdvGlow{background:radial-gradient(circle at 75% 73%,rgba(249,115,22,.42),transparent 24%),radial-gradient(circle at 28% 82%,rgba(250,204,21,.22),transparent 18%);animation:gfGlow 4s ease-in-out infinite}.gfAdventureWorld{position:absolute;left:0;bottom:0;height:100%;transition:transform .04s linear;will-change:transform}.gfAdvGround{position:absolute;left:0;right:0;bottom:0;height:132px;background:linear-gradient(180deg,#78350f,#292524);box-shadow:0 -18px 55px rgba(249,115,22,.16)}.gfAdvGround:before{content:"";position:absolute;left:0;right:0;top:-28px;height:38px;background:radial-gradient(ellipse at 20% 30%,#92400e 0 36%,transparent 37%),radial-gradient(ellipse at 55% 50%,#a16207 0 30%,transparent 31%),radial-gradient(ellipse at 82% 35%,#78350f 0 34%,transparent 35%);opacity:.9}.gfAdvBackHill{position:absolute;bottom:92px;width:680px;height:190px;border-radius:50% 50% 0 0;background:rgba(67,56,202,.22);filter:blur(.2px)}.gfAdvBackHill.one{left:70px}.gfAdvBackHill.two{left:820px;background:rgba(124,45,18,.28)}.gfAdvPlayer{position:absolute;width:42px;height:74px;z-index:8;transform-origin:center bottom;transition:filter .15s}.gfAdvPlayer .body{position:absolute;inset:0;border-radius:20px 20px 14px 14px;background:linear-gradient(180deg,#e0f2fe,#38bdf8 56%,#1d4ed8);border:2px solid rgba(255,255,255,.76);box-shadow:0 16px 24px rgba(0,0,0,.28)}.gfAdvPlayer .body:before{content:"";position:absolute;left:9px;right:9px;top:-16px;height:26px;border-radius:50%;background:#ffedd5;border:2px solid rgba(255,255,255,.8)}.gfAdvPet{position:absolute;width:82px;height:82px;z-index:7;display:flex;align-items:center;justify-content:center;transition:filter .15s;transform-origin:center bottom}.gfAdvPet img{max-width:82px;max-height:82px;object-fit:contain;filter:drop-shadow(0 14px 12px rgba(0,0,0,.28));animation:gfPetBob .9s ease-in-out infinite}.gfAdvPet span{font-size:54px;filter:drop-shadow(0 14px 12px rgba(0,0,0,.28));animation:gfPetBob .9s ease-in-out infinite}.gfAdvCollectible,.gfAdvThing{position:absolute;z-index:6;border:0;background:transparent;color:white;cursor:pointer;transform:translate(-50%,0);font-size:34px;filter:drop-shadow(0 10px 10px rgba(0,0,0,.35));transition:.18s ease}.gfAdvCollectible{animation:gfShard 1.35s ease-in-out infinite}.gfAdvCollectible.taken{opacity:0;transform:translate(-50%,-34px) scale(1.5);pointer-events:none}.gfAdvThing{font-size:42px}.gfAdvThing:hover,.gfAdvCollectible:hover{transform:translate(-50%,-8px) scale(1.08)}.gfAdvThing.used:not(.npc):not(.sign){opacity:.55;filter:grayscale(.2) drop-shadow(0 10px 10px rgba(0,0,0,.35))}.gfAdvExit{position:absolute;bottom:116px;width:145px;min-height:68px;border-radius:18px;background:rgba(15,23,42,.56);border:1px solid rgba(255,255,255,.22);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:white;font-weight:1000;box-shadow:0 18px 36px rgba(0,0,0,.24)}.gfAdvExit span{font-size:11px;color:#fed7aa}.gfAdvPrompt{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);width:min(760px,calc(100% - 32px));background:rgba(15,23,42,.76);border:1px solid rgba(255,255,255,.20);border-radius:20px;padding:12px 15px;text-align:center;font-weight:1000;color:#fff;box-shadow:0 18px 45px rgba(0,0,0,.24)}.gfAdvPrompt.pulse{animation:gfPrompt .32s ease}.gfAdventure button:focus-visible{outline:3px solid rgba(255,255,255,.8);outline-offset:2px}@keyframes gfGlow{0%,100%{opacity:.75}50%{opacity:1}}@keyframes gfPetBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes gfShard{0%,100%{transform:translate(-50%,0) rotate(-8deg)}50%{transform:translate(-50%,-9px) rotate(8deg)}}@keyframes gfPrompt{0%{transform:translateX(-50%) scale(.98)}70%{transform:translateX(-50%) scale(1.015)}100%{transform:translateX(-50%) scale(1)}}@media(max-width:800px){.gfAdventureTop{align-items:flex-start;flex-direction:column}.gfAdvControls{justify-content:flex-start}.gfAdventureTop b{font-size:18px}.gfAdventureBottom{display:none}.gfAdvPrompt{bottom:12px;font-size:12px}.gfAdvThing{font-size:36px}}';
    document.head.appendChild(s);
  }

  function num(v){return Number(v||0)}
  function friendly(s){return String(s||'item').replace(/_/g,' ')}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function cssEscape(s){return String(s).replace(/"/g,'\\"')}

  window.PetWorldAdventureEngine={mount:mount,start:start,stop:stop,isRunning:function(){return engine.running;}};
})();
