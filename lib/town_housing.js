'use strict';
const FURNITURE=new Set(['wwhd_table','wwhd_rug','wwhd_bar','wwhd_fireplace','wwhd_bed','wwhd_sofa','wwhd_bookcase','wwhd_plant','wwhd_desk','wwhd_chair','wwhd_home_sofa','wwhd_home_armchair','wwhd_home_dining_table','wwhd_home_dining_chair','wwhd_home_bed','wwhd_home_bookcase','wwhd_home_dresser','wwhd_home_bedside','wwhd_home_plant','wwhd_home_floor_lamp','wwhd_home_rug','wwhd_home_aquarium','wwhd_home_wardrobe']);
const same=(a,b)=>!!a&&String(a).toLowerCase()===String(b).toLowerCase();
function fail(message){throw new Error(message);}
function decorate(input){
  if(!input||!Array.isArray(input.objects)||input.objects.length>80)fail('Choose at most 80 furnishings.');
  const objects=input.objects.map((o,i)=>{
    const x=Number(o.x),y=Number(o.y),scale=Number(o.scale??1),rotation=Number(o.rotation??0);
    if(!FURNITURE.has(o.asset)||!Number.isFinite(x)||!Number.isFinite(y)||x<140||x>1060||y<240||y>760||!Number.isFinite(scale)||scale<.5||scale>1.5||![0,90,180,270].includes(rotation))fail('Invalid furniture placement.');
    // Keep the entrance and a central walking aisle clear.
    if(y>690&&x>470&&x<730)fail('Keep the entrance clear.');
    return {id:'furniture_'+i,asset:o.asset,x,y,scale,rotation,layer:'props'};
  });
  const exterior=input.exterior||{};
  if(!['cottage','apartment','shop'].includes(exterior.style||'cottage'))fail('Unknown exterior style.');
  if(!['sage','blue','rose','gold'].includes(exterior.accent||'sage'))fail('Unknown accent.');
  if(!['original','slate','moss','plum'].includes(exterior.roof||'original'))fail('Unknown roof color.');
  if(!['oak','walnut','stone'].includes(input.floor||'oak'))fail('Unknown floor.');
  if(!['cream','sage','blue','rose'].includes(input.wall||'cream'))fail('Unknown wall.');
  return {objects,floor:input.floor||'oak',wall:input.wall||'cream',exterior:{style:exterior.style||'cottage',accent:exterior.accent||'sage',roof:exterior.roof||'original',sign:String(exterior.sign||'').trim().slice(0,32)},privacy:input.privacy==='private'?'private':'public'};
}
function transact(plot,actor,action,profiles,body={}){
  if(!actor||!profiles[actor])fail('Sign in to manage homes.');
  const mine=same(plot.owner,actor),profile=profiles[actor];profile.world=profile.world||{};
  if(action==='buy'){
    if(mine)fail('You already own this home.');
    if(plot.owner&&!plot.listing)fail('This home is not for sale.');
    if(!plot.owner&&plot.status==='empty')fail('This home is not available.');
    const listed=plot.listing;
    if(listed&&(!same(listed.seller,plot.owner)||!Number.isSafeInteger(listed.price)||listed.price<1))fail('Listing is no longer valid.');
    // One newcomer home per account. Resales always cost the listed price.
    const free=!plot.owner&&!profile.world.newcomerHomeGranted;
    const price=free?0:(listed?.price??plot.saleValue??125);
    if(!Number.isSafeInteger(price)||price<0||price>1000000)fail('Invalid sale price.');
    if(Number(profile.money||0)<price)fail('Not enough coins.');
    if(plot.owner&&!profiles[plot.owner])fail('Seller account unavailable.');
    profile.money=Number(profile.money||0)-price;
    if(plot.owner)profiles[plot.owner].money=Number(profiles[plot.owner].money||0)+price;
    const previous=plot.owner;plot.owner=actor;plot.status='owned';plot.privacy='public';delete plot.listing;
    plot.decoration=plot.decoration||decorate({objects:[{asset:'wwhd_bed',x:300,y:440},{asset:'wwhd_table',x:850,y:570},{asset:'wwhd_plant',x:960,y:350},{asset:'wwhd_rug',x:600,y:570}]});
    plot.claimedAt=Date.now();profile.world.newcomerHomeGranted=true;
    profile.world.residence={neighborhoodId:'whisperwind_01',plotId:plot.id};
    if(previous&&profiles[previous]?.world?.residence?.plotId===plot.id)delete profiles[previous].world.residence;
    return {price};
  }
  if(!mine)fail('Only the owner can change this home.');
  if(action==='list'){
    const price=Number(body.price);if(!Number.isSafeInteger(price)||price<1||price>1000000)fail('Use a whole coin price from 1 to 1,000,000.');
    plot.listing={seller:actor,price,listedAt:Date.now()};return {};
  }
  if(action==='unlist'){delete plot.listing;return {};}
  if(action==='decorate'){plot.decoration=decorate(body.decoration);plot.privacy=plot.decoration.privacy;return {};}
  if(action==='move'){profile.world.residence={neighborhoodId:'whisperwind_01',plotId:plot.id};return {};}
  fail('Unknown housing action.');
}
function expandEstate(data){
  const town=data.neighborhoods.find(n=>n.id==='whisperwind_01');if(!town)return data;
  town.hometownSceneId='whisperwind_hd_waterfront';town.plots=town.plots||[];
  for(let i=1;i<=24;i++){
    const id='town_home_'+String(i).padStart(2,'0');
    if(!town.plots.some(p=>p.id===id))town.plots.push({id,name:(i<=12?'Garden Cottage ':'Lantern Apartment ')+i,owner:null,status:'available_house',saleValue:125+(i%4)*25,privacy:'public',houseType:'whisperwind_hd'});
    const plot=town.plots.find(p=>p.id===id);
    plot.homeKind=i<=6?'cottage':i<=12?'family':i<=20?'apartment':'orchard';
    plot.roomScale=i<=6?.82:i<=12?1.15:i<=20?1:1.2;
    if(/^(Garden Cottage|Lantern Apartment) \d+$/.test(plot.name))plot.name=(i<=6?'Garden Cottage ':i<=12?'Family House ':i<=20?'Lantern Apartment ':'Orchard House ')+i;
  }
  return data;
}
module.exports={same,decorate,transact,expandEstate,FURNITURE};

