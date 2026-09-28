'use strict';
const DEFAULT_HOMETOWN=Object.freeze({neighborhoodId:'whisperwind_01',name:'Whisperwind',sceneId:'whisperwind_hd_waterfront'});

function resolveHometown(username,profile,estate,sceneExists){
  const residence=profile?.world?.residence;
  if(!username||!residence)return {...DEFAULT_HOMETOWN};
  const town=(estate?.neighborhoods||[]).find(n=>n.id===residence.neighborhoodId);
  const home=town?.plots?.find(p=>p.id===residence.plotId);
  if(!home||String(home.owner||'').toLowerCase()!==String(username).toLowerCase())return {...DEFAULT_HOMETOWN};
  if(town.id===DEFAULT_HOMETOWN.neighborhoodId)return {...DEFAULT_HOMETOWN};
  const sceneId=town.hometownSceneId||town.sceneId;
  if(typeof sceneId!=='string'||! /^[a-zA-Z0-9_-]{1,128}$/.test(sceneId)||!sceneExists(sceneId))return {...DEFAULT_HOMETOWN};
  return {neighborhoodId:town.id,name:town.townName||town.name||town.id,sceneId};
}
module.exports={DEFAULT_HOMETOWN,resolveHometown};
