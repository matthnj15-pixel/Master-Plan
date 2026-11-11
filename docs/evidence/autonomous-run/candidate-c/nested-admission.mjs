import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const root='/tmp/mp-candidate-c-review',require=createRequire(root+'/source/package.json'),W=require(root+'/source/src/workspace.js');
const source=fs.readFileSync(root+'/source/src/engine.js','utf8');
const poison=()=>({toString:null,valueOf:null}),results=[];
const cases=[['economy',s=>s.scenario.economy=null],['schedule',s=>s.scenario.proposals.schedule[2]=[null]],
 ['profile-authority',s=>{s.scenario.composition??={};s.scenario.composition.profiles??={};s.scenario.composition.profiles.test={authority:poison()};}],
 ['parcel-name',s=>s.scenario.map.parcels.oldmill.name=poison()],['proposal-title',s=>s.proposals[0].title=poison()]];
for(const flag of [true,false]){
 const context={module:{exports:{}},MP_BUILD:{flags:{compositionPlans:flag}}};vm.runInNewContext(source,context);const E=context.module.exports;
 for(const [name,mutate] of cases){
  const s=E.newGame(31,undefined,{gameId:'nested-C'});mutate(s);const before=JSON.stringify(s),supported=E.isSupportedSave(s),migration=E.migrate(s);
  const key=flag?'masterplan.dev.save.v4':'masterplan.dev.save',raw=flag?JSON.stringify({format:'masterplan-save',formatVersion:4,writerProtocol:1,formatFloor:4,storageGeneration:1,state:s,legacyImportBackup:null}):before,values=new Map([[key,raw]]);let writes=0;
  const store=W.create({engine:E,enabled:flag,storage:{getItem:k=>values.get(k)??null,setItem(k,v){writes++;values.set(k,v);}},locks:{request:async(_key,_options,run)=>run()}}),load=await store.load();
  results.push({flag,name,supported,migrationRejected:migration.ok===false,storeRejected:!load.ok,mode:load.mode,writes,bytesPreserved:values.get(key)===raw,inputPreserved:JSON.stringify(s)===before});
 }
}
fs.writeFileSync(root+'/nested-admission.json',JSON.stringify(results,null,2)+'\n');
if(results.some(r=>r.supported||!r.migrationRejected||!r.storeRejected||r.mode!=='read-only'||r.writes||!r.bytesPreserved||!r.inputPreserved))throw Error('A nested admission case failed');
console.log(JSON.stringify({cases:results.length,allPassed:true,types:'real engine/workspace; controlled storage and locks; composition on/v4 and off/v3'}));
