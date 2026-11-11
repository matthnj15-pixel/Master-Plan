// Independent closed-code export smoke. Memory storage is explicitly a fixture;
// engine/runner provenance and browser IndexedDB are covered by QA/Reviewer E.
const fs = require('node:fs'), assert = require('node:assert/strict');
const D = require('./source/src/qwen-diagnostics.js');
const manifest = require('./target-manifest.json');
let stored = {events: [], meta: {}};
const storage = {async read() {return structuredClone(stored);}, async write(next) {stored = structuredClone(next);}};

(async () => {
  const diagnostics = D.create({enabled: true, build: {channel: 'dev', version: 'independent-E', commit: manifest.sha}, storage});
  const cases = ['claim_history_unresolved', 'claim_history_unresolved:PRIVATE_SUFFIX', 'PRIVATE_ARBITRARY_CODE'];
  const ids = [];
  for (const resultCode of cases) {
    const requestId = diagnostics.id(); ids.push(requestId);
    await diagnostics.record('composition.validation', 'valid', {requestId, task: 'claims', stage: 'validation', resultCode,
      reason: 'PRIVATE_REASON_MUST_NOT_EXPORT', argument: 'PRIVATE_ARGUMENT_MUST_NOT_EXPORT', town: 'PRIVATE_TOWN_MUST_NOT_EXPORT'});
  }
  const snapshot = await diagnostics.prepareExport(), doc = snapshot.prepared.document;
  const results = ids.map((requestId, i) => {
    const event = doc.events.find(e => e.metadata.requestId === requestId);
    const retained = Object.hasOwn(event.metadata, 'resultCode');
    return {inputClass: i === 0 ? 'exact fixed reason' : i === 1 ? 'reason with arbitrary suffix' : 'arbitrary code',
      eventPresent: !!event, codeRetained: retained, exportedCode: event.metadata.resultCode || null,
      status: i === 0 ? retained && event.metadata.resultCode === 'claim_history_unresolved' ? 'pass' : 'fail' : !retained ? 'pass' : 'fail'};
  });
  const privateTextExcluded = !/PRIVATE_SUFFIX|PRIVATE_ARBITRARY_CODE|PRIVATE_REASON|PRIVATE_ARGUMENT|PRIVATE_TOWN/.test(JSON.stringify(doc));
  assert(privateTextExcluded); assert(results.every(r => r.status === 'pass'));
  const report = {sha: manifest.sha, evidenceType: 'independent CPU diagnostic-export smoke using actual frozen E diagnostics with explicit in-memory storage fixture; no model/browser/engine claim',
    passed: results.filter(r => r.status === 'pass').length, total: results.length, results, privateTextExcluded};
  fs.writeFileSync('/workspace/qa-sustained/E/diagnostic-delta.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
})().catch(error => {console.error(error); process.exitCode = 1;});
