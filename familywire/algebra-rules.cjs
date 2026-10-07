const crypto=require('node:crypto');
const levels=['foundations','core','advanced','expert'];
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a||1;}
function rational(n,d=1){if(!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||!d)throw new Error('Invalid fraction');const sign=d<0?-1:1,g=gcd(n,d);return {n:sign*n/g,d:sign*d/g};}
function parseAnswer(text){
 if(typeof text!=='string'||text.length>40)throw new Error('Use an integer or fraction, such as -3 or 3/4');
 const match=text.trim().match(/^([+-]?\d+)(?:\s*\/\s*([+-]?\d+))?$/);if(!match)throw new Error('Use an integer or fraction, such as -3 or 3/4');
 const n=Number(match[1]),d=match[2]===undefined?1:Number(match[2]);if(Math.abs(n)>1000000||Math.abs(d)>1000000)throw new Error('Answer is too large');return rational(n,d);
}
const equal=(a,b)=>a.n===b.n&&a.d===b.d;
const format=r=>r.d===1?String(r.n):r.n+'/'+r.d;
const term=(n,variable='')=>n===0?'':(n<0?' − ':' + ')+Math.abs(n)+variable;
function makeFoundations(random,stage=0){
 const topic=['addition','subtraction','multiplication','division','patterns','balance'][stage%6];
 const small=1+random(9),other=1+random(5),symbol=topic==='balance'?'x':'□';
 let answer=small,a=1,b=0,c=0,d=small,prompt,hint,steps;
 if(topic==='addition'){b=other;d=answer+b;prompt=`□ + ${b} = ${d}`;hint='The box holds one missing number. Count up from the number you know. Example: □ + 2 = 5 means the box is 3.';steps=[`Start at ${b} and count up to ${d}.`,`The gap is ${d} − ${b} = ${answer}.`];}
 if(topic==='subtraction'){b=-other;d=answer-other;if(d<0){answer+=other;d=answer-other;}prompt=`□ − ${other} = ${d}`;hint='Put back what was taken away. Example: □ − 2 = 4 means 4 + 2 = 6.';steps=[`Put ${other} back: ${d} + ${other} = ${answer}.`];}
 if(topic==='multiplication'){a=2+random(4);d=a*answer;prompt=`${a} × □ = ${d}`;hint='Think of equal groups or count in jumps. Example: 3 × □ = 12 means four groups of 3.';steps=[`Count in jumps of ${a} until ${d}.`,`There are ${answer} jumps, so the missing number is ${answer}.`];}
 if(topic==='division'){const divisor=2+random(4),groups=1+random(6);answer=divisor*groups;d=answer;prompt=`□ ÷ ${divisor} = ${groups}`;hint='Division shares a total into equal groups. Multiply to find the total. Example: □ ÷ 3 = 4 means 3 × 4 = 12.';steps=[`${groups} groups of ${divisor} make ${groups} × ${divisor} = ${answer}.`];}
 if(topic==='patterns'){const start=1+random(8),jump=1+random(5);answer=start+2*jump;b=-2*jump;d=start;prompt=`${start}, ${start+jump}, □, ${start+3*jump}`;hint='Look at how much the numbers increase each time. Example: 2, 4, □, 8 goes up by 2, so the box is 6.';steps=[`Each step adds ${jump}.`,`${start+jump} + ${jump} = ${answer}, then ${answer} + ${jump} = ${start+3*jump}.`];}
 if(topic==='balance'){b=other;const rightPart=1+random(Math.min(5,answer+b));d=answer+b;prompt=`x + ${b} = ${d-rightPart} + ${rightPart}`;hint='x is a missing number, just like the box. The equals sign means both sides have the same value. Example: x + 2 = 4 + 3 means x + 2 = 7.';steps=[`First add the right side: ${d-rightPart} + ${rightPart} = ${d}.`,`Find the missing number: ${d} − ${b} = ${answer}.`,`x means the same missing number that □ did.`];}
 const result={prompt,answer:rational(answer),equation:{a,b,c,d},topic,symbol,hint,steps:[...steps,topic==='patterns'?`Check: the pattern keeps increasing by ${-b/2}.`:`Check with ${answer}: both sides have the same value.`]};
 if(a*answer+b!==d||answer<0||!Number.isInteger(answer))throw new Error('Foundation problem did not verify');
 return result;
}
function makeProblem(level='foundations',random=max=>crypto.randomInt(max),stage=0){
 if(!levels.includes(level))throw new Error('Choose Foundations, Core, Advanced or Expert');
 if(level==='foundations')return makeFoundations(random,stage);
 const denominator=level==='expert'?2+random(4):1,answer=rational(random(25)-12,denominator);
 const a=level==='core'?1:answer.d*(2+random(6)),c=level==='expert'?answer.d:0,offset=level==='expert'?random(7)-3:0;
 const extra=level==='core'?1+random(15):random(25)-12,b=a*offset+extra,d=(a-c)*answer.n/answer.d+b;
 if(!Number.isSafeInteger(d)||a===c)throw new Error('Invalid equation');
 const left=rational(a*answer.n+b*answer.d,answer.d),right=rational(c*answer.n+d*answer.d,answer.d);
 if(!equal(left,right))throw new Error('Equation did not verify');
 const leftText=level==='expert'&&offset?`${a}(x${term(offset)})${term(extra)}`:`${a===1?'':a}x${term(b)}`;
 const prompt=`${leftText} = ${c?c+'x'+term(d):d}`;
 const steps=[];
 if(offset)steps.push(`Distribute ${a}: ${a}x${term(b)} = ${c}x${term(d)}.`);
 if(c)steps.push(`Subtract ${c}x from both sides: ${a-c}x${term(b)} = ${d}.`);
 steps.push(`${b>=0?'Subtract':'Add'} ${Math.abs(b)} on both sides: ${a-c}x = ${d-b}.`);
 steps.push(`Divide both sides by ${a-c}: x = ${format(answer)}.`);
 steps.push(`Check by substitution: both sides equal ${format(left)}.`);
 return {prompt,answer,steps,equation:{a,b,c,d},hint:c?'Collect the x terms on one side, then use the same inverse operation on both sides.':'Use the same inverse operation on both sides; undo addition before multiplication.'};
}
function startAlgebra(ids,level='foundations',random){
 return {turn:ids[0],revision:0,winner:null,round:1,score:0,firstTry:0,difficulty:level,phase:'solve',problem:makeProblem(level,random),attempts:0,last:null,results:[],passed:false};
}
function playAlgebra(state,ids,userId,body,random){
 if(state.winner||state.turn!==userId)throw new Error('Wait for your turn');
 const next=structuredClone(state);
 if(body.action==='answer'){
  if(state.phase!=='solve')throw new Error('Continue to the next equation');
  const answer=parseAnswer(body.text),correct=equal(answer,state.problem.answer);next.attempts++;
  next.last={player:userId,correct,answer:format(answer)};
  if(correct||next.attempts===3){next.phase='reveal';if(correct){next.score++;if(next.attempts===1)next.firstTry++;}next.results.push({round:state.round,correct,firstTry:correct&&next.attempts===1});}
 }else if(body.action==='skip'){
  if(state.phase!=='solve')throw new Error('Continue to the next equation');
  next.phase='reveal';next.results.push({round:state.round,correct:false,skipped:true});
 }else if(body.action==='pass'){
  if(state.phase!=='solve'||state.passed||ids.length<2)throw new Error('Pass is not available');
  next.turn=ids[(ids.indexOf(userId)+1)%ids.length];next.passed=true;
 }else if(body.action==='next'){
  if(state.phase!=='reveal')throw new Error('Solve or skip this equation first');
  if(state.round===6){next.winner='team';next.phase='result';next.turn=null;}
  else{next.round++;next.phase='solve';next.problem=makeProblem(state.difficulty,random,next.round-1);next.attempts=0;next.passed=false;next.last=null;next.turn=ids[(next.round-1)%ids.length];}
 }else throw new Error('Invalid equation action');
 next.revision++;return next;
}
function algebraView(state){const {problem,...visible}=state;if(!problem)return visible;const basics={prompt:problem.prompt,symbol:problem.symbol||'x',topic:problem.topic};return {...visible,problem:state.phase==='solve'?{...basics,hint:problem.hint}:{...basics,answer:format(problem.answer),steps:problem.steps}};}
module.exports={levels,rational,parseAnswer,equal,format,makeProblem,startAlgebra,playAlgebra,algebraView};
