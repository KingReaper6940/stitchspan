import {integerInput,page,METHODS} from './model.mjs';
import {plan} from './plan.mjs';
import {audit} from './audit.mjs';
import {example} from './example.mjs';
import {instruction,projectJSON,textPlan,eventsCSV,reportJSON,reportHTML,mapSVG} from './exports.mjs';
import {readUTF8,downloads} from './files.mjs';
export function mount(document,options={}){
 const $=id=>document.getElementById(id),save=options.save||downloads(document).save;
 let result=null,fresh=false,index=0,revision=0;
 const buttons=[...document.querySelectorAll('[data-export]')];
 const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n};
 function status(text,kind=''){$('status').textContent=text;$('status').className=kind}
 function stale(){revision++;fresh=false;buttons.forEach(b=>b.disabled=true);$('freshness').textContent=result?'VIEW IS STALE':'NOT BUILT';status('Inputs changed. Previous results are stale; make the plan again to enable exports.','stale')}
 function read(){
  const p={schema:'stitchspan/1',title:$('title').value,mode:$('mode').value,method:$('method').value,notes:$('notes').value};
  for(const k of ['start','target','left','right'])p[k]=integerInput($(k).value);return p;
 }
 function techniqueHelp(){
  const m=METHODS[$('method').value];
  $('method-help').textContent=m?'Each '+$('method').value.toUpperCase()+' consumes '+m.consume+' original stitch(es) and produces '+m.produce+'. Technique names describe count rules, not a knitting tutorial.':'Choose a supported technique.';
 }
 function renderEvents(){
  const slice=page(result.audit.events,index);index=slice.current;
  $('events').replaceChildren(...slice.items.map(e=>{const row=document.createElement('tr');row.append(node('td',e.number),node('td',instruction(e,result.project)),node('td',e.outputStart===e.outputEnd?e.outputStart:e.outputStart+'–'+e.outputEnd));return row}));
  $('no-events').hidden=result.audit.events.length>0;$('event-count').textContent=result.audit.changes+' changes';
  $('page').textContent='Page '+(index+1)+' of '+slice.pages+' · 20 per page';$('previous').disabled=index===0;$('next').disabled=index>=slice.pages-1;
 }
 function apply(candidate){
  const receipt=audit(candidate);result={...candidate,audit:receipt};fresh=true;revision++;index=0;
  buttons.forEach(b=>b.disabled=false);$('freshness').textContent='COUNT AUDIT PASSED';
  $('metrics').replaceChildren(...[['source stitches',receipt.source],['output stitches',receipt.output],['changes',receipt.changes]].map(([label,value])=>{const div=document.createElement('div');div.append(node('strong',value),node('span',label));return div}));
  $('audit').textContent='Consumed exactly '+receipt.source+' original stitches. Produced exactly '+receipt.output+'. Protected edges and change positions checked.';
  $('spacing').textContent='Plain-stitch gaps: '+receipt.gaps.join(', ')+'. Each gap differs by at most one. Flat end gaps have equal weight to interior gaps; mirror symmetry is not guaranteed.';
  // Only our numeric geometry and escaped project title enter this SVG.
  $('map').innerHTML=mapSVG(result);
  $('instructions').replaceChildren(...receipt.steps.map(s=>{const li=node('li',instruction(s,result.project));li.append(node('span','Output positions '+s.outputStart+'–'+s.outputEnd));return li}));
  $('step-count').textContent=receipt.steps.length+' work steps';renderEvents();
  status('Plan ready. '+receipt.changes+' changes; all '+receipt.source+' source stitches accounted for. Save a project to keep your notes.');
 }
 function install(p){
  const candidate=plan(p);audit(candidate); // Reject invalid imports before touching form data.
  for(const k of ['title','start','target','mode','method','left','right','notes'])$(k).value=candidate.project[k];
  techniqueHelp();apply(candidate);
 }
 $('settings').addEventListener('input',stale);
 $('settings').addEventListener('change',stale);
 $('settings').addEventListener('submit',e=>{e.preventDefault();try{apply(plan(read()))}catch(error){stale();status(error.message+' Previous view is stale.','error')}});
 $('method').addEventListener('change',techniqueHelp);
 $('mode').addEventListener('change',()=>{if($('mode').value==='round'){$('left').value='0';$('right').value='0'}});
 $('sample').addEventListener('click',()=>install(example));
 $('round-sample').addEventListener('click',()=>install({...example,title:'Practice round',start:101,target:108,mode:'round',method:'m1',left:0,right:0,notes:''}));
 $('clear').addEventListener('click',()=>{
  $('settings').reset();revision++;fresh=false;result=null;index=0;buttons.forEach(b=>b.disabled=true);$('freshness').textContent='NOT BUILT';
  $('map').replaceChildren(node('p','Make a plan to see the source map.'));$('instructions').replaceChildren();$('events').replaceChildren();$('no-events').hidden=false;$('event-count').textContent='0 changes';$('step-count').textContent='No instructions yet';$('page').textContent='Page 1 of 1';$('previous').disabled=true;$('next').disabled=true;
  $('metrics').replaceChildren(...['source stitches','output stitches','changes'].map(label=>{const d=document.createElement('div');d.append(node('strong',0),node('span',label));return d}));$('audit').textContent='Your independent count check appears here.';$('spacing').textContent='Make a plan to inspect plain-stitch spacing.';techniqueHelp();status('Desk reset. Nothing was saved automatically.');
 });
 for(const [id,delta] of [['previous',-1],['next',1]])$(id).addEventListener('click',()=>{if(result){index+=delta;renderEvents()}});
 $('project-file').addEventListener('change',async()=>{
  const file=$('project-file').files?.[0];if(!file)return;const token=++revision;status('Reading project locally…');
  try{const text=await readUTF8(file,40000);if(token!==revision)return;if(text.length>40000)throw Error('Project text exceeds 40,000 units.');install(JSON.parse(text))}
  catch(error){if(token===revision)status('Project not imported; existing work intact. '+error.message,'error')}
  finally{$('project-file').value=''}
 });
 const outputs={project:['stitchspan-project.json','application/json',projectJSON],text:['stitchspan-plan.txt','text/plain',textPlan],csv:['stitchspan-changes.csv','text/csv',eventsCSV],json:['stitchspan-report.json','application/json',reportJSON],html:['stitchspan-plan.html','text/html',reportHTML],svg:['stitchspan-map.svg','image/svg+xml',mapSVG]};
 for(const b of buttons)b.addEventListener('click',()=>{if(!fresh||!result)return;try{const [name,type,fn]=outputs[b.dataset.export];save(name,type+';charset=utf-8',fn(result));status('Downloaded '+name+'. All changes included, regardless of the visible table page.')}catch(error){status('Download failed: '+error.message,'error')}});
 return {install,getResult:()=>result,isFresh:()=>fresh};
}
if(typeof document!=='undefined')mount(document);
