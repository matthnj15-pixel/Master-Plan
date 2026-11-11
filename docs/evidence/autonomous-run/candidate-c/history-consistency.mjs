import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const root='/tmp/mp-candidate-c-review',require=createRequire(root+'/source/package.json'),C=require(root+'/source/src/composition-requests.js'),context={module:{exports:{}},MP_BUILD:{flags:{compositionPlans:true}}};
vm.runInNewContext(fs.readFileSync(root+'/source/src/engine.js','utf8'),context);const E=context.module.exports,copy=v=>JSON.parse(JSON.stringify(v));
const original=JSON.parse(fs.readFileSync(root+'/legacy-delivery.json','utf8')).state,site=E.plotsOf(original.built.find(p=>p.id==='bridge'),original),checks=[];
async function history(state,plots){let context;const before=E.canonical(state),engine={...E,effectsOf(){throw Error('Historical prices must not be recomputed');},previewLegacyRevision(){throw Error('Historical occupied sites must not be previewed');}};
 const result=await C.create({engine}).run({state,plots,intent:'Review the previously recorded work on these sites',provider:{json:async prompt=>{context=JSON.parse(prompt.split('\nContext: ')[1].split('\nOriginal input: ')[0]);return{status:'clarify',questions:['Which supported change should be considered?']};}}});
 assert.equal(result.status,'clarify',result.blocker);assert.equal(E.canonical(state),before);return context;
}
const actual=await history(copy(original),site);assert.equal(actual.projectHistory.length,1);assert.equal(actual.projectHistory[0].representation,'legacy-plan');assert.equal(Object.hasOwn(actual.projectHistory[0],'conditions'),false);checks.push({id:'actual-legacy',status:'PASS',history:actual.projectHistory});
for(const kind of ['plan','kind','site','decision','revision','invented-conditions','missing-source']){
 const state=copy(original),record=state.projectRecords.find(r=>r.proposalId==='bridge');
 if(kind==='plan')record.plan.scope='patch';if(kind==='kind')record.kind='park';if(kind==='site')record.site='elsewhere';if(kind==='decision')record.decision.funding='bond';if(kind==='revision')record.programRevision='unknown';if(kind==='invented-conditions')record.conditions={access:true};if(kind==='missing-source')state.built=[];
 const result=await history(state,site);assert.equal(result.projectHistory.length,0,kind);checks.push({id:kind,status:'PASS',historyCount:0});
}
const extension=JSON.parse(fs.readFileSync('/tmp/mp-extension-qa/evidence/final-envelope.json','utf8')).state,state=copy(original),snapshot=extension.built.find(p=>p.program),record=extension.projectRecords.find(r=>r.proposalId===snapshot.id);
for(const id of ['z-archive-a','z-archive-b','z-archive-c','z-archive-d']){const p=copy(snapshot),r=copy(record);p.id=id;p.programRevision=E.fingerprint({program:p.program,plots:E.plotsOf(p,state),presenter:p.presenter,id});r.proposalId=id;r.programRevision=p.programRevision;state.built.push(p);state.projectRecords.push(r);}
const combined=await history(state,[...site,...E.plotsOf(snapshot,state)]);assert.equal(combined.projectHistory.length,3);assert.ok(combined.projectHistory.some(h=>h.representation==='legacy-plan'));assert.ok(combined.projectHistory.some(h=>h.representation==='composition-v2'));
checks.push({id:'combined-three',status:'PASS',history:combined.projectHistory,note:'Mixed identity-consistent archive fixtures copied from accepted A extension snapshots; not another normal browser lifecycle.'});
fs.writeFileSync(root+'/history-consistency.json',JSON.stringify({sha:'35461a0acc6a21c723d97d90509bb1e8adb0cf49',types:'actual legacy engine delivery; provider constant clarification mock; mixed archive identity fixtures',checks},null,2)+'\n');console.log({checks:checks.length,allPassed:true});
