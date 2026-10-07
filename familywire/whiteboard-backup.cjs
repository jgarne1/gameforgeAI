'use strict';
const {createRecoveryCopy}=require('./recovery-copies.cjs');
function backupBeforeWhiteboard(db,dir,existingDatabase,options={}){
 if(!existingDatabase||db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='fw_boards'").get())return null;
 return createRecoveryCopy(db,dir,'messages-before-whiteboard-v1.sqlite',{...options,label:'whiteboard'});
}
module.exports={backupBeforeWhiteboard};
