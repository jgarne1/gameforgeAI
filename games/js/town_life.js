(function(){
'use strict';
let actions={};const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function json(url,body){const r=await fetch(url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const d=await r.json();if(!r.ok||d.error)throw Error(d.error||'Could not complete action.');return d;}
function modal(E,html){E.keys={};E.target=null;E.route=[];E.player.vx=E.player.vy=0;const b=$('#wfHomeBox');b.style.maxHeight='80vh';b.style.overflow='auto';b.innerHTML=html+'<p><button id="townClose">Close</button></p>';b.classList.add('show');$('#townClose').onclick=()=>b.classList.remove('show');return b;}
async function prepare(E,sc){
  if(!E.guidePlaces)E.guidePlaces=(await json('/assets/worlds/whisperwind_hd_waterfront.json')).guidePlaces;
  E.npcSkins=await json('/api/town/npc-skins').catch(()=>({skins:{}}));
  for(const n of sc.npcs||[])n.skinId=E.npcSkins.overrides?.[sc.id+':'+n.id]||n.skinId;
  if(sc.id==='whisperwind_hd_waterfront'){E.townHomes=(await json('/api/town/homes')).plots;E.guidePlaces=sc.guidePlaces;for(const o of sc.objects||[])if(o.plotId)o._defaultAsset=o.asset;}
  if(sc.home?.canEdit){const b=$('#townDecorate');if(b)b.hidden=false;}else if($('#townDecorate'))$('#townDecorate').hidden=true;
}
function tools(E,a){
  actions=a;const tools=$('.wfTools');const profile=document.createElement('button');profile.textContent='Player Details';profile.onclick=()=>$('#wfProfile').hidden=!$('#wfProfile').hidden;tools.append(profile);
  const guide=document.createElement('button');guide.textContent='Town Guide';guide.onclick=()=>showGuide(E);tools.append(guide);
  const house=document.createElement('button');house.textContent='My Homes';house.onclick=()=>homesList(E);tools.append(house);
  const edit=document.createElement('button');edit.id='townDecorate';edit.textContent='Decorate Home';edit.hidden=true;edit.onclick=()=>location.href='/games/home_editor.html?plot='+encodeURIComponent(E.scene.home.plotId);tools.append(edit);
}
function showGuide(E){
  const places=(E.scene.guidePlaces||E.guidePlaces||[]).map(p=>[p.name,p.x,p.y]);
  const b=modal(E,'<h2>Whisperwind Town Guide</h2><p>Meet Mira, Toma and the Dockmaster. Find a home and leave your mark on a town that remembers its neighbors.</p><p>Choose a place to walk there, or use its door when you arrive.</p>'+(E.scene.npcs||[]).map(n=>'<button data-resident="'+esc(n.id)+'">Meet '+esc(n.name)+'</button>').join('')+'<p></p>'+places.map((p,i)=>'<button data-place="'+i+'">'+esc(p[0])+'</button>').join('')+'<p><a href="/games/world.html?scene=shadow_woods_dock">Go fishing in Shadow Woods</a> · <a href="/games/market.html">Marketplace</a> · <a href="/games/petworld.html">Care for pets and play games</a></p><p id="townStory">Loading your introductions…</p>');
  b.querySelectorAll('[data-place]').forEach(btn=>btn.onclick=async()=>{b.classList.remove('show');if(E.scene.mode==='interior')await actions.loadScene('whisperwind_hd_waterfront');const p=places[Number(btn.dataset.place)];E.route=TownMotion.route(E.player,{x:p[1],y:p[2]},(x,y)=>window.TownWalkable(x,y),E.scene.size);E.target=E.route.shift();b.classList.remove('show');if(!E.target)actions.toast('Walk onto the street and try again.');});
  b.querySelectorAll('[data-resident]').forEach(btn=>btn.onclick=()=>{const n=E.scene.npcs.find(n=>n.id===btn.dataset.resident);const route=TownMotion.route(E.player,n,window.TownWalkable,E.scene.size);if(!route.length){actions.toast('Move onto the street and try again.');return;}E.followNpc=n.id;E.route=route;E.target=E.route.shift();b.classList.remove('show');});
  json('/api/town/story').then(d=>{const t=$('#townStory');if(t)t.textContent=d.story.complete?'A Place to Begin — complete. The residents know your name. The worn hammer mark by the old dock hints at a larger story.':'A Place to Begin — introductions '+(d.story.visits||[]).length+'/3. Speak to Mira at the tavern, Toma at the Pet Center, and the Dockmaster by the river.';}).catch(e=>{if($('#townStory'))$('#townStory').textContent=e.message;});
}
async function homesList(E){
  try{const d=await json('/api/town/homes');E.townHomes=d.plots;const mine=d.plots.filter(p=>String(p.owner).toLowerCase()===E.username.toLowerCase());
    const b=modal(E,'<h2>Homes and Apartments</h2><p>Your first unowned Hometown home is a free newcomer grant. Additional homes use your existing coins. An owned home cannot be bought unless its owner lists it.</p>'+mine.map(p=>'<p><button data-home="'+esc(p.id)+'">'+esc(p.name)+'</button> '+(p.listing?'Listed for '+p.listing.price+' coins':'Owned · protected')+'</p>').join('')+'<h3>Available addresses</h3>'+d.plots.filter(p=>p.id.startsWith('town_home_')&&(!p.owner||p.listing)).map(p=>'<p><button data-home="'+esc(p.id)+'">'+esc(p.name)+'</button> '+(p.listing?p.listing.price:p.saleValue)+' coins'+(!p.owner?' · newcomer grant eligible':' · resale')+'</p>').join(''));
    b.querySelectorAll('[data-home]').forEach(btn=>btn.onclick=()=>home(E,{plotId:btn.dataset.home},actions));
  }catch(e){actions.toast(e.message);}
}
async function home(E,h,a){
  try{const d=await json('/api/town/homes');E.townHomes=d.plots;const p=d.plots.find(p=>p.id===h.plotId);if(!p)throw Error('Home unavailable.');
    const mine=String(p.owner||'').toLowerCase()===E.username.toLowerCase();
    const b=modal(E,'<h2>'+esc(p.name)+'</h2><p>'+esc(mine?'Your home · '+(p.listing?'Listed for '+p.listing.price+' coins':'Protected from purchase'):p.owner?'Owned by '+p.owner+(p.listing?' · For sale: '+p.listing.price+' coins':' · Not for sale'):'Available · '+p.saleValue+' coins (your first newcomer home is free)')+'</p><p>'+esc(p.decoration?.exterior?.sign||'')+'</p><div>'+ (p.owner?'<button id="townEnter">Enter Home</button>':'')+(mine?'<button id="townEdit">Customize</button><button id="townMove">Make My Residence</button><label>Sale price <input id="townPrice" type="number" min="1" max="1000000" value="'+(p.listing?.price||p.saleValue)+'"></label><button id="townList">'+(p.listing?'Update Listing':'List for Sale')+'</button>'+(p.listing?'<button id="townUnlist">Cancel Sale</button>':''):(!p.owner||p.listing)?'<button id="townBuy">'+(p.owner?'Buy Home':'Claim / Buy Home')+'</button>':'')+'</div><p id="townHomeStatus" role="status"></p>');
    async function change(action,body={}){try{const result=await json('/api/town/homes/'+encodeURIComponent(p.id)+'/'+action,body);await a.loadWorldContext();b.classList.remove('show');a.toast(action==='buy'?'Home is yours. No one can buy it until you list it.':action==='list'?'Home listed for sale.':'Home updated.');await home(E,h,a);}catch(e){$('#townHomeStatus').textContent=e.message;}}
    if($('#townBuy'))$('#townBuy').onclick=()=>change('buy');if($('#townList'))$('#townList').onclick=()=>change('list',{price:Number($('#townPrice').value)});if($('#townUnlist'))$('#townUnlist').onclick=()=>change('unlist');if($('#townMove'))$('#townMove').onclick=()=>change('move');
    if($('#townEnter'))$('#townEnter').onclick=async()=>{try{await json('/api/town/home-scene/'+encodeURIComponent(p.id));b.classList.remove('show');await a.loadScene('home__'+p.id);}catch(e){$('#townHomeStatus').textContent=e.message;}};
    if($('#townEdit'))$('#townEdit').onclick=()=>location.href='/games/home_editor.html?plot='+encodeURIComponent(p.id);
  }catch(e){a.toast(e.message);}
}
async function interact(E,h,a){
  if(h.skinId){E.conversing=h;h.pause=8;h.face=Math.abs(E.player.x-h.x)>Math.abs(E.player.y-h.y)?(E.player.x<h.x?'left':'right'):(E.player.y<h.y?'up':'down');
    const b=modal(E,'<h2>'+esc(h.name)+'</h2><p>'+esc(h.message)+'</p>'+(h.storyIntro?'<button id="townIntroduce">Introduce Yourself</button><p id="townDialogueStatus" role="status"></p>':''));
    if($('#townIntroduce'))$('#townIntroduce').onclick=async()=>{try{const d=await json('/api/town/story/visit',{npcId:h.id});$('#townDialogueStatus').textContent=d.story.complete?'All three introductions complete. Welcome to Whisperwind. Find a home, decorate it, and visit the old dock’s hammer mark.':'Introduction remembered. Meet the other residents when you are ready.';}catch(e){$('#townDialogueStatus').textContent=e.message;}};return true;
  }
  if(h.type==='townGuide'){showGuide(E);return true;}
  if(h.type==='shop'){
    const b=modal(E,'<h2>'+esc(h.label)+'</h2><p>'+esc(h.message)+'</p><p><a href="/games/market.html?shop='+encodeURIComponent(h.shopId||'')+'">Browse supplies</a></p>'+(h.shopId==='whisperwind_tackle'?'<button id="townFishing">Walk to Shadow Woods Fishing Dock</button>':''));
    json('/api/town/shop/'+encodeURIComponent(h.shopId)).then(d=>{const section=document.createElement('div');section.innerHTML=(h.shopId==='whisperwind_tackle'?'<p>Tackle can be collected now. Fishing supplies shared equipment; these items do not change catch odds yet.</p>':'')+'<p>Buy one item at a time with your existing coins.</p><div id="townShopItems"></div><p id="townShopStatus" role="status"></p>';b.insertBefore(section,b.lastElementChild);for(const item of d.items){const button=document.createElement('button');button.textContent=item.name+' · '+item.price+' coins';button.onclick=async()=>{button.disabled=true;try{const result=await json('/api/town/shop/'+encodeURIComponent(h.shopId)+'/buy',{itemId:item.id});await a.loadWorldContext();$('#townShopStatus').textContent='Bought '+item.name+'. Coins remaining: '+result.coins;}catch(e){$('#townShopStatus').textContent=e.message;}finally{button.disabled=false;}};section.querySelector('#townShopItems').append(button);}}).catch(()=>{});
    if($('#townFishing'))$('#townFishing').onclick=()=>{b.classList.remove('show');a.loadScene('shadow_woods_dock');};return true;
  }
  return false;
}
function update(E,dt,canStand){window.TownWalkable=canStand;for(const n of E.scene.npcs||[]){if(E.followNpc===n.id){n.moving=false;if(Math.hypot(E.player.x-n.x,E.player.y-n.y)<80){E.followNpc=null;interact(E,n,actions);}continue;}if(n===E.conversing&&$('#wfHomeBox')?.classList.contains('show')){n.moving=false;continue;}TownMotion.step(n,dt,canStand);}}
function drawNpc(c,n,E){
  const skin=E.npcSkins?.skins[n.skinId],im=skin&&E.assets[skin.src];if(!im)return;
  const frames=skin.frames[n.face||'down'],r=frames?.[n.moving?Math.floor((n.walkDistance||0)/18)%frames.length:1]||frames?.[0];if(!r)return;
  c.save();c.translate(n.x,n.y);c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(0,1,11,3,0,0,7);c.fill();WhisperwindAssets.draw(c,im,{sourceRect:r,displaySize:{w:80*r.w/r.h,h:80},placeOrigin:{x:.5,y:1}},{x:0,y:0});c.fillStyle='#fff0bd';c.font='bold 13px system-ui';c.textAlign='center';c.strokeStyle='#10170e';c.lineWidth=3;c.strokeText(n.name,0,-90);c.fillText(n.name,0,-90);c.restore();
}
function exterior(E,o){
  if(!o.plotId)return;const p=E.townHomes?.find(p=>p.id===o.plotId),d=p?.decoration?.exterior;o.asset=d?{cottage:'wwhd_cottage',apartment:'wwhd_apartment',shop:'wwhd_bakery'}[d.style]:o._defaultAsset||o.baseAsset||o.asset;
  const style=d?.style||((o._defaultAsset||o.baseAsset||'').includes('apartment')?'apartment':'cottage');
  const roof=d?.roof||o.roofColor||'original';
  const variant='wwhd_'+(style==='shop'?'bakery':style)+'_roof_'+roof;
  if(roof!=='original'&&E.catalog?.[variant])o.asset=variant;
  delete o.tint;
}
function drawAmbient(c,E,time){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  for(const o of E.scene.objects||[]){
    if(!o.plotId||Math.hypot(o.x-E.player.x,o.y-E.player.y)>650||E.near?.plotId===o.plotId)continue;
    const p=E.townHomes?.find(p=>p.id===o.plotId);if(!p)continue;
    const text=p.decoration?.exterior?.sign||p.name;
    c.save();c.font='bold 12px system-ui';c.textAlign='center';const width=c.measureText(text).width+18;c.fillStyle={sage:'#344f3c',blue:'#29465f',rose:'#653d4e',gold:'#6b552b'}[p.decoration?.exterior?.accent]||'rgba(14,29,20,.85)';c.fillRect(o.x-width/2,o.y+19,width,23);c.fillStyle=p.owner?'#e8e6c8':'#ffda8b';c.fillText(text,o.x,o.y+35);c.restore();
  }
  for(const a of E.scene.ambient||[]){
    if(a.type==='lampGlow'){c.fillStyle='rgba(255,208,98,'+(reduced?.12:.12+Math.sin(time*1.7+a.y)*.025)+')';c.beginPath();c.ellipse(a.x,a.y,14,10,0,0,7);c.fill();}
    if(a.type==='fountain'){c.save();if(!reduced){for(const [x1,y1,x2,y2] of a.streams||[]){c.strokeStyle='rgba(174,230,238,.65)';c.lineWidth=2;c.beginPath();c.moveTo(a.x+x1,a.y+y1);c.lineTo(a.x+x2+Math.sin(time*3+x1)*1.5,a.y+y2);c.stroke();for(let i=0;i<4;i++){const p=(time*1.8+i/4)%1;c.fillStyle='rgba(233,255,255,.8)';c.fillRect(a.x+x1+(x2-x1)*p,a.y+y1+(y2-y1)*p,2,3);}}}c.strokeStyle='rgba(210,250,245,.4)';c.lineWidth=1;for(let i=0;i<3;i++){const phase=reduced?.5:(time*.4+i/3)%1;c.globalAlpha=1-phase;c.beginPath();c.ellipse(a.x,a.y,14+phase*34,4+phase*10,0,0,7);c.stroke();}c.restore();}
    if(a.type==='smoke'&&!reduced){for(let i=0;i<4;i++){const age=(time*.25+i*.24)%1;c.fillStyle='rgba(211,213,194,'+(.18*(1-age))+')';c.beginPath();c.ellipse(a.x+Math.sin(age*5+i)*7,a.y-age*75,5+age*10,3+age*8,0,0,7);c.fill();}}
    if(a.type==='windowPet'){
      const skin=E.npcSkins?.pets?.[a.pet],im=skin&&E.assets[skin.src];if(!im)continue;
      const phase=reduced?3:(time+(a.offset||0))%9;
      const frame=phase<1.5?0:phase<2?1:phase<4.5?2:phase<5.5?3:0;
      // The puppy springs into view, settles on its paws, then drops behind the opening.
      // The cat rises more quietly and blinks while looking out.
      const rise=reduced?0:phase>=1.5&&phase<2?-(2-phase)*28:phase>=2&&phase<2.6?Math.sin((phase-2)/.6*Math.PI)*(a.pet==='dog'?8:2):phase>=5.5&&phase<6?-(phase-5.5)*35:0;
      const r=skin.frames[frame];
      c.save();c.beginPath();c.rect(a.x-a.w/2,a.y-a.h,a.w,a.h);c.clip();WhisperwindAssets.draw(c,im,{sourceRect:r,displaySize:{w:a.w,h:a.w*r.h/r.w},placeOrigin:{x:.5,y:1}},{x:a.x,y:a.y-rise});c.restore();
    }
  }
}
window.TownLife={prepare,tools,home,interact,update,drawNpc,drawAmbient,exterior};
})();

