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

const namedError = name => Object.assign(new Error('runtime-specific details'), { name });
const completion = content => ({ choices: [{ message: { content } }] });

test('MP-065 Qwen retries a grammar initialization error with its own plain JSON generation', async () => {
  const formats = [];
  const engine = { chat: { completions: { async create(options) {
    formats.push(options.response_format?.type || 'text');
    if (options.response_format) throw namedError('GrammarMatcherInitError');
    assert.match(options.messages[0].content, /valid JSON object only/);
    return completion('```json\n{"plan":{"homes":12}}\n```');
  } } } };
  const provider = createOfflineProvider(engine, 'Qwen-fixture');
  assert.deepEqual(await provider.json('Draft'), { plan: { homes: 12 } });
  assert.deepEqual(await provider.json('Revise'), { plan: { homes: 12 } });
  assert.deepEqual(formats, ['json_object', 'text', 'text']);
});

test('MP-065 Qwen recreates an unloaded engine from cache before retrying inference once', async () => {
  let reloads = 0;
  const unloaded = { chat: { completions: { async create() { throw namedError('ModelNotLoadedError'); } } } };
  const reloaded = { chat: { completions: { async create() { return completion('{"changes":{"green":2}}'); } } } };
  const provider = createOfflineProvider(unloaded, 'Qwen-fixture', async () => {
    reloads++;
    return reloaded;
  });
  assert.deepEqual(await provider.json('Revise'), { changes: { green: 2 } });
  assert.deepEqual(await provider.json('Revise again'), { changes: { green: 2 } });
  assert.equal(reloads, 1);

  const unavailable = createOfflineProvider(unloaded, 'Qwen-fixture', async () => unloaded);
  await assert.rejects(unavailable.json('Revise'), {
    code: 'offline-reload',
    diagnostic: { name: 'ModelNotLoadedError', stage: 'generation' },
  });
});

test('MP-065 a failed cached reload remains retryable', async () => {
  let reloads = 0;
  const unloaded = { chat: { completions: { async create() { throw namedError('ModelNotLoadedError'); } } } };
  const provider = createOfflineProvider(unloaded, 'Qwen-fixture', async () => {
    if (++reloads === 1) throw namedError('DeviceLostError');
    return { chat: { completions: { async create() { return completion('{}'); } } } };
  });
  await assert.rejects(provider.json('Draft'), {
    code: 'offline-reload',
    diagnostic: { name: 'DeviceLostError', stage: 'reload' },
  });
  assert.deepEqual(await provider.json('Retry'), {});
  assert.equal(reloads, 2);
});

test('MP-065 Qwen reports runtime and missing completion failures separately from malformed JSON', async () => {
  const error = new Error('runtime-specific details should stay in the cause');
  const engine = { chat: { completions: { async create({ messages }) {
    if (messages[0].content === 'runtime failure') throw error;
    return { choices: [] };
  } } } };
  const provider = createOfflineProvider(engine, 'Qwen-fixture');
  await assert.rejects(provider.json('runtime failure'), failure => {
    assert.equal(failure.code, 'offline-inference');
    assert.deepEqual(failure.diagnostic, { name: 'Error', stage: 'generation' });
    assert.equal(failure.cause, error);
    assert.doesNotMatch(failure.message, /runtime-specific details/);
    return true;
  });
  await assert.rejects(provider.json('missing completion'), {
    code: 'offline-inference',
    diagnostic: { name: 'MissingCompletion', stage: 'response' },
  });
});

test('MP-065 abort interrupts only running Qwen work and cannot start a recovery retry', async () => {
  let release, calls = 0, interrupts = 0, reloads = 0;
  const engine = { chat: { completions: { async create() {
    if (++calls === 1) {
      await new Promise(resolve => { release = resolve; });
      throw namedError('ModelNotLoadedError');
    }
    return completion('{}');
  } } }, interruptGenerate() { interrupts++; } };
  const provider = createOfflineProvider(engine, 'Qwen-fixture', async () => { reloads++; return engine; });
  const active = new AbortController();
  const queued = new AbortController();
  const running = assert.rejects(provider.json('Active', { signal: active.signal }), { name: 'AbortError' });
  const waiting = assert.rejects(provider.json('Queued', { signal: queued.signal }), { name: 'AbortError' });
  await new Promise(resolve => setImmediate(resolve));
  queued.abort();
  assert.equal(interrupts, 0);
  active.abort();
  assert.equal(interrupts, 1);
  release();
  await Promise.all([running, waiting]);
  assert.deepEqual(await provider.json('Next'), {});
  assert.equal(calls, 2);
  assert.equal(reloads, 0);
});
