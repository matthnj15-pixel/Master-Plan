# Candidate B independent review

**Needs revision.** Exact reviewed SHA: `c921f0add6f7c16682e6fa6d4b04523b17656e4f`. Contract C2.1: `781a2491330e86cca15281437edc9ac3074a26e3`.

34 criteria: **26 PASS, 6 FAIL, 2 UNVERIFIED**. Five concrete remaining failures below; four prior finding families are only partially closed. These are B observations for the C fix/retest loop.

Product source remained read-only. Reviewer-owned fixtures/evidence are in `/tmp/mp-candidate-b-review`; browser writes touched disposable loopback game storage only. Account services were disabled in reviewer browser checks.

## Remaining concrete failures

### R3-NESTED · P1 · X4, X6

**Malformed nested saved scenarios pass the new structural boundary and workspace.load(), then throw during ordinary annual resolution.**

Source: `src/engine.js:803`. validateSave checks several scenario containers but does not validate economy or scheduled entries consumed by the engine.

**Reproduce:** Create a normal v4 seed-31 town; set scenario.economy=null OR scenario.proposals.schedule[2]=[null]. isSupportedSave returns true; real workspace with a storage/lock fixture loads ready; applyCommand(resolveYear) throws. Input remains untouched.

**Focused amendment:** Validate nested scenario data consumed by startup/annual resolution before migration, load or dispatch. Reject atomically with a closed reason and preserved bytes. Retest both flags and account-import admission.

Evidence: [probe-results.json](/tmp/mp-candidate-b-review/probe-results.json), [probes.mjs](/tmp/mp-candidate-b-review/probes.mjs), [report.json](/workspace/qa-private/evidence/integrated-c921f0add6f7c16682e6fa6d4b04523b17656e4f/account-ui-format-fences/report.json).

Coordinator acknowledged; bounded engine fix assigned for C.

### R10-PENDING · P1 · G2.4

**Reopening a private draft silently replaces persisted working edits with the selected accepted version and later overwrites the saved working input.**

Source: `src/ui.js:879`. openComposition unconditionally calls restorePrivateVersion; that helper overwrites draft.program/working/plots and marks the old preview current.

**Reproduce:** Normal generic draft: workplace quantity 10 -> accepted preview 6; type 999 and preview rejection. Wait until stored draft.program quantity is 999. Reload, open saved draft: control is 6 and feedback says Requested preview is private. Close: durable private quantity becomes 6. Public revision remains zero.

**Focused amendment:** Restore pending controls/text/attempted plots as saved. Reconstruct the accepted preview separately; preserve dirty state and require re-preview before posting. Only an explicit version selection should replace working input. Test invalid quantity and changed-site reloads.

Evidence: [invalid-pending-recovery.json](/tmp/mp-candidate-b-review/invalid-pending-recovery.json), [private-recovery.json](/tmp/mp-candidate-b-review/private-recovery.json), [comparison-verification.json](/tmp/mp-candidate-b-review/comparison-verification.json).

Reported immediately to coordinator; UI fix/retest required.

### R4-PRUNED · P2 · G3.5

**Repeated-fact credit is renewed when upgrading a supported A save whose original persuasion receipt has already been pruned.**

Source: `src/engine.js:1214`. New stable fact keys differ from A revision-bound keys; compatibility matching needs an old retained receipt to recover the old fact.

**Reproduce:** Use unchanged A engine: post a .5-plot green program, earn strong Okafor credit for 0.8 walkability, perform 65 authorized title-only revisions. Receipt #2 is pruned while persuasionHistory retains the prior key. B supports/migrates that save and returns strong/verified for the same current 0.8 claim, with one pitch already used. No resource/relationship edits.

**Focused amendment:** Keep fact-credit history effective independently of bounded action receipts, including supported pre-fix saves. Use verifiable revision/credit provenance or an explicit conservative migration for unrecoverable old credit; do not award it again merely because a receipt aged out.

Evidence: [old-credit-pruning.json](/tmp/mp-candidate-b-review/old-credit-pruning.json), [old-credit-pruning.mjs](/tmp/mp-candidate-b-review/old-credit-pruning.mjs).

Reported immediately; engine migration/repeat protection retest required.

### R9-LEGACY · P1 · G4.5

**The newly accurate legacy delivery record still cannot appear in relevant subsequent provider context.**

Source: `src/composition-requests.js:216`. projectHistory requires object(p.program) and validates only composed snapshots.

**Reproduce:** Approve the ordinary seed-0 bridge with explicit cash through the mayor route, resolve one year, verify built record and actual cost 260K. A subsequent same-site provider request receives projectHistory:[] despite valid record/snapshot provenance.

**Focused amendment:** Admit matching legacy kind/plan/ordered-site/revision/decision/delivery evidence through a generic adapter, share the same combined limit of three, expose only actual legacy facts, and preserve history-versus-current-authority separation. Exclude unsupported archives explicitly; never reprice occupied historical sites.

Evidence: [legacy-delivery.json](/tmp/mp-candidate-b-review/legacy-delivery.json), [probe-results.json](/tmp/mp-candidate-b-review/probe-results.json), [probes.mjs](/tmp/mp-candidate-b-review/probes.mjs).

Coordinator acknowledged; bounded provider/engine-helper fix assigned for C.

### SUST-A-02 · P2 · G1.3

**The existing physical legacy park editor still says zero plots/no-site policy even though the engine/drawing use four real Old Mill plots.**

Source: `src/ui.js:877`. Draft initialization bypasses E.plotsOf(target,S), while drawing uses the engine legacy adapter.

**Reproduce:** Open the ordinary year-2 Old Mill park revision. The editor uses target.plots, absent on legacy seeded proposals, and reports 0 plots selected / no site for a policy. QA reproduces at both portrait widths; accepted public geometry is retained.

**Focused amendment:** Initialize/show the exact engine-resolved legacy site in the editor; preserve its order and identity through preview/cancel/reload without relocating the public plan.

Evidence: [legacy-site-label.json](/tmp/mp-candidate-b-review/legacy-site-label.json), [legacy-site-label-400.png](/tmp/mp-candidate-b-review/legacy-site-label-400.png), [report.json](/workspace/qa-sustained/B/focus/report.json), [ui.js](/tmp/mp-candidate-b-review/source/src/ui.js).

Existing sustained-QA finding remains open on B; include in C affected-flow retest.

## R1–R11 recheck

| Finding | B result | Evidence |
|---|---|---|
| R1 | FIXED | Malformed capability/component identity values reject without coercion/throw; independent probes and focused tests. |
| R2 | FIXED | Typed own presenter/member identity and real council membership required; independent probes. |
| R3 | PARTIAL | Malformed collection cases fixed; nested scenario admission still fails as R3-NESTED. |
| R4 | PARTIAL | Fresh B cosmetic edits cannot renew fact credit; supported old saves with pruned receipts fail as R4-PRUNED. |
| R5 | FIXED | Inherited routes reject across preview/command/effects/resident paths; positive own routes remain supported. |
| R6 | FIXED | Feature-off protected landing explains and summarizes the saved town, hides gameplay and preserves exact bytes. |
| R7 | FIXED | Browser shows the controlling operator and the named college stakeholder objection, with one confirmation authorizer. |
| R8 | FIXED | Cumulative policy quantity greater than one rejects; active-program guard remains. |
| R9 | PARTIAL | Composed history and negative provenance tests pass; legacy records excluded as R9-LEGACY. |
| R10 | PARTIAL | Malformed private shape now fails safely and preserves bytes/live input; pending controls are lost on reopen as R10-PENDING. |
| R11 | FIXED | Density/site failure exports distinguish area_capacity/area versus site_capacity_exceeded/plots without private text. |

## Validation and evidence scope

All 22 manifest source/build hashes match. Independent focused engine/provider/workspace tests: **75 pass, zero fail, one optional runtime-audit skip** (76 total). The coordinator full-suite log records **235 pass, zero skipped**, including the actual pinned runtime audit, plus passing traceability. The reported green remote CI run is on merge commit `ad8757a`, not a relabeling of B.

Actual B QA artifacts record 12/12 frozen-corpus cases, 3/3 typed mock lifecycles in the review-stage retest, 5/5 persona/council cases, 8/8 native-lock races, and 3/3 twelve-year engine/store strategies. The original typed-lifecycle aggregate is superseded by that same-SHA retest. Sustained B focus retains the legacy site-label failure at both widths. These are labeled mock/browser/fixture or engine results; several aggregate reports still declare `final:false`.

Reviewer browser checks independently covered protected feature-off display, malformed private recovery, baseline/deltas/reload, invalid pending-input loss and operator/stakeholder visibility. The legacy delivery probe used normal engine cash approval and annual resolution; it never edited resources or relationships. The old-credit reproduction uses unchanged A code to produce the supported historical save.

The accepted A trusted-definition extension remains preserved with its content diff and browser evidence. Detached B interpretation matches its initial revision and geometry exactly and accepts its delivered save. No long extension workflow was repeated. Source inspection found no evaluation-phrase or title-derived effects in the changed composition path.

Evidence index with artifact hashes: [qa-evidence-index.json](/tmp/mp-candidate-b-review/qa-evidence-index.json). Independent probes: [probe-results.json](/tmp/mp-candidate-b-review/probe-results.json). Full-suite log: [coordinator-full-suite.log](/tmp/mp-candidate-b-review/coordinator-full-suite.log).

Live Qwen, physical Duo/offline model inference, and real external account callbacks remain unverified. No Candidate C, deployed Dev or stable-release pass follows from this report.

## Same 34-row matrix

| Criterion | Result | Evidence / limit |
|---|---|---|
| G1.1 | PASS | Typed browser mock lifecycles retain exact ordered sites, original intent, private state and annual initiative availability. |
| G1.2 | PASS | Generic multi-component schema, scale, sharing and operating conditions; malformed identities and cumulative policy validation now reject safely. |
| G1.3 | FAIL | Composed map/SVG revisions agree, but a physical legacy park is still labeled zero plots/no-site policy (SUST-A-02). |
| G1.4 | PASS | Engine conservation/sharing, occupied-site demolition and retention checks pass; unsupported active-space reuse is disclosed. |
| G1.5 | PASS | All 12 corpus cases pass at the code/browser-fixture boundary, including clarification and unsupported/capacity handling; actual live interpretation remains X1. |
| G1.6 | PASS | Accepted A data-only extension lifecycle retained. Detached B interpretation reproduces identical initial revision/layout/$275K cost; its delivered save is supported. No long browser repeat or new production definition. |
| G1.7 | PASS | Independent frozen-catalog corpus and three uncatalogued typed browser mock lifecycles pass; this establishes the shared pipeline, not live-model generalization. |
| G2.1 | PASS | Three typed additive/reductive edits in three actual browser mock lifecycles preserve site, unrelated components and synchronized forecasts. |
| G2.2 | PASS | QA alternatives round trips and reviewer comparison/reload identify the baseline without consuming a public action. |
| G2.3 | PASS | Requested previews precede resident responses. Farm counter/confirmation and named campus stakeholder views pass. |
| G2.4 | FAIL | Opening a saved draft restores its accepted version over pending controls; stored invalid quantity 999 becomes 6 and closing overwrites the saved input (R10-PENDING). |
| G2.5 | PASS | Reviewer observed engine-derived cost -16K, upkeep -1K and jobs -5.2 with physical/support deltas; baseline and deltas persist after reload. Pending-input recovery is separately failed under G2.4. |
| G2.6 | PASS | Four drafts/eight versions/128KiB capacity and explicit no-eviction handling pass storage fixtures and QA. Structurally malformed private recovery now reports unavailable while retaining bytes/live text/site. |
| G3.1 | PASS | Five browser persona/council cases include farm agree/counter/refuse and concrete campus objections. |
| G3.2 | PASS | The controlling freight operator agrees while the named college stakeholder counters the campus-entrance loading conflict; both are displayed. |
| G3.3 | PASS | Farm concession is previewed, explicitly confirmed and re-evaluated; route changes affect engine costs and actor evaluations. |
| G3.4 | PASS | One controlling authorizer and prerequisite checks remain engine-owned. Inherited route IDs and malformed presenter/member identities reject. |
| G3.5 | FAIL | Fresh B cosmetic-repeat protection passes, but an accepted A save with its persuasion receipt pruned earns strong credit again for the same fact (R4-PRUNED). |
| G3.6 | PASS | Actual saved persuasion receipts govern reactions. Wrong/member/missing/pruned/stale receipts and retries are covered without a second score. |
| G3.7 | PASS | Explicit favors/earmarks/funding/votes and existing per-member caps remain intact; historical repeated-fact eligibility is failed separately under G3.5. |
| G4.1 | PASS | Real engine/store post and native-lock browser races consume the initiative once; failed actions preserve durable state. |
| G4.2 | PASS | Valid-state vote/funding eligibility and all eight real-browser shared-storage/native-Web-Locks interleavings pass. Corrupt save admission is failed under X4. |
| G4.3 | PASS | Approved program/layout/conditions/revision survive pending/built/reload. New legacy delivery records retain plan/site/revision/decision; actual cost, upkeep and replay pass. |
| G4.4 | PASS | Three browser mock lifecycles retain delivered geometry and reports. Legacy record/UI now show built, actual cost/upkeep, and mayoral approval without a fictitious council vote. |
| G4.5 | FAIL | Composed history is verified against current snapshots and bounded to three entries. Verifiable legacy history is still excluded by the mandatory p.program check (R9-LEGACY). |
| G4.6 | PASS | Independent B compact/outward/preservation engine/store paths each complete 12 normal-rule years and demonstrate traceable outcome/opportunity divergence. |
| G4.7 | PASS | Accepted A normal first-term/election/later-opportunity browser evidence is retained with B progression/three 12-year path and affected-flow checks. No forced loss continuation or resource gifts. |
| X1 | UNVERIFIED | Live Qwen is blocked by measured shader-f16 capability. Zero real-model generation acceptance; all provider substitutes are labeled. |
| X2 | UNVERIFIED | Cached offline/failure recovery browser mocks pass; actual model-cache inference and physical Duo airplane-mode operation remain unverified. |
| X3 | PASS | B browser touch emulation at 400x951 and 669x951 covers pinned primary actions, scrolling, controls, fit and affected views. Physical device behavior is not inferred. |
| X4 | FAIL | R3-NESTED saves are accepted by engine/workspace then throw. Other native-lock races, format fences, Dev/Stable isolation and explicit/delayed account-import mocks pass. Real account host remains unverified. |
| X5 | PASS | Reviewer density/site failures export distinct closed rule IDs/field IDs without private IDs/text; seven-day/date-range bounds and browser failure/export checks pass. |
| X6 | FAIL | Model output cannot set prices/support/authority and other boundaries pass, but malformed nested saved scenario data still crosses the engine admission boundary and throws (R3-NESTED). |
| X7 | PASS | Source/build hashes and evidence types identify B exactly. A carry-forward evidence, CI merge commit, mocks and unavailable external gates are explicitly distinguished; no deployment/C pass is claimed. |

## Candidate C affected retest

Pin the next integrated full SHA and build manifest shared with QA. Retest nested scenario/save/account admission, retained old claim credit after receipt pruning, pending working controls/plots versus accepted preview on reload, verified legacy history with mismatched-source negatives and combined limit three, and the physical legacy editor site label. Confirm full suite/trace and build hashes, carry forward unaffected evidence explicitly, and preserve external gates as unverified.
