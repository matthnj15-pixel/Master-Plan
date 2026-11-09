const MODELS = new Map([
  ['1.5B', 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'],
  ['3B', 'Qwen2.5-3B-Instruct-q4f16_1-MLC'],
]);
const RUNTIME_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/lib/index.js';
const RUNTIME_INTEGRITY = 'sha256-O/9MVc0vAgBxFRc0G6vOvnqRqO+FuYNCBDn88mg1pnQ=';
const RUNTIME_CACHE = 'master-plan-offline-ai-runtime';

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
  if (!download && !await runtime.hasModelInCache(modelId)) {
    throw new Error('The offline model is missing. Reconnect and download it again.');
  }

  const engine = await runtime.CreateMLCEngine(modelId, {
    initProgressCallback: ({ progress }) => onProgress(Math.round(progress * 100)),
  });
  if (download && !await runtime.hasModelInCache(modelId)) {
    await engine.unload();
    throw new Error('Safari could not keep the model in offline storage.');
  }
  return {
    offline: true,
    async json(prompt) {
      const result = await engine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 640,
      });
      return JSON.parse(result.choices[0].message.content);
    },
    unload: () => engine.unload(),
  };
}
