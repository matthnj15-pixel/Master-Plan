// Traceability check: requirements in docs/requirements.md <-> tests in tests/.
// Fails when an Accepted requirement verified by Test has no test, or a test names an unknown ID.
// Usage: node scripts/trace.mjs [--report]   (--report prints the full matrix)
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reqs = new Map();
for (const line of readFileSync(join(root, 'docs/requirements.md'), 'utf8').split('\n')) {
  const m = line.match(/^\|\s*(MP-\d{3})\s*\|(.*)\|\s*(Test|Play-test)\s*\|\s*(Proposed|Accepted|Planned|Retired)\s*\|\s*$/);
  if (m) {
    if (reqs.has(m[1])) throw new Error(`Duplicate requirement ID ${m[1]}`);
    reqs.set(m[1], { id: m[1], title: m[2].split('|')[0].trim(), verify: m[3], status: m[4], tests: [] });
  }
}
const unknown = [];
for (const f of readdirSync(join(root, 'tests')).filter(f => f.endsWith('.test.mjs'))) {
  const src = readFileSync(join(root, 'tests', f), 'utf8');
  for (const m of src.matchAll(/test\('((?:MP-\d{3}\s+)+)([^']*)'/g)) {
    for (const id of m[1].trim().split(/\s+/)) {
      if (reqs.has(id)) reqs.get(id).tests.push(`${f}: ${m[2]}`);
      else unknown.push(`${id} in ${f}: ${m[2]}`);
    }
  }
}
const missing = [...reqs.values()].filter(r => r.status === 'Accepted' && r.verify === 'Test' && !r.tests.length);
if (process.argv.includes('--report')) {
  for (const r of reqs.values()) console.log(`${r.id}  ${r.status.padEnd(8)} ${r.verify.padEnd(9)} ${r.tests.length ? r.tests.length + ' test(s)' : '-'}  ${r.title}`);
}
const accepted = [...reqs.values()].filter(r => r.status === 'Accepted');
console.log(`Traceability: ${reqs.size} requirements, ${accepted.length} accepted, ${accepted.filter(r => r.verify === 'Test').length} verified by tests, ${accepted.filter(r => r.verify === 'Play-test').length} by play-test.`);
if (missing.length || unknown.length) {
  for (const r of missing) console.error(`MISSING TEST: ${r.id} ${r.title}`);
  for (const u of unknown) console.error(`UNKNOWN ID: ${u}`);
  process.exit(1);
}
