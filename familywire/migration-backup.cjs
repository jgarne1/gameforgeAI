const fs=require('node:fs'),path=require('node:path');
function backupBeforeLearning(db,dir){
 // A local, coherent SQLite snapshot before the additive 1.1.0 learning table.
 // Empty/new databases need no migration backup; never overwrite an older copy.
 if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'").get()||db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='fw_learning'").get())return null;
 const folder=path.join(dir,'backups'),target=path.join(folder,'messages-before-1.1.0.sqlite');
 if(fs.existsSync(target))return target;
 fs.mkdirSync(folder,{recursive:true});
 const info=db.prepare('PRAGMA page_count').get(),page=db.prepare('PRAGMA page_size').get(),size=info.page_count*page.page_size;
 const disk=fs.statfsSync(folder);if(disk.bavail*disk.bsize<size+1024*1024)throw new Error('Not enough disk space for the FamilyWire migration backup');
 const temporary=target+'.pending';if(fs.existsSync(temporary))throw new Error('A FamilyWire backup is incomplete; inspect it before retrying');
 db.prepare('VACUUM INTO ?').run(temporary);fs.renameSync(temporary,target);
 return target;
}
module.exports={backupBeforeLearning};
