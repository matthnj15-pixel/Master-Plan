# Autonomous run findings and fixes

Coordinator-owned ledger. Candidate A is immutable
`6da5d9adc51751afb27236bfc27b769848a18d94`; subsequent fixes require a common
Candidate B for independent QA and Reviewer. A fixed source finding is not a
final acceptance pass until its affected checks run on the integrated target.

| ID | Finding / concrete check | Owner | Status / evidence |
|---|---|---|---|
| S1 | Delayed replacement without a pre-read expected generation rewinds local progress. | Coordinator | Fixed c62580f; explicit expectation required. |
| S2 | Channel defaults could use Dev keys under Stable lock. | Coordinator | Fixed c62580f; derive keys and reject mismatches. |
| S3 | Outgoing unsupported state and malformed/empty/null/newer legacy data could pass. | Coordinator | Fixed c62580f/235dd5f; 11 storage tests, independent original-case recheck. |
| S4 | Account A→B→A could acknowledge an obsolete upload. | Coordinator | Fixed c62580f; account epoch checked before/after upload. |
| S5 | Private entry corruption and stale workspace updates could appear valid. | Coordinator / Reviewer | Outer/entry shapes and limits fixed c62580f. Reviewer checking full UI draft/version defensive handling separately. Preserve bytes and live input on corrupt recovery. |
| S6 | Replay mismatch got masked by stale generation. | Coordinator | Fixed c62580f; retained/pruned-ID identity rejection precedes freshness. |
| S7 | Feature-off protected v4 could look like a fresh town. | Reviewer | Assess explicit protected-save landing/summary; never price a composed save using legacy rules or imply reset. No bytes may change. |
| E1 | Candidate revision excluded exact site identity. | Engine | Fixed 40ce66e / integrated 915ebb7. |
| E2 | Numeric negation/string claim values could earn unsupported credit; false finding lacked field identity. | Engine | Fixed 40ce66e; per-claim semantic fields persist in actual receipt. Reviewer checking remaining cases. |
| E3 | Failed votes remained open; grouped winner/funding behavior needed explicit binding. | Engine | Fixed 5aafe88/40ce66e; preserve actual rejection/tabling and require reviewed winner funding. |
| E4 | Inherited `__proto__` / `constructor` loading routes were accepted. | Engine | Confirmed on A; fixed aeaae2c / integrated 88a0900. One trusted route helper, 24 composition +33 legacy engine +4 scenario tests pass. |
| E5 | Repeated operating review could stack identical policy benefits. | Engine / Reviewer | Cross-project repeat blocked in 40ce66e. New confirmed probe: two policy components in one first program bypass the one-active-program restriction and double benefits; reviewer assessing required per-program limit. |
| E6 / R1 | JSON capability object with null toString/valueOf throws during rejection. | Engine | Next bounded fix: check string type before key lookup/coercion; malformed JSON-shaped inputs return reasons. |
| E7 / R2 | Inherited presenter/member identities produce accepted NaN forecasts or throw. | Engine | Next bounded fix: typed own-property actor identity and actual council membership at every action boundary. |
| E8 / R3 | v4 proposals:[null] passes save recognition then grant dispatch throws. | Engine | Next bounded fix: validate saved collection entries and state before dispatch/migration; preserve valid old-save fixtures. |
| E9 / R4 | A title-only revision renews credit for an unchanged factual claim. | Engine | Next bounded fix: retain revision freshness but deduplicate by stable factual content, not cosmetic revision hash. |
| T1 | Three legacy browser reload assertions failed after a new storage-writing init script. | Coordinator | Fixture setup fixed 0acb7a2: set legacy flag in build metadata. All three original assertions pass; full c652bee suite 184/184 plus trace passes. |
| U1 | Private alternatives lacked an identifiable baseline and synchronized physical/member support deltas. | Frontend | Active: current-state same-site baseline, changed components/conditions, money/upkeep/capacity/effect/support deltas. |
| U2 | Deliveries label markup and full coordinate dump impaired mobile controls. | Frontend | Active: close label; show count/plot summary with exact geometry retained in engine. |
| U3 | Project history dumped raw JSON/full hashes. | Frontend | Fixed in 8cfbc77 / aed2350: readable project provenance and short revision labels. Verify actual display. |
| U4 | No explicit generation-bound account import in composed mode. | Frontend | Active: capture generation before remote read, preview current/legacy source, explicit replacement, safe stale rejection. Keep account namespaces and original legacy source protected. Real host remains separate gate. |
| U5 | Menu mutated composition engine flag immediately while UI captured startup flag. | Frontend | Active: persist next-launch override; keep loaded runtime internally consistent until reload. |
| U6 | Preview success and failed persistence lacked linked diagnostics. | Frontend / Provider | Active: retain opaque request ID; sanitized application/persistence event/result code and applied outcome. Diagnostics failure cannot affect play. |
| U7 | Clarification questions/omissions were dropped by UI in favor of generic blocker. | Frontend | Active: display bounded validated questions/omissions, preserve input/site and explicit subset acknowledgment. |
| U8 | First corpus run timed out in rapid adjacent plot selection; normal double-tap threshold also runs while picking. | Frontend / QA | Reproduce gesture classification; picking must retain exact ordered taps. Preserve outside-picking zoom gestures. Most first-pass cases stopped before inference. |
| U9 | Typed-revision submit selector also matches agenda action in the form. | Frontend / QA | Explicit intended submit and type=button for non-submit actions; inspect actual DOM/form ownership. Preserve the initial failure and use uniquely meaningful controls. |
| U10 | Composition stages do not always pin the primary action while body scrolls. | Frontend / Sustained QA | Actual 400px screenshot shows long legacy controls with no review/confirm footer. Verify required primary region bounds in each stage at both widths, beyond target-size checks. |
| U11 / R7 | Campus operator agrees while the computed college counter is hidden. | Frontend | Render named stakeholder evaluations/reasons/concessions separately from the one controlling authorizer. A stakeholder concern is not a veto. |
| P1 | Hosted JSON-only transport was rejected for absent local admission API. | Provider | Fixed f37b6e7 / integrated 6da5d9a. Hosted context remains explicitly unverified; server rejection is recoverable. |
| P2 | Clarify final diagnostic outcome was dropped. | Provider | Active follow-up. |
| P3 | Definition reductions required unpatched template to fit first. | Provider | Active follow-up: apply bounded patch before final site preview. |
| P4 | Reaction timeout gave unavailable instead of grounded deterministic fallback. | Provider | Active follow-up; cancellation/staleness must still prevent attachment. |
| P5 | Composition stale/cancel/claims/reaction/grammar-fallback coverage incomplete. | Provider | Active focused tests. Initial 64 compatibility checks pass at f37b6e7. |
| P6 | Loaded-tokenizer reflection verified only with mocks. | Provider | Read actual pinned WebLLM 0.2.87 source; verify config/pipeline/conversation/tokenizer assumptions without claiming live inference. |
| P7 | Draft/revision context omitted full condition vocabulary and scoped trusted routes. | Provider | Active: compact closed conditions/routes/exposure facts and explicit unmodeled reuse boundary; remove irrelevant template context where appropriate. |
| P8 | Capacity/density/sharing errors collapsed to one category without precise safe rule. | Provider | Active: closed `ruleId` plus safe `fieldId`, never private component IDs/raw reasons. Add persistence codes needed by U6. |
| P9 / R9 | Revision context omits relevant built project history and actual commitment provenance. | Provider | Add at most three engine-verified relevant project records/conditions/stage/source IDs; never model-created history or authority. |

Independent A evidence: actual two-page T1–T8 all pass (real engine, storage and
Web Locks; controlled account callback). First withheld twelve-case evaluation
recorded 1 pass / 11 fail at unchanged source/catalog; most stopped before
inference at plot selection. Preserve original artifacts and retest same cases
after general control/feedback fixes. Three typed browser lifecycles are owned
by Socrates. Sustained first-term,
real election and later opportunity browser coverage is owned by Pasteur.

External gates remain explicit: no configured Qwen q4f16 inference without
`shader-f16`; no physical Duo; actual Claude account/artifact publication needs
the real host. Preservation retains assets outside active allocations; adaptive
reuse inside an existing building is an unmodeled boundary requiring honest
scope handling, not silent demolition.
