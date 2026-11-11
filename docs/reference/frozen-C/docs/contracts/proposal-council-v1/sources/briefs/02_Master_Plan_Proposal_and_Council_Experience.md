# Master Plan · Proposal and council experience

## Assignment

Own the player-facing Dev flow in **00 · Start Here**. Plan layouts and interactions while the audit runs. Build against the frozen engine fixtures from **01 · Audit and engine**. Coordinate changes to shared UI and build files with the integration owner.

## New proposal

1. From **Bring your own idea**, enter a freeform description and select plots on the map. Keep the selected boundary and existing conditions visible.
2. **Draft with Qwen** opens a private draft on the chosen plots. Show the site plan, editable program, cost and upkeep, projected town effects, and expected council support. Mark assumptions, site constraints, and requested details the engine cannot represent. Explain material changes before asking for confirmation.
3. Keep typed intent and plot selection available through model failure or clarification. Let the player explore another private version and compare it with the current one. If a supported subset is useful, label the omissions and ask whether to continue with that scope. Preserve the annual initiative until the explicit **Put on agenda** action succeeds.
4. Clearly separate **Private draft**, **On agenda**, and the later vote or decision. The vote resolves the posted version. An illustrative drawing uses actual site boundaries and marks approximate placement. It must not imply a building or feature the engine did not accept.

## Resident proposal edit

- Open a public resident proposal and ask for a change in plain language. Show the latest public plan and the feasible candidate side by side or with a one-tap toggle. Keep the same orientation, scale, and plot boundary. Show changed quantities, costs, town impacts, and likely support together.
- Show the proposer’s **Agree**, **Counteroffer**, or **Decline** with their concrete concern and a next step. A candidate can be physically feasible and still conflict with the proposer’s goals. Show those two facts together.
- Keep a counteroffer distinct from the requested edit. Show which fields and forecasts the counter changes. The player can confirm the authorized option, negotiate again, or leave the current plan in place. Cancel and refusal leave the public plan intact.

## Council

- Show the current plan and each member’s priorities, position, and one concrete concern relevant to the site or town. Let the player make a freeform pitch about that plan.
- After a pitch, show the member’s grounded reaction, which point moved their support, the before/after lean when it changes, and whether the likely vote changed. A changed lean can matter while the headline vote forecast stays the same.
- Keep **Call vote** separate from conversation. Make the plan revision, decision, funding, and eventual map outcome readable. Approval and actual delivery stay distinct when the engine models construction delay or risk.

## Browser and device QA brief

Use the integrated Dev revision and a disposable existing-town save. At 669 × 951 and 400 px wide, follow the normal touch path. Assert that exact selected plots survive drafting and revision, forecast values and drawings refer to the same version, canceling changes nothing public, and duplicate posting spends one initiative. Check agree, counter, decline, stale response, provider failure, and the ability to keep playing when the model is off.

On the same fixture, pitch the same fact to two council members with different concerns. Check two grounded reactions and the engine-calculated support change. Call the vote, advance the year, and confirm the map and report reflect the version approved. Capture reproducible steps and evidence by requirement, and label mocked generation separately from Duo play-testing.

The first visual target is a truthful site plan and legible comparison. Treat the showcase as an art reference. Street-level designs and comprehensive plan history remain separate scope unless the audit and requirements explicitly bring them in.
