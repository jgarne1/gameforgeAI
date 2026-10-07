const {createRecoveryCopy}=require('./recovery-copies.cjs');
function backupBeforeMembers(db,dir,options={}){
 if(db.prepare("SELECT name FROM sqlite_master WHERE name='fw_accounts'").get())return null;
 const exists=table=>!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
 if(!['people','messages','fw_games'].some(table=>exists(table)&&db.prepare('SELECT COUNT(*) AS n FROM '+table).get().n))return null;
 return createRecoveryCopy(db,dir,'messages-before-1.3.0.sqlite',{...options,label:'members'});
}
module.exports={backupBeforeMembers};
