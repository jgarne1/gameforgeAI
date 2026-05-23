/*
  GameForge World Engine v1
  Purpose: reusable top-down painted-map exploration engine for PetWorld regions.
  Design goals:
  - Region-config driven: Shadow Woods, Sunny Meadows, Tide maps, etc. should reuse this engine.
  - Painted map background is the world, with collision/hotspots/particles layered over it.
  - Human explorer is controlled; active pet follows and reacts.
  - Fishing is a world system, not a separate minigame page.
*/
(function(){
  'use strict';

  var REGIONS={
    shadow_woods:{
      id:'shadow_woods',
      name:'Shadow Woods',
      subtitle:'A quiet moonlit forest where hidden ponds glow beneath the trees.',
      map:'/assets/backgrounds/shadow_woods_map.png',
      width:2400,
      height:1600,
      start:{x:190,y:1280},
      objective:'Find the moonlit pond and catch a Glowminnow.',
      returnAt:{x:205,y:1320,w:180,h:160,label:'Meadow Path'},
      completionText:'You found the moonlit water and brought a forest catch home.',
      collectibles:[
        {id:'moonleaf_1',type:'shadow_glimmer',x:640,y:1110,label:'Moonleaf'},
        {id:'moonleaf_2',type:'shadow_glimmer',x:1540,y:705,label:'Moonleaf'},
        {id:'moonleaf_3',type:'shadow_glimmer',x:1960,y:360,label:'Moonleaf'}
      ],
      storySpots:[
        {id:'old_cave',x:230,y:310,r:90,title:'Root Cave',text:'Cool air drifts from the cave. Your pet refuses to step in yet.'},
        {id:'ruins',x:1655,y:1015,r:105,title:'Broken Shrine',text:'The stones hum softly. Fireflies gather around your companion.'},
        {id:'bridge_whisper',x:1200,y:730,r:80,title:'Bridge Whisper',text:'The stream carries a sound like distant bells.'}
      ],
      fishingSpots:[
        {id:'lower_pond',name:'Lower Moon Pond',x:455,y:1280,r:145,region:'Shadow Woods',hint:'Soft ripples move under lily shadows.',fish:[
          {id:'moonlit_minnow',name:'Moonlit Minnow',rarity:'common',value:8,behavior:'timid'},
          {id:'mossgill',name:'Mossgill',rarity:'common',value:6,behavior:'steady'},
          {id:'glowminnow',name:'Glowminnow',rarity:'uncommon',value:18,behavior:'dart'}
        ]},
        {id:'cave_pool',name:'Cave Pool',x:1210,y:335,r:155,region:'Shadow Woods',hint:'The water glows faintly beneath old roots.',requiresDiscovery:'old_cave',fish:[
          {id:'glowminnow',name:'Glowminnow',rarity:'uncommon',value:18,behavior:'dart'},
          {id:'blackwater_eel',name:'Blackwater Eel',rarity:'rare',value:42,behavior:'heavy'}
        ]},
        {id:'upper_spring',name:'Upper Spring',x:2020,y:300,r:120,region:'Shadow Woods',hint:'Something bright flickers near the far bank.',fish:[
          {id:'silver_mote_koi',name:'Silver Mote Koi',rarity:'rare',value:55,behavior:'finesse'},
          {id:'moonlit_minnow',name:'Moonlit Minnow',rarity:'common',value:8,behavior:'timid'}
        ]}
      ],
      colliders:[
        // ponds and stream, intentionally generous so shorelines feel solid.
        {id:'pond_lower',shape:'ellipse',x:455,y:1280,rx:235,ry:125},
        {id:'pond_right',shape:'ellipse',x:1850,y:1185,rx:230,ry:145},
        {id:'pond_upper',shape:'ellipse',x:2020,y:300,rx:190,ry:115},
        {id:'cave_pool',shape:'ellipse',x:1210,y:335,rx:310,ry:130},
        {id:'creek_1',shape:'rect',x:1130,y:0,w:125,h:680},
        {id:'creek_2',shape:'rect',x:1135,y:760,w:115,h:850},
        // heavy forest boundaries.
        {id:'forest_top',shape:'rect',x:0,y:0,w:2400,h:95},
        {id:'forest_left',shape:'rect',x:0,y:0,w:80,h:1600},
        {id:'forest_right',shape:'rect',x:2320,y:0,w:80,h:1600},
        {id:'forest_bottom',shape:'rect',x:0,y:1515,w:2400,h:85},
        {id:'cave_wall',shape:'rect',x:85,y:160,w:300,h:185},
        {id:'ruins_wall',shape:'rect',x:1510,y:910,w:330,h:210},
        {id:'north_grove',shape:'ellipse',x:365,y:340,rx:270,ry:185},
        {id:'east_grove',shape:'ellipse',x:2240,y:885,rx:250,ry:250},
        {id:'south_grove',shape:'ellipse',x:2030,y:1360,rx:360,ry:190}
      ],
      canopy:[
        {id:'north_grove',x:110,y:110,w:560,h:430,opacity:.52},
        {id:'east_grove',x:1990,y:610,w:430,h:520,opacity:.50},
        {id:'south_grove',x:1660,y:1110,w:720,h:380,opacity:.48},
        {id:'lower_left_grove',x:0,y:1320,w:650,h:280,opacity:.44}
      ],
      fireflies:[
        {x:400,y:360,count:18,spread:260},
        {x:1210,y:330,count:20,spread:300},
        {x:1845,y:1180,count:14,spread:230},
        {x:1600,y:990,count:16,spread:240},
        {x:2050,y:300,count:13,spread:210}
      ],
      spawnMotes:90
    }
  };

  var engine={
    mounted:false,running:false,root:null,viewport:null,world:null,fx:null,prompt:null,hud:null,fishPanel:null,region:null,
    callbacks:{},pet:null,player:null,companion:null,camera:{x:0,y:0},keys:{},target:null,last:0,raf:0,
    collected:{},discoveries:{},fishCaught:[],fishing:null,nearFishing:null,nearStory:null,returnReady:false
  };

  function mount(){
    if(engine.mounted)return;
    injectStyles();
    engine.root=document.createElement('div');
    engine.root.id='gfWorldRoot';
    engine.root.className='gfWorld hidden';
    engine.root.innerHTML=[
      '<div class="gfWorldHud" id="gfWorldHud"><b>World</b><span>Explore</span><button id="gfWorldReturn">Return</button></div>',
      '<div class="gfWorldViewport" id="gfWorldViewport">',
        '<div class="gfWorld" id="gfWorld"></div>',
        '<div class="gfWorldFx" id="gfWorldFx"></div>',
        '<div class="gfWorldPrompt" id="gfWorldPrompt"></div>',
        '<div class="gfFishPanel hidden" id="gfFishPanel"></div>',
      '</div>'
    ].join('');
    document.body.appendChild(engine.root);
    engine.viewport=document.getElementById('gfWorldViewport');
    engine.world=document.getElementById('gfWorld');
    engine.fx=document.getElementById('gfWorldFx');
    engine.prompt=document.getElementById('gfWorldPrompt');
    engine.hud=document.getElementById('gfWorldHud');
    engine.fishPanel=document.getElementById('gfFishPanel');
    document.getElementById('gfWorldReturn').onclick=function(){complete(false)};
    window.addEventListener('keydown',onKey,true);
    window.addEventListener('keyup',onKey,true);
    setupPointer();
    engine.mounted=true;
  }

  function start(options){
    mount();
    options=options||{};
    var id=(options.regionId||options.zoneId||'shadow_woods');
    engine.region=clone(REGIONS[id]||REGIONS.shadow_woods);
    if(options.region)engine.region=mergeRegion(engine.region,options.region);
    engine.callbacks=options.callbacks||{};
    engine.pet=options.pet||{};
    engine.collected={};engine.discoveries={};engine.fishCaught=[];engine.nearFishing=null;engine.nearStory=null;engine.returnReady=false;engine.fishing=null;
    engine.player={x:engine.region.start.x,y:engine.region.start.y,vx:0,vy:0,dir:'down',moving:false};
    engine.companion={x:engine.player.x-36,y:engine.player.y+34,vx:0,vy:0,dir:'down',mood:'curious'};
    renderWorld();
    engine.root.classList.remove('hidden');
    engine.running=true;engine.last=performance.now();
    say('Shadow Woods is quiet. Follow the paths, watch the water, and look for fireflies.');
    engine.raf=requestAnimationFrame(loop);
    if(engine.callbacks.onStart)engine.callbacks.onStart(engine.region);
  }

  function renderWorld(){
    var r=engine.region;
    engine.world.style.width=r.width+'px';
    engine.world.style.height=r.height+'px';
    var html='';
    html+='<img class="gfMap" src="'+esc(r.map)+'" draggable="false">';
    (r.fishingSpots||[]).forEach(function(s){html+='<button class="gfFishSpot" data-fish="'+esc(s.id)+'" style="left:'+s.x+'px;top:'+s.y+'px;width:'+(s.r*1.2)+'px;height:'+(s.r*.7)+'px"><i></i><span>ripples</span></button>';});
    (r.collectibles||[]).forEach(function(c){html+='<button class="gfWorldPickup" data-pick="'+esc(c.id)+'" style="left:'+c.x+'px;top:'+c.y+'px"><span>✦</span></button>';});
    (r.storySpots||[]).forEach(function(s){html+='<div class="gfStorySpot" data-story="'+esc(s.id)+'" style="left:'+s.x+'px;top:'+s.y+'px"></div>';});
    html+='<div class="gfReturnZone" style="left:'+r.returnAt.x+'px;top:'+r.returnAt.y+'px;width:'+r.returnAt.w+'px;height:'+r.returnAt.h+'px"><span>'+esc(r.returnAt.label||'Return')+'</span></div>';
    html+='<div class="gfExplorer" id="gfExplorer"><div class="head"></div><div class="body"></div><div class="shadow"></div></div>';
    html+='<div class="gfCompanion" id="gfCompanion">'+petMarkup(engine.pet)+'</div>';
    (r.canopy||[]).forEach(function(c){html+='<div class="gfCanopy" data-canopy="'+esc(c.id)+'" style="left:'+c.x+'px;top:'+c.y+'px;width:'+c.w+'px;height:'+c.h+'px;--op:'+c.opacity+'"></div>';});
    engine.world.innerHTML=html;
    engine.player.el=document.getElementById('gfExplorer');
    engine.companion.el=document.getElementById('gfCompanion');
    spawnParticles();
    updateHud();
  }

  function spawnParticles(){
    var r=engine.region,html='';
    (r.fireflies||[]).forEach(function(group,gi){
      for(var i=0;i<group.count;i++){
        var a=Math.random()*Math.PI*2,rad=Math.random()*group.spread;
        var x=group.x+Math.cos(a)*rad,y=group.y+Math.sin(a)*rad*.65;
        html+='<i class="gfFirefly" style="left:'+x+'px;top:'+y+'px;--d:'+(2+Math.random()*4)+'s;--dx:'+((-18+Math.random()*36).toFixed(1))+'px;--dy:'+((-14+Math.random()*28).toFixed(1))+'px"></i>';
      }
    });
    for(var m=0;m<(r.spawnMotes||0);m++){
      html+='<i class="gfMote" style="left:'+(Math.random()*r.width)+'px;top:'+(Math.random()*r.height)+'px;--d:'+(6+Math.random()*10)+'s"></i>';
    }
    engine.fx.innerHTML=html;
  }

  function loop(now){
    if(!engine.running)return;
    var dt=Math.min(32,now-engine.last||16)/16.666;engine.last=now;
    if(!engine.fishing)updateMovement(dt); else updateFishing(dt);
    updateCompanion(dt);checkNearby();updateCamera(dt);drawEntities();
    engine.raf=requestAnimationFrame(loop);
  }

  function updateMovement(dt){
    var p=engine.player;
    var ax=0,ay=0;
    if(engine.keys.ArrowLeft||engine.keys.KeyA)ax-=1;
    if(engine.keys.ArrowRight||engine.keys.KeyD)ax+=1;
    if(engine.keys.ArrowUp||engine.keys.KeyW)ay-=1;
    if(engine.keys.ArrowDown||engine.keys.KeyS)ay+=1;
    if(ax||ay){engine.target=null;var len=Math.hypot(ax,ay)||1;ax/=len;ay/=len;}
    else if(engine.target){var dx=engine.target.x-p.x,dy=engine.target.y-p.y,dist=Math.hypot(dx,dy);if(dist>8){ax=dx/dist;ay=dy/dist;}else engine.target=null;}
    var speed=4.1,accel=.23,friction=.80;
    var tvx=ax*speed,tvy=ay*speed;
    p.vx+=(tvx-p.vx)*accel*dt;p.vy+=(tvy-p.vy)*accel*dt;
    if(!ax&&!ay){p.vx*=Math.pow(friction,dt);p.vy*=Math.pow(friction,dt);}
    if(Math.abs(p.vx)<.025)p.vx=0;if(Math.abs(p.vy)<.025)p.vy=0;
    var nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;
    if(!blocked(nx,p.y))p.x=clamp(nx,32,engine.region.width-32);else p.vx=0;
    if(!blocked(p.x,ny))p.y=clamp(ny,32,engine.region.height-32);else p.vy=0;
    p.moving=Math.abs(p.vx)+Math.abs(p.vy)>.08;
    if(Math.abs(p.vx)>Math.abs(p.vy))p.dir=p.vx<0?'left':'right';else if(Math.abs(p.vy)>.08)p.dir=p.vy<0?'up':'down';
  }

  function blocked(x,y){
    var c=engine.region.colliders||[];
    for(var i=0;i<c.length;i++){
      var o=c[i];
      if(o.shape==='rect'&&x>o.x&&x<o.x+o.w&&y>o.y&&y<o.y+o.h)return true;
      if(o.shape==='ellipse'){
        var dx=(x-o.x)/(o.rx||1),dy=(y-o.y)/(o.ry||1);
        if(dx*dx+dy*dy<1)return true;
      }
    }
    return false;
  }

  function updateCompanion(dt){
    var p=engine.player,c=engine.companion;
    var desired={x:p.x-32*(p.dir==='right'?1:p.dir==='left'?-1:0)-34,y:p.y+38};
    var dx=desired.x-c.x,dy=desired.y-c.y,dist=Math.hypot(dx,dy);
    if(dist>16){c.vx+=(dx*.035-c.vx)*.18*dt;c.vy+=(dy*.035-c.vy)*.18*dt;}else{c.vx*=.82;c.vy*=.82;}
    c.x+=c.vx*dt;c.y+=c.vy*dt;
    c.moving=Math.abs(c.vx)+Math.abs(c.vy)>.08;
  }

  function checkNearby(){
    var p=engine.player,r=engine.region;
    engine.nearFishing=null;engine.nearStory=null;engine.returnReady=false;
    (r.collectibles||[]).forEach(function(c){if(engine.collected[c.id])return;if(dist(p,c)<44)collect(c);});
    (r.storySpots||[]).forEach(function(s){if(engine.discoveries[s.id])return;if(dist(p,s)<s.r){engine.nearStory=s;discoverStory(s);}});
    (r.fishingSpots||[]).forEach(function(s){if(dist(p,s)<s.r+20)engine.nearFishing=s;});
    var ret=r.returnAt;if(p.x>ret.x&&p.x<ret.x+ret.w&&p.y>ret.y&&p.y<ret.y+ret.h)engine.returnReady=true;
    updatePrompt();
    updateCanopy();
  }

  function collect(c){
    engine.collected[c.id]=true;
    var n=engine.world.querySelector('[data-pick="'+cssEscape(c.id)+'"]');if(n)n.classList.add('taken');
    pop('+'+(c.label||'Glimmer'),c.x,c.y,'good');
    if(engine.callbacks.onCollect)engine.callbacks.onCollect(c);
    updateHud();
  }

  function discoverStory(s){
    engine.discoveries[s.id]=true;
    pop(s.title,s.x,s.y,'info');
    say(s.title+': '+s.text);
    if(engine.callbacks.onDiscover)engine.callbacks.onDiscover(s);
    updateHud();
  }

  function updatePrompt(){
    if(engine.fishing)return;
    if(engine.nearFishing){say('Water ripples nearby. Press F / Space, or click the ripples, to cast.');return;}
    if(engine.returnReady){say('Meadow path. Press E to return home.');return;}
    if(!engine.prompt.textContent||engine.prompt.dataset.sticky!=='1')say(engine.region.objective||'Explore.');
  }

  function updateCanopy(){
    var p=engine.player;
    Array.prototype.forEach.call(engine.world.querySelectorAll('.gfCanopy'),function(n){
      var x=parseFloat(n.style.left),y=parseFloat(n.style.top),w=parseFloat(n.style.width),h=parseFloat(n.style.height);
      var inside=p.x>x&&p.x<x+w&&p.y>y&&p.y<y+h;
      n.classList.toggle('fade',inside);
    });
  }

  function startFishing(spot){
    if(engine.fishing||!spot)return;
    engine.fishing={spot:spot,phase:'aim',power:0,dir:1,bite:0,tension:.45,fish:null,progress:0,fail:0,started:performance.now(),message:'Hold/release at the bright zone to cast.'};
    engine.fishPanel.classList.remove('hidden');
    engine.target=null;engine.player.vx=0;engine.player.vy=0;
    say('Casting at '+spot.name+'. Release in the glow zone.');
    renderFishing();
  }

  function updateFishing(dt){
    var f=engine.fishing;if(!f)return;
    if(f.phase==='aim'){
      f.power+=f.dir*.022*dt;if(f.power>1){f.power=1;f.dir=-1;}if(f.power<0){f.power=0;f.dir=1;}
    }else if(f.phase==='bite'){
      f.bite+=.010*dt;if(f.bite>1){finishFishing(false,'The fish slipped away.');}
    }else if(f.phase==='reel'){
      var fishPull={timid:.006,dart:.013,heavy:.018,finesse:.010,steady:.008}[f.fish.behavior]||.009;
      f.tension+=fishPull*dt;
      f.progress+=.0035*dt;
      if(f.tension>.94||f.tension<.06){f.fail+=.015*dt;}else if(f.tension>.34&&f.tension<.72){f.progress+=.010*dt;f.fail=Math.max(0,f.fail-.006*dt);}else f.fail=Math.max(0,f.fail-.002*dt);
      if(f.fail>1)finishFishing(false,'The line went slack.');
      if(f.progress>=1)finishFishing(true);
    }
    renderFishing();
  }

  function fishingAction(){
    var f=engine.fishing;
    if(!f){if(engine.nearFishing)startFishing(engine.nearFishing);return;}
    if(f.phase==='aim'){
      var good=f.power>.42&&f.power<.74;
      f.phase='bite';f.bite=good?.18:.36;f.castGood=good;
      f.message=good?'Clean cast. Watch for the bite!':'Noisy cast. Be ready — fish are wary.';
      setTimeout(function(){if(engine.fishing&&engine.fishing.phase==='bite'){engine.fishing.phase='reel';engine.fishing.fish=chooseFish(engine.fishing.spot,engine.fishing.castGood);engine.fishing.message='Reel carefully. Tap/hold to lower tension.';renderFishing();}},650+Math.random()*850);
    }else if(f.phase==='bite'){
      if(f.bite>.22&&f.bite<.82){f.phase='reel';f.fish=chooseFish(f.spot,f.castGood);f.message='Hooked! Keep tension in the green.';}
      else finishFishing(false,'Too early. The ripple vanished.');
    }else if(f.phase==='reel'){
      f.tension-=.075;
    }
    renderFishing();
  }

  function chooseFish(spot,good){
    var pool=spot.fish||[];
    var weights=pool.map(function(f){var w=f.rarity==='rare'?1.1:f.rarity==='uncommon'?3:6;if(good&&f.rarity!=='common')w*=1.8;return w;});
    var total=weights.reduce(function(a,b){return a+b},0),roll=Math.random()*total;
    for(var i=0;i<pool.length;i++){roll-=weights[i];if(roll<=0)return clone(pool[i]);}
    return clone(pool[0]||{id:'pond_fish',name:'Pond Fish',rarity:'common',value:5,behavior:'steady'});
  }

  function finishFishing(success,msg){
    var f=engine.fishing;if(!f)return;
    if(success){
      engine.fishCaught.push({id:f.fish.id,name:f.fish.name,rarity:f.fish.rarity,region:engine.region.id,spot:f.spot.id,value:f.fish.value});
      pop('Caught '+f.fish.name+'!',engine.player.x,engine.player.y-44,'good');
      say('Caught '+f.fish.name+'! '+(f.fish.rarity==='rare'?'A rare forest catch.':'The pond settles again.'));
      if(engine.callbacks.onFish)engine.callbacks.onFish(f.fish);
    }else{
      say(msg||'The fish got away.');
      pop('Missed',engine.player.x,engine.player.y-44,'bad');
    }
    engine.fishing=null;engine.fishPanel.classList.add('hidden');updateHud();
  }

  function renderFishing(){
    var f=engine.fishing;if(!f)return;
    var html='<div class="gfFishTitle"><b>'+esc(f.spot.name)+'</b><span>'+esc(f.phase)+'</span></div>';
    if(f.phase==='aim')html+='<div class="gfMeter aim"><i style="left:'+(f.power*100)+'%"></i><b></b></div><p>Release inside the glow zone for a clean cast.</p>';
    if(f.phase==='bite')html+='<div class="gfMeter bite"><i style="left:'+(f.bite*100)+'%"></i><b></b></div><p>Tap when the ripple crosses the bright band.</p>';
    if(f.phase==='reel')html+='<div class="gfMeter tension"><i style="left:'+(f.tension*100)+'%"></i><b></b></div><div class="gfProgress"><i style="width:'+(f.progress*100)+'%"></i></div><p>'+esc(f.fish?f.fish.name:'Fish')+' is pulling. Tap/hold to ease tension.</p>';
    html+='<button id="gfFishAction">'+(f.phase==='aim'?'Cast':f.phase==='bite'?'Hook':'Ease Line')+'</button><small>'+esc(f.message||'')+'</small>';
    engine.fishPanel.innerHTML=html;
    var btn=document.getElementById('gfFishAction');if(btn)btn.onclick=fishingAction;
  }

  function updateCamera(dt){
    var v=engine.viewport.getBoundingClientRect();
    var tx=clamp(engine.player.x-v.width*.5,0,engine.region.width-v.width);
    var ty=clamp(engine.player.y-v.height*.56,0,engine.region.height-v.height);
    engine.camera.x+=(tx-engine.camera.x)*.10*dt;engine.camera.y+=(ty-engine.camera.y)*.10*dt;
    var tr='translate3d('+(-engine.camera.x)+'px,'+(-engine.camera.y)+'px,0)';
    engine.world.style.transform=tr;engine.fx.style.transform=tr;
  }

  function drawEntities(){
    var p=engine.player,c=engine.companion;
    p.el.style.left=p.x+'px';p.el.style.top=p.y+'px';p.el.dataset.dir=p.dir;p.el.classList.toggle('moving',p.moving);
    c.el.style.left=c.x+'px';c.el.style.top=c.y+'px';c.el.classList.toggle('moving',c.moving);c.el.classList.toggle('notice',!!engine.nearFishing||!!engine.nearStory);
    // depth sorting feel
    p.el.style.zIndex=Math.round(p.y);c.el.style.zIndex=Math.round(c.y);
  }

  function complete(reached){
    if(!engine.running)return;
    var payload={
      zoneId:engine.region.id,
      collected:countTypes(engine.collected,engine.region.collectibles),
      discoveries:Object.keys(engine.discoveries),
      fishCaught:engine.fishCaught,
      stats:{goalReached:!!reached||engine.fishCaught.length>0,hazardsHit:0,puzzlesSolved:engine.fishCaught.length?1:0},
      durationMs:Math.round(performance.now()-(engine.last||performance.now()))
    };
    engine.running=false;cancelAnimationFrame(engine.raf);engine.root.classList.add('hidden');
    if(engine.callbacks.onComplete)engine.callbacks.onComplete(payload);
  }

  function updateHud(){
    var fish=engine.fishCaught.length,glim=Object.keys(engine.collected).length,disc=Object.keys(engine.discoveries).length;
    engine.hud.innerHTML='<b>'+esc(engine.region.name)+'</b><span>'+glim+' glimmers · '+fish+' fish · '+disc+' discoveries</span><button id="gfWorldReturn">Return</button>';
    document.getElementById('gfWorldReturn').onclick=function(){complete(false)};
  }

  function setupPointer(){
    engine.viewport.addEventListener('pointerdown',function(e){
      if(!engine.running)return;
      var t=e.target;
      if(t.closest&&t.closest('.gfFishPanel'))return;
      var rect=engine.viewport.getBoundingClientRect();
      var x=e.clientX-rect.left+engine.camera.x,y=e.clientY-rect.top+engine.camera.y;
      if(t.closest&&t.closest('.gfFishSpot')){var id=t.closest('.gfFishSpot').getAttribute('data-fish');var spot=findById(engine.region.fishingSpots,id);startFishing(spot);return;}
      if(engine.fishing){fishingAction();return;}
      engine.target={x:x,y:y};
    });
  }

  function onKey(e){
    if(!engine.running)return;
    var codes=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','KeyF','Space','KeyE','Escape'];
    if(codes.indexOf(e.code)<0)return;
    if(e.type==='keydown'){
      engine.keys[e.code]=true;
      if(e.code==='KeyF'||e.code==='Space')fishingAction();
      if(e.code==='KeyE'&&engine.returnReady)complete(false);
      if(e.code==='Escape')complete(false);
    }else engine.keys[e.code]=false;
    e.preventDefault();
  }

  function say(text){engine.prompt.textContent=text||'';engine.prompt.dataset.sticky='1';clearTimeout(engine._sayTimer);engine._sayTimer=setTimeout(function(){engine.prompt.dataset.sticky='0';},4200);}
  function pop(text,x,y,type){var el=document.createElement('div');el.className='gfWorldPop '+(type||'info');el.textContent=text;el.style.left=(x-engine.camera.x)+'px';el.style.top=(y-engine.camera.y-26)+'px';engine.viewport.appendChild(el);setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},1100);}
  function countTypes(flags,list){var out={};(list||[]).forEach(function(c){if(flags[c.id])out[c.type]=Number(out[c.type]||0)+1;});return out;}
  function dist(a,b){return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0));}
  function petMarkup(pet){pet=pet||{};var src=pet.asset||pet.image||'';if(src)return '<img src="'+esc(src)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'"><span style="display:none">'+esc(pet.emoji||'🐾')+'</span>';return '<span>'+esc(pet.emoji||'🐾')+'</span>';}
  function findById(arr,id){return (arr||[]).find(function(x){return String(x.id)===String(id);});}
  function clone(o){return JSON.parse(JSON.stringify(o||{}));}
  function mergeRegion(a,b){var out=Object.assign({},a,b);['collectibles','storySpots','fishingSpots','colliders','canopy','fireflies'].forEach(function(k){out[k]=b[k]||a[k]||[]});return out;}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function cssEscape(s){return String(s).replace(/"/g,'\\"')}

  function injectStyles(){
    if(document.getElementById('gfWorldStyles'))return;
    var s=document.createElement('style');s.id='gfWorldStyles';s.textContent=''
+'.gfWorld{position:fixed;inset:0;background:#07120f;color:#f8fafc;z-index:100000;font-family:Arial,Helvetica,sans-serif;display:grid;grid-template-rows:auto 1fr;touch-action:none}.gfWorld.hidden{display:none}.gfWorldHud{height:44px;display:flex;align-items:center;gap:10px;padding:0 12px;background:rgba(5,12,15,.86);border-bottom:1px solid rgba(180,255,220,.13);box-shadow:0 10px 28px rgba(0,0,0,.22);z-index:10}.gfWorldHud b{font-size:16px}.gfWorldHud span{font-size:12px;font-weight:900;color:#bdebd7;flex:1}.gfWorldHud button{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.09);color:#fff;border-radius:999px;padding:7px 12px;font-weight:1000;cursor:pointer}.gfWorldViewport{position:relative;overflow:hidden;background:radial-gradient(circle at 50% 40%,#153326,#050b0d)}.gfWorldViewport:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 40%,transparent 45%,rgba(0,0,0,.38)),linear-gradient(180deg,rgba(120,255,210,.04),rgba(0,0,0,.18));mix-blend-mode:multiply}.gfWorld,.gfWorldFx{position:absolute;left:0;top:0;will-change:transform}.gfMap{position:absolute;left:0;top:0;width:100%;height:100%;user-select:none;pointer-events:none}.gfExplorer,.gfCompanion{position:absolute;transform:translate(-50%,-78%);pointer-events:none;will-change:left,top,transform}.gfExplorer{width:34px;height:58px}.gfExplorer .shadow,.gfCompanion:after{content:"";position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:38px;height:12px;border-radius:50%;background:rgba(0,0,0,.28);filter:blur(2px)}.gfExplorer .head{position:absolute;left:8px;top:0;width:18px;height:18px;border-radius:50%;background:#f2c49a;box-shadow:0 2px 0 #76513e}.gfExplorer .body{position:absolute;left:5px;top:16px;width:24px;height:33px;border-radius:12px 12px 9px 9px;background:linear-gradient(180deg,#5bb6a5,#225067);box-shadow:inset 0 5px 0 rgba(255,255,255,.12),0 8px 12px rgba(0,0,0,.25)}.gfExplorer.moving .body{animation:gfWalk .34s ease-in-out infinite}.gfExplorer[data-dir="left"]{transform:translate(-50%,-78%) scaleX(-1)}.gfExplorer[data-dir="up"] .body{filter:brightness(.84)}.gfCompanion{width:54px;height:54px;display:grid;place-items:center;transition:filter .2s}.gfCompanion img{max-width:54px;max-height:54px;object-fit:contain;filter:drop-shadow(0 10px 9px rgba(0,0,0,.32));animation:gfPetIdle 1.4s ease-in-out infinite}.gfCompanion span{width:48px;height:48px;display:grid;place-items:center;font-size:34px;filter:drop-shadow(0 10px 9px rgba(0,0,0,.32));animation:gfPetIdle 1.4s ease-in-out infinite}.gfCompanion.moving img,.gfCompanion.moving span{animation:gfPetRun .45s ease-in-out infinite}.gfCompanion.notice{filter:drop-shadow(0 0 12px rgba(151,255,209,.75))}.gfFishSpot{position:absolute;transform:translate(-50%,-50%);border:0;background:transparent;cursor:pointer;border-radius:50%;display:grid;place-items:center;opacity:.9}.gfFishSpot i{position:absolute;width:62%;height:38%;border-radius:50%;border:2px solid rgba(156,232,231,.48);box-shadow:0 0 18px rgba(107,226,218,.24);animation:gfRipple 2s ease-in-out infinite}.gfFishSpot span{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#d9fffb;background:rgba(5,14,16,.45);border:1px solid rgba(200,255,245,.18);padding:3px 7px;border-radius:999px;opacity:0;transition:.18s}.gfFishSpot:hover span{opacity:1}.gfWorldPickup{position:absolute;transform:translate(-50%,-50%);border:0;background:transparent;cursor:pointer}.gfWorldPickup span{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,#eaffb7,#9ff5da 55%,transparent 72%);color:#233;box-shadow:0 0 20px rgba(184,255,194,.45);animation:gfGlowPick 1.35s ease-in-out infinite}.gfWorldPickup.taken{opacity:0;pointer-events:none;transition:.35s}.gfStorySpot{position:absolute;transform:translate(-50%,-50%);width:30px;height:30px;border-radius:50%;background:rgba(161,255,218,.08);box-shadow:0 0 26px rgba(161,255,218,.12);pointer-events:none}.gfReturnZone{position:absolute;border-radius:22px;border:1px solid rgba(226,255,238,.14);background:rgba(220,255,226,.05);display:grid;place-items:center;color:#cfffe5;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}.gfCanopy{position:absolute;border-radius:45%;background:radial-gradient(circle at 38% 35%,rgba(66,139,81,var(--op)),rgba(7,42,30,calc(var(--op) + .12)) 70%,rgba(3,18,15,.38));box-shadow:inset 0 0 50px rgba(111,232,151,.12),0 12px 28px rgba(0,0,0,.18);pointer-events:none;z-index:1600;transition:opacity .24s,filter .24s}.gfCanopy.fade{opacity:.36!important;filter:blur(.5px) brightness(1.08)}.gfFirefly{position:absolute;width:5px;height:5px;border-radius:50%;background:#e8ff9f;box-shadow:0 0 12px #dfff85,0 0 24px rgba(210,255,120,.45);animation:gfFirefly var(--d) ease-in-out infinite alternate;pointer-events:none;z-index:1800}.gfMote{position:absolute;width:2px;height:2px;border-radius:50%;background:rgba(196,255,232,.44);animation:gfMote var(--d) linear infinite;pointer-events:none}.gfWorldPrompt{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:min(680px,calc(100% - 36px));padding:10px 14px;border-radius:999px;text-align:center;background:rgba(4,12,16,.62);border:1px solid rgba(211,255,237,.16);box-shadow:0 16px 34px rgba(0,0,0,.24);font-size:13px;font-weight:1000;color:#ecfff6;z-index:3000;pointer-events:none}.gfWorldPop{position:absolute;z-index:4000;transform:translate(-50%,-50%);font-size:13px;font-weight:1000;text-shadow:0 2px 10px rgba(0,0,0,.7);animation:gfPop 1.05s ease forwards;pointer-events:none}.gfWorldPop.good{color:#dcffb5}.gfWorldPop.bad{color:#ffd1d1}.gfWorldPop.info{color:#ccfff2}.gfFishPanel{position:absolute;left:50%;top:20px;transform:translateX(-50%);z-index:4200;width:min(520px,calc(100% - 32px));padding:12px;border-radius:22px;background:rgba(3,13,18,.78);border:1px solid rgba(199,255,238,.18);box-shadow:0 20px 50px rgba(0,0,0,.32);backdrop-filter:blur(10px)}.gfFishPanel.hidden{display:none}.gfFishTitle{display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:8px}.gfFishTitle span{text-transform:uppercase;letter-spacing:.08em;color:#a7f3d0;font-size:10px;font-weight:1000}.gfMeter{position:relative;height:18px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;border:1px solid rgba(255,255,255,.12)}.gfMeter i{position:absolute;top:-4px;width:10px;height:26px;margin-left:-5px;border-radius:999px;background:#fff;box-shadow:0 0 16px #dff}.gfMeter b{position:absolute;top:0;bottom:0;border-radius:999px;background:rgba(170,255,188,.28)}.gfMeter.aim b{left:42%;width:32%}.gfMeter.bite b{left:36%;width:28%}.gfMeter.tension b{left:34%;width:38%}.gfProgress{height:7px;border-radius:999px;background:rgba(255,255,255,.1);margin-top:8px;overflow:hidden}.gfProgress i{display:block;height:100%;background:linear-gradient(90deg,#6ee7b7,#fef08a)}.gfFishPanel p{margin:8px 0;color:#dff7ee;font-size:12px;font-weight:800}.gfFishPanel button{border:0;border-radius:999px;padding:9px 14px;background:linear-gradient(135deg,#67e8f9,#bef264);color:#052018;font-weight:1000;cursor:pointer}.gfFishPanel small{display:block;margin-top:7px;color:#b8e8d8;font-weight:800}.gfWorldFx{pointer-events:none}.gfWorldFx,.gfWorld{transform-origin:left top}@keyframes gfWalk{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-2px) rotate(1deg)}}@keyframes gfPetIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes gfPetRun{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-6px) rotate(3deg)}}@keyframes gfRipple{0%{transform:scale(.6);opacity:.25}50%{opacity:.9}100%{transform:scale(1.25);opacity:.05}}@keyframes gfGlowPick{0%,100%{transform:scale(.94)}50%{transform:scale(1.1)}}@keyframes gfFirefly{0%{transform:translate(0,0) scale(.75);opacity:.45}50%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1.15);opacity:.7}}@keyframes gfMote{0%{transform:translateY(0);opacity:0}20%{opacity:.55}100%{transform:translateY(-90px);opacity:0}}@keyframes gfPop{0%{opacity:0;transform:translate(-50%,4px) scale(.9)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-42px) scale(1.05)}}@media(max-width:760px){.gfWorldHud{height:40px}.gfWorldHud b{font-size:14px}.gfWorldHud span{font-size:10px}.gfWorldPrompt{bottom:10px;font-size:11px;padding:8px 10px}.gfFishPanel{top:10px}}';
    document.head.appendChild(s);
  }

  window.PetWorldWorldEngine={start:start,mount:mount,regions:REGIONS,isRunning:function(){return !!engine.running;}};
})();
