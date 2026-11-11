import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const source=readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
function engine(enabled=true){const context={module:{exports:{}},MP_BUILD:{flags:{compositionPlans:enabled}}};vm.runInNewContext(source,context);return context.module.exports;}
const E=engine(),clone=x=>JSON.parse(JSON.stringify(x));
const fresh=(seed=2301)=>E.newGame(seed,undefined,{gameId:'composition-test'});
const component=(id,capability,quantity,area,sharedWith=null)=>({id,capability,label:id,quantity,area,sharedWith});
const program=(components,conditions={})=>({version:2,title:'Uncatalogued cooperative',intent:'An independently named combination of useful activities',components,
  conditions:{hours:10,deliveries:'daytime',access:true,buffer:0,preserve:0,affordable:false,...conditions},assumptions:[],omissions:[]});
const land=(s,n=6)=>s.grid.filter(c=>E.canBuildOn(s,c.x,c.y)&&!c.b&&!c.site&&c.t==='grass').slice(0,n).map(c=>[c.x,c.y]);
const preview=(s,p,plots=land(s))=>E.previewProgram(s,{program:p,plots});
const command=(s,type,payload,extra={})=>({id:s.actionHighWater+1,gameId:s.gameId,expectedRevision:s.revision,expectedGeneration:0,type,payload,...extra});
function commit(s,type,payload){const result=E.applyCommand(s,command(s,type,payload));assert.equal(result.ok,true,result.reasons?.join('; '));return result.state;}
const post=(s,p,plots=land(s))=>commit(s,'postProgram',{program:p,plots,acknowledgedScope:true});
const pitch=(p,field,value,argument=`This plan adds ${value} ${field}.`,extra={})=>({argument,source:'typed',programRevision:p.programRevision,
  claims:[{id:'claim',type:'effect',field,operator:'eq',value,evidence:{start:0,end:argument.length,quote:argument}}],...extra});

test('MP-076 capability schemas span seven families and are detached from trusted rules',()=>{
  const defs=E.capabilities();assert.equal(new Set(defs.map(d=>d.family)).size,7);
  for(const id of ['housing','workplace','shop','community','recreation','event','agriculture','storage','access','parking','green','stormwater','policy']){
    const d=defs.find(d=>d.id===id);assert.ok(d,id);assert.ok(d.unit&&d.schema&&d.pricing&&d.effects&&d.render.role);
  }
  defs[0].pricing.quantity=1e9;assert.notEqual(E.capabilities()[0].pricing.quantity,1e9);
  assert.equal(E.programSchema().additionalProperties,false);assert.equal(E.patchSchema().additionalProperties,false);assert.equal(E.claimsSchema().additionalProperties,false);
});

test('MP-076 closed programs reject unknown fields, nonfinite values, bad references and cumulative sharing',()=>{
  const valid=program([component('work','workplace',10,1),component('class','community',15,.4,'work')]);
  assert.equal(E.validateProgram(valid).ok,true);
  const mutations=[p=>p.price=1,p=>p.conditions.veto=true,p=>p.components[0].quantity=NaN,p=>p.components[0].quantity=Infinity,
    p=>p.components[0].quantity=-1,p=>p.components[0].area=.001,p=>p.components[0].capability='magic',p=>p.components.push(clone(p.components[0])),
    p=>p.components[1].sharedWith='absent',p=>p.components[0].sharedWith='class',p=>p.components[1].area=1.2,
    p=>p.components.push(component('other','event',15,.7,'work')),p=>p.conditions.deliveries='nighttime',p=>p.conditions.operations={},p=>p.conditions.operations=[null],p=>p.conditions.operations=[42]];
  for(const mutate of mutations){const p=clone(valid);mutate(p);assert.equal(E.validateProgram(p).ok,false,JSON.stringify(p));}
});

test('MP-076 exact ordered noncontiguous plots conserve capacity and never silently fit or filter',()=>{
  const s=fresh(),plots=land(s,3).reverse(),p=program([component('a','workplace',10,1.2),component('b','community',12,.5,'a'),component('c','green',.4,.4)],{buffer:.3,preserve:.5});
  const before=E.canonical(s),r=preview(s,p,plots);assert.equal(r.ok,true,r.reasons.join(';'));
  assert.equal(E.canonical(s),before);assert.deepEqual(clone(r.proposal.plots),clone(plots));assert.deepEqual(clone(r.layout.plots),clone(plots));
  assert.equal(r.layout.usedArea,1.9);assert.equal(r.layout.capacity,3);assert.equal(r.layout.preservedArea,.5);
  assert.equal(r.layout.allocations.find(a=>a.componentId==='b').sharedWith,'a');
  for(const cell of r.layout.cells)assert.ok(cell.usedArea+cell.preservedArea<=1+1e-9);
  for(const bad of [[plots[0],plots[0]],[[999,0]],[[1.5,1]],[[0,11]],[[3,0]]])assert.equal(preview(s,p,bad).ok,false);
  assert.equal(preview(s,program([component('too-big','housing',60,3.1)]),plots).ok,false);
});

test('MP-076 MP-077 three additive edits preserve IDs, intent and site while refreshing money and support',()=>{
  const s=fresh(),r=preview(s,program([component('work','workplace',10,1),component('yard','green',.5,.5)]));
  const first=E.reviseProgram(s,r.proposal,{upsert:[component('class','community',20,.5,'work')]});assert.equal(first.ok,true);
  const second=E.reviseProgram(s,first.proposal,{upsert:[{...component('work','workplace',6,1)}]});assert.equal(second.ok,true);
  const third=E.reviseProgram(s,second.proposal,{conditions:{hours:8,buffer:.5}});assert.equal(third.ok,true);
  assert.deepEqual(clone(third.proposal.plots),clone(r.proposal.plots));assert.deepEqual(clone(third.proposal.program.components.find(c=>c.id==='yard')),clone(r.proposal.program.components[1]));
  assert.equal(third.proposal.program.intent,r.proposal.program.intent);assert.notEqual(first.forecast.money.costK,r.forecast.money.costK);
  assert.notEqual(second.forecast.effects.jobs,first.forecast.effects.jobs);assert.notEqual(third.proposal.programRevision,r.proposal.programRevision);
  assert.ok(third.forecast.support.length===5);assert.equal(E.reviseProgram(s,r.proposal,{bogus:1}).ok,false);
  assert.equal(E.reviseProgram(s,first.proposal,{remove:['work']}).ok,false,'a host cannot strand its sharing activity');
});

test('MP-076 MP-079 retained assets avoid demolition and untouched land survives construction',()=>{
  let s=fresh();const house=s.grid.find(c=>c.b?.type==='house'),open=land(s,1)[0],plots=[open,[house.x,house.y]];
  const p=program([component('work','workplace',5,.5)],{preserve:1}),r=preview(s,p,plots);assert.equal(r.ok,true);assert.equal(r.proposal.demo.residents,0);
  const cleared=preview(s,{...p,components:[component('work','workplace',5,1.5)],conditions:{...p.conditions,preserve:0}},plots);
  assert.equal(cleared.proposal.demo.residents,62);assert.ok(cleared.forecast.money.costK>r.forecast.money.costK);
  s=post(s,p,plots);const posted=s.proposals.at(-1);for(const m of Object.values(s.council))m.rel=100;
  s=commit(s,'decision',{proposalId:posted.id,action:'vote',funding:'bond',route:E.approvalRoute(s,posted).id});
  assert.equal(s.grid[house.y*24+house.x].b.type,'house');s=commit(s,'resolveYear',{});assert.equal(s.grid[house.y*24+house.x].b.type,'house');
  assert.equal(s.built.find(b=>b.id===posted.id).programRevision,r.proposal.programRevision);
});

test('MP-076 labels do not dispatch prices and all capabilities deliver through the common pipeline',()=>{
  for(const d of E.capabilities()){
    const s=fresh(),a=component('activity',d.id,d.quantity.min,d.area.min),p=program([a]),r=preview(s,p);
    assert.equal(r.ok,true,`${d.id}: ${r.reasons}`);
    const renamed=clone(p);renamed.title='Another entirely new title';renamed.components[0].label='Anything at all';
    const other=preview(s,renamed);assert.deepEqual(clone(other.forecast.effects),clone(r.forecast.effects));assert.deepEqual(clone(other.forecast.money),clone(r.forecast.money));
  }
});

test('MP-078 authored farm and campus proposals are playable, with explicit controllers and concrete counters',()=>{
  const s=fresh(),farm=s.proposals.find(p=>p.id==='farm-access'),campus=s.proposals.find(p=>p.id==='campus-loading');assert.ok(farm?.program&&campus?.program);
  const agree=E.evaluateResident(s,farm,farm);assert.equal(agree.stance,'agree');assert.equal(agree.controller,'bowers_operator');
  const blocked=E.reviseProgram(s,farm,{conditions:{access:false}});assert.equal(blocked.ok,true);
  const counter=E.evaluateResident(s,farm,blocked.proposal);assert.equal(counter.stance,'counter');assert.ok(counter.reasons.some(x=>/access/.test(x)));assert.equal(counter.counter.program.conditions.access,true);
  assert.equal(E.evaluateResident(s,farm,counter.counter).stance,'agree');
  const refuse=E.reviseProgram(s,farm,{remove:['fields'],upsert:[component('housing','housing',20,1)]});assert.equal(refuse.ok,true);
  assert.equal(E.evaluateResident(s,farm,refuse.proposal).stance,'refuse');
  const late=E.reviseProgram(s,campus,{conditions:{deliveries:'anytime'}}),response=E.evaluateResident(s,campus,late.proposal);
  assert.equal(response.stance,'counter');assert.equal(response.controller,'freight_operator');assert.equal(response.counter.program.conditions.deliveries,'daytime');
  assert.ok(response.stakeholders.some(a=>a.actorId==='college_liaison'));assert.notEqual(response.controller,'college_liaison');
});

test('MP-077 MP-078 revision confirmation rechecks trusted actor rules, gates and exact authorized counter',()=>{
  let s=fresh();const farm=s.proposals.find(p=>p.id==='farm-access'),bad=E.reviseProgram(s,farm,{conditions:{access:false}}).proposal;
  const before=E.canonical(s),attempt=E.applyCommand(s,command(s,'reviseProposal',{proposalId:farm.id,program:bad.program,confirmed:true}));
  assert.equal(attempt.ok,false);assert.equal(E.canonical(s),before);
  const counter=E.evaluateResident(s,farm,bad).counter;
  s=commit(s,'reviseProposal',{proposalId:farm.id,program:counter.program,confirmed:true});
  s.facts.bowersLeaseValid=false;const candidate=E.reviseProgram(s,s.proposals.find(p=>p.id===farm.id),{title:'Lease checked'}).proposal;
  assert.equal(E.evaluateResident(s,s.proposals.find(p=>p.id===farm.id),candidate).stance,'refuse');
  assert.equal(E.applyCommand(s,command(s,'reviseProposal',{proposalId:farm.id,program:candidate.program,confirmed:true})).ok,false);
});

test('MP-078 typed evidence verifies exact argument, factual quantity, member relevance and mixed claims',()=>{
  const s=fresh(),p=preview(s,program([component('work','workplace',10,1)])).proposal,e=E.effectsOf(p,s),input=pitch(p,'jobs',e.jobs);
  const truth=E.evaluateClaims(s,p,'marsh',input);assert.equal(truth.ok,true);assert.equal(truth.credit,'strong');assert.ok(truth.addressed.includes('jobs'));
  const irrelevant=E.evaluateClaims(s,p,'pryor',input);assert.equal(irrelevant.credit,'none');
  const falsehood=clone(input);falsehood.claims[0].value=999;assert.equal(E.evaluateClaims(s,p,'marsh',falsehood).credit,'none');
  const forged=clone(input);forged.claims[0].evidence.quote='Not the text';assert.equal(E.evaluateClaims(s,p,'marsh',forged).claims[0].valid,false);
  const mixed=clone(input);mixed.claims.push({...mixed.claims[0],id:'false',field:'housing',value:999});const result=E.evaluateClaims(s,p,'marsh',mixed);
  assert.equal(result.claims[0].valid,true);assert.equal(result.claims[1].valid,false);assert.equal(result.credit,'strong');
  const stale={...input,programRevision:'old'};assert.equal(E.evaluateClaims(s,p,'marsh',stale).ok,false);
  const negated=pitch(p,'jobs',e.jobs,`This does not create ${e.jobs} jobs.`);assert.equal(E.evaluateClaims(s,p,'marsh',negated).credit,'none');
  const operating={...pitch(p,'jobs',e.jobs),argument:'Allow late night loading',claims:[{id:'schedule',type:'condition',field:'deliveries',operator:'eq',value:'daytime',evidence:{start:0,end:24,quote:'Allow late night loading'}}]};
  const condition=E.evaluateClaims(s,p,'okafor',operating);assert.equal(condition.credit,'none');assert.equal(condition.claims[0].field,'deliveries');assert.equal(condition.claims[0].claimedValue,'daytime');
});

test('MP-078 MP-079 persuasion enforces quota, repeated claims, tone and historical reaction identity',()=>{
  let s=post(fresh(),program([component('work','workplace',10,1)])),p=s.proposals.at(-1);const before=E.lean(E.memberScore(s,E.councilOf(s)[0],p,p.id));
  const payload={proposalId:p.id,memberId:'marsh',...pitch(p,'jobs',E.effectsOf(p,s).jobs)};
  const first=E.applyCommand(s,command(s,'persuade',payload));assert.equal(first.ok,true,first.reasons);s=first.state;
  const after=E.lean(E.memberScore(s,E.councilOf(s)[0],s.proposals.at(-1),p.id));assert.ok(after-before<=10);
  assert.equal(first.receipt.memberId,'marsh');assert.equal(E.readReactionContext(s,{id:first.receipt.id,fingerprint:first.receipt.fingerprint,memberId:'marsh'}).ok,true);
  assert.equal(E.readReactionContext(s,{id:first.receipt.id,fingerprint:first.receipt.fingerprint,memberId:'pryor'}).ok,false);
  assert.equal(E.readReactionContext(s,{id:first.receipt.id,fingerprint:'bad',memberId:'marsh'}).ok,false);
  assert.equal(E.evaluateClaims(s,p,'marsh',pitch(p,'jobs',E.effectsOf(p,s).jobs)).credit,'none');
  s=commit(s,'persuade',payload);assert.equal(E.applyCommand(s,command(s,'persuade',payload)).ok,false);
  const hostile=E.evaluateClaims(s,p,'okafor',pitch(p,'jobs',E.effectsOf(p,s).jobs,'You are an idiot.'));assert.equal(hostile.tone,'hostile');
});

test('MP-079 canonical SHA-256 binds complete commands and historical replay precedes freshness',()=>{
  const s=fresh(),p=program([component('work','workplace',5,.5)]),cmd=command(s,'postProgram',{program:p,plots:land(s),acknowledgedScope:true});
  assert.equal(E.canonical({z:1,a:[{z:2,a:'é'}]}),'{"a":[{"a":"é","z":2}],"z":1}');
  assert.equal(E.fingerprint(cmd),createHash('sha256').update(E.canonical(cmd)).digest('hex'));
  const first=E.applyCommand(s,cmd);assert.equal(first.ok,true);assert.equal(s.initiativeYear,undefined);assert.equal(first.state.revision,s.revision+1);
  let current=clone(first.state);current.cash+=100;current.revision+=10;const replay=E.applyCommand(current,clone(cmd));
  assert.equal(replay.ok,true);assert.equal(replay.applied,false);assert.deepEqual(clone(replay.receipt),clone(first.receipt));assert.equal(replay.state,current);
  for(const change of [c=>c.payload.acknowledgedScope=false,c=>c.expectedGeneration=9,c=>c.payload.program.intent+=' changed']){const changed=clone(cmd);change(changed);assert.equal(E.applyCommand(current,changed).ok,false);}
  for(const id of [0,-1,1.2,'1',Number.MAX_SAFE_INTEGER+1,3])assert.equal(E.applyCommand(s,{...cmd,id}).ok,false);
  assert.equal(E.applyCommand(s,{...cmd,gameId:'another-game'}).ok,false);
});

test('MP-079 high-water survives receipt pruning and exact replay cannot redeliver construction',()=>{
  let s=fresh();const commands=[];
  for(let year=1;year<=23;year++){
    s.phase='agenda';const cmd=command(s,'postProgram',{program:program([component('policy','policy',1,0)]),plots:[],acknowledgedScope:true});commands.push(cmd);
    s=E.applyCommand(s,cmd).state;s=commit(s,'decision',{proposalId:s.proposals.at(-1).id,action:'table',funding:null,route:E.approvalRoute(s,s.proposals.at(-1)).id});s=commit(s,'resolveYear',{});
  }
  assert.equal(s.receipts.length,64);assert.equal(s.actionHighWater,69);assert.equal(E.applyCommand(s,commands[0]).ok,false);
  const last=commands.at(-1),replay=E.applyCommand(clone(s),last);assert.equal(replay.ok,true);assert.equal(replay.applied,false);assert.equal(replay.state.year,24);
});

test('MP-079 scope acknowledgment, funding, routes and vote guards fail atomically',()=>{
  let s=fresh(),p=program([component('work','workplace',5,.5)]);p.omissions=['Unsupported underground tunnel'];
  assert.equal(E.applyCommand(s,command(s,'postProgram',{program:p,plots:land(s),acknowledgedScope:false})).ok,false);
  s=post(s,p);assert.equal(E.applyCommand(s,command(s,'postProgram',{program:p,plots:land(s),acknowledgedScope:true})).ok,false);
  const target=s.proposals.at(-1),before=E.canonical(s);
  for(const payload of [{action:'vote',funding:'cash',route:'wrong'},{action:'approve',funding:'bond',route:'mayor'},{action:'vote',funding:'magic',route:E.approvalRoute(s,target).id}]){
    assert.equal(E.applyCommand(s,command(s,'decision',{proposalId:target.id,...payload})).ok,false);assert.equal(E.canonical(s),before);
  }
  s.cash=0;assert.equal(E.applyCommand(s,command(s,'decision',{proposalId:target.id,action:'vote',funding:'cash',route:E.approvalRoute(s,target).id})).ok,false);
});

test('MP-079 explicit offers and grants do not consume a persuasion or silently execute claims',()=>{
  let s=post(fresh(),program([component('park','green',.5,.5)])),p=s.proposals.at(-1);const capital=s.capital;
  s=commit(s,'offer',{proposalId:p.id,memberId:'okafor',offer:{type:'favor'}});assert.equal(s.capital,capital-1);assert.equal(s.lobbyCount?.okafor||0,0);
  const before=s.cash;s=commit(s,'offer',{proposalId:p.id,memberId:'okafor',offer:{type:'earmark',amount_k:25}});assert.equal(s.cash,before-25);
  s=commit(s,'grant',{proposalId:p.id});assert.equal(s.proposals.at(-1).status,'tabled');assert.ok(s.proposals.at(-1).grantPending);
});

test('MP-060 MP-079 v4 migration is flag gated, idempotent and preserves old fixtures without invented rights',()=>{
  const old=JSON.parse(readFileSync(new URL('./fixtures/millbrooke-v2-save.json',import.meta.url),'utf8')),before=clone(old),off=engine(false);
  const stable=off.migrate(clone(old));assert.equal(stable.v,3);assert.equal(stable.revision,undefined);assert.equal(off.isSupportedSave({v:4}),false);
  const migrated=E.migrate(clone(old),{gameId:'migrated-test'});assert.equal(migrated.v,4);assert.equal(migrated.gameId,'migrated-test');assert.equal(migrated.revision,0);
  E.migrate(old,{gameId:'another-migration'});assert.deepEqual(old,before,'v4 migration is pure even with the original fixture object');
  for(const k of ['grid','pending','built','cash','bonds','decided','proposals','chats'])assert.deepEqual(clone(migrated[k]),before[k],k);
  assert.equal(migrated.facts.bowersLeaseValid,undefined);assert.deepEqual(clone(E.migrate(clone(migrated))),clone(migrated));assert.equal(E.isSupportedSave({v:99}),false);
  assert.deepEqual(old,before);assert.equal(E.applyCommand(off.newGame(1),{id:1}).ok,false);
});

test('MP-079 twelve years of compact, outward and preservation choices diverge with traceable delivery and opportunities',()=>{
  const run=strategy=>{
    let s=fresh(31),records=[],elections=[];
    const election=()=>{const theme=Object.keys(E.THEMES).sort((a,b)=>E.THEMES[b].fit(s)-E.THEMES[a].fit(s))[0],debate=s.meters.approval>=50?2:.5,result=E.electionResult(s,theme,debate);elections.push({year:s.year-1,theme,debate,result});return result;};
    for(let y=1;y<=12;y++){
      if(s.phase==='election'){assert.equal(election().won,true,'continue only after an actual election win, as the existing Keep running action does');s.phase='agenda';s.election=null;}
      assert.equal(s.phase,'agenda');const ops=E.programOpportunities(s);assert.ok(ops.length,`choices at year ${y}`);
      const components=strategy==='compact'?[component('homes','housing',8,.5),component('work','workplace',4,.5)]:strategy==='outward'?[component('homes','housing',8,.5),component('shops','shop',1,.25),component('screen','green',.2,.2)]:[component('garden','green',.5,.5),component('water','stormwater',.25,.25)];
      const site=strategy==='outward'?s.grid.filter(c=>E.canBuildOn(s,c.x,c.y)&&!c.b&&c.t==='farm').slice(0,2).map(c=>[c.x,c.y]):land(s,2);
      s=post(s,program(components),site);const p=s.proposals.at(-1),vote=E.forecastVote(s,p,p.id);
      if(!vote.winner&&s.capital>0){const swing=vote.votes.filter(v=>v.vote!==p.id).sort((a,b)=>b.leans.find(l=>l.id===p.id).lean-a.leans.find(l=>l.id===p.id).lean)[0];assert.ok(swing);s=commit(s,'offer',{proposalId:p.id,memberId:swing.member,offer:{type:'favor'}});}
      s=commit(s,'decision',{proposalId:p.id,action:'vote',funding:'cash',route:E.approvalRoute(s,p).id});const pending=clone(s.pending.at(-1));
      const commandYear=command(s,'resolveYear',{}),result=E.applyCommand(s,commandYear);assert.equal(result.ok,true,result.reasons);s=clone(result.state);
      const built=s.built.find(b=>b.id===p.id);assert.deepEqual(built.program,pending.program);assert.deepEqual(built.layout,pending.layout);assert.equal(built.programRevision,pending.programRevision);
      assert.ok(s.reports.at(-1).projects.some(record=>record.proposalId===p.id));assert.ok(s.projectRecords.some(record=>record.proposalId===p.id&&record.stage==='built'));
      assert.equal(E.applyCommand(s,commandYear).applied,false);records.push(ops.map(o=>({key:o.key,plots:clone(o.plots),reason:o.reason})));
    }
    assert.equal(s.year,13);assert.equal(s.phase,'election');election();assert.equal(elections.length,3);assert.equal(s.built.filter(b=>b.program).length,12);assert.equal(s.history.length,13);return {s,records,elections};
  };
  const compact=run('compact'),outward=run('outward'),preserve=run('preserve');
  assert.notDeepEqual(compact.s.history,outward.s.history);assert.notEqual(E.econ(compact.s).housing,E.econ(preserve.s).housing);
  assert.ok(outward.s.farmLost>preserve.s.farmLost);assert.notDeepEqual(compact.records,outward.records);
  assert.deepEqual(clone(run('compact').s),clone(compact.s),'same choices remain deterministic across reloads and elections');
});

test('MP-076 MP-079 a trusted scenario definition composes primitives without dispatch branches and survives delivery',()=>{
  const scenario=clone(E.MILLBROOKE),novel=program([component('garden','green',.5,.5),component('teaching','community',10,.2),component('repair','workplace',3,.2)]);
  scenario.programDefinitions={'definition-probe':{id:'definition-probe',label:'A trusted content extension',program:novel},invalid:{id:'invalid',label:'Invalid',program:{...novel,price:1}}};
  let s=E.newGame(31,scenario,{gameId:'definition-extension'});const definition=E.programDefinitions(s).find(d=>d.id==='definition-probe');assert.ok(definition);assert.equal(E.programDefinitions(s).some(d=>d.id==='invalid'),false);
  const before=E.canonical(s),r=preview(s,definition.program);assert.equal(r.ok,true);assert.equal(E.canonical(s),before);
  const moved=preview(s,definition.program,land(s).reverse());assert.notEqual(moved.proposal.programRevision,r.proposal.programRevision,'candidate identity binds ordered geometry');
  s=post(s,definition.program);const p=s.proposals.at(-1);assert.equal(E.evaluateClaims(s,p,'okafor',pitch(p,'live',E.effectsOf(p,s).live,`It adds ${E.effectsOf(p,s).live} livability.`)).credit,'strong');
  const vote=E.forecastVote(s,p,p.id);if(!vote.winner){const member=vote.votes.filter(v=>v.vote!==p.id).sort((a,b)=>b.leans[0].lean-a.leans[0].lean)[0].member;s=commit(s,'offer',{proposalId:p.id,memberId:member,offer:{type:'favor'}});}
  s=commit(s,'decision',{proposalId:p.id,action:'vote',funding:'cash',route:E.approvalRoute(s,p).id});assert.equal(s.pending.length,1);s=commit(s,'resolveYear',{});
  assert.deepEqual(clone(s.built[0].program),clone(novel));assert.deepEqual(clone(E.migrate(clone(s))),clone(s));
});

test('MP-077 MP-078 legacy bridge and park revisions preserve kind, values and optional forecast quantities',()=>{
  let s=fresh();const bridge=s.proposals.find(p=>p.id==='bridge'),r=E.previewLegacyRevision(s,bridge,{scope:'patch'});
  assert.equal(r.ok,true,r.reasons);assert.equal(r.proposal.kind,'bridge');assert.equal(typeof r.forecast.delta.effects.bridgeRisk,'number');
  assert.equal(E.previewLegacyRevision(s,bridge,{scope:'invented'}).ok,false);assert.equal(E.previewLegacyRevision(s,bridge,{cost:1}).ok,false);
  s=commit(s,'reviseProposal',{proposalId:bridge.id,plan:r.proposal.plan,confirmed:true});assert.equal(s.proposals.find(p=>p.id==='bridge').plan.scope,'patch');
  s=commit(s,'resolveYear',{});const park=s.proposals.find(p=>p.id==='park'),candidate=E.reviseProgram(s,park,{changes:{memorial:false}});assert.equal(candidate.ok,true);
  const stance=E.evaluateResident(s,park,candidate.proposal);assert.equal(stance.stance,'counter');assert.equal(stance.counter.plan.memorial,true);
  assert.equal(E.applyCommand(s,command(s,'reviseProposal',{proposalId:park.id,plan:candidate.proposal.plan,confirmed:true})).ok,false);
  const loft={id:'legacy-students',kind:'studenthousing',plan:E.defaultPlan('studenthousing'),presenter:'keystone',site:'campus_s',status:'open',council:true,title:'Existing housing',year:s.year};
  const students=E.previewLegacyRevision(s,loft,{beds:400});assert.equal(students.ok,true);assert.equal(students.forecast.delta.effects.students,-200);
});

test('MP-079 a failed formal vote has one durable result and closes the unchanged losing proposal',()=>{
  let s=post(fresh(),program([component('asphalt','parking',200,2)]),land(fresh(),3)),p=s.proposals.at(-1);assert.equal(E.forecastVote(s,p,p.id).winner,null);
  const motion=command(s,'decision',{proposalId:p.id,action:'vote',funding:'cash',route:E.approvalRoute(s,p).id}),cash=s.cash,result=E.applyCommand(s,motion);
  assert.equal(result.ok,true);assert.equal(result.receipt.originalResult.reason,'failed-vote');assert.equal(result.state.proposals.find(q=>q.id===p.id).status,'rejected');assert.equal(result.state.decided[p.id],'rejected');assert.equal(result.state.cash,cash);
  assert.equal(E.applyCommand(result.state,motion).applied,false);assert.equal(E.applyCommand(result.state,command(result.state,'decision',motion.payload)).ok,false);
});

test('MP-079 repeated operating reviews cannot stack permanent benefits under new names or years',()=>{
  let s=post(fresh(),program([component('operations','policy',1,0)]),[]),p=s.proposals.at(-1);const vote=E.forecastVote(s,p,p.id);
  if(!vote.winner){const swing=vote.votes.filter(v=>v.vote!==p.id).sort((a,b)=>b.leans[0].lean-a.leans[0].lean)[0];s=commit(s,'offer',{proposalId:p.id,memberId:swing.member,offer:{type:'favor'}});}
  s=commit(s,'decision',{proposalId:p.id,action:'vote',funding:'cash',route:E.approvalRoute(s,p).id});assert.ok(s.pending.some(p=>p.program));s=commit(s,'resolveYear',{});
  const repeated=program([component('another-name','policy',1,0)]);repeated.title='An entirely new title';assert.equal(preview(s,repeated,[]).ok,false);
  assert.equal(E.programOpportunities(s).some(o=>o.key==='operations'),false);assert.equal(s.built.filter(p=>p.program?.components.some(c=>c.capability==='policy')).length,1);
});

test('MP-077 grouped legacy preview votes use the requested candidate rather than the public baseline',()=>{
  const s=commit(fresh(),'resolveYear',{}),park=s.proposals.find(p=>p.id==='park'),before=E.canonical(s),r=E.previewLegacyRevision(s,park,{amphitheater:true,fountain:true});assert.equal(r.ok,true);
  const hypothetical=clone(s);hypothetical.proposals[hypothetical.proposals.findIndex(p=>p.id===park.id)]=clone(r.proposal);
  assert.deepEqual(clone(r.forecast.votes),clone(E.forecastVote(hypothetical,r.proposal,park.id)));assert.equal(E.canonical(s),before);
  assert.notDeepEqual(clone(r.forecast.votes.votes),clone(E.forecastVote(s,park,park.id).votes));
});

test('MP-078 empty, absent and repeated factual claims never receive extra persuasion credit',()=>{
  let s=post(fresh(),program([component('work','workplace',10,1)])),p=s.proposals.at(-1);
  const absent={argument:'There are 0 work places.',source:'typed',programRevision:p.programRevision,claims:[{id:'absent',type:'component',field:'workplace',operator:'eq',value:0,evidence:{start:0,end:24,quote:'There are 0 work places.'}}]};
  assert.equal(E.evaluateClaims(s,p,'marsh',absent).credit,'none');
  const empty={argument:'Please consider the proposal.',source:'typed',programRevision:p.programRevision,claims:[]},result=E.applyCommand(s,command(s,'persuade',{proposalId:p.id,memberId:'marsh',...empty}));
  assert.equal(result.ok,true);assert.equal(result.receipt.originalResult.points,0);assert.equal(result.receipt.originalResult.credit,'none');assert.equal(result.state.lobbyCount.marsh,1);
  s=commit(s,'persuade',{proposalId:p.id,memberId:'okafor',...pitch(p,'safety',E.effectsOf(p,s).safety,`It adds ${E.effectsOf(p,s).safety} safety.`)});
  const changed=pitch(p,'safety',E.effectsOf(p,s).safety,`It adds ${E.effectsOf(p,s).safety} safety.`);changed.claims[0].operator='gte';assert.equal(E.evaluateClaims(s,p,'okafor',changed).credit,'none');
});

test('MP-076 forecast replacement capacity equals the actual economic change at occupied sites',()=>{
  const scenario=clone(E.MILLBROOKE);scenario.map.growth.enabled=false;
  let s=E.newGame(31,scenario,{gameId:'replacement-accounting'}),shop=s.grid.find(c=>c.b?.type==='shop'),plots=[[shop.x,shop.y]],p=program([component('work','workplace',20,1)]),r=preview(s,p,plots);assert.equal(r.ok,true);
  const before=E.econ(s);assert.equal(r.forecast.effects.jobs,10);assert.equal(r.forecast.effects.units,-2);
  s=post(s,p,plots);const target=s.proposals.at(-1);let vote=E.forecastVote(s,target,target.id);
  for(const member of vote.votes.filter(v=>v.vote!==target.id).sort((a,b)=>b.leans[0].lean-a.leans[0].lean).slice(0,2))if(!E.forecastVote(s,target,target.id).winner)s=commit(s,'offer',{proposalId:target.id,memberId:member.member,offer:{type:'favor'}});
  assert.equal(E.forecastVote(s,target,target.id).winner,target.id,'an explicit limited favor must win an actual majority');
  s=commit(s,'decision',{proposalId:target.id,action:'vote',funding:'cash',route:E.approvalRoute(s,target).id});s=commit(s,'resolveYear',{});
  assert.equal(E.econ(s).jobs-before.jobs,r.forecast.effects.jobs);assert.equal(E.econ(s).units-before.units,r.forecast.effects.units);
});

test('MP-076 MP-078 trusted route lookups reject inherited names and malformed identities without effects or authority',()=>{
  const s=fresh(),campus=s.proposals.find(p=>p.id==='campus-loading'),routes=s.scenario.composition.routes;
  Object.setPrototypeOf(routes,{'inherited-route':{id:'inherited-route',plots:clone(campus.plots),crossingConflict:true,costK:999,upkeepK:999}});
  routes['wrong-id']={...clone(routes['service-lane']),id:'different-route'};
  routes['not-a-record']='service-lane';
  const inheritedId=Object.create({id:'inherited-id'});Object.assign(inheritedId,{crossingConflict:true,costK:999});routes['inherited-id']=inheritedId;
  const before=E.canonical(s),baseline=clone(E.effectsOf(campus,s)),authority=clone(E.evaluateResident(s,campus,campus));
  const requested=id=>{const p=clone(campus);p.program.conditions.operations[0].loadingRoute=id;return p;};
  const unknownEffects=clone(E.effectsOf(requested('unknown-route'),s));
  for(const id of ['__proto__','constructor','toString','hasOwnProperty','unknown-route','inherited-route','wrong-id','not-a-record','inherited-id']){
    const candidate=requested(id),revision=E.reviseProgram(s,campus,{conditions:{operations:candidate.program.conditions.operations}});
    assert.equal(revision.ok,false,id);assert.ok(revision.reasons.includes('loading_route_unavailable'),id);
    assert.equal(E.evaluateResident(s,campus,candidate).stance,'refuse',id);
    const result=E.applyCommand(s,command(s,'reviseProposal',{proposalId:campus.id,program:candidate.program,confirmed:true}));
    assert.equal(result.ok,false,id);assert.equal(result.state,s);assert.equal(result.receipt,null);
    assert.deepEqual(clone(E.effectsOf(candidate,s)),unknownEffects,id+' cannot contribute inherited route pricing or conflict effects');
    assert.equal(E.canonical(s),before);assert.deepEqual(clone(E.effectsOf(campus,s)),baseline);assert.deepEqual(clone(E.evaluateResident(s,campus,campus)),authority);
  }
  for(const id of ['service-lane','campus-entrance'])assert.equal(E.reviseProgram(s,campus,{conditions:{operations:requested(id).program.conditions.operations}}).ok,true,id);
});
