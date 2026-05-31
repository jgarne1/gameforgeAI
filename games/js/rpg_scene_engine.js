(function(){
'use strict';
const DEFAULT_ASSET_BASE='/assets/worldkit/';
const SCENE_URL='/assets/worlds/whisperwind_village.json';
const CLAIM_API='/api/estate/neighborhoods/whisperwind_01/claim';
const STATE_API='/api/estate/neighborhoods/whisperwind_01';

const state={canvas:null,ctx:null,dpr:1,scene:null,assets:{},tileCache:null,running:false,last:0,cam:{x:0,y:0},player:{x:0,y:0,face:'down',moving:false,animT:0},keys:{},username:'Wanderer',near:null,dialog:null,remote:new Map(),ws:null,worldId:null,plots:{},onClose:null};

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(a,b,c,d){return Math.hypot(a-c,b-d);}
function safeName(n){return String(n||'Wanderer').slice(0,18);}
function assetUrl(name){ if(!name)return ''; if(name.startsWith('/'))return name; return DEFAULT_ASSET_BASE+name; }
function loadImage(url){return new Promise((resolve)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{console.warn('[RPG] asset failed',url);resolve(null);};img.src=url;});}
function allSceneAssets(scene){
  const urls=new Set();
  function add(a){ if(a) urls.add(assetUrl(a)); }
  [...(scene.objects||[]),...(scene.decorations||[])].forEach(o=>add(o.asset));
  (scene.tilePaints||[]).forEach(t=>add(t.sheet||t.asset));
  (scene.npcs||[]).forEach(n=>add(n.asset||n.sheet));
  (scene.tileLayers||[]).forEach(l=>add(l.sheet));
  (scene.ground&&scene.ground.sheet)&&add(scene.ground.sheet);
  (scene.water&&scene.water.texture)&&add(scene.water.texture);
  (scene.avatar&&scene.avatar.layers||[]).forEach(l=>add(l.asset));
  return [...urls];
}
async function preload(scene){await Promise.all(allSceneAssets(scene).map(async u=>{state.assets[u]=await loadImage(u);}));}
function resize(){const c=state.canvas;if(!c)return;state.dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));const w=c.clientWidth,h=c.clientHeight;c.width=Math.floor(w*state.dpr);c.height=Math.floor(h*state.dpr);state.ctx.setTransform(state.dpr,0,0,state.dpr,0,0);}
function mount(){
  const root=document.createElement('div');root.className='gfRpgRoot';
  root.innerHTML=`
    <canvas id="gfRpgCanvas"></canvas>
    <div class="gfAreaTitle"><b>Whisperwind Village</b><span>Production object-town pass • asset-pack scaffold • editable</span></div>
    <button class="gfLeave" id="gfLeave">Leave</button>
    <div class="gfPrompt hidden" id="gfPrompt"></div>
    <div class="gfQuest" id="gfQuest"><button title="Close" id="gfQuestClose">×</button><b>Whisperwind 1.0</b><p>Walk the larger FF-style town. Press <b>E</b> near NPCs, doors, plots, board, and docks.</p></div>
    <div class="gfDialog hidden" id="gfDialog"><button id="gfDialogClose">×</button><div id="gfDialogText"></div></div>
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
  const scene=await fetch(SCENE_URL+'?v='+Date.now(),{cache:'no-store'}).then(r=>r.json());state.scene=scene;state.tileCache=null;
  await preload(scene);await fetchEstateState();
  state.player={x:scene.spawn.x,y:scene.spawn.y,face:scene.spawn.face||'down',moving:false,animT:0};
  state.cam.x=state.player.x-state.canvas.clientWidth/2;state.cam.y=state.player.y-state.canvas.clientHeight/2;
  connectWS();state.running=true;state.last=performance.now();requestAnimationFrame(loop);
}
function stop(){state.running=false;try{if(state.ws)state.ws.send(JSON.stringify({type:'worldLeave'}));}catch(e){} if(state.onClose)state.onClose();}
async function fetchEstateState(){try{const j=await fetch(STATE_API,{cache:'no-store'}).then(r=>r.json()); if(j&&j.ok&&j.neighborhood){(j.neighborhood.plots||[]).forEach(p=>state.plots[p.id]=p);}}catch(e){state.plots={};}}
async function claimPlot(plotId){if(!plotId)return;try{const j=await fetch(CLAIM_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:state.username,plotId})}).then(r=>r.json());if(j.ok){await fetchEstateState();openDialog('Plot claimed! A starter cottage now renders from the plot state.');}else openDialog(j.error||'That plot could not be claimed.');}catch(e){openDialog('Claim service is not available yet, but the plot interaction is wired.');}}
function onKey(e){const down=e.type==='keydown';if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){state.keys[e.key.toLowerCase()]=down;e.preventDefault();}if(down&&(e.key==='e'||e.key==='E'||e.key===' ')){if(state.dialog)closeDialog();else interact();e.preventDefault();}if(down&&e.key==='Escape')closeDialog();}
function interact(){const n=state.near;if(!n)return;const t=n.target;if(t.kind==='npc'){openDialog((t.name?t.name+':\n':'')+(t.dialogue||[]).join('\n\n'));return;}if(t.kind==='plot'){claimPlot(t.plotId);return;}openDialog(t.message||t.label||'Nothing happens yet.');}
function openDialog(text){state.dialog=text;const d=document.getElementById('gfDialog');document.getElementById('gfDialogText').textContent=text;d.classList.remove('hidden');}
function closeDialog(){state.dialog=null;const d=document.getElementById('gfDialog');if(d)d.classList.add('hidden');}
function update(dt){
  const p=state.player;let dx=0,dy=0;
  if(state.keys.w||state.keys.arrowup)dy-=1;if(state.keys.s||state.keys.arrowdown)dy+=1;if(state.keys.a||state.keys.arrowleft)dx-=1;if(state.keys.d||state.keys.arrowright)dx+=1;
  if(dx||dy){const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;p.face=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');}
  const sp=(state.scene.player&&state.scene.player.speed)||230;const nx=p.x+dx*sp*dt,ny=p.y+dy*sp*dt;
  p.moving=!!(dx||dy);p.animT=(p.animT||0)+dt;
  if(p.moving){let moved=false;if(canStand(nx,ny)){p.x=nx;p.y=ny;moved=true;}else{if(canStand(nx,p.y)){p.x=nx;moved=true;} if(canStand(p.x,ny)){p.y=ny;moved=true;}} if(moved)sendMove();}
  const vw=state.canvas.clientWidth,vh=state.canvas.clientHeight,sw=state.scene.size.w,sh=state.scene.size.h;
  const tx=clamp(p.x-vw/2,0,Math.max(0,sw-vw));const ty=clamp(p.y-vh/2,0,Math.max(0,sh-vh));
  const s=(state.scene.camera&&state.scene.camera.smoothing)||0.12;state.cam.x+=(tx-state.cam.x)*s;state.cam.y+=(ty-state.cam.y)*s;
  findNear();
}
function canStand(x,y){
  if(x<30||y<30||x>state.scene.size.w-30||y>state.scene.size.h-30)return false;
  for(const w of state.scene.waterAreas||state.scene.water||[]){if(pointInPoly([x,y],w.points))return false;}
  const all=[...(state.scene.objects||[]),...(state.scene.decorations||[])];
  for(const o of all){if(!o.solid)continue;const s=o.solid;if(x>o.x+s.x&&x<o.x+s.x+s.w&&y>o.y+s.y&&y<o.y+s.y+s.h)return false;}
  return true;
}
function pointInPoly(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];const inter=((yi>p[1])!=(yj>p[1]))&&(p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi);if(inter)inside=!inside;}return inside;}
function findNear(){
  const p=state.player;let best=null;
  function test(kind,obj,label,msg,r){const d=dist(p.x,p.y,obj.x,obj.y);if(d<(r||105)&&(!best||d<best.d))best={d,target:{kind,label,message:msg,obj}};}
  for(const n of state.scene.npcs||[]){test('npc',n,(n.interact&&n.interact.label)||('Talk to '+n.name),null,(n.interact&&n.interact.radius)||110);if(best&&best.target.obj===n){best.target.name=n.name;best.target.dialogue=n.dialogue;}}
  for(const o of state.scene.objects||[]){if(!o.interact)continue;const it=o.interact;test(it.kind||'inspect',o,it.label,it.message,it.radius||120);if(best&&best.target.obj===o&&it.plotId)best.target.plotId=it.plotId;}
  for(const po of state.scene.portals||[]){test('portal',po,po.label,po.message,150);}
  state.near=best;const prompt=document.getElementById('gfPrompt');if(best){prompt.textContent='[E] '+best.target.label;prompt.classList.remove('hidden');}else prompt.classList.add('hidden');
}
function loop(now){if(!state.running)return;const dt=Math.min(0.035,(now-state.last)/1000||0.016);state.last=now;update(dt);draw(now);requestAnimationFrame(loop);}
function draw(now){
  const ctx=state.ctx,c=state.canvas,vw=c.clientWidth,vh=c.clientHeight,cam=state.cam;ctx.clearRect(0,0,vw,vh);ctx.save();ctx.translate(-cam.x,-cam.y);
  drawGround(ctx);drawWater(ctx,now);drawPaths(ctx);drawPlots(ctx);
  const ents=[];[...(state.scene.decorations||[]),...(state.scene.objects||[])].forEach(o=>ents.push({y:o.y+(o.depthOffset||0),type:'obj',o}));
  (state.scene.npcs||[]).forEach(n=>ents.push({y:n.y,type:'npc',o:n}));state.remote.forEach(r=>ents.push({y:r.y,type:'remote',o:r}));ents.push({y:state.player.y,type:'player',o:state.player});
  ents.sort((a,b)=>a.y-b.y);
  for(const e of ents){if(e.type==='obj')drawAssetObj(ctx,e.o);else if(e.type==='npc')drawNpc(ctx,e.o);else if(e.type==='remote')drawAvatar(ctx,e.o.x,e.o.y,e.o.username||'Player',true,e.o);else drawAvatar(ctx,state.player.x,state.player.y,state.username,false,state.player);}
  ctx.restore();
}
function drawGround(ctx){
  const sc=state.scene;ctx.fillStyle='#3d6d34';ctx.fillRect(0,0,sc.size.w,sc.size.h);
  const tile=state.scene.groundTile||{sheet:'/assets/vendor/mana_seed/seasonal_forest/spring_tiles.png',src:[0,0,16,16],size:64};
  const img=state.assets[assetUrl(tile.sheet)];if(!img)return drawFallbackGrass(ctx,sc);
  const size=tile.size||64,src=tile.src||[0,0,16,16];
  for(let x=0;x<sc.size.w;x+=size){for(let y=0;y<sc.size.h;y+=size){const variant=((x*13+y*17)%7);let sx=src[0],sy=src[1];if(variant===0)sx=16; if(variant===1)sy=16; if(variant===2){sx=32;sy=0;}ctx.drawImage(img,sx,sy,src[2],src[3],x,y,size,size);}}
  // tiny flowers/grass noise, subtle so it does not become UI clutter
  ctx.save();ctx.globalAlpha=.55;for(let i=0;i<900;i++){const x=(i*181)%sc.size.w,y=(i*313)%sc.size.h;const r=(i*37)%100;ctx.fillStyle=r>88?'#f4d36b':(r>76?'#f3a4c8':(r>64?'#b8dfff':'#79b65b'));ctx.fillRect(x,y,2+(i%2),2+(i%3));}ctx.restore();
  drawTilePaints(ctx);
}
function drawTilePaints(ctx){
  const paints=state.scene.tilePaints||[];
  for(const p of paints){
    const img=state.assets[assetUrl(p.sheet||p.asset)]; if(!img)continue;
    const src=p.src||[0,0,16,16]; const ts=p.tileSize||64;
    for(let x=p.x||0;x<(p.x||0)+(p.w||ts);x+=ts){
      for(let y=p.y||0;y<(p.y||0)+(p.h||ts);y+=ts){
        ctx.drawImage(img,src[0],src[1],src[2],src[3],x,y,ts,ts);
      }
    }
  }
}
function drawFallbackGrass(ctx,sc){for(let x=0;x<sc.size.w;x+=64){for(let y=0;y<sc.size.h;y+=64){ctx.fillStyle=((x+y)%128)?'#4f843b':'#5f9b42';ctx.fillRect(x,y,66,66);}}}
function drawWater(ctx,now){
  for(const w of state.scene.waterAreas||state.scene.water||[]){
    ctx.beginPath();w.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
    const g=ctx.createLinearGradient(0,0,0,state.scene.size.h);g.addColorStop(0,'#2782a7');g.addColorStop(.55,'#116184');g.addColorStop(1,'#0a3f66');ctx.fillStyle=g;ctx.fill();
    ctx.save();ctx.clip();ctx.globalAlpha=.28;ctx.strokeStyle='#b9f6ff';ctx.lineWidth=2;for(let y=-80;y<state.scene.size.h+80;y+=54){ctx.beginPath();for(let x=-80;x<state.scene.size.w+80;x+=80){const yy=y+Math.sin((x*.01)+(now*.001))*10; x===-80?ctx.moveTo(x,yy):ctx.lineTo(x,yy);}ctx.stroke();}ctx.restore();
    ctx.strokeStyle='rgba(205,248,255,.58)';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='rgba(31,37,26,.35)';ctx.lineWidth=14;ctx.stroke();
  }
}
function drawPaths(ctx){ctx.lineCap='round';ctx.lineJoin='round';for(const p of state.scene.paths||[]){ctx.strokeStyle='#5d4527';ctx.lineWidth=p.width+42;strokePath(ctx,p.points);ctx.strokeStyle='#8b7045';ctx.lineWidth=p.width+26;strokePath(ctx,p.points);ctx.strokeStyle='#c5a66b';ctx.lineWidth=p.width;strokePath(ctx,p.points);drawCobblePath(ctx,p.points,p.width);ctx.strokeStyle='rgba(255,239,190,.18)';ctx.lineWidth=5;strokePath(ctx,p.points);}}
function drawCobblePath(ctx,pts,width){for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,steps=Math.max(5,Math.floor(len/32));for(let j=0;j<steps;j++){const t=(j+.5)/steps,cx=a[0]+dx*t,cy=a[1]+dy*t;for(let k=-3;k<=3;k++){if(Math.abs(k)===3&&j%2)continue;const off=k*(width/7)+(((i+j+k)*17)%11-5),x=cx+nx*off,y=cy+ny*off;ctx.fillStyle=((i+j+k)%3===0)?'rgba(92,72,48,.25)':'rgba(255,240,190,.19)';ctx.beginPath();ctx.ellipse(x,y,11+(j%3)*2,5+(k&1),0,0,Math.PI*2);ctx.fill();}}}}
function strokePath(ctx,pts){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();}
function drawPlots(ctx){for(const pl of state.scene.plots||[]){const live=state.plots[pl.id]||pl;ctx.save();ctx.fillStyle=live.owner?'rgba(72,130,86,.20)':(live.status==='empty'?'rgba(86,74,47,.16)':'rgba(96,134,70,.22)');roundRect(ctx,pl.x,pl.y,pl.w,pl.h,18,true,false);ctx.setLineDash([20,14]);ctx.lineWidth=4;ctx.strokeStyle=live.owner?'rgba(142,221,255,.70)':(live.status==='empty'?'rgba(255,255,255,.22)':'rgba(255,255,255,.55)');roundRect(ctx,pl.x,pl.y,pl.w,pl.h,18,false,true);ctx.setLineDash([]);ctx.restore();if(live.owner){drawPlotHouse(ctx,pl,live);} }}
function drawPlotHouse(ctx,pl,live){const h=(state.scene.plotHouse||{});drawAtlas(ctx,{asset:h.asset||'/assets/vendor/pixel_lands_village/premade_buildings_demo.png',src:h.src||[16,32,112,122]},pl.x+pl.w/2,pl.y+pl.h-50,h.w||320,h.h||300);ctx.save();ctx.font='700 16px Arial';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.75)';ctx.strokeText(safeName(live.owner),pl.x+pl.w/2,pl.y+pl.h+8);ctx.fillStyle='#fff0a0';ctx.fillText(safeName(live.owner),pl.x+pl.w/2,pl.y+pl.h+8);ctx.restore();}
function drawAssetObj(ctx,o){if(!o.asset)return;drawAtlas(ctx,o,o.x,o.y,o.w,o.h);}
function drawAtlas(ctx,o,x,y,w,h){const img=state.assets[assetUrl(o.asset)];if(!img)return;const s=o.src;if(s)ctx.drawImage(img,s[0],s[1],s[2],s[3],x-w/2,y-h,w,h);else ctx.drawImage(img,x-w/2,y-h,w,h);}
function drawNpc(ctx,n){drawAvatar(ctx,n.x,n.y,n.name||'NPC',true,n);}
function drawAvatar(ctx,x,y,name,muted,entity){
  const cfg=state.scene.avatar||{};const scale=(state.scene.player&&state.scene.player.scale)||1;const fw=cfg.frameW||64,fh=cfg.frameH||64;const map=cfg.rows||{down:0,left:1,right:2,up:3};const face=(entity&&entity.face)||'down';const row=map[face]||0;const col=(entity&&entity.moving)?(Math.floor(((entity.animT||performance.now()/1000)*8))%(cfg.walkFrames||4)):0;const dw=fw*scale,dh=fh*scale;ctx.save();ctx.globalAlpha=muted?.96:1;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y-5,dw*.28,7,0,0,Math.PI*2);ctx.fill();
  const layers=cfg.layers||[];for(const l of layers){const img=state.assets[assetUrl(l.asset)];if(!img)continue;ctx.drawImage(img,col*fw,row*fh,fw,fh,x-dw/2,y-dh,dw,dh);}
  ctx.font='700 15px Arial';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.75)';ctx.strokeText(name,x,y-dh-8);ctx.fillStyle=muted?'#eafff4':'#ffec75';ctx.fillText(name,x,y-dh-8);ctx.restore();
}
function roundRect(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(fill)ctx.fill();if(stroke)ctx.stroke();}
function connectWS(){try{const proto=location.protocol==='https:'?'wss':'ws';const ws=new WebSocket(proto+'://'+location.host);state.ws=ws;ws.onopen=()=>{ws.send(JSON.stringify({type:'worldJoin',username:state.username,sceneId:state.scene.id,x:state.player.x,y:state.player.y,face:state.player.face,moving:false,appearance:{avatar:'mana_seed_farmer_v1'}}));};ws.onmessage=(ev)=>{let m;try{m=JSON.parse(ev.data);}catch(e){return;}if(m.type==='worldWelcome'){state.worldId=m.id;(m.peers||[]).forEach(p=>state.remote.set(p.id,p));}if(m.type==='worldJoin'||m.type==='worldMove'){const p=m.player;if(p&&p.id!==state.worldId)state.remote.set(p.id,p);}if(m.type==='worldLeave')state.remote.delete(m.id);};ws.onclose=()=>setTimeout(()=>{if(state.running)connectWS();},2000);}catch(e){}}
let lastMove=0;function sendMove(){const now=performance.now();if(!state.ws||state.ws.readyState!==1||now-lastMove<80)return;lastMove=now;state.ws.send(JSON.stringify({type:'worldMove',x:Math.round(state.player.x),y:Math.round(state.player.y),face:state.player.face,moving:state.player.moving,appearance:{avatar:'mana_seed_farmer_v1'}}));}
window.RPGSceneEngine={start,stop};
})();
