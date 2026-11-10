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
export async function CreateMLCEngine(){
 const start=globalThis.__qwenStartFixture;
 if(start){
  start.calls++;
  while(start.hold)await new Promise(r=>setTimeout(r,15));
  if(start.error)throw new Error(start.error);
 }
 return{chat:{completions:{async create({messages}){
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

test('MP-031 MP-065 a saved Qwen model must finish startup before drafting and a failed startup can retry the same intent',async()=>{
 const {ctx,page,errors}=await open();
 try{
  await ctx.addInitScript(()=>{globalThis.__qwenStartFixture={calls:0,hold:true,error:'Test model startup failure.'};});
  await page.reload();
  await page.waitForFunction(()=>__qwenStartFixture.calls===1);
  const description='Build apartments and a corner shop at the East End field.';
  await page.click('[data-act="initiative"]');
  await page.fill('#initDesc',description);
  const submit=page.locator('[data-form="init"] .btn.primary');
  assert.equal(await submit.isEnabled(),false);
  await page.locator('[data-form="init"]').evaluate(form=>form.requestSubmit());
  assert.equal(await readSave(page),null);
  await page.evaluate(()=>{__qwenStartFixture.hold=false;});
  const retry=page.locator('[data-act="offlineRetry"]');
  await retry.waitFor();
  assert.equal(await page.inputValue('#initDesc'),description);
  assert.equal(await readSave(page),null);
  await fixture(page,[draft]);
  await page.evaluate(()=>{__qwenStartFixture.error='';});
  await retry.click();
  await page.getByText('Offline AI ready',{exact:false}).waitFor();
  await submit.click();
  await page.getByRole('heading',{name:draft.title,exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>__qwenFixture.calls),1);
  assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
});
async function choosePlots(ctx,page,description,plots){
 await page.click('[data-act="initiative"]');
 await page.fill('#initDesc',description);
 await page.click('[data-act="pickPlots"]');
 const cdp=await ctx.newCDPSession(page);
 for(const plot of plots){
  const point=await page.$eval('#map',(canvas,[x,y])=>{
   const bounds=canvas.getBoundingClientRect(),width=canvas.clientWidth,tile=width/24;
   return{x:bounds.left+width/2+(x-y)*tile/2,y:bounds.top+tile*1.7+(x+y+1)*tile/4};
  },plot);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(350);
 }
 await page.click('[data-act="plotsDone"]');
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
 await choosePlots(ctx,page,'Twenty homes and two shops on my selected plots.',[[16,13],[4,13]]);
 await page.locator('[data-form="init"] .btn.primary').click();
 await page.getByRole('heading',{name:'East End Homes',exact:true}).waitFor();
 const p=JSON.parse(await readSave(page)).proposals.find(p=>p.mine);assert.deepEqual(p.plots,[[16,13],[4,13]]);
 const nodes=await page.locator('svg.plan-illustration [data-plot]').evaluateAll(es=>es.map(e=>({plot:e.getAttribute('data-plot'),transform:e.getAttribute('transform')})));
 assert.deepEqual(nodes.map(n=>n.plot),['16,13','4,13']);assert.notEqual(nodes[0].transform,nodes[1].transform);assert.deepEqual(errors,[]);await ctx.close();
});

test('MP-023 MP-026 MP-031 MP-033 MP-059 MP-060 MP-065 offline mayoral proposal shows each revised forecast and commits the latest plan on the chosen plots',async()=>{
 const {ctx,page,errors}=await open(669);
 try{
  await page.evaluate(()=>localStorage.setItem('masterplan.dev.save',JSON.stringify(ENGINE.newGame(2027))));
  await page.reload();
  await page.getByText('Offline AI ready',{exact:false}).waitFor();
  const plots=[[16,13],[17,13],[18,13],[16,14],[17,14],[18,14]];
  const title='Cider & Lantern Commons';
  const description=`${title}, a covered farmers market, 20 affordable homes and 60 parking spaces on my selected plots.`;
  await fixture(page,[{title,summary:description,plan:{civic:'farmers_market',homes:20,affordable:true,parking:60}},{changes:{stormwater:true}},{changes:{parking:20}}]);
  await choosePlots(ctx,page,description,plots);
  await page.locator('[data-form="init"] .btn.primary').click();
  await page.getByRole('heading',{name:title,exact:true}).waitFor();
  await page.getByText('Drafted with Qwen',{exact:false}).waitFor();
  const drawing=page.locator('svg.plan-illustration');
  const footprint=()=>drawing.locator('[data-plot]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-plot')).sort());
  const chosen=plots.map(plot=>plot.join(',')).sort();
  assert.deepEqual(await footprint(),chosen);
  const firstDrawing=await drawing.getAttribute('data-revision');
  assert.match(await page.textContent('[data-summary="funding"]'),/\$760K/);
  assert.match(await page.textContent('[data-summary="votes"]'),/2 of 5/);

  const revision=page.locator('[data-summary="revision"]');
  const field=name=>revision.locator(`[data-revision-field="${name}"]`).first().textContent();
  async function revise(text,confirmation){
   await page.fill('#negInput',text);
   await page.locator('[data-form="neg"] button').click();
   await page.getByText(confirmation,{exact:false}).waitFor();
  }
  await page.getByRole('button',{name:'Edit with Qwen'}).click();
  await revise('Add a stormwater basin.','Cost $760K → $900K.');
  assert.match(await field('cost'),/\$760K.*→ \$900K/);
  assert.match(await field('live'),/\+2\.0 → \+2\.5|\+2 → \+2\.5/);
  assert.ok(await revision.locator('[data-revision-field="lean"]').count()>0);
  assert.deepEqual(await footprint(),chosen);
  const basinDrawing=await drawing.getAttribute('data-revision');
  assert.notEqual(basinDrawing,firstDrawing);

  await revise('Reduce parking to 20 spaces.','Cost $900K → $800K.');
  assert.match(await field('votes'),/2 of 5 → 3 of 5/);
  assert.match(await field('walk'),/−1\.5 → −0\.5|-1\.5 → -0\.5/);
  assert.notEqual(await drawing.getAttribute('data-revision'),basinDrawing);
  assert.deepEqual(await footprint(),chosen);
  assert.equal(await page.evaluate(()=>__qwenFixture.calls),3);
  let state=JSON.parse(await readSave(page));
  assert.equal(state.cash,900);
  assert.deepEqual(state.pending,[]);

  await page.getByRole('button',{name:'Take it to council'}).click();
  await page.getByRole('button',{name:'Call the vote'}).click();
  await page.getByText('Motion carries',{exact:true}).waitFor();
  state=JSON.parse(await readSave(page));
  const pending=state.pending.find(project=>project.title===title);
  assert.deepEqual(pending.plots,plots);
  assert.equal(pending.plan.stormwater,true);
  assert.equal(pending.plan.parking,20);
  assert.equal(pending.cost,800);
  assert.equal(state.cash,100);
  assert.ok(plots.every(([x,y])=>state.grid[y*24+x].b.type==='construction'));
  await page.reload();
  assert.deepEqual(JSON.parse(await readSave(page)).pending.find(project=>project.title===title),pending);
  assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
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
