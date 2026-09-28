const test=require('node:test');
const assert=require('node:assert/strict');
const {DEFAULT_HOMETOWN,resolveHometown}=require('../lib/hometown');
const estate={neighborhoods:[{id:'harbor_01',name:'Harbor',hometownSceneId:'harbor_town',plots:[{id:'apartment_3',owner:'alice'}]}]};
test('new and existing users without a selected residence start in Whisperwind',()=>{
  assert.deepEqual(resolveHometown('alice',{},estate,()=>true),DEFAULT_HOMETOWN);
  assert.deepEqual(resolveHometown('alice',{world:{}},estate,()=>true),DEFAULT_HOMETOWN);
});
test('selected owned residence resolves its town, with case-insensitive owner matching',()=>{
  const profile={world:{residence:{neighborhoodId:'harbor_01',plotId:'apartment_3'}}};
  assert.deepEqual(resolveHometown('ALICE',profile,estate,()=>true),{name:'Harbor',neighborhoodId:'harbor_01',sceneId:'harbor_town'});
  assert.deepEqual(resolveHometown('bob',profile,estate,()=>true),DEFAULT_HOMETOWN);
});
test('missing homes, released ownership and unavailable destinations return safely home',()=>{
  const profile={world:{residence:{neighborhoodId:'harbor_01',plotId:'apartment_3'}}};
  assert.deepEqual(resolveHometown('alice',profile,estate,()=>false),DEFAULT_HOMETOWN);
  assert.deepEqual(resolveHometown('alice',{world:{residence:{neighborhoodId:'missing',plotId:'missing'}}},estate,()=>true),DEFAULT_HOMETOWN);
  assert.deepEqual(resolveHometown('alice',profile,{neighborhoods:[{...estate.neighborhoods[0],plots:[{id:'apartment_3',owner:null}]}]},()=>true),DEFAULT_HOMETOWN);
});
