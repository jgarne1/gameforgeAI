const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),M=require('../games/js/town_motion');
const root=path.join(__dirname,'..');
function world(){const ctx=vm.createContext({window:{},document:{}});vm.runInContext(fs.readFileSync(path.join(root,'games/js/world_engine.js'),'utf8').replace('window.WorldForgerEngine={start,loadScene,loadWorldContext};','window.WorldForgerEngine={start,loadScene,loadWorldContext};window.test={E,canStand};'),ctx);const sc=JSON.parse(fs.readFileSync(path.join(root,'public/assets/worlds/whisperwind_hd_expanded.json'),'utf8'));ctx.window.test.E.scene=sc;return {sc,canStand:ctx.window.test.canStand};}
test('expanded layout preserves every player address and reaches every door',()=>{
 const {sc,canStand}=world(),homes=sc.hotspots.filter(h=>h.plotId);assert.equal(homes.length,24);assert.equal(new Set(homes.map(h=>h.plotId)).size,24);
 for(const h of homes){assert.ok(canStand(h.x,h.y),h.id+' blocked');assert.ok(M.route(sc.spawn,h,canStand,sc.size).length,h.id+' unreachable');}
 assert.equal(sc.objects.filter(o=>o.npcResidence).length,6);assert.ok(sc.objects.filter(o=>o.npcResidence).every(o=>!o.plotId));
});
test('expanded shops, playground, mansion and lake approaches are reachable',()=>{
 const {sc,canStand}=world();for(const h of sc.hotspots.filter(h=>!h.plotId)){assert.ok(canStand(h.x,h.y),h.id+' blocked');assert.ok(M.route(sc.spawn,h,canStand,sc.size).length,h.id+' unreachable');}
});
test('crossing decks allow walking over water while rail and open river block',()=>{
 const {sc,canStand}=world();assert.equal(sc.terrain.crossings.length,3);
 for(const deck of sc.terrain.crossings){const x=(deck.points[0][0]+deck.points[1][0])/2,y=(deck.points[0][1]+deck.points[2][1])/2;assert.equal(canStand(x,y),true,deck.id);assert.equal(canStand(x,y+150),false,deck.id+' water');assert.equal(canStand(x,y+105),false,deck.id+' rail');}
});
test('expanded residents finish bounded routines without hitting scenery',()=>{
 const {sc,canStand}=world();for(const n of sc.npcs){for(const p of n.routine.points)assert.ok(canStand(p.x,p.y),n.id+' waypoint');let distance=0;for(let i=0;i<1800;i++){const x=n.x,y=n.y;M.step(n,1/30,canStand);distance+=Math.hypot(n.x-x,n.y-y);assert.ok(canStand(n.x,n.y),n.id);}assert.ok(distance>450,n.id+' stuck');}
});

test('eight owned homes across room sizes have reachable exits and safe outdoor returns',()=>{
 const os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'whisperwind-rooms-')),handlers={},Housing=require('../lib/town_housing');
 const estate={neighborhoods:[{id:'whisperwind_01',plots:[]}]};Housing.expandEstate(estate);const plots=estate.neighborhoods.find(n=>n.id==='whisperwind_01').plots;
 const ids=['01','03','07','09','13','16','21','24'].map(n=>'town_home_'+n);for(const p of plots)if(ids.includes(p.id))p.owner='Fixture';
 const api=require('../lib/town_routes')({app:{get(url,fn){handlers[url]=fn;},post(){}},root,DATA:dir,users:()=>({Fixture:{password:'fixture'}}),pets:()=>({}),loadEstateNeighborhoods:()=>estate,saveEstateNeighborhoods(){}});
 let cookie;api.login({headers:{}},{cookie(name,value){cookie=name+'='+value;}},'Fixture');
 const context=vm.createContext({window:{},document:{}});vm.runInContext(fs.readFileSync(path.join(root,'games/js/world_engine.js'),'utf8').replace('window.WorldForgerEngine={start,loadScene,loadWorldContext};','window.WorldForgerEngine={start,loadScene,loadWorldContext};window.test={E,canStand};'),context);
 const outdoors=world();
 try{for(const id of ids){let room;handlers['/api/town/home-scene/:id']({headers:{cookie},params:{id}},{json(data){room=data;},status(code){throw Error('Home response '+code);}});assert.equal(room.home.owner,'Fixture');context.window.test.E.scene=room;const exit=room.hotspots.find(h=>h.id==='exit');assert.ok(M.route(room.spawn,exit,context.window.test.canStand,room.size).length,id+' exit');assert.equal(exit.targetScene,'whisperwind_hd_waterfront');assert.ok(Number.isFinite(exit.targetSpawn.x)&&Number.isFinite(exit.targetSpawn.y));assert.ok(outdoors.canStand(exit.targetSpawn.x,exit.targetSpawn.y),id+' outside return');}}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('window pets remain hidden between peeks and retreat behind their clip',()=>{
 const calls=[],ctx=vm.createContext({window:{},document:{},matchMedia:()=>({matches:false}),WhisperwindAssets:{draw(...a){calls.push(a);}}});vm.runInContext(fs.readFileSync(path.join(root,'games/js/town_life.js'),'utf8'),ctx);
 const c={save(){},restore(){},beginPath(){},rect(){},clip(){}},E={scene:{objects:[],ambient:[{type:'windowPet',pet:'dog',x:100,y:100,w:26,h:34}]},npcSkins:{pets:{dog:{src:'dog',frames:Array(4).fill({x:0,y:0,w:30,h:40})}}},assets:{dog:{}}};
 ctx.window.TownLife.drawAmbient(c,E,.5);assert.equal(calls.length,0);ctx.window.TownLife.drawAmbient(c,E,3);assert.equal(calls.length,1);ctx.window.TownLife.drawAmbient(c,E,5.9);assert.ok(calls.at(-1)[3].y>130);ctx.window.TownLife.drawAmbient(c,E,6.1);assert.equal(calls.length,2);
});

test('new nature, bridge and terrace catalog entries retain original source hashes and bounds',()=>{
 const crypto=require('node:crypto'),catalog=JSON.parse(fs.readFileSync(path.join(root,'public/assets/worlds/world_asset_catalog.json'),'utf8')).assets;
 for(const pack of ['nature_details_v1','stone_bridge_v1','stone_bridge_approaches_v1','terrace_kit_v1','construction_kit_v1']){
  const meta=JSON.parse(fs.readFileSync(path.join(root,'public/assets/whisperwind_hd',pack,'metadata.json'),'utf8'));
  for(const a of meta.assets){const entry=catalog.find(e=>e.id===a.id);assert.ok(entry,a.id);assert.deepEqual(entry.sourceRect,a.sourceRect);const bytes=fs.readFileSync(path.join(root,'public',entry.src));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);const r=entry.sourceRect;assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=bytes.readUInt32BE(16)&&r.y+r.h<=bytes.readUInt32BE(20),a.id+' crop');assert.ok(entry.placeOrigin.x>=0&&entry.placeOrigin.x<=1&&entry.placeOrigin.y>=0&&entry.placeOrigin.y<=1);}
 }
});
test('terrace stairs connect both landings while retaining walls block shortcuts',()=>{
 const {sc,canStand}=world();for(const [x,y] of [[1800,1860],[3300,2910]]){assert.ok(canStand(x,y-120));assert.ok(canStand(x,y+320));assert.ok(M.route({x,y:y-120},{x,y:y+320},canStand,sc.size).length);assert.equal(canStand(x-240,y),false);}
});
test('bridge ramp head and shore toe are continuously walkable with solid side edges',()=>{
 const {sc,canStand}=world(),meta=JSON.parse(fs.readFileSync(path.join(root,'public/assets/whisperwind_hd/stone_bridge_approaches_v1/metadata.json'),'utf8'));
 for(const o of sc.objects.filter(o=>o.asset.startsWith('wwhd_stone_bridge_approach_'))){const a=meta.assets.find(a=>a.id===o.asset),toe=a.toeContactWorldLocal.center;for(let i=0;i<=40;i++)assert.ok(canStand(o.x+toe[0]*i/40,o.y+toe[1]*i/40),o.id+' step '+i);const [p,q]=[a.floorPolygonLocal[1],a.floorPolygonLocal[2]];assert.equal(canStand(o.x+(p[0]+q[0])/2,o.y+(p[1]+q[1])/2),false,o.id+' edge');}
});
