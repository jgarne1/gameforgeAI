const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const manifest=JSON.parse(read('public/assets/whisperwind_hd/v1/manifest.json'));
const catalog=JSON.parse(read('public/assets/worlds/world_asset_catalog.json')).assets;

test('atlas sources and every registered rectangle are valid PNG pixel bounds',()=>{
  for(const a of manifest.assets){
    assert.deepEqual(catalog.find(c=>c.id===a.id),a);
    const bytes=fs.readFileSync(path.join(root,'public',a.src));
    assert.equal(bytes.toString('ascii',1,4),'PNG');
    const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20),r=a.sourceRect;
    assert.ok(r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=w&&r.y+r.h<=h,a.id);
  }
  const walk=manifest.player.walk,bytes=fs.readFileSync(path.join(root,'public',walk.src));
  for(const frames of Object.values(walk.directions)){
    assert.equal(frames.length,4);
    for(const r of frames)assert.ok(r.x+r.w<=bytes.readUInt32BE(16)&&r.y+r.h<=bytes.readUInt32BE(20));
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
test('waterfront doorway round-trip is reachable and water cannot be walked into',()=>{
  const context=vm.createContext({window:{},document:{}});
  vm.runInContext(read('games/js/world_engine.js').replace('window.WorldForgerEngine={start,loadScene,loadWorldContext};','window.WorldForgerEngine={start,loadScene,loadWorldContext};window.test={E,canStand};'),context);
  const api=context.window.test,shore=JSON.parse(read('public/assets/worlds/whisperwind_hd_waterfront.json')),
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
  api.E.scene=JSON.parse(read('public/assets/worlds/whisperwind_hd_waterfront.json'));
  api.E.player.x=1000;api.E.player.y=1100;
  return {api,draws};
}

test('walking pace is frame-rate independent and release has no coasting',()=>{
  for(const fps of [30,60]){
    const {api}=motionRuntime();api.E.keys.d=true;
    for(let i=0;i<fps;i++)api.update(1/fps);
    assert.ok(Math.abs(api.E.player.x-1144)<.001);
    assert.ok(Math.abs(api.E.player.walkDistance-144)<.001);
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
  const walk=manifest.player.walk;api.E.assets[walk.src]={};
  for(let frame=0;frame<4;frame++){
    api.drawPackCharacter({},'left',true,frame*manifest.player.motion.cycleDistance/4+.01);
    assert.deepEqual(draws.at(-1)[2].sourceRect,walk.directions.left[frame]);
    const r=walk.directions.left[frame],origin=draws.at(-1)[2].placeOrigin;
    assert.ok((1-origin.y)*walk.height<1,'sole must remain within one unit of the ground');
    assert.ok(r.y>=334&&r.y+r.h<=638,'no clipped boot or previous-row fragment');
  }
});

