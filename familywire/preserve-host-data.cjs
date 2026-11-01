'use strict';
// Narrow, owner-approved safeguard for the shared host's two existing pet files.
// Never seed, merge, replace, restore or delete live data on an implicit restart.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const FILES=Object.freeze(['pet_species.json','pet_moves.json']),LIMIT=16*1024*1024;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function regular(file){const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>LIMIT||fs.realpathSync(file)!==file)throw Error('Unsafe pet preservation file');return stat;}
function preserve(persistRoot){
 if(!persistRoot||!path.isAbsolute(persistRoot))throw Error('Explicit persistent root required');const root=fs.realpathSync(persistRoot),data=path.join(root,'data');
 if(!fs.lstatSync(data).isDirectory()||fs.lstatSync(data).isSymbolicLink()||fs.realpathSync(data)!==data)throw Error('Unsafe pet data directory');
 let folder=root;for(const part of ['backups','familywire-pet-preservation-v1']){folder=path.join(folder,part);if(!fs.existsSync(folder))fs.mkdirSync(folder,{mode:0o700});const stat=fs.lstatSync(folder);if(!stat.isDirectory()||stat.isSymbolicLink()||fs.realpathSync(folder)!==folder)throw Error('Unsafe pet backup directory');}
 const results=[];
 for(const name of FILES){const file=path.join(data,name);if(!fs.existsSync(file)){results.push({file:name,status:'missing-preserved'});continue;}regular(file);const bytes=fs.readFileSync(file),value=JSON.parse(bytes.toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Unexpected pet JSON shape');const digest=sha(bytes),backup=path.join(folder,digest+'-'+name);let created=false;
  if(!fs.existsSync(backup)){let fd;try{fd=fs.openSync(backup,'wx',0o600);fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);created=true;}finally{if(fd!==undefined)fs.closeSync(fd);}}
  regular(backup);if(sha(fs.readFileSync(backup))!==digest)throw Error('Pet backup hash mismatch; existing data preserved');regular(file);if(sha(fs.readFileSync(file))!==digest)throw Error('Pet data changed during preservation; inspect before retry');
  results.push({file:name,status:created?'backed-up':'verified-existing-backup',bytes:bytes.length,sha256:digest,backup});
 }
 return results;
}
module.exports={preserve,FILES};
