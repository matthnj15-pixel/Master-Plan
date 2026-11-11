# Handoff to Goodall and Coordinator

Candidate A: `6da5d9adc51751afb27236bfc27b769848a18d94`. [Report](report.md), [findings](findings.md), [summary](assertions.json), 190-line normal-action journal (raw local: `/workspace/qa-sustained/actions.jsonl`). All 127 pinned source hashes remain unchanged. Existing evidence/game observations were preserved after the registry reset; no play was restarted.

Normal progression passed: 65.7% authentic first-term election win; actual generated year-five housing approved 3–2 for $140K cash without a favor, delivered, then identical observed durable state after year-six reload ($575K reserve). These are Qwen-off browser results, not live AI/device acceptance.

## Goodall — UI-owned fixes / B retest

1. **SUST-A-01/UI:** Plans labels a delivered composed project `open` because `src/ui.js:962` prefers the copied `status` over actual `done`/delivery. Project history also prints “2 council votes” for the mayor-approved bridge because `projectRecordHTML` renders a forecast tally as a formal vote. Show actual lifecycle and distinguish `decision.action:'approve'` from a formal `vote`. Screenshots 10/11/12 and `year1-resolved.json` establish the discrepancy.
2. **SUST-A-02:** physical legacy park revision says `0 exact plots selected · no site for a policy`, despite the correct four-plot drawing. Resolve displayed geometry through the engine's legacy site adapter; do not relocate/mutate the public plan. Preview canopy 2→3 correctly priced $305→$328; cancel preserved public canopy 2. Screenshots 18/19 establish the issue.
3. **SUST-A-03 / MP-057:** provide the main bottom action at every composition stage, including pre-stance resident review. At pane scrollTop 1974, Hear resident response is y=2331.69–2378.69 (400px) / 1774.81–1821.81 (669px), outside a 951px viewport despite a 47px target. After agree, Confirm public revision correctly stays y=891–939; preserve that behavior. `reach-requested-final-*.json`, `reach-agree-pinned-*.json`, screenshots 27/26a provide exact bounds.

## Coordinator — separately assign the engine-owned legacy record defect

**SUST-A-01/ENGINE is a persisted-state issue, not merely a wrong UI label.** `src/engine.js:1302` sets the legacy project's record to `stage:'construction'`. `resolveYear` at `src/engine.js:369` calls the record-completion path only for `pj.program`; legacy bridge/park delivery reaches `built` without advancing its compact project record. The bridge is demonstrably delivered (`built[].done=1`, Courier opening) while its record remains construction, including the year-six observation.

Assign this exclusively to the engine owner or a named serial fix owner. Complete legacy records from actual delivery and preserve accepted values/outcomes; determine how already-delivered supported saves reconcile from trusted built/done evidence. A UI-only status override would leave downstream history/negotiation data wrong. Review the non-vote forecast tally semantics separately while Goodall prevents false formal-vote presentation.

## Focused Candidate B verification

Use the exact B source/build manifest shared with QA/reviewer. Recheck: (a) delivered legacy bridge and composed campus lifecycle in Plans/detail and persistence; (b) mayor approval versus formal council vote wording; (c) legacy park editor's engine-resolved four plots through preview/cancel; (d) actual primary-action rectangles at every stage while the pane is scrolled at 400×951 and 669×951, including the currently passing agree-confirm stage. Label any staged UI fixture as fixture evidence. Checkpoint files here are inspected state projections, not full import saves.

No full first-term repeat is needed for purely localized display/footer fixes. Re-run progression if changed engine/save behavior materially invalidates A's normal path. Socrates retains T1–T8 and withheld-corpus ownership. AI/device gates remain explicit.

Routing transport: this durable handoff and commentary identify Goodall and Coordinator. Direct agent messaging is unavailable in the current post-reset tool registry; do not treat this as an acknowledged agent message. Coordinator can dispatch the separate engine fix and link this evidence to B's review.
