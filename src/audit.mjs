import {validate} from './model.mjs';
export function audit(candidate){
 const p=validate(candidate.project);
 if(!Array.isArray(candidate.segments)||candidate.segments.length>503)throw Error('Invalid instruction stream.');
 let source=0,output=0,changes=0;const steps=[],events=[],gaps=[0],boundaries=new Set();
 for(const s of candidate.segments){
  if(!s||Object.keys(s).sort().join('|')!=='count|edge|kind'||!Number.isInteger(s.count)||s.count<1)throw Error('Malformed instruction.');
  const beforeSource=source,beforeOutput=output;
  if(s.kind==='plain'){
   if(![null,'left','right'].includes(s.edge))throw Error('Invalid edge tag.');
   if(s.edge==='left'&&(source!==0||s.count!==p.left))throw Error('Left protected edge changed.');
   if(s.edge==='right'&&(source!==p.start-p.right||s.count!==p.right))throw Error('Right protected edge changed.');
   if(s.edge===null&&(source<p.left||source+s.count>p.start-p.right))throw Error('Plain interior crosses a protected edge.');
   source+=s.count;output+=s.count;if(s.edge===null)gaps[gaps.length-1]+=s.count;
  }else{
   if(s.kind!==p.method||s.count!==1||s.edge!==null)throw Error('Unexpected shaping operation.');
   const consume=s.kind==='m1'?0:s.kind==='kfb'?1:s.kind==='k2tog'?2:-1;
   if(consume<0)throw Error('Unknown shaping operation.');
   if(source<p.left||source+consume>p.start-p.right)throw Error('Shaping touches a protected edge.');
   if(s.kind==='m1'){
    if(source<p.left+1||source>p.start-p.right-(p.mode==='flat'?1:0)||boundaries.has(source))throw Error('M1 does not use a distinct internal source gap.');
    boundaries.add(source);
   }
   source+=consume;output+=s.kind==='kfb'?2:1;changes++;gaps.push(0);
   events.push({number:changes,kind:s.kind,sourceStart:consume?beforeSource+1:null,sourceEnd:consume?source:null,afterSource:consume?null:beforeSource,outputStart:beforeOutput+1,outputEnd:output});
  }
  if(source>p.start||output>p.target)throw Error('Instruction stream exceeds counts.');
  steps.push({number:steps.length+1,...s,sourceStart:source===beforeSource?null:beforeSource+1,sourceEnd:source===beforeSource?null:source,afterSource:source===beforeSource?beforeSource:null,outputStart:beforeOutput+1,outputEnd:output});
 }
 if(source!==p.start||output!==p.target||changes!==Math.abs(p.target-p.start))throw Error('Count audit failed: source, target or change count does not match.');
 if(p.left&&candidate.segments[0]?.edge!=='left'||p.right&&candidate.segments.at(-1)?.edge!=='right')throw Error('Protected edge instruction missing.');
 const spacing=p.mode==='round'&&changes?gaps.slice(0,-1):gaps;
 if(p.mode==='round'&&changes&&gaps.at(-1)!==0)throw Error('Round must end at its final shaping operation.');
 if(changes&&Math.max(...spacing)-Math.min(...spacing)>1)throw Error('Plain-stitch gaps are not evenly distributed.');
 if(changes&&p.method==='m1'&&spacing.some(n=>n<1))throw Error('M1 requires plain stitches separating operations.');
 return {source,output,changes,gaps:spacing,minGap:Math.min(...spacing),maxGap:Math.max(...spacing),steps,events,verified:true};
}
