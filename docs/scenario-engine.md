# Scenario foundation — Epic A

## Kickoff and Planner

Working base: `4e008e6511961e8940b63bf6b8824aecb58d6c26` (`dev`, fetched November 10, 2026), matching the reviewed two-team split. No existing engine branch or open PR was found at kickoff. Integration branch: `feature/scenario-engine`. The full mechanics research brief was not accessible; Nate's detailed assignment is the acceptance baseline. The Old Mill showcase was inspected as a same-site alternative reference; its drawings are concept art.

Goal: normal game entry loads Scenario 01 · Millbrooke through a scenario input, with existing deterministic gameplay. One tiny reconstruction fixture proves the shared engine accepts a different map, date and approving authority. No scenario editor, provider orchestration, drawing redesign or pacing change is included.

The Project Manager ran Kickoff and Planner read-only before Builder assignments. Backend owns scenario/state semantics and supplies the interface before dependent Frontend work. A separate Senior Reviewer reviews the integrated revision. The coordinating Codex owns integration, remote actions and deployment verification. Nate retains release approval for `main`.

## Seam audit

At the base, `newGame` embeds town/starting state and schema v2. `genGrid`, `N`, `SITES`, `PARCELS` and `PLACES` combine campaign geography with shared rules. `P_DEFS`/`SCHEDULE` own opening cases; emergency bridge generation also uses them. `effectsOf` and `plotsOf` have no state argument, so scenario context must reach downstream approval, forecasting and resolution as well as initialization. Approval mutates cash and construction immediately; prerequisite rejection must occur before those mutations.

`s.year` is a one-based simulation ordinal used by random keys and historical records. UI calendar conversion is hardcoded as `2026 + ordinal`. Both local and account loaders explicitly accept only v1/v2. Town names also appear in headings, prompts and newspaper fallback copy. Save keys are compatibility identifiers and must remain unchanged.

Preserve the existing seed keys, meter arithmetic, council scoring, grant timing, opening proposals and annual resolution. Extract scenario inputs without adding a new gameplay experiment; existing flags remain unchanged. MP-062 checks the flag-off path.

## Packages and file ownership

| Package | Owner and paths | Dependency / checks |
|---|---|---|
| Acceptance and integration | Coordinating Codex: requirements, decisions, this document, PR; `flags.json`, `scripts/build.mjs`, `tests/build.test.mjs` if required | Requirements before tests; final full suite, both builds, CI and Pages |
| Foundation / saves / fixture | Backend: `src/engine.js`, scenario data, engine tests and deterministic fixtures | Publish interface first; parity, reconstruction, migration and round trips |
| Entry / labels / save wiring | Frontend: `src/ui.js`, `src/index.html`, `tests/ui.test.mjs` | Wait for engine interface; stable/dev normal entry, advance/reload and portrait checks |
| Integrated review | Senior Reviewer, read-only | Exact integrated revision and the matrix below |

Backend and Frontend use separate worktrees from the same base. At most two writers run concurrently. Coordinator documentation/packaging edits are serialized with writer work. A concrete defect goes back to the assigned owner or to Bug Squasher with exclusive write ownership.

### Epic B and shared paths

- Epic A owns simulation, scenario data, calendar/turn resolution, persisted saves, eligibility, agenda rules and deterministic engine tests.
- Epic B owns provider orchestration, Old Mill comparison presentation, proposal drawings and the illustrated Propose my own workflow.
- `src/ui.js` and `src/index.html`: Epic A Frontend owns the scenario label and save-wiring patch first. Epic B must rebase and serialize subsequent edits; `src/ui.js` includes both saves and presentation.
- `scripts/build.mjs`, `flags.json`, `docs/requirements.md` and decisions: this integration coordinator owns foundation edits. Later Epic B edits must be reconciled in order, preserving IDs and statuses.
- Engine lands first when Epic B uses its new boundary. Epic B can finish fixture-backed work during engine review. One integration coordinator rechecks refs, rebases dependent work and reviews the combined revision before merging. Do not overwrite another team's branch.

## Acceptance matrix

| IDs / status | Observable check | Evidence |
|---|---|---|
| MP-001–002, MP-006 / Accepted | Millbrooke starts in 2027 with preserved population, map, openings, annual turns, 32-turn horizon and four-year election | Existing regressions and scenario default tests |
| MP-010–011, MP-074 / Accepted | Seed 2027, no actions and a fixed first-term action sequence preserve baseline results except approved presentation names/new metadata | Genuine base-revision parity fixtures; histories, finances, parcels, projects, decisions and causes |
| MP-074 / Accepted by assignment | Another map, date and authority; housing blocked until approved repair completes, then shared engine approves and builds housing on the correct cells | Deterministic test-only reconstruction fixture; blocked attempts leave state unchanged |
| MP-060 / Accepted | v1/v2 supported saves retain progress, projects, parcels, finances and pending decisions; current saves round trip | Genuine prior-schema fixture, migration and continuation checks |
| MP-061–062 / Accepted | Stable/dev retain separate browser keys and account documents; no new experimental rule on stable | Build checks and browser reloads; existing default-off tests |
| MP-053–057, MP-074 / Accepted | Ordinary entry starts, advances and reloads on both channels at 669 × 951 and 400px | Automated Chromium plus existing touch regressions |
| MP-015, MP-022–024, MP-030–035 / Accepted | Bounded fields, forecast ownership, Old Mill competition, council and authored initiative behavior remain intact | Existing regression suite; read-only context check |

MP-070–073 stay Planned. Pacing, a full second campaign, term-two agendas, growth/service catalogs, live annexation and post-defeat role decisions are follow-ups, not requirements delivered here. A future pacing comparison should demonstrate annual decision windows versus eight seasonal advances before asking Nate to choose.

## Epic B read-only contract

The foundation publishes a detached context with scenario ID, turn ordinal, calendar date, map dimensions, legal site IDs and geometry, relevant town facts, proposal identity/kind and editable field schemas. Turn identity is sufficient for this slice; it does **not** detect same-turn plan edits or promise stale-result rejection. Revision enforcement belongs to the later plan/turn contract package. Context data is informational: engine validation, pricing, approvals and forecasts remain authoritative.

Exact API examples and verification results are recorded after integration below.
