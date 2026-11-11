# Candidate A sustained QA findings

Target: `6da5d9adc51751afb27236bfc27b769848a18d94`. Product source is read-only. All actions below use ordinary touch-emulated browser controls after one authorized ordinary seed-31 replacement. Qwen is off.

## SUST-A-01 — Incorrect delivered-project lifecycle / decision history

Severity: medium. G4.4/G4.5, MP-079. Route presentation to Goodall; coordinator/engine owner should confirm whether stored legacy record stages also need correction.

Reproduction: approve full Main Street bridge rehab with $260K cash; approve College Avenue distribution loading with $270K cash after spending one explicit favor on Weaver; resolve 2027; inspect the Courier, Plans list, then each project's history.

Observed: Courier says both opened. `year1-resolved.json` confirms both in `built`, `pending:[]`, bridge `done:1` and campus project record `stage:'built'`. Plans list nevertheless labels campus `open`; bridge detail reads `Main Street bridge repair · construction` and `Decision: approve in 2027 · cash funding · 2 council votes in favor.` Bridge approval was the normal mayoral action, not a council vote.

Expected: actual delivery state and authority/action remain consistent across Courier, Plans, records and reload. A mayoral approval must not display forecast support as a formal council vote.

Evidence: `screenshots/08-year1-report-{669,400}.png`, `screenshots/10-bridge-history-after-delivery-{669,400}.png`, `year1-resolved.json`, `actions.jsonl`; additional Plans/campus history captures follow.

Likely boundary: `projectHistoryHTML` prefers `p.status` over `p.done`; built composed snapshots retain `status:'open'`. `projectRecordHTML` prints stored legacy stage and any `decision.votes` tally without distinguishing approve from vote. These are observations of the frozen source, not a fix or final integrated verdict.

**Ownership split confirmed:** UI list status and approve/vote wording belong to Goodall. Persisted legacy `projectRecords.stage` belongs to the engine/coordinator's assigned fix owner: `engine.js:1302` records construction, while `resolveYear` at line 369 completes records only through `completeProgram` for `pj.program`. Legacy bridge/park records are left behind when the actual project enters `built`. The year-six observation still retains the bridge's construction stage. A UI-only label correction is insufficient for this engine-owned subfinding.

## SUST-A-02 — Physical legacy revision mislabeled as no-site policy

Severity: medium presentation inconsistency. G1.3/G2.4, MP-077. Route to Goodall alongside known private-preview work; final retest on Candidate B if applicable.

Reproduction: in year three, open Old Mill Memorial Park after its 50% grant; choose Preview a revision, open Activities and operating conditions, change canopy from 2 to 3, Preview these controls.

Observed: editor says `0 exact plots selected · no site for a policy` and its Choose plots button is disabled, while the requested drawing correctly depicts the four Old Mill plots and canopy 3. Cost correctly changes $305K → $328K. Canceling and reopening preserves accepted canopy 2 and the public plan. Thus this is an incorrect site label, not a demonstrated site mutation.

Evidence: `screenshots/18-private-legacy-editor-entry-{669,400}.png`, `screenshots/19-private-canopy-preview-{669,400}.png`, action log and the read-only before/after public-plan comparison. Likely UI boundary: legacy proposals carry `site` rather than explicit `plots`, but the editor uses draft.plots.length for its label instead of engine-resolved geometry.

## SUST-A-03 — Pre-stance primary action is not pinned within thumb reach

Severity: medium, MP-057 / X3. UI owner has been informed that every composition stage needs a main footer; retest on B. This is a primary-action reach failure despite adequate individual target size.

Reproduction: open the actual year-four Neighborhood work and services opportunity → Preview a revision → Activities and operating conditions → Preview these controls. Scroll the dialog through normal wheel input. The scrolling element is `.pane`, not `.sh-body`.

At pane scrollTop 1974 and viewport height 951, `Hear resident response` is static with no sticky footer ancestor: at 400px it spans y=2331.69–2378.69; at 669px y=1774.81–1821.81. It is 47px high but completely outside the viewport. Numeric target-size/no-overflow checks alone therefore do not pass MP-057.

After the normal Hear resident response action returns agree, the later Confirm public revision stage *does* have a sticky `.composition-primary` wrapper: y=891–939 at both widths, with pane scrollTop 3054. This stage passes the sampled reach check; it does not rescue the missing pre-stance footer. The private preview was canceled, with no public confirmation or plan mutation.

Evidence: `reach-requested-final-{400,669}.json`, `reach-agree-pinned-{400,669}.json`, `screenshots/27-mp057-pre-stance-missing-footer-{400,669}.png`, `screenshots/26a-mp057-confirm-pinned-{400,669}.png`, `actions.jsonl`.
