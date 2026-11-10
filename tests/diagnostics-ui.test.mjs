// Browser fixtures exercise the normal Dev app and offline shell, not real Qwen/device quality.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test,before,after} from 'node:test';
import {chromium} from 'playwright';
const root=new URL('..',import.meta.url).pathname;
const out=mkdtempSync(join(tmpdir(),'mp-diagnostics-ui-'));
execFileSync('node',['scripts/build.mjs','--channel','dev','--out',out],{cwd:root,stdio:'pipe'});
const runtimeURL='https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/lib/index.js';
const runtime=`export async function hasModelInCache(){return true;}
export async function CreateMLCEngine(_model,{initProgressCallback}){
 const s=globalThis.__startup;if(s){s.called=true;initProgressCallback({progress:.2});while(s.hold)await new Promise(r=>setTimeout(r,10));if(s.fail)throw new Error(s.fail);}
 return {chat:{completions:{async create({messages}){
 if(messages[0].content.includes('Courier'))return new Promise(()=>{});
 const f=globalThis.__fixture;f.calls++;const r=f.responses.shift();
 if(r?.failure)throw Object.assign(new Error(r.failure),{name:r.name||'Error'});
 return {choices:[{message:{content:typeof r==='string'?r:JSON.stringify(r)}}]};
 }}},async unload(){}};
}`;
let browser,server,url;
before(async()=>{
 server=createServer((req,res)=>{
  const files={'/dev/':['index.html','text/html'],'/dev/offline-ai.js':['offline-ai.js','text/javascript'],'/dev/offline-worker.js':['offline-worker.js','text/javascript']};
  const f=files[req.url];if(!f){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':f[1]}).end(readFileSync(join(out,f[0])));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}/dev/`;
 browser=await chromium.launch();
});
after(async()=>{await browser?.close();if(server?.listening)await new Promise(r=>server.close(r));rmSync(out,{recursive:true,force:true});});
async function open(width=400,setup,{time,timezoneId='UTC'}={}){
 const ctx=await browser.newContext({viewport:{width,height:951},hasTouch:true,isMobile:true,acceptDownloads:true,timezoneId});
 await ctx.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:{async requestAdapter(){return {features:new Set(['shader-f16'])};}}}));
 if(setup)await ctx.addInitScript(setup);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 if(time)await page.clock.install({time:new Date(time)});
 await page.goto(url);
 return {ctx,page,errors};
}
async function install(page){
 await page.evaluate(async({runtimeURL,runtime})=>{await(await caches.open('master-plan-offline-ai-runtime')).put(runtimeURL,new Response(runtime));},{runtimeURL,runtime});
 await page.click('#menuBtn');await page.click('[data-offline-model="1.5B"]');await page.getByText('1.5B model ready for offline play.').waitFor();
}
async function fixture(page,responses){await page.evaluate(responses=>{globalThis.__fixture={calls:0,responses};},responses);}
async function menu(page){await page.click('#menuBtn');await page.locator('#qwenDiagnostics').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-act="diagnosticsExport"]').disabled);}
async function download(page){
 await page.waitForFunction(()=>!document.querySelector('[data-act="diagnosticsExport"]').disabled);
 const pending=page.waitForEvent('download',{timeout:10000});await page.click('[data-act="diagnosticsExport"]');const file=await pending;
 return {name:file.suggestedFilename(),json:JSON.parse(readFileSync(await file.path(),'utf8'))};
}
function events(log){return log.events;}

test('MP-075 MP-053 MP-054 diagnostics remain reachable with Qwen off and date controls validate at 400 and 669 pixels',async()=>{
 for(const width of [400,669]){
  const {ctx,page,errors}=await open(width);
  try{
   await menu(page);assert.match(await page.textContent('#qwenDiagnostics'),/retained events|events retained/i);
   const from=await page.inputValue('#diagnosticsFrom'),through=await page.inputValue('#diagnosticsThrough');assert.match(from,/^\d{4}-\d\d-\d\d$/);assert.equal(from,through);
   const controls=await page.locator('#qwenDiagnostics input,#qwenDiagnostics button').evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
   assert.ok(controls.every(c=>c.width>=44&&c.height>=44));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.fill('#diagnosticsFrom','');await page.getByText(/choose both.*date|enter both.*date/i).waitFor();assert.equal(await page.locator('[data-act="diagnosticsExport"]').isDisabled(),true);
   await page.fill('#diagnosticsFrom','2099-01-02');await page.fill('#diagnosticsThrough','2099-01-01');await page.getByText(/through.*before|from.*after|start.*after|from must be on or before through/i).waitFor();
   await page.fill('#diagnosticsFrom','2099-01-01');await page.getByText(/no diagnostic events|no events.*selected/i).waitFor();assert.equal(await page.locator('[data-act="diagnosticsExport"]').isDisabled(),true);
   assert.deepEqual(errors,[]);
  }finally{await ctx.close();}
 }
});

test('MP-075 untouched date defaults follow local midnight while edited and missing dates survive background writes',async()=>{
 const {ctx,page,errors}=await open(400,undefined,{time:'2026-11-11T04:59:59Z',timezoneId:'America/New_York'});
 async function observedAt(time,date){
  await page.clock.setSystemTime(new Date(time));
  await page.evaluate(()=>window.MP_QWEN_DIAGNOSTICS.record('app.launch','observed',{stage:'launch'}));
  await page.waitForFunction(date=>document.querySelector('[data-diagnostics-range]').textContent.includes(`Newest: ${date}`),date);
 }
 try{
  await menu(page);assert.equal(await page.inputValue('#diagnosticsThrough'),'2026-11-10');
  await observedAt('2026-11-11T05:00:01Z','2026-11-11');
  assert.equal(await page.inputValue('#diagnosticsFrom'),'2026-11-10');
  assert.equal(await page.inputValue('#diagnosticsThrough'),'2026-11-11','untouched range extends to the new local day');
  await page.fill('#diagnosticsThrough','2026-11-10');
  await observedAt('2026-11-12T05:00:01Z','2026-11-12');
  assert.equal(await page.inputValue('#diagnosticsThrough'),'2026-11-10','a user-selected date stays fixed');
  await page.fill('#diagnosticsFrom','');
  await observedAt('2026-11-13T05:00:01Z','2026-11-13');
  assert.equal(await page.inputValue('#diagnosticsFrom'),'');
  await page.getByText(/choose both.*date|enter both.*date/i).waitFor();
  assert.equal(await page.locator('[data-act="diagnosticsExport"]').isDisabled(),true);assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
});

test('MP-075 MP-065 cached Dev cold-reopens offline and exports sanitized correlated attempts twice without consuming records',async()=>{
 const {ctx,page:initial,errors}=await open(400,()=>{
  Object.defineProperty(navigator,'canShare',{value:()=>false});
 });let page=initial;
 try{
  await install(page);await page.close();await ctx.setOffline(true);page=await ctx.newPage();await page.goto(url);await page.getByText('Offline AI ready',{exact:false}).waitFor();
  const sentinel='SECRET-PROMPT-DO-NOT-LOG-7239',reply='SECRET-REPLY-DO-NOT-LOG-7240',save='SECRET-SAVE-DO-NOT-LOG-7241';
  await page.evaluate(save=>{const town=ENGINE.newGame();town.chats.bridge=[{who:'you',text:save}];localStorage.setItem('masterplan.dev.save',JSON.stringify(town));},save);
  await page.reload();await page.getByText('Offline AI ready',{exact:false}).waitFor();
  await fixture(page,[{title:'SECRET-TITLE-DO-NOT-LOG',summary:reply,plan:{homes:20,shops:2,parking:0},reply},{failure:reply}]);
  await page.click('[data-act="initiative"]');await page.fill('#initDesc',`Build homes at the East End field. ${sentinel}`);await page.locator('[data-form="init"] .btn.primary').click();await page.getByRole('heading',{name:'SECRET-TITLE-DO-NOT-LOG',exact:true}).waitFor();
  await page.fill('#negInput',`Add green space ${sentinel}`);await page.locator('[data-form="neg"] button').click();await page.locator('.request-feedback').waitFor();
  await page.getByRole('button',{name:'Close',exact:true}).click();await menu(page);
  const first=await download(page),serialized=JSON.stringify(first.json);assert.match(first.name,/^master-plan-qwen-dev-\d{4}-\d\d-\d\d-to-\d{4}-\d\d-\d\d\.json$/);
  for(const secret of [sentinel,reply,save,'SECRET-TITLE-DO-NOT-LOG'])assert.equal(serialized.includes(secret),false,secret);
  const ev=events(first.json);assert.ok(ev.some(e=>e.name==='plan.application'&&e.outcome==='applied'));assert.ok(ev.some(e=>e.name==='plan.final'&&e.outcome==='unavailable'));
  const app=ev.find(e=>e.name==='plan.application'&&e.outcome==='applied');const requestId=app.requestId||app.metadata?.requestId;assert.ok(requestId);
  assert.ok(ev.filter(e=>(e.requestId||e.metadata?.requestId)===requestId).length>=5,'request crosses queue, generation, validation, application');
  assert.ok(ev.every((e,i)=>!i||e.timestamp>=ev[i-1].timestamp));assert.ok(ev.every(e=>e.revision&&e.build));
  assert.match(serialized,/Qwen2\.5-1\.5B-Instruct-q4f16_1-MLC/);assert.match(serialized,/0\.2\.87/);
  const stored=await page.evaluate(async()=>{
   const dbs=await indexedDB.databases();const all=[];
   for(const {name} of dbs.filter(d=>/diagnostic/i.test(d.name))){const db=await new Promise((r,j)=>{const q=indexedDB.open(name);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});
    for(const s of db.objectStoreNames){all.push(await new Promise((r,j)=>{const q=db.transaction(s).objectStore(s).getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);}));}db.close();}
   return JSON.stringify(all);
  });for(const secret of [sentinel,reply,save])assert.equal(stored.includes(secret),false);
  const second=await download(page);assert.equal(second.json.events.length,first.json.events.length);
  await page.close();page=await ctx.newPage();await page.goto(url);await page.getByText('Offline AI ready',{exact:false}).waitFor();await menu(page);const third=await download(page);assert.ok(third.json.events.length>=first.json.events.length);
  const queued=await page.evaluate(()=>{
   const requestId=window.MP_QWEN_DIAGNOSTICS.id();
   void window.MP_QWEN_DIAGNOSTICS.record('request.queued','queued',{requestId,action:'other',stage:'queue'});
   return {requestId,disabled:document.querySelector('[data-act="diagnosticsExport"]').disabled};
  });
  assert.equal(queued.disabled,true,'a new event immediately invalidates the prepared export');
  const queuedLog=await download(page);assert.ok(events(queuedLog.json).some(e=>e.metadata.requestId===queued.requestId),'the refreshed export includes the newly queued event');
  const beforeShutdown=Number.parseInt(await page.locator('[data-diagnostics-preview]').textContent());
  await page.click('[data-act="offlineOff"]');await page.getByText('Offline AI is off. Your download is still saved.',{exact:true}).waitFor();
  await page.waitForFunction(count=>Number.parseInt(document.querySelector('[data-diagnostics-preview]').textContent)>count,beforeShutdown);
  const fourth=await download(page),shutdown=events(fourth.json).filter(e=>e.name==='shutdown.begin'||e.name==='shutdown.finish');
  assert.equal(shutdown.length,2);assert.ok(shutdown[0].metadata.requestId);assert.equal(shutdown[0].metadata.requestId,shutdown[1].metadata.requestId);assert.ok(shutdown.every(e=>e.metadata.action==='other'));
  assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
});

test('MP-075 startup failure, interrupted startup and retry preserve Diagnostics dates during progress',async()=>{
 const {ctx,page,errors}=await open(669);
 try{
  await install(page);await page.evaluate(()=>{localStorage.setItem('masterplan.offline-ai.dev.starting','1');});await page.reload();
  await menu(page);await page.getByText(/startup was interrupted/).waitFor();
  const from=await page.inputValue('#diagnosticsFrom');await page.fill('#diagnosticsFrom','2000-01-01');
  await page.evaluate(()=>{globalThis.__startup={hold:true,fail:'SECRET-STARTUP-FAILURE'};});await page.click('[data-act="offlineRetry"]');await page.waitForFunction(()=>__startup.called);assert.equal(await page.inputValue('#diagnosticsFrom'),'2000-01-01');
  await page.evaluate(()=>{__startup.hold=false;});await page.getByText('SECRET-STARTUP-FAILURE',{exact:true}).waitFor();
  await page.evaluate(()=>{__startup.fail='';});await page.click('[data-act="offlineRetry"]');await page.getByText('1.5B model ready for offline play.',{exact:true}).waitFor();
  await page.fill('#diagnosticsFrom',from);await page.evaluate(()=>Object.defineProperty(navigator,'canShare',{value:()=>false}));const log=await download(page);
  assert.ok(events(log.json).some(e=>e.name==='startup.interrupted'&&e.outcome==='incomplete'));assert.ok(events(log.json).some(e=>e.name==='startup.retry'));assert.ok(events(log.json).some(e=>e.name==='startup.error'));assert.ok(events(log.json).some(e=>e.name==='startup.initialization'&&e.outcome==='failed'));
  const startupEvents=events(log.json).filter(e=>['startup.begin','startup.check','startup.initialization','startup.ready','startup.error'].includes(e.name));
  assert.ok(startupEvents.every(e=>Number.isInteger(e.metadata.attempt)&&e.metadata.attempt>0),'every startup stage identifies its attempt');
  for(const id of new Set(startupEvents.map(e=>e.metadata.startupId))){const attempts=new Set(startupEvents.filter(e=>e.metadata.startupId===id).map(e=>e.metadata.attempt));assert.equal(attempts.size,1,'a startup keeps the same attempt across checks and terminal events');}
  const retry=events(log.json).filter(e=>e.name==='startup.retry').at(-1);assert.equal(retry.metadata.attempt,2,'retry advances the failed startup attempt');
  const begin=startupEvents.find(e=>e.name==='startup.begin'&&e.sessionId===retry.sessionId&&e.metadata.attempt===retry.metadata.attempt);assert.ok(begin);
  assert.ok(startupEvents.some(e=>e.name==='startup.ready'&&e.metadata.startupId===begin.metadata.startupId&&e.metadata.attempt===2));
  assert.equal(JSON.stringify(log.json).includes('SECRET-STARTUP-FAILURE'),false);assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
});

test('MP-075 local file share is invoked with active user gesture, and unavailable diagnostic storage leaves gameplay and saves working',async()=>{
 const shared=await open(400,()=>{
  Object.defineProperty(navigator,'canShare',{value:()=>true});Object.defineProperty(navigator,'share',{value:async({files})=>{globalThis.__shared={active:navigator.userActivation.isActive,name:files[0].name,text:await files[0].text()};}});
 });
 try{await menu(shared.page);await shared.page.click('[data-act="diagnosticsExport"]');await shared.page.waitForFunction(()=>!!globalThis.__shared?.text);const result=await shared.page.evaluate(()=>__shared);assert.equal(result.active,true);assert.ok(JSON.parse(result.text).events.length);assert.deepEqual(shared.errors,[]);}finally{await shared.ctx.close();}
 const {ctx,page,errors}=await open(400,()=>Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('Unavailable','SecurityError');}}));
 try{
  await page.click('#menuBtn');await page.locator('[data-diagnostics-storage]').filter({hasText:/storage.*unavailable/i}).waitFor();await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.click('[data-open="bridge"]');await page.click('[data-chip="1"]');await page.waitForFunction(()=>!!localStorage.getItem('masterplan.dev.save'));assert.ok(JSON.parse(await page.evaluate(()=>localStorage.getItem('masterplan.dev.save'))).proposals.length);assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
});
