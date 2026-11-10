/* Local, bounded Dev diagnostics. This store never receives town or model text. */
(function(root){
'use strict';
const HOURS=168, RETENTION_MS=HOURS*60*60*1000, MAX_EVENTS=1000, MAX_BYTES=1024*1024;
const encoder=new TextEncoder();
const names=new Set(('app.launch model.choice startup.begin startup.check startup.initialization startup.ready startup.error startup.interrupted startup.retry shutdown.begin shutdown.finish request.queued generation.started generation.finished request.timeout request.aborted request.error grammar.fallback engine.reload plan.submitted plan.queued plan.dequeued plan.validation plan.repair plan.final plan.application').split(' '));
const outcomes=new Set(('started queued passed failed ready valid invalid malformed-json unsupported stale canceled timeout unavailable applied unchanged not-applied incomplete success off selected observed').split(' '));
const stages=new Set(('startup webgpu shader-f16 shell-cache runtime-cache model-cache initialization queue generation response reload validation repair application shutdown launch').split(' '));
const actions=new Set(['draft','revise','briefing','other']);
const models=new Set(['Qwen2.5-1.5B-Instruct-q4f16_1-MLC','Qwen2.5-3B-Instruct-q4f16_1-MLC']);
const errorTypes={
 GrammarMatcherInitError:['grammar-init','grammar','JSON grammar initialization failed.'],
 ModelNotLoadedError:['model-not-loaded','model','The model was not loaded.'],
 DeviceLostError:['device-lost','device','The runtime reported a lost graphics device.'],
 MissingCompletion:['missing-completion','response','The runtime returned no completion.'],
 SyntaxError:['malformed-json','response','The reply was not valid JSON.'],
 AbortError:['aborted','cancellation','The request was canceled.'],
 TimeoutError:['timeout','timeout','The request exceeded its time limit.'],
 QuotaExceededError:['storage-quota','storage','Diagnostic storage reached its quota.'],
 NotSupportedError:['unsupported','capability','A required browser capability is unavailable.'],
};
const codes={
 'unknown-model':['unknown-model','configuration','The saved model choice is not supported.'],
 'webgpu-unavailable':['webgpu-unavailable','capability','Required WebGPU shader support is unavailable.'],
 'offline-storage':['offline-storage','storage','Offline browser storage is unavailable.'],
 'runtime-missing':['runtime-missing','cache','The cached runtime is missing.'],
 'runtime-download':['runtime-download','network','The runtime download failed.'],
 'model-missing':['model-missing','cache','The cached model is missing.'],
 'model-cache-write':['model-cache-write','storage','The model could not be kept in cache.'],
 'shell-cache':['shell-cache','cache','The game shell could not be cached.'],
 timeout:['timeout','timeout','The request exceeded its time limit.'],stale:['stale','cancellation','The request no longer matches the current game.'],unavailable:['unavailable','availability','The provider is unavailable.'],'offline-inference':['offline-inference','runtime','The runtime could not finish the request.'],'offline-reload':['offline-reload','model','The cached model could not be used.']};
const unknown={name:'UnknownError',code:'unknown',category:'unknown',message:'An unclassified error occurred.'};
const iso=ms=>new Date(ms).toISOString();
const bytes=value=>encoder.encode(JSON.stringify(value)).byteLength;
const localDate=value=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const identifier=s=>typeof s==='string'&&/^[a-z0-9][a-z0-9-]{7,79}$/i.test(s);
function id(){
 try{if(root.crypto?.randomUUID)return root.crypto.randomUUID();}catch{}
 const a=new Uint8Array(16);
 try{root.crypto.getRandomValues(a);}catch{for(let i=0;i<a.length;i++)a[i]=Math.floor(Math.random()*256);}
 return Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');
}
function dateRange(from,through){
 if(!from||!through)return {error:'Choose both From and Through dates.'};
 function midnight(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const [y,m,d]=value.split('-').map(Number);if(y<100||y>9999)return null;
  const date=new Date(y,m-1,d);
  return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d?date:null;
 }
 const start=midnight(from),end=midnight(through);
 if(!start||!end)return {error:'Choose valid calendar dates.'};
 if(start>end)return {error:'From must be on or before Through.'};
 // Calendar arithmetic, not a fixed 24-hour duration: local days can span DST.
 const nextMidnight=new Date(end.getFullYear(),end.getMonth(),end.getDate()+1);
 let timezone='unknown';try{timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||timezone;}catch{}
 return {from,through,timezone,startUtc:start.toISOString(),endExclusiveUtc:nextMidnight.toISOString(),startOffsetMinutes:-start.getTimezoneOffset(),endOffsetMinutes:-nextMidnight.getTimezoneOffset()};
}
function safeError(error,stage){
 let result={...unknown};
 try{
  const suppliedName=error?.diagnostic?.name||error?.name;
  const classified=errorTypes[suppliedName]||codes[error?.code];
  if(classified){const [code,category,message]=classified;result={name:errorTypes[suppliedName]?suppliedName:'Error',code,category,message};}
  if(stages.has(stage))result.stage=stage;
  // Keep only an allowlisted local module and line; never retain stack text,
  // arbitrary source paths, URLs, query strings, or exception messages.
  const stack=typeof error?.stack==='string'?error.stack.slice(0,4096):'';
  const modules='(offline-ai\\.js|plan-requests\\.js|ui\\.js|qwen-diagnostics\\.js|index\\.html)';
  for(const line of stack.split('\n').slice(1)){
   const local=new RegExp('(?:^|\\s|\\()'+modules+':(\\d{1,7})(?::\\d+)?(?:\\)|\\s|$)').exec(line);
   if(local){result.module=local[1];result.line=Number(local[2]);break;}
   const url=new RegExp('(https?://[^\\s)]+?)/'+modules+':(\\d{1,7})(?::\\d+)?(?:\\)|\\s|$)').exec(line);
   if(url&&root.location?.href){
    const source=new URL(url[1]+'/'+url[2]),base=new URL('./',root.location.href);
    if(source.origin===base.origin&&source.pathname===base.pathname+url[2]){result.module=url[2];result.line=Number(url[3]);break;}
   }
  }
 }catch{}
 return result;
}
function sanitizeMetadata(input){
 const out={};if(!input||typeof input!=='object')return out;
 for(const key of ['requestId','startupId'])if(identifier(input[key]))out[key]=input[key];
 if(actions.has(input.action))out.action=input.action;
 if(stages.has(input.stage))out.stage=input.stage;
 if(models.has(input.modelId)){out.modelId=input.modelId;out.runtimeVersion='0.2.87';}
 if(input.runtimeVersion==='0.2.87')out.runtimeVersion=input.runtimeVersion;
 for(const key of ['attempt','generationAttempt','plotCount','changedFieldCount','promptTokens','completionTokens','totalTokens'])if(integer(input[key]))out[key]=Math.min(input[key],1e9);
 for(const key of ['durationMs','queueWaitMs','inferenceMs'])if(typeof input[key]==='number'&&Number.isFinite(input[key])&&input[key]>=0)out[key]=Math.round(Math.min(input[key],Number.MAX_SAFE_INTEGER));
 for(const key of ['applied','download','webgpu','shaderF16','cached','previousSession'])if(typeof input[key]==='boolean')out[key]=input[key];
 if(['stop','length','tool_calls','content_filter','function_call'].includes(input.finishReason))out.finishReason=input.finishReason;
 if(input.error){
  // Do not trust pre-sanitized caller objects: reconstruct from our own maps.
  const value=input.error;
  out.error=safeError({name:value.name,code:value.code,diagnostic:value.diagnostic},out.stage||value.stage);
  if(['offline-ai.js','plan-requests.js','ui.js','qwen-diagnostics.js','index.html'].includes(value.module)&&integer(value.line)){
   out.error.module=value.module;out.error.line=value.line;
  }
 }
 return out;
}
function technicalContext(){
 const nav=root.navigator||{},context={launchMode:'browser',network:{online:typeof nav.onLine==='boolean'?nav.onLine:null,source:'navigator.onLine',interpretation:'observation'},serviceWorkerControlled:!!nav.serviceWorker?.controller};
 try{if(nav.standalone===true||root.matchMedia?.('(display-mode: standalone)').matches)context.launchMode='standalone';}catch{}
 const ua=typeof nav.userAgent==='string'?nav.userAgent:'';
 let match;
 for(const [name,re] of [['Edge',/Edg\/(\d+(?:\.\d+){0,3})/],['Chrome',/(?:Chrome|CriOS)\/(\d+(?:\.\d+){0,3})/],['Firefox',/(?:Firefox|FxiOS)\/(\d+(?:\.\d+){0,3})/],['Safari',/Version\/(\d+(?:\.\d+){0,3}).*Safari/]])if((match=re.exec(ua))){context.browser={name,version:match[1]};break;}
 if((match=/(?:iPhone OS|CPU OS) (\d+(?:_\d+){0,2})/.exec(ua)))context.os={name:'iOS',version:match[1].replaceAll('_','.')};
 else if((match=/Android (\d+(?:\.\d+){0,2})/.exec(ua)))context.os={name:'Android',version:match[1]};
 else if((match=/Mac OS X (\d+(?:[_\.]\d+){0,2})/.exec(ua)))context.os={name:'macOS',version:match[1].replaceAll('_','.')};
 else if((match=/Windows NT (\d+(?:\.\d+){0,2})/.exec(ua)))context.os={name:'Windows',version:match[1]};
 else if(/Linux/.test(ua))context.os={name:'Linux'};
 return context;
}
function pruneEvents(events,meta,now,{maxEvents=MAX_EVENTS,maxBytes=MAX_BYTES}={}){
 const cutoff=now-RETENTION_MS;
 const sorted=events.filter(e=>Number.isFinite(Date.parse(e.timestamp))&&Date.parse(e.timestamp)>=cutoff).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||String(a.sessionId||'').localeCompare(String(b.sessionId||''))||(a.sequence||0)-(b.sequence||0));
 let total=sorted.reduce((n,e)=>n+bytes(e),0),removed=0,lastRemoved=null;
 while(sorted.length>maxEvents||total>maxBytes){const e=sorted.shift();total-=bytes(e);removed++;lastRemoved=e.timestamp;}
 const next={capacityTrimmedEvents:integer(meta?.capacityTrimmedEvents)?meta.capacityTrimmedEvents:0,...(meta?.lastCapacityTrimAt?{lastCapacityTrimAt:meta.lastCapacityTrimAt}:{}),...(meta?.capacityTrimmedThrough?{capacityTrimmedThrough:meta.capacityTrimmedThrough}:{})};
 if(removed){next.capacityTrimmedEvents+=removed;next.lastCapacityTrimAt=iso(now);next.capacityTrimmedThrough=lastRemoved;}
 return {events:sorted,meta:next,encodedBytes:total};
}
function indexedStorage(indexedDB,channel){
 let opening;
 function open(){
  if(!opening)opening=new Promise((resolve,reject)=>{
   if(!indexedDB){reject(new Error());return;}
   const request=indexedDB.open(`master-plan-qwen-diagnostics:${channel}`,1);
   request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('events'))db.createObjectStore('events',{keyPath:'id'});if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta');};
   request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
   request.onerror=()=>reject(new Error());request.onblocked=()=>reject(new Error());
  });
  return opening;
 }
 return {async update(transform){
  const db=await open();return new Promise((resolve,reject)=>{
   // One read/write transaction makes concurrent tabs honor the same caps.
   const transaction=db.transaction(['events','meta'],'readwrite'),store=transaction.objectStore('events');
   const events=store.getAll(),meta=transaction.objectStore('meta').get('retention');
   let ready=0,next;
   const read=()=>{if(++ready!==2)return;try{
    const previous={events:events.result,meta:meta.result||{}};next=transform(previous);
    const oldIds=new Set(previous.events.map(e=>e.id)),newIds=new Set(next.events.map(e=>e.id));
    for(const key of oldIds)if(!newIds.has(key))store.delete(key);
    for(const event of next.events)if(!oldIds.has(event.id))store.put(event);
    if(JSON.stringify(previous.meta)!==JSON.stringify(next.meta))transaction.objectStore('meta').put(next.meta,'retention');
   }catch{transaction.abort();}};
   events.onsuccess=meta.onsuccess=read;
   transaction.oncomplete=()=>resolve(next);transaction.onerror=transaction.onabort=()=>reject(new Error());
  });
 }};
}
function attemptSummaries(events){
 const groups=new Map();
 for(const event of events){
  const m=event.metadata||{},key=m.requestId||m.startupId||(event.name==='startup.interrupted'?event.id:null);if(!key)continue;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(event);
 }
 return [...groups.values()].map(list=>{
  const first=list[0],last=list.at(-1),m=first.metadata||{},requestId=m.requestId,startupId=m.startupId;
  const found=name=>list.findLast(e=>e.name===name),application=found('plan.application'),final=found('plan.final'),start=found('plan.submitted'),startup=found('startup.begin'),interrupted=found('startup.interrupted'),shutdown=found('shutdown.begin'),shutdownFinish=found('shutdown.finish');
  const missing=[],missingContext=[];
  const isPlan=list.some(e=>e.name.startsWith('plan.')),isShutdown=!!(shutdown||shutdownFinish);
  if(isShutdown){if(!shutdown)missingContext.push('shutdown.begin');if(!shutdownFinish)missing.push('shutdown.finish');}
  else if(isPlan){if(!start)missingContext.push('plan.submitted');if(!final)missing.push('plan.final');else if(final.outcome==='ready'&&!application)missing.push('plan.application');}
  else if(startup||startupId||interrupted){
   if(!startup)missingContext.push('startup.begin');
   if(!found('startup.ready')&&!found('startup.error'))missing.push('startup.ready or startup.error');
  }
  else if(!found('request.queued'))missingContext.push('request.queued');
  // A runner timeout does not settle the underlying runtime stage. Track every
  // started boundary independently so a later plan.final cannot hide it.
  const activeStages=new Map();
  for(const event of list){
   const info=event.metadata||{},key=`${info.attempt||0}:${info.generationAttempt||0}`;
   if(event.name==='generation.started')activeStages.set('generation:'+key,{event,stage:'generation'});
   if(event.name==='generation.finished')activeStages.delete('generation:'+key);
   if(event.name==='engine.reload'){
    if(event.outcome==='started')activeStages.set('reload:'+key,{event,stage:'reload'});
    if(['success','failed'].includes(event.outcome))activeStages.delete('reload:'+key);
   }
   if(event.name==='startup.initialization'){
    if(event.outcome==='started')activeStages.set('initialization',{event,stage:'initialization'});
    if(['success','failed'].includes(event.outcome))activeStages.delete('initialization');
   }
   if(event.name==='shutdown.begin')activeStages.set('shutdown',{event,stage:'shutdown'});
   if(event.name==='shutdown.finish')activeStages.delete('shutdown');
  }
  const open=[...activeStages.values()];
  for(const stage of new Set(open.map(value=>value.stage))){
   if(stage==='generation')missing.push('generation.finished');
   if(stage==='reload')missing.push('engine.reload success or failed');
   if(stage==='initialization')missing.push('startup.initialization success or failed');
  }
  const lastOpenEvent=list.findLast(event=>open.some(value=>value.event===event));
  const lastOpenStage=lastOpenEvent?open.find(value=>value.event===lastOpenEvent).stage:null;
  const runtimeBoundary=list.findLast(event=>['request.queued','generation.started','generation.finished','engine.reload'].includes(event.name));
  // The runner knows it handed off to the provider, but only the provider knows
  // whether that call is still queued or waiting for a cached-engine reload.
  const waitingStage=['unavailable','timeout','canceled','stale'].includes(final?.outcome)&&['queue','reload'].includes(runtimeBoundary?.metadata?.stage)?runtimeBoundary.metadata.stage:null;
  if(!isPlan&&!isShutdown&&!startup&&!startupId&&!interrupted&&found('request.queued')&&!found('generation.finished')&&!found('request.error')&&!found('request.timeout')&&!found('request.aborted'))missing.push('generation.finished or request.error');
  const incomplete=missing.length>0||missingContext.length>0;
  const completed=list.findLast(e=>['passed','success','ready','valid','invalid','malformed-json','unsupported','failed','applied','unchanged','not-applied'].includes(e.outcome)||e.name==='plan.dequeued');
  const model=list.find(e=>e.metadata?.modelId)?.metadata.modelId||null;
  const elapsed=list.filter(e=>typeof e.metadata?.durationMs==='number').map(e=>e.metadata.durationMs);
  return {...(requestId?{requestId}:{}),...(startupId?{startupId}:{}),sessionId:first.sessionId,build:first.build,revision:first.revision,action:list.find(e=>e.metadata?.action)?.metadata.action||'other',modelId:model,runtimeVersion:list.find(e=>e.metadata?.runtimeVersion)?.metadata.runtimeVersion||null,firstRecordedAt:first.timestamp,lastRecordedAt:last.timestamp,lastEvent:last.name,lastStage:lastOpenStage||waitingStage||last.metadata?.stage||last.name,lastCompletedStage:completed?(completed.metadata?.stage||completed.name):null,outcome:last.outcome,status:incomplete?'incomplete':'complete',missingTerminalEvents:missing,missingContextEvents:missingContext,partialContext:missingContext.length>0,...(incomplete?{cause:'unknown'}:{}),observedDurationMs:Math.max(0,Date.parse(last.timestamp)-Date.parse(first.timestamp)),...(elapsed.length?{measuredDurationMs:Math.max(...elapsed)}:{}),...(application?{applied:application.metadata.applied===true}:{})};
 });
}
function availableDates(events){return {oldest:events.length?localDate(events[0].timestamp):null,newest:events.length?localDate(events.at(-1).timestamp):null};}
function exportDocument(all,meta,range,now){
 const retained=pruneEvents(all,meta,now),events=retained.events.filter(e=>e.timestamp>=range.startUtc&&e.timestamp<range.endExclusiveUtc);
 return {schemaVersion:1,exportedAt:iso(now),selectedDates:{from:range.from,through:range.through,inclusive:true},timezone:range.timezone,boundaries:{startUtc:range.startUtc,endExclusiveUtc:range.endExclusiveUtc,startOffsetMinutes:range.startOffsetMinutes,endOffsetMinutes:range.endOffsetMinutes},retention:{hours:HOURS,cutoffUtc:iso(now-RETENTION_MS),throughUtc:iso(now),maxEvents:MAX_EVENTS,maxEncodedBytes:MAX_BYTES,encodedBytes:retained.encodedBytes,capacityTrimmedEvents:retained.meta.capacityTrimmedEvents,...(retained.meta.lastCapacityTrimAt?{lastCapacityTrimAt:retained.meta.lastCapacityTrimAt,capacityTrimmedThrough:retained.meta.capacityTrimmedThrough}:{})},availableDateRange:availableDates(retained.events),retainedEventCount:retained.events.length,eventCount:events.length,attempts:attemptSummaries(events),events};
}
function create({enabled=false,build={},now=()=>Date.now(),storage,indexedDB}={}){
 const active=enabled&&build.channel==='dev',sessionId=id(),listeners=new Set();
 let sequence=0,storageFailed=false;
 let status=active?'Opening diagnostic storage…':'Diagnostics are off.',queue=Promise.resolve();
 let database=indexedDB;
 if(active&&!storage&&database===undefined)try{database=root.indexedDB;}catch{}
 const store=active?(storage||indexedStorage(database,build.channel)):null;
 const emit=()=>{for(const fn of listeners)try{fn({status});}catch{}};
 const setStatus=value=>{if(status!==value){status=value;emit();}};
 const failure=()=>{storageFailed=true;setStatus('Diagnostics storage unavailable. Gameplay and saves still work.');};
 function serial(work){const task=queue.catch(()=>{}).then(work).catch(()=>{failure();return null;});queue=task.then(()=>{});return task;}
 async function updateStore(transform){
  if(store.update)return store.update(transform);
  const previous=await store.read(),next=transform(previous);
  const oldIds=new Set(previous.events.map(e=>e.id));
  if(next.events.length!==previous.events.length||next.events.some(e=>!oldIds.has(e.id))||JSON.stringify(next.meta)!==JSON.stringify(previous.meta))await store.write(next,previous);
  return next;
 }
 async function readPruned(){
  let changed=false;
  const next=await updateStore(previous=>{
   const pruned=pruneEvents(previous.events||[],previous.meta||{},now());
   // getAll() has primary-key order. Sorting alone is not a storage mutation.
   changed=pruned.events.length!==(previous.events||[]).length||JSON.stringify(previous.meta||{})!==JSON.stringify(pruned.meta);
   return {events:pruned.events,meta:pruned.meta};
  });
  // A successful read does not prove a failed quota write has recovered.
  if(changed||!storageFailed){storageFailed=false;setStatus('Diagnostics storage ready.');}
  if(changed)emit();return next;
 }
 if(active)serial(readPruned);
 function record(name,outcome,metadata={}){
  try{
   if(!active||!names.has(name)||!outcomes.has(outcome))return Promise.resolve();
   const event={id:id(),timestamp:iso(now()),sessionId,sequence:++sequence,channel:build.channel,build:typeof build.version==='string'?build.version.slice(0,48):'unknown',revision:typeof build.commit==='string'?build.commit.slice(0,48):'unknown',name,outcome,context:technicalContext(),metadata:sanitizeMetadata(metadata)};
   const pending=serial(async()=>{
    await updateStore(previous=>{const next=pruneEvents([...(previous.events||[]),event],previous.meta||{},now());return {events:next.events,meta:next.meta};});storageFailed=false;setStatus('Diagnostics storage ready.');emit();
   });
   // Invalidate prepared UI files immediately, after assigning the write queue.
   emit();return pending;
  }catch{failure();return Promise.resolve();}
 }
 async function snapshot(selection={}){
  const result=active?await serial(readPruned):null;
  const events=result?.events||[],meta=result?.meta||{},available=availableDates(events),defaultDate=localDate(now());
  const from=selection.from===undefined?(available.oldest||defaultDate):selection.from,through=selection.through===undefined?(available.newest||defaultDate):selection.through;
  const range=dateRange(from,through),warnings=[];
  const base={retainedCount:events.length,availableDates:available,count:0,error:null,warnings,from,through,status,prepared:null};
  if(!result)return {...base,error:active?'Diagnostic storage is unavailable. Try reopening the app.':'Diagnostics are off.'};
  if(range.error)return {...base,error:range.error};
  const document=exportDocument(events,meta,range,now());
  if(Date.parse(range.startUtc)<now()-RETENTION_MS||Date.parse(range.endExclusiveUtc)>now())warnings.push('Part of the selected period is outside the retained window. Only available records are included.');
  if(meta.capacityTrimmedEvents)warnings.push(`${meta.capacityTrimmedEvents} older diagnostic events were removed to cap storage capacity.`);
  const filename=`master-plan-qwen-${build.channel}-${from}-to-${through}.json`;
  return {...base,count:document.eventCount,error:document.eventCount?null:'No diagnostic events match these dates.',prepared:document.eventCount?{filename,document,allEvents:events,meta,range}:null};
 }
 function deliver(prepared){
  try{
   if(!active||!prepared?.document||!prepared.range)return Promise.reject(new Error('No diagnostic file is ready.'));
   // Recheck expiration at the instant of the user gesture; IDB pruning runs in
   // the background. File share starts synchronously to retain iOS activation.
   const document=exportDocument(prepared.allEvents,prepared.meta,prepared.range,now());
   void serial(readPruned);
   if(!document.eventCount)return Promise.reject(new Error('No diagnostic events match these dates.'));
   const file=new root.File([JSON.stringify(document,null,2)+'\n'],prepared.filename,{type:'application/json'});
   function download(){
    const url=root.URL.createObjectURL(file),a=root.document.createElement('a');a.href=url;a.download=prepared.filename;root.document.body.append(a);a.click();a.remove();root.setTimeout(()=>root.URL.revokeObjectURL(url),30000);return {method:'downloaded'};
   }
   let shareable=false;
   try{shareable=!!root.navigator?.canShare?.({files:[file]})&&typeof root.navigator.share==='function';}catch{}
   if(shareable){
    try{return Promise.resolve(root.navigator.share({files:[file]})).then(()=>({method:'shared'}),error=>error?.name==='AbortError'?{method:'canceled'}:download());}catch{return Promise.resolve(download());}
   }
   return Promise.resolve(download());
  }catch{return Promise.reject(new Error('The diagnostic file could not be delivered.'));}
 }
 return {sessionId,id,record,error:safeError,snapshot,prepareExport:snapshot,deliver,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
}
const api={create,dateRange,pruneEvents,safeError};root.MP_DIAGNOSTICS=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
