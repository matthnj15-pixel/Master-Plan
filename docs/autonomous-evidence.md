# Autonomous run: evidence ledger

Prepared 2026-11-11 by Planner. This is the final-handoff template and current evidence inventory, not an integrated acceptance verdict. Planner changed only this new document. Source writers retain their assignments; the senior reviewer owns store-audit findings.

| Target field | Value |
|---|---|
| Final integrated / QA / reviewer SHA | **Pending coordinator freeze. All three must identify the same runnable target.** |
| Contract | [C2.1](contracts/composition-v2/contract.md), `781a2491330e86cca15281437edc9ac3074a26e3` amendments; preserved C remains immutable. |
| Dev source baseline | `18dded6207f7217021d84b42aad6cc8e00b68f43` |
| Inspected store | `964a344fbf6f82b0a08e3424d58f88ad184ba1bb`; current `src/workspace.js` matched this commit on inspection. |
| Flags / launch URL / disposable saves / media location | **Pending final target.** Include composition on, protected-format flag-off and legacy regression paths. |
| Dev PR / CI / merged / deployed SHA / artifact publication | **Pending.** Dev URL: <https://matthnj15-pixel.github.io/Master-Plan/dev/>. Verify the deployed revision; distinguish artifact publication. |
| Physical device / live provider | **Unverified; current GPU gate blocked.** No Duo attached in the recorded checkpoint. |

Each evidence reference must resolve to: exact SHA/build/contract, evidence type, owner, command or normal player actions, input/save/seed, expected and observed result, artifact, and remaining limitations. Add model/runtime/device/settings/latency for provider checks, origin/storage partition for races, viewport/input for browser checks, and actual elapsed time for exploratory play. WIP file hashes identify inspections only. Historical passes require verification on the final target; missing evidence remains **UNVERIFIED**. Use **FAIL** for observed requirement failures and **BLOCKED** for an identified unavailable boundary.

## Evidence already available

| Ref | Observation and provenance | Scope / limitation |
|---|---|---|
| B141 | [Baseline log](/tmp/mp-baseline-tests.log): 141 tests, 141 pass, 0 fail, 0 skipped; about 71.2 s. Coordinator checkpoint [20ec5fe](autonomous-checkpoint.md) records the run against legacy Dev source plus documentation. | Automated baseline tests passed. The same `npm test` log then reports missing trace tests for MP-076–081; **the complete npm test gate was not green**. No new composition acceptance follows from this count. |
| W7 | [Workspace tests](../tests/workspace.test.mjs) at `964a344`: seven focused tests; coordinator reports `node tests/workspace.test.mjs` passed in [checkpoint](autonomous-checkpoint.md). Planner inspected definitions, not a retained raw result log or a fresh execution. | Fixture evidence only: stub `E.applyCommand`/migration, Map storage and promise-queue fake locks. Covers useful save/replay/conflict/recovery/replica boundaries; not real-engine conformance, actual browser Web Locks, account host, T1–T8 completion or final integrated acceptance. |
| GPU3 | [GPU probe](evidence/autonomous-run/gpu-probe.jsonl): default Chromium reports no adapter; Vulkan/SwiftShader variants report adapters, all three `shaderF16:false`. | Current configured Qwen `q4f16_1` entry path requires shader-f16. Live generation is **BLOCKED on these measured configurations**. This does not prove all runtimes unavailable. Published model JSON/configured context limits are not a loaded model, successful inference, cached offline success or physical Duo evidence. |

Inspection snapshot at 2026-11-11 00:23 UTC: integration HEAD `39127b82886635e41353716ec57aea2bad894f41`; engine/UI worktrees still based on `4cacb76` with uncommitted work. Engine test SHA-256 `9808c2c525c9b17547d517ca9d49d6915b0c4aa0ff512fc14155d894b8806f8a`; engine source `9a59dfb984459e50e47a96310003b5f7f55e8ba71664a28a8ea103c9b1ea3ace`; UI source `edfa2f5c0c461d34b9ef53d0f39a4bcf49b92784dcf2535670bea1627ca701cf`. These are inspection references, not passing executable revisions.

## Follow-up coverage gaps

| ID / gates | Observed evidence gap | Next evidence / owner |
|---|---|---|
| P1 · G4.6/G4.7 | Emerging [12-year test](/workspace/mp-engine/tests/composition-engine.test.mjs:181) sets every council relationship to 100 each year and resets election phase. It supplies its own annual program; `ops.length` and stored opportunity IDs do not show ordinary opportunity uptake. | Keep as construction/determinism coverage only. Q must independently complete **three viable normal-rules 12-year strategies**, with real support, finances, election results and permitted post-win continuation; no gifts or state resets. E supplies final APIs, not a passing verdict. |
| P2 · G4.7/X3 | Inspected [election UI](/workspace/mp-ui/src/ui.js:1350) offers “Keep running the town” after a win; an election loss ends the current career and offers restart. This preserves the implemented defeat rule. Copy still says later proposals arrive in the next build. | Preserve career-ending loss. MP-005 opposition remains Planned; a different defeat role is outside this package. Q must use an authentic first-term win for the later-year browser gate. Record failed strategies' actual losses and causes without forcing continuation. Verify first-term and later-year copy against delivered behavior. |
| P3 · G4.6/G4.7 | `proposalsFor` now calls `programOpportunities(...).slice(0,2)`, but generation was still WIP in the inspected snapshot. Tests compare opportunity ID sequences, not specific causal eligibility or meaningful later choices. | E/Q prove common validation and actual agenda entry, eligibility from needs/completed projects/commitments, changed same-year opportunities under paired decisions, and no duplicate/overlapping repeats after table/reject/lapse/build/reload. Compare program/site/reason signatures, not title or year-suffixed IDs alone. Test zero eligible sites with an explained wait/recovery. |
| P4 · G4.3–G4.5/G3.6 | Emerging tests assert pending/built equality and presence of project records. That does not show normal UI delivery fidelity, enduring relevant commitments, later negotiation recall or useful report causality. | E/U/Q compare accepted layout to delivered map, reconcile real upkeep/bond/delivery effects and causes, reload, then negotiate a relevant later case using actual records, including when old receipts have been pruned. |
| P5 · G1.6/G1.7 | The test titled “all capabilities deliver through the common pipeline” currently previews each capability and renames it; its body does not deliver them. A builder-authored “uncatalogued” label is not the withheld challenge or the trusted-program extension probe. | Q/R retain the 12-case withheld corpus, source/catalog-frozen uncatalogued lifecycle, separate data-defined program extension diff and three ordinary typed full lifecycles. Do not share exact initial wording before the first score. |
| P6 · G2.4/G4.1/G4.2/X4 | Store API and seven fixtures exist before a real C2.1 engine/UI integration target. Stub success cannot establish the final envelope, command freshness, migration or all host writers. | S/U/Q run real engine × store conformance, then actual two-page T1–T8 and account-host checks. Reviewer retains detailed store defects; this is an integration/evidence dependency. |

Store/C2.1 comparison: `MP_WORKSPACE.create` exposes asynchronous load/commit/save/replace and private recovery, generation/mode/state access, account-scoped replication and the specified channel slot/replica locks. Commit rereads and handles retained replay before generation rejection; save increments legacy-mutation revision; replace assigns a new game identity; private writes leave public generation unchanged. These are static observations of intent and shape, not a second store audit or proof that every application writer uses the API. Final verification must use the real engine's SHA-256 receipts, pruning/high-water, v4 migrations and actual UI/account entry points. Feature-off storage fencing remains independent of the composition flag.

## Final 34-row acceptance ledger

E = engine; U = frontend; S = coordinator/store; F = provider; Q = independent QA; R = reviewer. MP IDs below refer to [requirements](requirements.md). Enter final-target evidence IDs/SHAs in the fourth column. Current B141/W7/GPU3 observations are supporting context only; no row is complete yet.

| Gate | MP IDs | Required evidence / owner | Final-target refs @ SHA | Status |
|---|---|---|---|---|
| G1.1 | 076, 077, 030, 031, 033 | Typed private draft on exact ordered plots; public state/initiative unchanged. E/U/Q | Pending | UNVERIFIED |
| G1.2 | 076, 015 | Seven families, multiple components/units/allocations/conditions through common engine. E/R | Pending | UNVERIFIED |
| G1.3 | 076, 082, 026, 033 | Same candidate revision, boundary and functional layout in sheet/map. U/Q | Pending | UNVERIFIED |
| G1.4 | 076, 033–035 | Capacity/shared-space conservation; occupied acquisition/demolition/displacement/retention accounting. E/Q | Pending | UNVERIFIED |
| G1.5 | 076, 081 | Actual issue, retained input, explicit acknowledgment before subset posting. F/U/Q | Pending | UNVERIFIED |
| G1.6 | 076, 082 | New trusted data-defined program uses interpretation through delivery; extension diff. E/F/Q/R; P5 | Pending | UNVERIFIED |
| G1.7 | 076, 082 | Withheld uncatalogued program, frozen source/catalog, ordinary full lifecycle. Q/R; P5 | Pending | UNVERIFIED |
| G2.1 | 077, 082, 026 | Three typed addition/reduction/operating or spatial edits retain unrelated fields/site. U/Q | Pending | UNVERIFIED |
| G2.2 | 077, 030 | Two identifiable private alternatives revisitable without initiative use. U/Q | Pending | UNVERIFIED |
| G2.3 | 077, 078, 026 | Requested feasible revision visible before stance/counter; explicit authorized confirmation. E/U/Q | Pending | UNVERIFIED |
| G2.4 | 077, 080, 081, 060, 065 | Scope/failure/cancel/stale/reload/capacity recovery retains input/public version. S/F/U/Q; W7/P6 | Pending | UNVERIFIED |
| G2.5 | 077, 079, 010, 028, 059 | Same-revision monetary/physical/support deltas and provenance after reload, including zeros. E/U/Q | Pending | UNVERIFIED |
| G2.6 | 077, 080 | Four drafts, eight versions each, 128 KiB UTF-8/game; explicit limits, no expiry/eviction. S/U/Q; W7 | Pending | UNVERIFIED |
| G3.1 | 078, 020, 026, 074 | Normal farm/campus agree/counter/refuse with concrete interest/place/concession. E/U/Q | Pending | UNVERIFIED |
| G3.2 | 078, 025, 028 | Contrasting exposure/priorities; equivalent replacement actor follows same rules. E/Q | Pending | UNVERIFIED |
| G3.3 | 078, 026 | Accepted concession changes operative plan, applicable forecasts/drawing and reevaluation. E/U/Q | Pending | UNVERIFIED |
| G3.4 | 078, 015, 074 | One controller; trusted prerequisites and stale/forged/counter negatives checked at commit. E/R | Pending | UNVERIFIED |
| G3.5 | 078, 081, 025 | Actual typed claims, truth/relevance, bounded credit and false-claim correction. E/F/Q | Pending | UNVERIFIED |
| G3.6 | 078, 079, 081, 025 | Receipt/member/result/history grounding; wrong/late/pruned/retried reaction never scores again. E/F/Q/R; P4 | Pending | UNVERIFIED |
| G3.7 | 078, 023, 025, 043 | Existing caps/quota; separate explicit offers, funding, grant and vote. E/U/Q | Pending | UNVERIFIED |
| G4.1 | 079, 080, 030 | Durable explicit post consumes once; failure/alternatives consume none. E/S/Q; W7/P6 | Pending | UNVERIFIED |
| G4.2 | 079, 080, 022, 023 | Current eligibility/votes/explicit funding; duplicate/delayed/two-tab no double effect. E/S/U/Q; W7/P6 | Pending | UNVERIFIED |
| G4.3 | 079, 080, 060, 074 | Approved program/layout/conditions/identity persist through construction/year/migration/reload. E/S/Q; P4 | Pending | UNVERIFIED |
| G4.4 | 079, 082, 010, 052, 059 | Approved-to-built schematic fidelity; report actual money/capacity/positive and negative causes. E/U/Q; P4 | Pending | UNVERIFIED |
| G4.5 | 079, 060 | Intent/revision/decision/commitment/delivery record supports relevant later negotiation. E/U/Q; P4 | Pending | UNVERIFIED |
| G4.6 | 079, 010, 011 | Normal-rules same-seed strategic divergence in town/map/semantic opportunities with causes. E/Q/R; P1/P3 | Pending | UNVERIFIED |
| G4.7 | 079, 082, 001, 002, 074 | Three viable normal-rules 12-year paths with real elections; authentic first-term win and later-year browser choice. Q; P1/P2/P3 | Pending | UNVERIFIED |
| X1 | 081, 082, 065, 066 | Live downloaded Qwen draft/revise/resident/grounded council; exact runtime/results/latency. F/Q; GPU3 | Pending; current measured GPU blocked | UNVERIFIED |
| X2 | 082, 065, 066 | Cached shell/assets/model draft/revise/commit/year/reload; separate physical Duo airplane-mode record. Q; GPU3 | Pending; device unavailable | UNVERIFIED |
| X3 | 082, 053–057 | Touch 669×951 and 400×951, ≥44px controls, ≥12px text, reachable actions/keyboard/overflow. U/Q | Pending | UNVERIFIED |
| X4 | 079, 080, 060–064, 074 | Old saves, T1–T8, fences/flags/legacy/account/channel separation with actual envelopes. E/S/Q; W7/P6 | Pending | UNVERIFIED |
| X5 | 081, 075 Proposed | 168-hour safe diagnostics, correlated exact rule/stage, timezone/date export and all failure classes. F/S/Q | Pending | UNVERIFIED |
| X6 | 076, 081, 010, 011, 015, 040 | Engine-only prices/geometry/capacity/authority/support/votes/time; nine meters, grounded model outputs. E/F/R | Pending | UNVERIFIED |
| X7 | 082 | Same final QA/reviewer target; evidence types/revisions/statuses, CI/deployment and external gates explicit. S/Q/R | Pending | UNVERIFIED |

## Deferred QA assignment: normal rules and first-term play

Q receives the final runnable SHA after E/S/F/U integration. Run compact reinvestment, selective outward mixed use and preservation/targeted services from the same declared seed for at least 12 actual annual resolutions each on viable paths. All choices use eligible plans, available support/persuasion, priced explicit funding, real grants, construction and election rules. No direct edits to money, capital, relationships, deficits, odds or phases; no gifts or skip-year controls. A pure harness must call the same published decision/election actions and permitted post-win continuation as the host. Election loss ends the career; no opposition mode or continued-loss role is authorized. Never replace the result or silently assign `phase='agenda'`.

For each year record seed, turn/calendar, proposal/program revision and site, chosen action/receipt, funds/bonds/upkeep, support/relationship changes, delivery/delay/failure, map differences, causes, election share/result, permitted post-win continuation or career termination, and available opportunity program/site/reason. Include a carryover and a recoverable setback, plus eligibility changes due to a completed project or commitment. A strategy ending in election loss or bankruptcy must terminate with its exact turn and cause recorded. Retain failed attempts; they do not satisfy the 12-resolution gate. Establish all three required 12-year paths through viable choices under actual rules. Exact repeated choices must reproduce outcomes, and materially different choices must change modeled causes and semantic opportunities.

Browser evidence must independently use normal controls through years 1–4, campaign/debate/count/result, an authentic first-term win and permitted continuation, then a year-five-or-later planning decision from the actual agenda. Report observed losses as career-ending outcomes separately. Check persistence of carryover/history, AI-off year resolution and a provider failure that preserves a live proposal. Check both portrait widths and record actual exploratory time, friction, repetitive choices and dead ends. These checks add to, rather than substitute for, the 12-case corpus, three typed full lifecycles, T1–T8, live provider and physical offline gates in [the plan](autonomous-plan.md).

Before Dev handoff attach final `npm test` including traceability, both channel builds, independent QA/review/fix results, PR CI and deployed-SHA evidence. Keep local/mock/live/deployed/device results separate. Stable approval remains Nate's. No AI-ready verdict follows while required live flows or blocking supported-case failures remain unresolved.
