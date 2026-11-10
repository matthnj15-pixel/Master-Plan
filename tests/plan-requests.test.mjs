import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const E=require('../src/engine.js');
const {createPlanRunner}=require('../src/plan-requests.js');
const game=()=>E.newGame(12345);
const provider=(...replies)=>({json:async()=>{const next=replies.shift();if(next instanceof Error)throw next;return next;}});
const draft=(plan={homes:20},place='oldmill')=>({title:'Mayor’s homes',summary:'A plan',place,plan});


test('MP-031 MP-033 named site wins over model suggestion and costs come from the engine',async()=>{
 const state=game(), runner=createPlanRunner({engine:E});
 const result=await runner.run({state,provider:provider(draft({homes:20},'ridge')),intent:'Build homes on the Old Mill lot'});
 assert.equal(result.status,'ready');assert.deepEqual(result.draft.plots,E.SITES.oldmill);assert.equal(result.draft.place,'none');
 assert.equal(state.initiativeYear,undefined);assert.equal(state.proposals.some(p=>p.mine),false);
 let applied;assert.equal(runner.accept(result,{apply:()=>{applied=E.makeInitiative(state,result.draft);}}),true);
 assert.deepEqual(applied.plan,result.proposal.plan);assert.equal(E.effectsOf(applied).cost,result.forecast.after.cost);
 assert.equal(runner.accept(result,{apply:()=>assert.fail('duplicate apply')}),false);
});

test('MP-033 selected separated plots win, invalid selected sites never move to a fallback',async()=>{
 const state=game(), runner=createPlanRunner({engine:E});const plots=[[6,12],[8,13]].filter(([x,y])=>E.canBuildOn(state,x,y));assert.equal(plots.length,2);
 const result=await runner.run({state,provider:provider(draft({homes:20,shops:2,stories:2},'ridge')),intent:'Homes and shops on Old Mill',plots});
 assert.equal(result.status,'ready');assert.deepEqual(result.draft.plots,plots);
 const bad=await runner.run({state,provider:provider(draft()),intent:'Homes',plots:[[0,11]]});
 assert.equal(bad.status,'invalid');assert.match(bad.blocker,/plot/i);
});

test('MP-015 MP-026 invalid typed payload gets one bounded repair and actual final changes',async()=>{
 const state=game(), proposal=state.proposals.find(p=>p.kind==='bridge');const runner=createPlanRunner({engine:E});let calls=0;
 const ai={json:async prompt=>{calls++;if(calls===1)return{changes:{walkways:true},reply:'Added walkways'};assert.match(prompt,/walkways/);return{changes:{scope:'patch'},reply:'Patched the deck'};}};
 const result=await runner.run({mode:'revise',state,proposal,provider:ai,intent:'Patch the deck'});
 assert.equal(result.status,'ready');assert.equal(result.attempts,2);assert.deepEqual(result.applied,{scope:'patch'});assert.equal(result.forecast.after.cost,120);assert.equal(proposal.plan.scope,'full');assert.doesNotMatch(result.confirmation,/walkway/i);
});

test('MP-015 MP-065 exhausted invalid bridge replies cannot apply invented walkways or affect relationships',async()=>{
 const state=game(),original=JSON.stringify(state),proposal=state.proposals.find(p=>p.kind==='bridge'),runner=createPlanRunner({engine:E});
 const result=await runner.run({mode:'revise',state,proposal,provider:provider({changes:{walkways:true},mood:'warmer'},{changes:{walkways:true},mood:'warmer'}),intent:'Add walkways with guardrails'});
 assert.equal(result.status,'invalid');assert.equal(result.attempts,2);assert.match(result.blocker,/walkways/);assert.equal(runner.accept(result,{apply:()=>assert.fail()}),false);assert.equal(JSON.stringify(state),original);
});

test('MP-015 malformed JSON and invalid field types can repair once; exhaustion preserves intent',async()=>{
 const state=game(),runner=createPlanRunner({engine:E});
 const repaired=await runner.run({state,provider:provider(new SyntaxError('bad JSON'),draft()),intent:'Homes at Old Mill'});assert.equal(repaired.status,'ready');assert.equal(repaired.attempts,2);
 const broken=await runner.run({state,provider:provider(draft({homes:'many'}),draft({homes:999})),intent:'My original homes idea at Old Mill'});
 assert.equal(broken.status,'invalid');assert.equal(broken.intent,'My original homes idea at Old Mill');assert.equal(broken.attempts,2);assert.match(broken.blocker,/999|range|200/);
});

test('MP-031 unsupported ideas, unsupported outOfScope, missing sites, and ambiguous sites do not become a park',async()=>{
 const state=game(),runner=createPlanRunner({engine:E});
 const unsupported=await runner.run({state,provider:provider({status:'unsupported',reply:'Spaceports cannot be represented.'}),intent:'Build a spaceport at Old Mill'});assert.equal(unsupported.status,'unsupported');assert.match(unsupported.blocker,/spaceport/i);
 const out=await runner.run({state,provider:provider({...draft({green:1}),outOfScope:'Only a park can be shown; no spaceport.'}),intent:'Build a spaceport at Old Mill'});assert.equal(out.status,'unsupported');
 const substitution=await runner.run({state,provider:provider(draft({green:1})),intent:'Build a teleportation center at Old Mill'});assert.equal(substitution.status,'unsupported');
 const missing=await runner.run({state,provider:provider(draft({homes:20},null),draft({homes:20},null)),intent:'Build some homes'});assert.equal(missing.status,'invalid');assert.match(missing.blocker,/site|plot/i);
 const ambiguous=await runner.run({state,provider:provider(draft()),intent:'Build homes at Old Mill and East End'});assert.equal(ambiguous.status,'invalid');assert.match(ambiguous.blocker,/more than one|ambiguous/i);
 assert.equal(state.proposals.some(p=>p.mine),false);
});

test('MP-032 policy-only initiatives remain no-site even when model suggests a parcel',async()=>{
 const state=game(),runner=createPlanRunner({engine:E});
 const result=await runner.run({state,provider:provider(draft({policy:'parking_reform'},'oldmill')),intent:'Drop parking minimums'});
 assert.equal(result.status,'ready');assert.deepEqual(result.draft.plots,[]);assert.equal(result.proposal.site,'none');
});

test('MP-026 MP-033 fitting reports requested versus accepted fields from the same final revision',async()=>{
 const state=game(),runner=createPlanRunner({engine:E});const result=await runner.run({state,provider:provider(draft({homes:200,shops:12,stories:2,parking:300,green:2})),intent:'Homes and shops at Old Mill',plots:[[6,12],[7,12]]});
 assert.equal(result.status,'ready');assert.equal(result.requested.homes,200);assert.ok(result.proposal.plan.homes<200);assert.ok(result.constraints.some(x=>/scaled|plot/.test(x)));assert.equal(result.draft.plan.homes,result.proposal.plan.homes);assert.equal(result.forecast.after.cost,E.effectsOf(result.proposal).cost);assert.equal(E.plotsNeeded(result.proposal.plan)<=2,true);
});

test('MP-015 stale turn, changed plan, closed draft, provider change, and replaced save cannot commit',async()=>{
 for(const change of ['year','plan','closed','provider','save']){
  const state=game(), proposal=state.proposals.find(p=>p.kind==='bridge');let resolve, current=true;
  const runner=createPlanRunner({engine:E});const pending=runner.run({mode:'revise',state,proposal,provider:{json:()=>new Promise(r=>{resolve=r;})},intent:'Patch the deck',isCurrent:()=>current});
  await new Promise(r=>setImmediate(r));
  if(change==='year')state.year++;else if(change==='plan')proposal.plan.scope='patch';else current=false;
  resolve({changes:{scope:'patch'}});const result=await pending;assert.equal(result.status,'stale',change);assert.equal(runner.accept(result,{apply:()=>assert.fail(change)}),false);
 }
});

test('MP-015 target changes between response and accept invalidate the response',async()=>{
 const state=game(),proposal=state.proposals.find(p=>p.kind==='bridge'),runner=createPlanRunner({engine:E});
 const result=await runner.run({mode:'revise',state,proposal,provider:provider({changes:{scope:'patch'}}),intent:'Patch the deck'});assert.equal(result.status,'ready');proposal.status='approved';assert.equal(runner.accept(result,{apply:()=>assert.fail()}),false);
});

test('MP-065 unavailable provider and timeout preserve initiative and release the caller',async()=>{
 const state=game(),runner=createPlanRunner({engine:E,timeoutMs:15});
 const absent=await runner.run({state,provider:null,intent:'Homes at Old Mill'});assert.equal(absent.status,'unavailable');assert.equal(absent.attempts,0);
 const failed=await runner.run({state,provider:provider(new Error('GPU gone')),intent:'Homes at Old Mill'});assert.equal(failed.status,'unavailable');assert.equal(failed.attempts,1);
 const timed=await runner.run({state,provider:{json:()=>new Promise(()=>{})},intent:'Homes at Old Mill'});assert.equal(timed.status,'unavailable');assert.match(timed.blocker,/timed|time/i);assert.equal(state.initiativeYear,undefined);
});

test('MP-065 one provider serializes requests, including a late call after timeout',async()=>{
 const state=game(),runner=createPlanRunner({engine:E,timeoutMs:20});let release,active=0,max=0,calls=0;
 const ai={json:async()=>{calls++;active++;max=Math.max(max,active);if(calls===1)await new Promise(r=>release=r);active--;return draft();}};
 const first=runner.run({state,provider:ai,intent:'Homes at Old Mill'});await new Promise(r=>setImmediate(r));
 const second=runner.run({state,provider:ai,intent:'Homes at Old Mill'});const a=await first;assert.equal(a.status,'unavailable');assert.equal(calls,1);release();await second;assert.equal(max,1);
});

test('MP-010 MP-011 MP-015 optional event briefing is read-only and traces the source fixture',async()=>{
 const state=game(),runner=createPlanRunner({engine:E}),before=JSON.stringify(state),event={id:'fixture:year2:oldmill',reason:'Old Mill is eligible for review',eligible:true};
 const result=await runner.run({mode:'briefing',state,event,provider:provider({sourceEventId:event.id,briefing:'Compare park access with storefront jobs.'}),intent:'Explain the opportunity'});
 assert.equal(result.status,'ready');assert.equal(result.sourceEvent.id,event.id);assert.equal(runner.accept(result,{apply:()=>assert.fail('briefings cannot commit')}),false);assert.equal(JSON.stringify(state),before);
 const next=E.resolveYear(structuredClone(state));const noAI=E.resolveYear(structuredClone(state));assert.deepEqual(next,noAI);
});

test('MP-032 MP-033 selected policy-only requests clarify instead of demolishing plots',async()=>{
 const state=game(),runner=createPlanRunner({engine:E});const original=JSON.stringify(state);
 const result=await runner.run({state,provider:provider(draft({policy:'parking_reform'})),intent:'Drop parking minimums',plots:[[6,12]]});
 assert.equal(result.status,'unsupported');assert.match(result.blocker,/no construction site/);assert.equal(JSON.stringify(state),original);
});

test('MP-033 unknown physical locations cannot be replaced with the model’s preferred parcel',async()=>{
 const state=game(),runner=createPlanRunner({engine:E});const result=await runner.run({state,provider:provider(draft(),draft()),intent:'Build homes at the moonbase'});
 assert.equal(result.status,'invalid');assert.match(result.blocker,/no substitute site/);
 const behind=await runner.run({state,provider:provider(draft()),intent:'Build homes behind the elementary school'});assert.equal(behind.status,'ready');assert.deepEqual(behind.draft.plots,E.SITES.school_lot);
});

test('MP-010 MP-011 MP-015 a late event briefing never holds or modifies deterministic year advancement',async()=>{
 const state=game(),control=structuredClone(state),runner=createPlanRunner({engine:E}),event={id:'fixture:eligible',reason:'A planning opportunity',eligible:true};let finish;
 const pending=runner.run({mode:'briefing',state,event,provider:{json:()=>new Promise(r=>finish=r)},intent:'Brief me'});
 await new Promise(r=>setImmediate(r));E.resolveYear(state);E.resolveYear(control);assert.deepEqual(state,control);
 finish({sourceEventId:event.id,briefing:'A late optional briefing.'});const late=await pending;assert.equal(late.status,'stale');assert.deepEqual(state,control);
});

test('MP-015 MP-026 MP-033 shared illustrated fixtures use the same accepted mayoral revision and forecast',async()=>{
 const {makePlanFixtures}=require('./fixtures/plans.cjs');const fixtures=makePlanFixtures(E);
 const {state,mayoral,revision,park,commerce}=fixtures;const before=JSON.stringify(state),runner=createPlanRunner({engine:E});
 assert.deepEqual(E.plotsOf(park),E.plotsOf(commerce));
 const result=await runner.run({mode:'revise',state,proposal:mayoral,provider:provider({changes:{homes:30,parking:0,plaza:true}}),intent:'Add ten homes and a plaza; remove parking'});
 assert.equal(result.status,'ready');assert.deepEqual(result.proposal.plan,revision.plan);assert.deepEqual(result.proposal.plots,mayoral.plots);
 assert.deepEqual(result.forecast.after,E.effectsOf(revision));assert.equal(JSON.stringify(state),before);
});

test('MP-015 MP-032 MP-033 revisions cannot convert a no-site ordinance into unsited construction',async()=>{
 const state=game(),proposal=E.makeInitiative(state,{title:'Parking reform',plan:{policy:'parking_reform'}}),runner=createPlanRunner({engine:E});
 const original=JSON.stringify(state),intent='Add twenty homes to this ordinance';
 const result=await runner.run({mode:'revise',state,proposal,provider:provider({changes:{homes:20},mood:'warmer'}),intent});
 assert.equal(result.status,'unsupported');assert.match(result.blocker,/no (?:construction )?site/i);assert.equal(result.intent,intent);
 assert.equal(runner.accept(result,{apply:()=>assert.fail('unsited construction cannot commit')}),false);assert.equal(JSON.stringify(state),original);
});

test('MP-015 MP-032 MP-033 revisions cannot leave demolition plots attached to a policy-only proposal',async()=>{
 const state=game(),plots=E.SITES.oldmill,proposal=E.makeInitiative(state,{title:'Old Mill Homes',plots,plan:{homes:20}}),runner=createPlanRunner({engine:E});
 const original=JSON.stringify(state),intent='Remove the homes and enact parking reform instead';
 const result=await runner.run({mode:'revise',state,proposal,provider:provider({changes:{homes:0,policy:'parking_reform'}}),intent});
 assert.equal(result.status,'unsupported');assert.match(result.blocker,/ordinance|policy-only/i);assert.equal(result.intent,intent);
 assert.equal(runner.accept(result,{apply:()=>assert.fail('policy-only plot demolition cannot commit')}),false);assert.equal(JSON.stringify(state),original);
});

test('MP-015 MP-033 physical initiative revisions recheck fixed plot legality before inference',async()=>{
 const state=game(),proposal=E.makeInitiative(state,{title:'Old Mill Homes',plots:E.SITES.oldmill,plan:{homes:20}}),runner=createPlanRunner({engine:E});
 state.grid[12*E.N+6].road=true;const original=JSON.stringify(state);let calls=0;
 const result=await runner.run({mode:'revise',state,proposal,provider:{json:async()=>{calls++;return{changes:{homes:30}};}},intent:'Add ten homes'});
 assert.equal(result.status,'invalid');assert.match(result.blocker,/plot.*cannot be used/i);assert.equal(calls,0);assert.equal(JSON.stringify(state),original);
});

test('MP-033 explicit alternative creek sites require clarification while creek buffers remain context',async()=>{
 const state=game(),runner=createPlanRunner({engine:E});
 for(const intent of ['Build homes at the Old Mill lot or the Kish Creek bank','Build homes at Old Mill or creek bank','Build homes at Old Mill or the creek']){
  let calls=0;const result=await runner.run({state,provider:{json:async()=>{calls++;return draft();}},intent});
  assert.equal(result.status,'invalid',intent);assert.match(result.blocker,/more than one site/i);assert.equal(calls,0);
 }
 const intent='Build homes at the Old Mill lot with a creek buffer';
 const contextual=await runner.run({state,provider:provider(draft({homes:20,green:1})),intent});assert.equal(contextual.status,'ready');assert.deepEqual(contextual.draft.plots,E.SITES.oldmill);
 const selected=await runner.run({state,provider:provider(draft()),intent:'Build homes at Old Mill or the Kish Creek bank',plots:[[6,12]]});assert.equal(selected.status,'ready');assert.deepEqual(selected.draft.plots,[[6,12]]);
});
