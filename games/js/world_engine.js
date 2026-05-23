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
    username:'guest',fishStats:{total:0,last:'None',level:1,xp:0,nextXp:100,discovered:0,catalog:[],logbook:{}},sceneId:'shadow_woods_dock',requestedSpawnId:'',sceneRegistry:null,mp:{ws:null,id:'',peers:{},lastSent:0,connected:false,room:'',notice:''}};

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
      +    '<div class="swShadow" id="swShadow"></div><div class="swPlayer" id="swPlayer"><div class="swSprite"></div></div><div class="swRemoteLayer" id="swRemoteLayer"></div>'
      +    '<div class="swCanopy"></div>'
      +  '</div>'
      +  '<div class="swSceneTransition" id="swSceneTransition"><div class="swSceneTransitionText" id="swSceneTransitionText">Entering Shadow Woods...</div></div>'
      +  '<div class="swHud">'
      +    '<div class="swStatus"><div class="portrait"></div><div><b>Wanderer</b><div class="bar hp"><span></span></div><div class="bar sp"><span></span></div></div></div>'
      +    '<div class="swTitle">Shadow Woods <span>•</span> 9:47 PM <span>☾</span></div><div class="swMultiplayerStatus swSmartHud" id="swMultiplayerStatus">🌐 Connecting...</div>'
      +    '<button class="swClose" id="swClose">Leave</button>'
      +    '<div class="swQuest swSmartHud" id="swQuest"><div class="swQuestHead" id="swQuestHead"><b>✦ Whispers in the Dark</b><span class="swQuestActions"><button id="swQuestToggle" title="Collapse quest panel">▾</button><button id="swQuestClose" title="Hide quest panel">×</button></span></div><p id="swQuestBody">Walk to the dock and fish the glowing pond.</p></div>'
      +    '<div class="swToast swSmartHud" id="swToast">WASD / Arrow Keys to move. Click the path to walk.</div>'
      +    '<div class="swHotbar swSmartHud" id="swHotbar"><button>1<br><span>🎣</span></button><button>2<br><span>🎒</span></button><button>3<br><span>🏮</span></button><button>4<br><span>🧪</span></button><button>5<br><span>🪱</span></button><button>6<br><span>🍄</span></button><button>7<br><span>🌿</span></button><button>8<br><span>📜</span></button></div>'
      +    '<div class="swFishing swSmartHud hidden" id="swFishing"><div class="swFishTop"><h3>🎣 Fishing</h3><span id="swFishCount">0 fish</span></div><p id="swFishText">Hold Space or mouse to cast farther.</p><div class="swCastBar"><i id="swCastFill"></i><em id="swSweet"></em></div><div class="swCatchBar"><b id="swCatchFill"></b></div><small id="swFishHint">Release to cast</small><div class="swFishControls">Level <b id="swFishLevel">1</b> · XP <b id="swFishXp">0/100</b> · Press L for Logbook</div></div><button class="swLogbookButton swSmartHud" id="swLogbookButton">📘 Logbook</button><div class="swLogbookPanel hidden" id="swLogbookPanel"><div class="swLogbookHead"><b>Fishing Logbook</b><button id="swLogbookClose">×</button></div><div class="swLogbookSummary" id="swLogbookSummary">No fish logged yet.</div><div class="swLogbookGrid" id="swLogbookGrid"></div></div>'
      +  '</div>'
      +'</div>';
    document.body.appendChild(root);
    engine.root=root;engine.viewport=root.querySelector('#swViewport');engine.world=root.querySelector('#swWorld');engine.playerEl=root.querySelector('#swPlayer');engine.shadowEl=root.querySelector('#swShadow');engine.ui=root.querySelector('#swFishing');engine.fx=root.querySelector('#swFireflies');engine.transitionEl=root.querySelector('#swSceneTransition');
    root.querySelector('#swClose').onclick=stop;
    var qToggle=root.querySelector('#swQuestToggle');
    if(qToggle){qToggle.onclick=function(ev){ev.preventDefault();ev.stopPropagation();toggleQuestPanel();};}
    var qClose=root.querySelector('#swQuestClose');
    if(qClose){qClose.onclick=function(ev){ev.preventDefault();ev.stopPropagation();collapseQuestPanel(true);};}
    var qHead=root.querySelector('#swQuestHead');
    if(qHead){qHead.onclick=function(ev){if(ev.target&&ev.target.tagName==='BUTTON')return;toggleQuestPanel();};}
    var lb=root.querySelector('#swLogbookButton');if(lb){lb.onclick=function(ev){ev.preventDefault();ev.stopPropagation();toggleLogbook();};}
    var lbClose=root.querySelector('#swLogbookClose');if(lbClose){lbClose.onclick=function(ev){ev.preventDefault();ev.stopPropagation();toggleLogbook(false);};}
    restoreQuestPanelState();
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
    opts=opts||{};engine.onClose=opts.onClose||null;engine.username=opts.username||getPlayerName();loadFishingStats();engine.root.classList.remove('hidden');engine.running=true;engine.mode='explore';engine.keys={};engine.target=null;engine.fish=null;
    var spawn=getSpawnPoint(engine.regionConfig,engine.requestedSpawnId)||{x:560,y:685,face:'up'};
    engine.state={x:Number(spawn.x||560),y:Number(spawn.y||705),vx:0,vy:0,face:spawn.face||'up',moving:false,animTime:0,frame:0,animKey:''};
    if(!canStand(engine.state.x,engine.state.y)){
      var safe=findNearestSafe(engine.state.x,engine.state.y);engine.state.x=safe.x;engine.state.y=safe.y;
    }
    layout();connectWorldSocket();toast('Walk to the dock. Press E or Space near the dock to begin fishing. Press B for boundaries, R to reset.');engine.last=performance.now();engine.raf=requestAnimationFrame(loop);
  }
  function loadWorldConfig(done){
    loadSceneRegistry(function(){
      var meta=getSceneMeta(engine.sceneId);
      var url=(meta&&meta.url)||WORLD_JSON;
      function applyConfig(cfg){
        engine.regionConfig=cfg||{};
        engine.sceneId=engine.regionConfig.id||engine.sceneId||'shadow_woods_dock';if(engine.running)joinWorldRoom();
        // Scene loads are hard resets for scene-local interaction state.
        // This prevents fishing UI/bobbers/cast targets from leaking into interiors.
        if(engine.mode==='fish')endFishing();
        else { engine.mode='explore'; engine.fish=null; if(engine.ui)engine.ui.classList.add('hidden'); }
        function finishApply(){
          if(engine.regionConfig.size){MAP_W=Number(engine.regionConfig.size.w||MAP_W);MAP_H=Number(engine.regionConfig.size.h||MAP_H);}
          if(engine.world){
            engine.world.style.width=MAP_W+'px';engine.world.style.height=MAP_H+'px';
            var ps=Number(engine.regionConfig.playerScale||engine.regionConfig.avatarScale||0.70);
            if(!isFinite(ps)||ps<=0)ps=0.70;
            engine.world.style.setProperty('--player-scale',ps);
          }
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
  function stop(){sendWorldLeave();engine.running=false;cancelAnimationFrame(engine.raf);if(engine.root)engine.root.classList.add('hidden');if(engine.onClose)engine.onClose();}

  function layout(){
    if(!engine.viewport)return;
    var w=engine.viewport.clientWidth,h=engine.viewport.clientHeight;
    engine.scale=Math.min(w/MAP_W,h/MAP_H);engine.offX=(w-MAP_W*engine.scale)/2;engine.offY=(h-MAP_H*engine.scale)/2;
    engine.world.style.transform='translate('+engine.offX+'px,'+engine.offY+'px) scale('+engine.scale+')';
  }
  function screenToWorld(ev){var r=engine.viewport.getBoundingClientRect();return {x:(ev.clientX-r.left-engine.offX)/engine.scale,y:(ev.clientY-r.top-engine.offY)/engine.scale};}


  function socketUrl(){
    var proto=(location.protocol==='https:')?'wss':'ws';
    return proto+'://'+location.host;
  }
  function connectWorldSocket(){
    if(engine.mp.ws&&(engine.mp.ws.readyState===0||engine.mp.ws.readyState===1)){joinWorldRoom();return;}
    try{
      var ws=new WebSocket(socketUrl());engine.mp.ws=ws;setMultiplayerStatus('🌐 Connecting...');
      ws.onopen=function(){engine.mp.connected=true;joinWorldRoom();};
      ws.onmessage=function(ev){handleWorldSocketMessage(ev.data);};
      ws.onclose=function(){engine.mp.connected=false;setMultiplayerStatus('🌐 Offline world');setTimeout(function(){if(engine.running)connectWorldSocket();},1800);};
      ws.onerror=function(){setMultiplayerStatus('🌐 Multiplayer error');};
    }catch(e){setMultiplayerStatus('🌐 Offline world');}
  }
  function joinWorldRoom(){
    var ws=engine.mp.ws;if(!ws||ws.readyState!==1||!engine.state)return;
    engine.mp.room=engine.sceneId||'shadow_woods_dock';
    ws.send(JSON.stringify({type:'worldJoin',username:engine.username||getPlayerName(),sceneId:engine.mp.room,x:engine.state.x,y:engine.state.y,face:engine.state.face,moving:engine.state.moving,mode:engine.mode}));
    setMultiplayerStatus('🌐 Joining world...');
  }
  function sendWorldLeave(){
    try{var ws=engine.mp.ws;if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'worldLeave'}));}catch(e){}
    engine.mp.peers={};renderRemotePlayers(0);
  }
  function sendWorldPosition(force){
    var ws=engine.mp.ws;if(!ws||ws.readyState!==1||!engine.state)return;
    var now=performance.now();if(!force&&now-engine.mp.lastSent<80)return;engine.mp.lastSent=now;
    ws.send(JSON.stringify({type:'worldMove',x:Math.round(engine.state.x*10)/10,y:Math.round(engine.state.y*10)/10,face:engine.state.face,moving:engine.state.moving,mode:engine.mode}));
  }
  function broadcastWorldEvent(kind,data){
    try{var ws=engine.mp.ws;if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'worldEvent',event:Object.assign({kind:kind},data||{})}));}catch(e){}
  }
  function handleWorldSocketMessage(raw){
    var m;try{m=JSON.parse(raw);}catch(e){return;}
    if(m.type==='worldWelcome'){
      engine.mp.id=m.id||engine.mp.id;engine.mp.peers={};(m.peers||[]).forEach(function(p){upsertPeer(p,true);});
      setMultiplayerStatus('🌐 Online · '+(Object.keys(engine.mp.peers).length+1)+' here');renderRemotePlayers(0);return;
    }
    if(m.type==='worldJoin'&&m.player){upsertPeer(m.player,true);toast((m.player.username||'Someone')+' joined the area.');setMultiplayerStatus('🌐 Online · '+(Object.keys(engine.mp.peers).length+1)+' here');return;}
    if(m.type==='worldMove'&&m.player){upsertPeer(m.player,false);return;}
    if(m.type==='worldLeave'){delete engine.mp.peers[m.id];renderRemotePlayers(0);setMultiplayerStatus('🌐 Online · '+(Object.keys(engine.mp.peers).length+1)+' here');if(m.username)toast(m.username+' left the area.');return;}
    if(m.type==='worldEvent'&&m.event){toast((m.username||'Someone')+' '+worldEventText(m.event));return;}
  }
  function worldEventText(ev){
    if(ev.kind==='catch')return 'caught '+(ev.name||'a fish')+'!';
    return 'did something nearby.';
  }
  function upsertPeer(p,snap){
    if(!p||!p.id||p.id===engine.mp.id)return;
    var old=engine.mp.peers[p.id]||{};
    old.id=p.id;old.username=p.username||old.username||'Wanderer';old.face=p.face||old.face||'down';old.moving=!!p.moving;old.mode=p.mode||'explore';
    old.tx=Number(p.x||0);old.ty=Number(p.y||0);old.updatedAt=performance.now();
    if(snap||old.x==null){old.x=old.tx;old.y=old.ty;}
    engine.mp.peers[p.id]=old;
  }
  function setMultiplayerStatus(text){var el=document.getElementById('swMultiplayerStatus');if(el)el.textContent=text;}
  function renderRemotePlayers(dt){
    var layer=document.getElementById('swRemoteLayer');if(!layer)return;
    var ids=Object.keys(engine.mp.peers||{}),seen={};
    ids.forEach(function(id){
      var p=engine.mp.peers[id];seen[id]=true;
      if(p.x==null){p.x=p.tx||0;p.y=p.ty||0;}
      var follow=Math.min(1,(dt||0.016)*10);p.x+=(Number(p.tx||p.x)-p.x)*follow;p.y+=(Number(p.ty||p.y)-p.y)*follow;
      var el=layer.querySelector('[data-peer="'+id+'"]');
      if(!el){el=document.createElement('div');el.className='swRemotePlayer';el.setAttribute('data-peer',id);el.innerHTML='<div class="swRemoteName"></div><div class="swRemoteSprite"></div><div class="swRemoteShadow"></div>';layer.appendChild(el);}
      el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.zIndex=Math.round(p.y)-1;el.querySelector('.swRemoteName').textContent=p.username||'Wanderer';
      var spr=el.querySelector('.swRemoteSprite');var anim=remoteAnim(p);var idx=Math.floor((performance.now()/1000)*(anim.fps||4))%anim.frames.length;var fr=anim.frames[idx];
      spr.style.backgroundImage='url('+ASSETS.player+')';spr.style.backgroundSize=(SPRITE.cols*SPRITE.w)+'px '+(SPRITE.rows*SPRITE.h)+'px';spr.style.backgroundPosition=(-fr[0]*SPRITE.w)+'px '+(-fr[1]*SPRITE.h)+'px';spr.style.transform=anim.flip?'scaleX(-1)':'scaleX(1)';
    });
    Array.prototype.slice.call(layer.querySelectorAll('.swRemotePlayer')).forEach(function(el){if(!seen[el.getAttribute('data-peer')])el.remove();});
  }
  function remoteAnim(p){
    if(p.mode==='fish')return {fps:1,frames:frames(2,1)};
    if(p.moving){
      if(p.face==='up')return {fps:8,frames:frames(5,6)};
      if(p.face==='down')return {fps:8,frames:frames(4,6)};
      if(p.face==='left')return {fps:8,frames:frames(6,6),flip:true};
      return {fps:8,frames:frames(6,6)};
    }
    if(p.face==='up')return {fps:1,frames:frames(1,1)};
    if(p.face==='left')return {fps:1,frames:frames(2,1),flip:true};
    if(p.face==='right')return {fps:1,frames:frames(2,1)};
    return {fps:1,frames:frames(0,1)};
  }

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
    updateActionHint();sendWorldPosition(false);
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
      f.t+=dt;var diff=Number(f.difficulty||1),behavior=f.behavior||'drifter';
      var wiggle=(behavior==='dart'?8.8:(behavior==='trickster'?6.9:(behavior==='heavy'?3.2:5.2)));
      var amp=(behavior==='heavy'?.16:(behavior==='dart'?.30:.24));
      f.fishPos=0.5+Math.sin(f.t*(2.0+diff*.42))*amp+Math.sin(f.t*wiggle)*0.055;
      if(behavior==='trickster')f.fishPos+=Math.sin(f.t*9.5)*0.035;
      f.fishPos=Math.max(.08,Math.min(.92,f.fishPos));
      var pull=(behavior==='heavy'?.08:0)+(behavior==='aggressive'?.14:0);
      if(engine.mouseDown||engine.keys.Space||engine.keys.KeyE)f.tension+=dt*(0.34+diff*.035);else f.tension-=dt*(0.21+diff*.02+pull);f.tension=Math.max(0,Math.min(1,f.tension));
      var window=Math.max(.105,.23-diff*.026);var good=Math.abs(f.tension-f.fishPos)<window;if(good)f.goodTime=(f.goodTime||0)+dt;else f.badTime=(f.badTime||0)+dt;
      f.progress+=dt*(good?(0.29+Math.max(0,1.9-diff)*.045):-(0.075+diff*.034));f.progress=Math.max(0,Math.min(1,f.progress));
      showFishing(good?'Good tension — keep it in the bright zone!':'Hold/release to chase the fish marker.','Catch progress '+Math.round(f.progress*100)+'% · '+rarityLabel((f.target||{}).rarity));updateFishHud();
      if(f.progress>=1){catchFish();}
      if(f.tension<=0||f.tension>=1){toast('The line failed. Try again.');endFishing();}
      sendWorldPosition(false);
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
    renderRemotePlayers(dt);
    updateOcclusionFade();
    updateAdaptiveUiFade();
    var bob=document.getElementById('swBobber'),line=document.getElementById('swLine'),aim=document.getElementById('swCastAim');
    if(engine.fish&&(engine.fish.phase==='ready'||engine.fish.phase==='aim')){var prev=engine.fish.preview||{x:FISH_TARGET.x,y:FISH_TARGET.y};var valid=pointInCastArea(prev.x,prev.y);aim.classList.remove('hidden');aim.style.left=prev.x+'px';aim.style.top=prev.y+'px';aim.classList.toggle('valid',valid);aim.classList.toggle('invalid',!valid);}else{aim.classList.add('hidden');aim.classList.remove('invalid');}
    if(engine.fish&&(engine.fish.phase==='wait'||engine.fish.phase==='bite'||engine.fish.phase==='reel'||engine.fish.phase==='badcast')){bob.classList.remove('hidden');line.classList.remove('hidden');var bx=engine.fish.bobberX||FISH_TARGET.x,by=engine.fish.bobberY||FISH_TARGET.y;bob.style.left=bx+'px';bob.style.top=by+'px';bob.classList.toggle('bad',engine.fish.phase==='badcast');var dx=bx-s.x,dy=by-(s.y-52);line.style.left=s.x+'px';line.style.top=(s.y-52)+'px';line.style.width=Math.hypot(dx,dy)+'px';line.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';}else{bob.classList.add('hidden');line.classList.add('hidden');bob.classList.remove('bad');}
    if(engine.fish){var fill=document.getElementById('swCastFill'),sweet=document.getElementById('swSweet');if(engine.fish.phase==='aim'){fill.style.width=Math.round(engine.fish.power*100)+'%';sweet.style.left=Math.round((engine.fish.sweetPower||0.65)*100)+'%';}else if(engine.fish.phase==='ready'){fill.style.width='0%';sweet.style.left=Math.round((engine.fish.sweetPower||0.65)*100)+'%';}else if(engine.fish.phase==='reel'){fill.style.width=Math.round(engine.fish.tension*100)+'%';sweet.style.left=Math.round(engine.fish.fishPos*100)+'%';}else{fill.style.width='0%';}var cf=document.getElementById('swCatchFill');if(cf)cf.style.width=Math.round((engine.fish.progress||0)*100)+'%';}
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
  function startFishing(h){if(engine.mode!=='explore')return;if(h)applyFishingHotspot(h);engine.mode='fish';var target=chooseFishTarget(h);engine.fish={phase:'walk',target:target,difficulty:target.difficulty||1,behavior:target.behavior||'drifter',power:0,t:0,biteAt:1.0+Math.random()*1.25,tension:0.5,fishPos:0.5,progress:0,goodTime:0,badTime:0,aim:null,preview:null,bobberX:FISH_TARGET.x,bobberY:FISH_TARGET.y};toast('Moving to the casting spot...');showFishing('Moving to the casting spot...','Esc cancels fishing');updateFishHud();engine.ui.classList.remove('hidden');}
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
  function worldToScreenPoint(x,y){
    return {x:(x*engine.scale)+engine.offX,y:(y*engine.scale)+engine.offY};
  }
  function rectsOverlap(a,b){
    return !(a.right<b.left||a.left>b.right||a.bottom<b.top||a.top>b.bottom);
  }
  function updateAdaptiveUiFade(){
    if(!engine.state||!engine.root||engine.transitioning)return;
    var pt=worldToScreenPoint(engine.state.x,engine.state.y-50);
    var playerBox={left:pt.x-50,right:pt.x+50,top:pt.y-90,bottom:pt.y+70};
    var nearBox={left:pt.x-110,right:pt.x+110,top:pt.y-140,bottom:pt.y+100};
    var panels=engine.root.querySelectorAll('.swSmartHud');
    panels.forEach(function(el){
      if(!el||el.classList.contains('hidden')||el.classList.contains('swPinnedOpen')){el.classList.remove('swUiNear','swUiBehind');return;}
      var r=el.getBoundingClientRect();
      var box={left:r.left,right:r.right,top:r.top,bottom:r.bottom};
      var behind=rectsOverlap(playerBox,box);
      var near=!behind&&rectsOverlap(nearBox,box);
      el.classList.toggle('swUiBehind',behind);
      el.classList.toggle('swUiNear',near);
    });
  }
  function collapseQuestPanel(hidden){
    var q=document.getElementById('swQuest');if(!q)return;
    if(hidden){q.classList.add('swQuestHidden');q.classList.remove('swQuestCollapsed');}
    else{q.classList.toggle('swQuestCollapsed');q.classList.remove('swQuestHidden');}
    try{localStorage.setItem('gfQuestPanelState',q.classList.contains('swQuestHidden')?'hidden':(q.classList.contains('swQuestCollapsed')?'collapsed':'open'));}catch(_e){}
  }
  function toggleQuestPanel(){
    var q=document.getElementById('swQuest');if(!q)return;
    if(q.classList.contains('swQuestHidden')){q.classList.remove('swQuestHidden');q.classList.add('swQuestCollapsed');}
    else collapseQuestPanel(false);
    try{localStorage.setItem('gfQuestPanelState',q.classList.contains('swQuestHidden')?'hidden':(q.classList.contains('swQuestCollapsed')?'collapsed':'open'));}catch(_e){}
  }
  function restoreQuestPanelState(){
    var q=document.getElementById('swQuest');if(!q)return;
    var st='';try{st=localStorage.getItem('gfQuestPanelState')||'';}catch(_e){}
    q.classList.toggle('swQuestCollapsed',st==='collapsed');
    q.classList.toggle('swQuestHidden',st==='hidden');
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
    if(down&&e.code==='KeyL'){toggleLogbook();e.preventDefault();return;}
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
  function beginReel(){var f=engine.fish;if(!f||f.phase!=='bite')return;f.phase='reel';f.t=0;f.tension=0.5;f.progress=0;f.goodTime=0;f.badTime=0;showFishing('Reel! Hold/release to follow the fish.','Keep tension near the marker');}
  function castLine(){var f=engine.fish;if(!f||f.phase!=='aim')return;updateCastAim(0,true);var p=f.preview||{x:FISH_TARGET.x,y:FISH_TARGET.y};f.bobberX=p.x;f.bobberY=p.y;var result=castValidation(p.x,p.y);if(!result.ok){f.phase='badcast';f.t=0;showFishing('Too shallow — that landed on land.','Aim into the blue water and hold closer to the gold marker.');toast(result.reason||'Bad cast: aim for water.');return;}f.phase='wait';f.t=0;f.biteAt=1.2+Math.random()*1.6;showFishing('Good cast! Watch the bobber for a bite.','When it jumps, press Space/click once to hook it.');toast(result.reason==='good'?'Good cast! Wait for the bite.':result.reason);}
  function pointInCastArea(x,y){return castValidation(x,y).ok;}
  function catchFish(){
    var f=engine.fish||{};var target=f.target||chooseFishTarget(engine.activeHotspot);
    var quality=catchQuality(f);var size=rollFishSize(target,quality);var xp=fishXp(target,quality);
    target.quality=quality;target.size=size;target.xp=xp;target.behavior=target.behavior||f.behavior||'drifter';
    if(engine.fish)engine.fish.phase='catch';
    var fresh=!(engine.fishStats.logbook&&engine.fishStats.logbook[target.id]);
    toast((fresh?'NEW FISH! ':'Caught ')+target.name+' · '+quality+' · '+size+' in');
    showFishing((fresh?'New discovery: ':'Caught ')+target.name+'!',quality+' catch · '+size+' in · +'+xp+' XP · saved to Logbook');
    saveFishCatch(target);
    broadcastWorldEvent('catch',{name:target.name,quality:quality,size:size});
    setTimeout(function(){if(engine.mode==='fish'){var next=chooseFishTarget(engine.activeHotspot);engine.fish={phase:'ready',target:next,difficulty:next.difficulty||1,behavior:next.behavior||'drifter',power:0,t:0,biteAt:1.0+Math.random()*1.25,tension:0.5,fishPos:0.5,progress:0,goodTime:0,badTime:0,aim:null,preview:null,bobberX:FISH_TARGET.x,bobberY:FISH_TARGET.y};showFishing('Ready for another cast.','Hold Space/click, aim into the water, then release. Press L for Logbook.');updateFishHud();}},1250);
  }
  function endFishing(){engine.mode='explore';engine.fish=null;engine.ui.classList.add('hidden');document.getElementById('swBobber').classList.add('hidden');document.getElementById('swLine').classList.add('hidden');var a=document.getElementById('swCastAim');if(a)a.classList.add('hidden');}
  function showFishing(text,hint){document.getElementById('swFishText').textContent=text;document.getElementById('swFishHint').textContent=hint;updateFishHud();}
  function getPlayerName(){try{if(window.GAME_CONTEXT&&window.GAME_CONTEXT.username)return window.GAME_CONTEXT.username;if(window.GAME_PLAYERS&&window.GAME_PLAYERS.length){var s=window.GAME_MY_SEAT;for(var i=0;i<window.GAME_PLAYERS.length;i++){if(window.GAME_PLAYERS[i].seat===s)return window.GAME_PLAYERS[i].name||'guest';}return window.GAME_PLAYERS[0].name||'guest';}return localStorage.getItem('gf_user')||'guest';}catch(e){return 'guest';}}
  function defaultFishTable(){return [
    {id:'fish_drift_minnow',name:'Drift Minnow',rarity:'common',difficulty:1,behavior:'drifter',weight:44,min:3.5,max:8.5,lore:'A tiny silver fish that gathers near old docks.'},
    {id:'fish_bubble_guppy',name:'Bubble Guppy',rarity:'common',difficulty:1,behavior:'dart',weight:34,min:2.5,max:6.5,lore:'It blows pearl-like bubbles when startled.'},
    {id:'fish_moon_anchovy',name:'Moon Anchovy',rarity:'common',difficulty:1.1,behavior:'drifter',weight:24,min:4,max:9,lore:'Its scales catch moonlight like wet glass.'},
    {id:'fish_glowfin',name:'Glowfin',rarity:'uncommon',difficulty:1.45,behavior:'trickster',weight:14,min:7,max:14,lore:'A soft blue glow pulses from its fins.'},
    {id:'fish_shellback',name:'Shellback',rarity:'uncommon',difficulty:1.55,behavior:'heavy',weight:11,min:8,max:16,lore:'A stubborn pond fish with an armor-hard back.'},
    {id:'fish_lantern_koi',name:'Lantern Koi',rarity:'rare',difficulty:1.9,behavior:'trickster',weight:6,min:12,max:24,lore:'It appears like a floating lantern beneath dark water.'},
    {id:'fish_cave_eel',name:'Cave Eel',rarity:'rare',difficulty:2.05,behavior:'aggressive',weight:4,min:16,max:32,lore:'A sharp-turning eel that hates being reeled in.'},
    {id:'fish_moon_jelly',name:'Moon Jelly',rarity:'epic',difficulty:2.25,behavior:'drifter',weight:2,min:10,max:22,lore:'Barely a fish, but treasured by collectors.'},
    {id:'fish_ancient_coelafish',name:'Ancient Coelafish',rarity:'legendary',difficulty:2.65,behavior:'heavy',weight:1,min:26,max:48,lore:'A living fossil said to remember the first rain.'}
  ];}
  function chooseFishTarget(h){var table=(h&&Array.isArray(h.fishTable)&&h.fishTable.length)?h.fishTable:defaultFishTable();
    var total=table.reduce(function(sum,x){return sum+Number(x.weight||1);},0),roll=Math.random()*total,acc=0;for(var i=0;i<table.length;i++){acc+=Number(table[i].weight||1);if(roll<=acc){return normalizeFishTarget(table[i]);}}return normalizeFishTarget(table[0]);}
  function normalizeFishTarget(x){x=x||{};return {id:x.id||x.itemId||'fish_drift_minnow',name:x.name||x.label||'Drift Minnow',rarity:x.rarity||'common',difficulty:Number(x.difficulty||1),behavior:x.behavior||'drifter',min:Number(x.min||x.minSize||4),max:Number(x.max||x.maxSize||12),lore:x.lore||x.description||''};}
  function rarityLabel(r){r=String(r||'common').toLowerCase();return r.charAt(0).toUpperCase()+r.slice(1);}
  function fishXp(target,quality){var base={common:4,uncommon:9,rare:18,epic:35,legendary:90}[String(target.rarity||'common').toLowerCase()]||5;var mult={Poor:.7,Good:1,Great:1.25,Perfect:1.65}[quality]||1;return Math.max(1,Math.round(base*mult));}
  function catchQuality(f){var total=Math.max(.1,Number(f.goodTime||0)+Number(f.badTime||0));var ratio=Number(f.goodTime||0)/total;if(ratio>.88)return 'Perfect';if(ratio>.68)return 'Great';if(ratio>.42)return 'Good';return 'Poor';}
  function rollFishSize(target,quality){var min=Number(target.min||4),max=Number(target.max||12);var q={Poor:.76,Good:.9,Great:1,Perfect:1.12}[quality]||1;var raw=(min+Math.random()*(max-min))*q;return Math.round(Math.min(max*1.18,raw)*10)/10;}
  function levelFromXp(xp){xp=Number(xp||0);return Math.max(1,Math.floor(Math.sqrt(xp/55))+1);}
  function nextXpForLevel(lv){lv=Math.max(1,Number(lv||1));return Math.round(lv*lv*55);}
  function updateFishHud(){var c=document.getElementById('swFishCount');if(c)c.textContent=(engine.fishStats.total||0)+' fish';var cf=document.getElementById('swCatchFill');if(cf)cf.style.width=Math.round(((engine.fish&&engine.fish.progress)||0)*100)+'%';var lv=document.getElementById('swFishLevel');if(lv)lv.textContent=engine.fishStats.level||1;var xp=document.getElementById('swFishXp');if(xp)xp.textContent=(engine.fishStats.xp||0)+'/'+(engine.fishStats.nextXp||100);renderLogbook();}
  async function loadFishingStats(){try{var res=await fetch('/api/pet/profile?user='+encodeURIComponent(engine.username),{cache:'no-store'});var data=await res.json();applyFishingProfile(data.profile||{});}catch(e){}}
  function applyFishingProfile(profile){var inv=(profile&&profile.inventory)||{};var fishing=(profile&&profile.fishing)||{};var total=Object.keys(inv).filter(function(id){return id.indexOf('fish_')===0;}).reduce(function(sum,id){return sum+Number(inv[id]||0);},0);engine.fishStats.total=Number(fishing.totalCaught||total||0);engine.fishStats.xp=Number(fishing.xp||0);engine.fishStats.level=Number(fishing.level||levelFromXp(engine.fishStats.xp));engine.fishStats.nextXp=nextXpForLevel(engine.fishStats.level);engine.fishStats.logbook=fishing.logbook||{};engine.fishStats.catalog=(fishing.catalog&&fishing.catalog.length?fishing.catalog:defaultFishTable()).map(normalizeFishTarget);updateFishHud();}
  async function saveFishCatch(target){engine.fishStats.total=Number(engine.fishStats.total||0)+1;engine.fishStats.last=target.name;engine.fishStats.xp=Number(engine.fishStats.xp||0)+Number(target.xp||0);engine.fishStats.level=levelFromXp(engine.fishStats.xp);engine.fishStats.nextXp=nextXpForLevel(engine.fishStats.level);engine.fishStats.logbook=engine.fishStats.logbook||{};var rec=engine.fishStats.logbook[target.id]||{count:0};rec.count=Number(rec.count||0)+1;rec.name=target.name;rec.rarity=target.rarity;rec.largest=Math.max(Number(rec.largest||0),Number(target.size||0));rec.lastQuality=target.quality;rec.lore=target.lore||rec.lore||'';engine.fishStats.logbook[target.id]=rec;updateFishHud();try{var res=await fetch('/api/pet/fish/catch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:engine.username,itemId:target.id,name:target.name,rarity:target.rarity,sceneId:engine.sceneId,size:target.size,quality:target.quality,xp:target.xp,behavior:target.behavior,lore:target.lore})});var data=await res.json();if(data&&data.profile)applyFishingProfile(data.profile);}catch(e){toast('Caught '+target.name+', but inventory sync failed.');}}
  function toggleLogbook(force){var p=document.getElementById('swLogbookPanel');if(!p)return;var show=(force===undefined)?p.classList.contains('hidden'):!!force;p.classList.toggle('hidden',!show);if(show)renderLogbook();}
  function renderLogbook(){var grid=document.getElementById('swLogbookGrid'),sum=document.getElementById('swLogbookSummary');if(!grid||!sum)return;var catalog=(engine.fishStats.catalog&&engine.fishStats.catalog.length?engine.fishStats.catalog:defaultFishTable()).map(normalizeFishTarget);var log=engine.fishStats.logbook||{};var found=catalog.filter(function(f){return !!log[f.id];}).length;sum.textContent='Level '+(engine.fishStats.level||1)+' · '+(engine.fishStats.xp||0)+' XP · '+found+'/'+catalog.length+' species discovered · '+(engine.fishStats.total||0)+' total catches';grid.innerHTML=catalog.map(function(f){var r=log[f.id];var seen=!!r;return '<div class="swLogCard '+(seen?'seen':'unknown')+' rarity-'+String(f.rarity||'common').toLowerCase()+'"><div class="swFishIcon">'+(seen?'🐟':'?')+'</div><div><b>'+(seen?f.name:'Unknown Fish')+'</b><span>'+rarityLabel(f.rarity)+'</span><small>'+(seen?((r.count||0)+' caught · largest '+(r.largest||0)+' in · best '+(r.lastQuality||'—')):'Silhouette locked. Keep fishing this region.')+'</small><em>'+(seen?(r.lore||f.lore||'No notes yet.'):'???')+'</em></div></div>';}).join('');}
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
      d.style.setProperty('--flicker',Number(e.flickerIntensity==null?0.28:e.flickerIntensity));
      if(Array.isArray(e.points)&&e.points.length>=3){
        d.style.clipPath='polygon('+e.points.map(function(p){return ((p[0]-box.x)/box.w*100).toFixed(2)+'% '+((p[1]-box.y)/box.h*100).toFixed(2)+'%';}).join(',')+')';
      }
      if(cls==='fireplaceFlame'||cls==='torchFlame'||cls==='candleFlame'){
        var sprite=e.sprite||'/assets/effects/fireplace_flame_sheet.png';
        var frames=Math.max(1,Number(e.frames||4));
        var fps=Math.max(1,Number(e.fps||5));
        var inner=document.createElement('div');
        inner.className='swAmbientSprite';
        inner.style.backgroundImage='url('+sprite+')';
        inner.style.backgroundSize=(frames*100)+'% 100%';
        inner.style.animationDuration=(frames/fps)+'s';
        inner.style.animationTimingFunction='steps('+frames+')';
        d.appendChild(inner);
        if(e.glow!==false){
          var glow=document.createElement('b');
          glow.className='swAmbientGlow';
          var gr=Number(e.glowRadius||130);
          glow.style.width=(gr*2)+'px'; glow.style.height=(gr*2)+'px';
          glow.style.left=(box.w/2-gr)+'px'; glow.style.top=(box.h/2-gr)+'px';
          glow.style.opacity=(e.glowOpacity==null?0.72:Number(e.glowOpacity));
          d.appendChild(glow);
        }
      }else{
        var count=(cls==='leaves')?Math.max(8,Math.round(Number(e.density||0.45)*42)):(cls==='fireflies')?Math.max(8,Math.round(Number(e.density||0.45)*32)):(cls==='dustMotes')?Math.max(10,Math.round(Number(e.density||0.45)*38)):(cls==='waterfallMist')?Math.max(18,Math.round(Number(e.density||0.55)*52)):(cls==='waterfallCascade')?Math.max(14,Math.round(Number(e.density||0.65)*28)):(cls==='waterSurfaceShimmer')?Math.max(8,Math.round(Number(e.density||0.45)*24)):(cls==='slowRiverCurrent')?Math.max(6,Math.round(Number(e.density||0.45)*18)):(cls==='waterEdgeFoam')?Math.max(7,Math.round(Number(e.density||0.45)*20)):(cls==='pondRipple'||cls==='splashRing')?Math.max(2,Math.round(Number(e.density||0.45)*8)):0;
        for(var i=0;i<count;i++){var part=document.createElement('i');part.style.left=(Math.random()*100)+'%';part.style.top=(Math.random()*100)+'%';part.style.animationDelay=(-Math.random()*8)+'s';part.style.animationDuration=(5+Math.random()*7)/Math.max(.15,Number(e.speed||1))+'s';d.appendChild(part);}
      }
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
    if(type.indexOf('window')>=0||type.indexOf('sun')>=0||type.indexOf('ray')>=0||type.indexOf('beam')>=0)return 'windowLight';
    if(type.indexOf('fireplaceflame')>=0||type==='fireplace'||type.indexOf('campfire')>=0)return 'fireplaceFlame';
    if(type.indexOf('torchflame')>=0||type==='torch')return 'torchFlame';
    if(type.indexOf('candleflame')>=0||type==='candle')return 'candleFlame';
    if(type.indexOf('fireplace')>=0||type.indexOf('lantern')>=0||type.indexOf('glow')>=0)return 'warmGlow';
    if(type.indexOf('dust')>=0||type.indexOf('mote')>=0)return 'dustMotes';
    if(type.indexOf('firefly')>=0)return 'fireflies';
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
    return [].concat(cfg.sceneObjects||[],cfg.objects||[],cfg.animatedOverlays||[],cfg.interactables||[],cfg.hotspots||[],cfg.terrainAreas||[],cfg.triggerZones||[],cfg.textBoxes||[],cfg.lights||[],cfg.cameraZones||[]);
  }
  function renderSceneExtras(){
    renderToneLayer();renderObjectLayer();renderLightLayer();renderAnimatedOverlays();renderInteractionIcons();
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

  function renderAnimatedOverlays(){
    var layer=document.getElementById('swObjectLayer');if(!layer)return;
    sceneObjects().forEach(function(o){
      var type=o.type||o.kind||'';
      if(type!=='animatedOverlay'&&type!=='spriteOverlay'&&type!=='effectSprite')return;
      if(!o.sprite)return;
      var d=document.createElement('div');
      d.className='swAnimatedOverlay '+(o.id||'');
      d.dataset.id=o.id||'';
      d.style.left=Number(o.x||0)+'px';d.style.top=Number(o.y||0)+'px';
      d.style.width=Number(o.w||o.width||64)+'px';d.style.height=Number(o.h||o.height||64)+'px';
      d.style.opacity=(o.opacity==null?1:Number(o.opacity));
      d.style.zIndex=String(Math.round(Number(o.z||o.y||0))+(o.layer==='foreground'?600:o.layer==='overlay'?900:120));
      if(o.blend)d.style.mixBlendMode=o.blend;
      var frames=Math.max(1,Number(o.frames||4));
      var fps=Math.max(1,Number(o.fps||8));
      var inner=document.createElement('div');
      inner.className='swAnimSprite';
      inner.style.backgroundImage='url('+o.sprite+')';
      inner.style.backgroundSize=(frames*100)+'% 100%';
      inner.style.animationDuration=(frames/fps)+'s';
      inner.style.animationTimingFunction='steps('+frames+')';
      d.appendChild(inner);
      layer.appendChild(d);
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
.swRoot{position:fixed;inset:0;z-index:100000;background:#02060b;color:#f7e7bf;font-family:Georgia,'Times New Roman',serif}.swRoot.hidden{display:none}.swViewport{position:absolute;inset:0;overflow:hidden;background:#02060b}.swWorld{position:absolute;left:0;top:0;width:${MAP_W}px;height:${MAP_H}px;transform-origin:0 0}.swBg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;user-select:none;pointer-events:none}.swWaterGlow{position:absolute;left:640px;top:340px;width:760px;height:520px;border-radius:45%;background:radial-gradient(circle,rgba(36,170,255,.20),transparent 65%);mix-blend-mode:screen;animation:swWater 3.4s ease-in-out infinite;pointer-events:none}.swMist{position:absolute;left:840px;top:100px;width:420px;height:210px;background:radial-gradient(ellipse,rgba(95,180,255,.22),transparent 65%);filter:blur(12px);animation:swMist 5s ease-in-out infinite}.swCanopy{position:absolute;inset:0;background:radial-gradient(ellipse at 8% 93%,rgba(0,0,0,.72),transparent 20%),radial-gradient(ellipse at 92% 95%,rgba(0,0,0,.58),transparent 24%),radial-gradient(ellipse at 40% 4%,rgba(0,0,0,.55),transparent 20%);pointer-events:none;mix-blend-mode:multiply}.swRemoteLayer{position:absolute;inset:0;z-index:420;pointer-events:none}.swRemotePlayer{position:absolute;width:128px;height:128px;margin-left:-64px;margin-top:-104px;transform:scale(var(--player-scale,.70));transform-origin:50% 88%;opacity:.92;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35))}.swRemoteSprite{position:absolute;left:0;top:0;width:128px;height:128px;background-repeat:no-repeat;background-size:768px 2048px}.swRemoteShadow{position:absolute;left:49px;top:101px;width:30px;height:7px;border-radius:50%;background:rgba(0,0,0,.14);filter:blur(1.5px)}.swRemoteName{position:absolute;left:50%;top:8px;transform:translateX(-50%);padding:3px 8px;border-radius:999px;background:rgba(2,6,12,.62);border:1px solid rgba(125,211,252,.55);color:#e0f7ff;font:800 12px Arial,sans-serif;white-space:nowrap;text-shadow:0 1px 3px #000;z-index:2}.swMultiplayerStatus{position:absolute;left:24px;top:96px;padding:7px 12px;border-radius:999px;background:rgba(5,12,20,.62);border:1px solid rgba(125,211,252,.45);color:#d8f5ff;font:800 13px Arial,sans-serif;box-shadow:0 10px 24px rgba(0,0,0,.35)}.swPlayer{position:absolute;width:128px;height:128px;margin-left:-64px;margin-top:-104px;transition:filter .12s linear;transform:scale(var(--player-scale,.70));transform-origin:50% 88%;will-change:left,top}.swSprite{width:128px;height:128px;background-repeat:no-repeat;background-size:768px 2048px;image-rendering:auto;overflow:hidden;background-color:transparent;backface-visibility:hidden;will-change:background-position}.swShadow{position:absolute;width:30px;height:7px;margin-left:-15px;margin-top:-3px;border-radius:50%;background:rgba(0,0,0,.16);filter:blur(1.5px);pointer-events:none;transform-origin:50% 50%}.swHotspot{position:absolute;border-radius:50%;pointer-events:none}.swHotspot.dock{left:630px;top:575px;width:145px;height:110px;background:radial-gradient(ellipse,rgba(61,184,255,.24),rgba(61,184,255,.05) 45%,transparent 70%);animation:swPulse 2s ease-in-out infinite}.swHotspot.path{left:135px;top:215px;width:100px;height:120px;background:radial-gradient(ellipse,rgba(255,207,102,.15),transparent 65%)}.swBobber{position:absolute;width:20px;height:20px;margin-left:-10px;margin-top:-10px;border-radius:50%;background:#f04d66;box-shadow:0 0 14px #9df,0 0 0 10px rgba(63,190,255,.15);z-index:800}.swBobber.hidden,.swLine.hidden{display:none}.swBobber:after{content:'';position:absolute;left:-26px;top:-26px;width:72px;height:72px;border:2px solid rgba(140,220,255,.58);border-radius:50%;animation:swRipple 1.4s linear infinite}.swBobber.bite{animation:swBite .22s linear 5}.swLine{position:absolute;height:2px;background:linear-gradient(90deg,rgba(255,241,199,.92),rgba(160,220,255,.45));transform-origin:0 50%;z-index:790;pointer-events:none}.swCastAim{position:absolute;width:54px;height:54px;margin-left:-27px;margin-top:-27px;border-radius:50%;border:3px solid rgba(255,100,100,.85);background:radial-gradient(circle,rgba(255,100,100,.20),transparent 65%);z-index:760;pointer-events:none;box-shadow:0 0 14px rgba(255,70,70,.7)}.swCastAim.valid{border-color:rgba(134,239,172,.95);background:radial-gradient(circle,rgba(134,239,172,.22),transparent 65%);box-shadow:0 0 18px rgba(134,239,172,.7)}.swCastAim.invalid{border-color:rgba(255,115,115,.95);background:radial-gradient(circle,rgba(255,80,80,.20),transparent 65%);box-shadow:0 0 18px rgba(255,80,80,.55)}.swCastAim.hidden{display:none}.swBobber.bad{background:#555;box-shadow:0 0 10px rgba(255,80,80,.65)}.swAmbientLayer{position:absolute;inset:0;pointer-events:none;z-index:120}.swAmbientEffect{position:absolute;pointer-events:none;overflow:hidden}.swAmbientEffect.ripple:before{content:'';position:absolute;inset:12%;border-radius:50%;border:3px solid rgba(135,218,255,.42);box-shadow:0 0 18px rgba(135,218,255,.22);animation:swAmbientRipple 2.2s linear infinite}.swAmbientEffect.ripple:after{content:'';position:absolute;inset:28%;border-radius:50%;border:2px solid rgba(224,246,255,.35);animation:swAmbientRipple 2.2s linear infinite .7s}.swAmbientEffect.shimmer{background:linear-gradient(110deg,transparent,rgba(150,230,255,.18),transparent);mix-blend-mode:screen;animation:swShimmer 2.8s ease-in-out infinite}.swAmbientEffect.waterfall{background:repeating-linear-gradient(90deg,rgba(180,240,255,.0) 0 8px,rgba(180,240,255,.20) 9px 13px,rgba(255,255,255,.12) 14px 18px);filter:blur(.5px);mix-blend-mode:screen;animation:swFalls .7s linear infinite}.swAmbientEffect.foam{background:radial-gradient(ellipse,rgba(230,250,255,.48),transparent 62%);filter:blur(3px);mix-blend-mode:screen;animation:swFoam 1.8s ease-in-out infinite}.swAmbientEffect.mist{background:radial-gradient(ellipse,rgba(200,235,255,.30),transparent 70%);filter:blur(8px);animation:swMist 4s ease-in-out infinite}.swAmbientEffect.leaves i{position:absolute;width:9px;height:5px;border-radius:70% 20%;background:rgba(205,143,55,.78);box-shadow:0 0 4px rgba(0,0,0,.25);animation:swLeafDrift 7s linear infinite}.swAmbientEffect.fireflies i{position:absolute;width:5px;height:5px;border-radius:50%;background:#fbff9d;box-shadow:0 0 12px #eaff77;animation:swFly 6s ease-in-out infinite}.swFireflies i{position:absolute;width:6px;height:6px;border-radius:50%;background:#fbff9d;box-shadow:0 0 14px #eaff77,0 0 24px rgba(114,213,255,.35);animation:swFly 7s ease-in-out infinite;pointer-events:none}.swMotes i{position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(114,196,255,.65);box-shadow:0 0 8px rgba(114,196,255,.7);animation:swMote 12s linear infinite;pointer-events:none}.swHud{position:absolute;inset:0;pointer-events:none}.swHud button{pointer-events:auto}.swSmartHud{transition:opacity .18s ease,filter .18s ease,background-color .18s ease}.swSmartHud.swUiNear{opacity:.58;filter:saturate(.9)}.swSmartHud.swUiBehind{opacity:.18;filter:saturate(.75) blur(.15px)}.swSmartHud.swUiBehind *{pointer-events:none}.swSmartHud.swUiBehind button{pointer-events:auto}.swStatus{position:absolute;left:24px;top:20px;display:flex;gap:12px;align-items:center;padding:8px 14px;border:1px solid rgba(218,169,83,.65);border-radius:18px;background:linear-gradient(180deg,rgba(8,12,18,.72),rgba(8,12,18,.34));box-shadow:0 12px 30px rgba(0,0,0,.45)}.portrait{width:58px;height:58px;border-radius:50%;background:radial-gradient(circle,#704323,#1b1110);border:2px solid #d7a857}.bar{width:150px;height:14px;border-radius:999px;background:#160d0b;border:1px solid #d7a857;margin:5px 0;overflow:hidden}.bar span{display:block;height:100%;width:100%}.bar.hp span{background:linear-gradient(90deg,#a82931,#e66b5e)}.bar.sp span{width:72%;background:linear-gradient(90deg,#2465b8,#66c5f0)}.swTitle{position:absolute;left:50%;top:24px;transform:translateX(-50%);font-size:30px;font-weight:800;text-shadow:0 3px 10px #000}.swTitle span{color:#d8b56b;margin:0 8px}.swClose{position:absolute;right:22px;top:20px;background:rgba(0,0,0,.45);color:#f5d99a;border:1px solid #d7a857;border-radius:999px;padding:8px 14px;font-weight:bold}.swQuest{position:absolute;right:32px;top:178px;width:300px;padding:0;border:1px solid rgba(218,169,83,.8);border-radius:10px;background:rgba(7,8,12,.72);box-shadow:0 14px 40px rgba(0,0,0,.55);overflow:hidden;transition:opacity .18s ease,filter .18s ease,transform .18s ease,max-height .18s ease}.swQuestHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;cursor:pointer}.swQuest b{color:#ffe28a}.swQuest p{margin:0;padding:0 18px 16px;color:#f6e5c3;line-height:1.35}.swQuestActions{display:flex;gap:6px}.swQuestActions button{width:24px;height:24px;border-radius:8px;border:1px solid rgba(218,169,83,.55);background:rgba(0,0,0,.28);color:#ffe8ad;font:900 14px Arial;line-height:1;cursor:pointer}.swQuestCollapsed p{display:none}.swQuestCollapsed #swQuestToggle{transform:rotate(-90deg)}.swQuestHidden{opacity:.18;max-height:36px;width:58px}.swQuestHidden .swQuestHead b,.swQuestHidden p,.swQuestHidden #swQuestClose{display:none}.swQuestHidden .swQuestHead{padding:8px;justify-content:center}.swQuestHidden #swQuestToggle{transform:rotate(90deg)}.swToast{position:absolute;left:50%;bottom:118px;transform:translateX(-50%);padding:10px 16px;border-radius:999px;background:rgba(3,6,10,.65);border:1px solid rgba(218,169,83,.55);opacity:.0;transition:.25s;box-shadow:0 12px 30px rgba(0,0,0,.45)}.swToast.show{opacity:1}.swActionHint{position:absolute;left:50%;bottom:172px;transform:translateX(-50%);padding:9px 14px;border-radius:999px;background:rgba(28,46,32,.82);border:1px solid rgba(134,239,172,.55);color:#eaffcf;font:800 14px Arial,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.45);letter-spacing:.02em}.swActionHint.hidden{display:none}.swHotbar{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);display:flex;gap:6px;padding:8px;border:1px solid rgba(218,169,83,.7);border-radius:14px;background:rgba(6,7,10,.68)}.swHotbar button{width:58px;height:58px;background:rgba(24,20,16,.85);color:#ffe9bd;border:1px solid rgba(218,169,83,.75);border-radius:8px;font-weight:bold}.swHotbar span{font-size:24px}.swFishing{position:absolute;right:32px;bottom:100px;width:360px;padding:18px 20px;border:1px solid rgba(218,169,83,.9);border-radius:14px;background:rgba(7,8,12,.76);box-shadow:0 16px 45px rgba(0,0,0,.62)}.swFishing.hidden{display:none}.swFishing h3{text-align:center;margin:0 0 10px;font-size:25px}.swFishing p{margin:0 0 12px;text-align:center}.swFishing small{display:block;text-align:center;margin-top:8px;color:#ffefbf}.swCastBar{position:relative;height:20px;border-radius:999px;background:linear-gradient(90deg,#65b846,#f6d452,#bd3d2e);border:2px solid #d7a857;overflow:hidden}.swCastBar i{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(255,255,255,.25)}.swCastBar em{position:absolute;top:-5px;width:5px;height:30px;background:#fff;border-radius:3px;box-shadow:0 0 9px #fff}.swNearDock .swHotspot.dock{box-shadow:0 0 22px rgba(111,213,255,.75)}.swDebugLayer{position:absolute;inset:0;display:none;pointer-events:none;z-index:2000}.showDebug .swDebugLayer{display:block}.swDebugPoly{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.swDebugPoly polygon{fill:rgba(71,255,124,.16);stroke:rgba(71,255,124,.85);stroke-width:3}.swDebugBlock{position:absolute;border-radius:50%;background:rgba(255,70,70,.18);border:3px solid rgba(255,70,70,.85)}.swDebugHotspot{position:absolute;border-radius:50%;background:rgba(75,180,255,.18);border:3px solid rgba(75,180,255,.9);display:grid;place-items:center;color:white;font:700 18px Arial;text-shadow:0 2px 6px #000}.swSceneTransition{position:absolute;inset:0;z-index:50000;display:grid;place-items:center;background:#02060b;opacity:0;pointer-events:none;transition:opacity .24s ease}.swSceneTransition.show{opacity:1;pointer-events:auto}.swSceneTransition:before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(42,77,91,.18),rgba(0,0,0,.74) 62%,#000 100%);transform:scale(1.08);animation:swTransitionDrift 1.2s ease-in-out infinite alternate}.swSceneTransitionText{position:relative;font:800 24px Georgia,'Times New Roman',serif;color:#ffe4a3;text-shadow:0 3px 14px #000;letter-spacing:.04em;opacity:.9}
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

/* Final-style editable water FX. These render only from scene ambientEffects data. */
.swAmbientEffect.waterSurfaceShimmer{background:radial-gradient(ellipse at 18% 32%,rgba(210,250,255,.24),transparent 22%),radial-gradient(ellipse at 46% 62%,rgba(90,210,255,.17),transparent 25%),radial-gradient(ellipse at 74% 38%,rgba(245,255,255,.20),transparent 21%),radial-gradient(ellipse at 35% 86%,rgba(80,185,255,.13),transparent 26%);mix-blend-mode:screen;filter:blur(.65px);animation:swWaterSurfaceShimmer calc(2.8s / var(--speed)) ease-in-out infinite;opacity:.64}.swAmbientEffect.waterSurfaceShimmer:before{content:'';position:absolute;inset:-18%;background-image:linear-gradient(115deg,transparent 0 39%,rgba(225,250,255,.14) 45%,rgba(120,220,255,.09) 51%,transparent 59%),repeating-linear-gradient(22deg,transparent 0 34px,rgba(174,236,255,.07) 38px 40px,transparent 46px 84px);background-size:360px 180px,170px 120px;animation:swWaterSheen calc(5s / var(--speed)) linear infinite;opacity:.72}.swAmbientEffect.waterSurfaceShimmer i{position:absolute;width:18px;height:4px;border-radius:999px;background:rgba(235,252,255,.26);box-shadow:0 0 10px rgba(120,220,255,.28);filter:blur(.7px);animation:swWaterSpark calc(4.6s / var(--speed)) ease-in-out infinite}
.swAmbientEffect.slowRiverCurrent{background:radial-gradient(ellipse at 15% 45%,rgba(150,230,255,.16),transparent 35%),radial-gradient(ellipse at 70% 55%,rgba(230,255,255,.13),transparent 33%);mix-blend-mode:screen;filter:blur(.9px);animation:swRiverCurrent calc(3.4s / var(--speed)) ease-in-out infinite;opacity:.52}.swAmbientEffect.slowRiverCurrent:before,.swAmbientEffect.slowRiverCurrent:after{content:'';position:absolute;inset:-12%;background:linear-gradient(var(--angle),transparent 0 34%,rgba(220,250,255,.15) 47%,rgba(115,210,255,.08) 54%,transparent 66%);animation:swRiverSoftBand calc(3.8s / var(--speed)) linear infinite}.swAmbientEffect.slowRiverCurrent:after{animation-delay:calc(-1.9s / var(--speed));opacity:.55}.swAmbientEffect.slowRiverCurrent i{position:absolute;width:42px;height:3px;border-radius:999px;background:rgba(210,246,255,.16);filter:blur(1px);animation:swCurrentFleck calc(4.2s / var(--speed)) linear infinite}
.swAmbientEffect.waterEdgeFoam{background:radial-gradient(ellipse at 22% 70%,rgba(245,255,255,.55),transparent 39%),radial-gradient(ellipse at 65% 42%,rgba(210,245,255,.38),transparent 42%),radial-gradient(ellipse at 50% 50%,rgba(255,255,255,.24),transparent 57%);mix-blend-mode:screen;filter:blur(1.6px);animation:swEdgeFoam calc(1.5s / var(--speed)) ease-in-out infinite;opacity:.74}.swAmbientEffect.waterEdgeFoam i{position:absolute;width:22px;height:8px;border-radius:999px;background:rgba(245,255,255,.30);filter:blur(2px);animation:swFoamBubble calc(2.2s / var(--speed)) ease-in-out infinite}
.swAmbientEffect.waterfallCascade{background:linear-gradient(180deg,rgba(255,255,255,.42),rgba(135,222,255,.24) 45%,rgba(255,255,255,.35)),repeating-linear-gradient(90deg,rgba(190,245,255,.00) 0 7px,rgba(185,238,255,.38) 9px 13px,rgba(255,255,255,.35) 15px 18px,rgba(190,245,255,.10) 20px 28px);mix-blend-mode:screen;filter:blur(.35px) drop-shadow(0 0 12px rgba(137,225,255,.18));animation:swWaterfallCascade calc(.28s / var(--speed)) linear infinite;opacity:.94}.swAmbientEffect.waterfallCascade:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.22),transparent 18%,rgba(185,238,255,.24) 36%,transparent 60%,rgba(255,255,255,.18)),repeating-linear-gradient(90deg,transparent 0 20px,rgba(255,255,255,.20) 23px 26px,transparent 30px 48px);animation:swWaterfallCascade2 calc(.56s / var(--speed)) linear infinite;opacity:.75}.swAmbientEffect.waterfallCascade:after{content:'';position:absolute;left:-8%;right:-8%;bottom:-20%;height:40%;background:radial-gradient(ellipse at 50% 50%,rgba(245,255,255,.52),rgba(145,225,255,.24) 44%,transparent 74%);filter:blur(5px);animation:swWaterfallBaseFoam calc(1.15s / var(--speed)) ease-in-out infinite}.swAmbientEffect.waterfallCascade i{position:absolute;top:-26%;width:5px;height:48%;border-radius:999px;background:rgba(245,255,255,.52);filter:blur(1.7px);animation:swFallStreak calc(1.05s / var(--speed)) linear infinite}
.swAmbientEffect.waterfallMist{background:radial-gradient(ellipse at 50% 62%,rgba(238,252,255,.45),rgba(150,225,255,.23) 45%,transparent 76%);mix-blend-mode:screen;filter:blur(7px);animation:swWaterfallMist calc(2.8s / var(--speed)) ease-in-out infinite;opacity:.78}.swAmbientEffect.waterfallMist i{position:absolute;width:20px;height:8px;border-radius:999px;background:rgba(238,252,255,.28);filter:blur(3px);animation:swMistParticle calc(4.2s / var(--speed)) ease-in-out infinite}
.swAmbientEffect.pondRipple:before,.swAmbientEffect.splashRing:before{border-width:3px;border-color:rgba(175,232,255,.62)}.swAmbientEffect.pondRipple i,.swAmbientEffect.splashRing i{position:absolute;inset:25%;border-radius:50%;border:1px solid rgba(225,250,255,.30);animation:swAmbientRipple calc(2.4s / var(--speed)) linear infinite}
@keyframes swWaterSheen{0%{transform:translateX(-65%)}100%{transform:translateX(65%)}}@keyframes swWaterSpark{0%,100%{transform:translateY(0) scale(.8);opacity:.05}45%{opacity:.7}70%{transform:translate(28px,-10px) scale(1);opacity:.18}}@keyframes swCurrentFleck{0%{transform:translateX(-50px) rotate(var(--angle));opacity:0}20%{opacity:.45}100%{transform:translateX(130px) rotate(var(--angle));opacity:0}}@keyframes swFoamBubble{50%{transform:translateY(-8px) scale(1.12);opacity:.65}}@keyframes swFallStreak{0%{transform:translateY(-80%);opacity:.10}20%{opacity:.65}100%{transform:translateY(350%);opacity:.04}}



.swAnimatedOverlay{position:absolute;pointer-events:none;transform:translate(-50%,-50%);overflow:hidden;mix-blend-mode:screen}.swAnimatedOverlay .swAnimSprite{position:absolute;inset:0;background-repeat:no-repeat;animation:swAnimSheet 1s steps(4) infinite}.swAnimatedOverlay.fireplace_flame{filter:drop-shadow(0 0 10px rgba(255,166,54,.8)) drop-shadow(0 0 22px rgba(255,97,34,.35))}.swAnimatedOverlay.warm_dust_motes{mix-blend-mode:screen;filter:blur(.2px)}@keyframes swAnimSheet{from{background-position:0 0}to{background-position:100% 0}}.swAmbientEffect.fireplaceFlame,.swAmbientEffect.torchFlame,.swAmbientEffect.candleFlame{overflow:visible;mix-blend-mode:screen;filter:drop-shadow(0 0 8px rgba(255,166,54,.78)) drop-shadow(0 0 18px rgba(255,84,32,.34));animation:swEditableFlameFlicker 1.45s ease-in-out infinite}.swAmbientEffect .swAmbientSprite{position:absolute;inset:0;background-repeat:no-repeat;background-position:0 0;animation:swAnimSheet 1s steps(4) infinite;z-index:2}.swAmbientEffect .swAmbientGlow{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,198,92,.42),rgba(255,110,42,.16) 42%,rgba(255,83,31,.05) 67%,transparent 76%);filter:blur(10px);mix-blend-mode:screen;z-index:1;animation:swWarmGlowPulse 1.65s ease-in-out infinite;pointer-events:none}@keyframes swEditableFlameFlicker{0%,100%{transform:scale(1);filter:drop-shadow(0 0 8px rgba(255,166,54,.72)) drop-shadow(0 0 18px rgba(255,84,32,.30))}50%{transform:scale(calc(1 + var(--flicker, .25) * .06),calc(1 + var(--flicker, .25) * .10));filter:drop-shadow(0 0 12px rgba(255,195,78,.9)) drop-shadow(0 0 24px rgba(255,84,32,.42))}}
.swAmbientEffect.windowLight{background:linear-gradient(var(--angle),rgba(255,232,166,.0) 0%,rgba(255,232,166,.20) 35%,rgba(255,202,110,.12) 62%,rgba(255,232,166,.0) 100%);clip-path:polygon(38% 0,62% 0,100% 100%,0 100%);mix-blend-mode:screen;filter:blur(4px);animation:swWindowLightBreathe 4.8s ease-in-out infinite;opacity:.28}.swAmbientEffect.windowLight:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0 16%,rgba(255,242,190,.12) 18% 24%,transparent 27% 50%,rgba(255,242,190,.10) 52% 57%,transparent 60%);opacity:.65}.swAmbientEffect.warmGlow{background:radial-gradient(circle,rgba(255,203,105,.42),rgba(255,137,47,.18) 40%,rgba(255,110,35,.06) 64%,transparent 76%);mix-blend-mode:screen;filter:blur(8px);animation:swWarmGlowPulse 1.45s ease-in-out infinite}.swAmbientEffect.dustMotes{background:transparent;mix-blend-mode:screen}.swAmbientEffect.dustMotes i{position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(255,238,168,.55);box-shadow:0 0 9px rgba(255,220,126,.45);animation:swDustFloat 8s linear infinite}@keyframes swWindowLightBreathe{50%{opacity:.36;transform:translateY(2px)}}@keyframes swWarmGlowPulse{50%{opacity:.72;transform:scale(1.035)}}@keyframes swDustFloat{0%{transform:translateY(30px);opacity:0}15%{opacity:.85}100%{transform:translateY(-80px);opacity:0}}

/* GameForge engine-editor extras */
.swToneLayer,.swLightLayer,.swObjectLayer,.swTerrainParticles,.swInteractionIcons{position:absolute;inset:0;pointer-events:none;z-index:20}.swToneLayer{mix-blend-mode:multiply;z-index:18}.swToneLayer.night{background:radial-gradient(ellipse at 58% 38%,rgba(0,0,0,0),rgba(6,12,32,.18) 55%,rgba(0,0,0,.20));}.swToneLayer.evening{background:rgba(80,35,10,.12)}.swToneLayer.fog{background:radial-gradient(ellipse at center,rgba(220,245,255,.10),rgba(185,220,255,.08),transparent)}.swLightLayer{z-index:31;mix-blend-mode:screen}.swLight{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,224,139,.72),rgba(255,160,55,.22) 32%,rgba(255,160,55,.07) 55%,transparent 72%);filter:blur(7px);animation:swLightFlicker 2.4s ease-in-out infinite}.swLight.cool{background:radial-gradient(circle,rgba(155,220,255,.60),rgba(85,160,255,.18) 42%,transparent 72%)}.swLight.campfire{animation-duration:.85s}.swObjectLayer{z-index:34}.swSceneMarker{position:absolute;font-size:24px;filter:drop-shadow(0 4px 8px #000)}.swInteractionIcons{z-index:2200}.swInteractIcon{position:absolute;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:rgba(5,10,18,.72);border:1px solid rgba(255,226,138,.75);color:#ffe7a6;font:800 15px Arial;box-shadow:0 0 12px rgba(255,218,130,.22);animation:swIconBob 1.6s ease-in-out infinite}.swDialogueBubble{position:absolute;max-width:260px;padding:10px 12px;border-radius:14px;background:rgba(7,8,12,.84);border:1px solid rgba(255,226,138,.75);color:#fff3cb;font:700 14px Arial;line-height:1.25;box-shadow:0 12px 30px rgba(0,0,0,.5);animation:swBubbleIn .18s ease-out}.swPlayer.swOccluded{opacity:.58;filter:brightness(.92)}.swTerrainParticles{z-index:33}.swFoot{position:absolute;width:12px;height:6px;border-radius:50%;background:rgba(235,225,180,.36);transform:translate(-50%,-50%);animation:swFootFade .85s ease-out forwards}.swFoot.water{background:rgba(155,225,255,.48);box-shadow:0 0 8px rgba(155,225,255,.35)}.swFoot.leaves{background:rgba(188,135,55,.38)}.swFoot.wood{background:rgba(210,160,85,.28)}@keyframes swIconBob{50%{transform:translateY(-5px)}}@keyframes swBubbleIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}@keyframes swFootFade{to{opacity:0;transform:translate(-50%,-50%) scale(2.1)}}@keyframes swLightFlicker{0%,100%{opacity:.65;transform:scale(1)}50%{opacity:.85;transform:scale(1.05)}}


/* Fishing readability + inventory pass */
.swFishing{left:50%;right:auto;bottom:18px;transform:translateX(-50%);width:min(560px,calc(100vw - 28px));padding:16px 18px 14px;border-radius:22px;background:rgba(5,12,24,.82);border:1px solid rgba(125,211,252,.42);box-shadow:0 18px 50px rgba(0,0,0,.42),0 0 28px rgba(56,189,248,.14);backdrop-filter:blur(10px);color:#e0f2fe;z-index:2600}.swFishTop{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}.swFishTop h3{margin:0;color:#fff;font-size:18px}.swFishTop span{padding:5px 10px;border-radius:999px;background:rgba(14,165,233,.18);border:1px solid rgba(125,211,252,.26);font-weight:900;color:#bae6fd}.swFishing p{margin:6px 0 10px;font-size:15px;font-weight:850;color:#fff}.swFishing small{display:block;margin-top:8px;color:#bae6fd;font-weight:850}.swCastBar{height:24px;border-radius:999px;background:rgba(2,6,23,.72);border:1px solid rgba(255,255,255,.18);overflow:hidden;position:relative}.swCastBar:before{content:'';position:absolute;left:38%;right:28%;top:4px;bottom:4px;border-radius:999px;border:1px solid rgba(255,255,255,.72);box-shadow:0 0 14px rgba(34,197,94,.34)}.swCastBar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#38bdf8,#22c55e,#facc15,#fb7185);transition:width .05s linear}.swCastBar em{position:absolute;top:-5px;width:6px;height:34px;border-radius:999px;background:#fde68a;box-shadow:0 0 12px rgba(253,230,138,.8);transform:translateX(-50%)}.swCatchBar{height:12px;margin-top:8px;border-radius:999px;background:rgba(15,23,42,.74);border:1px solid rgba(125,211,252,.22);overflow:hidden}.swCatchBar b{display:block;width:0;height:100%;border-radius:999px;background:linear-gradient(90deg,#60a5fa,#22c55e)}.swFishControls{margin-top:9px;font-size:12px;color:#93c5fd;font-weight:800}.swBobber.bite{box-shadow:0 0 0 12px rgba(250,204,21,.22),0 0 24px rgba(250,204,21,.7);animation:swBobberBite .16s ease-in-out infinite alternate}@keyframes swBobberBite{to{transform:translate(-50%,-58%) scale(1.18)}}

/* Fishing expansion pass: logbook, records, and readability */
.swLogbookButton{position:absolute;right:32px;bottom:32px;z-index:2601;border:1px solid rgba(125,211,252,.45);background:rgba(5,12,24,.76);color:#e0f2fe;border-radius:999px;padding:10px 14px;font-weight:900;box-shadow:0 12px 30px rgba(0,0,0,.35);backdrop-filter:blur(8px)}
.swLogbookPanel{position:absolute;right:24px;top:82px;width:min(430px,calc(100vw - 32px));max-height:calc(100vh - 150px);z-index:5000;background:rgba(3,8,20,.90);border:1px solid rgba(125,211,252,.42);border-radius:22px;box-shadow:0 22px 70px rgba(0,0,0,.58),0 0 28px rgba(56,189,248,.13);overflow:hidden;color:#e0f2fe;backdrop-filter:blur(14px)}
.swLogbookPanel.hidden{display:none}.swLogbookHead{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(125,211,252,.20);background:linear-gradient(90deg,rgba(14,165,233,.18),rgba(15,23,42,.1))}.swLogbookHead b{font-size:18px}.swLogbookHead button{width:30px;height:30px;border-radius:10px;border:1px solid rgba(125,211,252,.35);background:rgba(15,23,42,.65);color:#fff;font-weight:900}.swLogbookSummary{padding:10px 14px;color:#bae6fd;font-size:13px;font-weight:850;border-bottom:1px solid rgba(125,211,252,.16)}.swLogbookGrid{display:grid;gap:10px;padding:12px;overflow:auto;max-height:calc(100vh - 245px)}.swLogCard{display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:start;padding:10px;border-radius:16px;background:rgba(15,23,42,.66);border:1px solid rgba(148,163,184,.22)}.swLogCard.seen{border-color:rgba(125,211,252,.28)}.swLogCard.unknown{filter:saturate(.65);opacity:.78}.swFishIcon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-size:24px;background:radial-gradient(circle,rgba(56,189,248,.18),rgba(15,23,42,.78));border:1px solid rgba(125,211,252,.24)}.swLogCard b{display:block;color:#fff}.swLogCard span{display:inline-block;margin:3px 0 5px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:900;background:rgba(148,163,184,.18)}.swLogCard small,.swLogCard em{display:block;color:#bfdbfe;font-style:normal;font-size:12px;line-height:1.35}.swLogCard.rarity-uncommon span{background:rgba(34,197,94,.20);color:#bbf7d0}.swLogCard.rarity-rare span{background:rgba(59,130,246,.22);color:#bfdbfe}.swLogCard.rarity-epic span{background:rgba(168,85,247,.22);color:#e9d5ff}.swLogCard.rarity-legendary span{background:rgba(250,204,21,.22);color:#fef3c7}.swLogCard.rarity-legendary{box-shadow:inset 0 0 22px rgba(250,204,21,.08)}

`;document.head.appendChild(s);}

  window.PetWorldWorldEngine={start:start,stop:stop};
})();
