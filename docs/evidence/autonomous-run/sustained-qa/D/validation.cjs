// Independent bounded R3 follow-up. Malformed fixtures are durability probes,
// isolated from the normal-play strategy contexts and never called play evidence.
const R = require('./runtime.cjs');
const {assert} = R;

(async () => {
  const app = await R.start(), started = Date.now(), results = [];
  try {
    for (const fixture of ['valid-control', 'economy-null', 'schedule-null-id']) {
      const {context, page} = await R.open(app, 400);
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      try {
        await R.seed(page);
        const observed = await page.evaluate(async fixture => {
          const key = 'masterplan.dev.save.v4';
          const envelope = JSON.parse(localStorage.getItem(key));
          if (fixture === 'economy-null') envelope.state.scenario.economy = null;
          if (fixture === 'schedule-null-id') envelope.state.scenario.proposals.schedule[2] = [null];
          const input = JSON.stringify(envelope);
          localStorage.setItem(key, input);
          const supported = ENGINE.isSupportedSave(envelope.state);
          const store = MP_WORKSPACE.create({engine: ENGINE});
          const load = await store.load();
          const bytesAfterLoadEqual = localStorage.getItem(key) === input;
          const command = {
            id: envelope.state.actionHighWater + 1, type: 'resolveYear',
            gameId: envelope.state.gameId, expectedRevision: envelope.state.revision,
            expectedGeneration: store.generation, payload: {}
          };
          const result = await store.commit(command);
          const bytesAfterCommandEqual = localStorage.getItem(key) === input;
          let admittedResolve = null;
          // Only probe the raw resolution if the public save fence admitted it.
          if (fixture !== 'valid-control' && supported && load.ok) {
            try {
              ENGINE.resolveYear(JSON.parse(JSON.stringify(envelope.state)));
              admittedResolve = {threw: false};
            } catch (error) {
              admittedResolve = {threw: true, name: error.name, message: error.message, stack: error.stack};
            }
          }
          return {
            supported, load: {ok: load.ok, mode: load.mode, code: load.code, reason: load.reason},
            command: {ok: result.ok, mode: result.mode, code: result.code, reasons: result.reasons},
            bytesAfterLoadEqual, bytesAfterCommandEqual, admittedResolve,
            storedYear: JSON.parse(localStorage.getItem(key)).state.year
          };
        }, fixture);
        const entry = {fixture, ...observed, errors};
        if (fixture === 'valid-control') {
          entry.status = observed.supported && observed.load.ok && observed.load.mode === 'ready' &&
            observed.command.ok && observed.bytesAfterLoadEqual && !observed.bytesAfterCommandEqual &&
            observed.storedYear === 2 && !errors.length ? 'pass' : 'fail';
        } else {
          entry.status = !observed.supported && !observed.load.ok && observed.load.mode === 'read-only' &&
            !observed.command.ok && observed.command.code === 'read_only' &&
            observed.bytesAfterLoadEqual && observed.bytesAfterCommandEqual && !errors.length ? 'pass' : 'fail';
        }
        results.push(entry);
        console.log(JSON.stringify({fixture, status: entry.status, supported: entry.supported,
          load: entry.load, command: entry.command, admittedResolve: entry.admittedResolve}));
      } finally {
        await context.close();
      }
    }
  } finally {
    await app.close();
  }
  const report = {sha: R.manifest.sha,
    evidenceType: 'independent malformed-save durability fixtures, separate from normal-play evidence; real browser storage and Web Locks',
    elapsedMs: Date.now() - started, results,
    passed: results.filter(r => r.status === 'pass').length, total: results.length,
    sourceVerification: R.verify()};
  R.write('validation/report.json', report);
  assert.equal(results.length, 3);
  if (report.passed !== report.total) process.exitCode = 1;
})().catch(error => {
  R.write('validation/fatal.json', {error: String(error), stack: error.stack});
  console.error(error);
  process.exitCode = 1;
});
