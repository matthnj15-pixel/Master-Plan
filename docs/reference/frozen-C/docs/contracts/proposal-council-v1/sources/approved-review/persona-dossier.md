# Millbrooke persona research and proposed dossier

Review status: provisional research, 2026-11-10. Code baseline: `18dded6207f7217021d84b42aad6cc8e00b68f43` (`dev`). This is a read-only research handoff; no game files, requirements, saves, branches, commits or remote resources were changed. The five Library briefs were unavailable to this session, so briefs 00 and 04 have **not** been read. Reconcile their facts, source rules and approved scope before freezing content or requirements. No supplied manual research was available.

The useful starting distinction is between an actor's response and the actor's authority. A college representative can support a neighboring proposal without authorizing its edits. A farmer can describe loss of access without owning the land. A developer can authorize changes to its own proposal without controlling another owner's land. Council reactions must explain engine support; they must not manufacture votes, permissions, costs or factual commitments.

## 1. Facts the current scenario actually supplies

All line references in this section are to the pinned baseline above.

| Fact ID | Existing fact | Evidence and limit |
|---|---|---|
| F-TOWN | Scenario 01 is fictional Millbrooke, Pennsylvania; starts in 2027, population 3,200, reserve $900K. | `src/engine.js:714–723`. Real Pennsylvania sources inform plausibility; they are not evidence about fictional residents. |
| F-RIDGE | Ridge Road Estates proposes subdivision of the “old Bowers dairy”; 12 named site plots are `[20..22,13..16]`. | `src/engine.js:635`, `694–695`. The text does not establish a currently operating farm, present owner, tenant, lease, access right, gate, agricultural security area or conservation easement. |
| F-FARM-TERRAIN | The eastern and southern map includes farm terrain; the Ridge site is on that terrain. | `src/engine.js:650–656`. A farm tile is not an ownership record or operating business. |
| F-RIDGE-PLAN | Subdivision supports homes, large/small lots and a farmland buffer. Compact lots and preservation change the engine's farm-loss effect; preservation costs $40K. | `src/engine.js:111–118`, `129`. These are abstract game units, not acres or a surveyed protected boundary. |
| F-CAMPUS | Penns Valley College occupies college/quad tiles in the north-east. South of campus on College Ave is a different six-plot named site: `[[15,9],[16,9],[17,9],[15,10],[16,10],[17,10]]`. | `src/engine.js:633`, `674`, `705–706`. Coordinate proximity supplies no feet/metres conversion, freight route, crossing count or licensed-premises distance. |
| F-COLLEGE-OWNER | The college owns the college and quad building types; the school district owns the school. | `src/engine.js:712`. These are the only ownership entries. They do not make the college owner of `campus_s`. |
| F-CAMPUS-PROPOSAL | The scheduled nearby proposal is College Ave Student Lofts, by Keystone, with beds, stories, parking and retail fields. | `src/engine.js:67–75`, `692–693`, `697`. There is no beer distributor proposal, operating mode, public-sales field, consumption field or license simulation. |
| F-DEVELOPER | `keystone` is Brent Hollis, Keystone Ridge Development; competent, low flexibility, protects leasable space and parking. He proposes the shopping plaza, student lofts and subdivision. | `src/engine.js:597–598`, `684`, `692–695`. No actual private margin or lender requirement is computed. |
| F-COUNCIL | Ellen Pryor guards the reserve; James Okafor prioritizes neighborhoods, walking, safety and affordability; Hal Weaver is a dairy farmer protecting farmland. Each is one of five council members. | `src/engine.js:605–625`. Keep stable IDs `pryor`, `okafor`, `weaver`. A farmer occupation does not prove Hal owns the Bowers site. |
| F-AUTHORITY | Council items use the borough council decision route with three votes required. | `src/engine.js:220–229`, `741`, `721`. MP-035 currently allows nonborough-land proposals with acquisition/backlash rather than an absolute owner-consent gate (`docs/requirements.md:51`). Do not silently add such a gate. |
| F-SCORING | Member weights, relationships, rivalry and lobbying determine engine support; bounded pitch rules cap existing credit. | `src/engine.js:205–262`. Prose and proposed stances must preserve MP-025 caps and existing vote rules. |
| F-SAVES | The scenario, including people, is embedded in a new game's state; runtime person lookups use that embedded scenario. | `src/engine.js:155–164`, `729`, `737–738`. Changing source profiles alone need not update existing saves. Profile versions and any migration need an explicit owner. |

Repository instructions read: `AGENTS.md`, `CLAUDE.md`, and relevant requirements, decisions and scenario contract. Existing MP-015, MP-020/021, MP-025/026/028, MP-033/035 and MP-060/074 constrain this work. New farm-operation or alcohol-operation mechanics need proposed requirements; the research does not accept them.

## 2. Source-to-behavior matrix

Sources were checked on 2026-11-10. Sources describe Pennsylvania practice, planning considerations or institutions. The last two columns are **design inferences**, not empirical claims about Millbrooke. Penn State is a real reference institution; Penns Valley College is fictional.

| Source | Supported evidence | Proposed behavior | Boundary |
|---|---|---|---|
| S1 — [Pennsylvania Municipalities Planning Code, Article I, §§105/107](https://www.palegis.us/statutes/unconsolidated/law-information/view-statute?act=247&chpt=1&iFrame=true&sessInd=0&smthLwInd=0&txtType=HTM&yr=1968) | Planning recognizes agricultural operating viability and distinguishes owners, agents and authorized tenants/developers. Full official text inspected. | Ask whose operation and whose permission are involved; separate agricultural survival from title. | Do not turn a profile into a legal tribunal or make “farmer” equal owner. No fictional title record exists yet. |
| S2 — [Pennsylvania Municipalities Planning Code, Article III, §301](https://www.palegis.us/statutes/unconsolidated/law-information/view-statute?act=247&chpt=3&iFrame=true&sessInd=0&smthLwInd=0&txtType=HTM&yr=1968) | Comprehensive planning links land uses, people/goods movement, facilities, fiscal effects and implementation. Full official text inspected. | Let reserve-focused and neighborhood-focused members weigh the same documented plan differently. | This supports multidimensional reasoning, not a specific numerical score or mandatory NPC position. |
| S3 — [Penn State Extension: Farmland Assessment Checklist](https://extension.psu.edu/farmland-assessment-checklist) | Farm assessment considers equipment/truck access, turnaround, water and infrastructure. Search-index text inspected; direct article/PDF fetch returned 403. | Farmer asks whether the remaining operation can still receive deliveries and reach fields. | Access failure needs an authored/engine fact. Do not claim to have inspected the full article or extrapolate a minimum viable acreage. |
| S4 — [Penn State Extension: Agriculture and Infrastructure](https://extension.psu.edu/agriculture-and-infrastructure-whats-the-connection) | Incompatible development and farmland fragmentation are planning concerns. Search-index text inspected; direct fetch returned 403. | A buffer is insufficient reassurance if it leaves operationally disconnected land. | The current engine has an abstract farm-loss effect, not connectivity, crop yields or viability. |
| S5 — [PA Agriculture: Easement Purchase](https://www.pa.gov/agencies/pda/plants-land-water/farmland-preservation/easement-purchase) | Preservation programs purchase conservation easements/development rights from farmland owners through public programs. Official page inspected. | Farmer can seek documented protection when an approved fixture establishes the right and holder. | Farmland terrain does not establish an easement. No automatic protected status at Ridge; no promise that informal support creates legal protection. |
| S6 — [PennDOT: Highway Occupancy Permits](https://www.pa.gov/services/penndot/apply-for-a-penndot-highway-occupancy-permit) | State-highway access involves driveway/local-road permits and safety, drainage and passage concerns. Official page inspected. | Operator discusses a viable loading entrance; college asks how deliveries intersect its pedestrian access. | A mayor or neighboring college cannot casually grant state-road access. Route names alone are not an engineered route. |
| S7 — [PennDOT: Posted and Bonded Roadways FAQ](https://www.pa.gov/agencies/penndot/programs-and-doing-business/posted-and-bonded-roadways/frequently-asked-questions) | Road conditions, vehicle loading, studies and jurisdiction matter; bridges and roads can have distinct restrictions. Official page inspected. | Route evidence can change an actor's access or maintenance concern. | No invented truck ban, load limit, bridge clearance or permit cost. Existing “traffic” is not a freight simulator. |
| S8 — [Pennsylvania State Police: Liquor Control Enforcement Guidelines](https://www.pa.gov/agencies/psp/contact-psp/bureau-and-office-directory/liquor-control-enforcement/guidelines) | Distributor D sales are for off-premises consumption; importing distributors primarily serve wholesale customers. Public-facing package sales and wholesale distribution are distinguishable. Official current agency page inspected. | College first asks what actually happens on site. Freight-only is evaluated differently from customer sales or a requested drinking venue. | A distributor is not automatically a bar. Adding on-site consumption changes the operating/licensing question and cannot be granted by dialogue. No universal college-distance veto is inferred. |
| S9 — [Penn State and State College cooperation on dangerous drinking](https://www.psu.edu/news/campus-life/story/penn-state-state-college-borough-seek-diminish-state-pattys-day-activities) | The university documents cooperation with local businesses/borough on risky promotions, drinking, noise and public impacts. This is a 2018 example, not a current blanket rule. Full university article inspected. | College seeks specific safeguards for public-facing alcohol activity while recognizing responsible operators. | No claim that any nearby beer business causes harm, that students uniformly drink, or that the college controls neighboring businesses. |

No population-level effect size, minimum farm acreage, numerical alcohol-risk penalty or legal separation threshold is proposed from these sources. Those would require additional research and an approved engine mechanic.

## 3. Five fictional profiles for review

All invented details below are proposed content. Existing character IDs, biographies and weights remain the baseline until changed through the agreed contract. “Agree” means the actor accepts the identified request within its authority; it does not mean council approval.

### P1 — Ruth Bowers, proposed working-farm operator (`bowers_operator`)

**Status and authority.** New fictional profile. The Bowers name is inspired by F-RIDGE, but Ruth and an active farm are absent from current saves. In a proposed fixture, Ruth operates a working farm under a lease; a separate owner record must be supplied. She may negotiate operating arrangements she controls and state her support; she cannot sell the owner's land or veto a neighboring project. An owner-operator variant may authorize disposition of specified owned land only when the fixture expressly establishes that role. Neither variant changes MP-035 by implication.

**Priorities and affected places.** Remaining productive land, reliable equipment/milk/feed access, workable drainage and continuity of the business. Ridge farmland is the relevant current place; any gate, barn, leased field or truck path requires a proposed fact with explicit geometry/identity. S1/S3/S4 inform the distinction between a landscape and a viable enterprise.

**What changes her mind.** An engine-supported revision with less farm loss helps; an authored access/viability fixture can establish that the remaining operation works. A cash offer does not answer an access question. Ownership evidence changes what she may authorize, not whether she likes the impact.

**Evidence / belief / flavor.** Evidence: exact affected plots and engine farm-loss effect. Belief: she doubts a fragmented operation will remain practical until shown the layout. Flavor: she describes consequences through a day's deliveries rather than a slogan about all development. Do not use “farm saved” merely because `preserve:true`.

**Examples.** Agree, conditional research fixture: “That keeps the loading lane and the fields I lease usable. I can accept the operating arrangement; the owner still decides on a land sale.” Counter: “The buffer helps, but I still cannot get the feed truck through. Keep the lane open before asking for my support.” Refuse: “I won't endorse a plan that removes the only access to the working fields.” These access examples are unverified fixture requirements, not current engine predictions. Current-only response: “The compact plan loses less farmland. I still need to see what happens to the operation.”

### P2 — Dr. Leena Shah, proposed Penns Valley College liaison (`college_liaison`)

**Status and authority.** New fictional spokesperson for campus/community operations. F-CAMPUS/F-COLLEGE-OWNER anchor the institution and its property, not this individual. She may express the college's position and negotiate identified college-controlled access arrangements. She cannot authorize Keystone edits, revoke a license, grant a borough permit or cast a council vote. Campus ownership authority must name its delegation; it is not automatically held by a liaison.

**Priorities and affected places.** Safe campus access, reliable deliveries, a workable relationship with neighbors and demonstrable student/community safeguards. For a proposed nearby distributor at `campus_s`, first establish operating facts rather than treating the title “beer distributor” as the entire proposal. S6–S9 inform this differentiated approach.

**What changes her mind.** A documented loading route that avoids an identified conflict; a clear distinction between freight and customer-facing activity; specific, authorized safeguards for public sales. Unknown routing or sales should trigger clarification. A verbal “trust us” is not evidence that operations changed.

**Evidence / belief / flavor.** Evidence: site plots, proposed operation fields, engine-observed conflicts. Belief: additional alcohol availability could create campus pressures; label this as a concern, not measured harm. Flavor: concise questions about the operating plan, without condescension toward students or merchants.

**Examples by operation.** Freight-only agree, research fixture: “With no customer sales or drinking on site, my concern is the delivery conflict at the campus entrance. The revised route resolves that concern.” Public-sales counter: “Customers change the access pattern. Keep deliveries separate and show the agreed sales safeguards before asking the college to endorse it.” On-site-consumption refusal of the requested endorsement: “I cannot support adding a drinking venue on the facts presented. That is a different operation from the distribution proposal we reviewed.” This is opposition, not a legal veto. Do not assert that all on-site-consumption proposals are impossible; clarify the proposal/license scope. A nearby distributor could still receive a neutral or supportive position when relevant concerns are resolved.

### P3 — Brent Hollis, Keystone Ridge Development (`keystone`)

**Status and authority.** Existing character, retain name/ID and current competency/detail/relationship attributes. He can authorize edits to Keystone's own submitted proposal within a defined delegated scope. He cannot promise college consent, owner permission or council votes. A separate fictional distributor operator could be added later; Brent is presently a developer, not an established beer licensee.

**Priorities and affected places.** Deliverable projects, usable/leasable space and sufficient access/parking. Current places are Route 22, south of campus and Ridge. Retain the margin-protecting personality from F-DEVELOPER, but treat minimum revenue, tenant requirements and lender constraints as unknown unless scenario facts define them.

**What changes his mind.** A feasible supported adjustment that protects the project, or an explicitly priced trade in scope. A site/layout comparison can support negotiation; inventing an unpriced borough subsidy cannot. S2/S6 help ground the practical questions, while his risk tolerance is fiction.

**Evidence / belief / flavor.** Evidence: plan fields, cost, quantities and legal plots. Belief: he thinks reduced parking may make leasing harder; the engine does not model lender approval. Flavor: professional and concrete; no automatic villainy.

**Examples using current fields.** Agree: on student lofts, accept `retail:true` if the authorized persona rule permits it: “Ground-floor shops fit the project. Show the revised borough cost before you confirm.” Counter: request to cut `stores:8→4` on Route 22: “Four storefronts removes too much of the scheme. I can offer six with the sidewalk kept in the plan.” Refuse: “I won't sponsor that reduction on these terms.” Refusal concerns his sponsorship; it must not claim the engine cannot represent four stores. These are proposed stance fixtures, not deterministic rules already implemented. Every counter shows the exact patch for the player's separate confirmation.

### P4 — Ellen Pryor, reserve-focused council member (`pryor`)

**Status and authority.** Existing Ward 2 council member. One vote, no executive authority over another actor's plan. Preserve her current weights and relationship unless separately approved.

**Priorities and affected places.** Borough cost, reserve resilience and long-term property value; town-wide rather than a newly invented property interest. S2 supports attention to fiscal consequences; her preference intensity is fictional/current game content.

**What changes her mind.** An engine-priced lower-cost plan, a credible funding explanation or documented long-term value. Calling a bond “free money” should not settle the upkeep issue. Do not invent a numerical reserve floor she requires.

**Evidence / belief / flavor.** Evidence: cost range, reserve after payment, upkeep and engine lean. Belief: a beneficial project may still be a poor use of limited reserves. Flavor: asks one clear budget question and acknowledges a real tradeoff.

**Agree/counter/refuse language.** Only pair “I can support it” with engine support. Counter/conditional opposition: “The buffer helps, but the borough cost rises to $190K. Bring me the funding tradeoff.” Refuse an endorsement: “No; the current cost still outweighs the case you've shown me.” Reactions do not change the plan, spend funds or guarantee a vote beyond the engine result.

### P5 — Rev. James Okafor, neighborhood-focused council member (`okafor`)

**Status and authority.** Existing Ward 3 council member; pastor, neighborhoods first. One vote. Preserve the existing multidimensional weights and relationship.

**Priorities and affected places.** Walking, household affordability, neighborhood quality, safety and useful local shops. A proposed relationship to a specific congregation property must not be invented as an affected-site fact. S2 supports considering housing, movement and facilities together.

**What changes his mind.** Concrete supported housing/access benefits with visible costs and drawbacks. He can support a project while asking for a better pedestrian outcome; that request must be representable before it becomes an authorized revision.

**Evidence / belief / flavor.** Evidence: housing/affordability/walking effects and engine lean. Belief: town growth should help existing families. Flavor: practical concern for daily routines, not a generic inspirational speech.

**Agree/counter/refuse language.** Agree with the compact Ridge candidate below: “I can support keeping the housing while reducing the damage. Walking still gets worse; I want that limitation on the record.” Counter: ask for a supported revised walking or affordability feature on an initiative where the schema permits it. Refuse an endorsement when engine support is low: “I haven't seen enough benefit for the households bearing the disruption.” For subdivision, do not offer a fictitious `sidewalk` field; that needs a new mechanic or a different authorized proposal.

## 4. Seeded and proposed stance fixtures

### Existing-engine comparison measured read-only

Executed a one-off Node VM evaluation of the unmodified engine at the pinned SHA. It created only in-memory objects: `s=E.newGame(2027)`; constructed a detached `subdivision` proposal from `E.P_DEFS.subdivision` with `defaultPlan('subdivision')`; compared it with `lotSize:'small',preserve:true`; called `effectsOf` and `memberStatement`. No annual progression, lobbying, save or source writes were involved. This is a synthetic comparison in the opening town, **not** the natural fourth-year state.

| Engine result | Original: 60 homes, large lots, no buffer | Candidate: 60 homes, small lots, buffer |
|---|---:|---:|
| Borough cost / high estimate ($K) | 150 / 162 | 190 / 205 |
| Annual upkeep ($K) | 15 | 15 |
| Housing effect (people) | 156 | 156 |
| Abstract farm-loss effect | 7.5 | 2.2857142857142856 |
| Walking effect | -3 | -1 |
| Ellen lean / public stance | 39 / oppose | 37 / oppose |
| James lean / public stance | 55 / undecided | 68 / support |
| Hal lean / public stance | 13 / oppose | 35 / oppose |

One factual pitch — “The compact plan keeps housing for 156 people, lowers the farmland effect from 7.5 to about 2.29 and costs $190K rather than $150K, with $15K annual upkeep” — should let James acknowledge a stronger neighborhood case, Ellen question the higher public cost, and Hal acknowledge mitigation while still opposing farmland conversion. These numbers are engine plan-comparison results; they are **not** pitch-credit measurements. Do not turn any reply into an automatic yes or add unearned persuasion. Current-engine statements can also recommend generic levers absent from the current kind; the UI should distinguish a negotiable field from an unsupported suggestion.

### Acceptance cases to freeze with the engine contract

All cases below are **proposed**, not implemented tests. PC-01 uses current supported fields; PC-02 onward require explicit authored facts or new capability. Shared criterion IDs should be assigned by the coordinator rather than inventing accepted MP rows here.

| Case | Controlled input / expected observable result | Scope/evidence |
|---|---|---|
| PC-01: contrasting council | Same detached comparison and same factual pitch for Ellen/James; reactions cite different priorities and match engine support. Hal acknowledges mitigation without being forced to agree. | Existing engine facts; dialogue/stance integration still needed. Preserve MP-025/028. |
| PC-02: working farm, access retained | Approved fixture supplies active operation, operator/owner IDs, leased/owned plots and a verified access route. Revision reduces land loss and retains access; farmer can agree within authority. | Proposed fact model; cannot derive from farm tile or `preserve:true`. |
| PC-03: buffer without viability | Same fixture, but usable access remains severed. Farmer counters or refuses support with the exact unresolved reason. Ownership unchanged. | Proposed access/viability rule; do not silently reduce to acres preserved. |
| PC-04: tenant versus owner | Identical adverse effect; change actor authority from tenant operator to owner-operator in two fixtures. Concern can stay the same; sale authorization differs. | Proposed authority data. No new blanket build veto. |
| PC-05: freight-only versus public sales | Same exact `campus_s` plots and route, `publicSales:false→true`; college adds customer-access/sales-safeguard concerns without hallucinating drinking on site. | Proposed operating facts; no current pricing/scoring implementation. |
| PC-06: on-site consumption requested | Same location; consumption request becomes a distinct operation/licensing scope requiring clarification or refusal of endorsement. | Do not pass as an ordinary distributor-field change or treat college as regulator. |
| PC-07: routing changes | Same sales/consumption facts; change only verified route conflict from campus access to an approved alternative. Delivery-conflict concern clears; alcohol-related concern remains if relevant. | Proposed route/conflict facts; the engine must validate alternative route identity and feasibility. |
| PC-08: unknown facts | Missing route, farm operator, site authority or operating mode yields clarification/explicit uncertainty, not a fabricated stance basis. | Required grounding rule; fixture distinct from live-provider quality. |
| PC-09: proposer counter/refusal | On current supported Keystone proposal, proposed stance rules allow one exact agreement, one alternate patch, one refusal. Preview displays authoritative fields; only player's explicit confirmation applies the authorized option. | Needs engine authorization/commit contract; never apply a counter merely because model prose sounds agreeable. |
| PC-10: changed revision | A response grounded in profile/site/plan revision R is offered after R+1. It cannot authorize an outdated patch or a factual claim that the current revision contradicts. | Engine/runner stale-result test; no live model needed. |

## 5. Minimum stance content contract recommendation

This is an interface proposal for the shared contract owner, not a frozen schema or implementation.

1. **Identity and revision:** stable `actorId`, role, profile version, scenario ID, proposal ID, exact site/plot identity and snapshot revision. Save-contained profile versions must be deliberate.
2. **Authority:** a structured scope such as own-proposal patch, own operational arrangement, stakeholder statement or individual council vote. Name delegations/controlled entities when they exist. A stakeholder's “agree” cannot authorize someone else's edit.
3. **Grounding:** concerns refer to engine/authored fact IDs and affected places; profile beliefs and flavor are separate. Each available fact has provenance/currentness. Unknown facts remain unknown.
4. **Outcome:** agree, counter, refuse or needs-clarification, with bounded reason codes. Technical feasibility and persona willingness are separate dimensions.
5. **Authorized option:** exact permitted patch and conditions, or no patch. Counteroffer conditions must be engine-recognized; model prose cannot grant subsidies, reroute trucks, transfer ownership or promise votes. State-changing application remains revision-checked and player-confirmed.
6. **Council explanation:** reference current engine support, addressed priorities and authorized pitch evidence. Persona text cannot assign its own numerical credit, weights or outcome.

Suggested reason vocabulary: `farm_loss`, `farm_access`, `operating_viability`, `authority_not_held`, `delivery_conflict`, `public_sales`, `consumption_scope`, `borough_cost`, `housing_benefit`, `walking_effect`, `unsupported_change`, `facts_missing`. This vocabulary is a proposal; unsupported reasons should not imply simulated effects. Keep external source references in the content/research dossier, and engine fact references in the actual request context.

## 6. Engine gaps and review decisions

| Gap / decision | Proposed owner | Recommended handling |
|---|---|---|
| New farmer and college identities, active farm status and actual actor authority | Persona builder proposes; engine owner validates scenario facts | Approve fictional facts explicitly; do not retrofit them as audit discoveries. |
| Alcohol business operation, public sales, on-site consumption, loading, hours | Engine contract owner, then persona/UI/adapter consumers | Keep out of normal playable claims until representable and priced/validated. Research fixtures can demonstrate differentiated concern in advance. |
| Farm access, connected land, leases/title/easements and minimum viability | Engine contract owner | Define only the minimum needed for approved gameplay; keep unknowns explicit. Do not introduce a general property-rights simulator through content. |
| Truck route topology, conflict detection, state/local permission and maintenance | Engine contract owner | No route can be validated from a road name alone. A narrow authored conflict fact may be sufficient for a reviewed fixture. |
| Agree/counter/refuse authorization and model wording boundary | Shared engine contract + Qwen adapter | Separate negotiated authority, feasibility and character reason; keep one explicit confirmation. Model failure must leave ordinary play available. |
| Existing-save profile updates | Engine/save owner; coordinator handles UI wiring | Embedded scenario data requires a reviewed migration/version policy if new content must reach old saves. Preserve stable IDs and relationships. |
| Farmer/college cases in first slice or later | Coordinator/product review, after missing briefs | Current-source facts support a small playable Keystone negotiation plus contrasting existing council members immediately. Farm and distributor claims need the proposed facts/capabilities above. The missing briefs may already resolve this sequencing. |

There is no basis here to identify the two Duo validation rejection rules. Persona research cannot substitute for correlated validator evidence. Real-provider intent fidelity and the Duo offline test remain separate from these code-derived and authored-fixture results.
