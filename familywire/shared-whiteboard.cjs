'use strict';
const crypto=require('node:crypto'),zlib=require('node:zlib');
const WIDTH=1600,HEIGHT=1000,TTL=48*60*60*1000;
const LIMITS=Object.freeze({objects:300,points:512,operations:2000,frame:96*1024,imageBytes:2*1024*1024,imageSide:2048,assets:12,images:4});
const COLORS=['#243746','#d64545','#2367b3','#218354','#8b50a5','#b36b13'];
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const demand=(ok,message)=>{if(!ok)throw Error(message);};
function plain(value,keys){demand(value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype,'Invalid whiteboard object');demand(Object.keys(value).every(key=>keys.includes(key)),'Unknown whiteboard field');}
function id(value){demand(typeof value==='string'&&UUID.test(value),'Invalid whiteboard identifier');return value;}
function number(value,min,max){demand(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max,'Whiteboard geometry is outside the board');return value;}
function integer(value,min=0,max=Number.MAX_SAFE_INTEGER){demand(Number.isSafeInteger(value)&&value>=min&&value<=max,'Invalid whiteboard revision');return value;}
function geometry(value){plain(value,['x','y','width','height']);number(value.x,0,WIDTH);number(value.y,0,HEIGHT);number(value.width,10,WIDTH);number(value.height,10,HEIGHT);demand(value.x+value.width<=WIDTH&&value.y+value.height<=HEIGHT,'Image extends outside the board');return value;}
function imageMetadata(value){plain(value,['mime','width','height','sha256','size']);demand(value.mime==='image/png'&&typeof value.sha256==='string'&&/^[a-f0-9]{64}$/.test(value.sha256),'Invalid board image metadata');integer(value.width,1,LIMITS.imageSide);integer(value.height,1,LIMITS.imageSide);integer(value.size,1,LIMITS.imageBytes);return value;}
function object(value){
 demand(value?.kind==='stroke'||value?.kind==='image','Unsupported whiteboard object');id(value.id);
 if(value.kind==='stroke'){plain(value,['id','kind','color','width','points']);demand(COLORS.includes(value.color)&&[2,4,8,12].includes(value.width),'Unsupported pen');demand(Array.isArray(value.points)&&value.points.length>=2&&value.points.length<=LIMITS.points,'Stroke point limit exceeded');for(const point of value.points){demand(Array.isArray(point)&&point.length===2,'Invalid stroke point');number(point[0],0,WIDTH);number(point[1],0,HEIGHT);}}
 else{plain(value,['id','kind','assetId','asset','transform']);id(value.assetId);imageMetadata(value.asset);geometry(value.transform);}
 return value;
}
function validateOperation(op){
 plain(op,['v','boardId','id','type','data']);demand(op.v===1,'Unsupported whiteboard version');id(op.boardId);id(op.id);
 switch(op.type){
 case 'add':object(op.data);break;
 case 'transform':plain(op.data,['id','expected','transform']);id(op.data.id);integer(op.data.expected);geometry(op.data.transform);break;
 case 'remove':plain(op.data,['id','expected']);id(op.data.id);integer(op.data.expected);break;
 case 'order':plain(op.data,['id','expected','position']);id(op.data.id);integer(op.data.expected);demand(['front','back'].includes(op.data.position),'Invalid image order');break;
 case 'clear':plain(op.data,[]);break;
 case 'undo':plain(op.data,['operationId']);id(op.data.operationId);break;
 default:throw Error('Unsupported whiteboard operation');
 }
 demand(Buffer.byteLength(JSON.stringify(op))<=LIMITS.frame-256,'Whiteboard operation too large');return op;
}
function descriptor(op){validateOperation(op);return {id:op.id,type:op.type,target:op.type==='undo'?op.data.operationId:op.data.id||'',asset:op.type==='add'&&op.data.kind==='image'?op.data.assetId:'',expected:op.data.expected??0};}
function validateDescriptor(value){plain(value,['id','type','target','asset','expected']);id(value.id);demand(['add','transform','remove','order','clear','undo'].includes(value.type),'Invalid board operation kind');if(value.type==='clear')demand(value.target===''&&value.asset==='','Invalid clear operation');else id(value.target);if(value.asset)id(value.asset);demand(value.type==='add'||!value.asset,'Unexpected board asset');integer(value.expected);return value;}
function initial(){return {revision:0,objects:[],history:[],undone:[],touch:{}};}
function apply(state,record){
 const op=validateOperation(record.operation);integer(record.seq,1,LIMITS.operations);demand(record.seq===state.revision+1,'Whiteboard operation gap');id(record.actorId);
 const next={revision:record.seq,objects:state.objects.slice(),history:state.history.slice(),undone:state.undone.slice(),touch:{...state.touch}};
 const index=op.data.id?next.objects.findIndex(item=>item.id===op.data.id):-1;
 const history={id:op.id,actorId:record.actorId,type:op.type,target:op.data.id||'',seq:record.seq,before:null,index};
 const changed=()=>{demand(index>=0&&state.touch[op.data.id]===op.data.expected,'This object changed. Review the latest board.');history.before=next.objects[index];next.touch[op.data.id]=record.seq;};
 switch(op.type){
 case 'add':demand(!Object.hasOwn(state.touch,op.data.id),'Whiteboard object ID already used');demand(next.objects.length<LIMITS.objects,'Board object limit reached');if(op.data.kind==='image')demand(next.objects.filter(item=>item.kind==='image').length<LIMITS.images,'Board image limit reached');next.objects.push(structuredClone(op.data));next.touch[op.data.id]=record.seq;break;
 case 'transform':changed();demand(next.objects[index].kind==='image','Only images can be moved or resized');next.objects[index]={...next.objects[index],transform:{...op.data.transform}};break;
 case 'remove':changed();next.objects.splice(index,1);break;
 case 'order':changed();demand(next.objects[index].kind==='image','Only images can be reordered');next.objects.splice(index,1);next.objects[op.data.position==='front'?'push':'unshift'](history.before);break;
 case 'clear':history.before=next.objects.slice();for(const item of next.objects)next.touch[item.id]=record.seq;next.objects=[];break;
 case 'undo':{
  const prior=state.history.find(item=>item.id===op.data.operationId);demand(prior&&prior.actorId===record.actorId&&prior.type!=='undo'&&!state.undone.includes(prior.id),'Only your own last available change can be undone');
  if(prior.type==='clear'){demand(state.revision===prior.seq,'The board changed after it was cleared');next.objects=prior.before.slice();for(const item of next.objects)next.touch[item.id]=record.seq;}
  else{demand(state.touch[prior.target]===prior.seq,'Someone changed this object after your action');const at=next.objects.findIndex(item=>item.id===prior.target);if(prior.type==='add'){demand(at>=0,'Object no longer present');next.objects.splice(at,1);}else if(prior.type==='remove'){demand(at<0&&next.objects.length<LIMITS.objects,'Cannot restore this object');next.objects.splice(prior.index,0,prior.before);}else{demand(at>=0,'Object no longer present');next.objects.splice(at,1);next.objects.splice(prior.index,0,prior.before);}next.touch[prior.target]=record.seq;}
  next.undone.push(prior.id);break;
 }
 }
 next.history.push(history);return next;
}
function replay(records,boardId){
 id(boardId);demand(Array.isArray(records)&&records.length<=LIMITS.operations,'Board operation limit exceeded');const unique=new Map();
 for(const record of records){validateOperation(record.operation);demand(record.operation.boardId===boardId,'Operation belongs to another board');const prior=unique.get(record.operation.id);if(prior)demand(JSON.stringify(prior)===JSON.stringify(record),'Conflicting duplicate board operation');else unique.set(record.operation.id,record);}
 return [...unique.values()].sort((a,b)=>a.seq-b.seq).reduce(apply,initial());
}
function undoId(state,actorId){return [...state.history].reverse().find(item=>item.actorId===actorId&&item.type!=='undo'&&!state.undone.includes(item.id)&&(item.type==='clear'?state.revision===item.seq:state.touch[item.target]===item.seq))?.id||null;}
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(bytes){let n=0xffffffff;for(const byte of bytes)n=crcTable[(n^byte)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
function png(bytes){
 demand(Buffer.isBuffer(bytes)&&bytes.length>=45&&bytes.length<=LIMITS.imageBytes,'Images must be PNG files up to 2 MB');demand(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Only sanitized PNG images are supported');let offset=8,width,height,expected,ended=false,parts=[],chunks=0;
 while(offset<bytes.length){demand(offset+12<=bytes.length&&++chunks<=4096,'Invalid PNG chunks');const size=bytes.readUInt32BE(offset),end=offset+12+size;demand(end<=bytes.length,'Truncated PNG');const type=bytes.toString('ascii',offset+4,offset+8),data=bytes.subarray(offset+8,offset+8+size);demand(/^[A-Za-z]{4}$/.test(type)&&bytes.readUInt32BE(end-4)===crc(bytes.subarray(offset+4,end-4)),'Invalid PNG checksum');
  if(offset===8){demand(type==='IHDR'&&size===13,'PNG header missing');width=data.readUInt32BE(0);height=data.readUInt32BE(4);integer(width,1,LIMITS.imageSide);integer(height,1,LIMITS.imageSide);const channels={0:1,2:3,3:1,4:2,6:4}[data[9]],depth=data[8];demand(channels&&[1,2,4,8,16].includes(depth)&&data[10]===0&&data[11]===0&&data[12]===0,'Unsupported PNG encoding');expected=height*(1+Math.ceil(width*channels*depth/8));demand(expected<=32*1024*1024,'Decoded image too large');}
  else if(type==='IHDR')throw Error('Duplicate PNG header');
  if(type==='IDAT')parts.push(data);if(type==='IEND'){demand(size===0&&end===bytes.length,'Invalid PNG end');ended=true;}
  demand(!['acTL','fcTL','fdAT'].includes(type),'Animated images are not supported');demand(!/^[A-Z]/.test(type)||['IHDR','PLTE','IDAT','IEND'].includes(type),'Unsupported critical PNG chunk');offset=end;
 }
 demand(ended&&parts.length,'PNG image data missing');const pixels=zlib.inflateSync(Buffer.concat(parts),{maxOutputLength:32*1024*1024});demand(pixels.length===expected,'PNG pixel size mismatch');const stride=expected/height;for(let row=0;row<height;row++)demand(pixels[row*stride]<=4,'Invalid PNG scanline filter');return {width,height,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),size:bytes.length,mime:'image/png'};
}
function asset(value){plain(value,['id','mime','width','height','sha256','size','base64']);id(value.id);demand(value.mime==='image/png'&&typeof value.base64==='string'&&value.base64.length<=Math.ceil(LIMITS.imageBytes/3)*4&&/^[A-Za-z0-9+/]*={0,2}$/.test(value.base64),'Invalid board image');const bytes=Buffer.from(value.base64,'base64');demand(bytes.toString('base64')===value.base64,'Noncanonical image encoding');const metadata=png(bytes);for(const key of ['mime','width','height','sha256','size'])demand(value[key]===metadata[key],'Board asset metadata/hash mismatch');return bytes;}
function portable(state,assets){const needed=new Set(state.objects.filter(item=>item.kind==='image').map(item=>item.assetId));const used=assets.filter(item=>needed.has(item.id));demand(used.length===needed.size,'Board image unavailable for export');for(const item of used)asset(item);return {schema:'familywire-whiteboard',version:1,canvas:{width:WIDTH,height:HEIGHT},objects:state.objects.map(item=>structuredClone(item)),assets:used.map(item=>structuredClone(item))};}
function readPortable(value){plain(value,['schema','version','canvas','objects','assets']);demand(value.schema==='familywire-whiteboard'&&value.version===1,'Unsupported board document version');plain(value.canvas,['width','height']);demand(value.canvas.width===WIDTH&&value.canvas.height===HEIGHT,'Unsupported board canvas');demand(Array.isArray(value.objects)&&value.objects.length<=LIMITS.objects&&Array.isArray(value.assets)&&value.assets.length<=LIMITS.images,'Board document limit exceeded');const objects=new Set(),assets=new Set();for(const item of value.objects){object(item);demand(!objects.has(item.id),'Duplicate board object');objects.add(item.id);}for(const item of value.assets){asset(item);demand(!assets.has(item.id),'Duplicate board asset');assets.add(item.id);}demand(value.objects.filter(item=>item.kind==='image').length<=LIMITS.images,'Board image limit reached');for(const item of value.objects)if(item.kind==='image'){demand(assets.has(item.assetId),'Board asset missing');const matching=value.assets.find(asset=>asset.id===item.assetId);for(const key of ['mime','width','height','sha256','size'])demand(item.asset[key]===matching[key],'Board image manifest mismatch');}return structuredClone(value);}
module.exports={WIDTH,HEIGHT,TTL,LIMITS,COLORS,id,integer,validateOperation,descriptor,validateDescriptor,initial,apply,replay,undoId,png,asset,imageMetadata,portable,readPortable};
