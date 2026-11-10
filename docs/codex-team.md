# Master Plan Codex team

The coordinating Codex owns integration and reports to Nate. The Project Manager helps organize the work. Nate owns product decisions, acceptance criteria, and stable releases.

| Role | When to use it | Primary ownership |
|---|---|---|
| `project_manager` | Work touches both layers or changes requirements, sequencing, or scope | Read-only plan with MP IDs, dependencies, file ownership, interfaces, and acceptance checks |
| `frontend` | Player-facing UI, map rendering, touch, or browser flows | Assigned UI, presentation, and browser tests |
| `backend` | Simulation, scenario data, validation, or saves | Assigned engine code, data and save contracts, and deterministic tests |
| `senior_reviewer` | Substantial changes or changes to simulation, save behavior, or shared contracts | Read-only review of the integrated revision |
| `bug_squasher` | A concrete regression or failed check needs focused diagnosis | Reproduction first, then an assigned fix and regression check |

## Assign and integrate work

1. **Start with scope.** For cross-layer work, explicitly spawn `project_manager`. Give every assignment the base SHA, goal, MP IDs where applicable, owned files, interface expectations, and a testable finish condition. Small one-file changes can stay in one thread.
2. **Name one writer per file.** Give each concurrent writer a separate worktree and branch off the same base. Default to two concurrent writers at most. Keep shared requirements, schema, flags, builds, and integration under a named owner. In particular, `src/ui.js` includes save wiring and presentation. Backend defines save semantics, and the assigned writer wires them into that file. Serialize changes if both layers need edits there. Keep unrelated working changes intact.
3. **Run independent work together.** On a cross-layer feature, spawn both `frontend` and `backend` when paths are separate and the interface is agreed. Frontend can use a deterministic fixture while Backend implements the contract. If the interface is unsettled, Backend supplies the interface and fixture first. Return contract changes to the coordinator before editing across the boundary.
4. **Review the integrated revision.** The coordinating Codex combines the work in dependency order, checks it against the latest `dev`, and runs the repo gates. Assign `senior_reviewer` the exact integrated SHA and acceptance criteria. For a confirmed issue, send it to the current owner or assign exclusive ownership to `bug_squasher`. Review again after the fix.
5. **Use one integration PR per feature.** The coordinating Codex owns pushes, PRs, merges, and deployment checks. Follow the repo’s branching and CI policy. If the session offers generic subagents only, use these same role instructions as their task briefs. If delegation is unavailable, perform the needed roles in sequence and report which checks were independent.

## Apply it to Scenario 01

The first Millbrooke slice is engine-led. Use Project Manager for the plan, Backend for scenario and save behavior, and Senior Reviewer for the result. Assign Frontend if the slice needs independent entry-point or scenario-label work. Use Bug Squasher for a concrete failure. On the later Old Mill proposal workflow, Frontend and Backend can work concurrently once they agree on site and revision IDs, validation, and the fixture.
