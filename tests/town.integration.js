// Only run against the isolated localhost recovery server.
const assert=require('node:assert/strict'),WebSocket=require('ws');
const base=process.env.RECOVERY_TEST_URL||'http://localhost:3100';assert.equal(new URL(base).hostname,'localhost');
async function request(url,body,cookie){const r=await fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function account(name){const password='isolated-town-test';await request('/api/register',{username:name,password});const r=await request('/api/login',{username:name,password});assert.equal(r.data.ok,true);assert.ok(r.cookie);return r.cookie;}
async function run(){
  const suffix=Date.now().toString(36),owner='town_owner_'+suffix,buyer='town_buyer_'+suffix,other='town_other_'+suffix;
  const oc=await account(owner),bc=await account(buyer),tc=await account(other);
  const list=(await request('/api/town/homes')).data.plots;
  const plot=list.find(p=>p.id.startsWith('town_home_')&&!p.owner);assert.ok(plot,'Need one available plot in isolated test data');
  const url='/api/town/homes/'+plot.id;
  assert.equal((await request(url+'/buy',{username:owner})).status,401);
  let r=await request(url+'/buy',{username:buyer},oc);assert.equal(r.data.plot.owner,owner);assert.equal(r.data.price,0);
  assert.equal((await request(url+'/buy',{},bc)).status,409);
  assert.equal((await request(url+'/list',{username:owner,price:30},bc)).status,409);
  await request(url+'/list',{price:30},oc);await request(url+'/unlist',{},oc);
  assert.equal((await request(url+'/buy',{},bc)).status,409);
  const decoration={objects:[{asset:'wwhd_sofa',x:350,y:450,scale:1,rotation:90}],floor:'stone',wall:'blue',privacy:'private',exterior:{style:'apartment',accent:'blue',roof:'plum',sign:'My river home'}};
  r=await request(url+'/decorate',{decoration},oc);assert.equal(r.status,200);
  assert.equal((await request('/api/town/home-scene/'+plot.id,null,bc)).status,403);
  r=await request('/api/town/home-scene/'+plot.id,null,oc);assert.equal(r.data.home.decoration.exterior.sign,'My river home');assert.equal(r.data.objects[0].rotation,Math.PI/2);assert.equal(r.data.home.canEdit,true);assert.equal(r.data.objects[0].collide.length,4);assert.ok(r.data.objects[0].collide[2]>0);
  assert.equal(r.data.home.decoration.exterior.roof,'plum');assert.equal(r.data.size.w,1200*plot.roomScale);assert.equal(r.data.objects[0].x,350*plot.roomScale);
  await new Promise((resolve,reject)=>{const ws=new WebSocket(base.replace('http','ws'),{headers:{Cookie:bc}}),timer=setTimeout(()=>{ws.close();reject(Error('Private home websocket response missing'));},3000);ws.on('open',()=>ws.send(JSON.stringify({type:'worldJoin',username:owner,sceneId:'home__'+plot.id})));ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='error'){assert.equal(m.code,'home_access');clearTimeout(timer);ws.close();resolve();}});ws.on('error',reject);});
  console.log('PASS: authenticated ownership, cancel listing, saved decoration, private HTTP and socket access');
  await request(url+'/list',{price:30},oc);
  const results=await Promise.all([request(url+'/buy',{},bc),request(url+'/buy',{},tc)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const winner=results[0].status===200?buyer:other,wc=results[0].status===200?bc:tc;
  const sale=(await request('/api/town/homes')).data.plots.find(p=>p.id===plot.id);assert.equal(sale.owner,winner);assert.equal(sale.listing,undefined);
  assert.equal((await request('/api/pet/profile?user='+owner)).data.profile.money,130);
  assert.equal((await request('/api/pet/profile?user='+winner)).data.profile.money,70);
  assert.equal((await request(url+'/decorate',{decoration},oc)).status,409);
  r=await request('/api/town/shop/whisperwind_tackle/buy',{itemId:'plain_hook',username:owner,price:0},wc);assert.equal(r.status,200);assert.equal(r.data.coins,62);
  assert.equal((await request('/api/town/shop/whisperwind_tackle/buy',{itemId:'not_an_item'},wc)).status,409);
  assert.equal((await request('/api/town/admin/npc-skin',{sceneId:'whisperwind_hd_waterfront',npcId:'npc_mira',skinId:'toma'},wc)).status,403);
  for(const id of ['npc_mira','npc_toma','npc_dockmaster'])await request('/api/town/story/visit',{npcId:id},wc);
  assert.equal((await request('/api/town/story',null,wc)).data.story.complete,true);
  await request('/api/town/logout',{},wc);assert.equal((await request(url+'/list',{price:40},wc)).status,401);
  console.log('PASS: one winner in concurrent resale, exact coin transfer, shop inventory, admin denial, story and logout');
}
run().catch(e=>{console.error(e);process.exitCode=1;});

