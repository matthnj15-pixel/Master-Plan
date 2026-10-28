# Changelog

## Unreleased (on dev)
- Pitches earn what they say (MP-025): quick-tap and vague pitches move a member's lean by 3 points or less, specific ones by 10 or less, a favor by 15 or less. The AI judges how specific a typed pitch was, and the character's reply matches the credit.
- Council members go on the record (MP-028): in a hearing, each member's statement says what they support, what they oppose, and what would change their vote. It updates as you change the plan.
- The page scrolls as one stack (MP-055): the map is no longer pinned, nothing scrolls underneath anything, and at 1x a swipe on the map scrolls the page.

## 0.5.0 (2026-10-27)
- Touch first for the iPhone Duo inner display: pinch to zoom the map from 1x to 3x without zooming the page, drag to pan, double-tap to zoom, and a two-finger twist to rotate (MP-051, MP-056).
- On-map buttons to zoom in, zoom out, recenter, and rotate (MP-056).
- The map stays pinned at the top while the agenda scrolls, with a Shrink map control (MP-055).
- Every control is at least 44 points and all text at least 12 points (MP-054). Main sheet buttons stay pinned to the bottom (MP-057).
- Headless touch tests at the Duo's screen size run in CI.

## 0.4.0 (2026-10-27)
- Requirements baseline in `docs/requirements.md` (MP-001 to MP-064). `npm test` now fails if an accepted, test-verified requirement has no passing test.
- 29 tests, each named for the requirements it verifies, including new coverage for bankruptcy, causality, the luxury store, housing growth, council votes, lobbying, the rival, safety, flooding, affordability, save separation, and keeping API keys out of the page.
- The engine enforces one mayor's initiative per year (MP-030).
- The dev page deploys automatically after tests pass on `dev`.
- Claude opens release pull requests, writes their descriptions, and checks them before handing them over. Claude merges into `dev` when tests pass; `main` needs Nate.

## 0.3.0 (2026-10-27)
- Renamed the game to Master Plan.
- Moved into GitHub with tests, a build script, CI, and a GitHub Pages deploy.
- Stable and dev channels: a dev page and dev artifact with a separate save, feature flags, and in-game dev tools.

## 0.2.0 (2026-10-27)
- Your own freeform proposals, drafted by the borough planner and priced by the engine.
- 2x close-up map with drag to pan, and a much more detailed town that reflects traffic, walkability, and safety.
- Safety and housing affordability meters, Kish Creek flooding, and state grants.

## 0.1.0 (2026-10-27)
- First playable slice: years 1 to 4, AI negotiation and lobbying, council hearings, the Old Mill fight, year-end reports, and the first election.
