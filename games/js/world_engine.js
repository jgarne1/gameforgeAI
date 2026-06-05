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
  r.innerHTML='<canvas class="wfCanvas"></canvas><div class="wfHud"><div class="wfPanel wfTop"><h1 id="wfTitle">World Forger</h1><p id="wfSub">Loading layered hub…</p></div><div class="wfPanel wfProfile" id="wfProfile"><h2>Player</h2><div class="muted">Loading account context…</div></div><button class="wfClose" id="wfClose">Leave</button><div class="wfPanel wfMini"><canvas id="wfMini"></canvas></div><div class="wfTools"><button id="wfDebug">Boundaries</button><button id="wfZoomIn">Zoom +</button><button id="wfZoomOut">Zoom -</button><a href="/games/world_composer.html">Composer</a><a href="/games/petworld.html">Pet World</a></div><div id="wfPrompt" class="wfPrompt" style="display:none"></div><div class="wfPanel wfMsg" id="wfMsg"></div><div class="wfPanel wfHint">WASD / arrows · E interact · wheel zoom · B boundaries</div><div class="wfBackpack"><button id="wfBagBtn">🎒 Backpack</button></div><div class="wfPanel wfBagBox" id="wfBagBox"></div><div class="wfPanel wfHomeBox" id="wfHomeBox"></div><div class="wfFade" id="wfFade"></div></div>';
  document.body.appendChild(r);E.root=r;E.canvas=r.querySelector('.wfCanvas');E.ctx=E.canvas.getContext('2d');E.mini=$('#wfMini');
  $('#wfClose').onclick=()=>{if(E.onClose)E.onClose();else location.href='/'};
  $('#wfBagBtn').onclick=()=>showBackpack();
  $('#wfDebug').onclick=function(){E.debug=!E.debug;this.classList.toggle('on',E.debug)};
  $('#wfZoomIn').onclick=()=>E.cam.zoom=Math.min(1.9,E.cam.zoom+.12);
  $('#wfZoomOut').onclick=()=>E.cam.zoom=Math.max(.55,E.cam.zoom-.12);
  window.addEventListener('resize',resize);window.addEventListener('keydown',key,true);window.addEventListener('keyup',key,true);
  E.canvas.addEventListener('wheel',ev=>{ev.preventDefault();E.cam.zoom=Math.max(.55,Math.min(1.9,E.cam.zoom+(ev.deltaY<0?.08:-.08)))},{passive:false});
  resize();
}
function resize(){if(!E.canvas)return;const d=devicePixelRatio||1;E.canvas.width=innerWidth*d;E.canvas.height=innerHeight*d;E.canvas.style.width=innerWidth+'px';E.canvas.style.height=innerHeight+'px';E.ctx.setTransform(d,0,0,d,0,0)}
function key(ev){const down=ev.type==='keydown',k=ev.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','e','b','i','escape'].includes(k)){if(k==='e'&&down){interact();ev.preventDefault();return}
    if(k==='i'&&down){showBackpack();ev.preventDefault();return}if(k==='b'&&down){E.debug=!E.debug;const b=$('#wfDebug');if(b)b.classList.toggle('on',E.debug);return}if(k==='escape'&&down){hideHomeBox();hideBackpack();return}E.keys[k]=down;ev.preventDefault()}}
async function start(o){
  o=o||{};E.username=o.username||localStorage.getItem('gf_user')||'Wanderer';E.displayName=E.username;E.onClose=o.onClose;
  mount();await loadWorldContext();await loadScene(o.sceneId||new URLSearchParams(location.search).get('scene')||'whisperwind_v2_hub');connectWorldSocket();E.last=performance.now();cancelAnimationFrame(E.raf);E.raf=requestAnimationFrame(loop);
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
async function loadScene(id,spawn){
  E.sceneId=id||'whisperwind_v2_hub';$('#wfFade')?.classList.add('on');
  try{
    const [sc,cat]=await Promise.all([loadJson('/assets/worlds/'+E.sceneId+'.json'),loadJson('/assets/worlds/world_asset_catalog.json').catch(()=>loadJson('/data/world_asset_catalog.json'))]);
    E.scene=sc;E.catalog={};(cat.assets||[]).forEach(a=>E.catalog[a.id]=a);
    const p=spawn||sc.spawn||{};E.player.x=Number(p.x||E.player.x||100);E.player.y=Number(p.y||E.player.y||100);E.player.face=p.face||E.player.face||'down';
    $('#wfTitle').textContent=sc.name||E.sceneId;$('#wfSub').textContent=sc.mode==='interior'?'Interior scene · E exits/interacts':'Layered hub · doors, stairs, homes, alleys';
    const imgs=[];(sc.objects||[]).forEach(o=>{const a=E.catalog[o.asset];if(a&&a.src)imgs.push(loadImg(a.src))});if(sc.background)imgs.push(loadImg(sc.background));if(sc.playerSprite)imgs.push(loadImg(sc.playerSprite));await Promise.all(imgs);
    toast(sc.name||'Scene loaded');sendWorldJoin();
  }catch(err){document.body.innerHTML='<div class="wfError">World load failed.\n\n'+esc(err.message||err)+'\n\nScene: '+esc(E.sceneId)+'</div>';throw err}
  finally{setTimeout(()=>$('#wfFade')&&$('#wfFade').classList.remove('on'),120)}
}
function loop(t){const dt=Math.min(.033,(t-E.last)/1000||.016);E.last=t;update(dt);render(t/1000);E.raf=requestAnimationFrame(loop)}
function update(dt){
  if(!E.scene)return;let ax=0,ay=0;if(E.keys.w||E.keys.arrowup)ay-=1;if(E.keys.s||E.keys.arrowdown)ay+=1;if(E.keys.a||E.keys.arrowleft)ax-=1;if(E.keys.d||E.keys.arrowright)ax+=1;const len=Math.hypot(ax,ay)||1;ax/=len;ay/=len;
  const speed=E.scene.mode==='interior'?210:250,tvx=ax*speed,tvy=ay*speed;E.player.vx+=(tvx-E.player.vx)*Math.min(1,dt*11);E.player.vy+=(tvy-E.player.vy)*Math.min(1,dt*11);
  const nx=E.player.x+E.player.vx*dt,ny=E.player.y+E.player.vy*dt;if(canStand(nx,ny)){E.player.x=nx;E.player.y=ny}else{if(canStand(nx,E.player.y))E.player.x=nx;else E.player.vx*=.12;if(canStand(E.player.x,ny))E.player.y=ny;else E.player.vy*=.12}
  E.player.moving=Math.hypot(E.player.vx,E.player.vy)>18;if(Math.abs(E.player.vx)>Math.abs(E.player.vy)+3)E.player.face=E.player.vx<0?'left':'right';else if(Math.abs(E.player.vy)>8)E.player.face=E.player.vy<0?'up':'down';
  const sw=E.scene.size?.w||1700,sh=E.scene.size?.h||1200,tx=E.player.x-innerWidth/(2*E.cam.zoom),ty=E.player.y-innerHeight/(2*E.cam.zoom);E.cam.x+=(tx-E.cam.x)*Math.min(1,dt*6);E.cam.y+=(ty-E.cam.y)*Math.min(1,dt*6);E.cam.x=Math.max(0,Math.min(Math.max(0,sw-innerWidth/E.cam.zoom),E.cam.x));E.cam.y=Math.max(0,Math.min(Math.max(0,sh-innerHeight/E.cam.zoom),E.cam.y));
  findNear();if(E.msgTimer>0){E.msgTimer-=dt;if(E.msgTimer<=0)$('#wfMsg')?.classList.remove('show')}sendWorldMoveThrottled();
}
function canStand(x,y){const sc=E.scene;if(!sc)return true;const w=sc.size?.w||1700,h=sc.size?.h||1200;if(x<8||y<8||x>w-8||y>h-8)return false;for(const b of [...(sc.collisions||[]),...(sc.blockers||[])]){if(!b)continue;if(Number.isFinite(Number(b.x))&&x>Number(b.x)&&x<Number(b.x)+Number(b.w||0)&&y>Number(b.y)&&y<Number(b.y)+Number(b.h||0))return false}
  for(const o of sc.objects||[]){if(!o.collide)continue;const c=o.collide,s=o.scale||1,rx=o.x+c[0]*s,ry=o.y+c[1]*s,rw=c[2]*s,rh=c[3]*s;if(x>rx&&x<rx+rw&&y>ry&&y<ry+rh)return false}return true}
function allInteractables(){const hs=[...(E.scene?.hotspots||[]),...(E.scene?.npcs||[])];for(const o of (E.scene?.objects||[])){if(!o.interactive)continue;hs.push({...o,_objectRef:o,type:o.interactionType||o.type||'message',label:o.label||o.name||o.asset||'Interact',message:o.text||o.message||'',r:o.interactionRadius||70});}return hs;}
function findNear(){E.near=null;let best=1e9;for(const h of allInteractables()){const d=Math.hypot(E.player.x-h.x,E.player.y-h.y);if(d<(h.r||65)&&d<best){best=d;E.near=h}}const p=$('#wfPrompt');if(E.near){const sp=worldToScreen(E.near.x,E.near.y);p.style.left=sp.x+'px';p.style.top=sp.y+'px';p.style.display='block';p.textContent='E · '+(E.near.label||E.near.name||'Interact')}else if(p)p.style.display='none'}
async function interact(){
  const h=E.near;if(!h){toast('Nothing close enough.');return}
  const type=String(h.type||h.interactionType||'message').toLowerCase();
  if(type==='door'){toast(h.message||'Entering…');await sleep(150);loadScene(h.targetScene,h.targetSpawn);return}
  if(type==='stairs'){toast(h.message||'You take the stairs.');const t=h.target||{};E.player.x=t.x||E.player.x;E.player.y=t.y||E.player.y;return}
  if(type==='link'){toast(h.message||'Opening…');setTimeout(()=>{if(h.href)location.href=h.href},350);return}
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
function showHomeBox(h){
  const owned=(E.context?.homes||[]).find(x=>x.plotId===(h.plotId||''));
  const box=$('#wfHomeBox');box.innerHTML='<h2>'+esc(h.label||'Home')+'</h2><p>'+esc(owned?('Owned by you · '+owned.name):(h.message||'This can be your home.'))+'</p><div><button id="wfEnterHome">Enter</button><button id="wfClaimHome">Claim</button><button id="wfCancelHome">Cancel</button></div>';box.classList.add('show');
  $('#wfCancelHome').onclick=hideHomeBox;$('#wfEnterHome').onclick=()=>{hideHomeBox();if(h.targetScene)loadScene(h.targetScene,h.targetSpawn);else toast('This home does not have an interior yet.')};$('#wfClaimHome').onclick=()=>claimHome(h);
}
function hideHomeBox(){const box=$('#wfHomeBox');if(box)box.classList.remove('show')}
async function claimHome(h){try{const username=E.username||localStorage.getItem('gf_user')||'Wanderer';const r=await fetch('/api/estate/neighborhoods/'+encodeURIComponent(h.neighborhoodId||'whisperwind_01')+'/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,plotId:h.plotId||'plot_01'})});const data=await r.json();if(data.ok){toast('Home claimed: '+(data.plot?.name||h.label||'Cottage'));await loadWorldContext();}else toast(data.error||'Could not claim this home.');hideHomeBox()}catch(err){toast('Home claim failed: '+err.message)}}
function toast(s){const m=$('#wfMsg');if(!m)return;m.innerHTML=esc(s);m.classList.add('show');E.msgTimer=4}
function worldToScreen(x,y){return{x:(x-E.cam.x)*E.cam.zoom,y:(y-E.cam.y)*E.cam.zoom}}function applyCam(){const d=devicePixelRatio||1;E.ctx.setTransform(d*E.cam.zoom,0,0,d*E.cam.zoom,-E.cam.x*d*E.cam.zoom,-E.cam.y*d*E.cam.zoom)}function reset(){const d=devicePixelRatio||1;E.ctx.setTransform(d,0,0,d,0,0)}
function render(time){const c=E.ctx,sc=E.scene;if(!c||!sc)return;reset();c.clearRect(0,0,innerWidth,innerHeight);applyCam();drawBase(c,sc,time);drawLayer(c,sc,'structures');drawLayer(c,sc,'buildings');drawNpcs(c,sc);drawPeers(c);drawPlayer(c,time);drawLayer(c,sc,'props');drawLayer(c,sc,'canopy');drawHotspot(c);if(E.debug)drawDebug(c,sc);reset();drawMini()}
function drawBase(c,sc,time){if(sc.mode==='interior'){const it=sc.interior||{};c.fillStyle=it.wall||'#2c211c';c.fillRect(0,0,sc.size.w,sc.size.h);c.fillStyle=it.floor||'#60422c';roundRect(c,80,130,sc.size.w-160,sc.size.h-190,24,true,false);c.strokeStyle=it.trim||'#d1a75d';c.lineWidth=10;c.stroke();c.fillStyle=it.rug||'#6d3340';roundRect(c,sc.size.w/2-160,sc.size.h/2-40,320,150,18,true,false);return}const w=sc.size?.w||1700,h=sc.size?.h||1200,skin=sc.groundSkin||'whisperwind';const palettes={whisperwind:['#163523','#356b3d','#203d2b'],forest:['#204d2c','#5b8542','#18351f'],dusk:['#172437','#334d5f','#101828'],sand:['#5f5532','#a18b57','#2d4a43']};const pal=palettes[skin]||palettes.whisperwind,g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,pal[0]);g.addColorStop(.5,pal[1]);g.addColorStop(1,pal[2]);c.fillStyle=g;c.fillRect(0,0,w,h);const bg=sc.background&&E.assets[sc.background];if(bg)c.drawImage(bg,0,0,w,h);drawTerraces(c,sc);drawWater(c,sc,time);drawPaths(c,sc,time);drawGroundDetails(c,sc)}
function drawTerraces(c,sc){for(const t of sc.paint?.terraces||[]){path(c,t.points);c.fillStyle=t.fill||'#315f39';c.fill();c.strokeStyle='rgba(8,18,12,.55)';c.lineWidth=8;c.stroke();c.strokeStyle='rgba(224,205,130,.18)';c.lineWidth=2;c.stroke()}}
function drawWater(c,sc,time){for(const wat of sc.terrain?.water||[]){path(c,wat.points);c.fillStyle='#15536c';c.fill();c.save();c.clip();for(let i=0;i<16;i++){c.strokeStyle=i%2?'rgba(190,240,255,.18)':'rgba(95,200,220,.16)';c.lineWidth=2;c.beginPath();let y=(i*60+time*28)%520+720;for(let x=-80;x<(sc.size?.w||1700)+80;x+=40){let yy=y+Math.sin((x+i*70)*.012+time)*8;if(x===-80)c.moveTo(x,yy);else c.lineTo(x,yy)}c.stroke()}c.restore();c.strokeStyle='rgba(118,225,221,.45)';c.lineWidth=4;c.stroke()}}
function drawPaths(c,sc,time){for(const p of sc.paths||[]){const pts=p.points||[];if(pts.length<2)continue;c.save();c.lineCap='round';c.lineJoin='round';const width=p.width||80,base=p.kind==='plaza'?'#9b8761':p.kind==='alley'?'#786244':p.kind==='stairs'?'#887e6a':'#92774e';c.strokeStyle='rgba(39,30,20,.26)';c.lineWidth=width+14;c.beginPath();pts.forEach((pt,i)=>i?c.lineTo(pt[0],pt[1]):c.moveTo(pt[0],pt[1]));c.stroke();c.strokeStyle=base;c.lineWidth=width;c.stroke();c.strokeStyle='rgba(218,195,139,.35)';c.lineWidth=width*.42;c.stroke();if(p.kind==='stairs'){c.strokeStyle='rgba(50,43,36,.72)';c.lineWidth=3;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];for(let t=.12;t<1;t+=.22){const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;c.beginPath();c.moveTo(x-25,y-8);c.lineTo(x+25,y+8);c.stroke()}}}else{c.globalAlpha=.35;for(let i=0;i<40;i++){const a=pts[i%(pts.length-1)],b=pts[(i%(pts.length-1))+1],t=((i*37)%100)/100,x=a[0]+(b[0]-a[0])*t+(i%7-3)*8,y=a[1]+(b[1]-a[1])*t+(i%5-2)*8;c.fillStyle=i%2?'#4d3d2a':'#d2bd8a';c.beginPath();c.ellipse(x,y,2+i%4,1+i%3,0,0,7);c.fill()}}c.restore()}}
function drawGroundDetails(c,sc){c.save();c.globalAlpha=.16;const w=sc.size?.w||1700,h=sc.size?.h||1200;for(let i=0;i<750;i++){const x=(i*79)%w,y=(i*151)%h;c.fillStyle=i%8?'#102414':'#d7c36a';c.fillRect(x,y,2+(i%3),2)}c.restore()}
function drawLayer(c,sc,layer){(sc.objects||[]).filter(o=>(o.layer||'props')===layer).sort((a,b)=>(a.y||0)-(b.y||0)).forEach(o=>drawObject(c,o))}function drawObject(c,o){if(o.visible===false)return;const a=E.catalog[o.asset],im=a&&E.assets[a.src];if(!im)return;c.save();c.translate(o.x,o.y);if(o.rotation)c.rotate(o.rotation);const s=o.scale||1;c.scale(s,s);c.drawImage(im,-im.width/2,-im.height);if(o.tint){c.globalAlpha=.25;c.globalCompositeOperation='source-atop';c.fillStyle=o.tint;c.fillRect(-im.width/2,-im.height,im.width,im.height);c.globalCompositeOperation='source-over';c.globalAlpha=1}c.restore()}
function drawNpcs(c,sc){for(const n of sc.npcs||[]){c.save();c.translate(n.x,n.y);c.fillStyle='rgba(0,0,0,.32)';c.beginPath();c.ellipse(0,8,18,7,0,0,7);c.fill();c.fillStyle='#f2c35a';c.strokeStyle='#3b250d';c.lineWidth=3;roundRect(c,-15,-38,30,42,10,true,true);c.fillStyle='#ffe2bc';c.beginPath();c.arc(0,-45,10,0,7);c.fill();label(c,n.name||'NPC',0,-62);c.restore()}}
function drawPlayer(c,time){
  c.save();c.translate(E.player.x,E.player.y);
  c.fillStyle='rgba(0,0,0,.34)';c.beginPath();c.ellipse(0,10,20,8,0,0,7);c.fill();
  const sheet=E.scene?.playerSprite&&E.assets[E.scene.playerSprite];
  if(sheet){
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
function drawPeers(c){Object.values(E.peers||{}).forEach(p=>{if(!p||p.sceneId!==E.sceneId)return;c.save();c.translate(p.x,p.y);c.globalAlpha=.8;c.fillStyle='rgba(0,0,0,.28)';c.beginPath();c.ellipse(0,10,18,7,0,0,7);c.fill();c.fillStyle='#b084ff';c.strokeStyle='#1d1238';c.lineWidth=3;roundRect(c,-14,-44,28,48,10,true,true);label(c,p.displayName||p.username||'Player',0,-70);c.restore()})}
function label(c,s,x,y){c.font='bold 13px system-ui';c.textAlign='center';c.strokeStyle='rgba(0,0,0,.86)';c.lineWidth=4;c.strokeText(s,x,y);c.fillStyle='#fff';c.fillText(s,x,y)}
function drawHotspot(c){if(!E.near)return;c.save();c.strokeStyle='#ffe58a';c.fillStyle='rgba(255,220,92,.13)';c.lineWidth=3;c.beginPath();c.arc(E.near.x,E.near.y,E.near.r||70,0,7);c.fill();c.stroke();c.restore()}
function drawDebug(c,sc){c.save();c.strokeStyle='#ff4d6d';c.lineWidth=2;(sc.collisions||[]).forEach(b=>{c.strokeRect(b.x,b.y,b.w,b.h)});(sc.blockers||[]).forEach(b=>{c.strokeRect(b.x,b.y,b.w,b.h)});(sc.objects||[]).forEach(o=>{if(o.collide){const cc=o.collide,s=o.scale||1;c.strokeRect(o.x+cc[0]*s,o.y+cc[1]*s,cc[2]*s,cc[3]*s)}});c.strokeStyle='#64e3ff';(sc.hotspots||[]).forEach(h=>{c.beginPath();c.arc(h.x,h.y,h.r||60,0,7);c.stroke()});c.fillStyle='#fff';c.font='12px monospace';(sc.districts||[]).forEach(d=>{c.strokeStyle='rgba(255,255,255,.25)';c.strokeRect(d.bounds[0],d.bounds[1],d.bounds[2],d.bounds[3]);c.fillText(d.name,d.bounds[0]+6,d.bounds[1]+16)});c.restore()}
function drawMini(){const m=E.mini,c=m&&m.getContext('2d'),sc=E.scene;if(!c||!sc)return;const d=devicePixelRatio||1;m.width=198*d;m.height=145*d;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,198,145);const sx=198/(sc.size?.w||1700),sy=145/(sc.size?.h||1200);c.fillStyle=sc.mode==='interior'?'#2b211d':'#10281c';c.fillRect(0,0,198,145);c.lineCap='round';c.lineJoin='round';for(const p of sc.paths||[]){c.strokeStyle=p.kind==='stairs'?'#c9c0a4':p.kind==='alley'?'#7b6546':'#8d744c';c.lineWidth=Math.max(2,(p.width||80)*sx);c.beginPath();(p.points||[]).forEach((pt,i)=>i?c.lineTo(pt[0]*sx,pt[1]*sy):c.moveTo(pt[0]*sx,pt[1]*sy));c.stroke()}for(const h of sc.hotspots||[]){c.fillStyle=h.type==='door'||h.type==='home'?'#ffd166':h.type==='stairs'?'#fb8b24':'#9bd5ff';c.fillRect(h.x*sx-2,h.y*sy-2,4,4)}c.fillStyle='#5ecbff';c.beginPath();c.arc(E.player.x*sx,E.player.y*sy,4,0,7);c.fill()}
function path(c,pts){c.beginPath();(pts||[]).forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath()}function roundRect(c,x,y,w,h,r,fill,stroke){if(c.roundRect){c.beginPath();c.roundRect(x,y,w,h,r);if(fill)c.fill();if(stroke)c.stroke();return}c.beginPath();c.rect(x,y,w,h);if(fill)c.fill();if(stroke)c.stroke()}

function itemGroup(it){const id=String(it.id||it.itemId||'').toLowerCase(),type=String(it.type||it.category||'').toLowerCase(),tags=String((it.tags||[]).join?it.tags.join(' '):it.tags||'').toLowerCase();if(type.includes('fish')||tags.includes('fish')||id.includes('fish')||id.includes('rod')||id.includes('lure')||id.includes('bait'))return 'Fishing';if(type.includes('pet')||tags.includes('pet')||id.includes('egg'))return 'Pets';if(type.includes('food')||type.includes('consum')||tags.includes('food'))return 'Consumables';if(type.includes('craft')||type.includes('material')||tags.includes('craft'))return 'Materials';if(type.includes('quest')||tags.includes('quest')||id.includes('key'))return 'Quest';return 'Misc';}
function showBackpack(){const box=$('#wfBagBox');if(!box)return;const inv=(E.context&&E.context.inventory)||[];const groups={All:inv};inv.forEach(it=>{const g=itemGroup(it);groups[g]=groups[g]||[];groups[g].push(it)});const order=['All','Consumables','Materials','Fishing','Pets','Quest','Misc'].filter(g=>groups[g]&&groups[g].length);let active=box.dataset.tab||order[0]||'All';if(!groups[active])active=order[0]||'All';function render(tab){active=tab;box.dataset.tab=tab;const list=(groups[tab]||[]).slice().sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id)));box.innerHTML='<h2>🎒 Backpack</h2><div class="wfBagTabs">'+order.map(g=>'<button data-tab="'+esc(g)+'" class="'+(g===tab?'on':'')+'">'+esc(g)+' ('+groups[g].length+')</button>').join('')+'</div>'+(list.length?'<div class="wfBagGrid">'+list.map(it=>'<div class="wfBagItem"><b>'+esc(it.name||it.id||it.itemId||'Item')+'</b><span>'+esc(itemGroup(it))+' · ×'+Number(it.quantity||it.qty||1)+'</span><span>'+esc(it.description||it.id||it.itemId||'')+'</span></div>').join('')+'</div>':'<div class="wfBagEmpty">No items in this tab.</div>')+'<div class="actions" style="margin-top:12px"><button id="wfCloseBag">Close</button></div>';box.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>render(b.dataset.tab));$('#wfCloseBag').onclick=hideBackpack;}render(active);box.classList.add('show')}
function hideBackpack(){const box=$('#wfBagBox');if(box)box.classList.remove('show')}

function connectWorldSocket(){try{if(E.ws)return;const proto=location.protocol==='https:'?'wss':'ws',ws=new WebSocket(proto+'://'+location.host);E.ws=ws;ws.onopen=()=>sendWorldJoin();ws.onmessage=ev=>{try{const m=JSON.parse(ev.data);if(m.type==='worldWelcome')(m.peers||[]).forEach(p=>E.peers[p.id]=p);if(m.type==='worldJoin'&&m.player)E.peers[m.player.id]=m.player;if(m.type==='worldMove'&&m.player)E.peers[m.player.id]=m.player;if(m.type==='worldLeave')delete E.peers[m.id]}catch(e){}};ws.onclose=()=>{E.ws=null;setTimeout(connectWorldSocket,3000)}}catch(e){}}
function worldAppearance(){return {displayName:E.displayName,activePet:E.context?.activePet?{name:E.context.activePet.name,emoji:E.context.activePet.emoji,level:E.context.activePet.level}:null,coins:Number(E.context?.coins||0)}}
function sendWorldJoin(){if(E.ws&&E.ws.readyState===1&&E.sceneId)E.ws.send(JSON.stringify({type:'worldJoin',sceneId:E.sceneId,username:E.username,displayName:E.displayName,x:E.player.x,y:E.player.y,face:E.player.face,moving:E.player.moving,appearance:worldAppearance()}))}
let lastMove=0;function sendWorldMoveThrottled(){const now=performance.now();if(now-lastMove<90)return;lastMove=now;if(E.ws&&E.ws.readyState===1)E.ws.send(JSON.stringify({type:'worldMove',x:E.player.x,y:E.player.y,face:E.player.face,moving:E.player.moving,appearance:worldAppearance()}))}
window.WorldForgerEngine={start,loadScene,loadWorldContext};window.PetWorldWorldEngine=window.WorldForgerEngine;
})();
