# Master Plan · Code audit and engine contract

## Assignment

Begin with a read-only audit of current `dev`. Treat `18dded6` as the revision in the observed Duo logs and rebase the audit on the current repository state. Follow **00 · Start Here** for approved decisions and gates. Once the audit and contract are reviewed, one engine owner implements the approved slice.

## Audit the real player paths

| Path | Follow from start to finish | Questions to answer |
|---|---|---|
| **New proposal** | Choose plots and enter text → provider → candidate validation → preview → agenda posting | Where does the current flow consume the annual initiative? What data is recoverable after cancel, reload, or model error? Can the engine represent the requested uses on the exact site? |
| **NPC proposal edit** | Open resident proposal → type revision → provider → feasibility and presenter decision → preview → confirm | Which proposals support typed changes? What can alter a plan today? Can feasible changes preview independently from whether the proposer agrees? |
| **Council and vote** | Open a proposal → pitch to member → interpret claims → calculate support → call vote → advance year | What uses persona data today? Which inputs change lean, relationship, or favors? Where are the majority rule and final map outcomes decided? |
| **Shared seams** | Build and flags → runtime → diagnostics → persistent state → renderer → reload | Trace actual Dev Pages and offline Home Screen paths. Record quick controls, stable flags, save compatibility, and Claude compatibility where applicable. |

Read the actual UI entry points, engine functions, plan request runner, Qwen adapter, schema and validation logic, persona data, save serializers, and tests before describing behavior. Record an evidence link and fixture for each finding. Classify gaps as player flow, provider availability, interpretation, response shape, unsupported game capability, simulation rule, rendering, or persistence. Separate existing regressions from newly requested features.

The captured Duo run loaded cached Qwen 1.5B and produced both the draft reply and repair. Both failed plan validation. The export did not retain the exact validation rule, prompt, or reply. Treat that as evidence of a failed request pipeline on that device and a gap in diagnostic detail. Leave the underlying rule unknown until evidence identifies it.

## Freeze a shared proposal contract

Use existing engine representations where they cover the behavior. These are required boundaries and illustrative names, not a mandated module layout.

| Boundary | Minimum data or behavior |
|---|---|
| **Read context** | Town or save identity, scenario and year, site and selected plot IDs, proposal ID and revision when editing, relevant town or site revision, supported actions and constraints, and scoped actor facts |
| **Candidate preview** | Typed requested actions, accepted or unsupported parts, assumptions or blockers, before/after plan and geometry, cost/upkeep and impact forecasts, current support forecast, and change explanations. Preview is read-only. |
| **Presenter response** | Engine-checked stance and reason tied to this candidate and actor. A counter points to an explicit candidate and names the concessions. Separate authority or ownership constraints from an actor's preference. |
| **Council pitch** | Current proposal revision, council member ID, player argument mapped to supported claims, evidence and reason codes, engine-calculated changes and limits. Formal vote is a separate action. |
| **Commit receipt** | A confirmed game action with a stable action identity, current revision checks, what was applied, result revision, and a failure code when applicable. Repeating the same confirmed action cannot apply it twice. |

The engine owns placement, feasibility, capacity, financials, impact and support forecasts, persuasion credit, vote outcome, funding, construction, and time. Reuse the existing hearing and year resolution where they satisfy the new contract. Render and price the same accepted candidate or saved revision. Treat model text and generated fields as untrusted inputs.

## State and migration

- **Private draft lifecycle.** Opening, interpreting, previewing, editing, or canceling any private draft leaves the annual initiative available. A successful player-confirmed agenda action verifies the eligible year and site, writes one public proposal, and consumes the initiative exactly once. A failed or stale attempt does neither. A draft is not a public competing proposal or a reservation.
- **Resident revision.** Keep the original author, site, and untouched fields. Preview the feasible player option before the negotiation result. Apply only an authorized candidate explicitly confirmed by the player, including a counter they accept. Refusal or cancel preserves the last public revision. Recheck proposal revision, authority, and site when applying.
- **Persuasion and voting.** Check claims against the current plan and scoped town facts, apply existing MP-025 caps unless a later requirement changes them, and record the reason for changes. Keep separate actions for persuasion, spending a favor, formal vote, funding, and advancement. Repeated or stale AI responses cannot apply a second action.
- **Save compatibility.** Preserve existing agenda entries, committed initiatives, funds, construction, votes, and historic relationships across upgrades. If private drafts persist, keep them distinct from posted items and define the behavior after a turn, scenario, or save change. Review any migration with an old-save fixture and confirm repeated load and save produce the same result. Preserve Dev and Stable isolation.

## First engine fixtures and exit evidence

Use one seeded existing town and pin exact plot IDs and revisions. Include a market and housing proposal on selected plots, a competing same-site option, an existing resident proposal, a farmer protecting land or access, a campus-adjacent distributor case, and two council members with contrasting priorities. Assert actual forecast deltas against the simulation. Include valid, infeasible, unsupported, stale, and duplicate actions.

Return an audit matrix with current behavior, target behavior, evidence, MP IDs, and owner. After approval, return the versioned contract, fixture shape, tests, migration impact, and exact tested revision. Establish a narrow first slice. Larger simulation changes should follow evidence from that slice and their own proposed requirements.
