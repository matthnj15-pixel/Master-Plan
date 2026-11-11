# Autonomous run findings and fixes

Final source: `09f924bb305999932e8b74383f9d3f759f95895c` (Candidate E).
[Independent review](evidence/autonomous-run/candidate-e/review.md):
**32 PASS, 0 FAIL, 2 UNVERIFIED; ready for experimental Dev integration.**
There are no known independently fixable source blockers. Local verification
passes 248/248 tests with zero skips, traceability, and both channel builds.

| Finding | Final fix and verification |
|---|---|
| S1–S7: storage races, channel keys, replacements, invalid formats, account epochs and private conflicts | Slot-stable native locks, explicit generations, atomic envelopes, channel-derived keys and account epochs. Actual browser T1–T8 and controlled account-import/replication checks pass. Protected data retains its original bytes. |
| R1–R2: malformed capability and inherited actor identities | Typed own-property checks reject safely; real council membership and author identity remain engine-owned. |
| R3: malformed collections, nested scenarios, display fields and layouts | Consumed state types validate before admission. Persisted composed geometry must equal the pure engine layout; building metadata/plans validate too. Independent D checks reject 44 geometry/grid corruptions under both flags and accept six valid/migrated cases. |
| R4: cosmetic revisions and pruned historical fact credit | Stable fact keys remain effective independently of bounded receipts. Verified revision/receipt provenance recovers earlier keys; unrecoverable history uses an explicit conservative policy. Authentic unchanged-A fixture and independent pruning reproduction pass. |
| R5: inherited route names | A shared trusted-route lookup rejects prototype names across preview, effects, resident evaluation and commands. |
| R6: feature-off save appeared to be a fresh town | Protected-save landing summarizes the saved town and hides gameplay without rewriting its bytes. |
| R7: hidden stakeholder objections | Named stakeholder reasons appear separately from the one controlling authorizer; a stakeholder concern grants no veto. |
| R8: stacked generic policy benefits | Program-wide policy quantity is limited to one, alongside the existing active-program guard. |
| R9: missing composed/legacy history | A combined maximum of three relevant records is checked against actual accepted snapshots, sites, revisions and decisions. Historical facts neither reprice occupied sites nor grant present authority. |
| R10: malformed private recovery and lost pending edits | Recovery validates its schema; pending controls/text/attempted plots survive separately from the accepted preview. Posting requires a valid new preview. |
| R11: missing precise safe diagnostic reasons | Fixed rule/field codes distinguish density, sharing and site failures. Historical-credit reason survives the actual engine/runner/export path; arbitrary code/private-text exclusions pass. |
| SUST-A-01/02/03: history, legacy site and primary-action reach | Actual built stage/cost/upkeep/decision replaces stale construction or fictitious votes; legacy park uses its exact four ordered plots; primary actions remain reachable at both portrait widths. |
| Original corpus/control failures | Rapid plot picking, explicit submit semantics and focused clarification/scope feedback were corrected generally. The original first-pass failures remain preserved; the final code/browser corpus passes 12/12. |

The [historical ledger](evidence/autonomous-run/historical-findings.md) retains
initial findings and the fix/retest sequence. A–D reviews remain at their actual
revisions; final E explicitly carries unaffected evidence forward by source hash.
The complete acceptance mapping is in [the evidence ledger](autonomous-evidence.md).

Live Qwen inference, cached real-model/physical Duo offline operation, and the
real Claude artifact/account host remain external evidence gates. Active-space
adaptive reuse is an explicit capability limit; preservation retains assets
outside active allocations. CI, merge and deployed full SHA are recorded in
[Dev PR #17](https://github.com/matthnj15-pixel/Master-Plan/pull/17).
