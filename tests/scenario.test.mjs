import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reconstruction} from './fixtures/reconstruction.mjs';
const E=createRequire(import.meta.url)('../src/engine.js');
const clone=o=>JSON.parse(JSON.stringify(o));
const parity=JSON.parse(readFileSync(new URL('./fixtures/millbrooke-parity.json',import.meta.url),'utf8'));
// Captured with the unchanged engine at parity.base. Ignore schema metadata and only the approved town spelling.
function comparable(s){s=clone(s);for(const k of ['v','town','scenarioId','scenario','calendar'])delete s[k];if(s.facts&&Object.keys(s.facts).length===0)delete s.facts;return JSON.stringify(s).replace(/Millbrooke?/g,'Millbrooke');}
function replay(actions){const s=E.newGame(parity.seed);for(let i=1;i<=4;i++){if(actions){if(i===1)E.approve(s,s.proposals.find(p=>p.id==='bridge'),'cash');if(i===2){E.applyGrant(s,s.proposals.find(p=>p.id==='park'));E.reject(s,s.proposals.find(p=>p.id==='commerce'));}if(i===3)E.approve(s,s.proposals.find(p=>p.id==='studenthousing'),'bond');if(i===4)E.approve(s,s.proposals.find(p=>p.id==='subdivision'),'bond');}E.resolveYear(s);}return s;}

test('MP-006 MP-010 MP-011 MP-074 Millbrooke preserves baseline first-term states with and without decisions',()=>{
  for(const [actions,key] of [[false,'noActions'],[true,'actions']]){
    const s=replay(actions);
    assert.equal(createHash('sha256').update(comparable(s)).digest('hex'),parity[key],`${key} matches base ${parity.base}`);
  }
  const s=E.newGame(2027);
  assert.equal(s.scenarioId,'millbrooke');assert.equal(E.scenarioMeta(s).displayName,'Scenario 01 · Millbrooke');assert.equal(s.town,'Millbrooke');
  assert.equal(E.calendarYear(s),2027);assert.equal(s.year,1);assert.equal(s.maxYears,32);
  E.resolveYear(s);assert.equal(E.calendarYear(s),2028);assert.equal(s.year,2);
});

test('MP-074 another map, date and authority resolve utility repair before housing through the same engine',()=>{
  const input=clone(reconstruction),s=E.newGame(2027,input);
  assert.deepEqual(input,reconstruction,'initialization does not mutate scenario input');
  assert.equal(s.scenarioId,reconstruction.id);assert.equal(E.calendarYear(s),1946);assert.deepEqual(E.mapSize(s),{width:5,height:4});assert.equal(s.grid.length,20);
  const repair=s.proposals.find(p=>p.id==='repair'),housing=s.proposals.find(p=>p.id==='housing');
  assert.equal(E.proposalEligibility(s,housing).ok,false);
  assert.equal(E.proposalEligibility(s,{...housing,requires:{}}).ok,false,'drafts cannot remove engine prerequisites');
  const before=clone(s);
  assert.equal(E.approve(s,null,'cash','recovery-authority').ok,false);assert.deepEqual(s,before);
  assert.equal(E.approve(s,{...repair,plan:null},'cash','recovery-authority').ok,false);assert.deepEqual(s,before);
  assert.equal(E.approve(s,housing,'cash','recovery-authority').ok,false);assert.deepEqual(s,before,'blocked approval mutates nothing');
  assert.equal(E.approve(s,repair,'cash','mayor').ok,false);assert.deepEqual(s,before,'wrong authority mutates nothing');
  assert.equal(E.approvalRoute(s,repair).id,'recovery-authority');
  assert.equal(E.approve(s,repair,'cash','recovery-authority').ok,true);
  assert.equal(s.facts.waterReady,false,'approval alone does not restore service');assert.equal(E.proposalEligibility(s,housing).ok,false);
  assert.equal(s.grid[6].b.type,'construction');
  E.table(s,housing); // Keep the housing decision open while the service repair is being built.
  E.resolveYear(s);
  assert.equal(s.facts.waterReady,true);assert.equal(s.built[0].id,'repair');assert.equal(E.calendarYear(s),1947);
  const next=s.proposals.find(p=>p.id==='housing');assert.ok(next);assert.equal(E.proposalEligibility(s,next).ok,true);
  const checked=E.validatePlan(next.kind,E.defaultPlan(next.kind),next.plan);assert.deepEqual(checked.plan,next.plan);
  assert.equal(E.approve(s,next,'cash','recovery-authority').ok,true);assert.equal(s.grid[13].b.type,'construction');
  E.resolveYear(s);assert.equal(s.grid[13].b.type,'initiative');assert.equal(s.built.find(p=>p.id==='housing').plan.homes,20);
  assert.ok(E.econ(s).housing>0);assert.equal(s.grid.length,20);assert.ok(s.grid.every((c,i)=>c.x===i%5&&c.y===Math.floor(i/5)));
  const restored=E.migrate(clone(s));assert.deepEqual(restored,clone(s));assert.equal(E.calendarYear(restored),1948);
});

test('MP-060 MP-074 real v2 progress migrates losslessly and current scenario saves round trip',()=>{
  const legacy=JSON.parse(readFileSync(new URL('./fixtures/millbrooke-v2-save.json',import.meta.url),'utf8'));
  assert.equal(legacy.v,2);assert.ok(legacy.built.length&&legacy.pending.length);assert.ok(legacy.proposals.some(p=>p.grantPending));
  const s=E.migrate(clone(legacy));assert.equal(s.v,3);assert.equal(s.scenarioId,'millbrooke');assert.equal(E.calendarYear(s),2028);
  assert.equal(comparable(s),comparable(legacy),'all original progress and compatible stored text survive');
  for(const k of ['grid','pending','built','cash','bonds','decided','proposals','chats','savedAt'])assert.deepEqual(s[k],legacy[k],k);
  assert.deepEqual(E.migrate(clone(s)),s,'migration is idempotent');
  E.resolveYear(s);assert.ok(s.built.some(p=>p.id==='init2'));assert.deepEqual(E.migrate(clone(s)),clone(s));
  assert.equal(E.isSupportedSave(legacy),true);assert.equal(E.isSupportedSave(s),true);assert.equal(E.isSupportedSave({v:99}),false);
});

test('MP-015 MP-033 MP-074 scenario context is detached with legal site geometry and bounded editable fields',()=>{
  const s=E.newGame(2027);E.resolveYear(s);
  const population=s.pop,context=E.scenarioContext(s);
  assert.equal(context.scenarioId,'millbrooke');assert.equal(context.turn,2);assert.equal(context.calendarYear,2028);
  assert.deepEqual(context.map,{width:24,height:24});assert.ok(context.sites.some(p=>p.id==='oldmill'));
  assert.deepEqual(context.sites.find(p=>p.id==='oldmill').plots,E.SITES.oldmill);
  assert.deepEqual(context.proposals.filter(p=>p.site==='oldmill').map(p=>p.id),['park','commerce']);
  assert.deepEqual(context.editableFields.initiative,E.KINDS.initiative.params);assert.equal(context.facts.population,s.pop);
  context.sites[0].plots[0][0]=999;context.editableFields.initiative.homes.max=999;context.facts.population=-1;
  assert.ok(E.scenarioContext(s).sites.every(p=>p.plots.every(([x])=>x<24)));assert.equal(E.KINDS.initiative.params.homes.max,200);assert.equal(s.pop,population);
  const r=E.newGame(1,reconstruction),rc=E.scenarioContext(r);assert.deepEqual(rc.sites.map(p=>p.id),['utility','housing']);assert.equal(rc.facts.waterReady,false);
});
