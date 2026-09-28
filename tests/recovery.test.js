const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const scene=id=>JSON.parse(fs.readFileSync(path.join(root,'public/assets/worlds',id+'.json'),'utf8'));
const source=f=>fs.readFileSync(path.join(root,f),'utf8');

test('all edited browser scripts parse',()=>{
  for(const file of ['games/world.html','games/petworld.html','games/world_composer.html','games/estate.html','public/admin.html','public/index.html']){
    for(const match of source(file).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(match[1],{filename:file});
  }
  new vm.Script(source('games/js/shadow_woods_engine.js'));
  new vm.Script(source('games/js/world_engine.js'));
  new vm.Script(source('games/js/rpg_scene_engine.js'));
  new vm.Script(source('server.js'));
});

function fishing(){
  const context=vm.createContext({window:{}});
  const code=source('games/js/shadow_woods_engine.js').replace('window.ShadowWoodsEngine={start:start,stop:stop};',
    'window.test={getSceneMeta,getSpawnPoint,normalizeHotspot,chooseFishTarget,castValidation,rebuildWaterAreas,engine};');
  vm.runInContext(code,context);return context.window.test;
}
test('recovered fishing resolves current registry paths and named/object arrivals',()=>{
  const api=fishing();const dock=scene('shadow_woods_dock');
  api.engine.sceneRegistry=scene('world_scenes');
  assert.equal(api.getSceneMeta(dock.id).path,'/assets/worlds/shadow_woods_dock.json');
  assert.equal(api.getSceneMeta('other_scene').path,'/assets/worlds/other_scene.json');
  assert.equal(api.getSpawnPoint(dock,'from_river_bend').y,320);
  assert.equal(api.getSpawnPoint(dock,{x:0,y:0}).x,0);
});
test('editor-created fishing spots accept the default table and cast in painted water',()=>{
  const api=fishing();const spot=api.normalizeHotspot({type:'fishing',x:30,y:50,fishTable:'default'});
  assert.equal(api.chooseFishTarget(spot).id.startsWith('fish_'),true);
  api.engine.regionConfig={terrain:{water:[{points:[[0,0],[100,0],[100,100],[0,100]]}]}};
  api.rebuildWaterAreas();
  assert.equal(api.castValidation(50,50).ok,true);
  assert.equal(api.castValidation(150,50).ok,false);
});
test('fishing dock and river map form a returnable route',()=>{
  const dock=scene('shadow_woods_dock'),river=scene('shadow_woods_river_bend');
  const outward=dock.hotspots.find(h=>h.id==='deeper_woods_exit');
  const inward=river.hotspots.find(h=>h.id==='south_return_exit');
  assert.equal(outward.targetScene,river.id);assert.equal(inward.targetScene,dock.id);
  assert.ok(river.spawnPoints.some(p=>p.id===outward.targetSpawn));
  assert.ok(dock.spawnPoints.some(p=>p.id===inward.targetSpawn));
  const townDock=scene('whisperwind_v2_hub').hotspots.find(h=>h.id==='dock_fishing');
  assert.equal(townDock.href,'/games/world.html?scene=shadow_woods_dock');
});
test('composer retains polygon boundaries through import and save preparation',()=>{
  const html=source('games/world_composer.html');
  const extract=name=>html.slice(html.indexOf('function '+name+'('),html.indexOf('\n',html.indexOf('function '+name+'(')));
  const boundary={id:'bank',type:'poly',points:[[10,20],[30,20],[20,40]]};
  const context=vm.createContext({S:{scene:{blockers:[boundary]},zoneVisible:{}},renderZones(){}});
  vm.runInContext(extract('normalizeScene')+'\n'+extract('syncDerivedZones')+'\nnormalizeScene();syncDerivedZones();',context);
  assert.equal(JSON.stringify(context.S.scene.blockers[0].points),JSON.stringify(boundary.points));
  assert.equal(context.S.scene.blockers[0].x,undefined);
});

test('first animation frame cannot produce a negative time step',()=>{
  const code=source('games/js/shadow_woods_engine.js');
  const loop=code.slice(code.indexOf('  function loop(now)'),code.indexOf('  function updateExplore'));
  let rendered;
  const context=vm.createContext({engine:{running:true,last:101,mode:'explore'},updateExplore(){},render(dt){rendered=dt},requestAnimationFrame(){return 1}});
  vm.runInContext(loop+'\nloop(100);',context);
  assert.equal(rendered,0);
});

test('dragging a polygon moves its vertices instead of introducing rectangle coordinates',()=>{
  const html=source('games/world_composer.html');
  const extract=name=>html.slice(html.indexOf('function '+name+'('),html.indexOf('\n',html.indexOf('function '+name+'(')));
  const boundary={id:'bank',points:[[0,0],[10,0],[0,10]]};
  const state={tool:'select',scene:{collisions:[boundary]},cam:{z:1}};
  const context=vm.createContext({S:state,$(){return {}},screenToWorld(e){return e},hitAt(){return {obj:boundary,kind:'boundary',vertex:-1}},select(kind,obj){state.selected=obj},draw(){},syncDerivedZones(){},mark(){},renderInspector(){}});
  vm.runInContext(extract('isPolyKind')+'\n'+extract('pointerDown')+'\n'+extract('pointerMove')+'\npointerDown({x:3,y:3});pointerMove({x:23,y:13});',context);
  assert.equal(JSON.stringify(boundary.points),JSON.stringify([[20,10],[30,10],[20,20]]));
  assert.equal(boundary.x,undefined);
});
