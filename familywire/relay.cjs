const http=require('node:http'), fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const UUID=/^[a-f0-9-]{36}$/i, MAX_BODY=8*1024*1024, MAX_FILE=25*1024*1024+28;
const RETENTION_MS=48*60*60*1000;
function createRelay({secret,dir,invites=[],now=Date.now,quotaBytes=Infinity}) {
 if(!secret || secret.length<16) throw new Error('ROOM_SECRET must contain at least 16 characters');
 fs.mkdirSync(path.join(dir,'files'),{recursive:true});
 const storageSize=()=>{let total=0;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const location=path.join(dir,entry.name);if(entry.isFile())total+=fs.statSync(location).size;else if(entry.isDirectory()&&entry.name==='files')for(const file of fs.readdirSync(location))total+=fs.statSync(path.join(location,file)).size;}return total;};
 const capacity=extra=>{if(storageSize()+extra>quotaBytes){const e=new Error('Storage full');e.status=507;throw e;}};
 const hash=code=>crypto.createHash('sha256').update('FamilyWire-access:'+code).digest('hex');
 const members=new Map((invites.length?invites:[secret]).map(code=>{const token=hash(code),h=token.slice(0,32);return [token,`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`];}));
 const db=new DatabaseSync(path.join(dir,'messages.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, frame TEXT NOT NULL, user_id TEXT, received_at INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY,value TEXT);');
 if(!db.prepare('PRAGMA table_info(messages)').all().some(c=>c.name==='user_id'))db.exec('ALTER TABLE messages ADD COLUMN user_id TEXT');
 if(!db.prepare('PRAGMA table_info(messages)').all().some(c=>c.name==='received_at'))db.exec('ALTER TABLE messages ADD COLUMN received_at INTEGER NOT NULL DEFAULT 0');
 db.prepare("INSERT OR IGNORE INTO metadata VALUES ('epoch', ?)").run(crypto.randomUUID());
 const epoch=db.prepare("SELECT value FROM metadata WHERE key='epoch'").get().value;
 db.exec('CREATE TABLE IF NOT EXISTS people (user_id TEXT PRIMARY KEY, name TEXT NOT NULL, last_seen INTEGER NOT NULL)');
 db.exec("CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, name TEXT NOT NULL, ended_at INTEGER); CREATE TABLE IF NOT EXISTS chat_members (chat_id TEXT, user_id TEXT, after_seq INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(chat_id,user_id)); CREATE TABLE IF NOT EXISTS file_chats (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL); INSERT OR IGNORE INTO chats(id,name) VALUES ('family','Family');");
 if(!db.prepare('PRAGMA table_info(messages)').all().some(c=>c.name==='chat_id'))db.exec("ALTER TABLE messages ADD COLUMN chat_id TEXT NOT NULL DEFAULT 'family'");
 if(!db.prepare('PRAGMA table_info(file_chats)').all().some(c=>c.name==='message_seq'))db.exec('ALTER TABLE file_chats ADD COLUMN message_seq INTEGER');
 const migrateNames=!db.prepare('PRAGMA table_info(chats)').all().some(c=>c.name==='custom_name');
 for(const [table,column,type] of [['chats','owner_id','TEXT'],['chats','custom_name','INTEGER NOT NULL DEFAULT 0'],['chat_members','moderator','INTEGER NOT NULL DEFAULT 0'],['messages','mutation_target','TEXT'],['messages','mutation_kind','TEXT'],['messages','target_seq','INTEGER'],['messages','deleted','INTEGER NOT NULL DEFAULT 0']])if(!db.prepare('PRAGMA table_info('+table+')').all().some(c=>c.name===column))db.exec('ALTER TABLE '+table+' ADD COLUMN '+column+' '+type);
 if(migrateNames)db.exec("UPDATE chats SET custom_name=1 WHERE id!='family' AND name!='Private chat' AND instr(name,' & ')=0");
 db.exec("UPDATE chats SET owner_id=(SELECT user_id FROM chat_members WHERE chat_id=chats.id ORDER BY rowid LIMIT 1) WHERE id!='family' AND owner_id IS NULL");
 db.exec('CREATE TABLE IF NOT EXISTS invite_claims (token TEXT PRIMARY KEY,user_id TEXT NOT NULL,device_id TEXT)');
 for(const [token,user] of members){db.prepare('INSERT OR IGNORE INTO invite_claims(token,user_id) VALUES (?,?)').run(token,user);members.set(token,db.prepare('SELECT user_id FROM invite_claims WHERE token=?').get(token).user_id);}
 const allowedIds=new Set(members.values());
 const peers=new Map(), waiting=new Set();
 const finish=(res,status,value)=>{if(!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}};
 const read=async(req,max)=>{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max){const e=new Error('Too large');e.status=413;throw e;}chunks.push(chunk);}return Buffer.concat(chunks);};
 const online=()=>[...new Map([...peers.entries()].filter(([,p])=>now()-p.last<65000&&allowedIds.has(p.userId)).map(([device,p])=>[p.userId,{device,name:p.name,userId:p.userId}])).values()];
 const people=()=>{const active=new Set(online().map(p=>p.userId));return db.prepare('SELECT user_id, name, last_seen FROM people ORDER BY name COLLATE NOCASE').all().filter(p=>allowedIds.has(p.user_id)).map(p=>({userId:p.user_id,name:p.name,lastSeen:p.last_seen,online:active.has(p.user_id)}));};
 const member=(chat,user)=>chat==='family'?{after_seq:0}:db.prepare('SELECT after_seq,moderator FROM chat_members WHERE chat_id=? AND user_id=?').get(chat,user);
 const chats=user=>db.prepare('SELECT * FROM chats ORDER BY rowid').all().filter(c=>member(c.id,user)).map(c=>({...c,canManage:c.id!=='family'&&(c.owner_id===user||!!member(c.id,user).moderator),moderators:db.prepare('SELECT user_id FROM chat_members WHERE chat_id=? AND moderator=1').all(c.id).map(p=>p.user_id),latest:db.prepare('SELECT seq,user_id FROM messages WHERE chat_id=? AND seq>? AND received_at>? ORDER BY seq DESC LIMIT 1').get(c.id,member(c.id,user).after_seq,now()-RETENTION_MS)||null,members:c.id==='family'?people().map(p=>p.userId):db.prepare('SELECT user_id FROM chat_members WHERE chat_id=?').all(c.id).map(p=>p.user_id).filter(id=>allowedIds.has(id))}));
 function prune(){const cutoff=now()-RETENTION_MS;db.prepare('DELETE FROM messages WHERE received_at <= ?').run(cutoff);db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  for(const c of db.prepare('SELECT id FROM chats WHERE ended_at <= ?').all(cutoff)){for(const f of db.prepare('SELECT id FROM file_chats WHERE chat_id=?').all(c.id))fs.rmSync(path.join(dir,'files',f.id),{force:true});db.prepare('DELETE FROM file_chats WHERE chat_id=?').run(c.id);db.prepare('DELETE FROM messages WHERE chat_id=?').run(c.id);db.prepare('DELETE FROM chat_members WHERE chat_id=?').run(c.id);db.prepare('DELETE FROM chats WHERE id=?').run(c.id);}
  for(const name of fs.readdirSync(path.join(dir,'files'))){const file=path.join(dir,'files',name);if(fs.statSync(file).mtimeMs<=cutoff)fs.unlinkSync(file);}
  for(const [id,p] of peers)if(now()-p.last>=65000)peers.delete(id);
 }
 prune();const cleanup=setInterval(prune,15*60*1000);cleanup.unref();
 function events(after,chat,user) {
  const rows=db.prepare('SELECT seq, id, frame, user_id, received_at,mutation_target,mutation_kind,target_seq FROM messages WHERE seq > ? AND received_at > ? AND chat_id=? ORDER BY seq LIMIT 100').all(Math.max(after,member(chat,user)?.after_seq||0),now()-RETENTION_MS,chat);
  let size=0;const packets=[]; for(const row of rows){if(row.mutation_target&&row.target_seq<=member(chat,user).after_seq)continue;size+=row.frame.length;if(size>MAX_BODY&&packets.length)break;packets.push(row);}
  const conversations=chats(user);return {epoch,cursor:packets.length?packets.at(-1).seq:after,packets,online:online(),people:people(),chats:conversations,activity:Math.max(0,...conversations.map(c=>c.latest?.seq||0))};
 }
 const wake=()=>{for(const job of [...waiting])job();};
 const server=http.createServer(async(req,res)=> {
  try {
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/health')return finish(res,200,{ok:true,service:'FamilyWire',protocol:2});
   const presented=Buffer.from(req.headers.authorization||'');let userId;
   for(const [token,member] of members){const expected=Buffer.from('Bearer '+token);if(presented.length===expected.length&&crypto.timingSafeEqual(presented,expected))userId=member;}
   if(!userId)return finish(res,401,{error:'Invite code does not match'});
   const device=req.headers['x-device']; if(!UUID.test(device||''))return finish(res,400,{error:'Invalid device'});
   let name=Buffer.from(req.headers['x-name']||'','base64').toString('utf8').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,32)||'Family';
   if(name.toLowerCase()==='family')return finish(res,400,{error:'Family is reserved for the shared room. Choose another name.'});
   const token=[...members].find(([,id])=>id===userId)[0],claim=db.prepare('SELECT * FROM invite_claims WHERE token=?').get(token);
   if(invites.length&&claim.device_id&&claim.device_id!==device)return finish(res,409,{error:'This code is already assigned to another device'});
   const previousToken=req.headers['x-previous-token'];
   if(previousToken&&previousToken!==token){const previous=db.prepare('SELECT * FROM invite_claims WHERE token=?').get(previousToken);if(!previous||previous.device_id!==device)return finish(res,403,{error:'Previous assignment cannot be released'});const fresh=crypto.randomUUID();db.exec('BEGIN');try{db.prepare('UPDATE invite_claims SET device_id=? WHERE token=?').run(device,token);db.prepare('UPDATE invite_claims SET device_id=NULL,user_id=? WHERE token=?').run(fresh,previousToken);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}allowedIds.delete(previous.user_id);allowedIds.add(fresh);members.set(previousToken,fresh);wake();}
   else if(invites.length&&!claim.device_id)db.prepare('UPDATE invite_claims SET device_id=? WHERE token=?').run(device,token);
   const prior=db.prepare('SELECT name FROM people WHERE user_id=?').get(userId);
   db.prepare('INSERT INTO people(user_id,name,last_seen) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,last_seen=excluded.last_seen').run(userId,name,now());
   if(req.method==='GET'&&url.pathname==='/join'){peers.set(device,{name,last:now(),userId});wake();return finish(res,200,{protocol:2,userId,roomSecret:secret,people:people(),chats:chats(userId)});}
   if(req.method==='POST'&&url.pathname==='/chats'){
    const body=JSON.parse((await read(req,8192)).toString()),ids=[...new Set([userId,...(Array.isArray(body.members)?body.members:[])])];
    if(ids.length<2||ids.some(id=>!allowedIds.has(id)))return finish(res,400,{error:'Select an available family member'});
    const id=crypto.randomUUID(),title=typeof body.name==='string'?body.name.trim().slice(0,64):'Private chat';db.prepare('INSERT INTO chats(id,name,owner_id) VALUES (?,?,?)').run(id,title||'Private chat',userId);for(const person of ids)db.prepare('INSERT INTO chat_members(chat_id,user_id) VALUES (?,?)').run(id,person);wake();return finish(res,200,{id,chats:chats(userId)});
   }
   const action=url.pathname.match(/^\/chats\/([a-f0-9-]{36})\/(rename|add|remove|moderator|end)$/i);
   if(req.method==='POST'&&action){const [,id,operation]=action,c=db.prepare('SELECT * FROM chats WHERE id=?').get(id);if(!c||!member(id,userId))return finish(res,403,{error:'Chat access denied'});if(c.ended_at)return finish(res,409,{error:'Chat has ended'});if(c.owner_id!==userId&&!member(id,userId).moderator)return finish(res,403,{error:'Chat owner or moderator required'});const body=JSON.parse((await read(req,8192)).toString());
    if(operation==='rename'){if(typeof body.name!=='string'||!body.name.trim()||body.name.length>64)return finish(res,400,{error:'Name must be 1–64 characters'});db.prepare('UPDATE chats SET name=?,custom_name=1 WHERE id=?').run(body.name.trim(),id);}
    if(operation==='add'){if(!allowedIds.has(body.userId)||typeof body.shareHistory!=='boolean')return finish(res,400,{error:'Invalid member or history choice'});const seq=body.shareHistory?0:db.prepare('SELECT COALESCE(MAX(seq),0) AS seq FROM messages').get().seq;db.prepare('INSERT OR IGNORE INTO chat_members(chat_id,user_id,after_seq) VALUES (?,?,?)').run(id,body.userId,seq);}
    if(operation==='moderator'){if(c.owner_id!==userId)return finish(res,403,{error:'Only the chat owner can assign moderators'});if(body.userId===c.owner_id||!member(id,body.userId)||typeof body.enabled!=='boolean')return finish(res,400,{error:'Invalid moderator'});db.prepare('UPDATE chat_members SET moderator=? WHERE chat_id=? AND user_id=?').run(body.enabled?1:0,id,body.userId);}
    if(operation==='remove'){const target=member(id,body.userId);if(!target||body.userId===c.owner_id||(target.moderator&&c.owner_id!==userId))return finish(res,403,{error:'The owner is protected; only the owner can remove a moderator'});db.prepare('DELETE FROM chat_members WHERE chat_id=? AND user_id=?').run(id,body.userId);}
    if(operation==='end')db.prepare('UPDATE chats SET ended_at=? WHERE id=?').run(now(),id);wake();return finish(res,200,{chats:chats(userId)});
   }
   const chat=req.headers['x-chat']||'family',membership=member(chat,userId),conversation=db.prepare('SELECT * FROM chats WHERE id=?').get(chat);
   if(!conversation||!membership)return finish(res,403,{error:'Chat access denied'});
   if(conversation.ended_at&&(req.method==='POST'||req.method==='PUT'))return finish(res,409,{error:'Chat has ended'});
   if(req.method==='GET'&&url.pathname==='/events') {
    let after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)return finish(res,400,{error:'Invalid cursor'});
    const resync=url.searchParams.get('epoch')!==epoch;if(resync)after=0;
    const joined=!peers.has(device);peers.set(device,{name,last:now(),userId});
    if(joined||prior?.name!==name)wake();
    const data=events(after,chat,userId);if(data.packets.length||joined||resync||data.activity>Number(url.searchParams.get('activity')||0))return finish(res,200,data);
    let timer;const complete=()=>{clearTimeout(timer);waiting.delete(complete);if(!allowedIds.has(userId)||!member(chat,userId))return finish(res,403,{error:'Chat access denied'});finish(res,200,events(after,chat,userId));};
    waiting.add(complete);timer=setTimeout(complete,25000);res.on('close',()=>{clearTimeout(timer);waiting.delete(complete);});return;
   }
   const mutation=url.pathname.match(/^\/messages\/([a-f0-9-]{36})\/(edit|delete)$/i);
   if(req.method==='POST'&&mutation){const [,targetId,kind]=mutation,target=db.prepare('SELECT * FROM messages WHERE id=? AND mutation_target IS NULL').get(targetId);if(!target||target.deleted||target.user_id!==userId||target.chat_id!==chat||target.received_at<=now()-RETENTION_MS||target.seq<=membership.after_seq)return finish(res,403,{error:'Only the author can change this message'});const body=JSON.parse((await read(req,MAX_BODY)).toString());if(!UUID.test(body.id||'')||typeof body.frame!=='string'||body.frame.length>MAX_BODY||!/^[A-Za-z0-9+/]+=*$/.test(body.frame))return finish(res,400,{error:'Invalid change'});if(db.prepare('SELECT id FROM messages WHERE id=?').get(body.id))return finish(res,409,{error:'Change ID already exists'});capacity(body.frame.length*(db.prepare('SELECT COUNT(*) AS n FROM messages WHERE id=? OR mutation_target=?').get(targetId,targetId).n+3));db.exec('BEGIN');try{db.prepare('UPDATE messages SET frame=?,deleted=? WHERE id=? OR mutation_target=?').run(body.frame,kind==='delete'?1:0,targetId,targetId);db.prepare('INSERT INTO messages(id,frame,user_id,received_at,chat_id,mutation_target,mutation_kind,target_seq) VALUES (?,?,?,?,?,?,?,?)').run(body.id,body.frame,userId,target.received_at,chat,targetId,kind,target.seq);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}if(kind==='delete'){for(const f of db.prepare('SELECT id FROM file_chats WHERE chat_id=? AND message_seq=?').all(chat,target.seq))fs.rmSync(path.join(dir,'files',f.id),{force:true});db.prepare('DELETE FROM file_chats WHERE chat_id=? AND message_seq=?').run(chat,target.seq);}wake();return finish(res,200,{ok:true});}
   if(req.method==='POST'&&url.pathname==='/messages') {
    const body=JSON.parse((await read(req,MAX_BODY)).toString());
    if(!UUID.test(body.id||'')||typeof body.frame!=='string'||body.frame.length>MAX_BODY||!/^[A-Za-z0-9+/]+=*$/.test(body.frame))return finish(res,400,{error:'Invalid message'});
    if(body.file && (!UUID.test(body.file)||!fs.existsSync(path.join(dir,'files',body.file))||(db.prepare('SELECT chat_id FROM file_chats WHERE id=?').get(body.file)?.chat_id||'family')!==chat))return finish(res,400,{error:'Attachment missing'});
    const existing=db.prepare('SELECT user_id,chat_id FROM messages WHERE id=?').get(body.id);if(existing&&(existing.user_id!==userId||existing.chat_id!==chat))return finish(res,409,{error:'Message ID belongs to another member or chat'});
    if(!existing)capacity(body.frame.length*3+8192);db.prepare('INSERT OR IGNORE INTO messages(id,frame,user_id,received_at,chat_id) VALUES (?,?,?,?,?)').run(body.id,body.frame,userId,now(),chat);if(body.file)db.prepare('UPDATE file_chats SET message_seq=? WHERE id=?').run(db.prepare('SELECT seq FROM messages WHERE id=?').get(body.id).seq,body.file);wake();return finish(res,200,{ok:true});
   }
   const match=url.pathname.match(/^\/files\/([a-f0-9-]{36})$/i);
   if(match) {
    const file=path.join(dir,'files',match[1]);
    const owner=db.prepare('SELECT chat_id,message_seq FROM file_chats WHERE id=?').get(match[1]);if((owner&&owner.chat_id!==chat)||(!owner&&fs.existsSync(file)&&chat!=='family'))return finish(res,403,{error:'Attachment access denied'});
    if(req.method==='PUT') {
     const bytes=await read(req,MAX_FILE);if(bytes.length<28)return finish(res,400,{error:'Invalid file'});
     // Immutable upload IDs make retry safe; writes complete before messages reference them.
     if(!fs.existsSync(file)){capacity(bytes.length+8192);const temp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temp,bytes);fs.renameSync(temp,file);}
     db.prepare('INSERT OR IGNORE INTO file_chats(id,chat_id) VALUES (?,?)').run(match[1],chat);return finish(res,200,{ok:true});
    }
    if(req.method==='GET'){if(membership.after_seq>0&&(!owner?.message_seq||owner.message_seq<=membership.after_seq))return finish(res,403,{error:'Attachment history not shared'});
     if(!fs.existsSync(file)||fs.statSync(file).mtimeMs<=now()-RETENTION_MS)return finish(res,404,{error:'File no longer stored on server'});
     res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':fs.statSync(file).size,'Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);return;}
   }
   finish(res,404,{error:'Not found'});
  } catch(e) {finish(res,e.status||500,{error:e.status===413?'Maximum size exceeded':e.status===507?'FamilyWire storage is full; try again after older content expires':'Request failed'});}
 });
 server.pruneNow=prune;server.requestTimeout=120000; server.on('close',()=>{clearInterval(cleanup);for(const job of waiting)job();db.close();});
 return server;
}
if(require.main===module&&process.env.BACKEND_URL){require('./proxy.cjs').createProxy(process.env.BACKEND_URL).listen(Number(process.env.PORT||45831),'0.0.0.0');}
else if(require.main===module){const server=createRelay({secret:process.env.ROOM_SECRET,invites:(process.env.INVITE_CODES||'').split(',').map(s=>s.trim()).filter(Boolean),dir:process.env.DATA_DIR||path.join(__dirname,'data')});server.listen(Number(process.env.PORT||45831),'0.0.0.0',()=>console.log('FamilyWire relay listening'));}
module.exports={createRelay};
