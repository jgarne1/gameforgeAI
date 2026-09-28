'use strict';
const fs=require('fs'),path=require('path');
const townId=id=>/^whisperwind_hd_[a-z0-9_]{1,80}$/.test(String(id||''));
function resolve(root,data,id){
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(String(id||'')))throw Error('Invalid scene ID.');
  const override=path.join(data,'town_scenes',id+'.json');
  return townId(id)&&fs.existsSync(override)?override:path.join(root,'public/assets/worlds',id+'.json');
}
function save(data,scene){
  if(!scene||!townId(scene.id))throw Error('Choose a Whisperwind HD scene ID.');
  if(!scene.size||!Number.isFinite(scene.size.w)||!Number.isFinite(scene.size.h)||scene.size.w<320||scene.size.h<320||scene.size.w>16000||scene.size.h>16000)throw Error('Scene size must be from 320 to 16,000.');
  for(const name of ['objects','hotspots','paths','walkable','blockers','collisions','npcs','effects'])if(scene[name]&&(!Array.isArray(scene[name])||scene[name].length>3000))throw Error('Invalid scene collection.');
  const json=JSON.stringify(scene,null,2);if(Buffer.byteLength(json)>2000000)throw Error('Scene exceeds the 2 MB limit.');
  const dir=path.join(data,'town_scenes');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,scene.id+'.json');fs.writeFileSync(file+'.tmp',json);fs.renameSync(file+'.tmp',file);
  return file;
}
function list(data){const dir=path.join(data,'town_scenes');return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')&&townId(f.slice(0,-5))):[];}
module.exports={townId,resolve,save,list};

