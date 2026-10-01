'use strict';
const crypto=require('node:crypto');
const INTERVALS=[1,3,7,14,30,60];
const GRAMMAR_SKILLS=new Set(['ser','articles','plurals','agreement','possessives','ar','questions','er','ir','estar','hay','tener','reflexive','gustar','querer','modifiers','quantity','costar','comparisons','demonstratives','ir-irregular','contractions','future','poder','stem-e-ie','stem-o-ue','stem-e-i','obligation','yo-irregular','saber-conocer','venir','decir','dar','connectors','sequence']);
const grammarSkills=q=>(q.skills||[]).filter(s=>GRAMMAR_SKILLS.has(s));
const normalize=text=>text.normalize('NFC').trim().toLocaleLowerCase('es').replace(/\s+/g,' ').replace(/[¿?¡!.]+$/g,'').replace(/^[¿¡]+/g,'');
const withoutAcute=text=>text.normalize('NFD').replace(/\u0301/g,'').normalize('NFC');
const dateAfter=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
function matchForm(text,accepted){
 if(typeof text!=='string'||text.length>160||/[\u0000-\u001f]/.test(text))throw Error('Enter a short answer (up to 160 characters)');
 const normalized=normalize(text);if(accepted.some(a=>normalize(a)===normalized))return 'correct';
 return accepted.some(a=>withoutAcute(normalize(a))===withoutAcute(normalized))?'accent':'incorrect';
}
function validateCourse(course){
 if(!course||typeof course.version!=='string'||!Array.isArray(course.lessons)||course.lessons.length!==90)throw Error('A course must contain 90 lessons');
 const words=new Map(),questions=new Map(),lessons=new Map();
 for(let i=0;i<90;i++){
  const l=course.lessons[i];if(l.id!==i+1||!l.title||!l.objective||!Array.isArray(l.prerequisites)||l.prerequisites.some(n=>!Number.isInteger(n)||n<1||n>=l.id))throw Error('Invalid lesson or prerequisites '+(i+1));
  if(!Array.isArray(l.grammar)||!l.grammar.length||!Array.isArray(l.vocabulary)||!Array.isArray(l.exercises)||l.exercises.length<3)throw Error('Incomplete lesson '+l.id);
  if(l.kind==='teaching'&&(l.vocabulary.length<3||l.vocabulary.length>4))throw Error('Teaching lessons need 3–4 chunks');
  if(!['teaching','review'].includes(l.kind))throw Error('Invalid lesson kind');
  for(const w of l.vocabulary){if(!w.id||words.has(w.id)||!w.spanish||!w.english)throw Error('Invalid vocabulary '+w.id);words.set(w.id,{...w,lesson:l.id});}
  for(const q of [...l.exercises,...(l.variants||[])]){
   if(!q.id||questions.has(q.id)||!q.prompt||!q.explanation||!Array.isArray(q.wordIds)||q.wordIds.some(id=>!words.has(id))||(q.retrievalIds&&q.retrievalIds.some(id=>!words.has(id))))throw Error('Invalid exercise '+q.id);
   if(q.type==='choice'){if(!Array.isArray(q.choices)||q.choices.length<3||new Set(q.choices).size!==q.choices.length||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.choices.length)throw Error('Invalid choices '+q.id);}
   else if(q.type==='form'){if(!Array.isArray(q.accepted)||!q.accepted.length||q.accepted.some(a=>typeof a!=='string'||!a.trim()||a.length>160))throw Error('Invalid accepted forms '+q.id);}
   else if(q.type==='order'){if(!Array.isArray(q.tokens)||q.tokens.length<2||q.tokens.length>24||!Array.isArray(q.acceptedOrders)||!q.acceptedOrders.length||q.acceptedOrders.some(a=>a.length!==q.tokens.length||new Set(a).size!==a.length||a.some(n=>!Number.isInteger(n)||n<0||n>=q.tokens.length)))throw Error('Invalid tile order '+q.id);}
   else throw Error('Unknown exercise type '+q.id);
   questions.set(q.id,q);
  }lessons.set(l.id,l);
 }for(const q of questions.values())if(q.retryId&&!questions.has(q.retryId))throw Error('Missing retry '+q.id);return {words,questions,lessons};
}
function createCourseEngine(course){
 const {words,questions,lessons}=validateCourse(course);
 function state(root){root.courses||={};return root.courses[course.version]||=( {version:course.version,completed:{},words:{},active:null,attempts:{}} );}
 function dueEntries(c,day){
  const list=[...Object.entries(c.words).filter(([,s])=>s.due<=day).map(([id,s])=>({entry:{word:id,kind:'due-review',options:[]},due:s.due,priority:1})),...Object.entries(c.questionReviews||{}).filter(([id,s])=>s.due<=day&&questions.has(id)).map(([id,s])=>({entry:{...entryFor(questions.get(id),grammarSkills(questions.get(id)).length?'grammar-review':'application-review'),reviewKey:id},due:s.due,priority:0}))];
  return list.sort((a,b)=>a.due.localeCompare(b.due)||a.priority-b.priority).map(x=>x.entry);
 }
 const current=c=>course.lessons.find(l=>!c.completed[l.id])?.id||null;
 let eventAt;
 function reviewQuestion(word){return {id:'vocab:'+word.id,type:'form',prompt:'Type the exact Spanish chunk from your lesson flashcard for: '+word.english,accepted:[word.spanish],wordIds:[word.id],explanation:word.spanish+' — '+word.english+'. Other translations may be valid; this retrieval checks the chunk taught on your flashcard.'};}
 function question(entry){return entry.word?reviewQuestion(words.get(entry.word)):questions.get(entry.question);}
 function entryFor(q,kind='lesson'){return {question:q.id,kind,options:q.type==='choice'?shuffle(q.choices.length):q.type==='order'?shuffle(q.tokens.length):[]};}
 function shuffle(n){const a=Array.from({length:n},(_,i)=>i);for(let i=n-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
 function view(root,day){
  const c=state(root),active=c.active,l=active&&lessons.get(active.lesson),entry=active?.entries[active.cursor],q=entry&&question(entry),r=active?.records[active.cursor],next=current(c),previewLesson=lessons.get(active&&!active.review?active.lesson+1:next);
  const due=dueEntries(c,day),dueWords=due.filter(e=>e.word).length,lessonViews=course.lessons.map(l=>{
   const saved=c.completed[l.id]?.snapshot,savedResults=saved?saved.records.map((r,i)=>{const e=saved.entries[i],q=question(e);return {prompt:q.prompt,result:r.result,solution:q.type==='choice'?q.choices[q.answer]:q.type==='order'?q.acceptedOrders[0].map(n=>q.tokens[n]).join(' '):q.accepted[0],explanation:q.explanation};}):[];
   return {id:l.id,title:l.title,kind:l.kind,objective:l.objective,prerequisites:l.prerequisites,notes:l.grammar,vocabulary:l.vocabulary,completed:!!c.completed[l.id],ready:c.readiness?.[l.id],score:c.completed[l.id]?.score,total:c.completed[l.id]?.total,completedAt:c.completed[l.id]?.completedAt,attempts:c.attempts[l.id]||0,savedResults};
  });
  const needsRepair=((active&&!active.completed?l:lessons.get(next))?.prerequisites||[]).filter(n=>!c.completed[n]||c.readiness?.[n]===false).map(n=>({lesson:n,title:lessons.get(n).title,reason:!c.completed[n]?'not yet completed':'fewer than two unhinted correct applications'}));
  const weakSkills=Object.entries(c.skills||{}).filter(([,s])=>s.attempts>=2&&s.correct/s.attempts<0.7).sort((a,b)=>a[1].correct/a[1].attempts-b[1].correct/b[1].attempts).slice(0,6).map(([id,s])=>({id,...s}));
  return {version:course.version,totalLessons:90,completedLessons:Object.keys(c.completed).length,currentLesson:next,due:due.length,dueWords,dueGrammar:due.filter(e=>e.kind==='grammar-review').length,dueApplications:due.filter(e=>e.kind==='application-review').length,needsReviewFirst:due.length>6,needsRepair,weakSkills,legacyPracticeDays:root.practiced?.length||0,masteredWords:Object.values(c.words).filter(w=>w.stage>=3).length,introducedWords:Object.keys(c.words).length,lessons:lessonViews,preview:previewLesson?{lesson:previewLesson.id,title:previewLesson.title,vocabulary:previewLesson.vocabulary.map(({id,spanish,english,gender,example,forms})=>({id,spanish,english,gender,example,forms}))}:null,
   lesson:active?{id:active.id,curriculumVersion:course.version,number:l.id,title:l.title,objective:l.objective,grammar:l.grammar,vocabulary:l.vocabulary,reference:l.reference,reviewPassage:l.reviewPassage,prerequisites:l.prerequisites,day:active.day,review:active.review,cursor:active.cursor,total:active.entries.length,part:Math.floor(active.cursor/6)+1,parts:Math.ceil(active.entries.length/6),checkpoint:l.kind==='review',mandatoryCount:(active.mandatoryVocabularyIds||[]).length,deferredReview:(l.reviewVocabularyIds||[]).filter(id=>!c.words[id]).map(id=>({id,lesson:words.get(id).lesson,title:lessons.get(words.get(id).lesson).title})),reviewVocabulary:(active.mandatoryVocabularyIds||[]).map(id=>words.get(id)),completed:active.completed,ready:c.readiness?.[l.id],score:active.records.filter(r=>r?.result==='correct').length,
    question:q?{id:q.id,type:q.type,prompt:q.prompt,kind:entry.kind,introducesLesson:entry.kind==='lesson'&&(active.cursor===0||active.entries[active.cursor-1].kind!=='lesson'),reviewNotes:['grammar-review','application-review'].includes(entry.kind)?lessons.get(Number(q.id.match(/^l(\d+)/)?.[1]))?.grammar:undefined,choices:entry.options.map(i=>(q.choices||q.tokens)[i]),answered:!!r,correct:r?.result==='correct',result:r?.result,chosen:r?.choice,explanation:r?q.explanation:undefined,solution:r?(q.type==='choice'?q.choices[q.answer]:q.type==='order'?q.acceptedOrders[0].map(i=>q.tokens[i]):q.accepted[0]):undefined}:null}:null};
 }
 function start(root,body,day){
  const c=state(root),target=body.lesson??current(c)??90;
  if(!Number.isInteger(target)||!lessons.has(target))throw Error('Choose a lesson from 1 to 90');
  if(c.active&&!c.active.completed&&c.active.lesson===target)return;
  c.sessions||={};if(c.active&&!c.active.completed&&!c.active.review)c.sessions[c.active.lesson]=c.active;
  if(c.sessions[target]&&!c.sessions[target].completed){c.active=c.sessions[target];return;}
  if(target>current(c)&&body.moveAhead!==true&&!c.completed[target])throw Error('Confirm moving ahead before starting this lesson');
  if(target===current(c)&&dueEntries(c,day).length>6&&body.longer!==true)throw Error('Review due vocabulary and grammar first, or choose the longer lesson option. Your course place is unchanged.');
  const l=lessons.get(target),due=dueEntries(c,day).slice(0,6),entries=[...due],mandatoryVocabularyIds=(l.reviewVocabularyIds||[]).filter(id=>c.words[id]);
  {const dueWordIds=new Set(due.map(e=>e.word));entries.push(...mandatoryVocabularyIds.filter(id=>!dueWordIds.has(id)).map(id=>({word:id,kind:l.kind==='review'?'checkpoint-review':'mandatory-review',options:[]})));}
  if(target===89){const weakest=Object.entries(c.skills||{}).filter(([id,s])=>GRAMMAR_SKILLS.has(id)&&s.attempts>0).sort((a,b)=>a[1].correct/a[1].attempts-b[1].correct/b[1].attempts||a[0].localeCompare(b[0])).slice(0,2).map(([id])=>id),used=new Set();for(const skill of weakest){const repairs=[...questions.values()].filter(q=>q.sourceQuestionId&&grammarSkills(q).includes(skill)&&Number(q.id.match(/^l(\d+)/)?.[1])<89&&!used.has(q.id)&&(c.completed[Number(q.id.match(/^l(\d+)/)?.[1])]||c.applications?.[Number(q.id.match(/^l(\d+)/)?.[1])]?.[q.sourceQuestionId]!==undefined)).slice(0,2);for(const q of repairs){used.add(q.id);entries.push({...entryFor(q,'repair'),repairSkill:skill});}}}
  entries.push(...l.exercises.map(q=>entryFor(q)));
  c.active={id:crypto.randomUUID(),lesson:target,version:course.version,day,startedAt:eventAt,mandatoryVocabularyIds,entries,cursor:0,records:[],completed:false,review:!!c.completed[target],lastNext:null};
 }
 function updateWord(c,id,result,day){
  const prior=c.words[id]||{stage:0,seen:0},eligible=prior.lastAdvanceDay!==day&&(!prior.due||prior.due<=day),stage=result==='correct'?(eligible?Math.min(prior.stage+1,INTERVALS.length):prior.stage):0;
  const due=result!=='correct'?dateAfter(day,1):eligible?dateAfter(day,INTERVALS[Math.max(0,stage-1)]):prior.due||dateAfter(day,1);
  c.words[id]={...prior,stage,seen:prior.seen+1,lastResult:result,lastReviewed:day,lastReviewedAt:eventAt,introducedAt:prior.introducedAt||eventAt,lastAdvanceDay:eligible||result!=='correct'?day:prior.lastAdvanceDay,due};
 }
 function dispatch(root,action,body,day,timestamp=Date.now()){
  eventAt=new Date(timestamp).toISOString();const c=state(root);c.skills||={};c.applications||={};c.readiness||={};if(action==='start'){start(root,body,day);return;}
  if(action==='review'&&body.due===true){
   const due=dueEntries(c,day).slice(0,6);
   if(!due.length)throw Error('No vocabulary or grammar is due for review yet');if(c.active&&!c.active.completed)throw Error('Finish the active lesson before starting a separate review');
   c.active={id:crypto.randomUUID(),lesson:c.active?.lesson??current(c)??90,version:course.version,day,entries:due,cursor:0,records:[],completed:false,review:true,lastNext:null};return;
  }
  if(action==='review'){
   if(!c.active?.completed)throw Error('Finish the lesson before reviewing');
   const prior=c.active,missed=prior.entries.filter((e,i)=>prior.records[i]?.result!=='correct'&&e.kind!=='retry').map(e=>({...e,kind:'review'}));
   if(!missed.length)throw Error('There are no missed questions to review');
   c.active={id:crypto.randomUUID(),lesson:prior.lesson,version:course.version,day,entries:missed,cursor:0,records:[],completed:false,review:true,lastNext:null};return;
  }
  const s=c.active;if(!s||s.id!==body.id||body.questionId!==question(s.entries[body.cursor]||{})?.id)throw Error('This lesson changed; refresh and try again');
  if(action==='next'&&s.lastNext===body.cursor)return;
  if(s.completed||s.cursor!==body.cursor)throw Error('This question changed; refresh and try again');
  const e=s.entries[s.cursor],q=question(e);
  if(action==='answer'){
   const choice=body.reveal===true?null:body.choice;let result;
   if(body.reveal===true)result='revealed';
   else if(q.type==='form')result=matchForm(choice,q.accepted);
   else if(q.type==='choice'){if(!Number.isInteger(choice)||choice<0||choice>=e.options.length)throw Error('Choose an answer');result=e.options[choice]===q.answer?'correct':'incorrect';}
   else {if(!Array.isArray(choice)||choice.length!==e.options.length||new Set(choice).size!==choice.length||choice.some(i=>!Number.isInteger(i)||i<0||i>=e.options.length))throw Error('Use every phrase tile once');const order=choice.map(i=>q.tokens[e.options[i]]);result=q.acceptedOrders.some(a=>a.every((n,i)=>q.tokens[n]===order[i]))?'correct':'incorrect';}
   const prior=s.records[s.cursor];if(prior){if(JSON.stringify(prior.choice)!==JSON.stringify(choice))throw Error('This question was already answered');return;}
   s.records[s.cursor]={choice:body.reveal===true?null:choice,result,questionId:q.id,answeredAt:eventAt};
   for(const id of q.retrievalIds||q.wordIds)if(c.words[id]||words.get(id).lesson===s.lesson)updateWord(c,id,result,day);
   // A grammar application is scheduled directly; nouns are not its proxy.
   // Same-day retry success retains a miss/reveal's next-day obligation.
   if(grammarSkills(q).length||(result!=='correct'&&!q.skills?.includes('vocabulary'))||c.questionReviews?.[e.reviewKey||q.sourceQuestionId||q.id]){const id=e.reviewKey||q.sourceQuestionId||q.id;c.questionReviews||={};const prior=c.questionReviews[id]||{stage:0,seen:0},eligible=prior.lastAdvanceDay!==day&&(!prior.due||prior.due<=day),stage=result==='correct'?(eligible?Math.min(prior.stage+1,INTERVALS.length):prior.stage):0,due=result!=='correct'?dateAfter(day,1):eligible?dateAfter(day,INTERVALS[Math.max(0,stage-1)]):prior.due||dateAfter(day,1);c.questionReviews[id]={...prior,stage,seen:prior.seen+1,lastResult:result,lastReviewedAt:eventAt,lastAdvanceDay:eligible||result!=='correct'?day:prior.lastAdvanceDay,due,skills:grammarSkills(q)};}
   if(e.kind!=='retry'){for(const skill of (q.skills||[]).filter(s=>!s.startsWith('lesson:')&&s!=='vocabulary')){const stats=c.skills[skill]||{attempts:0,correct:0};stats.attempts++;if(result==='correct')stats.correct++;c.skills[skill]=stats;}if(q.skills?.includes('lesson:'+s.lesson)){c.applications[s.lesson]||={};c.applications[s.lesson][q.id]=result==='correct';c.readiness[s.lesson]=Object.values(c.applications[s.lesson]).filter(Boolean).length>=2;}}
   if(result!=='correct'&&e.kind!=='retry'){const retry=questions.get(q.retryId);s.entries.push(retry?entryFor(retry,'retry'):{...e,kind:'retry'});}
  }else if(action==='next'){
   if(!s.records[s.cursor])throw Error('Answer this question first');s.lastNext=s.cursor;
   if(s.cursor+1<s.entries.length)s.cursor++;
   else {s.completed=true;if(!s.review)delete c.sessions?.[s.lesson];c.attempts[s.lesson]=(c.attempts[s.lesson]||0)+1;if(!s.review&&!c.completed[s.lesson]){c.completed[s.lesson]={completedAt:eventAt,completedDay:day,score:s.records.filter(r=>r.result==='correct').length,total:s.entries.length,snapshot:structuredClone(s)};for(const w of lessons.get(s.lesson).vocabulary)if(!c.words[w.id])c.words[w.id]={stage:0,seen:0,due:dateAfter(day,1),introducedAt:eventAt};}}
  }else throw Error('Invalid course action');
 }
 return {view,dispatch,course};
}
module.exports={createCourseEngine,validateCourse,matchForm,normalize,INTERVALS,GRAMMAR_SKILLS};
