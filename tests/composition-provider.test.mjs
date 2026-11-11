import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const require=createRequire(import.meta.url);
const {create}=require('../src/composition-requests.js');
const context={module:{exports:{}},MP_BUILD:{flags:{compositionPlans:true}}};
vm.runInNewContext(readFileSync(new URL('../src/engine.js',import.meta.url),'utf8'),context);
const E=context.module.exports;
const copy=value=>JSON.parse(JSON.stringify(value));
const fresh=()=>E.newGame(2301,undefined,{gameId:'provider-test'});
const land=(s,n=4)=>s.grid.filter(c=>E.canBuildOn(s,c.x,c.y)&&!c.b&&!c.site&&c.t==='grass').slice(0,n).map(c=>[c.x,c.y]);
const part=(id,capability,quantity,area,sharedWith=null)=>({id,capability,label:id,quantity,area,sharedWith});
const program=(intent='A cooperative workshop')=>({version:2,title:'Uncatalogued cooperative',intent,components:[part('work','workplace',8,.5)],conditions:{hours:10,deliveries:'daytime',access:true,buffer:0,preserve:0,affordable:false},assumptions:[],omissions:[]});
const provider=(...values)=>({admit:async()=>({ok:true,promptTokens:200,contextWindowTokens:4096,maxOutputTokens:640}),json:async()=>{const value=values.shift();if(value instanceof Error)throw value;return value;}});
const preview=s=>E.previewProgram(s,{program:program(),plots:land(s)}).proposal;
const command=(s,type,payload)=>({id:s.actionHighWater+1,gameId:s.gameId,expectedRevision:s.revision,expectedGeneration:0,type,payload});
function posted(){const s=fresh();return E.applyCommand(s,command(s,'postProgram',{program:program(),plots:land(s),acknowledgedScope:true})).state;}

test('MP-076 MP-081 typed original composition is previewed without public mutation or input truncation',async()=>{
  const state=fresh(),before=E.canonical(state),plots=land(state).reverse(),intent='A newly named cooperative workshop '+ 'α'.repeat(1000);
  const result=await create({engine:E}).run({mode:'draft',state,plots,intent,provider:provider({program:program(intent)})});
  assert.equal(result.status,'ready',result.blocker);assert.equal(result.intent,intent);assert.equal(result.program.intent,intent);
  assert.deepEqual(copy(result.proposal.plots),copy(plots));assert.equal(E.canonical(state),before);
  assert.equal(result.forecast.money.costK,E.effectsOf(result.proposal,state).cost);
});

test('MP-077 MP-081 composed patches and seeded legacy revisions retain identity and unrelated fields',async()=>{
  const state=fresh(),p=preview(state),runner=create({engine:E});
  const revised=await runner.run({mode:'revise',state,proposal:p,intent:'Reduce work places to 4',provider:provider({patch:{upsert:[{id:'work',quantity:4}]}})});
  assert.equal(revised.status,'ready',revised.blocker);assert.equal(revised.program.components[0].quantity,4);assert.equal(revised.program.components[0].area,.5);assert.equal(revised.program.intent,p.program.intent);
  const bridge=state.proposals.find(p=>p.kind==='bridge'),before=copy(bridge);
  const legacy=await runner.run({mode:'revise',state,proposal:bridge,intent:'Patch the deck',provider:provider({changes:{scope:'patch'}})});
  assert.equal(legacy.status,'ready',legacy.blocker);assert.equal(legacy.program,undefined);assert.equal(legacy.proposal.kind,'bridge');assert.equal(legacy.proposal.plan.scope,'patch');assert.deepEqual(copy(bridge),before);
});

test('MP-081 malformed and unknown replies get one repair, never raw exception text',async()=>{
  const state=fresh(),calls=[],runner=create({engine:E});
  const ai=provider();ai.json=async(prompt,options)=>{calls.push({prompt,options});return {program:{...program(),PRIVATE_FIELD:'PRIVATE_VALUE'}};};
  const result=await runner.run({mode:'draft',state,plots:land(state),intent:'Private original intent',provider:ai});
  assert.equal(result.status,'invalid');assert.equal(result.code,'unknown_field');assert.equal(calls.length,2);assert.equal(result.intent,'Private original intent');
  assert.doesNotMatch(result.blocker,/PRIVATE_FIELD|PRIVATE_VALUE/);
});

const offlineSource=readFileSync(new URL('../src/offline-ai.js',import.meta.url),'utf8');
const {createOfflineProvider}=await import('data:text/javascript;base64,'+Buffer.from(offlineSource).toString('base64'));
const modelId='Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
// A runtime fixture, not GPU inference. Its interface matches pinned 0.2.87.
class Conversation{
  constructor(config){this.config=config;this.messages=[];}
  appendMessage(role,text){this.messages.push([role,text]);}
  appendReplyHeader(role){this.messages.push([role,undefined]);}
  getPromptArray(){return [this.config.system_template.replace('{system_message}',this.config.system_message),
    this.config.roles.user+'\n'+this.messages[0][1]+this.config.seps[0],this.config.roles.assistant+'\n'];}
}
function runtime(reply={reply:'fixture'},window=4096){
  const calls=[],encoded=[],config={context_window_size:window,sliding_window_size:-1,conv_template:{system_template:'<|im_start|>system\n{system_message}<|im_end|>\n',system_message:'A loaded system.',roles:{user:'<|im_start|>user',assistant:'<|im_start|>assistant'},seps:['<|im_end|>\n'],system_prefix_token_ids:[1,2]}};
  const pipeline={config,contextWindowSize:window,slidingWindowSize:-1,conversation:new Conversation(config.conv_template),
    tokenizer:{encode(text){encoded.push(text);return new Uint32Array([...text].length);}},getConversationObject(){return this.conversation;}};
  const engine={loadedModelIdToPipeline:new Map([[modelId,pipeline]]),loadedModelIdToChatConfig:new Map([[modelId,config]]),
    chat:{completions:{async create(options){calls.push(options);return {choices:[{message:{content:JSON.stringify(reply)},finish_reason:'stop'}]};}}}};
  return {engine,pipeline,config,calls,encoded};
}
test('MP-065 MP-081 Qwen admission counts loaded template segments, prefix IDs and 640 reply tokens exactly',async()=>{
  const f=runtime(),ai=createOfflineProvider(f.engine,modelId),input='α🌳';
  const fit=await ai.admit(input);
  assert.equal(fit.ok,true);assert.equal(fit.contextWindowTokens,4096);assert.equal(fit.maxOutputTokens,640);
  assert.equal(fit.promptTokens,2+f.encoded.reduce((n,s)=>n+[...s].length,0));
  assert.equal(f.encoded.length,3);assert.equal(f.pipeline.conversation.messages.length,0);
  f.config.context_window_size=fit.promptTokens+640;f.pipeline.contextWindowSize=f.config.context_window_size;
  assert.equal((await ai.admit(input)).ok,true);
  f.config.context_window_size--;f.pipeline.contextWindowSize--;
  assert.equal((await ai.admit(input)).code,'context_limit');
  await assert.rejects(ai.json(input,{requireAdmission:true}),{code:'context_limit'});assert.equal(f.calls.length,0);
  assert.deepEqual(await ai.json(input),{reply:'fixture'},'legacy calls retain their existing behavior');
});
test('MP-081 composition admission rejects unknown runtime metadata and rechecks inside the shared queue',async()=>{
  const legacy=createOfflineProvider({chat:{completions:{async create(){return {choices:[{message:{content:'{}'}}]};}}}},modelId);
  assert.equal((await legacy.admit('text')).code,'runtime_metadata_unavailable');assert.deepEqual(await legacy.json('text'),{});
  const f=runtime(),ai=createOfflineProvider(f.engine,modelId);
  assert.equal((await ai.admit('text')).ok,true);
  f.pipeline.contextWindowSize=8;f.config.context_window_size=8;
  await assert.rejects(ai.json('text',{requireAdmission:true}),{code:'context_limit'});assert.equal(f.calls.length,0);
});
test('MP-075 MP-081 composition diagnostics complete previews without claiming an application or leaking validator content',async()=>{
  const D=require('../src/qwen-diagnostics.js');let data={events:[],meta:{}};
  const diagnostics=D.create({enabled:true,build:{channel:'dev',version:'fixture',commit:'provider'},storage:{async read(){return copy(data);},async write(next){data=copy(next);}}});
  const state=fresh(),ai=provider({program:{...program(),SECRET_FIELD:'SECRET_VALUE'}},{program:program('SECRET_INPUT')});
  const result=await create({engine:E,diagnostics}).run({mode:'draft',state,plots:land(state),intent:'SECRET_INPUT',provider:ai});
  assert.equal(result.status,'ready',result.blocker);
  const doc=(await diagnostics.snapshot()).prepared.document,summary=doc.attempts.find(a=>a.requestId===result.requestId);
  assert.equal(summary.status,'complete');assert.equal(summary.applicationStatus,'not-observed');assert.equal(summary.task,'draft');
  assert.ok(doc.events.some(e=>e.metadata.resultCode==='unknown_field'));
  assert.doesNotMatch(JSON.stringify(doc),/SECRET_INPUT|SECRET_FIELD|SECRET_VALUE/);
});
test('MP-064 MP-081 hosted json-only transport preserves typed play with unverified limits and safe server rejection',async()=>{
  const state=fresh(),optionsSeen=[];
  const hosted={async json(prompt,options){optionsSeen.push(options);return {program:program('A hosted workshop')};}};
  const runner=create({engine:E}),result=await runner.run({mode:'draft',state,plots:land(state),intent:'A hosted workshop',provider:hosted});
  assert.equal(result.status,'ready',result.blocker);assert.deepEqual(result.admission,{status:'unverified'});
  assert.equal(Object.hasOwn(optionsSeen[0],'requireAdmission'),false);
  hosted.json=async()=>{throw Object.assign(new Error('PRIVATE HOST ERROR'),{code:'context_length_exceeded'});};
  const failed=await runner.run({mode:'draft',state,plots:land(state),intent:'Complete input retained',provider:hosted});
  assert.equal(failed.code,'context_limit');assert.equal(failed.attempts,1);assert.equal(failed.intent,'Complete input retained');assert.doesNotMatch(failed.blocker,/PRIVATE/);
  const unavailable=await runner.run({mode:'draft',state,plots:land(state),intent:'Offline requires real metadata',provider:{offline:true,json:hosted.json}});
  assert.equal(unavailable.code,'runtime_metadata_unavailable');
});

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function logger(){
  const D=require('../src/qwen-diagnostics.js');let stored={events:[],meta:{}};
  const diagnostics=D.create({enabled:true,build:{channel:'dev',version:'provider-test',commit:'bounded-fixes'},now:()=>Date.parse('2026-11-11T12:00:00Z'),
    storage:{async read(){return copy(stored);},async write(next){stored=copy(next);}}});
  return diagnostics;
}
function pitched(){
  const state=posted(),proposal=state.proposals.at(-1),jobs=E.effectsOf(proposal,state).jobs,argument='The accepted plan provides '+jobs+' jobs.';
  const envelope={argument,source:'typed',programRevision:proposal.programRevision,claims:[{id:'jobs',type:'effect',field:'jobs',operator:'eq',value:jobs,evidence:{start:0,end:argument.length,quote:argument}}]};
  const committed=E.applyCommand(state,command(state,'persuade',{proposalId:proposal.id,memberId:'marsh',...envelope}));
  assert.equal(committed.ok,true,committed.reasons?.join('; '));
  return {state:committed.state,proposal:committed.state.proposals.at(-1),intent:argument,memberId:'marsh',
    receipt:{id:committed.receipt.id,fingerprint:committed.receipt.fingerprint,memberId:'marsh'},saved:copy(committed.receipt.originalResult)};
}
function historyWitness(build=true){
  let state=fresh();
  const farm=state.proposals.find(p=>p.id==='farm-access'),plots=copy(E.plotsOf(farm,state)).filter(([x,y])=>E.canBuildOn(state,x,y)&&!state.grid.find(c=>c.x===x&&c.y===y).b).slice(0,1);
  const garden=program('Keep a garden with a recorded access commitment');garden.title='History witness garden';garden.components=[part('garden','green',.5,.5)];
  const apply=(type,payload)=>{const result=E.applyCommand(state,command(state,type,payload));assert.equal(result.ok,true,result.reasons?.join('; '));state=result.state;return result;};
  apply('postProgram',{program:garden,plots,acknowledgedScope:true});
  const proposal=state.proposals.at(-1);for(const member of Object.values(state.council))member.rel=100;
  apply('decision',{proposalId:proposal.id,action:'vote',funding:'cash',route:E.approvalRoute(state,proposal).id});
  if(build){
    apply('decision',{proposalId:farm.id,action:'table',funding:null,route:E.approvalRoute(state,farm).id});
    apply('resolveYear',{});
  }
  return {state,gardenId:proposal.id,plots,farm:state.proposals.find(p=>p.id===farm.id)};
}
const promptContext=prompt=>JSON.parse(prompt.split('\nContext: ')[1].split('\nOriginal input: ')[0]);
function legacyHistoryWitness(build=true,council=false){
  let state=fresh(),proposal=state.proposals.find(p=>p.kind==='bridge'),funding='cash';
  if(council){
    for(const member of Object.values(state.council))member.rel=100;
    const candidate=state.proposals.find(p=>p.council&&!p.program),vote=E.forecastVote(state,candidate,candidate.id);
    proposal=state.proposals.find(p=>p.id===vote.winner);assert.ok(proposal,'use an actual winning council option');funding='bond';
  }
  const acceptedPlan=copy(proposal.plan),decision=E.applyCommand(state,command(state,'decision',{proposalId:proposal.id,action:council?'vote':'approve',funding,route:E.approvalRoute(state,proposal).id}));
  assert.equal(decision.ok,true,decision.reasons?.join('; '));state=decision.state;
  if(build){const year=E.applyCommand(state,command(state,'resolveYear',{}));assert.equal(year.ok,true,year.reasons?.join('; '));state=year.state;}
  const snapshot=(build?state.built:state.pending).find(p=>p.id===proposal.id);
  return {state,proposalId:proposal.id,acceptedPlan,snapshot,plots:copy(E.plotsOf(snapshot,state))};
}
test('MP-079 MP-081 R9-legacy actual cash bridge delivery supplies accepted kind/plan without historical repricing',async()=>{
  assert.equal(typeof E.legacyRevision,'function','history must use the engine legacy fingerprint helper');
  const {state,proposalId,acceptedPlan,snapshot,plots}=legacyHistoryWitness(),before=E.canonical(state);let context;
  const engine={...E,previewLegacyRevision(){throw new Error('Do not preview historical occupied land');},effectsOf(){throw new Error('Do not reprice historical land');}};
  const result=await create({engine}).run({mode:'draft',state,plots,intent:'Review the previously delivered work on this site',provider:{json:async prompt=>{
    context=promptContext(prompt);return {status:'clarify',questions:['Which supported change do you want?']};
  }}});
  assert.equal(result.status,'clarify',result.blocker);
  const history=context.projectHistory.find(h=>h.source.proposalId===proposalId);
  assert.ok(history,'actual delivered legacy project must be included');assert.equal(history.kind,'bridge');assert.deepEqual(copy(history.plan),acceptedPlan);
  assert.equal(history.stage,'built');assert.equal(history.source.programRevision,E.legacyRevision(snapshot,state));
  assert.equal(history.source.deliveryYear,snapshot.done);assert.equal(Object.hasOwn(history,'program'),false);assert.equal(Object.hasOwn(history,'conditions'),false);
  assert.doesNotMatch(JSON.stringify(context.projectHistory),/"(?:plots|grid|receipts|layout)"\s*:/);assert.equal(E.canonical(state),before);
});
test('MP-079 MP-081 R9-legacy pending council decisions and inconsistent archives share the generic history boundary',async()=>{
  const pending=legacyHistoryWitness(false,true);let context;
  await create({engine:E}).run({mode:'draft',state:pending.state,plots:pending.plots,intent:'Review the approved plan settings',
    provider:{json:async prompt=>{context=promptContext(prompt);return {status:'clarify',questions:['Which settings should change?']};}}});
  const history=context.projectHistory.find(h=>h.source.proposalId===pending.proposalId);
  assert.ok(history,'pending council legacy history must be included');assert.equal(history.stage,'construction');assert.equal(history.kind,pending.snapshot.kind);
  assert.deepEqual(copy(history.plan),pending.acceptedPlan);assert.equal(history.source.decisionRoute,pending.snapshot.decision.route);
  for(const kind of ['plan','kind','site','decision','revision','invented-conditions','missing-source']){
    const {state,plots,proposalId}=legacyHistoryWitness(),record=state.projectRecords.find(r=>r.proposalId===proposalId);
    if(kind==='plan')record.plan.scope=record.plan.scope==='patch'?'full':'patch';
    if(kind==='kind')record.kind='park';if(kind==='site')record.site='wrong-site';
    if(kind==='decision')record.decision.funding='bond';if(kind==='revision')record.programRevision='wrong';
    if(kind==='invented-conditions')record.conditions={access:true};if(kind==='missing-source')state.built=[];
    const before=E.canonical(state);
    await create({engine:E}).run({mode:'draft',state,plots,intent:'Review this site',provider:{json:async prompt=>{
      context=promptContext(prompt);return {status:'clarify',questions:['What should change?']};
    }}});
    assert.equal(context.projectHistory.length,0,kind);assert.equal(E.canonical(state),before,kind);
  }
});
test('MP-079 MP-081 R9-legacy and composed histories share one three-record budget',async()=>{
  const composed=historyWitness(),legacy=legacyHistoryWitness(),state=composed.state,
    legacyRecord=legacy.state.projectRecords.find(r=>r.proposalId===legacy.proposalId),
    composedRecord=state.projectRecords.find(r=>r.proposalId===composed.gardenId),
    composedSnapshot=state.built.find(p=>p.id===composed.gardenId);
  state.built.push(copy(legacy.snapshot));state.projectRecords.push(copy(legacyRecord));
  for(const [id,source,record] of [['a-composed-archive',composedSnapshot,composedRecord],['b-legacy-archive',legacy.snapshot,legacyRecord],['c-composed-archive',composedSnapshot,composedRecord]]){
    const snapshot=copy(source),entry=copy(record);snapshot.id=id;
    snapshot.programRevision=snapshot.program?E.fingerprint({program:snapshot.program,plots:E.plotsOf(snapshot,state),presenter:snapshot.presenter,id}):E.legacyRevision(snapshot,state);
    entry.proposalId=id;entry.programRevision=snapshot.programRevision;state.built.push(snapshot);state.projectRecords.push(entry);
  }
  const before=E.canonical(state);let context;
  await create({engine:E}).run({mode:'draft',state,plots:[...composed.plots,...legacy.plots],intent:'Review the accepted work on these sites',
    provider:{json:async prompt=>{context=promptContext(prompt);return {status:'clarify',questions:['Which project should change?']};}}});
  assert.equal(context.projectHistory.length,3);
  assert.ok(context.projectHistory.some(h=>h.representation==='legacy-plan'));
  assert.ok(context.projectHistory.some(h=>h.representation==='composition-v2'));
  assert.equal(E.canonical(state),before);
});
test('MP-079 MP-081 R9 reopened farm revision receives the built overlapping garden commitment with source IDs',async()=>{
  const {state,farm,gardenId}=historyWitness(),before=E.canonical(state),intent='Retain the prior recorded garden access commitment';
  assert.equal(farm.status,'open');assert.equal(state.year,2);
  let context;
  const result=await create({engine:E}).run({mode:'revise',state,proposal:farm,intent,provider:{json:async prompt=>{
    context=promptContext(prompt);return {patch:{conditions:{access:true}}};
  }}});
  assert.equal(result.status,'ready',result.blocker);
  const history=context.projectHistory.find(h=>h.source.proposalId===gardenId),built=state.built.find(p=>p.id===gardenId);
  assert.ok(history,'built overlapping history must be present');assert.equal(history.stage,'built');assert.equal(history.conditions.access,true);
  assert.equal(history.source.snapshot,'built');assert.equal(history.source.programRevision,built.programRevision);
  assert.equal(history.source.decisionYear,built.decision.year);assert.equal(history.source.deliveryYear,built.done);
  assert.match(context.historyPolicy,/not.*authority|no.*authority/i);assert.doesNotMatch(JSON.stringify(context),/"(?:plots|grid|receipts|savedAt|gameId|layout)"\s*:/);
  assert.equal(E.canonical(state),before);assert.equal(result.program.conditions.access,true);
});
test('MP-079 MP-081 R9 includes verified pending conditions but excludes unrelated and inconsistent historical records',async()=>{
  const pending=historyWitness(false);let context;
  await create({engine:E}).run({mode:'draft',state:pending.state,plots:pending.plots,intent:'Review the access commitment on this site',
    provider:{json:async prompt=>{context=promptContext(prompt);return {status:'clarify',questions:['Wait for construction or use a different site?']};}}});
  assert.equal(context.projectHistory.length,1);assert.equal(context.projectHistory[0].stage,'construction');
  assert.equal(context.projectHistory[0].source.snapshot,'pending');assert.equal(context.projectHistory[0].conditions.access,true);
  for(const kind of ['unrelated','conditions','snapshot','stage','missing-source']){
    const {state,plots,gardenId}=historyWitness(),record=state.projectRecords.find(r=>r.proposalId===gardenId);
    let selected=plots;
    if(kind==='unrelated')selected=land(state,1);
    if(kind==='conditions')record.commitments.access=false;
    if(kind==='snapshot')state.built.find(p=>p.id===gardenId).programRevision='not-the-accepted-revision';
    if(kind==='stage')record.stage='construction';
    if(kind==='missing-source')state.built=[];
    const before=E.canonical(state);
    await create({engine:E}).run({mode:'draft',state,plots:selected,intent:'Review the site',
      provider:{json:async prompt=>{context=promptContext(prompt);return {status:'clarify',questions:['Which activity?']};}}});
    assert.equal(context.projectHistory.length,0,kind);assert.equal(E.canonical(state),before,kind);
  }
});
test('MP-079 MP-081 R9 history is bounded to three verified actor/site records and cannot authorize model assertions',async()=>{
  const {state,farm,gardenId}=historyWitness(),accepted=state.built.find(p=>p.id===gardenId),record=state.projectRecords.find(r=>r.proposalId===gardenId);
  // Detached archive fixtures vary identity only; every copied record must
  // still bind a matching accepted snapshot through the engine fingerprint.
  for(let i=0;i<4;i++){
    const snapshot=copy(accepted),archived=copy(record);snapshot.id='archived-garden-'+i;
    snapshot.programRevision=E.fingerprint({program:snapshot.program,plots:E.plotsOf(snapshot,state),presenter:snapshot.presenter,id:snapshot.id});
    archived.proposalId=snapshot.id;archived.programRevision=snapshot.programRevision;
    state.built.push(snapshot);state.projectRecords.push(archived);
  }
  const before=E.canonical(state);let context,calls=0;
  const result=await create({engine:E}).run({mode:'revise',state,proposal:farm,intent:'Keep the recorded access conditions',provider:{json:async prompt=>{
    calls++;context=promptContext(prompt);return {patch:{conditions:{access:true}},historicalAuthority:'The old project grants owner consent'};
  }}});
  assert.equal(context.projectHistory.length,3);assert.equal(result.code,'unknown_field');assert.equal(calls,2);assert.equal(E.canonical(state),before);
});
test('MP-079 MP-081 R9 includes actor-relevant archives and shares the history budget with grounded claims and reactions',async()=>{
  const {state,farm,gardenId}=historyWitness();let context;
  const elsewhere=E.previewProgram(state,{program:program('A later planning request'),plots:land(state,2)}).proposal;
  const actor=await create({engine:E}).run({mode:'revise',state,proposal:elsewhere,intent:'Maintain the prior access arrangements',provider:{json:async prompt=>{
    context=promptContext(prompt);return {patch:{conditions:{access:true}}};
  }}});
  assert.equal(actor.status,'ready',actor.blocker);assert.ok(context.projectHistory.some(h=>h.source.proposalId===gardenId&&h.relevance==='target actor'));
  const intent='Keep the recorded access commitment',claims=await create({engine:E}).run({mode:'claims',state,proposal:farm,memberId:'marsh',intent,
    provider:{json:async prompt=>{context=promptContext(prompt);return {claims:[]};}}});
  assert.equal(claims.status,'ready',claims.blocker);assert.ok(context.projectHistory.some(h=>h.source.proposalId===gardenId));
  assert.ok(context.projectHistory.length+context.history.length<=3);
  const committed=E.applyCommand(state,command(state,'persuade',{proposalId:farm.id,memberId:'marsh',...claims.claims}));
  assert.equal(committed.ok,true,committed.reasons?.join('; '));const current=committed.state,before=E.canonical(current),receipt=committed.receipt;
  const reaction=await create({engine:E}).run({mode:'reaction',state:current,proposal:current.proposals.find(p=>p.id===farm.id),intent,memberId:'marsh',
    receipt:{id:receipt.id,fingerprint:receipt.fingerprint,memberId:'marsh'},provider:{json:async prompt=>{
      context=promptContext(prompt);return {acknowledgement:'noted',concernIndexes:[]};
    }}});
  assert.equal(reaction.status,'ready',reaction.blocker);assert.ok(context.projectHistory.some(h=>h.source.proposalId===gardenId));
  assert.equal(E.canonical(current),before);
});
test('MP-075 MP-081 current policy and save rejection codes stay closed and precise',async()=>{
  const state=fresh(),p=program('An operating program');p.components=[part('one','policy',1,0),part('two','policy',1,0)];
  const diagnostics=logger(),result=await create({engine:E,diagnostics}).run({mode:'draft',state,plots:[],intent:p.intent,provider:provider({program:p},{program:p})});
  assert.equal(result.ruleId,'policy_capacity_exceeded');assert.equal(result.fieldId,'quantity');assert.equal(result.code,'value_out_of_range');
  await diagnostics.record('composition.application','failed',{stage:'persistence',resultCode:'save_state_invalid'});
  await diagnostics.record('composition.application','failed',{stage:'persistence',resultCode:'save_collection_entry_invalid:PRIVATE_HISTORY'});
  const doc=(await diagnostics.snapshot()).prepared.document;
  assert.ok(doc.events.some(e=>e.metadata.ruleId==='policy_capacity_exceeded'));
  assert.equal(doc.events.at(-2).metadata.resultCode,'save_state_invalid');assert.equal(doc.events.at(-1).metadata.resultCode,undefined);
  assert.doesNotMatch(JSON.stringify(doc),/PRIVATE_HISTORY/);
});
test('MP-075 MP-081 clarification has a retained terminal event and complete selected-date summary',async()=>{
  const state=fresh(),diagnostics=logger(),intent='A flexible gathering activity';
  const result=await create({engine:E,diagnostics}).run({mode:'draft',state,plots:land(state),intent,
    provider:provider({status:'clarify',questions:['Which activity needs most of the space?'],omissions:[]})});
  assert.equal(result.status,'clarify');assert.equal(result.intent,intent);
  const doc=(await diagnostics.snapshot()).prepared.document,final=doc.events.find(e=>e.name==='composition.final');
  assert.equal(final.outcome,'clarify');assert.equal(final.metadata.resultCode,'intent_unclear');
  assert.equal(doc.attempts[0].status,'complete');assert.equal(doc.attempts[0].applicationStatus,'not-observed');
});
test('MP-076 MP-081 evaluator-added trusted definition reduces before fitting, without changing trusted data',async()=>{
  const state=fresh(),base=program('A larger authored work cooperative');base.components=[part('work','workplace',80,2)];
  state.scenario.programDefinitions['new-cooperative']={id:'new-cooperative',label:'Artisan cooperative',program:base};
  const original=E.canonical(state),plots=land(state,1),intent='An artisan cooperative at one tenth the size';
  assert.equal(E.previewProgram(state,{program:base,plots}).ok,false);
  let prompt;
  const result=await create({engine:E}).run({mode:'draft',state,plots,intent,provider:{json:async text=>{prompt=text;return {definitionId:'new-cooperative',patch:{upsert:[{id:'work',quantity:8,area:.5}]}};}}});
  assert.equal(result.status,'ready',result.blocker);assert.equal(result.program.components[0].quantity,8);assert.equal(result.program.intent,intent);
  assert.deepEqual(copy(result.proposal.plots),copy(plots));assert.equal(E.canonical(state),original);assert.match(prompt,/"id":"new-cooperative"/);
  const unrelatedIntent='Zephyr research office',unrelatedProgram=program(unrelatedIntent);unrelatedProgram.title=unrelatedIntent;
  const unrelated=await create({engine:E}).run({mode:'draft',state,plots,intent:unrelatedIntent,provider:{json:async text=>{assert.ok(!text.includes('"id":"new-cooperative"'));return {program:unrelatedProgram};}}});
  assert.equal(unrelated.status,'ready',unrelated.blocker);
  assert.equal(unrelated.program.title,unrelatedIntent);
});
test('MP-076 MP-077 uncatalogued activities and three narrow edits keep site, identity, sharing and unrelated fields',async()=>{
  const state=fresh(),plots=land(state),intent='A novel cooperative with shared learning and a planted yard',runner=create({engine:E});
  const p=program(intent);p.title='Uncatalogued Zephyr Guild';p.components.push(part('yard','green',.5,.5));
  const draft=await runner.run({mode:'draft',state,plots,intent,provider:provider({program:p})});
  const add=await runner.run({mode:'revise',state,proposal:draft.proposal,plots,intent:'Add 20 daily class participants sharing the work space',
    provider:provider({patch:{upsert:[part('class','community',20,.2,'work')]}})});
  const reduce=await runner.run({mode:'revise',state,proposal:add.proposal,plots,intent:'Reduce work places to 4',provider:provider({patch:{upsert:[{id:'work',quantity:4}]}})});
  const hours=await runner.run({mode:'revise',state,proposal:reduce.proposal,plots,intent:'Operate eight hours with a buffer',provider:provider({patch:{conditions:{hours:8,buffer:.25}}})});
  for(const result of [draft,add,reduce,hours]){assert.equal(result.status,'ready',result.blocker);assert.deepEqual(copy(result.proposal.plots),copy(plots));assert.equal(result.program.intent,intent);}
  assert.deepEqual(hours.program.components.find(c=>c.id==='yard'),draft.program.components.find(c=>c.id==='yard'));
  assert.equal(hours.program.components.find(c=>c.id==='class').sharedWith,'work');assert.equal(hours.program.title,p.title);
  assert.notEqual(add.forecast.money.costK,draft.forecast.money.costK);assert.notEqual(reduce.forecast.effects.jobs,add.forecast.effects.jobs);
  assert.equal(state.actionHighWater,0);assert.equal(state.initiativeYear,undefined);
});
test('MP-081 the 2000-character boundary is explicit and never clips over-limit input',async()=>{
  const state=fresh(),runner=create({engine:E});let calls=0;
  const ai={json:async()=>{calls++;return {program:program('x'.repeat(2000))};}};
  assert.equal((await runner.run({mode:'draft',state,plots:land(state),intent:'x'.repeat(2000),provider:ai})).status,'ready');
  const over=await runner.run({mode:'draft',state,plots:land(state),intent:'x'.repeat(2001),provider:ai});
  assert.equal(over.code,'input_limit');assert.equal(over.intent.length,2001);assert.equal(calls,1);
});
test('MP-078 MP-081 typed route and operating changes receive closed vocabulary and scoped trusted facts only',async()=>{
  const state=fresh(),proposal=state.proposals.find(p=>p.id==='campus-loading'),before=E.canonical(state);
  const operation={...copy(proposal.program.conditions.operations[0]),loadingRoute:'campus-entrance',publicSales:true,onSiteConsumption:false};
  const result=await create({engine:E}).run({mode:'revise',state,proposal,intent:'Move loading to the campus entrance and allow public sales',
    provider:{json:async prompt=>{
      const context=JSON.parse(prompt.split('\nContext: ')[1].split('\nOriginal input: ')[0]);
      assert.equal(context.conditionSchema.additionalProperties,false);
      const schema=context.conditionSchema.properties.operations.items;
      assert.equal(schema.additionalProperties,false);assert.equal(schema.properties.stage.const,'operation');
      assert.equal(schema.properties.publicSales.type,'boolean');assert.equal(schema.properties.onSiteConsumption.type,'boolean');
      assert.deepEqual(context.loadingRoutes.map(r=>r.id).sort(),['campus-entrance','service-lane']);
      assert.equal(context.loadingRoutes.find(r=>r.id==='campus-entrance').crossingConflict,true);
      assert.ok(context.actors.some(a=>a.id==='college_liaison'&&a.exposed&&a.controller===null));assert.ok(context.actors.some(a=>a.id==='freight_operator'&&a.controller==='freight_operator'));
      assert.doesNotMatch(JSON.stringify(context),/"(?:plots|grid|receipts|savedAt|gameId)"\s*:/);
      return {patch:{conditions:{operations:[operation]}}};
    }}});
  assert.equal(result.status,'ready',result.blocker);assert.equal(result.program.conditions.operations[0].loadingRoute,'campus-entrance');
  assert.equal(result.program.conditions.operations[0].publicSales,true);assert.equal(E.canonical(state),before);
});
test('MP-076 MP-081 unmodeled active-space reuse cannot silently become priced demolition',async()=>{
  const state=fresh(),before=E.canonical(state),intent='Reuse the existing warehouse as a shared workshop';let calls=0;
  const result=await create({engine:E}).run({mode:'draft',state,plots:land(state),intent,provider:{json:async()=>{calls++;return {program:program(intent)};}}});
  assert.equal(result.status,'unsupported');assert.match(result.blocker,/reuse|Reuse/);assert.equal(result.intent,intent);assert.equal(calls,0);assert.equal(E.canonical(state),before);
});
test('MP-078 MP-081 mixed true and false claims preserve original Unicode spans and engine findings without scoring',async()=>{
  const state=posted(),proposal=state.proposals.at(-1),diagnostics=logger(),intent='🌳 The plan provides 8 jobs and 999 homes.';
  const quote='8 jobs',start=intent.indexOf(quote),bad='999 homes',badStart=intent.indexOf(bad);
  const claims=[{id:'true',type:'effect',field:'jobs',operator:'eq',value:8,evidence:{start,end:start+quote.length,quote}},
    {id:'false',type:'effect',field:'housing',operator:'eq',value:999,evidence:{start:badStart,end:badStart+bad.length,quote:bad}}];
  const before=E.canonical(state),result=await create({engine:E,diagnostics}).run({mode:'claims',state,proposal,memberId:'marsh',intent,provider:provider({claims})});
  assert.equal(result.status,'ready',result.blocker);assert.equal(result.claims.argument,intent);assert.deepEqual(copy(result.claims.claims),claims);
  assert.equal(result.evaluation.claims[0].valid,true);assert.equal(result.evaluation.claims[1].code,'claim_false');assert.equal(result.evaluation.credit,'strong');
  assert.equal(E.canonical(state),before);
  const doc=(await diagnostics.snapshot()).prepared.document;
  assert.ok(doc.events.some(e=>e.metadata.resultCode==='claim_false'));assert.ok(!JSON.stringify(doc).includes(intent));
});
test('MP-078 MP-081 forged claim quote repairs once and cannot substitute the argument or execute an offer',async()=>{
  const state=posted(),proposal=state.proposals.at(-1),intent='This plan provides 8 jobs.',claim={id:'jobs',type:'effect',field:'jobs',operator:'eq',value:8,evidence:{start:0,end:intent.length,quote:intent}};
  const wrong=copy(claim);wrong.evidence.quote='Invented evidence';
  const repaired=await create({engine:E}).run({mode:'claims',state,proposal,memberId:'marsh',intent,provider:provider({claims:[wrong]},{claims:[claim]})});
  assert.equal(repaired.status,'ready',repaired.blocker);assert.equal(repaired.attempts,2);
  let calls=0;const bad=await create({engine:E}).run({mode:'claims',state,proposal,memberId:'marsh',intent,provider:{json:async()=>{calls++;return {claims:[claim],credit:'strong',offers:[{type:'favor'}]};}}});
  assert.equal(bad.code,'unknown_field');assert.equal(calls,2);assert.equal(state.lobbyCount?.marsh||0,0);
});
test('MP-077 MP-081 late composition results reject changed state, intent, site, target, provider and ticket',async()=>{
  for(const mutation of ['revision','year','game','target','closed','plots','provider','model','intent','member','ticket']){
    const state=fresh(),proposal=preview(state),gate=deferred(),entered=deferred();let active=true,calls=0;
    const ai=provider();ai.modelId='fixture-one';ai.json=()=>{calls++;entered.resolve();return gate.promise;};
    const options={mode:'revise',state,proposal,plots:copy(proposal.plots),provider:ai,intent:'Operate eight hours',isCurrent:()=>active};
    const pending=create({engine:E}).run(options);await entered.promise;
    if(mutation==='revision')state.revision++;if(mutation==='year')state.year++;if(mutation==='game')state.gameId='replacement';
    if(mutation==='target')proposal.program.conditions.hours=6;if(mutation==='closed')proposal.status='approved';
    if(mutation==='plots')options.plots.reverse();if(mutation==='provider')options.provider=provider();if(mutation==='model')ai.modelId='fixture-two';
    if(mutation==='intent')options.intent='Different input';if(mutation==='member')options.memberId='pryor';if(mutation==='ticket')active=false;
    const before=E.canonical(state);gate.resolve({patch:{conditions:{hours:8}}});const result=await pending;
    assert.equal(result.status,'stale',mutation+': '+result.blocker);assert.equal(result.program,undefined);assert.equal(E.canonical(state),before,mutation);assert.equal(calls,1);
  }
});
test('MP-081 cancellation before admission, during admission and during generation preserves state and input',async()=>{
  for(const stage of ['before','admission','generation']){
    const state=fresh(),before=E.canonical(state),controller=new AbortController(),gate=deferred(),entered=deferred();let calls=0;
    const ai=provider({program:program('A canceled idea')});
    if(stage==='before')controller.abort();
    if(stage==='admission')ai.admit=()=>{entered.resolve();return gate.promise;};
    if(stage==='generation')ai.json=()=>{calls++;entered.resolve();return gate.promise;};
    const pending=create({engine:E}).run({mode:'draft',state,plots:land(state),intent:'A canceled idea',provider:ai,signal:controller.signal});
    if(stage!=='before'){await entered.promise;controller.abort();}
    const result=await pending;assert.equal(result.status,'canceled',stage);assert.equal(result.intent,'A canceled idea');assert.equal(E.canonical(state),before);
    assert.equal(calls,stage==='generation'?1:0);gate.resolve(stage==='admission'?{ok:true,promptTokens:1,contextWindowTokens:4096,maxOutputTokens:640}:{program:program('A canceled idea')});
  }
});
test('MP-078 MP-081 valid receipt reactions, invalid selectors and retry never create a second persuasion',async()=>{
  const p=pitched(),before=E.canonical(p.state),runner=create({engine:E});
  for(const response of [{acknowledgement:'noted',concernIndexes:[]},{reply:'Invented new concern and guaranteed vote',points:100},{acknowledgement:'noted',concernIndexes:[999]}]){
    const result=await runner.run({mode:'reaction',...p,provider:provider(response)});
    assert.equal(result.status,'ready',result.blocker);assert.ok(result.reply.includes(String(p.saved.leanBefore)));assert.ok(result.reply.includes(String(p.saved.leanAfter)));
    assert.doesNotMatch(result.reply,/Invented|guaranteed/);assert.ok(result.reply.length<=600);assert.equal(E.canonical(p.state),before);
  }
});
test('MP-078 MP-081 wrong, missing, pruned and mismatched receipt references reject before generation',async()=>{
  const p=pitched(),post=p.state.receipts.find(r=>r.type==='postProgram');
  for(const kind of ['fingerprint','member','missing','pruned','type','target']){
    const state=copy(p.state),options={mode:'reaction',...p,state};let calls=0;
    if(kind==='fingerprint')options.receipt={...p.receipt,fingerprint:'wrong'};
    if(kind==='member'){options.memberId='pryor';options.receipt={...p.receipt,memberId:'pryor'};}
    if(kind==='missing')options.receipt={...p.receipt,id:999};if(kind==='pruned')state.receipts=[];
    if(kind==='type')options.receipt={id:post.id,fingerprint:post.fingerprint,memberId:'marsh'};
    if(kind==='target')options.proposal=state.proposals.find(p=>p.kind==='bridge');
    const before=E.canonical(state),result=await create({engine:E}).run({...options,provider:{json:async()=>{calls++;return {};}}});
    assert.equal(result.status,'invalid',kind);assert.equal(calls,0);assert.equal(result.reply,undefined);assert.equal(E.canonical(state),before);
  }
});
test('MP-078 MP-081 a reaction deadline falls back to the saved result without modifying receipt, quota or support',async()=>{
  const p=pitched(),before=E.canonical(p.state),gate=deferred(),diagnostics=logger();
  const result=await create({engine:E,timeoutMs:10,diagnostics}).run({mode:'reaction',...p,provider:{json:()=>gate.promise}});
  assert.equal(result.status,'ready',result.blocker);assert.equal(result.code,'reaction_fallback');assert.equal(result.fallback,true);
  assert.ok(result.reply.includes(String(p.saved.leanBefore)));assert.ok(result.reply.includes(String(p.saved.leanAfter)));assert.equal(E.canonical(p.state),before);
  gate.resolve({acknowledgement:'noted',concernIndexes:[]});await new Promise(r=>setImmediate(r));assert.equal(E.canonical(p.state),before);
  assert.ok((await diagnostics.snapshot()).prepared.document.events.some(e=>e.metadata.resultCode==='generation_timeout'));
});
test('MP-078 MP-081 canceled or stale reactions never attach a deterministic fallback',async()=>{
  for(const kind of ['cancel','state','ticket']){
    const p=pitched(),gate=deferred(),entered=deferred(),controller=new AbortController();let active=true;
    const pending=create({engine:E,timeoutMs:1000}).run({mode:'reaction',...p,signal:controller.signal,isCurrent:()=>active,provider:{json:()=>{entered.resolve();return gate.promise;}}});
    await entered.promise;if(kind==='cancel')controller.abort();if(kind==='state')p.state.revision++;if(kind==='ticket')active=false;
    gate.resolve({acknowledgement:'noted',concernIndexes:[]});const result=await pending;
    assert.equal(result.status,kind==='cancel'?'canceled':'stale',kind);assert.equal(result.reply,undefined);assert.equal(result.fallback,undefined);
  }
});
test('MP-065 MP-081 grammar fallback rechecks the exact added suffix before another generation',async()=>{
  const f=runtime(),ai=createOfflineProvider(f.engine,modelId),fit=await ai.admit('small');
  f.config.context_window_size=fit.promptTokens+640;f.pipeline.contextWindowSize=f.config.context_window_size;
  f.engine.chat.completions.create=async options=>{f.calls.push(options);throw Object.assign(new Error('Private grammar details'),{name:'GrammarMatcherInitError'});};
  await assert.rejects(ai.json('small',{requireAdmission:true}),{code:'context_limit'});
  assert.equal(f.calls.length,1);assert.ok(f.encoded.some(s=>s.includes('valid JSON object only')));assert.equal(f.calls[0].max_tokens,640);assert.equal(f.calls[0].temperature,.2);
});
test('MP-065 MP-081 cached reload rechecks the replacement pipeline limits before generating',async()=>{
  const first=runtime(),second=runtime({},64);let reloads=0,calls=0;
  first.engine.chat.completions.create=async()=>{calls++;throw Object.assign(new Error('Private unloaded details'),{name:'ModelNotLoadedError'});};
  const ai=createOfflineProvider(first.engine,modelId,async()=>{reloads++;return second.engine;});
  assert.equal((await ai.admit('small')).ok,true);
  await assert.rejects(ai.json('small',{requireAdmission:true}),{code:'context_limit'});
  assert.equal(reloads,1);assert.equal(calls,1);assert.equal(second.calls.length,0);
});
test('MP-065 MP-081 incompatible reflection guards fail explicitly while legacy generation stays available',async()=>{
  for(const kind of ['config-identity','artifact','sliding','missing-map','tokenizer','segments']){
    const f=runtime();
    if(kind==='config-identity')f.engine.loadedModelIdToChatConfig.set(modelId,copy(f.config));
    if(kind==='artifact')f.pipeline.artifact={};
    if(kind==='sliding')f.pipeline.slidingWindowSize=2048;
    if(kind==='missing-map')f.engine.loadedModelIdToPipeline.delete(modelId);
    if(kind==='tokenizer')f.pipeline.tokenizer.encode=()=>({length:1});
    if(kind==='segments')f.pipeline.getConversationObject=()=>({constructor:class{constructor(){this.messages=[];}appendMessage(){}appendReplyHeader(){}getPromptArray(){return [['unexpected multimodal segment']];}}});
    const ai=createOfflineProvider(f.engine,modelId);
    assert.equal((await ai.admit('text')).code,'runtime_metadata_unavailable',kind);
    assert.deepEqual(await ai.json('Legacy request'),{reply:'fixture'},kind);
  }
  const f=runtime(),changedVersion=createOfflineProvider(f.engine,modelId,null,undefined,{runtimeVersion:'0.2.88'});
  assert.equal((await changedVersion.admit('text')).code,'runtime_metadata_unavailable');
});
test('MP-065 MP-081 syntactically valid but length-limited Qwen JSON cannot become an accepted program',async()=>{
  const f=runtime();f.engine.chat.completions.create=async()=>({choices:[{message:{content:'{"program":{}}'},finish_reason:'length'}]});
  const ai=createOfflineProvider(f.engine,modelId);
  await assert.rejects(ai.json('A program',{requireAdmission:true}),{code:'output_limit'});
  assert.deepEqual(await ai.json('Legacy request'),{program:{}});
});
test('MP-065 MP-081 a timed-out composition cannot release the shared GPU queue ahead of active work',async()=>{
  const f=runtime(),gate=deferred(),entered=deferred();let active=0,max=0,calls=0;
  // The fixture tokenizer is deliberately coarse; this tests queue ownership,
  // while the separate source-parity probe verifies formatting and counting.
  f.pipeline.tokenizer.encode=()=>new Uint32Array(2);
  f.engine.chat.completions.create=async()=>{active++;max=Math.max(max,active);calls++;entered.resolve();await gate.promise;active--;return {choices:[{message:{content:'{}'},finish_reason:'stop'}]};};
  const ai=createOfflineProvider(f.engine,modelId),state=fresh();
  const pending=create({engine:E,timeoutMs:10}).run({mode:'draft',state,plots:land(state),intent:'A work cooperative',provider:ai});
  await entered.promise;const timeout=await pending;assert.equal(timeout.code,'generation_timeout');
  const next=ai.json('Legacy after timeout');await new Promise(r=>setImmediate(r));assert.equal(calls,1);
  gate.resolve();await next;assert.equal(calls,2);assert.equal(max,1);
});
test('MP-081 known output truncation receives one compact repair and never accepts a length-limited program',async()=>{
  const state=fresh();let calls=0;
  const result=await create({engine:E}).run({mode:'draft',state,plots:land(state),intent:'A work cooperative',provider:{json:async()=>{calls++;throw Object.assign(new Error('Private truncated text'),{code:'output_limit'});}}});
  assert.equal(result.code,'output_limit');assert.equal(result.status,'invalid');assert.equal(calls,2);assert.equal(state.actionHighWater,0);
});
test('MP-075 MP-081 density, shared-space and site rules retain precise allowlisted metadata without private IDs',async()=>{
  const observed=[];
  for(const id of ['PRIVATE_COMPONENT_A','PRIVATE_COMPONENT_B']){
    const state=fresh(),diagnostics=logger(),p=program('Density check');p.components=[part(id,'workplace',8,.1)];
    const result=await create({engine:E,diagnostics}).run({mode:'draft',state,plots:land(state),intent:'Density check',provider:provider({program:p})});
    assert.equal(result.code,'site_infeasible');assert.equal(result.ruleId,'area_capacity');assert.equal(result.fieldId,'area');
    const doc=(await diagnostics.snapshot()).prepared.document;assert.ok(!JSON.stringify(doc).includes(id));
    observed.push(doc.events.filter(e=>e.metadata.ruleId).map(e=>({name:e.name,outcome:e.outcome,metadata:Object.fromEntries(Object.entries(e.metadata).filter(([k])=>!['requestId','durationMs'].includes(k)))})));
  }
  assert.deepEqual(observed[0],observed[1]);
  for(const [kind,expected,field] of [['shared','shared_capacity','sharedWith'],['site','site_capacity_exceeded','plots']]){
    const state=fresh(),p=program('Capacity check');
    p.components=kind==='shared'?[part('host','workplace',8,1),part('one','community',10,.6,'host'),part('two','community',10,.6,'host')]:[part('big','workplace',8,2)];
    const result=await create({engine:E}).run({mode:'draft',state,plots:land(state,1),intent:'Capacity check',provider:provider({program:p})});
    assert.equal(result.ruleId,expected,kind);assert.equal(result.fieldId,field);
  }
});
test('MP-075 MP-080 MP-081 actual failed persistence exports its fixed code and rejects arbitrary reason or rule text',async()=>{
  const W=require('../src/workspace.js'),state=fresh(),key='masterplan.dev.save.v4',values=new Map([[key,JSON.stringify({format:'masterplan-save',formatVersion:4,writerProtocol:1,formatFloor:4,storageGeneration:1,state,legacyImportBackup:null})]]);
  let failWrite=false;const storage={getItem:k=>values.get(k)??null,setItem(k,v){if(failWrite)throw new Error('PRIVATE_FAILURE');values.set(k,v);},removeItem:k=>values.delete(k)};
  const store=W.create({engine:E,storage,locks:{request:async(_name,_options,fn)=>fn()},channel:'dev'});await store.load();failWrite=true;
  const failed=await store.commit({...command(state,'postProgram',{program:program(),plots:land(state),acknowledgedScope:true}),expectedGeneration:store.generation});
  assert.equal(failed.code,'persistence_failed');
  const diagnostics=logger(),requestId=diagnostics.id();
  await diagnostics.record('composition.application','failed',{requestId,stage:'persistence',action:'draft',resultCode:failed.code,applied:false,reason:'PRIVATE_FAILURE',ruleId:'area_capacity:PRIVATE_COMPONENT'});
  await diagnostics.record('composition.application','not-applied',{requestId,stage:'persistence',resultCode:'read_only',applied:false,save:'PRIVATE_SAVE'});
  await diagnostics.record('composition.application','failed',{requestId,stage:'persistence',resultCode:'PRIVATE_ARBITRARY_CODE',ruleId:'PRIVATE_RULE'});
  const doc=(await diagnostics.snapshot()).prepared.document,events=doc.events;
  assert.equal(events[0].metadata.resultCode,'persistence_failed');assert.equal(events[0].metadata.ruleId,undefined);
  assert.equal(events[1].metadata.resultCode,'read_only');assert.equal(events[2].metadata.resultCode,undefined);assert.doesNotMatch(JSON.stringify(doc),/PRIVATE_/);
});

// Optional reproducible public-source probe, not live inference. Supply the
// downloaded integrity-pinned bundle; normal CI remains offline/self-contained.
test('MP-065 MP-081 pinned WebLLM source guards and actual getInputData match composition admission',{skip:!process.env.MP_WEBLLM_AUDIT_BUNDLE},async()=>{
  const bytes=readFileSync(process.env.MP_WEBLLM_AUDIT_BUNDLE),source=bytes.toString();
  assert.equal('sha256-'+createHash('sha256').update(bytes).digest('base64'),'sha256-O/9MVc0vAgBxFRc0G6vOvnqRqO+FuYNCBDn88mg1pnQ=');
  const conversationStart=source.indexOf('class Conversation {'),pipelineStart=source.indexOf('class LLMChatPipeline {'),awaiterStart=source.indexOf('function __awaiter(');
  assert.ok(conversationStart>0&&pipelineStart>0&&awaiterStart>0);
  const declarations=source.slice(awaiterStart,source.indexOf('function __values(',awaiterStart))+
    '\n'+source.slice(conversationStart,source.indexOf('function getConversation(',conversationStart))+
    '\n'+source.slice(pipelineStart,source.indexOf('\nclass Chat {',pipelineStart))+'\n({Conversation,LLMChatPipeline})';
  const actual=vm.runInNewContext(declarations,{Role:{user:'user',assistant:'assistant',tool:'tool'},
    MessagePlaceholders:{system:'{system_message}',user:'{user_message}',assistant:'{assistant_message}',tool:'{tool_message}',function:'{function_string}'}});
  assert.ok(source.includes('this.loadedModelIdToChatConfig.set(modelId, curModelConfig);'));
  assert.ok(source.includes('new LLMChatPipeline(tvm, tokenizer, curModelConfig, logitProcessor, modelPackage, {'));
  assert.ok(source.includes('this.config = config;'));assert.ok(source.includes('this.loadedModelIdToPipeline.set(modelId, newPipeline);'));
  assert.ok(source.includes('const modelPackage = modelRecord.model_manifest === undefined'));
  assert.ok(source.includes('if (modelPackage !== undefined) {'));assert.ok(source.includes('this.artifact = resolveChatCompletionArtifact('));
  const appStart=source.indexOf('const prebuiltAppConfig = {'),appEnd=source.indexOf('\n};',appStart)+3;
  const app=vm.runInNewContext(source.slice(appStart,appEnd)+'\nprebuiltAppConfig',{modelLibURLPrefix:'https://example.invalid/',modelVersion:'v0_2_87/base',ModelType:{LLM:0,embedding:1,VLM:2}});
  for(const [id,file] of [[modelId,'qwen15-published-config.json'],['Qwen2.5-3B-Instruct-q4f16_1-MLC','qwen3-published-config.json']]){
    const def=app.model_list.find(d=>d.model_id===id),hf=JSON.parse(readFileSync(new URL('../docs/evidence/autonomous-run/'+file,import.meta.url)));
    assert.equal(def.model_manifest,undefined);assert.equal(hf.context_window_size,32768);assert.equal(def.overrides.context_window_size,4096);
    const config={...hf,...def.overrides},pipeline=Object.create(actual.LLMChatPipeline.prototype);
    const live=new actual.Conversation({...config.conv_template,...config.conv_config}),segments=[];
    Object.assign(pipeline,{config,contextWindowSize:config.context_window_size,slidingWindowSize:config.sliding_window_size,filledKVCacheLength:0,imageDataCache:new Map(),conversation:live,
      tokenizer:{encode(text){segments.push(text);return new Int32Array(text.includes('α')?7:11);}}});
    const engine={loadedModelIdToPipeline:new Map([[id,pipeline]]),loadedModelIdToChatConfig:new Map([[id,config]])},ai=createOfflineProvider(engine,id),input='α🌳 Source formatting parity';
    const admitted=await ai.admit(input);assert.equal(admitted.ok,true);assert.equal(live.messages.length,0);const admittedSegments=segments.splice(0);
    live.appendMessage('user',input);live.appendReplyHeader('assistant');
    const [tokens,promptTokens]=await pipeline.getInputData();
    assert.deepEqual(segments,admittedSegments);assert.equal(admitted.promptTokens,promptTokens);assert.equal(tokens.flat().length,promptTokens);
    assert.equal(admitted.contextWindowTokens,4096);assert.equal(pipeline.artifact,undefined);
  }
});
