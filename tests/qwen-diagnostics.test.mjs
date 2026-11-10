import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const D=require('../src/qwen-diagnostics.js');
const build={channel:'dev',version:'0.6.0-dev',commit:'abc1234'};
function memory(initial={events:[],meta:{}}){let data=structuredClone(initial);return{async read(){return structuredClone(data);},async write(next){data=structuredClone(next);},data(){return data;}};}
const at=Date.parse('2026-11-10T15:00:00Z');
const make=(opts={})=>D.create({enabled:true,build,now:()=>at,storage:memory(),...opts});

test('MP-075 local date ranges are inclusive with calendar arithmetic across DST and reject invalid dates',()=>{
 const previous=process.env.TZ;process.env.TZ='America/New_York';
 try{
  const fall=D.dateRange('2026-11-01','2026-11-01');
  assert.equal(fall.startUtc,'2026-11-01T04:00:00.000Z');
  assert.equal(fall.endExclusiveUtc,'2026-11-02T05:00:00.000Z');
  const spring=D.dateRange('2026-03-08','2026-03-08');
  assert.equal(Date.parse(spring.endExclusiveUtc)-Date.parse(spring.startUtc),23*3600000);
  assert.match(D.dateRange('','2026-11-01').error,/both/i);
  assert.match(D.dateRange('2026-11-02','2026-11-01').error,/before|after/i);
  assert.match(D.dateRange('2026-02-30','2026-03-01').error,/valid/i);
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

test('MP-075 retains exactly 168 hours, chronological order, and prunes again on cold launch',async()=>{
 let clock=at;const storage=memory();const a=make({storage,now:()=>clock});
 clock=at-168*3600000-1;await a.record('app.launch','observed');
 clock++;await a.record('app.launch','observed');
 clock=at;await a.record('app.launch','observed');
 const snap=await a.snapshot();
 assert.equal(snap.retainedCount,2);
 assert.equal(snap.prepared.document.events[0].timestamp,new Date(at-168*3600000).toISOString());
 clock=at+1;const cold=make({storage,now:()=>clock});
 assert.equal((await cold.snapshot()).retainedCount,1);
 assert.equal(storage.data().events.length,1);
});

test('MP-075 bounds storage by count and encoded UTF-8 bytes and reports durable oldest-first capacity trimming',async()=>{
 const storage=memory();let clock=at;const d=make({storage,now:()=>clock});
 for(let i=0;i<1003;i++){clock++;await d.record('request.queued','queued',{requestId:d.id(),attempt:1,stage:'queue'});}
 const snap=await d.snapshot();
 assert.equal(snap.retainedCount,1000);
 assert.equal(snap.prepared.document.retention.capacityTrimmedEvents,3);
 assert.ok(snap.warnings.some(x=>/capacity/i.test(x)));
 assert.ok(snap.prepared.document.events.every((x,i,a)=>!i||x.timestamp>=a[i-1].timestamp));
 const cap=D.pruneEvents([{id:'1',timestamp:new Date(at).toISOString(),body:'é'.repeat(200)},{id:'2',timestamp:new Date(at+1).toISOString(),body:'é'.repeat(200)}],{},at+1,{maxBytes:600});
 assert.equal(cap.events.length,1);assert.equal(cap.events[0].id,'2');
 const cold=make({storage,now:()=>clock});assert.equal((await cold.snapshot()).prepared.document.retention.capacityTrimmedEvents,3);
});

test('MP-075 validates missing/reversed/empty ranges and previews without consuming retained events',async()=>{
 const d=make();await d.record('app.launch','observed');
 assert.match((await d.snapshot({from:'',through:'2026-11-10'})).error,/both/i);
 assert.match((await d.snapshot({from:'2026-11-11',through:'2026-11-10'})).error,/before|after/i);
 const empty=await d.snapshot({from:'2026-11-09',through:'2026-11-09'});
 assert.equal(empty.count,0);assert.match(empty.error,/no diagnostic/i);
 const snap=await d.snapshot();assert.equal(snap.count,1);assert.equal((await d.snapshot()).count,1);
 assert.equal(snap.prepared.document.eventCount,1);
 assert.equal(snap.prepared.document.schemaVersion,1);
 assert.equal(snap.prepared.document.events[0].revision,'abc1234');
 assert.ok(snap.warnings.some(x=>/retention|retained/i.test(x)));
});

test('MP-075 metadata and exceptions never retain prompt, reply, save, title, account or unknown exception text',async()=>{
 const sentinel='PRIVATE_SENTINEL_9f32';const d=make();
 const e=Object.assign(new Error(sentinel),{name:sentinel,code:sentinel,stack:`Error: ${sentinel}\n at unsafe (https://example.com/${sentinel}:12:5)`});
 await d.record('request.error','failed',{requestId:d.id(),stage:'generation',prompt:sentinel,reply:sentinel,save:sentinel,title:sentinel,coordinates:[1,2],accountId:sentinel,error:d.error(e,'generation'),modelId:sentinel,action:sentinel});
 const snap=await d.snapshot();const json=JSON.stringify(snap.prepared.document);
 assert.ok(!json.includes(sentinel));
 const event=snap.prepared.document.events[0];assert.equal(event.metadata.error.code,'unknown');
 assert.equal(event.metadata.error.name,'UnknownError');
 assert.equal(event.metadata.error.category,'unknown');
 assert.ok(!json.includes('https://example.com'));
 const safe=d.error(Object.assign(new Error(sentinel),{name:'DeviceLostError',stack:'Error\n at safe (offline-ai.js:40:2)'}),'generation');
 assert.equal(safe.module,'offline-ai.js');assert.equal(safe.line,40);
});

test('MP-075 correlated incomplete attempts retain their last observed stage without inventing a cause',async()=>{
 const d=make();const requestId=d.id(),startupId=d.id();
 await d.record('startup.begin','started',{startupId,modelId:'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'});
 await d.record('plan.submitted','started',{requestId,action:'draft'});
 await d.record('generation.started','started',{requestId,action:'draft',attempt:1,stage:'generation'});
 const doc=(await d.snapshot()).prepared.document;
 const attempt=doc.attempts.find(x=>x.requestId===requestId);
 assert.equal(attempt.status,'incomplete');assert.equal(attempt.lastStage,'generation');assert.equal(attempt.cause,'unknown');
 assert.equal(doc.attempts.find(x=>x.startupId===startupId).status,'incomplete');
});

test('MP-075 valid reply and actual application are distinct and missing application remains visible',async()=>{
 const d=make();const requestId=d.id();
 await d.record('plan.submitted','started',{requestId,action:'revise'});
 await d.record('plan.validation','valid',{requestId,stage:'validation'});
 await d.record('plan.final','ready',{requestId,stage:'validation'});
 let attempt=(await d.snapshot()).prepared.document.attempts[0];
 assert.equal(attempt.status,'incomplete');assert.ok(attempt.missingTerminalEvents.includes('plan.application'));
 await d.record('plan.application','unchanged',{requestId,stage:'application',applied:false,changedFieldCount:0});
 attempt=(await d.snapshot()).prepared.document.attempts[0];assert.equal(attempt.status,'complete');assert.equal(attempt.applied,false);
});

test('MP-075 unavailable diagnostic storage and disabled channel never throw or request persistent browser storage',async()=>{
 const d=make({storage:{async read(){throw new Error('private quota text');}}});
 await d.record('app.launch','observed');const snapshot=await d.snapshot();
 assert.match(snapshot.status,/unavailable/i);assert.equal(snapshot.prepared,null);
 assert.ok(!JSON.stringify(snapshot).includes('private quota text'));
 let reads=0;const off=make({enabled:false,storage:{read(){reads++;throw new Error();}}});
 await off.record('app.launch','observed');await off.snapshot();assert.equal(reads,0);
});

test('MP-075 file sharing starts inside the user action and expired records cannot enter a later export',async()=>{
 const nav=Object.getOwnPropertyDescriptor(globalThis,'navigator');let shared,called=false,clock=at;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false,canShare:()=>true,share(options){called=true;shared=options.files[0];return Promise.resolve();}}});
 try{
  const d=make({now:()=>clock});await d.record('app.launch','observed');
  const snapshot=await d.snapshot();const promise=d.deliver(snapshot.prepared);
  assert.equal(called,true,'native share invoked synchronously before any IDB await');
  assert.deepEqual(await promise,{method:'shared'});
  const exported=JSON.parse(await shared.text());assert.equal(exported.eventCount,1);
  assert.equal(exported.events[0].context.network.online,false);
  assert.equal(shared.name,'master-plan-qwen-dev-2026-11-10-to-2026-11-10.json');
  assert.equal((await d.snapshot()).retainedCount,1,'delivery keeps retained events');
  clock=at+168*3600000+1;called=false;
  await assert.rejects(d.deliver(snapshot.prepared),/No diagnostic events/);
  assert.equal(called,false,'expired prepared event is never shared');
 }finally{if(nav)Object.defineProperty(globalThis,'navigator',nav);else delete globalThis.navigator;}
});

test('MP-075 downloads a local UTF-8 JSON file when file sharing is unsupported and cancellation keeps the log',async()=>{
 const nav=Object.getOwnPropertyDescriptor(globalThis,'navigator'),doc=Object.getOwnPropertyDescriptor(globalThis,'document');
 const create=URL.createObjectURL,revoke=URL.revokeObjectURL,timer=globalThis.setTimeout;
 let clicked=false,file,removed=false;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{append(){}},createElement(){return{click(){clicked=true;},remove(){removed=true;}};}}});
 URL.createObjectURL=value=>{file=value;return 'blob:local-diagnostic';};URL.revokeObjectURL=()=>{};globalThis.setTimeout=()=>0;
 try{
  const d=make();await d.record('app.launch','observed');const snapshot=await d.snapshot();
  assert.deepEqual(await d.deliver(snapshot.prepared),{method:'downloaded'});assert.equal(clicked,true);assert.equal(removed,true);
  assert.equal(JSON.parse(await file.text()).events[0].revision,'abc1234');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{canShare:()=>true,share:()=>Promise.reject({name:'AbortError'})}});
  assert.deepEqual(await d.deliver(snapshot.prepared),{method:'canceled'});assert.equal((await d.snapshot()).count,1);
 }finally{
  if(nav)Object.defineProperty(globalThis,'navigator',nav);else delete globalThis.navigator;
  if(doc)Object.defineProperty(globalThis,'document',doc);else delete globalThis.document;
  URL.createObjectURL=create;URL.revokeObjectURL=revoke;globalThis.setTimeout=timer;
 }
});

test('MP-075 a runner timeout cannot conceal a still-running generation and selected partial context stays explicit',async()=>{
 const d=make(),requestId=d.id();
 await d.record('plan.submitted','started',{requestId,stage:'queue'});
 await d.record('generation.started','started',{requestId,stage:'generation',attempt:1,generationAttempt:1});
 await d.record('plan.final','timeout',{requestId,stage:'generation',durationMs:90000});
 let attempt=(await d.snapshot()).prepared.document.attempts[0];
 assert.equal(attempt.status,'incomplete');assert.ok(attempt.missingTerminalEvents.includes('generation.finished'));
 assert.equal(attempt.lastStage,'generation');assert.equal(attempt.measuredDurationMs,90000);
 const partial=d.id();await d.record('generation.started','started',{requestId:partial,stage:'generation'});
 attempt=(await d.snapshot()).prepared.document.attempts.find(x=>x.requestId===partial);
 assert.equal(attempt.partialContext,true);assert.equal(attempt.status,'incomplete');
 await d.record('startup.interrupted','incomplete',{stage:'startup',previousSession:true});
 assert.ok((await d.snapshot()).prepared.document.attempts.some(x=>x.lastEvent==='startup.interrupted'&&x.cause==='unknown'));
});

test('MP-075 the selected DST incident day includes start midnight and excludes the following midnight',async()=>{
 const previous=process.env.TZ;process.env.TZ='America/New_York';
 try{
  const times=['2026-11-01T03:59:59.999Z','2026-11-01T04:00:00.000Z','2026-11-02T04:59:59.999Z','2026-11-02T05:00:00.000Z'];
  const events=times.map((timestamp,i)=>({id:String(i),timestamp,sessionId:'fixture-session',name:'app.launch',metadata:{},revision:'base'}));
  const d=make({now:()=>Date.parse('2026-11-02T12:00:00Z'),storage:memory({events,meta:{}})});
  const snapshot=await d.snapshot({from:'2026-11-01',through:'2026-11-01'});
  assert.equal(snapshot.count,2);assert.deepEqual(snapshot.prepared.document.events.map(e=>e.timestamp),times.slice(1,3));
  assert.equal(snapshot.prepared.document.boundaries.startUtc,'2026-11-01T04:00:00.000Z');
  assert.equal(snapshot.prepared.document.boundaries.endExclusiveUtc,'2026-11-02T05:00:00.000Z');
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

test('MP-075 a retained export spans build updates with the original revision on every event',async()=>{
 const storage=memory();const a=make({storage,build:{...build,commit:'old1234'}});await a.record('app.launch','observed');
 const b=make({storage,build:{...build,commit:'new5678'},now:()=>at+1});await b.record('app.launch','observed');
 const doc=(await b.snapshot()).prepared.document;assert.equal(doc.eventCount,2);
 assert.deepEqual(doc.events.map(e=>e.revision),['old1234','new5678']);assert.notEqual(doc.events[0].sessionId,doc.events[1].sessionId);
});

test('MP-075 a successful read cannot clear a quota write failure until a bounded write succeeds',async()=>{
 const base=memory({events:[],meta:{capacityTrimmedEvents:0}});let failWrites=false,writes=0;
 const storage={read:base.read,async write(...args){writes++;if(failWrites)throw new Error('private quota details');return base.write(...args);}};
 const d=make({storage});assert.match((await d.snapshot()).status,/ready/i);
 failWrites=true;await d.record('app.launch','observed');assert.equal(writes,1);
 const after=await d.snapshot();assert.match(after.status,/unavailable/i);
 assert.equal(writes,1,'the successful read made no write and cannot claim writable storage');
 failWrites=false;await d.record('app.launch','observed');const recovered=await d.snapshot();
 assert.match(recovered.status,/ready/i);assert.equal(recovered.retainedCount,1);
 assert.ok(!JSON.stringify(recovered).includes('private quota details'));
});

test('MP-075 a hanging actual cached-engine reload remains incomplete after the plan runner times out',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/offline-ai.js',import.meta.url),'utf8');
 const {createOfflineProvider}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const {createPlanRunner}=require('../src/plan-requests.js'),engine=require('../src/engine.js');
 const d=make(),modelId='Qwen2.5-1.5B-Instruct-q4f16_1-MLC';let rejectReload;
 const unloaded={chat:{completions:{async create(){throw Object.assign(new Error('private runtime text'),{name:'ModelNotLoadedError'});}}}};
 const provider=createOfflineProvider(unloaded,modelId,()=>new Promise((_,reject)=>{rejectReload=reject;}),d);
 const runner=createPlanRunner({engine,timeoutMs:15,diagnostics:d}),state=engine.newGame(12345);
 const outcome=await runner.run({state,provider,intent:'Build homes at the Old Mill lot'});
 assert.equal(outcome.status,'unavailable');assert.equal(typeof rejectReload,'function');
 let attempt=(await d.snapshot()).prepared.document.attempts.find(x=>x.requestId===outcome.requestId);
 assert.equal(attempt.status,'incomplete');assert.equal(attempt.lastStage,'reload');
 assert.ok(attempt.missingTerminalEvents.includes('engine.reload success or failed'));
 assert.equal(attempt.lastCompletedStage,'generation');
 rejectReload(Object.assign(new Error('private reload text'),{name:'DeviceLostError'}));
 await new Promise(resolve=>setImmediate(resolve));
 attempt=(await d.snapshot()).prepared.document.attempts.find(x=>x.requestId===outcome.requestId);
 assert.equal(attempt.status,'complete');assert.equal(attempt.lastStage,'reload');
 assert.deepEqual(attempt.missingTerminalEvents,[]);
});

test('MP-075 shutdown and initialization starts require their own terminal stage even after outer results',async()=>{
 const d=make(),requestId=d.id(),startupId=d.id();
 await d.record('shutdown.begin','started',{requestId,action:'other',stage:'shutdown'});
 let summary=(await d.snapshot()).prepared.document.attempts.find(x=>x.requestId===requestId);
 assert.equal(summary.status,'incomplete');assert.deepEqual(summary.missingTerminalEvents,['shutdown.finish']);assert.deepEqual(summary.missingContextEvents,[]);
 await d.record('shutdown.finish','success',{requestId,action:'other',stage:'shutdown'});
 summary=(await d.snapshot()).prepared.document.attempts.find(x=>x.requestId===requestId);
 assert.equal(summary.status,'complete');
 await d.record('startup.begin','started',{startupId,stage:'startup'});
 await d.record('startup.initialization','started',{startupId,stage:'initialization'});
 await d.record('startup.error','failed',{startupId,stage:'startup'});
 summary=(await d.snapshot()).prepared.document.attempts.find(x=>x.startupId===startupId);
 assert.equal(summary.status,'incomplete');assert.equal(summary.lastStage,'initialization');
 await d.record('startup.initialization','failed',{startupId,stage:'initialization'});
 summary=(await d.snapshot()).prepared.document.attempts.find(x=>x.startupId===startupId);
 assert.equal(summary.status,'complete');
});

test('MP-075 a skipped midnight DST date ends at the next calendar midnight, excluding its first hour',async()=>{
 const previous=process.env.TZ;process.env.TZ='America/Santiago';
 try{
  const range=D.dateRange('2026-09-06','2026-09-06');
  assert.equal(range.startUtc,'2026-09-06T04:00:00.000Z');
  assert.equal(range.endExclusiveUtc,'2026-09-07T03:00:00.000Z');
  const times=['2026-09-06T04:00:00.000Z','2026-09-07T02:59:59.999Z','2026-09-07T03:00:00.000Z','2026-09-07T03:30:00.000Z'];
  const events=times.map((timestamp,i)=>({id:String(i),timestamp,sessionId:'fixture-session',name:'app.launch',metadata:{},revision:'base'}));
  const d=make({storage:memory({events,meta:{}}),now:()=>Date.parse('2026-09-07T12:00:00Z')});
  const snapshot=await d.snapshot({from:'2026-09-06',through:'2026-09-06'});
  assert.equal(snapshot.count,2);assert.deepEqual(snapshot.prepared.document.events.map(e=>e.timestamp),times.slice(0,2));
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
