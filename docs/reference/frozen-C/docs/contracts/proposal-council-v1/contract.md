> Freeze authority: [README](README.md) and [freeze manifest](freeze-manifest.json). The exact per-action JSON schemas and pinned static data close the review document's type shorthand. Historical review-stage wording below does not block the user-authorized freeze or D/F dispatch. All implementation criteria remain Unverified. Original approved review bytes are preserved under sources/approved-review.

# Master Plan proposal and council contract — frozen R1.1

**Approved frozen R1.1, contractVersion `mp.proposals/1`. The containing commit is C. The user authorized freeze and D/F dispatch; no gameplay implementation is included in C.**

Audit baseline A remains `18dded6207f7217021d84b42aad6cc8e00b68f43`. All five briefs and [the exact R1.1 request](sources/approved-review/r1.1-request.md) were read. R1 and its ZIP remain unchanged. R1.1 changes only receipt binding/replay, same-save two-tab and format protection, one controlling authorizer with independent gates, and the declarative freeze-to-builder sequence. The commit containing this frozen manifest is C. Wave-2 base W1 and runnable/tested I remain unset.

| Requested correction | Concrete R1.1 decision | Affected evidence |
|---|---|---|
| 1. Receipt identity | Persist SHA-256 of the canonical original command including semantic binding, relevant actor/member/authorizer, and the original result. Compare a retained replay before current activation/key checks; reject changed bodies and wrong-member reactions. | C02/C11/C15/C18; F6/F8/F9 |
| 2. Two tabs and rollback | Same-origin Web Locks keyed to channel/save-slot, fresh authoritative read inside the lock, storage-generation comparison, versioned v4 namespace/fence and untouched legacy backup. No unsafe localStorage compare-and-set fallback. | C02/C14–17/C21; F6/F9 |
| 3. Authorizer and gates | Exactly one controllingAuthorizerId per confirmation; external consent/condition gates must already be satisfied by recognized records. Commitments created by this action are not circular preconditions. | C05/C06/C08–10; F3–F5/F6 |
| 4. Freeze sequence | C contains declarative inputs, expected rules, mock shapes and hashes. D implements executable fixtures/assertions only after freeze and dispatch; new observations follow D/W1/I. | C22; fixture freeze section |

Read with [brief reconciliation](sources/approved-review/brief-reconciliation.md), [audit addendum](sources/approved-review/audit-brief-reconciliation.md), [persona addendum](sources/approved-review/persona-brief-reconciliation.md), [acceptance matrix](acceptance.md), and [fixture specification](fixture-specification.md). Method names, types, limits and result codes below define the frozen contract; they do not describe existing exports.

## Player behavior and scope

The user has already approved private drafting, successful-post-only initiative use, feasible resident previews followed by grounded agree/counter/refuse, explicit confirmation of authorized revisions, and engine-scored in-character council reactions. Those choices are not approval questions in R1.1. Sources: [00:13](sources/briefs/00_Master_Plan_Overhaul_Start_Here.md:13), [01:36](sources/briefs/01_Master_Plan_Code_Audit_and_Engine_Contract.md:36), [01:37](sources/briefs/01_Master_Plan_Code_Audit_and_Engine_Contract.md:37).

The first contract includes literal market-and-housing on exact plots, a same-site alternative, a normal resident proposal, the working-farm/stand cases, the campus-adjacent distributor distinctions, and two contrasting council members. The market/resident/vote/year loop uses supported current simulation. Farm access/layout and distributor operations use explicitly authored **fixture-only** conditions and finite stance rules, with no invented quantitative economics. They exercise the shared boundary now; they are not a newly playable campaign or an assertion that current Millbrooke already simulates these operations. Sources: [01:43](sources/briefs/01_Master_Plan_Code_Audit_and_Engine_Contract.md:43), [04:38](sources/briefs/04_Master_Plan_Persona_Research_and_Council.md:38), [04:39](sources/briefs/04_Master_Plan_Persona_Research_and_Council.md:39).

The user approved that fixture-only first-slice boundary and the private recovery defaults. Persistent farm economics, alcohol licensing, truck costs/noise, a new general landowner veto, street-level design, and plan-history archives remain outside the slice. Unsupported details remain visible omissions; a useful subset requires separate scope acknowledgment. No storefront is silently relabeled an alcohol business, and no generic farm tile proves ownership or viability. Those approved choices are not reopened by R1.1.

## Types and capabilities

The engine is the only source of capabilities, facts, legal geometry, prices, forecasts, authorizations, credit and outcomes. New dev behavior uses `proposalCouncilV1` (`dev:true`, `stable:false`); legacy flag-off behavior and save boundaries remain protected. Trusted fixture definitions can opt into additional capability IDs; current Millbrooke does not acquire them merely because a model emits their names.

```ts
type ContractVersion = 'mp.proposals/1'; // frozen R1.1 wire version
type Plot = readonly [number, number];
type DurableStateRef = {
  gameId: string; scenarioId: string; turn: number; stateRevision: number;
};
type StateRef = DurableStateRef & {
  activationId: string; // runtime-only session/load identity, not game progress
};
type StorageRef = {
  channel: 'dev' | 'stable'; saveSlotId: 'primary';
  storageGeneration: number; gameId: string; stateRevision: number;
};
type ProposalRef = {
  proposalId: string; proposalRevision: number;
  competitionId: string | null; competitionRevision: number | null;
};
type Fact = {
  id: string; value: boolean | number | string | readonly string[];
  source: 'simulated' | 'scenario-authored'; revision: number;
  kind: 'observed' | 'authored_fact' | 'authored_rule';
  units?: string; affectedIds: readonly string[];
};
type ProfileStatement = {
  id: string; text: string; category: 'character-belief' | 'flavor';
};
type Change =
  | { type: 'plan-field'; field: string; value: boolean | number | string }
  | { type: 'operating-condition'; entityId: string; field: string;
      value: boolean | number | string; capabilityId: string };
type Omission = {
  id: string; requestedPart: string;
  code: 'unsupported_operation' | 'intent_unclear' | 'unpriced_effect';
};
type Geometry = { plots: readonly Plot[]; cellRoles: readonly {
  plot: Plot; role: string;
}[]; illustrativeInterior: boolean };
```

`gameId` identifies a particular game, not seed or scenario alone. The trusted UI/save boundary supplies an opaque unique ID once and persists it before requests; deterministic engine tests inject fixed IDs. No unseeded randomness is added to simulation or repeated migration. Two towns with seed 2301 have different IDs. `plots` is the **exact ordered** list: role assignment currently depends on order. Duplicate, fractional, out-of-bounds, road/water, or newly committed construction selections are rejected, not filtered. Preserve the source site and untouched fields on a resident revision. Engine capacity fitting may change quantities only with explicit before/after explanation and confirmation; it cannot change the selected boundary. An intentional new-site proposal requires a new draft, not a hidden resident move.

`activationId` belongs to a runtime proposal session created by `ENGINE.createProposalSession({engine: ENGINE, activationId, storageRef})`. The trusted host supplies the detached immutable StorageRef from the authoritative persisted envelope, as specified in README. All methods below belong to that session. Replace/dispose the session and its issued-key registry on every new game, save load/import or account-state replacement, including an older/equal snapshot with the same gameId and revision. Old keys are invalid in a new session. Changing provider, selected plots, intended action, text or sheet cancels the relevant request ticket; a queued result needs both current StateRef and current UI ticket before it can produce a confirmable candidate. This runtime revocation is separate from persisted stateRevision.

`readProposalContext` returns detached immutable data. Relevant history is at most the latest three recognized relevant game actions, with actor/place/proposal links and actual completion/commitment status. Relationship is the engine's current value/band. It includes no arbitrary transcript, invented prior promise, full save or unrelated personal history. Profiles explicitly distinguish ordered interests, hard constraints, negotiable preferences, affected places, evidence, concessions, relationship/history sensitivity and voice. Beliefs can explain a concern; they are never promoted to a verified fact. Source: [04:32](sources/briefs/04_Master_Plan_Persona_Research_and_Council.md:32).

## Engine methods

| Method | Input | Output / side effects |
|---|---|---|
| `nextActionIdentity(state)` | Current authoritative state | Deterministic next action sequence and canonical actionId; no reservation or state change. |
| `readProposalContext(state, scope)` | Optional proposal/actor IDs, exact selected plots | `Context`: `contractVersion`, StateRef, ProposalRef where applicable, capabilities, field/operation schemas, scoped facts/profiles/history, legal geometry, draft/post eligibility and reasons. Read-only. |
| `previewProposalCandidate(state, request)` | StateRef, request ID, purpose `draft` or `resident-revision`, ProposalRef for revisions, exact plots or one engine-resolved named site, typed changes, intent mapping/omissions, optional ScopeAck | `CandidateResult`: feasible ready candidate, `scope_review`, clarify, unsupported, infeasible, stale or invalid. Read-only, including initiative/relationships/public chats. |
| `acknowledgeSupportedScope(state, request)` | StateRef, proposed subset preview key and the exact omission IDs the player has acknowledged | `ScopeAck` bound to that snapshot/subset/omission list. Read-only; it neither posts nor confirms a revision. |
| `evaluatePresenterStance(state, request)` | StateRef, feasible requested candidate key, actor ID | Canonical `StanceResult` with reasons, authorizations, and separately evaluated counter candidate where applicable. Read-only. Must follow presentation of the requested feasible option. |
| `evaluatePitchClaims(state, request)` | StateRef, ProposalRef, member ID, original argument, up to eight typed claims/evidence spans, argument intent, request ID, source `typed` or `quick` | Read-only `PitchEvaluation`: verified/rejected claims, engine-derived addressed priorities/specificity/credit, applicable caps, and a commit key. No numerical mutation. |
| `previewFundingChoice(state, request)` | StateRef, ProposalRef, explicit cash/bond choice for the reviewed decision options | Detached `FundingChoice` with each relevant option's actual eligibility, payment and ongoing obligation. No spend. |
| `bindConfirmedAction(state, confirmedAction)` | Player-confirmed action and its live candidate/evaluation/funding/gate references | Immutable full Command with engine-resolved semantic binding. No mutation; provider output cannot create this binding. |
| `commitProposalAction(state, command)` | Discriminated command below, stable action ID, current StateRef and action-specific candidate/evaluation/choice keys plus semantic binding | `CommitResult` with either wholly updated state plus one receipt or unchanged state plus failure. Retained exact replays are resolved before fresh-key validation; new mutations run through the save-slot writer protocol. |
| `readReactionContext(state, request)` | Actual retained pitch receipt ID, member ID and its command fingerprint | Actual receipt/reaction context only when receipt type and member/fingerprint match. Wrong-member receipt use is rejected. Cannot re-score or commit. |

All methods are pure with respect to their supplied authoritative state except `commitProposalAction`, which **returns** a new authoritative state on success. The implementation can run legacy mutators against a detached transaction copy; it must not expose a partly changed live state on failure. No preview calls live `makeInitiative` and then reverses its side effects.

The request/result shapes are:

```ts
type Scope = { target?: ProposalRef; actorIds: readonly string[];
  selection?: { plots: readonly Plot[] } | { namedSiteId: string } };
type Context = {
  contractVersion: ContractVersion; ref: StateRef; target: ProposalRef | null;
  storageRef: StorageRef;
  nextAction: { actionSeq: number; actionId: string };
  capabilities: readonly string[]; editableFields: Readonly<Record<string, object>>;
  editableOperations: Readonly<Record<string, object>>;
  facts: readonly Fact[]; profiles: readonly ActorProfile[];
  relevantHistory: readonly RecordedAction[]; geometry: Geometry;
  canDraft: boolean; canPost: boolean; postBlockCode: ResultCode;
};
type CandidateRequest = {
  requestId: string; base: StateRef; intent: string;
  purpose: 'draft' | 'resident-revision'; target: ProposalRef | null;
  selection: { plots: readonly Plot[] } | { namedSiteId: string } | null;
  changes: readonly Change[]; omissions: readonly Omission[];
  assumptions: readonly string[]; scopeAck: ScopeAck | null;
};
type ScopeAckRequest = { base: StateRef; subsetPreviewKey: string;
  omissionIds: readonly string[] };
type StanceRequest = { base: StateRef; requestedPreviewKey: string;
  actorId: string };
type PitchRequest = { base: StateRef; target: ProposalRef; requestId: string;
  memberId: string; argument: string; claims: readonly PitchClaim[];
  argumentIntent: 'support' | 'oppose' | 'question' | 'offer';
  source: 'typed' | 'quick' };
type FundingRequest = { base: StateRef; target: ProposalRef;
  optionMethods: readonly { proposalId: string; method: 'cash' | 'bond' }[] };
type FundingChoice = { fundingChoiceKey: string; base: StateRef;
  target: ProposalRef; optionMethods: FundingRequest['optionMethods'];
  options: readonly { proposalId: string; eligible: boolean; costK: number;
    reserveAfterCashK: number; bondAnnualK: number }[] };
type ReadOutcome<T> =
  | { status: 'ready'; code: 'none'; value: T }
  | { status: 'scope_review'; code: 'scope_ack_required'; value: T }
  | { status: 'clarify' | 'unsupported' | 'infeasible' | 'stale' | 'invalid';
      code: ResultCode; value: null; fieldIds: readonly string[] };
type ReactionRequest = {
  receiptId: string; memberId: string; commandFingerprint: string;
};
```

`CandidateRequest.target` is null only for a draft; a resident request requires target and its original geometry. Plan kinds determine exact field schemas from current KINDS params, not arbitrary objects accepted from a model. `ActorProfile` is the trusted versioned table described under stance; `RecordedAction` is a scoped projection of real receipts/history, never a prose claim that an action happened. `ReadOutcome.scope_review` is used only for a provisional subset candidate. Context reads return Context directly; other pure evaluate/preview methods return the corresponding ReadOutcome. Session key lookups require live issuance in the current activation, not merely a matching string supplied by a provider.

## Candidate and resident ordering

```ts
type Candidate = {
  contractVersion: ContractVersion; candidateId: string; requestId: string;
  base: StateRef; target: ProposalRef | null;
  purpose: 'draft' | 'resident-revision'; previewKey: string;
  requestedChanges: readonly Change[]; acceptedChanges: readonly Change[];
  omissions: readonly Omission[]; assumptions: readonly string[];
  scopeAck: ScopeAck | null;
  before: { plan: object | null; geometry: Geometry; conditions: object };
  after: { plan: object; geometry: Geometry; conditions: object };
  constraints: readonly { code: ResultCode; fields: readonly string[] }[];
  forecast: {
    before: EngineForecast | null; after: EngineForecast;
    delta: EngineForecastDelta; unmodeledEffects: readonly string[];
  };
  controllingAuthorizerId: string | null;
  blockingGates: readonly ConfirmationGate[];
  createdCommitments: readonly CreatedCommitment[];
  confirmable: boolean;
};
type ScopeAck = {
  scopeKey: string; base: StateRef; subsetPreviewKey: string;
  omissionIds: readonly string[];
};
```

`EngineForecast` is the engine's actual cost/high estimate, upkeep, all supported impacts, demolition/acquisition, funding and per-member support/tally. The UI renders the same geometry/accepted values and labels approximate interior placement. Forecasts, diagrams and authorizations all carry the same revision and preview key. The model cannot supply these quantities. Current simulation deltas and scenario-authored condition changes are reported separately; zero represented economic delta does not claim unmodeled operating changes are costless.

```ts
type EngineForecast = {
  money: { costK: number; costHighK: number; annualUpkeepK: number;
    reserveAfterCashK: number; bondAnnualK: number };
  effects: { jobs: number; units: number; housing: number; walk: number;
    live: number; conf: number; prop: number; approval: number; farm: number;
    parking: number; safety: number; afford: number; storm: number;
    downtown: number; creek: number; bridgeRisk?: number; students?: number;
    notes: readonly string[] };
  demolition: { costK: number; displacedResidents: number;
    lostStorefronts: number; acquisitionWarning: string | null };
  support: readonly { memberId: string; lean: number;
    preferredOptionId: string | 'no' }[];
  tally: Readonly<Record<string, number>>; predictedWinnerId: string | null;
  funding: { cashEligible: boolean; bondEligible: boolean };
  deliveryOdds: number; constructionStage: 'proposed' | 'pending' | 'built';
};
type EngineForecastDelta = {
  money: EngineForecast['money'];
  effects: Omit<EngineForecast['effects'], 'notes'>;
  memberLean: readonly { memberId: string; delta: number }[];
};
```

Absent optional legacy effect fields are represented as zero only for an actually supported simulation quantity. Authored route/access conditions use their separate change/reason list, not invented fields inside `effects`. D records unit conventions from the existing engine in the frozen fixture outputs; `housing` is the existing people-capacity effect, not an invented count of homes. The `money`/`effects` fields in delta are arithmetic differences, never a second pricing formula.

Resident flow is fixed: interpret a narrow request → validate and price the requested option → **display the feasible requested preview with its consequences** → evaluate/display canonical proposer stance → display a separate counter if any → explicit player confirmation of an authorized option → revision-checked commit. A refusal never suppresses the feasible requested preview. While stance/dialogue is loading, the public plan and requested preview remain available. Source: [01:37](sources/briefs/01_Master_Plan_Code_Audit_and_Engine_Contract.md:37).

Unknown fields, wrong types, invalid steps/ranges and unsupported operations are not silently coerced by the new boundary. Existing engine fitting is allowed only when the changed quantities are shown, intent omissions are recorded, and material scope changes receive the scope acknowledgment before a confirmable subset exists. `scope_review` can show the provisional supported subset for review; its Post/Apply controls are disabled. “Use supported scope” creates ScopeAck; **Put on agenda** or **Confirm revision** remains a later explicit action. Sources: [02:11](sources/briefs/02_Master_Plan_Proposal_and_Council_Experience.md:11), [03:20](sources/briefs/03_Master_Plan_Qwen_Orchestration_and_Evaluation.md:20).

Draft availability is separate from post availability. Private exploration remains available in the current agenda phase even when `initiativeYear === year`; only posting is blocked. A private alternative is not a public competing proposal or a reservation. No implicit action occurs on closing, retrying, switching a comparison, changing plots, or successful generation.

## Stance, authority and commitments

```ts
type StanceResult = {
  stanceKey: string; base: StateRef; requestedPreviewKey: string;
  actorId: string; profileVersion: number;
  stance: 'agree' | 'counter' | 'refuse' | 'clarify';
  reasonCodes: readonly StanceReason[]; factRefs: readonly string[];
  authority: 'own-proposal' | 'own-operation' | 'stakeholder-statement';
  controllingAuthorizerId: string | null;
  authorizedPreviewKeys: readonly string[];
  counterCandidates: readonly Candidate[];
  suggestedPreviewKeys: readonly string[];
  blockingGates: readonly ConfirmationGate[];
  createdCommitments: readonly CreatedCommitment[];
};
type ConfirmationGate = {
  gateId: string; kind: 'required-consent' | 'existing-condition';
  status: 'satisfied' | 'unresolved' | 'unsupported';
  factRefs: readonly string[];
  satisfiedBy: { recordedActionId: string; factRevision: number } | null;
  recognizedResolutionAction: string | null;
};
type CreatedCommitment = {
  operationRef: string; value: boolean | number | string;
  createdStage: 'committed';
  inEffectWhen: 'decision-approved' | 'project-completed' | 'existing-operation';
};
```

Material stance is determined by a trusted, versioned rule table: ordered rules with exact fact predicates and predeclared counter operations, first matching rule wins; missing required facts yields clarify. Permitted predicates are `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, set membership and explicit `all`/`any` combinations. They read engine/scenario facts, actual relationship and recognized history only. Profiles and fixture definitions contain no arbitrary model code. Counter lists have a stable order and exact field patches. The same candidate/state/profile gives the same stance, concessions, authority and material support consequences across repeats. Voice may vary. Sources: [04:34](sources/briefs/04_Master_Plan_Persona_Research_and_Council.md:34), [04:41](sources/briefs/04_Master_Plan_Persona_Research_and_Council.md:41).

Agree authorizes only the displayed permitted patch. Counter authorizes only its separately previewed exact option. Refuse authorizes none; the player can ask again or leave the public plan intact. The model can express the canonical answer; it cannot select a materially different counter or change its thresholds. A suggestion outside the canonical options remains an unaccepted new request, requiring preview and deterministic re-evaluation.

A confirmation has **exactly one controlling authorizer**, never an array of coauthorizers. Post-draft uses the canonical player role `mayor`; resident changes use the proposer within its recorded scope; an own-operation change uses its recorded operator/controller. Candidate, relevant stance and confirmation command must name that same singular controllingAuthorizerId (post has no NPC stance). A stakeholder-only stance has controllingAuthorizerId:null and cannot authorize a confirmation. A college liaison can endorse or suggest an option but cannot become Keystone's coauthorizer, issue a license or cast a council vote. Farmer title/tenure and delegation remain recorded fixture facts. No general owner veto is added to MP-035.

Any required external consent or existing condition is a **separate blocking gate**, not another controlling authorizer and not implied by friendly prose. Every gate must be satisfied by a current trusted fact tied to a recognized completed/recorded game action. UI Confirm is disabled while any gate is unresolved/unsupported; engine confirmation independently returns `required_consent_unresolved` or `condition_unresolved` with no plan/resource/receipt changes. A caller cannot send `status:satisfied`; the engine derives it. If a gate has no recognized resolution action in this slice, report unsupported; do not invent a new consent mechanic or fabricate a consent receipt. Complete a supported outside action, then re-preview at the new revision before confirmation.

The normal Route22, farmer-own-stand and campus-proposer fixtures require one actual controlling authorizer and no invented external consent. Negative gate fixtures explicitly supply unresolved gates to test blocking. College stakeholder support is not silently made a legally required consent. R1.1 does not expand the first roster into multi-party signature handling.

Saying “I promise” does not change an operative fact. A candidate's **createdCommitments** are results this action will create, separate from its already-required blocking gates. For example, confirming Keystone's authorized route condition creates that condition at `committed`; it must not require the same not-yet-created condition to be committed beforehand. `in-effect` still requires the actual relevant decision/completion stage. A distinct prerequisite must be satisfied by a prior recognized action and re-preview, not bundled away. Profiles distinguish requested, committed and in-effect; conditional support can refer to a projected candidate condition without claiming it already happened.

Stance reason enum: `farm_access_retained`, `farm_access_blocked`, `working_site_consumed`, `farm_succession_priority`, `route_conflict`, `route_conflict_cleared`, `public_sales_exposure`, `consumption_scope_changed`, `operating_needs`, `borough_cost`, `housing_benefit`, `walking_effect`, `parking_tradeoff`, `leasable_space`, `relationship_context`, `recorded_commitment`, `authority_not_held`, `facts_missing`, `unsupported_change`. A reason carries its source class; a belief about sales is not a measured harm.

## Council: extract, score once, then react

Pitch orchestration is fixed:

1. The model extracts structured claims, evidence references/spans and argument intent from the player's current text. It returns **no** specificity class, credit, points, vote, mood-based numeric delta, offer execution, or invented plan changes.
2. The engine validates each claim against current proposal/site/town facts and the actual argument. It maps verified claims to that member's supported priorities and derives specificity/eligible credit. Invalid claims receive zero credit; other verified claims in the same argument may still earn their allowed credit.
3. On the player's Send action and a current valid extraction, `commit-pitch` applies the existing capped persuasion once, records actual relationship/quota/support changes, and produces one durable receipt.
4. Only then generate the optional in-character reaction from that actual receipt, remaining concerns and scoped profile/history. Reaction failure uses the engine's factual fallback and does not undo, repeat or add credit. Late prose attaches only to its historical receipt or is discarded; it cannot mutate the current plan, lean, relationship or quota.

Sources: [03:13](sources/briefs/03_Master_Plan_Qwen_Orchestration_and_Evaluation.md:13), [04:40](sources/briefs/04_Master_Plan_Persona_Research_and_Council.md:40).

```ts
type PitchClaim = {
  claimId: string; factRef: string;
  assertion: boolean | number | string;
  evidence: { start: number; end: number }; // exact player-text span
  relation: 'current-fact' | 'comparison' | 'supported-consequence';
  comparisonFactRef?: string;
};
type PitchEvaluation = {
  pitchKey: string; base: StateRef; target: ProposalRef; memberId: string;
  claimResults: readonly { claimId: string; factRef: string;
    valid: boolean; code: ResultCode; creditEligible: boolean }[];
  addressedPriorities: readonly string[];
  specificity: 'strong' | 'weak' | 'quick' | 'none'; // ENGINE ONLY
  tone: 'respectful' | 'pushy' | 'hostile'; // ENGINE ONLY
  caps: { argumentLean: number; favorLean: 15; earmarkLean: 8 };
  remainingConcerns: readonly string[];
};
```

Evidence spans must match the original argument; a model cannot add a feature by inventing a fact reference. Engine alias/value tables check each supported claim. Present and absent boolean values, current/comparison quantities, and trusted supported consequences must match current facts. Incorrect references, mismatched quotes, stale comparisons and asserted absent features are rejected. A true named concrete feature/consequence or correct quantity linked to a relevant priority is `strong`; a relevant but nonspecific concern is `weak`; quick controls force `quick`; generic/irrelevant/only-false material is `none`. Priority mapping and tone rules are deterministic engine tables, not provider classifications. Typed unsupported threats/offers do not execute an offer; tone penalties retain existing semantics.

Retain existing numeric implementation: strong argument ≤10 visible lean points, weak/quick ≤3, favor ≤15, earmark ≤8, existing raw point caps, hostile/pushy effects, respectful-conversation relationship effect, capital/cash checks, and two pitches per member/year. Engine-enforce the existing quota currently exposed by UI. A false absent-feature claim earns **zero factual persuasion for that claim**; a separate existing respectful-conversation effect is reported separately and does not become evidence the false statement was credited. Valid extraction with zero eligible claims can still be a completed `none` pitch under the existing conversation rules; unavailable/invalid/canceled/stale extraction has no committed pitch, relation change or quota spend.

## Explicit commands and atomic receipts

```ts
type ActionType =
  | 'post-draft' | 'confirm-revision' | 'confirm-operating-condition'
  | 'commit-pitch' | 'spend-favor' | 'spend-earmark'
  | 'call-vote' | 'approve-mayoral' | 'apply-grant'
  | 'table-proposal' | 'reject-proposal' | 'set-tax-rate' | 'advance-year';
type CommandBase = {
  contractVersion: ContractVersion; actionId: string; base: StateRef;
  actionSeq: number; // current persisted actionHighWater + 1
  expectedStorage: StorageRef;
  semanticBinding: ActionSemantic;
};
type Command = CommandBase & (
  | { type: 'post-draft'; candidateKey: string; scopeKey: string | null;
      controllingAuthorizerId: 'mayor' }
  | { type: 'confirm-revision'; target: ProposalRef; candidateKey: string;
      stanceKey: string; controllingAuthorizerId: string;
      scopeKey: string | null }
  | { type: 'confirm-operating-condition'; target: ProposalRef;
      candidateKey: string; stanceKey: string;
      controllingAuthorizerId: string }
  | { type: 'commit-pitch'; target: ProposalRef; memberId: string;
      pitchKey: string }
  | { type: 'spend-favor'; target: ProposalRef; memberId: string }
  | { type: 'spend-earmark'; target: ProposalRef; memberId: string;
      amountK: number }
  | { type: 'call-vote'; target: ProposalRef; fundingChoiceKey: string }
  | { type: 'approve-mayoral'; target: ProposalRef; fundingChoiceKey: string }
  | { type: 'apply-grant'; target: ProposalRef }
  | { type: 'table-proposal'; target: ProposalRef }
  | { type: 'reject-proposal'; target: ProposalRef }
  | { type: 'set-tax-rate'; taxRate: 'lower' | 'hold' | 'raise' }
  | { type: 'advance-year' }
);
type Receipt = {
  actionId: string; actionSeq: number; type: ActionType;
  commandFingerprint: string; // exactly 'sha256:' + 64 lowercase hex digits
  actorId: string; memberId: string | null;
  controllingAuthorizerId: string | null;
  before: DurableStateRef; after: DurableStateRef;
  target: ProposalRef | null; code: 'applied';
  appliedChanges: readonly Change[]; resourceDelta: object;
  claimResults: readonly object[]; supportBefore: object | null;
  supportAfter: object | null; reasonCodes: readonly string[];
  originalResult: {
    code: 'applied'; target: ProposalRef | null;
    appliedChanges: readonly Change[]; resourceDelta: object;
    claimResults: readonly object[]; supportBefore: object | null;
    supportAfter: object | null; reasonCodes: readonly string[];
  };
};
type CommitResult =
  | { ok: true; state: GameState; receipt: Receipt; applied: true }
  | { ok: true; state: GameState; receipt: Receipt; applied: false;
      code: 'already_applied'; originalResult: Receipt['originalResult'] }
  | { ok: false; state: GameState; code: ResultCode };
```

Extra action-inapplicable fields are rejected. `confirm-operating-condition` accepts only declared operating conditions with the one actual controlling authorizer; it never authorizes an unpriced physical plan change. Scope/authorizer checks and all independent gates apply even when scopeKey is null. Provider output cannot construct a Command or ActionSemantic; `bindConfirmedAction` resolves these from the current engine-issued candidates/evaluations and the player's chosen action.

### Canonical semantic binding and fingerprint

`ActionSemantic` is a versioned discriminated payload (`schema:'mp.action-semantic/1'`, same action type) that contains the **actual accepted choice**, not just an ephemeral key:

| Action | Required immutable semantic binding |
|---|---|
| post/revision/operating confirmation | Relevant actor ID; singular controllingAuthorizerId for confirmations; target/revisions; complete accepted plan and ordered exact plots/cellRoles; accepted ordered operating changes; profile/authorization scope revision; exact acknowledged omissions/scope; satisfied gate fact/action references; commitments this action creates. Private intent is represented only by its UTF-8 SHA-256 digest. |
| pitch | memberId; target/revision; source typed/quick; original argument digest; accepted/rejected claims and evidence spans/fact revisions; engine specificity/tone/addressed priorities and capped application. No raw prompt/model reply is stored. |
| favor/earmark | memberId, target/revision, explicit offer type/amount; resource eligibility context. |
| vote/mayoral approval | target/competition revisions and ordered explicit option-to-funding choices. No silent cash/bond substitution. |
| grant/table/reject | Exact target/revision and action kind. |
| tax/year | Exact selected tax rate or advance-year intent with its original durable base. |

All subject fields must agree with the command and engine-resolved source. **Every receipt has a non-null actorId:** post, pitch, favor, earmark, vote/mayoral decision, grant/table/reject, tax and year use the canonical player-role ID `mayor`; resident/operating confirmations use their one controlling proposer/operator ID. Pitch/favor/earmark additionally require non-null memberId for the affected council member; other actions use memberId:null. No receipt may have both subject fields null. Post and resident/operating confirmations persist their non-null controllingAuthorizerId; actions without that confirmation role use null. These fixed subject IDs are included in semanticBinding and copied into the receipt, never inferred from later prose.

For a new action, live key lookup, current-state recomputation, actual authority and gate checks validate the entire semanticBinding before any write. Changing a key cannot select one option while presenting another option's semantic binding. The actor/member stored in the receipt is copied from this validated binding, not a later prose request.

The command fingerprint is `sha256:` plus lowercase SHA-256 of UTF-8 **canonical JSON of the complete original validated Command**. Canonicalization uses the exact action schema: nullable required fields must be present as explicit null; reject missing required/unknown fields and non-finite numbers; normalize numeric −0 to0; sort object keys lexicographically by UTF-16 code units; encode values with JSON string/number rules and no whitespace. Strings receive no Unicode/case/whitespace normalization. Arrays keep their exact order, especially plots, cellRoles, changes and funding options. The fingerprint field itself is not an input field of Command. The original durable base, expectedStorage, activationId and original key strings are historical values in this canonical input. A key string alone is never the semantic identity. Object key insertion order is immaterial; different accepted choices, subjects, ordered geometry or original command values are not exact replays.

Persist this fingerprint, subject IDs and originalResult in the same receipt/snapshot. Exact replay after reload submits the original command values, including original activation/key strings; computing its canonical JSON needs **no current key registry lookup**. A new activation does not alter the old command for replay. The matching digest permits return of a historical result only, never renewed authority. Receipts do not store full prompts/replies or private draft text; semanticBinding contains accepted public data and text digests.

Posting checks game/turn/site/candidate, effective scope and current annual **initiative eligibility**, then adds one `init<turn>` agenda entry and sets `initiativeYear` in one returned state/serialized save. It does not require enough cash to fund the project: the market fixture costs $940K while opening reserve is $900K and can still be posted. It does not fund, approve or build. Used initiative blocks posting, not private drafting. Revision preserves author/site/untouched fields and applies only the authorized candidate. Formal vote is a distinct command using the current engine winner/decision route; funding is separately selected and previewed by the player. Cash/bond is applied only through the successful formal decision, once; do not silently switch the player's chosen method. A different winning option must have a valid reviewed FundingChoice. Favors/earmarks and year advancement are separate explicit commands. Neither model failure nor optional narrative delays vote/year simulation.

Replay order, applied under the save-slot lock below:

1. Parse the exact Command schema and validate canonical actionId/gameId/sequence format; canonicalize the original values without consulting live candidate/stance/pitch registries.
2. Look for that actionId in the freshly loaded retained receipts of the same game. If found, compare the freshly computed fingerprint. Exact match returns the **original stored receipt/result**, `applied:false`, and **the current state unchanged**. Never publish the receipt's historical state or reconstruct its result from current facts. A different fingerprint/actor/member/body returns `command_mismatch` and no effect.
3. If no retained receipt exists and actionSeq is at/below actionHighWater, return `duplicate_action`; the original result is no longer promised after that receipt is pruned.
4. For a genuinely new next action, check current storage generation/gameId/revision, activation, target, live keys, full semantic binding, authority/gates, quota and resources, then prepare exactly one transition. Old keys cannot pass here.

Canonical IDs remain `mpa1.<base64url(UTF-8 gameId), no padding>.<positive decimal actionSeq, no leading zeros>`. Every success increments stateRevision and persisted actionHighWater; proposal edits also increment proposalRevision. Keep the latest **256** receipts, never trim the high-water mark, and never pair an old ID with a fresh sequence. Annual/terminal-status guards remain independent. Receipt state refs exclude activationId; the canonical fingerprint binds the original runtime fields only as historical command input, not active authority.

`readReactionContext` accepts only a retained `commit-pitch` receipt whose stored memberId matches the requested member and whose fingerprint matches the supplied receipt fingerprint. Otherwise return `reaction_member_mismatch` or `receipt_not_found`/`command_mismatch`, no narrative attachment and no mutation. Post-score generation/attachment is bound to that same receipt+member+fingerprint; a Pryor receipt cannot feed an Okafor reaction. Historical receipt reads never apply persuasion again.

All authoritative changes relevant to forecasts or authority invalidate outstanding candidates: cash/capital, plan/conditions, relationships, lobby/quota, grants, pending/built work, exact occupancy, scenario facts/profile version, public decisions, tax/policy, time and state replacement. D must route official dev mutations through revision-aware transitions, and commits must additionally compare an engine-owned dependency signature/recomputed preview so a legacy direct write cannot bypass freshness. Comparison/typing/camera/local draft changes are not game revisions. Any candidate key is recomputed/checked against current real values; cached model fields and old forecast numbers never confer authority.

Same-site behavior preserves current group exclusivity: public Old Mill options can coexist; approving one rejects the other once. Private drafts create no reservation. Overlapping non-group proposals can be previewed/posted as options, but construction commitment wins by explicit approved decision; a later overlapping commit must fail `site_conflict` and require a fresh preview rather than overwrite pending construction. Already built/occupied land can be deliberately redeveloped with current demolition/acquisition consequences; it is not globally forbidden. A grant-tabled/committed item and any overlapping actual site commitment are included in freshness and site-conflict tests. No new political priority rule or duplicate funding is introduced.

### Same-save two-tab writer protocol

Use browser Web Locks in a secure context. The exclusive local writer lock name is exactly **`masterplan.save-slot.<channel>.primary`**, with the browser origin implicit. It contains no gameId, seed, format number, feature flag or deployment revision: new game, migration, import and cached compatible deployments must still compete for the same save slot. Cooperative same-origin tabs/workers share Web Locks; the callback's returned promise controls the lock lifetime. These are API guarantees, not evidence of support on the Duo. Sources: [MDN Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API), [HTML Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html).

The required sequence for every updated writer is:

1. Capture the player's action/input and its expected StorageRef. Generate/interpret/preview outside the save lock; never hold a writer lock across AI generation.
2. Request the exclusive slot lock. **Inside the acquired callback**, read and validate the current v4 envelope/fence from storage again. Do not use the tab's S object or a prior read as the authoritative save.
3. For retained replay, compare the canonical command fingerprint and return the stored result as described above without a write. For a new mutation, compare the captured storageGeneration, gameId and stateRevision with the freshly read envelope, then check activation/dependencies/current engine preconditions. A mismatch returns `save_conflict`/`stale_revision` with input preserved, not last-writer-wins.
4. Prepare against that freshly loaded authoritative state while the lock remains held. One complete v4 envelope write includes next storageGeneration, state/agenda/initiative/receipt/high-water and the unchanged format fence/backup. Only after storage succeeds publish the new live state and durable success. Release the lock when the callback finishes.
5. On failure, retain private input and the prepared attempt. A retry reacquires the same lock and rereads/rechecks the exact original storage/base/activation. If another action succeeded, discard the staged result and re-preview; never write an old S snapshot over a newer envelope. Exact durable replay still returns its original result with current state untouched.

Every successful authoritative snapshot write increments **storageGeneration**, including migration, new game, save replacement, tax/decision/year commands and any genuine autosave mutation. New game changes gameId but never resets the slot generation. A stale autosave cannot write an old serialized S; under the lock it must either see unchanged expected generation or drop its obsolete job. Optional autosave of an unchanged already-durable snapshot is a no-op. Notifications from `storage`/BroadcastChannel may refresh a view but are not locks or permission to write.

All updated local writer paths use this protocol: initialization/migration, new game, all gameplay mutations, import/reset/replace, autosave, account-source replacement and save-related dev controls. Keep the existing in-tab action queue as an additional UI convenience, not the two-tab guarantee. Web Storage read/compare/set alone provides no compare-and-set lock; do not use a timeout lease, `steal`, localStorage spinlock or uncoordinated fallback.

If `navigator.locks.request`/secure storage access is unavailable or lock acquisition fails, enter a **read-only/no-authoritative-write mode** in this updated build. Show the actual boundary, keep live draft text/plots, allow viewing/copying/retry, and perform no game/migration/new-game/cloud write. Do not silently run unsafe writes. Existing stored drafts remain untouched; newly edited input can remain live and unsaved until supported storage is available. This fallback is explicit safe behavior, not a claim that current device support has been measured.

For account replication, local durability remains the v4 envelope. A separate same-origin exclusive **`masterplan.save-replica.<channel>.primary`** lock serializes compatible replica jobs, held through each network operation's returned promise. Inside that replica job, briefly take the save-slot lock to read the latest persisted v4 envelope/generation and current account scope; release the local slot lock before network work. Never request the replica lock while holding the save-slot lock. Never upload a tab's stale captured S or retry an older queued snapshot after a newer one. Network completion records only its own generation's replication status under the slot lock; it never replaces local state. Local gameplay is not held behind the network promise. Remote reads/replacements require an explicit validated replace request with the local expected StorageRef and a new slot generation; a delayed response or newer `savedAt` is not authority. Replica errors/uncertainty remain pending; no distributed CAS/lock or cross-device conflict guarantee is claimed.

Do not clear private scratch until a post is durable. State/receipt/high-water/initiative/agenda and the format fence are serialized in one envelope, not split metadata writes.

## Save and private recovery defaults

Game schema **v4** adds gameId/stateRevision/actionHighWater, per-proposal/competition revisions and the bounded receipts. Migration v1→v2→v3→v4 preserves existing state, relationships, funds, decisions and pending/built/grant work and is idempotent. The trusted boundary supplies a missing unique gameId once and persists it before confirmable tokens; simulation draws no unseeded randomness. Embedded profile/scenario versions remain deliberate and no new farm/campus facts are inserted into old towns.

### Versioned namespace and storage-format fence

The v4 primary snapshot has **new** storage locations:

| Channel | Authoritative v4 browser key | New v4 account document | Preserved legacy source/branch |
|---|---|---|---|
| Dev | `masterplan.dev.save.v4` | `data/users/<id>/save-dev-v4` | `masterplan.dev.save`, account `save-dev` |
| Stable, after an approved compatible release | `masterplan.stable.save.v4` | `data/users/<id>/save-v4` | `millbrook.v1`, account `save` |

One serialized browser value contains this envelope; it is not mirrored back into a legacy key/document:

```ts
type SaveEnvelopeV4 = {
  envelopeSchema: 'mp.save-envelope/4'; formatFloor: 4;
  writerProtocol: 'mp.save-writer/1';
  channel: 'dev' | 'stable'; saveSlotId: 'primary';
  storageGeneration: number; game: GameStateV4;
  legacyImportBackup: null | {
    sourceNamespace: string; sourceSha256: string; originalJson: string;
  };
};
```

At migration acquire the slot lock, reread source and destination, and import a selected legacy snapshot only if no v4 destination already exists. Its exact original bytes/hash are kept in the immutable legacyImportBackup of the first v4 envelope; original legacy browser/account data are not deleted or overwritten. All subsequent v4 writes preserve that backup and formatFloor and increase storageGeneration. A concurrent old deployment may continue its independent v3 branch; that branch is never treated as a later v4 update. If migration/write fails, the original legacy source remains intact and no partial v4 success is announced.

The storage-format probe/fence runs **before and independently of `proposalCouncilV1`** in every updated build. Presence of a v4 destination means no automatic v3 fallback, new-game overwrite, downgrade or legacy autosave. With the feature off, preserve/read the v4 town in protected read-only mode and direct the player to a compatible enabled build; do not serialize it as v3. Unrecognized/newer envelope/schema/writer protocol, malformed protected data or unavailable fence read also block mutation instead of deleting/resetting. A future higher floor cannot be lowered. Gameplay feature flags do not disable this storage guard.

Unmodified rolled-back/cached old code cannot be taught these guards retroactively. It uses only the old key/document and cannot read/write the new v4 namespace. Its old town may remain playable as a **separate legacy branch**, not current v4 progress. Compatible updated code does not copy v4 into those old paths or automatically replace v4 from `save-dev`/`save` because a timestamp is newer. Cloud import/replace is explicit, namespace-validated and subject to the same local generation/lock checks. Account replication uses only the new v4 document once migrated. This isolates rollback data; it does not promise that old software displays the v4 town.

Private recovery remains the approved separate browser-local workspace, partitioned by channel + gameId + scenarioId, outside public proposals/account saves and diagnostics. Namespace stays `masterplan.<channel>.draft-workspace.v1`; limits stay **4 drafts, 8 input versions per draft, 128 KiB UTF-8 per game workspace**. Store input/plots/typed fields/acknowledgment text/comparison choice, never trusted candidate/authorization/support/commit authority. Every workspace update takes the same stable slot lock, rereads its workspaceRevision, and verifies the caller's expected revision before applying only its intended edit. A conflicting whole-workspace write is rejected with the losing tab's live text intact; reload/review and an explicit capacity choice can follow. No automatic merge subsystem or silent overwrite is introduced. Workspace writes do not increment authoritative game storageGeneration.

There is **no time-based expiry** in R1.1. At capacity, offer a player-selected replace/delete or continue without saving this new version. Never silently evict, truncate text/plots, or discard the live input. If storage is unavailable/full, keep the live draft, report recovery unavailable, and leave normal play working. Cancel closes the preview and retains the private workspace; explicit Discard deletes that draft. Reload recomputes all forecasts and rechecks site/turn/budget/authority before any confirmation. A changed year retains input but invalidates every old token; a changed scenario/game partitions rather than applies it. Invalid old plots remain visible as requiring correction; the engine does not move them. Account save replacement revokes outstanding tokens even when local input is retained.

The 4/8/128 KiB, no-expiry, local-only recovery defaults are approved and unchanged. No new account synchronization is implied.

## Provider pipeline, diagnostics and failure codes

Logical actions remain draft, revise and pitch, with task-specific internal schemas: `interpret-draft`, `interpret-revision`, `extract-pitch`, optional `express-stance`, and optional `express-pitch-reaction`. Each interpretation/extraction gets at most one repair (two generations total); each optional expression gets one generation with deterministic fallback. Thus a logical revision/pitch uses at most three serialized generations; there is no recursive repair or counter loop. Reuse the installed cache, pinned model/runtime and existing serialized queue. Keep the existing configured generation timeout unless device evidence justifies a separate reviewed tuning change.

Request limits: original text ≤2,000 characters without silent truncation; up to 576 exact plots retained engine-locally; one target actor; at most 32 scoped facts, three history records, eight claims, eight explicit omissions and two clarification questions. The provider receives a pinned selection reference/count/capacity and compact relevant site facts, not an automatic dump of 576 coordinates. Geometry remains exact in the engine regardless of prompt compaction. Admit the fully formatted task against the loaded provider's actual context/output limits before generation, retaining current Qwen `max_tokens:640` and `temperature:0.2` unless measured tuning is separately justified. No verified context-window size is assumed. If the full intent plus bounded schema/facts cannot fit, return `context_limit` and preserve the original input; do not silently truncate text or geometry. Plan/operation changes must fit the declared schema. Larger logical input is a recoverable `input_limit`. Optional reactions are at most 600 characters/three sentences. No full save or broad biography enters the prompt. Same logical snapshots/expected outcomes are used for Qwen and Claude evaluation, with provider transport compaction labeled.

Result codes are stable lowercase enums, not raw exception messages:

```text
none, applied, already_applied,
runtime_unavailable, generation_timeout, request_canceled,
malformed_json, schema_version, unknown_field, wrong_type,
value_out_of_range, input_limit, context_limit, intent_unclear, unsupported_operation,
scope_ack_required, scope_changed, site_required, plot_invalid,
site_infeasible, site_conflict, stale_revision, target_closed,
authority_mismatch, stance_refused, facts_missing, initiative_used, duplicate_action,
command_mismatch, receipt_not_found, reaction_member_mismatch,
required_consent_unresolved, condition_unresolved,
save_conflict, save_lock_unavailable, unsupported_storage_format, workspace_conflict,
quota_used, funding_invalid, claim_false, claim_absent_feature,
claim_evidence_mismatch, claim_irrelevant, storage_unavailable
```

`ResultCode` is that enum; user copy is a fixed safe template with engine-allowlisted field labels and next action. Ordinary diagnostics allow only opaque request/attempt/action correlation, task/stage, contract/build/model/runtime, timing, result code, allowlisted supported field IDs and counts. Exclude prompts, raw replies, titles, coordinates, full fact text, saves, accounts, credentials and raw stacks. No validation string is copied blindly into exports. The actual Duo rejection rule remains unknown until new correlated evidence identifies it; R1.1 does not guess it. Sources: [01:18](sources/briefs/01_Master_Plan_Code_Audit_and_Engine_Contract.md:18), [03:22](sources/briefs/03_Master_Plan_Qwen_Orchestration_and_Evaluation.md:22).

## Requirements, implementation order and gates

Use the linked full C01–C24 matrix, with affected R1.1 rows marked by fix number. These are not new permanent MP IDs. Preserve existing MP status, including MP-075 Proposed and MP-070–073 Planned overall. The user approved first-slice scope, private recovery defaults and the four R1.1 corrections. Implementation criteria remain unverified.

**Freeze C is declarative, before builders.** After R1.1 review, the coordinator pins the exact contract, fixture inputs, expected rules, mock schemas/shapes, B0/B1 existing-engine reference files and all hashes in a frozen manifest at C. C requires no new executable fixture factory, assertion, validator measurement or engine-builder work. No current document contains executable test implementation.

Only after C and builder dispatch does D add the real executable fixtures/assertions using those frozen inputs/rules. F uses the same frozen mock shapes while the engine is implemented. New validator/stance/receipt/two-tab outputs become observed evidence only after D/integration at W1/I; an implementation discrepancy returns to review, not a silent rewritten target. Preserve C and its manifest unchanged; append observed evidence under the later measured revision.

Wave 1 D/F share C in isolated feature branches/worktrees. D exclusively owns engine/transactions/migration/engine fixtures; F exclusively owns existing request/provider/diagnostics modules/tests. E/F never concurrently edit `src/ui.js`. Integrate D then F and pin W1 with unchanged C. Wave 2 G/E share W1: G receives serial engine-content ownership after D; E exclusively owns UI/index/renderer/browser tests and provider/save wiring. Coordinator owns the save-slot wiring boundary and routes its engine versus UI implementation to D/E in order. Default maximum two concurrent writers; requirements/flags/build/shared wiring occur in serial integration windows.

Integrate engine/fixtures before dependent UI/AI. Give independent Playwright QA and Reviewer exactly I, the same acceptance matrix/fixture version, normal entry launch command and evidence ledger. At 669×951 and 400px use disposable saves, exact plots, explicit scope/confirm, NPC branches, pitch/false claim/failure, formal vote and year-end map. Run repository full tests/traceability and both channel builds; use Dev PR/green CI/deploy verification and report artifact access separately. Nate retains stable release approval.

Fixture/browser coverage, live Qwen/Claude quality and physical Duo airplane-mode evidence remain distinct. Record parse/schema/intent/site/unrequested-change/repair numerators and denominators and usable latency by exact provider/model/runtime. A fixture-ready Dev revision is not live-provider-ready merely because unit/browser mocks pass. The player-verification gate in [03:29](sources/briefs/03_Master_Plan_Qwen_Orchestration_and_Evaluation.md:29) additionally needs a live usable draft, targeted revision and grounded council response; physical Duo cold launch, retries and latency remain their own checks.

**Freeze checkpoint:** approved first-slice scope and recovery remain unchanged. The user approved these four fixes and authorized this freeze C; the manifest pins the criteria and planned evidence. C contains no gameplay implementation, executable fixture or integrated release. The coordinator records C's hash before starting the authorized D/F builders from that exact revision.
