# Composition C2 · implementation contract

Amends preserved frozen C under Nate's full-run authorization (2026-11-11).
Baseline: `18dded6207f7217021d84b42aad6cc8e00b68f43`. Frozen C bytes live in
`docs/reference/frozen-C`; no D/F implementation exists on the current remote.

## Shared representation and engine API

Dev-only `compositionPlans` flag. Keep legacy plans/kinds and their flag-off
behavior. A composed proposal is `kind: 'initiative'`, with a derived legacy
`plan` for compatibility and authoritative `program` below. Never price both.

```js
program = {
  version: 2, title: string, intent: string,
  components: [{ id: string, capability: string, label: string,
    quantity: number, area: number, sharedWith: null | string }],
  conditions: { hours: number, deliveries: string, access: boolean,
    buffer: number, preserve: number, affordable: boolean },
  assumptions: [string], omissions: [string]
}
```

Area is plot equivalents; quantity is the capability's documented capacity unit.
Shared components occupy the primary component's floor space explicitly and
cannot exceed it. `preserve` is plot equivalents excluded from demolition;
`buffer` occupies additional area. Engine computes ordered deterministic
allocations from exact proposal plots; provider cannot supply plots or prices.
Closed objects, finite bounds, unique IDs, supported capabilities and reference
integrity are validated. Never silently fit/drop components. Omissions require
explicit `acknowledgedScope` before posting.

Engine exports (pure, synchronous):

- `capabilities()` returns trusted capability definitions with units, bounds,
  pricing/effect coefficients and render vocabulary. At least housing, workplace,
  shop, community, recreation, event, agriculture, storage, access, parking,
  green, stormwater, policy. Labels are identity, never dispatch keys.
- `validateProgram(program)` returns `{ok, program?, reasons: [string]}`.
- `previewProgram(state, {program, plots, id?, presenter?})` returns
  `{ok, proposal?, forecast?, layout?, reasons}`. Preview never mutates state.
  Proposal includes `program`, `programRevision` canonical fingerprint, exact
  `plots`, `layout` allocations, `demo`, derived `plan` and usual proposal fields.
- `reviseProgram(state, proposal, {upsert?, remove?, conditions?, title?})`
  returns the same preview shape; untouched fields/IDs/site persist.
- `evaluateResident(state, proposal, candidate)` returns
  `{stance:'agree'|'counter'|'refuse', reasons:[string], counter?, controller,
  prerequisites:[]}`. Proposal/scenario profile data owns interests and rights.
- `evaluateClaims(state, proposal, memberId, claims)` validates typed claims
  against actual forecast. Returns `{addressed, credit, tone, notes, ...}`
  compatible with existing `applyLobby`; no model scoring or implicit offers.
- `programOpportunities(state)` returns deterministic eligible opportunities.
- `canonical(value)` gives sorted-object JSON, preserves array ordering.
- `fingerprint(value)` binds complete canonical value.
- `applyCommand(state, command)` returns `{ok,state,receipt,reasons}` without
  mutating input; commands have `{id, type, expectedRevision, payload}`. Types
  `postProgram`, `reviseProposal`, `persuade`, `decision`, `resolveYear`.
  Exact replay returns original receipt and current state; changed-body ID reuse
  rejects; pruned IDs reject via high-water. State `revision` increments once.
  Receipt includes command fingerprint, subject/member, original result and year.
  Decision payload uses `{proposalId, funding, route}`; persuasion payload
  `{proposalId, memberId, claims, tone}`; post payload `{program,plots,
  acknowledgedScope}`; revision payload `{proposalId,program,confirmed:true}`.

Engine owns construction, geometry, effects, votes, conditions, save v4 migration,
scenario additions, project records and recurring opportunities. Keep optional
numeric `bridgeRisk` and `students` in delta boundaries (C erratum).

## Provider API

New global/CommonJS `COMPOSITION_REQUESTS.create({engine,diagnostics})` exposes
`run({mode,state,provider,intent,proposal?,plots?,memberId?,isCurrent,signal})`.
Modes `draft`, `revise`, `claims`, `reaction`. Returns `{status:'ready'|...,
program?,proposal?,forecast?,layout?,claims?,reply?,blocker?,requestId}`.
Draft outputs the program; revisions use ID-based upsert/remove patches and
condition patches. Only engine previews become ready. One repair maximum.
Reaction input requires the actual committed receipt and matching member.
Reuse serialized `provider.json`; preserve complete input; reject context
overflow, stale target/site/revision/provider and unknown fields. No mutation.

## Local store API

New global/CommonJS `MP_WORKSPACE.create({engine,storage,locks,key,legacyKey})`:
`load()` -> `{state, mode, reason?}`; `commit(command)` async -> engine result;
`save(state, expectedGeneration)` async -> result; `replace(state)` async ->
result. `generation` getter. Lock name is derived only from slot key and never
changes on replacement. Dev v4 key is `masterplan.dev.v4.save`; preserve legacy
bytes and a protected backup on migration. Unknown/newer/corrupt saves are
read-only. Write failure leaves authoritative state unchanged. No stale retry.

Private workspace: `readDrafts(gameId)` and `writeDrafts(gameId, drafts,
expectedRevision)` async; returns revision conflicts explicitly, four drafts,
eight input versions each, 128 KiB UTF-8 per game, no time expiry.

## UI ownership

Frontend owns `src/ui.js`, `src/index.html`, `src/plan-renderer.js`, new browser
tests. Use new composition flow when flag on; keep quick legacy flow available.
Private drafts + alternatives precede explicit Put on agenda. All durable
composed actions go through store.commit and replace UI state from its result.
Store.save coordinates legacy UI mutations; stale saves reload current state
and preserve live input. Drawing and map consume identical engine layout.
Coordinator owns build inclusion order: engine, composition requests,
workspace, legacy requests, renderer, UI. Engine may keep helpers in engine.js
to avoid a second global dependency.

## Ownership and evidence

Engine Builder: engine.js and new composition engine tests. Frontend Builder:
UI/template/renderer and new composition browser tests. Provider Builder follows
engine integration and owns only composition-requests.js and provider tests.
Coordinator: requirements, flags, builds, workspace module/tests, integration.
At most two concurrent source writers. Independent QA owns withheld corpus and
evidence only; Reviewer is source read-only. Both receive exact integrated SHA.

Fictional balance coefficients and schematic layouts must be documented as
assumptions. Browser/mock evidence, real Qwen, deployed and physical device
evidence are distinct. Stable release remains Nate's decision.
