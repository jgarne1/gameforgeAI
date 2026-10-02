const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createClassicGamesStore}=require('../familywire/classic-games.cjs');
const {startEights,startCheckers}=require('../familywire/classic-rules.cjs');
const {startFamily}=require('../familywire/family-rules.cjs');
const {startAlgebra}=require('../familywire/algebra-rules.cjs');
const {initial}=require('../familywire/fleet-duel.cjs');
const ids=['a','b'];
const store=createClassicGamesStore({exec:()=>{}}, {canAccessChat:()=>true,isOnline:()=>true});
for(const kind of ['eights','checkers','signal','words','algebra'])test(kind+' invitation and closed lobby serialize for both participants without mutation',()=>{
 for(const revision of [0,4])for(const user of ids){const state={turn:null,revision};const saved=structuredClone(state);const view=JSON.parse(JSON.stringify(store.view(kind,state,user,ids)));assert.equal(view.turn,null);assert.equal(view.revision,revision);assert.deepEqual(state,saved);if(kind==='eights'){assert.deepEqual(view.hand,[]);assert.deepEqual(view.counts,{});assert.equal(view.deckCount,0);assert.ok(!('hands'in view));assert.ok(!('deck'in view));}}
});
test('initialized states preserve per-player privacy and serialize active, finished and closed games',()=>{
 const states={eights:startEights(ids),checkers:startCheckers(ids),signal:startFamily('signal',ids),words:startFamily('words',ids),algebra:startAlgebra(ids),fleet:initial(ids)};
 for(const [kind,base]of Object.entries(states))for(const user of ids)for(const finished of [false,true]){const state=structuredClone(base);if(finished){state.turn=null;state.winner=ids[0];}const saved=structuredClone(state),v=JSON.parse(JSON.stringify(store.view(kind,state,user,ids)));assert.deepEqual(state,saved);assert.equal(v.revision,state.revision);if(kind==='eights'){assert.deepEqual(v.hand,state.hands[user]);assert.equal(v.counts[ids.find(x=>x!==user)],state.hands[ids.find(x=>x!==user)].length);assert.equal(v.deckCount,state.deck.length);assert.ok(!('hands'in v));assert.ok(!('deck'in v));}if(kind==='words'){assert.ok(!('prompts'in v));if(user==='b')assert.ok(!('secret'in v));}if(kind==='algebra'&&!finished)assert.ok(!('answer'in v.problem));}
});
test('real relay events survive invitation, acceptance, start, close and persisted lobby for both players',async()=>{
 const {createRelay}=require('../familywire/relay.cjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fw-lobby-'));let server;
 const codes=['synthetic-player-a','synthetic-player-b'];const tokens=codes.map(c=>crypto.createHash('sha256').update('FamilyWire-access:'+c).digest('hex'));const users=tokens.map(t=>{const h=t.slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;});const devices=users.map(()=>crypto.randomUUID());
 const open=async()=>{server=createRelay({secret:'synthetic-room-secret-only',invites:codes,dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));};
 const request=async(i,route,body)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}${route}`,{method:body?'POST':'GET',headers:{authorization:'Bearer '+tokens[i],'x-device':devices[i],'x-name':Buffer.from('Test '+i).toString('base64'),'x-familywire-features':'fleet-duel-v1','content-type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,200,route+' '+JSON.stringify(data));return data;};
 const close=()=>new Promise(r=>server.close(r));
 try{await open();await request(0,'/events');await request(1,'/events');const chat=await request(0,'/chats',{members:[users[1]]});let pending;
 for(const kind of ['eights','checkers','signal','words','algebra']){const g=await request(0,'/games/classic/invite',{kind,chatId:chat.id,targetIds:[users[1]]});for(const i of [0,1]){const events=await request(i,'/events');assert.equal(events.games.find(x=>x.id===g.id).status,'invited');}if(kind==='eights')pending=g;else await request(0,`/games/classic/${g.id}/close`,{});}
 await close();await open();for(const i of [0,1]){const e=await request(i,'/events');assert.equal(e.games.find(x=>x.id===pending.id).status,'invited');}
 await request(1,`/games/classic/${pending.id}/accept`,{});await request(0,`/games/classic/${pending.id}/start`,{});for(const i of [0,1]){const e=await request(i,'/events');const g=e.games.find(x=>x.id===pending.id);assert.equal(g.status,'active');assert.equal(g.state.hand.length,7);assert.ok(!('hands'in g.state));assert.ok(!('deck'in g.state));}await request(0,`/games/classic/${pending.id}/close`,{});for(const i of [0,1])await request(i,'/events');
 }finally{if(server?.listening)await close();fs.rmSync(dir,{recursive:true,force:true});}
});