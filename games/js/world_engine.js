/*
  GameForge AI World Engine - Shadow Woods vertical slice v1.2
  Purpose: reusable painted-scene exploration/fishing layer.
  Render-safe: vanilla JS/CSS/PNG only, no build step, Render friendly.
*/
(function(){
  'use strict';

  var MAP_W=1600, MAP_H=1080;
  var WORLD_JSON='/assets/worlds/shadow_woods_dock.json';
  var SCENE_REGISTRY_URL='/assets/worlds/world_scenes.json';
  var ASSETS={
    bg:'/assets/backgrounds/shadow_woods_fishing_scene.png',
    player:'/assets/sprites/wanderer_sheet.png'
  };
  var SPRITE={cols:6,rows:16,w:128,h:128,naturalW:768,naturalH:2048,loaded:false};
  var engine={mounted:false,running:false,root:null,viewport:null,world:null,playerEl:null,shadowEl:null,fx:null,ui:null,transitionEl:null,scale:1,offX:0,offY:0,
    keys:{}, mouseDown:false, state:null, target:null, mode:'explore', fish:null, activeHotspot:null, raf:0, last:0, onClose:null,debug:false,transitioning:false,ambient:[],bgCache:{},bgPromises:{},sceneConfigCache:{},pendingBackground:'',
    sceneId:'shadow_woods_dock',requestedSpawnId:'',sceneRegistry:null};

  var WALK_AREAS=[
    [[0,760],[90,700],[170,620],[235,520],[310,420],[410,315],[530,215],[625,245],[535,370],[455,485],[400,620],[320,760],[245,930],[200,1080],[0,1080]],
    [[370,590],[520,575],[730,555],[910,635],[960,705],[760,805],[570,785],[400,725]],
    [[315,605],[455,575],[485,635],[400,705],[300,690]]
  ];
  var BLOCK_AREAS=[];
  var SOFT_BLOCKS=[
    {x:930,y:230,r:95},{x:1120,y:210,r:115},{x:1010,y:380,r:70},{x:1250,y:450,r:140},{x:325,y:260,r:85}
  ];
  var DOCK_SPOT={x:690,y:640,face:'right'};
  var FISH_TARGET={x:980,y:510};
  var HOTSPOTS=[
    {id:'dock',type:'fish',x:690,y:640,r:110,label:'Fish from the dock'},
    {id:'path',type:'exit',x:185,y:280,r:80,label:'Path deeper into Shadow Woods'}
  ];
  var WATER_AREAS=[];

  function mount(){
    if(engine.mounted)return;
    injectStyles();
    var root=document.createElement('div');
    root.id='gfWorldEngineRoot';
    root.className='swRoot hidden';
    root.innerHTML=''
      +'<div class="swViewport" id="swViewport">'
      +  '<div class="swWorld" id="swWorld">'
      +    '<img class="swBg" id="swBg" src="'+ASSETS.bg+'" draggable="false" alt="Shadow Woods">'
      +    '<div class="swWaterGlow"></div><div class="swMist"></div><div class="swToneLayer" id="swToneLayer"></div><div class="swAmbientLayer" id="swAmbientLayer"></div><div class="swLightLayer" id="swLightLayer"></div><div class="swObjectLayer" id="swObjectLayer"></div><div class="swTerrainParticles" id="swTerrainParticles"></div><div class="swInteractionIcons" id="swInteractionIcons"></div><div class="swCastAim hidden" id="swCastAim"></div><div class="swFireflies" id="swFireflies"></div><div class="swMotes" id="swMotes"></div>'
      +    '<div class="swDebugLayer" id="swDebugLayer"></div>'
      +    '<div class="swBobber hidden" id="swBobber"></div><div class="swLine hidden" id="swLine"></div>'
      +    '<div class="swShadow" id="swShadow"></div><div class="swPlayer" id="swPlayer"><div class="swSprite"></div></div>'
      +    '<div class="swCanopy"></div>'
      +  '</div>'
      +  '<div class="swSceneTransition" id="swSceneTransition"><div class="swSceneTransitionText" id="swSceneTransitionText">Entering Shadow Woods...</div></div>'
      +  '<div class="swHud">'
      +    '<div class="swStatus"><div class="portrait"></div><div><b>Wanderer</b><div class="bar hp"><span></span></div><div class="bar sp"><span></span></div></div></div>'
      +    '<div class="swTitle">Shadow Woods <span>•</span> 9:47 PM <span>☾</span></div>'
      +    '<button class="swClose" id="swClose">Leave</button>'
      +    '<div class="swQuest"><b>✦ Whispers in the Dark</b><p>Walk to the dock and fish the glowing pond.</p></div>'
      +    '<div class="swToast" id="swToast">WASD / Arrow Keys to move. Click the path to walk.</div>'
      +    '<div class="swHotbar"><button>1<br><span>🎣</span></button><button>2<br><span>🎒</span></button><button>3<br><span>🏮</span></button><button>4<br><span>🧪</span></button><button>5<br><span>🪱</span></button><button>6<br><span>🍄</span></button><button>7<br><span>🌿</span></button><button>8<br><span>📜</span></button></div>'
      +    '<div class="swFishing hidden" id="swFishing"><h3>Fishing</h3><p id="swFishText">Hold Space or mouse to cast farther.</p><div class="swCastBar"><i id="swCastFill"></i><em id="swSweet"></em></div><small id="swFishHint">Release to cast</small></div>'
      +  '</div>'
      +'</div>';
    document.body.appendChild(root);
    engine.root=root;engine.viewport=root.querySelector('#swViewport');engine.world=root.querySelector('#swWorld');engine.playerEl=root.querySelector('#swPlayer');engine.shadowEl=root.querySelector('#swShadow');engine.ui=root.querySelector('#swFishing');engine.fx=root.querySelector('#swFireflies');engine.transitionEl=root.querySelector('#swSceneTransition');
    root.querySelector('#swClose').onclick=stop;
    window.addEventListener('resize',layout);
    window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKey,true);
    engine.viewport.addEventListener('pointerdown',onPointerDown);
    window.addEventListener('pointerup',onPointerUp);
    makeFireflies();makeMotes();buildDebugLayer();preloadSpriteSheet();engine.mounted=true;
  }

  function start(opts){
    mount();
    opts=opts||{};
    engine.sceneId=opts.sceneId||engine.sceneId||'shadow_woods_dock';
    engine.requestedSpawnId=opts.spawnId||opts.targetSpawn||'';
    engine.regionConfig=null;
    loadWorldConfig(function(){ beginStart(opts); });
  }
  function beginStart(opts){
    opts=opts||{};engine.onClose=opts.onClose||null;engine.root.classList.remove('hidden');engine.running=true;engine.mode='explore';engine.keys={};engine.target=null;engine.fish=null;
    var spawn=getSpawnPoint(engine.regionConfig,engine.requestedSpawnId)||{x:560,y:685,face:'up'};
    engine.state={x:Number(spawn.x||560),y:Number(spawn.y||705),vx:0,vy:0,face:spawn.face||'up',moving:false,animTime:0,frame:0,animKey:''};
    if(!canStand(engine.state.x,engine.state.y)){
      var safe=findNearestSafe(engine.state.x,engine.state.y);engine.state.x=safe.x;engine.state.y=safe.y;
    }
    layout();toast('Walk to the dock. Press E or Space near the dock to begin fishing. Press B for boundaries, R to reset.');engine.last=performance.now();engine.raf=requestAnimationFrame(loop);
  }
  function loadWorldConfig(done){
    loadSceneRegistry(function(){
      var meta=getSceneMeta(engine.sceneId);
      var url=(meta&&meta.url)||WORLD_JSON;
      function applyConfig(cfg){
        engine.regionConfig=cfg||{};
        engine.sceneId=engine.regionConfig.id||engine.sceneId||'shadow_woods_dock';
        function finishApply(){
          if(engine.regionConfig.size){MAP_W=Number(engine.regionConfig.size.w||MAP_W);MAP_H=Number(engine.regionConfig.size.h||MAP_H);}
          if(engine.world){engine.world.style.width=MAP_W+'px';engine.world.style.height=MAP_H+'px';}
          if(Array.isArray(engine.regionConfig.walkable)&&engine.regionConfig.walkable.length){WALK_AREAS=engine.regionConfig.walkable.filter(function(s){return (s.type||'poly')==='poly'&&Array.isArray(s.points);}).map(function(s){return s.points;});}
          BLOCK_AREAS=[];SOFT_BLOCKS=[];
          if(Array.isArray(engine.regionConfig.blockers)){engine.regionConfig.blockers.forEach(function(s){if((s.type||'poly')==='poly'&&Array.isArray(s.points))BLOCK_AREAS.push(s.points);else if(s.type==='circle')SOFT_BLOCKS.push({x:Number(s.x),y:Number(s.y),r:Number(s.r||30)});else if(s.type==='rect')BLOCK_AREAS.push([[s.x,s.y],[s.x+s.w,s.y],[s.x+s.w,s.y+s.h],[s.x,s.y+s.h]]);});}
          HOTSPOTS=[];
          if(Array.isArray(engine.regionConfig.hotspots)&&engine.regionConfig.hotspots.length){HOTSPOTS=engine.regionConfig.hotspots.map(normalizeHotspot);}
          if(Array.isArray(engine.regionConfig.interactables)&&engine.regionConfig.interactables.length){HOTSPOTS=HOTSPOTS.concat(engine.regionConfig.interactables.map(normalizeHotspot));}
          var fish=HOTSPOTS.find(function(h){return isFishingHotspot(h);});
          if(fish)applyFishingHotspot(fish);
          renderAmbientEffects();
          rebuildWaterAreas();
          renderSceneExtras();
          buildDebugLayer();
          preloadConnectedScenes();
          done();
        }
        if(engine.regionConfig.background){setSceneBackground(engine.regionConfig.background,finishApply);}
        else finishApply();
      }
      try{
        var draft=localStorage.getItem('gfWorldSceneDraft:'+((meta&&meta.id)||engine.sceneId));
        if(draft){applyConfig(JSON.parse(draft));return;}
      }catch(_e){}
      fetch(url+'?v='+(Date.now()),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('No config');return r.json();}).then(applyConfig).catch(function(){done();});
    });
  }
  function loadSceneRegistry(done){
    if(engine.sceneRegistry){done();return;}
    fetch(SCENE_REGISTRY_URL+'?v='+(Date.now()),{cache:'no-store'}).then(function(r){return r.ok?r.json():{scenes:[]};}).then(function(j){engine.sceneRegistry=j||{scenes:[]};done();}).catch(function(){engine.sceneRegistry={scenes:[{id:'shadow_woods_dock',url:WORLD_JSON,name:'Shadow Woods Dock'}]};done();});
  }
  function getSceneUrl(sceneId){
    var meta=getSceneMeta(sceneId);
    return meta&&meta.url;
  }
  function fetchSceneConfig(sceneId,done){
    if(!sceneId){done(null);return;}
    if(engine.sceneConfigCache&&engine.sceneConfigCache[sceneId]){done(engine.sceneConfigCache[sceneId]);return;}
    var url=getSceneUrl(sceneId);
    if(!url){done(null);return;}
    fetch(url,{cache:'force-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(cfg){
      if(cfg&&engine.sceneConfigCache)engine.sceneConfigCache[sceneId]=cfg;
      done(cfg||null);
    }).catch(function(){done(null);});
  }
  function preloadBackground(url){
    if(!url)return Promise.resolve(null);
    if(engine.bgCache&&engine.bgCache[url]&&engine.bgCache[url].complete)return Promise.resolve(engine.bgCache[url]);
    if(engine.bgPromises&&engine.bgPromises[url])return engine.bgPromises[url];
    var img=(engine.bgCache&&engine.bgCache[url])||new Image();
    if(engine.bgCache)engine.bgCache[url]=img;
    var promise=new Promise(function(resolve){
      img.onload=function(){
        var finish=function(){resolve(img);};
        if(img.decode){img.decode().then(finish).catch(finish);}
        else finish();
      };
      img.onerror=function(){resolve(null);};
      if(!img.src)img.src=url;
      else if(img.complete)resolve(img);
    });
    if(engine.bgPromises)engine.bgPromises[url]=promise;
    return promise;
  }
  function preloadSceneBackground(sceneId){
    return new Promise(function(resolve){
      fetchSceneConfig(sceneId,function(cfg){
        if(!cfg||!cfg.background){resolve(null);return;}
        preloadBackground(cfg.background).then(resolve);
      });
    });
  }
  function preloadConnectedScenes(){
    if(!engine.regionConfig)return;
    var targets={};
    HOTSPOTS.forEach(function(h){
      if((h.type==='exit'||h.kind==='exit')&&h.targetScene&&h.targetScene!==engine.sceneId)targets[h.targetScene]=true;
    });
    Object.keys(targets).forEach(function(sceneId){preloadSceneBackground(sceneId);});
  }
  function getSceneMeta(id){
    var list=(engine.sceneRegistry&&engine.sceneRegistry.scenes)||[];
    return list.find(function(s){return s.id===id;})||list[0]||{id:'shadow_woods_dock',url:WORLD_JSON,name:'Shadow Woods Dock'};
  }
  function getSpawnPoint(cfg,spawnId){
    cfg=cfg||{};
    if(spawnId&&Array.isArray(cfg.spawnPoints)){
      var sp=cfg.spawnPoints.find(function(p){return p.id===spawnId;});
      if(sp)return sp;
    }
    return cfg.spawn||null;
  }
  function transitionToScene(sceneId,spawnId){
    if(!sceneId){toast('This exit is ready, but no target scene is assigned yet.');return;}
    if(engine.transitioning)return;
    engine.transitioning=true;
    engine.keys={};engine.mouseDown=false;engine.target=null;
    if(engine.mode==='fish')endFishing();
    showSceneTransition(true,'Entering...');
    preloadSceneBackground(sceneId);
    setTimeout(function(){
      engine.sceneId=sceneId;
      engine.requestedSpawnId=spawnId||'';
      engine.regionConfig=null;
      loadWorldConfig(function(){
        var spawn=getSpawnPoint(engine.regionConfig,engine.requestedSpawnId)||{x:560,y:705,face:'up'};
        engine.state.x=Number(spawn.x||560);engine.state.y=Number(spawn.y||705);engine.state.vx=0;engine.state.vy=0;engine.state.face=spawn.face||'up';engine.state.moving=false;engine.state.animKey='';engine.state.animTime=0;
        if(!canStand(engine.state.x,engine.state.y)){var safe=findNearestSafe(engine.state.x,engine.state.y);engine.state.x=safe.x;engine.state.y=safe.y;}
        layout();render(0);
        var name=(engine.regionConfig&&engine.regionConfig.name)||sceneId;
        var txt=document.getElementById('swSceneTransitionText');if(txt)txt.textContent=name;
        setTimeout(function(){
          showSceneTransition(false,'');
          engine.transitioning=false;
          toast('Entered '+name+'.');
        },180);
      });
    },260);
  }
  function showSceneTransition(on,label){
    var el=engine.transitionEl||document.getElementById('swSceneTransition');if(!el)return;
    var t=document.getElementById('swSceneTransitionText');if(t&&label)t.textContent=label;
    el.classList.toggle('show',!!on);
  }
  function setSceneBackground(url,done){
    done=done||function(){};
    if(!url){done();return;}
    ASSETS.bg=url;
    var bg=engine.world&&engine.world.querySelector('#swBg');if(!bg){done();return;}
    if(bg.getAttribute('src')===url){done();return;}
    engine.pendingBackground=url;
    preloadBackground(url).then(function(img){
      if(engine.pendingBackground!==url){done();return;}
      bg.src=url;
      requestAnimationFrame(function(){requestAnimationFrame(done);});
      if(!img){toast('Scene background could not preload; showing requested image anyway.');}
    });
  }
  function normalizeHotspot(h){
    var type=h.kind||h.type||'hotspot';
    return {
      id:h.id||('hotspot_'+Math.floor(Math.random()*99999)),type:type,kind:h.kind||type,
      x:Number(h.x||(h.interactAt&&h.interactAt.x)||0),y:Number(h.y||(h.interactAt&&h.interactAt.y)||0),
      r:Number(h.r||h.radius||90),label:h.label||h.name||h.id||type,
      text:h.text||h.dialogue||'',title:h.title||h.label||h.name||'',
      interactAt:h.interactAt,snapPosition:h.snapPosition,castTarget:h.castTarget,face:h.face||h.faceDirection,
      targetScene:h.targetScene,targetSpawn:h.targetSpawn,reward:h.reward||null,
      standArea:h.standArea||null,castArea:h.castArea||null,fishTable:h.fishTable||null,difficulty:Number(h.difficulty||1)
    };
  }
  function isFishingHotspot(h){return h&&(h.type==='fish'||h.type==='fishing'||h.kind==='fish'||h.kind==='fishing');}
  function applyFishingHotspot(h){
    engine.activeHotspot=h;
    var pos=h.standArea||h.snapPosition||h.interactAt||{x:h.x,y:h.y,r:h.r||70};
    DOCK_SPOT={x:Number(pos.x),y:Number(pos.y),r:Number(pos.r||h.r||70),face:h.face||'right'};
    var cast=h.castArea||h.castTarget||{x:h.x+220,y:h.y-100,r:110};
    FISH_TARGET={x:Number(cast.x),y:Number(cast.y),r:Number(cast.r||95)};
  }
  function findNearestSafe(x,y){
    for(var r=0;r<360;r+=24){for(var a=0;a<Math.PI*2;a+=Math.PI/8){var px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(canStand(px,py))return {x:px,y:py};}}
    return {x:560,y:705};
  }
  function stop(){engine.running=false;cancelAnimationFrame(engine.raf);if(engine.root)engine.root.classList.add('hidden');if(engine.onClose)engine.onClose();}

  function layout(){
    if(!engine.viewport)return;
    var w=engine.viewport.clientWidth,h=engine.viewport.clientHeight;
    engine.scale=Math.min(w/MAP_W,h/MAP_H);engine.offX=(w-MAP_W*engine.scale)/2;engine.offY=(h-MAP_H*engine.scale)/2;
    engine.world.style.transform='translate('+engine.offX+'px,'+engine.offY+'px) scale('+engine.scale+')';
  }
  function screenToWorld(ev){var r=engine.viewport.getBoundingClientRect();return {x:(ev.clientX-r.left-engine.offX)/engine.scale,y:(ev.clientY-r.top-engine.offY)/engine.scale};}

  function loop(now){
    if(!engine.running)return;var dt=Math.min(0.033,(now-engine.last)/1000||0.016);engine.last=now;
    if(!engine.transitioning){if(engine.mode==='explore')updateExplore(dt);else updateFishing(dt);}
    render(dt);engine.raf=requestAnimationFrame(loop);
  }
  function updateExplore(dt){
    var s=engine.state, ax=0, ay=0;
    if(engine.keys.ArrowLeft||engine.keys.KeyA)ax-=1;if(engine.keys.ArrowRight||engine.keys.KeyD)ax+=1;if(engine.keys.ArrowUp||engine.keys.KeyW)ay-=1;if(engine.keys.ArrowDown||engine.keys.KeyS)ay+=1;
    if(engine.target){var dx=engine.target.x-s.x,dy=engine.target.y-s.y,d=Math.hypot(dx,dy);if(d<8){engine.target=null;}else{ax+=dx/d;ay+=dy/d;}}
    var len=Math.hypot(ax,ay);if(len>0){ax/=len;ay/=len;}
    // Smooth top-down movement: interpolate toward a target velocity instead of frame-dependent friction.
    // This removes the jittery/scrolling feel and makes diagonal movement stable.
    var max=190;
    var targetVx=ax*max,targetVy=ay*max;
    var follow=Math.min(1,dt*12);
    s.vx+=(targetVx-s.vx)*follow;s.vy+=(targetVy-s.vy)*follow;
    if(len===0){var stop=Math.max(0,1-dt*10);s.vx*=stop;s.vy*=stop;}
    if(Math.abs(s.vx)<1.2)s.vx=0;if(Math.abs(s.vy)<1.2)s.vy=0;
    var nx=s.x+s.vx*dt, ny=s.y+s.vy*dt;
    if(canStand(nx,ny)){s.x=nx;s.y=ny;}else{ if(canStand(nx,s.y)){s.x=nx;s.vy=0;} if(canStand(s.x,ny)){s.y=ny;s.vx=0;} }
    s.moving=Math.hypot(s.vx,s.vy)>18;
    if(s.moving){
      var avx=Math.abs(s.vx), avy=Math.abs(s.vy);
      // 8-way facing for smoother diagonal movement. Keep cardinal facing when one axis dominates.
      if(avx>28&&avy>28&&avx/avy<2.2&&avy/avx<2.2){
        s.face=(s.vy<0?'up':'down')+'_'+(s.vx>0?'right':'left');
      }else if(avx>avy){
        s.face=s.vx>0?'right':'left';
      }else{
        s.face=s.vy>0?'down':'up';
      }
    }
    updateTriggerZones(dt);
    updateTerrainParticles(dt);
    updateActionHint();
  }
  function updateFishing(dt){
    var f=engine.fish,s=engine.state;if(!f)return;
    s.face=(DOCK_SPOT.face||'right');s.moving=false;s.vx=s.vy=0;
    if(f.phase==='walk'){
      var dx=DOCK_SPOT.x-s.x,dy=DOCK_SPOT.y-s.y,d=Math.hypot(dx,dy);
      if(d>5){s.x+=dx/d*190*dt;s.y+=dy/d*190*dt;}
      else{f.phase='ready';f.t=0;showFishing('Fishing spot ready. Aim your cast into the water.','Press Space/click, then aim with WASD/Arrows. Release to cast.');toast('Aim toward the water, then hold and release Space/click to cast.');}
    }
    else if(f.phase==='ready'){
      f.t+=dt;
      updateCastAim(dt,false);
    }
    else if(f.phase==='aim'){
      updateCastAim(dt,true);
      if(engine.mouseDown||engine.keys.Space||engine.keys.KeyE){f.power=Math.min(1,f.power+dt*0.72);}
    }else if(f.phase==='badcast'){
      f.t+=dt;if(f.t>1.15){f.phase='ready';f.t=0;showFishing('Try again. The cast has to land in the water circle.','Aim with WASD/Arrows and use enough power.');}
    }else if(f.phase==='wait'){
      f.t+=dt;if(f.t>f.biteAt){f.phase='bite';f.t=0;showFishing('BITE! Press Space or click now.','Hook it before it gets away.');pulseBobber();}
    }else if(f.phase==='bite'){
      f.t+=dt;if(f.t>1.15){f.phase='wait';f.t=0;f.biteAt=1+Math.random()*1.4;showFishing('Missed it. Wait for the bobber jump, then press.','Do not reel until the bite happens.');}
    }else if(f.phase==='reel'){
      f.t+=dt;f.fishPos=0.5+Math.sin(f.t*3.3)*0.28+Math.sin(f.t*7.1)*0.08;
      if(engine.mouseDown||engine.keys.Space||engine.keys.KeyE)f.tension+=dt*0.38;else f.tension-=dt*0.23;f.tension=Math.max(0,Math.min(1,f.tension));
      var good=Math.abs(f.tension-f.fishPos)<0.18;f.progress+=dt*(good?0.34:-0.12);f.progress=Math.max(0,Math.min(1,f.progress));
      showFishing(good?'Good tension — keep it there!':'Adjust tension: hold to raise, release to lower.','Progress '+Math.round(f.progress*100)+'%');
      if(f.progress>=1){catchFish();}
      if(f.tension<=0||f.tension>=1){toast('The line failed. Try again.');endFishing();}
    }
  }
  function updateCastAim(dt,charging){
    var f=engine.fish;if(!f)return;
    var ax=0,ay=0;
    if(engine.keys.ArrowLeft||engine.keys.KeyA)ax-=1;if(engine.keys.ArrowRight||engine.keys.KeyD)ax+=1;if(engine.keys.ArrowUp||engine.keys.KeyW)ay-=1;if(engine.keys.ArrowDown||engine.keys.KeyS)ay+=1;
    if(ax||ay){f.aim=Math.atan2(ay,ax);}
    if(f.aim==null){var dx=(FISH_TARGET.x||DOCK_SPOT.x+180)-DOCK_SPOT.x,dy=(FISH_TARGET.y||DOCK_SPOT.y-80)-DOCK_SPOT.y;f.aim=Math.atan2(dy,dx);}
    var minDist=70,maxDist=340;
    if(f.sweetPower==null)primeFishingAim(f);
    var dist=charging?(minDist+f.power*(maxDist-minDist)):(minDist+(f.sweetPower||0.65)*(maxDist-minDist));
    f.preview={x:DOCK_SPOT.x+Math.cos(f.aim)*dist,y:DOCK_SPOT.y+Math.sin(f.aim)*dist};
  }
  function primeFishingAim(f){
    if(!f)return;
    var dx=(FISH_TARGET.x||DOCK_SPOT.x+180)-DOCK_SPOT.x,dy=(FISH_TARGET.y||DOCK_SPOT.y-80)-DOCK_SPOT.y;
    f.aim=Math.atan2(dy,dx);
    var dist=Math.hypot(dx,dy),minDist=70,maxDist=340;
    f.sweetPower=Math.max(0.08,Math.min(0.96,(dist-minDist)/(maxDist-minDist)));
    f.preview={x:FISH_TARGET.x,y:FISH_TARGET.y};
  }
  function render(dt){
    var s=engine.state;engine.playerEl.style.left=s.x+'px';engine.playerEl.style.top=s.y+'px';engine.shadowEl.style.left=s.x+'px';engine.shadowEl.style.top=(s.y+2)+'px';
    var sprite=engine.playerEl.querySelector('.swSprite');if(!SPRITE.loaded){return;}var anim=getAnim();if(s.animKey!==anim.key){s.animKey=anim.key;s.animTime=0;}s.animTime+=dt*(anim.fps||6);var idx=Math.floor(s.animTime)%anim.frames.length;var fr=anim.frames[idx];
    // IMPORTANT: the sprite element is exactly one 128x128 cell. We move the sheet behind it.
    // Use integer frame coordinates only, otherwise adjacent frames can bleed/scroll into view.
    sprite.style.backgroundImage='url('+ASSETS.player+')';
    sprite.style.backgroundSize=(SPRITE.cols*SPRITE.w)+'px '+(SPRITE.rows*SPRITE.h)+'px';
    sprite.style.backgroundPosition=(-fr[0]*SPRITE.w)+'px '+(-fr[1]*SPRITE.h)+'px';
    var stepBob=anim.walk?(-Math.abs(Math.sin(s.animTime*Math.PI))*3):0;
    sprite.style.transform=(anim.flip?'scaleX(-1)':'scaleX(1)')+' translateY('+stepBob+'px)';
    engine.shadowEl.style.transform='scale(1)';
    engine.playerEl.style.zIndex=Math.round(s.y);
    updateOcclusionFade();
    var bob=document.getElementById('swBobber'),line=document.getElementById('swLine'),aim=document.getElementById('swCastAim');
    if(engine.fish&&(engine.fish.phase==='ready'||engine.fish.phase==='aim')){var prev=engine.fish.preview||{x:FISH_TARGET.x,y:FISH_TARGET.y};var valid=pointInCastArea(prev.x,prev.y);aim.classList.remove('hidden');aim.style.left=prev.x+'px';aim.style.top=prev.y+'px';aim.classList.toggle('valid',valid);aim.classList.toggle('invalid',!valid);}else{aim.classList.add('hidden');aim.classList.remove('invalid');}
    if(engine.fish&&(engine.fish.phase==='wait'||engine.fish.phase==='bite'||engine.fish.phase==='reel'||engine.fish.phase==='badcast')){bob.classList.remove('hidden');line.classList.remove('hidden');var bx=engine.fish.bobberX||FISH_TARGET.x,by=engine.fish.bobberY||FISH_TARGET.y;bob.style.left=bx+'px';bob.style.top=by+'px';bob.classList.toggle('bad',engine.fish.phase==='badcast');var dx=bx-s.x,dy=by-(s.y-52);line.style.left=s.x+'px';line.style.top=(s.y-52)+'px';line.style.width=Math.hypot(dx,dy)+'px';line.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';}else{bob.classList.add('hidden');line.classList.add('hidden');bob.classList.remove('bad');}
    if(engine.fish){var fill=document.getElementById('swCastFill'),sweet=document.getElementById('swSweet');if(engine.fish.phase==='aim'){fill.style.width=Math.round(engine.fish.power*100)+'%';sweet.style.left=Math.round((engine.fish.sweetPower||0.65)*100)+'%';}else if(engine.fish.phase==='ready'){fill.style.width='0%';sweet.style.left=Math.round((engine.fish.sweetPower||0.65)*100)+'%';}else if(engine.fish.phase==='reel'){fill.style.width=Math.round(engine.fish.tension*100)+'%';sweet.style.left=Math.round(engine.fish.fishPos*100)+'%';}else{fill.style.width='0%';}}
  }
  function frames(row,count){var a=[];for(var i=0;i<count;i++)a.push([i,row]);return a;}
  function getAnim(){
    var st=engine.state, f=engine.fish;
    if(engine.mode==='fish'){
      if(f&&f.phase==='walk')return {key:'walk_right',fps:8,frames:frames(6,6),walk:true};
      // The generated fishing rows are currently glitchy. Use a stable side idle frame for all fishing phases
      // so fishing remains playable until we replace this with a dedicated rod/cast sprite sheet.
      return {key:'fish_safe_idle_right',fps:1,frames:frames(2,1)};
    }
    if(st.moving){
      if(st.face==='down')return {key:'walk_down',fps:8,frames:frames(4,6),walk:true};
      if(st.face==='up')return {key:'walk_up',fps:8,frames:frames(5,6),walk:true};
      if(st.face==='down_right')return {key:'walk_down_right',fps:8,frames:frames(12,6),walk:true};
      if(st.face==='down_left')return {key:'walk_down_left',fps:8,frames:frames(12,6),flip:true,walk:true};
      if(st.face==='up_right')return {key:'walk_up_right',fps:8,frames:frames(13,6),walk:true};
      if(st.face==='up_left')return {key:'walk_up_left',fps:8,frames:frames(13,6),flip:true,walk:true};
      if(st.face==='left')return {key:'walk_left',fps:8,frames:frames(6,6),flip:true,walk:true};
      return {key:'walk_right',fps:8,frames:frames(6,6),walk:true};
    }
    if(st.face==='up')return {key:'idle_up',fps:1,frames:frames(1,1)};
    if(st.face==='left')return {key:'idle_left',fps:1,frames:frames(2,1),flip:true};
    if(st.face==='right')return {key:'idle_right',fps:1,frames:frames(2,1)};
    return {key:'idle_down',fps:1,frames:frames(0,1)};
  }
  function startFishing(h){if(engine.mode!=='explore')return;if(h)applyFishingHotspot(h);engine.mode='fish';engine.fish={phase:'walk',power:0,t:0,biteAt:1.2+Math.random()*1.4,tension:0.5,fishPos:0.5,progress:0,aim:null,preview:null,bobberX:FISH_TARGET.x,bobberY:FISH_TARGET.y};toast('Moving to the casting spot...');showFishing('Moving to the casting spot...','Esc cancels fishing');engine.ui.classList.remove('hidden');}
  function useHotspot(h){
    if(!h)return false;
    if(isFishingHotspot(h)){startFishing(h);return true;}
    if(h.type==='npc'||h.type==='dialogue'||h.type==='textBox'||h.kind==='npc'||h.kind==='dialogue'){showDialogueBubble(h);toast((h.title?h.title+': ':'')+(h.text||h.dialogue||'They have nothing to say yet.'));return true;}
    if(h.type==='chest'||h.kind==='chest'){toast((h.title?h.title+': ':'')+(h.text||'You found something interesting.'));return true;}
    if(h.type==='exit'||h.kind==='exit'){transitionToScene(h.targetScene,h.targetSpawn);return true;}
    if(h.text){toast((h.title?h.title+': ':'')+h.text);return true;}
    return false;
  }
  function updateActionHint(){
    var hint=document.getElementById('swActionHint');if(!hint)return;
    var h=nearestUsableHotspot();
    if(h&&isFishingHotspot(h)){hint.textContent='Fishing spot  •  Press E / Space';hint.classList.remove('hidden');document.body.classList.add('swNearDock');return;}
    if(h){hint.textContent=(h.label||'Interact')+'  •  Press E';hint.classList.remove('hidden');document.body.classList.remove('swNearDock');return;}
    hint.classList.add('hidden');document.body.classList.remove('swNearDock');
  }
  function nearestUsableHotspot(){return nearestHotspot(engine.state.x,engine.state.y);}
  function onPointerDown(ev){
    if(!engine.running||engine.transitioning)return;engine.mouseDown=true;
    if(engine.mode==='explore'){
      var p=screenToWorld(ev);var h=nearestHotspot(p.x,p.y);if(h&&(!canStand(p.x,p.y)||Math.hypot(p.x-h.x,p.y-h.y)<h.r*.75)){if(useHotspot(h))return;}if(canStand(p.x,p.y)){engine.target=p;}
    }else if(engine.fish){
      if(engine.fish.phase==='ready'){beginCastCharge();}
      else if(engine.fish.phase==='bite'){beginReel();}
    }
  }
  function onPointerUp(){engine.mouseDown=false;if(engine.mode==='fish'&&engine.fish&&engine.fish.phase==='aim'){castLine();}}
  function onKey(e){
    if(!engine.running)return;
    var down=e.type==='keydown';
    if(engine.transitioning){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyS','KeyD','KeyE'].indexOf(e.code)>=0)e.preventDefault();return;}engine.keys[e.code]=down;
    if(down&&e.code==='KeyB'){toggleDebug();e.preventDefault();return;}
    if(down&&e.code==='KeyR'){var spawn=(engine.regionConfig&&engine.regionConfig.spawn)||{x:560,y:705};engine.state.x=spawn.x;engine.state.y=spawn.y;engine.state.vx=0;engine.state.vy=0;engine.target=null;toast('Reset to safe spawn.');e.preventDefault();return;}
    if(down&&e.code==='Escape'){if(engine.mode==='fish')endFishing();else stop();e.preventDefault();return;}
    if(down&&e.code==='KeyE'){
      if(engine.mode==='fish'&&engine.fish&&engine.fish.phase==='ready'){beginCastCharge();e.preventDefault();return;}
      var uh=nearestUsableHotspot();if(uh)useHotspot(uh);else if(Math.hypot(engine.state.x-DOCK_SPOT.x,engine.state.y-DOCK_SPOT.y)<120)startFishing();
    }
    if(down&&e.code==='Space'){
      var sh=nearestUsableHotspot();
      if(engine.mode==='explore'&&sh&&isFishingHotspot(sh))startFishing(sh);
      else if(engine.mode==='explore'&&Math.hypot(engine.state.x-DOCK_SPOT.x,engine.state.y-DOCK_SPOT.y)<120)startFishing();
      else if(engine.mode==='fish'&&engine.fish&&engine.fish.phase==='ready')beginCastCharge();
      else if(engine.mode==='fish'&&engine.fish&&engine.fish.phase==='bite')beginReel();
    }
    if(!down&&e.code==='Space'){if(engine.mode==='fish'&&engine.fish&&engine.fish.phase==='aim')castLine();}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyS','KeyD','KeyE'].indexOf(e.code)>=0)e.preventDefault();
  }
  function beginCastCharge(){var f=engine.fish;if(!f||f.phase!=='ready')return;f.phase='aim';f.power=0;f.t=0;primeFishingAim(f);updateCastAim(0,true);showFishing('Casting... hold for distance, release at the gold marker.','Use WASD/Arrows to aim. Green target means it will land in water.');}
  function beginReel(){var f=engine.fish;if(!f||f.phase!=='bite')return;f.phase='reel';f.t=0;f.tension=0.5;f.progress=0;showFishing('Reel! Hold/release to follow the fish.','Keep tension near the marker');}
  function castLine(){var f=engine.fish;if(!f||f.phase!=='aim')return;updateCastAim(0,true);var p=f.preview||{x:FISH_TARGET.x,y:FISH_TARGET.y};f.bobberX=p.x;f.bobberY=p.y;var result=castValidation(p.x,p.y);if(!result.ok){f.phase='badcast';f.t=0;showFishing('Too shallow — that landed on land.','Aim into the blue water and hold closer to the gold marker.');toast(result.reason||'Bad cast: aim for water.');return;}f.phase='wait';f.t=0;f.biteAt=1.2+Math.random()*1.6;showFishing('Good cast! Watch the bobber for a bite.','When it jumps, press Space/click once to hook it.');toast(result.reason==='good'?'Good cast! Wait for the bite.':result.reason);}
  function pointInCastArea(x,y){return castValidation(x,y).ok;}
  function catchFish(){var names=['Moonlit Minnow','Blackwater Glowfin','Whisper Koi'];var n=names[Math.floor(Math.random()*names.length)];if(engine.fish)engine.fish.phase='catch';toast('Caught '+n+'!');showFishing('Caught '+n+'!','Press Esc to close or cast again soon.');setTimeout(endFishing,1200);}
  function endFishing(){engine.mode='explore';engine.fish=null;engine.ui.classList.add('hidden');document.getElementById('swBobber').classList.add('hidden');document.getElementById('swLine').classList.add('hidden');var a=document.getElementById('swCastAim');if(a)a.classList.add('hidden');}
  function showFishing(text,hint){document.getElementById('swFishText').textContent=text;document.getElementById('swFishHint').textContent=hint;}
  function pulseBobber(){var b=document.getElementById('swBobber');b.classList.remove('bite');void b.offsetWidth;b.classList.add('bite');}
  function toast(t){var el=document.getElementById('swToast');if(!el)return;el.textContent=t;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
  function nearestHotspot(x,y){var best=null,bd=9999;HOTSPOTS.forEach(function(h){var d=Math.hypot(x-h.x,y-h.y);if(d<h.r&&d<bd){best=h;bd=d;}});return best;}
  function canStand(x,y){if(x<0||y<0||x>MAP_W||y>MAP_H)return false;var inside=WALK_AREAS.some(function(poly){return pointInPoly(x,y,poly);});if(!inside)return false;for(var j=0;j<BLOCK_AREAS.length;j++){if(pointInPoly(x,y,BLOCK_AREAS[j]))return false;}for(var i=0;i<SOFT_BLOCKS.length;i++){var b=SOFT_BLOCKS[i];if(Math.hypot(x-b.x,y-b.y)<b.r)return false;}return true;}
  function pointInPoly(x,y,poly){var inside=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++){var xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];var intersect=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi);if(intersect)inside=!inside;}return inside;}
  function preloadSpriteSheet(){
    var img=new Image();
    img.onload=function(){
      SPRITE.naturalW=img.naturalWidth||SPRITE.naturalW;SPRITE.naturalH=img.naturalHeight||SPRITE.naturalH;
      SPRITE.rows=Math.max(1,Math.round(SPRITE.naturalH/128)||16);SPRITE.cols=Math.round(SPRITE.naturalW/128) || 6;SPRITE.w=128;SPRITE.h=128;SPRITE.loaded=true;
      // If the sheet is not exactly 128px grid aligned, do not guess silently.
      if(SPRITE.naturalW%128!==0||SPRITE.naturalH%128!==0){toast('Sprite sheet warning: expected exact 128px grid.');}
    };
    img.src=ASSETS.player;
  }
  function buildDebugLayer(){
    var layer=document.getElementById('swDebugLayer');if(!layer)return;var html='';
    WALK_AREAS.forEach(function(poly){html+='<svg class="swDebugPoly" viewBox="0 0 '+MAP_W+' '+MAP_H+'"><polygon points="'+poly.map(function(p){return p[0]+','+p[1]}).join(' ')+'"></polygon></svg>';});
    BLOCK_AREAS.forEach(function(poly){html+='<svg class="swDebugPolySvg" viewBox="0 0 '+MAP_W+' '+MAP_H+'"><polygon class="swDebugBlockPoly" points="'+poly.map(function(p){return p[0]+','+p[1]}).join(' ')+'"></polygon></svg>';});SOFT_BLOCKS.forEach(function(b){html+='<div class="swDebugBlock" style="left:'+(b.x-b.r)+'px;top:'+(b.y-b.r)+'px;width:'+(b.r*2)+'px;height:'+(b.r*2)+'px"></div>';});
    HOTSPOTS.forEach(function(h){html+='<div class="swDebugHotspot" style="left:'+(h.x-h.r)+'px;top:'+(h.y-h.r)+'px;width:'+(h.r*2)+'px;height:'+(h.r*2)+'px"><span>'+h.id+'</span></div>';});
    layer.innerHTML=html;
  }
  function toggleDebug(){engine.debug=!engine.debug;if(engine.root)engine.root.classList.toggle('showDebug',engine.debug);toast(engine.debug?'Boundary debug on.':'Boundary debug off.');}
  function makeFireflies(){if(!engine.fx)return;engine.fx.innerHTML='';var spots=[[370,380],[430,500],[1140,290],[1230,585],[270,740],[860,350],[620,240]];for(var i=0;i<42;i++){var s=spots[i%spots.length];var f=document.createElement('i');f.style.left=(s[0]+(Math.random()*180-90))+'px';f.style.top=(s[1]+(Math.random()*140-70))+'px';f.style.animationDelay=(-Math.random()*7)+'s';f.style.animationDuration=(4+Math.random()*5)+'s';engine.fx.appendChild(f);}}
  function makeMotes(){var m=document.getElementById('swMotes');if(!m)return;m.innerHTML='';for(var i=0;i<70;i++){var e=document.createElement('i');e.style.left=(Math.random()*MAP_W)+'px';e.style.top=(Math.random()*MAP_H)+'px';e.style.animationDelay=(-Math.random()*12)+'s';e.style.animationDuration=(8+Math.random()*10)+'s';m.appendChild(e);}}
  function renderAmbientEffects(){
    var layer=document.getElementById('swAmbientLayer');if(!layer)return;layer.innerHTML='';
    var list=ambientEffectList();
    list.forEach(function(e){
      var type=e.effect||e.waterEffect||e.type||'waterSurfaceShimmer';
      var box=ambientBounds(e);if(!box||box.w<2||box.h<2)return;
      var cls=cssEffectClass(type);
      var d=document.createElement('div');
      d.className='swAmbientEffect '+cls;
      d.dataset.id=e.id||'';d.dataset.effect=type;
      d.style.left=box.x+'px';d.style.top=box.y+'px';d.style.width=box.w+'px';d.style.height=box.h+'px';
      d.style.opacity=(e.opacity==null?(cls==='waterSurfaceShimmer'?0.55:0.82):Number(e.opacity));
      d.style.setProperty('--density',Number(e.density==null?0.45:e.density));
      d.style.setProperty('--speed',Math.max(.15,Number(e.speed||1)));
      d.style.setProperty('--angle',(Number(e.angle||0))+'deg');
      if(Array.isArray(e.points)&&e.points.length>=3){
        d.style.clipPath='polygon('+e.points.map(function(p){return ((p[0]-box.x)/box.w*100).toFixed(2)+'% '+((p[1]-box.y)/box.h*100).toFixed(2)+'%';}).join(',')+')';
      }
      var count=(cls==='leaves')?Math.max(8,Math.round(Number(e.density||0.45)*42)):(cls==='fireflies')?Math.max(8,Math.round(Number(e.density||0.45)*32)):(cls==='waterfallMist')?Math.max(14,Math.round(Number(e.density||0.55)*44)):(cls==='waterfallCascade')?Math.max(8,Math.round(Number(e.density||0.55)*18)):0;
      for(var i=0;i<count;i++){var part=document.createElement('i');part.style.left=(Math.random()*100)+'%';part.style.top=(Math.random()*100)+'%';part.style.animationDelay=(-Math.random()*8)+'s';part.style.animationDuration=(5+Math.random()*7)/Math.max(.15,Number(e.speed||1))+'s';d.appendChild(part);}
      layer.appendChild(d);
    });
  }
  function ambientEffectList(){
    var cfg=engine.regionConfig||{};
    var list=[];
    list=list.concat(cfg.ambientEffects||[]);
    (cfg.sceneObjects||[]).forEach(function(o){var t=o.type||o.kind||'';if(t==='ambientEffect'||t==='waterArea'||t==='waterfx'||t==='effect')list.push(o);});
    (cfg.terrainAreas||[]).forEach(function(o){var terrain=String(o.terrain||o.effect||'').toLowerCase();if(terrain==='water'||terrain==='river'||terrain==='pond')list.push(Object.assign({},o,{type:'ambientEffect',effect:o.effect||'waterSurfaceShimmer'}));});
    return list;
  }
  function ambientBounds(e){
    if(Array.isArray(e.points)&&e.points.length>=3){
      var xs=e.points.map(function(p){return Number(p[0]);}),ys=e.points.map(function(p){return Number(p[1]);});
      var minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs),minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
      return {x:minX,y:minY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
    }
    return {x:Number(e.x||0),y:Number(e.y||0),w:Number(e.w||e.width||160),h:Number(e.h||e.height||120)};
  }
  function cssEffectClass(type){
    type=String(type||'').toLowerCase();
    if(type.indexOf('fall')>=0||type.indexOf('leaf')>=0)return 'leaves';
    if(type.indexOf('fire')>=0||type.indexOf('mote')>=0)return 'fireflies';
    if(type.indexOf('mist')>=0)return 'waterfallMist';
    if(type.indexOf('foam')>=0||type.indexOf('edge')>=0)return 'waterEdgeFoam';
    if(type.indexOf('cascade')>=0||type==='waterfall'||type.indexOf('waterfall')>=0)return 'waterfallCascade';
    if(type.indexOf('current')>=0||type.indexOf('river')>=0)return 'slowRiverCurrent';
    if(type.indexOf('shimmer')>=0||type.indexOf('surface')>=0)return 'waterSurfaceShimmer';
    if(type.indexOf('splash')>=0)return 'splashRing';
    return 'pondRipple';
  }



  function rebuildWaterAreas(){
    WATER_AREAS=[];
    ambientEffectList().forEach(function(o){
      var eff=String(o.effect||o.waterEffect||o.type||'').toLowerCase();
      var isWater=eff.indexOf('water')>=0||eff.indexOf('river')>=0||eff.indexOf('pond')>=0||eff.indexOf('ripple')>=0||eff.indexOf('shimmer')>=0||eff.indexOf('current')>=0||eff.indexOf('foam')>=0||String(o.type||'').toLowerCase()==='waterarea';
      if(isWater)WATER_AREAS.push(o);
    });
    var cfg=engine.regionConfig||{};
    (cfg.waterAreas||[]).forEach(function(o){WATER_AREAS.push(o);});
  }
  function pointInWaterArea(x,y){
    for(var i=0;i<WATER_AREAS.length;i++){if(pointInObject(x,y,WATER_AREAS[i]))return true;}
    return false;
  }
  function castValidation(x,y){
    var hasWater=WATER_AREAS&&WATER_AREAS.length>0;
    if(hasWater){return pointInWaterArea(x,y)?{ok:true,reason:'Cast landed in water.'}:{ok:false,reason:'Aim for the animated water area.'};}
    var f=engine.fish||{}, spot=f.hotspot||{};
    var ca=spot.castArea||spot.castTarget||{};
    if(ca&&ca.x!=null&&ca.y!=null){
      var r=Number(ca.r||ca.radius||spot.castRadius||125);
      return Math.hypot(x-Number(ca.x),y-Number(ca.y))<=r?{ok:true,reason:'Cast landed in the fishing area.'}:{ok:false,reason:'Aim into the fishing cast circle.'};
    }
    return Math.hypot(x-FISH_TARGET.x,y-FISH_TARGET.y)<=150?{ok:true,reason:'Cast landed near the fishing target.'}:{ok:false,reason:'Aim closer to the water.'};
  }
  function sceneObjects(){
    var cfg=engine.regionConfig||{};
    return [].concat(cfg.sceneObjects||[],cfg.interactables||[],cfg.hotspots||[],cfg.terrainAreas||[],cfg.triggerZones||[],cfg.textBoxes||[],cfg.lights||[],cfg.cameraZones||[]);
  }
  function renderSceneExtras(){
    renderToneLayer();renderObjectLayer();renderLightLayer();renderInteractionIcons();
  }
  function renderToneLayer(){
    var el=document.getElementById('swToneLayer');if(!el)return;
    var cfg=engine.regionConfig||{}, mood=(cfg.timeOfDay||cfg.mood||'night');
    el.className='swToneLayer '+String(mood).toLowerCase();
    el.style.opacity=(cfg.tintOpacity==null?'1':String(cfg.tintOpacity));
  }
  function renderObjectLayer(){
    var layer=document.getElementById('swObjectLayer');if(!layer)return;layer.innerHTML='';
    sceneObjects().forEach(function(o){
      var type=o.type||o.kind||'';
      if(type==='textBox'||type==='sign'||type==='readable'){
        var d=document.createElement('div');d.className='swSceneMarker text';d.style.left=(Number(o.x||0)-16)+'px';d.style.top=(Number(o.y||0)-22)+'px';d.textContent='📜';d.title=o.label||o.title||'Read';layer.appendChild(d);
      }
      if(type==='cameraZone'){
        var c=document.createElement('div');c.className='swCameraMood';c.style.left=Number(o.x||0)+'px';c.style.top=Number(o.y||0)+'px';c.style.width=Number(o.w||220)+'px';c.style.height=Number(o.h||160)+'px';c.style.opacity=0;layer.appendChild(c);
      }
    });
  }
  function renderLightLayer(){
    var layer=document.getElementById('swLightLayer');if(!layer)return;layer.innerHTML='';
    sceneObjects().forEach(function(o){
      var type=o.type||o.kind||''; if(type!=='light'&&type!=='lantern'&&type!=='campfire')return;
      var d=document.createElement('div');d.className='swLight '+(o.lightType||type||'warm');
      var r=Number(o.r||o.radius||180);d.style.left=(Number(o.x||0)-r)+'px';d.style.top=(Number(o.y||0)-r)+'px';d.style.width=(r*2)+'px';d.style.height=(r*2)+'px';
      d.style.opacity=(o.opacity==null?0.72:o.opacity);layer.appendChild(d);
    });
  }
  function renderInteractionIcons(){
    var layer=document.getElementById('swInteractionIcons');if(!layer)return;layer.innerHTML='';
    HOTSPOTS.forEach(function(h){
      if(h.type==='exit'||h.kind==='exit'||isFishingHotspot(h)||h.type==='npc'||h.type==='chest'||h.type==='dialogue'||h.type==='textBox'){
        var d=document.createElement('div');d.className='swInteractIcon '+(h.type||h.kind||'');
        d.style.left=(h.x-13)+'px';d.style.top=(h.y-(h.r||60)-32)+'px';
        d.textContent=isFishingHotspot(h)?'🎣':(h.type==='exit'||h.kind==='exit')?'➜':(h.type==='chest')?'✦':(h.type==='npc')?'!':'…';
        layer.appendChild(d);
      }
    });
  }
  function updateTriggerZones(dt){
    var cfg=engine.regionConfig||{}, list=(cfg.triggerZones||cfg.sceneObjects||[]).filter(function(o){return (o.type||o.kind)==='trigger';});
    var hit=null;list.forEach(function(o){if(pointInObject(engine.state.x,engine.state.y,o))hit=o;});
    if(hit&&engine.lastTriggerId!==hit.id){engine.lastTriggerId=hit.id;if(hit.text||hit.title)toast((hit.title?hit.title+': ':'')+(hit.text||''));}
    if(!hit)engine.lastTriggerId='';
  }
  function updateTerrainParticles(dt){
    if(!engine.state||!engine.state.moving)return;engine.footTimer=(engine.footTimer||0)+dt;if(engine.footTimer<0.22)return;engine.footTimer=0;
    var cfg=engine.regionConfig||{}, list=(cfg.terrainAreas||[]).concat((cfg.sceneObjects||[]).filter(function(o){return (o.type||'')==='terrain';}));
    var terrain='default';list.forEach(function(o){if(pointInObject(engine.state.x,engine.state.y,o))terrain=o.terrain||o.effect||'grass';});
    if(terrain==='default')return;var layer=document.getElementById('swTerrainParticles');if(!layer)return;
    var p=document.createElement('i');p.className='swFoot '+terrain;p.style.left=(engine.state.x+(Math.random()*14-7))+'px';p.style.top=(engine.state.y+6)+'px';layer.appendChild(p);setTimeout(function(){p.remove();},900);
  }
  function updateOcclusionFade(){
    var cfg=engine.regionConfig||{}, polys=(cfg.foreground||[]).concat((cfg.sceneObjects||[]).filter(function(o){return (o.type||'')==='occlusion';}));
    var under=false;polys.forEach(function(o){if(pointInObject(engine.state.x,engine.state.y,o))under=true;});
    if(engine.playerEl)engine.playerEl.classList.toggle('swOccluded',under);
  }
  function pointInObject(x,y,o){
    if(!o)return false;if(Array.isArray(o.points)&&o.points.length>=3)return pointInPoly(x,y,o.points);
    if(o.r||o.radius)return Math.hypot(x-Number(o.x||0),y-Number(o.y||0))<=Number(o.r||o.radius||0);
    if(o.w||o.h)return x>=Number(o.x||0)&&y>=Number(o.y||0)&&x<=Number(o.x||0)+Number(o.w||0)&&y<=Number(o.y||0)+Number(o.h||0);
    return false;
  }
  function showDialogueBubble(h){
    var layer=document.getElementById('swInteractionIcons');if(!layer)return;
    var b=document.createElement('div');b.className='swDialogueBubble';b.style.left=(h.x-80)+'px';b.style.top=(h.y-(h.r||60)-72)+'px';b.textContent=h.text||h.dialogue||h.title||'...';layer.appendChild(b);setTimeout(function(){b.remove();},2600);
  }

  function injectStyles(){if(document.getElementById('gfWorldEngineStyles'))return;var s=document.createElement('style');s.id='gfWorldEngineStyles';s.textContent=`
.swRoot{position:fixed;inset:0;z-index:100000;background:#02060b;color:#f7e7bf;font-family:Georgia,'Times New Roman',serif}.swRoot.hidden{display:none}.swViewport{position:absolute;inset:0;overflow:hidden;background:#02060b}.swWorld{position:absolute;left:0;top:0;width:${MAP_W}px;height:${MAP_H}px;transform-origin:0 0}.swBg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;user-select:none;pointer-events:none}.swWaterGlow{position:absolute;left:640px;top:340px;width:760px;height:520px;border-radius:45%;background:radial-gradient(circle,rgba(36,170,255,.20),transparent 65%);mix-blend-mode:screen;animation:swWater 3.4s ease-in-out infinite;pointer-events:none}.swMist{position:absolute;left:840px;top:100px;width:420px;height:210px;background:radial-gradient(ellipse,rgba(95,180,255,.22),transparent 65%);filter:blur(12px);animation:swMist 5s ease-in-out infinite}.swCanopy{position:absolute;inset:0;background:radial-gradient(ellipse at 8% 93%,rgba(0,0,0,.72),transparent 20%),radial-gradient(ellipse at 92% 95%,rgba(0,0,0,.58),transparent 24%),radial-gradient(ellipse at 40% 4%,rgba(0,0,0,.55),transparent 20%);pointer-events:none;mix-blend-mode:multiply}.swPlayer{position:absolute;width:128px;height:128px;margin-left:-64px;margin-top:-104px;transition:filter .12s linear;transform:scale(.70);transform-origin:50% 88%;will-change:left,top}.swSprite{width:128px;height:128px;background-repeat:no-repeat;background-size:768px 2048px;image-rendering:auto;overflow:hidden;background-color:transparent;backface-visibility:hidden;will-change:background-position}.swShadow{position:absolute;width:30px;height:7px;margin-left:-15px;margin-top:-3px;border-radius:50%;background:rgba(0,0,0,.16);filter:blur(1.5px);pointer-events:none;transform-origin:50% 50%}.swHotspot{position:absolute;border-radius:50%;pointer-events:none}.swHotspot.dock{left:630px;top:575px;width:145px;height:110px;background:radial-gradient(ellipse,rgba(61,184,255,.24),rgba(61,184,255,.05) 45%,transparent 70%);animation:swPulse 2s ease-in-out infinite}.swHotspot.path{left:135px;top:215px;width:100px;height:120px;background:radial-gradient(ellipse,rgba(255,207,102,.15),transparent 65%)}.swBobber{position:absolute;width:20px;height:20px;margin-left:-10px;margin-top:-10px;border-radius:50%;background:#f04d66;box-shadow:0 0 14px #9df,0 0 0 10px rgba(63,190,255,.15);z-index:800}.swBobber.hidden,.swLine.hidden{display:none}.swBobber:after{content:'';position:absolute;left:-26px;top:-26px;width:72px;height:72px;border:2px solid rgba(140,220,255,.58);border-radius:50%;animation:swRipple 1.4s linear infinite}.swBobber.bite{animation:swBite .22s linear 5}.swLine{position:absolute;height:2px;background:linear-gradient(90deg,rgba(255,241,199,.92),rgba(160,220,255,.45));transform-origin:0 50%;z-index:790;pointer-events:none}.swCastAim{position:absolute;width:54px;height:54px;margin-left:-27px;margin-top:-27px;border-radius:50%;border:3px solid rgba(255,100,100,.85);background:radial-gradient(circle,rgba(255,100,100,.20),transparent 65%);z-index:760;pointer-events:none;box-shadow:0 0 14px rgba(255,70,70,.7)}.swCastAim.valid{border-color:rgba(134,239,172,.95);background:radial-gradient(circle,rgba(134,239,172,.22),transparent 65%);box-shadow:0 0 18px rgba(134,239,172,.7)}.swCastAim.invalid{border-color:rgba(255,115,115,.95);background:radial-gradient(circle,rgba(255,80,80,.20),transparent 65%);box-shadow:0 0 18px rgba(255,80,80,.55)}.swCastAim.hidden{display:none}.swBobber.bad{background:#555;box-shadow:0 0 10px rgba(255,80,80,.65)}.swAmbientLayer{position:absolute;inset:0;pointer-events:none;z-index:120}.swAmbientEffect{position:absolute;pointer-events:none;overflow:hidden}.swAmbientEffect.ripple:before{content:'';position:absolute;inset:12%;border-radius:50%;border:3px solid rgba(135,218,255,.42);box-shadow:0 0 18px rgba(135,218,255,.22);animation:swAmbientRipple 2.2s linear infinite}.swAmbientEffect.ripple:after{content:'';position:absolute;inset:28%;border-radius:50%;border:2px solid rgba(224,246,255,.35);animation:swAmbientRipple 2.2s linear infinite .7s}.swAmbientEffect.shimmer{background:linear-gradient(110deg,transparent,rgba(150,230,255,.18),transparent);mix-blend-mode:screen;animation:swShimmer 2.8s ease-in-out infinite}.swAmbientEffect.waterfall{background:repeating-linear-gradient(90deg,rgba(180,240,255,.0) 0 8px,rgba(180,240,255,.20) 9px 13px,rgba(255,255,255,.12) 14px 18px);filter:blur(.5px);mix-blend-mode:screen;animation:swFalls .7s linear infinite}.swAmbientEffect.foam{background:radial-gradient(ellipse,rgba(230,250,255,.48),transparent 62%);filter:blur(3px);mix-blend-mode:screen;animation:swFoam 1.8s ease-in-out infinite}.swAmbientEffect.mist{background:radial-gradient(ellipse,rgba(200,235,255,.30),transparent 70%);filter:blur(8px);animation:swMist 4s ease-in-out infinite}.swAmbientEffect.leaves i{position:absolute;width:9px;height:5px;border-radius:70% 20%;background:rgba(205,143,55,.78);box-shadow:0 0 4px rgba(0,0,0,.25);animation:swLeafDrift 7s linear infinite}.swAmbientEffect.fireflies i{position:absolute;width:5px;height:5px;border-radius:50%;background:#fbff9d;box-shadow:0 0 12px #eaff77;animation:swFly 6s ease-in-out infinite}.swFireflies i{position:absolute;width:6px;height:6px;border-radius:50%;background:#fbff9d;box-shadow:0 0 14px #eaff77,0 0 24px rgba(114,213,255,.35);animation:swFly 7s ease-in-out infinite;pointer-events:none}.swMotes i{position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(114,196,255,.65);box-shadow:0 0 8px rgba(114,196,255,.7);animation:swMote 12s linear infinite;pointer-events:none}.swHud{position:absolute;inset:0;pointer-events:none}.swHud button{pointer-events:auto}.swStatus{position:absolute;left:24px;top:20px;display:flex;gap:12px;align-items:center;padding:8px 14px;border:1px solid rgba(218,169,83,.65);border-radius:18px;background:linear-gradient(180deg,rgba(8,12,18,.72),rgba(8,12,18,.34));box-shadow:0 12px 30px rgba(0,0,0,.45)}.portrait{width:58px;height:58px;border-radius:50%;background:radial-gradient(circle,#704323,#1b1110);border:2px solid #d7a857}.bar{width:150px;height:14px;border-radius:999px;background:#160d0b;border:1px solid #d7a857;margin:5px 0;overflow:hidden}.bar span{display:block;height:100%;width:100%}.bar.hp span{background:linear-gradient(90deg,#a82931,#e66b5e)}.bar.sp span{width:72%;background:linear-gradient(90deg,#2465b8,#66c5f0)}.swTitle{position:absolute;left:50%;top:24px;transform:translateX(-50%);font-size:30px;font-weight:800;text-shadow:0 3px 10px #000}.swTitle span{color:#d8b56b;margin:0 8px}.swClose{position:absolute;right:22px;top:20px;background:rgba(0,0,0,.45);color:#f5d99a;border:1px solid #d7a857;border-radius:999px;padding:8px 14px;font-weight:bold}.swQuest{position:absolute;right:32px;top:178px;width:300px;padding:16px 18px;border:1px solid rgba(218,169,83,.8);border-radius:10px;background:rgba(7,8,12,.72);box-shadow:0 14px 40px rgba(0,0,0,.55)}.swQuest b{color:#ffe28a}.swQuest p{margin:8px 0 0;color:#f6e5c3;line-height:1.35}.swToast{position:absolute;left:50%;bottom:118px;transform:translateX(-50%);padding:10px 16px;border-radius:999px;background:rgba(3,6,10,.65);border:1px solid rgba(218,169,83,.55);opacity:.0;transition:.25s;box-shadow:0 12px 30px rgba(0,0,0,.45)}.swToast.show{opacity:1}.swActionHint{position:absolute;left:50%;bottom:172px;transform:translateX(-50%);padding:9px 14px;border-radius:999px;background:rgba(28,46,32,.82);border:1px solid rgba(134,239,172,.55);color:#eaffcf;font:800 14px Arial,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.45);letter-spacing:.02em}.swActionHint.hidden{display:none}.swHotbar{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);display:flex;gap:6px;padding:8px;border:1px solid rgba(218,169,83,.7);border-radius:14px;background:rgba(6,7,10,.68)}.swHotbar button{width:58px;height:58px;background:rgba(24,20,16,.85);color:#ffe9bd;border:1px solid rgba(218,169,83,.75);border-radius:8px;font-weight:bold}.swHotbar span{font-size:24px}.swFishing{position:absolute;right:32px;bottom:100px;width:360px;padding:18px 20px;border:1px solid rgba(218,169,83,.9);border-radius:14px;background:rgba(7,8,12,.76);box-shadow:0 16px 45px rgba(0,0,0,.62)}.swFishing.hidden{display:none}.swFishing h3{text-align:center;margin:0 0 10px;font-size:25px}.swFishing p{margin:0 0 12px;text-align:center}.swFishing small{display:block;text-align:center;margin-top:8px;color:#ffefbf}.swCastBar{position:relative;height:20px;border-radius:999px;background:linear-gradient(90deg,#65b846,#f6d452,#bd3d2e);border:2px solid #d7a857;overflow:hidden}.swCastBar i{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(255,255,255,.25)}.swCastBar em{position:absolute;top:-5px;width:5px;height:30px;background:#fff;border-radius:3px;box-shadow:0 0 9px #fff}.swNearDock .swHotspot.dock{box-shadow:0 0 22px rgba(111,213,255,.75)}.swDebugLayer{position:absolute;inset:0;display:none;pointer-events:none;z-index:2000}.showDebug .swDebugLayer{display:block}.swDebugPoly{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.swDebugPoly polygon{fill:rgba(71,255,124,.16);stroke:rgba(71,255,124,.85);stroke-width:3}.swDebugBlock{position:absolute;border-radius:50%;background:rgba(255,70,70,.18);border:3px solid rgba(255,70,70,.85)}.swDebugHotspot{position:absolute;border-radius:50%;background:rgba(75,180,255,.18);border:3px solid rgba(75,180,255,.9);display:grid;place-items:center;color:white;font:700 18px Arial;text-shadow:0 2px 6px #000}.swSceneTransition{position:absolute;inset:0;z-index:50000;display:grid;place-items:center;background:#02060b;opacity:0;pointer-events:none;transition:opacity .24s ease}.swSceneTransition.show{opacity:1;pointer-events:auto}.swSceneTransition:before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(42,77,91,.18),rgba(0,0,0,.74) 62%,#000 100%);transform:scale(1.08);animation:swTransitionDrift 1.2s ease-in-out infinite alternate}.swSceneTransitionText{position:relative;font:800 24px Georgia,'Times New Roman',serif;color:#ffe4a3;text-shadow:0 3px 14px #000;letter-spacing:.04em;opacity:.9}
@keyframes swTransitionDrift{from{transform:scale(1.04)}to{transform:scale(1.12)}}@keyframes swWater{50%{opacity:.62;transform:scale(1.03)}}@keyframes swMist{50%{opacity:.5;transform:translateY(8px)}}@keyframes swPulse{50%{opacity:.35;transform:scale(1.04)}}@keyframes swRipple{to{transform:scale(1.9);opacity:0}}@keyframes swBite{50%{transform:translateY(-12px) scale(1.15)}}@keyframes swFly{50%{transform:translate(28px,-22px);opacity:.45}}@keyframes swMote{to{transform:translateY(-120px);opacity:0}}@keyframes swAmbientRipple{0%{transform:scale(.5);opacity:.75}100%{transform:scale(1.65);opacity:0}}@keyframes swShimmer{50%{opacity:.35;transform:translateX(16px)}}@keyframes swFalls{to{background-position:0 28px}}@keyframes swFoam{50%{opacity:.45;transform:scale(1.04)}}@keyframes swLeafDrift{0%{transform:translateY(-30px) translateX(0) rotate(0);opacity:0}12%{opacity:.85}100%{transform:translateY(230px) translateX(70px) rotate(250deg);opacity:0}}
/* Area-based SNES-style water FX overlays */
.swAmbientEffect.waterSurfaceShimmer{background:radial-gradient(ellipse at 18% 28%,rgba(190,245,255,.13),transparent 20%),radial-gradient(ellipse at 48% 60%,rgba(155,230,255,.09),transparent 23%),radial-gradient(ellipse at 76% 38%,rgba(235,255,255,.11),transparent 19%),radial-gradient(ellipse at 35% 84%,rgba(110,205,255,.07),transparent 24%);mix-blend-mode:screen;filter:blur(1.1px);animation:swWaterSurfaceShimmer 3.8s ease-in-out infinite;opacity:.42}
.swAmbientEffect.waterSurfaceShimmer:before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(255,255,255,.11),transparent 18%),radial-gradient(ellipse at 62% 35%,rgba(145,225,255,.10),transparent 20%),radial-gradient(ellipse at 82% 72%,rgba(255,255,255,.08),transparent 17%);background-size:220px 120px,280px 160px,190px 110px;animation:swWaterSparkleDrift 6.5s linear infinite;opacity:.55}
.swAmbientEffect.slowRiverCurrent{background:radial-gradient(ellipse at 16% 45%,rgba(160,230,255,.08),transparent 34%),radial-gradient(ellipse at 68% 55%,rgba(210,250,255,.06),transparent 32%);mix-blend-mode:screen;filter:blur(1.4px);animation:swRiverCurrent 4.6s ease-in-out infinite;opacity:.36}.swAmbientEffect.slowRiverCurrent:before{content:'';position:absolute;inset:-12%;background:linear-gradient(var(--angle),transparent 0%,rgba(170,235,255,.07) 42%,rgba(245,255,255,.10) 50%,rgba(170,235,255,.06) 58%,transparent 100%);transform:translateX(-32%);animation:swRiverSoftBand 5.2s linear infinite;opacity:.55}
.swAmbientEffect.waterEdgeFoam{background:radial-gradient(ellipse at 25% 70%,rgba(235,252,255,.34),transparent 38%),radial-gradient(ellipse at 65% 42%,rgba(210,245,255,.24),transparent 40%),radial-gradient(ellipse at 50% 50%,rgba(255,255,255,.16),transparent 55%);mix-blend-mode:screen;filter:blur(2px);animation:swEdgeFoam 2.2s ease-in-out infinite;opacity:.58}
.swAmbientEffect.waterfallCascade{background:linear-gradient(180deg,rgba(255,255,255,.24),rgba(120,215,255,.16) 45%,rgba(255,255,255,.28)),repeating-linear-gradient(90deg,rgba(190,245,255,.00) 0 10px,rgba(190,245,255,.22) 12px 15px,rgba(255,255,255,.24) 17px 19px,rgba(190,245,255,.05) 22px 31px);mix-blend-mode:screen;filter:blur(.7px);animation:swWaterfallCascade .38s linear infinite;opacity:.74}.swAmbientEffect.waterfallCascade:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 22px,rgba(255,255,255,.18) 25px 28px,transparent 31px 48px);animation:swWaterfallCascade2 .62s linear infinite;opacity:.65}.swAmbientEffect.waterfallCascade:after{content:'';position:absolute;left:0;right:0;bottom:-18%;height:36%;background:radial-gradient(ellipse at 50% 50%,rgba(235,252,255,.38),rgba(145,225,255,.18) 46%,transparent 72%);filter:blur(5px);animation:swWaterfallBaseFoam 1.2s ease-in-out infinite}
.swAmbientEffect.waterfallMist{background:radial-gradient(ellipse at 50% 50%,rgba(215,245,255,.30),rgba(160,225,255,.15) 42%,transparent 74%);mix-blend-mode:screen;filter:blur(9px);animation:swWaterfallMist 3.8s ease-in-out infinite;opacity:.62}.swAmbientEffect.waterfallMist i{position:absolute;width:18px;height:8px;border-radius:999px;background:rgba(230,250,255,.24);filter:blur(3px);animation:swMistParticle 4.8s ease-in-out infinite}
.swAmbientEffect.pondRipple:before,.swAmbientEffect.splashRing:before{content:'';position:absolute;inset:18%;border-radius:50%;border:2px solid rgba(135,218,255,.42);box-shadow:0 0 14px rgba(135,218,255,.18);animation:swAmbientRipple 2.2s linear infinite}.swAmbientEffect.pondRipple:after,.swAmbientEffect.splashRing:after{content:'';position:absolute;inset:34%;border-radius:50%;border:1px solid rgba(224,246,255,.34);animation:swAmbientRipple 2.2s linear infinite .7s}.swAmbientEffect.splashRing{animation:swSplashPulse 1.2s ease-out infinite}
@keyframes swWaterSurfaceShimmer{0%,100%{transform:translate(0,0) scale(1);opacity:.34}50%{transform:translate(8px,-5px) scale(1.015);opacity:.55}}@keyframes swWaterSparkleDrift{0%{background-position:0 0,0 0,0 0}100%{background-position:70px -28px,-95px 42px,55px 30px}}@keyframes swRiverCurrent{0%,100%{transform:translateX(-4px);opacity:.28}50%{transform:translateX(10px);opacity:.48}}@keyframes swRiverSoftBand{to{transform:translateX(70%)}}@keyframes swEdgeFoam{50%{opacity:.72;transform:scale(1.025)}}@keyframes swWaterfallCascade{to{background-position:0 38px,0 38px}}@keyframes swWaterfallCascade2{to{background-position:0 58px}}@keyframes swWaterfallBaseFoam{50%{opacity:.72;transform:translateY(4px) scale(1.05)}}@keyframes swWaterfallMist{50%{opacity:.72;transform:translateY(8px) scale(1.04)}}@keyframes swMistParticle{50%{transform:translate(22px,-12px);opacity:.25}}@keyframes swSplashPulse{50%{filter:brightness(1.25)}}

/* Water FX visibility pass: these are intentionally stronger than the first subtle debug-looking pass. */
.swAmbientEffect.waterSurfaceShimmer{background:radial-gradient(ellipse at 18% 32%,rgba(210,250,255,.22),transparent 21%),radial-gradient(ellipse at 46% 62%,rgba(90,210,255,.16),transparent 24%),radial-gradient(ellipse at 74% 38%,rgba(245,255,255,.18),transparent 20%),radial-gradient(ellipse at 35% 86%,rgba(80,185,255,.12),transparent 25%);mix-blend-mode:screen;filter:blur(.8px);animation:swWaterSurfaceShimmer 2.7s ease-in-out infinite;opacity:.62}.swAmbientEffect.waterSurfaceShimmer:after{content:'';position:absolute;inset:-20%;background:linear-gradient(115deg,transparent 0 42%,rgba(225,250,255,.16) 48%,rgba(120,220,255,.10) 53%,transparent 60%);animation:swWaterSheen 4.2s linear infinite;opacity:.65}.swAmbientEffect.slowRiverCurrent{background:radial-gradient(ellipse at 15% 45%,rgba(150,230,255,.14),transparent 34%),radial-gradient(ellipse at 70% 55%,rgba(230,255,255,.12),transparent 32%);mix-blend-mode:screen;filter:blur(1px);animation:swRiverCurrent 3.2s ease-in-out infinite;opacity:.50}.swAmbientEffect.slowRiverCurrent:after{content:'';position:absolute;inset:-10%;background:linear-gradient(var(--angle),transparent 0 36%,rgba(220,250,255,.14) 48%,transparent 60%);animation:swRiverSoftBand 3.4s linear infinite}.swAmbientEffect.waterEdgeFoam{background:radial-gradient(ellipse at 22% 70%,rgba(245,255,255,.50),transparent 38%),radial-gradient(ellipse at 65% 42%,rgba(210,245,255,.34),transparent 40%),radial-gradient(ellipse at 50% 50%,rgba(255,255,255,.22),transparent 56%);mix-blend-mode:screen;filter:blur(1.8px);animation:swEdgeFoam 1.4s ease-in-out infinite;opacity:.72}.swAmbientEffect.waterfallCascade{background:linear-gradient(180deg,rgba(255,255,255,.34),rgba(112,210,255,.24) 48%,rgba(255,255,255,.32)),repeating-linear-gradient(90deg,rgba(190,245,255,.00) 0 8px,rgba(185,238,255,.34) 10px 14px,rgba(255,255,255,.30) 16px 18px,rgba(190,245,255,.08) 20px 28px);mix-blend-mode:screen;filter:blur(.45px);animation:swWaterfallCascade .26s linear infinite;opacity:.90}.swAmbientEffect.waterfallCascade i{position:absolute;top:-20%;width:5px;height:42%;border-radius:999px;background:rgba(245,255,255,.45);filter:blur(2px);animation:swFallStreak 1.1s linear infinite}.swAmbientEffect.waterfallMist{background:radial-gradient(ellipse at 50% 62%,rgba(230,250,255,.42),rgba(150,225,255,.22) 45%,transparent 75%);mix-blend-mode:screen;filter:blur(7px);animation:swWaterfallMist 2.8s ease-in-out infinite;opacity:.76}.swAmbientEffect.pondRipple:before,.swAmbientEffect.splashRing:before{border-width:3px;border-color:rgba(175,232,255,.58)}@keyframes swWaterSheen{0%{transform:translateX(-65%)}100%{transform:translateX(65%)}}@keyframes swFallStreak{0%{transform:translateY(-70%);opacity:.15}20%{opacity:.55}100%{transform:translateY(330%);opacity:.05}}


/* GameForge engine-editor extras */
.swToneLayer,.swLightLayer,.swObjectLayer,.swTerrainParticles,.swInteractionIcons{position:absolute;inset:0;pointer-events:none;z-index:20}.swToneLayer{mix-blend-mode:multiply;z-index:18}.swToneLayer.night{background:radial-gradient(ellipse at 58% 38%,rgba(0,0,0,0),rgba(6,12,32,.18) 55%,rgba(0,0,0,.20));}.swToneLayer.evening{background:rgba(80,35,10,.12)}.swToneLayer.fog{background:radial-gradient(ellipse at center,rgba(220,245,255,.10),rgba(185,220,255,.08),transparent)}.swLightLayer{z-index:31;mix-blend-mode:screen}.swLight{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,224,139,.72),rgba(255,160,55,.22) 32%,rgba(255,160,55,.07) 55%,transparent 72%);filter:blur(7px);animation:swLightFlicker 2.4s ease-in-out infinite}.swLight.cool{background:radial-gradient(circle,rgba(155,220,255,.60),rgba(85,160,255,.18) 42%,transparent 72%)}.swLight.campfire{animation-duration:.85s}.swObjectLayer{z-index:34}.swSceneMarker{position:absolute;font-size:24px;filter:drop-shadow(0 4px 8px #000)}.swInteractionIcons{z-index:2200}.swInteractIcon{position:absolute;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:rgba(5,10,18,.72);border:1px solid rgba(255,226,138,.75);color:#ffe7a6;font:800 15px Arial;box-shadow:0 0 12px rgba(255,218,130,.22);animation:swIconBob 1.6s ease-in-out infinite}.swDialogueBubble{position:absolute;max-width:260px;padding:10px 12px;border-radius:14px;background:rgba(7,8,12,.84);border:1px solid rgba(255,226,138,.75);color:#fff3cb;font:700 14px Arial;line-height:1.25;box-shadow:0 12px 30px rgba(0,0,0,.5);animation:swBubbleIn .18s ease-out}.swPlayer.swOccluded{opacity:.58;filter:brightness(.92)}.swTerrainParticles{z-index:33}.swFoot{position:absolute;width:12px;height:6px;border-radius:50%;background:rgba(235,225,180,.36);transform:translate(-50%,-50%);animation:swFootFade .85s ease-out forwards}.swFoot.water{background:rgba(155,225,255,.48);box-shadow:0 0 8px rgba(155,225,255,.35)}.swFoot.leaves{background:rgba(188,135,55,.38)}.swFoot.wood{background:rgba(210,160,85,.28)}@keyframes swIconBob{50%{transform:translateY(-5px)}}@keyframes swBubbleIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}@keyframes swFootFade{to{opacity:0;transform:translate(-50%,-50%) scale(2.1)}}@keyframes swLightFlicker{0%,100%{opacity:.65;transform:scale(1)}50%{opacity:.85;transform:scale(1.05)}}

`;document.head.appendChild(s);}

  window.PetWorldWorldEngine={start:start,stop:stop};
})();
