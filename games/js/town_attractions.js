(function(){
'use strict';

// Scene-authored attractions. All movement is derived from the clock so the
// station cart is in the same place for everyone in the town.
function coasterAt(scene, now){
  const ride=scene?.attractions?.coaster;
  if(!ride?.track?.length)return null;
  const dwell=Math.max(2,ride.dwellSeconds||7),travel=Math.max(8,ride.travelSeconds||24);
  const cycle=dwell+travel,phase=((now/1000)%cycle+cycle)%cycle;
  const docked=phase<dwell,t=docked?0:(phase-dwell)/travel;
  const points=ride.track;
  let length=ride._trackLength;
  if(!length){length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);ride._trackLength=length;}
  let remaining=t*length,p=points[0],q=points[1]||p;
  for(let i=1;i<points.length;i++){
    p=points[i-1];q=points[i];const segment=Math.hypot(q.x-p.x,q.y-p.y);
    if(remaining<=segment||i===points.length-1){const a=segment?Math.max(0,Math.min(1,remaining/segment)):0;return {x:p.x+(q.x-p.x)*a,y:p.y+(q.y-p.y)*a,z:p.z+(q.z-p.z)*a,angle:Math.atan2(q.y-p.y,q.x-p.x),docked,waitSeconds:docked?0:cycle-phase,progress:t,ride};}
    remaining-=segment;
  }
  return null;
}

function stroke(c,points,color,width,closed=false){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));if(closed)c.closePath();c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function pill(c,x,y,w,h,fill,edge){c.beginPath();c.roundRect(x,y,w,h,Math.min(18,h/3));c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=3;c.stroke();}}
function title(c,text,x,y,size=26){c.font=`bold ${size}px Georgia,serif`;c.textAlign='center';c.lineWidth=5;c.strokeStyle='#14291d';c.strokeText(text,x,y);c.fillStyle='#f7dfa0';c.fillText(text,x,y);}

function drawCoasterGround(c,ride,stationImage){
  const points=ride.track;
  if(!points?.length)return;
  c.save();c.lineCap='round';c.lineJoin='round';
  // Shadow and timber posts make the elevated course readable at town scale.
  for(let i=0;i<points.length;i+=12){const p=points[i];if(p.z<35)continue;
    c.fillStyle='rgba(7,22,14,.28)';c.beginPath();c.ellipse(p.x+24,p.y+20,34,14,0,0,Math.PI*2);c.fill();
    stroke(c,[[p.x,p.y],[p.x,p.y-p.z]],'#3a2b22',11);
    stroke(c,[[p.x-10,p.y-p.z+12],[p.x+10,p.y-p.z+12]],'#9a7550',5);
  }
  const elevated=points.map(p=>[p.x,p.y-p.z]);
  stroke(c,elevated,'rgba(13,28,20,.38)',58);
  stroke(c,elevated,'#6b402e',44);
  stroke(c,elevated,'#ad784c',35);
  for(let i=0;i<points.length;i+=2){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];const dx=b.x-a.x,dy=(b.y-b.z)-(a.y-a.z),len=Math.hypot(dx,dy)||1,nx=-dy/len*23,ny=dx/len*23;
    stroke(c,[[p.x-nx,p.y-p.z-ny],[p.x+nx,p.y-p.z+ny]],'#d2a66c',7);
  }
  stroke(c,elevated,'#483127',5);
  for(const side of [-1,1]){
    const rail=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;return [p.x-dy/len*side*17,p.y-p.z+dx/len*side*17];});
    stroke(c,rail,'#e9bb74',6);
  }
  const s=ride.station;
  if(stationImage&&ride.stationSprite){const art=ride.stationSprite;c.drawImage(stationImage,art.x,art.y,art.w,art.h);}
  else{pill(c,s.x-205,s.y-52,430,170,'#70523a','#d9af6d');for(let i=0;i<7;i++)stroke(c,[[s.x-188+i*65,s.y-50],[s.x-188+i*65,s.y+116]],'rgba(34,25,21,.22)',3);pill(c,s.x-185,s.y+95,390,20,'#312c24','#ebc980');}
  title(c,'LANTERN RUN',s.x+8,s.y+177,30);
  // The image carries the queue roof and railing; the ground marks remain walkable.
  const q=ride.queue;
  if(!stationImage){pill(c,q.x,q.y,q.w,q.h,'rgba(172,134,80,.55)','#c5a270');for(let i=1;i<4;i++)stroke(c,[[q.x+18,q.y+i*q.h/4],[q.x+q.w-20,q.y+i*q.h/4]],'#744b32',7);}
  title(c,'QUEUE',q.x+q.w/2,q.y+q.h+43,23);
  // A shallow stone grotto masks the cart briefly at the far turn.
  const tunnel=ride.tunnel;
  if(tunnel){c.fillStyle='#263c32';c.beginPath();c.ellipse(tunnel.x,tunnel.y,tunnel.rx,tunnel.ry,0,0,Math.PI*2);c.fill();c.strokeStyle='#a1a095';c.lineWidth=20;c.stroke();c.fillStyle='#0b191a';c.beginPath();c.ellipse(tunnel.x,tunnel.y+12,tunnel.rx*.68,tunnel.ry*.7,0,0,Math.PI*2);c.fill();}
  c.restore();
}

function drawZooGround(c,zoo){
  c.save();
  const pens=zoo.pens||[];
  for(const pen of pens){const {x,y,w,h}=pen;
    pill(c,x,y,w,h,pen.ground||'rgba(108,128,69,.23)','#aa956c');
    for(let i=0;i<12;i++){const gx=x+30+(i*83)%(w-60),gy=y+35+(i*137)%(h-70);c.fillStyle=i%3?'rgba(24,69,28,.24)':'rgba(231,197,114,.20)';c.beginPath();c.ellipse(gx,gy,17,7,i,0,Math.PI*2);c.fill();}
    c.lineCap='round';
    for(const side of [-1,1])stroke(c,[[x,y+(side<0?0:h)],[x+w,y+(side<0?0:h)]],'#5c392a',13);
    for(const side of [-1,1])stroke(c,[[x+(side<0?0:w),y],[x+(side<0?0:w),y+h]],'#5c392a',13);
    for(let px=x;px<=x+w;px+=75){pill(c,px-8,y-8,16,21,'#ca9a64','#573a28');pill(c,px-8,y+h-10,16,21,'#ca9a64','#573a28');}
    for(let py=y+70;py<y+h;py+=70){pill(c,x-8,py-8,16,21,'#ca9a64','#573a28');pill(c,x+w-8,py-8,16,21,'#ca9a64','#573a28');}
    pill(c,x+w/2-100,y+h+12,200,42,'#2d493a','#cda36b');title(c,pen.name,x+w/2,y+h+42,22);
  }
  if(pens.length){const left=Math.min(...pens.map(p=>p.x)),right=Math.max(...pens.map(p=>p.x+p.w));title(c,'WHISPERWIND WILDLIFE GARDEN',(left+right)/2,Math.max(...pens.map(p=>p.y+p.h))+128,32);}
  c.restore();
}

function drawAnimal(c,pen,now,sprite,image){
  const x=pen.x+pen.w*.5+Math.sin(now*.00035+(pen.seed||0))*pen.w*.18;
  const y=pen.y+pen.h*.45+Math.sin(now*.00051+(pen.seed||0))*pen.h*.13;
  c.save();c.translate(x,y);c.scale(Math.sin(now*.00035+(pen.seed||0))>0?-1:1,1);
  c.fillStyle='rgba(13,26,17,.27)';c.beginPath();c.ellipse(0,10,55,13,0,0,Math.PI*2);c.fill();
  const rect=sprite?.sourceRects?.[pen.animal];
  if(image&&rect){const [sx,sy,sw,sh]=rect;const size={deer:[100,145],capybara:[145,120],owl:[105,125]}[pen.animal]||[110,120];c.drawImage(image,sx,sy,sw,sh,-size[0]/2,-size[1]+12,size[0],size[1]);c.restore();return;}
  if(pen.animal==='deer'){
    c.fillStyle='#b87745';c.beginPath();c.ellipse(0,-26,54,29,0,0,Math.PI*2);c.fill();
    for(const leg of [-31,-3,26,44])pill(c,leg,-12,10,39,'#715037');
    c.fillStyle='#c88956';c.beginPath();c.ellipse(52,-56,23,18,0,0,Math.PI*2);c.fill();
    for(const dy of [-1,1])stroke(c,[[51+dy*8,-71],[52+dy*21,-119],[42+dy*24,-132]],'#9e704a',7);
    c.fillStyle='#1b241b';c.fillRect(63,-60,5,5);
  }else if(pen.animal==='capybara'){
    c.fillStyle='#936448';c.beginPath();c.ellipse(0,-22,66,38,0,0,Math.PI*2);c.fill();
    for(const leg of [-43,38])pill(c,leg,-1,16,27,'#714a35');
    c.fillStyle='#aa7655';c.beginPath();c.ellipse(57,-29,32,24,0,0,Math.PI*2);c.fill();
    c.fillStyle='#1b211c';c.fillRect(66,-37,5,5);c.fillRect(82,-25,5,5);
  }else{
    c.fillStyle='#806247';c.beginPath();c.ellipse(0,-33,38,41,0,0,Math.PI*2);c.fill();
    c.fillStyle='#d5bd87';c.beginPath();c.ellipse(0,-34,24,29,0,0,Math.PI*2);c.fill();
    for(const eye of [-12,12]){c.fillStyle='#f7df9f';c.beginPath();c.arc(eye,-48,10,0,Math.PI*2);c.fill();c.fillStyle='#21221d';c.beginPath();c.arc(eye,-48,4,0,Math.PI*2);c.fill();}
    c.fillStyle='#dc9c54';c.beginPath();c.moveTo(-6,-31);c.lineTo(8,-31);c.lineTo(1,-22);c.closePath();c.fill();
  }
  c.restore();
}

function drawCart(c,pos,occupants,drawRider){
  if(!pos)return;
  const tunnel=pos.ride.tunnel;
  if(tunnel&&Math.hypot(pos.x-tunnel.x,pos.y-pos.z-tunnel.y)<tunnel.rx*.52)return;
  c.save();c.translate(pos.x,pos.y-pos.z);c.rotate(pos.angle*.28);
  c.fillStyle='rgba(0,0,0,.26)';c.beginPath();c.ellipse(8,28,68,15,0,0,Math.PI*2);c.fill();
  pill(c,-65,-37,130,74,'#8c3c35','#efbd70');
  pill(c,-53,-28,106,45,'#382c30','#c9995f');
  if(drawRider){c.save();c.translate(0,5);c.scale(.58,.58);drawRider(c);c.restore();}
  pill(c,-60,12,120,27,'#ad5b3d','#f3cb7e');
  for(const x of [-42,42]){c.fillStyle='#272626';c.beginPath();c.arc(x,43,12,0,Math.PI*2);c.fill();c.fillStyle='#caa76d';c.beginPath();c.arc(x,43,5,0,Math.PI*2);c.fill();}
  c.restore();
  if(occupants?.length){c.save();title(c,occupants.join(' · '),pos.x,pos.y-pos.z-95,18);c.restore();}
}

function drawGround(c,scene,stationImage){const a=scene?.attractions;if(!a)return;if(a.coaster)drawCoasterGround(c,a.coaster,stationImage);if(a.zoo)drawZooGround(c,a.zoo);}
function drawDynamic(c,scene,now,occupants,drawRider,animalImage){const a=scene?.attractions;if(!a)return;if(a.zoo)for(const pen of a.zoo.pens||[])drawAnimal(c,pen,now,a.zoo.sprite,animalImage);if(a.coaster)drawCart(c,coasterAt(scene,now),occupants,drawRider);}
window.TownAttractions={coasterAt,drawGround,drawDynamic};
})();
