import {METHODS} from './model.mjs';
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function instruction(s,p){
 if(s.kind==='plain')return 'Work '+s.count+' plain stitch'+(s.count===1?'':'es')+(s.edge?' ('+s.edge+' protected edge)':'')+'.';
 if(s.kind==='m1')return 'M1 after source stitch '+s.afterSource+(s.afterSource===p.start?' (round seam, before source stitch 1)':' (between source stitches '+s.afterSource+' and '+(s.afterSource+1)+')')+'.';
 return s.kind.toUpperCase()+' using source '+(s.sourceStart===s.sourceEnd?'stitch '+s.sourceStart:'stitches '+s.sourceStart+'–'+s.sourceEnd)+'.';
}
export const projectJSON=r=>JSON.stringify(r.project,null,2)+'\n';
export const reportJSON=r=>JSON.stringify({schema:'stitchspan-report/1',project:r.project,audit:r.audit},null,2)+'\n';
export function textPlan(r){
 const p=r.project,a=r.audit;
 return (p.title||'Stitchspan plan')+'\n'+p.mode+' · '+METHODS[p.method].label+'\n'+p.start+' source stitches → '+p.target+' output stitches; '+a.changes+' changes.\nProtected edges: '+p.left+' / '+p.right+'. Plain-stitch gaps: '+a.minGap+'–'+a.maxGap+'.\nSource numbering follows work order from 1; this is not a conventional knitting chart.\n\n'+a.steps.map(s=>s.number+'. '+instruction(s,p)+' Output '+s.outputStart+'–'+s.outputEnd+'.').join('\n')+'\n\nCount audit: consumed '+a.source+', produced '+a.output+'.\n'+p.notes+'\n\nSingle-row arithmetic only; not a garment fit, fabric, symmetry or stitch-pattern guarantee.\n';
}
export function eventsCSV(r){
 const rows=[['Change','Technique','Source start','Source end','After source','Output start','Output end'],...r.audit.events.map(e=>[e.number,e.kind,e.sourceStart??'',e.sourceEnd??'',e.afterSource??'',e.outputStart,e.outputEnd])];
 return rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
}
export function mapSVG(r){
 const p=r.project,a=r.audit,e=escape,cols=40,rows=Math.ceil(p.start/cols),height=165+rows*54;
 const marks=new Map();for(const event of a.events)if(event.sourceStart!==null)for(let i=event.sourceStart;i<=event.sourceEnd;i++)marks.set(i,event.kind);
 let body='';
 for(let i=1;i<=p.start;i++){
  const x=57+((i-1)%cols)*17,y=115+Math.floor((i-1)/cols)*54,protectedEdge=i<=p.left||i>p.start-p.right,kind=marks.get(i)||'plain',fill=protectedEdge?'#c5ccdc':kind==='kfb'?'#e7a87e':kind==='k2tog'?'#b2a5da':'#c7e7e5';
  body+='<rect x="'+x+'" y="'+y+'" width="14" height="24" rx="4" fill="'+fill+'"><title>Source '+i+' · '+e(protectedEdge?'protected edge':kind)+'</title></rect>';
  if((i-1)%cols===0||i%10===0||i===p.start)body+='<text x="'+x+'" y="'+(y+40)+'" font-size="11">'+i+'</text>';
 }
 for(const event of a.events)if(event.kind==='m1'){
  const i=event.afterSource,x=72+((i-1)%cols)*17,y=115+Math.floor((i-1)/cols)*54;
  body+='<path d="M '+x+' '+(y-3)+' l -5 -8 h 10 Z" fill="#145e76"><title>M1 after source '+i+'</title></path>';
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" width="780" height="'+height+'" viewBox="0 0 780 '+height+'" role="img" aria-labelledby="title desc"><title id="title">'+e(p.title||'Stitchspan source map')+'</title><desc id="desc">Actual generated source-stitch map, not an application screenshot. Work order left to right; cells represent original stitches, not output stitches. All exact positions are in the event table and text plan.</desc><rect width="780" height="'+height+'" rx="12" fill="#f5f7ff"/><g fill="#293e60" font-family="system-ui,sans-serif"><text x="35" y="35" font-size="19">'+e(Array.from(p.title||'Stitchspan source map').slice(0,48).join(''))+'</text><text x="35" y="63" font-size="13">'+p.start+' source · '+p.target+' output · '+a.changes+' changes · '+e(p.mode+' / '+p.method)+'</text><text x="35" y="88" font-size="12">Teal: plain · Gray: protected · Orange: KFB · Purple: K2tog · Triangle: M1</text>'+body+'<text x="35" y="'+(height-16)+'" font-size="12">Count order only, not stitch symbols or a scaled fabric diagram.</text></g></svg>\n';
}
export function reportHTML(r){
 const e=escape,p=r.project,a=r.audit;
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;"><title>'+e(p.title||'Stitchspan plan')+'</title><style>body{font:16px/1.6 system-ui;max-width:1000px;margin:auto;padding:30px;color:#293e60}pre,td{white-space:pre-wrap;overflow-wrap:anywhere}svg{width:100%;height:auto}table{width:100%;border-collapse:collapse}td,th{padding:10px;text-align:left;border:1px solid #bccbdc}pre{font:14px/1.7 monospace}</style><h1>'+e(p.title||'Stitchspan plan')+'</h1><pre>'+e(textPlan(r))+'</pre>'+mapSVG(r)+'<h2>Complete change positions</h2><table><tr><th>Change</th><th>Source instruction</th><th>Output range</th></tr>'+a.events.map(event=>'<tr><td>'+event.number+'</td><td>'+e(instruction(event,p))+'</td><td>'+event.outputStart+'–'+event.outputEnd+'</td></tr>').join('')+'</table></html>';
}
