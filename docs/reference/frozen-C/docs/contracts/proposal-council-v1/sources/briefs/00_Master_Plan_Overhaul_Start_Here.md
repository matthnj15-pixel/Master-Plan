# Master Plan · Proposal and council overhaul

## Start here

Use the five handoffs as one work package in [matthnj15-pixel/Master-Plan](https://github.com/matthnj15-pixel/Master-Plan). Fetch current `dev`, read `AGENTS.md`, `CLAUDE.md`, `docs/requirements.md`, `docs/decisions.md`, and the branching rules, and record the exact revision. The observed Qwen session and planning baseline used `18dded6`. Respect any newer work.

**Launch instruction for Codex**

> Start with Kickoff and Planner. Read all five briefs. Run the code audit and persona research in parallel as read-only work. Return one audit with the current player paths, findings, proposed requirement changes, contract decisions, and implementation order. Treat the two approved player decisions below as settled. Resolve routine implementation details in Planner. Surface only remaining product decisions that materially affect behavior. Implement the overhaul in gated slices after the audit and contract review. Use separate worktrees and the repo's Dev and Stable release rules.

## Approved product decisions and council direction · November 10, 2026

1. **Private drafts come first.** I can explore multiple alternatives before using my annual initiative. A successful **Put on agenda** action consumes the initiative for that town and year. Drafting, previewing, and canceling leave the public agenda and initiative availability alone.
2. **Resident proposals are negotiations.** I can preview a feasible edit and see its consequences. The proposer may agree, counter, or refuse when the proposal affects a concrete interest tied to their persona. Their answer should tell me what matters and what might change their position. Apply an authorized revision only when I confirm it.
3. **Council members respond in character.** They react to the argument I make about the current proposal. Their priorities, exposure, relationships, and relevant recorded history shape their response. The engine determines persuasion credit, support, the vote, and consequences.

The game is about planning an existing town through development, redevelopment, and preservation. Qwen helps interpret ideas, negotiate changes, and express character reactions. The engine validates plans, generates forecasts, and resolves town outcomes. The player decides when to post, accept an edit, lobby, and call the vote.

## Handoffs and dependencies

| Brief | Primary owner | When it can start | What it hands back |
|---|---|---|---|
| **01 · Audit and engine** | Read-only reviewer for the audit, then one engine builder and contract owner | Audit now. Engine work follows contract review. | Current behavior and gaps, requirement changes, one versioned contract and seeded fixtures, engine tests and migration evidence |
| **02 · Proposal and council experience** | Frontend builder | Plan and sketch now. Build against frozen contract fixtures. | Touch-first private drafting, plan comparison, negotiation, and council UI |
| **03 · Qwen orchestration** | Provider builder | Review the captured failure and design evaluation cases now. Wire the adapter after the contract is frozen. | Bounded requests, typed results, recovery, diagnostics, and provider evaluation |
| **04 · Persona research and behavior** | Read-only persona researcher, then scenario-content builder | Research and character briefs now. Map approved profiles to the frozen stance contract before implementation. | Source-backed fictional profiles, counteroffer and refusal conditions, council priorities, and contrast fixtures |

Start with `master-plan-orchestration` and `master-plan-planner`. Assign named sibling agents for engine, frontend, and Qwen using `master-plan-builder` when the contract is stable. Give each writer an isolated worktree and one owner per path. Assign shared schemas and state changes to the engine owner, and reserve cross-cutting wiring for the integration owner. Respect the latest repository concurrency rules. Route concrete regressions to the owner or bug squasher. Give a separate QA agent using `playwright-interactive` and a Reviewer using `master-plan-reviewer` the same integrated revision and criteria.

## Proposed delivery order

1. **Audit and research.** Map each normal player action to its actual provider, engine, view, and commit path. Compare current behavior with the accepted decisions. Produce a persona dossier in parallel.
2. **Freeze the smallest shared contract.** Approve the seeded town fixtures, read-only candidate preview, explicit commit actions, and stable result codes. Record approved decisions separately from proposed mechanics in the requirement table.
3. **Prove one playable loop.** Draft a mixed-use plan on selected land, explore an alternative privately, post once, negotiate a revision to an existing NPC proposal, pitch one proposal to contrasting council members, call the vote, and advance the year to inspect the result. Integrate engine and fixture contracts before dependent UI and AI behavior. Use separate reviewable Dev PRs where the dependency boundaries permit.
4. **Expand after the first slice.** Apply the contract to more existing proposals and persona archetypes. Treat major capability additions, agenda generation, and plan history as separately scoped work when the audit establishes a need.

## Gates

- Requirements map to an observable outcome, a verification method, and an evidence owner. Reconcile IDs against the live requirements file. Preserve existing MP-015, MP-023–028, MP-030–035, MP-059–066, and relevant MP-070–075 intent and status. Add proposed criteria for private drafts and proposer consent where needed.
- Recheck the same fixture and exact runnable revision at 669 × 951 and 400 px wide using normal touch entry points. Keep deterministic fixture, browser, real provider, and iPhone Duo evidence separate.
- For the Duo check, launch the cached Dev app in airplane mode. Record model, build, real generation time, validation result, and the exact action applied. Require a usable draft, revision, and persona-grounded pitch. Verify vote and year resolution with the model unavailable as a separate test.
- Preserve save compatibility and channel separation. Follow repo CI and Dev deploy gates. Nate retains Stable release approval.

The defaults proposed in these briefs include the first playable fixtures, private draft recovery, and a bounded first persona roster. Review those in Planner alongside the audit. The approved annual initiative and proposer decisions stand.
