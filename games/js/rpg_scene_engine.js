(function(){
'use strict';

const ASSET_BASE='/assets/worldkit/';
const SPRITE_BASE='/assets/sprites/';
const SCENE_URL='/assets/worlds/whisperwind_village.json';
const CLAIM_API='/api/estate/neighborhoods/whisperwind_01/claim';
const STATE_API='/api/estate/neighborhoods/whisperwind_01';

const state={
  canvas:null,ctx:null,dpr:1,root:null,scene:null,assets:{},running:false,last:0,time:0,
  cam:{x:0,y:0},keys:{},username:'Wanderer',near:null,dialog:null,toast:null,
  player:{x:0,y:0,face:'down',moving:false,vx:0,vy:0,animTime:0,stepFrame:0,appearance:null},
  remote:new Map(),ws:null,worldId:null,plots:{},
  interactionCooldown:0
};

const DIR_ROWS={
  idle_down:0, idle_up:1, idle_left:2, idle_right:3,
  walk_down:4, walk_up:5, walk_left:6, walk_right:7,
  interact_down:8, interact_up:9, interact_left:10, interact_right:11
};

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(a,b,c,d){return Math.hypot(a-c,b-d);}
function safeName(n){return String(n||'Wanderer').slice(0,18);}
function assetUrl(name){if(!name)return ''; if(name.startsWith('/'))return name; return ASSET_BASE+name;}
function spriteUrl(name){if(!name)return ''; if(name.startsWith('/'))return name; return SPRITE_BASE+name;}
function loadImage(url){return new Promise((resolve)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=url;});}
function rectsOverlap(a,b){return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;}
function pointInRect(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;}
function pointInPoly(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];const inter=((yi>p[1])!=(yj>p[1]))&&(p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi);if(inter)inside=!inside;}return inside;}
function normalizeAngle(a){while(a<0)a+=Math.PI*2;while(a>Math.PI*2)a-=Math.PI*2;return a;}

async function preload(scene){
  const names=new Set();
  [...(scene.objects||[]),...(scene.decorations||[]),...(scene.foreground||[])].forEach(o=>{if(o.asset)names.add(assetUrl(o.asset));});
  (scene.npcs||[]).forEach(n=>{if(n.asset)names.add(spriteUrl(n.asset));});
  const pAsset=(scene.player&&scene.player.asset)||'/assets/sprites/forger_avatar.png';
  // Layered avatars are drawn procedurally for now so clothing can change without a baked sheet.
  // Keep preloading a fallback image for legacy scenes/NPC sheets.
  names.add(spriteUrl(pAsset));
  await Promise.all([...names].map(async u=>{state.assets[u]=await loadImage(u);}));
}

function resize(){
  const c=state.canvas;if(!c)return;
  state.dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const w=c.clientWidth,h=c.clientHeight;
  c.width=Math.floor(w*state.dpr);c.height=Math.floor(h*state.dpr);
  state.ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
}

function mount(){
  const root=document.createElement('div');root.className='gfRpgRoot';state.root=root;
  root.innerHTML=`
    <canvas id="gfRpgCanvas"></canvas>
    <div class="gfAreaTitle" id="gfAreaTitle"><b>Whisperwind Village</b><span>RPG scene engine v3</span></div>
    <button class="gfLeave" id="gfLeave">Leave</button>
    <div class="gfPrompt hidden" id="gfPrompt"></div>
    <div class="gfQuest" id="gfQuest"><button title="Close" id="gfQuestClose">×</button><b>Welcome to Whisperwind</b><p>Walk with <b>WASD</b> or arrows. Press <b>E</b> near doors, signs, NPCs, plots, and docks.</p></div>
    <div class="gfDialog hidden" id="gfDialog"><button id="gfDialogClose">×</button><div id="gfDialogText"></div></div>
    <div class="gfMiniMap" id="gfMiniMap"><div class="gfMiniTitle">Map</div><canvas id="gfMiniCanvas" width="180" height="120"></canvas></div>
    <div class="gfChat"><span>Press Enter to chat later.</span></div>
    <div class="gfHotbar"><button>Bag</button><button>Build</button><button>Map</button></div>`;
  document.body.appendChild(root);
  state.canvas=root.querySelector('#gfRpgCanvas');state.ctx=state.canvas.getContext('2d');
  root.querySelector('#gfLeave').onclick=()=>stop();
  root.querySelector('#gfQuestClose').onclick=()=>root.querySelector('#gfQuest').classList.add('hidden');
  root.querySelector('#gfDialogClose').onclick=closeDialog;
  window.addEventListener('resize',resize);resize();
  window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKey,true);
}

async function start(opts){
  opts=opts||{};state.username=safeName(opts.username||localStorage.getItem('gf_user')||'Wanderer');state.onClose=opts.onClose||null;
  if(!state.canvas)mount();
  const scene=await fetch(SCENE_URL+'?v='+Date.now(),{cache:'no-store'}).then(r=>r.json());state.scene=scene;
  if(document.getElementById('gfAreaTitle')){document.querySelector('#gfAreaTitle b').textContent=scene.name||'Whisperwind Village';document.querySelector('#gfAreaTitle span').textContent=scene.descriptionShort||'Scrollable RPG town scene';}
  await preload(scene);await fetchEstateState();
  state.player={x:scene.spawn.x,y:scene.spawn.y,face:scene.spawn.face||'down',moving:false,vx:0,vy:0,animTime:0,stepFrame:0,appearance:getLocalAppearance()};
  state.cam.x=state.player.x-window.innerWidth/2;state.cam.y=state.player.y-window.innerHeight/2;
  connectWS();state.running=true;state.last=performance.now();requestAnimationFrame(loop);
}

function stop(){state.running=false;try{if(state.ws)state.ws.send(JSON.stringify({type:'worldLeave'}));}catch(e){} if(state.onClose)state.onClose();}

async function fetchEstateState(){
  try{const j=await fetch(STATE_API,{cache:'no-store'}).then(r=>r.json()); if(j&&j.ok&&j.neighborhood){(j.neighborhood.plots||[]).forEach(p=>state.plots[p.id]=p);}}
  catch(e){state.plots={};}
}

async function claimPlot(plotId){
  if(!plotId)return;
  try{
    const j=await fetch(CLAIM_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:state.username,plotId})}).then(r=>r.json());
    if(j.ok){await fetchEstateState();openDialog('Plot claimed! This plot is now wired for a house exterior, a door, and later an editable interior.');}
    else openDialog(j.error||'That plot could not be claimed.');
  }catch(e){openDialog('Claim service is not available yet, but the plot interaction is wired.');}
}

function onKey(e){
  const down=e.type==='keydown'; const k=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){state.keys[k]=down;e.preventDefault();}
  if(down&&(k==='e'||e.key===' ')){if(state.dialog)closeDialog();else interact();e.preventDefault();}
  if(down&&k==='escape')closeDialog();
}

function interact(){
  const n=state.near;if(!n)return;
  const target=n.target;
  if(target.kind==='npc'){openDialog((target.name?target.name+':\n':'')+(target.dialogue||[]).join('\n\n'));return;}
  if(target.kind==='plot'){claimPlot(target.plotId);return;}
  if(target.kind==='portal'){openDialog(target.message||'A scene transition will connect here.');return;}
  openDialog(target.message||target.label||'Nothing happens yet.');
}
function openDialog(text){state.dialog=text;const d=document.getElementById('gfDialog');document.getElementById('gfDialogText').textContent=text;d.classList.remove('hidden');}
function closeDialog(){state.dialog=null;const d=document.getElementById('gfDialog');if(d)d.classList.add('hidden');}

function update(dt){
  state.time+=dt;
  const p=state.player;let dx=0,dy=0;
  if(state.keys.w||state.keys.arrowup)dy-=1;if(state.keys.s||state.keys.arrowdown)dy+=1;if(state.keys.a||state.keys.arrowleft)dx-=1;if(state.keys.d||state.keys.arrowright)dx+=1;
  if(dx||dy){const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;p.face=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');}
  const sp=(state.scene.player&&state.scene.player.speed)||215;const nx=p.x+dx*sp*dt,ny=p.y+dy*sp*dt;
  p.moving=!!(dx||dy);p.animTime+=dt;
  if(p.moving){
    // axis-separated collision feels better around buildings/fences than all-or-nothing movement.
    if(canStand(nx,p.y))p.x=nx;
    if(canStand(p.x,ny))p.y=ny;
    sendMove();
  }
  const vw=state.canvas.clientWidth,vh=state.canvas.clientHeight,sw=state.scene.size.w,sh=state.scene.size.h;
  const tx=clamp(p.x-vw/2,0,Math.max(0,sw-vw));const ty=clamp(p.y-vh/2,0,Math.max(0,sh-vh));
  const s=(state.scene.camera&&state.scene.camera.smoothing)||0.10;state.cam.x+= (tx-state.cam.x)*s;state.cam.y+=(ty-state.cam.y)*s;
  findNear();
}

function canStand(x,y){
  if(x<30||y<30||x>state.scene.size.w-30||y>state.scene.size.h-30)return false;
  for(const w of state.scene.water||[]){if(pointInPoly([x,y],w.points))return false;}
  const all=[...(state.scene.objects||[]),...(state.scene.decorations||[])];
  for(const o of all){if(!o.solid)continue;const s=o.solid; if(x>o.x+s.x&&x<o.x+s.x+s.w&&y>o.y+s.y&&y<o.y+s.y+s.h)return false;}
  return true;
}

function findNear(){
  const p=state.player;let best=null;
  function test(kind,obj,label,msg,r){const d=dist(p.x,p.y,obj.x,obj.y);if(d<(r||105)&&(!best||d<best.d))best={d,target:{kind,label,message:msg,obj}};}
  for(const n of state.scene.npcs||[]){test('npc',n,(n.interact&&n.interact.label)||('Talk to '+n.name),null,(n.interact&&n.interact.radius)||110); if(best&&best.target.obj===n){best.target.name=n.name;best.target.dialogue=n.dialogue;}}
  for(const o of state.scene.objects||[]){if(!o.interact)continue;const it=o.interact;test(it.kind||'inspect',o,it.label,it.message,it.radius||120);if(best&&best.target.obj===o&&it.plotId){best.target.plotId=it.plotId;}}
  for(const po of state.scene.portals||[]){test('portal',po,po.label,po.message,po.radius||150);}
  state.near=best;
  const prompt=document.getElementById('gfPrompt');
  if(best){prompt.textContent='[E] '+best.target.label;prompt.classList.remove('hidden');}
  else prompt.classList.add('hidden');
}

function loop(now){if(!state.running)return;const dt=Math.min(0.035,(now-state.last)/1000||0.016);state.last=now;update(dt);draw(now);requestAnimationFrame(loop);}

function draw(now){
  const ctx=state.ctx,c=state.canvas,vw=c.clientWidth,vh=c.clientHeight,cam=state.cam;ctx.clearRect(0,0,vw,vh);ctx.save();ctx.translate(-cam.x,-cam.y);
  drawGround(ctx);drawWater(ctx);drawPaths(ctx);drawPlots(ctx);
  // object/entity depth sorting. Anything with a larger y draws later, giving FF-style walk-behind depth.
  const ents=[];
  [...(state.scene.decorations||[]),...(state.scene.objects||[])].forEach(o=>ents.push({y:o.depthY||o.y,type:'obj',o}));
  (state.scene.npcs||[]).forEach(n=>ents.push({y:n.y,type:'npc',o:n}));
  state.remote.forEach(r=>ents.push({y:r.y,type:'remote',o:r}));
  ents.push({y:state.player.y,type:'player',o:state.player});
  ents.sort((a,b)=>a.y-b.y);
  for(const e of ents){
    if(e.type==='obj')drawAssetObj(ctx,e.o);
    else if(e.type==='npc')drawNpc(ctx,e.o);
    else if(e.type==='remote')drawAvatar(ctx,e.o.x,e.o.y,e.o.username||'Player',e.o.face||'down',!!e.o.moving,.46,true,e.o.animTime||state.time,null,e.o.appearance);
    else drawAvatar(ctx,state.player.x,state.player.y,state.username,state.player.face,state.player.moving,(state.scene.player&&state.scene.player.scale)||0.45,false,state.player.animTime,null,state.player.appearance);
  }
  drawForeground(ctx);
  ctx.restore();
  drawMiniMap();
}

function drawGround(ctx){
  const sc=state.scene;
  ctx.fillStyle='#406f35';ctx.fillRect(0,0,sc.size.w,sc.size.h);
  for(let x=0;x<sc.size.w;x+=64){for(let y=0;y<sc.size.h;y+=64){
    const n=((x*53+y*29+(sc.ground&&sc.ground.seed||7)*97)%101)/100;
    ctx.fillStyle=n>.62?'#5f9b42':(n>.30?'#4f843b':'#3b6b34');
    ctx.fillRect(x,y,66,66);
  }}
  // shaded edges to create the feeling of dense town foliage beyond the walkable center.
  const edge=ctx.createRadialGradient(sc.size.w/2,sc.size.h/2,700,sc.size.w/2,sc.size.h/2,Math.max(sc.size.w,sc.size.h)*.65);
  edge.addColorStop(0,'rgba(0,0,0,0)');edge.addColorStop(.72,'rgba(0,0,0,.06)');edge.addColorStop(1,'rgba(0,0,0,.28)');
  ctx.fillStyle=edge;ctx.fillRect(0,0,sc.size.w,sc.size.h);
  ctx.save();ctx.globalAlpha=.32;
  for(let i=0;i<1600;i++){
    const x=(i*181)%sc.size.w,y=(i*313)%sc.size.h; const r=(i*37)%100;
    ctx.fillStyle=r>84?'#f6e890':(r>70?'#f5b5d7':(r>55?'#c9e9ff':'#9bd070'));
    ctx.fillRect(x,y,2+(i%3),2+(i%2));
  }
  ctx.restore();
}

function drawWater(ctx){
  for(const w of state.scene.water||[]){
    ctx.beginPath();w.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
    const g=ctx.createLinearGradient(0,0,0,state.scene.size.h);g.addColorStop(0,'#2b99bd');g.addColorStop(1,'#0b4a73');ctx.fillStyle=g;ctx.fill();
    ctx.save();ctx.clip();
    ctx.globalAlpha=.18;ctx.strokeStyle='#d7fbff';ctx.lineWidth=3;
    for(let i=0;i<18;i++){ctx.beginPath();const y=(state.time*25+i*135)%state.scene.size.h;ctx.moveTo(0,y);for(let x=0;x<state.scene.size.w;x+=120){ctx.quadraticCurveTo(x+60,y+Math.sin(x*.01+i)*18,x+120,y);}ctx.stroke();}
    ctx.restore();
    ctx.strokeStyle='rgba(171,237,255,.45)';ctx.lineWidth=5;ctx.stroke();
  }
}

function drawPaths(ctx){
  ctx.lineCap='round';ctx.lineJoin='round';
  for(const p of state.scene.paths||[]){
    ctx.strokeStyle='#5f4b2f';ctx.lineWidth=p.width+42;strokePath(ctx,p.points);
    ctx.strokeStyle='#8d7548';ctx.lineWidth=p.width+24;strokePath(ctx,p.points);
    ctx.strokeStyle='#c6aa70';ctx.lineWidth=p.width;strokePath(ctx,p.points);
    drawCobblePath(ctx,p.points,p.width);
    ctx.strokeStyle='rgba(255,241,185,.20)';ctx.lineWidth=5;strokePath(ctx,p.points);
  }
}
function drawCobblePath(ctx,pts,width){
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i],b=pts[i+1]; const dx=b[0]-a[0],dy=b[1]-a[1]; const len=Math.hypot(dx,dy)||1; const nx=-dy/len,ny=dx/len;
    const steps=Math.max(4,Math.floor(len/34));
    for(let j=0;j<steps;j++){
      const t=(j+.5)/steps; const cx=a[0]+dx*t, cy=a[1]+dy*t;
      for(let k=-2;k<=2;k++){
        if(Math.abs(k)===2 && j%2) continue;
        const off=k*(width/6)+(((i+j+k)*17)%13-6);
        const x=cx+nx*off, y=cy+ny*off;
        ctx.fillStyle=((i+j+k)%3===0)?'rgba(112,92,58,.30)':'rgba(255,239,190,.18)';
        ctx.beginPath();ctx.ellipse(x,y,10+(j%3)*2,5+(k&1),0,0,Math.PI*2);ctx.fill();
      }
    }
  }
}
function strokePath(ctx,pts){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();}

function drawPlots(ctx){
  for(const pl of state.scene.plots||[]){
    const live=state.plots[pl.id]||pl;ctx.save();
    ctx.fillStyle=live.owner?'rgba(72,130,86,.22)':(live.status==='empty'?'rgba(86,74,47,.18)':'rgba(93,129,64,.22)');
    roundRect(ctx,pl.x,pl.y,pl.w,pl.h,26,true,false);
    ctx.setLineDash([22,14]);ctx.lineWidth=4;
    ctx.strokeStyle=live.owner?'rgba(142,221,255,.70)':(live.status==='empty'?'rgba(255,255,255,.20)':'rgba(255,255,255,.60)');
    roundRect(ctx,pl.x,pl.y,pl.w,pl.h,26,false,true);ctx.setLineDash([]);
    ctx.fillStyle='rgba(84,55,32,.72)';
    for(let x=pl.x+18;x<pl.x+pl.w;x+=68){ctx.fillRect(x,pl.y-4,10,22);ctx.fillRect(x,pl.y+pl.h-14,10,22);}
    for(let y=pl.y+18;y<pl.y+pl.h;y+=68){ctx.fillRect(pl.x-4,y,22,10);ctx.fillRect(pl.x+pl.w-14,y,22,10);}
    if(live.owner){drawLabel(ctx,pl.x+pl.w/2,pl.y+pl.h/2,live.owner+'\'s Plot','#d8f9ff');}
    ctx.restore();
  }
}

function drawAssetObj(ctx,o){
  const img=state.assets[assetUrl(o.asset)]; if(!img)return;
  ctx.drawImage(img,o.x-o.w/2,o.y-o.h,o.w,o.h);
}
function drawForeground(ctx){
  // Reserved for roof/tree canopies that should always cover players. Scene supports foreground[] later.
  for(const o of state.scene.foreground||[])drawAssetObj(ctx,o);
}
function drawNpc(ctx,n){drawAvatar(ctx,n.x,n.y,n.name||'NPC',n.face||'down',false,.43,true,state.time,n.asset,n.appearance||{hair:'black',outfit:'forest',cloak:'blue',pack:'none'});}

function animationKey(face,moving){return (moving?'walk_':'idle_')+(face||'down');}
function getFrame(img,key,animTime){
  const fw=128,fh=128; const row=DIR_ROWS[key]||0; const cols=6;
  const count=key.startsWith('idle')?4:6; const fps=key.startsWith('idle')?2.5:8;
  const frame=Math.floor(animTime*fps)%count;
  return {sx:frame*fw, sy:row*fh, sw:fw, sh:fh};
}

const DEFAULT_APPEARANCE={
  body:'warm', hair:'brown_messy', outfit:'forger_tunic', cloak:'travel_cloak', pack:'small_pack', accessory:'forge_charm', skin:'#d99a63'
};
const PALETTES={
  skin:{warm:'#d99a63', light:'#f0bd82', tan:'#b77a4e', deep:'#7a4a34'},
  hair:{brown_messy:'#51321d', auburn:'#8a4d2c', black:'#24202a', blond:'#d8aa54'},
  outfit:{forger_tunic:'#2f6f78', forest:'#3f7145', champion:'#81313d', tide:'#2e6fa8'},
  cloak:{travel_cloak:'#7a5130', blue:'#245977', green:'#415d38', none:'transparent'},
  pack:{small_pack:'#6c4a2c', satchel:'#8a6036', none:'transparent'}
};
function getLocalAppearance(){
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem('gf_avatar_appearance')||'null');}catch(e){}
  return Object.assign({},DEFAULT_APPEARANCE,saved||{});
}
function appearancePayload(){
  const a=state.player&&state.player.appearance?state.player.appearance:getLocalAppearance();
  return Object.assign({},DEFAULT_APPEARANCE,a||{});
}
function pal(group,key){const g=PALETTES[group]||{};return g[key]||key||Object.values(g)[0]||'#fff';}
function animPhase(moving,animTime){return moving?Math.sin((animTime||0)*Math.PI*8):Math.sin((animTime||0)*Math.PI*1.8)*.22;}
function drawAvatar(ctx,x,y,name,face,moving,scale,muted,animTime,assetName,appearance){
  // The old renderer sliced one baked sheet. That made clothing impossible and broke when generated sheets were imperfect.
  // This layered renderer draws a stable avatar from body/hair/outfit/cloak/pack parts. Later each layer can become a real sheet.
  const scenePlayer=state.scene.player||{};
  const a=Object.assign({},DEFAULT_APPEARANCE,appearance||{});
  scale=scale||scenePlayer.scale||0.43;
  const unit=(scenePlayer.avatarUnit||92)*scale;
  const facing=face||'down';
  const side=facing==='left'||facing==='right';
  const up=facing==='up';
  const phase=animPhase(moving,animTime);
  const bob=moving?Math.abs(phase)*3*scale:Math.sin((animTime||0)*2)*.7*scale;
  const legSwing=moving?phase*7*scale:0;
  const armSwing=moving?-phase*6*scale:0;
  const flip=facing==='left'?-1:1;
  ctx.save();
  ctx.globalAlpha=muted?.95:1;
  ctx.translate(x,y);
  ctx.scale(flip,1);
  ctx.fillStyle='rgba(0,0,0,.23)';ctx.beginPath();ctx.ellipse(0,-4,unit*.30,7*scale,0,0,Math.PI*2);ctx.fill();
  ctx.translate(0,-bob);
  drawLayeredForger(ctx,a,{scale,unit,side,up,legSwing,armSwing,facing});
  ctx.restore();
  drawLabel(ctx,x,y-unit-14*scale,name,muted?'#eafff4':'#ffec75');
}
function drawLayeredForger(ctx,a,opt){
  const s=opt.scale,u=opt.unit,side=opt.side,up=opt.up;
  const skin=pal('skin',a.skin||a.body), hair=pal('hair',a.hair), outfit=pal('outfit',a.outfit), cloak=pal('cloak',a.cloak), pack=pal('pack',a.pack);
  const outline='rgba(35,24,19,.92)';
  ctx.lineJoin='round';ctx.lineCap='round';
  // Feet/legs
  const lx=side?-5*s:-11*s, rx=side?6*s:11*s;
  drawRound(ctx,lx+opt.legSwing*.25,-18*s,9*s,26*s,5*s,'#3a2b21',outline);
  drawRound(ctx,rx-opt.legSwing*.25,-18*s,9*s,26*s,5*s,'#3a2b21',outline);
  drawRound(ctx,lx+opt.legSwing*.35,2*s,13*s,7*s,4*s,'#2b211b',outline);
  drawRound(ctx,rx-opt.legSwing*.35,2*s,13*s,7*s,4*s,'#2b211b',outline);
  // Cloak behind body / backpack. Hide pack when facing front? show sides and back.
  if(cloak!=='transparent'){
    ctx.fillStyle=cloak;ctx.strokeStyle=outline;ctx.lineWidth=3*s;ctx.beginPath();
    if(up){ctx.moveTo(-23*s,-68*s);ctx.quadraticCurveTo(0,-76*s,23*s,-68*s);ctx.lineTo(27*s,-18*s);ctx.quadraticCurveTo(0,-4*s,-27*s,-18*s);}
    else if(side){ctx.moveTo(-13*s,-66*s);ctx.quadraticCurveTo(7*s,-68*s,19*s,-54*s);ctx.lineTo(18*s,-12*s);ctx.quadraticCurveTo(-2*s,-7*s,-18*s,-14*s);}
    else{ctx.moveTo(-24*s,-64*s);ctx.quadraticCurveTo(0,-72*s,24*s,-64*s);ctx.lineTo(21*s,-17*s);ctx.quadraticCurveTo(0,-4*s,-21*s,-17*s);}
    ctx.closePath();ctx.fill();ctx.stroke();
  }
  if(pack!=='transparent'&&(up||side))drawRound(ctx,side?12*s:0,-50*s,22*s,28*s,7*s,pack,outline);
  // Body tunic
  drawRound(ctx,0,-43*s,34*s,38*s,10*s,outfit,outline);
  ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(-10*s,-55*s,20*s,4*s);
  // Arms
  drawRound(ctx,-25*s+(side?8*s:0),-40*s+opt.armSwing*.15,10*s,30*s,6*s,outfit,outline);
  drawRound(ctx,25*s-(side?8*s:0),-40*s-opt.armSwing*.15,10*s,30*s,6*s,outfit,outline);
  drawRound(ctx,-25*s+(side?8*s:0),-13*s+opt.armSwing*.2,8*s,8*s,5*s,skin,outline);
  drawRound(ctx,25*s-(side?8*s:0),-13*s-opt.armSwing*.2,8*s,8*s,5*s,skin,outline);
  // Neck and head
  drawRound(ctx,0,-69*s,12*s,14*s,5*s,skin,outline);
  drawHead(ctx,skin,hair,outline,s,side,up);
  // Outfit details
  ctx.strokeStyle='#d1ad67';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(-9*s,-56*s);ctx.lineTo(5*s,-36*s);ctx.lineTo(-4*s,-15*s);ctx.stroke();
  if(a.accessory==='forge_charm'){
    ctx.fillStyle='#6ce7ff';ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=1.5*s;ctx.beginPath();ctx.arc(side?10*s:0,-39*s,3.4*s,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
}
function drawHead(ctx,skin,hair,outline,s,side,up){
  drawRound(ctx,0,-84*s,32*s,30*s,12*s,skin,outline);
  ctx.fillStyle=hair;ctx.strokeStyle=outline;ctx.lineWidth=2.4*s;ctx.beginPath();
  if(up){ctx.ellipse(0,-91*s,19*s,13*s,0,0,Math.PI*2);}
  else if(side){ctx.moveTo(-16*s,-91*s);ctx.quadraticCurveTo(-2*s,-104*s,17*s,-91*s);ctx.quadraticCurveTo(13*s,-82*s,4*s,-78*s);ctx.quadraticCurveTo(-4*s,-84*s,-16*s,-82*s);}
  else{ctx.moveTo(-17*s,-90*s);ctx.quadraticCurveTo(-8*s,-105*s,8*s,-99*s);ctx.quadraticCurveTo(18*s,-97*s,16*s,-82*s);ctx.quadraticCurveTo(5*s,-86*s,-2*s,-80*s);ctx.quadraticCurveTo(-9*s,-86*s,-17*s,-82*s);}
  ctx.closePath();ctx.fill();ctx.stroke();
  if(!up){
    ctx.fillStyle='#1c1715';
    if(side){ctx.beginPath();ctx.arc(7*s,-83*s,2*s,0,Math.PI*2);ctx.fill();}
    else{ctx.beginPath();ctx.arc(-6*s,-83*s,1.8*s,0,Math.PI*2);ctx.arc(6*s,-83*s,1.8*s,0,Math.PI*2);ctx.fill();}
  }
}
function drawRound(ctx,cx,cy,w,h,r,fill,stroke){
  ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(1.2,2.5*(state.scene&&state.scene.player?state.scene.player.scale||.43:.43));
  roundRect(ctx,cx-w/2,cy-h,w,h,r,true,true);
}
function drawLabel(ctx,x,y,text,color){ctx.font='800 14px Arial';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.76)';ctx.strokeText(text,x,y);ctx.fillStyle=color||'#fff';ctx.fillText(text,x,y);}
function roundRect(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(fill)ctx.fill();if(stroke)ctx.stroke();}

function drawMiniMap(){
  const cv=document.getElementById('gfMiniCanvas'); if(!cv||!state.scene)return; const ctx=cv.getContext('2d'); const w=cv.width,h=cv.height;ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#2f6133';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#7bb8d6';
  for(const water of state.scene.water||[]){ctx.beginPath();water.points.forEach((p,i)=>{const x=p[0]/state.scene.size.w*w,y=p[1]/state.scene.size.h*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();}
  ctx.strokeStyle='#d0b073';ctx.lineWidth=2;
  for(const p of state.scene.paths||[]){ctx.beginPath();p.points.forEach((pt,i)=>{const x=pt[0]/state.scene.size.w*w,y=pt[1]/state.scene.size.h*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
  ctx.fillStyle='#f2d061';ctx.beginPath();ctx.arc(state.player.x/state.scene.size.w*w,state.player.y/state.scene.size.h*h,4,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=1;const vx=state.cam.x/state.scene.size.w*w,vy=state.cam.y/state.scene.size.h*h,vw=state.canvas.clientWidth/state.scene.size.w*w,vh=state.canvas.clientHeight/state.scene.size.h*h;ctx.strokeRect(vx,vy,vw,vh);
}

function connectWS(){
  try{const proto=location.protocol==='https:'?'wss':'ws';const ws=new WebSocket(proto+'://'+location.host);state.ws=ws;ws.onopen=()=>{ws.send(JSON.stringify({type:'worldJoin',username:state.username,sceneId:state.scene.id,x:state.player.x,y:state.player.y,face:state.player.face,moving:false,appearance:appearancePayload()}));};
  ws.onmessage=(ev)=>{let m;try{m=JSON.parse(ev.data);}catch(e){return;} if(m.type==='worldWelcome'){state.worldId=m.id;(m.peers||[]).forEach(p=>state.remote.set(p.id,p));} if(m.type==='worldJoin'||m.type==='worldMove'){const p=m.player;if(p&&p.id!==state.worldId){p.animTime=state.time;state.remote.set(p.id,p);}} if(m.type==='worldLeave')state.remote.delete(m.id);};
  ws.onclose=()=>setTimeout(()=>{if(state.running)connectWS();},2000);}catch(e){}
}
let lastMove=0;function sendMove(){const now=performance.now();if(!state.ws||state.ws.readyState!==1||now-lastMove<80)return;lastMove=now;state.ws.send(JSON.stringify({type:'worldMove',x:Math.round(state.player.x),y:Math.round(state.player.y),face:state.player.face,moving:state.player.moving,appearance:appearancePayload()}));}

window.RPGSceneEngine={start,stop};
})();
