/*
  GameForge AI Sunny Meadows Engine v3
  Purpose: polished top-down painted-map vertical slice for PetWorld.
  - Leaves Ember Hollow / adventure_engine.js intact.
  - Uses illustrated background art as the world layer, with invisible gameplay zones on top.
  - Adds a human explorer + pet companion presentation.
  - Adds stronger collision boundaries, soft canopy/leaf cover, fireflies, readable fishing spots,
    and a more skill-based cast/bite/reel fishing loop.
*/
(function(){
  'use strict';

  var WORLD_W=4096, WORLD_H=4096;
  var BG_URL='/assets/backgrounds/sunny_meadows_map.png';

  var engine={
    mounted:false,running:false,root:null,world:null,scene:null,heroEl:null,petEl:null,prompt:null,hud:null,fishUi:null,completeEl:null,
    callbacks:{},pet:null,gear:{},keys:{},state:null,petState:null,camera:{x:0,y:0},raf:0,lastTime:0,near:null,caughtFish:[],collected:{},discoveries:{},spots:{},
    touchTarget:null,mode:'explore',fish:null,startedAt:0,lastAmbientAt:0,lastPromptAt:0,pointerHeld:false,activeCanopies:{},nearSpotId:null
  };

  var MEADOW={
    id:'sunny_meadows', name:'Sunny Meadows',
    intro:'A peaceful painted meadow for wandering, ponds, bridges, hidden fishing, and companion discovery.',
    spawn:{x:1535,y:1985},
    exit:{x:3120,y:3310,w:360,h:245,label:'Home Trail'},
    fishingSpots:[
      {id:'waterfall_pool',name:'Waterfall Pool',x:430,y:515,r:155,kind:'falls',difficulty:1.08,hint:'cold spray and quick silver shadows',fish:['fish_brook_blinker','fish_meadow_darter','fish_glass_gill']},
      {id:'bridge_run',name:'Bridge Run',x:800,y:1990,r:185,kind:'river',difficulty:.96,hint:'fast current under the old bridge',fish:['fish_meadow_darter','fish_brook_blinker','fish_sun_pip']},
      {id:'lower_lake',name:'Lower Meadow Lake',x:650,y:3150,r:220,kind:'lake',difficulty:.86,hint:'wide calm water with lazy ripples',fish:['fish_sun_pip','fish_clover_carp','fish_honeyfin']},
      {id:'blue_lily_pond',name:'Blue Lily Pond',x:2825,y:1420,r:245,kind:'pond',difficulty:.92,hint:'bright lily water near the old stones',fish:['fish_sun_pip','fish_clover_carp','fish_honeyfin']},
      {id:'cave_spring',name:'Cave Spring',x:3260,y:390,r:145,kind:'spring',hidden:true,difficulty:1.18,hint:'a shadowed pool hidden by the cave mouth',fish:['fish_glass_gill','fish_honeyfin','fish_brook_blinker']}
    ],
    pickups:[
      {id:'dew_1',type:'sunny_dew',x:520,y:3260,icon:'✦',text:'Sunny Dew'},
      {id:'dew_2',type:'sunny_dew',x:1080,y:2425,icon:'✦',text:'Sunny Dew'},
      {id:'dew_3',type:'sunny_dew',x:1650,y:1770,icon:'✦',text:'Sunny Dew'},
      {id:'dew_4',type:'sunny_dew',x:2510,y:1120,icon:'✦',text:'Sunny Dew'},
      {id:'dew_5',type:'sunny_dew',x:3160,y:930,icon:'✦',text:'Sunny Dew'},
      {id:'dew_6',type:'sunny_dew',x:2780,y:2440,icon:'✦',text:'Sunny Dew'},
      {id:'meadow_charm',type:'keyItem',x:1560,y:720,icon:'🌼',text:'Meadow Charm',keyItem:'meadow_charm'}
    ],
    discoveries:[
      {id:'ancient_tree',x:1425,y:840,r:260,title:'Ancient Meadow Tree',text:'The roots hum softly. Your companion watches the hidden spring.'},
      {id:'ruin_stones',x:3190,y:950,r:180,title:'Old Meadow Stones',text:'Weathered stones mark where old pets once followed the river lights.'},
      {id:'cave_mouth',x:3265,y:330,r:170,title:'Quiet Cave Mouth',text:'Cool air rolls from the cave. Something bright flickers inside the spring.'},
      {id:'lily_pond_seen',x:2810,y:1395,r:245,title:'Blue Lily Pond',text:'Fish shadows circle beneath the lily pads.'}
    ],
    // Movement boundaries are intentionally broad, hand-tuned gameplay zones, not pixel-perfect art tracing.
    blockers:[
      {id:'ancient_tree_trunk',type:'ellipse',x:1395,y:825,rx:250,ry:185},
      {id:'tree_fence_left',type:'rect',x:1115,y:955,w:545,h:96},
      {id:'cave_rocks',type:'rect',x:3080,y:120,w:460,h:360},
      {id:'ruins',type:'rect',x:3045,y:800,w:465,h:365},
      {id:'lower_cliff',type:'poly',points:[[2500,3400],[4096,3260],[4096,4096],[2220,4096]]},
      {id:'right_cliff',type:'poly',points:[[3650,1050],[4096,820],[4096,3040],[3720,2920],[3575,2320]]},
      {id:'top_trees',type:'rect',x:0,y:0,w:4096,h:95},
      {id:'left_trees',type:'rect',x:0,y:0,w:80,h:4096},
      {id:'flower_garden_fence',type:'rect',x:70,y:2220,w:470,h:380},
      {id:'lower_right_fence',type:'rect',x:3140,y:2660,w:515,h:150},
      {id:'bridge_rail_left',type:'rect',x:685,y:2132,w:385,h:34},
      {id:'bridge_rail_right',type:'rect',x:690,y:1900,w:380,h:34}
    ],
    waterBlockers:[
      {id:'waterfall_pool_water',type:'ellipse',x:390,y:505,rx:220,ry:240},
      {id:'upper_river',type:'poly',points:[[260,520],[545,610],[670,1780],[470,1855],[315,1100]]},
      {id:'mid_river',type:'poly',points:[[515,1800],[1125,1900],[1100,2110],[580,2240],[430,2110]]},
      {id:'lower_lake_water',type:'ellipse',x:670,y:3135,rx:335,ry:310},
      {id:'lower_river',type:'poly',points:[[720,2190],[1110,2170],[1110,3160],[820,3280],[610,2860]]},
      {id:'blue_pond_water',type:'ellipse',x:2845,y:1430,rx:395,ry:305},
      {id:'cave_spring_water',type:'ellipse',x:3280,y:430,rx:190,ry:155},
      {id:'ocean_edge',type:'poly',points:[[3370,3470],[4096,3250],[4096,4096],[3150,4096]]}
    ],
    canopyZones:[
      {id:'ancient_tree_canopy',x:1390,y:700,rx:615,ry:520},
      {id:'left_willow_canopy',x:410,y:1800,rx:360,ry:420},
      {id:'lower_tree_canopy',x:480,y:3560,rx:365,ry:320},
      {id:'pond_tree_canopy',x:2440,y:1200,rx:420,ry:390},
      {id:'right_tree_canopy',x:3660,y:1970,rx:430,ry:520}
    ],
    fireflyZones:[
      {id:'tree_fireflies',x:1325,y:880,w:520,h:420,count:20},
      {id:'pond_fireflies',x:2360,y:1040,w:560,h:460,count:16},
      {id:'cave_fireflies',x:3020,y:210,w:500,h:340,count:13},
      {id:'lower_fireflies',x:315,y:3280,w:520,h:440,count:12}
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
    engine.petState={x:MEADOW.spawn.x-58,y:MEADOW.spawn.y+36};
    engine.camera={x:0,y:0};engine.keys={};engine.caughtFish=[];engine.collected={};engine.discoveries={};engine.spots={};engine.near=null;engine.mode='explore';engine.fish=null;engine.startedAt=Date.now();engine.lastAmbientAt=Date.now();engine.touchTarget=null;engine.pointerHeld=false;engine.activeCanopies={};engine.nearSpotId=null;
    document.getElementById('sunSub').innerText=MEADOW.intro;
    renderWorld();
    engine.root.classList.remove('hidden');engine.fishUi.classList.add('hidden');engine.completeEl.classList.add('hidden');engine.running=true;engine.lastTime=performance.now();engine.raf=requestAnimationFrame(loop);
    say('Sunny Meadows is open. Click or tap to walk. Find ripples, then hold/release cast and reel with care.');
    if(engine.callbacks.onStart)engine.callbacks.onStart(MEADOW);
  }

  function renderWorld(){
    var html='';
    html+='<div class="sunPaintedMap"></div><div class="sunShade"></div><div class="sunWaterSparkle"></div>';
    MEADOW.fishingSpots.forEach(function(p){html+='<button class="sunFishSpot '+esc(p.kind)+' '+(p.hidden?'hiddenSpot':'')+'" data-spot="'+esc(p.id)+'" style="left:'+p.x+'px;top:'+p.y+'px;width:'+(p.r*2)+'px;height:'+(p.r*2)+'px"><span></span><i></i><b>Fishing</b></button>';});
    MEADOW.pickups.forEach(function(p){html+='<button class="sunPickup" data-pickup="'+esc(p.id)+'" style="left:'+p.x+'px;top:'+p.y+'px"><span>'+esc(p.icon)+'</span></button>';});
    MEADOW.discoveries.forEach(function(d){html+='<div class="sunDiscovery" data-disc="'+esc(d.id)+'" style="left:'+(d.x-d.r)+'px;top:'+(d.y-d.r)+'px;width:'+(d.r*2)+'px;height:'+(d.r*2)+'px"></div>';});
    html+='<div class="sunExit" style="left:'+MEADOW.exit.x+'px;top:'+MEADOW.exit.y+'px;width:'+MEADOW.exit.w+'px;height:'+MEADOW.exit.h+'px"><b>'+esc(MEADOW.exit.label)+'</b><span>return when ready</span></div>';
    MEADOW.fireflyZones.forEach(function(z,zi){for(var i=0;i<z.count;i++){var lx=z.x+(i*73+zi*31)%z.w,ly=z.y+(i*109+zi*53)%z.h;html+='<div class="sunFirefly f'+(i%5)+'" style="left:'+lx+'px;top:'+ly+'px;--fx:'+(((i%7)-3)*18)+'px;--fy:'+(((i%5)-2)*16)+'px;--d:'+(5.8+(i%6)*.55)+'s"></div>';}});
    MEADOW.canopyZones.forEach(function(c){html+='<div class="sunCanopy" data-canopy="'+esc(c.id)+'" style="left:'+(c.x-c.rx)+'px;top:'+(c.y-c.ry)+'px;width:'+(c.rx*2)+'px;height:'+(c.ry*2)+'px"></div>';});
    html+='<div id="sunHero" class="sunHero"><span>🧑‍🌾</span></div>';
    html+='<div id="sunPet" class="sunPetCompanion">'+petMarkup(engine.pet)+'</div>';
    engine.world.innerHTML=html;engine.heroEl=document.getElementById('sunHero');engine.petEl=document.getElementById('sunPet');
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-pickup]'),function(btn){btn.onclick=function(){collectPickup(btn.getAttribute('data-pickup'))};});
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-spot]'),function(btn){btn.onclick=function(e){e.preventDefault();var spot=find(MEADOW.fishingSpots,btn.getAttribute('data-spot'));if(spot)beginFishing(spot);};});
    updateHud();
  }

  function loop(ts){
    if(!engine.running)return;
    var dt=Math.min(32,ts-engine.lastTime||16)/16.666;engine.lastTime=ts;
    if(engine.mode==='explore'){updateMovement(dt);updateCompanion(dt);checkNearby();checkPickups();checkDiscoveries();checkExit();updateCanopies();maybeAmbient();}
    else if(engine.mode==='fishing'){updateCompanion(dt);updateFishing(dt);updateCanopies();}
    updateCamera(dt);updateActors();
    engine.raf=requestAnimationFrame(loop);
  }

  function updateMovement(dt){
    var s=engine.state, ax=0, ay=0;
    if(engine.keys.ArrowLeft||engine.keys.KeyA)ax-=1;if(engine.keys.ArrowRight||engine.keys.KeyD)ax+=1;if(engine.keys.ArrowUp||engine.keys.KeyW)ay-=1;if(engine.keys.ArrowDown||engine.keys.KeyS)ay+=1;
    if(engine.touchTarget){var dx=engine.touchTarget.x-s.x,dy=engine.touchTarget.y-s.y,d=Math.sqrt(dx*dx+dy*dy);if(d>16){ax=dx/d;ay=dy/d;}else engine.touchTarget=null;}
    var len=Math.sqrt(ax*ax+ay*ay)||1;ax/=len;ay/=len;
    var max=4.05, accel=.24, friction=.82;
    s.vx+=(ax*max-s.vx)*accel*dt;s.vy+=(ay*max-s.vy)*accel*dt;
    if(Math.abs(ax)+Math.abs(ay)<.05){s.vx*=Math.pow(friction,dt);s.vy*=Math.pow(friction,dt);}else if(Math.abs(ax)>0.05)s.facing=ax>0?1:-1;
    var oldX=s.x,oldY=s.y;
    s.x=clamp(s.x+s.vx*dt,80,WORLD_W-80);s.y=clamp(s.y+s.vy*dt,90,WORLD_H-90);
    resolveCollisions(oldX,oldY);
  }

  function updateCompanion(dt){
    if(!engine.petState)return;
    var p=engine.petState,s=engine.state;
    var followDist=72;
    var dx=s.x-(p.x+(-s.facing*followDist)),dy=s.y+34-p.y,d=Math.sqrt(dx*dx+dy*dy)||1;
    var speed=engine.mode==='fishing'?0.06:0.12;
    p.x+=dx*speed*dt;p.y+=dy*speed*dt;
  }

  function resolveCollisions(oldX,oldY){
    var s=engine.state;
    var blockers=MEADOW.blockers.concat(MEADOW.waterBlockers);
    for(var i=0;i<blockers.length;i++){
      if(pointInShape(s.x,s.y,blockers[i])){
        var fixed=pushOutOfShape(s.x,s.y,oldX,oldY,blockers[i]);
        s.x=fixed.x;s.y=fixed.y;s.vx*=.20;s.vy*=.20;
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
      return {x:b.x+Math.cos(a)*(b.rx+14),y:b.y+Math.sin(a)*(b.ry+14)};
    }
    return {x:oldX,y:oldY};
  }
  function pointInPoly(x,y,pts){var inside=false;for(var i=0,j=pts.length-1;i<pts.length;j=i++){var xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];var intersect=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi);if(intersect)inside=!inside;}return inside;}

  function updateCanopies(){
    var active={};
    MEADOW.canopyZones.forEach(function(c){var dx=(engine.state.x-c.x)/(c.rx||1),dy=(engine.state.y-c.y)/(c.ry||1);if(dx*dx+dy*dy<1)active[c.id]=true;});
    engine.activeCanopies=active;
    Array.prototype.forEach.call(engine.world.querySelectorAll('[data-canopy]'),function(n){n.classList.toggle('soft',!!active[n.getAttribute('data-canopy')]);});
  }

  function checkNearby(){
    var s=engine.state,near=null,best=999999;
    MEADOW.fishingSpots.forEach(function(p){var d=dist(s.x,s.y,p.x,p.y);if(d<p.r+115&&d<best){near={type:'fish',obj:p};best=d;}});
    if(engine.nearSpotId){var prev=engine.world.querySelector('[data-spot="'+css(engine.nearSpotId)+'"]');if(prev)prev.classList.remove('near');}
    engine.near=near;
    if(near){engine.nearSpotId=near.obj.id;var node=engine.world.querySelector('[data-spot="'+css(near.obj.id)+'"]');if(node)node.classList.add('near');saySoft('Fishing water: '+near.obj.name+'. Press Space/E or click the ripple.');showFishReady(near.obj);}
    else{engine.nearSpotId=null;if(engine.mode!=='fishing')hideFishUi();}
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
    engine.fish={spot:spot,fishId:chosen,fish:f,phase:'cast',t:0,marker:Math.random(),dir:1,castScore:0,biteWindow:0,nextBiteAt:38+Math.random()*42,biteCount:0,progress:12,tension:50,lineStress:0,reeling:false};
    engine.fishUi.classList.remove('hidden');engine.fishUi.setAttribute('data-mode','fishing');
    renderFishing();say('Hold briefly to steady your cast, then release in the green zone.');
  }

  function updateFishing(dt){
    var f=engine.fish;if(!f)return;f.t+=dt;
    if(f.phase==='cast'){
      var speed=.018+(f.spot.difficulty||1)*.006;
      f.marker+=f.dir*speed*dt;if(f.marker>1){f.marker=1;f.dir=-1;}if(f.marker<0){f.marker=0;f.dir=1;}renderFishing();
    }else if(f.phase==='bite'){
      f.nextBiteAt-=dt;
      if(f.nextBiteAt<=0&&f.biteWindow<=0){f.biteWindow=28-(f.spot.difficulty||1)*4;f.biteCount++;saySoft('Bite! Press Space/E now!');}
      if(f.biteWindow>0){f.biteWindow-=dt;if(f.biteWindow<=0){f.nextBiteAt=28+Math.random()*36;f.progress=Math.max(0,f.progress-7);saySoft('Missed nibble. Watch the float.');}}
      if(f.biteCount>4&&f.progress<18)finishFishing(false);
      renderFishing();
    }else if(f.phase==='reel'){
      var pull=f.fish.behavior==='quick'?1.25:f.fish.behavior==='shy'?1.12:.92;
      var wave=Math.sin(f.t*.18)*.52+Math.sin(f.t*.047)*.34;
      if(f.reeling){f.tension+=1.28*pull*dt;f.progress+=((f.tension>30&&f.tension<76)?1.05:.34)*dt;}
      else{f.tension-=.86*dt;f.progress-=.16*pull*dt;}
      f.tension+=wave*.28*dt;
      if(f.tension>82){f.lineStress+=dt;f.progress-=.62*dt;}else if(f.tension<15){f.lineStress+=dt*.5;f.progress-=.45*dt;}else f.lineStress=Math.max(0,f.lineStress-.75*dt);
      f.tension=clamp(f.tension,0,100);f.progress=clamp(f.progress,0,100);
      if(f.lineStress>26||f.progress<=0)finishFishing(false);
      if(f.progress>=100)finishFishing(true);
      renderFishing();
    }
  }

  function fishAction(down){
    if(engine.mode!=='fishing'){
      if(engine.near&&engine.near.type==='fish')beginFishing(engine.near.obj);
      return;
    }
    var f=engine.fish;if(!f)return;
    if(f.phase==='cast'&&down!==false){
      releaseCast();return;
    }
    if(f.phase==='bite'&&down!==false){
      if(f.biteWindow>0){f.phase='reel';f.t=0;f.progress=22+f.castScore*42;f.tension=44+(1-f.castScore)*18;f.reeling=false;say('Hooked! Hold to reel, release to ease tension.');}
      else{f.progress=Math.max(0,f.progress-5);saySoft('Not yet — wait for the float to dip.');}
      renderFishing();return;
    }
    if(f.phase==='reel'){
      f.reeling=!!down;
      renderFishing();
    }
  }

  function releaseCast(){
    var f=engine.fish;if(!f)return;
    var center=.53,width=.20;
    var diff=Math.abs(f.marker-center);
    f.castScore=clamp(1-(diff/width),0,1);
    f.phase='bite';f.t=0;f.nextBiteAt=(f.castScore>.65?24:42)+Math.random()*28;f.biteWindow=0;f.progress=18+f.castScore*28;
    say(f.castScore>.72?'Clean cast. Watch the float.':f.castScore>.35?'Cast landed. Be patient.':'Rough cast. Fish may be cautious.');renderFishing();
  }

  function renderFishing(){
    var f=engine.fish;if(!f)return;
    if(f.phase==='cast'){
      engine.fishUi.innerHTML='<div class="fishPanel"><div class="fishHead"><b>Cast into '+esc(f.spot.name)+'</b><button id="fishCancel">Cancel</button></div><div class="castTrack"><i></i><span style="left:'+(f.marker*100)+'%"></span></div><button id="fishAction">Release Cast</button><p>Release in the green zone for distance and accuracy.</p></div>';
    }else if(f.phase==='bite'){
      var dip=f.biteWindow>0?' bite':'';
      engine.fishUi.innerHTML='<div class="fishPanel"><div class="fishHead"><b>Float Watching...</b><button id="fishCancel">Cancel</button></div><div class="floatBox'+dip+'"><span></span><i></i></div><div class="catchProgress"><span style="width:'+f.progress+'%"></span></div><button id="fishAction">Set Hook</button><p>Press only when the float dips. Rare fish tease more.</p></div>';
    }else{
      engine.fishUi.innerHTML='<div class="fishPanel"><div class="fishHead"><b>Reeling: '+esc(f.fish.rarity)+' fish</b><button id="fishCancel">Cancel</button></div><div class="tension"><span style="width:'+f.tension+'%"></span><i></i></div><div class="catchProgress"><span style="width:'+f.progress+'%"></span></div><button id="fishAction">Hold Reel</button><p>Hold to reel. Release when tension climbs too high. Keep it in the green.</p></div>';
    }
    var a=document.getElementById('fishAction'),c=document.getElementById('fishCancel');
    if(a){a.onpointerdown=function(e){e.preventDefault();engine.pointerHeld=true;fishAction(true);};a.onpointerup=function(e){e.preventDefault();engine.pointerHeld=false;fishAction(false);};a.onclick=function(e){e.preventDefault();if(f.phase!=='reel')fishAction(true);};}
    if(c)c.onclick=function(e){e.preventDefault();finishFishing(false,true);};
  }

  function finishFishing(success,cancelled){
    var f=engine.fish;if(!f)return;
    if(success){engine.caughtFish.push({id:f.fishId,pond:f.spot.id});engine.spots[f.spot.id]=true;say('Caught '+f.fish.name+'!');pop(f.fish.icon+' '+f.fish.name,engine.state.x,engine.state.y-75,'good');}
    else if(!cancelled){say('The fish slipped away. The ripples settle again.');pop('Slipped away',engine.state.x,engine.state.y-75,'bad');}
    engine.mode='explore';engine.fish=null;engine.pointerHeld=false;hideFishUi();updateHud();
  }

  function chooseFish(spot){
    var list=spot.fish.slice(),inv=engine.gear||{};
    if(inv.glow_lure&&(spot.id==='cave_spring'||spot.id==='blue_lily_pond'))list.push('fish_glass_gill','fish_honeyfin');
    if(inv.root_worm&&(spot.id==='bridge_run'||spot.id==='waterfall_pool'))list.push('fish_brook_blinker');
    var roll=Math.random();
    if(roll>.88&&list.length>2)return list[list.length-1];
    if(roll>.56&&list.length>1)return list[1];
    return list[0];
  }

  function checkPickups(){MEADOW.pickups.forEach(function(p){if(engine.collected[p.id])return;if(dist(engine.state.x,engine.state.y,p.x,p.y)<52)collectPickup(p.id);});}
  function collectPickup(id){var p=find(MEADOW.pickups,id);if(!p||engine.collected[p.id])return;engine.collected[p.id]=true;var n=engine.world.querySelector('[data-pickup="'+css(id)+'"]');if(n)n.classList.add('taken');if(p.keyItem)engine.discoveries[p.keyItem]=true;else engine.collected[p.type]=Number(engine.collected[p.type]||0)+1;say('Collected '+p.text+'.');pop(p.icon+' '+p.text,p.x,p.y-42,'good');updateHud();}
  function checkDiscoveries(){MEADOW.discoveries.forEach(function(d){if(engine.discoveries[d.id])return;if(dist(engine.state.x,engine.state.y,d.x,d.y)<d.r){engine.discoveries[d.id]=true;say(d.title+': '+d.text);pop('Discovery',d.x,d.y-70,'info');}});}
  function checkExit(){var e=MEADOW.exit;if(engine.state.x>e.x&&engine.state.x<e.x+e.w&&engine.state.y>e.y&&engine.state.y<e.y+e.h)showComplete();}
  function showComplete(){if(!engine.completeEl.classList.contains('hidden'))return;engine.completeEl.innerHTML='<div class="sunCard"><h2>Sunny Meadows</h2><p>You carry meadow dew, fishing stories, and quiet ripples home.</p><div><span>'+Number(engine.collected.sunny_dew||0)+' Dew</span><span>'+engine.caughtFish.length+' Fish</span><span>'+Object.keys(engine.discoveries).length+' Discoveries</span></div><button id="sunFinish" class="primary">Return Home</button><button id="sunStay">Keep Exploring</button></div>';engine.completeEl.classList.remove('hidden');document.getElementById('sunFinish').onclick=complete;document.getElementById('sunStay').onclick=function(){engine.completeEl.classList.add('hidden');engine.state.x-=120;};}

  function complete(){
    var payload={zoneId:'sunny_meadows',collected:{sunny_dew:Number(engine.collected.sunny_dew||0)},caughtFish:engine.caughtFish.slice(0,50),discoveries:Object.keys(engine.discoveries),keyItems:Object.keys(engine.discoveries).filter(function(k){return k==='meadow_charm'}),stats:{goalReached:true,hazardsHit:0,puzzlesSolved:Object.keys(engine.spots).length},durationMs:Date.now()-engine.startedAt};
    stop(true,payload);
  }
  function stop(done,payload){if(!engine.running)return;engine.running=false;cancelAnimationFrame(engine.raf);engine.root.classList.add('hidden');engine.mode='explore';if(done&&engine.callbacks.onComplete)engine.callbacks.onComplete(payload||{});if(!done&&engine.callbacks.onCancel)engine.callbacks.onCancel();}

  function updateCamera(dt){var sw=engine.scene.clientWidth||900,sh=engine.scene.clientHeight||600;var tx=clamp(engine.state.x-sw*.5,0,WORLD_W-sw),ty=clamp(engine.state.y-sh*.55,0,WORLD_H-sh);engine.camera.x+=(tx-engine.camera.x)*.09*dt;engine.camera.y+=(ty-engine.camera.y)*.09*dt;engine.world.style.transform='translate('+(-engine.camera.x)+'px,'+(-engine.camera.y)+'px)';}
  function updateActors(){var s=engine.state,p=engine.petState||s;engine.heroEl.style.left=s.x+'px';engine.heroEl.style.top=s.y+'px';engine.heroEl.style.setProperty('--face',s.facing);engine.heroEl.classList.toggle('moving',Math.abs(s.vx)+Math.abs(s.vy)>1.1);engine.heroEl.classList.toggle('fishing',engine.mode==='fishing');engine.petEl.style.left=p.x+'px';engine.petEl.style.top=p.y+'px';engine.petEl.classList.toggle('moving',dist(p.x,p.y,s.x,s.y)>85);engine.petEl.classList.toggle('fishing',engine.mode==='fishing');}
  function updateHud(){engine.hud.innerText=Number(engine.collected.sunny_dew||0)+' dew • '+engine.caughtFish.length+' fish • '+Object.keys(engine.discoveries).length+' discoveries';}
  function maybeAmbient(){var now=Date.now();if(now-engine.lastAmbientAt<8500)return;engine.lastAmbientAt=now;var msgs=['Grass moves in waves across the meadow.','Your companion watches a ripple that disappears too quickly.','A bird calls from somewhere near the old stones.','The water flashes gold for one breath.','Fireflies blink between the old trees.'];say(msgs[Math.floor(Math.random()*msgs.length)]);}
  function saySoft(t){var now=Date.now();if(now-engine.lastPromptAt<1200)return;engine.lastPromptAt=now;say(t);}
  function setupPointer(){
    engine.scene.addEventListener('pointerdown',function(e){if(!engine.running)return;if(e.target&&String(e.target.tagName).toLowerCase()==='button')return;var r=engine.scene.getBoundingClientRect();if(engine.mode==='fishing'){engine.pointerHeld=true;fishAction(true);return;}engine.touchTarget={x:e.clientX-r.left+engine.camera.x,y:e.clientY-r.top+engine.camera.y};},{passive:false});
    engine.scene.addEventListener('pointerup',function(){if(engine.mode==='fishing'){engine.pointerHeld=false;fishAction(false);}}, {passive:false});
  }
  function onKey(e){if(!engine.running)return;var codes=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','Space','KeyE'];if(codes.indexOf(e.code)<0)return;if(e.type==='keydown'){engine.keys[e.code]=true;if((e.code==='Space'||e.code==='KeyE')&&!engine._actionHeld){engine._actionHeld=true;fishAction(true);}}else{engine.keys[e.code]=false;if(e.code==='Space'||e.code==='KeyE'){engine._actionHeld=false;fishAction(false);}}e.preventDefault();}
  function say(t){engine.lastPromptAt=Date.now();engine.prompt.innerText=t;engine.prompt.classList.remove('pulse');void engine.prompt.offsetWidth;engine.prompt.classList.add('pulse');}
  function pop(t,x,y,type){var el=document.createElement('div');el.className='sunPop '+(type||'info');el.innerText=t;el.style.left=(x-engine.camera.x)+'px';el.style.top=(y-engine.camera.y)+'px';engine.scene.appendChild(el);setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},1150);}
  function petMarkup(p){p=p||{};var src=p.asset||p.image||'';if(src)return '<img src="'+esc(src)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'"><span style="display:none">'+esc(p.emoji||'🐾')+'</span>';return '<span>'+esc(p.emoji||'🐾')+'</span>';}
  function find(a,id){return (a||[]).find(function(x){return String(x.id)===String(id);});}
  function dist(a,b,c,d){var x=a-c,y=b-d;return Math.sqrt(x*x+y*y);}function clamp(v,a,b){return Math.max(a,Math.min(b,v));}function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}function css(s){return String(s).replace(/"/g,'\\"')}

  function injectStyles(){if(document.getElementById('gfSunnyStyles'))return;var s=document.createElement('style');s.id='gfSunnyStyles';s.textContent=''
+'.gfSunny{position:fixed;inset:0;z-index:99998;background:#0f2418;color:#16301d;display:grid;grid-template-rows:auto minmax(0,1fr);font-family:Arial,Helvetica,sans-serif;touch-action:none}.gfSunny.hidden{display:none}.sunTop{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,.74);border-bottom:1px solid rgba(22,101,52,.16);backdrop-filter:blur(14px);box-shadow:0 12px 30px rgba(22,101,52,.12);z-index:5}.sunTop b{display:block;font-size:18px}.sunTop span{font-size:12px;color:#3f6b45;font-weight:800}.sunTopActions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.sunTopActions>span{background:rgba(255,255,255,.72);border:1px solid rgba(22,101,52,.16);border-radius:999px;padding:6px 9px;color:#28522d}.sunTop button,.fishPanel button,.fishReady button,.sunCard button{border:0;border-radius:999px;padding:8px 11px;font-weight:1000;cursor:pointer;background:rgba(22,101,52,.12);color:#16301d}.sunTop button.primary,.fishReady button,.fishPanel button#fishAction,.sunCard .primary{background:linear-gradient(135deg,#22c55e,#facc15);color:#102414}.sunScene{position:relative;overflow:hidden;background:#12331e}.sunWorld{position:absolute;left:0;top:0;width:4096px;height:4096px;will-change:transform}.sunPaintedMap{position:absolute;inset:0;background-image:url("'+BG_URL+'");background-size:100% 100%;background-position:center;background-repeat:no-repeat}.sunShade{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.06),transparent 32%),linear-gradient(180deg,rgba(0,0,0,.06),rgba(0,0,0,0) 42%,rgba(0,0,0,.15));mix-blend-mode:multiply}.sunWaterSparkle{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 18% 48%,rgba(255,255,255,.20),transparent 2%),radial-gradient(circle at 70% 35%,rgba(255,255,255,.16),transparent 2%),radial-gradient(circle at 14% 78%,rgba(255,255,255,.14),transparent 2%);animation:sunWaterTwinkle 3.8s ease-in-out infinite}.sunFishSpot{position:absolute;z-index:6;transform:translate(-50%,-50%);border:0;background:transparent;border-radius:50%;cursor:pointer;opacity:.78}.sunFishSpot span{position:absolute;left:50%;top:50%;width:64px;height:22px;border-radius:50%;background:rgba(255,255,255,.54);box-shadow:0 0 24px rgba(125,211,252,.72);animation:sunFishShadow 3.1s ease-in-out infinite}.sunFishSpot i{position:absolute;left:50%;top:50%;width:112px;height:42px;border:2px solid rgba(255,255,255,.55);border-radius:50%;transform:translate(-50%,-50%);animation:sunRipple 2.6s ease-in-out infinite}.sunFishSpot b{position:absolute;left:50%;top:calc(50% + 34px);transform:translateX(-50%);font-size:10px;background:rgba(255,255,255,.78);color:#164e31;padding:3px 8px;border-radius:999px;opacity:0;white-space:nowrap}.sunFishSpot.near,.sunFishSpot:hover{opacity:1}.sunFishSpot.near b,.sunFishSpot:hover b{opacity:1}.sunFishSpot.hiddenSpot span{background:rgba(187,247,208,.48)}.sunPickup{position:absolute;z-index:18;transform:translate(-50%,-50%);border:0;background:transparent;cursor:pointer}.sunPickup span{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:radial-gradient(circle,#fff,#fde68a 58%,rgba(250,204,21,.12));border:1px solid rgba(250,204,21,.55);filter:drop-shadow(0 8px 8px rgba(0,0,0,.12));animation:sunBob 1.5s ease-in-out infinite}.sunPickup.taken{display:none}.sunDiscovery{position:absolute;border-radius:50%;pointer-events:none}.sunExit{position:absolute;z-index:7;border-radius:34px;background:rgba(255,255,255,.34);border:2px solid rgba(22,101,52,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:1000;color:#22543d;box-shadow:0 18px 40px rgba(22,101,52,.13);backdrop-filter:blur(2px)}.sunExit span{font-size:11px;color:#4d7c0f}.sunFirefly{position:absolute;z-index:30;width:7px;height:7px;border-radius:50%;background:rgba(254,240,138,.88);box-shadow:0 0 14px rgba(254,240,138,.95),0 0 28px rgba(187,247,208,.32);animation:sunFirefly var(--d,7s) ease-in-out infinite;pointer-events:none}.sunFirefly.f1{animation-delay:-1.2s}.sunFirefly.f2{animation-delay:-2.4s}.sunFirefly.f3{animation-delay:-3.6s}.sunFirefly.f4{animation-delay:-4.8s}.sunCanopy{position:absolute;z-index:25;border-radius:48%;pointer-events:none;background:radial-gradient(circle,rgba(28,83,45,.34),rgba(34,197,94,.18) 45%,transparent 72%);mix-blend-mode:multiply;opacity:.92;transition:opacity .22s ease,filter .22s ease}.sunCanopy.soft{opacity:.26;filter:blur(1px)}.sunHero{position:absolute;z-index:22;width:68px;height:78px;transform:translate(-50%,-68%) scaleX(var(--face,1));display:grid;place-items:center;filter:drop-shadow(0 14px 12px rgba(22,101,52,.30))}.sunHero span{display:grid;place-items:center;width:58px;height:68px;border-radius:22px;font-size:40px;background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.02))}.sunHero.moving span{animation:sunHeroWalk .38s ease-in-out infinite}.sunHero.fishing{filter:drop-shadow(0 0 18px rgba(250,204,21,.7)) drop-shadow(0 14px 12px rgba(22,101,52,.30))}.sunPetCompanion{position:absolute;z-index:21;width:58px;height:58px;transform:translate(-50%,-50%);display:grid;place-items:center;filter:drop-shadow(0 10px 10px rgba(22,101,52,.26))}.sunPetCompanion img{max-width:56px;max-height:56px;object-fit:contain}.sunPetCompanion span{display:grid;place-items:center;width:54px;height:54px;font-size:34px}.sunPetCompanion.moving img,.sunPetCompanion.moving span{animation:sunPetWalk .45s ease-in-out infinite}.sunPetCompanion.fishing{filter:drop-shadow(0 0 12px rgba(250,204,21,.65))}.sunPrompt{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:50;width:min(720px,calc(100% - 28px));text-align:center;background:rgba(255,255,255,.70);border:1px solid rgba(22,101,52,.16);border-radius:999px;padding:7px 12px;font-size:12px;font-weight:1000;color:#22543d;box-shadow:0 12px 28px rgba(22,101,52,.10);pointer-events:none}.sunPrompt.pulse{animation:sunPrompt .25s ease}.sunFishUi{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:55;width:min(650px,calc(100% - 24px));background:rgba(255,255,255,.84);border:1px solid rgba(22,101,52,.16);border-radius:22px;padding:9px;box-shadow:0 18px 45px rgba(22,101,52,.16);backdrop-filter:blur(14px)}.sunFishUi.hidden,.sunComplete.hidden{display:none}.fishReady{display:flex;align-items:center;justify-content:space-between;gap:10px}.fishReady b,.fishHead b{display:block;color:#16301d}.fishReady span,.fishPanel p{font-size:12px;color:#3f6b45;font-weight:800;margin:2px 0 0}.fishPanel{display:grid;gap:8px}.fishHead{display:flex;justify-content:space-between;align-items:center;gap:8px}.castTrack,.tension,.catchProgress{position:relative;height:17px;border-radius:999px;background:rgba(22,101,52,.12);overflow:hidden}.castTrack i{position:absolute;left:33%;top:0;width:40%;height:100%;background:linear-gradient(90deg,rgba(250,204,21,.34),rgba(34,197,94,.58),rgba(250,204,21,.34))}.castTrack span{position:absolute;top:-4px;width:10px;height:25px;border-radius:999px;background:#166534;transform:translateX(-50%);box-shadow:0 0 8px rgba(22,101,52,.4)}.floatBox{position:relative;height:70px;border-radius:18px;background:linear-gradient(180deg,rgba(14,165,233,.22),rgba(14,165,233,.08));overflow:hidden;border:1px solid rgba(14,165,233,.18)}.floatBox:before{content:"";position:absolute;left:0;right:0;top:43px;height:2px;background:rgba(255,255,255,.5)}.floatBox span{position:absolute;left:50%;top:18px;width:12px;height:34px;border-radius:999px;background:linear-gradient(180deg,#f97316 0 52%,#fff 52%);transform:translateX(-50%);transition:top .1s}.floatBox i{position:absolute;left:50%;top:42px;width:120px;height:22px;border:2px solid rgba(255,255,255,.38);border-radius:50%;transform:translateX(-50%);animation:sunRipple 1.5s ease-in-out infinite}.floatBox.bite span{top:34px;animation:floatBite .22s ease-in-out infinite}.floatBox.bite{box-shadow:inset 0 0 24px rgba(250,204,21,.28)}.tension span,.catchProgress span{display:block;height:100%;background:linear-gradient(90deg,#ef4444,#f59e0b,#22c55e,#f59e0b,#ef4444)}.catchProgress span{background:linear-gradient(90deg,#38bdf8,#22c55e)}.tension i{position:absolute;left:28%;right:24%;top:3px;bottom:3px;border-radius:999px;border:1px solid rgba(255,255,255,.95);box-shadow:0 0 0 999px rgba(255,255,255,.06)}.sunComplete{position:absolute;inset:0;z-index:70;display:grid;place-items:center;background:rgba(22,101,52,.20);backdrop-filter:blur(5px)}.sunCard{width:min(520px,calc(100% - 32px));background:rgba(255,255,255,.9);border:1px solid rgba(22,101,52,.16);border-radius:28px;padding:22px;box-shadow:0 30px 80px rgba(22,101,52,.22);text-align:center}.sunCard h2{margin:0 0 6px}.sunCard p{color:#3f6b45;font-weight:800}.sunCard div{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:12px 0}.sunCard span{padding:7px 10px;border-radius:999px;background:rgba(34,197,94,.12);font-weight:1000}.sunPop{position:absolute;z-index:75;transform:translate(-50%,-50%);font-weight:1000;text-shadow:0 1px 0 rgba(255,255,255,.7);animation:sunPop 1.1s ease forwards;pointer-events:none}.sunPop.good{color:#166534}.sunPop.bad{color:#b91c1c}.sunPop.info{color:#0f766e}@keyframes sunBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes sunRipple{0%,100%{transform:translate(-50%,-50%) scale(.75);opacity:.25}50%{transform:translate(-50%,-50%) scale(1.25);opacity:.8}}@keyframes sunFishShadow{0%,100%{transform:translate(-50%,-50%) scale(.8);opacity:.22}50%{transform:translate(-12px,-23px) scale(1.15);opacity:.66}}@keyframes sunWaterTwinkle{0%,100%{opacity:.3}50%{opacity:.9}}@keyframes sunFirefly{0%,100%{transform:translate(0,0) scale(.7);opacity:.18}22%{opacity:.9}50%{transform:translate(var(--fx),var(--fy)) scale(1.1);opacity:.72}76%{opacity:.35}}@keyframes sunHeroWalk{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}@keyframes sunPetWalk{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-4px) rotate(2deg)}}@keyframes sunPrompt{0%{transform:translateX(-50%) scale(.98)}75%{transform:translateX(-50%) scale(1.015)}100%{transform:translateX(-50%) scale(1)}}@keyframes sunPop{0%{opacity:0;transform:translate(-50%,-35%) scale(.92)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-105%) scale(1.04)}}@keyframes floatBite{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(4px)}}@media(max-width:760px){.sunTop{align-items:flex-start;flex-direction:column;padding:6px 8px}.sunTop span#sunSub{display:none}.sunTopActions{width:100%;justify-content:space-between}.sunPrompt{top:7px;font-size:11px}.sunFishUi{bottom:8px;width:calc(100% - 16px)}}';document.head.appendChild(s);}

  window.SunnyMeadowsEngine={start:start,stop:stop,isRunning:function(){return engine.running;}};
})();
