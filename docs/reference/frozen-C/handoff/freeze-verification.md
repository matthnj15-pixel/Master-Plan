# C static verification

Revision: `028ad21a5b7923fc1af46c37e4319c2dfa0d34e8` (R1.1 C).

- Exact-byte SHA-256 validation: all 31 pinned artifacts and three baseline dependencies passed.
- JSON Schema 2020-12 checks passed for all 13 closed Command/ActionSemantic/Receipt branches; missing required and unknown command fields reject.
- Eight embedded representative mock samples validate against registered schemas. Mock shapes are not implementation results.
- 149 unique inputs pair exactly with 149 expected-rule rows, including two-tab T1–T8 cases.
- Sample command independently canonicalized in Node and checked by coordinator: exactly 1,445 UTF-8 bytes, no BOM or newline, fingerprint `sha256:7dfc7c5d175af6e36a021cf0482b83ac39d581d927c9a3a6e6fd288c09f0b888`.
- Normative local document links resolve; original approved source bytes remain preserved.
- `git diff --cached --check` passed before commit. Contract worktree clean after commit; original dev checkout untouched.
- `npm run trace` passed at C (55 requirements,48 accepted; registry status unchanged).
- `npm run build -- --channel dev --out /tmp/master-plan-C-dev` passed at C.
- `npm run build -- --channel stable --out /tmp/master-plan-C-stable` passed at C. Both builds use the existing script's sandbox fallback commit label `local`; they are compile checks, not a published or runnable integrated overhaul artifact.

No new executable fixture/assertion or gameplay code is included in C. New implementation, replay-after-reload, actual browser two-tab/save migration, normal touch flow, live providers, CI/deployment and physical Duo checks remain unverified. D adds executable engine fixtures/assertions after C. D/F are running on separate worktrees from exact C with exclusive ownership; later W1 and integrated I are unset.
