const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const manifest=JSON.parse(read('public/assets/whisperwind_hd/v1/manifest.json'));
const catalog=JSON.parse(read('public/assets/worlds/world_asset_catalog.json')).assets;

test('large terrain tiles only the viewport without shifting world texture alignment',()=>{
 const context=vm.createContext({window:{}});vm.runInContext(read('games/js/whisperwind_assets.js'),context);
 const calls=[],ctx={canvas:{width:800,height:600},getTransform:()=>({a:1,b:0,c:0,d:1,e:-3100,f:-2200}),save(){},restore(){},beginPath(){},rect(){},clip(){},drawImage(...args){calls.push(args)}};
 context.window.WhisperwindAssets.tile(ctx,{width:256,height:256},{tileSize:256},0,0,9200,7400);
 assert.equal(calls.length,12);for(const a of calls){assert.equal(a[5]%256,0);assert.equal(a[6]%256,0);assert.ok(a[5]<3900&&a[5]+256>3100);assert.ok(a[6]<2800&&a[6]+256>2200);}
});
test('minimap caches streets without reallocating at fractional display density and keeps dots moving',()=>{
 let allocations=0,writes=0,width=0,height=0;const dots=[];
 const paint=()=>({setTransform(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},clearRect(){},drawImage(){},arc(x,y){dots.push([x,y]);},fill(){}});
 const m={get width(){return width;},set width(v){writes++;width=Math.trunc(v);},get height(){return height;},set height(v){writes++;height=Math.trunc(v);},getContext:paint};
 const ctx=vm.createContext({window:{},devicePixelRatio:1.25,document:{createElement(){allocations++;return {getContext:paint};}}});
 vm.runInContext(read('games/js/world_engine.js').replace('window.WorldForgerEngine={start,loadScene,loadWorldContext};','window.test={E,drawMini};'),ctx);
 const api=ctx.window.test;api.E.mini=m;api.E.scene={size:{w:1000,h:1000},paths:[{points:[[10,10],[900,900]],width:100}],hotspots:[]};api.E.player.x=100;api.E.player.y=100;api.drawMini();api.E.player.x=200;api.drawMini();assert.equal(allocations,1);assert.equal(writes,2);assert.deepEqual(dots,[[19.8,14.499999999999998],[39.6,14.499999999999998]]);
});

test('atlas sources and every registered rectangle are valid PNG pixel bounds',()=>{
  for(const a of manifest.assets){
    assert.deepEqual(catalog.find(c=>c.id===a.id),a);
    const bytes=fs.readFileSync(path.join(root,'public',a.src));
    assert.equal(bytes.toString('ascii',1,4),'PNG');
    const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20),r=a.sourceRect;
    assert.ok(r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=w&&r.y+r.h<=h,a.id);
  }
  const walk=manifest.player.walk;
  for(const frames of Object.values(walk.directions)){
    assert.equal(frames.length,4);
    for(const frame of frames){const r=frame.sourceRect||frame,bytes=fs.readFileSync(path.join(root,'public',frame.src||walk.src));assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=bytes.readUInt32BE(16)&&r.y+r.h<=bytes.readUInt32BE(20));}
  }
});
test('shared renderer selects a single atlas rectangle at its world anchor',()=>{
  const context=vm.createContext({window:{}});vm.runInContext(read('games/js/whisperwind_assets.js'),context);
  const calls=[],ctx={save(){},restore(){},translate(){},rotate(){},drawImage(...args){calls.push(args)}};
  const a=manifest.assets.find(a=>a.id==='wwhd_dock'),im={width:1254,height:1254};
  context.window.WhisperwindAssets.draw(ctx,im,a,{x:200,y:300});
  assert.deepEqual(calls[0].slice(1,5),[a.sourceRect.x,a.sourceRect.y,a.sourceRect.w,a.sourceRect.h]);
  assert.equal(calls[0][7],a.displaySize.w);assert.equal(calls[0][8],a.displaySize.h);
});
test('shore threshold reflection keeps its bridge-facing placement anchor fixed',()=>{
 const context=vm.createContext({window:{}});vm.runInContext(read('games/js/whisperwind_assets.js'),context);
 const calls=[],ctx={save(){},restore(){},translate(x,y){calls.push(['translate',x,y]);},rotate(){},scale(x,y){calls.push(['scale',x,y]);},drawImage(...args){calls.push(['draw',...args]);}};
 const a=catalog.find(a=>a.id==='wwhd_shore_threshold_v2');context.window.WhisperwindAssets.draw(ctx,{width:1024,height:1536},a,{x:100,y:200,flipX:true});
 assert.deepEqual(calls[0],['translate',100,200]);assert.deepEqual(calls[1],['scale',-1,1]);const draw=calls[2];assert.equal(draw[6],-a.displaySize.w*a.placeOrigin.x);assert.equal(draw[7],-a.displaySize.h*a.placeOrigin.y);assert.equal(draw[8],a.displaySize.w);assert.equal(draw[9],a.displaySize.h);
});
test('waterfront doorway round-trip is reachable and water cannot be walked into',()=>{
  const context=vm.createContext({window:{},document:{}});
  vm.runInContext(read('games/js/world_engine.js').replace('window.WorldForgerEngine={start,loadScene,loadWorldContext};','window.WorldForgerEngine={start,loadScene,loadWorldContext};window.test={E,canStand};'),context);
  const api=context.window.test,shore=JSON.parse(read('docs/design/archive/whisperwind_waterfront_v1.json')),
    inside=JSON.parse(read('public/assets/worlds/whisperwind_hd_tavern.json'));
  api.E.scene=shore;
  assert.equal(api.canStand(575,845),true);assert.equal(api.canStand(600,700),false);
  assert.equal(api.canStand(1200,3410),true);assert.equal(api.canStand(1400,3500),false);
  const door=shore.hotspots.find(h=>h.type==='door'),exit=inside.hotspots.find(h=>h.type==='door');
  assert.equal(door.targetScene,inside.id);assert.ok(inside.spawnPoints.some(p=>p.id===door.targetSpawn));
  assert.equal(exit.targetScene,shore.id);assert.ok(shore.spawnPoints.some(p=>p.id===exit.targetSpawn));
  api.E.scene=inside;assert.equal(api.canStand(550,720),true);assert.equal(api.canStand(550,750),true);
});

function motionRuntime(){
  const prompt={style:{},classList:{add(){},remove(){}}};
  const draws=[];
  const context=vm.createContext({window:{},document:{querySelector:()=>prompt},innerWidth:1280,innerHeight:720,
    performance:{now:()=>0},TownLife:{update(){}},WhisperwindAssets:{draw(...args){draws.push(args)}}});
  vm.runInContext(read('games/js/world_engine.js').replace('window.WorldForgerEngine={start,loadScene,loadWorldContext};',
    'window.WorldForgerEngine={start,loadScene,loadWorldContext};window.test={E,update,drawPackShadow,drawPackCharacter};'),context);
  const api=context.window.test;api.E.pack=manifest;
  api.E.scene=JSON.parse(read('docs/design/archive/whisperwind_waterfront_v1.json'));
  api.E.player.x=1000;api.E.player.y=1100;
  return {api,draws};
}

test('walking pace is frame-rate independent and release has no coasting',()=>{
  for(const fps of [30,60]){
    const {api}=motionRuntime();api.E.keys.d=true;
    for(let i=0;i<fps;i++)api.update(1/fps);
    assert.ok(Math.abs(api.E.player.x-1170)<.001);
    assert.ok(Math.abs(api.E.player.walkDistance-170)<.001);
    const x=api.E.player.x,d=api.E.player.walkDistance;
    api.E.keys.d=false;api.update(1/fps);
    assert.equal(api.E.player.x,x);assert.equal(api.E.player.walkDistance,d);
    assert.equal(api.E.player.moving,false);
  }
});
test('blocked movement cannot advance the walking cycle',()=>{
  const {api}=motionRuntime();const edge=api.E.scene.size.w-101;api.E.player.x=edge;api.E.keys.d=true;
  api.update(1/60);
  assert.equal(api.E.player.x,edge);assert.equal(api.E.player.walkDistance,0);
  assert.equal(api.E.player.moving,false);
});
test('contact shadow overlaps the sole and walk frames follow traveled distance',()=>{
  const {api,draws}=motionRuntime(),ellipses=[];
  api.drawPackShadow({beginPath(){},fill(){},ellipse(...args){ellipses.push(args)}});
  const s=manifest.player.motion.shadow;
  assert.ok(s.y-s.ry<=0&&s.y+s.ry>=0);
  assert.equal(ellipses[0][1],1);
  const walk=manifest.player.walk;api.E.assets[walk.src]={};for(const frame of walk.directions.left)if(frame.src)api.E.assets[frame.src]={};
  for(let frame=0;frame<4;frame++){
    api.drawPackCharacter({},'left',true,frame*manifest.player.motion.cycleDistance/4+.01);
    const f=walk.directions.left[frame],r=f.sourceRect||f,a=draws.at(-1)[2];assert.deepEqual(a.sourceRect,r);
    assert.ok((1-a.placeOrigin.y)*a.displaySize.h<1,'sole must remain within one unit of the ground');
    assert.ok(Math.abs(a.displaySize.w/a.displaySize.h-r.w/r.h)<1e-9,'pose must keep uniform scale');
  }
});
test('selected side poses preserve immutable originals and distinct opposite contacts',()=>{
 const crypto=require('node:crypto'),dir=path.join(root,'public/assets/whisperwind_hd/player_side_walk_v3'),meta=JSON.parse(fs.readFileSync(path.join(dir,'metadata.json'),'utf8'));
 for(const [file,sha]of Object.entries(meta.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex'),sha);
 for(const side of ['left','right']){const frames=manifest.player.walk.directions[side];assert.notEqual(frames[0].src,frames[2].src);assert.notEqual(frames[1].src,frames[3].src);for(let i=0;i<4;i++)assert.deepEqual(frames[i].sourceRect,meta.directions[side][i].sourceRect);}
});
