(function(){
  'use strict';
  function metrics(image,asset={},object={}){
    const r=asset.sourceRect||{x:0,y:0,w:image.width,h:image.height};
    const scale=object.scale??1;
    return {r,w:(object.w??asset.displaySize?.w??r.w)*scale,
      h:(object.h??asset.displaySize?.h??r.h)*scale,
      ox:object.originX??asset.placeOrigin?.x??.5,oy:object.originY??asset.placeOrigin?.y??1};
  }
  function draw(ctx,image,asset,object={},time=0){
    const {r,w,h,ox,oy}=metrics(image,asset,object);
    ctx.save();ctx.translate(object.x||0,object.y||0);ctx.rotate(object.rotation||0);
    ctx.imageSmoothingEnabled=false;
    const x=-w*ox,y=-h*oy;
    if(object.sway){
      // The trunk's lower 30% and its placement/collision remain stationary.
      const split=.7,shift=Math.sin(time*1.15+(object.x||0)*.01)*1.3;
      ctx.drawImage(image,r.x,r.y,r.w,r.h*split,x+shift,y,w,h*split);
      ctx.drawImage(image,r.x,r.y+r.h*split,r.w,r.h*(1-split),x,y+h*split,w,h*(1-split));
    }else ctx.drawImage(image,r.x,r.y,r.w,r.h,x,y,w,h);
    if(object.tint){ctx.globalAlpha=.25;ctx.globalCompositeOperation='source-atop';ctx.fillStyle=object.tint;ctx.fillRect(x,y,w,h);}
    ctx.restore();return {w,h,ox,oy};
  }
  function water(ctx,image,points,time,material={}){
    if(!image||!points?.length)return;
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t=reduced?0:time,size=material.tileSize||640;
    ctx.save();ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.clip();
    ctx.fillStyle='#10465c';ctx.fillRect(x,y,w,h);
    const dx=(t*(material.speed??5))%size,dy=(t*1.8)%size;
    ctx.imageSmoothingEnabled=false;ctx.globalAlpha=material.calm?.35:1;
    for(let ty=y-size+dy;ty<y+h;ty+=size)for(let tx=x-size+dx;tx<x+w;tx+=size)ctx.drawImage(image,tx,ty,size,size);
    ctx.globalAlpha=1;ctx.fillStyle=material.calm?'rgba(35,76,65,.15)':'rgba(6,34,43,.24)';ctx.fillRect(x,y,w,h);
    for(let i=0;i<(material.calm?25:75);i++){
      const alpha=.08+.23*Math.pow(Math.max(0,Math.sin(t*.8+i*1.71)),6);
      ctx.fillStyle='rgba(255,240,187,'+alpha+')';
      ctx.fillRect(x+(i*137.43)%w,y+(i*83.91)%h,3+i%6,1);
    }
    ctx.restore();
  }
  function tile(ctx,image,material,x,y,w,h){
    const r=material.sourceRect||{x:0,y:0,w:image.width,h:image.height},size=material.tileSize||256;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.imageSmoothingEnabled=false;
    for(let ty=y;ty<y+h;ty+=size)for(let tx=x;tx<x+w;tx+=size)ctx.drawImage(image,r.x,r.y,r.w,r.h,tx,ty,size,size);
    ctx.restore();
  }
  window.WhisperwindAssets={metrics,draw,water,tile};
})();

