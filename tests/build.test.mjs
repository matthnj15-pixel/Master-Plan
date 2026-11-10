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
  return {
    out,
    artifact: readFileSync(join(out, 'master-plan.html'), 'utf8'),
    pages: readFileSync(join(out, 'index.html'), 'utf8'),
  };
}
const buildInfo = (html) => JSON.parse(html.match(/var MP_BUILD=(\{.*?\});\n/)[1]);
const stable = build('stable'), dev = build('dev');

test('MP-075 diagnostics ship inside only the Dev Pages offline shell',()=>{
  const marker='master-plan-qwen-diagnostics:';
  assert.ok(dev.pages.includes(marker),'Dev Pages embeds the local diagnostics store in cached HTML');
  for(const page of [dev.artifact,stable.artifact,stable.pages])assert.equal(page.includes(marker),false,'Stable and Claude artifacts do not ship the diagnostics store');
  const worker=readFileSync(join(dev.out,'offline-worker.js'),'utf8');
  assert.ok(worker.includes('shell.href'),'normal worker caches the HTML carrying diagnostics');
});

test('MP-058 every Pages and artifact build carries the complete offline UI font', () => {
  const font = readFileSync(join(root, 'src/fonts/host-grotesk-latin.woff2'));
  const license = readFileSync(join(root, 'src/fonts/OFL.txt'), 'utf8').trim();
  assert.equal(font.subarray(0, 4).toString(), 'wOF2');
  for (const html of [stable.artifact, stable.pages, dev.artifact, dev.pages]) {
    const embedded = html.match(/url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/);
    assert.ok(embedded, 'font is available without a network request');
    assert.deepEqual(Buffer.from(embedded[1], 'base64'), font, 'font survives packaging intact');
    assert.doesNotMatch(html, /\/\*HOST_GROTESK\*\//);
    assert.ok(html.includes(license), 'copyright and full font license travel with the standalone HTML');
  }
  assert.match(license, /SIL OPEN FONT LICENSE/);
});

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

test('MP-061 the dev badge shows the version in progress', () => {
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(buildInfo(dev.artifact).version, version);
});

test('Pages builds include the showcase beside the game entry point', () => {
  for (const build of [stable, dev]) {
    const about = join(build.out, 'about');
    const html = readFileSync(join(about, 'index.html'), 'utf8');
    assert.match(html, /<title>Master Plan \| A Town Planning Game<\/title>/);
    assert.match(html, /href="\.\.\/"/);
    for (const asset of ['style.css', 'showcase.js', 'assets/mark.svg', 'assets/millbrook.webp']) {
      assert.ok(readFileSync(join(about, asset)).length, asset);
    }
    assert.doesNotMatch(build.artifact, /showcase\.js/);
  }
});
