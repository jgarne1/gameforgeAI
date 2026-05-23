/*
  GameForge AI Sunny Meadows Engine v1
  Purpose: separate top-down vertical-slice region for testing the polished PetWorld direction.
  - Leaves Ember Hollow / existing Adventure engine intact.
  - Focuses on smooth top-down movement, handcrafted-feeling spaces, calm atmosphere, and fishing as a world system.
  - Server remains authoritative for rewards through /api/pet/adventure/complete using zoneId=sunny_meadows.
*/
(function(){
  'use strict';

  var WORLD_W=3200, WORLD_H=1800;
  var engine={mounted:false,running:false,root:null,world:null,scene:null,petEl:null,prompt:null,hud:null,fishUi:null,completeEl:null,
    callbacks:{},pet:null,gear:{},keys:{},state:null,camera:{x:0,y:0},raf:0,lastTime:0,near:null,caughtFish:[],collected:{},discoveries:{},spots:{},touchTarget:null,mode:'explore',fish:null,startedAt:0,lastAmbientAt:0};

  var MEADOW={
    id:'sunny_meadows', name:'Sunny Meadows',
    intro:'Sunny Meadows is quiet, but the water keeps making circles where no wind is blowing.',
    exit:{x:2860,y:1430,w:230,h:160,label:'Home Trail'},
    spawn:{x:220,y:1360},
    ponds:[
      {id:'willow_pond',name:'Willow Pond',x:715,y:1115,w:480,h:270,kind:'pond',hint:'soft ripples under the willow',fish:['fish_meadow_darter','fish_sun_pip','fish_clover_carp']},
      {id:'hidden_spring',name:'Hidden Spring',x:1765,y:405,w:430,h:240,kind:'spring',hidden:true,hint:'a quiet pool behind tall flowers',fish:['fish_sun_pip','fish_glass_gill','fish_honeyfin']},
      {id:'mill_creek',name:'Mill Creek',x:2180,y:1110,w:630,h:175,kind:'creek',hint:'running water near the old mill',fish:['fish_meadow_darter','fish_brook_blinker','fish_clover_carp']}
    ],
    pickups:[
      {id:'dew_1',type:'sunny_dew',x:485,y:1280,icon:'✦',text:'Sunny Dew'},
      {id:'dew_2',type:'sunny_dew',x:1045,y:925,icon:'✦',text:'Sunny Dew'},
      {id:'dew_3',type:'sunny_dew',x:1560,y:645,icon:'✦',text:'Sunny Dew'},
      {id:'dew_4',type:'sunny_dew',x:2320,y:930,icon:'✦',text:'Sunny Dew'},
      {id:'dew_5',type:'sunny_dew',x:2685,y:1320,icon:'✦',text:'Sunny Dew'},
      {id:'meadow_charm',type:'keyItem',x:1835,y:510,icon:'🌼',text:'Meadow Charm',keyItem:'meadow_charm'}
    ],
    discoveries:[
      {id:'old_windmill',x:2380,y:775,r:95,title:'Old Windmill',text:'The old mill turns once, even though the air is still.'},
      {id:'willow_tracks',x:620,y:1010,r:80,title:'Tiny Tracks',text:'Small pawprints vanish at the edge of Willow Pond.'},
      {id:'hidden_spring_found',x:1715,y:470,r:90,title:'Hidden Spring',text:'The flowers part just enough to reveal a secret fishing spring.'}
    ]
  };

  var FISH={
    fish_meadow_darter:{name:'Meadow Darter',rarity:'common',value:5,behavior:'quick',icon:'🐟'},
    fish_sun_pip:{name:'Sun Pip',rarity:'common',value:6,behavior:'gentle',icon:'🐠'},
    fish_clover_carp:{name:'Clover Carp',rarity:'uncommon',value:12,behavior:'steady',icon:'🐟'},
    fish_brook_blinker:{name:'Brook Blinker',rarity:'uncommon',value:14,behavior:'quick',icon:'🐟'},
    fish_glass_gill:{name:'Glass Gill',rarity:'rare',value:24,behavior:'shy',icon:'🐠'},
    fish_honeyfin:{name:'Honeyfin',rarity:'rare',value:28,behavior:'gentle',icon:'🐡'}
  };

  function mount(options){
    if(engine.mounted)return;
    engine.callbacks=(options&&options.callbacks)||{};
    injectStyles();
    engine.root=document.createElement('div');
    engine.root.id='gfSunnyRoot';
    engine.root.className='gfSunny hidden';
    engine.root.innerHTML=[
      '<div class="sunTop"><div><b>Sunny Meadows</b><span id="sunSub">A calmer PetWorld vertical slice.</span></div><div class="sunTopActions"><span id="sunHud">0 dew • 0 fish</span><button id="sunReturn" class="primary">Return Home</button><button id="sunLeave">Leave</button></div></div>',
      '<div class="sunScene" id="sunScene"><div class="sunWorld" id="sunWorld"></div><div class="sunPrompt" id="sunPrompt">Explore the meadow. Watch water for ripples.</div><div class="sunFishUi hidden" id="sunFishUi"></div><div class="sunComplete hidden" id="sunComplete"></div></div>'
    ].join('');
    document.body.appendChild(engine.root);
    engine.scene=document.getElementById('sunScene');engine.world=document.getElementById('sunWorld');engine.prompt=document.getElementById('sunPrompt');engine.hud=document.getElementById('sunHud');engine.fishUi=document.getElementById('sunFishUi');engine.completeEl=document.getElementById('sunComplete');
    document.getElementById('sunLeave').onclick=function(){stop(false)};
    document.getElementById('sunReturn').onclick=function(){complete()};
    window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKey,true);
    setupPointer();
    engine.mounted=true;
  }

  function start(options){
    mount(options||{});
    engine.callbacks=(options&&options.callbacks)||engine.callbacks||{};
    engine.pet=(options&&options.pet)||{};
    engine.gear=(options&&options.fishingGear&&options.fishingGear.inventory)||{};
    engine.state={x:MEADOW.spawn.x,y:MEADOW.spawn.y,vx:0,vy:0,facing:1};
    engine.camera={x:0,y:0};engine.keys={};engine.caughtFish=[];engine.collected={};engine.discoveries={};engine.spots={};engine.near=null;engine.mode='explore';engine.fish=null;engine.startedAt=Date.now();engine.lastAmbientAt=Date.now();engine.touchTarget=null;
    document.getElementById('sunSub').innerText=MEADOW.intro;
    renderWorld();
    engine.root.classList.remove('hidden');engine.fishUi.classList.add('hidden');engine.completeEl.classList.add('hidden');engine.running=true;engine.lastTime=performance.now();engine.raf=requestAnimationFrame(loop);
    say('Sunny Meadows is open. Move freely, follow ripples, and fish where the water feels alive.');
    if(engine.callbacks.onStart)engine.callbacks.onStart(MEADOW);
  }

  function renderWorld(){
    var html='';
    html+='<div class="sunBgLayer glow"></div><div class="sunBgLayer hills"></div><div class="sunPath main"></div><div class="sunPath creekPath"></div>';
    html+='<div class="sunLandmark camp" style="left:140px;top:1280px"><i></i><b>Meadow Gate</b></div>';
    html+='<div class="sunLandmark windmill" style="left:2280px;top:610px"><i></i><b>Old Windmill</b></div>';
    html+='<div class="sunLandmark willow" style="left:570px;top:840px"><i></i><b>Willow Pond</b></div>';
    html+='<div class="sunLandmark flowers" style="left:1530px;top:330px"><i></i><b>Flower Wall</b></div>';
    MEADOW.ponds.forEach(function(p){html+='<div class="sunPond '+esc(p.kind)+' '+(p.hidden?'hiddenPond':'')+'" data-pond="'+esc(p.id)+'" style="left:'+p.x+'px;top:'+p.y+'px;width:'+p.w+'px;height:'+p.h+'px"><span></span><em></em></div>';});
    MEADOW.pickups.forEach(function(p){html+='<button class="sunPickup" data-pickup="'+esc(p.id)+'" style="left:'+p.x+'px;top:'+p.y+'px"><span>'+esc(p.icon)+'</span></button>';});
    MEADOW.discoveries.forEach(function(d){html+='<div class="sunDiscovery" data-disc="'+esc(d.id)+'" style="left:'+(d.x-d.r)+'px;top:'+(d.y-d.r)+'px;width:'+(d.r*2)+'px;height:'+(d.r*2)+'px"></div>';});
    html+='<div class="sunExit" style="left:'+MEADOW.exit.x+'px;top:'+MEADOW.exit.y+'px;width:'+MEADOW.exit.w+'px;height:'+MEADOW.exit.h+'px"><b>'+esc(MEADOW.exit.label)+'</b><span>return when ready</span></div>';
    for(var i=0;i<38;i++){html+='<div class="sunFlower f'+(i%5)+'" style="left:'+(220+(i*73)%2800)+'px;top:'+(260+(i*137)%1280)+'px"></div>';}
    for(var t=0;t<20;t++){html+='<div class="sunTree" style="left:'+(80+(t*151)%3000)+'px;top:'+(170+(t*199)%1400)+'px"></div>';}
    html+='<div id="sunPet" class="sunPet">'+petMarkup(engine.pet)+'</div>';
    engine.world.innerHTML=html;engine.petEl=document.getElementById('sunPet');
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-pickup]'),function(btn){btn.onclick=function(){collectPickup(btn.getAttribute('data-pickup'))};});
    updateHud();
  }

  function loop(ts){
    if(!engine.running)return;
    var dt=Math.min(32,ts-engine.lastTime||16)/16.666;engine.lastTime=ts;
    if(engine.mode==='explore'){updateMovement(dt);checkNearby();checkPickups();checkDiscoveries();checkExit();maybeAmbient();}
    else if(engine.mode==='fishing'){updateFishing(dt);}
    updateCamera(dt);updatePet();
    engine.raf=requestAnimationFrame(loop);
  }

  function updateMovement(dt){
    var s=engine.state, ax=0, ay=0;
    if(engine.keys.ArrowLeft||engine.keys.KeyA)ax-=1;if(engine.keys.ArrowRight||engine.keys.KeyD)ax+=1;if(engine.keys.ArrowUp||engine.keys.KeyW)ay-=1;if(engine.keys.ArrowDown||engine.keys.KeyS)ay+=1;
    if(engine.touchTarget){var dx=engine.touchTarget.x-s.x,dy=engine.touchTarget.y-s.y,d=Math.sqrt(dx*dx+dy*dy);if(d>16){ax=dx/d;ay=dy/d;}else engine.touchTarget=null;}
    var len=Math.sqrt(ax*ax+ay*ay)||1;ax/=len;ay/=len;
    var max=4.2, accel=.28, friction=.82;
    s.vx+=(ax*max-s.vx)*accel*dt;s.vy+=(ay*max-s.vy)*accel*dt;
    if(Math.abs(ax)+Math.abs(ay)<.05){s.vx*=Math.pow(friction,dt);s.vy*=Math.pow(friction,dt);}else if(Math.abs(ax)>0.05)s.facing=ax>0?1:-1;
    s.x=clamp(s.x+s.vx*dt,90,WORLD_W-90);s.y=clamp(s.y+s.vy*dt,110,WORLD_H-105);
    avoidPondCenters();
  }

  function avoidPondCenters(){
    var s=engine.state;
    MEADOW.ponds.forEach(function(p){
      var cx=p.x+p.w/2,cy=p.y+p.h/2,rx=p.w*.42,ry=p.h*.40,dx=s.x-cx,dy=s.y-cy,v=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry);
      if(v<1){var a=Math.atan2(dy/ry,dx/rx);s.x=cx+Math.cos(a)*rx;s.y=cy+Math.sin(a)*ry;s.vx*=.35;s.vy*=.35;}
    });
  }

  function checkNearby(){
    var s=engine.state,near=null,best=9999;
    MEADOW.ponds.forEach(function(p){var cx=p.x+p.w/2,cy=p.y+p.h/2,d=dist(s.x,s.y,cx,cy);if(d<Math.max(p.w,p.h)*.68&&d<best){near={type:'pond',obj:p};best=d;}});
    if(near&&near.type==='pond'){
      var p=near.obj;say('Ripples at '+p.name+'. Press Space or tap Fish to cast.');showFishButton(p);
    }else{hideFishButton();}
    engine.near=near;
  }

  function showFishButton(pond){
    if(engine.fishUi.classList.contains('hidden'))engine.fishUi.classList.remove('hidden');
    if(engine.fishUi.getAttribute('data-mode')==='fishing')return;
    engine.fishUi.setAttribute('data-mode','ready');
    engine.fishUi.innerHTML='<div class="fishReady"><div><b>🎣 '+esc(pond.name)+'</b><span>'+esc(pond.hint||'fish shadows move below')+'</span></div><button id="sunCast">Cast</button></div>';
    var b=document.getElementById('sunCast');if(b)b.onclick=function(){beginFishing(pond)};
  }
  function hideFishButton(){if(engine.mode!=='fishing'){engine.fishUi.classList.add('hidden');engine.fishUi.removeAttribute('data-mode');}}

  function beginFishing(pond){
    engine.mode='fishing';engine.touchTarget=null;engine.state.vx=0;engine.state.vy=0;
    var chosen=chooseFish(pond);var f=FISH[chosen]||FISH.fish_meadow_darter;
    engine.fish={pond:pond,fishId:chosen,fish:f,phase:'cast',t:0,marker:Math.random(),dir:1,progress:34,tension:48,hooked:false};
    engine.fishUi.classList.remove('hidden');engine.fishUi.setAttribute('data-mode','fishing');
    renderFishing();say('Cast when the marker crosses the bright water.');
  }

  function updateFishing(dt){
    var f=engine.fish;if(!f)return;
    f.t+=dt;
    if(f.phase==='cast'){f.marker+=f.dir*.018*dt;if(f.marker>1){f.marker=1;f.dir=-1;}if(f.marker<0){f.marker=0;f.dir=1;}renderFishing();}
    else if(f.phase==='reel'){
      var pull=f.fish.behavior==='quick'?1.25:f.fish.behavior==='shy'?1.05:.88;
      f.tension+=((Math.sin(f.t*.24)+.2)*1.4*pull);
      f.tension=clamp(f.tension,8,92);
      f.progress-=.12*pull*dt;
      if(f.progress<=0)finishFishing(false);
      renderFishing();
    }
  }

  function fishAction(){
    if(engine.mode!=='fishing'){if(engine.near&&engine.near.type==='pond')beginFishing(engine.near.obj);return;}
    var f=engine.fish;if(!f)return;
    if(f.phase==='cast'){
      var good=f.marker>.38&&f.marker<.66;
      f.phase='reel';f.progress=good?48:28;f.tension=good?44:62;say(good?'Hooked! Keep the tension steady.':'Weak hook — reel carefully.');renderFishing();return;
    }
    if(f.phase==='reel'){
      f.progress+=7;f.tension-=9;
      if(f.tension<18){f.progress-=8;f.tension=24;say('Too slack — the fish is slipping!');}
      if(f.tension>82){f.progress-=10;f.tension=72;say('Too tight — ease up!');}
      if(f.progress>=100)finishFishing(true);
      else renderFishing();
    }
  }

  function renderFishing(){
    var f=engine.fish;if(!f)return;
    if(f.phase==='cast'){
      engine.fishUi.innerHTML='<div class="fishPanel"><div class="fishHead"><b>Cast into '+esc(f.pond.name)+'</b><button id="fishCancel">Cancel</button></div><div class="castTrack"><i></i><span style="left:'+(f.marker*100)+'%"></span></div><button id="fishAction">Cast</button><p>Hit the bright water for a clean hook.</p></div>';
    }else{
      engine.fishUi.innerHTML='<div class="fishPanel"><div class="fishHead"><b>Something is pulling...</b><button id="fishCancel">Cancel</button></div><div class="tension"><span style="width:'+f.tension+'%"></span><i></i></div><div class="catchProgress"><span style="width:'+f.progress+'%"></span></div><button id="fishAction">Reel</button><p>Tap Reel to gain line. Keep tension out of the edges.</p></div>';
    }
    var a=document.getElementById('fishAction'),c=document.getElementById('fishCancel');if(a)a.onclick=fishAction;if(c)c.onclick=function(){finishFishing(false,true)};
  }

  function finishFishing(success,cancelled){
    var f=engine.fish;if(!f)return;
    if(success){engine.caughtFish.push({id:f.fishId,pond:f.pond.id});engine.spots[f.pond.id]=true;say('Caught '+f.fish.name+'!');pop(f.fish.icon+' '+f.fish.name,engine.state.x,engine.state.y-60,'good');}
    else if(!cancelled){say('The fish slipped away. The ripples settle again.');pop('Slipped away',engine.state.x,engine.state.y-60,'bad');}
    engine.mode='explore';engine.fish=null;engine.fishUi.classList.add('hidden');engine.fishUi.removeAttribute('data-mode');updateHud();
  }

  function chooseFish(pond){
    var list=pond.fish.slice();
    var inv=engine.gear||{};
    if(inv.glow_lure&&pond.id==='hidden_spring')list.push('fish_glass_gill','fish_honeyfin');
    if(inv.root_worm&&pond.id==='mill_creek')list.push('fish_brook_blinker');
    var roll=Math.random();
    if(roll>.86&&list.length>2)return list[list.length-1];
    if(roll>.62&&list.length>1)return list[1];
    return list[0];
  }

  function checkPickups(){MEADOW.pickups.forEach(function(p){if(engine.collected[p.id])return;if(dist(engine.state.x,engine.state.y,p.x,p.y)<46)collectPickup(p.id);});}
  function collectPickup(id){var p=find(MEADOW.pickups,id);if(!p||engine.collected[id])return;engine.collected[id]=true;var n=engine.world.querySelector('[data-pickup="'+css(id)+'"]');if(n)n.classList.add('taken');if(p.keyItem)engine.discoveries[p.keyItem]=true;else engine.collected[p.type]=Number(engine.collected[p.type]||0)+1;say('Collected '+p.text+'.');pop(p.icon+' '+p.text,p.x,p.y-35,'good');updateHud();}
  function checkDiscoveries(){MEADOW.discoveries.forEach(function(d){if(engine.discoveries[d.id])return;if(dist(engine.state.x,engine.state.y,d.x,d.y)<d.r){engine.discoveries[d.id]=true;say(d.title+': '+d.text);pop('Discovery',d.x,d.y-60,'info');}});}
  function checkExit(){var e=MEADOW.exit;if(engine.state.x>e.x&&engine.state.x<e.x+e.w&&engine.state.y>e.y&&engine.state.y<e.y+e.h){showComplete();}}
  function showComplete(){if(!engine.completeEl.classList.contains('hidden'))return;engine.completeEl.innerHTML='<div class="sunCard"><h2>Sunny Meadows</h2><p>Your pet carries meadow dew, fishing stories, and quiet ripples home.</p><div><span>'+Number(engine.collected.sunny_dew||0)+' Dew</span><span>'+engine.caughtFish.length+' Fish</span><span>'+Object.keys(engine.discoveries).length+' Discoveries</span></div><button id="sunFinish" class="primary">Return Home</button><button id="sunStay">Keep Exploring</button></div>';engine.completeEl.classList.remove('hidden');document.getElementById('sunFinish').onclick=complete;document.getElementById('sunStay').onclick=function(){engine.completeEl.classList.add('hidden');engine.state.x-=120;};}

  function complete(){
    var payload={zoneId:'sunny_meadows',collected:{sunny_dew:Number(engine.collected.sunny_dew||0)},caughtFish:engine.caughtFish.slice(0,20),discoveries:Object.keys(engine.discoveries),keyItems:Object.keys(engine.discoveries).filter(function(k){return k==='meadow_charm'}),stats:{goalReached:true,hazardsHit:0,puzzlesSolved:Object.keys(engine.spots).length},durationMs:Date.now()-engine.startedAt};
    stop(true,payload);
  }
  function stop(done,payload){if(!engine.running)return;engine.running=false;cancelAnimationFrame(engine.raf);engine.root.classList.add('hidden');engine.mode='explore';if(done&&engine.callbacks.onComplete)engine.callbacks.onComplete(payload||{});if(!done&&engine.callbacks.onCancel)engine.callbacks.onCancel();}

  function updateCamera(dt){var sw=engine.scene.clientWidth||900,sh=engine.scene.clientHeight||600;var tx=clamp(engine.state.x-sw*.5,0,WORLD_W-sw),ty=clamp(engine.state.y-sh*.52,0,WORLD_H-sh);engine.camera.x+=(tx-engine.camera.x)*.10*dt;engine.camera.y+=(ty-engine.camera.y)*.10*dt;engine.world.style.transform='translate('+(-engine.camera.x)+'px,'+(-engine.camera.y)+'px)';}
  function updatePet(){var s=engine.state;engine.petEl.style.left=s.x+'px';engine.petEl.style.top=s.y+'px';engine.petEl.style.setProperty('--face',s.facing);engine.petEl.classList.toggle('moving',Math.abs(s.vx)+Math.abs(s.vy)>1.1);}
  function updateHud(){engine.hud.innerText=Number(engine.collected.sunny_dew||0)+' dew • '+engine.caughtFish.length+' fish • '+Object.keys(engine.discoveries).length+' discoveries';}
  function maybeAmbient(){var now=Date.now();if(now-engine.lastAmbientAt<8500)return;engine.lastAmbientAt=now;var msgs=['Grass moves in waves across the meadow.','Your pet watches a ripple that disappears too quickly.','A bird calls from somewhere near the old windmill.','The water flashes gold for one breath.'];say(msgs[Math.floor(Math.random()*msgs.length)]);}

  function setupPointer(){engine.scene.addEventListener('pointerdown',function(e){if(!engine.running)return;if(e.target&&String(e.target.tagName).toLowerCase()==='button')return;var r=engine.scene.getBoundingClientRect();if(engine.mode==='fishing'){fishAction();return;}engine.touchTarget={x:e.clientX-r.left+engine.camera.x,y:e.clientY-r.top+engine.camera.y};},{passive:false});}
  function onKey(e){if(!engine.running)return;var codes=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','Space','KeyE'];if(codes.indexOf(e.code)<0)return;if(e.type==='keydown'){engine.keys[e.code]=true;if(e.code==='Space'||e.code==='KeyE')fishAction();}else engine.keys[e.code]=false;e.preventDefault();}
  function say(t){engine.prompt.innerText=t;engine.prompt.classList.remove('pulse');void engine.prompt.offsetWidth;engine.prompt.classList.add('pulse');}
  function pop(t,x,y,type){var el=document.createElement('div');el.className='sunPop '+(type||'info');el.innerText=t;el.style.left=(x-engine.camera.x)+'px';el.style.top=(y-engine.camera.y)+'px';engine.scene.appendChild(el);setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},1150);}
  function petMarkup(p){p=p||{};var src=p.asset||p.image||'';if(src)return '<img src="'+esc(src)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'"><span style="display:none">'+esc(p.emoji||'🐾')+'</span>';return '<span>'+esc(p.emoji||'🐾')+'</span>';}
  function find(a,id){return (a||[]).find(function(x){return String(x.id)===String(id);});}
  function dist(a,b,c,d){var x=a-c,y=b-d;return Math.sqrt(x*x+y*y);}function clamp(v,a,b){return Math.max(a,Math.min(b,v));}function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}function css(s){return String(s).replace(/"/g,'\\"')}

  function injectStyles(){if(document.getElementById('gfSunnyStyles'))return;var s=document.createElement('style');s.id='gfSunnyStyles';s.textContent=''
+'.gfSunny{position:fixed;inset:0;z-index:99998;background:#dff7d6;color:#16301d;display:grid;grid-template-rows:auto minmax(0,1fr);font-family:Arial,Helvetica,sans-serif;touch-action:none}.gfSunny.hidden{display:none}.sunTop{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,.76);border-bottom:1px solid rgba(22,101,52,.16);backdrop-filter:blur(14px);box-shadow:0 12px 30px rgba(22,101,52,.12);z-index:5}.sunTop b{display:block;font-size:18px}.sunTop span{font-size:12px;color:#3f6b45;font-weight:800}.sunTopActions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.sunTopActions>span{background:rgba(255,255,255,.72);border:1px solid rgba(22,101,52,.16);border-radius:999px;padding:6px 9px;color:#28522d}.sunTop button,.fishPanel button,.fishReady button,.sunCard button{border:0;border-radius:999px;padding:8px 11px;font-weight:1000;cursor:pointer;background:rgba(22,101,52,.12);color:#16301d}.sunTop button.primary,.fishReady button,.fishPanel button#fishAction,.sunCard .primary{background:linear-gradient(135deg,#22c55e,#facc15);color:#102414}.sunScene{position:relative;overflow:hidden;background:linear-gradient(180deg,#bff5ca,#e9ffd7 54%,#a7e9bd)}.sunWorld{position:absolute;left:0;top:0;width:3200px;height:1800px;will-change:transform;background:radial-gradient(circle at 20% 22%,rgba(255,255,255,.72),transparent 18%),radial-gradient(circle at 70% 18%,rgba(250,204,21,.22),transparent 20%),linear-gradient(135deg,#baf0bd,#ddffce 52%,#98dca7)}.sunBgLayer{position:absolute;inset:0;pointer-events:none}.sunBgLayer.glow{background:radial-gradient(circle at 48% 12%,rgba(250,204,21,.28),transparent 21%),radial-gradient(circle at 80% 80%,rgba(56,189,248,.18),transparent 28%)}.sunBgLayer.hills{opacity:.23;background:radial-gradient(ellipse at 15% 105%,#166534 0 18%,transparent 19%),radial-gradient(ellipse at 48% 110%,#15803d 0 21%,transparent 22%),radial-gradient(ellipse at 82% 105%,#166534 0 18%,transparent 19%)}.sunPath{position:absolute;border-radius:999px;background:rgba(254,243,199,.55);box-shadow:inset 0 0 26px rgba(180,83,9,.08);transform:rotate(-8deg)}.sunPath.main{left:140px;top:1260px;width:2860px;height:180px}.sunPath.creekPath{left:1850px;top:1080px;width:980px;height:120px;transform:rotate(3deg);opacity:.55}.sunPond{position:absolute;border-radius:50%;background:radial-gradient(ellipse at 45% 36%,#dffcff 0 18%,#6dd5ed 42%,#2186a6 76%,#116071 100%);box-shadow:inset 0 0 34px rgba(255,255,255,.6),0 18px 45px rgba(14,116,144,.22);overflow:hidden}.sunPond:before{content:"";position:absolute;inset:16%;border:2px solid rgba(255,255,255,.45);border-radius:50%;animation:sunRipple 2.7s ease-in-out infinite}.sunPond span{position:absolute;left:55%;top:45%;width:42px;height:14px;border-radius:50%;background:rgba(255,255,255,.55);animation:sunFishShadow 3.2s ease-in-out infinite}.sunPond em{position:absolute;left:25%;top:62%;width:64px;height:16px;border-radius:50%;background:rgba(15,118,110,.28);animation:sunFishShadow 4.1s ease-in-out infinite reverse}.sunPond.hiddenPond{filter:saturate(1.15);box-shadow:0 0 0 14px rgba(255,255,255,.16),0 18px 45px rgba(14,116,144,.22)}.sunLandmark{position:absolute;z-index:2;text-align:center;font-size:11px;font-weight:1000;color:#22543d;text-shadow:0 1px 0 rgba(255,255,255,.7);pointer-events:none}.sunLandmark i{display:block;margin:auto;width:74px;height:58px;border-radius:24px;background:rgba(255,255,255,.42);border:1px solid rgba(22,101,52,.16);box-shadow:0 14px 28px rgba(22,101,52,.12)}.sunLandmark.windmill i:before{content:"✦";font-size:40px;color:#f59e0b}.sunLandmark.willow i:before{content:"☘";font-size:42px;color:#16a34a}.sunLandmark.flowers i:before{content:"✿";font-size:42px;color:#ec4899}.sunTree{position:absolute;width:54px;height:54px;border-radius:50%;background:radial-gradient(circle,#22c55e,#15803d);box-shadow:0 8px 0 #854d0e,0 16px 28px rgba(22,101,52,.18);opacity:.72;pointer-events:none}.sunFlower{position:absolute;width:14px;height:14px;border-radius:50%;background:#f472b6;box-shadow:12px 0 #fde68a,-10px 4px #93c5fd,0 12px #fff;opacity:.65;pointer-events:none}.sunFlower.f1{background:#fde68a}.sunFlower.f2{background:#93c5fd}.sunFlower.f3{background:#fb7185}.sunFlower.f4{background:#c4b5fd}.sunPickup{position:absolute;z-index:8;transform:translate(-50%,-50%);border:0;background:transparent;cursor:pointer}.sunPickup span{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:radial-gradient(circle,#fff,#fde68a 58%,rgba(250,204,21,.12));border:1px solid rgba(250,204,21,.55);filter:drop-shadow(0 8px 8px rgba(0,0,0,.12));animation:sunBob 1.5s ease-in-out infinite}.sunPickup.taken{display:none}.sunDiscovery{position:absolute;border-radius:50%;pointer-events:none}.sunExit{position:absolute;border-radius:34px;background:rgba(255,255,255,.58);border:2px solid rgba(22,101,52,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:1000;color:#22543d;box-shadow:0 18px 40px rgba(22,101,52,.13)}.sunExit span{font-size:11px;color:#4d7c0f}.sunPet{position:absolute;z-index:20;width:80px;height:80px;transform:translate(-50%,-50%) scaleX(var(--face,1));display:grid;place-items:center;filter:drop-shadow(0 14px 14px rgba(22,101,52,.22));transition:filter .15s}.sunPet img{max-width:78px;max-height:78px;object-fit:contain}.sunPet span{display:grid;place-items:center;width:74px;height:74px;font-size:48px}.sunPet.moving img,.sunPet.moving span{animation:sunPetWalk .42s ease-in-out infinite}.sunPrompt{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:50;width:min(680px,calc(100% - 28px));text-align:center;background:rgba(255,255,255,.70);border:1px solid rgba(22,101,52,.16);border-radius:999px;padding:7px 12px;font-size:12px;font-weight:1000;color:#22543d;box-shadow:0 12px 28px rgba(22,101,52,.10);pointer-events:none}.sunPrompt.pulse{animation:sunPrompt .25s ease}.sunFishUi{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:55;width:min(620px,calc(100% - 24px));background:rgba(255,255,255,.80);border:1px solid rgba(22,101,52,.16);border-radius:22px;padding:9px;box-shadow:0 18px 45px rgba(22,101,52,.16);backdrop-filter:blur(14px)}.sunFishUi.hidden,.sunComplete.hidden{display:none}.fishReady{display:flex;align-items:center;justify-content:space-between;gap:10px}.fishReady b,.fishHead b{display:block;color:#16301d}.fishReady span,.fishPanel p{font-size:12px;color:#3f6b45;font-weight:800;margin:2px 0 0}.fishPanel{display:grid;gap:8px}.fishHead{display:flex;justify-content:space-between;align-items:center;gap:8px}.castTrack,.tension,.catchProgress{position:relative;height:16px;border-radius:999px;background:rgba(22,101,52,.12);overflow:hidden}.castTrack i{position:absolute;left:38%;top:0;width:28%;height:100%;background:rgba(34,197,94,.42)}.castTrack span{position:absolute;top:-4px;width:10px;height:24px;border-radius:999px;background:#166534;transform:translateX(-50%)}.tension span,.catchProgress span{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#22c55e)}.tension i{position:absolute;left:24%;right:24%;top:3px;bottom:3px;border-radius:999px;border:1px solid rgba(255,255,255,.9)}.sunComplete{position:absolute;inset:0;z-index:70;display:grid;place-items:center;background:rgba(22,101,52,.20);backdrop-filter:blur(5px)}.sunCard{width:min(520px,calc(100% - 32px));background:rgba(255,255,255,.9);border:1px solid rgba(22,101,52,.16);border-radius:28px;padding:22px;box-shadow:0 30px 80px rgba(22,101,52,.22);text-align:center}.sunCard h2{margin:0 0 6px}.sunCard p{color:#3f6b45;font-weight:800}.sunCard div{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:12px 0}.sunCard span{padding:7px 10px;border-radius:999px;background:rgba(34,197,94,.12);font-weight:1000}.sunPop{position:absolute;z-index:75;transform:translate(-50%,-50%);font-weight:1000;text-shadow:0 1px 0 rgba(255,255,255,.7);animation:sunPop 1.1s ease forwards;pointer-events:none}.sunPop.good{color:#166534}.sunPop.bad{color:#b91c1c}.sunPop.info{color:#0f766e}@keyframes sunBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes sunRipple{0%,100%{transform:scale(.88);opacity:.4}50%{transform:scale(1.12);opacity:.85}}@keyframes sunFishShadow{0%,100%{transform:translate(0,0) scale(.8);opacity:.25}50%{transform:translate(34px,-10px) scale(1.15);opacity:.62}}@keyframes sunPetWalk{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-4px) rotate(2deg)}}@keyframes sunPrompt{0%{transform:translateX(-50%) scale(.98)}75%{transform:translateX(-50%) scale(1.015)}100%{transform:translateX(-50%) scale(1)}}@keyframes sunPop{0%{opacity:0;transform:translate(-50%,-35%) scale(.92)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-105%) scale(1.04)}}@media(max-width:760px){.sunTop{align-items:flex-start;flex-direction:column;padding:6px 8px}.sunTop span#sunSub{display:none}.sunTopActions{width:100%;justify-content:space-between}.sunPrompt{top:7px;font-size:11px}.sunFishUi{bottom:8px;width:calc(100% - 16px)}}';document.head.appendChild(s);}

  window.SunnyMeadowsEngine={start:start,stop:stop,isRunning:function(){return engine.running;}};
})();
