// Simulation tests. Every test name starts with the requirement IDs it verifies (see docs/requirements.md).
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const E = require('../src/engine.js');

const play = (s, n) => { for (let i = 0; i < n && s.phase === 'agenda'; i++) E.resolveYear(s); return s; };
const clone = (o) => JSON.parse(JSON.stringify(o));
const fakeBuilt = (kind, plan, extra = {}) => ({ id: 'x' + Math.random(), kind, plan: { ...E.defaultPlan(kind), ...plan }, presenter: 'planner', site: 'none', title: 'Test project', ...extra });

// ---------- Game structure ----------
test('MP-001 each turn is one year and a career lasts 32 turns', () => {
  const s = E.newGame(1);
  assert.equal(s.year, 1);
  assert.equal(s.maxYears, 32);
  E.resolveYear(s);
  assert.equal(s.year, 2);
});

test('MP-002 four years end in an election that 50% wins', () => {
  const s = play(E.newGame(5), 4);
  assert.equal(s.phase, 'election');
  for (const theme of Object.keys(E.THEMES)) {
    const r = E.electionResult(s, theme, 0);
    assert.ok(r.share >= 20 && r.share <= 80);
    assert.equal(r.won, r.share >= 50);
  }
});

test('MP-004 two straight years in deficit ends the career', () => {
  const s = E.newGame(2);
  s.cash = -5000;
  E.resolveYear(s);
  assert.equal(s.phase, 'agenda', 'one deficit year is a warning');
  E.resolveYear(s);
  assert.equal(s.phase, 'bankrupt');
});

test('MP-006 the town starts as a small Pennsylvania borough', () => {
  const s = E.newGame(1234);
  assert.equal(s.pop, 3200);
  assert.equal(s.cash, 900);
  const types = new Set(s.grid.map(c => c.b && c.b.type));
  for (const t of ['college', 'shop', 'civic', 'house']) assert.ok(types.has(t), `has ${t}`);
  assert.ok(s.grid.some(c => c.t === 'water') && s.grid.some(c => c.t === 'farm'));
  assert.deepEqual(s.proposals.map(p => p.id), ['bridge', 'stripmall']);
});

// ---------- Simulation and causality ----------
test('MP-010 every meter change has a visible cause', () => {
  const s = E.newGame(31);
  E.approve(s, s.proposals.find(p => p.id === 'stripmall'), 'cash');
  for (let y = 0; y < 4 && s.phase === 'agenda'; y++) {
    const before = { ...s.meters };
    const r = E.resolveYear(s);
    for (const k of ['walk', 'live', 'conf', 'approval', 'safety', 'afford']) {
      if (Math.abs(s.meters[k] - before[k]) > 0.001) assert.ok(r.causes.some(c => c.m === k), `year ${r.year}: ${k} changed with no cause`);
    }
  }
});

test('MP-011 the same seed plays out the same way', () => {
  assert.deepEqual(play(E.newGame(77), 4).history, play(E.newGame(77), 4).history);
});

test('MP-012 consequences follow real-world logic', () => {
  const s = E.newGame(1);
  const strip = E.effectsOf(s.proposals.find(p => p.id === 'stripmall'));
  assert.ok(strip.walk < 0 && strip.jobs > 0 && strip.units > 0);
  const park = E.effectsOf({ kind: 'park', plan: E.defaultPlan('park'), presenter: 'planner', site: 'oldmill' });
  assert.ok(park.live > 0 && park.prop > 0);
});

test('MP-013 a subsidized luxury store usually closes in a small town', () => {
  let closed = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = E.newGame(seed);
    E.approve(s, { id: 'boutique', ...E.P_DEFS.boutique, plan: E.defaultPlan('boutique'), status: 'open' }, 'cash');
    E.resolveYear(s); E.resolveYear(s);
    if (s.flags.boutique && s.flags.boutique.closed) {
      closed++;
      const r = s.reports.filter(x => x.after).slice(-1)[0];
      assert.ok(r.causes.some(c => c.m === 'conf' && c.v < 0 && /closed/.test(c.r)));
    }
  }
  assert.ok(closed >= 14, `closed in ${closed} of 20 towns`);
});

test('MP-014 housing grows on its own where demand exists', () => {
  const s = E.newGame(8);
  s.pop = 3500; // more people than homes
  const homes = () => s.grid.filter(c => c.b && c.b.type === 'house').length;
  const before = homes();
  E.resolveYear(s);
  assert.ok(homes() > before);
});

test('MP-015 MP-031 AI-proposed plan changes are clamped to allowed values', () => {
  const { plan, applied } = E.validatePlan('stripmall', { stores: 8, parking: 160, landscaping: false, sidewalk: false },
    { parking: 9999, stores: 'lots', sidewalk: true, madeUpField: 1 });
  assert.equal(plan.parking, 200);
  assert.equal(plan.stores, 8);
  assert.equal(plan.sidewalk, true);
  assert.ok(!('madeUpField' in plan));
  assert.deepEqual(Object.keys(applied).sort(), ['parking', 'sidewalk']);
});

// ---------- Proposals, presenters, council ----------
test('MP-020 relationship and competency change delivery odds', () => {
  const s = E.newGame(1);
  const strip = s.proposals.find(p => p.id === 'stripmall');
  const base = E.deliveryOdds(s, strip);
  s.presenters.keystone.rel += 30;
  assert.ok(E.deliveryOdds(s, strip) > base);
  const mk = (presenter) => ({ kind: 'commerce', plan: E.defaultPlan('commerce'), presenter, site: 'oldmill' });
  assert.ok(E.deliveryOdds(s, mk('keystone')) > E.deliveryOdds(s, mk('merchants')));
});

test('MP-021 thin plans carry a wider cost range', () => {
  const mk = (presenter) => E.effectsOf({ kind: 'commerce', plan: E.defaultPlan('commerce'), presenter, site: 'none' });
  const thin = mk('merchants'), solid = mk('planner');
  assert.ok(thin.costHigh / thin.cost > solid.costHigh / solid.cost);
});

test('MP-022 approving one plan for a site rejects the competing plan', () => {
  const s = E.newGame(1234);
  E.resolveYear(s);
  const park = s.proposals.find(p => p.id === 'park');
  E.approve(s, park, 'bond');
  assert.equal(s.proposals.find(p => p.id === 'commerce').status, 'rejected');
});

test('MP-023 MP-024 the Old Mill fight deadlocks until the mayor lobbies', () => {
  const s = E.newGame(1234);
  E.resolveYear(s);
  const park = s.proposals.find(p => p.id === 'park');
  const before = E.forecastVote(s, park, 'park');
  assert.ok(Object.values(before.tally).every(n => n < 3) || before.tally.no >= 3);
  assert.equal(before.winner, null, 'no plan has 3 votes by default');
  E.applyLobby(s, 'pryor', 'park', { addressed: ['cost', 'prop'], tone: 'respectful', offers: [{ type: 'favor' }] });
  const after = E.forecastVote(s, park, 'park');
  assert.equal(after.winner, 'park');
  assert.ok(after.tally.park >= 3);
});

test('MP-025 lobbying is capped and priced by the engine', () => {
  const s = E.newGame(1);
  const all = Object.keys(E.COUNCIL.find(m => m.id === 'okafor').pri);
  const r = E.applyLobby(s, 'okafor', 'x', { addressed: all.concat(['made_up']), tone: 'respectful' });
  assert.ok(r.points <= 6, 'argument credit is capped');
  const cap = s.capital;
  E.applyLobby(s, 'okafor', 'x', { addressed: [], tone: 'respectful', offers: [{ type: 'favor' }] });
  assert.equal(s.capital, cap - 1, 'favors cost political capital');
  const rel = s.council.weaver.rel;
  const h = E.applyLobby(s, 'weaver', 'x', { addressed: [], tone: 'hostile' });
  assert.ok(h.points < 0 && s.council.weaver.rel < rel);
});

test('MP-027 the rival leans against whatever the mayor backs', () => {
  const s = E.newGame(1);
  const marsh = E.COUNCIL.find(m => m.rival);
  assert.equal(marsh.name, 'Greg Marsh');
  const strip = s.proposals.find(p => p.id === 'stripmall');
  assert.ok(E.memberScore(s, marsh, strip, strip.id) < E.memberScore(s, marsh, strip, null));
});

// ---------- Your own initiatives ----------
test('MP-030 one mayor initiative per year', () => {
  const s = E.newGame(42);
  assert.ok(E.makeInitiative(s, { title: 'Streetlights', plan: { safety: 'streetlights' } }));
  assert.equal(E.makeInitiative(s, { title: 'Another', plan: { green: 1 } }), null);
  E.resolveYear(s);
  assert.ok(E.makeInitiative(s, { title: 'Next year', plan: { green: 1 } }));
});

test('MP-031 a described idea becomes an engine-priced plan that goes to council', () => {
  const s = E.newGame(42);
  const draft = E.heuristicDraft('A farmers market with string lights and rain gardens');
  const p = E.makeInitiative(s, { ...draft, site: 'school_lot' });
  assert.equal(p.site, 'school_lot');
  assert.equal(p.council, true);
  const e = E.effectsOf(p);
  assert.ok(e.cost > 0 && e.safety > 0 && e.storm === 1);
});

test('MP-032 ordinances need no site', () => {
  const s = E.newGame(42);
  const p = E.makeInitiative(s, { title: 'Community policing', plan: { policy: 'community_policing' } });
  assert.equal(p.site, 'none');
  assert.ok(E.effectsOf(p).safety > 0);
});

// ---------- Meters and systems ----------
test('MP-040 the town has exactly nine meters', () => {
  const snap = E.snapshotStats(E.newGame(1));
  const { year, ...meters } = snap;
  assert.deepEqual(Object.keys(meters).sort(), ['afford', 'approval', 'cash', 'conf', 'jobs', 'live', 'pop', 'safety', 'walk']);
});

test('MP-041 safer towns approve of their mayor more', () => {
  const a = E.newGame(11), b = clone(a);
  a.meters.safety = 40; b.meters.safety = 80;
  E.resolveYear(a); E.resolveYear(b);
  assert.ok(b.meters.approval > a.meters.approval);
});

test('MP-042 parking raises flood risk and stormwater work lowers it', () => {
  const base = E.newGame(3);
  const paved = clone(base); paved.built.push(fakeBuilt('initiative', { parking: 300 }));
  const green = clone(base); green.built.push(fakeBuilt('initiative', { stormwater: true }));
  const r0 = E.floodRisk(base).risk;
  assert.ok(E.floodRisk(paved).risk > r0);
  assert.ok(E.floodRisk(green).risk < r0);
});

test('MP-043 grants table the item and resolve at year end', () => {
  const s = E.newGame(9);
  const bridge = s.proposals.find(p => p.id === 'bridge');
  const g = E.applyGrant(s, bridge);
  assert.ok(g.share >= 0.5 && g.share <= 0.8);
  assert.equal(bridge.status, 'tabled');
  E.resolveYear(s);
  const again = s.proposals.find(p => p.id === 'bridge');
  assert.equal(again.status, 'open');
  assert.ok(again.grant === g.share || again.grantDenied === true);
  if (again.grant) assert.ok(E.effectsOf(again).cost < E.effectsOf({ ...again, grant: 0 }).cost);
});

test('MP-044 housing shortages hurt affordability and new homes help', () => {
  const short = E.newGame(4); short.pop = 6000;
  const before = short.meters.afford;
  E.resolveYear(short);
  assert.ok(short.meters.afford < before);
  const a = E.newGame(4), b = clone(a);
  b.built.push(fakeBuilt('initiative', { homes: 120, affordable: true }));
  E.resolveYear(a); E.resolveYear(b);
  assert.ok(b.meters.afford > a.meters.afford);
});

// ---------- Saves, channels, security ----------
test('MP-060 older saves migrate and keep playing', () => {
  const s = E.newGame(3);
  s.v = 1; delete s.meters.safety; delete s.meters.afford; delete s.policies;
  for (const c of s.grid) if (c.site && E.PARCELS[c.site]?.tiles) c.site = null;
  for (const h of s.history) { delete h.safety; delete h.afford; }
  const m = E.migrate(s);
  assert.equal(m.v, 2);
  assert.equal(m.meters.safety, 62);
  assert.ok(E.parcelsAvailable(m).length >= 4);
  E.resolveYear(m);
});

test('MP-062 feature flags come from the build and default to off', () => {
  const src = readFileSync(new URL('../src/engine.js', import.meta.url), 'utf8');
  const ctx = { MP_BUILD: { flags: { devTools: true } }, module: { exports: {} } };
  vm.runInNewContext(src, ctx);
  assert.equal(ctx.module.exports.FLAGS.devTools, true);
  assert.deepEqual(E.FLAGS, {});
});
