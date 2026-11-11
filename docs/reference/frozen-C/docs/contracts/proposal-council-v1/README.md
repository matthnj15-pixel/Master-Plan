# Frozen proposal and council contract R1.1

The user approved R1.1 and authorized commit C and the D/F wave. The Git commit containing this directory's freeze manifest is **C**; the coordinator records its full SHA in the external handoff after committing. The manifest does not contain its own hash or the containing commit's SHA. The historical audit base remains `18dded6207f7217021d84b42aad6cc8e00b68f43`; C is a contract/data commit, not a runnable overhaul or integrated revision I.

Normative artifacts:

- [Approved behavior and APIs](contract.md), [acceptance criteria](acceptance.md), [fixture specification](fixture-specification.md).
- [Exact command and receipt schemas](commands.schema.json), JSON Schema 2020-12, ID `urn:master-plan:proposal-council:commands:1`.
- [Fixture inputs](../../../tests/fixtures/proposal-council-v1.inputs.json), [expected rules](../../../tests/fixtures/proposal-council-v1.expected-rules.json), [mock shapes](../../../tests/fixtures/proposal-council-v1.mock-shapes.json).
- [Sample command](sample-command.json), [exact canonical JSON bytes](sample-command.canonical.json), [expected fingerprint](sample-command.fingerprint.txt), [vector metadata](sample-command-vector.json).
- [Mock receipt shape](sample-receipt.mock.json), clearly distinct from an observed implementation result.
- [Freeze manifest](freeze-manifest.json), with SHA-256 for each pinned artifact. [Freeze authorization](sources/user-freeze-request.md).

The frozen behavioral contract and JSON schemas are complementary: the schema defines exact wire fields; the behavioral contract and invariants below define their meaning. Source review prose is retained for traceability, including its earlier stage labels. The explicit freeze authorization here supersedes statements in source material that C has not yet been created or that builders remain held. It does not mark implementation checks passed.

## Per-action command schemas

Every command requires `contractVersion`, `type`, `actionId`, `actionSeq`, `base`, `expectedStorage`, and its action-specific `semanticBinding`. The schema has 13 closed branches. Every property declared by a branch is required, null is explicit where allowed, and unknown or action-inapplicable properties are rejected. There is no optional-field command bag. No model may create commands or numerical semantic bindings.

| Action | Required fields in addition to the common envelope | Exact schema definition |
|---|---|---|
| post-draft | candidateKey, scopeKey, controllingAuthorizerId=mayor | command_post_draft |
| confirm-revision | target, candidateKey, stanceKey, controllingAuthorizerId, scopeKey | command_confirm_revision |
| confirm-operating-condition | target, candidateKey, stanceKey, controllingAuthorizerId | command_confirm_operating_condition |
| commit-pitch | target, memberId, pitchKey | command_commit_pitch |
| spend-favor | target, memberId | command_spend_favor |
| spend-earmark | target, memberId, amountK (integer 1–150) | command_spend_earmark |
| call-vote | target, fundingChoiceKey | command_call_vote |
| approve-mayoral | target, fundingChoiceKey | command_approve_mayoral |
| apply-grant | target | command_apply_grant |
| table-proposal | target | command_table_proposal |
| reject-proposal | target | command_reject_proposal |
| set-tax-rate | taxRate=lower/hold/raise | command_set_tax_rate |
| advance-year | no additional fields | command_advance_year |

Each `command_*` schema refers to its corresponding `semantic_*` definition. Each semantic binding has `schema`, `type`, `actorId`, `memberId`, `controllingAuthorizerId`, and `target`, plus the complete action-specific accepted choice. Complete physical plans use `{kind, fields}`, with every current KINDS field present and strictly typed. New mayoral posts are initiative plans. Operating changes are limited to the frozen fixture capabilities and are not enabled in the normal campaign merely because they pass structural validation.

## Engine invariants beyond JSON Schema

Structural validation never grants permission or proves a claim true. D must assert these invariants against the actual state and engine-issued objects:

1. `contractVersion` is `mp.proposals/1`. Canonical action ID is `mpa1.<base64url(UTF-8 gameId), no padding>.<actionSeq>`, with no leading zeros. Its game/sequence match the original command. A new action uses the current high-water mark plus one.
2. `base` and `expectedStorage` identify the same game/revision. Channel/slot/generation come from the freshly read authoritative envelope under the stable slot lock, not caller inference. A retained exact replay is resolved first without consulting revoked keys. New mutations require the current activation and dependencies.
3. Semantic action type, target, member and controller agree with all command fields and live issued references. The engine recomputes the semantic choice; a correct digest of a forged body is still unauthorized.
4. For post, actor/controller are mayor and the semantic target is null. For resident/operating confirmation, actor/controller are the one actual proposer/operator and the semantic target equals the command target. All other player actions use actor mayor; pitch/favor/earmark additionally bind the affected member. No receipt has an absent actor. A stakeholder statement cannot authorize another actor's edit.
5. Every declared blocking gate is satisfied by a current recognized record at the required rule stage. Callers cannot mark gates satisfied. Unresolved/unsupported consent or conditions block UI and engine confirmation. The commitment being created by this action is not a circular prerequisite.
6. Complete accepted plans, ordered selected plots and ordered role mappings match the issued candidate and current legality. Revisions preserve author, site and every field outside the explicitly accepted patch. ScopeKey and acknowledged omission IDs match the actual scope acknowledgment. Different array order is a different command.
7. Operating-only confirmations do not change physical fields or selected geometry. Their entity/field/capability is available in the trusted scenario and controlled by the authorizer. Farm/distributor metadata remains fixture-only; zero represented economic delta does not claim real operations are costless.
8. Claim results, evidence spans/fact revisions, specificity, tone, addressed priorities and capped application match the engine evaluation; member/target are identical. A false absent-feature claim earns no factual credit. No pitch spends an offer or calls a vote.
9. Favor/earmark binding matches the explicit offer and current resources. Earmark amount is an integer in the existing engine range, never silently clamped at the command boundary. Funding choices match each actual option and the decision route/winner. The engine resolves the vote and funds/builds once.
10. Tax/year semantic durableBase matches command.base without activationId; selected tax rate agrees across both fields. Grants/table/reject bind the exact target/action and current eligibility.
11. Receipt target and originalResult target agree; other duplicated result fields also agree exactly. Proposal actions have a non-null result target, including the newly created init<turn>; tax/year targets are null. Receipt subject matches the validated binding. Original results are stored data, not rebuilt from current facts.
12. Receipt state refs are durable only. New game/state revisions start at zero; imported existing proposals start revision zero; a newly posted public proposal starts revision one and subsequent changes increment it. Every successful authoritative action increments stateRevision/high-water; storage replacements also increase the slot generation. Receipt trimming never trims the high-water mark.

## Canonical sample and fingerprint

The vector is a full `post-draft` command for the frozen B1 market/housing inputs. It is a **normative wire/canonicalization vector**, not evidence that a preview key was issued or a game action executed. Its original input text is listed only in vector metadata to reproduce the intent digest.

Canonicalization follows R1.1: validated exact schema, finite JSON values, negative zero as zero, UTF-16 object-key sorting, unchanged strings, preserved arrays, UTF-8 without a BOM, whitespace or trailing newline. `sample-command.canonical.json` is exactly the bytes to hash. The expected result is:

```text
sha256:7dfc7c5d175af6e36a021cf0482b83ac39d581d927c9a3a6e6fd288c09f0b888
```

The fingerprint is not an input property of Command. Persist it, subjects and originalResult in each receipt. Exact retained replay after reload hashes the original command, returns its stored result with applied=false, and leaves current state unchanged. Changed body/subject under the same ID is rejected. A pitch reaction requires the same retained pitch receipt, member and fingerprint. A pruned receipt cannot apply again but no longer promises its original result.

## Frozen data versus executable work

C pins declarative inputs, expected rules, mock shapes, the schema/vector, acceptance criteria, original source briefs and B0/B1 measured **old-engine** references. Every other sample is labeled mock/declarative. No executable fixture factory, assertions, application implementation, provider measurement or browser test is included in C.

After dispatch, D adds executable engine fixtures/assertions and implementation within its owned paths. F implements the bounded adapter against this same contract and frozen mock shapes. If either needs a material interface change, return it to the coordinator; do not silently edit pinned artifacts. New results are measured at their implementation revisions and later W1/I. Mock values never become measured evidence by being loaded into a test.

The session API is exposed as `ENGINE.createProposalSession({engine: ENGINE, activationId, storageRef})`; session methods are the approved R1.1 methods. The trusted host supplies a detached immutable StorageRef from the persisted envelope (initial primary generation one); the pure engine does not read DOM/storage to discover it. Context generation rejects a state whose gameId/stateRevision disagrees with that captured ref; the host must recreate the session, not mix snapshots. After a published authoritative snapshot or load/replacement, the host creates a fresh session with current StorageRef and activation, revoking old issued keys. Replay still uses the original historical command before live-key checks. Engine canonicalization/binding/validation helpers stay engine-owned. Provider-local orchestration exports may be added without changing this shared engine contract or existing flag-off APIs. Actual DOM/storage/Web Locks wiring belongs to the integration/UI owner, not the pure engine.

Frozen rule tables may use `factsMissing` for the pre-existing required-fact guard and `always` for the final fallback. These are deterministic presence/fallback shorthands (the latter equals an empty `all`), not arbitrary executable predicates. Other permitted operators remain the approved comparisons, membership, all and any. A missing required fact produces clarify before an otherwise matching material stance.

The user approved first-slice scope and local private recovery defaults unchanged. Existing caps, vote/year rules, channel isolation, v4 format guards and rollback protection remain required. C/W1/I evidence stays separate. Stable release approval remains with Nate.
