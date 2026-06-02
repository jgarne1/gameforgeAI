/*
  GameForge AI - World Forger Town Engine v2.1
  Playable asset-independent JRPG town layer.
  - Procedural painted canvas town, so paths/walls/buildings always match.
  - Multiplayer presence uses the existing GameForge worldJoin/worldMove websocket contract.
  - Housing uses /api/estate/neighborhoods/whisperwind_01 claim/release routes.
*/
(function(){
  'use strict';

  var MAP_W=4200, MAP_H=3200;
  var WORLD_URL='/assets/worlds/whisperwind_village.json';
  var NEIGHBORHOOD_ID='whisperwind_01';
  var root, canvas, ctx, mini, miniCtx, dialog, toastEl, actionEl, housePanel, infoEl;
  var running=false, last=0, raf=0, keys={}, pointerDown=false, target=null, onClose=null;
  var camera={x:0,y:0,scale:1};
  var world=null, townObjects=[], interactions=[], plots=[], npcs=[], estate=null;
  var user='guest';
  var player={id:'me',x:2100,y:2140,vx:0,vy:0,face:'down',moving:false,name:'guest',speed:255,step:0};
  var mp={ws:null,id:'',peers:{},connected:false,lastSent:0};
  var DAY_LENGTH=240; // seconds for one town day cycle

  var COLORS={
    grass:'#4f9d5b',grass2:'#3f854e',path:'#d6b178',pathEdge:'#947143',water:'#267aa6',water2:'#64c8dc',wall:'#7d8792',wallTop:'#b9c4c8',roof:'#9d3e4a',roof2:'#315d9c',wood:'#7b5134',stone:'#64717c',shadow:'rgba(10,14,22,.24)'
  };

  function start(opts){
    opts=opts||{}; user=opts.username||getUser(); player.name=user; onClose=opts.onClose||null;
    mount();
    loadWorld().then(function(){
      return loadEstate();
    }).then(function(){
      syncPlotsWithEstate();
      running=true; last=performance.now(); root.classList.remove('hidden');
      connectSocket();
      toast('Welcome to Whisperwind. WASD/Arrows move, E interacts, M toggles minimap.');
      raf=requestAnimationFrame(loop);
    }).catch(function(err){
      console.error(err); toast('Town loaded with fallback data.');
      world=fallbackWorld(); applyWorld(world); running=true; raf=requestAnimationFrame(loop);
    });
  }

  function stop(){
    running=false; cancelAnimationFrame(raf);
    if(mp.ws){try{mp.ws.send(JSON.stringify({type:'worldLeave'}));mp.ws.close();}catch(e){}}
    if(onClose)onClose(); else location.href='/games/launcher.html';
  }

  function mount(){
    if(root)return;
    injectStyles();
    root=document.createElement('div'); root.id='wfRoot'; root.className='wfRoot hidden';
    root.innerHTML=''
      +'<canvas id="wfCanvas"></canvas>'
      +'<div class="wfHud">'
      +'<div class="wfTopLeft wfPanel"><b>Whisperwind Village</b><span id="wfInfo">Loading...</span></div>'
      +'<div class="wfTopRight"><button id="wfMiniBtn">Map</button><button id="wfLeave">Leave</button></div>'
      +'<canvas id="wfMini" class="wfMini"></canvas>'
      +'<div id="wfAction" class="wfAction hidden">Press E</div>'
      +'<div id="wfToast" class="wfToast">Loading...</div>'
      +'<div id="wfDialog" class="wfDialog hidden"><div class="wfDialogName"></div><div class="wfDialogText"></div><div class="wfDialogHint">Press E to close</div></div>'
      +'<div id="wfHousePanel" class="wfHousePanel hidden"></div>'
      +'</div>';
    document.body.appendChild(root);
    canvas=root.querySelector('#wfCanvas'); ctx=canvas.getContext('2d');
    mini=root.querySelector('#wfMini'); miniCtx=mini.getContext('2d'); dialog=root.querySelector('#wfDialog'); toastEl=root.querySelector('#wfToast'); actionEl=root.querySelector('#wfAction'); housePanel=root.querySelector('#wfHousePanel'); infoEl=root.querySelector('#wfInfo');
    root.querySelector('#wfLeave').onclick=stop;
    root.querySelector('#wfMiniBtn').onclick=function(){mini.classList.toggle('collapsed');};
    window.addEventListener('resize',resize); resize();
    window.addEventListener('keydown',key,true); window.addEventListener('keyup',key,true);
    canvas.addEventListener('pointerdown',pointerStart); window.addEventListener('pointerup',function(){pointerDown=false;});
  }

  function injectStyles(){
    var css=''
      +'#wfRoot{position:fixed;inset:0;overflow:hidden;background:#06111e;color:#eaf8ff;font-family:Inter,Arial,sans-serif}#wfRoot.hidden{display:none}#wfCanvas{position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;image-rendering:auto}'
      +'.wfHud{position:absolute;inset:0;pointer-events:none}.wfPanel{background:linear-gradient(135deg,rgba(8,21,35,.86),rgba(9,51,77,.72));border:1px solid rgba(141,221,255,.28);box-shadow:0 18px 46px rgba(0,0,0,.32);backdrop-filter:blur(12px);border-radius:16px}'
      +'.wfTopLeft{position:absolute;left:14px;top:12px;padding:12px 14px;min-width:250px}.wfTopLeft b{display:block;font-size:17px}.wfTopLeft span{display:block;margin-top:4px;color:#aee4ff;font-size:12px;font-weight:700}.wfTopRight{position:absolute;right:14px;top:12px;display:flex;gap:8px;pointer-events:auto}.wfTopRight button{border:1px solid rgba(125,211,252,.35);background:rgba(8,32,52,.82);color:#eaffff;border-radius:12px;padding:9px 12px;font-weight:900;cursor:pointer}'
      +'.wfMini{position:absolute;right:14px;top:62px;width:220px;height:168px;border-radius:16px;border:1px solid rgba(141,221,255,.38);background:rgba(4,15,25,.78);box-shadow:0 16px 40px rgba(0,0,0,.38);pointer-events:auto}.wfMini.collapsed{display:none}'
      +'.wfAction{position:absolute;left:50%;bottom:94px;transform:translateX(-50%);padding:12px 18px;border-radius:999px;background:rgba(5,20,32,.88);border:1px solid rgba(125,211,252,.45);box-shadow:0 16px 40px rgba(0,0,0,.35);font-weight:900}.wfAction.hidden{display:none}'
      +'.wfToast{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);max-width:min(760px,calc(100vw - 28px));padding:12px 16px;border-radius:16px;background:rgba(5,20,32,.88);border:1px solid rgba(125,211,252,.28);box-shadow:0 16px 42px rgba(0,0,0,.34);font-weight:800;color:#d8f6ff;text-align:center}'
      +'.wfDialog{position:absolute;left:50%;bottom:72px;transform:translateX(-50%);width:min(720px,calc(100vw - 28px));background:linear-gradient(180deg,rgba(6,18,32,.96),rgba(11,41,58,.94));border:1px solid rgba(141,221,255,.42);box-shadow:0 22px 70px rgba(0,0,0,.5);border-radius:20px;padding:18px 20px}.wfDialog.hidden{display:none}.wfDialogName{font-size:18px;font-weight:1000;color:#8ee8ff;margin-bottom:8px}.wfDialogText{line-height:1.45;font-weight:760}.wfDialogHint{margin-top:10px;color:#9fd2e8;font-size:12px;font-weight:900;text-align:right}'
      +'.wfHousePanel{position:absolute;left:14px;bottom:18px;width:min(380px,calc(100vw - 28px));background:linear-gradient(180deg,rgba(6,18,32,.96),rgba(10,44,62,.94));border:1px solid rgba(141,221,255,.42);border-radius:20px;padding:14px;box-shadow:0 22px 70px rgba(0,0,0,.45);pointer-events:auto}.wfHousePanel.hidden{display:none}.wfHousePanel h3{margin:0 0 8px}.wfHousePanel p{margin:6px 0;color:#c9ecf8}.wfHousePanel button{margin:8px 8px 0 0;border:0;border-radius:12px;padding:10px 13px;font-weight:1000;cursor:pointer;background:#42c6ff;color:#042033}.wfHousePanel button.secondary{background:#22384f;color:#eaf8ff;border:1px solid rgba(141,221,255,.28)}.wfHousePanel button.danger{background:#ffd166;color:#3b2500}'
      +'@media(max-width:760px){.wfTopLeft{min-width:0;right:92px}.wfMini{width:154px;height:118px}.wfToast{bottom:12px}.wfDialog{bottom:56px}.wfHousePanel{bottom:10px}}';
    var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  }

  function resize(){
    var dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.floor(innerWidth*dpr)); canvas.height=Math.max(1,Math.floor(innerHeight*dpr)); canvas.style.width=innerWidth+'px'; canvas.style.height=innerHeight+'px'; ctx.setTransform(dpr,0,0,dpr,0,0);
    mini.width=220*dpr; mini.height=168*dpr; miniCtx.setTransform(dpr,0,0,dpr,0,0);
  }

  function loadWorld(){
    return fetch(WORLD_URL+'?v='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():fallbackWorld();}).then(function(j){world=j||fallbackWorld(); applyWorld(world);});
  }
  function applyWorld(j){
    MAP_W=(j.size&&j.size.w)||4200; MAP_H=(j.size&&j.size.h)||3200;
    var sp=j.spawn||{x:2100,y:2140,face:'down'}; player.x=sp.x; player.y=sp.y; player.face=sp.face||'down';
    townObjects=(j.objects||[]).slice(); interactions=(j.interactions||[]).slice(); plots=(j.plots||[]).slice(); npcs=(j.npcs||[]).slice();
  }
  function fallbackWorld(){return {id:'whisperwind_village',size:{w:4200,h:3200},spawn:{x:2100,y:2140,face:'down'},objects:[],plots:[],npcs:[],interactions:[]};}

  function loadEstate(){
    return fetch('/api/estate/neighborhoods/'+NEIGHBORHOOD_ID,{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){estate=j&&j.neighborhood;}).catch(function(){estate=null;});
  }
  function syncPlotsWithEstate(){
    if(!estate||!Array.isArray(estate.plots))return;
    plots.forEach(function(p){
      var e=estate.plots.find(function(x){return x.id===p.id;});
      if(e){p.owner=e.owner||null;p.status=e.status||p.status||'available_house';p.houseType=e.houseType||p.houseType;}
    });
  }

  function loop(now){
    if(!running)return; var dt=Math.min(.05,(now-last)/1000||.016); last=now;
    update(dt,now/1000); draw(now/1000); raf=requestAnimationFrame(loop);
  }
  function update(dt,t){
    var ix=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);
    var iy=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0);
    if(target){var dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy); if(d<12){target=null;} else {ix=dx/d;iy=dy/d;}}
    if(ix||iy){var len=Math.hypot(ix,iy)||1; ix/=len; iy/=len; var nx=player.x+ix*player.speed*dt, ny=player.y+iy*player.speed*dt; moveTo(nx,ny); player.moving=true; player.step+=dt*9; player.face=Math.abs(ix)>Math.abs(iy)?(ix<0?'left':'right'):(iy<0?'up':'down');}
    else{player.moving=false; player.step=0;}
    updateNpcs(dt,t); updateCamera(); updateHud(t); sendMove(t);
  }
  function moveTo(nx,ny){
    if(canStand(nx,player.y))player.x=nx;
    if(canStand(player.x,ny))player.y=ny;
  }
  function canStand(x,y){
    if(x<90||y<120||x>MAP_W-90||y>MAP_H-90)return false;
    if(pointInEllipse(x,y,3560,900,390,195))return false; // upper lake
    if(pointInEllipse(x,y,760,2530,520,280))return false; // lower lake
    for(var i=0;i<townObjects.length;i++){
      var o=townObjects[i], f=o.footprint; if(!f)continue;
      if(x>=f.x&&x<=f.x+f.w&&y>=f.y&&y<=f.y+f.h)return false;
    }
    for(var p=0;p<plots.length;p++){var fp=plots[p].footprint;if(fp&&x>=fp.x&&x<=fp.x+fp.w&&y>=fp.y&&y<=fp.y+fp.h)return false;}
    return true;
  }

  function updateCamera(){
    camera.scale=Math.min(1.08,Math.max(.62,innerWidth/1260));
    camera.x=clamp(player.x-innerWidth/(2*camera.scale),0,MAP_W-innerWidth/camera.scale);
    camera.y=clamp(player.y-innerHeight/(2*camera.scale),0,MAP_H-innerHeight/camera.scale);
  }

  function draw(t){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    ctx.save(); ctx.scale(camera.scale,camera.scale); ctx.translate(-camera.x,-camera.y);
    drawGround(t); drawWallsAndTerraces(); drawPaths(); drawWater(t);
    var drawables=[];
    townObjects.forEach(function(o){drawables.push({y:(o.y||0)+(o.h||0),type:'object',o:o});});
    plots.forEach(function(p){drawables.push({y:p.y+170,type:'plot',o:p});});
    npcs.forEach(function(n){drawables.push({y:n.y,type:'npc',o:n});});
    Object.keys(mp.peers).forEach(function(k){drawables.push({y:mp.peers[k].y,type:'peer',o:mp.peers[k]});});
    drawables.push({y:player.y,type:'player',o:player});
    drawables.sort(function(a,b){return a.y-b.y;});
    drawables.forEach(function(d){ if(d.type==='object')drawObject(d.o,t); else if(d.type==='plot')drawHousePlot(d.o,t); else if(d.type==='npc')drawNpc(d.o,t); else if(d.type==='peer')drawCharacter(d.o,t,true); else drawCharacter(player,t,false); });
    drawInteractionMarkers(t); drawLighting(t); ctx.restore(); drawMiniMap();
  }

  function drawGround(t){
    var g=ctx.createLinearGradient(0,0,MAP_W,MAP_H); g.addColorStop(0,'#5cab68'); g.addColorStop(.5,'#3f8e56'); g.addColorStop(1,'#2e6f48'); ctx.fillStyle=g; ctx.fillRect(0,0,MAP_W,MAP_H);
    ctx.globalAlpha=.12; ctx.fillStyle='#e7ffd0';
    for(var i=0;i<260;i++){var x=(i*409)%MAP_W,y=(i*727)%MAP_H; ctx.beginPath(); ctx.ellipse(x,y,18+(i%4)*10,4+(i%3)*2,(i%7)*.35,0,Math.PI*2); ctx.fill();}
    ctx.globalAlpha=1;
  }
  function drawPaths(){
    var paths=(world&&world.paths)||defaultPaths();
    paths.forEach(function(p){drawPolyline(p.points,p.width+24,'rgba(80,49,28,.26)','round');});
    paths.forEach(function(p){drawPolyline(p.points,p.width,'#d9b57b','round'); drawPolyline(p.points,Math.max(8,p.width*.08),'rgba(255,240,190,.28)','round');});
    // plaza cobbles
    ctx.save(); ctx.globalAlpha=.26; ctx.strokeStyle='#8c704c'; ctx.lineWidth=2;
    for(var x=1660;x<2540;x+=70){ctx.beginPath();ctx.moveTo(x,1660);ctx.lineTo(x+620,2480);ctx.stroke();}
    for(var y=1620;y<2540;y+=70){ctx.beginPath();ctx.moveTo(1620,y);ctx.lineTo(2920,y-520);ctx.stroke();}
    ctx.restore();
  }
  function defaultPaths(){return [{width:150,points:[[2100,430],[2100,1100],[2100,1650],[2100,2600],[2100,3050]]},{width:130,points:[[700,2200],[1300,2050],[2100,2060],[2850,2130],[3650,2300]]},{width:110,points:[[2100,1320],[2460,1120],[2980,980],[3500,920]]},{width:105,points:[[1600,2000],[1240,1580],[1180,1110]]},{width:100,points:[[2520,2140],[2760,1800],[3060,1510]]}];}
  function drawWater(t){
    drawLake(3560,900,390,195,t); drawLake(760,2530,520,280,t+2);
    // river/stream
    ctx.save(); ctx.strokeStyle='#317fa8'; ctx.lineWidth=95; ctx.lineCap='round'; ctx.beginPath();ctx.moveTo(3040,1020);ctx.bezierCurveTo(2740,1250,2870,1540,2590,1780);ctx.stroke(); ctx.strokeStyle='rgba(140,230,255,.34)'; ctx.lineWidth=18; ctx.setLineDash([50,40]); ctx.lineDashOffset=-t*35; ctx.stroke(); ctx.restore();
    drawDock(1030,2380,t);
  }
  function drawLake(x,y,rx,ry,t){
    ctx.save(); var grad=ctx.createRadialGradient(x-rx*.2,y-ry*.3,20,x,y,rx); grad.addColorStop(0,'#78dce8'); grad.addColorStop(.55,'#2d8fb8'); grad.addColorStop(1,'#1f618e'); ctx.fillStyle=grad; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(215,255,240,.35)'; ctx.lineWidth=18; ctx.stroke(); ctx.globalAlpha=.38; ctx.strokeStyle='#eaffff'; ctx.lineWidth=4; for(var i=0;i<5;i++){ctx.beginPath(); ctx.ellipse(x+(i-2)*90,y+Math.sin(t+i)*25,rx*.3,ry*.08,0,0,Math.PI*2); ctx.stroke();} ctx.restore();
  }
  function drawDock(x,y,t){ctx.save();ctx.translate(x,y);ctx.fillStyle='#5f3f29';ctx.fillRect(-210,-38,280,76);ctx.fillRect(30,-140,90,180);ctx.fillStyle='rgba(255,236,188,.16)';for(var i=-200;i<70;i+=34)ctx.fillRect(i,-34,8,68);ctx.fillRect(40,-130,70,10);ctx.fillRect(40,-76,70,10);ctx.restore();}
  function drawWallsAndTerraces(){
    ctx.save();
    ctx.fillStyle='rgba(36,31,27,.28)'; roundRect(1540,620,1920,430,46,true,false);
    ctx.fillStyle='#7d8792'; roundRect(1500,610,2000,410,46,true,false); ctx.fillStyle='#bac6cb'; roundRect(1500,585,2000,52,20,true,false);
    ctx.fillStyle='rgba(255,255,255,.18)'; for(var x=1540;x<3460;x+=130)roundRect(x,598,72,24,8,true,false);
    // stairs/ramp
    ctx.fillStyle='#cdb795'; roundRect(1990,1010,220,380,24,true,false); ctx.strokeStyle='rgba(75,65,51,.35)'; ctx.lineWidth=6; for(var y=1060;y<1360;y+=48){ctx.beginPath();ctx.moveTo(2008,y);ctx.lineTo(2192,y);ctx.stroke();}
    ctx.restore();
  }

  function drawObject(o,t){
    if(o.kind==='tavern')drawLargeBuilding(o,'The Gilded Mug','#80402f','#d8a24a',true);
    else if(o.kind==='shop')drawLargeBuilding(o,'Market Hall','#315d9c','#77d6ff',false);
    else if(o.kind==='guild')drawLargeBuilding(o,'Echo Hall','#5c4a88','#b9a8ff',false);
    else if(o.kind==='board')drawBoard(o);
    else if(o.kind==='fountain')drawFountain(o,t);
    else if(o.kind==='tree')drawTree(o.x,o.y,o.size||1,t);
    else if(o.kind==='lamp')drawLamp(o.x,o.y,t);
    else if(o.kind==='bridge')drawBridge(o);
    else drawCrate(o.x,o.y);
  }
  function drawLargeBuilding(o,label,roof,accent,tavern){
    var x=o.x,y=o.y,w=o.w,h=o.h;
    ctx.save(); ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x+w/2,y+h-8,w*.48,35,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#a97852'; roundRect(x+30,y+95,w-60,h-90,20,true,false); ctx.fillStyle='#d2a676'; roundRect(x+52,y+125,w-104,h-124,14,true,false);
    ctx.fillStyle=roof; ctx.beginPath(); ctx.moveTo(x-20,y+112); ctx.lineTo(x+w/2,y+12); ctx.lineTo(x+w+20,y+112); ctx.closePath(); ctx.fill(); ctx.strokeStyle='rgba(55,27,27,.32)'; ctx.lineWidth=8; ctx.stroke();
    ctx.fillStyle=accent; roundRect(x+w/2-70,y+158,140,120,8,true,false); ctx.fillStyle='rgba(255,246,187,.82)'; roundRect(x+90,y+148,72,62,10,true,false); roundRect(x+w-162,y+148,72,62,10,true,false);
    ctx.fillStyle='#3b2418'; roundRect(x+w/2-38,y+h-92,76,92,10,true,false); ctx.fillStyle='rgba(255,220,120,.84)'; ctx.beginPath(); ctx.arc(x+w/2+24,y+h-48,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(6,18,32,.84)'; roundRect(x+w/2-118,y+68,236,36,18,true,false); ctx.fillStyle='#eaf8ff'; ctx.font='900 21px Arial'; ctx.textAlign='center'; ctx.fillText(label,x+w/2,y+94);
    if(tavern){ctx.fillStyle='#f4c45e'; ctx.beginPath();ctx.arc(x+w-80,y+120,23,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5c311a';ctx.font='24px serif';ctx.fillText('☕',x+w-80,y+128);}
    ctx.restore();
  }
  function drawHousePlot(p,t){
    var owned=!!p.owner, available=!owned; var roof=owned?'#2e87b9':(p.roof||'#8d4a5c'); var x=p.x,y=p.y,w=p.w||230,h=p.h||210;
    ctx.save(); ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x+w/2,y+h-8,w*.46,28,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=available?'#b38d65':'#c99a6e'; roundRect(x+26,y+88,w-52,h-82,16,true,false);
    ctx.fillStyle=roof; ctx.beginPath();ctx.moveTo(x-8,y+104);ctx.lineTo(x+w/2,y+28);ctx.lineTo(x+w+8,y+104);ctx.closePath();ctx.fill();
    ctx.fillStyle=owned?'#66e0ff':'#ffd166'; roundRect(x+w/2-34,y+h-82,68,82,8,true,false); ctx.fillStyle='rgba(255,245,190,.85)'; roundRect(x+54,y+120,48,42,8,true,false); roundRect(x+w-102,y+120,48,42,8,true,false);
    ctx.fillStyle='rgba(6,18,32,.82)'; roundRect(x+18,y+h+6,w-36,32,16,true,false); ctx.fillStyle=owned?'#98f5ff':'#fff2b4'; ctx.font='900 16px Arial'; ctx.textAlign='center'; ctx.fillText(owned?('Owned: '+p.owner):(p.price||250)+' coins',x+w/2,y+h+28);
    ctx.restore();
  }
  function drawBoard(o){ctx.save();ctx.fillStyle=COLORS.wood;roundRect(o.x,o.y,o.w,o.h,10,true,false);ctx.fillStyle='#e7c88f';roundRect(o.x+20,o.y+18,o.w-40,o.h-46,8,true,false);ctx.fillStyle='#5a3923';ctx.font='900 18px Arial';ctx.textAlign='center';ctx.fillText('TOWN BOARD',o.x+o.w/2,o.y+48);ctx.restore();}
  function drawFountain(o,t){ctx.save();ctx.translate(o.x,o.y);ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,46,130,34,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#aebbc1';ctx.beginPath();ctx.ellipse(0,20,118,58,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4fc3df';ctx.beginPath();ctx.ellipse(0,12,92,38,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(239,255,255,.8)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,4);ctx.bezierCurveTo(-20,-54,28,-54,8,4);ctx.stroke();ctx.restore();}
  function drawTree(x,y,s,t){s=s||1;ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,36,58*s,20*s,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6d4629';roundRect(-13*s,-40*s,26*s,86*s,8*s,true,false);ctx.fillStyle='#2f6c43';for(var i=0;i<5;i++){ctx.beginPath();ctx.arc((i-2)*22*s,-58*s+Math.sin(t+i)*3,44*s,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#3f8d55';ctx.beginPath();ctx.arc(0,-88*s,56*s,0,Math.PI*2);ctx.fill();ctx.restore();}
  function drawLamp(x,y,t){ctx.save();ctx.translate(x,y);ctx.fillStyle='#3d2b24';roundRect(-6,-70,12,90,4,true,false);ctx.fillStyle='#ffd166';ctx.globalAlpha=.28+Math.sin(t*4)*.04;ctx.beginPath();ctx.arc(0,-78,50,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#ffe8a4';ctx.beginPath();ctx.arc(0,-78,13,0,Math.PI*2);ctx.fill();ctx.restore();}
  function drawBridge(o){ctx.save();ctx.translate(o.x,o.y);ctx.rotate((o.rot||0));ctx.fillStyle='#795337';roundRect(-170,-42,340,84,14,true,false);ctx.strokeStyle='rgba(255,230,180,.2)';ctx.lineWidth=8;for(var x=-140;x<150;x+=40){ctx.beginPath();ctx.moveTo(x,-40);ctx.lineTo(x,40);ctx.stroke();}ctx.restore();}
  function drawCrate(x,y){ctx.fillStyle='#855b35';roundRect(x,y,70,54,8,true,false);}
  function drawNpc(n,t){
    var loc=n.route&&n.route.length?n.route[Math.floor((t/(n.speed||9))%n.route.length)]:null;
    if(loc){var nx=loc[0],ny=loc[1]; n.x+=(nx-n.x)*.012; n.y+=(ny-n.y)*.012;}
    drawCharacter({x:n.x,y:n.y,name:n.name,face:'down',moving:true,step:t*3,color:n.color||'#ffd166'},t,true,true);
  }
  function drawCharacter(c,t,remote,isNpc){
    var bob=c.moving?Math.sin((c.step||t*4))*4:0,x=c.x,y=c.y+bob;
    ctx.save(); ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y+26,28,10,0,0,Math.PI*2);ctx.fill();
    ctx.translate(x,y); var shirt=isNpc?(c.color||'#ffd166'):(remote?'#a78bfa':'#41c7ff');
    ctx.fillStyle='#2a2430'; roundRect(-12,-26,24,38,9,true,false);
    ctx.fillStyle=shirt; roundRect(-19,-52,38,42,12,true,false);
    ctx.fillStyle='#f0ba8d'; ctx.beginPath();ctx.arc(0,-72,20,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=remote?'#583d2e':'#4b2d21'; ctx.beginPath();ctx.arc(0,-83,21,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle='#081523'; ctx.beginPath();ctx.arc(-7,-72,2,0,Math.PI*2);ctx.arc(7,-72,2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#20151d';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-15,-34);ctx.lineTo(-29,-12);ctx.moveTo(15,-34);ctx.lineTo(29,-12);ctx.stroke();
    ctx.fillStyle='rgba(6,18,32,.78)'; roundRect(-50,-120,100,24,12,true,false); ctx.fillStyle='#eaf8ff'; ctx.font='900 13px Arial';ctx.textAlign='center';ctx.fillText(c.name||'Player',0,-103);
    ctx.restore();
  }
  function drawInteractionMarkers(t){
    var all=interactions.concat(plots.map(function(p){return {x:p.x+p.w/2,y:p.y+p.h+28,label:p.owner?'Visit house':'Claim house'};}));
    all.forEach(function(h){var near=dist(player.x,player.y,h.x,h.y)<(h.r||120); ctx.save(); ctx.globalAlpha=near?1:.62; ctx.fillStyle=near?'#8ee8ff':'rgba(255,255,255,.82)'; ctx.beginPath();ctx.arc(h.x,h.y-36+Math.sin(t*3)*4,14,0,Math.PI*2);ctx.fill(); ctx.fillStyle='#052033';ctx.font='900 16px Arial';ctx.textAlign='center';ctx.fillText('!',h.x,h.y-30+Math.sin(t*3)*4);ctx.restore();});
  }
  function drawLighting(t){
    var day=(t%DAY_LENGTH)/DAY_LENGTH; var night=Math.max(0,Math.cos((day-.78)*Math.PI*2));
    ctx.save(); ctx.fillStyle='rgba(5,13,30,'+(0.08+night*.18)+')'; ctx.fillRect(0,0,MAP_W,MAP_H); ctx.restore();
  }

  function drawMiniMap(){
    var w=mini.classList.contains('collapsed')?0:220,h=168;if(!w)return;
    miniCtx.clearRect(0,0,w,h); miniCtx.fillStyle='rgba(5,17,27,.88)'; miniCtx.fillRect(0,0,w,h); var sx=w/MAP_W,sy=h/MAP_H;
    miniCtx.fillStyle='#3f8e56'; miniCtx.fillRect(6,6,w-12,h-12);
    miniCtx.strokeStyle='#d9b57b'; miniCtx.lineCap='round'; defaultPaths().forEach(function(p){miniCtx.lineWidth=Math.max(2,p.width*sx); miniCtx.beginPath(); p.points.forEach(function(pt,i){var x=pt[0]*sx,y=pt[1]*sy; if(i)miniCtx.lineTo(x,y); else miniCtx.moveTo(x,y);}); miniCtx.stroke();});
    miniCtx.fillStyle='#267aa6'; miniCtx.beginPath(); miniCtx.ellipse(3560*sx,900*sy,390*sx,195*sy,0,0,Math.PI*2); miniCtx.fill(); miniCtx.beginPath(); miniCtx.ellipse(760*sx,2530*sy,520*sx,280*sy,0,0,Math.PI*2); miniCtx.fill();
    miniCtx.fillStyle='#f6d365'; plots.forEach(function(p){miniCtx.fillRect((p.x+p.w/2)*sx-2,(p.y+p.h/2)*sy-2,4,4);});
    Object.keys(mp.peers).forEach(function(k){var p=mp.peers[k]; miniCtx.fillStyle='#a78bfa'; miniCtx.beginPath();miniCtx.arc(p.x*sx,p.y*sy,3,0,Math.PI*2);miniCtx.fill();});
    miniCtx.fillStyle='#ff4d6d'; miniCtx.beginPath();miniCtx.arc(player.x*sx,player.y*sy,4,0,Math.PI*2);miniCtx.fill(); miniCtx.strokeStyle='rgba(255,255,255,.55)'; miniCtx.strokeRect(camera.x*sx,camera.y*sy,(innerWidth/camera.scale)*sx,(innerHeight/camera.scale)*sy);
  }

  function updateHud(t){
    var h=nearestInteraction();
    if(h){actionEl.textContent=(h.label||'Interact')+' • Press E'; actionEl.classList.remove('hidden');}
    else actionEl.classList.add('hidden');
    if(infoEl){var peers=Object.keys(mp.peers).length; infoEl.textContent=(mp.connected?'Online':'Offline')+' · '+(peers+1)+' here · '+townClock(t);}
  }
  function nearestInteraction(){
    var best=null,bestD=1e9;
    interactions.forEach(function(h){var d=dist(player.x,player.y,h.x,h.y);if(d<(h.r||120)&&d<bestD){best=h;bestD=d;}});
    plots.forEach(function(p){var h={type:'house',plot:p,x:p.x+p.w/2,y:p.y+p.h+30,r:150,label:p.owner?'House: '+(p.owner===user?'Your home':p.owner):'Available home'};var d=dist(player.x,player.y,h.x,h.y);if(d<h.r&&d<bestD){best=h;bestD=d;}});
    npcs.forEach(function(n){var h={type:'npc',npc:n,x:n.x,y:n.y,r:115,label:'Talk to '+n.name};var d=dist(player.x,player.y,n.x,n.y);if(d<h.r&&d<bestD){best=h;bestD=d;}});
    return best;
  }
  function interact(){
    if(!dialog.classList.contains('hidden')){dialog.classList.add('hidden');return;}
    var h=nearestInteraction(); if(!h){toast('Nothing to interact with here.');return;}
    if(h.type==='house')return showHouse(h.plot);
    if(h.type==='npc')return say(h.npc.name,h.npc.text||'Good day, forger.');
    if(h.type==='tavern')return say('The Gilded Mug','The tavern is open. This is the future social room: player tables, rumors, minigame boards, and recruitable NPCs.');
    if(h.type==='shop')return say('Market Hall','Shop hook is ready. Next pass can open your real GameForge market or a town-only vendor inventory.');
    if(h.type==='guild')return say('Echo Hall','Guild projects will live here: build docks, repair bridges, unlock new districts, and make the town change for everyone.');
    if(h.type==='board')return say('Town Board','Current projects: restore the north lanterns, stock the tavern pantry, and survey the old wall above town.');
    if(h.type==='dock')return say('Dockmaster','Fishing zone hook found. This can connect back to your Shadow Woods fishing system.');
    say(h.label||'Whisperwind',h.text||'This spot is ready for a future feature.');
  }
  function say(name,text){dialog.querySelector('.wfDialogName').textContent=name;dialog.querySelector('.wfDialogText').textContent=text;dialog.classList.remove('hidden');housePanel.classList.add('hidden');}
  function showHouse(p){
    dialog.classList.add('hidden');
    var mine=p.owner&&String(p.owner).toLowerCase()===String(user).toLowerCase();
    housePanel.classList.remove('hidden');
    housePanel.innerHTML='<h3>'+escapeHtml(p.name||'Cottage')+'</h3>'
      +'<p>'+(p.owner?('Owned by <b>'+escapeHtml(p.owner)+'</b>.'):'This cottage is available. Claim it to make it your home in Whisperwind.')+'</p>'
      +'<p>Future upgrade path: interior editor, furniture, guest permissions, rent/sale listings, trophies, and shop stalls.</p>'
      +(p.owner?'<button class="secondary" id="visitHouse">Enter</button>':'<button id="claimHouse">Claim House</button>')
      +(mine?'<button class="danger" id="sellHouse">Sell / Release</button>':'')
      +'<button class="secondary" id="closeHouse">Close</button>';
    var close=housePanel.querySelector('#closeHouse'); if(close)close.onclick=function(){housePanel.classList.add('hidden');};
    var visit=housePanel.querySelector('#visitHouse'); if(visit)visit.onclick=function(){say(p.name||'Cottage','Interior room engine is reserved here. Next pass should render a furniture-editable house interior instead of this panel.');housePanel.classList.add('hidden');};
    var claim=housePanel.querySelector('#claimHouse'); if(claim)claim.onclick=function(){claimHouse(p);};
    var sell=housePanel.querySelector('#sellHouse'); if(sell)sell.onclick=function(){releaseHouse(p);};
  }
  function claimHouse(p){
    fetch('/api/estate/neighborhoods/'+NEIGHBORHOOD_ID+'/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user,plotId:p.id})}).then(function(r){return r.json();}).then(function(j){if(!j.ok)throw new Error(j.error||'Claim failed');estate=j.neighborhood;syncPlotsWithEstate();housePanel.classList.add('hidden');toast('House claimed: '+p.name);}).catch(function(e){toast(e.message||'Could not claim house.');});
  }
  function releaseHouse(p){
    fetch('/api/estate/neighborhoods/'+NEIGHBORHOOD_ID+'/release',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user,plotId:p.id})}).then(function(r){return r.json();}).then(function(j){if(!j.ok)throw new Error(j.error||'Release failed');estate=j.neighborhood;syncPlotsWithEstate();housePanel.classList.add('hidden');toast('House released back to town.');}).catch(function(e){toast(e.message||'Could not release house. Is the server drop-in deployed?');});
  }

  function key(e){
    var down=e.type==='keydown'; keys[e.code]=down;
    if(down&&e.code==='KeyE'){interact(); e.preventDefault();}
    if(down&&e.code==='KeyM'){mini.classList.toggle('collapsed'); e.preventDefault();}
    if(down&&e.code==='Escape'){if(!housePanel.classList.contains('hidden'))housePanel.classList.add('hidden');else if(!dialog.classList.contains('hidden'))dialog.classList.add('hidden');else stop(); e.preventDefault();}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyS','KeyD','KeyE'].indexOf(e.code)>=0)e.preventDefault();
  }
  function pointerStart(ev){pointerDown=true; var r=canvas.getBoundingClientRect(); var sx=ev.clientX-r.left,sy=ev.clientY-r.top; target={x:sx/camera.scale+camera.x,y:sy/camera.scale+camera.y};}

  function connectSocket(){
    try{var ws=new WebSocket(socketUrl()); mp.ws=ws; ws.onopen=function(){mp.connected=true;ws.send(JSON.stringify({type:'worldJoin',username:user,sceneId:'whisperwind_village',x:player.x,y:player.y,face:player.face,moving:false,mode:'town'}));}; ws.onmessage=function(ev){handleSocket(JSON.parse(ev.data||'{}'));}; ws.onclose=function(){mp.connected=false;}; ws.onerror=function(){mp.connected=false;};}catch(e){mp.connected=false;}
  }
  function handleSocket(m){
    if(m.type==='worldWelcome'){mp.id=m.id||mp.id;(m.peers||[]).forEach(function(p){if(p.id!==mp.id)mp.peers[p.id]=p;});return;}
    if((m.type==='worldJoin'||m.type==='worldMove')&&m.player&&m.player.id!==mp.id){mp.peers[m.player.id]=m.player;return;}
    if(m.type==='worldLeave'&&m.id)delete mp.peers[m.id];
  }
  function sendMove(t){
    if(!mp.ws||mp.ws.readyState!==1||t-mp.lastSent<.08)return; mp.lastSent=t;
    mp.ws.send(JSON.stringify({type:'worldMove',x:Math.round(player.x),y:Math.round(player.y),face:player.face,moving:player.moving,mode:'town'}));
  }
  function socketUrl(){var proto=location.protocol==='https:'?'wss':'ws';return proto+'://'+location.host;}

  function updateNpcs(dt,t){ /* actual interpolation is handled in drawNpc for light living-town movement */ }
  function townClock(t){var pct=(t%DAY_LENGTH)/DAY_LENGTH,mins=Math.floor(pct*24*60),h=Math.floor(mins/60),m=mins%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
  function toast(s){toastEl.textContent=s;}
  function getUser(){try{return localStorage.getItem('gf_user')||'guest';}catch(e){return 'guest';}}
  function dist(a,b,c,d){return Math.hypot(a-c,b-d);} function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function pointInEllipse(px,py,x,y,rx,ry){var dx=(px-x)/rx,dy=(py-y)/ry;return dx*dx+dy*dy<=1;}
  function drawPolyline(points,width,color,cap){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap=cap||'round';ctx.beginPath();points.forEach(function(p,i){if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});ctx.stroke();ctx.restore();}
  function roundRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);if(fill)ctx.fill();if(stroke)ctx.stroke();}
  function escapeHtml(s){return String(s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  window.PetWorldWorldEngine={start:start,stop:stop};
})();
