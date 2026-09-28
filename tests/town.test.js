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
test('home list omits malformed legacy records without deleting saved ownership',()=>{
  const handlers={},legacy={name:'Old record',owner:'Owner'},valid={id:'plot_01',owner:'Owner'};
  const estate={neighborhoods:[{id:'whisperwind_01',plots:[legacy,valid]}]};
  // Legacy records with no identifier must not reach buttons that require an address.
  require('../lib/town_routes')({app:{get(url,fn){handlers[url]=fn;},post(){}},DATA:root,root,loadEstateNeighborhoods:()=>estate});
  let result;handlers['/api/town/homes']({}, {json(value){result=value;}});
  assert.equal(result.plots.length,25);assert.ok(result.plots.every(p=>typeof p.id==='string'));
  assert.equal(result.plots.find(p=>p.id==='plot_01').owner,'Owner');
  assert.ok(estate.neighborhoods[0].plots.includes(legacy));assert.equal(legacy.owner,'Owner');
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
  assert.throws(()=>H.decorate({objects:[],exterior:{roof:'neon'}}),/roof color/);
  assert.equal(H.decorate({objects:[],exterior:{roof:'moss'}}).exterior.roof,'moss');
  assert.equal(H.decorate({objects:[]}).exterior.roof,'original');
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
test('hillside stair break remains walkable while the retaining wall blocks walking',()=>{
  const {sc,canStand}=world();assert.ok(sc.paint.terraces.some(t=>t.height>0));
  assert.equal(canStand(2600,1020),false);assert.equal(canStand(3000,1020),true);
  assert.ok(M.route(sc.spawn,{x:3000,y:790},canStand,sc.size).length);
  assert.ok(sc.objects.filter(o=>o.asset.startsWith('wwhd_tree')).length>60);
});
test('painted ground keeps valid RGBA gradient colors',()=>{
  const context=vm.createContext({window:{},document:{}});
  vm.runInContext(read('games/js/world_engine.js').replace('window.WorldForgerEngine={start,loadScene,loadWorldContext};','window.WorldForgerEngine={start,loadScene,loadWorldContext};window.drawPaintTest=drawPaint;'),context);
  const colors=[],c={createRadialGradient(){return {addColorStop(_,color){assert.match(color,/^rgba\(\d+,\d+,\d+,[\d.]+\)$/);colors.push(color);}};},beginPath(){},ellipse(){},fill(){}};
  context.window.drawPaintTest(c,{paint:{groundDabs:[{kind:'dirt',x:100,y:100,alpha:.3}]}});
  assert.equal(colors[0],'rgba(125,93,58,0.3)');assert.equal(colors[1],'rgba(125,93,58,0)');
});
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

test('saved town layouts survive new store instances without rewriting shipped scenes',()=>{
 const os=require('node:os'),T=require('../lib/town_scene_store'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gameforge-scenes-'));
 try{const source=read('public/assets/worlds/whisperwind_hd_waterfront.json'),scene=JSON.parse(source);scene.name='Saved editor layout';T.save(dir,scene);
 assert.equal(JSON.parse(fs.readFileSync(T.resolve(root,dir,scene.id))).name,'Saved editor layout');assert.equal(read('public/assets/worlds/whisperwind_hd_waterfront.json'),source);
 assert.deepEqual(T.list(dir),[scene.id+'.json']);assert.throws(()=>T.resolve(root,dir,'../users'),/Invalid/);assert.throws(()=>T.save(dir,{id:'../../users',size:{w:1000,h:1000}}),/Whisperwind/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('only an authenticated world admin can save persistent town layouts',()=>{
 const os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gameforge-scene-auth-')),handlers={};let cookie;
 const api=require('../lib/town_routes')({app:{get(){},post(url,fn){handlers[url]=fn;}},DATA:dir,root,users:()=>({Admin:{password:'fixture'},Player:{password:'fixture'}}),pets:()=>({}),canAdmin:name=>name==='Admin'});
 const response=()=>({code:200,status(code){this.code=code;return this;},json(data){this.data=data;}}),scene=JSON.parse(read('public/assets/worlds/whisperwind_hd_waterfront.json'));
 try{api.login({headers:{}},{cookie(name,value){cookie=name+'='+value;}},'Player');let res=response();handlers['/api/town/admin/scene']({method:'POST',headers:{cookie},body:{sceneId:scene.id,scene}},res);assert.equal(res.code,403);
 api.login({headers:{}},{cookie(name,value){cookie=name+'='+value;}},'Admin');res=response();handlers['/api/town/admin/scene']({method:'POST',headers:{cookie},body:{sceneId:scene.id,scene}},res);assert.equal(res.data.ok,true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('lake shore and mansion are reachable while lake water is blocked',()=>{
 const {sc,canStand}=world();assert.equal(canStand(5570,1950),false);
 for(const id of ['old_mansion_door','orchard_lake_shore']){const h=sc.hotspots.find(h=>h.id===id);assert.equal(canStand(h.x,h.y),true,id);assert.ok(M.route(sc.spawn,h,canStand,sc.size).length,id);}
});

