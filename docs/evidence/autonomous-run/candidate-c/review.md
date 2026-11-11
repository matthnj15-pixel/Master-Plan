# Candidate C independent affected review

**Needs revision.** Exact reviewed SHA: `35461a0acc6a21c723d97d90509bb1e8adb0cf49`. Contract C2.1 `781a2491330e86cca15281437edc9ac3074a26e3`.

34 rows: **29 PASS, 3 FAIL, 2 UNVERIFIED**. Four remaining B findings are fixed. R3's earlier nested/display cases pass, but saved layout metadata still crosses admission and throws. A newly introduced diagnostic reason is also lost. Both failures were reported immediately during the review.

**Experimental Dev:** needs revision for the two source findings below. **AI-ready:** pending verification; live Qwen, real offline-model/Duo and real account/artifact-host gates remain unverified. Stable remains composition-off; successful build/legacy compatibility checks are recorded without a release-readiness claim.

Product source stayed read-only. All reviewer fixture/evidence writes are under `/tmp/mp-candidate-c-review`; local browser mutations used the explicitly authorized disposable loopback origin. No external account writes.

## Remaining actionable findings

### R3-LAYOUT-DISPLAY · P1 · X4, X6

Owner: engine save validator. Source: `src/engine.js validateSave project layout branch`.

Create a normal composition-enabled seed-31 v4 town. Take the first p with p.program. Set p.layout.allocations[0].label, role, componentId or sharedWith to JSON object {toString:null,valueOf:null}. Each variation is accepted by E.isSupportedSave(s), then actual PLAN_RENDERER.render({state:s,proposal:p,engine:E}) throws TypeError: Cannot convert object to primitive value.

Focused amendment: Validate the scalar layout fields consumed by display/property lookup, plus the corresponding persisted cell/strip fields, before store/account admission. Reject with a closed reason and preserve input bytes. Cover valid layouts and both flag paths. Product source remains read-only in this review.

Evidence: [layout-display-probe.json](./layout-display-probe.json).

layout-display-browser.json: normal farm proposal click after loading the malformed save throws, no protected landing, no rendered proposal, bytes preserved.

### R11-HISTORY-REASON · P2 · X5

Owner: diagnostic closed result-code allowlist. Source: `src/qwen-diagnostics.js resultCodes; src/composition-requests.js claims logging`.

Use the authentic A pruned-credit fixture with projectRecords absent; C migrates conservatively. Run actual COMPOSITION_REQUESTS claims with a constant original-claim mock and actual diagnostics. Engine evaluation returns none/claim_history_unresolved, but prepared export drops that code and retains valid/none events.

Focused amendment: Add the exact fixed claim_history_unresolved code to the closed diagnostic allowlist and verify sanitized export. Preserve rejection of arbitrary text.

Evidence: [claim-history-diagnostics.json](./claim-history-diagnostics.json). [claim-history-diagnostics.mjs](./claim-history-diagnostics.mjs).

## Five B findings and affected regressions

| Check | C result | Evidence |
|---|---|---|
| R3-original-nested/display | PASS | nested-admission.json; ten original corruptions reject with zero writes and unchanged input in on/v4 and off/v3 paths. Full focused malformed-collection/scenario cases pass. |
| R3-complete-save-boundary | FAIL | layout-display-probe.json / layout-display-browser.json: layout label/role/componentId/sharedWith objects accepted then renderer throws. |
| R4-pruned-credit | PASS | old-credit-pruning.json: unmodified A engine and commands reproduced against C, old receipt absent, prior credit retained as claim_repeated with credit none. Focused authentic/conservative fallback cases also pass. |
| R9-legacy-history | PASS | history-consistency.json: actual bridge record, seven inconsistency negatives, combined three-entry legacy/composed budget; no historical effects or preview allowed. |
| R10-pending-recovery | PASS | pending-recovery-400.json / pending-recovery-669.json: controls, text, attempted site and accepted revision stay separate; invalid re-preview cannot post; valid re-preview can; public bytes unchanged. |
| SUST-A-02 | PASS | legacy-sites.json: ordered [6,12],[7,12],[6,13],[7,13] retained in form and exhibit at 400/669 before/after reload with public bytes unchanged. |
| R11-new-history-reason | FAIL | claim-history-diagnostics.json: actual composition runner evaluation code is absent from actual prepared diagnostic export. |

## Verification and carry-forward scope

All 22 immutable source/build hashes match. Independent focused suite: **82 pass, zero fail, one optional pinned-runtime-audit skip** (83 total). The coordinator full log records **244 pass, zero skipped**, actual pinned runtime source audit enabled, and passing traceability. No full suite was rerun by this reviewer.

The original A receipt-pruning reproduction ran unchanged against C and now produces `none / claim_repeated`. The separate conservative old-history fallback is correct for scoring; its new reason is missing only in diagnostics (R11-HISTORY-REASON).

Independent browser checks at 400×951 and 669×951 confirm invalid numeric input, full text and changed-site recovery without posting, valid re-preview, explicit version restoration and four-plot legacy geometry. Nine independent historical context checks pass: real bridge, seven mismatches, combined three-entry budget with both representations. Ten original malformed input cases reject through real engine/workspace with controlled storage/locks on both flags. The new malformed-layout renderer crash is also reproduced in the actual browser, not inferred from source.

Current C QA evidence includes three typed browser mock lifecycles, five persona/council cases, all eight native-lock interleavings, account/format fixtures, both-width recovery/footer/site checks, and three normal-rule 12-year engine/store strategies. Where initial harness reports used stale case-sensitive labels/selectors, the same-SHA retests are indexed explicitly; source failures are retained separately.

Source comparison: 13 manifest sources are unchanged from B; production differences are confined to engine validation/credit/history identity, provider historical record adaptation, and UI recovery/site selection. Accepted A extension content diff/full lifecycle and sustained normal browser evidence remain preserved. B frozen corpus coverage is carried explicitly, with C affected pipeline checks. C detached extension interpretation still produces the exact accepted A initial revision and geometry. No long extension or sustained browser session was repeated. No new evaluation-title/phrase dispatch was found in the three-file production diff.

Artifacts: [source-comparison.json](./source-comparison.json), [qa-evidence-index.json](./qa-evidence-index.json), [probe-results.json](./probe-results.json), [coordinator-full-suite.log](./coordinator-full-suite.log).

## Same 34-row matrix

| Criterion | Result | Evidence / limit |
|---|---|---|
| G1.1 | PASS | Typed browser mock lifecycles retain exact ordered sites, original intent, private state and annual initiative availability. |
| G1.2 | PASS | Generic multi-component schema, scale, sharing and operating conditions; malformed identities and cumulative policy validation now reject safely. |
| G1.3 | PASS | C legacy park editor shows four exact ordered plots at 400/669 before preview and after reload; exhibit matches. Public bytes unchanged. Composed renderer/map implementation is unchanged from B. |
| G1.4 | PASS | Engine conservation/sharing, occupied-site demolition and retention checks pass; unsupported active-space reuse is disclosed. |
| G1.5 | PASS | All 12 corpus cases pass at the code/browser-fixture boundary, including clarification and unsupported/capacity handling; actual live interpretation remains X1. |
| G1.6 | PASS | Accepted A data-only extension lifecycle retained. C detached interpretation reproduces the identical initial revision/layout/$275K cost and supports its delivered save. No long browser lifecycle repeated. |
| G1.7 | PASS | Independent frozen-catalog corpus and three uncatalogued typed browser mock lifecycles pass; this establishes the shared pipeline, not live-model generalization. |
| G2.1 | PASS | Three typed additive/reductive edits in three actual browser mock lifecycles preserve site, unrelated components and synchronized forecasts. |
| G2.2 | PASS | QA alternatives round trips and reviewer comparison/reload identify the baseline without consuming a public action. |
| G2.3 | PASS | Requested previews precede resident responses. Farm counter/confirmation and named campus stakeholder views pass. |
| G2.4 | PASS | Independent C browser checks retain quantity 999, full original/edit text and changed four-plot site across close/reload at both widths; last accepted preview stays separate, posting requires valid re-preview, and explicit version selection restores the former site. |
| G2.5 | PASS | C typed lifecycle/working-input checks preserve accepted baseline versus pending edits. B numerical comparison and after-reload delta evidence is carried with source comparison; coefficient/render/workspace sources are unchanged. |
| G2.6 | PASS | Four drafts/eight versions/128KiB capacity and explicit no-eviction handling pass storage fixtures and QA. Structurally malformed private recovery now reports unavailable while retaining bytes/live text/site. |
| G3.1 | PASS | Five browser persona/council cases include farm agree/counter/refuse and concrete campus objections. |
| G3.2 | PASS | The controlling freight operator agrees while the named college stakeholder counters the campus-entrance loading conflict; both are displayed. |
| G3.3 | PASS | Farm concession is previewed, explicitly confirmed and re-evaluated; route changes affect engine costs and actor evaluations. |
| G3.4 | PASS | One controlling authorizer and prerequisite checks remain engine-owned. Inherited route IDs and malformed presenter/member identities reject. |
| G3.5 | PASS | The unchanged A-engine reproduction now returns none/claim_repeated on C after 65 cosmetic revisions and receipt pruning. Authentic old provenance and conservative missing-provenance fallback pass; new distinct facts remain eligible when proven. |
| G3.6 | PASS | Actual saved persuasion receipts govern reactions. Wrong/member/missing/pruned/stale receipts and retries are covered without a second score. |
| G3.7 | PASS | Explicit favors/earmarks/funding/votes and existing per-member caps remain intact; historical repeated-fact eligibility is failed separately under G3.5. |
| G4.1 | PASS | Real engine/store post and native-lock browser races consume the initiative once; failed actions preserve durable state. |
| G4.2 | PASS | Valid-state vote/funding eligibility and all eight real-browser shared-storage/native-Web-Locks interleavings pass. Corrupt save admission is failed under X4. |
| G4.3 | PASS | Approved program/layout/conditions/revision survive pending/built/reload. New legacy delivery records retain plan/site/revision/decision; actual cost, upkeep and replay pass. |
| G4.4 | PASS | Three browser mock lifecycles retain delivered geometry and reports. Legacy record/UI now show built, actual cost/upkeep, and mayoral approval without a fictitious council vote. |
| G4.5 | PASS | Actual cash-approved legacy bridge record reaches bounded context with kind/plan and source identity. Seven inconsistent archives reject; legacy/composed copies share a combined limit of three without repricing historical land or granting present authority. |
| G4.6 | PASS | Independent C compact/outward/preservation engine/store paths each complete 12 normal-rule years and demonstrate traceable outcome/opportunity divergence. |
| G4.7 | PASS | Accepted A normal first-term/election/later-opportunity browser evidence is retained with B progression/three 12-year path and affected-flow checks. No forced loss continuation or resource gifts. |
| X1 | UNVERIFIED | Live Qwen is blocked by measured shader-f16 capability. Zero real-model generation acceptance; all provider substitutes are labeled. |
| X2 | UNVERIFIED | Cached offline/failure recovery browser mocks pass; actual model-cache inference and physical Duo airplane-mode operation remain unverified. |
| X3 | PASS | C browser touch emulation at 400x951 and 669x951 covers pinned primary actions, scrolling, controls, fit and affected views. Physical device behavior is not inferred. |
| X4 | FAIL | Earlier economy/schedule/profile-authority/parcel-name/project-title corruptions reject safely in ten on/v4 and off/v3 engine/store cases; QA account and format cases pass. C still accepts malformed persisted layout scalars and the browser renderer throws (R3-LAYOUT-DISPLAY). Real account host remains unverified. |
| X5 | FAIL | B density/site reason and retention/date/export checks remain valid, but C introduces claim_history_unresolved without adding it to the diagnostic closed-code allowlist; actual prepared export loses the credit-withholding reason (R11-HISTORY-REASON). |
| X6 | FAIL | Engine-owned pricing, authority, support, policy and command/replay checks pass. R3-LAYOUT-DISPLAY remains an unclosed engine save-admission boundary before rendering. |
| X7 | PASS | C source/build manifest verified 22/22. Current C browser/mock/engine evidence, B/A carried evidence and unchanged sources are identified separately. Missing live/device/account-host checks remain explicit; no deployment or D pass is claimed. |

## Next frozen target

D must be frozen at one shared full SHA; retest closed layout/grid admission and new fixed diagnostic reason, affected normal layouts/migrations/account handling, then use final full-suite/build evidence. Do not alter the C verdict based on WIP fixes.
