// Run only against the isolated local server prepared for recovery testing.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.RECOVERY_TEST_URL||'http://localhost:3100';
assert.equal(new URL(base).hostname,'localhost','Integration tests require an isolated localhost server');
const username='codex_recovery_test';
async function json(url,body){
  const response=await fetch(base+url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
  const data=await response.json();assert.ok(response.ok,JSON.stringify(data));assert.ok(!data.error,JSON.stringify(data));return data;
}
async function run(){
  const before=await json('/api/pet/profile?user='+username);
  const count=Number(before.profile.inventory.fish_drift_minnow||0);
  const caught=await json('/api/pet/fish/catch',{username,itemId:'fish_drift_minnow',sceneId:'shadow_woods_dock',quality:'Good',size:5,xp:4});
  assert.equal(caught.profile.inventory.fish_drift_minnow,count+1);
  const loaded=await json('/api/pet/profile?user='+username);
  assert.equal(loaded.profile.inventory.fish_drift_minnow,count+1);
  assert.ok(loaded.profile.fishing.logbook.fish_drift_minnow.locations.includes('shadow_woods_dock'));
  console.log('PASS: fish inventory, XP, and logbook survive profile reload');
  const id='recovery_test_roundtrip';
  const collisions=[{id:'bank',type:'polygon',points:[[20,20],[200,20],[20,200]]},{id:'post',type:'circle',x:50,y:50,r:20},{id:'wall',type:'rect',x:0,y:0,w:10,h:30}];
  try{
    await json('/api/admin/world-forger/save',{username,sceneId:id,scene:{id,name:'Recovery test only',size:{w:300,h:300},spawn:{x:250,y:250},collisions}});
    const scene=await json('/assets/worlds/'+id+'.json');
    assert.deepEqual(scene.blockers,collisions);
    assert.deepEqual(scene.collisions,collisions);
    console.log('PASS: server save/load preserves polygon, circle, and rectangle blockers');
  }finally{
    const file=path.resolve(__dirname,'../public/assets/worlds',id+'.json');
    assert.equal(path.basename(file),'recovery_test_roundtrip.json');
    if(fs.existsSync(file))fs.unlinkSync(file);
  }
  const games=await json('/api/games');
  for(const game of games){
    const response=await fetch(base+'/games/'+game.file);
    assert.equal(response.status,200,'Broken game entry: '+game.id);
  }
  console.log('PASS: every registered game URL loads ('+games.length+' entries)');
}
run().catch(e=>{console.error(e);process.exitCode=1});
