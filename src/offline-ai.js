const MODELS = new Map([
  ['1.5B', 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'],
  ['3B', 'Qwen2.5-3B-Instruct-q4f16_1-MLC'],
]);
const RUNTIME_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/lib/index.js';
const RUNTIME_INTEGRITY = 'sha256-O/9MVc0vAgBxFRc0G6vOvnqRqO+FuYNCBDn88mg1pnQ=';
const RUNTIME_CACHE = 'master-plan-offline-ai-runtime';
// The pinned runtime passes this string directly to its WASM grammar compiler.
const JSON_OBJECT_SCHEMA = JSON.stringify({ type: 'object', additionalProperties: true });

async function cacheGame() {
  const registration = await navigator.serviceWorker.register('./offline-worker.js');
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) throw new Error('Could not start offline game storage.');
  await new Promise((resolve, reject) => {
    function check() {
      if (!['activated', 'redundant'].includes(worker.state)) return;
      worker.removeEventListener('statechange', check);
      if (worker.state === 'activated') resolve();
      else reject(new Error('Could not save the game files for offline play.'));
    }
    worker.addEventListener('statechange', check);
    check();
  });
}

async function loadRuntime(download) {
  const cache = await caches.open(RUNTIME_CACHE);
  let response = await cache.match(RUNTIME_URL);
  if (!response) {
    if (!download) throw new Error('The offline AI download is missing. Reconnect and download it again.');
    response = await fetch(RUNTIME_URL, { integrity: RUNTIME_INTEGRITY });
    if (!response.ok) throw new Error('Could not download the offline AI runtime.');
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

export async function startOfflineAI({ model, download, onProgress }) {
  const modelId = MODELS.get(model);
  if (!modelId) throw new Error('Unknown offline model. Choose a model from the game menu.');
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter?.features.has('shader-f16')) {
    throw new Error('Offline AI needs Safari WebGPU with 16-bit shader support.');
  }
  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    throw new Error('Offline storage is unavailable in this browser.');
  }
  if (download) void navigator.storage?.persist?.().catch(() => {});
  // A controlled offline launch must reuse the installed worker. Re-registering
  // it can ask the browser to fetch the worker script over a disconnected network.
  if (download || !navigator.serviceWorker.controller) await cacheGame();
  const runtime = await loadRuntime(download);
  async function requireCachedModel() {
    if (!await runtime.hasModelInCache(modelId)) {
      throw new Error('The offline model is missing. Reconnect and download it again.');
    }
  }
  if (!download) await requireCachedModel();

  const engine = await runtime.CreateMLCEngine(modelId, {
    initProgressCallback: ({ progress }) => onProgress(Math.round(progress * 100)),
  });
  if (download && !await runtime.hasModelInCache(modelId)) {
    await engine.unload();
    throw new Error('Safari could not keep the model in offline storage.');
  }
  return createOfflineProvider(engine, modelId, async () => {
    await requireCachedModel();
    return runtime.CreateMLCEngine(modelId, { initProgressCallback() {} });
  });
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
export function createOfflineProvider(engine, modelId, reloadCachedEngine) {
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
    const content = structured ? prompt : prompt + '\n\nReply with one valid JSON object only. Do not wrap it in Markdown.';
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
    json(prompt, { signal } = {}) {
      if (closing) return Promise.reject(turningOff());
      return enqueue(async () => {
        let reloaded = false;
        for (;;) {
          if (closing) throw turningOff();
          signal?.throwIfAborted();
          if (needsReload && reloadCachedEngine) {
            try {
              engine = await reloadCachedEngine();
              needsReload = false;
              reloaded = true;
            } catch (error) {
              signal?.throwIfAborted();
              throw providerFailure('offline-reload', 'reload', error);
            }
            signal?.throwIfAborted();
            if (closing) throw turningOff();
          }
          let result;
          try {
            result = await generate(prompt, signal);
          } catch (error) {
            signal?.throwIfAborted();
            if (structured && error?.name === 'GrammarMatcherInitError') {
              // Only the decoding constraint failed. Ask the same model for JSON text.
              structured = false;
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
          const content = result?.choices?.[0]?.message?.content;
          if (typeof content !== 'string') throw providerFailure('offline-inference', 'response');
          const fence = structured ? null : /^```(?:json)?\s+([\s\S]*?)\s*```$/i.exec(content.trim());
          return JSON.parse(fence ? fence[1] : content);
        }
      });
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
