# D — Engine and executable fixture builder

User authorization: freeze approved R1.1 and start D/F in separate worktrees from C. Implement this bounded engine slice now, commit locally and report; do not stop at planning.

Exact base C: 028ad21a5b7923fc1af46c37e4319c2dfa0d34e8.
Branch: feature/proposal-council-engine.
Owned worktree: /workspace/worktrees/master-plan-engine.
Historical audit A: 18dded6207f7217021d84b42aad6cc8e00b68f43.
Frozen contract: docs/contracts/proposal-council-v1/README.md and linked contract.md, acceptance.md, fixture-specification.md, commands.schema.json, freeze-manifest.json.
Manifest SHA-256: e4cc241e217b26ee10091c2d68a8eaabb746c6f2b564f66b97c0802db3da98d3.
Read briefs 00/01 in that directory's sources/briefs and approved persona rules as needed. Load master-plan-builder via skills.read package c7/6af33242ab308191a703dbcd2e5117e2/master-plan-builder; read AGENTS.md, CLAUDE.md, docs/codex-team.md and relevant repo requirements/decisions.

You are the backend writer. Confirm exact HEAD/branch/worktree and clean starting state; verify manifest hashes before edits. Protect all other worktrees. Send the coordinator an early acknowledgement, then implement autonomously. Maximum two source writers: you and sibling F. No additional source-writer delegation.

Exclusive write ownership:
- src/engine.js
- tests/engine.test.mjs
- tests/scenario.test.mjs
- new tests/proposal-contract.test.mjs
- new tests/fixtures/proposal-council-v1.cjs (the executable factory added AFTER C)
- new engine-only fixtures under tests/fixtures/proposal-engine-*.
Do not edit any other path without asking the coordinator to assign ownership. In particular do not edit frozen JSON/schema/docs, src/ui.js, provider/request/diagnostics code, renderer/index, flags.json, build scripts, package files, existing reconstruction/plans/old-save fixtures. Root owns shared wiring/flags/requirements/integration in later serial windows. Return any material contract issue before changing a shared interface; pinned C must remain byte-identical.

Implement the approved shared engine slice, not browser UI. The exact frozen JSON/schema and normative README override historical type shorthand. Expose ENGINE.createProposalSession({engine: ENGINE, activationId, storageRef}) and approved session methods. Host supplies immutable StorageRef; keep engine pure and DOM/storage/provider-free. Context rejects mismatch between captured storageRef and supplied state gameId/revision; after durable publication/load the host creates a fresh session. Implement read-only detached previews, scope acknowledgment, deterministic proposer stance and authority/gates, engine-truth pitch evaluation, funding preview, engine-owned binding, and atomic returned-state commits for the 13 action schemas. Do not let numerical/model fields confer authority.

Private drafts never spend initiative. Successful explicit post adds one entry/spends once atomically, even when funding must later be bonded. Exact ordered plots/roles, complete plan, same-site alternatives, requested versus counter, singular controlling authorizer and all required recognized gates remain enforced. Use authored farm/distributor conditions only in trusted fixtures; no new campaign veto, licensing or economics. Preserve original persuasion caps, two-pitch quota, vote/funding and year rules.

Persist v4 game/proposal/competition revisions, action high-water and bounded receipts with canonical original-command SHA-256, actor/member/controller and stored original result. Exact retained replay after reload precedes current activation/key checks, returns original result with current state unchanged; changed command under same ID rejects. Wrong-member/type/fingerprint reaction receipt rejects. Old/pruned IDs never execute. Check every action-specific schema and recomputed semantics, stale direct writes and duplicate/stale actions.

Define/implement the pure v4 migration and writer-boundary semantics in engine-owned code and meaningful tests. Preserve older saves and legacy flag-off APIs. v4 physical namespaces/fence, exact immutable legacy backup and monotonic slot generations must match C. Real navigator.locks/localStorage/account wiring and browser two-page tests belong to later UI/integration E, not your src/engine.js. Exercise a deterministic two-writer boundary harness to prove prepare/read/check/write/publish, losing action and failed/retried write behavior against frozen T1–T8 expectations. Record what still requires actual browser testing. No pretend CAS/lock fallback.

Use C's pinned inputs, expected rules and mock shapes unchanged. Add real executable factory/assertions now; distinguish declarative/mock and measured outputs. Include the canonical sample fingerprint 7dfc7c5d175af6e36a021cf0482b83ac39d581d927c9a3a6e6fd288c09f0b888 and replay/identity/gate/old-save/exact-site/agree-counter-refuse negatives. Prioritize a complete runnable seeded loop and focused assertions covering your C01–C17/C21/C22/C24 portions. Name tests with matching existing MP IDs. Do not mark browser/provider/device criteria passed.

Publish the executable factory and API readiness to root/F early, then complete your slice. Keep old APIs compatible so F can test from the same C without merging your changes. Run relevant pure tests, full repository checks when available, traceability and both channel builds as appropriate; report missing Playwright/device evidence candidly, not as success. You may install necessary dependencies in your worktree; do not edit package/lock files unless root grants ownership.

Commit your owned changes to your assigned branch locally. No push/PR/merge/deploy. Return exact commit, changed paths, test commands/results and counts, migration impact, acceptance coverage and blockers to root. Root integrates engine/fixtures before F and later UI/persona.
