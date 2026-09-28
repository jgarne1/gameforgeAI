(function(){
'use strict';

const E={
  root:null,canvas:null,ctx:null,mini:null,scene:null,sceneId:'',catalog:{},assets:{},keys:{},
  player:{x:850,y:950,vx:0,vy:0,face:'down',moving:false},cam:{x:0,y:0,zoom:1},last:0,raf:0,
  debug:false,username:'Wanderer',displayName:'Wanderer',context:null,near:null,msgTimer:0,
  ws:null,peers:{},onClose:null
};
const $=s=>document.querySelector(s);
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const loadJson=url=>fetch(url+'?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(url+' '+r.status);return r.json();});
function loadImg(src){if(!src)return Promise.resolve(null);if(E.assets[src])return Promise.resolve(E.assets[src]);return new Promise(res=>{const i=new Image();i.onload=()=>{E.assets[src]=i;res(i)};i.onerror=()=>res(null);i.src=src;});}

function inject(){
  if($('#wfStyle'))return;
  const st=document.createElement('style');st.id='wfStyle';st.textContent=`
.wfRoot{position:fixed;inset:0;background:#050b12;overflow:hidden;color:#f7efd7;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}.wfCanvas{position:absolute;inset:0;width:100%;height:100%}.wfHud{position:absolute;inset:0;pointer-events:none}.wfPanel{position:absolute;background:rgba(5,10,17,.78);border:1px solid rgba(238,201,111,.48);box-shadow:0 14px 42px #0009;border-radius:18px;color:#f6edd0;backdrop-filter:blur(8px)}.wfTop{left:18px;top:18px;padding:13px 17px;min-width:300px}.wfTop h1{font:900 22px Georgia,serif;margin:0;color:#ffe9a6}.wfTop p{margin:4px 0 0;color:#bcd6c9;font-weight:800;font-size:13px}.wfProfile{left:18px;top:105px;width:320px;padding:12px}.wfProfile h2{font:900 16px Georgia,serif;margin:0 0 8px;color:#ffe9a6}.wfProfile .line{display:flex;justify-content:space-between;gap:10px;font-size:13px;font-weight:850;margin:5px 0;color:#dceefa}.wfProfile .muted{color:#9fb3c8}.wfProfile .chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.wfProfile .chip{border:1px solid #33445e;background:#101b2b;border-radius:999px;padding:3px 7px;font-size:11px;color:#cfe4ff}.wfClose{position:absolute;right:18px;top:18px;pointer-events:auto;border:1px solid #e8c767;background:#151305;color:#ffeda8;border-radius:18px;padding:12px 18px;font-weight:900}.wfHint{left:50%;bottom:20px;transform:translateX(-50%);padding:10px 16px;font-weight:850}.wfMsg{left:50%;top:70%;transform:translateX(-50%);max-width:min(760px,90vw);padding:14px 18px;font-weight:800;text-align:center;opacity:0;transition:.2s}.wfMsg.show{opacity:1}.wfMini{right:18px;top:86px;width:198px;height:145px;padding:8px}.wfMini canvas{width:100%;height:100%;border-radius:12px;background:#0b1a16}.wfPrompt{position:absolute;pointer-events:none;background:rgba(16,13,7,.92);border:1px solid #e6c46a;color:#fff2b8;border-radius:999px;padding:8px 12px;font-weight:900;transform:translate(-50%,-130%);white-space:nowrap}.wfTools{position:absolute;right:18px;top:255px;display:flex;flex-direction:column;gap:8px;pointer-events:auto}.wfTools button,.wfTools a{border:1px solid #425166;background:#111927;color:#d8ebff;border-radius:12px;padding:9px 12px;font-weight:900;text-decoration:none;text-align:center}.wfTools button.on{border-color:#f4ce68;color:#ffe9a6}.wfFade{position:absolute;inset:0;background:#020407;opacity:0;transition:.22s;pointer-events:none}.wfFade.on{opacity:1}.wfHomeBox{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(500px,92vw);padding:20px;pointer-events:auto;display:none}.wfHomeBox.show{display:block}.wfHomeBox h2{font:900 24px Georgia,serif;color:#ffe9a6;margin:0 0 8px}.wfHomeBox p{color:#cfe0d7;font-weight:750}.wfHomeBox button{border:1px solid #e8c767;background:#161606;color:#ffeda8;border-radius:12px;padding:10px 14px;font-weight:900;margin-right:8px}.wfBackpack{position:absolute;right:18px;bottom:18px;pointer-events:auto}.wfBackpack button{border:1px solid #6aa7d8;background:#101b2b;color:#d8ecff;border-radius:14px;padding:11px 14px;font-weight:950}.wfBagBox{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(780px,94vw);max-height:min(680px,86vh);overflow:auto;padding:18px;pointer-events:auto;display:none}.wfBagBox.show{display:block}.wfBagBox h2{font:900 25px Georgia,serif;margin:0 0 10px;color:#ffe9a6}.wfBagTabs{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 12px}.wfBagTabs button{border:1px solid #33445e;background:#0d1724;color:#cfe4ff;border-radius:999px;padding:7px 10px;font-weight:900}.wfBagTabs button.on{border-color:#e8c767;color:#ffe9a6}.wfBagGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:8px}.wfBagItem{border:1px solid #26384e;background:#08111d;border-radius:14px;padding:10px;min-height:72px}.wfBagItem b{display:block;color:#fff}.wfBagItem span{display:block;color:#9fb3c8;font-size:12px;font-weight:800;margin-top:3px}.wfBagEmpty{color:#9fb3c8;font-weight:850;padding:20px;border:1px dashed #33445e;border-radius:14px}.wfError{padding:26px;color:white;background:#080d15;min-height:100vh;white-space:pre-wrap}`;
  document.head.appendChild(st);
}
function mount(){
  inject();
  const r=document.createElement('div');r.className='wfRoot';
  r.innerHTML='<canvas class="wfCanvas"></canvas><div class="wfHud"><div class="wfPanel wfTop"><h1 id="wfTitle">World Forger</h1><p id="wfSub">Loading layered hub…</p></div><div class="wfPanel wfProfile" id="wfProfile"><h2>Player</h2><div class="muted">Loading account context…</div></div><button class="wfClose" id="wfClose">Leave</button><div class="wfPanel wfMini"><canvas id="wfMini"></canvas></div><div class="wfTools"><button id="wfDebug">Boundaries</button><button id="wfZoomIn">Zoom +</button><button id="wfZoomOut">Zoom -</button><a href="/games/world_composer.html">Composer</a><a href="/games/petworld.html">Pet World</a></div><div id="wfPrompt" class="wfPrompt" style="display:none"></div><div class="wfPanel wfMsg" id="wfMsg"></div><div class="wfPanel wfHint">Click to walk · WASD / arrows · E interact · wheel zoom · B boundaries</div><div class="wfBackpack"><button id="wfBagBtn">🎒 Backpack</button></div><div class="wfPanel wfBagBox" id="wfBagBox"></div><div class="wfPanel wfHomeBox" id="wfHomeBox"></div><div class="wfFade" id="wfFade"></div></div>';
  document.body.appendChild(r);E.root=r;E.canvas=r.querySelector('.wfCanvas');E.ctx=E.canvas.getContext('2d');E.mini=$('#wfMini');
  $('#wfClose').onclick=()=>{if(E.onClose)E.onClose();else location.href='/'};
  $('#wfBagBtn').onclick=()=>showBackpack();TownLife.tools(E,{toast,loadScene,loadWorldContext});
  $('#wfDebug').onclick=function(){E.debug=!E.debug;this.classList.toggle('on',E.debug)};
  $('#wfZoomIn').onclick=()=>E.cam.zoom=Math.min(1.9,E.cam.zoom+.12);
  $('#wfZoomOut').onclick=()=>E.cam.zoom=Math.max(.55,E.cam.zoom-.12);
  window.addEventListener('resize',resize);window.addEventListener('keydown',key,true);window.addEventListener('keyup',key,true);
  E.canvas.addEventListener('wheel',ev=>{ev.preventDefault();E.cam.zoom=Math.max(.55,Math.min(1.9,E.cam.zoom+(ev.deltaY<0?.08:-.08)))},{passive:false});
  E.canvas.addEventListener('pointerdown',ev=>{E.followNpc=null;const x=E.cam.x+ev.offsetX/E.cam.zoom,y=E.cam.y+ev.offsetY/E.cam.zoom;const route=TownMotion.route(E.player,{x,y},canStand,E.scene.size);E.route=route;E.target=route.shift()||null;if(!E.target)toast('Choose a reachable spot on the street.');});
  $('#wfPrompt').style.pointerEvents='auto';$('#wfPrompt').onclick=interact;
  resize();
}
function resize(){if(!E.canvas)return;const d=devicePixelRatio||1;E.canvas.width=innerWidth*d;E.canvas.height=innerHeight*d;E.canvas.style.width=innerWidth+'px';E.canvas.style.height=innerHeight+'px';E.ctx.setTransform(d,0,0,d,0,0)}
function key(ev){const down=ev.type==='keydown',k=ev.key.toLowerCase();if(ev.target?.closest('input,select,textarea')||$('#wfHomeBox')?.classList.contains('show')){if(k==='escape'&&down)hideHomeBox();return;}if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','e','b','i','escape'].includes(k)){if(k==='e'&&down){interact();ev.preventDefault();return}
    if(k==='i'&&down){showBackpack();ev.preventDefault();return}if(k==='b'&&down){E.debug=!E.debug;const b=$('#wfDebug');if(b)b.classList.toggle('on',E.debug);return}if(k==='escape'&&down){hideHomeBox();hideBackpack();return}E.keys[k]=down;ev.preventDefault()}}
async function start(o){
  o=o||{};E.username=o.username||localStorage.getItem('gf_user')||'Wanderer';E.displayName=E.username;E.onClose=o.onClose;
  oSpawnId=o.spawnId||'';mount();await loadWorldContext();await loadScene(o.sceneId||new URLSearchParams(location.search).get('scene')||'whisperwind_v2_hub');connectWorldSocket();E.last=performance.now();cancelAnimationFrame(E.raf);E.raf=requestAnimationFrame(loop);
}
async function loadWorldContext(){
  const box=$('#wfProfile');
  if(!E.username||E.username==='Wanderer'){renderProfile();return null;}
  try{
    const r=await fetch('/api/world/context?user='+encodeURIComponent(E.username),{cache:'no-store'});
    const data=await r.json();
    if(!data.ok)throw Error(data.error||'context failed');
    E.context=data;E.displayName=data.displayName||data.username||E.username;renderProfile();return data;
  }catch(err){
    if(box)box.innerHTML='<h2>'+esc(E.username)+'</h2><div class="muted">World context unavailable. You can move, but pets/items/coins are not attached.</div>';
    console.warn('[WorldForger] context failed',err);return null;
  }
}
function renderProfile(){
  const box=$('#wfProfile');if(!box)return;
  const c=E.context;
  if(!c){box.innerHTML='<h2>'+esc(E.username||'Wanderer')+'</h2><div class="muted">Guest world session. Log in through GameForge to attach pets, coins, items, and homes.</div>';return;}
  const pet=c.activePet?((c.activePet.emoji||'')+' '+c.activePet.name+' Lv.'+c.activePet.level):'No active pet';
  const homes=(c.homes||[]).length?c.homes.map(h=>h.name).slice(0,2).join(', '):'No home yet';
  const inv=(c.inventory||[]).slice(0,4).map(i=>`${esc(i.name)} x${i.quantity}`).join('');
  box.innerHTML='<h2>'+esc(c.displayName||c.username)+'</h2>'+
    '<div class="line"><span class="muted">Coins</span><b>'+Number(c.coins||0).toLocaleString()+'</b></div>'+
    '<div class="line"><span class="muted">Active Pet</span><b>'+esc(pet)+'</b></div>'+
    '<div class="line"><span class="muted">Items</span><b>'+Number(c.inventoryCount||0)+'</b></div>'+
    '<div class="line"><span class="muted">Home</span><b>'+esc(homes)+'</b></div>'+
    '<div class="chips">'+(c.inventory||[]).slice(0,5).map(i=>'<span class="chip">'+esc(i.name)+' ×'+Number(i.quantity||0)+'</span>').join('')+'</div>'+
    '<div style="margin-top:9px"><button id="wfProfileBag" style="pointer-events:auto;border:1px solid #33445e;background:#101b2b;color:#d8ecff;border-radius:10px;padding:7px 9px;font-weight:900">Open Backpack</button></div>';
  setTimeout(()=>{const b=$('#wfProfileBag');if(b)b.onclick=showBackpack},0);
}
let oSpawnId='';
async function loadScene(id,spawn){
  if(String(id).startsWith('shadow_woods_')){location.href='/games/world.html?scene='+encodeURIComponent(id);return;}
  E.sceneId=id||'whisperwind_v2_hub';$('#wfFade')?.classList.add('on');
  try{
    const [sc,cat]=await Promise.all([loadJson(E.sceneId.startsWith('home__')?'/api/town/home-scene/'+encodeURIComponent(E.sceneId.slice(6)):'/assets/worlds/'+E.sceneId+'.json'),loadJson('/assets/worlds/world_asset_catalog.json').catch(()=>loadJson('/data/world_asset_catalog.json'))]);
    E.scene=sc;await TownLife.prepare(E,sc);E.catalog={};(cat.assets||[]).forEach(a=>E.catalog[a.id]=a);if(sc.previewOnly)E.cam.zoom=sc.mode==='interior'?Math.max(.65,Math.min(1.25,(innerWidth-260)/(sc.size.w),(innerHeight-100)/(sc.size.h))):.65;E.target=null;E.route=[];
    const requested=spawn||oSpawnId;const p=(typeof requested==='string'?(sc.spawnPoints||[]).find(p=>p.id===requested):requested)||sc.spawn||{};E.player.x=Number(p.x??100);E.player.y=Number(p.y??100);E.player.face=p.face||E.player.face||'down';oSpawnId='';E.player.vx=0;E.player.vy=0;E.player.walkDistance=0;E.near=null;
    $('#wfProfile').hidden=!!sc.playerPack;const composer=document.querySelector('a[href*="world_composer"]');if(composer)composer.href='/games/world_composer.html?scene='+encodeURIComponent(sc.id);$('#wfTitle').textContent=sc.name||E.sceneId;$('#wfSub').textContent=sc.mode==='interior'?'Interior scene · E exits/interacts':'Layered hub · doors, stairs, homes, alleys';
    E.pack=sc.playerPack?await loadJson(sc.playerPack):null;const imgs=[];for(const material of [sc.groundMaterial,sc.wallMaterial])if(material?.src)imgs.push(loadImg(material.src));if(E.pack){imgs.push(loadImg(E.pack.player.walk.src));Object.values(E.pack.player.idle).forEach(id=>imgs.push(loadImg(E.catalog[id].src)));}if(sc.waterMaterial?.src)imgs.push(loadImg(sc.waterMaterial.src));(sc.objects||[]).forEach(o=>{const a=E.catalog[o.asset];if(a&&a.src)imgs.push(loadImg(a.src))});if((sc.objects||[]).some(o=>o.plotId))for(const a of Object.values(E.catalog))if(a.id.includes('_roof_'))imgs.push(loadImg(a.src));(sc.effects||[]).forEach(o=>{const a=E.catalog[o.asset];if(a&&a.src)imgs.push(loadImg(a.src))});for(const skin of [...Object.values(E.npcSkins?.skins||{}),...Object.values(E.npcSkins?.pets||{})])if(skin.src)imgs.push(loadImg(skin.src));if(sc.background)imgs.push(loadImg(sc.background));if(sc.playerSprite)imgs.push(loadImg(sc.playerSprite));await Promise.all(imgs);
    toast(sc.name||'Scene loaded');sendWorldJoin();
  }catch(err){document.body.innerHTML='<div class="wfError">World load failed.\n\n'+esc(err.message||err)+'\n\nScene: '+esc(E.sceneId)+'</div>';throw err}
  finally{setTimeout(()=>$('#wfFade')&&$('#wfFade').classList.remove('on'),120)}
}
function loop(t){const dt=Math.min(.033,(t-E.last)/1000||.016);E.last=t;update(dt);render(t/1000);E.raf=requestAnimationFrame(loop)}
function update(dt){
  if(!E.scene)return;let ax=0,ay=0;if(E.keys.w||E.keys.arrowup)ay-=1;if(E.keys.s||E.keys.arrowdown)ay+=1;if(E.keys.a||E.keys.arrowleft)ax-=1;if(E.keys.d||E.keys.arrowright)ax+=1;if(ax||ay){E.target=null;E.route=[];E.followNpc=null;}else if(E.target){ax=E.target.x-E.player.x;ay=E.target.y-E.player.y;if(Math.hypot(ax,ay)<8){ax=0;ay=0;E.target=null;}}const len=Math.hypot(ax,ay)||1;ax/=len;ay/=len;
  const motion=E.pack?.player.motion;
  const speed=E.pack?(E.scene.mode==='interior'?(motion?.interiorSpeed??128):(motion?.speed??144)):(E.scene.mode==='interior'?210:250),tvx=ax*speed,tvy=ay*speed;
  if(E.pack){E.player.vx=tvx;E.player.vy=tvy;}else{E.player.vx+=(tvx-E.player.vx)*Math.min(1,dt*11);E.player.vy+=(tvy-E.player.vy)*Math.min(1,dt*11);}
  const beforeX=E.player.x,beforeY=E.player.y;
  let nx=E.player.x+E.player.vx*dt,ny=E.player.y+E.player.vy*dt;
  if(E.pack&&E.target&&Math.hypot(nx-beforeX,ny-beforeY)>Math.hypot(E.target.x-beforeX,E.target.y-beforeY)){nx=E.target.x;ny=E.target.y;E.target=null;}
  if(canStand(nx,ny)){E.player.x=nx;E.player.y=ny}else{if(canStand(nx,E.player.y))E.player.x=nx;else E.player.vx*=.12;if(canStand(E.player.x,ny))E.player.y=ny;else E.player.vy*=.12}
  const traveled=Math.hypot(E.player.x-beforeX,E.player.y-beforeY);
  E.player.walkDistance=(E.player.walkDistance||0)+traveled;
  E.player.moving=E.pack?traveled>.01:Math.hypot(E.player.vx,E.player.vy)>18;
  if(E.pack&&E.target&&traveled<.01){E.target=null;E.player.vx=0;E.player.vy=0;}
  if(Math.abs(E.player.vx)>Math.abs(E.player.vy)+3)E.player.face=E.player.vx<0?'left':'right';else if(Math.abs(E.player.vy)>8)E.player.face=E.player.vy<0?'up':'down';
  const sw=E.scene.size?.w||1700,sh=E.scene.size?.h||1200,tx=E.player.x-innerWidth/(2*E.cam.zoom),ty=E.player.y-innerHeight/(2*E.cam.zoom);E.cam.x+=(tx-E.cam.x)*Math.min(1,dt*6);E.cam.y+=(ty-E.cam.y)*Math.min(1,dt*6);E.cam.x=sw<innerWidth/E.cam.zoom?(sw-innerWidth/E.cam.zoom)/2:Math.max(0,Math.min(sw-innerWidth/E.cam.zoom,E.cam.x));E.cam.y=sh<innerHeight/E.cam.zoom?(sh-innerHeight/E.cam.zoom)/2:Math.max(0,Math.min(sh-innerHeight/E.cam.zoom,E.cam.y));
  if(!E.target&&E.route?.length)E.target=E.route.shift();TownLife.update(E,dt,canStand);findNear();if(E.msgTimer>0){E.msgTimer-=dt;if(E.msgTimer<=0)$('#wfMsg')?.classList.remove('show')}sendWorldMoveThrottled();
}
function pointInPoly(pt,poly){let x=pt[0],y=pt[1],inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){let xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];let hit=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||.00001)+xi);if(hit)inside=!inside}return inside}
function canStand(x,y){const sc=E.scene;if(!sc)return true;const w=sc.size?.w||1700,h=sc.size?.h||1200;if(x<8||y<8||x>w-8||y>h-8)return false;const walk=(sc.walkable||[]).filter(a=>Array.isArray(a.points)&&a.points.length>=3);if(walk.length&&!walk.some(a=>pointInPoly([x,y],a.points)))return false;for(const water of sc.terrain?.water||[]){if(water&&water.blocksWalking!==false&&Array.isArray(water.points)&&pointInPoly([x,y],water.points))return false}for(const b of [...(sc.collisions||[]),...(sc.blockers||[])]){if(!b)continue;if(Array.isArray(b.points)&&pointInPoly([x,y],b.points))return false;if(Number.isFinite(Number(b.x))&&x>Number(b.x)&&x<Number(b.x)+Number(b.w||0)&&y>Number(b.y)&&y<Number(b.y)+Number(b.h||0))return false}
  for(const o of sc.objects||[]){if(!o.collide)continue;const c=o.collide,s=o.scale||1,rx=o.x+c[0]*s,ry=o.y+c[1]*s,rw=c[2]*s,rh=c[3]*s;if(x>rx&&x<rx+rw&&y>ry&&y<ry+rh)return false}return true}
function allInteractables(){const hs=[...(E.scene?.hotspots||[]),...(E.scene?.npcs||[])];for(const o of (E.scene?.objects||[])){if(!o.interactive)continue;hs.push({...o,_objectRef:o,type:o.interactionType||o.type||'message',label:o.label||o.name||o.asset||'Interact',message:o.text||o.message||'',r:o.interactionRadius||70});}return hs;}
function findNear(){E.near=null;let best=1e9;for(const h of allInteractables()){const d=Math.hypot(E.player.x-h.x,E.player.y-h.y);if(d<(h.r||65)&&d<best){best=d;E.near=h}}const p=$('#wfPrompt');if(E.near){const sp=worldToScreen(E.near.x,E.near.y);p.style.left=sp.x+'px';p.style.top=sp.y+'px';p.style.display='block';p.textContent='E · '+(E.near.label||E.near.name||'Interact')}else if(p)p.style.display='none'}
async function interact(){
  const h=E.near;if(!h){toast('Nothing close enough.');return}
  if(await TownLife.interact(E,h,{toast,loadScene,loadWorldContext,hideHomeBox}))return;
  const type=String(h.type||h.interactionType||'message').toLowerCase();
  if(type==='door'||type==='teleport'){toast(h.message||(type==='door'?'Entering…':'Traveling…'));await sleep(150);if(h.targetScene)loadScene(h.targetScene,h.targetSpawn||h.target);return}
  if(type==='stairs'){toast(h.message||'You take the stairs.');const t=h.target||{};E.player.x=t.x||E.player.x;E.player.y=t.y||E.player.y;return}
  if(type==='link'){toast(h.message||'Opening…');setTimeout(()=>{if(h.href)location.href=h.href},350);return}
  if(type==='fishing'){if(h.requiresWater&&!(E.scene?.terrain?.water||[]).some(w=>Array.isArray(w.points)&&pointInPoly([h.x,h.y],w.points))){toast('This fishing spot needs to be placed on a water zone.');return}toast(h.message||'You found a fishing spot.');return}
  if(type==='home'||type==='claimhome'){showHomeBox(h);return}
  if(type==='sign'||type==='message'){toast(h.text||h.message||h.signText||'There is nothing written here.');return}
  if(type==='chest'||type==='pot'){await openWorldLoot(h,type);return}
  toast(h.message||((h.name||h.label||'Someone')+': Hello.'));
}
async function openWorldLoot(h,type){
  const objectId=h.id;if(!objectId){toast(type==='pot'?'The pot is empty.':'The chest is empty.');return}
  try{
    const r=await fetch('/api/world/open-chest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:E.username,sceneId:E.sceneId,objectId})});
    const data=await r.json();
    if(data.context){E.context=data.context;E.displayName=data.context.displayName||E.displayName;renderProfile();}
    if(data.ok){const rewardText=(data.rewards||[]).map(x=>x.type==='coins'?`${x.quantity} coins`:`${x.name||x.itemId} ×${x.quantity}`).join(', ')||'something';toast('You found '+rewardText+'!');h.opened=true;if(h._objectRef)h._objectRef.opened=true;return}
    if(data.alreadyOpened){toast(type==='pot'?'This pot is empty.':'This chest is empty.');return}
    toast(data.error||'Nothing useful here.');
  }catch(err){toast('Loot failed: '+err.message)}
}
function showHomeBox(h){if(h.plotId?.startsWith('town_home_')){TownLife.home(E,h,{toast,loadScene,loadWorldContext});return;}

  const owned=(E.context?.homes||[]).find(x=>x.plotId===(h.plotId||''));
  const box=$('#wfHomeBox');box.innerHTML='<h2>'+esc(h.label||'Home')+'</h2><p>'+esc(owned?('Owned by you · '+owned.name):(h.message||'This can be your home.'))+'</p><div><button id="wfEnterHome">Enter</button><button id="wfClaimHome">Claim</button><button id="wfCancelHome">Cancel</button></div>';box.classList.add('show');
  $('#wfCancelHome').onclick=hideHomeBox;$('#wfEnterHome').onclick=()=>{hideHomeBox();if(h.targetScene)loadScene(h.targetScene,h.targetSpawn);else toast('This home does not have an interior yet.')};$('#wfClaimHome').onclick=()=>claimHome(h);
}
function hideHomeBox(){const box=$('#wfHomeBox');if(box)box.classList.remove('show')}
async function claimHome(h){try{const username=E.username||localStorage.getItem('gf_user')||'Wanderer';const r=await fetch('/api/estate/neighborhoods/'+encodeURIComponent(h.neighborhoodId||'whisperwind_01')+'/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,plotId:h.plotId||'plot_01'})});const data=await r.json();if(data.ok){toast('Home claimed: '+(data.plot?.name||h.label||'Cottage'));await loadWorldContext();}else toast(data.error||'Could not claim this home.');hideHomeBox()}catch(err){toast('Home claim failed: '+err.message)}}
function toast(s){const m=$('#wfMsg');if(!m)return;m.innerHTML=esc(s);m.classList.add('show');E.msgTimer=4}
function worldToScreen(x,y){return{x:(x-E.cam.x)*E.cam.zoom,y:(y-E.cam.y)*E.cam.zoom}}function applyCam(){const d=devicePixelRatio||1;E.ctx.setTransform(d*E.cam.zoom,0,0,d*E.cam.zoom,-E.cam.x*d*E.cam.zoom,-E.cam.y*d*E.cam.zoom)}function reset(){const d=devicePixelRatio||1;E.ctx.setTransform(d,0,0,d,0,0)}
function render(time){E.time=time;const c=E.ctx,sc=E.scene;if(!c||!sc)return;reset();c.clearRect(0,0,innerWidth,innerHeight);applyCam();drawBase(c,sc,time);drawLayer(c,sc,'terrain');drawLayer(c,sc,'structures');if(E.pack){const queue=(sc.objects||[]).filter(o=>['buildings','props'].includes(o.layer||'props')).map(o=>({y:o.y,draw:()=>drawObject(c,o)}));queue.push({y:E.player.y,draw:()=>drawPlayer(c,time)});Object.values(E.peers||{}).filter(p=>p.sceneId===E.sceneId).forEach(p=>queue.push({y:p.y,draw:()=>drawPackPeer(c,p)}));(sc.npcs||[]).forEach(n=>queue.push({y:n.y,draw:()=>TownLife.drawNpc(c,n,E)}));queue.sort((a,b)=>a.y-b.y).forEach(q=>q.draw());}else{drawLayer(c,sc,'buildings');drawNpcs(c,sc);drawPeers(c);drawPlayer(c,time);drawLayer(c,sc,'props');}drawLayer(c,sc,'canopy');drawEffects(c,sc,time);drawHotspot(c);drawLightingOverlay(c,sc,time);TownLife.drawAmbient(c,E,time);if(E.debug)drawDebug(c,sc);reset();drawMini()}

function drawLightingOverlay(c,sc,time){
  const t=(sc.time&&sc.time.mode==='cycle')?cycleTime(time):(sc.time?.fixed||sc.fixedTime||sc.timeOfDay||'day');
  const light=sc.lighting||{};const brightness=Number(light.brightness??1),fog=Number(light.fog||0);
  const overlays={day:'rgba(255,255,255,0)',sunset:'rgba(255,116,38,.18)',night:'rgba(8,18,52,.48)',dawn:'rgba(100,145,255,.16)'};
  c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle=overlays[t]||'transparent';c.globalAlpha=Math.max(0,Math.min(1.2,1.05-brightness+fog*.55));c.fillRect(0,0,innerWidth,innerHeight);c.restore();
}
function cycleTime(time){const v=((time/30)%1);return v<.45?'day':v<.6?'sunset':v<.88?'night':'dawn'}

function drawBase(c,sc,time){if(sc.mode==='interior'){const it=sc.interior||{};c.fillStyle=it.wall||'#2c211c';c.fillRect(0,0,sc.size.w,sc.size.h);c.fillStyle=it.floor||'#60422c';roundRect(c,80,130,sc.size.w-160,sc.size.h-190,24,true,false);if(sc.wallMaterial&&E.assets[sc.wallMaterial.src])WhisperwindAssets.tile(c,E.assets[sc.wallMaterial.src],sc.wallMaterial,80,65,sc.size.w-160,65);if(sc.groundMaterial&&E.assets[sc.groundMaterial.src])WhisperwindAssets.tile(c,E.assets[sc.groundMaterial.src],sc.groundMaterial,85,135,sc.size.w-170,sc.size.h-200);c.strokeStyle=it.trim||'#d1a75d';c.lineWidth=10;c.stroke();if(!sc.playerPack){c.fillStyle=it.rug||'#6d3340';roundRect(c,sc.size.w/2-160,sc.size.h/2-40,320,150,18,true,false);}return}const w=sc.size?.w||1700,h=sc.size?.h||1200,skin=sc.groundSkin||'whisperwind';const palettes={whisperwind:['#163523','#356b3d','#203d2b'],forest:['#204d2c','#5b8542','#18351f'],dusk:['#172437','#334d5f','#101828'],sand:['#5f5532','#a18b57','#2d4a43']};const pal=palettes[skin]||palettes.whisperwind,g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,pal[0]);g.addColorStop(.5,pal[1]);g.addColorStop(1,pal[2]);c.fillStyle=g;c.fillRect(0,0,w,h);if(sc.groundMaterial&&E.assets[sc.groundMaterial.src])WhisperwindAssets.tile(c,E.assets[sc.groundMaterial.src],sc.groundMaterial,0,0,w,h);const bg=sc.background&&E.assets[sc.background];if(bg)c.drawImage(bg,0,0,w,h);drawPaint(c,sc);drawTerraces(c,sc);drawWater(c,sc,time);drawPaths(c,sc,time);drawGroundDetails(c,sc)}

function brushColor(kind){return {grass_light:'rgba(134,184,93,.45)',grass_dark:'rgba(40,95,48,.42)',dirt:'rgba(125,93,58,.48)',stone:'rgba(150,145,126,.42)',sand:'rgba(184,158,88,.44)',water_edge:'rgba(61,143,162,.40)',flowers:'rgba(235,209,104,.55)'}[kind]||'rgba(134,184,93,.35)'}
function drawPaint(c,sc){for(const d of sc.paint?.groundDabs||[]){const r=d.r||60;const col=brushColor(d.kind);const g=c.createRadialGradient(d.x,d.y,0,d.x,d.y,r);g.addColorStop(0,col.replace(/,[^,)]+\)/,','+(d.alpha||.35)+')'));g.addColorStop(1,col.replace(/,[^,)]+\)/,',0)'));c.fillStyle=g;c.beginPath();c.ellipse(d.x,d.y,r*1.2,r*.72,(d.x+d.y)%3,0,7);c.fill()}}
function drawEffects(c,sc,time){for(const o of sc.effects||[]){if(o.visible===false)continue;c.save();const pulse=1+Math.sin(time*(o.effect?.speed||1)*2)*.025;o.scale=(o.scale||1)*pulse;drawObject(c,o);o.scale=(o.scale||1)/pulse;c.restore()}}
function drawTerraces(c,sc){for(const t of sc.paint?.terraces||[]){if(t.height){c.save();c.translate(0,t.height);path(c,t.points);c.fillStyle=pavingPattern(c)||'#4c4b35';c.fill();c.fillStyle='rgba(22,29,17,.45)';c.fill();c.restore();}path(c,t.points);c.fillStyle=t.fill||'#315f39';c.fill();const im=sc.groundMaterial&&E.assets[sc.groundMaterial.src];if(im){c.save();c.clip();const xs=t.points.map(p=>p[0]),ys=t.points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);WhisperwindAssets.tile(c,im,sc.groundMaterial,x,y,Math.max(...xs)-x,Math.max(...ys)-y);c.fillStyle='rgba(175,204,104,.12)';c.fill();c.restore();}path(c,t.points);c.strokeStyle='rgba(8,18,12,.4)';c.lineWidth=5;c.stroke();c.strokeStyle='rgba(224,205,130,.16)';c.lineWidth=2;c.stroke();}}
function drawWater(c,sc,time){for(const wat of sc.terrain?.water||[]){if(sc.waterMaterial&&E.assets[sc.waterMaterial.src]){WhisperwindAssets.water(c,E.assets[sc.waterMaterial.src],wat.points,time,{...sc.waterMaterial,...wat.material});continue;}path(c,wat.points);c.fillStyle='#15536c';c.fill();c.save();c.clip();for(let i=0;i<16;i++){c.strokeStyle=i%2?'rgba(190,240,255,.18)':'rgba(95,200,220,.16)';c.lineWidth=2;c.beginPath();let y=(i*60+time*28)%520+720;for(let x=-80;x<(sc.size?.w||1700)+80;x+=40){let yy=y+Math.sin((x+i*70)*.012+time)*8;if(x===-80)c.moveTo(x,yy);else c.lineTo(x,yy)}c.stroke()}c.restore();c.strokeStyle='rgba(118,225,221,.45)';c.lineWidth=4;c.stroke()}}
function pavingPattern(c){if(E.pavingPattern)return E.pavingPattern;const a=E.catalog.wwhd_paving,im=a&&E.assets[a.src];if(!im)return null;const tile=document.createElement('canvas');tile.width=tile.height=128;const r=a.sourceRect;tile.getContext('2d').drawImage(im,r.x,r.y,r.w,r.h,0,0,128,128);return E.pavingPattern=c.createPattern(tile,'repeat');}
function drawPaths(c,sc,time){
  // One opaque, world-aligned material keeps intersecting streets seamless.
  c.save();c.lineCap='round';c.lineJoin='round';const material=pavingPattern(c)||'#9b8761';
  for(const plaza of sc.plazas||[]){path(c,plaza.points);c.fillStyle=material;c.fill();}
  for(const p of sc.paths||[]){const pts=p.points||[];if(pts.length<2)continue;c.strokeStyle=material;c.lineWidth=p.width||80;c.beginPath();pts.forEach((pt,i)=>i?c.lineTo(pt[0],pt[1]):c.moveTo(pt[0],pt[1]));c.stroke();}
  // No per-road translucent stripes or shadows across a joined intersection.
  for(const plaza of sc.plazas||[]){const x=plaza.center?.[0],y=plaza.center?.[1];if(!Number.isFinite(x)||!Number.isFinite(y))continue;c.strokeStyle='#d9c292';c.lineWidth=6;c.beginPath();c.ellipse(x,y,plaza.radius||200,(plaza.radius||200)*.7,0,0,Math.PI*2);c.stroke();c.strokeStyle='#716b57';c.lineWidth=3;c.stroke();}
  c.restore();
}
function drawGroundDetails(c,sc){c.save();c.globalAlpha=.16;const w=sc.size?.w||1700,h=sc.size?.h||1200;for(let i=0;i<750;i++){const x=(i*79)%w,y=(i*151)%h;c.fillStyle=i%8?'#102414':'#d7c36a';c.fillRect(x,y,2+(i%3),2)}c.restore()}
function drawLayer(c,sc,layer){(sc.objects||[]).filter(o=>(o.layer||'props')===layer).sort((a,b)=>(a.y||0)-(b.y||0)).forEach(o=>drawObject(c,o))}function drawObject(c,o){if(o.visible===false)return;TownLife.exterior(E,o);const a=E.catalog[o.asset],im=a&&E.assets[a.src];if(!im)return;WhisperwindAssets.draw(c,im,a,o,E.time||0)}
function drawNpcs(c,sc){for(const n of sc.npcs||[]){c.save();c.translate(n.x,n.y);c.fillStyle='rgba(0,0,0,.32)';c.beginPath();c.ellipse(0,8,18,7,0,0,7);c.fill();c.fillStyle='#f2c35a';c.strokeStyle='#3b250d';c.lineWidth=3;roundRect(c,-15,-38,30,42,10,true,true);c.fillStyle='#ffe2bc';c.beginPath();c.arc(0,-45,10,0,7);c.fill();label(c,n.name||'NPC',0,-62);c.restore()}}
function drawPlayer(c,time){
  c.save();c.translate(E.player.x,E.player.y);
  if(E.pack)drawPackShadow(c);else{c.fillStyle='rgba(0,0,0,.34)';c.beginPath();c.ellipse(0,10,20,8,0,0,7);c.fill();}
  const sheet=E.scene?.playerSprite&&E.assets[E.scene.playerSprite];
  if(E.pack){drawPackCharacter(c,E.player.face,E.player.moving,E.player.walkDistance||0);}else if(sheet){
    const cols=6,fw=sheet.width/cols;
    let fh=128;
    if(sheet.height%256===0)fh=256; else if(sheet.height%128===0)fh=128; else fh=Math.floor(sheet.height/8);
    const rows=Math.max(1,Math.floor(sheet.height/fh));
    let base=0;
    if(E.player.face==='up')base=1;else if(E.player.face==='left')base=2;else if(E.player.face==='right')base=3;
    let row=base;
    if(E.player.moving&&rows>=8)row=base+4;
    const maxFrames=E.player.moving?6:4;
    const col=E.player.moving?(Math.floor(time*8)%maxFrames):(Math.floor(time*2)%Math.min(4,cols));
    const scale=Number(E.scene.playerScale||0.72);
    const dw=fw*scale,dh=fh*scale;
    c.drawImage(sheet,col*fw,row*fh,fw,fh,-dw/2,-dh+12,dw,dh);
  }else{
    c.fillStyle='#4ba3ff';c.strokeStyle='#062033';c.lineWidth=3;roundRect(c,-16,-48,32,52,11,true,true);c.fillStyle='#ffe4b8';c.beginPath();c.arc(0,-57,14,0,7);c.fill();
  }
  label(c,E.displayName||E.username,0,-88);c.restore()
}
function drawPackShadow(c){const s=E.pack.player.motion?.shadow||{y:1,rx:11,ry:3,opacity:.25};c.fillStyle='rgba(0,0,0,'+s.opacity+')';c.beginPath();c.ellipse(0,s.y,s.rx,s.ry,0,0,Math.PI*2);c.fill();}
function drawPackCharacter(c,face,moving,distance){
  const p=E.pack.player,frames=p.walk.directions[face]||p.walk.directions.down;
  if(moving){const stride=p.motion?.cycleDistance||72,r=frames[Math.floor(distance/stride*frames.length)%frames.length],im=E.assets[p.walk.src];
    WhisperwindAssets.draw(c,im,{sourceRect:r,displaySize:{w:r.w/r.h*p.walk.height,h:p.walk.height},placeOrigin:{x:.5,y:(r.h-2)/r.h}},{x:0,y:0});
  }else{const a=E.catalog[p.idle[face]||p.idle.down];WhisperwindAssets.draw(c,E.assets[a.src],a,{x:0,y:0});}
}
function drawPackPeer(c,p){c.save();c.translate(p.x,p.y);drawPackShadow(c);drawPackCharacter(c,p.face||'down',p.moving,p.walkDistance||0);label(c,p.displayName||p.username||'Player',0,-88);c.restore();}
function drawPeers(c){Object.values(E.peers||{}).forEach(p=>{if(!p||p.sceneId!==E.sceneId)return;c.save();c.translate(p.x,p.y);c.globalAlpha=.8;c.fillStyle='rgba(0,0,0,.28)';c.beginPath();c.ellipse(0,10,18,7,0,0,7);c.fill();c.fillStyle='#b084ff';c.strokeStyle='#1d1238';c.lineWidth=3;roundRect(c,-14,-44,28,48,10,true,true);label(c,p.displayName||p.username||'Player',0,-70);c.restore()})}
function label(c,s,x,y){c.font='bold 13px system-ui';c.textAlign='center';c.strokeStyle='rgba(0,0,0,.86)';c.lineWidth=4;c.strokeText(s,x,y);c.fillStyle='#fff';c.fillText(s,x,y)}
function drawHotspot(c){if(!E.near)return;c.save();c.strokeStyle='#ffe58a';c.fillStyle='rgba(255,220,92,.13)';c.lineWidth=3;c.beginPath();c.arc(E.near.x,E.near.y,E.near.r||70,0,7);c.fill();c.stroke();c.restore()}
function drawDebug(c,sc){c.save();c.strokeStyle='#ff4d6d';c.lineWidth=2;(sc.collisions||[]).forEach(b=>{if(Array.isArray(b.points)){c.beginPath();b.points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.stroke()}else c.strokeRect(b.x,b.y,b.w,b.h)});(sc.blockers||[]).forEach(b=>{c.strokeRect(b.x,b.y,b.w,b.h)});(sc.objects||[]).forEach(o=>{if(o.collide){const cc=o.collide,s=o.scale||1;c.strokeRect(o.x+cc[0]*s,o.y+cc[1]*s,cc[2]*s,cc[3]*s)}});c.strokeStyle='#64e3ff';(sc.hotspots||[]).forEach(h=>{c.beginPath();c.arc(h.x,h.y,h.r||60,0,7);c.stroke()});c.fillStyle='#fff';c.font='12px monospace';(sc.districts||[]).forEach(d=>{c.strokeStyle='rgba(255,255,255,.25)';c.strokeRect(d.bounds[0],d.bounds[1],d.bounds[2],d.bounds[3]);c.fillText(d.name,d.bounds[0]+6,d.bounds[1]+16)});c.restore()}
function drawMini(){const m=E.mini,c=m&&m.getContext('2d'),sc=E.scene;if(!c||!sc)return;const d=devicePixelRatio||1;m.width=198*d;m.height=145*d;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,198,145);const sx=198/(sc.size?.w||1700),sy=145/(sc.size?.h||1200);c.fillStyle=sc.mode==='interior'?'#2b211d':'#10281c';c.fillRect(0,0,198,145);c.lineCap='round';c.lineJoin='round';for(const p of sc.paths||[]){c.strokeStyle=p.kind==='stairs'?'#c9c0a4':p.kind==='alley'?'#7b6546':'#8d744c';c.lineWidth=Math.max(2,(p.width||80)*sx);c.beginPath();(p.points||[]).forEach((pt,i)=>i?c.lineTo(pt[0]*sx,pt[1]*sy):c.moveTo(pt[0]*sx,pt[1]*sy));c.stroke()}for(const h of sc.hotspots||[]){c.fillStyle=h.type==='door'||h.type==='home'?'#ffd166':h.type==='stairs'?'#fb8b24':'#9bd5ff';c.fillRect(h.x*sx-2,h.y*sy-2,4,4)}c.fillStyle='#5ecbff';c.beginPath();c.arc(E.player.x*sx,E.player.y*sy,4,0,7);c.fill()}
function path(c,pts){c.beginPath();(pts||[]).forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath()}function roundRect(c,x,y,w,h,r,fill,stroke){if(c.roundRect){c.beginPath();c.roundRect(x,y,w,h,r);if(fill)c.fill();if(stroke)c.stroke();return}c.beginPath();c.rect(x,y,w,h);if(fill)c.fill();if(stroke)c.stroke()}

function itemGroup(it){const id=String(it.id||it.itemId||'').toLowerCase(),type=String(it.type||it.category||'').toLowerCase(),tags=String((it.tags||[]).join?it.tags.join(' '):it.tags||'').toLowerCase();if(type.includes('fish')||tags.includes('fish')||id.includes('fish')||id.includes('rod')||id.includes('lure')||id.includes('bait'))return 'Fishing';if(type.includes('pet')||tags.includes('pet')||id.includes('egg'))return 'Pets';if(type.includes('food')||type.includes('consum')||tags.includes('food'))return 'Consumables';if(type.includes('craft')||type.includes('material')||tags.includes('craft'))return 'Materials';if(type.includes('quest')||tags.includes('quest')||id.includes('key'))return 'Quest';return 'Misc';}
function showBackpack(){const box=$('#wfBagBox');if(!box)return;const inv=(E.context&&E.context.inventory)||[];const groups={All:inv};inv.forEach(it=>{const g=itemGroup(it);groups[g]=groups[g]||[];groups[g].push(it)});const order=['All','Consumables','Materials','Fishing','Pets','Quest','Misc'].filter(g=>groups[g]&&groups[g].length);let active=box.dataset.tab||order[0]||'All';if(!groups[active])active=order[0]||'All';function render(tab){active=tab;box.dataset.tab=tab;const list=(groups[tab]||[]).slice().sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id)));box.innerHTML='<h2>🎒 Backpack</h2><div class="wfBagTabs">'+order.map(g=>'<button data-tab="'+esc(g)+'" class="'+(g===tab?'on':'')+'">'+esc(g)+' ('+groups[g].length+')</button>').join('')+'</div>'+(list.length?'<div class="wfBagGrid">'+list.map(it=>'<div class="wfBagItem"><b>'+esc(it.name||it.id||it.itemId||'Item')+'</b><span>'+esc(itemGroup(it))+' · ×'+Number(it.quantity||it.qty||1)+'</span><span>'+esc(it.description||it.id||it.itemId||'')+'</span></div>').join('')+'</div>':'<div class="wfBagEmpty">No items in this tab.</div>')+'<div class="actions" style="margin-top:12px"><button id="wfCloseBag">Close</button></div>';box.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>render(b.dataset.tab));$('#wfCloseBag').onclick=hideBackpack;}render(active);box.classList.add('show')}
function hideBackpack(){const box=$('#wfBagBox');if(box)box.classList.remove('show')}

function updateWorldPeer(p){const old=E.peers[p.id];const distance=old&&old.sceneId===p.sceneId?Math.hypot(p.x-old.x,p.y-old.y):0;E.peers[p.id]={...p,walkDistance:(old?.walkDistance||0)+distance};}
function connectWorldSocket(){try{if(E.ws)return;const proto=location.protocol==='https:'?'wss':'ws',ws=new WebSocket(proto+'://'+location.host);E.ws=ws;ws.onopen=()=>sendWorldJoin();ws.onmessage=ev=>{try{const m=JSON.parse(ev.data);if(m.type==='error'&&m.code==='home_access'){toast(m.message);loadScene('whisperwind_hd_waterfront');}if(m.type==='worldWelcome')(m.peers||[]).forEach(p=>E.peers[p.id]=p);if(m.type==='worldJoin'&&m.player)E.peers[m.player.id]=m.player;if(m.type==='worldMove'&&m.player)updateWorldPeer(m.player);if(m.type==='worldLeave')delete E.peers[m.id]}catch(e){}};ws.onclose=()=>{E.ws=null;setTimeout(connectWorldSocket,3000)}}catch(e){}}
function worldAppearance(){return {displayName:E.displayName,activePet:E.context?.activePet?{name:E.context.activePet.name,emoji:E.context.activePet.emoji,level:E.context.activePet.level}:null,coins:Number(E.context?.coins||0)}}
function sendWorldJoin(){if(E.ws&&E.ws.readyState===1&&E.sceneId)E.ws.send(JSON.stringify({type:'worldJoin',sceneId:E.sceneId,username:E.username,displayName:E.displayName,x:E.player.x,y:E.player.y,face:E.player.face,moving:E.player.moving,appearance:worldAppearance()}))}
let lastMove=0;function sendWorldMoveThrottled(){const now=performance.now();if(now-lastMove<90)return;lastMove=now;if(E.ws&&E.ws.readyState===1)E.ws.send(JSON.stringify({type:'worldMove',x:E.player.x,y:E.player.y,face:E.player.face,moving:E.player.moving,appearance:worldAppearance()}))}
window.WorldForgerEngine={start,loadScene,loadWorldContext};window.PetWorldWorldEngine=window.WorldForgerEngine;
})();

