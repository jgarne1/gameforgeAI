(function(root){
'use strict';
function step(n,dt,canStand){
  const route=n.routine?.points;if(!route?.length)return;
  n.moving=false;
  if(n.pause>0){n.pause=Math.max(0,n.pause-dt);return;}
  if(n.wait>0){n.wait=Math.max(0,n.wait-dt);return;}
  n.routeIndex=n.routeIndex??0;const target=route[n.routeIndex],dx=target.x-n.x,dy=target.y-n.y,d=Math.hypot(dx,dy);
  if(d<.5){n.x=target.x;n.y=target.y;n.wait=target.wait??2;n.face=target.face||n.face;n.routeIndex=(n.routeIndex+1)%route.length;return;}
  const distance=Math.min(d,(n.routine.speed||55)*dt),x=n.x+dx/d*distance,y=n.y+dy/d*distance;
  if(!canStand(x,y)){n.wait=1;return;}
  n.x=x;n.y=y;n.walkDistance=(n.walkDistance||0)+distance;n.moving=true;n.face=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
}
function route(start,end,canStand,size,grid=40){
  const key=(x,y)=>x+','+y,w=Math.ceil(size.w/grid),h=Math.ceil(size.h/grid);
  const from=[Math.round(start.x/grid),Math.round(start.y/grid)],to=[Math.round(end.x/grid),Math.round(end.y/grid)];
  const open=[],seen=new Map([[key(...from),{cost:0}]]),closed=new Set();let found=false;
  // A heap avoids sorting the entire frontier on every step in the larger town.
  function push(node,cost){const entry={node,priority:cost+Math.abs(node[0]-to[0])+Math.abs(node[1]-to[1])};open.push(entry);let i=open.length-1;while(i){const p=(i-1)>>1;if(open[p].priority<=entry.priority)break;open[i]=open[p];i=p;}open[i]=entry;}
  function pop(){const first=open[0],last=open.pop();if(open.length){let i=0;while(true){let child=i*2+1;if(child>=open.length)break;if(child+1<open.length&&open[child+1].priority<open[child].priority)child++;if(open[child].priority>=last.priority)break;open[i]=open[child];i=child;}open[i]=last;}return first.node;}
  push(from,0);
  const clear=(ax,ay,bx,by)=>{const d=Math.hypot(bx-ax,by-ay),steps=Math.max(1,Math.ceil(d/8));for(let i=1;i<=steps;i++)if(!canStand(ax+(bx-ax)*i/steps,ay+(by-ay)*i/steps))return false;return true;};
  if(!canStand(end.x,end.y))return [];
  if(clear(start.x,start.y,end.x,end.y))return [end];
  for(let count=0;open.length&&count<16000;count++){
    const a=pop(),ak=key(...a);if(closed.has(ak))continue;closed.add(ak);
    if(a[0]===to[0]&&a[1]===to[1]){found=true;break;}
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
      const b=[a[0]+dx,a[1]+dy],bk=key(...b);if(b[0]<1||b[1]<1||b[0]>=w||b[1]>=h||closed.has(bk)||!clear(a[0]*grid,a[1]*grid,b[0]*grid,b[1]*grid))continue;
      const cost=seen.get(ak).cost+1;if(!seen.has(bk)||seen.get(bk).cost>cost){seen.set(bk,{cost,parent:a});push(b,cost);}
    }
  }
  if(!found)return [];
  const result=[end];let a=to;
  while(key(...a)!==key(...from)){result.unshift({x:a[0]*grid,y:a[1]*grid});a=seen.get(key(...a)).parent;}
  if(result.length&&!clear(start.x,start.y,result[0].x,result[0].y))return [];
  return result;
}
const api={step,route};if(typeof module!=='undefined')module.exports=api;else root.TownMotion=api;
})(typeof window!=='undefined'?window:globalThis);
