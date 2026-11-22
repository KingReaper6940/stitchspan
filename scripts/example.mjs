import {mkdir,writeFile} from 'node:fs/promises';
import {plan} from '../src/plan.mjs';
import {audit} from '../src/audit.mjs';
import {example} from '../src/example.mjs';
import {projectJSON,textPlan,eventsCSV,reportJSON,reportHTML,mapSVG} from '../src/exports.mjs';
const candidate=plan(example),r={...candidate,audit:audit(candidate)},out=new URL('../examples/',import.meta.url);await mkdir(out,{recursive:true});
for(const [name,text] of [['project.json',projectJSON(r)],['plan.txt',textPlan(r)],['changes.csv',eventsCSV(r)],['report.json',reportJSON(r)],['plan.html',reportHTML(r)],['source-map.svg',mapSVG(r)]])await writeFile(new URL(name,out),text);
console.log('Wrote six complete synthetic plan artifacts.');console.log({source:r.audit.source,output:r.audit.output,changes:r.audit.changes,gaps:r.audit.gaps});
