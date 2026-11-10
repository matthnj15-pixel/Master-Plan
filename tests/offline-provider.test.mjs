import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/offline-ai.js',import.meta.url),'utf8');
const {createOfflineProvider}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('MP-065 Qwen adapter serializes plan and other inference calls and keeps pinned JSON mode',async()=>{
 let active=0,maximum=0,calls=0,release;
 const engine={chat:{completions:{create:async options=>{
  active++;maximum=Math.max(maximum,active);calls++;
  assert.equal(options.response_format.type,'json_object');assert.equal(JSON.parse(options.response_format.schema).type,'object');
  if(calls===1)await new Promise(r=>release=r);active--;
  return {choices:[{message:{content:JSON.stringify({call:calls})}}]};
 }}}};
 const ai=createOfflineProvider(engine,'Qwen-fixture');
 const a=ai.json('Plan'),b=ai.json('Headline');await new Promise(r=>setImmediate(r));assert.equal(calls,1);release();
 assert.deepEqual(await a,{call:1});assert.deepEqual(await b,{call:2});assert.equal(maximum,1);assert.equal(ai.modelId,'Qwen-fixture');
});

test('MP-065 Qwen shutdown waits for active inference and refuses queued and new requests',async()=>{
 let release,finished=false,unloads=0;
 const engine={chat:{completions:{create:async()=>{await new Promise(r=>release=r);finished=true;return {choices:[{message:{content:'{}'}}]};}}},unload:async()=>{assert.equal(finished,true);unloads++;}};
 const ai=createOfflineProvider(engine,'fixture');const active=ai.json('active');
 await new Promise(r=>setImmediate(r));const queued=ai.json('queued');const assertion=assert.rejects(queued,/turning off/);const off=ai.unload();
 await assert.rejects(ai.json('new'),/turning off/);assert.equal(unloads,0);release();await active;await assertion;await off;await ai.unload();assert.equal(unloads,1);
});

test('MP-065 malformed JSON releases Qwen queue for one repair request',async()=>{
 let count=0;const ai=createOfflineProvider({chat:{completions:{create:async()=>({choices:[{message:{content:++count===1?'malformed':'{"changes":{"scope":"patch"}}'}}]})}}},'fixture');
 await assert.rejects(ai.json('invalid'),SyntaxError);assert.deepEqual(await ai.json('repair'),{changes:{scope:'patch'}});
});
