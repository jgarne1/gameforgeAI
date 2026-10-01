const crypto=require('node:crypto');
const {bank,levels,version}=require('./spanish-curriculum.cjs');
const {startAlgebra,playAlgebra,algebraView}=require('./algebra-rules.cjs');
const defaultCourse=require('./spanish-course.cjs').course;
const byId=new Map(bank.map(question=>[question.id,question])),DAY=86400000;
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
function dayAt(now,offset=0){if(!Number.isInteger(offset)||Math.abs(offset)>840)throw new Error('Invalid local date offset');return new Date(now+offset*60000).toISOString().slice(0,10);}
function addDays(day,count){return new Date(Date.parse(day+'T00:00:00Z')+count*DAY).toISOString().slice(0,10);}
function createLearningStore(db,{now=Date.now,course=defaultCourse}={}){
 const courseEngine=course?require('./spanish-course-engine.cjs').createCourseEngine(course):null;
 db.exec('CREATE TABLE IF NOT EXISTS fw_learning(user_id TEXT PRIMARY KEY,state TEXT NOT NULL)');
 const load=user=>{const row=db.prepare('SELECT state FROM fw_learning WHERE user_id=?').get(user);return row?JSON.parse(row.state):{version,spanish:{items:{},days:{},active:null,practiced:[]},algebra:{active:null,topics:{},days:{}}};};
 function save(user,state){state.version=version;const days=Object.keys(state.algebra.days).sort();for(const day of days.slice(0,-30))delete state.algebra.days[day];db.prepare('INSERT INTO fw_learning(user_id,state) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state').run(user,JSON.stringify(state));}
 function viewLesson(lesson){
  if(!lesson)return null;const entry=lesson.questions[lesson.cursor],question=entry&&byId.get(entry.id),record=lesson.records[lesson.cursor];
  return {id:lesson.id,day:lesson.day,level:lesson.level,review:lesson.review,cursor:lesson.cursor,total:lesson.questions.length,completed:lesson.completed,score:lesson.records.filter(r=>r?.correct).length,
   question:question?{id:question.id,type:question.type,prompt:question.prompt,choices:entry.options.map(index=>question.choices[index]),answered:!!record,correct:record?.correct,chosen:record?.choice,explanation:record?question.explanation:undefined,solution:record?(question.type==='order'?question.choices:question.choices[question.answer]):undefined}:null};
 }
 function view(state,offset=0){const day=dayAt(now(),offset);return {version:courseEngine?course.version:version,day,spanish:courseEngine?courseEngine.view(state.spanish,day):{lesson:viewLesson(state.spanish.active),daysPracticed:state.spanish.practiced.length,due:Object.values(state.spanish.items).filter(item=>item.due<=day).length},algebra:{session:state.algebra.active?{id:state.algebra.active.id,state:algebraView(state.algebra.active.state)}:null,topics:state.algebra.topics}};}
 function get(user,offset=0){return view(load(user),offset);}
 function makeLesson(state,level,day,review=false){
  const due=bank.filter(q=>state.spanish.items[q.id]?.due<=day&&q.level<=levels.indexOf(level)).sort((a,b)=>state.spanish.items[a.id].due.localeCompare(state.spanish.items[b.id].due));
  const selected=review?bank.filter(q=>state.spanish.active?.records.some((r,i)=>r&&!r.correct&&state.spanish.active.questions[i].id===q.id)):due.slice(0,2);
  if(!review){const fresh=bank.filter(q=>q.level===levels.indexOf(level)&&!selected.some(s=>s.id===q.id)).sort((a,b)=>(state.spanish.items[a.id]?.seen||0)-(state.spanish.items[b.id]?.seen||0)||hash(day+level+a.id).localeCompare(hash(day+level+b.id)));selected.push(...fresh.slice(0,5-selected.length));}
  if(!selected.length)throw new Error('There are no missed questions to review');
  return {id:crypto.randomUUID(),version,day,level,review,questions:selected.map(question=>({id:question.id,options:question.choices.map((_,i)=>i).sort((a,b)=>hash(day+question.id+a).localeCompare(hash(day+question.id+b)))})),cursor:0,records:[],completed:false};
 }
 function dispatch(user,route,body={}){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid learning action');
  const state=load(user),offset=body.offset??0,day=dayAt(now(),offset);
  if(courseEngine&&route.startsWith('spanish/')){courseEngine.dispatch(state.spanish,route.slice(8),body,day,now());save(user,state);return view(state,offset);}
  if(route==='spanish/start'){
   const level=body.level||'beginner';if(!levels.includes(level))throw new Error('Choose a Spanish level');
   const key=day+':'+level;
   state.spanish.active=state.spanish.days[key]||makeLesson(state,level,day);state.spanish.days[key]=state.spanish.active;
  }else if(route==='spanish/review'){
   if(!state.spanish.active?.completed)throw new Error('Finish the session before reviewing');
   state.spanish.active=makeLesson(state,state.spanish.active.level,day,true);
  }else if(route==='spanish/answer'||route==='spanish/next'){
   const lesson=state.spanish.active;
   if(!lesson||lesson.id!==body.id||lesson.cursor!==body.cursor||lesson.completed)throw new Error('This session changed; refresh and try again');
   const entry=lesson.questions[lesson.cursor],question=byId.get(entry.id);if(!question||lesson.version!==version)throw new Error('Start the current curriculum');
   if(route==='spanish/answer'){
    const choice=body.choice;
    if(question.type==='order'){if(!Array.isArray(choice)||choice.length!==entry.options.length||new Set(choice).size!==choice.length||choice.some(i=>!Number.isInteger(i)||i<0||i>=entry.options.length))throw new Error('Use every phrase tile once');}
    else if(!Number.isInteger(choice)||choice<0||choice>=entry.options.length)throw new Error('Choose an answer');
    if(lesson.records[lesson.cursor]){if(JSON.stringify(lesson.records[lesson.cursor].choice)!==JSON.stringify(choice))throw new Error('This question was already answered');return view(state,offset);}
    const correct=question.type==='order'?choice.every((index,i)=>entry.options[index]===i):entry.options[choice]===question.answer;
    lesson.records[lesson.cursor]={choice,correct};
    const prior=state.spanish.items[question.id]||{stage:0,seen:0},stage=correct?Math.min(prior.stage+1,4):0;
    state.spanish.items[question.id]={stage,seen:prior.seen+1,due:addDays(day,[1,1,3,7,14][stage]),lastCorrect:correct};
   }else{
    if(!lesson.records[lesson.cursor])throw new Error('Answer this question first');
    if(lesson.cursor+1===lesson.questions.length){lesson.completed=true;if(!lesson.review&&!state.spanish.practiced.includes(lesson.day))state.spanish.practiced.push(lesson.day);}
    else lesson.cursor++;
   }
   if(!lesson.review)state.spanish.days[lesson.day+':'+lesson.level]=lesson;
  }else if(route==='algebra/start'){
   const level=body.level||'foundations';state.algebra.active={id:crypto.randomUUID(),state:startAlgebra([user],level)};
  }else if(route==='algebra/act'){
   const active=state.algebra.active;if(!active||active.id!==body.id||body.revision!==active.state.revision)throw new Error('This equation changed; refresh and try again');
   const prior=active.state;active.state=playAlgebra(prior,[user],user,body);
   if(prior.phase==='solve'&&active.state.phase==='reveal'){
    const stats=state.algebra.topics[prior.difficulty]||{completed:0,firstTry:0,solved:0};stats.completed++;if(active.state.results.at(-1).firstTry)stats.firstTry++;if(active.state.results.at(-1).correct)stats.solved++;state.algebra.topics[prior.difficulty]=stats;
   }
  }else throw new Error('Invalid learning action');
  save(user,state);return view(state,offset);
 }
 return {get,dispatch};
}
module.exports={createLearningStore,dayAt};
