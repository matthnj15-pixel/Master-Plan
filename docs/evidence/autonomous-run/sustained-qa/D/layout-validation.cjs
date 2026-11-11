// Bounded persisted-geometry follow-up. Run only with an exact frozen target.
// Malformed fixtures are isolated from normal play and change no product files.
const R = require('./runtime.cjs');
const {assert} = R;

(async () => {
  const app = await R.start(), started = Date.now(), results = [];
  try {
    for (const field of ['valid-control', 'label', 'role', 'componentId', 'sharedWith']) {
      const {context, page} = await R.open(app, 400), entry = {field, errors: []};
      page.on('pageerror', error => entry.errors.push(String(error)));
      try {
        await R.seed(page);
        const payload = await page.evaluate(() => {
          const s = __sustainedStore.state, cell = s.grid.find(c => ENGINE.canBuildOn(s, c.x, c.y) && !c.b && !c.site && c.t === 'grass');
          return {plots: [[cell.x, cell.y]], acknowledgedScope: false, program: {
            version: 2, title: 'Independent geometry control', intent: 'A small green space under ordinary town rules.',
            components: [{id: 'green', capability: 'green', label: 'Green space', quantity: .5, area: .5, sharedWith: null}],
            conditions: {hours: 10, deliveries: 'daytime', access: true, buffer: 0, preserve: 0, affordable: false}, assumptions: [], omissions: []
          }};
        });
        const post = await R.command(page, 'postProgram', payload);
        assert(post.ok, JSON.stringify(post));
        const observed = await page.evaluate(async ({field, proposalId}) => {
          const key = 'masterplan.dev.save.v4', env = JSON.parse(localStorage.getItem(key));
          const proposal = env.state.proposals.find(p => p.id === proposalId);
          if (field !== 'valid-control') proposal.layout.allocations[0][field] = {toString: null, valueOf: null};
          const original = JSON.stringify(env);
          localStorage.setItem(key, original);
          const supported = ENGINE.isSupportedSave(env.state), store = MP_WORKSPACE.create({engine: ENGINE});
          const load = await store.load();
          const bytesAfterLoadEqual = localStorage.getItem(key) === original;
          let renderer = null;
          if (load.ok) {
            try { const html = PLAN_RENDERER.render({state: env.state, proposal, engine: ENGINE}); renderer = {threw: false, htmlLength: html.length}; }
            catch (error) { renderer = {threw: true, name: error.name, message: error.message, stack: error.stack}; }
          }
          const result = await store.commit({id: env.state.actionHighWater + 1, type: 'resolveYear', gameId: env.state.gameId,
            expectedRevision: env.state.revision, expectedGeneration: store.generation, payload: {}});
          return {supported, load: {ok: load.ok, mode: load.mode, code: load.code}, renderer,
            bytesAfterLoadEqual, bytesAfterCommandEqual: localStorage.getItem(key) === original,
            command: {ok: result.ok, mode: result.mode, code: result.code}};
        }, {field, proposalId: post.receipt.proposalId});
        Object.assign(entry, observed);
        entry.status = field === 'valid-control'
          ? observed.supported && observed.load.ok && observed.renderer?.threw === false && observed.renderer.htmlLength > 0 && observed.command.ok ? 'pass' : 'fail'
          : !observed.supported && !observed.load.ok && observed.load.mode === 'read-only' && !observed.command.ok && observed.command.code === 'read_only' && observed.bytesAfterLoadEqual && observed.bytesAfterCommandEqual ? 'pass' : 'fail';
        if (entry.errors.length) entry.status = 'fail';
      } catch (error) {entry.status = 'fail'; entry.error = String(error); entry.stack = error.stack;}
      finally {await context.close();}
      results.push(entry);
      console.log(JSON.stringify(entry));
    }
  } finally {await app.close();}
  const report = {sha: R.manifest.sha, evidenceType: 'independent malformed persisted-allocation scalar probes with real browser storage and Web Locks; positive normal posted-plan control',
    elapsedMs: Date.now() - started, results, passed: results.filter(r => r.status === 'pass').length, total: results.length, sourceVerification: R.verify()};
  R.write('layout-validation/report.json', report);
  if (report.passed !== 5) process.exitCode = 1;
})().catch(error => {R.write('layout-validation/fatal.json', {error: String(error), stack: error.stack}); console.error(error); process.exitCode = 1;});
