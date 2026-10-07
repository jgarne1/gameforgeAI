const {createRecoveryCopy}=require('./recovery-copies.cjs');
function backupBeforeLearning(db,dir,options={}){
 if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'").get()||db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='fw_learning'").get())return null;
 return createRecoveryCopy(db,dir,'messages-before-1.1.0.sqlite',{...options,label:'learning'});
}
module.exports={backupBeforeLearning};
