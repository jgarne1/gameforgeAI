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
  assert.equal(api.canStand(1210,840),true);assert.equal(api.canStand(1200,700),false);
  assert.equal(api.canStand(1400,1490),true);assert.equal(api.canStand(1400,1800),false);
  const door=shore.hotspots.find(h=>h.type==='door'),exit=inside.hotspots.find(h=>h.type==='door');
  assert.equal(door.targetScene,inside.id);assert.ok(inside.spawnPoints.some(p=>p.id===door.targetSpawn));
  assert.equal(exit.targetScene,shore.id);assert.ok(shore.spawnPoints.some(p=>p.id===exit.targetSpawn));
  api.E.scene=inside;assert.equal(api.canStand(550,720),true);assert.equal(api.canStand(550,750),true);
});
