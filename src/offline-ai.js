const MODELS = new Map([
  ['1.5B', 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'],
  ['3B', 'Qwen2.5-3B-Instruct-q4f16_1-MLC'],
]);
const RUNTIME_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/lib/index.js';
const RUNTIME_INTEGRITY = 'sha256-O/9MVc0vAgBxFRc0G6vOvnqRqO+FuYNCBDn88mg1pnQ=';
const RUNTIME_CACHE = 'master-plan-offline-ai-runtime';
// The pinned runtime passes this string directly to its WASM grammar compiler.
const JSON_OBJECT_SCHEMA = JSON.stringify({ type: 'object', additionalProperties: true });
const startupFailure = (code, message) => Object.assign(new Error(message), {code});
const clock = () => globalThis.performance?.now?.() ?? Date.now();
// Never let observational storage participate in inference or startup control flow.
function record(diagnostics, name, outcome, metadata) {
  try { void Promise.resolve(diagnostics?.record(name, outcome, metadata)).catch(() => {}); } catch {}
}
function safeError(diagnostics, error, stage) {
  try { return diagnostics?.error(error, stage); } catch {}
}

async function cacheGame() {
  const registration = await navigator.serviceWorker.register('./offline-worker.js');
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) throw startupFailure('shell-cache', 'Could not start offline game storage.');
  await new Promise((resolve, reject) => {
    function check() {
      if (!['activated', 'redundant'].includes(worker.state)) return;
      worker.removeEventListener('statechange', check);
      if (worker.state === 'activated') resolve();
      else reject(startupFailure('shell-cache', 'Could not save the game files for offline play.'));
    }
    worker.addEventListener('statechange', check);
    check();
  });
}

async function loadRuntime(download, check) {
  const cache = await caches.open(RUNTIME_CACHE);
  let response = await cache.match(RUNTIME_URL);
  check('runtime-cache', !!response);
  if (!response) {
    if (!download) throw startupFailure('runtime-missing', 'The offline AI download is missing. Reconnect and download it again.');
    response = await fetch(RUNTIME_URL, { integrity: RUNTIME_INTEGRITY });
    if (!response.ok) throw startupFailure('runtime-download', 'Could not download the offline AI runtime.');
    await cache.put(RUNTIME_URL, response.clone());
  }
  // The pinned WebLLM distribution is a self-contained ES module. Loading the
  // cached bytes here keeps its startup independent of the HTTP browser cache.
  const moduleURL = URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: 'text/javascript' }));
  try {
    return await import(moduleURL);
  } finally {
    URL.revokeObjectURL(moduleURL);
  }
}

export async function startOfflineAI({ model, download, onProgress, diagnostics = globalThis.MP_QWEN_DIAGNOSTICS, startupId, attempt = 1 }) {
  const modelId = MODELS.get(model);
  const started = clock();
  let stage = 'startup';
  const log = (name, outcome, extra = {}) => record(diagnostics, name, outcome, {
    startupId,attempt,modelId,runtimeVersion:'0.2.87',download,stage,durationMs:clock()-started,...extra,
  });
  const check = (boundary, cached) => { stage = boundary; log('startup.check', 'observed', {cached}); };
  try {
    if (!modelId) throw startupFailure('unknown-model', 'Unknown offline model. Choose a model from the game menu.');
    stage = 'webgpu';
    const adapter = await navigator.gpu?.requestAdapter();
    log('startup.check', adapter ? 'passed' : 'failed', {webgpu:!!adapter});
    stage = 'shader-f16';
    log('startup.check', adapter?.features.has('shader-f16') ? 'passed' : 'failed', {shaderF16:!!adapter?.features.has('shader-f16')});
    if (!adapter?.features.has('shader-f16')) {
      throw startupFailure('webgpu-unavailable', 'Offline AI needs Safari WebGPU with 16-bit shader support.');
    }
    stage = 'shell-cache';
    if (!('serviceWorker' in navigator) || !('caches' in window)) {
      throw startupFailure('offline-storage', 'Offline storage is unavailable in this browser.');
    }
    if (download) void navigator.storage?.persist?.().catch(() => {});
    // A controlled offline launch must reuse the installed worker. Re-registering
    // it can ask the browser to fetch the worker script over a disconnected network.
    if (download || !navigator.serviceWorker.controller) await cacheGame();
    // Observe the actual shell cache separately from service-worker control.
    try { log('startup.check', 'observed', {cached:!!await caches.match(new URL('./', globalThis.location.href).href)}); }
    catch (error) { log('startup.check', 'failed', {error:safeError(diagnostics,error,stage)}); }
    stage = 'runtime-cache';
    const runtime = await loadRuntime(download,check);
    async function requireCachedModel(observeStartup = true) {
      const cached = await runtime.hasModelInCache(modelId);
      if (observeStartup) check('model-cache',cached);
      if (!cached) {
        throw startupFailure('model-missing', 'The offline model is missing. Reconnect and download it again.');
      }
    }
    if (!download) await requireCachedModel();

    stage = 'initialization';
    const initializing = clock();
    log('startup.initialization', 'started');
    let engine;
    try {
      engine = await runtime.CreateMLCEngine(modelId, {
        initProgressCallback: ({ progress }) => onProgress(Math.round(progress * 100)),
      });
      log('startup.initialization', 'success', {durationMs:clock()-initializing});
    } catch (error) {
      log('startup.initialization', 'failed', {durationMs:clock()-initializing,error:safeError(diagnostics,error,stage)});
      throw error;
    }
    if (download) {
      const cached = await runtime.hasModelInCache(modelId);
      check('model-cache',cached);
      if (!cached) {
        await engine.unload();
        throw startupFailure('model-cache-write', 'Safari could not keep the model in offline storage.');
      }
    }
    return createOfflineProvider(engine, modelId, async () => {
      // Recovery belongs to the current inference request, not the old startup.
      await requireCachedModel(false);
      return runtime.CreateMLCEngine(modelId, { initProgressCallback() {} });
    }, diagnostics);
  } catch (error) {
    log('startup.check', 'failed', {error:safeError(diagnostics,error,stage)});
    try { error.offlineStage = stage; } catch {}
    throw error;
  }
}

const PLAIN_JSON_SUFFIX = '\n\nReply with one valid JSON object only. Do not wrap it in Markdown.';

/* Version adapter for the integrity-pinned 0.2.87 bundle. MLCEngine exposes no
 * public config/tokenizer getter. These TS-private maps and pipeline members
 * are deliberately guarded here, never inferred from HF limits or GPU bytes.
 * An incompatible runtime fails composition admission explicitly, while legacy
 * json callers remain usable. No mutation of the live conversation/KV cache.
 */
function loadedAdmission(engine, modelId, prompt, structured, runtimeVersion) {
  const unavailable = { ok:false, code:'runtime_metadata_unavailable' };
  try {
    if (runtimeVersion !== '0.2.87' || ![...MODELS.values()].includes(modelId) || typeof prompt !== 'string') return unavailable;
    const pipeline = engine.loadedModelIdToPipeline?.get(modelId);
    const config = engine.loadedModelIdToChatConfig?.get(modelId);
    if (!pipeline || !config || pipeline.config !== config || pipeline.artifact !== undefined ||
        pipeline.slidingWindowSize !== -1 || config.sliding_window_size !== -1 ||
        !Number.isSafeInteger(pipeline.contextWindowSize) || pipeline.contextWindowSize <= 0 ||
        pipeline.contextWindowSize !== config.context_window_size || typeof pipeline.tokenizer?.encode !== 'function' ||
        !config.conv_template || typeof pipeline.getConversationObject !== 'function') return unavailable;
    const live = pipeline.getConversationObject();
    if (!live || typeof live.constructor !== 'function' || live.constructor === Object) return unavailable;
    const template = JSON.parse(JSON.stringify({ ...config.conv_template, ...config.conv_config }));
    const conversation = new live.constructor(template);
    if (conversation === live || !Array.isArray(conversation.messages) || conversation.messages.length ||
        typeof conversation.appendMessage !== 'function' || typeof conversation.appendReplyHeader !== 'function' ||
        typeof conversation.getPromptArray !== 'function') return unavailable;
    // json() sends one user message, so WebLLM always starts a fresh conversation.
    conversation.appendMessage('user', structured ? prompt : prompt + PLAIN_JSON_SUFFIX);
    conversation.appendReplyHeader('assistant');
    const segments = conversation.getPromptArray(config), prefix = template.system_prefix_token_ids ?? [];
    if (!Array.isArray(segments) || segments.some(segment => typeof segment !== 'string') ||
        !Array.isArray(prefix) || prefix.some(id => !Number.isSafeInteger(id) || id < 0)) return unavailable;
    let promptTokens = prefix.length;
    // WebLLM tokenizes each segment separately. Concatenation changes BPE edges.
    for (const segment of segments) {
      const ids = pipeline.tokenizer.encode(segment);
      if ((!Array.isArray(ids) && !ArrayBuffer.isView(ids)) || !Number.isSafeInteger(ids.length) ||
          ids.length < 0 || (segment.length && !ids.length)) return unavailable;
      promptTokens += ids.length;
    }
    if (!Number.isSafeInteger(promptTokens)) return unavailable;
    return { ok:promptTokens+640 <= pipeline.contextWindowSize, code:promptTokens+640 <= pipeline.contextWindowSize ? 'none' : 'context_limit',
      promptTokens, contextWindowTokens:pipeline.contextWindowSize, maxOutputTokens:640, temperature:0.2,
      modelId, runtimeVersion, adapter:'webllm-0.2.87-loaded-pipeline' };
  } catch { return unavailable; }
}

function admissionFailure(code) {
  return Object.assign(new Error(code === 'context_limit'
    ? 'The complete request and reserved reply exceed the loaded model context.'
    : code === 'output_limit' ? 'The reply reached the configured generation limit.'
    : 'Exact context admission is unavailable for this runtime.'), { code,
      diagnostic:{name:code==='context_limit'?'ContextWindowSizeExceededError':code==='output_limit'?'OutputLimitError':'RuntimeMetadataUnavailable',stage:code==='output_limit'?'response':'admission'} });
}

function providerFailure(code, stage, cause) {
  const errorName = cause?.name;
  const name = stage === 'response' ? 'MissingCompletion'
    : typeof errorName === 'string' && /^[A-Za-z][A-Za-z0-9]{0,47}$/.test(errorName) ? errorName : 'Error';
  const message = code === 'offline-reload' && stage === 'generation' && name === 'DeviceLostError'
    ? 'Qwen lost its graphics session. Reopen the game to reload the saved model.'
    : code === 'offline-reload'
    ? 'Qwen lost its loaded model. Try again to reload the saved model, or reopen the game.'
    : stage === 'response' ? 'Qwen did not return a completion. Try sending your request again.'
    : 'Qwen could not finish generating a reply. Try sending your request again.';
  return Object.assign(new Error(message, { cause }), { code, diagnostic: { name, stage } });
}

// Every caller (plans, lobbying, headlines, and shutdown) shares this queue.
// A caller timing out cannot start another GPU request while the first one is
// still running; unload also waits for that request to settle.
export function createOfflineProvider(engine, modelId, reloadCachedEngine, diagnostics = globalThis.MP_QWEN_DIAGNOSTICS, {runtimeVersion='0.2.87'} = {}) {
  let tail = Promise.resolve(), closing = false, unloading;
  let structured = true, needsReload = false;
  const turningOff = () => Object.assign(new Error('Offline AI is turning off.'), { code: 'unavailable' });
  const enqueue = operation => {
    const task = tail.catch(() => {}).then(operation);
    tail = task.catch(() => {});
    return task;
  };

  async function generate(prompt, signal) {
    signal?.throwIfAborted();
    const content = structured ? prompt : prompt + PLAIN_JSON_SUFFIX;
    const interrupt = () => {
      try { void Promise.resolve(engine.interruptGenerate?.()).catch(() => {}); } catch {}
    };
    signal?.addEventListener('abort', interrupt, { once: true });
    try {
      const result = await engine.chat.completions.create({
        messages: [{ role: 'user', content }],
        ...(structured ? { response_format: { type: 'json_object', schema: JSON_OBJECT_SCHEMA } } : {}),
        temperature: 0.2,
        max_tokens: 640,
      });
      signal?.throwIfAborted();
      return result;
    } finally {
      signal?.removeEventListener('abort', interrupt);
    }
  }

  return {
    offline: true,
    modelId,
    runtimeVersion,
    // This CPU preflight uses the same queue as generation/reload/shutdown.
    // json(requireAdmission) repeats it after reload and grammar fallback.
    admit(prompt, {signal,requestId,action='other',attempt=1,isCurrent} = {}) {
      return enqueue(async () => {
        if (closing) throw turningOff();
        signal?.throwIfAborted();
        if (isCurrent && !isCurrent()) throw Object.assign(new Error('Stale request'),{code:'stale'});
        if (engine.loadedModelIdToPipeline?.has(modelId) === false) needsReload = true;
        if (needsReload && reloadCachedEngine) {
          const started=clock();
          record(diagnostics,'engine.reload','started',{requestId,action,attempt,stage:'reload',modelId,runtimeVersion});
          try {
            engine=await reloadCachedEngine();needsReload=false;
            record(diagnostics,'engine.reload','success',{requestId,action,attempt,stage:'reload',modelId,runtimeVersion,durationMs:clock()-started});
          } catch(error) {
            record(diagnostics,'engine.reload','failed',{requestId,action,attempt,stage:'reload',modelId,runtimeVersion,durationMs:clock()-started,error:safeError(diagnostics,error,'reload')});
            signal?.throwIfAborted();throw providerFailure('offline-reload','reload',error);
          }
        }
        signal?.throwIfAborted();
        if (closing) throw turningOff();
        if (isCurrent && !isCurrent()) throw Object.assign(new Error('Stale request'),{code:'stale'});
        return loadedAdmission(engine,modelId,prompt,structured,runtimeVersion);
      });
    },
    json(prompt, { signal, requestId, action = 'other', attempt = 1, requireAdmission = false, isCurrent } = {}) {
      try { requestId ||= diagnostics?.id(); } catch {}
      const queued = clock();
      let queueWaitMs = 0, generationAttempt = 0, stage = 'queue';
      const log = (name,outcome,extra={}) => record(diagnostics,name,outcome,{
        requestId,action,attempt,generationAttempt,stage,modelId,runtimeVersion:'0.2.87',queueWaitMs,...extra,
      });
      log('request.queued','queued');
      const aborted = () => log(signal.reason?.code === 'timeout' ? 'request.timeout' : 'request.aborted',
        signal.reason?.code === 'timeout' ? 'timeout' : 'canceled', {durationMs:clock()-queued,error:safeError(diagnostics,signal.reason,stage)});
      signal?.addEventListener('abort',aborted,{once:true});
      if (closing) {
        signal?.removeEventListener('abort',aborted);
        log('request.error','unavailable',{error:safeError(diagnostics,turningOff(),stage)});
        return Promise.reject(turningOff());
      }
      return enqueue(async () => {
        queueWaitMs = clock()-queued;
        let reloaded = false;
        for (;;) {
          if (closing) throw turningOff();
          signal?.throwIfAborted();
          if (isCurrent && !isCurrent()) throw Object.assign(new Error('Stale request'),{code:'stale'});
          if (requireAdmission && engine.loadedModelIdToPipeline?.has(modelId) === false) needsReload = true;
          if (needsReload && reloadCachedEngine) {
            stage = 'reload';
            const reloadStart = clock();
            log('engine.reload','started');
            try {
              engine = await reloadCachedEngine();
              needsReload = false;
              reloaded = true;
              log('engine.reload','success',{durationMs:clock()-reloadStart});
            } catch (error) {
              log('engine.reload','failed',{durationMs:clock()-reloadStart,error:safeError(diagnostics,error,'reload')});
              signal?.throwIfAborted();
              throw providerFailure('offline-reload', 'reload', error);
            }
            signal?.throwIfAborted();
            if (closing) throw turningOff();
          }
          if (isCurrent && !isCurrent()) throw Object.assign(new Error('Stale request'),{code:'stale'});
          if (requireAdmission) {
            stage='admission';
            const admission=loadedAdmission(engine,modelId,prompt,structured,runtimeVersion);
            log('request.admission',admission.ok?'passed':'failed',{resultCode:admission.code,promptTokens:admission.promptTokens,contextWindowTokens:admission.contextWindowTokens,maxOutputTokens:640});
            if(!admission.ok)throw admissionFailure(admission.code);
          }
          let result;
          stage = 'generation';
          generationAttempt++;
          const generationStart = clock();
          log('generation.started','started');
          try {
            result = await generate(prompt, signal);
            log('generation.finished','success', {inferenceMs:clock()-generationStart,durationMs:clock()-queued,
              promptTokens:result?.usage?.prompt_tokens,completionTokens:result?.usage?.completion_tokens,
              totalTokens:result?.usage?.total_tokens,finishReason:result?.choices?.[0]?.finish_reason});
          } catch (error) {
            log('generation.finished',signal?.aborted ? 'canceled' : 'failed',{inferenceMs:clock()-generationStart,durationMs:clock()-queued,error:safeError(diagnostics,error,'generation')});
            signal?.throwIfAborted();
            if (structured && error?.name === 'GrammarMatcherInitError') {
              // Only the decoding constraint failed. Ask the same model for JSON text.
              structured = false;
              log('grammar.fallback','started',{error:safeError(diagnostics,error,'generation')});
              continue;
            }
            if (error?.name === 'ModelNotLoadedError') {
              // WebLLM reports this after its loaded-model map has been cleared.
              needsReload = true;
              if (!reloaded && reloadCachedEngine) continue;
            }
            const code = needsReload || error?.name === 'DeviceLostError' ? 'offline-reload' : 'offline-inference';
            throw providerFailure(code, 'generation', error);
          }
          stage = 'response';
          if (requireAdmission && result?.choices?.[0]?.finish_reason === 'length') throw admissionFailure('output_limit');
          const content = result?.choices?.[0]?.message?.content;
          if (typeof content !== 'string') throw providerFailure('offline-inference', 'response');
          const fence = structured ? null : /^```(?:json)?\s+([\s\S]*?)\s*```$/i.exec(content.trim());
          return JSON.parse(fence ? fence[1] : content);
        }
      }).catch(error => {
        log('request.error', signal?.aborted ? 'canceled' : error instanceof SyntaxError ? 'malformed-json' : 'failed',
          {durationMs:clock()-queued,error:safeError(diagnostics,error,stage)});
        throw error;
      }).finally(() => signal?.removeEventListener('abort',aborted));
    },
    unload() {
      if (!unloading) {
        closing = true;
        unloading = enqueue(() => engine.unload());
      }
      return unloading;
    },
  };
}
