import {validate,METHODS} from './model.mjs';
// Cumulative integer division spreads the remainder without putting it all at one end.
export function distribute(total,slots){
 if(!Number.isInteger(total)||total<0||!Number.isInteger(slots)||slots<1)throw Error('Invalid spacing inputs.');
 return Array.from({length:slots},(_,i)=>Math.floor((i+1)*total/slots)-Math.floor(i*total/slots));
}
export function plan(input){
 const project=validate(input),m=METHODS[project.method],changes=Math.abs(project.target-project.start),interior=project.start-project.left-project.right,segments=[];
 const plain=(count,edge=null)=>{if(count)segments.push({kind:'plain',count,edge})};
 plain(project.left,'left');
 let gaps;
 if(!changes){gaps=[interior];plain(interior)}
 else{
  const remaining=interior-changes*m.consume,slots=changes+(project.mode==='flat'?1:0);
  gaps=distribute(remaining,slots);
  for(let i=0;i<changes;i++){plain(gaps[i]);segments.push({kind:project.method,count:1,edge:null})}
  if(project.mode==='flat')plain(gaps.at(-1));
 }
 plain(project.right,'right');
 return {project,segments,gaps,changes};
}
