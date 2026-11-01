'use strict';
const crypto=require('node:crypto'),{keys,seal,open}=require('./shared-protocol.cjs');
const bad=(message,status=403)=>{throw Object.assign(Error(message),{status});};
function createCalendarShares(db,{secret,canAccess,admission,ended=()=>false,now=Date.now,capacity=()=>{}}){
 const key=keys(secret).key,encode=x=>seal(Buffer.from(JSON.stringify(x)),key).toString('base64'),decode=x=>JSON.parse(open(Buffer.from(x,'base64'),key));
 db.exec('CREATE TABLE IF NOT EXISTS fw_calendar_sources(id TEXT PRIMARY KEY,state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS fw_calendar_shares(id TEXT PRIMARY KEY,source_id TEXT NOT NULL,chat_id TEXT NOT NULL,state TEXT NOT NULL)');
 const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
 function allowed(chat,user){return canAccess(chat,user)&&!!admission(chat,user)&&!ended(chat);}
 function source(id,user){const row=db.prepare('SELECT state FROM fw_calendar_sources WHERE id=?').get(id);if(!row)bad('Import source unavailable',404);const s=decode(row.state);if(s.ownerId!==user||s.revoked||!allowed(s.chatId,user)||s.admission!==admission(s.chatId,user))bad('Import source access denied');return s;}
 function saveSource(s){capacity(4096);db.prepare('INSERT INTO fw_calendar_sources VALUES(?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state').run(s.id,encode(s));}
 function normalized(e){if(!e||typeof e.id!=='string'||!e.id||e.id.length>1024||typeof e.title!=='string'||e.title.length>512||!Number.isFinite(e.start)||!Number.isFinite(e.end)||e.end<=e.start)bad('Invalid imported event',400);return{id:e.id,title:e.title,start:e.start,end:e.end,allDay:e.allDay===true,timezone:typeof e.timezone==='string'?e.timezone:'UTC',seriesId:typeof e.seriesId==='string'?e.seriesId:null,originalStart:e.originalStart||null};}
 function act(user,body){
  if(body?.type==='register'){
   const s=body.source;if(!s||!['google','outlook'].includes(s.provider)||!['accountId','calendarId','label','chatId'].every(k=>typeof s[k]==='string'&&s[k]&&s[k].length<=512)||!allowed(s.chatId,user))bad('Invalid import source',400);
   const id=digest([user,s.provider,s.accountId,s.calendarId]),row=db.prepare('SELECT state FROM fw_calendar_sources WHERE id=?').get(id);
   if(row){const prior=source(id,user);if(prior.label!==s.label||prior.chatId!==s.chatId)bad('Import source identity is immutable');return{id};}
   saveSource({id,ownerId:user,provider:s.provider,accountId:s.accountId,calendarId:s.calendarId,label:s.label,chatId:s.chatId,admission:admission(s.chatId,user),revoked:false,lastSuccess:0});return{id};
  }
  if(body?.type==='revoke'){const row=db.prepare('SELECT state FROM fw_calendar_sources WHERE id=?').get(body.sourceId);if(!row)bad('Import source unavailable',404);const s=decode(row.state);if(s.ownerId!==user)bad('Import source access denied');saveSource({...s,revoked:true});db.prepare('DELETE FROM fw_calendar_shares WHERE source_id=?').run(s.id);return{revoked:true};}
  const s=source(body?.sourceId,user);
  if(body.type==='share'){
   const chat=body.chatId,participants=body.participants;if(!allowed(chat,user)||!Array.isArray(participants)||!participants.length||participants.length>100||new Set(participants).size!==participants.length||!participants.includes(user)||participants.some(p=>!allowed(chat,p)||body.expectedAdmissions?.[p]!==admission(chat,p)))bad('Sharing audience access changed');
   const event=normalized(body.event),id=digest([s.id,event.id,chat]),admissions=Object.fromEntries(participants.map(p=>[p,admission(chat,p)]));
   // An explicit share is the only operation allowed to replace participant grants.
   db.exec('BEGIN IMMEDIATE');try{capacity(JSON.stringify(event).length*2+8192);db.prepare('INSERT INTO fw_calendar_shares VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state').run(id,s.id,chat,encode({event,participants,admissions,ownerAdmission:admission(chat,user),reminder:[0,5,15,30,60,1440].includes(body.reminder)?body.reminder:0}));saveSource({...s,lastSuccess:now()});db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return{id};
  }
  if(body.type==='unshare'){db.prepare('DELETE FROM fw_calendar_shares WHERE id=? AND source_id=?').run(body.id,s.id);return{removed:true};}
  if(body.type==='update'){
   if(!Array.isArray(body.events)||body.events.length>1000)bad('Invalid shared import update',400);const incoming=new Map(body.events.map(e=>[e.id,e.deleted?{id:e.id,deleted:true}:normalized(e)]));
   db.exec('BEGIN IMMEDIATE');try{for(const row of db.prepare('SELECT * FROM fw_calendar_shares WHERE source_id=?').all(s.id)){const prior=decode(row.state),e=incoming.get(prior.event.id);if(e?.deleted)db.prepare('DELETE FROM fw_calendar_shares WHERE id=?').run(row.id);else if(e){capacity(JSON.stringify(e).length*2+4096);db.prepare('UPDATE fw_calendar_shares SET state=? WHERE id=?').run(encode({...prior,event:e}),row.id);}}saveSource({...s,lastSuccess:now()});db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return{updated:true};
  }
  bad('Unknown import sharing action',400);
 }
 function list(chat,user){if(!canAccess(chat,user))bad('Calendar access denied');const result=[];for(const row of db.prepare('SELECT * FROM fw_calendar_shares WHERE chat_id=?').all(chat)){const grant=decode(row.state),s=decode(db.prepare('SELECT state FROM fw_calendar_sources WHERE id=?').get(row.source_id).state);if(s.revoked||!allowed(s.chatId,s.ownerId)||s.admission!==admission(s.chatId,s.ownerId)||!allowed(chat,s.ownerId)||grant.ownerAdmission!==admission(chat,s.ownerId)||!grant.participants.includes(user)||grant.admissions[user]!==admission(chat,user)||now()-s.lastSuccess>30*60000)continue;result.push({id:row.id,providerEventId:grant.event.id,sourceId:s.id,provider:s.provider,source:s.label,ownerId:s.ownerId,chatId:chat,readOnly:true,...grant.event,id:row.id,participants:grant.participants,lastSuccess:s.lastSuccess,reminder:grant.reminder,occurrences:[{id:row.id,start:grant.event.start,end:grant.event.end,reminderAt:grant.reminder?grant.event.start-grant.reminder*60000:null}]});}return result;}
 return{act,list};
}
module.exports={createCalendarShares};
