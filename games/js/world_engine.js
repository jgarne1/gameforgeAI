/*
  GameForge AI World Engine - Shadow Woods vertical slice
  Purpose: reusable painted-scene exploration/fishing layer.
  Render-safe: vanilla JS/CSS/PNG only, no build step, Render friendly.
*/
(function(){
  'use strict';

  var MAP_W=1600, MAP_H=1080;
  var ASSETS={
    bg:'/assets/backgrounds/shadow_woods_fishing_scene.png',
    player:'/assets/sprites/wanderer_sheet.png'
  };
  var SPRITE={cols:6,rows:8,w:118,h:154};
  var engine={mounted:false,running:false,root:null,viewport:null,world:null,playerEl:null,shadowEl:null,fx:null,ui:null,scale:1,offX:0,offY:0,
    keys:{}, mouseDown:false, state:null, target:null, mode:'explore', fish:null, raf:0, last:0, onClose:null};

  var WALK_AREAS=[
    [[0,760],[90,700],[170,620],[235,520],[310,420],[410,315],[530,215],[625,245],[535,370],[455,485],[400,620],[320,760],[245,930],[200,1080],[0,1080]],
    [[370,590],[520,575],[730,555],[910,635],[960,705],[760,805],[570,785],[400,725]],
    [[315,605],[455,575],[485,635],[400,705],[300,690]]
  ];
  var SOFT_BLOCKS=[
    {x:930,y:230,r:95},{x:1120,y:210,r:115},{x:1010,y:380,r:70},{x:1250,y:450,r:140},{x:325,y:260,r:85}
  ];
  var DOCK_SPOT={x:690,y:640,face:'right'};
  var FISH_TARGET={x:980,y:510};
  var HOTSPOTS=[
    {id:'dock',type:'fish',x:690,y:640,r:110,label:'Fish from the dock'},
    {id:'path',type:'exit',x:185,y:280,r:80,label:'Path deeper into Shadow Woods'}
  ];

  function mount(){
    if(engine.mounted)return;
    injectStyles();
    var root=document.createElement('div');
    root.id='gfWorldEngineRoot';
    root.className='swRoot hidden';
    root.innerHTML=''
      +'<div class="swViewport" id="swViewport">'
      +  '<div class="swWorld" id="swWorld">'
      +    '<img class="swBg" src="'+ASSETS.bg+'" draggable="false" alt="Shadow Woods">'
      +    '<div class="swWaterGlow"></div><div class="swMist"></div><div class="swFireflies" id="swFireflies"></div><div class="swMotes" id="swMotes"></div>'
      +    '<div class="swHotspot dock"></div><div class="swHotspot path"></div>'
      +    '<div class="swBobber hidden" id="swBobber"></div><div class="swLine hidden" id="swLine"></div>'
      +    '<div class="swShadow" id="swShadow"></div><div class="swPlayer" id="swPlayer"><div class="swSprite"></div></div>'
      +    '<div class="swCanopy"></div>'
      +  '</div>'
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
    engine.root=root;engine.viewport=root.querySelector('#swViewport');engine.world=root.querySelector('#swWorld');engine.playerEl=root.querySelector('#swPlayer');engine.shadowEl=root.querySelector('#swShadow');engine.ui=root.querySelector('#swFishing');engine.fx=root.querySelector('#swFireflies');
    root.querySelector('#swClose').onclick=stop;
    window.addEventListener('resize',layout);
    window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKey,true);
    engine.viewport.addEventListener('pointerdown',onPointerDown);
    window.addEventListener('pointerup',onPointerUp);
    makeFireflies();makeMotes();engine.mounted=true;
  }

  function start(opts){
    mount();opts=opts||{};engine.onClose=opts.onClose||null;engine.root.classList.remove('hidden');engine.running=true;engine.mode='explore';engine.keys={};engine.target=null;engine.fish=null;
    engine.state={x:560,y:705,vx:0,vy:0,face:'up',moving:false,animTime:0,frame:0};
    layout();toast('Walk to the dock. Press E or Space near the dock to begin fishing.');engine.last=performance.now();engine.raf=requestAnimationFrame(loop);
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
    if(engine.mode==='explore')updateExplore(dt);else updateFishing(dt);
    render(dt);engine.raf=requestAnimationFrame(loop);
  }
  function updateExplore(dt){
    var s=engine.state, ax=0, ay=0;
    if(engine.keys.ArrowLeft||engine.keys.KeyA)ax-=1;if(engine.keys.ArrowRight||engine.keys.KeyD)ax+=1;if(engine.keys.ArrowUp||engine.keys.KeyW)ay-=1;if(engine.keys.ArrowDown||engine.keys.KeyS)ay+=1;
    if(engine.target){var dx=engine.target.x-s.x,dy=engine.target.y-s.y,d=Math.hypot(dx,dy);if(d<8){engine.target=null;}else{ax+=dx/d;ay+=dy/d;}}
    var len=Math.hypot(ax,ay);if(len>0){ax/=len;ay/=len;}
    var max=260, accel=1600, friction=0.84;
    s.vx=(s.vx+ax*accel*dt)*friction;s.vy=(s.vy+ay*accel*dt)*friction;
    var sp=Math.hypot(s.vx,s.vy);if(sp>max){s.vx=s.vx/sp*max;s.vy=s.vy/sp*max;}
    if(Math.abs(s.vx)<2)s.vx=0;if(Math.abs(s.vy)<2)s.vy=0;
    var nx=s.x+s.vx*dt, ny=s.y+s.vy*dt;
    if(canStand(nx,ny)){s.x=nx;s.y=ny;}else{ if(canStand(nx,s.y)){s.x=nx;s.vy=0;} if(canStand(s.x,ny)){s.y=ny;s.vx=0;} }
    s.moving=Math.hypot(s.vx,s.vy)>18;
    if(s.moving){if(Math.abs(s.vx)>Math.abs(s.vy))s.face=s.vx>0?'right':'left';else s.face=s.vy>0?'down':'up';}
    var dDock=Math.hypot(s.x-DOCK_SPOT.x,s.y-DOCK_SPOT.y);document.body.classList.toggle('swNearDock',dDock<95);
  }
  function updateFishing(dt){
    var f=engine.fish,s=engine.state;if(!f)return;
    s.face='right';s.moving=false;s.vx=s.vy=0;
    if(f.phase==='walk'){var dx=DOCK_SPOT.x-s.x,dy=DOCK_SPOT.y-s.y,d=Math.hypot(dx,dy);if(d>5){s.x+=dx/d*190*dt;s.y+=dy/d*190*dt;}else{f.phase='aim';showFishing('Hold Space or mouse to cast farther.','Release to cast');}}
    else if(f.phase==='aim'){
      if(engine.mouseDown||engine.keys.Space){f.power=(f.power+dt*0.9)%1;}
    }else if(f.phase==='wait'){
      f.t+=dt;if(f.t>f.biteAt){f.phase='bite';f.t=0;showFishing('Bite! Press Space or click now.','Hook it!');pulseBobber();}
    }else if(f.phase==='bite'){
      f.t+=dt;if(f.t>1.05){f.phase='wait';f.t=0;f.biteAt=1+Math.random()*1.4;showFishing('It slipped away. Watch the float.','Wait for the bite');}
    }else if(f.phase==='reel'){
      f.t+=dt;f.fishPos=0.5+Math.sin(f.t*3.3)*0.28+Math.sin(f.t*7.1)*0.08;
      if(engine.mouseDown||engine.keys.Space)f.tension+=dt*0.38;else f.tension-=dt*0.23;f.tension=Math.max(0,Math.min(1,f.tension));
      var good=Math.abs(f.tension-f.fishPos)<0.18;f.progress+=dt*(good?0.34:-0.12);f.progress=Math.max(0,Math.min(1,f.progress));
      showFishing('Keep the line in the glow.','Reel progress '+Math.round(f.progress*100)+'%');
      if(f.progress>=1){catchFish();}
      if(f.tension<=0||f.tension>=1){toast('The line went slack. Try again from the dock.');endFishing();}
    }
  }
  function render(dt){
    var s=engine.state;engine.playerEl.style.left=s.x+'px';engine.playerEl.style.top=s.y+'px';engine.shadowEl.style.left=s.x+'px';engine.shadowEl.style.top=(s.y+48)+'px';
    var sprite=engine.playerEl.querySelector('.swSprite');var anim=getAnim();s.animTime+=dt*(s.moving?9:3.2);var idx=Math.floor(s.animTime)%anim.frames.length;var fr=anim.frames[idx];sprite.style.backgroundImage='url('+ASSETS.player+')';sprite.style.backgroundSize=(SPRITE.cols*SPRITE.w)+'px '+(SPRITE.rows*SPRITE.h)+'px';sprite.style.backgroundPosition=(-fr[0]*SPRITE.w)+'px '+(-fr[1]*SPRITE.h)+'px';
    engine.playerEl.style.zIndex=Math.round(s.y);
    var bob=document.getElementById('swBobber'),line=document.getElementById('swLine');if(engine.fish&&(engine.fish.phase==='wait'||engine.fish.phase==='bite'||engine.fish.phase==='reel')){bob.classList.remove('hidden');line.classList.remove('hidden');bob.style.left=FISH_TARGET.x+'px';bob.style.top=FISH_TARGET.y+'px';var dx=FISH_TARGET.x-s.x,dy=FISH_TARGET.y-(s.y-52);line.style.left=s.x+'px';line.style.top=(s.y-52)+'px';line.style.width=Math.hypot(dx,dy)+'px';line.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';}else{bob.classList.add('hidden');line.classList.add('hidden');}
    if(engine.fish){var fill=document.getElementById('swCastFill'),sweet=document.getElementById('swSweet');if(engine.fish.phase==='aim'){fill.style.width=Math.round(engine.fish.power*100)+'%';sweet.style.left='72%';}else if(engine.fish.phase==='reel'){fill.style.width=Math.round(engine.fish.tension*100)+'%';sweet.style.left=Math.round(engine.fish.fishPos*100)+'%';}else{fill.style.width='0%';}}
  }
  function getAnim(){var s=engine.state;if(engine.mode==='fish')return {frames:[[0,6],[1,6],[2,6],[3,6],[4,6],[5,6]]};if(s.moving){if(s.face==='down')return {frames:[[0,3],[1,3],[2,3],[3,3]]};if(s.face==='up')return {frames:[[4,0],[5,0]]};if(s.face==='left')return {frames:[[0,2],[1,2],[2,2],[3,2]]};return {frames:[[0,5],[1,5],[2,5],[3,5],[4,5],[5,5]]};}if(s.face==='up')return {frames:[[4,0],[5,0]]};if(s.face==='left')return {frames:[[0,1],[1,1],[2,1],[3,1]]};if(s.face==='right')return {frames:[[4,2],[5,2]]};return {frames:[[0,0],[1,0],[2,0],[3,0]]};}
  function startFishing(){if(engine.mode!=='explore')return;engine.mode='fish';engine.fish={phase:'walk',power:0,t:0,biteAt:1.2+Math.random()*1.4,tension:0.5,fishPos:0.5,progress:0};toast('Walking to the dock...');engine.ui.classList.remove('hidden');}
  function onPointerDown(ev){if(!engine.running)return;engine.mouseDown=true;if(engine.mode==='explore'){var p=screenToWorld(ev);if(canStand(p.x,p.y)){engine.target=p;}else {var h=nearestHotspot(p.x,p.y);if(h&&h.type==='fish')startFishing();}}else if(engine.fish&&engine.fish.phase==='bite'){engine.fish.phase='reel';engine.fish.t=0;engine.fish.tension=0.5;engine.fish.progress=0;showFishing('Reel! Hold/release to follow the fish.','Keep tension near the marker');}}
  function onPointerUp(){engine.mouseDown=false;if(engine.mode==='fish'&&engine.fish&&engine.fish.phase==='aim'){castLine();}}
  function onKey(e){if(!engine.running)return;var down=e.type==='keydown';engine.keys[e.code]=down;if(down&&(e.code==='Escape')){if(engine.mode==='fish')endFishing();else stop();}if(down&&(e.code==='KeyE')){if(Math.hypot(engine.state.x-DOCK_SPOT.x,engine.state.y-DOCK_SPOT.y)<120)startFishing();}if(down&&e.code==='Space'){if(engine.mode==='explore'&&Math.hypot(engine.state.x-DOCK_SPOT.x,engine.state.y-DOCK_SPOT.y)<120)startFishing();else if(engine.mode==='fish'&&engine.fish&&engine.fish.phase==='bite'){engine.fish.phase='reel';engine.fish.t=0;engine.fish.tension=0.5;engine.fish.progress=0;showFishing('Reel! Hold/release to follow the fish.','Keep tension near the marker');}}if(!down&&e.code==='Space'){if(engine.mode==='fish'&&engine.fish&&engine.fish.phase==='aim')castLine();}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyS','KeyD','KeyE'].indexOf(e.code)>=0)e.preventDefault();}
  function castLine(){var f=engine.fish;if(!f||f.phase!=='aim')return;f.phase='wait';f.t=0;f.biteAt=1.2+Math.random()*1.6;showFishing('Cast placed. Watch the float.','Wait for movement');toast('The bobber lands with a soft glow.');}
  function catchFish(){var names=['Moonlit Minnow','Blackwater Glowfin','Whisper Koi'];var n=names[Math.floor(Math.random()*names.length)];toast('Caught '+n+'!');showFishing('Caught '+n+'!','Press Esc to close or cast again soon.');setTimeout(endFishing,1200);}
  function endFishing(){engine.mode='explore';engine.fish=null;engine.ui.classList.add('hidden');document.getElementById('swBobber').classList.add('hidden');document.getElementById('swLine').classList.add('hidden');}
  function showFishing(text,hint){document.getElementById('swFishText').textContent=text;document.getElementById('swFishHint').textContent=hint;}
  function pulseBobber(){var b=document.getElementById('swBobber');b.classList.remove('bite');void b.offsetWidth;b.classList.add('bite');}
  function toast(t){var el=document.getElementById('swToast');if(!el)return;el.textContent=t;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
  function nearestHotspot(x,y){var best=null,bd=9999;HOTSPOTS.forEach(function(h){var d=Math.hypot(x-h.x,y-h.y);if(d<h.r&&d<bd){best=h;bd=d;}});return best;}
  function canStand(x,y){if(x<0||y<0||x>MAP_W||y>MAP_H)return false;var inside=WALK_AREAS.some(function(poly){return pointInPoly(x,y,poly);});if(!inside)return false;for(var i=0;i<SOFT_BLOCKS.length;i++){var b=SOFT_BLOCKS[i];if(Math.hypot(x-b.x,y-b.y)<b.r)return false;}return true;}
  function pointInPoly(x,y,poly){var inside=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++){var xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];var intersect=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi);if(intersect)inside=!inside;}return inside;}
  function makeFireflies(){if(!engine.fx)return;engine.fx.innerHTML='';var spots=[[370,380],[430,500],[1140,290],[1230,585],[270,740],[860,350],[620,240]];for(var i=0;i<42;i++){var s=spots[i%spots.length];var f=document.createElement('i');f.style.left=(s[0]+(Math.random()*180-90))+'px';f.style.top=(s[1]+(Math.random()*140-70))+'px';f.style.animationDelay=(-Math.random()*7)+'s';f.style.animationDuration=(4+Math.random()*5)+'s';engine.fx.appendChild(f);}}
  function makeMotes(){var m=document.getElementById('swMotes');if(!m)return;m.innerHTML='';for(var i=0;i<70;i++){var e=document.createElement('i');e.style.left=(Math.random()*MAP_W)+'px';e.style.top=(Math.random()*MAP_H)+'px';e.style.animationDelay=(-Math.random()*12)+'s';e.style.animationDuration=(8+Math.random()*10)+'s';m.appendChild(e);}}

  function injectStyles(){if(document.getElementById('gfWorldEngineStyles'))return;var s=document.createElement('style');s.id='gfWorldEngineStyles';s.textContent=`
.swRoot{position:fixed;inset:0;z-index:100000;background:#02060b;color:#f7e7bf;font-family:Georgia,'Times New Roman',serif}.swRoot.hidden{display:none}.swViewport{position:absolute;inset:0;overflow:hidden;background:#02060b}.swWorld{position:absolute;left:0;top:0;width:${MAP_W}px;height:${MAP_H}px;transform-origin:0 0}.swBg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;user-select:none;pointer-events:none}.swWaterGlow{position:absolute;left:640px;top:340px;width:760px;height:520px;border-radius:45%;background:radial-gradient(circle,rgba(36,170,255,.20),transparent 65%);mix-blend-mode:screen;animation:swWater 3.4s ease-in-out infinite;pointer-events:none}.swMist{position:absolute;left:840px;top:100px;width:420px;height:210px;background:radial-gradient(ellipse,rgba(95,180,255,.22),transparent 65%);filter:blur(12px);animation:swMist 5s ease-in-out infinite}.swCanopy{position:absolute;inset:0;background:radial-gradient(ellipse at 8% 93%,rgba(0,0,0,.72),transparent 20%),radial-gradient(ellipse at 92% 95%,rgba(0,0,0,.58),transparent 24%),radial-gradient(ellipse at 40% 4%,rgba(0,0,0,.55),transparent 20%);pointer-events:none;mix-blend-mode:multiply}.swPlayer{position:absolute;width:118px;height:154px;margin-left:-59px;margin-top:-122px;filter:drop-shadow(0 12px 10px rgba(0,0,0,.52));transition:filter .12s linear}.swSprite{width:118px;height:154px;background-repeat:no-repeat;image-rendering:auto}.swShadow{position:absolute;width:62px;height:22px;margin-left:-31px;margin-top:-9px;border-radius:50%;background:rgba(0,0,0,.38);filter:blur(4px);pointer-events:none}.swHotspot{position:absolute;border-radius:50%;pointer-events:none}.swHotspot.dock{left:630px;top:575px;width:145px;height:110px;background:radial-gradient(ellipse,rgba(61,184,255,.24),rgba(61,184,255,.05) 45%,transparent 70%);animation:swPulse 2s ease-in-out infinite}.swHotspot.path{left:135px;top:215px;width:100px;height:120px;background:radial-gradient(ellipse,rgba(255,207,102,.15),transparent 65%)}.swBobber{position:absolute;width:20px;height:20px;margin-left:-10px;margin-top:-10px;border-radius:50%;background:#f04d66;box-shadow:0 0 14px #9df,0 0 0 10px rgba(63,190,255,.15);z-index:800}.swBobber.hidden,.swLine.hidden{display:none}.swBobber:after{content:'';position:absolute;left:-26px;top:-26px;width:72px;height:72px;border:2px solid rgba(140,220,255,.58);border-radius:50%;animation:swRipple 1.4s linear infinite}.swBobber.bite{animation:swBite .22s linear 5}.swLine{position:absolute;height:2px;background:linear-gradient(90deg,rgba(255,241,199,.92),rgba(160,220,255,.45));transform-origin:0 50%;z-index:790;pointer-events:none}.swFireflies i{position:absolute;width:6px;height:6px;border-radius:50%;background:#fbff9d;box-shadow:0 0 14px #eaff77,0 0 24px rgba(114,213,255,.35);animation:swFly 7s ease-in-out infinite;pointer-events:none}.swMotes i{position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(114,196,255,.65);box-shadow:0 0 8px rgba(114,196,255,.7);animation:swMote 12s linear infinite;pointer-events:none}.swHud{position:absolute;inset:0;pointer-events:none}.swHud button{pointer-events:auto}.swStatus{position:absolute;left:24px;top:20px;display:flex;gap:12px;align-items:center;padding:8px 14px;border:1px solid rgba(218,169,83,.65);border-radius:18px;background:linear-gradient(180deg,rgba(8,12,18,.72),rgba(8,12,18,.34));box-shadow:0 12px 30px rgba(0,0,0,.45)}.portrait{width:58px;height:58px;border-radius:50%;background:radial-gradient(circle,#704323,#1b1110);border:2px solid #d7a857}.bar{width:150px;height:14px;border-radius:999px;background:#160d0b;border:1px solid #d7a857;margin:5px 0;overflow:hidden}.bar span{display:block;height:100%;width:100%}.bar.hp span{background:linear-gradient(90deg,#a82931,#e66b5e)}.bar.sp span{width:72%;background:linear-gradient(90deg,#2465b8,#66c5f0)}.swTitle{position:absolute;left:50%;top:24px;transform:translateX(-50%);font-size:30px;font-weight:800;text-shadow:0 3px 10px #000}.swTitle span{color:#d8b56b;margin:0 8px}.swClose{position:absolute;right:22px;top:20px;background:rgba(0,0,0,.45);color:#f5d99a;border:1px solid #d7a857;border-radius:999px;padding:8px 14px;font-weight:bold}.swQuest{position:absolute;right:32px;top:178px;width:300px;padding:16px 18px;border:1px solid rgba(218,169,83,.8);border-radius:10px;background:rgba(7,8,12,.72);box-shadow:0 14px 40px rgba(0,0,0,.55)}.swQuest b{color:#ffe28a}.swQuest p{margin:8px 0 0;color:#f6e5c3;line-height:1.35}.swToast{position:absolute;left:50%;bottom:118px;transform:translateX(-50%);padding:10px 16px;border-radius:999px;background:rgba(3,6,10,.65);border:1px solid rgba(218,169,83,.55);opacity:.0;transition:.25s;box-shadow:0 12px 30px rgba(0,0,0,.45)}.swToast.show{opacity:1}.swHotbar{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);display:flex;gap:6px;padding:8px;border:1px solid rgba(218,169,83,.7);border-radius:14px;background:rgba(6,7,10,.68)}.swHotbar button{width:58px;height:58px;background:rgba(24,20,16,.85);color:#ffe9bd;border:1px solid rgba(218,169,83,.75);border-radius:8px;font-weight:bold}.swHotbar span{font-size:24px}.swFishing{position:absolute;right:32px;bottom:100px;width:360px;padding:18px 20px;border:1px solid rgba(218,169,83,.9);border-radius:14px;background:rgba(7,8,12,.76);box-shadow:0 16px 45px rgba(0,0,0,.62)}.swFishing.hidden{display:none}.swFishing h3{text-align:center;margin:0 0 10px;font-size:25px}.swFishing p{margin:0 0 12px;text-align:center}.swFishing small{display:block;text-align:center;margin-top:8px;color:#ffefbf}.swCastBar{position:relative;height:20px;border-radius:999px;background:linear-gradient(90deg,#65b846,#f6d452,#bd3d2e);border:2px solid #d7a857;overflow:hidden}.swCastBar i{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(255,255,255,.25)}.swCastBar em{position:absolute;top:-5px;width:5px;height:30px;background:#fff;border-radius:3px;box-shadow:0 0 9px #fff}.swNearDock .swHotspot.dock{box-shadow:0 0 22px rgba(111,213,255,.75)}@keyframes swWater{50%{opacity:.62;transform:scale(1.03)}}@keyframes swMist{50%{opacity:.5;transform:translateY(8px)}}@keyframes swPulse{50%{opacity:.35;transform:scale(1.04)}}@keyframes swRipple{to{transform:scale(1.9);opacity:0}}@keyframes swBite{50%{transform:translateY(-12px) scale(1.15)}}@keyframes swFly{50%{transform:translate(28px,-22px);opacity:.45}}@keyframes swMote{to{transform:translateY(-120px);opacity:0}}
`;document.head.appendChild(s);}

  window.PetWorldWorldEngine={start:start,stop:stop};
})();
