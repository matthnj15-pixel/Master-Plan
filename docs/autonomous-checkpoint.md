# Autonomous run checkpoint

Goal: execute full Master_Plan_Full_Autonomous_Run package, Dev only.
User authorized execution November 11, 2026. Stable remains Nate's approval.

Baseline remote dev: 18dded6207f7217021d84b42aad6cc8e00b68f43.
No open PRs/published D/F branches at kickoff. Fresh checkout; no user edits.
Reference C preserved in docs/reference/frozen-C. Successor contract C2.1:
781a249; requirements MP-076..082 accepted in 278fef5.

| Owner | Branch/worktree | Exclusive paths | Status |
|---|---|---|---|
| Coordinator | feature/autonomous-planning /workspace/Master-Plan | contracts, requirements, flags, builds, workspace module/tests, remote integration | Reconciliation and contract complete; storage implementation next free writer slot |
| Engine Builder Kierkegaard | feature/composition-engine /workspace/mp-engine | src/engine.js, tests/composition-engine.test.mjs, docs/composition-balance.md | Implementing C2.1 |
| Frontend Builder Goodall | feature/composition-ui /workspace/mp-ui | src/ui.js, src/index.html, src/plan-renderer.js, tests/composition-ui.test.mjs | Implementing private previews/controls/rendering |
| Planner Pasteur | integration documentation only | docs/autonomous-plan.md | Acceptance/QA plan |
| Senior Reviewer Archimedes | source read-only | review findings | C2 review findings amended, pending integrated review |
| Independent QA Socrates | /workspace/qa-private, source read-only | withheld corpus/evidence | Preparing corpus, waiting integrated target |

Default limit two concurrent source writers. Coordinator source work waits for
one writer slot, using time for read-only verification/documentation.

Baseline verification: all 141 existing tests passed, Chromium outside command
sandbox; traceability correctly reports absent new MP-076..081 tests pending
implementation. Log /tmp/mp-baseline-tests.log. Browser installed Playwright
1.63 / Chromium 153.0.8010.12.

External gates: live configured Qwen requires shader-f16. Default Chromium has
no adapter; software Vulkan and SwiftShader adapters lack shader-f16 (see
GPU probe JSONL). No physical iPhone Duo attached. No live-provider/device
acceptance established. Keep trying independently executable gates.

Next: integrate engine/frontend in dependency order; implement transactional
workspace under freed writer slot, then provider runner. Freeze runnable SHA
for independent QA/review. Run complete tests + both builds, fix findings, open
Dev PR, monitor CI/merge/deploy per policy. Preserve all unmet G/X evidence.

Storage milestone 964a344: slot-locked local envelopes, generation fences,
legacy backup, feature-independent protected-format probe, private recovery
limits/conflicts and serialized freshest-durable account replication. Seven
focused workspace tests pass (`node tests/workspace.test.mjs`). Dev/Stable
builds pass; sandboxed child processes cannot execute /bin/sh, so final builds
and full browser checks use the approved outside-sandbox command path.
UI writes resumed after this source integration window. Provider Mencius is
read-only preparing until next writer slot. Published Qwen config says 32768
context tokens; this is upstream config, NOT actual loaded runtime evidence.

Storage independent review (964a344) reproduced seven issues. Fixed in c62580f:
explicit pre-read replacement generation, channel-derived/rejected inconsistent
keys, outgoing v4 structure validation, protected malformed/null/empty/newer
legacy bytes with either flag, account scope epoch across completion, private
entry validation, and replay-identity failure precedence. Eleven focused tests
pass; independent re-review pending. UI writes resumed. Engine composition
schemas/layout/preview now implemented in worktree; integration still pending.

Integrated milestone e8e2904: engine checkpoint 5aafe88 cherry-picked as 9cf6978;
UI checkpoint 8cfbc77 as aed2350. Dev composition flag enabled, Stable false;
legacy browser fixtures explicitly keep the prior pipeline to preserve their
assertions. Store remaining malformed legacy structure case fixed in 235dd5f.
Normal-rule WIP strategy exploration /tmp/mp-normal-strategies.mjs achieved
3×12 annual resolutions with real votes, explicit earned political favors,
finances and won elections (no resource/relationship gifts); rerun final SHA.

Provider Mencius now owns /workspace/mp-provider, feature/composition-provider,
base e8e2904: composition-requests.js, offline-ai.js, qwen-diagnostics.js and
new provider tests. Engine owner continues queued fixes in mp-engine. UI owner
is source-paused, doing read-only browser exploration; private baseline/delta
follow-up queued. Two source writers remain Engine + Provider. Coordinator
runs integrated checks and owns remote/build/flag integration windows.

Intermediate preview http://127.0.0.1:4173/ (/tmp/mp-preview, persistent server).
Provider is absent in this intermediate build; typed flow not ready. Independent
QA may run actual T1–T8 now, but final withheld corpus/review await one common
final runnable SHA. Full npm test running, log /tmp/mp-integrated-tests.log.

Engine follow-up 40ce66e integrated as 915ebb7: 23 composition tests passed,
including normal-rule 3×12-year paths; core/scenario/build checks and both builds
passed in builder tree. Engine source writes now paused. Independent preflight
review continues against 40ce66e; no final integrated verdict yet.

Intermediate full run: 171 tests, 168 passed, 3 legacy browser reload failures.
The new legacy fixture setup accessed/wrote localStorage in addInitScript during
file-page navigation; synthetic save reloads were disturbed. Replaced with a
build-metadata flag-off fixture (0acb7a2). All three ORIGINAL failed assertions
now pass targeted rerun /tmp/mp-legacy-fixture-fix.log; no product rule/assertion
was weakened. Full suite waits provider integration (MP-081 tests pending).

Current source writers: Provider in mp-provider (composition runner/runtime/
diagnostics/new provider tests), Frontend in mp-ui (private baseline deltas,
markup/touch cleanup, explicit generation-bound account imports/new UI tests).
Frontend instructed to merge current integration first. Engine source paused.
Coordinator owns integration, evidence, remote/build/flags. Adaptive reuse of
active space inside existing buildings remains an explicit unmodeled boundary;
preservation retains assets outside active allocations. Report it accurately.

Full integrated c652bee verification: npm test passed 184/184 and traceability.
Hosted transport fix f37b6e7 integrated as 6da5d9a; provider suite now seven
passing tests. Both Dev and Stable builds pass 6da5d9a. Independent Candidate A
QA and Reviewer assigned SAME SHA 6da5d9adc51751afb27236bfc27b769848a18d94,
builds /tmp/mp-candidate-a and /tmp/mp-candidate-a-stable. QA freezes source/
catalog before withheld initial corpus. This is candidate evidence, not final
acceptance; UI baseline/delta/account-import follow-up remains in its worktree.

Provider source paused at f37b6e7, 64 focused compatibility tests pass in its
worktree. Known follow-up: clarify terminal diagnostic outcome, definition patch
before site fit, reaction timeout fallback, broader stale/cancel/claim/reaction/
grammar-admission coverage. These remain authorized fix/retest work.

Confirmed Candidate A bug: inherited loading route names `__proto__` and
`constructor` pass preview as though trusted routes; unknown ordinary route
correctly rejects. Engine owner RESUMED for bounded trusted-route lookup fix and
regression, UI remains other writer. Provider waits next source slot. Independent
review has reproduction; QA frozen Candidate A remains unchanged.

Independent actual-browser Candidate A races: T1–T8 all PASS at 6da5d9a, two
Chromium 153 pages, same HTTP origin/localStorage/native Web Locks, actual engine
and workspace. Evidence /workspace/qa-private/evidence/integrated-6da5d9adc51751afb27236bfc27b769848a18d94/two-page-races/report.json.
Account upload callback is a mock, not real-host proof. Recheck final revision.
Engine route fix aeaae2c integrated 88a0900, 24 composition +33 legacy engine
+4 scenario tests passed; engine source paused. Provider resumed follow-ups;
Frontend remains other source writer. Planner now independent sustained browser
QA under /workspace/qa-sustained, same immutable Candidate A.

Provider follow-up 35c2225 integrated a884cdd. P2–P8/R11 fixed, full 209/209
plus trace in provider tree with pinned source probe. Actual SRI-verified WebLLM
source confirms model overrides use 4096 tokens (upstream model JSON 32768);
loaded admission matches the real runtime input-formatting path. This is source
and synthetic-tokenizer evidence, not live Qwen. Durable audit JSON saved.
Provider SOURCE PAUSED; R9 scoped built history still pending. Engine RESUMED
R1–R4/R8 malformed JSON/identities/save entries/repeated claim/policy duplicate
fixes. Frontend is the other source writer U1–U11/S5/S7. Reviewer full A report
and initial corpus/race artifacts preserved docs/evidence/autonomous-run/candidate-a.
