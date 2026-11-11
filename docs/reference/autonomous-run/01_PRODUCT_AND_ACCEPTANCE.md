# Product outcome and acceptance

## The game Nate wants

Master Plan is a town-planning game in which decisions accumulate into the history and shape of a place. Start in established Millbrooke. Let the player propose development, redevelopment, preservation, infrastructure, and operating changes, negotiate competing interests, and see the town respond.

Creative control belongs in the planning conversation, site selection, alternatives, and commitments. The simulation produces understandable trade-offs and persistent consequences. A compact town, selective redevelopment, outward investment, and preservation should offer credible strategic choices. Preserve the current campaign rules while making the planning loop substantially richer.

Use Nate's prior preferences as design guidance. Favor organic development within player-defined boundaries, geographic constraints, visible change, recoverable mistakes, competing priorities, and reasons to return after a decision. Adapt those qualities to Master Plan's planning and council role. The proposal loop should support sustained play through successive annual decisions.

## Goal 1. Original proposals on selected land

The player selects exact plots and describes an idea in their own words. Qwen interprets the idea into an extensible, validated project program. The next screen shows the requested plan, site use, assumptions, estimated costs, upkeep, impacts, and support.

The normal game must support broad combinations across housing, commercial/workplace uses, civic/community uses, recreation/event uses, agriculture/land management, infrastructure/access, and operating/policy conditions. Add the reusable simulation and rendering primitives required for these categories. Keep the fictional game's estimates internally consistent and disclose assumptions.

The original text, intended functions, and selected site remain available throughout clarification and revisions. A surprising project name should preserve its identity and purpose as the system maps it onto priced and rendered components. A community repair workshop can share building and activity primitives with other workplaces while retaining its workshop, storage, class, and access functions in the accepted plan.

### Required outcomes

| ID | Observable outcome | Primary evidence owner |
|---|---|---|
| G1.1 | Typed original intent and exact ordered plot selection produce a private preview through the normal entry point. Drafting leaves public state and annual initiative availability intact. | Engine and browser QA |
| G1.2 | The engine represents multiple functional components, their scale/capacity, spatial allocations, and operating conditions. New labels and combinations use the shared pipeline. | Engine builder and reviewer |
| G1.3 | The plan view and town-map overlay depict the same validated candidate revision, with the exact chosen boundary and readable footprints, access, open space, and activity areas where relevant. | UI builder and browser QA |
| G1.4 | Component allocations conserve usable site capacity. Multi-use space has explicit accounting. Occupied sites expose acquisition, demolition, displacement, and retained features where modeled. | Engine builder |
| G1.5 | Clarification, capacity problems, and unsupported details identify the actual issue and preserve input. A supported subset requires explicit acknowledgment before posting. | Provider builder and browser QA |
| G1.6 | A new trusted program definition can combine existing primitives and use interpretation, validation, pricing, rendering, persuasion, persistence, and delivery through the same interfaces. | Reviewer and generalization QA |
| G1.7 | An unfamiliar program absent from every registered project catalog completes the normal flow by composing existing primitives, with source and catalog frozen during the initial test. | Independent generalization QA |

## Goal 2. Revisions that visibly matter

Let the player iterate on original drafts, compare alternatives on the same site, and request narrow edits to resident proposals. Preserve accepted components and untouched fields through each change. Additions such as more space, a second activity, different hours, a buffer, less parking, or a retained building must have traceable consequences where the simulation models them.

Show the current accepted version, the requested option, and any counter as distinct versions. Synchronize the site drawing, cost/upkeep, capacity, relevant impacts, funding consequences, support, and changed-field explanation. A metric can remain unchanged when the rule genuinely produces no effect. Show that result accurately.

### Required outcomes

| ID | Observable outcome | Primary evidence owner |
|---|---|---|
| G2.1 | Three successive typed edits, including an addition and a reduction, preserve the chosen boundary and unrelated components and refresh the preview and forecast together. | Browser QA |
| G2.2 | Compare at least two private alternatives on one site and return to either without consuming the initiative. Baselines remain identifiable. | UI builder |
| G2.3 | A feasible requested resident revision is visible with consequences before an agree/counter/refuse response. Applying an authorized revision requires explicit confirmation. | Engine and UI builders |
| G2.4 | Scope changes, provider failure, cancellation, stale replies, reload, and capacity limits retain the player's input and clearly identify the accepted public version. | Provider and browser QA |
| G2.5 | Relevant monetary, physical, and support deltas are recomputed from the same validated revision. Persist enough provenance to explain the change after reload. | Engine builder and reviewer |
| G2.6 | Private local recovery supports the previously approved four drafts, eight input versions per draft, and 128 KiB per game, with explicit capacity handling and no time expiry. | Storage owner |

## Goal 3. People with interests and boundaries

Residents, operators, institutions, and council members should respond to what a plan changes for them. A farmer may protect productive land, access, livelihood, and succession. A college may distinguish a freight/loading conflict from public alcohol sales, student convenience, or a quiet research building's needs. Council members weigh their own priorities, the town's resources, and affected places.

Author fictional profiles from researched planning concerns. Separate game facts, recorded commitments, beliefs, preferences, negotiable conditions, and voice. Actual authority follows the scenario. A farmer's concern can influence their proposal, support, or a recorded right. Keep statutory licensing and municipal voting authority explicit in the fictional rules.

Implement ordinary playable farm/access and campus/business conflicts through the generalized system. Use authored opening situations to make the flows accessible in normal Dev play. The reusable rules must also work with different actors, sites, and programs.

### Required outcomes

| ID | Observable outcome | Primary evidence owner |
|---|---|---|
| G3.1 | Normal game interactions can produce agree, counter, and refuse with a concrete interest, affected site or activity, and a displayed concession where applicable. | Persona/content and browser QA |
| G3.2 | The same proposed change gives meaningfully different evaluations for actors with different exposure or priorities. The difference follows rules and facts. | Engine and persona builder |
| G3.3 | An accepted concession changes the operative plan/condition, its costs or impacts where applicable, and the actor's evaluation on re-preview. | Engine and browser QA |
| G3.4 | One controlling authorizer governs each confirmation. Required consent and condition gates use trusted evidence. Outstanding prerequisites block confirmation. | Engine builder and reviewer |
| G3.5 | A typed council pitch is interpreted against the current proposal. Supported claims can earn bounded, member-relevant credit. False claims receive a factual correction and appropriate reason codes. | Provider and engine builders |
| G3.6 | The council reaction expresses the actual committed persuasion result, current concerns, and recorded history. A wrong-member receipt, late reply, or retry cannot apply another persuasion action. | Provider builder and reviewer |
| G3.7 | Keep existing persuasion caps and offer mechanics. Favors, earmarks, funding, and formal votes remain explicit actions. | Engine builder |

## Goal 4. Decisions reshape the town

The player posts once, selects a valid funding route, pursues the required decision, and follows delivery. A successful decision records the accepted revision, exact site, conditions, resources, and outcome. Construction and operation use that same program. The town map, budget, support, and year report expose what happened and why.

Future opportunities should respond to actual town conditions, unresolved needs, completed projects, and commitments. Use deterministic state-driven opportunity rules to keep the planning loop supplied across the first term and later years. Optional AI can express or elaborate eligible opportunities. Apply the same proposal validation to game-presented ideas.

### Required outcomes

| ID | Observable outcome | Primary evidence owner |
|---|---|---|
| G4.1 | A successful Put on agenda consumes the current annual initiative once. A failed action preserves prior state and input. Private alternatives consume none. | Engine and storage owners |
| G4.2 | Formal decisions use current eligibility, vote rules, and explicit funding. Duplicate actions, delayed saves, and two tabs cannot spend or build twice. | Engine and browser QA |
| G4.3 | Approved program, geometry, conditions, resource effects, and project identity survive construction, annual resolution, reload, and migration. | Engine builder |
| G4.4 | The built result visibly matches the approved plan at the game's schematic level. Reports explain actual costs, upkeep, capacity, and relevant positive/negative consequences. | UI builder and browser QA |
| G4.5 | A compact project record connects original intent, accepted revision, decision, commitments, and observed delivery. Later negotiations can cite actual relevant records. | Engine and UI owners |
| G4.6 | Paired same-seed towns with different material planning decisions diverge in relevant town outcomes and future opportunities through traceable rules. | Engine builder and independent QA |
| G4.7 | Successive years, including the first election and a later year, remain supplied with meaningful choices, carryover cases, or an explained strategic reason to wait. | Planner and sustained-play QA |

## Shared delivery requirements

| ID | Required outcome |
|---|---|
| X1 | Downloaded Qwen performs the actual typed draft, targeted revision, and grounded council-response flows in a supported live runtime. Record exact model, settings, limits, latency, and failures. |
| X2 | Cached offline play has local assets, model availability checks, recoverable failures, and accurate state. Physical Duo airplane-mode verification has its own evidence record. |
| X3 | Mobile portrait interaction works at 669 by 951 and 400 by 951 CSS pixels, with reachable actions, readable text, and at least 44 by 44 CSS pixel primary targets. |
| X4 | Supported old saves preserve town progress. Same-save concurrency, feature flags, format fences, account copies, and Dev/Stable isolation retain explicit guarantees. |
| X5 | Local diagnostics retain seven days and export a chosen date range. Correlated stage, validator reason, task, build, model/runtime, timing, and outcome identify the actual failure boundary. |
| X6 | Deterministic simulation owns prices, capacity, impacts, authority, support, votes, and time. Models interpret intent/claims and express grounded results. |
| X7 | Default browser, mock, engine, live-provider, deployed-build, and device results identify their actual revision and evidence type. Each required missing check stays visible. |

The G/X IDs organize this handoff. The coordinator maps them to existing MP requirements and adds the necessary accepted rows under the user's current authorization. Update MP-031's fixed-field assumption and dependent plan/render/history requirements to match this broader assignment.
