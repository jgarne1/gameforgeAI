'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const NAMES=Object.freeze(['messages-before-1.1.0.sqlite','messages-before-1.3.0.sqlite','messages-before-whiteboard-v1.sqlite','messages-before-collaboration-v1.sqlite','messages-before-collaboration-admission-v1.sqlite','messages-before-collaboration-admission-v2.sqlite','messages-before-whiteboard-palette-v2.sqlite']);
const OWNER='FamilyWire-managed-recovery-v1',DEFAULT_HOURS=48;
function retentionHours(value=process.env.FAMILYWIRE_RECOVERY_RETENTION_HOURS||DEFAULT_HOURS){const hours=Number(value);if(!Number.isInteger(hours)||hours<1||hours>168)throw Error('Recovery retention must be 1-168 whole hours');return hours;}
function folderFor(dir,{create=false}={}){const root=fs.realpathSync(dir),folder=path.join(root,'backups');if(create)fs.mkdirSync(folder,{recursive:true});if(!fs.existsSync(folder))return null;if(fs.lstatSync(folder).isSymbolicLink()||fs.realpathSync(folder)!==folder)throw Error('Recovery folder must stay inside the relay data directory');return folder;}
function digest(file){const hash=crypto.createHash('sha256'),buffer=Buffer.alloc(64*1024),fd=fs.openSync(file,'r');try{let read;while((read=fs.readSync(fd,buffer,0,buffer.length,null))>0)hash.update(buffer.subarray(0,read));return hash.digest('hex');}finally{fs.closeSync(fd);}}
function createRecoveryCopy(db,dir,name,{now=Date.now,hours=retentionHours(),label='migration'}={}){
 if(!NAMES.includes(name))throw Error('Unknown recovery copy');hours=retentionHours(hours);const folder=folderFor(dir,{create:true}),target=path.join(folder,name),pending=target+'.pending',marker=target+'.retention.json';
 // Older copies and unmarked partial files are never adopted, overwritten or deleted.
 if(fs.existsSync(target))return target;if(fs.existsSync(pending)||fs.existsSync(marker))throw Error('An incomplete FamilyWire '+label+' recovery copy needs inspection before retrying');
 const size=db.prepare('PRAGMA page_count').get().page_count*db.prepare('PRAGMA page_size').get().page_size,disk=fs.statfsSync(folder);if(disk.bavail*disk.bsize<size+1024*1024)throw Error('Not enough disk space for the FamilyWire '+label+' migration recovery copy');
 db.prepare('VACUUM INTO ?').run(pending);
 const bytes=fs.statSync(pending).size,createdAt=now();if(!Number.isSafeInteger(createdAt)||createdAt<0)throw Error('Invalid recovery creation time');
 const metadata={schema:1,createdBy:OWNER,file:name,createdAt,expiresAt:createdAt+hours*3600000,hours,bytes,sha256:digest(pending)};
 // Seal ownership/hash before atomic no-overwrite installation. A sealed pending copy
 // has the same bounded lifecycle; an unmarked interrupted copy requires inspection.
 fs.writeFileSync(marker,JSON.stringify(metadata)+'\n',{flag:'wx',mode:0o600});
 fs.linkSync(pending,target);fs.unlinkSync(pending);return target;
}
function cleanupRecoveryCopies(dir,{now=Date.now}={}){
 const folder=folderFor(dir);if(!folder)return[];const results=[],clock=now();
 for(const name of NAMES){const target=path.join(folder,name),marker=target+'.retention.json';if(!fs.existsSync(marker)){if(fs.existsSync(target)||fs.existsSync(target+'.pending'))results.push({file:name,status:'legacy-unmanaged-preserved'});continue;}
  if(!fs.lstatSync(marker).isFile()||fs.lstatSync(marker).isSymbolicLink()||fs.statSync(marker).size>4096){results.push({file:name,status:'unsafe-marker-preserved'});continue;}
  let metadata;try{metadata=JSON.parse(fs.readFileSync(marker,'utf8'));}catch{results.push({file:name,status:'invalid-marker-preserved'});continue;}
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata)||metadata.schema!==1||metadata.createdBy!==OWNER||metadata.file!==name||!Number.isSafeInteger(metadata.createdAt)||metadata.createdAt<0||!Number.isSafeInteger(metadata.expiresAt)||metadata.expiresAt!==metadata.createdAt+metadata.hours*3600000||!Number.isInteger(metadata.hours)||metadata.hours<1||metadata.hours>168||!Number.isSafeInteger(metadata.bytes)||metadata.bytes<1||!/^[a-f0-9]{64}$/.test(metadata.sha256)){results.push({file:name,status:'invalid-marker-preserved'});continue;}
  if(clock<metadata.expiresAt){results.push({file:name,status:'retained',expiresAt:metadata.expiresAt});continue;}
  const candidates=[target,target+'.pending'].filter(file=>fs.existsSync(file));
  if(candidates.some(file=>{const stat=fs.lstatSync(file);return!stat.isFile()||stat.isSymbolicLink()||stat.size!==metadata.bytes||digest(file)!==metadata.sha256;})){results.push({file:name,status:'changed-copy-preserved'});continue;}
  try{for(const file of candidates)fs.unlinkSync(file);fs.unlinkSync(marker);results.push({file:name,status:'expired-managed-copy-removed'});}catch{results.push({file:name,status:'cleanup-retry-needed'});}
 }
 return results;
}
module.exports={createRecoveryCopy,cleanupRecoveryCopies,retentionHours,NAMES,DEFAULT_HOURS};
