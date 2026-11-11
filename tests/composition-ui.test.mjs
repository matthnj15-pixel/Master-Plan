// Renderer contract checks. Browser lifecycle checks below use the integrated
// C2 engine/workspace/provider; fixtures are identified separately from live AI.
import assert from 'node:assert/strict';
import {test,before,after} from 'node:test';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
const require=createRequire(import.meta.url),E=require('../src/engine.js'),R=require('../src/plan-renderer.js');
function exhibit(){
  const state=E.newGame(312),plots=[[1,2],[4,2]],program={version:2,title:'A new activity name',intent:'Work with shared classes and retained land',
    components:[{id:'work',capability:'workplace',label:'Work activity',quantity:4,area:.7,sharedWith:null},{id:'class',capability:'community',label:'Classes',quantity:10,area:.3,sharedWith:'work'}],
    conditions:{hours:8,deliveries:'daytime',access:true,buffer:.2,preserve:.4,affordable:false},assumptions:[],omissions:[]};
  const proposal={id:'composition-render-test',kind:'initiative',title:program.title,plan:E.defaultPlan('initiative'),program,programRevision:'accepted-program-1',plots,
    layout:{plots,allocations:[{componentId:'work',label:'Work activity',role:'workshop',sharedWith:null,segments:[{plot:[1,2],offset:0,area:.7}]},{componentId:'class',label:'Classes',role:'civic',sharedWith:'work',segments:[{plot:[1,2],offset:0,area:.3}]}],
      cells:[{plot:[1,2],usedArea:.9},{plot:[4,2],usedArea:0}],buffer:[{plot:[1,2],offset:.7,area:.2}],preserved:[{plot:[4,2],offset:.6,area:.4}],unused:[{plot:[1,2],offset:.9,area:.1},{plot:[4,2],offset:0,area:.6}],usedArea:.9,preservedArea:.4,freeArea:.7}};
  const engine={...E,capabilities:()=>[{id:'workplace',unit:'staffed places'},{id:'community',unit:'daily participants'}],effectsOf:()=>({cost:124,upkeep:10})};
  return {state,proposal,engine};
}
test('MP-026 MP-033 MP-070 composition exhibit preserves exact engine strips, gaps and shared space without reallocation',()=>{
  const f=exhibit(),before=JSON.stringify(f),html=R.render(f);
  assert.match(html,/data-revision="accepted-program-1"/);
  assert.match(html,/data-component-id="class"[^>]*data-role="civic"[^>]*data-shared-with="work"[^>]*data-offset="0"[^>]*data-area="0.3"/);
  assert.match(html,/x="50" y="100" width="35" height="50"/);
  assert.match(html,/data-role="retained"[^>]*data-offset="0.6"[^>]*data-area="0.4"/);
  assert.doesNotMatch(html,/data-plot="2,2"|data-plot="3,2"/);
  assert.match(html,/data-plan-cost="124"/);assert.match(html,/shared with Work activity/);
  assert.equal(JSON.stringify(f),before,'rendering never mutates the accepted proposal');
});
test('MP-026 MP-072 SVG and map projection consume the identical accepted component layout through delivery',()=>{
  const f=exhibit(),accepted=R.layoutShapes(f.proposal),paths=[];let current=[];
  const context={save(){},restore(){},setLineDash(){},beginPath(){current=[];},moveTo(x,y){current.push([x,y]);},lineTo(x,y){current.push([x,y]);},closePath(){paths.push(current);},fill(){},stroke(){},arc(){}};
  R.drawLayout(context,f.proposal,(x,y)=>[x*50,y*50]);
  assert.deepEqual(paths[0],[[50,100],[85,100],[85,150],[50,150]]);
  assert.deepEqual(paths[1],[[50,100],[65,100],[65,150],[50,150]],'shared allocation retains its exact overlap');
  const delivered=JSON.parse(JSON.stringify({...f.proposal,status:'built',done:2}));
  assert.deepEqual(R.layoutShapes(delivered),accepted,'delivery consumes the saved layout');
  assert.match(R.render({...f,proposal:delivered}),/data-revision="accepted-program-1"/);
});
test('MP-031 MP-070 renamed composition labels preserve geometry and unavailable layouts are explicit',()=>{
  const f=exhibit(),original=R.layoutShapes(f.proposal);f.proposal.title='Uncatalogued name';f.proposal.program.title=f.proposal.title;
  assert.deepEqual(R.layoutShapes(f.proposal),original);assert.match(R.render(f),/Uncatalogued name/);
  delete f.proposal.layout;assert.match(R.render(f),/accepted engine layout is unavailable/);
});

// QA inventory: normal generic and typed entry, addition/reduction/conditions,
// explicit baseline selection and reload, alternatives, invalid input recovery,
// resident requested/counter ordering, 44px controls at both portrait widths,
// pending flag fencing, and account import preview/confirmation/conflict.
// The connected provider and account below are local fixtures, not live services.
const root=new URL('..',import.meta.url).pathname,out=mkdtempSync(join(tmpdir(),'mp-composition-ui-'));
let browser,server,url;
before(async()=>{
  execFileSync('node',['scripts/build.mjs','--channel','dev','--out',out],{cwd:root,stdio:'pipe'});
  server=createServer((req,res)=>{
    const name=req.url==='/artifact'||req.url==='/legacy-artifact'?'master-plan.html':req.url==='/'?'index.html':null;
    if(!name){res.writeHead(404).end();return;}
    let html=readFileSync(join(out,name),'utf8');
    if(req.url==='/legacy-artifact')html=html.replace(/var MP_BUILD=(\{[^\n]*\});\n/,(_match,json)=>{const build=JSON.parse(json);build.flags.compositionPlans=false;return 'var MP_BUILD='+JSON.stringify(build)+';\n';});
    res.writeHead(200,{'Content-Type':'text/html'}).end(html);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch();
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));rmSync(out,{recursive:true,force:true});});
async function open(width=400,{ai=false,account=false}={}){
  const context=await browser.newContext({viewport:{width,height:951},isMobile:true,hasTouch:true});
  if(ai||account)await context.addInitScript(({ai,account})=>{
    window.__uiReplies=[];window.__uiPrompts=[];window.__accountCopies={};window.__accountReads=[];window.__accountWrites=[];window.__holdAccountRead=false;
    const provider={admit:async()=>({ok:true,promptTokens:200,contextWindowTokens:4096,maxOutputTokens:640}),json:async prompt=>{window.__uiPrompts.push(prompt);if(!window.__uiReplies.length)throw new Error('No queued provider fixture');return window.__uiReplies.shift();}};
    const db={doc:path=>({async get(){const data=window.__accountCopies[path];window.__accountReads.push(path);while(window.__holdAccountRead)await new Promise(resolve=>setTimeout(resolve,10));return{exists:!!data,data:()=>data};},async set(data){window.__accountWrites.push({path,data});}})};
    window.claude={use:async name=>name==='sample'?(ai?provider:null):name==='user'?(account?{id:async()=>'account-qa'}:null):name==='db'?(account?db:null):null};
  },{ai,account});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(url+(ai||account?'/artifact':'/'));await page.locator('.item[data-open="bridge"]').waitFor();
  return{context,page,errors};
}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('masterplan.dev.save.v4')));
const privateDrafts=page=>page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('masterplan.dev.draft-workspace.v1')).games)[0].drafts);
async function genericDraft(page){
  await page.locator('[data-act="initiative"]').click();await page.fill('#compositionIntent','A repair cooperative with working space and room to teach.');await page.fill('#compositionTitle','Neighborhood repair cooperative');
  await page.selectOption('#compositionSite','east_end');await page.locator('.composition-controls summary').click();await page.selectOption('#compositionCapability','workplace');await page.locator('[data-comp="addComponent"]').click();
  await page.locator('[data-component-field="quantity"]').fill('10');await page.locator('[data-component-field="area"]').fill('1');await page.locator('[data-comp="previewControls"]').click();await page.locator('.composition-forecast').waitFor();
}
async function checkTouch(page){
  assert.equal(await page.locator('#sheetRoot label label').count(),0,'labels never nest');
  if(await page.locator('[data-form="composition"]').count()){
    const submits=await page.locator('#sheetRoot button[type="submit"]').count();assert.ok(submits<=1,'the interpreter has at most one explicit submit control per stage');if(submits)assert.equal(await page.locator('#sheetRoot button[type="submit"]').evaluate(e=>e.form===document.querySelector('#compositionForm')),true,'the footer submit belongs to the interpretation form');
    assert.deepEqual(await page.locator('#sheetRoot button[data-comp],#sheetRoot button[data-comp-version],#sheetRoot button[data-comp-remove]').evaluateAll(es=>es.filter(e=>e.type!=='button').map(e=>e.textContent)),[],'composition actions never implicitly submit');
    if(await page.locator('[data-comp="post"]').count())assert.equal(await page.locator('[data-comp="post"]').evaluate(e=>e.form),null,'posting is outside the private interpretation form');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(await page.locator('#sheetRoot button,#sheetRoot input,#sheetRoot textarea,#sheetRoot select').evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(r.width<44||r.height<44);}).map(e=>e.textContent)),[]);
}
async function checkFooter(page,expected){
  assert.equal(await page.locator('#sheetRoot .sh-actions').count(),1,'each composition stage has one action footer');
  for(const position of [0,.5,1]){
    await page.locator('#sheetRoot .pane').evaluate((pane,fraction)=>pane.scrollTop=(pane.scrollHeight-pane.clientHeight)*fraction,position);
    const bounds=await page.locator('.composition-footer').boundingBox(),height=page.viewportSize().height;
    assert.ok(bounds.y>=height*.6&&bounds.y+bounds.height>=height-40&&bounds.y+bounds.height<=height+1,`${expected} footer remains within thumb reach after scrolling: ${JSON.stringify(bounds)}`);
    assert.match(await page.locator('.composition-footer [data-primary-action]').innerText(),expected);
  }
}
async function checkDeltas(page,baselineIndex=0){
  const expected=await page.evaluate(index=>{
    const state=JSON.parse(localStorage.getItem('masterplan.dev.save.v4')).state,draft=Object.values(JSON.parse(localStorage.getItem('masterplan.dev.draft-workspace.v1')).games)[0].drafts[0];
    const before=ENGINE.previewProgram(state,{program:draft.versions[index].program,plots:draft.versions[index].plots}),after=ENGINE.previewProgram(state,{program:draft.program,plots:draft.plots});
    return{cost:after.forecast.money.costK-before.forecast.money.costK,upkeep:after.forecast.money.annualUpkeepK-before.forecast.money.annualUpkeepK,jobs:after.forecast.effects.jobs-before.forecast.effects.jobs,
      support:after.forecast.support.map(s=>({id:s.memberId,delta:s.lean-before.forecast.support.find(p=>p.memberId===s.memberId).lean}))};
  },baselineIndex);
  for(const key of ['cost','upkeep','jobs'])assert.ok(Math.abs(Number(await page.locator(`[data-comparison-field="${key}"] [data-delta]`).getAttribute('data-delta'))-expected[key])<1e-6,key);
  for(const member of expected.support)assert.equal(Number(await page.locator(`[data-comparison-field="support:${member.id}"] [data-delta]`).getAttribute('data-delta')),member.delta,member.id);
}
test('MP-076 MP-077 MP-080 generic controls retain a baseline, show engine deltas and recover invalid previews at both mobile widths',async()=>{
  for(const width of [400,669]){
    const {context,page,errors}=await open(width);
    try{
      await genericDraft(page);const original=await saved(page),revision=await page.locator('svg.plan-illustration').getAttribute('data-revision');
      assert.match(await page.locator('.composition-form .chips .note').innerText(),/6 plots selected/);
      assert.doesNotMatch(await page.locator('.composition-form .chips .note').innerText(),/16,13/);
      await page.locator('[data-component-field="quantity"]').fill('6');await page.locator('[data-condition="hours"]').fill('8');await page.locator('[data-condition="buffer"]').fill('.5');await page.locator('[data-comp="previewControls"]').click();
      await page.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('masterplan.dev.draft-workspace.v1')).games)[0].drafts[0].versions.length===2);
      await checkDeltas(page);assert.match(await page.locator('[aria-label="Changes from baseline"]').innerText(),/10 → 6/);await checkTouch(page);
      assert.deepEqual(await saved(page),original,'private previews do not change the public town');
      assert.equal(await page.locator('#map').getAttribute('data-program-revision'),await page.locator('svg.plan-illustration').getAttribute('data-revision'));
      await page.locator('[data-component-field="quantity"]').fill('999');await page.locator('[data-comp="previewControls"]').click();
      assert.equal(await page.locator('[data-comp="post"]').count(),0,'dirty previews cannot be posted');assert.equal(await page.locator('[data-component-field="quantity"]').inputValue(),'999');
      assert.equal(await page.locator('svg.plan-illustration').count(),1);assert.notEqual(await page.locator('svg.plan-illustration').getAttribute('data-revision'),revision);
      assert.deepEqual(errors,[]);
    }finally{await context.close();}
  }
});
test('MP-033 MP-056 MP-077 rapid adjacent plot taps select each plot while normal double-tap remains a map gesture',async()=>{
  const {context,page,errors}=await open(400);
  try{
    await page.locator('[data-act="initiative"]').click();await page.fill('#compositionIntent','A small shared work space.');await page.locator('[data-comp="pickPlots"]').click();await page.locator('#plotCount').waitFor();
    const points=await page.locator('#map').evaluate(canvas=>{const b=canvas.getBoundingClientRect(),t=canvas.clientWidth/24;return [[7,0],[8,0]].map(([x,y])=>({x:b.left+canvas.clientWidth/2+(x-y)*t/2,y:b.top+t*1.7+(x+y+1)*t/4}));});
    await page.evaluate(()=>{window.__pickingEvents=[];for(const type of ['pointerdown','pointerup','pointercancel'])document.addEventListener(type,e=>window.__pickingEvents.push({type,target:e.target.id,x:e.clientX,y:e.clientY,top:document.querySelector('#map').getBoundingClientRect().top}),true);});
    await page.touchscreen.tap(points[0].x,points[0].y);await page.touchscreen.tap(points[1].x,points[1].y);
    await page.waitForFunction(()=>document.querySelector('#plotCount')?.dataset.count==='2',{},{timeout:1500}).catch(async()=>assert.fail(JSON.stringify(await page.evaluate(()=>({count:document.querySelector('#plotCount')?.dataset.count,zoom:document.querySelector('#map').dataset.zoom,info:document.querySelector('#mapinfo').textContent,events:window.__pickingEvents})))));
    assert.equal(await page.locator('#plotCount').getAttribute('data-count'),'2','both quick plot taps must select land');assert.equal(await page.locator('#map').getAttribute('data-zoom'),'1');
    await page.locator('[data-act="plotsDone"]').click();assert.match(await page.locator('.composition-form .chips .note').innerText(),/2 plots selected/);await page.locator('#sheetRoot [data-act="close"]').click();await page.locator('#map').scrollIntoViewIfNeeded();const center=await page.locator('#map').evaluate(c=>{const r=c.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});await page.touchscreen.tap(center.x,center.y);await page.touchscreen.tap(center.x,center.y);assert.equal(Number(await page.locator('#map').getAttribute('data-zoom')),1.8,'normal map double-tap still zooms');assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('MP-077 MP-081 three typed edits preserve site and unrelated components, with selectable private comparison and alternatives',async()=>{
  const {context,page,errors}=await open(400,{ai:true});
  try{
    await page.locator('[data-act="initiative"]').click();const intent='A neighborhood repair cooperative with a planted yard. '+ 'Keep this full original text. '.repeat(30);
    await page.fill('#compositionIntent',intent);await page.selectOption('#compositionSite','east_end');
    const program={version:2,title:'Repair cooperative',intent,components:[{id:'work',capability:'workplace',label:'Repair benches',quantity:10,area:1,sharedWith:null},{id:'yard',capability:'green',label:'Planted yard',quantity:.5,area:.5,sharedWith:null}],conditions:{hours:10,deliveries:'daytime',access:true,buffer:0,preserve:0,affordable:false},assumptions:[],omissions:[]};
    async function typePreview(text,reply,initial=false){const before=await page.locator('svg.plan-illustration').count()?await page.locator('svg.plan-illustration').getAttribute('data-revision'):null;await page.evaluate(r=>window.__uiReplies.push(r),reply);if(!initial)await page.fill('#compositionEdit',text);await page.locator('#sheetRoot button[type="submit"][form="compositionForm"]').click();await page.waitForFunction(old=>{const svg=document.querySelector('svg.plan-illustration');return svg&&svg.dataset.revision!==old;},before);}
    await typePreview(intent,{program},true);const publicBefore=await saved(page);
    await typePreview('Add classes sharing the repair space.',{patch:{upsert:[{id:'classes',capability:'community',label:'Shared classes',quantity:20,area:.4,sharedWith:'work'}]}});
    await typePreview('Reduce staffed work places to six.',{patch:{upsert:[{id:'work',quantity:6}]}});
    await typePreview('Operate eight hours and add half a plot of buffer.',{patch:{conditions:{hours:8,buffer:.5}}});
    await page.locator('[data-comp="saveDraft"]').click();await checkDeltas(page);
    const drafts=await privateDrafts(page),draft=drafts[0];assert.equal(draft.versions.length,4);assert.deepEqual(draft.program.components.find(c=>c.id==='yard'),program.components[1]);assert.deepEqual(draft.plots,draft.versions[0].plots);assert.equal(draft.program.intent,intent);
    assert.ok((await page.evaluate(()=>window.__uiPrompts))[0].includes(intent));assert.deepEqual(await saved(page),publicBefore);
    await page.locator('[data-comp-version]').nth(1).click();await page.locator('[data-comp="setBaseline"]').click();await page.locator('[data-comp-version]').nth(3).click();await page.locator('[data-comp="saveDraft"]').click();await checkDeltas(page,1);
    assert.match(await page.locator('[data-comparison-baseline]').innerText(),/Version 2/);
    await page.locator('[data-comp="alternative"]').click();await page.locator('#sheetRoot [data-comp="workspace"]').click();await page.locator('[data-comp-open]').first().waitFor();assert.equal(await page.locator('[data-comp-open]').count(),2);
    await page.locator('[data-comp-open]').first().click();assert.match(await page.locator('[data-comparison-baseline]').innerText(),/Version 2/);await checkDeltas(page,1);
    await page.reload();await page.locator('#panel [data-comp="workspace"]').click();await page.locator('[data-comp-open]').first().click();assert.match(await page.locator('[data-comparison-baseline]').innerText(),/Version 2/);assert.equal(await page.inputValue('#compositionIntent'),intent);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('MP-062 MP-080 composition flag changes apply on reload while protecting loaded pricing and v4 bytes',async()=>{
  const {context,page,errors}=await open();
  try{
    await genericDraft(page);const before=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('masterplan.dev.save.v4')).state;return ENGINE.effectsOf(s.proposals.find(p=>p.program),s).cost;});
    await page.locator('#sheetRoot [data-act="close"]').click();await page.locator('#menuBtn').click();await page.locator('[data-flag="compositionPlans"]').click();
    assert.equal(await page.evaluate(()=>MP_BUILD.flags.compositionPlans),true);assert.equal(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('masterplan.dev.save.v4')).state;return ENGINE.effectsOf(s.proposals.find(p=>p.program),s).cost;}),before);
    assert.match(await page.locator('[data-flag="compositionPlans"]').innerText(),/Off after reload/);
    const bytes=await page.evaluate(()=>localStorage.getItem('masterplan.dev.save.v4'));await page.reload();await page.locator('.storage-notice').waitFor();
    assert.equal(await page.evaluate(()=>MP_BUILD.flags.compositionPlans),false);assert.equal(await page.evaluate(()=>localStorage.getItem('masterplan.dev.save.v4')),bytes);assert.equal(await page.locator('#protectedHeading').innerText(),'Your saved town is protected');assert.equal(await page.locator('.wrap').isVisible(),false);assert.equal(await page.locator('#endBtn').isVisible(),false);assert.match(await page.locator('[data-protected-summary]').innerText(),/Saved turn 1/);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('MP-053 MP-054 MP-057 MP-077 every composition stage has a pinned single footer at both portrait widths',async()=>{
  for(const width of [400,669]){
    const {context,page,errors}=await open(width);
    try{
      await page.locator('[data-act="initiative"]').click();await page.fill('#compositionIntent','A neighborhood cooperative work room.');await checkFooter(page,/Preview these controls/);
      await page.selectOption('#compositionSite','east_end');await page.locator('.composition-controls summary').click();await page.selectOption('#compositionCapability','workplace');await page.locator('[data-comp="addComponent"]').click();await checkFooter(page,/Preview these controls/);
      await page.locator('[data-comp="previewControls"]').click();await checkFooter(page,/Put on agenda/);await checkTouch(page);
      await page.locator('#sheetRoot [data-act="close"]').click();await page.locator('.item[data-open="farm-access"]').click();await page.locator('[data-comp-edit="farm-access"]').click();await page.locator('.composition-controls summary').click();await page.locator('[data-condition="access"]').uncheck();await page.locator('[data-comp="previewControls"]').click();await checkFooter(page,/Hear resident response/);
      await page.locator('[data-comp="resident"]').click();await checkFooter(page,/Preview this counter/);await page.locator('[data-comp="counter"]').click();await page.locator('[data-comp="resident"]').click();await checkFooter(page,/Confirm public revision/);
      if(process.env.MP_UI_EVIDENCE_DIR){mkdirSync(process.env.MP_UI_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:join(process.env.MP_UI_EVIDENCE_DIR,`${width}-resident-footer.png`)});}
      await page.locator('#sheetRoot [data-act="close"]').click();await page.locator('#endBtn').click();await page.locator('#sheetRoot [data-act="close"]').click();await page.locator('.item[data-open="park"]').click();await page.locator('[data-comp-edit="park"]').click();await page.locator('.composition-controls summary').click();await checkFooter(page,/Preview these controls/);await checkTouch(page);
      if(process.env.MP_UI_EVIDENCE_DIR){await page.screenshot({path:join(process.env.MP_UI_EVIDENCE_DIR,`${width}-legacy-controls-footer.png`)});}
      assert.deepEqual(errors,[]);
    }finally{await context.close();}
  }
});
test('MP-078 stakeholder objections are named separately while the controlling proposer retains confirmation authority',async()=>{
  const {context,page,errors}=await open(400,{ai:true});
  try{
    await page.locator('.item[data-open="campus-loading"]').click();await page.locator('[data-comp-edit="campus-loading"]').click();await page.fill('#compositionEdit','Use the campus entrance for the loading route.');
    await page.evaluate(()=>window.__uiReplies.push({patch:{conditions:{operations:[{componentId:'warehouse',stage:'operation',loadingRoute:'campus-entrance',publicSales:false,onSiteConsumption:false}]}}}));await page.locator('#sheetRoot button[type="submit"][form="compositionForm"]').click();await page.locator('svg.plan-illustration').waitFor();await page.locator('[data-comp="resident"]').click();
    assert.match(await page.locator('.resident-response').innerText(),/agree.*Alex Moreno/);assert.match(await page.locator('[data-stakeholder="college_liaison"]').innerText(),/Dr\. Leena Shah.*counter/);assert.match(await page.locator('[data-stakeholder="college_liaison"]').innerText(),/loading crosses.*campus entrance/i);assert.equal(await page.locator('[data-comp="confirmRevision"]').isEnabled(),true);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('MP-077 MP-080 unsupported private draft/version formats preserve bytes and recover live text and plots',async()=>{
  const {context,page,errors}=await open();
  try{
    const corrupted=await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('masterplan.dev.save.v4')).state,value={version:1,games:{[state.gameId+':'+state.scenarioId]:{revision:3,drafts:[{id:'broken',versions:[{}]}]}}},raw=JSON.stringify(value);localStorage.setItem('masterplan.dev.draft-workspace.v1',raw);return raw;});
    const before=await saved(page);await page.locator('#panel [data-comp="workspace"]').click();await page.locator('#sheetRoot').getByText(/Private recovery is unavailable because/).waitFor();assert.equal(await page.locator('[data-comp-open]').count(),0);
    await page.locator('[data-comp="new"]').click();const input='Keep this unsaved full request';await page.fill('#compositionIntent',input);await page.selectOption('#compositionSite','east_end');await page.locator('#sheetRoot [data-comp="workspace"]').click();await page.locator('[data-comp="resumeLive"]').click();assert.equal(await page.inputValue('#compositionIntent'),input);assert.match(await page.locator('.composition-form .chips .note').innerText(),/6 plots selected/);
    assert.equal(await page.evaluate(()=>localStorage.getItem('masterplan.dev.draft-workspace.v1')),corrupted);assert.deepEqual(await saved(page),before);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('MP-060 MP-080 a structured migration failure in hot data is never used as a town',async()=>{
  const context=await browser.newContext({viewport:{width:400,height:951}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
    await context.addInitScript(()=>window.claude={use:async()=>null,hot:{ready:start=>start({S:{ok:false,reasons:['invalid_saved_entry']}})}});
    await page.goto(url+'/legacy-artifact');await page.locator('.item[data-open="bridge"]').waitFor();assert.equal(await page.locator('#yr').innerText(),'2027');assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('MP-073 MP-079 delivered history uses built snapshots and distinguishes mayoral approval from a council vote',async()=>{
  const {context,page,errors}=await open(400,{account:true});
  try{
    // Engine-constructed fixture, not evidence of a sustained browser campaign.
    const expected=await page.evaluate(()=>{
      let state=ENGINE.newGame(2301,undefined,{gameId:'delivered-history'});
      const apply=(type,payload)=>{const r=ENGINE.applyCommand(state,{id:state.actionHighWater+1,gameId:state.gameId,expectedRevision:state.revision,expectedGeneration:0,type,payload});if(!r.ok)throw new Error(r.reasons.join('; '));state=r.state;};
      const bridge=state.proposals.find(p=>p.id==='bridge'),campus=state.proposals.find(p=>p.id==='campus-loading');
      apply('decision',{proposalId:bridge.id,action:'approve',funding:'cash',route:ENGINE.approvalRoute(state,bridge).id});apply('offer',{proposalId:campus.id,memberId:'weaver',offer:{type:'favor'}});apply('decision',{proposalId:campus.id,action:'vote',funding:'cash',route:ENGINE.approvalRoute(state,campus).id});
      for(let i=0;i<3&&state.pending.length;i++)apply('resolveYear',{});
      if(!state.built.some(p=>p.id==='bridge')||!state.built.some(p=>p.id==='campus-loading'))throw new Error('The delivery fixture did not finish');
      window.__accountCopies['data/users/account-qa/save-dev-v4']={json:JSON.stringify({format:'masterplan-save',formatVersion:4,writerProtocol:1,formatFloor:4,storageGeneration:5,state})};return state.built.find(p=>p.id==='campus-loading').programRevision;
    });
    await page.locator('#menuBtn').click();await page.locator('[data-account-import="current"]').click();await page.locator('[data-account-preview]').waitFor();await page.locator('[data-account-import="confirm"]').click();await page.getByText('Account copy imported. The town is saved locally.',{exact:true}).waitFor();await page.locator('#sheetRoot [data-act="close"]').click();
    await page.locator('[data-tab="plans"]').click();assert.match(await page.locator('[data-project="campus-loading"]').innerText(),/Built/);assert.match(await page.locator('[data-project="bridge"]').innerText(),/Built/);
    await page.locator('[data-project="bridge"]').click();assert.match(await page.locator('.sh-body').innerText(),/Mayoral approval/);assert.doesNotMatch(await page.locator('.sh-body').innerText(),/council votes in favor/);assert.match(await page.locator('.sh-body').innerText(),/Built/);await page.locator('#sheetRoot [data-act="close"]').click();
    await page.locator('[data-project="campus-loading"]').click();assert.equal(await page.locator('svg.plan-illustration').getAttribute('data-revision'),expected);assert.match(await page.locator('.sh-body').innerText(),/Council vote/);await page.reload();await page.locator('[data-tab="plans"]').click();assert.match(await page.locator('[data-project="campus-loading"]').innerText(),/Built/);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('MP-076 MP-077 MP-081 focused clarification and unsupported details are escaped and keep the full idea and site',async()=>{
  const {context,page,errors}=await open(400,{ai:true});
  try{
    const intent='A workshop with shared lessons and a below-ground connection.';
    await page.locator('[data-act="initiative"]').click();await page.fill('#compositionIntent',intent);await page.selectOption('#compositionSite','east_end');const before=await saved(page);
    const question='How many daily participants should share the repair room? <script>window.badClarification=true</script>';
    await page.evaluate(question=>window.__uiReplies.push({status:'clarify',questions:[question],omissions:[]}),question);await page.locator('#sheetRoot button[type="submit"][form="compositionForm"]').click();await page.getByText(question,{exact:true}).waitFor();
    assert.equal(await page.locator('.request-feedback script').count(),0);assert.equal(await page.evaluate(()=>window.badClarification),undefined);assert.equal(await page.inputValue('#compositionIntent'),intent);assert.match(await page.locator('.composition-form .chips .note').innerText(),/6 plots selected/);
    await page.locator('[data-comp="editRequest"]').click();assert.equal(await page.locator('#compositionIntent').evaluate(e=>e===document.activeElement),true);
    const omission='Underground tunnel loads are not modeled.';await page.evaluate(omission=>window.__uiReplies.push({status:'unsupported',questions:[],omissions:[omission]}),omission);await page.locator('#sheetRoot button[type="submit"][form="compositionForm"]').click();await page.getByText(omission,{exact:true}).waitFor();
    assert.equal(await page.inputValue('#compositionIntent'),intent);assert.equal(await page.locator('[data-comp="post"]').count(),0);assert.deepEqual(await saved(page),before);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
async function mockAccountCopy(page,{legacy=false,hold=false}={}){
  const old=legacy?JSON.parse(readFileSync(new URL('./fixtures/millbrooke-v2-save.json',import.meta.url),'utf8')):null;
  return page.evaluate(({old,hold})=>{
    const source=old?'save-dev':'save-dev-v4',state=old||ENGINE.newGame(5512,undefined,{gameId:'account-source'});state.cash=1244;
    const data={json:JSON.stringify(old?state:{format:'masterplan-save',formatVersion:4,formatFloor:4,writerProtocol:1,storageGeneration:8,state})};
    window.__accountCopies['data/users/account-qa/'+source]=data;window.__holdAccountRead=hold;return{cash:state.cash,source,json:data.json};
  },{old,hold});
}
test('MP-061 MP-080 current and protected legacy account copies require preview and explicit generation-bound replacement',async()=>{
  for(const legacy of [false,true]){
    const {context,page,errors}=await open(400,{account:true});
    try{
      await page.locator('#menuBtn').click();await page.locator('[data-account-import="current"]').waitFor();assert.deepEqual(await page.evaluate(()=>window.__accountReads),[],'startup never imports a delayed account copy');
      const remote=await mockAccountCopy(page,{legacy}),before=await saved(page);
      await page.locator(`[data-account-import="${legacy?'legacy':'current'}"]`).click();await page.locator('[data-account-preview]').waitFor();assert.deepEqual(await saved(page),before);
      assert.match(await page.locator('[data-account-preview]').innerText(),/1,244|1.24M/);await checkTouch(page);await page.locator('[data-account-import="confirm"]').click();
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('masterplan.dev.save.v4')).state.cash===1244);
      const after=await saved(page);assert.ok(after.storageGeneration>before.storageGeneration);assert.notEqual(after.state.gameId,before.state.gameId);
      assert.equal(await page.evaluate(source=>window.__accountCopies['data/users/account-qa/'+source].json,remote.source),remote.json,'the read account copy remains intact');assert.deepEqual(errors,[]);
    }finally{await context.close();}
  }
});
test('MP-080 a delayed account read cannot replace a newer shared local generation',async()=>{
  const {context,page,errors}=await open(669,{account:true});
  try{
    await page.locator('#menuBtn').click();await page.locator('[data-account-import="current"]').waitFor();await mockAccountCopy(page,{hold:true});await page.locator('[data-account-import="current"]').click();await page.waitForFunction(()=>window.__accountReads.length===1);
    const other=await context.newPage();await other.goto(url+'/artifact');await other.locator('[data-tab="budget"]').click();await other.locator('[data-tax="raise"]').click();await other.waitForFunction(()=>JSON.parse(localStorage.getItem('masterplan.dev.save.v4')).state.taxRate==='raise');
    const newer=await saved(other);await page.evaluate(()=>window.__holdAccountRead=false);await page.locator('[data-account-preview]').waitFor();await page.locator('[data-account-import="confirm"]').click();await page.locator('[data-account-status]').waitFor();
    assert.deepEqual(await saved(page),newer);assert.match(await page.locator('[data-account-status]').innerText(),/changed|could not/);assert.equal(await page.locator('[data-account-import="confirm"]').count(),0);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('MP-080 malformed account copies and failed import writes preserve the authoritative local town',async()=>{
  const {context,page,errors}=await open(400,{account:true});
  try{
    await page.locator('#menuBtn').click();await page.locator('[data-account-import="current"]').waitFor();const before=await saved(page);
    await page.evaluate(()=>window.__accountCopies['data/users/account-qa/save-dev-v4']={json:JSON.stringify({format:'masterplan-save',formatVersion:99})});
    await page.locator('[data-account-import="current"]').click();await page.locator('[data-account-status]').waitFor();assert.equal(await page.locator('[data-account-preview]').count(),0);assert.deepEqual(await saved(page),before);
    await mockAccountCopy(page);await page.locator('[data-account-import="current"]').click();await page.locator('[data-account-preview]').waitFor();
    await page.evaluate(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='masterplan.dev.save.v4')throw new DOMException('Quota fixture','QuotaExceededError');return write.call(this,key,value);};});
    await page.locator('[data-account-import="confirm"]').click();await page.waitForFunction(()=>!document.querySelector('[data-account-preview]'));
    assert.deepEqual(await saved(page),before);assert.match(await page.locator('[data-account-status]').innerText(),/could not|changed/);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('MP-077 MP-080 a losing private workspace write keeps live input and its comparison baseline',async()=>{
  const {context,page,errors}=await open();
  try{
    await genericDraft(page);await page.locator('[data-comp="saveDraft"]').click();const original=await privateDrafts(page),publicBefore=await saved(page);
    const other=await context.newPage();await other.goto(url+'/');await other.locator('#panel [data-comp="workspace"]').click();await other.locator('[data-comp-open]').first().click();await other.fill('#compositionTitle','Second page draft');await other.locator('[data-comp="saveDraft"]').click();
    await other.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('masterplan.dev.draft-workspace.v1')).games)[0].drafts[0].program.title==='Second page draft');
    await page.fill('#compositionTitle','Keep the losing live title');await page.locator('[data-comp="saveDraft"]').click();await page.locator('[data-private-status]').filter({hasText:'Another page changed'}).waitFor();
    assert.equal(await page.inputValue('#compositionTitle'),'Keep the losing live title');const durable=(await privateDrafts(page))[0];assert.equal(durable.program.title,'Second page draft');assert.equal(durable.baselineVersion,original[0].baselineVersion);assert.deepEqual(await saved(page),publicBefore);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('MP-075 MP-080 MP-081 a normal typed preview correlates its failed durable write in a sanitized diagnostic export',async()=>{
  const {context,page,errors}=await open();
  try{
    // Mock only the loaded offline provider. The UI, runner, engine, Web Locks,
    // durable workspace and IndexedDB diagnostics/export are the actual modules.
    await page.route(url+'/offline-ai.js',route=>route.fulfill({contentType:'text/javascript',body:`export async function startOfflineAI(){return {offline:true,modelId:'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',admit:async()=>({ok:true,promptTokens:200,contextWindowTokens:4096,maxOutputTokens:640}),json:async()=>window.__uiReplies.shift(),unload:async()=>{}};}`}));
    await page.evaluate(()=>window.__uiReplies=[]);await page.locator('#menuBtn').click();await page.locator('[data-offline-model="1.5B"]').click();await page.getByText('1.5B model ready for offline play.',{exact:true}).waitFor();await page.locator('#sheetRoot [data-act="close"]').click();
    const secret='PRIVATE-INTENT-DO-NOT-EXPORT-2841',intent='A repair cooperative '+secret;
    await page.locator('[data-act="initiative"]').click();await page.fill('#compositionIntent',intent);await page.selectOption('#compositionSite','east_end');
    await page.evaluate(intent=>window.__uiReplies.push({program:{title:'Repair cooperative',intent,components:[{id:'work',capability:'workplace',label:'Repair benches',quantity:6,area:.5,sharedWith:null}],conditions:{hours:8,deliveries:'daytime',access:true,buffer:0,preserve:0,affordable:false},assumptions:[],omissions:[]}}),intent);
    await page.locator('#sheetRoot button[type="submit"][form="compositionForm"]').click();await page.locator('svg.plan-illustration').waitFor();await page.locator('[data-comp="saveDraft"]').click();
    const before=await saved(page),draft=(await privateDrafts(page))[0],requestId=draft.versions[0].request.requestId;assert.ok(requestId);assert.equal(draft.text,intent,'private recovery retains the full input separately');
    await page.evaluate(()=>{const write=Storage.prototype.setItem;window.__restoreGameWrite=()=>Storage.prototype.setItem=write;Storage.prototype.setItem=function(key,value){if(key==='masterplan.dev.save.v4')throw new DOMException('Private write fixture','QuotaExceededError');return write.call(this,key,value);};});
    await page.locator('[data-comp="post"]').click();await page.waitForFunction(()=>!document.querySelector('svg.plan-illustration'));assert.deepEqual(await saved(page),before);assert.equal(await page.inputValue('#compositionIntent'),intent);
    await page.locator('#sheetRoot [data-act="close"]').click();await page.locator('#menuBtn').click();await page.waitForFunction(()=>!document.querySelector('[data-act="diagnosticsExport"]').disabled);
    const downloading=page.waitForEvent('download');await page.locator('[data-act="diagnosticsExport"]').click();const file=await downloading,document=JSON.parse(readFileSync(await file.path(),'utf8'));
    const correlated=document.events.filter(e=>e.metadata?.requestId===requestId),application=correlated.find(e=>e.name==='composition.application');
    assert.ok(correlated.some(e=>e.name==='composition.final'&&e.outcome==='ready'));assert.ok(application);assert.equal(application.outcome,'not-applied');assert.equal(application.metadata.applied,false);assert.equal(application.metadata.stage,'persistence');assert.equal(application.metadata.resultCode,'persistence_failed');assert.equal(application.metadata.action,'draft');assert.ok(application.metadata.durationMs>=0);assert.equal(application.metadata.modelId,'Qwen2.5-1.5B-Instruct-q4f16_1-MLC');assert.equal(application.metadata.runtimeVersion,'0.2.87');
    assert.doesNotMatch(JSON.stringify(document),/PRIVATE-INTENT-DO-NOT-EXPORT|Repair benches|Private write fixture|account-qa/);assert.deepEqual(errors,[]);
    if(process.env.MP_UI_EVIDENCE_DIR){mkdirSync(process.env.MP_UI_EVIDENCE_DIR,{recursive:true});writeFileSync(join(process.env.MP_UI_EVIDENCE_DIR,'composition-write-failure.json'),JSON.stringify(document,null,2));}
    await page.evaluate(()=>{window.__restoreGameWrite();window.MP_QWEN_DIAGNOSTICS.record=()=>{throw new Error('Diagnostics failure fixture');};});
    await page.locator('#sheetRoot [data-act="close"]').click();await page.locator('#panel [data-comp="workspace"]').click();await page.locator('[data-comp-open]').first().click();await page.locator('[data-comp="post"]').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('masterplan.dev.save.v4')).state.initiativeYear===1);assert.equal((await saved(page)).state.proposals.filter(p=>p.id==='init1').length,1,'diagnostic exceptions never block or duplicate the action');assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
