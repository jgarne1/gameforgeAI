 'use strict';
// Uses the existing websocket chat packet and {user,text,time} message shape.
const crypto=require('crypto');
module.exports=function createWorldSocial(){
  const history=new Map(),colors=new Map(),occupied=new Set();
  function color(identity){
    const key=String(identity).toLowerCase();if(colors.has(key))return colors.get(key);
    let hue=crypto.createHash('sha256').update(key).digest().readUInt32BE(0)%3600;
    let attempts=0;
    while(occupied.has(hue)||(occupied.size<25&&[...occupied].some(h=>Math.min(Math.abs(h-hue),3600-Math.abs(h-hue))<120))){
      hue=(hue+1375)%3600;if(++attempts>3600){while(occupied.has(hue))hue=(hue+1)%3600;break;}
    }
    if(colors.size>=2048){const old=colors.keys().next().value;const oldHue=Number(colors.get(old).match(/hsl\(([^,]+)/)[1])*10;colors.delete(old);occupied.delete(Math.round(oldHue));}
    const value=`hsl(${hue/10}, 78%, 68%)`;colors.set(key,value);occupied.add(hue);return value;
  }
  function messages(sceneId){return history.get(sceneId)||[];}
  function append(sceneId,user,text,now=Date.now()){
    if(typeof text!=='string')return null;
    text=text.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,300);if(!text)return null;
    const item={user,text,time:now};const chat=[...messages(sceneId),item].slice(-50);
    history.delete(sceneId);history.set(sceneId,chat);
    if(history.size>128)history.delete(history.keys().next().value);
    return chat;
  }
  return {color,messages,append};
};
