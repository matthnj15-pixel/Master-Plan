# R1.1 declarative freeze review

**Gate:** readiness to commit contract freeze C and then dispatch D/F from C, as authorized by the user. **Review location:** `/workspace/worktrees/master-plan-freeze`, branch `feature/proposal-council-r1.1-freeze`, starting at `18dded6207f7217021d84b42aad6cc8e00b68f43`. This is a read-only static-artifact review using `master-plan-reviewer`; only this external report is written by the reviewer. It is not runtime, browser, provider, migration, two-tab or device acceptance.

## Static schema and vector verification

The schema declares exactly 13 closed Command branches, 13 corresponding ActionSemantic branches and 13 corresponding Receipt branches. Every declared top-level property is required and additional properties are forbidden; nullable fields remain explicitly present. Shared command fields are `contractVersion`, `actionId`, `base`, `actionSeq`, `expectedStorage`, `semanticBinding` and `type`.

| Action | Required action-specific command fields |
|---|---|
| post-draft | candidateKey, scopeKey, controllingAuthorizerId:mayor |
| confirm-revision | target, candidateKey, stanceKey, controllingAuthorizerId, scopeKey |
| confirm-operating-condition | target, candidateKey, stanceKey, controllingAuthorizerId |
| commit-pitch | target, memberId, pitchKey |
| spend-favor | target, memberId |
| spend-earmark | target, memberId, amountK |
| call-vote | target, fundingChoiceKey |
| approve-mayoral | target, fundingChoiceKey |
| apply-grant | target |
| table-proposal | target |
| reject-proposal | target |
| set-tax-rate | taxRate:lower/hold/raise |
| advance-year | no additional fields |

Root closed two routine shape gaps during review: post-draft's complete accepted plan is specifically an initiative; successful proposal/member receipts require a ProposalRef target while tax/year receipts require null. Neither is a new product decision. Runtime cross-field equality/currentness and trusted-engine rules require the normative invariants alongside structural JSON Schema; schema validity alone never authorizes a mutation.

The reviewer independently parsed `sample-command.json` in Node, recursively sorted object keys by JavaScript's UTF-16 ordering, preserved array order, encoded with JSON rules, and hashed the UTF-8 result with Node's SHA-256 implementation. The computed canonical string is byte-identical to `sample-command.canonical.json`: **1,445 bytes, no BOM or trailing newline**. Its fingerprint matches both the text file and the vector metadata:

```text
sha256:7dfc7c5d175af6e36a021cf0482b83ac39d581d927c9a3a6e6fd288c09f0b888
```

The vector's original intent text also independently hashes to the sample semantic binding's intent digest:

```text
sha256:743c707e83cb40f842ba9c6ad91bb8ffc8be86dc07ab3919e0408ee861e1ea48
```

These are static canonicalization-vector checks only. The sample candidate key is explicitly illustrative, and the receipt is labeled a mock shape, not a measured successful post or proof of live key issuance.

## Final artifact and manifest inspection

**Disposition: ready for the user-authorized freeze C and D/F dispatch. No remaining blocking static contract/data finding.** The coordinator committed C locally as **`028ad21a5b7923fc1af46c37e4319c2dfa0d34e8`**, tagged `proposal-council-r1.1-C`. This reviewer verified the clean freeze worktree at that exact commit and its artifact contents. This clears the freeze/interface handoff gate, not runtime acceptance or release readiness.

The normative README closes the dynamic invariants that JSON Schema cannot express: canonical action-ID/base/sequence agreement, current envelope/session identity, repeated subject/target/controller equality, recognized gate evidence, exact ordered geometry, unchanged physical program for operating-only confirmations, authoritative credit/resources/funding, and identical duplicated receipt/originalResult fields. The explicit factory is `ENGINE.createProposalSession({engine: ENGINE, activationId, storageRef})`; the host supplies immutable persisted-envelope metadata and recreates the session after publication/load. DOM/storage/locks stay outside the pure engine. Retained original-command replay still precedes live-key checks.

The static data contain **149 unique input cases with 149 matching expected-rule rows**, covering F1–F9 and all eight mandatory same-browser-context two-tab scenarios T1–T8. The full required roster is present: literal market/housing, same-site alternatives, existing resident agree/counter/refuse, working-farm access/title/stand variants, campus freight/public-sales/unsupported-consumption distinctions, and contrasting council claims/reactions. Stale/duplicate/gate/authority, exact plot order, partial scope, old save/rollback, provider recovery and private-workspace cases are included.

Rules are declarative finite predicates and explicit counter operations, not executable model code. Farm/distributor conditions remain authored fixture-only facts, preserving supported physical wrappers and labeling unmodeled economics. Composite existing-actor profiles now distinguish baseline observed numerical/identity fields from authored authority, beliefs and voice. Earmark command bounds are explicitly 1–150, separate from the legacy internal zero clamp. The approved recovery defaults remain four drafts/eight versions/128 KiB/no expiry/local-only.

Independent JSON Schema 2020-12 static checks accepted the root command schema and the mock-shapes schema; **all eight embedded mock payloads validate** against their corresponding definitions and registered root command URN. The command-reference sample points to the independently verified root canonical vector. These checks establish shape coherence only. New candidate/stance/credit/receipt/envelope samples are expressly mocks/declarative; the incomplete envelope sample is labeled a projection rather than a loadable save. Only the separately pinned B0/B1 files are measured old-engine reference observations.

The manifest audit independently recomputed exact SHA-256 and byte counts for **all 31 pinned artifacts and all three baseline dependencies**. There were no mismatches, duplicate artifact paths or uncovered new contract/static-fixture files. The manifest excludes itself and defines C as its containing Git commit, with the actual commit SHA recorded externally; there is no self-referential SHA/hash requirement.

```text
C
028ad21a5b7923fc1af46c37e4319c2dfa0d34e8

freeze-manifest.json
e4cc241e217b26ee10091c2d68a8eaabb746c6f2b564f66b97c0802db3da98d3

commands.schema.json
41601be06d581daca17a03f0005dadf85ac3d3f1321e2815f51959db211e2f0a

proposal-council-v1.inputs.json
cd4ca1b25fbb268a7dddd6075385f816576c8eb8604f8145869ac353fa9df9bc

proposal-council-v1.expected-rules.json
f89965ca96542c4ac561ab711f59368b6dde309dd87d3c6c2b13b58735ff0e9b

proposal-council-v1.mock-shapes.json
d77eaa803c4062abce332e4c79a3c727905d1310bba6c5f1d1269db31b147846
```

C changes only contract/source/acceptance documentation, the requirements/decision records and three static fixture JSON files. It changes no application source, feature flags, executable factory or test implementation. Original approved review bytes remain preserved separately from cleaned normative freeze copies. D implements executable engine fixtures/assertions after C; F consumes the same immutable contract/mock shapes. Any material mismatch returns through the coordinator rather than editing pinned inputs to fit an implementation.

No new game transition, migration, actual replay, browser lock/two-tab race, provider generation, Duo cold launch, deployment or release was verified by this static review. All new implementation criteria remain Unverified. Historical A, frozen C and future W1/I remain distinct.
