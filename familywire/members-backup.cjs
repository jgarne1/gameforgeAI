const fs=require('node:fs'),path=require('node:path');
function backupBeforeMembers(db,dir){
 if(db.prepare("SELECT name FROM sqlite_master WHERE name='fw_accounts'").get())return null;
 const exists=table=>!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
 if(!['people','messages','fw_games'].some(table=>exists(table)&&db.prepare('SELECT COUNT(*) AS n FROM '+table).get().n))return null;
 const folder=path.join(dir,'backups'),target=path.join(folder,'messages-before-1.3.0.sqlite');if(fs.existsSync(target))return target;fs.mkdirSync(folder,{recursive:true});const pages=db.prepare('PRAGMA page_count').get().page_count,size=db.prepare('PRAGMA page_size').get().page_size,disk=fs.statfsSync(folder);if(disk.bavail*disk.bsize<pages*size+1024*1024)throw new Error('Not enough disk space for the FamilyWire members migration backup');const pending=target+'.pending';if(fs.existsSync(pending))throw new Error('An incomplete FamilyWire members backup needs inspection');db.prepare('VACUUM INTO ?').run(pending);fs.renameSync(pending,target);return target;
}
module.exports={backupBeforeMembers};
