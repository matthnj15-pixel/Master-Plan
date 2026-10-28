// Build output tests. Test names start with the requirement IDs they verify.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
function build(channel) {
  const out = mkdtempSync(join(tmpdir(), `mp-${channel}-`));
  execFileSync('node', ['scripts/build.mjs', '--channel', channel, '--out', out], { cwd: root, stdio: 'pipe' });
  return { artifact: readFileSync(join(out, 'master-plan.html'), 'utf8'), pages: readFileSync(join(out, 'index.html'), 'utf8') };
}
const buildInfo = (html) => JSON.parse(html.match(/var MP_BUILD=(\{.*?\});\n/)[1]);
const stable = build('stable'), dev = build('dev');

test('MP-061 dev and stable builds never share a save', () => {
  assert.equal(buildInfo(stable.artifact).channel, 'stable');
  assert.equal(buildInfo(dev.artifact).channel, 'dev');
  const ui = readFileSync(join(root, 'src/ui.js'), 'utf8');
  const m = ui.match(/const SAVE_KEY=DEV\?'([^']+)':'([^']+)',DB_DOC=DEV\?'([^']+)':'([^']+)'/);
  assert.ok(m, 'save key is chosen by channel');
  const [, devKey, stableKey, devDoc, stableDoc] = m;
  assert.notEqual(devKey, stableKey);
  assert.notEqual(devDoc, stableDoc);
});

test('MP-062 each channel gets its own flag values from flags.json', () => {
  const defs = JSON.parse(readFileSync(join(root, 'flags.json'), 'utf8')).flags;
  for (const [name, d] of Object.entries(defs)) {
    assert.equal(buildInfo(stable.artifact).flags[name], !!d.stable, `${name} on stable`);
    assert.equal(buildInfo(dev.artifact).flags[name], !!d.dev, `${name} on dev`);
  }
});

test('MP-063 built pages contain no API key or direct API access', () => {
  for (const html of [stable.artifact, stable.pages, dev.artifact, dev.pages]) {
    assert.ok(!/sk-ant-/i.test(html), 'no Anthropic key');
    assert.ok(!/x-api-key/i.test(html), 'no API key header');
    assert.ok(!/anthropic-dangerous-direct-browser-access/i.test(html), 'no direct browser API access');
    assert.ok(!/api\.anthropic\.com/i.test(html), 'no direct API calls');
  }
});
