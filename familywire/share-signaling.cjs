const crypto=require('node:crypto');
const SIGNALS=new Set(['ready','offer','answer','ice','decline','end','heartbeat']);
class ShareSignaling {
 constructor({now=Date.now,onEvent=()=>{}}={}){this.now=now;this.onEvent=onEvent;this.calls=new Map();this.events=[];this.sequence=0;}
 emit(to,call,kind,payload=null){this.events.push({seq:++this.sequence,to,callId:call.id,chatId:call.chatId,from:kind==='invite'?call.owner:kind==='ended'?null:null,kind,payload,at:this.now()});if(this.events.length>400)this.events.splice(0,this.events.length-400);this.onEvent();}
 prune(){const time=this.now();this.events=this.events.filter(e=>e.at>time-120000);for(const call of [...this.calls.values()])if(time-call.ownerSeen>90000||time-call.targetSeen>90000)this.end(call.id,null,'Connection timed out');}
 start(chatId,owner,target){this.prune();if(owner===target||[...this.calls.values()].some(c=>[c.owner,c.target].includes(owner)||[c.owner,c.target].includes(target)))throw new Error('A person is already sharing');const call={id:crypto.randomUUID(),chatId,owner,target,ownerSeen:this.now(),targetSeen:this.now(),ready:false,offered:false};this.calls.set(call.id,call);this.emit(target,call,'invite',{from:owner});return call;}
 send(id,chatId,from,kind,payload){this.prune();const call=this.calls.get(id);if(!call||call.chatId!==chatId||![call.owner,call.target].includes(from))throw new Error('Share is unavailable');if(!SIGNALS.has(kind))throw new Error('Invalid share signal');
  if(kind==='ready'&&from!==call.target||kind==='offer'&&from!==call.owner||kind==='answer'&&from!==call.target||kind==='decline'&&from!==call.target)throw new Error('Share signal is not allowed');
  if(kind==='offer'||kind==='answer'){if(typeof payload?.type!=='string'||payload.type!==kind||typeof payload.sdp!=='string'||payload.sdp.length>16000)throw new Error('Invalid session description');}
  if(kind==='ice'&&(!payload||typeof payload.candidate!=='string'||payload.candidate.length>4096))throw new Error('Invalid network candidate');
  if(kind==='offer'&&!call.ready||kind==='answer'&&!call.offered||kind==='ice'&&!call.ready)throw new Error('Share has not been accepted');
  if(kind==='heartbeat'){if(from===call.owner)call.ownerSeen=this.now();else call.targetSeen=this.now();return;}
  if(kind==='end'||kind==='decline'){this.end(id,from,kind==='decline'?'Invitation declined':'Sharing ended');return;}
  if(kind==='ready')call.ready=true;if(kind==='offer')call.offered=true;
  if(from===call.owner)call.ownerSeen=this.now();else call.targetSeen=this.now();
  this.emit(from===call.owner?call.target:call.owner,call,kind,payload);
 }
 end(id,from,reason='Sharing ended'){const call=this.calls.get(id);if(!call)return;if(from&&![call.owner,call.target].includes(from))throw new Error('Share is unavailable');this.calls.delete(id);for(const user of [call.owner,call.target])this.emit(user,call,'ended',{reason});}
 endChat(chatId){for(const call of [...this.calls.values()])if(call.chatId===chatId)this.end(call.id,null,'Chat membership changed');}
 endUser(user){for(const call of [...this.calls.values()])if(call.owner===user||call.target===user)this.end(call.id,null,'Screen sharing stopped');}
 callFor(id,user){this.prune();const call=this.calls.get(id);return call&&[call.owner,call.target].includes(user)?call:null;}
 eventsFor(user,after){this.prune();return this.events.filter(e=>e.to===user&&e.seq>after&&(e.kind!=='invite'||this.calls.has(e.callId))).map(({to,...event})=>event);}
 close(){this.calls.clear();this.events=[];}
}
module.exports={ShareSignaling};
