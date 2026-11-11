import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const root='/tmp/mp-candidate-d-review',require=createRequire(root+'/source/package.json'),W=require(root+'/source/src/workspace.js'),R=require(root+'/source/src/plan-renderer.js'),source=fs.readFileSync(root+'/source/src/engine.js','utf8'),clone=v=>JSON.parse(JSON.stringify(v));
const engine=flag=>{const c={module:{exports:{}},MP_BUILD:{flags:{compositionPlans:flag}}};vm.runInNewContext(source,c);return c.module.exports;},E=engine(true),off=engine(false),poison=()=>({toString:null,valueOf:null}),results=[];
async function reject(name,state){const before=JSON.stringify(state);assert.equal(E.isSupportedSave(state),false,name);assert.equal(E.migrate(state).ok,false,name);const command={id:state.actionHighWater+1,gameId:state.gameId,expectedRevision:state.revision,expectedGeneration:1,type:'resolveYear',payload:{}},result=E.applyCommand(state,command);assert.equal(result.ok,false);assert.equal(result.state,state);
 const flagChecks=[];
 for(const flag of [true,false]){const key='masterplan.dev.save.v4',raw=JSON.stringify({format:'masterplan-save',formatVersion:4,writerProtocol:1,formatFloor:4,storageGeneration:1,state,legacyImportBackup:null}),values=new Map([[key,raw]]);let writes=0;
  const store=W.create({engine:flag?E:off,enabled:flag,storage:{getItem:k=>values.get(k)??null,setItem(k,v){writes++;values.set(k,v);}},locks:{request:async(_key,_options,run)=>run()}}),loaded=await store.load();
  assert.equal(loaded.ok,false);assert.equal(loaded.mode,'read-only');assert.equal(writes,0);assert.equal(values.get(key),raw);flagChecks.push({flag,readOnly:true,zeroWrites:true,bytesPreserved:true});}
 assert.equal(JSON.stringify(state),before);results.push({name,status:'PASS',flags:flagChecks});
}
const base=E.newGame(31,undefined,{gameId:'geometry-D'}),mutations=[];
for(const field of ['label','role','componentId','sharedWith','capability','quantity','area'])mutations.push(['allocation.'+field,p=>p.layout.allocations[0][field]=poison()]);
for(const field of ['plot','offset','area'])mutations.push(['segment.'+field,p=>p.layout.allocations[0].segments[0][field]=poison()]);
for(const field of ['plot','componentIds','role','usedArea','bufferArea','preservedArea','freeArea'])mutations.push(['cell.'+field,p=>p.layout.cells[0][field]=poison()]);
for(const field of ['plots','allocations','cells','buffer','preserved','unused','capacity','usedArea','freeArea','preservedArea','bufferArea','illustrativeInterior'])mutations.push(['layout.'+field,p=>p.layout[field]=poison()]);
mutations.push(['extra-key',p=>p.layout.untrusted='ignored?'],['altered-strip-area',p=>p.layout.allocations[0].segments[0].area+=.01],['reordered-site',p=>p.layout.plots.reverse()]);
for(const [name,mutate] of mutations){const state=clone(base),p=state.proposals.find(p=>p.id==='farm-access');mutate(p);await reject(name,state);}
const historical=JSON.parse(fs.readFileSync('/tmp/mp-extension-qa/evidence/final-envelope.json','utf8')).state,gridMutations=[];
for(const field of ['role','projectId','programRevision','title','for','d','new','componentIds'])gridMutations.push(['grid.'+field,c=>c.b[field]=poison()]);
gridMutations.push(['grid.var',c=>c.var=poison()],['grid.site',c=>c.site=poison()],['grid.plan',c=>c.b.plan=null],['grid.allocation',c=>c.b.allocation.role=poison()]);
for(const [name,mutate] of gridMutations){const state=clone(historical);mutate(state.grid.find(c=>c.b?.projectId));await reject(name,state);}
const positives=[];
for(const [name,state] of [['fresh',base],['A-delivered-extension',historical],['C-legacy-delivery',JSON.parse(fs.readFileSync('/tmp/mp-candidate-c-review/legacy-delivery.json','utf8')).state],['authentic-A-pruned-credit',JSON.parse(fs.readFileSync(root+'/source/tests/fixtures/composition-v2-pruned-credit.json','utf8')).state]]){
 assert.equal(E.isSupportedSave(state),true,name);const restored=E.migrate(clone(state));assert.equal(E.isSupportedSave(restored),true,name);for(const p of [...restored.proposals,...restored.pending,...restored.built].filter(p=>p.program))assert.doesNotThrow(()=>R.render({state:restored,proposal:p,engine:E}),name);positives.push({name,status:'PASS',renders:true});}
const old=JSON.parse(fs.readFileSync(root+'/source/tests/fixtures/millbrooke-v2-save.json','utf8'));for(const [flag,e] of [[true,E],[false,off]]){assert.equal(e.isSupportedSave(e.migrate(clone(old))),true);positives.push({name:'real-v2-migration',flag,status:'PASS'});}
fs.writeFileSync(root+'/geometry-probe.json',JSON.stringify({sha:'d4bf9fdf9d73ed0b48ac44ef0374b446fa20688d',negativeCases:results,positiveCases:positives,types:'real engine, actual renderer, real workspace with controlled storage/lock fixtures; A delivered save is unchanged accepted browser evidence'},null,2)+'\n');console.log({negative:results.length,positive:positives.length,allPassed:true});
