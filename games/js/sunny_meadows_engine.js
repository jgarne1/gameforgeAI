/*
  GameForge AI Sunny Meadows Engine v2
  Purpose: polished top-down painted-map vertical slice for PetWorld.
  - Leaves Ember Hollow / adventure_engine.js intact.
  - Uses illustrated background art as the world layer, with invisible gameplay zones on top.
  - Fishing is integrated as a world system: discover water, cast quickly, reel with tension, collect fish.
*/
(function(){
  'use strict';

  var WORLD_W=4096, WORLD_H=4096;
  var BG_URL='/assets/backgrounds/sunny_meadows_map.png';

  var engine={mounted:false,running:false,root:null,world:null,scene:null,petEl:null,prompt:null,hud:null,fishUi:null,completeEl:null,
    callbacks:{},pet:null,gear:{},keys:{},state:null,camera:{x:0,y:0},raf:0,lastTime:0,near:null,caughtFish:[],collected:{},discoveries:{},spots:{},touchTarget:null,mode:'explore',fish:null,startedAt:0,lastAmbientAt:0,lastPromptAt:0};

  var MEADOW={
    id:'sunny_meadows', name:'Sunny Meadows',
    intro:'A painted meadow map built for smooth wandering, hidden ponds, and quiet fishing discoveries.',
    spawn:{x:470,y:3360},
    exit:{x:3150,y:3320,w:330,h:260,label:'Home Trail'},
    fishingSpots:[
      {id:'waterfall_pool',name:'Waterfall Pool',x:360,y:360,r:210,kind:'falls',hint:'cold spray and quick silver shadows',fish:['fish_brook_blinker','fish_meadow_darter','fish_glass_gill']},
      {id:'willow_bend',name:'Willow Bend',x:770,y:1840,r:250,kind:'river',hint:'slow water beneath hanging leaves',fish:['fish_meadow_darter','fish_sun_pip','fish_clover_carp']},
      {id:'lower_lake',name:'Lower Meadow Lake',x:720,y:3140,r:260,kind:'lake',hint:'wide calm water with lazy ripples',fish:['fish_sun_pip','fish_clover_carp','fish_honeyfin']},
      {id:'blue_pond',name:'Blue Lily Pond',x:2820,y:1420,r:320,kind:'pond',hint:'bright lily water near the old stones',fish:['fish_sun_pip','fish_clover_carp','fish_honeyfin']},
      {id:'cave_spring',name:'Cave Spring',x:3260,y:390,r:190,kind:'spring',hidden:true,hint:'a shadowed pool hidden by the cave mouth',fish:['fish_glass_gill','fish_honeyfin','fish_brook_blinker']}
    ],
    pickups:[
      {id:'dew_1',type:'sunny_dew',x:520,y:3260,icon:'✦',text:'Sunny Dew'},
      {id:'dew_2',type:'sunny_dew',x:1060,y:2440,icon:'✦',text:'Sunny Dew'},
      {id:'dew_3',type:'sunny_dew',x:1650,y:1770,icon:'✦',text:'Sunny Dew'},
      {id:'dew_4',type:'sunny_dew',x:2510,y:1120,icon:'✦',text:'Sunny Dew'},
      {id:'dew_5',type:'sunny_dew',x:3160,y:930,icon:'✦',text:'Sunny Dew'},
      {id:'dew_6',type:'sunny_dew',x:2780,y:2440,icon:'✦',text:'Sunny Dew'},
      {id:'meadow_charm',type:'keyItem',x:1560,y:720,icon:'🌼',text:'Meadow Charm',keyItem:'meadow_charm'}
    ],
    discoveries:[
      {id:'ancient_tree',x:1425,y:840,r:260,title:'Ancient Meadow Tree',text:'The roots hum softly. Your pet looks toward the hidden spring.'},
      {id:'ruin_stones',x:3190,y:950,r:180,title:'Old Meadow Stones',text:'Weathered stones mark where old pets once followed the river lights.'},
      {id:'cave_mouth',x:3265,y:330,r:170,title:'Quiet Cave Mouth',text:'Cool air rolls from the cave. Something bright flickers inside the spring.'},
      {id:'lily_pond_seen',x:2810,y:1395,r:245,title:'Blue Lily Pond',text:'Fish shadows circle under the lily pads.'}
    ],
    blockers:[
      {id:'ancient_tree_trunk',type:'ellipse',x:1395,y:830,rx:235,ry:190},
      {id:'cave_rocks',type:'rect',x:3120,y:165,w:390,h:330},
      {id:'ruins',type:'rect',x:3060,y:815,w:420,h:360},
      {id:'lower_cliff',type:'poly',points:[[2520,3440],[4096,3300],[4096,4096],[2240,4096]]},
      {id:'right_cliff',type:'poly',points:[[3660,1100],[4096,900],[4096,2980],[3720,2920],[3580,2320]]},
      {id:'top_trees',type:'rect',x:0,y:0,w:4096,h:120},
      {id:'left_trees',type:'rect',x:0,y:0,w:90,h:4096}
    ],
    waterBlockers:[
      {type:'ellipse',x:365,y:440,rx:210,ry:230},
      {type:'ellipse',x:755,y:1900,rx:270,ry:380},
      {type:'ellipse',x:755,y:3180,rx:300,ry:290},
      {type:'ellipse',x:2835,y:1425,rx:390,ry:310},
      {type:'ellipse',x:3280,y:435,rx:190,ry:160},
      {type:'rect',x:345,y:520,w:330,h:1650},
      {type:'rect',x:780,y:1950,w:440,h:1450}
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
      '<div class="sunTop"><div><b>Sunny Meadows</b><span id="sunSub">A calmer PetWorld region.</span></div><div class="sunTopActions"><span id="sunHud">0 dew • 0 fish</span><button id="sunReturn" class="primary">Return Home</button><button id="sunLeave">Leave</button></div></div>',
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
    say('Sunny Meadows is open. Click or tap to wander, use WASD/arrow keys, and fish where water ripples.');
    if(engine.callbacks.onStart)engine.callbacks.onStart(MEADOW);
  }

  function renderWorld(){
    var html='';
    html+='<div class="sunPaintedMap"></div><div class="sunShade"></div><div class="sunParticleLayer"></div>';
    MEADOW.fishingSpots.forEach(function(p){html+='<button class="sunFishSpot '+esc(p.kind)+' '+(p.hidden?'hiddenSpot':'')+'" data-spot="'+esc(p.id)+'" style="left:'+p.x+'px;top:'+p.y+'px;width:'+(p.r*2)+'px;height:'+(p.r*2)+'px"><span></span><i></i></button>';});
    MEADOW.pickups.forEach(function(p){html+='<button class="sunPickup" data-pickup="'+esc(p.id)+'" style="left:'+p.x+'px;top:'+p.y+'px"><span>'+esc(p.icon)+'</span></button>';});
    MEADOW.discoveries.forEach(function(d){html+='<div class="sunDiscovery" data-disc="'+esc(d.id)+'" style="left:'+(d.x-d.r)+'px;top:'+(d.y-d.r)+'px;width:'+(d.r*2)+'px;height:'+(d.r*2)+'px"></div>';});
    html+='<div class="sunExit" style="left:'+MEADOW.exit.x+'px;top:'+MEADOW.exit.y+'px;width:'+MEADOW.exit.w+'px;height:'+MEADOW.exit.h+'px"><b>'+esc(MEADOW.exit.label)+'</b><span>return when ready</span></div>';
    for(var i=0;i<36;i++){html+='<div class="sunAmbientParticle p'+(i%4)+'" style="left:'+(160+(i*193)%3700)+'px;top:'+(180+(i*331)%3550)+'px"></div>';}
    html+='<div id="sunPet" class="sunPet">'+petMarkup(engine.pet)+'</div>';
    engine.world.innerHTML=html;engine.petEl=document.getElementById('sunPet');
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-pickup]'),function(btn){btn.onclick=function(){collectPickup(btn.getAttribute('data-pickup'))};});
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-spot]'),function(btn){btn.onclick=function(e){e.preventDefault();var spot=find(MEADOW.fishingSpots,btn.getAttribute('data-spot'));if(spot)beginFishing(spot);};});
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
    if(engine.touchTarget){var dx=engine.touchTarget.x-s.x,dy=engine.touchTarget.y-s.y,d=Math.sqrt(dx*dx+dy*dy);if(d>18){ax=dx/d;ay=dy/d;}else engine.touchTarget=null;}
    var len=Math.sqrt(ax*ax+ay*ay)||1;ax/=len;ay/=len;
    var max=4.25, accel=.22, friction=.84;
    s.vx+=(ax*max-s.vx)*accel*dt;s.vy+=(ay*max-s.vy)*accel*dt;
    if(Math.abs(ax)+Math.abs(ay)<.05){s.vx*=Math.pow(friction,dt);s.vy*=Math.pow(friction,dt);}else if(Math.abs(ax)>0.05)s.facing=ax>0?1:-1;
    var oldX=s.x,oldY=s.y;
    s.x=clamp(s.x+s.vx*dt,80,WORLD_W-80);s.y=clamp(s.y+s.vy*dt,90,WORLD_H-90);
    resolveCollisions(oldX,oldY);
  }

  function resolveCollisions(oldX,oldY){
    var s=engine.state;
    var blockers=MEADOW.blockers.concat(MEADOW.waterBlockers);
    for(var i=0;i<blockers.length;i++){
      if(pointInShape(s.x,s.y,blockers[i])){
        var fixed=pushOutOfShape(s.x,s.y,oldX,oldY,blockers[i]);
        s.x=fixed.x;s.y=fixed.y;s.vx*=.25;s.vy*=.25;
      }
    }
  }

  function pointInShape(x,y,b){
    if(b.type==='rect')return x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h;
    if(b.type==='ellipse'){var dx=(x-b.x)/(b.rx||1),dy=(y-b.y)/(b.ry||1);return dx*dx+dy*dy<1;}
    if(b.type==='poly')return pointInPoly(x,y,b.points||[]);
    return false;
  }
  function pushOutOfShape(x,y,oldX,oldY,b){
    if(b.type==='rect')return {x:oldX,y:oldY};
    if(b.type==='ellipse'){
      var a=Math.atan2((y-b.y)/(b.ry||1),(x-b.x)/(b.rx||1));
      return {x:b.x+Math.cos(a)*(b.rx+10),y:b.y+Math.sin(a)*(b.ry+10)};
    }
    return {x:oldX,y:oldY};
  }
  function pointInPoly(x,y,pts){var inside=false;for(var i=0,j=pts.length-1;i<pts.length;j=i++){var xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];var intersect=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi);if(intersect)inside=!inside;}return inside;}

  function checkNearby(){
    var s=engine.state,near=null,best=999999;
    MEADOW.fishingSpots.forEach(function(p){var d=dist(s.x,s.y,p.x,p.y);if(d<p.r+125&&d<best){near={type:'fish',obj:p};best=d;}});
    engine.near=near;
    if(near){
      saySoft('Ripples at '+near.obj.name+'. Press Space/E or tap the water to fish.');
      showFishReady(near.obj);
    }else if(engine.mode!=='fishing')hideFishUi();
  }

  function showFishReady(spot){
    if(engine.mode==='fishing')return;
    engine.fishUi.classList.remove('hidden');
    engine.fishUi.setAttribute('data-mode','ready');
    engine.fishUi.innerHTML='<div class="fishReady"><div><b>🎣 '+esc(spot.name)+'</b><span>'+esc(spot.hint||'fish shadows move below')+'</span></div><button id="sunCast">Cast</button></div>';
    var b=document.getElementById('sunCast');if(b)b.onclick=function(e){e.preventDefault();beginFishing(spot);};
  }
  function hideFishUi(){engine.fishUi.classList.add('hidden');engine.fishUi.removeAttribute('data-mode');}

  function beginFishing(spot){
    if(engine.mode==='fishing')return;
    engine.mode='fishing';engine.touchTarget=null;engine.state.vx=0;engine.state.vy=0;
    var chosen=chooseFish(spot);var f=FISH[chosen]||FISH.fish_meadow_darter;
    engine.fish={spot:spot,fishId:chosen,fish:f,phase:'cast',t:0,marker:Math.random(),dir:1,progress:34,tension:48};
    engine.fishUi.classList.remove('hidden');engine.fishUi.setAttribute('data-mode','fishing');
    renderFishing();say('Cast when the marker crosses the bright water.');
  }

  function updateFishing(dt){
    var f=engine.fish;if(!f)return;f.t+=dt;
    if(f.phase==='cast'){
      f.marker+=f.dir*.021*dt;if(f.marker>1){f.marker=1;f.dir=-1;}if(f.marker<0){f.marker=0;f.dir=1;}renderFishing();
    }else if(f.phase==='reel'){
      var pull=f.fish.behavior==='quick'?1.28:f.fish.behavior==='shy'?1.12:.88;
      f.tension+=((Math.sin(f.t*.25)+.18)*1.2*pull);
      f.tension=clamp(f.tension,7,94);
      f.progress-=.10*pull*dt;
      if(f.progress<=0)finishFishing(false);
      renderFishing();
    }
  }

  function fishAction(){
    if(engine.mode!=='fishing'){
      if(engine.near&&engine.near.type==='fish')beginFishing(engine.near.obj);
      return;
    }
    var f=engine.fish;if(!f)return;
    if(f.phase==='cast'){
      var good=f.marker>.39&&f.marker<.67;
      f.phase='reel';f.progress=good?50:30;f.tension=good?44:64;
      say(good?'Hooked! Keep the tension steady.':'Weak hook — reel carefully.');renderFishing();return;
    }
    if(f.phase==='reel'){
      f.progress+=8;f.tension-=8;
      if(f.tension<18){f.progress-=7;f.tension=25;saySoft('Too slack — the fish is slipping!');}
      if(f.tension>82){f.progress-=9;f.tension=74;saySoft('Too tight — ease up!');}
      if(f.progress>=100)finishFishing(true);else renderFishing();
    }
  }

  function renderFishing(){
    var f=engine.fish;if(!f)return;
    if(f.phase==='cast'){
      engine.fishUi.innerHTML='<div class="fishPanel"><div class="fishHead"><b>Cast into '+esc(f.spot.name)+'</b><button id="fishCancel">Cancel</button></div><div class="castTrack"><i></i><span style="left:'+(f.marker*100)+'%"></span></div><button id="fishAction">Cast</button><p>Hit the bright water for a clean hook.</p></div>';
    }else{
      engine.fishUi.innerHTML='<div class="fishPanel"><div class="fishHead"><b>Something is pulling...</b><button id="fishCancel">Cancel</button></div><div class="tension"><span style="width:'+f.tension+'%"></span><i></i></div><div class="catchProgress"><span style="width:'+f.progress+'%"></span></div><button id="fishAction">Reel</button><p>Tap Reel to gain line. Keep tension away from the edges.</p></div>';
    }
    var a=document.getElementById('fishAction'),c=document.getElementById('fishCancel');if(a)a.onclick=function(e){e.preventDefault();fishAction();};if(c)c.onclick=function(e){e.preventDefault();finishFishing(false,true);};
  }

  function finishFishing(success,cancelled){
    var f=engine.fish;if(!f)return;
    if(success){engine.caughtFish.push({id:f.fishId,pond:f.spot.id});engine.spots[f.spot.id]=true;say('Caught '+f.fish.name+'!');pop(f.fish.icon+' '+f.fish.name,engine.state.x,engine.state.y-75,'good');}
    else if(!cancelled){say('The fish slipped away. The ripples settle again.');pop('Slipped away',engine.state.x,engine.state.y-75,'bad');}
    engine.mode='explore';engine.fish=null;hideFishUi();updateHud();
  }

  function chooseFish(spot){
    var list=spot.fish.slice(),inv=engine.gear||{};
    if(inv.glow_lure&&(spot.id==='cave_spring'||spot.id==='blue_pond'))list.push('fish_glass_gill','fish_honeyfin');
    if(inv.root_worm&&(spot.id==='willow_bend'||spot.id==='waterfall_pool'))list.push('fish_brook_blinker');
    var roll=Math.random();
    if(roll>.88&&list.length>2)return list[list.length-1];
    if(roll>.60&&list.length>1)return list[1];
    return list[0];
  }

  function checkPickups(){MEADOW.pickups.forEach(function(p){if(engine.collected[p.id])return;if(dist(engine.state.x,engine.state.y,p.x,p.y)<52)collectPickup(p.id);});}
  function collectPickup(id){var p=find(MEADOW.pickups,id);if(!p||engine.collected[p.id])return;engine.collected[p.id]=true;var n=engine.world.querySelector('[data-pickup="'+css(id)+'"]');if(n)n.classList.add('taken');if(p.keyItem)engine.discoveries[p.keyItem]=true;else engine.collected[p.type]=Number(engine.collected[p.type]||0)+1;say('Collected '+p.text+'.');pop(p.icon+' '+p.text,p.x,p.y-42,'good');updateHud();}
  function checkDiscoveries(){MEADOW.discoveries.forEach(function(d){if(engine.discoveries[d.id])return;if(dist(engine.state.x,engine.state.y,d.x,d.y)<d.r){engine.discoveries[d.id]=true;say(d.title+': '+d.text);pop('Discovery',d.x,d.y-70,'info');}});}
  function checkExit(){var e=MEADOW.exit;if(engine.state.x>e.x&&engine.state.x<e.x+e.w&&engine.state.y>e.y&&engine.state.y<e.y+e.h)showComplete();}
  function showComplete(){if(!engine.completeEl.classList.contains('hidden'))return;engine.completeEl.innerHTML='<div class="sunCard"><h2>Sunny Meadows</h2><p>Your pet carries meadow dew, fishing stories, and quiet ripples home.</p><div><span>'+Number(engine.collected.sunny_dew||0)+' Dew</span><span>'+engine.caughtFish.length+' Fish</span><span>'+Object.keys(engine.discoveries).length+' Discoveries</span></div><button id="sunFinish" class="primary">Return Home</button><button id="sunStay">Keep Exploring</button></div>';engine.completeEl.classList.remove('hidden');document.getElementById('sunFinish').onclick=complete;document.getElementById('sunStay').onclick=function(){engine.completeEl.classList.add('hidden');engine.state.x-=120;};}

  function complete(){
    var payload={zoneId:'sunny_meadows',collected:{sunny_dew:Number(engine.collected.sunny_dew||0)},caughtFish:engine.caughtFish.slice(0,30),discoveries:Object.keys(engine.discoveries),keyItems:Object.keys(engine.discoveries).filter(function(k){return k==='meadow_charm'}),stats:{goalReached:true,hazardsHit:0,puzzlesSolved:Object.keys(engine.spots).length},durationMs:Date.now()-engine.startedAt};
    stop(true,payload);
  }
  function stop(done,payload){if(!engine.running)return;engine.running=false;cancelAnimationFrame(engine.raf);engine.root.classList.add('hidden');engine.mode='explore';if(done&&engine.callbacks.onComplete)engine.callbacks.onComplete(payload||{});if(!done&&engine.callbacks.onCancel)engine.callbacks.onCancel();}

  function updateCamera(dt){var sw=engine.scene.clientWidth||900,sh=engine.scene.clientHeight||600;var tx=clamp(engine.state.x-sw*.5,0,WORLD_W-sw),ty=clamp(engine.state.y-sh*.54,0,WORLD_H-sh);engine.camera.x+=(tx-engine.camera.x)*.09*dt;engine.camera.y+=(ty-engine.camera.y)*.09*dt;engine.world.style.transform='translate('+(-engine.camera.x)+'px,'+(-engine.camera.y)+'px)';}
  function updatePet(){var s=engine.state;engine.petEl.style.left=s.x+'px';engine.petEl.style.top=s.y+'px';engine.petEl.style.setProperty('--face',s.facing);engine.petEl.classList.toggle('moving',Math.abs(s.vx)+Math.abs(s.vy)>1.1);engine.petEl.classList.toggle('fishing',engine.mode==='fishing');}
  function updateHud(){engine.hud.innerText=Number(engine.collected.sunny_dew||0)+' dew • '+engine.caughtFish.length+' fish • '+Object.keys(engine.discoveries).length+' discoveries';}
  function maybeAmbient(){var now=Date.now();if(now-engine.lastAmbientAt<8500)return;engine.lastAmbientAt=now;var msgs=['Grass moves in waves across the meadow.','Your pet watches a ripple that disappears too quickly.','A bird calls from somewhere near the old stones.','The water flashes gold for one breath.','The cave spring echoes softly.'];say(msgs[Math.floor(Math.random()*msgs.length)]);}
  function saySoft(t){var now=Date.now();if(now-engine.lastPromptAt<1200)return;engine.lastPromptAt=now;say(t);}
  function setupPointer(){engine.scene.addEventListener('pointerdown',function(e){if(!engine.running)return;if(e.target&&String(e.target.tagName).toLowerCase()==='button')return;var r=engine.scene.getBoundingClientRect();if(engine.mode==='fishing'){fishAction();return;}engine.touchTarget={x:e.clientX-r.left+engine.camera.x,y:e.clientY-r.top+engine.camera.y};},{passive:false});}
  function onKey(e){if(!engine.running)return;var codes=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','Space','KeyE'];if(codes.indexOf(e.code)<0)return;if(e.type==='keydown'){engine.keys[e.code]=true;if(e.code==='Space'||e.code==='KeyE')fishAction();}else engine.keys[e.code]=false;e.preventDefault();}
  function say(t){engine.lastPromptAt=Date.now();engine.prompt.innerText=t;engine.prompt.classList.remove('pulse');void engine.prompt.offsetWidth;engine.prompt.classList.add('pulse');}
  function pop(t,x,y,type){var el=document.createElement('div');el.className='sunPop '+(type||'info');el.innerText=t;el.style.left=(x-engine.camera.x)+'px';el.style.top=(y-engine.camera.y)+'px';engine.scene.appendChild(el);setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},1150);}
  function petMarkup(p){p=p||{};var src=p.asset||p.image||'';if(src)return '<img src="'+esc(src)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'"><span style="display:none">'+esc(p.emoji||'🐾')+'</span>';return '<span>'+esc(p.emoji||'🐾')+'</span>';}
  function find(a,id){return (a||[]).find(function(x){return String(x.id)===String(id);});}
  function dist(a,b,c,d){var x=a-c,y=b-d;return Math.sqrt(x*x+y*y);}function clamp(v,a,b){return Math.max(a,Math.min(b,v));}function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}function css(s){return String(s).replace(/"/g,'\\"')}

  function injectStyles(){if(document.getElementById('gfSunnyStyles'))return;var s=document.createElement('style');s.id='gfSunnyStyles';s.textContent=''
+'.gfSunny{position:fixed;inset:0;z-index:99998;background:#0f2418;color:#16301d;display:grid;grid-template-rows:auto minmax(0,1fr);font-family:Arial,Helvetica,sans-serif;touch-action:none}.gfSunny.hidden{display:none}.sunTop{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,.74);border-bottom:1px solid rgba(22,101,52,.16);backdrop-filter:blur(14px);box-shadow:0 12px 30px rgba(22,101,52,.12);z-index:5}.sunTop b{display:block;font-size:18px}.sunTop span{font-size:12px;color:#3f6b45;font-weight:800}.sunTopActions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.sunTopActions>span{background:rgba(255,255,255,.72);border:1px solid rgba(22,101,52,.16);border-radius:999px;padding:6px 9px;color:#28522d}.sunTop button,.fishPanel button,.fishReady button,.sunCard button{border:0;border-radius:999px;padding:8px 11px;font-weight:1000;cursor:pointer;background:rgba(22,101,52,.12);color:#16301d}.sunTop button.primary,.fishReady button,.fishPanel button#fishAction,.sunCard .primary{background:linear-gradient(135deg,#22c55e,#facc15);color:#102414}.sunScene{position:relative;overflow:hidden;background:#12331e}.sunWorld{position:absolute;left:0;top:0;width:4096px;height:4096px;will-change:transform}.sunPaintedMap{position:absolute;inset:0;background-image:url("'+BG_URL+'");background-size:100% 100%;background-position:center;background-repeat:no-repeat}.sunShade{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.06),transparent 32%),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.00) 42%,rgba(0,0,0,.18));mix-blend-mode:multiply}.sunParticleLayer{position:absolute;inset:0;pointer-events:none}.sunFishSpot{position:absolute;z-index:6;transform:translate(-50%,-50%);border:0;background:transparent;border-radius:50%;cursor:pointer;opacity:.95}.sunFishSpot span{position:absolute;left:50%;top:50%;width:58px;height:18px;border-radius:50%;background:rgba(255,255,255,.46);box-shadow:0 0 22px rgba(125,211,252,.55);animation:sunFishShadow 3.1s ease-in-out infinite}.sunFishSpot i{position:absolute;left:46%;top:45%;width:76px;height:30px;border:2px solid rgba(255,255,255,.45);border-radius:50%;animation:sunRipple 2.6s ease-in-out infinite}.sunFishSpot.hiddenSpot span{background:rgba(187,247,208,.42)}.sunFishSpot:hover i{border-color:rgba(254,240,138,.9)}.sunPickup{position:absolute;z-index:9;transform:translate(-50%,-50%);border:0;background:transparent;cursor:pointer}.sunPickup span{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:radial-gradient(circle,#fff,#fde68a 58%,rgba(250,204,21,.12));border:1px solid rgba(250,204,21,.55);filter:drop-shadow(0 8px 8px rgba(0,0,0,.12));animation:sunBob 1.5s ease-in-out infinite}.sunPickup.taken{display:none}.sunDiscovery{position:absolute;border-radius:50%;pointer-events:none}.sunExit{position:absolute;z-index:7;border-radius:34px;background:rgba(255,255,255,.44);border:2px solid rgba(22,101,52,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:1000;color:#22543d;box-shadow:0 18px 40px rgba(22,101,52,.13);backdrop-filter:blur(2px)}.sunExit span{font-size:11px;color:#4d7c0f}.sunAmbientParticle{position:absolute;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.48);box-shadow:0 0 16px rgba(254,240,138,.58);animation:sunFloat 7s ease-in-out infinite;pointer-events:none}.sunAmbientParticle.p1{background:rgba(253,224,71,.48);animation-duration:8.5s}.sunAmbientParticle.p2{background:rgba(134,239,172,.45);animation-duration:9.5s}.sunAmbientParticle.p3{background:rgba(125,211,252,.38);animation-duration:10s}.sunPet{position:absolute;z-index:20;width:80px;height:80px;transform:translate(-50%,-50%) scaleX(var(--face,1));display:grid;place-items:center;filter:drop-shadow(0 15px 14px rgba(22,101,52,.28));transition:filter .15s}.sunPet img{max-width:78px;max-height:78px;object-fit:contain}.sunPet span{display:grid;place-items:center;width:74px;height:74px;font-size:48px}.sunPet.moving img,.sunPet.moving span{animation:sunPetWalk .42s ease-in-out infinite}.sunPet.fishing{filter:drop-shadow(0 0 18px rgba(250,204,21,.7)) drop-shadow(0 15px 14px rgba(22,101,52,.28))}.sunPrompt{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:50;width:min(720px,calc(100% - 28px));text-align:center;background:rgba(255,255,255,.70);border:1px solid rgba(22,101,52,.16);border-radius:999px;padding:7px 12px;font-size:12px;font-weight:1000;color:#22543d;box-shadow:0 12px 28px rgba(22,101,52,.10);pointer-events:none}.sunPrompt.pulse{animation:sunPrompt .25s ease}.sunFishUi{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:55;width:min(620px,calc(100% - 24px));background:rgba(255,255,255,.82);border:1px solid rgba(22,101,52,.16);border-radius:22px;padding:9px;box-shadow:0 18px 45px rgba(22,101,52,.16);backdrop-filter:blur(14px)}.sunFishUi.hidden,.sunComplete.hidden{display:none}.fishReady{display:flex;align-items:center;justify-content:space-between;gap:10px}.fishReady b,.fishHead b{display:block;color:#16301d}.fishReady span,.fishPanel p{font-size:12px;color:#3f6b45;font-weight:800;margin:2px 0 0}.fishPanel{display:grid;gap:8px}.fishHead{display:flex;justify-content:space-between;align-items:center;gap:8px}.castTrack,.tension,.catchProgress{position:relative;height:16px;border-radius:999px;background:rgba(22,101,52,.12);overflow:hidden}.castTrack i{position:absolute;left:39%;top:0;width:28%;height:100%;background:rgba(34,197,94,.42)}.castTrack span{position:absolute;top:-4px;width:10px;height:24px;border-radius:999px;background:#166534;transform:translateX(-50%)}.tension span,.catchProgress span{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#22c55e)}.tension i{position:absolute;left:24%;right:24%;top:3px;bottom:3px;border-radius:999px;border:1px solid rgba(255,255,255,.9)}.sunComplete{position:absolute;inset:0;z-index:70;display:grid;place-items:center;background:rgba(22,101,52,.20);backdrop-filter:blur(5px)}.sunCard{width:min(520px,calc(100% - 32px));background:rgba(255,255,255,.9);border:1px solid rgba(22,101,52,.16);border-radius:28px;padding:22px;box-shadow:0 30px 80px rgba(22,101,52,.22);text-align:center}.sunCard h2{margin:0 0 6px}.sunCard p{color:#3f6b45;font-weight:800}.sunCard div{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:12px 0}.sunCard span{padding:7px 10px;border-radius:999px;background:rgba(34,197,94,.12);font-weight:1000}.sunPop{position:absolute;z-index:75;transform:translate(-50%,-50%);font-weight:1000;text-shadow:0 1px 0 rgba(255,255,255,.7);animation:sunPop 1.1s ease forwards;pointer-events:none}.sunPop.good{color:#166534}.sunPop.bad{color:#b91c1c}.sunPop.info{color:#0f766e}@keyframes sunBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes sunRipple{0%,100%{transform:scale(.75);opacity:.25}50%{transform:scale(1.25);opacity:.8}}@keyframes sunFishShadow{0%,100%{transform:translate(-50%,-50%) scale(.8);opacity:.22}50%{transform:translate(-12px,-23px) scale(1.15);opacity:.62}}@keyframes sunFloat{0%,100%{transform:translate(0,0);opacity:.22}50%{transform:translate(18px,-30px);opacity:.75}}@keyframes sunPetWalk{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-4px) rotate(2deg)}}@keyframes sunPrompt{0%{transform:translateX(-50%) scale(.98)}75%{transform:translateX(-50%) scale(1.015)}100%{transform:translateX(-50%) scale(1)}}@keyframes sunPop{0%{opacity:0;transform:translate(-50%,-35%) scale(.92)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-105%) scale(1.04)}}@media(max-width:760px){.sunTop{align-items:flex-start;flex-direction:column;padding:6px 8px}.sunTop span#sunSub{display:none}.sunTopActions{width:100%;justify-content:space-between}.sunPrompt{top:7px;font-size:11px}.sunFishUi{bottom:8px;width:calc(100% - 16px)}}';document.head.appendChild(s);}

  window.SunnyMeadowsEngine={start:start,stop:stop,isRunning:function(){return engine.running;}};
})();
