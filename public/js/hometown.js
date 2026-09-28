(function(){
  'use strict';
  const fallback={name:'Whisperwind',sceneId:'whisperwind_hd_waterfront'};
  async function resolve(username){
    if(!username)return {...fallback};
    try{
      const r=await fetch('/api/world/context?user='+encodeURIComponent(username),{cache:'no-store'});
      if(!r.ok)return {...fallback};
      const data=await r.json(),town=data.ok&&data.hometown;
      if(town&&typeof town.sceneId==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(town.sceneId))return {name:String(town.name||'Hometown'),sceneId:town.sceneId};
    }catch(e){}
    return {...fallback};
  }
  window.GameForgeHometown={resolve};
})();
