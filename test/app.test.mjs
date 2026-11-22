import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mount} from '../src/app.mjs';
import {example} from '../src/example.mjs';
import {readUTF8,downloads} from '../src/files.mjs';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
function setup(){const dom=new JSDOM(html),saved=[];return {dom,d:dom.window.document,app:mount(dom.window.document,{save:(...a)=>saved.push(a)}),saved}}
function event(t,id,type){t.d.getElementById(id).dispatchEvent(new t.dom.window.Event(type,{bubbles:true,cancelable:true}))}
function edit(t,id,value){t.d.getElementById(id).value=value;event(t,id,'input')}
test('simulated example builds count receipt, all instructions, SVG and six exports',()=>{
 const t=setup();t.d.getElementById('sample').click();assert.equal(t.app.getResult().audit.output,85);assert.equal(t.d.querySelectorAll('#map rect').length,79);
 assert.equal(t.d.querySelectorAll('#instructions li').length,t.app.getResult().audit.steps.length);
 for(const b of t.d.querySelectorAll('[data-export]'))b.click();assert.equal(t.saved.length,6);assert.equal(JSON.parse(t.saved[0][2]).start,78);t.dom.window.close();
});
test('dirty or invalid input blocks exports and leaves previous result explicitly stale',()=>{
 const t=setup();t.app.install(example);const previous=t.app.getResult();edit(t,'target','70');event(t,'settings','submit');
 assert.equal(t.app.getResult(),previous);assert.equal(t.app.isFresh(),false);assert.match(t.d.getElementById('status').textContent,/stale/);for(const b of t.d.querySelectorAll('[data-export]'))assert.equal(b.disabled,true);t.dom.window.close();
});
test('changing to a round clears protected edges and uses correct source boundary notation',()=>{
 const t=setup();t.app.install(example);t.d.getElementById('mode').value='round';event(t,'mode','change');
 assert.equal(t.d.getElementById('left').value,'0');assert.equal(t.d.getElementById('right').value,'0');t.d.getElementById('method').value='m1';event(t,'method','change');event(t,'settings','submit');
 assert.equal(t.app.getResult().project.left,0);assert.match(t.d.getElementById('instructions').textContent,/round seam/);t.dom.window.close();
});
test('position pagination leaves complete exports intact',()=>{
 const t=setup();t.app.install({...example,start:120,target:155,left:0,right:0});t.d.getElementById('next').click();assert.match(t.d.getElementById('page').textContent,/Page 2/);assert.equal(t.d.querySelectorAll('#events tr').length,15);
 t.d.querySelector('[data-export=json]').click();assert.equal(JSON.parse(t.saved[0][2]).audit.events.length,35);t.dom.window.close();
});
test('map markup remains literal and accessible IDs resolve to SVG labels',()=>{
 const t=setup();t.app.install({...example,title:'<img src=x onerror=alert(1)>'});assert.equal(t.d.querySelectorAll('#map img').length,0);
 const svg=t.d.querySelector('#map svg');for(const id of svg.getAttribute('aria-labelledby').split(' '))assert.ok(svg.querySelector('[id="'+id+'"]'));
 assert.equal(t.d.querySelectorAll('#title').length,1);t.dom.window.close();
});
test('pending imports cannot overwrite subsequent draft edits',async()=>{
 const t=setup();t.app.install(example);let release;
 Object.defineProperty(t.d.getElementById('project-file'),'files',{configurable:true,value:[{size:100,arrayBuffer:()=>new Promise(r=>{release=r})}]});
 event(t,'project-file','change');edit(t,'notes','Keep this draft');release(new TextEncoder().encode(JSON.stringify({...example,title:'Wrong replacement'})).buffer);await new Promise(r=>setTimeout(r,0));
 assert.equal(t.d.getElementById('notes').value,'Keep this draft');assert.notEqual(t.d.getElementById('title').value,'Wrong replacement');t.dom.window.close();
});
test('valid project import rebuilds; invalid project and clear preserve atomic behavior',async()=>{
 const t=setup();
 for(const input of [example,{...example,start:0}]){
  const bytes=new TextEncoder().encode(JSON.stringify(input));Object.defineProperty(t.d.getElementById('project-file'),'files',{configurable:true,value:[{size:bytes.length,arrayBuffer:async()=>bytes.buffer}]});event(t,'project-file','change');await new Promise(r=>setTimeout(r,0));
 }
 assert.equal(t.app.getResult().audit.source,78);assert.match(t.d.getElementById('status').textContent,/intact/);t.d.getElementById('clear').click();assert.equal(t.app.getResult(),null);assert.equal(t.d.querySelectorAll('#map svg').length,0);t.dom.window.close();
});
test('strict UTF8 limits and actual Blob payloads are verified without native download claims',async()=>{
 await assert.rejects(()=>readUTF8({size:50000},40000),/size/);await assert.rejects(()=>readUTF8({size:1,arrayBuffer:async()=>new Uint8Array([255]).buffer},10));
 const t=setup(),oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL,blobs=[],revoked=[];
 URL.createObjectURL=b=>{blobs.push(b);return 'blob:'+blobs.length};URL.revokeObjectURL=u=>revoked.push(u);t.dom.window.HTMLAnchorElement.prototype.click=function(){};
 try{const d=downloads(t.d);d.save('notes.txt','text/plain','Exact\r\ntext');assert.equal(await blobs[0].text(),'Exact\r\ntext');d.save('b','text/plain','b');d.dispose();assert.equal(revoked.length,2)}
 finally{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;t.dom.window.close()}
});
test('simulated labels, live status, table caption, skip link and responsive CSS exist',async()=>{
 const t=setup();for(const e of t.d.querySelectorAll('input:not([type=file]),select,textarea'))assert.ok(t.d.querySelector('label[for="'+e.id+'"]'),e.id);
 assert.ok(t.d.querySelector(t.d.querySelector('.skip').getAttribute('href')));assert.equal(t.d.getElementById('status').getAttribute('role'),'status');assert.ok(t.d.querySelector('table caption'));
 const css=await readFile(new URL('../style.css',import.meta.url),'utf8');assert.match(css,/max-width:760px/);assert.match(css,/focus-visible/);t.dom.window.close();
});
