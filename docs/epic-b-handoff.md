# Epic B: offline AI and proposal drawings

## Kickoff and Planner

Acceptance authority: Nate's November 9, 2026 launch brief. Base: `4e008e6` (`origin/dev` at kickoff on November 10). No open PRs or engine branch existed at kickoff. Epic A subsequently merged as `3570a48`; Epic B was rebased onto that exact dev revision before final combined review. Read `AGENTS.md`, `CLAUDE.md`, requirements, decisions, branching rules and mechanics/preferences research in `docs/design-handoff.md`. Visual/interaction reference: `site/index.html`, `site/style.css`, `site/showcase.js` (Old Mill teaser).

Goal: a dev Pages player can compare illustrated alternatives, draft offline and revise with Qwen while seeing the exact engine-accepted difference. Morning play-test readiness includes a green PR, verified dev deployment and a physical-device checklist; mocked integration is separate from device evidence.

### Ownership

| Role | Assignment and owned paths |
|---|---|
| Coordinating Codex | `feature/qwen-plan-pipeline`; shared `src/ui.js`, `src/index.html`, `scripts/build.mjs`, `flags.json`, requirements, integration/offline browser tests, PR and remote changes |
| `project_manager` | Read-only Kickoff/Planner, acceptance mapping, interfaces and dependencies |
| `backend` | Separate `feature/qwen-plan-runner` worktree; new `src/plan-requests.js`, orchestration/provider tests, `src/offline-ai.js` |
| `frontend` | Separate `feature/plan-illustrations` worktree; new `src/plan-renderer.js`, renderer tests and shared `tests/fixtures/plans.cjs` |
| `senior_reviewer` | Read-only integrated SHA review from original brief and acceptance criteria before builder conclusions |
| `bug_squasher` | Exclusive smallest fix after a concrete failure, followed by independent re-review |
| Epic A | `src/engine.js`, scenario rules, persisted save shape, time and opportunity contract |

### Compatibility interface

`PLAN_REQUESTS.createPlanRunner({engine})` captures immutable bounded request data from current engine reads. `run({mode,state,provider,intent,plots,proposal,isCurrent})` returns a typed result, blocker or ready candidate. `accept(result,{isCurrent,apply})` rechecks town/turn/proposal/site and UI/provider identity and consumes a ready result once. Request IDs/retries stay in memory. The coordinator applies accepted fields through current engine entry points and saves only then. Qwen's existing adapter serializes all inference and unload on its one engine.

`PLAN_RENDERER.render({state,proposal,engine,existing})` reads validated proposal fields, `plotsOf`, `initiativeRoles`, `effectsOf` and the real grid; returns an SVG exhibit/legend or `null` for old-renderer fallback. Shared engine-shaped fixtures cover both Old Mill alternatives, a mayoral mixed-use draft, a revision and a policy-only item.

No full save is sent to the model. No new engine/save schema, costs, clock, approvals or construction mechanics are introduced. This adapter currently asks for chosen plots or a recognized named place for physical drafting. Omitted, unknown or ambiguous locations get a recoverable clarification with the original intent editable and a choose-plots action. Arbitrary model-chosen placement is not claimed as covered by this slice. Renderer and request modules are independent.

### Sequence and evidence

1. Backend: bounded requests and strict validation; Frontend: accepted fixtures and independent deterministic rendering.
2. Coordinator: normal-entry draft/revision recovery and comparison UI; flags and single-file packaging.
3. Integration: actual service-worker/runtime fixture with mocked replies, strict repair/exhaustion, site preservation, stale replies, portrait layouts, stable/flag-off/quick/Claude compatibility.
4. Independent Senior Reviewer; route concrete failures to owner or Bug Squasher; re-review exact fix.
5. Green feature CI, merge into dev, green dev CI/Pages and live revision verification. Nate retains stable release approval.

The acceptance matrix is recorded in `docs/requirements.md` under Epic B. MP-070–073 remain Planned overall.

### Engine dependency

Epic A merged as `3570a48` during final remote refresh. The branch was rebased onto it, preserving MP-074, scenario labels, v3 save loading and its untouched engine. Request and renderer adapters consume state-aware engine reads and the detached `scenarioContext` boundary; the original Millbrooke flows run against the combined branch. Epic A provides no eligible turn-event opportunity contract yet, so that optional seam remains a deterministic source-event fixture, not post-election gameplay. Recheck latest dev before merge and re-review any further contract changes.

## Evidence ledger

Product/test revision `35ff33c199baa96dc8f28eac1aaa67490809f5bb` passed the final local gate: **93 tests**, requirements traceability (53 requirements, 47 Accepted, 41 test-verified, 6 Play-test), dev and stable builds, and `git diff --check`. Both reversible flags are on only in dev. No engine, save format or dependency changes.

Senior Reviewer independently inspected the original integrated revision before builder conclusions, reproduced two blockers (unsited physical revisions and Old Mill/Kish Creek ambiguity), then verified both fixes. Final disposition on `35ff33c`: **ready for dev integration**, with real-device acceptance unverified. Independent checks included the full earlier suite (92/93 before a test-only Claude locator correction), all three corrected UI checks, both channel builds, traceability, focused reproductions and portrait inspection.

The real Pages shell, service worker and pinned provider adapter were tested with mocked model replies for offline cold relaunch, malformed/valid replies, finite repair, bridge regression, a different mayoral draft/revision, separated plots, stale/duplicate results, site-mode recovery and persistence. Normal-entry and isolated comparison checks cover 400 × 951 and 669 × 951, exact coordinates, both switching directions and Existing conditions, no save changes, touch targets, flags-off/AI-off and a mocked Claude capability path. These fixtures do not measure real Qwen inference, Safari storage, Home Screen cold launch or Duo memory/latency.

An unmocked Chromium install-path check at both widths reported WebGPU present but no adapter/shader-f16, then displayed “Offline AI needs Safari WebGPU with 16-bit shader support.” No real model download/generation or 1.5B-versus-3B performance is claimed. Model IDs remain `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` and `Qwen2.5-3B-Instruct-q4f16_1-MLC`, runtime WebLLM `0.2.87`. Hosted Claude Dev artifact publishing/runtime access was unavailable; it was not republished.

Optional event evidence uses source `fixture:year2:oldmill`, eligibility true, reason “Old Mill is eligible for review,” and a late eligible fixture originally against engine base `4e008e6`, then repeated on combined engine `3570a48`. No Epic A turn-event opportunity contract was available; no post-election behavior is claimed. The final plan flow is verified on the combined engine branch using the real scenario snapshot boundary.

The epic PR carries the final branch/merge SHAs, GitHub CI and Pages deployment records, verified dev URL and any remaining blocker. Stable release approval remains with Nate.

## iPhone Duo checklist

1. Online, open [dev Pages](https://matthnj15-pixel.github.io/Master-Plan/dev/) and check the revision badge. Keep `planRequests` and `planDrawings` on. Update the Home Screen app and download one Qwen2.5 model; wait for Offline AI ready.
2. Force-quit, enable airplane mode with Wi-Fi off, cold-launch from Home Screen. Record success and any Safari reload.
3. Draft “20 homes above two shops at the Old Mill lot.” Check the four actual plots and borough forecast. Record time to usable draft. Ask for a supported revision (green space or storefront count), record time, and compare the sketch, field confirmation and cost/forecast.
4. Ask for bridge walkways. Verify a specific blocker, unchanged repair scope and no claimed walkway. Retry with “Patch the deck for now”; check the $260K → $120K change.
5. In a separate town, advance to year two and compare Existing conditions, Memorial Park and Commons both directions. Check reviewed vs preview labels; switching does not change the vote. Repeat at narrow width when practical.
6. Record model ID/quantization, pinned WebLLM 0.2.87, OS/browser, draft/revision latency and reloads. Test 1.5B and 3B separately only when both run. AI off and flags off should leave quick options usable.
