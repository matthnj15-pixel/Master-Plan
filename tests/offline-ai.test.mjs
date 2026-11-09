// Exercise the actual Pages build and service worker with a small model-runtime fixture.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';

const root = new URL('..', import.meta.url).pathname;
const runtimeURL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/lib/index.js';
const runtimeFixture = `
const key = '/dev/fixture-model';
export async function hasModelInCache(model) {
  const cache = await caches.open('fixture-model');
  return await (await cache.match(key))?.text() === model;
}
export async function CreateMLCEngine(model, options) {
  const cache = await caches.open('fixture-model');
  await cache.put(key, new Response(model));
  options.initProgressCallback({ progress: 1 });
  return {
    chat: { completions: { async create({ messages, response_format }) {
      if (response_format.type !== 'json_object') throw new Error('Expected JSON mode');
      const result = messages[0].content.includes("Mayor's description")
        ? { title: 'Old Mill Homes', place: 'oldmill', plan: { homes: 12 }, reply: 'Here is a plan for Old Mill.' }
        : { reply: 'I can add a rain garden.', changes: { green: 9999 }, mood: 'neutral' };
      return { choices: [{ message: { content: JSON.stringify(result) } }] };
    } } },
    async unload() {},
  };
}
`;

test('MP-065 opted-in dev Pages reopens offline and uses the saved model for freeform play', async () => {
  const out = mkdtempSync(join(tmpdir(), 'mp-offline-'));
  const server = createServer((request, response) => {
    const file = {
      '/dev/': ['index.html', 'text/html'],
      '/dev/offline-ai.js': ['offline-ai.js', 'text/javascript'],
      '/dev/offline-worker.js': ['offline-worker.js', 'text/javascript'],
    }[request.url];
    if (!file) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': file[1] }).end(readFileSync(join(out, file[0])));
  });
  let browser;
  try {
    execFileSync('node', ['scripts/build.mjs', '--channel', 'dev', '--out', out], { cwd: root, stdio: 'pipe' });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/dev/`;
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 669, height: 951 }, hasTouch: true, isMobile: true });
    await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'gpu', {
        value: { async requestAdapter() { return { features: new Set(['shader-f16']) }; } },
      });
    });
    let page = await context.newPage();
    await page.goto(url);
    assert.match(await page.textContent('#barnote'), /AI off/);
    assert.equal(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(r => r.length)), 0);
    await page.evaluate(async ({ url, source }) => {
      const cache = await caches.open('master-plan-offline-ai-runtime');
      await cache.put(url, new Response(source));
    }, { url: runtimeURL, source: runtimeFixture });

    await page.click('#menuBtn');
    await page.click('[data-offline-model="3B"]');
    await page.getByText('3B model ready for offline play.').waitFor({ timeout: 10000 });
    await page.close();
    await new Promise(resolve => server.close(resolve));
    await context.setOffline(true);

    page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(url);
    await page.getByText('Offline AI ready', { exact: false }).waitFor({ timeout: 10000 });
    await page.click('[data-act="initiative"]');
    await page.fill('#initDesc', 'Build apartments at the Old Mill lot.');
    await page.click('[data-form="init"] button[type="submit"], [data-form="init"] .btn.primary');
    await page.getByText('Here is a plan for Old Mill.').waitFor({ timeout: 5000 });
    await page.fill('#negInput', 'Please add a rain garden.');
    await page.locator('[data-form="neg"] button').click();
    await page.getByText('I can add a rain garden.').waitFor({ timeout: 5000 });
    assert.deepEqual(errors, []);
    const town = await page.evaluate(() => JSON.parse(localStorage.getItem('masterplan.dev.save')));
    const proposal = town.proposals.find(item => item.title === 'Old Mill Homes');
    assert.ok(proposal?.mine);
    assert.equal(proposal.plan.green, 3);
    await page.reload();
    await page.getByText('Offline AI ready', { exact: false }).waitFor({ timeout: 10000 });
    await page.getByRole('button', { name: /Old Mill Homes/ }).waitFor({ timeout: 5000 });
    assert.equal(await page.evaluate(() => localStorage.getItem('millbrook.v1')), null);
  } finally {
    await browser?.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    rmSync(out, { recursive: true, force: true });
  }
});
