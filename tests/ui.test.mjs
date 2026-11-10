// Touch UI tests in headless Chromium at the iPhone Duo inner display size (portrait).
// Test names start with the requirement IDs they verify (see docs/requirements.md).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const DUO = { width: 669, height: 951 };
const root = new URL('..', import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), 'mp-ui-'));
execFileSync('node', ['scripts/build.mjs', '--channel', 'stable', '--out', out], { cwd: root, stdio: 'pipe' });
const url = 'file://' + join(out, 'index.html');

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

async function open(viewport = DUO, contextOptions = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 3, ...contextOptions });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(url);
  await page.waitForSelector('#map');
  await page.waitForTimeout(150);
  const cdp = await ctx.newCDPSession(page);
  return { page, ctx, cdp, errors };
}
const mapState = (page) => page.$eval('#map', c => ({ zoom: +c.dataset.zoom, rot: +c.dataset.rot, panx: +c.dataset.panx, pany: +c.dataset.pany, view: c.dataset.view }));
async function mapCenter(page) { await page.locator('#map').scrollIntoViewIfNeeded(); const b = await page.$eval('#map', c => { const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); return b; }
async function touch(cdp, type, points) {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i + 1, radiusX: 2, radiusY: 2, force: 1 })) });
}
async function gesture(cdp, from, to, steps = 8) {
  await touch(cdp, 'touchStart', from);
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    await touch(cdp, 'touchMove', from.map((p, i) => ({ x: p.x + (to[i].x - p.x) * t, y: p.y + (to[i].y - p.y) * t })));
  }
  await touch(cdp, 'touchEnd', []);
}
async function tap(cdp, p) { await touch(cdp, 'touchStart', [p]); await touch(cdp, 'touchEnd', []); }

// Every visible control must be at least 44 x 44 CSS px (points).
async function smallTargets(page, scope = 'body') {
  return page.$$eval(`${scope} button, ${scope} [role="tab"], ${scope} textarea, ${scope} input, ${scope} select, ${scope} a[href]`, els => els
    .filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; })
    .map(e => { const r = e.getBoundingClientRect(); return { label: (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }; })
    .filter(t => t.w < 43.5 || t.h < 43.5));
}
// Every visible piece of text must be at least 12 points.
async function smallText(page) {
  return page.$$eval('body *', els => els
    .filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
    .filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[hidden]') && !e.closest('style,script,title'); })
    .map(e => ({ text: e.textContent.trim().slice(0, 30), size: parseFloat(getComputedStyle(e).fontSize) }))
    .filter(t => t.size < 12));
}
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

test('MP-059 the annual agenda leads the town and its persistent review and map routes work', async () => {
  for (const width of [669, 400]) {
    const { page, ctx, errors } = await open({ width, height: 951 });
    const order = await page.evaluate(() => {
      const top = s => document.querySelector(s).getBoundingClientRect().top;
      return { agenda: top('.panel'), meters: top('#meters'), map: top('.mapcard'), first: document.querySelector('#panel [data-open]').getBoundingClientRect().bottom, footer: top('.actionbar') };
    });
    assert.ok(order.agenda < order.meters && order.meters < order.map, 'reading and visual order lead with the agenda');
    assert.ok(order.first < order.footer, 'the first proposal is visible before scrolling past any map');
    assert.equal(await page.locator('#meters .meter').count(), 9);
    await page.click('#reviewBtn');
    assert.match(await page.textContent('#sheetRoot h2'), /Main Street bridge/);
    await page.click('#sheetRoot [data-act="close"]');
    await page.click('[data-act="showMap"]');
    const map = await page.locator('#map').boundingBox();
    const footerTop = await page.locator('.actionbar').evaluate(e => e.getBoundingClientRect().top);
    assert.ok(map.y >= 0 && map.y + map.height <= footerTop, 'View town brings the whole map above the action bar');
    assert.ok(await noSideScroll(page));
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('MP-059 proposal summaries update from engine votes and funding when plans change', async () => {
  const { page, ctx, errors } = await open();
  await page.click('[data-open="bridge"]'); await page.click('[data-approve="cash"]');
  await page.click('#endBtn'); await page.click('#sheetRoot [data-act="close"]');
  await page.click('[data-open="park"]');
  const cashBefore = await page.textContent('[data-summary="cash-after"]');
  await page.locator('.plan-details summary').click();
  await page.click('#sheetRoot [data-chip="1"]');
  assert.equal(await page.locator('.plan-details').getAttribute('open'), '', 'an open drawing stays open through negotiation');
  assert.ok(await page.locator('canvas.plan').evaluate(e => e.width === Math.round(e.clientWidth * devicePixelRatio)), 'negotiation redraws at the visible canvas width');
  const expected = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('millbrook.v1')), p = s.proposals.find(p => p.id === 'park');
    return { cash: s.cash - ENGINE.effectsOf(p).cost, votes: ENGINE.forecastVote(s, p, p.id).tally.park || 0 };
  });
  assert.notEqual(await page.textContent('[data-summary="cash-after"]'), cashBefore, 'negotiated cost changes the remaining cash');
  assert.equal(await page.textContent('[data-summary="cash-after"]'), `$${Math.round(expected.cash)}K`);
  assert.match(await page.textContent('[data-summary="votes"]'), new RegExp(`${expected.votes} of 5`));
  const beforePlan = await page.evaluate(() => !!(document.querySelector('.decision-summary').compareDocumentPosition(document.querySelector('canvas.plan')) & Node.DOCUMENT_POSITION_FOLLOWING));
  assert.ok(beforePlan, 'decision summary precedes the optional drawing');
  await page.click('#sheetRoot [data-hear]');
  await page.click('[data-champ="commerce"]');
  assert.equal(await page.locator('[data-fund="cash"]').isDisabled(), true);
  assert.match(await page.textContent('[data-summary="funding"]'), /not enough cash/i);
  await page.click('[data-fund="bond"]');
  assert.match(await page.textContent('[data-summary="funding"]'), /bond/i);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('MP-059 the Courier reconciles cash and bonds and retains all engine causes', async () => {
  for (const funding of ['cash', 'bond']) {
    const { page, ctx, errors } = await open({ width: 400, height: 951 });
    await page.evaluate(() => localStorage.setItem('millbrook.v1', JSON.stringify(ENGINE.newGame(68790))));
    await page.reload();
    await page.click('[data-open="bridge"]'); await page.click(`[data-approve="${funding}"]`);
    await page.click('#endBtn');
    const report = await page.evaluate(() => JSON.parse(localStorage.getItem('millbrook.v1')).reports.at(-1));
    assert.equal(await page.textContent('[data-ledger="opening"]'), '$900K');
    assert.equal(await page.textContent('[data-ledger="decisions"]'), funding === 'cash' ? '−$260K' : '$0K');
    const closing = `$${report.after.cash.toLocaleString('en-US')}K`;
    assert.equal(await page.textContent('[data-ledger="closing"]'), closing);
    if (funding === 'bond') assert.ok(report.after.cash > 1000 && report.after.cash % 10 !== 0, 'exercises an exact-to-K balance above $1M');
    assert.equal(await page.locator('#sheetRoot .cause').count(), report.causes.length, 'zero-valued events remain visible');
    assert.equal(await page.locator('.report-measures [data-meter]').count(), 9);
    await page.locator('#sheetRoot .pane').evaluate(e => e.scrollTop = e.scrollHeight);
    const actions = await page.locator('#sheetRoot .sh-actions').boundingBox();
    assert.ok(actions.y + actions.height >= 911, 'next year remains reachable');
    assert.ok(await noSideScroll(page));
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('MP-059 long authored proposal names fit inside the narrow council sheet', async () => {
  const { page, ctx, errors } = await open({ width: 400, height: 951 });
  const title = 'Neighborhood Recreation Center and Community Gardens';
  await page.evaluate(title => {
    const s = ENGINE.newGame(68790);
    ENGINE.makeInitiative(s, { title, plan: { green: 2, plaza: true }, place: 'oldmill' });
    localStorage.setItem('millbrook.v1', JSON.stringify(s));
  }, title);
  await page.reload();
  await page.click('#panel [data-open="init1"]'); await page.click('#sheetRoot [data-hear]');
  assert.ok((await page.textContent('.tally')).includes(title));
  const overflow = await page.$$eval('.pane,.member,.tally,.pane .seg', els => els
    .filter(e => e.scrollWidth > e.clientWidth + 1)
    .map(e => ({ kind: e.className, width: e.clientWidth, scrollWidth: e.scrollWidth })));
  assert.deepEqual(overflow, [], 'including inner sheet containers, not only the document');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('MP-059 missing opening history and year-end overruns are reconciled honestly', async () => {
  const { page, ctx, errors } = await open({ width: 400, height: 951 });
  await page.evaluate(() => {
    const seed = Array.from({ length: 100 }, (_, i) => i).find(seed => {
      const s = ENGINE.newGame(seed), p = s.proposals.find(p => p.id === 'bridge');
      return ENGINE.rand(seed, 'bridge:deliver') >= ENGINE.deliveryOdds(s, p);
    });
    const s = ENGINE.newGame(seed); s.history = [];
    localStorage.setItem('millbrook.v1', JSON.stringify(s));
  });
  await page.reload(); await page.click('#panel [data-open="bridge"]'); await page.click('[data-approve="cash"]');
  await page.click('#endBtn');
  const r = await page.evaluate(() => JSON.parse(localStorage.getItem('millbrook.v1')).reports.at(-1));
  assert.match(await page.textContent('[aria-label="Cash reconciliation"]'), /Before year-end resolution/);
  assert.equal(await page.locator('[data-ledger="decisions"]').count(), 0, 'no invented full-year spending without an opening snapshot');
  const other = Math.round(r.after.cash - r.before.cash - r.budget.net);
  assert.ok(other < 0, 'the chosen engine seed incurs an overrun');
  assert.equal(await page.textContent('[data-ledger="other"]'), `−$${Math.abs(other)}K`);
  assert.equal(await page.locator('#sheetRoot .cause').count(), r.causes.length);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('MP-058 the bundled font and readable light UI work offline with either OS theme', async () => {
  let lightBackground;
  const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number)
    .map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => { const [lo, hi] = [luminance(a), luminance(b)].sort((a, b) => a - b); return (hi + .05) / (lo + .05); };
  for (const colorScheme of ['light', 'dark']) {
    const { page, ctx, errors } = await open(DUO, { colorScheme });
    const styles = await page.evaluate(async () => {
      await document.fonts.ready;
      const body = getComputedStyle(document.body), button = getComputedStyle(document.querySelector('.actionbar .btn.primary'));
      return { font: [...document.fonts].some(f => f.family.includes('Host Grotesk') && f.status === 'loaded'),
        fg: body.color, bg: body.backgroundColor, buttonFg: button.color, buttonBg: button.backgroundColor };
    });
    assert.ok(styles.font, 'Host Grotesk loads while remote font services are blocked');
    assert.ok(contrast(styles.fg, styles.bg) >= 4.5, 'body text has AA contrast');
    assert.ok(contrast(styles.buttonFg, styles.buttonBg) >= 4.5, 'primary action text has AA contrast');
    if (colorScheme === 'light') lightBackground = styles.bg;
    else assert.equal(styles.bg, lightBackground, 'OS dark preference does not darken the approved UI');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('MP-054 the narrow proposal close control retains its full touch target', async () => {
  const { page, ctx, errors } = await open({ width: 400, height: 951 });
  await page.click('[data-open="bridge"]');
  const bounds = await page.locator('#sheetRoot [aria-label="Close"]').boundingBox();
  assert.ok(bounds.width >= 44 && bounds.height >= 44, `Close target is ${bounds.width} × ${bounds.height}`);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('MP-051 pinching the map zooms the map, not the page', async () => {
  const { page, ctx, cdp, errors } = await open();
  const c = await mapCenter(page);
  await gesture(cdp, [{ x: c.x - 40, y: c.y }, { x: c.x + 40, y: c.y }], [{ x: c.x - 100, y: c.y }, { x: c.x + 100, y: c.y }]);
  const s = await mapState(page);
  assert.ok(s.zoom > 2 && s.zoom <= 3, `zoom after pinch out: ${s.zoom}`);
  assert.equal(await page.evaluate(() => window.visualViewport.scale), 1, 'page did not zoom');
  await gesture(cdp, [{ x: c.x - 20, y: c.y }, { x: c.x + 20, y: c.y }], [{ x: c.x - 150, y: c.y }, { x: c.x + 150, y: c.y }]);
  assert.equal((await mapState(page)).zoom, 3, 'zoom is capped at 3x');
  const before = await mapState(page);
  await gesture(cdp, [{ x: c.x, y: c.y }], [{ x: c.x - 80, y: c.y - 40 }]);
  const panned = await mapState(page);
  assert.ok(panned.panx > before.panx && panned.pany > before.pany, 'one-finger drag pans');
  await gesture(cdp, [{ x: c.x - 150, y: c.y }, { x: c.x + 150, y: c.y }], [{ x: c.x - 10, y: c.y }, { x: c.x + 10, y: c.y }]);
  assert.equal((await mapState(page)).zoom, 1, 'pinch in stops at 1x');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('MP-056 double-tap, on-map buttons, and twist control the map', async () => {
  const { page, ctx, cdp, errors } = await open();
  const c = await mapCenter(page);
  await tap(cdp, c); await page.waitForTimeout(60); await tap(cdp, c);
  assert.ok((await mapState(page)).zoom > 1, 'double-tap zooms in');
  await page.click('[data-map="out"]'); await page.click('[data-map="out"]'); await page.click('[data-map="out"]');
  assert.equal((await mapState(page)).zoom, 1);
  await page.click('[data-map="in"]');
  assert.ok((await mapState(page)).zoom > 1, 'zoom in button');
  await page.click('[data-map="center"]');
  const centered = await mapState(page);
  assert.ok(centered.zoom > 1, 'recenter keeps zoom');
  const r0 = (await mapState(page)).rot;
  await page.click('[data-map="rotate"]');
  assert.equal((await mapState(page)).rot, (r0 + 1) % 4, 'rotate button');
  // Two-finger twist of about 90 degrees snaps one step.
  const r1 = (await mapState(page)).rot;
  const R = 70, pts = (deg) => { const a = deg * Math.PI / 180; return [{ x: c.x - R * Math.cos(a), y: c.y - R * Math.sin(a) }, { x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a) }]; };
  await touch(cdp, 'touchStart', pts(0));
  for (let d = 10; d <= 90; d += 10) await touch(cdp, 'touchMove', pts(d));
  await touch(cdp, 'touchEnd', []);
  const r2 = (await mapState(page)).rot;
  assert.notEqual(r2, r1, 'twist rotates');
  // Tapping a building shows its info.
  await page.click('[data-map="out"]'); await page.click('[data-map="out"]'); await page.click('[data-map="out"]');
  const info0 = await page.textContent('#mapinfo');
  await tap(cdp, c);
  await page.waitForTimeout(350);
  assert.notEqual(await page.textContent('#mapinfo'), info0, 'tap shows info');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('MP-054 controls are at least 44 points and text at least 12 points, on every screen', async () => {
  const { page, ctx, errors } = await open();
  const problems = [];
  const check = async (where) => {
    for (const t of await smallTargets(page)) problems.push(`${where}: control "${t.label}" is ${t.w}x${t.h}`);
    for (const t of await smallText(page)) problems.push(`${where}: text "${t.text}" is ${t.size}px`);
  };
  await check('main');
  await page.click('[data-tab="council"]'); await check('council tab');
  await page.click('[data-tab="budget"]'); await check('budget tab');
  await page.click('[data-tab="agenda"]');
  await page.click('[data-open="stripmall"]'); await check('proposal sheet');
  await page.click('#sheetRoot [data-hear]'); await check('council hearing');
  await page.click('#sheetRoot [data-lobby]'); await check('lobbying');
  await page.click('#sheetRoot [data-act="close"]');
  await page.click('[data-act="initiative"]'); await check('initiative sheet');
  await page.click('#sheetRoot [data-act="close"]');
  await page.click('#menuBtn'); await check('menu');
  await page.click('#sheetRoot [data-act="close"]');
  await page.click('#endBtn'); await check('year-end report');
  assert.deepEqual(problems, []);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('MP-055 the page scrolls as one stack with nothing underneath anything', async () => {
  const { page, ctx, errors } = await open();
  assert.ok(await noSideScroll(page), 'no sideways scrolling at 669 wide');
  const rows = await page.$$eval('.meter', ms => new Set(ms.map(m => Math.round(m.getBoundingClientRect().top))).size);
  assert.ok(rows <= 2, `meters use ${rows} rows`);
  const pos = await page.$$eval('header, .meters, .mapcard, .panel, .tabs', els => els.map(e => getComputedStyle(e).position));
  assert.ok(pos.every(p => p !== 'sticky' && p !== 'fixed'), `no pinned sections (${pos.join(', ')})`);
  const top0 = await page.$eval('.mapcard', m => m.getBoundingClientRect().top);
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(80);
  const top1 = await page.$eval('.mapcard', m => m.getBoundingClientRect().top);
  assert.ok(top1 < top0 - 100, 'the map scrolls with the page');
  // Whatever is visible above the bottom bar is the content itself, never something covering it.
  const covered = await page.evaluate(() => {
    const bar = document.querySelector('.actionbar').getBoundingClientRect().top;
    const bad = [];
    for (const el of document.querySelectorAll('.panel .item, .panel .box, .panel .sect')) {
      const r = el.getBoundingClientRect();
      const y = r.top + Math.min(r.height / 2, 12);
      if (y < 0 || y > bar - 2) continue;
      const hit = document.elementFromPoint(r.left + 8, y);
      if (hit && !el.contains(hit) && !hit.contains(el)) bad.push(el.textContent.trim().slice(0, 30));
    }
    return bad;
  });
  assert.deepEqual(covered, [], 'nothing covers the agenda');
  assert.equal(await page.$eval('#map', c => getComputedStyle(c).touchAction), 'pan-y', 'at 1x a swipe on the map scrolls the page');
  await page.click('[data-map="in"]');
  assert.equal(await page.$eval('#map', c => getComputedStyle(c).touchAction), 'none', 'zoomed in, the map takes the drag');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('MP-028 the hearing shows every member\'s statement on the plan', async () => {
  const { page, ctx, errors } = await open();
  await page.click('[data-open="stripmall"]');
  await page.click('#sheetRoot [data-hear]');
  const statements = await page.$$eval('#sheetRoot .statement', els => els.map(e => e.textContent.trim()));
  assert.equal(statements.length, 5);
  assert.ok(statements.every(t => t.length > 20));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('MP-053 no sideways scrolling at 400px wide', async () => {
  const { page, ctx, errors } = await open({ width: 400, height: 860 });
  assert.ok(await noSideScroll(page));
  await page.click('[data-open="stripmall"]');
  assert.ok(await noSideScroll(page), 'sheet fits too');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('MP-057 main actions sit within thumb reach', async () => {
  const { page, ctx, errors } = await open();
  const endBottom = await page.$eval('#endBtn', b => b.getBoundingClientRect().bottom);
  assert.ok(endBottom >= DUO.height - 90, `End year bottom at ${endBottom}`);
  for (const [openSel, name] of [['[data-open="stripmall"]', 'proposal'], ['[data-act="initiative"]', 'initiative']]) {
    await page.click(openSel);
    const b = await page.$eval('#sheetRoot .sh-actions', a => a.getBoundingClientRect());
    assert.ok(b.bottom >= DUO.height - 40 && b.top >= DUO.height * 0.6, `${name} sheet actions pinned to the bottom (top ${Math.round(b.top)})`);
    await page.click('#sheetRoot [data-act="close"]');
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('MP-033 tap any plots to select them, tap again to remove, Clear all to reset', async () => {
  const { page, ctx, cdp, errors } = await open();
  await page.click('[data-act="initiative"]');
  await page.click('#sheetRoot [data-act="pickPlots"]');
  const tile = async (x, y) => page.$eval('#map', (c, [x, y]) => {
    const r = c.getBoundingClientRect(), W = c.clientWidth, tw = W / 24, th = tw / 2;
    return { x: r.left + W / 2 + (x - y) * tw / 2, y: r.top + tw * 1.7 + (x + y + 1) * th / 2 };
  }, [x, y]);
  const count = () => page.$eval('#plotCount', e => +e.dataset.count);
  await tap(cdp, await tile(16, 13)); await page.waitForTimeout(350);
  await tap(cdp, await tile(4, 13)); await page.waitForTimeout(350);
  assert.equal(await count(), 2, 'two plots that do not touch');
  await tap(cdp, await tile(16, 13)); await page.waitForTimeout(350);
  assert.equal(await count(), 1, 'tapping again removes a plot');
  await tap(cdp, await tile(9, 11)); await page.waitForTimeout(350);
  assert.equal(await count(), 1, 'roads cannot be selected');
  await page.click('[data-act="clearPlots"]');
  assert.equal(await count(), 0, 'Clear all empties the selection');
  await tap(cdp, await tile(16, 13)); await page.waitForTimeout(350);
  await tap(cdp, await tile(17, 14)); await page.waitForTimeout(350);
  await page.click('[data-act="plotsDone"]');
  assert.match(await page.textContent('#sheetRoot'), /2 plots/);
  assert.deepEqual(errors, []);
  await ctx.close();
});
