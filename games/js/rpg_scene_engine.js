/*
  GameForge RPG Scene Engine v1
  Purpose: shared walk-around scene layer for neighborhoods, towns, homes, shops, and future RPG areas.
  Design rules:
  - The world explains itself; the UI only assists.
  - One subtle interaction prompt, no permanent floating arrows.
  - Scene content stays data-driven so the World Editor/future editors can move NPCs, plots, doors, and signs.
*/
(function(){
  'use strict';

  var DEFAULT_SCENE='/assets/worlds/whisperwind_village.json';
  var SPRITE={url:'/assets/sprites/forger_base_sheet.png',w:128,h:128,cols:6,rows:12};
  var engine={root:null,stage:null,world:null,entitiesLayer:null,objectsLayer:null,remoteLayer:null,ui:null,loaded:false,running:false,scene:null,sceneId:'whisperwind_village',username:'Forger',state:null,keys:{},last:0,raf:0,camera:{x:0,y:0,scale:1},active:null,dialogue:null,ws:null,mpId:'',peers:{},lastSent:0,noticeTimer:0,onClose:null,estate:null};

  function start(opts){
    opts=opts||{};
    engine.username=opts.username||localStorage.getItem('gf_user')||'Forger';
    engine.sceneId=opts.sceneId||'whisperwind_village';
    engine.onClose=opts.onClose||null;
    mount();
    loadScene(engine.sceneId).then(function(scene){
      engine.scene=scene;
      return loadEstateState(scene);
    }).then(function(){
      begin();
    }).catch(function(err){
      console.error(err);
      mount();
      toast('Could not load the RPG scene.');
    });
  }

  function stop(){
    sendWorldLeave();
    engine.running=false;
    cancelAnimationFrame(engine.raf);
    if(engine.root)engine.root.classList.add('hidden');
    if(engine.onClose)engine.onClose();
  }

  function mount(){
    if(engine.loaded)return;
    injectStyles();
    var root=document.createElement('div');
    root.id='gfRpgRoot';
    root.className='gfRpgRoot hidden';
    root.innerHTML=''
      +'<div class="gfRpgStage" id="gfRpgStage">'
      +  '<div class="gfRpgWorld" id="gfRpgWorld">'
      +    '<div class="gfRpgBg" id="gfRpgBg"></div>'
      +    '<div class="gfRpgGroundLayer" id="gfRpgGroundLayer"></div>'
      +    '<div class="gfRpgObjectsLayer" id="gfRpgObjectsLayer"></div>'
      +    '<div class="gfRpgEntitiesLayer" id="gfRpgEntitiesLayer"></div>'
      +    '<div class="gfRpgRemoteLayer" id="gfRpgRemoteLayer"></div>'
      +    '<div class="gfRpgPlayer" id="gfRpgPlayer"><div class="gfNameTag"></div><div class="gfSprite"></div><div class="gfShadow"></div></div>'
      +    '<div class="gfRpgForegroundLayer" id="gfRpgForegroundLayer"></div>'
      +  '</div>'
      +  '<div class="gfRpgFade" id="gfRpgFade"><b>Whisperwind Village</b></div>'
      +  '<div class="gfRpgTopbar"><div><b id="gfAreaName">Whisperwind Village</b><span id="gfAreaSub"> Shared neighborhood</span></div><button id="gfLeaveBtn">Leave</button></div>'
      +  '<div class="gfRpgPrompt hidden" id="gfRpgPrompt">[E] Interact</div>'
      +  '<div class="gfRpgToast hidden" id="gfRpgToast"></div>'
      +  '<div class="gfRpgDialog hidden" id="gfRpgDialog"><button id="gfDialogClose">×</button><h3 id="gfDialogTitle"></h3><p id="gfDialogText"></p><div id="gfDialogActions" class="gfDialogActions"></div></div>'
      +  '<div class="gfRpgHelp" id="gfRpgHelp"><button id="gfHelpClose">×</button><b>Move:</b> WASD / Arrows &nbsp; <b>Interact:</b> E / Space</div>'
      +'</div>';
    document.body.appendChild(root);
    engine.root=root;engine.stage=root.querySelector('#gfRpgStage');engine.world=root.querySelector('#gfRpgWorld');engine.objectsLayer=root.querySelector('#gfRpgObjectsLayer');engine.entitiesLayer=root.querySelector('#gfRpgEntitiesLayer');engine.remoteLayer=root.querySelector('#gfRpgRemoteLayer');
    root.querySelector('#gfLeaveBtn').onclick=stop;
    root.querySelector('#gfDialogClose').onclick=closeDialog;
    root.querySelector('#gfHelpClose').onclick=function(){root.querySelector('#gfRpgHelp').classList.add('hidden');localStorage.setItem('gfRpgHelpClosed','1');};
    if(localStorage.getItem('gfRpgHelpClosed')==='1')root.querySelector('#gfRpgHelp').classList.add('hidden');
    window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKey,true);window.addEventListener('resize',layout);
    engine.stage.addEventListener('pointerdown',onPointerDown);
    engine.loaded=true;
  }

  function loadScene(sceneId){
    var url=DEFAULT_SCENE;
    return fetch('/assets/worlds/world_scenes.json?v='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():{scenes:[]};}).then(function(reg){
      var meta=(reg.scenes||[]).find(function(s){return s.id===sceneId;});
      if(meta&&meta.url)url=meta.url;
      return fetch(url+'?v='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('scene missing');return r.json();});
    });
  }

  function loadEstateState(scene){
    if(!scene.neighborhoodId)return Promise.resolve();
    return fetch('/api/estate/neighborhoods/'+encodeURIComponent(scene.neighborhoodId),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){engine.estate=j||null;mergeEstatePlots(scene,engine.estate);}).catch(function(){engine.estate=null;});
  }

  function mergeEstatePlots(scene,estate){
    if(!estate||!Array.isArray(estate.plots))return;
    var byId={};estate.plots.forEach(function(p){byId[p.plotId]=p;});
    (scene.sceneObjects||[]).forEach(function(o){
      if(o.type==='plot'&&byId[o.id]){
        var p=byId[o.id];
        o.status=p.ownerId?'owned':(p.status||'for_sale');
        o.ownerId=p.ownerId||'';o.ownerName=p.ownerName||'';o.houseType=p.houseType||o.houseType||'starter_cottage';o.privacy=p.privacy||'public';
        o.label=o.ownerName?(o.ownerName+'\'s Home'):(o.status==='for_sale'?'For Sale':'Empty Plot');
      }
    });
  }

  function begin(){
    engine.root.classList.remove('hidden');
    renderScene();
    var spawn=engine.scene.spawn||{x:900,y:1050,face:'up'};
    engine.state={x:Number(spawn.x||900),y:Number(spawn.y||1050),vx:0,vy:0,face:spawn.face||'down',moving:false,anim:0,interactT:0};
    var name=engine.scene.name||'RPG Scene';
    document.getElementById('gfAreaName').textContent=name;
    document.getElementById('gfAreaSub').textContent=' · '+(engine.scene.description||'Shared area');
    document.getElementById('gfRpgFade').querySelector('b').textContent=name;
    layout();connectSocket();
    engine.running=true;engine.last=performance.now();engine.raf=requestAnimationFrame(loop);
    fade(false);toast('Welcome to '+name+'. Walk up to people, signs, doors, and plots.');
  }

  function renderScene(){
    var s=engine.scene||{};
    var w=(s.size&&s.size.w)||2200,h=(s.size&&s.size.h)||1600;
    engine.world.style.width=w+'px';engine.world.style.height=h+'px';
    var bg=document.getElementById('gfRpgBg');
    bg.style.backgroundImage=s.background?'url('+s.background+')':'linear-gradient(#163b27,#1d5b38)';
    renderObjects();
  }

  function renderObjects(){
    var all=(engine.scene.sceneObjects||[]).slice();
    engine.objectsLayer.innerHTML='';
    all.sort(function(a,b){return Number(a.y||0)-Number(b.y||0);}).forEach(function(o){
      var el=document.createElement('div');
      el.className='gfObj gfObj-'+(o.type||'object')+' '+(o.status?'status-'+o.status:'');
      el.dataset.id=o.id||'';
      el.style.left=Number(o.x||0)+'px';el.style.top=Number(o.y||0)+'px';el.style.zIndex=Math.round(Number(o.y||0));
      if(o.w)el.style.width=Number(o.w)+'px';if(o.h)el.style.height=Number(o.h)+'px';
      el.innerHTML=objectHtml(o);
      engine.objectsLayer.appendChild(el);
    });
  }

  function objectHtml(o){
    var type=o.type||'object';
    if(type==='tree')return '<div class="treeTop"></div><div class="treeTrunk"></div>';
    if(type==='lamp')return '<div class="lampGlow"></div><div class="lampPost"></div>';
    if(type==='npc')return '<div class="npcBody npc-'+(o.sprite||o.id||'')+'"></div><div class="objLabel">'+esc(o.name||o.title||o.label||'NPC')+'</div>';
    if(type==='sign'||type==='board')return '<div class="signBoard"></div><div class="signPost"></div>';
    if(type==='portal')return '<div class="portalGlow"></div><div class="portalArch"></div>';
    if(type==='dock')return '<div class="dockDeck"></div>';
    if(type==='plot'){
      var owned=o.status==='owned';
      var title=owned?(o.ownerName||'Owned'):(o.status==='for_sale'?'For Sale':'Empty Plot');
      return '<div class="plotBase"></div>'+(owned?'<div class="houseRoof"></div><div class="houseBody"><span></span></div>':'<div class="plotSign">'+esc(title)+'</div>')+'<div class="plotLabel">'+esc(title)+'</div>';
    }
    if(type==='shop'||type==='echohall')return '<div class="houseRoof special"></div><div class="houseBody shop"><b>'+esc(o.shortLabel||o.label||'Shop')+'</b></div>';
    if(type==='fence')return '<div class="fenceRail"></div>';
    if(type==='planter')return '<div class="planterBox">✿ ✿ ✿</div>';
    if(type==='fountain')return '<div class="fountainWater"></div><div class="fountainBase"></div>';
    return '<div class="genericObj"></div>';
  }

  function loop(now){
    if(!engine.running)return;
    var dt=Math.min(.04,(now-engine.last)/1000||.016);engine.last=now;
    update(dt);render(dt);engine.raf=requestAnimationFrame(loop);
  }

  function update(dt){
    var s=engine.state, ax=0,ay=0;
    if(engine.keys.ArrowLeft||engine.keys.KeyA)ax-=1;if(engine.keys.ArrowRight||engine.keys.KeyD)ax+=1;if(engine.keys.ArrowUp||engine.keys.KeyW)ay-=1;if(engine.keys.ArrowDown||engine.keys.KeyS)ay+=1;
    var len=Math.hypot(ax,ay);if(len>0){ax/=len;ay/=len;}
    var speed=Number((engine.scene&&engine.scene.playerSpeed)||210);
    var follow=Math.min(1,dt*13);s.vx+=(ax*speed-s.vx)*follow;s.vy+=(ay*speed-s.vy)*follow;
    if(len===0){var damp=Math.max(0,1-dt*11);s.vx*=damp;s.vy*=damp;}
    if(Math.abs(s.vx)<1)s.vx=0;if(Math.abs(s.vy)<1)s.vy=0;
    var nx=s.x+s.vx*dt,ny=s.y+s.vy*dt;
    if(canStand(nx,ny)){s.x=nx;s.y=ny;}else{if(canStand(nx,s.y)){s.x=nx;s.vy=0;} if(canStand(s.x,ny)){s.y=ny;s.vx=0;}}
    s.moving=Math.hypot(s.vx,s.vy)>18;
    if(len>0){if(Math.abs(ax)>Math.abs(ay)*.85)s.face=ax>0?'right':'left';else s.face=ay>0?'down':'up';}
    s.anim+=dt;s.interactT=Math.max(0,s.interactT-dt);
    updateActiveInteraction();sendPosition(false);
  }

  function render(dt){
    var s=engine.state;if(!s)return;
    layoutCamera();
    var p=document.getElementById('gfRpgPlayer');p.style.left=s.x+'px';p.style.top=s.y+'px';p.style.zIndex=Math.round(s.y)+10;p.querySelector('.gfNameTag').textContent=engine.username;
    applySprite(p.querySelector('.gfSprite'),s.face,s.moving,s.interactT>0,s.anim,false);
    renderPeers(dt||.016);
  }

  function applySprite(el,face,moving,interacting,t,remote){
    var col=0,flip=false;
    if(face==='up')col=2;else if(face==='right')col=4;else if(face==='left'){col=4;flip=true;}else col=0;
    var row=0;
    if(interacting)row=5+(Math.floor(t*6)%2);
    else if(moving)row=Math.floor(t*8)%5;
    else row=0;
    el.style.backgroundImage='url('+SPRITE.url+')';
    el.style.backgroundSize=(SPRITE.cols*SPRITE.w)+'px '+(SPRITE.rows*SPRITE.h)+'px';
    el.style.backgroundPosition=(-col*SPRITE.w)+'px '+(-row*SPRITE.h)+'px';
    el.style.transform='translate(-50%,-100%) scaleX('+(flip?-1:1)+')';
  }

  function layout(){layoutCamera();}
  function layoutCamera(){
    if(!engine.scene||!engine.state)return;
    var sw=engine.stage.clientWidth,sh=engine.stage.clientHeight;
    var mapW=(engine.scene.size&&engine.scene.size.w)||2200,mapH=(engine.scene.size&&engine.scene.size.h)||1600;
    var scale=Number(engine.scene.scale||1);engine.camera.scale=scale;
    var targetX=sw/2-engine.state.x*scale,targetY=sh/2-engine.state.y*scale;
    var minX=Math.min(0,sw-mapW*scale),minY=Math.min(0,sh-mapH*scale);
    targetX=Math.max(minX,Math.min(0,targetX));targetY=Math.max(minY,Math.min(0,targetY));
    engine.camera.x+=(targetX-engine.camera.x)*.14;engine.camera.y+=(targetY-engine.camera.y)*.14;
    engine.world.style.transform='translate('+engine.camera.x+'px,'+engine.camera.y+'px) scale('+scale+')';
  }

  function screenToWorld(ev){
    var r=engine.stage.getBoundingClientRect(),sc=engine.camera.scale||1;
    return {x:(ev.clientX-r.left-engine.camera.x)/sc,y:(ev.clientY-r.top-engine.camera.y)/sc};
  }

  function canStand(x,y){
    var sc=engine.scene||{},w=(sc.size&&sc.size.w)||2200,h=(sc.size&&sc.size.h)||1600;
    if(x<0||y<0||x>w||y>h)return false;
    var walks=(sc.walkable||[]).filter(function(a){return a.points;});
    if(walks.length&&!walks.some(function(a){return pointInPoly(x,y,a.points);})){return false;}
    var blockers=sc.blockers||[];
    for(var i=0;i<blockers.length;i++){var b=blockers[i];if(b.type==='circle'&&Math.hypot(x-b.x,y-b.y)<b.r)return false;if(b.type==='rect'&&x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)return false;if(b.points&&pointInPoly(x,y,b.points))return false;}
    return true;
  }

  function updateActiveInteraction(){
    var candidates=[];
    (engine.scene.hotspots||[]).concat(engine.scene.interactables||[]).concat(engine.scene.sceneObjects||[]).forEach(function(o){
      if(!isInteractable(o))return;
      var d=Math.hypot((o.interactX||o.x||0)-engine.state.x,(o.interactY||o.y||0)-engine.state.y),r=Number(o.r||o.radius||70);
      if(d<=r)candidates.push({o:o,d:d});
    });
    candidates.sort(function(a,b){return a.d-b.d;});
    engine.active=candidates.length?candidates[0].o:null;
    var prompt=document.getElementById('gfRpgPrompt');
    if(engine.active){prompt.textContent='[E] '+verbFor(engine.active);prompt.classList.remove('hidden');}
    else prompt.classList.add('hidden');
  }

  function isInteractable(o){return ['npc','sign','board','plot','exit','portal','shop','echohall','dock','textBox'].indexOf(o.type)>=0 || o.interaction || o.targetScene;}
  function verbFor(o){
    if(o.type==='npc')return 'Talk';if(o.type==='plot')return o.status==='owned'?'Visit Home':(o.status==='for_sale'?'Inspect Plot':'Inspect');if(o.type==='exit'||o.type==='portal'||o.targetScene)return 'Enter';if(o.type==='shop')return 'Shop';if(o.type==='echohall')return 'Enter Echo Hall';if(o.type==='dock')return 'Fish';return 'Read';
  }
  function interact(){
    var o=engine.active;if(!o)return;
    engine.state.interactT=.45;
    if(o.type==='exit'||o.type==='portal'||o.targetScene){transitionTo(o.targetScene,o.targetSpawn);return;}
    if(o.type==='plot'){showPlotDialog(o);return;}
    if(o.type==='npc'){showDialog(o.name||o.title||o.label||'Villager',dialogueText(o),actionsFor(o));return;}
    if(o.type==='dock'){showDialog(o.label||'Fishing Dock',o.text||'The water is calm here. Fishing integration will connect this dock to the fishing system.',[{label:'Go to Fishing Waters',fn:function(){transitionTo(o.targetScene||'shadow_woods_dock',o.targetSpawn||'from_estate');}}]);return;}
    showDialog(o.title||o.label||'Notice',o.text||o.description||'Nothing else happens yet.',actionsFor(o));
  }
  function dialogueText(o){var d=o.dialogue||o.text;if(Array.isArray(d))return d[Math.floor(Math.random()*d.length)];return d||'Hello, Forger.';}
  function actionsFor(o){var arr=[];if(o.targetScene)arr.push({label:'Enter',fn:function(){transitionTo(o.targetScene,o.targetSpawn);}});return arr;}
  function showPlotDialog(o){
    var text=o.status==='owned' ? ((o.ownerName||'Someone')+' lives here. Privacy: '+(o.privacy||'public')+'.') : (o.status==='for_sale'?'This plot is available for a starter cottage.':'This empty plot is not available yet.');
    var actions=[];
    if(o.status==='for_sale')actions.push({label:'Claim Plot for Testing',fn:function(){claimPlot(o);}});
    if(o.status==='owned')actions.push({label:'Visit Home',fn:function(){showDialog(o.label||'Home','House interiors are the next housing slice. This door will load the owner\'s saved interior.');}});
    showDialog(o.label||'Plot',text,actions);
  }
  function claimPlot(o){
    if(!engine.scene.neighborhoodId){toast('This scene has no neighborhood id.');return;}
    fetch('/api/estate/neighborhoods/'+encodeURIComponent(engine.scene.neighborhoodId)+'/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:engine.username,plotId:o.id})}).then(function(r){return r.json();}).then(function(j){
      if(!j.ok)throw new Error(j.error||'Could not claim plot.');
      engine.estate=j.neighborhood;mergeEstatePlots(engine.scene,engine.estate);renderObjects();closeDialog();toast('Plot claimed. Welcome home, '+engine.username+'.');
    }).catch(function(err){toast(err.message||'Could not claim plot.');});
  }
  function transitionTo(sceneId,spawnId){
    if(!sceneId){toast('This door is not connected yet.');return;}
    fade(true,'Entering...');sendWorldLeave();
    setTimeout(function(){engine.sceneId=sceneId;loadScene(sceneId).then(function(sc){engine.scene=sc;return loadEstateState(sc);}).then(function(){renderScene();var sp=findSpawn(spawnId)||engine.scene.spawn||{x:800,y:900,face:'down'};engine.state.x=sp.x;engine.state.y=sp.y;engine.state.face=sp.face||'down';document.getElementById('gfAreaName').textContent=engine.scene.name||sceneId;document.getElementById('gfAreaSub').textContent=' · '+(engine.scene.description||'Shared area');connectSocket();fade(false,engine.scene.name||sceneId);}).catch(function(){fade(false);toast('That area is not ready yet.');});},220);
  }
  function findSpawn(id){return ((engine.scene&&engine.scene.spawnPoints)||[]).find(function(s){return s.id===id;});}
  function showDialog(title,text,actions){
    var d=document.getElementById('gfRpgDialog');d.classList.remove('hidden');document.getElementById('gfDialogTitle').textContent=title||'';document.getElementById('gfDialogText').textContent=text||'';
    var a=document.getElementById('gfDialogActions');a.innerHTML='';(actions||[]).forEach(function(act){var b=document.createElement('button');b.textContent=act.label;b.onclick=act.fn;a.appendChild(b);});
  }
  function closeDialog(){document.getElementById('gfRpgDialog').classList.add('hidden');}
  function fade(on,label){var f=document.getElementById('gfRpgFade');if(label)f.querySelector('b').textContent=label;f.classList.toggle('show',!!on);}
  function toast(t){var el=document.getElementById('gfRpgToast');el.textContent=t;el.classList.remove('hidden');clearTimeout(engine.noticeTimer);engine.noticeTimer=setTimeout(function(){el.classList.add('hidden');},2600);}

  function onKey(e){
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','Space','KeyE'].indexOf(e.code)>=0)e.preventDefault();
    if(e.type==='keydown')engine.keys[e.code]=true;else engine.keys[e.code]=false;
    if(e.type==='keydown'&&(e.code==='KeyE'||e.code==='Space'))interact();
    if(e.type==='keydown'&&e.code==='Escape')closeDialog();
  }
  function onPointerDown(e){var p=screenToWorld(e);var nearest=null,dist=999999;(engine.scene.hotspots||[]).concat(engine.scene.interactables||[]).concat(engine.scene.sceneObjects||[]).forEach(function(o){if(!isInteractable(o))return;var d=Math.hypot((o.interactX||o.x||0)-p.x,(o.interactY||o.y||0)-p.y);if(d<dist){dist=d;nearest=o;}});if(nearest&&dist<60){engine.active=nearest;interact();}}

  function socketUrl(){return (location.protocol==='https:'?'wss':'ws')+'://'+location.host;}
  function connectSocket(){if(engine.ws&&(engine.ws.readyState===0||engine.ws.readyState===1)){joinWorld();return;}try{engine.ws=new WebSocket(socketUrl());engine.ws.onopen=joinWorld;engine.ws.onmessage=function(ev){handleWs(ev.data);};engine.ws.onclose=function(){setTimeout(function(){if(engine.running)connectSocket();},1800);};}catch(e){}}
  function joinWorld(){if(!engine.ws||engine.ws.readyState!==1||!engine.state)return;engine.ws.send(JSON.stringify({type:'worldJoin',username:engine.username,sceneId:engine.sceneId,x:engine.state.x,y:engine.state.y,face:engine.state.face,moving:engine.state.moving,appearance:{base:'forger_v1'}}));}
  function sendPosition(force){if(!engine.ws||engine.ws.readyState!==1||!engine.state)return;var now=performance.now();if(!force&&now-engine.lastSent<90)return;engine.lastSent=now;engine.ws.send(JSON.stringify({type:'worldMove',x:Math.round(engine.state.x),y:Math.round(engine.state.y),face:engine.state.face,moving:engine.state.moving,appearance:{base:'forger_v1'}}));}
  function sendWorldLeave(){try{if(engine.ws&&engine.ws.readyState===1)engine.ws.send(JSON.stringify({type:'worldLeave'}));}catch(e){}engine.peers={};}
  function handleWs(raw){var m;try{m=JSON.parse(raw);}catch(e){return;}if(m.type==='worldWelcome'){engine.mpId=m.id;engine.peers={};(m.peers||[]).forEach(function(p){upsertPeer(p,true);});return;}if(m.type==='worldJoin'&&m.player){upsertPeer(m.player,true);toast((m.player.username||'Someone')+' entered the area.');return;}if(m.type==='worldMove'&&m.player){upsertPeer(m.player,false);return;}if(m.type==='worldLeave'){delete engine.peers[m.id];return;}}
  function upsertPeer(p,snap){if(!p||!p.id||p.id===engine.mpId)return;var old=engine.peers[p.id]||{};old.id=p.id;old.username=p.username||old.username||'Forger';old.tx=Number(p.x||0);old.ty=Number(p.y||0);old.face=p.face||old.face||'down';old.moving=!!p.moving;if(snap||old.x==null){old.x=old.tx;old.y=old.ty;}engine.peers[p.id]=old;}
  function renderPeers(dt){var layer=engine.remoteLayer,seen={};Object.keys(engine.peers).forEach(function(id){var p=engine.peers[id];seen[id]=true;p.x+=(p.tx-p.x)*Math.min(1,dt*10);p.y+=(p.ty-p.y)*Math.min(1,dt*10);var el=layer.querySelector('[data-peer="'+id+'"]');if(!el){el=document.createElement('div');el.className='gfRemote';el.dataset.peer=id;el.innerHTML='<div class="gfNameTag"></div><div class="gfSprite"></div><div class="gfShadow"></div>';layer.appendChild(el);}el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.zIndex=Math.round(p.y)+9;el.querySelector('.gfNameTag').textContent=p.username;applySprite(el.querySelector('.gfSprite'),p.face,p.moving,false,performance.now()/1000,true);});Array.prototype.slice.call(layer.querySelectorAll('.gfRemote')).forEach(function(el){if(!seen[el.dataset.peer])el.remove();});}

  function pointInPoly(x,y,poly){var inside=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++){var xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];var intersect=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+0.00001)+xi);if(intersect)inside=!inside;}return inside;}
  function esc(s){return String(s||'').replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}

  function injectStyles(){
    if(document.getElementById('gfRpgStyles'))return;
    var s=document.createElement('style');s.id='gfRpgStyles';s.textContent=`
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#06120c;color:#eefdf4;font-family:Inter,system-ui,Segoe UI,Arial,sans-serif}.gfRpgRoot{position:fixed;inset:0;background:#06120c}.gfRpgRoot.hidden{display:none}.gfRpgStage{position:absolute;inset:0;overflow:hidden;background:radial-gradient(circle at 50% 35%,#1e4c35,#07110b 70%)}.gfRpgWorld{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}.gfRpgBg{position:absolute;inset:0;background-size:cover;background-position:center;filter:saturate(1.08) contrast(1.02)}.gfRpgGroundLayer,.gfRpgObjectsLayer,.gfRpgEntitiesLayer,.gfRpgRemoteLayer,.gfRpgForegroundLayer{position:absolute;inset:0;pointer-events:none}.gfRpgObjectsLayer{z-index:20}.gfRpgEntitiesLayer,.gfRpgRemoteLayer{z-index:40}.gfRpgPlayer,.gfRemote{position:absolute;width:128px;height:128px;transform:translate(-50%,-100%);pointer-events:none}.gfSprite{position:absolute;left:50%;bottom:10px;width:128px;height:128px;background-repeat:no-repeat;image-rendering:auto;filter:drop-shadow(0 7px 7px rgba(0,0,0,.34))}.gfShadow,.gfRemote .gfShadow{position:absolute;left:50%;bottom:8px;width:48px;height:16px;border-radius:50%;background:rgba(0,0,0,.30);transform:translateX(-50%);filter:blur(2px)}.gfNameTag{position:absolute;left:50%;top:4px;transform:translate(-50%,-100%);padding:2px 7px;border-radius:999px;background:rgba(4,12,9,.54);border:1px solid rgba(220,255,233,.18);color:#f4fff8;font-size:12px;font-weight:800;text-shadow:0 2px 4px #000;white-space:nowrap}.gfRemote{opacity:.92}.gfRpgTopbar{position:absolute;left:16px;right:16px;top:14px;z-index:500;display:flex;align-items:center;justify-content:space-between;pointer-events:none}.gfRpgTopbar>div{padding:10px 14px;border-radius:16px;background:rgba(4,11,18,.62);border:1px solid rgba(148,235,190,.25);box-shadow:0 12px 35px rgba(0,0,0,.25);backdrop-filter:blur(10px)}.gfRpgTopbar b{font-size:16px}.gfRpgTopbar span{color:#b8f7d3;font-size:12px;font-weight:700}.gfRpgTopbar button{pointer-events:auto;border:1px solid rgba(148,235,190,.32);background:rgba(4,11,18,.66);color:#fff;border-radius:14px;padding:9px 14px;font-weight:900}.gfRpgPrompt{position:absolute;left:50%;bottom:32px;transform:translateX(-50%);z-index:600;padding:10px 18px;border-radius:999px;background:rgba(5,12,20,.78);border:1px solid rgba(255,226,138,.72);color:#fff3c4;font-weight:950;box-shadow:0 14px 40px rgba(0,0,0,.35);backdrop-filter:blur(10px)}.gfRpgPrompt.hidden,.gfRpgToast.hidden,.gfRpgDialog.hidden,.gfRpgHelp.hidden{display:none}.gfRpgToast{position:absolute;left:50%;top:74px;transform:translateX(-50%);z-index:700;max-width:min(680px,calc(100vw - 40px));padding:10px 14px;border-radius:999px;background:rgba(8,17,28,.78);border:1px solid rgba(148,235,190,.25);color:#dfffea;font-weight:850;text-align:center;box-shadow:0 12px 35px rgba(0,0,0,.28);backdrop-filter:blur(10px)}.gfRpgDialog{position:absolute;left:50%;bottom:88px;transform:translateX(-50%);z-index:800;width:min(560px,calc(100vw - 36px));padding:18px 18px 16px;border-radius:22px;background:rgba(6,13,22,.92);border:1px solid rgba(255,226,138,.58);box-shadow:0 22px 80px rgba(0,0,0,.5);backdrop-filter:blur(16px)}.gfRpgDialog h3{margin:0 38px 8px 0;color:#ffe7a6}.gfRpgDialog p{margin:0;color:#effff4;line-height:1.45;font-weight:650}.gfRpgDialog>button{position:absolute;right:12px;top:10px;width:32px;height:32px;border-radius:11px;border:1px solid rgba(255,255,255,.20);background:rgba(15,23,42,.72);color:#fff;font-size:20px;font-weight:900}.gfDialogActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.gfDialogActions button{border:1px solid rgba(125,211,252,.4);background:rgba(14,165,233,.16);color:#e0f2fe;border-radius:12px;padding:9px 12px;font-weight:900}.gfRpgHelp{position:absolute;left:16px;bottom:16px;z-index:650;padding:9px 42px 9px 12px;border-radius:14px;background:rgba(5,12,20,.62);border:1px solid rgba(148,235,190,.22);color:#dbffee;font-size:12px;font-weight:800;backdrop-filter:blur(10px)}.gfRpgHelp button{position:absolute;right:8px;top:6px;border:0;background:transparent;color:#fff;font-weight:900;font-size:16px}.gfRpgFade{position:absolute;inset:0;z-index:2000;display:grid;place-items:center;background:#03070b;color:#fff;font-size:28px;font-weight:950;opacity:0;pointer-events:none;transition:opacity .25s ease}.gfRpgFade.show{opacity:1;pointer-events:auto}.gfObj{position:absolute;transform:translate(-50%,-100%);pointer-events:none}.objLabel,.plotLabel{position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);font-size:12px;font-weight:900;color:#f8fffb;text-shadow:0 2px 5px #000;white-space:nowrap}.gfObj-tree{width:150px;height:210px}.treeTop{position:absolute;left:50%;bottom:35px;width:145px;height:160px;transform:translateX(-50%);border-radius:52% 48% 45% 45%;background:radial-gradient(circle at 38% 32%,#59a86b,#22743f 58%,#144d2b);box-shadow:inset -16px -18px 0 rgba(0,0,0,.12),0 18px 26px rgba(0,0,0,.22)}.treeTrunk{position:absolute;left:50%;bottom:10px;width:28px;height:58px;transform:translateX(-50%);border-radius:14px;background:linear-gradient(90deg,#65391d,#9b6330,#4b2b16)}.gfObj-lamp{width:70px;height:150px}.lampGlow{position:absolute;left:50%;top:0;width:90px;height:90px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,rgba(255,224,139,.60),rgba(255,180,70,.18),transparent 70%);filter:blur(5px)}.lampPost{position:absolute;left:50%;bottom:8px;width:10px;height:105px;transform:translateX(-50%);background:#2b241b;border-radius:8px;box-shadow:0 -48px 0 10px #f6c560}.gfObj-npc{width:90px;height:130px}.npcBody{position:absolute;left:50%;bottom:10px;width:46px;height:72px;transform:translateX(-50%);border-radius:22px 22px 16px 16px;background:linear-gradient(#c18b45,#71421f);box-shadow:inset 0 18px 0 rgba(255,230,180,.2),0 6px 8px rgba(0,0,0,.25)}.npc-arlo{background:linear-gradient(#84d4ff,#316b8a)}.npc-marina{background:linear-gradient(#8be0d0,#246f68)}.npc-brindle{background:linear-gradient(#f4b24f,#8b4b20)}.npc-cog{background:linear-gradient(#d8c59c,#746349)}.gfObj-sign,.gfObj-board{width:120px;height:95px}.signBoard{position:absolute;left:50%;bottom:36px;width:105px;height:45px;transform:translateX(-50%);border-radius:7px;background:linear-gradient(#8a572d,#5b351c);border:3px solid #2a160a;box-shadow:0 7px 10px rgba(0,0,0,.25)}.signPost{position:absolute;left:50%;bottom:8px;width:14px;height:42px;transform:translateX(-50%);background:#4c2b17}.gfObj-plot{width:240px;height:190px}.plotBase{position:absolute;left:50%;bottom:8px;width:220px;height:132px;transform:translateX(-50%);border-radius:20px;background:rgba(110,170,95,.36);border:3px dashed rgba(255,255,255,.35);box-shadow:inset 0 0 30px rgba(20,70,30,.25)}.plotSign{position:absolute;left:50%;bottom:58px;transform:translateX(-50%);padding:5px 9px;border-radius:7px;background:#6b3f1e;border:2px solid #2a160a;color:#fff6d5;font-size:13px;font-weight:950;text-shadow:0 1px 2px #000}.houseRoof{position:absolute;left:50%;bottom:92px;width:180px;height:80px;transform:translateX(-50%);clip-path:polygon(50% 0,100% 100%,0 100%);background:linear-gradient(135deg,#7c2f25,#c65b36);filter:drop-shadow(0 8px 8px rgba(0,0,0,.28))}.houseRoof.special{background:linear-gradient(135deg,#27496b,#7a5fd1)}.houseBody{position:absolute;left:50%;bottom:22px;width:150px;height:88px;transform:translateX(-50%);border-radius:12px;background:linear-gradient(#e3bd78,#95612f);border:3px solid #352011;box-shadow:inset -12px -10px 0 rgba(0,0,0,.08)}.houseBody span{position:absolute;left:61px;bottom:0;width:34px;height:52px;border-radius:12px 12px 0 0;background:#442617;border:2px solid #221008}.houseBody.shop{display:grid;place-items:center;color:#fff3c4;font-size:18px;text-shadow:0 2px 3px #000}.gfObj-fountain{width:160px;height:130px}.fountainWater{position:absolute;left:50%;bottom:55px;width:70px;height:70px;border-radius:50%;transform:translateX(-50%);background:radial-gradient(circle,#caf7ff,#43b5df 65%,#1d7395);box-shadow:0 0 18px rgba(125,211,252,.55);animation:fountainPulse 1.8s ease-in-out infinite}.fountainBase{position:absolute;left:50%;bottom:8px;width:125px;height:48px;border-radius:50%;transform:translateX(-50%);background:linear-gradient(#b9c0bc,#6b7472);border:4px solid #424b49}@keyframes fountainPulse{50%{transform:translateX(-50%) scale(1.06)}}.gfObj-dock{width:180px;height:90px}.dockDeck{width:180px;height:72px;border-radius:10px;background:repeating-linear-gradient(90deg,#8b5a2b 0 24px,#68401f 25px 28px);border:3px solid #3b220f;box-shadow:0 10px 16px rgba(0,0,0,.25)}.gfObj-planter{width:120px;height:54px}.planterBox{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);background:#70411f;border:3px solid #2a160a;border-radius:10px;padding:10px 14px;color:#f9a8d4;font-weight:900}.gfObj-shop,.gfObj-echohall{width:240px;height:210px}.portalGlow{width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,#a5f3fc,#38bdf8 35%,transparent 70%);filter:blur(4px);animation:portal 2s ease-in-out infinite}.portalArch{position:absolute;left:50%;bottom:14px;width:100px;height:130px;transform:translateX(-50%);border:12px solid #475569;border-bottom:0;border-radius:55px 55px 0 0}@keyframes portal{50%{transform:scale(1.08);opacity:.72}}@media(max-width:760px){.gfRpgTopbar{left:10px;right:10px;top:10px}.gfRpgTopbar span{display:none}.gfRpgHelp{display:none}.gfRpgDialog{bottom:76px}.gfRpgPrompt{bottom:20px}}`;
    document.head.appendChild(s);
  }

  window.GameForgeRpgEngine={start:start,stop:stop};
})();
