import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,integerInput,page} from '../src/model.mjs';
import {plan,distribute} from '../src/plan.mjs';
import {audit} from '../src/audit.mjs';
import {example} from '../src/example.mjs';
import {projectJSON,textPlan,eventsCSV,reportJSON,reportHTML,mapSVG} from '../src/exports.mjs';
const p=extra=>({...example,...extra}),build=extra=>{const r=plan(p(extra));return {...r,audit:audit(r)}};
test('strict schema clones settings and rejects malformed or excessive input',()=>{
 const copy=validate(example);copy.notes='Changed';assert.notEqual(copy.notes,example.notes);
 for(const extra of [{schema:'wrong'},{extra:1},{start:1.5},{target:NaN},{left:-1},{right:1001},{start:1001},{method:'__proto__'},{mode:'other'},{notes:'x'.repeat(4001)},{title:'\ud800'}])assert.throws(()=>validate(p(extra)));
 for(const text of ['-1',' 2','2 ','1.0','1e2','+2','01','Infinity',''])assert.throws(()=>integerInput(text));
 assert.equal(integerInput('1000'),1000);
});
test('integer spacing covers every plain stitch with bounded discrepancy',()=>{
 for(let total=0;total<150;total++)for(let slots=1;slots<40;slots++){
  const gaps=distribute(total,slots);assert.equal(gaps.reduce((a,b)=>a+b,0),total);assert.ok(Math.max(...gaps)-Math.min(...gaps)<=1);
 }
 assert.throws(()=>distribute(2,0));assert.throws(()=>distribute(-1,2));
});
test('practice example produces independently audited source and target counts',()=>{
 const r=build({});assert.equal(r.audit.source,78);assert.equal(r.audit.output,85);assert.equal(r.audit.changes,7);
 assert.deepEqual(r.audit.gaps,[8,8,9,8,8,9,8,9]);assert.equal(r.audit.events[0].sourceStart,11);assert.equal(r.audit.events.at(-1).sourceEnd,67);
});
test('round M1 uses distinct boundaries, including a seam after the final source stitch',()=>{
 const r=build({start:11,target:14,mode:'round',method:'m1',left:0,right:0});
 assert.deepEqual(r.audit.gaps,[3,4,4]);assert.deepEqual(r.audit.events.map(e=>e.afterSource),[3,7,11]);assert.match(textPlan(r),/round seam/);
});
test('flat M1 keeps insertions inside the unprotected working area',()=>{
 const r=build({start:12,target:15,method:'m1',left:2,right:2});
 assert.deepEqual(r.audit.events.map(e=>e.afterSource),[4,6,8]);assert.deepEqual(r.audit.gaps,[2,2,2,2]);
 assert.throws(()=>build({start:5,target:10,method:'m1',left:0,right:0}),/distinct gaps/);
});
test('KFB consumes one original per change and can double the full working area',()=>{
 const r=build({start:6,target:12,left:0,right:0,method:'kfb'});assert.equal(r.audit.events.length,6);assert.ok(r.audit.events.every(e=>e.sourceStart===e.sourceEnd&&e.outputEnd-e.outputStart===1));assert.deepEqual(r.audit.gaps,[0,0,0,0,0,0,0]);
});
test('K2tog consumes disjoint pairs and cannot use protected edges',()=>{
 const r=build({start:10,target:7,left:1,right:1,method:'k2tog'});
 assert.equal(r.audit.source,10);assert.equal(r.audit.output,7);
 const consumed=r.audit.events.flatMap(e=>[e.sourceStart,e.sourceEnd]);assert.equal(new Set(consumed).size,6);assert.ok(consumed.every(i=>i>1&&i<10));
 assert.throws(()=>build({start:10,target:5,left:1,right:1,method:'k2tog'}),/Not enough/);
});
test('no-change rows may consist entirely of protected edges',()=>{
 const r=build({start:4,target:4,left:2,right:2,method:'m1'});assert.equal(r.audit.changes,0);assert.deepEqual(r.audit.gaps,[0]);assert.equal(r.audit.steps.length,2);
});
test('mode, direction, bounds and per-plan operation limits are explicit',()=>{
 for(const extra of [{mode:'round'},{target:70,method:'kfb'},{target:90,method:'k2tog'},{left:60,right:30},{start:500,target:751,left:0,right:0}])assert.throws(()=>build(extra));
 const r=build({start:1000,target:1250,left:2,right:2});assert.equal(r.audit.changes,250);assert.ok(r.audit.steps.length<=503);
});
test('audit rejects missing coverage, changed technique, extra operations and false edge tags',()=>{
 const base=plan(example);
 for(const mutate of [
  r=>r.segments.pop(),
  r=>{r.segments.find(s=>s.kind==='kfb').kind='m1'},
  r=>{r.segments[0].edge=null},
  r=>{r.segments.find(s=>s.kind==='kfb').count=2},
  r=>{r.segments[0].count=-1}
 ]){const r=structuredClone(base);mutate(r);assert.throws(()=>audit(r))}
});
test('audit recomputes gap balance instead of trusting generator metadata',()=>{
 const r=plan(example),plain=r.segments.filter(s=>s.kind==='plain'&&s.edge===null);plain[0].count-=2;plain[1].count+=2;
 r.gaps=Array(8).fill(8);assert.throws(()=>audit(r),/evenly distributed/);
});
test('audit rejects a repeated M1 boundary even if net counts would balance',()=>{
 const r=plan(p({start:5,target:7,method:'m1',mode:'round',left:0,right:0}));
 r.segments=[{kind:'plain',count:2,edge:null},{kind:'m1',count:1,edge:null},{kind:'m1',count:1,edge:null},{kind:'plain',count:3,edge:null}];
 assert.throws(()=>audit(r),/distinct internal/);
});
test('small plans agree with an independent source-token simulator across techniques',t=>{
 let valid=0,invalid=0;
 for(let start=1;start<=60;start++)for(let changes=0;changes<=20;changes++)for(const method of ['m1','kfb','k2tog'])for(const mode of ['flat','round'])for(const edge of mode==='flat'?[0,1]:[0]){
  const target=start+(method==='k2tog'?-changes:changes),interior=start-2*edge;
  const allowed=target>=1&&interior>=0&&(!changes||(method==='m1'?interior>=changes+(mode==='flat'?1:0):interior>=changes*(method==='kfb'?1:2)));
  const input=p({start,target,method,mode,left:edge,right:edge});
  if(!allowed){assert.throws(()=>plan(input));invalid++;continue}
  const r=plan(input),source=Array.from({length:start},(_,i)=>i+1),consumed=[],output=[];
  for(const s of r.segments){
   if(s.kind==='plain'){const chunk=source.splice(0,s.count);consumed.push(...chunk);output.push(...chunk)}
   else if(s.kind==='m1')output.push('new');
   else if(s.kind==='kfb'){const v=source.shift();consumed.push(v);output.push(v,v)}
   else{const pair=source.splice(0,2);assert.equal(pair.length,2);assert.ok(pair[0]>edge&&pair[1]<=start-edge);consumed.push(...pair);output.push(pair[0])}
  }
  assert.equal(source.length,0);assert.deepEqual(consumed,Array.from({length:start},(_,i)=>i+1));assert.equal(output.length,target);assert.equal(audit(r).output,target);valid++;
 }
 assert.ok(valid>5000);assert.ok(invalid>0);t.diagnostic(valid+' valid plans and '+invalid+' rejected cases checked with independent simulation.');
});
test('project round trip rebuilds exact instructions, output ranges and gap receipt',()=>{
 const r=build({notes:'Needle notes'}),round=plan(JSON.parse(projectJSON(r)));assert.deepEqual(audit(round),r.audit);
 assert.equal(JSON.parse(reportJSON(r)).audit.steps.length,r.audit.steps.length);assert.match(textPlan(r),/Needle notes/);
});
test('complete event CSV and HTML do not truncate at the table page boundary',()=>{
 const r=build({start:120,target:155,left:0,right:0});
 assert.equal(eventsCSV(r).split('\r\n').length,37);assert.match(reportHTML(r),/Change/);assert.equal(r.audit.events.length,35);assert.equal(page(r.audit.events,1).items[0].number,21);
});
test('generated SVG contains exactly one cell for each original stitch and labels all changes',()=>{
 const r=build({start:101,target:108,mode:'round',method:'m1',left:0,right:0}),svg=mapSVG(r);
 assert.equal((svg.match(/<rect x=/g)||[]).length,101);assert.equal((svg.match(/<path d=/g)||[]).length,7);assert.match(svg,/Source 101/);assert.match(svg,/not an application screenshot/);assert.match(svg,/map-title map-desc/);
});
test('all imported title and notes are escaped in active HTML and SVG contexts',()=>{
 const r=build({title:'</title><script>alert(1)</script>',notes:'<img src=x onerror=alert(1)>'});
 const html=reportHTML(r);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;img/);assert.ok(!mapSVG(r).includes('<script>'));
});
