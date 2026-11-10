import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../src/engine.js');
const R = require('../src/plan-renderer.js');
const {makePlanFixtures} = require('./fixtures/plans.cjs');
const render = (f, proposal, existing = false) => R.render({state:f.state, proposal, engine:E, existing});
const viewBox = html => html.match(/viewBox="([^"]+)"/)[1];
const plainText = html => html.replace(/<[^>]+>/g, '');
const plots = html => [...html.matchAll(/data-plot="([^"]+)"/g)].map(m => m[1]);

test('MP-022 MP-026 Old Mill alternatives and existing conditions use identical site geometry and viewport', () => {
  const f = makePlanFixtures(E), before = JSON.stringify(f.state);
  const park = render(f, f.park), commons = render(f, f.commerce), existing = render(f, f.park, true);
  assert.equal(park, render(f, f.park), 'drawing is deterministic');
  assert.equal(viewBox(park), viewBox(commons));
  assert.equal(viewBox(park), viewBox(existing));
  assert.deepEqual(plots(park), E.SITES.oldmill.map(p => p.join(',')));
  assert.deepEqual(plots(commons), plots(park));
  assert.deepEqual(plots(existing), plots(park));
  assert.match(park, /data-feature="memorial"/);
  assert.doesNotMatch(commons, /data-feature="memorial"/);
  assert.match(commons, /data-feature="storefront"/);
  assert.doesNotMatch(existing, /data-feature=/);
  assert.equal(JSON.stringify(f.state), before, 'view changes never write simulation state');
});

test('MP-033 MP-070 selected plots keep their true positions and the grid supplies every context cell', () => {
  const f = makePlanFixtures(E), html = render(f, f.mayoral);
  assert.deepEqual(plots(html), f.mayoral.plots.map(p => p.join(',')));
  for (const [x,y] of f.mayoral.plots) {
    assert.match(html, new RegExp(`data-plot="${x},${y}"[^>]+transform="translate\\(${x*50} ${y*50}\\)"`));
  }
  assert.doesNotMatch(html, /data-plot="17,13"/, 'unselected gap stays a gap');
  const context = [...html.matchAll(/data-context="(\d+),(\d+)" data-terrain="([^"]+)" data-road="([^"]+)" data-building="([^"]*)"/g)];
  assert.ok(context.length > f.mayoral.plots.length);
  for (const [, x, y, terrain, road, building] of context) {
    const cell = f.state.grid[Number(y)*E.N + Number(x)];
    assert.equal(terrain, cell.t);
    assert.equal(road, String(cell.road));
    assert.equal(building, cell.b?.type || '');
  }
});

test('MP-026 MP-031 accepted revisions change feature counts and engine cost together', () => {
  const f = makePlanFixtures(E), before = render(f, f.mayoral), after = render(f, f.revision);
  assert.notEqual(before, after);
  assert.match(plainText(before), /20 homes/);
  assert.match(plainText(after), /30 homes/);
  assert.match(plainText(before), /20 parking spaces/);
  assert.doesNotMatch(after, /data-feature="parking"/);
  assert.match(after, /data-feature="plaza"/);
  assert.match(before, new RegExp(`data-plan-cost="${E.effectsOf(f.mayoral).cost}"`));
  assert.match(after, new RegExp(`data-plan-cost="${E.effectsOf(f.revision).cost}"`));
  assert.notEqual(E.effectsOf(f.mayoral).cost, E.effectsOf(f.revision).cost);
  assert.match(after, /placement is illustrative/i);
});

test('MP-015 MP-032 unsupported kinds retain the old drawing and policy-only plans have no invented site', () => {
  const f = makePlanFixtures(E);
  assert.equal(render(f, {kind:'bridge', plan:{scope:'patch'}}), null);
  assert.match(render(f, f.policy), /No site/);
  assert.doesNotMatch(render(f, f.policy), /<svg/);
  const noExtras = structuredClone(f.park);
  Object.assign(noExtras.plan, {memorial:false, trees:1, playground:false, amphitheater:false, fountain:false, paths:false, parking:0});
  const html = render(f, noExtras);
  for (const absent of ['memorial','playground','amphitheater','fountain','path','parking']) {
    assert.doesNotMatch(html, new RegExp(`data-feature="${absent}"`));
  }
  noExtras.title = '<script>alert("no")</script>';
  assert.doesNotMatch(render(f, noExtras), /<script>/);
});

test('MP-015 MP-026 accepted landscaping and streetlights remain visible when every plot has a building role', () => {
  const state=E.newGame(2303);
  const proposal=E.makeInitiative(state,{title:'Homes over shops',plots:E.SITES.oldmill.slice(0,2),plan:{homes:20,shops:4,stories:2,green:2,safety:'streetlights'}});
  assert.deepEqual(E.initiativeRoles(proposal.plan,2),['mixed','homes']);
  const html=R.render({state,proposal,engine:E});
  assert.match(html,/data-feature="tree"/);
  assert.match(html,/data-feature="streetlights"/);
});

test('MP-053 MP-054 MP-055 isolated plan exhibits remain legible at 400 and 669px portrait widths', async () => {
  const {chromium} = await import('playwright');
  const browser = await chromium.launch();
  try {
    const f = makePlanFixtures(E);
    for(const width of [400,669]) {
      const page = await browser.newPage({viewport:{width,height:951},hasTouch:true,isMobile:true});
      const exhibits = [render(f,f.park),render(f,f.commerce),render(f,f.park,true),render(f,f.mayoral),render(f,f.revision),render(f,f.policy)];
      await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;font:14px system-ui}*{box-sizing:border-box}figure{margin:0 0 24px}.plan-exhibit-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px}.plan-legend,.plan-counts{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:12px}.plan-legend i{display:inline-block;width:10px;height:10px;margin-right:5px}.plan-caption{font-size:12px;line-height:1.5}.plan-illustration{border-radius:8px}</style>${exhibits.join('')}`);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), `${width}px does not scroll sideways`);
      for(const svg of await page.locator('svg.plan-illustration').all()) {
        const box = await svg.boundingBox();
        assert.ok(box.width>300 && box.width<=width, 'illustration uses available width');
        assert.ok(box.height>200, 'parcel context has room to read');
      }
      const [park,commons,existing] = await page.locator('svg.plan-illustration').all();
      assert.deepEqual(await park.boundingBox().then(({width,height})=>({width,height})), await commons.boundingBox().then(({width,height})=>({width,height})));
      assert.equal(await park.getAttribute('viewBox'), await existing.getAttribute('viewBox'));
      assert.equal(await page.locator('[data-plan-id="init2"] [data-plot="17,13"]').count(), 0);
      const spacing = await page.locator('[data-plan-id="init2"]').first().evaluate(el=>{
        const a=el.querySelector('[data-plot="16,13"]').getScreenCTM();
        const b=el.querySelector('[data-plot="18,13"]').getScreenCTM();
        return {distance:b.e-a.e,scale:a.a};
      });
      assert.ok(Math.abs(spacing.distance-100*spacing.scale)<.01, 'separated positions survive SVG layout');
      assert.ok(await page.locator('.plan-counts,.plan-caption,.plan-legend').evaluateAll(els=>els.every(el=>parseFloat(getComputedStyle(el).fontSize)>=12)));
      await page.close();
    }
  } finally {await browser.close();}
});
