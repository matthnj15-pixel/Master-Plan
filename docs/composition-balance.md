# Composition engine assumptions

The dev-only composition engine uses fictional game balance, not measured
economic, freight, noise, agricultural viability, or legal impact estimates.
All numerical rules live in `src/engine.js`. `capabilities()` exports the exact
units, finite bounds, quantity-to-area density, coefficients, rendering role,
and component schema used by validation and pricing. The provider can interpret
these definitions; it cannot supply prices, geometry, votes, or authority.

`programSchema()`, `patchSchema()`, and `claimsSchema()` are detached closed
schemas. Thirteen capabilities span seven families. Housing quantities are
homes (2.4 capacity per home), workplace quantities staffed places, shops
storefronts, civic/recreation quantities daily participants, events peak
attendees, agriculture and landscaping plot equivalents, storage pallet bays,
access daily passages, parking spaces, drainage treated plot equivalents, and
policy one operating program. Labels and titles never select numerical rules.

Costs and annual upkeep are the sums of each capability's exported quantity
and area coefficients. A shared activity pays its quantity cost and half its
area fit-out cost. This does not add another physical footprint. Physical
programs add $30K mobilization, $15K per actively changed plot, plus the actual
acquisition/demolition estimate. Maintained access adds $25K and $1K/year;
buffers add $40K and $2K/year per plot equivalent; preservation adds $8K and
$0.5K/year. Affordable homes add $10K/home subsidy. Daytime freight scheduling
adds $12K and $1K/year. A service-lane alternative has its own authored $25K
and $2K/year staging allowance. Estimates use presenter detail and delivery
competence through the existing cost range and seeded delivery rules.

Component capacities constrain each area's density. Primary allocations follow
component order across the exact ordered chosen plots. Shared allocations
consume disjoint portions of their primary host, cumulatively bounded by the
host's floor area. Cycles, missing hosts, excessive density, and overflow reject;
the engine never drops or silently shrinks an activity. A segment is a schematic
strip within one plot: `{plot:[x,y],offset,area}`, with fractions from zero to one.
The renderer consumes this layout; no surveyed geometry is implied. Buffers
follow primary allocations. Explicit preservation occupies the selected site's
tail; unused land remains untouched. A partially preserved existing building
cannot also be demolished. Partial demolition of an operating multi-plot project
rejects until the whole active footprint is selected.

Retention protects whole buildings outside active allocations. Adaptive reuse
inside an occupied active building is unmodeled: current active allocations
require redevelopment. The capability metadata exposes this limit. Interpreters
must disclose it as an omission rather than represent reuse as demolition.

Activity employment and use scale with daily operating hours relative to ten
hours/day. Housing and land/infrastructure capacities do not. Longer activity
hours near homes increase a bounded local disturbance estimate, reduced by
buffer area. Drainage and parking affect the existing runoff model. These are
schematic game rules with visible forecast quantities, not sound measurements or
traffic engineering. Policy represents one generic operating program; repeated
titles/year IDs cannot stack another copy of its permanent benefits. With no
unmet opportunity the engine can explain why waiting is appropriate.

Fresh Millbrooke campaigns contain an explicitly fictional leased working-farm
arrangement and a freight-only distribution proposal. Authored lease/delegation
records, sites, public-sales/consumption facts, and service routes are stored in
the scenario. They are not inferred from terrain, job titles, or project names.
The farm operator controls its own operating proposal, not sale of leased land.
The distributor controls its submission; the college liaison is an advisory
stakeholder, not a licensing authority or a neighboring-land veto. Controllers,
hard interests, negotiable conditions, and independently verified prerequisites
are evaluated again at confirmation. A counter authorizes only its exact version.

Concerns and voices follow the [preserved persona dossier](reference/frozen-C/docs/contracts/proposal-council-v1/sources/approved-review/persona-dossier.md)
and the coordinator's `docs/persona-research-v2.md` primary-source amendment.
That research supports concerns and distinctions, not numerical coefficients.
Old saves gain the v4 command fields but no invented lease, permission, profile,
or active operation. Legacy plans keep their kind and fields: strict legacy
revision previews never translate bridge maintenance into a composed building.

Trusted scenario content can supply `scenario.programDefinitions` as an object
of `{id,label,program}` records keyed by the same ID. `programDefinitions(state)`
returns only closed, validated entries. Each definition uses the same preview,
revision, claim, command, construction, and replay APIs as uncatalogued programs.

Durable commands use sequential positive safe integers scoped by host-supplied
`gameId`, state revision, and the store's generation. SHA-256 hashes the complete
canonical command, including historical generation. The last **64 receipts**
retain their original result. Exact replay precedes freshness checks and returns
the historical receipt with current state and `applied:false`; pruned IDs remain
blocked by the high-water mark. The host assigns unique identities and atomically
persists the returned state/receipt. The engine does not generate random game IDs
or attempt storage-generation comparisons without the store's envelope.

Claim results persist semantic field, asserted value, actual value, verification
reason, member relevance, and repeated-claim status. Evidence must match the
original argument and explicitly support the asserted quantity/polarity/value.
The existing persuasion caps and two-pitch quota apply. Respectful conversation
is reported separately from factual points; claims do not execute offers.
Favors, earmarks, grants, votes, and funding require their own explicit commands.
Reaction reads require a retained persuasion receipt's ID, digest, and member.

Approval snapshots preserve the accepted program, conditions, geometry, pricing,
operating effects, and decision. Records link original intent, revisions,
controller, resources, observed delivery, and annual upkeep. Construction can run
over budget through existing seeded rules; the accepted physical program remains
the same. Opportunities respond to actual housing/commercial demand, runoff,
converted farmland, completed projects, current occupancy, and active programs.
