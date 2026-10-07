const crypto=require('node:crypto');
const words=['apple','banana','bicycle','butterfly','castle','cat','cloud','dinosaur','dog','dragon','elephant','flower','guitar','ice cream','kite','moon','ocean','pancake','penguin','pizza','rainbow','robot','rocket','snowman','soccer','star','sun','tiger','train','tree','turtle','umbrella','volcano','watermelon','whale','wizard'];
function shuffled(items){const list=[...items];for(let i=list.length-1;i>0;i--){const j=crypto.randomInt(i+1);[list[i],list[j]]=[list[j],list[i]];}return list;}
function startFamily(kind,ids){
 if(ids.length<2||ids.length>4)throw new Error('Choose 2–4 players');
 const common={revision:0,winner:null,turn:ids[0],round:1,score:0,last:null};
 if(kind==='signal')return {...common,phase:'watch',sequence:Array.from({length:2},()=>crypto.randomInt(4)),position:0,ready:[],mistakes:0};
 if(kind==='words')return {...common,phase:'clue',prompts:shuffled(words).slice(0,6),clue:'',guesses:[],attempts:0,results:[]};
 throw new Error('Invalid game');
}
const normalize=text=>text.toLowerCase().replace(/[^a-z0-9]/g,'');
function playFamily(kind,state,ids,userId,body){
 if(state.winner||!ids.includes(userId))throw new Error('Game is not active');
 const next=structuredClone(state);
 if(kind==='signal'){
  if(body.action==='ready'){
   if(state.phase!=='watch'||state.ready.includes(userId))throw new Error('Already ready');
   next.ready.push(userId);if(next.ready.length===ids.length){next.phase='repeat';next.turn=ids[(state.round-1)%ids.length];}
  }else if(body.action==='tap'){
   if(state.phase!=='repeat'||state.turn!==userId)throw new Error('Wait for your turn');
   if(!Number.isInteger(body.pad)||body.pad<0||body.pad>3)throw new Error('Choose one of the four signals');
   const correct=body.pad===state.sequence[state.position];
   next.last={player:userId,pad:body.pad,correct};next.position++;
   if(!correct){next.mistakes++;next.position=0;next.ready=[];next.phase='watch';}
   else if(next.position===next.sequence.length){next.score++;next.round++;next.position=0;next.ready=[];next.phase='watch';next.sequence.push(crypto.randomInt(4));}
   else next.turn=ids[(ids.indexOf(userId)+1)%ids.length];
   if(next.score===5||next.mistakes===3){next.winner='team';next.turn=null;next.phase='result';}
  }else throw new Error('Invalid signal action');
 }else if(kind==='words'){
  const clueGiver=ids[(state.round-1)%ids.length],answer=state.prompts[state.round-1];
  if(body.action==='clue'){
   if(state.phase!=='clue'||userId!==clueGiver)throw new Error('Wait for the clue giver');
   if(typeof body.text!=='string'||!body.text.trim()||body.text.trim().length>120)throw new Error('Write a clue of 1–120 characters');
   if(normalize(body.text).includes(normalize(answer)))throw new Error('Give a clue without using the secret word');
   next.clue=body.text.trim();next.phase='guess';next.turn=ids[(ids.indexOf(clueGiver)+1)%ids.length];
  }else if(body.action==='guess'){
   if(state.phase!=='guess'||state.turn!==userId||userId===clueGiver)throw new Error('Wait for your turn to guess');
   if(typeof body.text!=='string'||!body.text.trim()||body.text.trim().length>40)throw new Error('Guess with 1–40 characters');
   const correct=normalize(body.text)===normalize(answer);next.attempts++;next.guesses.push({player:userId,text:body.text.trim(),correct});
   if(correct||next.attempts===3){if(correct)next.score++;next.results.push({round:state.round,answer,correct});next.phase='reveal';next.turn=clueGiver;}
   else {const guessers=ids.filter(id=>id!==clueGiver);next.turn=guessers[(guessers.indexOf(userId)+1)%guessers.length];}
  }else if(body.action==='next'){
   if(state.phase!=='reveal'||userId!==clueGiver)throw new Error('The clue giver starts the next round');
   if(state.round===6){next.winner='team';next.phase='result';next.turn=null;}
   else {next.round++;next.clue='';next.guesses=[];next.attempts=0;next.phase='clue';next.turn=ids[(next.round-1)%ids.length];}
  }else throw new Error('Invalid word action');
 }else throw new Error('Invalid game');
 next.revision++;return next;
}
function familyView(kind,state,userId,ids){
 if(kind==='signal'){const {sequence,...visible}=state;return {...visible,length:sequence?.length||0,sequence:state.phase==='watch'||state.phase==='result'?sequence:undefined};}
 if(kind==='words'){const {prompts,...visible}=state;return {...visible,secret:prompts&&ids[(state.round-1)%ids.length]===userId?prompts[state.round-1]:undefined};}
 return state;
}
module.exports={startFamily,playFamily,familyView};
