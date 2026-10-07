'use strict';
// Ephemeral authority model. Relay adapters must supply authenticated actor/membership;
// clients never choose actor IDs. Native hosts recheck input tickets before applying them.
const crypto=require('node:crypto');
const LIMITS=Object.freeze({participants:4,tabs:8,events:256,inputPerSecond:60,hostTimeoutMs:90000});
const COLORS=Object.freeze(['#155fa4','#426743','#6d38a1','#9a3d42','#006b80','#7b4a17']);
function identity(userId,name){
 if(typeof userId!=='string'||!userId||userId.length>128||typeof name!=='string'||name.length>80)throw Error('Invalid participant');
 let value=2166136261;for(const c of userId){value^=c.charCodeAt(0);value=Math.imul(value,16777619);}
 return Object.freeze({userId,name:name.trim()||'Participant',initial:Array.from(name.trim()||'?')[0].toUpperCase(),color:COLORS[(value>>>0)%COLORS.length]});
}
function browserURL(raw,{fixtureOrigin=null}={}){
 if(typeof raw!=='string'||raw.length>2048)throw Error('Invalid browser address');
 let url;try{url=new URL(raw);}catch{throw Error('Invalid browser address');}
 if(url.username||url.password)throw Error('Browser addresses cannot contain credentials');
 if(fixtureOrigin&&url.origin===fixtureOrigin&&url.protocol==='http:')return url.href;
 if(url.protocol!=='https:'||url.port&&url.port!=='443'||['.internal','.home.arpa','.onion'].some(s=>url.hostname.endsWith(s))||url.hostname==='localhost'||url.hostname.endsWith('.localhost')||url.hostname.endsWith('.local')||url.hostname.includes(':')||/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)||!url.hostname.includes('.'))throw Error('Use a public HTTPS browser address');
 return url.href;
}
class BrowserSession {
 constructor({chatId,creator,now=Date.now,fixtureOrigin=null}){
  if(typeof chatId!=='string'||!chatId)throw Error('Active chat required');
  this.id=crypto.randomUUID();this.chatId=chatId;this.hostId=creator.userId;this.ownerId=creator.userId;this.now=now;this.fixtureOrigin=fixtureOrigin;
  this.epoch=1;this.sequence=0;this.closed=false;this.events=[];this.tabs=new Map();this.captures=new Map();this.members=new Map();this.requests=new Set();this.rate=new Map();this.issuedInputs=new WeakSet();
  this.join(creator);this.members.get(creator.userId).approved=true;
 }
 member(actor){if(this.closed)throw Error('Browser session ended');const member=this.members.get(actor);if(!member)throw Error('Browser access denied');return member;}
 current(actor,epoch){const member=this.member(actor);if(epoch!==this.epoch)throw Error('Browser authority changed');return member;}
 emit(kind,payload={}){const event={sequence:++this.sequence,epoch:this.epoch,kind,payload,at:this.now()};this.events.push(event);if(this.events.length>LIMITS.events)this.events.shift();return event;}
 changed(kind,payload){this.epoch++;return this.emit(kind,payload);}
 join(profile){if(this.closed)throw Error('Browser session ended');const label=identity(profile.userId,profile.name);if(this.members.has(profile.userId))return this.snapshot(profile.userId);if(this.members.size>=LIMITS.participants)throw Error('Browser participant limit reached');this.members.set(profile.userId,{...label,approved:false,paused:false,seen:this.now(),view:{mode:'live',tabId:null,follow:null},cursor:null,views:{}});this.changed('joined',{userId:profile.userId});return this.snapshot(profile.userId);}
 heartbeat(actor){this.member(actor).seen=this.now();}
 prune(){if(this.closed)return;if(this.now()-this.members.get(this.hostId).seen>LIMITS.hostTimeoutMs){this.end('Browser host disconnected');return;}for(const [id,member]of this.members)if(id!==this.hostId&&this.now()-member.seen>LIMITS.hostTimeoutMs)this.remove(id);}
 remember(member){if(member.view.tabId&&!member.view.follow)member.views[member.view.tabId]=JSON.parse(JSON.stringify(member.view));}
 owner(actor){this.member(actor);if(actor!==this.ownerId)throw Error('Browser room owner required');}
 tab(id){const tab=this.tabs.get(id);if(!tab)throw Error('Browser tab unavailable');return tab;}
 manageTab(actor,tab){this.member(actor);if(actor!==tab.ownerId&&actor!==this.ownerId)throw Error('Browser tab owner required');}
 allowed(actor,tab){const member=this.member(actor);return member.approved&&!member.paused&&member.view.mode==='live'&&(actor===this.ownerId||actor===tab.ownerId||tab.grants.has(actor));}
 act(actor,command){
  if(!command||typeof command!=='object'||Array.isArray(command))throw Error('Invalid browser action');
  const member=this.current(actor,command.epoch),target=command.target;
  switch(command.op){
   case 'request-control':this.requests.add(actor);this.emit('control-requested',{userId:actor});break;
   case 'approve-control':this.owner(actor);this.member(target).approved=true;this.requests.delete(target);this.changed('control-approved',{userId:target});break;
   case 'revoke-control':this.owner(actor);if(target===this.ownerId)throw Error('Transfer room ownership before revoking the owner');this.member(target).approved=false;this.requests.delete(target);this.changed('control-revoked',{userId:target,releaseInputs:true});break;
   case 'pause':member.paused=true;this.changed('control-paused',{userId:actor,releaseInputs:true});break;
   case 'resume':if(!member.approved)throw Error('Control has not been approved');member.paused=false;this.changed('control-resumed',{userId:actor});break;
   case 'transfer-room':this.owner(actor);this.member(target).approved=true;this.ownerId=target;this.changed('room-owner-changed',{userId:target});break;
   case 'create-tab':{
    this.remember(member);if(!member.approved||member.paused)throw Error('Approved active control required to create a tab');if(this.tabs.size>=LIMITS.tabs)throw Error('Browser tab limit reached');
    const url=browserURL(command.url,{fixtureOrigin:this.fixtureOrigin}),tab={id:crypto.randomUUID(),ownerId:actor,url,title:'New tab',epoch:1,navigation:1,grants:new Set(),capture:null};this.tabs.set(tab.id,tab);member.view={mode:'live',tabId:tab.id,follow:null};this.changed('tab-created',{tabId:tab.id,ownerId:actor,url});break;
   }
   case 'navigate-tab':{const {tab}=this.authorizeInput(actor,{epoch:command.epoch,tabId:command.tabId,tabEpoch:command.tabEpoch});tab.url=browserURL(command.url,{fixtureOrigin:this.fixtureOrigin});tab.title='Loading';tab.capture=null;tab.navigation++;tab.epoch++;this.changed('tab-navigated',{tabId:tab.id,releaseInputs:true});break;}
   case 'grant-tab':case 'revoke-tab':case 'transfer-tab':case 'close-tab':{
    const tab=this.tab(command.tabId);this.manageTab(actor,tab);
    if(command.op==='close-tab'){this.tabs.delete(tab.id);for(const [id,c]of this.captures)if(c.tabId===tab.id)this.captures.delete(id);for(const m of this.members.values()){delete m.views[tab.id];if(m.view.tabId===tab.id)m.view={mode:'live',tabId:null,follow:null};}this.changed('tab-closed',{tabId:tab.id,releaseInputs:true});break;}
    this.member(target);if(command.op==='grant-tab')tab.grants.add(target);else if(command.op==='revoke-tab'){if(target===tab.ownerId)throw Error('Transfer tab ownership before revoking the tab owner');tab.grants.delete(target);}else{tab.grants.delete(tab.ownerId);tab.ownerId=target;tab.grants.delete(target);}tab.epoch++;this.changed(command.op,{tabId:tab.id,userId:target,releaseInputs:command.op!=='grant-tab'});break;
   }
   case 'select-tab':this.tab(command.tabId);this.remember(member);member.view=member.views[command.tabId]?JSON.parse(JSON.stringify(member.views[command.tabId])):{mode:'live',tabId:command.tabId,follow:null};this.changed('view-changed',{userId:actor});break;
   case 'follow':if(target===actor)throw Error('Choose another participant');if(this.member(target).view.follow)throw Error('Choose a participant who is selecting their own view');this.remember(member);member.view={mode:'live',tabId:null,follow:target};this.changed('view-changed',{userId:actor});break;
   case 'explore':{const tab=this.tab(command.tabId),capture=command.captureId?this.captures.get(command.captureId):tab.capture;if(!capture||capture.tabId&&capture.tabId!==tab.id)throw Error('Captured content unavailable');this.remember(member);member.view={mode:'explore',tabId:tab.id,follow:null,captureId:capture.id,capture:{...capture}};this.remember(member);this.changed('view-changed',{userId:actor,releaseInputs:true});break;}
   case 'return-live':this.tab(command.tabId);member.view={mode:'live',tabId:command.tabId,follow:null};this.remember(member);this.changed('view-changed',{userId:actor});break;
   default:throw Error('Invalid browser action');
  }
  return this.snapshot(actor);
 }
 document(actor,metadata){this.member(actor);if(actor!==this.hostId)throw Error('Browser host required');if(!metadata||metadata.epoch!==this.epoch)throw Error('Stale browser document');const tab=this.tab(metadata.tabId);if(metadata.tabEpoch!==tab.epoch||typeof metadata.title!=='string'||metadata.title.length>160||/[\x00-\x1f]/.test(metadata.title))throw Error('Invalid browser document');const url=browserURL(metadata.url,{fixtureOrigin:this.fixtureOrigin});if(url===tab.url&&metadata.title===tab.title)return this.snapshot(actor);tab.url=url;tab.title=metadata.title||new URL(url).hostname;tab.capture=null;tab.epoch++;this.changed('document-changed',{tabId:tab.id,releaseInputs:true});return this.snapshot(actor);}
 capture(actor,tabId,metadata){
  this.member(actor);if(actor!==this.hostId)throw Error('Browser host required');const tab=this.tab(tabId);
  if(!metadata||metadata.cropped!==undefined&&typeof metadata.cropped!=='boolean'||typeof metadata.id!=='string'||!metadata.id||metadata.id.length>128||!Number.isSafeInteger(metadata.bytes)||metadata.bytes<1||metadata.bytes>8*1024*1024||!Number.isSafeInteger(metadata.width)||metadata.width<1||metadata.width>8192||!Number.isSafeInteger(metadata.height)||metadata.height<1||metadata.height>8192||!['viewport','loaded-document'].includes(metadata.extent)||!/^[a-f0-9]{64}$/.test(metadata.sha256))throw Error('Invalid captured content');
  if(metadata.roomEpoch!==this.epoch||metadata.tabEpoch!==tab.epoch)throw Error('Stale captured content');
  tab.capture={id:metadata.id,bytes:metadata.bytes,width:metadata.width,height:metadata.height,extent:metadata.extent,sha256:metadata.sha256,at:this.now(),roomEpoch:metadata.roomEpoch,tabEpoch:metadata.tabEpoch,cropped:metadata.cropped===true};this.captures.set(tab.capture.id,{...tab.capture,tabId});while(this.captures.size>96)this.captures.delete(this.captures.keys().next().value);this.emit('capture-ready',{tabId,capture:tab.capture});return tab.capture;
 }
 authorizeInput(actor,{epoch,tabId,tabEpoch}){
  const member=this.current(actor,epoch),tab=this.tab(tabId);if(tabEpoch!==tab.epoch||!this.allowed(actor,tab))throw Error('Browser tab control denied');
  if(member.view.follow||member.view.tabId!==tabId)throw Error('Select this live tab before controlling it');
  return{member,tab};
 }
 inputBudget(actor){
  const second=Math.floor(this.now()/1000),rate=this.rate.get(actor);if(rate?.second===second&&rate.count>=LIMITS.inputPerSecond)throw Error('Browser input rate limit');this.rate.set(actor,{second,count:rate?.second===second?rate.count+1:1});
 }
 input(actor,{epoch,tabId,tabEpoch,event}){
  const {member,tab}=this.authorizeInput(actor,{epoch,tabId,tabEpoch});
  if(!event||!['mouseDown','mouseUp','mouseMove','mouseWheel','keyDown','keyUp','char'].includes(event.type))throw Error('Invalid browser input');
  const clean={type:event.type};
  if(event.type.startsWith('mouse')){for(const key of ['x','y']){if(typeof event[key]!=='number'||!Number.isFinite(event[key])||event[key]<0||event[key]>1)throw Error('Invalid browser coordinates');clean[key]=event[key];}if(event.type==='mouseDown'||event.type==='mouseUp'){if(!['left','middle','right'].includes(event.button))throw Error('Invalid browser button');clean.button=event.button;}if(event.type==='mouseWheel'){for(const key of ['deltaX','deltaY']){if(!Number.isFinite(event[key])||Math.abs(event[key])>5000)throw Error('Invalid browser scroll');clean[key]=event[key];}}}
  else{if(typeof event.keyCode!=='string'||event.keyCode.length<1||event.keyCode.length>32||/[\x00-\x1f]/.test(event.keyCode))throw Error('Invalid browser key');if(event.modifiers!==undefined&&(!Array.isArray(event.modifiers)||event.modifiers.length>1||event.modifiers.some(value=>value!=='shift')))throw Error('Clipboard and desktop shortcuts are unavailable');clean.keyCode=event.keyCode;clean.modifiers=Object.freeze([...(event.modifiers||[])]);}
  this.inputBudget(actor);
  const ticket=Object.freeze({actor,epoch:this.epoch,tabId,tabEpoch:tab.epoch,event:Object.freeze(clean),sequence:++this.sequence});this.issuedInputs.add(ticket);return ticket;
 }
 acceptInput(ticket,lastSequence){
  if(!ticket||!this.issuedInputs.has(ticket)||!Number.isSafeInteger(lastSequence)||lastSequence<0||ticket.sequence<=lastSequence||ticket.epoch!==this.epoch)throw Error('Stale browser input');const tab=this.tab(ticket.tabId);if(tab.epoch!==ticket.tabEpoch||!this.allowed(ticket.actor,tab))throw Error('Browser input revoked');const m=this.member(ticket.actor);if(m.view.tabId!==tab.id||m.view.follow)throw Error('Browser input view changed');this.issuedInputs.delete(ticket);return ticket.event;
 }
 remove(actor){if(actor===this.hostId){this.end('Browser host left');return;}if(!this.members.has(actor))return;this.members.delete(actor);this.requests.delete(actor);this.rate.delete(actor);for(const tab of this.tabs.values()){tab.grants.delete(actor);if(tab.ownerId===actor){tab.ownerId=this.ownerId===actor?this.hostId:this.ownerId;tab.epoch++;}}if(this.ownerId===actor)this.ownerId=this.hostId;for(const m of this.members.values())if(m.view.follow===actor)m.view={mode:'live',tabId:null,follow:null};this.changed('participant-left',{userId:actor,releaseInputs:true});}
 end(reason){if(this.closed)return;this.closed=true;this.epoch++;this.emit('ended',{reason,releaseInputs:true});this.tabs.clear();this.captures.clear();this.requests.clear();this.rate.clear();}
 snapshot(actor){const m=this.member(actor);return{id:this.id,chatId:this.chatId,hostId:this.hostId,ownerId:this.ownerId,epoch:this.epoch,sequence:this.sequence,limits:LIMITS,self:{approved:m.approved,paused:m.paused,view:JSON.parse(JSON.stringify(m.view)),views:JSON.parse(JSON.stringify(m.views))},participants:[...this.members.values()].map(({seen,cursor,...value})=>({...value,view:JSON.parse(JSON.stringify(value.view)),views:JSON.parse(JSON.stringify(value.views))})),requests:[...this.requests],tabs:[...this.tabs.values()].map(({grants,...tab})=>({...tab,grants:[...grants],capture:tab.capture?{...tab.capture}:null}))};}
}
module.exports={BrowserSession,LIMITS,identity,browserURL};
