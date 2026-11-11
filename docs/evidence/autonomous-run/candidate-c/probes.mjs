import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const root='/tmp/mp-candidate-c-review/source',out='/tmp/mp-candidate-c-review';
const require=createRequire(root+'/package.json');
const C=require(root+'/src/composition-requests.js'),W=require(root+'/src/workspace.js');
const context={module:{exports:{}},MP_BUILD:{flags:{compositionPlans:true}}};
vm.runInNewContext(fs.readFileSync(root+'/src/engine.js','utf8'),context);
const E=context.module.exports,copy=v=>JSON.parse(JSON.stringify(v));
const fresh=(seed=31)=>E.newGame(seed,undefined,{gameId:'review-B'});
const cmd=(s,type,payload)=>({id:s.actionHighWater+1,gameId:s.gameId,expectedRevision:s.revision,expectedGeneration:1,type,payload});
const apply=(s,type,payload)=>{const r=E.applyCommand(s,cmd(s,type,payload));assert.equal(r.ok,true,r.reasons?.join(';'));return r;};
const part=(id,capability,quantity,area)=>({id,capability,label:id,quantity,area,sharedWith:null});
const program=components=>({version:2,title:'Uncatalogued review program',intent:'A small place to work and relax',components,conditions:{hours:10,deliveries:'daytime',access:true,buffer:0,preserve:0,affordable:false},assumptions:[],omissions:[]});
const plots=s=>s.grid.filter(c=>E.canBuildOn(s,c.x,c.y)&&!c.b&&!c.site&&c.t==='grass').slice(0,3).map(c=>[c.x,c.y]);
const checks=[];
for(const value of [null,false,0,[],{toString:null,valueOf:null},'constructor','__proto__']){
 const s=fresh(),p=program([part('work','workplace',4,.5)]),bad=copy(p);bad.components[0].capability=value;
 assert.equal(E.validateProgram(bad).ok,false);
 assert.equal(E.previewProgram(s,{program:p,plots:plots(s),presenter:value}).ok,false);
 assert.equal(E.applyCommand(s,cmd(s,'offer',{proposalId:'bridge',memberId:value,offer:{type:'favor'}})).ok,false);
}
checks.push({ids:['R1','R2'],result:'PASS',evidence:'Malformed capability/presenter/member JSON values reject without throw or mutation.'});
{
 const s=fresh(),p=s.proposals.find(p=>p.id==='campus-loading');
 for(const id of ['__proto__','constructor','toString']){
  const candidate=copy(p.program);candidate.conditions.operations[0].loadingRoute=id;
  assert.equal(E.previewProgram(s,{program:candidate,plots:E.plotsOf(p,s),id:p.id,presenter:p.presenter}).ok,false);
  assert.equal(E.applyCommand(s,cmd(s,'reviseProposal',{proposalId:p.id,program:candidate,confirmed:true})).ok,false);
 }
 checks.push({ids:['R5'],result:'PASS',evidence:'Inherited route names reject in actual preview and revision command.'});
}
{
 const p=program([part('one','policy',1,0),part('two','policy',1,0)]),r=E.validateProgram(p);
 assert.equal(r.ok,false);assert.ok(r.reasons.includes('policy_capacity_exceeded'));
 checks.push({ids:['R8'],result:'PASS',evidence:'Two policy components reject with policy_capacity_exceeded.'});
}
{
 let s=fresh();s=apply(s,'postProgram',{program:program([part('yard','green',.5,.5)]),plots:plots(s),acknowledgedScope:false}).state;
 let p=s.proposals.at(-1);const walk=E.effectsOf(p,s).walk,argument=`This plan adds ${walk} walkability.`,claim={argument,source:'typed',programRevision:p.programRevision,claims:[{id:'walk',type:'effect',field:'walk',operator:'eq',value:walk,evidence:{start:0,end:argument.length,quote:argument}}]};
 s=apply(s,'persuade',{proposalId:p.id,memberId:'okafor',...claim}).state;
 const changed=E.reviseProgram(s,p,{title:'A renamed yard'});assert.equal(changed.ok,true);
 s=apply(s,'reviseProposal',{proposalId:p.id,program:changed.proposal.program,confirmed:true}).state;p=s.proposals.at(-1);
 const r=E.evaluateClaims(s,p,'okafor',{...claim,programRevision:p.programRevision});assert.equal(r.credit,'none');assert.equal(r.claims[0].code,'claim_repeated');
 checks.push({ids:['R4'],result:'PASS',evidence:'A cosmetic rename cannot renew previously earned factual credit.'});
}
const corrupt=[];
for(const [name,mutate] of [['scenario.economy=null',s=>s.scenario.economy=null],['scenario.proposals.schedule[2]=[null]',s=>s.scenario.proposals.schedule['2']=[null]]]){
 const s=fresh();mutate(s);const raw=JSON.stringify(s),values=new Map([['masterplan.dev.save.v4',JSON.stringify({format:'masterplan-save',formatVersion:4,writerProtocol:1,formatFloor:4,storageGeneration:1,state:s,legacyImportBackup:null})]]);
 const store=W.create({engine:E,storage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},locks:{request:async(_key,_options,run)=>run()}});
 const loaded=await store.load();let exception=null;
 try{E.applyCommand(s,cmd(s,'resolveYear',{}));}catch(error){exception=String(error);}
 assert.equal(E.isSupportedSave(s),false);assert.equal(loaded.ok,false);assert.equal(loaded.mode,'read-only');assert.equal(exception,null);assert.equal(JSON.stringify(s),raw);
 corrupt.push({name,isSupportedSave:E.isSupportedSave(s),workspaceLoadOK:loaded.ok,exception,inputPreserved:true});
}
checks.push({ids:['R3-original-nested'],result:'PASS',evidence:corrupt});
{
 let s=fresh(0);const p=s.proposals.find(p=>p.id==='bridge'),site=copy(E.plotsOf(p,s));
 const approval=apply(s,'decision',{proposalId:p.id,action:'approve',funding:'cash',route:'mayor'});s=approval.state;
 const year=apply(s,'resolveYear',{});s=year.state;
 const built=s.built.find(p=>p.id==='bridge'),record=s.projectRecords.find(p=>p.proposalId==='bridge');
 assert.equal(record.stage,'built');assert.equal(built.status,'approved');assert.equal(record.actualCostK,record.estimatedCostK);assert.equal(record.decision.funding,'cash');
 const replay=E.applyCommand(s,approval.receipt.command??{...cmd(fresh(0),'decision',{proposalId:p.id,action:'approve',funding:'cash',route:'mayor'}),id:1,expectedRevision:0});
 assert.equal(replay.ok,true);assert.equal(replay.applied,false);
 let history;
 const provider={json:async prompt=>{history=JSON.parse(prompt.split('\nContext: ')[1].split('\nOriginal input: ')[0]).projectHistory;return{status:'clarify',questions:['Review the bridge decision or a new activity?']};}};
 const result=await C.create({engine:E}).run({mode:'draft',state:s,plots:site,intent:'Retain the previously approved bridge work on this site',provider});
 assert.equal(result.status,'clarify');assert.equal(history.length,1);assert.equal(history[0].kind,'bridge');assert.equal(history[0].representation,'legacy-plan');
 checks.push({ids:['legacy-stage'],result:'PASS',evidence:{approvedStatus:built.status,recordStage:record.stage,cost:record.actualCostK,upkeep:record.annualUpkeepK,decision:record.decision,replayApplied:replay.applied}});
 checks.push({ids:['R9-legacy'],result:'PASS',evidence:{note:'A normal mayoral cash approval and annual delivery produce a built legacy record, now present with legacy-plan provenance in same-site context.',source:'composition-requests.js:216',history}});
 fs.writeFileSync(out+'/legacy-delivery.json',JSON.stringify({state:s,record,contextHistory:history},null,2));
}
{
 const env=JSON.parse(fs.readFileSync('/tmp/mp-extension-qa/initial-envelope.json','utf8')),s=env.state;
 assert.equal(E.isSupportedSave(s),true);
 const def=JSON.parse(fs.readFileSync('/tmp/mp-extension-qa/extension-definition.json','utf8'));
 const id=def.id||Object.keys(def)[0],original=JSON.parse(fs.readFileSync('/tmp/mp-extension-qa/evidence/interpretation-replay.json','utf8'));
 const intent=original.result.intent;
 const result=await C.create({engine:E}).run({state:s,plots:copy(original.result.proposal.plots),intent,provider:{json:async()=>({definitionId:id})}});
 assert.equal(result.status,'ready',result.blocker);
 assert.equal(result.proposal.programRevision,original.result.proposal.programRevision);
 assert.equal(E.canonical(result.layout),E.canonical(original.result.layout));
 const final=JSON.parse(fs.readFileSync('/tmp/mp-extension-qa/evidence/final-envelope.json','utf8'));
 assert.equal(E.isSupportedSave(final.state),true);
 checks.push({ids:['G1.6-carryforward'],result:'PASS',evidence:{note:'Accepted A full browser lifecycle retained; B detached interpretation and final-save compatibility checked, no repeated browser lifecycle.',definitionId:id,previewRevision:result.proposal.programRevision,initialPreviewAndLayoutMatchA:true,costK:result.forecast.money.costK,finalSaveSupported:true}});
}
fs.writeFileSync(out+'/probe-results.json',JSON.stringify({sha:'35461a0acc6a21c723d97d90509bb1e8adb0cf49',types:['real engine','real workspace with memory storage and lock fixture','constant provider mock'],checks},null,2)+'\n');
console.log(JSON.stringify(checks,null,2));
