'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const Housing=require('./town_housing');
const TownScenes=require('./town_scene_store');
module.exports=function installTown(o){
  const {app,DATA,users,pets,saveEstateNeighborhoods,loadEstateNeighborhoods,root}=o;
  const sessions=new Map(),journal=path.join(DATA,'town_transaction.json');
  const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
  const readScene=id=>read(TownScenes.resolve(root,DATA,id));
  function atomic(file,data){const tmp=file+'.town-tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,file);}
  function recover(){if(fs.existsSync(journal)){const tx=read(journal);atomic(path.join(DATA,'pets.json'),tx.profiles);atomic(path.join(DATA,'estate_neighborhoods.json'),tx.estate);fs.unlinkSync(journal);}}
  recover();
  const fingerprint=user=>crypto.createHash('sha256').update(String(user.password)).digest('hex');
  function login(req,res,username){
    for(const [k,v]of sessions)if(v.expires<Date.now())sessions.delete(k);
    const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{username,expires:Date.now()+8*3600000,password:fingerprint(users()[username])});
    res.cookie('gf_town_session',token,{httpOnly:true,sameSite:'strict',secure:req.secure||req.headers['x-forwarded-proto']==='https',maxAge:8*3600000,path:'/'});
  }
  function auth(req,res,admin=false){
    const token=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('gf_town_session='))?.slice(16);
    const s=sessions.get(token),user=s&&users()[s.username];
    if(!s||s.expires<Date.now()||!user||s.password!==fingerprint(user)){res.status(401).json({error:'Please sign in again to manage your town home.'});return null;}
    if(req.method!=='GET'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){res.status(403).json({error:'Use the game website to make changes.'});return null;}
    if(admin&&!o.canAdmin(s.username,'world_edit')){res.status(403).json({error:'World editor admin access required.'});return null;}
    return s.username;
  }
  function townData(){recover();const data=Housing.expandEstate(loadEstateNeighborhoods());return data;}
  function plotIn(data,id){return data.neighborhoods.find(n=>n.id==='whisperwind_01')?.plots.find(p=>p.id===id);}
  app.get('/api/town/homes',(req,res)=>{const data=townData();const plots=data.neighborhoods.find(n=>n.id==='whisperwind_01')?.plots||[];res.json({ok:true,plots:plots.filter(p=>p&&typeof p.id==='string'&&p.id.trim())});});
  app.post('/api/town/logout',(req,res)=>{
    const token=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('gf_town_session='))?.slice(16);
    sessions.delete(token);res.clearCookie('gf_town_session',{path:'/'});res.json({ok:true});
  });
  function shopItems(id){
    if(!['whisperwind_tackle','snack_shack','care_clinic'].includes(id))throw Error('Shop unavailable.');
    const shop=read(path.join(root,'data/shops.json'))[id],items=read(path.join(root,'data/items.json'));
    return {name:shop.name,items:Object.entries(shop.items||{}).filter(([key,s])=>items[key]&&s.stock==='infinite').map(([key,s])=>({id:key,name:items[key].name,description:items[key].description,price:s.price}))};
  }
  app.get('/api/town/shop/:id',(req,res)=>{try{res.json({ok:true,...shopItems(req.params.id)});}catch(e){res.status(404).json({error:e.message});}});
  app.post('/api/town/shop/:id/buy',(req,res)=>{
    const actor=auth(req,res);if(!actor)return;
    try{const item=shopItems(req.params.id).items.find(i=>i.id===req.body.itemId);if(!item||!Number.isSafeInteger(item.price)||item.price<0)throw Error('Item unavailable.');
      const p=o.getPetProfile(actor);if(Number(p.money||0)<item.price)throw Error('Not enough coins.');
      p.money=Number(p.money||0)-item.price;p.inventory=p.inventory||{};p.inventory[item.id]=Number(p.inventory[item.id]||0)+1;
      o.savePetProfile(actor,p);res.json({ok:true,coins:p.money,item});
    }catch(e){res.status(409).json({error:e.message});}
  });
  app.post('/api/town/homes/:id/:action',(req,res)=>{
    const actor=auth(req,res);if(!actor)return;
    try{
      const estate=townData(),plot=plotIn(estate,req.params.id);if(!plot)return res.status(404).json({error:'Home not found.'});
      o.getPetProfile(actor);const profiles=pets();const result=Housing.transact(plot,actor,req.params.action,profiles,req.body||{});
      // Durable roll-forward record keeps coin transfer and ownership together across a process failure.
      atomic(journal,{estate,profiles});recover();res.json({ok:true,plot,...result});
    }catch(e){res.status(409).json({error:e.message});}
  });
  app.get('/api/town/home-scene/:id',(req,res)=>{
    const actor=auth(req,res);if(!actor)return;
    const plot=plotIn(townData(),req.params.id);if(!plot?.owner)return res.status(404).json({error:'This home is not owned yet.'});
    const mine=Housing.same(plot.owner,actor);
    if(plot.privacy==='private'&&!mine)return res.status(403).json({error:'The owner has made this home private.'});
    const scene=readScene('whisperwind_hd_home');
    const d=plot.decoration||Housing.decorate({objects:[]});
    scene.id='home__'+plot.id;scene.name=plot.name+' · '+plot.owner;
    const furnitureCatalog=read(path.join(root,'public/assets/worlds/world_asset_catalog.json')).assets;
    scene.objects=[...(scene.objects||[]),...d.objects.map(o=>{const a=furnitureCatalog.find(a=>a.id===o.asset),rotation=(o.rotation||0)*Math.PI/180;const item={...o,rotation};if(a&&!o.asset.includes('rug')){const w=a.displaySize.w,h=a.displaySize.h,ox=a.placeOrigin?.x??.5,oy=a.placeOrigin?.y??1;const corners=[[-w*ox,h*(1-oy)-h*.24],[w*(1-ox),h*(1-oy)-h*.24],[-w*ox,h*(1-oy)],[w*(1-ox),h*(1-oy)]].map(([x,y])=>[x*Math.cos(rotation)-y*Math.sin(rotation),x*Math.sin(rotation)+y*Math.cos(rotation)]);const xs=corners.map(q=>q[0]),ys=corners.map(q=>q[1]);item.collide=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];}return item;})];scene.home={plotId:plot.id,owner:plot.owner,canEdit:mine,decoration:d};
    scene.interior.wall={cream:'#b9a98a',sage:'#6d8973',blue:'#627d94',rose:'#996e73'}[d.wall];
    if(d.floor==='stone')scene.groundMaterial=scene.stoneMaterial;
    if(d.floor==='walnut'){scene.interior.floor='#49382c';delete scene.groundMaterial;}
    const street=readScene('whisperwind_hd_waterfront');
    const door=street.hotspots.find(h=>h.plotId===plot.id);
    scene.hotspots.find(h=>h.id==='exit').targetSpawn=door?{x:door.x,y:door.y+50}:street.spawn;
    const scale=plot.roomScale||1;scene.home.homeKind=plot.homeKind||'cottage';
    scene.size.w*=scale;scene.size.h*=scale;scene.spawn.x*=scale;scene.spawn.y*=scale;
    for(const o of scene.objects){o.x*=scale;o.y*=scale;}
    for(const area of scene.walkable||[])area.points=area.points.map(([x,y])=>[x*scale,y*scale]);
    for(const h of scene.hotspots){h.x*=scale;h.y*=scale;}
    res.json(scene);
  });
  app.get('/api/town/story',(req,res)=>{const actor=auth(req,res);if(!actor)return;res.json({ok:true,story:o.getPetProfile(actor).world?.townWelcome||{visits:[]}});});
  app.post('/api/town/story/visit',(req,res)=>{
    const actor=auth(req,res);if(!actor)return;
    const id=String(req.body.npcId||'');if(!['npc_mira','npc_toma','npc_dockmaster'].includes(id))return res.status(400).json({error:'Unknown resident.'});
    const profile=o.getPetProfile(actor);profile.world=profile.world||{};
    const story=profile.world.townWelcome||{visits:[]};story.visits=[...new Set([...story.visits,id])];story.complete=story.visits.length===3;profile.world.townWelcome=story;
    o.savePetProfile(actor,profile);res.json({ok:true,story});
  });
  const skinOverrides=path.join(DATA,'town_npc_skins.json');
  app.post('/api/town/admin/scene',(req,res)=>{
    const actor=auth(req,res,true);if(!actor)return;
    try{const scene=req.body?.scene;if(scene?.id!==req.body?.sceneId)throw Error('Scene ID mismatch.');
      if(Array.isArray(scene.collisions))scene.blockers=scene.collisions.filter(Boolean).map(c=>({...c}));
      TownScenes.save(DATA,scene);res.json({ok:true,path:'/assets/worlds/'+scene.id+'.json',savedBy:actor,updatedAt:Date.now()});
    }catch(e){res.status(400).json({ok:false,error:e.message});}
  });
  app.get('/api/town/npc-skins',(req,res)=>res.json({...read(path.join(root,'public/assets/whisperwind_hd/v1/npc_skins.json')),overrides:fs.existsSync(skinOverrides)?read(skinOverrides):{}}));
  app.post('/api/town/admin/npc-skin',(req,res)=>{
    const actor=auth(req,res,true);if(!actor)return;
    const {sceneId,npcId,skinId}=req.body||{};
    if(!/^whisperwind_hd_[a-z0-9_]+$/.test(sceneId||''))return res.status(400).json({error:'Choose a Whisperwind town scene.'});
    const skins=read(path.join(root,'public/assets/whisperwind_hd/v1/npc_skins.json'));
    if(!skins.skins[skinId])return res.status(400).json({error:'Unknown skin.'});
    const file=TownScenes.resolve(root,DATA,sceneId);
    if(!fs.existsSync(file))return res.status(404).json({error:'Scene missing.'});
    const scene=read(file),npc=scene.npcs?.find(n=>n.id===npcId);if(!npc)return res.status(404).json({error:'NPC missing.'});
    const overrides=fs.existsSync(skinOverrides)?read(skinOverrides):{};overrides[sceneId+':'+npcId]=skinId;atomic(skinOverrides,overrides);res.json({ok:true,npc:{...npc,skinId}});
  });
  function homeAccess(req,id){
    const token=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('gf_town_session='))?.slice(16);
    const s=sessions.get(token),u=s&&users()[s.username];if(!s||s.expires<Date.now()||!u||s.password!==fingerprint(u))return null;
    const plot=plotIn(townData(),id);if(!plot?.owner||(plot.privacy==='private'&&!Housing.same(plot.owner,s.username)))return null;
    return s.username;
  }
  function identity(req){
    const token=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('gf_town_session='))?.slice(16);
    const session=sessions.get(token),user=session&&users()[session.username];
    return session&&session.expires>=Date.now()&&user&&session.password===fingerprint(user)?session.username:null;
  }
  return {login,auth,homeAccess,identity};
};
