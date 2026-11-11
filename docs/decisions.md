# Product decisions

Decisions Nate made, with the date. New decisions go at the bottom.

## 2026-10-27: Foundation
- **Audience:** Personal game for Nate. Security still matters: no keys in the page, saves private to his account.
- **Premise:** You're the new mayor of a small town and try to grow it into a city, one turn at a time. The map shows the town growing or shrinking from your choices.
- **Realism:** Consequences follow real-world logic. Example: a strip mall raises commercial activity and lowers walkability. A luxury store in a small town is a bad bet with lasting effects.
- **Setting:** Small-town Pennsylvania, modeled on State College (a college drives growth) and Lancaster (a revived historic downtown with farmland pressure).
- **Proposals:** Citizens, developers, and the borough planner bring plans. Each presenter's relationship, plan detail, and competency affect the odds of success. You negotiate plans by talking to the presenter, and the plan drawing updates.
- **Core rule:** The AI talks; the simulation decides.

## 2026-10-27: Structure
- **Views:** Top-down plan view and an isometric street view that rotates in 90° steps. No free zoom.
- **Time:** One turn is one year. 32 turns total.
- **Elections:** Every 4 years. Two-term limit, then you play a successor you groomed.
- **Losing:** Bankruptcy (two straight years in deficit) or losing an election. After an election loss, you can keep playing from the opposition or concede and restart.
- **Opposition:** A 5-seat council, a named rival (Greg Marsh), public hearings, and campaigning.
- **Test scope:** First playable slice covers years 1 to 4.

## 2026-10-27: Expansion
- **Your own proposals:** Fully freeform. You describe any idea; the planner maps it onto fixed, engine-priced plan fields.
- **Map:** A 2x close-up with drag to pan, and much more detail. The map reflects metrics (traffic, pedestrians, streetlights, vacancies).
- **New meters:** Safety and housing affordability. Nine meters is the ceiling.
- **New systems:** Kish Creek flooding (an event, not a meter) and state grants that reward planning a year ahead.

## 2026-10-27: Name and workflow
- **Name:** Master Plan.
- **Workspace:** GitHub is the shared development workspace. Nate acts as PM and keeps ownership and control; Claude handles code, commits, and deployment through pull requests.
- **Hosting:** GitHub Pages hosts a public build alongside the claude.ai artifact.
- **Branching:** `main` is the stable game; `dev` is where new work lands first, with its own Pages page (`/dev/`), its own claude.ai artifact, and its own save. Feature flags control what's on in each channel.
- **Where the game lives:** The repo is the source of truth for code and docs. The claude.ai artifact is the real, playable game because it has AI characters at no extra cost. GitHub Pages stays a no-AI copy; adding AI there would need separately billed API access, so it's out of scope for now.
- **Process:** Run it like real product work. Conversations become requirements (`docs/requirements.md`), requirements become tests, and tests must pass. Claude merges into `dev` when everything passes; releases to `main` need Nate's approval. Branch protection is on `main` only.

## 2026-10-27: Touch first
- **Primary device:** Nate plays on the iPhone Duo inner display in portrait. Touch comes first in every design decision.
- **Map gestures:** Pinch to zoom from 1x to 3x (replacing the earlier "2x, no free zoom" decision), drag to pan, double-tap to zoom, and a two-finger twist that rotates the street view in 90° steps. On-map buttons cover the same actions.
- **Pinned map:** The map stays at the top while the agenda scrolls, with a control to shrink it.
- **UI tests:** Headless-browser tests at the Duo's screen size check touch targets, text size, layout, and gestures in CI.
- **Later:** A graphics overhaul with real building models.

## 2026-10-27: First playtest feedback
- **Pitches:** Were worth too much (a half-hearted pitch moved a vote 22 points). Pitches now earn what they say, with caps (MP-025).
- **Council statements:** Each member gets an on-the-record statement on each plan: support, oppose, and what would change their vote (MP-028).
- **Any plots:** Your proposals can use any plots, touching or not, including occupied ones and things the borough doesn't own. Size rules and real consequences apply. A Clear all control resets the selection (MP-033 to MP-035).
- **Layout:** The whole page scrolls as one stack. No section scrolls underneath another; the map is no longer pinned (MP-055).
- **Plan design:** Planning is the main creative space: detailed drawings, design by conversation, and one Plans tab for the town's history (MP-070 to MP-073).
- **Economics:** Deeper economics can wait.
- **Release order:** 0.6 stacked page, pitch scoring, statements. 0.7 any-plot proposals. 0.8 plan design and the Plans tab.

## 2026-11-10: Light paper UI (MP-058)
- Nate approved the lighter refinement of the Linea-inspired theme: warm paper, near-white cards, dark text, green primary actions and Host Grotesk, retaining Millbrook's seal, town map and Courier.
- No decorative side highlight bars on callouts or council statements. Use quiet surfaces, headings and spacing. Cards and controls have modest 8–10px rounding; card padding is 20–24px and section spacing follows the heading hierarchy.
- This is a visual update to the current game flow. The A/B/C exploration did not approve an agenda-first or site-notebook navigation change, new forecast/report mechanics, or the planned Plans history.
- The game stays light regardless of the OS theme. Embed the openly licensed UI font in both build outputs so offline play does not need a font service. Preserve the single scrolling page, touch controls, persistent sheet actions, providers, engine outcomes and save format.

## 2026-11-10: Council desk layout (MP-059)
- Nate confirmed B, the Council desk, after the theme update reached dev. Apply the confirmed layout on top of the approved lighter styling.
- Lead with the annual agenda and authorship, followed by town measures and the map. Keep one natural scroll stack and direct routes to map/plot selection.
- Lead proposal decisions with the actual vote gap and funding consequences. Keep the existing council, funding, quick asks, grants and optional site-plan details available.
- Lead the Courier report with before/after results and a cash reconciliation, then show engine causes grouped into decisions/projects and town response. Retain zero-valued events and all nine measures. Read existing history/reports; do not change engine outcomes or persist a new save shape.
- This supersedes the earlier statement that the agenda-first choice was still open. Site-notebook history and heuristic intent changes remain separate scope.

## 2026-11-10: Scenario foundation (MP-074)
- Nate's Epic A assignment supplies the product decision: Master Plan is the game; **Scenario 01 · Millbrooke** is its first campaign. Millbrooke is an established fictional Pennsylvania borough. Use the final **e** in new campaign content and keep a stable internal scenario ID separate from display names.
- The first foundation preserves 2027, annual turns, the existing 32-year horizon and four-year elections while moving campaign inputs behind a scenario boundary. The exact long-term endpoint and pacing remain open for later prototypes.
- Prove the boundary with a small test-only reconstruction input: a different date, map and recovery authority; housing requires a utility repair to complete. This is an architectural probe, not a second playable campaign.
- Preserve supported save progress and stable/dev save identifiers, including the historic `millbrook.v1` browser key. Display-name changes do not rewrite historical records.
- Epic A owns authoritative simulation, scenario data, eligibility, calendars and saves. Epic B owns provider orchestration and proposal drawings and can work against fixtures. The engine continues to validate plans and compute forecasts and outcomes. The showcase remains a separate follow-up.
- Acceptance source is Nate's Scenario 01 · Millbrooke assignment dated November 9, 2026. No new pacing, defeat-role, agenda-growth or proposal-design behavior is accepted by this foundation.

## 2026-11-11: Full autonomous planning loop (MP-076–082)

- Nate explicitly instructed Codex to execute the attached full-run package.
  This authorizes composition, simulation/rendering primitives, conditions,
  normal farm/campus situations, opportunities and migrations. Routine design,
  architecture, balancing and integration decisions proceed internally.
- Actual remote Dev baseline is `18dded6207f7217021d84b42aad6cc8e00b68f43`.
  There are no open PRs or published D/F branches at kickoff. Historical C
  `028ad21...` is reference, preserved byte-for-byte in docs/reference/frozen-C.
- C2 is the explicit successor. Project labels are identity; capability data
  selects numeric/render rules. Exact ordered site and original intent persist.
  Unknown physical mechanisms remain explicit scope gaps. Fictional costs and
  bounded project-specific effects are engine balance assumptions.
- `compositionPlans` is Dev-only. Dev v4 storage uses its own namespace with
  protected legacy backup and a slot-stable lock; Stable keeps existing behavior.
- Independent browser fixtures, live WebLLM, deployed checks and physical Duo
  evidence are reported separately. No AI-ready verdict without real Qwen.
  Dev integration is authorized after green checks; Stable remains Nate's gate.
- Historical factual credit survives action-receipt pruning. New earned facts
  carry a version marker and are retained independently of the bounded replay
  ledger. Older facts are matched through verified recorded revisions or an
  original retained persuasion receipt. If that provenance is unavailable,
  migration records a conservative policy and awards no uncertain new credit;
  existing relationships, points and original receipts remain intact. The
  result identifies unresolved history rather than treating a truthful claim
  as false. An unchanged earlier-engine save generated through 65 authorized
  title revisions supplies the portable regression fixture.
