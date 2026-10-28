Game Preference Handoff: Design DNA for a Turn-Based Web App

Purpose: Give an AI game designer or developer an accurate understanding of what this player enjoys, what creates friction, and how those preferences should influence a new turn-based browser game.

Evidence standard: “Observed preference” means the player explicitly expressed it in prior conversations. “Design interpretation” means a recommendation inferred from those preferences. Do not confuse the two. This is a taste and design handoff, not approval of a particular game theme, economy, map system, or implementation stack.

1. Executive summary

The player loves purposeful, visually satisfying management and building games where decisions produce understandable, meaningful, and recoverable consequences. Their ideal experience is to establish a vision, make strategic choices, see a believable world develop in response, recognize when a decision created a problem, and adapt the plan to solve it.

The key design balance is macro-level authorship with optional micro-level customization. Give them the power to decide where and why something develops. Let the game handle routine execution and produce a credible, attractive baseline. Reserve deep, hands-on customization for selected landmarks, signature structures, key districts, and occasional areas they choose to perfect.

A strategic choice should have a causal chain the player can understand: I decided X → the simulation changed Y → I experienced consequence Z → I can respond with A or B. The player appreciates genuine difficulty and mistakes that matter, as long as the system helps them understand why they happened and how to recover.

This is especially important for a turn-based web app. Turns should advance a living simulation, not merely dispense resources or introduce arbitrary events. The player needs to inspect the state, make a small number of consequential decisions, commit the turn, and see the resulting world, economy, and pressures evolve.

Core formula: Intentional planning + organic emergence + meaningful economic and operational tradeoffs + intuitive progression + optional aesthetic authorship + legible feedback.

2. Evidence from specific games

|Game                            |Assessment                                                      |What the player likes                                                                                                                                                                                                                                                                                                                                                        |Where it breaks down / design takeaway                                                                                                                                                                                                                   |
|--------------------------------|----------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Foundation**                  |**Strongest positive reference; purchased and loves it**        |Residential development happens organically inside the areas the player directs. Major buildings, especially manors, can be built and customized modularly. Beautification is optional. The Royal Book provides clear goals and progression. Trade and resource management are intuitive. Choices have consequences.                                                         |Treat this as the clearest model for the *balance* between automation, selective creative control, and meaningful systems. Do not clone its theme or exact mechanics by default.                                                                         |
|**Cities: Skylines I and II**   |**Strong positive reference**                                   |Master-planning regions, highways, roads, districts, downtowns, shopping centers, transport hubs, and services. The game fills in houses and ordinary development. Traffic and service consequences follow from design choices. The player can detail a specific area deeply when desired. Likes varied district identities and terrain-aware, realistic-looking settlements.|A game that makes the player manually place every ordinary home, or that ignores infrastructure consequences, loses an important part of the appeal.                                                                                                     |
|**Anno 1800**                   |**Mixed positive**                                              |Supply chains, economic decisions, growth, and consequences matter. Development creates constraints that require strategic adjustments.                                                                                                                                                                                                                                      |Rigid grids, limited detailing flexibility, and repetition eventually detract from the experience. Preserve the interlocking economic choices; reduce rigid placement and repetitive maintenance.                                                        |
|**Prison Architect**            |**Strong positive reference**                                   |Purposeful layout, cells, facilities, staffing/schedules, and operational management. Physical design choices have functional consequences. The grid is tolerable because it serves a compelling system.                                                                                                                                                                     |Avoid treating grids as categorically bad. A grid is acceptable when it clarifies meaningful operational design and does not force ornamental busywork.                                                                                                  |
|**Parkitect**                   |**Positive reference**                                          |A structured, approachable management game with enough creative freedom. The scope of construction feels bounded and usable.                                                                                                                                                                                                                                                 |This is a good reference for how to constrain complexity without removing player agency.                                                                                                                                                                 |
|**RollerCoaster Tycoon 1 and 2**|**Positive nostalgia/reference**                                |Clear park-management goals and satisfying simulation. Direct construction serves a purpose.                                                                                                                                                                                                                                                                                 |The older block-based visual and building constraints feel limiting. Keep clear mechanics, but support more natural, expressive results.                                                                                                                 |
|**Planet Coaster**              |**Negative on construction friction**                           |Creative potential is recognized.                                                                                                                                                                                                                                                                                                                                            |Excessive building and detailing freedom becomes work. The player described it as “too much.” Do not require intricate manual fabrication before management gameplay can begin.                                                                          |
|**Planet Zoo**                  |**Mixed, with substantial onboarding friction**                 |Animal and operational management can be engaging. Thematic freedom is appealing.                                                                                                                                                                                                                                                                                            |Designing even a credible zoo entrance or baseline layout required too much custom planning/building. The player wants usable paths, enclosures, and facilities quickly, then optional refinement later. Do not infer a separate verdict on Planet Zoo 2.|
|**Megaquarium**                 |**Mixed positive**                                              |The management and animal/facility premise was enjoyable.                                                                                                                                                                                                                                                                                                                    |Overly constrained layouts and creative possibilities made it feel restrictive. Avoid both extremes: an exhausting blank canvas and a rigid, narrow toolset.                                                                                             |
|**Tiny Glade**                  |**Aesthetic appreciation; weak fit as a primary game**          |Organic shapes and beautiful, inviting results.                                                                                                                                                                                                                                                                                                                              |Lack of meaningful objectives, progression, constraints, and consequences makes it feel like a creative escape rather than a sustained game. Beauty alone does not sustain engagement.                                                                   |
|**Minecraft**                   |**Positive as a creativity reference**                          |The natural world and landscape invite imagined projects and organic design.                                                                                                                                                                                                                                                                                                 |Do not interpret this as wanting a pure sandbox or block-by-block construction workflow for the new app.                                                                                                                                                 |
|**Transport Fever**             |**Discussed, preference not established firmly enough to score**|The distinction between urban planning and transport/logistics networks came up.                                                                                                                                                                                                                                                                                             |Do not assume the player wants a logistics-first game without confirming it.                                                                                                                                                                             |

Important nuance: The player is not anti-complexity, anti-grid, anti-detail, or anti-difficulty. They are against forced complexity with a poor payoff. They enjoy complexity when it creates relevant decisions and visible effects.

3. What actually makes the experience fun

A. Being the planner rather than the laborer

Observed preference: In Cities: Skylines, the player plans road networks, districts, city centers, commercial hubs, and key buildings, then lets ordinary suburbs and countryside emerge through zoning. In Foundation, they shape development areas and customize prominent structures while ordinary residential buildings grow organically.

Design interpretation: Most actions should operate at the level of policy, zoning, infrastructure, investment, prioritization, staffing, or a signature build. Avoid forcing repetitive placement or configuration for routine objects.

B. A world that reacts to the plan

Observed preference: Cities: Skylines traffic gets worse after poorly designed roads. This is a desirable cause-and-effect relationship, even when it causes a problem. In Foundation, expanding too quickly caused a shortage of tools. The player responded by investing in tool production and using a cost-reduction edict. They enjoyed learning from that failure and making a better plan.

Design interpretation: Every major decision should impact at least one observable system. Surface the causal chain, not just a numerical penalty. A new residential district may increase tax revenue while increasing commute burden, infrastructure costs, and demand for goods. The fun comes from adapting.

C. Recoverable consequences, not consequence-free play

Observed preference: They accept setbacks, shortages, and poorly performing plans if the reasons are understandable and the recovery mechanisms are accessible.

Design interpretation: Offer tradeoffs such as produce locally versus import, expand capacity versus reduce consumption, spend reserves versus accept slower growth, or impose an unpopular temporary policy. Recovery can cost time, money, or opportunity. It should not require blind guessing or a restart for ordinary mistakes.

D. Guided progression with real milestones

Observed preference: Foundation’s Royal Book is an important positive. They enjoy goals that reveal the next opportunity, unlock new strategic levers, and give development purpose.

Design interpretation: Use an understandable milestone system or chapter structure. Each unlock should materially affect the possibilities in the game, not simply add another cosmetic item or disconnected task. Allow multiple viable routes rather than forcing a single build order.

E. Organic, credible, attractive outcomes

Observed preference: The player likes terrain-aware roads, natural-looking communities, distinctive city districts, and plausible patterns of growth. They have planned contrasting places such as compact historic areas, high-density modern waterfronts, rural villages, resorts, and industrial ports.

Design interpretation: The game’s presentation should reflect player intent in an attractive, coherent way without demanding meticulous decoration. If a world map is part of the product, support distinctive districts, geographic constraints, and visibly evolving development. If there is no map, use similarly clear visual representations of growth and change.

F. Optional deep customization where it matters

Observed preference: The player loves modular manor/major-building construction in Foundation and likes to fine-tune downtowns or important districts in Cities: Skylines. They dislike the demand to custom-build everything in Planet Coaster and Planet Zoo.

Design interpretation: Use a strong default, optional templates/presets, and selective customization of high-impact assets. Player effort should be proportional to strategic or emotional importance.

G. Understandable resource and operational systems

Observed preference: Foundation’s trade/resource management feels intuitive; Anno’s production consequences are interesting; Prison Architect’s layout and scheduling systems feel purposeful.

Design interpretation: Economic systems should have a few coherent dependencies, constrained resources, visible costs, and real operating tradeoffs. Make causes discoverable in context. Depth should emerge from interacting systems, not from exposing dozens of controls at once.

4. Friction to avoid

1. The blank-canvas trap. The player should be able to reach a credible functioning baseline quickly. They should not need to create every entrance, path, neighborhood, room, or small structure manually.
2. Cosmetic chores disguised as gameplay. Decoration and customization should be rewarding options, not blockers to using core management systems.
3. Rigid aesthetic constraints. Avoid forcing identical square blocks or repetitive templates when the imagined world calls for organic forms and distinct districts.
4. Freedom without purpose. A beautiful editor without goals, changing systems, strategic decisions, or feedback risks becoming Tiny Glade without the creative escape being the user’s objective.
5. Micromanagement without new decisions. Do not turn repeated maintenance or constant reconfiguration into the main game loop. Once the player solves a stable process, allow automation or management by exception.
6. Unexplained punishment. A deficit, shutdown, or shortage needs an identifiable cause and at least one discernible path to address it.
7. Fake choices. If every decision leads to the same outcome, or one answer is always optimal, the system will not deliver the satisfying consequences the player values.
8. Endless numerical growth without visible change. Growth should affect the world, unlock capabilities, introduce new challenges, or reshape tradeoffs.
9. Feature accumulation without coherence. More resources, buttons, and mechanics do not necessarily produce a deeper game. They should reinforce the same strategic loops.
10. Over-automation that removes agency. Organic growth is welcome, but the player must retain meaningful control over direction, priorities, and high-impact choices.

5. Design translation for a turn-based browser game

The following is a recommended design approach, not an approved specification. The setting could be a city, settlement, estate, organization, colony, park, or another managed world. Choose a theme based on the systems the player wants to explore rather than assuming they require a city builder.

Recommended core turn loop

1. Inspect: The player sees a coherent representation of their world, the active goals, the resources that matter, upcoming opportunities, and current problems.
2. Plan: They choose a limited set of meaningful actions. Example categories: expand an area, invest in production, establish transport, change a policy, upgrade a signature asset, or prioritize a milestone.
3. Forecast: The interface explains expected costs, likely benefits, capacity constraints, and uncertainties. A preview can be approximate, but should not be misleading.
4. Commit: The player ends the turn. One clear time step passes. The simulation resolves growth, supply and demand, operating costs, side effects, and possibly a contextually plausible event.
5. Learn: An after-turn summary explains what changed, why it changed, what worked, and what needs attention. Connect effects to the decisions and world state that caused them.
6. Adapt: New options, incentives, or constraints emerge. The player’s next turn can follow a plan or address an unexpected consequence.

Design rule: Ending a turn should feel like watching a plan encounter reality, not collecting a periodic allowance.

Example turn sequence: an expansion that teaches something

Illustrative scenario only: a growing settlement.

• Turn 1: The player allocates land for a new neighborhood and invests in a marketplace. Housing appears automatically in the approved area. Population and tax intake increase.
• Turn 2: The new population raises demand for building tools and transport. The interface shows the source of both pressures: housing growth outpaced production, and the neighborhood relies on one congested connection.
• Turn 3: The player chooses between importing tools at a recurring cost, investing in a local workshop with an upfront cost, or temporarily slowing development. Each route solves a problem differently and affects future flexibility.
• Turn 4: They build the workshop and improve the road connection. Tool supply stabilizes, but upkeep rises and workers are pulled from another sector. The next strategic choice becomes evident.
• Milestone: The settlement earns a new capability because it meets a meaningful development condition. The visible world becomes more established.

This sequence uses the mechanics behind the player’s Foundation tool-shortage experience and Cities: Skylines traffic experience: a deliberate choice, a measurable consequence, an understandable correction, and a world that looks and operates differently afterward.

Degree of agency

The player should decide: strategy, priorities, development boundaries, infrastructure investments, important policies, signature projects, and responses to crises.

The simulation should generally decide: ordinary infill, routine construction details, standard resident behavior, basic supply allocations within established rules, and visual embellishments that follow the player’s larger plan.

The player may optionally override: landmark appearance, district identity, notable layouts, special building configurations, and selected optimization decisions.

Economy and systems

Recommended minimal interconnected model:

• Capacity: Production or service infrastructure with meaningful throughput limits.
• Demand: Population, facilities, projects, or other actors create ongoing needs.
• Access: Geography, logistics, staffing, or transport connects available capacity to demand.
• Costs: Upfront investment, operating expenses, and opportunity costs force prioritization.
• Policy levers: A limited set of strategic responses can influence efficiency, growth, cost, happiness, or stability.
• Consequences: Supply shortages, congestion, budget strain, unmet services, or bottlenecks appear when systems do not align.

Keep the opening economy legible. A handful of resources with meaningful dependencies is preferable to a dozen near-identical currencies. Avoid hiding causal rules behind opaque scoring.

Progression and pacing

Use milestone-led progression inspired by the function of Foundation’s Royal Book. Possible stages, subject to theme:

• Early: Establish a functioning baseline with minimal friction. Introduce one understandable economic constraint and one strategic choice.
• Middle: Interlocking systems become meaningful. District or operational specialization, trade, policies, and geography introduce choices that cannot all be optimized simultaneously.
• Late: The player manages a complex, distinctive world, undertakes major projects, and makes long-range tradeoffs without needing to manually perform all the early-game chores.

Progression should reward mastery by giving the player more strategic leverage and better automation. It should not simply multiply the number of repetitive clicks.

Map, buildings, and visual world (if the chosen theme needs them)

Start with a credible functional default. The player should be able to plan development at a higher level, with buildings and communities emerging automatically. Terrain and network connections should matter. The layout should avoid looking like a sterile collection of repeated grids.

Allow aesthetic variation and landmark personalization, but keep it optional. A modular major-project editor can be satisfying if changes are understandable and the finished asset contributes to the world. If a full spatial simulation is too costly for an initial web prototype, a district-node or region-based map can preserve planning decisions without pretending to be a full Cities: Skylines implementation.

UX principles

• World first: Show what the player is building or managing, not only a spreadsheet dashboard.
• Decisions close to consequences: Select a district, asset, or issue to see its health, dependencies, and available actions.
• Explain the ‘why’: For important metric changes, provide a short causal explanation, preferably with before/after comparison.
• Progress always visible: Show current milestones, progress toward them, and the next capabilities they enable.
• Preview before commitment: Important moves should communicate costs and likely tradeoffs; allow revisions before turn resolution.
• Compress routine operations: Use presets, sensible defaults, batch actions, and automation for previously solved workflows.
• Aesthetics as payoff: Visible world changes should track functional improvements and emerging district identities.
• Low ceremony: Avoid several modal dialogues to perform an ordinary decision.

6. Functional requirements and acceptance checks for the first prototype

These are proposed design acceptance tests, not claims that the player requested each feature explicitly.

|Priority|Requirement                                     |Acceptance check                                                                                                              |
|--------|------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
|P0      |Every turn advances an interconnected simulation|After taking a development action, at least two relevant systems can change, and the player can inspect those changes.        |
|P0      |Meaningful, legible causality                   |When a shortage, cost increase, or bottleneck occurs, the interface identifies likely causes and exposes actionable responses.|
|P0      |Recoverable mistakes                            |A reasonable early-game mistake creates a constraint but can be addressed through two or more materially distinct strategies. |
|P0      |Strong defaults and automatic development       |The player can establish an attractive, functioning baseline without manually placing or designing every routine element.     |
|P0      |Directional player control                      |The player can meaningfully influence where growth occurs, which capabilities receive investment, and what gets prioritized.  |
|P0      |Explicit objectives and progression             |The player can always identify a relevant next milestone and understand why achieving it matters.                             |
|P1      |Multiple viable tradeoffs                       |Example: import versus produce locally has distinct immediate and longer-term costs, and neither is universally superior.     |
|P1      |Visible world evolution                         |Functional investments lead to noticeable changes in the visual world or its representation, not only counters increasing.    |
|P1      |Optional signature customization                |At least one important asset, district, or strategic project can be personalized without creating a repetitive chore.         |
|P1      |Management by exception                         |Stable systems do not need to be revisited every turn unless underlying conditions change.                                    |
|P1      |Clear turn report                               |A compact end-of-turn summary reports significant changes, connects them to causes, and surfaces emerging decisions.          |
|P2      |Terrain or geography affects planning           |When spatial gameplay is used, geography and infrastructure placement create credible constraints or advantages.              |

Suggested short playtest

Give the player a starter world and 10 to 15 turns, with no lengthy tutorial. Check whether they can: establish a functioning baseline; make a strategic expansion; encounter and diagnose a resource or network consequence; fix it through a meaningful choice; unlock a new capability; and point to a world that looks different because of their plan. If the test becomes a sequence of repetitive placement tasks or unexplained numbers, revisit the design.

7. Priority hierarchy for the design AI

Highest priority

1. Causal, strategically meaningful decisions with understandable outcomes.
2. Purposeful goals and satisfying progression.
3. An appealing world that responds to player intent.
4. Strong defaults, organic/autonomous routine growth, and player-directed planning.
5. Recoverable problems and more than one viable solution.

Next priority

6. Optional detail and modular customization for high-impact projects.
7. Interlocking resources, production, staffing, trade, or infrastructure, depending on the theme.
8. Distinctive, realistic-looking places, organizations, or operating systems rather than uniform repetition.

Lower priority unless required by the chosen concept

9. Highly granular decoration tools, individual-object placement, advanced architectural editing, exhaustive statistics, and numerous resource types.

This priority order is an interpretation of repeated preferences, not a ranking that the player explicitly scored.

8. How to work with this handoff

For the next AI: Design around the preferences, not around copying Foundation or Cities: Skylines. The desired feeling is “I envisioned something, I made a few important choices, the world grew in response, I saw the consequences, and I learned how to make the next decision better.”

Before producing extensive code, propose two or three sharply differentiated game concepts that could produce that feeling in a turn-based browser format. For each concept, show:

• The player’s role and the thing they control.
• The primary turn loop and what visibly changes after a turn.
• Two examples of decisions with non-obvious tradeoffs.
• One failure-and-recovery chain that feels fair.
• What develops automatically and what the player can customize.
• How objectives and unlocks make each phase feel purposeful.
• The smallest playable prototype that proves the core idea.

Then evaluate the concepts against the priority hierarchy above. Prefer an intentionally small but interlocking game over a broad feature list with shallow choices.

9. Unresolved design decisions, do not silently invent answers

Prior discussions establish clear taste, but they do not establish a single approved game concept. The design AI should treat the following as open:

• Theme: City/settlement, estate, park, institution, business, colony, fictional kingdom, or another world.
• Scale: Individual building, district, settlement, multi-settlement region, or empire.
• Turn duration: Day, week, month, season, year, or abstract phase.
• Complexity target: Session length, acceptable learning curve, and difficulty settings.
• Visual implementation: Tile/grid, organic map, node map, illustrated dashboard, or hybrid.
• Simulation fidelity: How much detail is necessary to make consequences believable.
• Narrative elements: Whether characters, events, politics, or stories should be involved and to what degree.
• Victory structure: Fixed victory, evolving milestones, open-ended play, or scenarios.
• Technical scope: Framework, backend, persistence, single-player versus multiplayer, and hosting environment.

These choices should follow from the intended experience and prototype constraints; they are not facts about the player.

10. Final design test

When assessing a proposed feature, ask:

1. Does this let the player make a decision that matters?
2. Will the simulation produce a consequence they can understand?
3. Does it improve their ability to plan, adapt, or shape a believable world?
4. Does it offer a useful default, or require avoidable manual effort?
5. Does it advance a goal or create an engaging new strategic pressure?

Features that score poorly on these questions should be simplified, automated, made optional, or removed.

One-sentence north star: Build a beautiful, purposeful, turn-based management simulation where the player authors the plan, the world does much of the building, and every consequential turn teaches them something worth using on the next one.