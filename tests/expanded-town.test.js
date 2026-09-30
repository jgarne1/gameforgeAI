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
test('fairground station, zoo walk, and enclosed animal pens stay connected',()=>{
 const {sc,canStand}=world(),ride=sc.attractions.coaster,zoo=sc.attractions.zoo;
 assert.ok(M.route(sc.spawn,ride.boarding,canStand,sc.size).length,'station approach');
 assert.ok(canStand(ride.boarding.x,ride.boarding.y),'boarding point');
 assert.ok(Math.hypot(ride.boarding.x-sc.spawnPoints.find(p=>p.id==='fair').x,ride.boarding.y-sc.spawnPoints.find(p=>p.id==='fair').y)<80,'fair spawn exposes boarding');
 assert.ok(canStand(ride.exit.x,ride.exit.y),'safe disembark');
 const art=ride.stationSprite;assert.ok(ride.track.every(p=>p.x<=art.x+30||p.x>=art.x+art.w-50||p.y-p.z<=art.y+30||p.y-p.z>=art.y+art.h-35),'track does not cut through station roof');
 assert.ok(M.route(sc.spawn,{x:1300,y:7020},canStand,sc.size).length,'zoo walk');
 assert.equal(zoo.pens.length,3);
 for(const pen of zoo.pens){assert.equal(canStand(pen.x+pen.w/2,pen.y+pen.h/2),true,'animal ground is terrain');assert.equal(canStand(pen.x+pen.w/2,pen.y+pen.h),false,pen.id+' fence');assert.ok(sc.paths.every(p=>p.points.every(([x,y])=>x<=pen.x-p.width/2||x>=pen.x+pen.w+p.width/2||y<=pen.y-p.width/2||y>=pen.y+pen.h+p.width/2)),pen.id+' path cuts through pen');}
});
test('Lantern Run pauses for boarding and returns to the same station',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(root,'games/js/town_attractions.js'),'utf8'),ctx);
 const sc=JSON.parse(fs.readFileSync(path.join(root,'public/assets/worlds/whisperwind_hd_expanded.json'),'utf8'));
 const at=ctx.window.TownAttractions.coasterAt,ride=sc.attractions.coaster,cycle=(ride.dwellSeconds+ride.travelSeconds)*1000;
 const waiting=at(sc,1000),moving=at(sc,(ride.dwellSeconds+3)*1000),returned=at(sc,cycle+1000);
 assert.equal(waiting.docked,true);assert.equal(moving.docked,false);assert.equal(returned.docked,true);
 assert.ok(moving.z>20,'course gains elevation');assert.equal(waiting.x,returned.x);assert.equal(waiting.y,returned.y);
 assert.ok(ride.track.length>100);assert.equal(ride.track[0].x,ride.track.at(-1).x);assert.equal(ride.track[0].y,ride.track.at(-1).y);
 assert.ok(Math.max(...ride.track.map(p=>p.z))>180,'the course reaches its lift crest');
 const speeds=ride._segments.map((weight,i)=>Math.hypot(ride.track[i+1].x-ride.track[i].x,ride.track[i+1].y-ride.track[i].y)/weight).filter(Number.isFinite);
 assert.ok(Math.max(...speeds)>Math.min(...speeds)*2,'climb, drop and braking use distinct travel speeds');
 const projected=ride.track.map(p=>[p.x,p.y-p.z]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const tunnel=ride.tunnel;
 for(const x of [tunnel.mouthLeftX,tunnel.mouthRightX]){
  const p=ride.track.reduce((closest,next)=>Math.abs(next.x-x)<Math.abs(closest.x-x)?next:closest);
  assert.ok(Math.abs(p.x-x)<8&&Math.abs(p.y-p.z-465)<8,`rail reaches cave opening at ${x}`);
 }
 assert.ok(tunnel.mouthLeftX>tunnel.x-tunnel.w/2&&tunnel.mouthRightX<tunnel.x+tunnel.w/2);
 for(let i=0;i<projected.length-1;i++)for(let j=i+3;j<projected.length-1;j++){
  if(i===0&&j===projected.length-2)continue;
  const a=projected[i],b=projected[i+1],c=projected[j],d=projected[j+1];
  if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.max(c[0],d[0])<Math.min(a[0],b[0]))continue;
  assert.ok(!(cross(a,b,c)*cross(a,b,d)<-1e-4&&cross(c,d,a)*cross(c,d,b)<-1e-4),`track crosses itself at ${i}/${j}`);
 }
});
test('crossing decks allow walking over water while rail and open river block',()=>{
 const {sc,canStand}=world();assert.equal(sc.terrain.crossings.length,3);
 for(const deck of sc.terrain.crossings){const [x,y]=deck.origin;assert.equal(canStand(x,y),true,deck.id);assert.equal(canStand(x,y+150),false,deck.id+' water');assert.equal(canStand(x,y+120),false,deck.id+' rail');}
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
 for(const pack of ['nature_details_v1','stone_bridge_v1','stone_bridge_approaches_v1','stone_bridge_integrated_v2','stone_bridge_integrated_v3','terrace_kit_v1','construction_kit_v1']){
  const meta=JSON.parse(fs.readFileSync(path.join(root,'public/assets/whisperwind_hd',pack,'metadata.json'),'utf8'));
  for(const a of meta.assets){const entry=catalog.find(e=>e.id===a.id);assert.ok(entry,a.id);assert.deepEqual(entry.sourceRect,a.sourceRect);const bytes=fs.readFileSync(path.join(root,'public',entry.src));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);const r=entry.sourceRect;assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=bytes.readUInt32BE(16)&&r.y+r.h<=bytes.readUInt32BE(20),a.id+' crop');assert.ok(entry.placeOrigin.x>=0&&entry.placeOrigin.x<=1&&entry.placeOrigin.y>=0&&entry.placeOrigin.y<=1);}
 }
});
test('terrace stairs connect both landings while retaining walls block shortcuts',()=>{
 const {sc,canStand}=world();for(const [x,y] of [[1800,1860],[3300,2910]]){assert.ok(canStand(x,y-120));assert.ok(canStand(x,y+320));assert.ok(M.route({x,y:y-120},{x,y:y+320},canStand,sc.size).length);assert.equal(canStand(x-240,y),false);}
});
test('integrated bridges have continuous bank-to-bank routes and solid ramp rails',()=>{
 const {sc,canStand}=world(),meta=JSON.parse(fs.readFileSync(path.join(root,'public/assets/whisperwind_hd/stone_bridge_integrated_v3/metadata.json'),'utf8'));
 assert.equal(sc.objects.filter(o=>o.asset==='wwhd_stone_bridge_integrated_v3').length,3);
 assert.equal(sc.objects.filter(o=>o.asset.startsWith('wwhd_stone_bridge_approach_')||['wwhd_stone_bridge_deck','wwhd_stone_bridge_integrated_v2','wwhd_shore_threshold_v2'].includes(o.asset)).length,0);
 for(const deck of sc.terrain.crossings){const [x,y]=deck.origin,line=meta.assembly.centerlineLocal;for(let segment=0;segment<line.length-1;segment++){const p=line[segment],q=line[segment+1];for(let i=0;i<=40;i++)assert.ok(canStand(x+p[0]+(q[0]-p[0])*i/40,y+p[1]+(q[1]-p[1])*i/40),deck.id+' segment '+segment+' step '+i);}
 for(const rail of meta.assembly.railLinesLocal)for(let i=0;i<rail.points.length-1;i++){const p=rail.points[i],q=rail.points[i+1];assert.equal(canStand(x+(p[0]+q[0])/2,y+(p[1]+q[1])/2),false,deck.id+' '+rail.side);}
 const west={x:x+line[0][0]-80,y:y+line[0][1]},east={x:x+line.at(-1)[0]+80,y:y+line.at(-1)[1]};assert.ok(canStand(west.x,west.y));assert.ok(canStand(east.x,east.y));assert.ok(M.route(west,east,canStand,sc.size).length,deck.id+' route');}
});
