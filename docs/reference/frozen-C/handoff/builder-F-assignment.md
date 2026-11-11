# F — Qwen task adapter builder

User authorization: freeze approved R1.1 and start D/F in separate worktrees from C. Implement this bounded AI adapter slice now, commit locally and report; do not stop at planning.

Exact base C: 028ad21a5b7923fc1af46c37e4319c2dfa0d34e8.
Branch: feature/proposal-council-qwen.
Owned worktree: /workspace/worktrees/master-plan-qwen.
Historical audit A: 18dded6207f7217021d84b42aad6cc8e00b68f43.
Frozen contract: docs/contracts/proposal-council-v1/README.md and linked contract.md, acceptance.md, fixture-specification.md, commands.schema.json, freeze-manifest.json.
Manifest SHA-256: e4cc241e217b26ee10091c2d68a8eaabb746c6f2b564f66b97c0802db3da98d3.
Read briefs 00/03 in sources/briefs and grounded context from brief04/profiles as needed. Load master-plan-builder via skills.read package c7/6af33242ab308191a703dbcd2e5117e2/master-plan-builder; read AGENTS.md, CLAUDE.md, docs/codex-team.md and applicable requirements/decisions.

You are the provider/request writer. Confirm exact HEAD/branch/worktree and clean starting state; verify frozen hashes first. Send root an early acknowledgement, then implement autonomously. Maximum two source writers: you and D. No additional source-writer delegation. D will add executable fixtures later; use C's frozen mock shapes immediately.

Exclusive write ownership:
- src/plan-requests.js
- src/offline-ai.js
- src/qwen-diagnostics.js
- tests/plan-requests.test.mjs
- tests/offline-provider.test.mjs
- tests/offline-ai.test.mjs
- tests/qwen-diagnostics.test.mjs
- new tests/proposal-tasks.test.mjs
- new provider-only fixtures tests/fixtures/proposal-provider-*.
Do not edit other paths without coordinator ownership. In particular no engine, UI/index/renderer, offline-worker.js, flags/build/package files, frozen JSON/schema/docs or D's executable factory/tests. Root owns shared wiring/integration in later serial windows. Return any material shared-contract issue before changing it; pinned C stays byte-identical.

Use bounded task-specific requests for interpret-draft, interpret-revision, extract-pitch-claims and optional expression tasks as frozen in contract. Preserve existing flag-off APIs while adding the new adapter exports locally as needed. Match the frozen engine Context/Candidate/Stance/Pitch/Receipt mock shapes; no parallel replacement engine APIs. Reuse installed Qwen cache and serialized generation queue, existing generation settings unless evidence warrants change. Do not require engine implementation to start.

Engine owns legal geometry/capabilities, forecast values, persona authority/stance, claim truth/credit, command semantic bindings/receipts, public edits/posts, quota, funds, votes and time. Model interprets intent/claims and expresses grounded canonical results. Never let model create/apply Command or ActionSemantic, self-score, authorize edits, satisfy gates or spend resources. Exact selected geometry stays engine-local; never silently relocate/filter/truncate or turn unsupported core intent into a generic substitute. Validate structure and intent fidelity separately using finite supported field/site/capability rules and bounded repair (at most one repair). Preserve original player input on failure, cancellation, retry or clarification.

Preserve ordering: feasible requested resident preview must be available for UI presentation before stance, refusal or counter expression. Distinct requested/counter candidates and one controlling authorizer; unresolved required gate remains blocked. Pitch sequence is extraction -> pure engine evaluation -> explicit durable commit by the host -> optional reaction from the retained pitch receipt. Wrong member/type/fingerprint must never attach a reaction, rescore or spend quota. Late/canceled tasks require current UI ticket+StateRef. Provider cancellation/failure must not block ordinary model-off vote/year play.

Ground bounded prompts in scoped engine facts/profiles/history with clear simulated/authored/belief/flavor labels. No full save/arbitrary transcript, private coordinates or hidden model state in ordinary exports. Add allowlisted safe correlated rule/stage/error codes, not raw validator strings or stacks. Receipt fingerprints/semantic bodies must not leak private payloads through diagnostics; correlation remains opaque. Keep original Duo rejection rule unknown unless directly measured.

Use C's pinned inputs/expected rules/mock shapes unchanged. Add meaningful parser/schema/intent/site/omission/unrequested-change/repair/stale/receipt-reaction privacy fixtures in your own new provider-only paths. Name tests with existing MP IDs. Track provider-specific measured numerators/denominators and latency only where truly exercised; fixtures are not live Qwen/Claude or Duo evidence. Your primary criteria are C07,C11,C18,C19,C22 and adapter portions of C09,C12,C21,C23,C24. Do not mark UI/storage/device acceptance passed.

Run relevant pure tests, traceability/full checks and builds as applicable, preserve existing provider tests. You may install dependencies in your own worktree; do not mutate package/lock files without root ownership. Send root an early API/test/fixture handoff so D/UI can integrate. Commit your owned changes locally; no push/PR/merge/deploy. Return exact commit, changed paths, checks/counts, measured provider ledger if any, integration notes and live Duo checklist/blockers. Root integrates D before your changes, then later dispatches UI/persona work.
