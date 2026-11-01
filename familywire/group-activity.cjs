'use strict';
const crypto=require('node:crypto'),{seal}=require('./shared-protocol.cjs');
function createGroupActivity(db,{key,now=Date.now,capacity=()=>{},nameFor=()=> 'A member'}){
 db.exec('CREATE TABLE IF NOT EXISTS fw_group_activity(id TEXT PRIMARY KEY)');
 return function announce({key:identity,chat,user,kind,targetId,text,count=1}){if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'").get())return;const uuid=crypto.createHash('sha256').update(identity).digest('hex').slice(0,32),id=uuid.slice(0,8)+'-'+uuid.slice(8,12)+'-'+uuid.slice(12,16)+'-'+uuid.slice(16,20)+'-'+uuid.slice(20);if(db.prepare('SELECT id FROM fw_group_activity WHERE id=?').get(id))return;const name=String(nameFor(user)).slice(0,32),body=name+' '+text,message={id,userId:user,name,body,time:new Date(now()).toISOString(),language:'en',groupActivity:{v:1,kind,targetId,count},chatId:chat},frame=seal(Buffer.from(JSON.stringify(message)),key).toString('base64');capacity(frame.length+4096);db.prepare('INSERT INTO fw_group_activity VALUES(?)').run(id);db.prepare("INSERT INTO messages(id,frame,user_id,received_at,chat_id,message_kind) VALUES(?,?,?,?,?,'activity')").run(id,frame,user,now(),chat);};
}
module.exports={createGroupActivity};
