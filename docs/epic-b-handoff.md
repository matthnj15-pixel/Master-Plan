# Epic B: offline AI and proposal drawings

## Kickoff and Planner

Acceptance authority: Nate's November 9, 2026 launch brief. Base: `4e008e6` (`origin/dev` at kickoff on November 10). No open PRs or engine branch existed at kickoff. Read `AGENTS.md`, `CLAUDE.md`, requirements, decisions, branching rules and mechanics/preferences research in `docs/design-handoff.md`. Visual/interaction reference: `site/index.html`, `site/style.css`, `site/showcase.js` (Old Mill teaser).

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

Use the current UI compatibility adapter while Epic A is open. Recheck latest dev and open PRs before final integration. If engine contracts/shared paths change, rebase onto merged engine dev and re-review. Optional turn events are covered by a deterministic source-event fixture until an eligible engine contract exists; this is not evidence of post-election gameplay.

## Evidence ledger

Pending implementation and independent review. Automated browser/provider fixtures are not real Qwen inference, Safari, Home Screen cold launch or iPhone Duo measurements. The Claude Dev artifact requires separate publishing/runtime access.

## iPhone Duo checklist

1. Online, open [dev Pages](https://matthnj15-pixel.github.io/Master-Plan/dev/) and check the revision badge. Keep `planRequests` and `planDrawings` on. Update the Home Screen app and download one Qwen2.5 model; wait for Offline AI ready.
2. Force-quit, enable airplane mode with Wi-Fi off, cold-launch from Home Screen. Record success and any Safari reload.
3. Draft “20 homes above two shops at the Old Mill lot.” Check the four actual plots and borough forecast. Record time to usable draft. Ask for a supported revision (green space or storefront count), record time, and compare the sketch, field confirmation and cost/forecast.
4. Ask for bridge walkways. Verify a specific blocker, unchanged repair scope and no claimed walkway. Retry with “Patch the deck for now”; check the $260K → $120K change.
5. In a separate town, advance to year two and compare Existing conditions, Memorial Park and Commons both directions. Check reviewed vs preview labels; switching does not change the vote. Repeat at narrow width when practical.
6. Record model ID/quantization, pinned WebLLM 0.2.87, OS/browser, draft/revision latency and reloads. Test 1.5B and 3B separately only when both run. AI off and flags off should leave quick options usable.
