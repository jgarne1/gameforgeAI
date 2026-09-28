const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const H=require('../lib/town_housing'),M=require('../games/js/town_motion');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('town browser files and server modules parse',()=>{
  for(const file of ['games/home_editor.html','games/town_npc_admin.html','games/world.html'])for(const match of read(file).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(match[1].trim())new vm.Script(match[1],{filename:file});
  for(const file of ['games/js/town_life.js','games/js/town_motion.js','lib/town_housing.js','lib/town_routes.js'])new vm.Script(read(file),{filename:file});
});
test('pending sale journal recovers both ownership and existing coin balances',()=>{
  const os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gameforge-town-test-'));
  const tx={estate:{neighborhoods:[{id:'whisperwind_01',plots:[{id:'town_home_01',owner:'Buyer'}]}]},profiles:{Buyer:{money:70},Seller:{money:130}}};
  try{
    fs.writeFileSync(path.join(dir,'town_transaction.json'),JSON.stringify(tx));
    require('../lib/town_routes')({app:{get(){},post(){}},DATA:dir,root,users:()=>({}),pets:()=>({})});
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'pets.json'))),tx.profiles);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'estate_neighborhoods.json'))),tx.estate);
    assert.equal(fs.existsSync(path.join(dir,'town_transaction.json')),false);
  }finally{for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);}
});
test('owned homes cannot be purchased until their owner explicitly lists them',()=>{
  const p={id:'town_home_01',owner:'Owner',status:'owned'},profiles={Owner:{money:100},Buyer:{money:100}};
  assert.throws(()=>H.transact(p,'Buyer','buy',profiles),/not for sale/);
  assert.throws(()=>H.transact(p,'Buyer','list',profiles,{price:30}),/Only the owner/);
  H.transact(p,'Owner','list',profiles,{price:30});H.transact(p,'Owner','unlist',profiles);
  assert.throws(()=>H.transact(p,'Buyer','buy',profiles),/not for sale/);
  H.transact(p,'Owner','list',profiles,{price:30});H.transact(p,'Buyer','buy',profiles);
  assert.equal(p.owner,'Buyer');assert.equal(profiles.Owner.money,130);assert.equal(profiles.Buyer.money,70);assert.equal(p.listing,undefined);
  assert.throws(()=>H.transact(p,'Owner','buy',profiles),/not for sale/);
});
test('newcomer grants are once per account; multiple paid homes stay protected',()=>{
  const profiles={Player:{money:250}},p={id:'town_home_01',owner:null,saleValue:125},q={id:'town_home_02',owner:null,saleValue:150};
  assert.equal(H.transact(p,'Player','buy',profiles).price,0);
  assert.equal(H.transact(q,'Player','buy',profiles).price,150);assert.equal(profiles.Player.money,100);
  assert.deepEqual(profiles.Player.world.residence,{neighborhoodId:'whisperwind_01',plotId:q.id});
  H.transact(p,'Player','move',profiles);assert.equal(profiles.Player.world.residence.plotId,p.id);
});
test('decoration rejects arbitrary assets, oversized payloads and blocked entrances',()=>{
  assert.throws(()=>H.decorate({objects:[{asset:'/evil.png',x:350,y:400}]}),/Invalid/);
  assert.throws(()=>H.decorate({objects:[{asset:'wwhd_bed',x:600,y:730}]}),/entrance/);
  assert.throws(()=>H.decorate({objects:Array(81).fill({})}),/80/);
  const d=H.decorate({objects:[{asset:'wwhd_bed',x:300,y:400,scale:1,rotation:90}],floor:'stone',wall:'sage',privacy:'private',exterior:{style:'apartment',accent:'blue',sign:'A quiet home'}});
  assert.equal(d.objects.length,1);assert.equal(d.privacy,'private');assert.equal(d.exterior.sign,'A quiet home');
});
test('estate expansion preserves existing ownership and is idempotent',()=>{
  const data={neighborhoods:[{id:'whisperwind_01',plots:[{id:'plot_01',owner:'Existing',decoration:{old:true}}]}]};H.expandEstate(data);H.expandEstate(data);
  assert.equal(data.neighborhoods[0].plots.length,25);assert.equal(data.neighborhoods[0].plots[0].owner,'Existing');assert.deepEqual(data.neighborhoods[0].plots[0].decoration,{old:true});
});
function world(){const ctx=vm.createContext({window:{},document:{}});vm.runInContext(read('games/js/world_engine.js').replace('window.WorldForgerEngine={start,loadScene,loadWorldContext};','window.WorldForgerEngine={start,loadScene,loadWorldContext};window.test={E,canStand};'),ctx);const sc=JSON.parse(read('public/assets/worlds/whisperwind_hd_waterfront.json'));ctx.window.test.E.scene=sc;return {sc,canStand:ctx.window.test.canStand};}
test('all houses and landmark entrances have reachable paths from the plaza',()=>{
  const {sc,canStand}=world();assert.equal(sc.hotspots.filter(h=>h.plotId).length,24);
  for(const h of sc.hotspots.filter(h=>h.type==='door'||h.type==='home')){
    assert.ok(canStand(h.x,h.y),h.id+' must be on walkable ground');const route=M.route(sc.spawn,h,canStand,sc.size);assert.ok(route.length,h.id+' must be reachable');
  }
});
test('three distinct NPC skins and routines never enter buildings or river',()=>{
  const {sc,canStand}=world();assert.equal(new Set(sc.npcs.map(n=>n.skinId)).size,3);
  for(const n of sc.npcs){for(let i=0;i<3600;i++){M.step(n,1/30,canStand);assert.ok(canStand(n.x,n.y),n.id);}}
});
test('NPC pauses for interaction and resumes movement safely',()=>{
  const n={x:0,y:0,pause:1,routine:{speed:50,points:[{x:100,y:0,wait:2}]}};M.step(n,.5,()=>true);assert.equal(n.x,0);M.step(n,.5,()=>true);M.step(n,.5,()=>true);assert.equal(n.x,25);assert.equal(n.face,'right');
});
test('every NPC and pet atlas frame stays inside its source PNG',()=>{
  const data=JSON.parse(read('public/assets/whisperwind_hd/v1/npc_skins.json'));
  for(const skin of [...Object.values(data.skins),...Object.values(data.pets)]){const im=fs.readFileSync(path.join(root,'public',skin.src));const frames=Array.isArray(skin.frames)?skin.frames:Object.values(skin.frames).flat();for(const r of frames)assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=im.readUInt32BE(16)&&r.y+r.h<=im.readUInt32BE(20));}
});
