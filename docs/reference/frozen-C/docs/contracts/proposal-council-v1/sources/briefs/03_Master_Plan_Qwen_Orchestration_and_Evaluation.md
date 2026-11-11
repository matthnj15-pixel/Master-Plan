# Master Plan · Qwen orchestration and evaluation

## Assignment

Own the AI interpretation and dialogue layer for the three player actions in **00 · Start Here**. Reuse the existing offline runtime, model cache, provider queue, and diagnostics. Work against the frozen engine contract and fixtures from **01 · Audit and engine**. Keep the pipeline provider-neutral so Claude and Qwen can be evaluated on the same cases.

## Three bounded requests

| Request | Pass to the model | Ask the model to return |
|---|---|---|
| **Draft** | Player intent, fixed plot selection, relevant facts and constraints, permitted operations and units | A typed plan candidate, assumptions, and explicitly unsupported or unclear details |
| **Revise** | Current proposal and revision, allowed edits, site constraints, and the player’s requested change | A narrow patch. Use the engine-evaluated result and a scoped persona profile to express agreement, a counter, or refusal. Any counter is a separate typed candidate that the engine evaluates. |
| **Pitch** | Current proposal revision, chosen council member, relevant verified facts, and the player’s argument | Structured claims, evidence references, and argument intent. Generate the member’s reply from engine-calculated credit, remaining concerns, and actual support changes. |

Keep model context small and task-specific. Pass stable identifiers and only relevant facts. Use the engine’s actual capability definitions to build and validate each contract. Treat plausible prose and JSON syntax as preliminary. The proposal must preserve the player’s core intent and satisfy both field and game rules before presentation as an accepted candidate.

## Failure and recovery

- Separate unavailable runtime, invalid structure, unsupported operation, unclear intent, infeasible site, stale result, and engine rejection. Surface the actual boundary and a useful next action.
- Use bounded validation and repair. Give a repair attempt the specific structured rule it must satisfy. Preserve the player’s text, selected plots, and latest accepted plan if repair fails. Offer a focused clarification or clearly labeled supported subset when meaningful, with player confirmation before substituting scope.
- Serialize active generation on the installed Qwen instance until device measurements support a different approach. Use a versioned snapshot and discard a late result when the town, turn, proposal, site, or intended action changes. A generation response cannot independently post an agenda item, apply a revision, change a vote, spend money, or advance time.
- Extend the existing local diagnostic export with allowlisted failure codes and supported field IDs where safe, such as `unknown_field`, `wrong_type`, `value_out_of_range`, or `site_infeasible`. Keep request, attempt, model, latency, and outcome correlated. Keep raw prompts, responses, plot coordinates, and saves out of ordinary exports.
- Preserve the existing no-model paths where available. Avoid a silent replacement of an unsuccessful Qwen proposal with an unrelated plan. Never make the final council vote or year advancement depend on model availability.

## Evaluation and stop conditions

Use identical engine snapshots and an expected outcome for both a deterministic fixture suite and real-provider evaluations. Include a new mixed-use plan, multi-plot redevelopment, a valid partial request, unsupported intent, a genuinely infeasible placement, narrow NPC revisions, a farmer’s counter, and one pitch evaluated against contrasting personas. Record successful parse, schema validity, intent fidelity, correct site, unrequested changes, repair outcome, and usable result latency. Report a small labeled sample with numerator and denominator.

The observed Qwen 1.5B draft on Duo generated twice and returned `invalid` after validation. Capture a more specific rule before selecting a fix. Compare a larger model only if the same device, task, and runtime measurements make it useful. Check cold launch, retries, and response time in airplane mode. Keep browser mock success and actual Duo results distinct. The slice is ready for player verification when a live model can produce a usable draft, a targeted revision, and a grounded council response on representative fixtures.
