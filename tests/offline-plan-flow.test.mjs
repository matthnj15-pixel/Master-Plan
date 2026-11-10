// Real Pages shell/worker and provider adapter; Qwen replies are controlled fixtures.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test,before,after} from 'node:test';
import {chromium} from 'playwright';
const root=new URL('..',import.meta.url).pathname;
const out=mkdtempSync(join(tmpdir(),'mp-plan-offline-'));
execFileSync('node',['scripts/build.mjs','--channel','dev','--out',out],{cwd:root,stdio:'pipe'});
const runtimeURL='https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/lib/index.js';
const runtime=`
export async function hasModelInCache(){return true;}
export async function CreateMLCEngine(){return{chat:{completions:{async create({messages}){
 if(messages[0].content.includes('Courier'))return new Promise(()=>{});
 const f=globalThis.__qwenFixture;f.calls++;while(f.hold)await new Promise(r=>setTimeout(r,15));
 if(f.error)throw new Error(f.error);const value=f.responses.shift();
 return {choices:[{message:{content:typeof value==='string'?value:JSON.stringify(value)}}]};
}}},async unload(){}};}`;
let browser,server,url;
before(async()=>{
 server=createServer((req,res)=>{const file={'/dev/':['index.html','text/html'],'/dev/offline-ai.js':['offline-ai.js','text/javascript'],'/dev/offline-worker.js':['offline-worker.js','text/javascript']}[req.url];if(!file){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':file[1]}).end(readFileSync(join(out,file[0])));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}/dev/`;
 browser=await chromium.launch();
});
after(async()=>{await browser?.close();await new Promise(r=>server.close(r));rmSync(out,{recursive:true,force:true});});
async function open(width=400){
 const ctx=await browser.newContext({viewport:{width,height:951},hasTouch:true,isMobile:true});
 await ctx.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:{async requestAdapter(){return{features:new Set(['shader-f16'])};}}}));
 let page=await ctx.newPage();await page.goto(url);
 await page.evaluate(async({url,source})=>{await(await caches.open('master-plan-offline-ai-runtime')).put(url,new Response(source));},{url:runtimeURL,source:runtime});
 await page.click('#menuBtn');await page.click('[data-offline-model="1.5B"]');await page.getByText('1.5B model ready for offline play.').waitFor();
 await page.close();await ctx.setOffline(true);page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(url);await page.getByText('Offline AI ready',{exact:false}).waitFor();
 return{ctx,page,errors};
}
async function fixture(page,responses,hold=false){await page.evaluate(({responses,hold})=>{globalThis.__qwenFixture={responses,hold,calls:0};},{responses,hold});}
const draft={title:'East End Homes',place:'east_end',summary:'Homes and shops.',plan:{homes:20,shops:2,stories:2,parking:0},reply:'Done.'};
const readSave=page=>page.evaluate(()=>localStorage.getItem('masterplan.dev.save'));
async function startDraft(page,text='Build homes and shops at the East End field.'){
 await page.click('[data-act="initiative"]');await page.fill('#initDesc',text);await page.locator('[data-form="init"] .btn.primary').click();
}

test('MP-015 MP-026 MP-031 MP-033 MP-065 offline draft repair, intent recovery and revision use one accepted plan',async()=>{
 const {ctx,page,errors}=await open();
 await fixture(page,[{status:'unsupported',reason:'An airport is outside the supported fields.',reply:'An airport cannot be represented.'}]);
 await startDraft(page,'Build an airport at the East End field.');
 await page.locator('.request-feedback').waitFor();assert.match(await page.inputValue('#initDesc'),/airport/);
 assert.equal(await page.evaluate(()=>ENGINE.canProposeInitiative(JSON.parse(localStorage.getItem('masterplan.dev.save'))||ENGINE.newGame())),true);
 assert.equal(await page.evaluate(()=>__qwenFixture.calls),1);
 await fixture(page,['{malformed',draft]);await page.fill('#initDesc','Build homes and shops at the East End field.');await page.locator('[data-form="init"] .btn.primary').click();
 await page.getByRole('heading',{name:'East End Homes',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>__qwenFixture.calls),2);
 let town=JSON.parse(await readSave(page)),p=town.proposals.find(p=>p.mine);assert.deepEqual(p.plots,[[16,13],[17,13],[18,13],[16,14],[17,14],[18,14]]);
 const beforeCost=await page.textContent('[data-summary="funding"]');const beforeSVG=await page.locator('svg.plan-illustration').getAttribute('data-revision');
 await fixture(page,[{changes:{shops:4,green:1},reply:'I installed a stadium, too.',mood:'warmer'}]);
 await page.fill('#negInput','Add two shops and green space.');await page.locator('[data-form="neg"] button').click();
 await page.getByText('Plan updated:',{exact:false}).waitFor();
 town=JSON.parse(await readSave(page));p=town.proposals.find(p=>p.mine);assert.equal(p.plan.shops,4);assert.equal(p.plan.green,1);
 assert.notEqual(await page.textContent('[data-summary="funding"]'),beforeCost);
 assert.notEqual(await page.locator('svg.plan-illustration').getAttribute('data-revision'),beforeSVG);
 assert.equal(await page.getByText('I installed a stadium, too.',{exact:true}).count(),0);
 assert.match(await page.textContent('.plan-counts'),/4/);assert.deepEqual(errors,[]);await ctx.close();
});

test('MP-015 MP-026 MP-060 MP-065 late offline drafts cannot apply after close, provider change, turn advance or save replacement',async()=>{
 for(const action of ['close','provider','turn','replace']){
  const {ctx,page,errors}=await open();await fixture(page,[draft],true);await startDraft(page);
  await page.waitForFunction(()=>__qwenFixture.calls===1);
  await page.click('[data-act="close"]');
  if(action==='provider'){await page.click('#menuBtn');await page.click('[data-act="offlineOff"]');}
  if(action==='turn'){await page.click('#endBtn');}
  if(action==='replace'){await page.click('#menuBtn');await page.click('[data-act="newgame"]');await page.click('[data-act="newgameYes"]');}
  const before=await readSave(page);await page.evaluate(()=>__qwenFixture.hold=false);
  await page.waitForTimeout(180);assert.equal(await readSave(page),before,action+' must not write on stale completion');
  assert.deepEqual(errors,[]);await ctx.close();
 }
});

test('MP-015 MP-026 MP-065 stale negotiation preserves a newer quick edit and its relationship',async()=>{
 const {ctx,page,errors}=await open();await fixture(page,[{changes:{scope:'full'},reply:'Agreed.',mood:'warmer'}],true);
 await page.click('[data-open="bridge"]');await page.fill('#negInput','Do full rehab');await page.locator('[data-form="neg"] button').click();await page.waitForFunction(()=>__qwenFixture.calls===1);
 await page.click('[data-act="close"]');await page.click('[data-open="bridge"]');await page.click('[data-chip="1"]');
 const before=await readSave(page);await page.evaluate(()=>__qwenFixture.hold=false);await page.waitForTimeout(180);
 assert.equal(await readSave(page),before);const s=JSON.parse(before);assert.equal(s.proposals.find(p=>p.id==='bridge').plan.scope,'patch');assert.deepEqual(errors,[]);await ctx.close();
});


test('MP-026 MP-033 MP-065 offline selected separated plots beat model location and stay separated in the drawing',async()=>{
 const {ctx,page,errors}=await open(669);await fixture(page,[{...draft,place:'oldmill'}]);
 await page.click('[data-act="initiative"]');await page.fill('#initDesc','Twenty homes and two shops on my selected plots.');await page.click('[data-act="pickPlots"]');
 const cdp=await ctx.newCDPSession(page);
 async function tileTap(x,y){const pt=await page.$eval('#map',(c,[x,y])=>{const r=c.getBoundingClientRect(),w=c.clientWidth,tw=w/24;return{x:r.left+w/2+(x-y)*tw/2,y:r.top+tw*1.7+(x+y+1)*tw/4};},[x,y]);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...pt,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);}
 await tileTap(16,13);await tileTap(4,13);await page.click('[data-act="plotsDone"]');await page.locator('[data-form="init"] .btn.primary').click();
 await page.getByRole('heading',{name:'East End Homes',exact:true}).waitFor();
 const p=JSON.parse(await readSave(page)).proposals.find(p=>p.mine);assert.deepEqual(p.plots,[[16,13],[4,13]]);
 const nodes=await page.locator('svg.plan-illustration [data-plot]').evaluateAll(es=>es.map(e=>({plot:e.getAttribute('data-plot'),transform:e.getAttribute('transform')})));
 assert.deepEqual(nodes.map(n=>n.plot),['16,13','4,13']);assert.notEqual(nodes[0].transform,nodes[1].transform);assert.deepEqual(errors,[]);await ctx.close();
});

test('MP-015 MP-026 MP-032 MP-033 offline revisions clarify site-mode changes and keep the accepted plan intact',async()=>{
 for(const policyFirst of [true,false]){
  const {ctx,page,errors}=await open();
  const initial=policyFirst?{title:'Parking Reform',place:'none',plan:{policy:'parking_reform'}}:draft;
  await fixture(page,[initial]);await startDraft(page,policyFirst?'Drop parking minimums.':'Build homes and shops at the East End field.');
  await page.getByRole('heading',{name:initial.title,exact:true}).waitFor();
  const before=await readSave(page);
  await fixture(page,[{changes:policyFirst?{homes:20}:{homes:0,shops:0,policy:'parking_reform'},reply:'Sure.',mood:'warmer'}]);
  const intent=policyFirst?'Add twenty homes.':'Replace construction with a parking reform ordinance.';
  await page.fill('#negInput',intent);await page.locator('[data-form="neg"] button').click();
  await page.locator('.request-feedback').waitFor();assert.equal(await readSave(page),before);
  assert.equal(await page.inputValue('#negInput'),intent);assert.match(await page.textContent('.request-feedback'),/site|plot|ordinance/i);
  assert.deepEqual(errors,[]);await ctx.close();
 }
});
