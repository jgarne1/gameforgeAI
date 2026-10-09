'use strict';
const cache=new Map();
function formatter(zone){let value=cache.get(zone);if(!value){value=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});cache.set(zone,value);if(cache.size>64)cache.delete(cache.keys().next().value);}return value;}
function parts(instant,zone){const result={};for(const p of formatter(zone).formatToParts(instant))if(p.type!=='literal')result[p.type]=Number(p.value);return result;}
function serial(p){return Date.UTC(p.year,p.month-1,p.day,p.hour||0,p.minute||0,p.second||0);}
function timezone(zone){if(typeof zone!=='string'||zone.length>100)throw Error('Choose an IANA timezone');try{return formatter(zone).resolvedOptions().timeZone;}catch{throw Error('Choose an IANA timezone');}}
function validate(rule){if(!rule||typeof rule!=='object'||Array.isArray(rule)||Object.keys(rule).some(k=>!['mode','enabled','timezone','time','date','days'].includes(k))||!['none','once','weekly'].includes(rule.mode)||typeof rule.enabled!=='boolean')throw Error('Choose a reset schedule');
 if(rule.mode==='none')return {mode:'none',enabled:false};
 const zone=timezone(rule.timezone);if(typeof rule.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.time))throw Error('Choose a reset time');
 if(rule.mode==='once'){if(typeof rule.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(rule.date))throw Error('Choose a reset date');const [year,month,day]=rule.date.split('-').map(Number),d=new Date(Date.UTC(year,month-1,day));if(year<2020||year>2100||d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)throw Error('Choose a valid reset date');return{mode:'once',enabled:rule.enabled,timezone:zone,time:rule.time,date:rule.date};}
 if(!Array.isArray(rule.days)||!rule.days.length||rule.days.length>7||rule.days.some(d=>!Number.isInteger(d)||d<0||d>6)||new Set(rule.days).size!==rule.days.length)throw Error('Choose weekly reset days');
 return{mode:'weekly',enabled:rule.enabled,timezone:zone,time:rule.time,days:[...rule.days].sort()};
}
// Resolve a named wall clock from actual Intl offsets, not the device timezone.
// Ambiguous fall-back times use the first occurrence. Nonexistent times move
// forward by the timezone gap (02:30 -> 03:30 for a one-hour spring change).
function wallInstant(date,time,zone){const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number),wall=Date.UTC(year,month-1,day,hour,minute),offsets=new Set();
 for(let delta=-36;delta<=36;delta+=6){const candidate=wall+delta*3600000;offsets.add(serial(parts(candidate,zone))-candidate);}
 const candidates=[...offsets].map(offset=>wall-offset).sort((a,b)=>a-b),exact=candidates.filter(candidate=>serial(parts(candidate,zone))===wall);if(exact.length)return exact[0];
 const later=candidates.map(instant=>({instant,gap:serial(parts(instant,zone))-wall})).filter(x=>x.gap>0&&x.gap<=26*3600000).sort((a,b)=>a.gap-b.gap||a.instant-b.instant);if(!later.length)throw Error('Reset time cannot be resolved in this timezone');return later[0].instant;
}
function dateAt(instant,zone,offset=0){const local=parts(instant,zone),d=new Date(Date.UTC(local.year,local.month-1,local.day+offset));return{date:d.toISOString().slice(0,10),day:d.getUTCDay()};}
function next(rule,after){const r=validate(rule);if(!Number.isFinite(after))throw Error('Invalid reset clock');if(!r.enabled||r.mode==='none')return null;if(r.mode==='once')return wallInstant(r.date,r.time,r.timezone);
 for(let offset=0;offset<=14;offset++){const d=dateAt(after,r.timezone,offset);if(r.days.includes(d.day)){const instant=wallInstant(d.date,r.time,r.timezone);if(instant>after)return instant;}}throw Error('Weekly reset could not be resolved');
}
module.exports={validate,timezone,wallInstant,next,parts};
