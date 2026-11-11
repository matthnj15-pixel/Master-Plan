import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),W=require('../src/workspace.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(){
  const data=new Map();let fail=false;
  const storage={getItem:k=>data.get(k)??null,setItem(k,v){if(fail)throw new Error('quota');data.set(k,v);}};
  const tails=new Map();const locks={request(name,_options,fn){const p=(tails.get(name)||Promise.resolve()).then(fn);tails.set(name,p.catch(()=>{}));return p;}};
  const E={newGame:()=>({v:3,seed:2301,scenarioId:'test',cash:900}),migrate:copy,isSupportedSave:s=>[1,2,3,4].includes(s?.v),fingerprint:s=>JSON.stringify(s),
    applyCommand(input,command){const s=copy(input),old=s.receipts.find(r=>r.id===command.id);
      if(old)return old.fingerprint===JSON.stringify(command)?{ok:true,state:s,receipt:old,applied:false}:{ok:false,code:'command_mismatch',state:s};
      if(command.gameId!==s.gameId||command.expectedRevision!==s.revision)return{ok:false,code:'stale',state:s};
      s.cash-=10;s.actionHighWater=command.id;s.revision++;const receipt={id:command.id,fingerprint:JSON.stringify(command),cash:s.cash};s.receipts.push(receipt);return{ok:true,state:s,receipt,applied:true};}};
  const make=(options={})=>W.create({engine:E,storage,locks,...options});
  return {data,storage,locks,E,make,setFail:v=>fail=v};
}
const command=(store,state,id=1,payload={})=>({id,type:'test',gameId:state.gameId,expectedGeneration:store.generation,expectedRevision:state.revision,payload});

test('MP-060 MP-080 migration preserves exact legacy bytes and fencing is independent of the flag',async()=>{
  const f=fixture(),legacy=' { "v": 3, "seed": 7, "scenarioId": "test", "cash": 673 } ';
  f.data.set('masterplan.dev.save',legacy);const a=f.make(),load=await a.load();assert.equal(load.ok,true);
  assert.equal(load.state.cash,673);assert.equal(f.data.get('masterplan.dev.save'),legacy);
  let env=JSON.parse(f.data.get(a.key));assert.equal(env.legacyImportBackup.json,legacy);
  const state=copy(load.state);state.cash+=5;assert.equal((await a.save(state,a.generation)).ok,true);
  env=JSON.parse(f.data.get(a.key));assert.equal(env.legacyImportBackup.json,legacy);assert.equal(env.storageGeneration,2);
  const off=f.make({enabled:false});assert.equal((await off.load()).mode,'read-only');assert.equal((await off.replace(f.E.newGame())).ok,false);
  f.data.set(a.key,'{"formatVersion":5}');const protectedBytes=f.data.get(a.key);assert.equal((await f.make().load()).ok,false);assert.equal(f.data.get(a.key),protectedBytes);
});

test('MP-079 MP-080 competing next actions persist once and exact historical replay writes nothing',async()=>{
  const f=fixture(),a=f.make(),b=f.make(),initial=await a.load();await b.load();
  const first=command(a,initial.state),second={...first,payload:{different:true}};
  const [x,y]=await Promise.all([a.commit(first),b.commit(second)]);
  assert.equal(x.ok,true);assert.equal(y.ok,false);const raw=f.data.get(a.key),generation=a.generation;
  const replay=await b.commit(first);assert.equal(replay.ok,true);assert.equal(replay.applied,false);
  assert.equal(f.data.get(a.key),raw);assert.equal(replay.generation,generation);assert.deepEqual(replay.receipt,x.receipt);
  assert.equal(replay.state.cash,890);
});

test('MP-080 replacement and delayed autosave cannot overwrite another page action',async()=>{
  const f=fixture(),a=f.make(),b=f.make(),initial=await a.load();await b.load();
  const stale=copy(initial.state),oldGeneration=a.generation;stale.cash=11;
  assert.equal((await b.commit(command(b,initial.state))).ok,true);
  assert.equal((await a.save(stale,oldGeneration)).code,'save_conflict');
  assert.equal((await a.replace(f.E.newGame(),oldGeneration)).ok,false);
  const latest=await a.load(),oldId=latest.state.gameId;
  const replacement=await a.replace(f.E.newGame(),a.generation);assert.equal(replacement.ok,true);assert.notEqual(replacement.state.gameId,oldId);
  assert.equal((await b.commit(command(b,latest.state,2))).ok,false);
  assert.equal(JSON.parse(f.data.get(a.key)).state.gameId,replacement.state.gameId);
});

test('MP-080 failed persistence preserves state and retry must recheck after another writer',async()=>{
  const f=fixture(),a=f.make(),b=f.make(),initial=await a.load();await b.load();const c=command(a,initial.state);
  const raw=f.data.get(a.key);f.setFail(true);const failed=await a.commit(c);
  assert.equal(failed.ok,false);assert.equal(a.state.cash,900);assert.equal(f.data.get(a.key),raw);
  f.setFail(false);assert.equal((await b.commit({...c,payload:{other:true}})).ok,true);
  assert.equal((await a.commit(c)).ok,false);assert.equal(JSON.parse(f.data.get(a.key)).state.cash,890);
});

test('MP-077 MP-080 private workspace conflicts and capacity never evict input or expire drafts',async()=>{
  const f=fixture(),a=f.make(),b=f.make(),initial=await a.load();await b.load();
  const drafts=[{id:'a',versions:[{intent:'A retained private idea',plots:[[1,2]],savedAt:0}]}];
  assert.equal((await a.writeDrafts(initial.state.gameId,drafts,0)).ok,true);
  const losing=[{id:'b',versions:[{intent:'Keep this live on conflict'}]}];
  assert.equal((await b.writeDrafts(initial.state.gameId,losing,0)).code,'workspace_conflict');assert.equal(losing[0].versions[0].intent,'Keep this live on conflict');
  assert.deepEqual((await b.readDrafts(initial.state.gameId)).drafts,drafts);
  assert.equal((await a.writeDrafts(initial.state.gameId,Array.from({length:5},(_,i)=>({id:String(i),versions:[]})),1)).code,'workspace_capacity');
  assert.equal((await a.writeDrafts(initial.state.gameId,[{id:'a',versions:Array(9).fill({intent:'x'})}],1)).code,'workspace_capacity');
  assert.equal((await a.writeDrafts(initial.state.gameId,[{id:'a',versions:[{intent:'漢'.repeat(45000)}]}],1)).code,'workspace_capacity');
  assert.equal((await a.readDrafts(initial.state.gameId)).drafts[0].versions[0].savedAt,0);
  assert.equal(a.generation,initial.generation,'private writes do not mutate public generation');
});

test('MP-080 missing locks, lock failure and inaccessible storage preserve bytes in safe mode',async()=>{
  const f=fixture(),a=f.make();await a.load();const raw=f.data.get(a.key);
  const noLocks=f.make({locks:{}});assert.equal((await noLocks.load()).mode,'read-only');assert.equal((await noLocks.save(a.state)).ok,false);
  const broken=f.make({locks:{request(){throw new Error('unavailable');}}});await broken.load();assert.equal((await broken.save({...a.state,cash:9})).code,'save_lock_unavailable');assert.equal(broken.mode,'read-only');
  const unreadable=f.make({storage:{getItem(){throw new Error('blocked');}}});assert.equal((await unreadable.load()).mode,'read-only');assert.equal(f.data.get(a.key),raw);
});

test('MP-061 MP-080 newest durable replica and account scope fence never upload a captured old town',async()=>{
  const f=fixture(),a=f.make(),initial=await a.load();a.setAccount('account-a');let release;
  const hold=new Promise(r=>release=r),uploads=[];
  const first=a.replicate(async env=>{uploads.push(env);await hold;});
  await new Promise(r=>setTimeout(r,0));const second=a.replicate(async env=>uploads.push(env));
  const changed=copy(a.state);changed.cash=777;await a.save(changed,a.generation);release();await first;await second;
  assert.equal(uploads[0].state.cash,initial.state.cash);assert.equal(uploads[1].state.cash,777);
  const skipped=a.replicate(async()=>assert.fail('wrong account upload'),{scope:'old-account'});assert.equal((await skipped).ok,false);
  const stable=f.make({key:'masterplan.stable.save.v4',legacyKey:'millbrook.v1',channel:'stable'});await stable.load();assert.equal(stable.state.cash,900);assert.equal(a.state.cash,777);
});
