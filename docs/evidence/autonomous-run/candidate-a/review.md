# Candidate A integrated review

Reviewed `6da5d9adc51751afb27236bfc27b769848a18d94`. Disposition: **needs revision**.

No repository source changes. Evidence types and missing gates are explicit below.

## Executed evidence

- 44 focused engine/provider/store/renderer tests passed; traceability passed.
- Dev and Stable bundles both identify `6da5d9a`; review used an immutable git archive once the coordinator advanced main.
- Real engine + Map-backed store exact replay returned original receipt/current state with no extra write.
- Browser private preview, campus revision with labeled mock provider, private corruption recovery and protected flag-off display were inspected.
- At 669x951 and 400x951 preview layouts had no document horizontal overflow or undersized visible primary buttons; private SVG/map revisions and 13 segments matched.
- Stable startup showed nine meters and no page errors.
- Live Qwen, physical Duo, complete withheld corpus, full browser lifecycle/T1-T8, CI and deployment remain unverified.
- The 184-test full-suite pass and host compatibility pass are coordinator-supplied evidence, not a fresh independent full-suite run.

## Findings

### R1 P1: Malformed capability JSON throws

Location at Candidate A: `src/engine.js:865`.

Replace a valid component capability with {"toString":null,"valueOf":null}. validateProgram throws Cannot convert object to primitive value.

Focused fix: Check string type before trusted-key lookup or coercion.

Status: Open; prior preflight.

### R2 P1: Inherited identity names pass checks

Location at Candidate A: `src/engine.js:971;1274`.

previewProgram presenter toString returns ok with nonfinite high cost/delivery odds. An offer for bridge/member toString throws in lobbying.

Focused fix: Use typed, own-property identity checks and actual council membership.

Status: Open; prior preflight.

### R3 P1: Malformed saved entries are accepted then throw

Location at Candidate A: `src/engine.js:749;1251`.

A fresh v4 save changed to proposals:[null] passes isSupportedSave. A grant command throws reading q.id.

Focused fix: Validate saved collection entries and reject malformed state before dispatch/migration.

Status: Open; prior preflight.

### R4 P1: Cosmetic revision renews factual credit

Location at Candidate A: `src/engine.js:1149`.

Pitch This plan adds 0.8 walkability to Okafor, rename only the title, repeat the same pitch. Both earn strong credit: 1.7 then 2.5 points.

Focused fix: Keep freshness revision binding, but deduplicate factual credit by stable factual content.

Status: Open; prior preflight.

### R5 P1: Inherited loading routes grant false trusted behavior

Location at Candidate A: `src/engine.js:975;935;1076`.

For campus-loading, __proto__, constructor and toString are not own routes but preview, provider interpretation and revision commit accept them. College counter clears and upkeep drops from service-lane 10.2 to 8.2. Ordinary missing-route rejects.

Focused fix: Use the trustedRoute helper consistently across preview, effects and resident evaluation.

Status: Fails Candidate A; coordinator reports fixed in aeaae2c / 88a0900 for Candidate B retest.

### R6 P1: Protected flag-off save displays a replacement town

Location at Candidate A: `src/workspace.js:25;src/ui.js:1731`.

Real flag-off engine rejects v4 during decode. load returns state:null; startup uses E.newGame. Browser A retains four saved proposals but displays a fresh two-proposal legacy agenda with End 2027. Save bytes remain unchanged. Earlier progressed fixture reproduced saved 2033/revision42 versus displayed 2027.

Focused fix: Show a protected-save landing/validated metadata summary. Do not run composed state through the off simulation or fall back to a fresh town.

Status: Open; prior protected-display review.

### R7 P1: Campus stakeholder objections are not shown

Location at Candidate A: `src/ui.js:894`.

Normal typed revision using a labeled mock provider selects the real campus-entrance route. Engine stakeholder college_liaison is counter/delivery_conflict. UI shows only freight_operator agree and enables confirmation. College reasons never appear.

Focused fix: Render named stakeholder evaluations and concessions separately from the single controlling authorizer.

Status: New browser finding; screenshot campus-response.png.

### R8 P1: Duplicate policy components stack the generic benefit

Location at Candidate A: `src/engine.js:852;973;docs/composition-balance.md:51`.

Two components a,b, both policy quantity1 area0, are accepted on plots[]. Effects double from walk1/safety1/afford0.5 to walk2/safety2/afford1. Documented rule is one generic operating program.

Focused fix: Validate program-wide sum of policy quantities <=1, preserving the cross-project active-policy guard.

Status: Confirmed E5 follow-up; writer slot pending.

### R9 P1: Revision context omits relevant recorded project history

Location at Candidate A: `src/composition-requests.js:165`.

Approve and build History witness garden with access:true, table/reopen farm-access on the same site next year, ask to retain the prior recorded access commitment. Runner returns ready; prompt has no project record, commitment provenance or scoped history. The built record exists and overlaps the target.

Focused fix: Pass bounded engine-verified relevant project/commitment records and source references into revision context and ground any historical assertions.

Status: New provider/history finding; G4.5.

### R10 P2: UI recovery assumes a stronger private schema than the store

Location at Candidate A: `src/workspace.js:180;src/ui.js:851;847;932`.

writeDrafts and readDrafts accept {id:broken,versions:[{}]}. In an isolated A browser, opening Private workspace throws Cannot read properties of undefined (reading length); no workspace renders. Public/private bytes remain unchanged.

Focused fix: Validate the UI recovery envelope and version fields defensively. Show recovery-unavailable and preserve bytes, pending text and invalid plots; do not silently discard/normalize.

Status: Confirmed for Goodall.

### R11 P2: Diagnostics lose the exact engine rejection rule

Location at Candidate A: `src/composition-requests.js:76;src/qwen-diagnostics.js:11`.

Eight workplace units in area0.1 fail density; area2 on a one-plot site fails total site capacity. Both return/log only site_infeasible at validation, with no fieldId or validator-rule identifier.

Focused fix: Add an allowlisted validator-rule field retaining area_capacity versus site_capacity_exceeded through diagnostics and export, without private values.

Status: New diagnostics finding; X5.

## All 34 criteria

PASS identifies deterministic/unit/mock/static or bounded browser evidence stated in the row. It does not imply live Qwen, physical-device, or deployed acceptance. UNVERIFIED retains the missing required evidence.

| Criterion | Result | Evidence / limitation |
|---|---|---|
| G1.1 | PASS | Unit typed/mock preview plus normal manual private browser preview; public revision remained 0 and initiative unused. Live interpretation is X1. |
| G1.2 | PASS | 13 capabilities/seven families and generic components/conditions verified in exact-target engine tests. Trust defects remain R1/R5/R8. |
| G1.3 | PASS | Private SVG and map carried identical revision and 13 layout segments; renderer projection tests passed. |
| G1.4 | PASS | Exact ordered plots, cumulative shared capacity, retention and occupied-site accounting tests passed. |
| G1.5 | FAIL | Malformed JSON boundary throws instead of controlled rejection (R1); generalization corpus remains pending. |
| G1.6 | UNVERIFIED | Trusted-program extension passes at engine layer; full provider/UI extension lifecycle awaits QA. |
| G1.7 | UNVERIFIED | Withheld corpus was not opened or altered by reviewer; first-pass QA/live-provider result pending. |
| G2.1 | UNVERIFIED | Three-edit engine tests pass; complete normal typed browser sequence awaits QA. |
| G2.2 | UNVERIFIED | Alternatives implementation inspected; complete two-alternative round-trip awaits QA. |
| G2.3 | PASS | Requested preview visibly precedes resident evaluation/confirm control; counter and authorization unit tests pass. Stakeholder omission is R7. |
| G2.4 | FAIL | Malformed private recovery crashes instead of recovery-unavailable (R10). Other cancellation/stale unit cases pass. |
| G2.5 | FAIL | Known assigned private-baseline/delta work remains absent from Candidate A; Goodall Candidate B work. |
| G2.6 | FAIL | 4/8/128KiB limits pass storage fixtures, but structurally invalid UI recovery entries remain accepted (R10). |
| G3.1 | FAIL | Campus stakeholder evaluation is computed but not available in the normal response UI (R7). |
| G3.2 | FAIL | Engine computes contrasting operator/college evaluations; UI hides the college result (R7). |
| G3.3 | FAIL | A campus routing concession changes engine costs/stance, but stakeholder re-evaluation is not displayed (R7). |
| G3.4 | FAIL | Inherited routes pass as trusted route evidence (R5); other gate/controller unit cases pass. |
| G3.5 | FAIL | Cosmetic revision renews repeated factual credit (R4). Numeric-negation/string-value corrections pass. |
| G3.6 | PASS | Receipt/member/type/fingerprint/pruning and no-rescore checks pass in engine/provider mock tests. Live response remains X1. |
| G3.7 | PASS | Caps/quota and separate offers/grants/votes pass deterministic tests; repeat protection defect is R4. |
| G4.1 | PASS | Real engine plus store/in-memory storage commit consumes once; exact replay returns applied:false and no write. |
| G4.2 | UNVERIFIED | Deterministic concurrency/replay tests pass; real browser T1-T8 evidence is pending independent QA. |
| G4.3 | PASS | Engine accepted/pending/built program/layout/conditions preservation and migration tests pass; real-engine/store replay also checked. |
| G4.4 | UNVERIFIED | Renderer delivery projection tests pass; normal browser approval-through-delivery observation not performed in this read-only review. |
| G4.5 | FAIL | Built project record exists, but relevant history/commitment provenance is absent from revision context (R9). |
| G4.6 | PASS | Exact-target deterministic three-strategy 12-year test passes with real votes/finances/election wins and semantic opportunities. |
| G4.7 | UNVERIFIED | Engine 3x12-year coverage passes; normal first-term and later-year browser sequence awaits QA. |
| X1 | UNVERIFIED | Live Qwen blocked on measured shader-f16/runtime capability; no AI-ready verdict. |
| X2 | UNVERIFIED | Cached model/offline lifecycle and physical Duo airplane-mode acceptance remain unverified; device absent. |
| X3 | UNVERIFIED | Preview screens inspected at 669x951 and 400x951: no horizontal overflow or undersized visible primary buttons. Complete keyboard/state coverage awaits QA. |
| X4 | FAIL | Protected display R6, malformed saved entries R3 and private recovery R10 remain. Explicit account import is known assigned Candidate B work. |
| X5 | FAIL | Exact validator reason is lost for distinct engine errors (R11); seven-day/date/safe-export baseline remains supporting evidence. |
| X6 | FAIL | Trusted-boundary defects R1/R2/R3/R5 plus policy duplication R8 remain despite engine-owned numerical rules. |
| X7 | UNVERIFIED | Review and bundle target pinned exactly to Candidate A. Final QA/CI/deployment and external evidence gates remain pending. |

## Known assigned work

- G2.5 private baseline and deltas: Goodall / Candidate B.
- Explicit account import: Goodall / Candidate B.
- R5 route fix: coordinator reports aeaae2c integrated as 88a0900; Candidate A remains failed and Candidate B must be retested.

## Approval-review boundary

Automatic approval review rejected clicking Put on agenda because this review is READ ONLY and the action would mutate durable browser game state. No indirect execution or workaround was used. Normal browser commit/delivery is therefore unverified here; independent QA evidence remains required.
