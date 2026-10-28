// Simulation tests. Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../src/engine.js');

const play = (s, n) => { for (let i = 0; i < n && s.phase === 'agenda'; i++) E.resolveYear(s); return s; };

test('a new game starts in 2027 with the expected town', () => {
  const s = E.newGame(1234);
  assert.equal(s.year, 1);
  assert.equal(s.pop, 3200);
  assert.equal(s.cash, 900);
  assert.deepEqual(Object.keys(s.meters).sort(), ['afford', 'approval', 'conf', 'live', 'safety', 'walk']);
  assert.deepEqual(s.proposals.map(p => p.id), ['bridge', 'stripmall']);
});

test('the same seed plays out the same way', () => {
  const a = play(E.newGame(77), 4), b = play(E.newGame(77), 4);
  assert.deepEqual(a.history, b.history);
});

test('the Old Mill fight deadlocks until the mayor lobbies', () => {
  const s = E.newGame(1234);
  E.resolveYear(s);
  const park = s.proposals.find(p => p.id === 'park');
  assert.ok(park, 'park proposal appears in year 2');
  const before = E.forecastVote(s, park, 'park');
  assert.equal(before.winner, null, 'no plan has 3 votes by default');
  E.applyLobby(s, 'pryor', 'park', { addressed: ['cost', 'prop'], tone: 'respectful', offers: [{ type: 'favor' }] });
  assert.equal(E.forecastVote(s, park, 'park').winner, 'park', 'a good pitch plus a favor swings Ellen Pryor');
});

test('AI-proposed plan changes are clamped to allowed values', () => {
  const { plan, applied } = E.validatePlan('stripmall', { stores: 8, parking: 160, landscaping: false, sidewalk: false },
    { parking: 9999, stores: 'lots', sidewalk: true, madeUpField: 1 });
  assert.equal(plan.parking, 200);
  assert.equal(plan.stores, 8);
  assert.equal(plan.sidewalk, true);
  assert.ok(!('madeUpField' in plan));
  assert.deepEqual(Object.keys(applied).sort(), ['parking', 'sidewalk']);
});

test('four years end in an election', () => {
  const s = play(E.newGame(5), 4);
  assert.equal(s.phase, 'election');
  const r = E.electionResult(s, 'quality', 1);
  assert.ok(r.share >= 20 && r.share <= 80);
  assert.equal(r.won, r.share >= 50);
});

test('a mayor initiative is priced by the engine and goes to council', () => {
  const s = E.newGame(42);
  const draft = E.heuristicDraft('A farmers market with string lights and rain gardens');
  const p = E.makeInitiative(s, { ...draft, site: 'school_lot' });
  assert.equal(p.site, 'school_lot');
  assert.equal(p.council, true);
  assert.equal(s.initiativeYear, s.year);
  const e = E.effectsOf(p);
  assert.ok(e.cost > 0 && e.safety > 0 && e.storm === 1);
  assert.ok(E.grantInfo(s, p), 'stormwater work is grant-eligible');
});

test('ordinances need no site', () => {
  const s = E.newGame(42);
  const p = E.makeInitiative(s, { title: 'Community policing', plan: { policy: 'community_policing' } });
  assert.equal(p.site, 'none');
  assert.ok(E.effectsOf(p).safety > 0);
});

test('a grant application tables the item and resolves at year end', () => {
  const s = E.newGame(9);
  const bridge = s.proposals.find(p => p.id === 'bridge');
  const g = E.applyGrant(s, bridge);
  assert.equal(g.share, 0.8);
  assert.equal(bridge.status, 'tabled');
  E.resolveYear(s);
  const again = s.proposals.find(p => p.id === 'bridge');
  assert.equal(again.status, 'open');
  assert.ok(again.grant === 0.8 || again.grantDenied === true);
});

test('version 1 saves migrate to version 2', () => {
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

test('feature flags come from the build, and default to off', async () => {
  const { readFileSync } = await import('node:fs');
  const vm = await import('node:vm');
  const src = readFileSync(new URL('../src/engine.js', import.meta.url), 'utf8');
  const on = { MP_BUILD: { flags: { devTools: true } }, module: { exports: {} } };
  vm.runInNewContext(src, on);
  assert.equal(on.module.exports.FLAGS.devTools, true);
  assert.deepEqual(E.FLAGS, {});
});
