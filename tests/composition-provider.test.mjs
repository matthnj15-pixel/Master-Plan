import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

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
