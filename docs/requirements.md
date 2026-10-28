# Requirements

What Nate asks for becomes a requirement here. Each requirement has an ID, acceptance criteria, how it's verified, and a status.

- **Verify:** `Test` means an automated test must reference the ID and pass. `Play-test` means Nate or Claude checks it by playing, recorded in the release checklist.
- **Status:** `Proposed` (drafted, waiting for Nate), `Accepted` (agreed; must be verified), `Planned` (agreed, not built yet), `Retired`.
- `npm test` fails if any `Accepted` requirement verified by `Test` has no passing test, or if a test names an ID that isn't listed.
- IDs never change or get reused. Changed requirements keep their ID; retired ones stay in the table.

## Game structure
| ID | Requirement | Acceptance criteria | Verify | Status |
|---|---|---|---|---|
| MP-001 | Each turn is one year, and a career lasts 32 turns. | A new game starts in year 1 (2027) with 32 years available. Ending a turn advances exactly one year. | Test | Accepted |
| MP-002 | Elections happen every four years. | After year 4 resolves, the game enters the election phase. Vote share stays between 20% and 80%, and 50% or more wins. | Test | Accepted |
| MP-003 | Mayors serve at most two terms, then the player continues as a groomed successor. | Successor inherits approval, the rival, and unfinished projects. | Test | Planned |
| MP-004 | Two straight years with a negative reserve ends the career. | A borough below zero at the end of two consecutive years enters the bankrupt phase. | Test | Accepted |
| MP-005 | Losing an election offers opposition mode or a restart. | After a loss the player can start a new town. Opposition mode: one council seat, blocking and bargaining, and a rematch four years later. | Play-test | Planned |
| MP-006 | The town starts as a small Pennsylvania borough modeled on State College and Lancaster growth patterns. | Starting population 3,200 with a college, a historic downtown, a creek, and farmland. | Test | Accepted |

## Simulation and causality
| ID | Requirement | Acceptance criteria | Verify | Status |
|---|---|---|---|---|
| MP-010 | Every consequence has a visible cause. | For each year resolved, every meter that changed has at least one cause entry in the year-end report. | Test | Accepted |
| MP-011 | The same seed plays out the same way. | Two games with the same seed and choices produce identical histories. | Test | Accepted |
| MP-012 | Consequences follow real-world logic. | A strip mall lowers walkability and adds jobs and storefronts. A park raises livability and property values. | Test | Accepted |
| MP-013 | A luxury store is a bad bet in a small town. | When subsidized in a town under 5,000 people, it usually closes within two years, lowering business confidence and approval. | Test | Accepted |
| MP-014 | Routine housing grows on its own where demand exists. | When demand exceeds housing, new homes appear on the map without player action. | Test | Accepted |
| MP-015 | The AI talks; the simulation decides. | AI output can only change plan fields within allowed values. All outcomes come from the engine. | Test | Accepted |

## Proposals, presenters, and council
| ID | Requirement | Acceptance criteria | Verify | Status |
|---|---|---|---|---|
| MP-020 | Presenter relationship, competency, and plan detail affect success. | Delivery odds rise with relationship. A high-competency presenter's odds beat a low-competency one's. | Test | Accepted |
| MP-021 | Thin plans carry hidden cost risk. | A plan from a low-detail presenter shows a cost range wider than a high-detail presenter's. | Test | Accepted |
| MP-022 | Competing plans for one site are exclusive. | Approving one plan for a site rejects the competing plan. | Test | Accepted |
| MP-023 | Big items need 3 of 5 council votes. | A motion with no option at 3 votes fails. | Test | Accepted |
| MP-024 | The Old Mill fight is contested by default. | With no lobbying, the park-versus-commercial vote has no majority. Good arguments plus a favor can swing it. | Test | Accepted |
| MP-025 | A pitch earns what it actually says. (Changed 2026-10-27: pitches were worth too much.) | The engine scores every pitch. Quick-tap pitches and vague pitches move a member's lean by 3 points or less. A specific pitch moves it by 10 points or less. A favor moves it by 15 or less. Favors spend political capital. Hostile pitches lower relationship and lean. The character's reply reflects the credit given. | Test | Accepted |
| MP-026 | You negotiate plans by talking, and the plan drawing updates. | Agreed changes update the plan, its drawing, and its forecast. | Play-test | Accepted |
| MP-028 | Each council member has a public statement on each plan. | In a hearing, every member shows what they support, what they oppose, and what would change their vote on that specific plan, built from their priorities and the plan's numbers. The statement updates when the plan changes. | Test | Accepted |
| MP-027 | A named rival opposes you. | Greg Marsh leans against plans the mayor backs and runs against the mayor. | Test | Accepted |

## Your own initiatives
| ID | Requirement | Acceptance criteria | Verify | Status |
|---|---|---|---|---|
| MP-030 | One mayor's initiative per year. | A second initiative in the same year is refused. A new year allows one again. | Test | Accepted |
| MP-031 | Initiatives are freeform but priced by the engine. | Any description becomes a plan made of fixed fields with an engine-computed cost and forecast, and it goes to council. | Test | Accepted |
| MP-032 | Programs and ordinances need no site. | A policy-only initiative has no site and still has effects. | Test | Accepted |
| MP-033 | Propose on any plots you choose. | Tap plots anywhere on the map to add or remove them; they don't need to touch. A Clear all control empties the selection. The planner drafts for exactly the plots chosen and never moves them. Each use has size rules (a suburb needs many plots), and more plots raise capacity and cost. | Test | Planned |
| MP-034 | Redevelopment has consequences. | Building on occupied plots means demolition: it costs money, displaces residents or jobs, and moves approval, all shown in the forecast. | Test | Planned |
| MP-035 | Impossible ideas can be proposed and are answered realistically. | Proposing to demolish something the borough doesn't own (the college) shows acquisition cost and backlash, the planner warns, and the council responds in character. | Test | Planned |

## Meters and systems
| ID | Requirement | Acceptance criteria | Verify | Status |
|---|---|---|---|---|
| MP-040 | The town has exactly nine meters. | Population, reserve, jobs, walkability, livability, business, safety, affordability, approval. | Test | Accepted |
| MP-041 | Safety matters to voters and growth. | With everything else equal, higher safety produces higher approval after a year. | Test | Accepted |
| MP-042 | Kish Creek can flood, and planning changes the odds. | More parking raises flood risk. Stormwater work lowers it. | Test | Accepted |
| MP-043 | State grants reward planning ahead. | Applying tables the item for a year. The grant then either covers 50% to 80% of the cost or is denied. | Test | Accepted |
| MP-044 | Housing affordability responds to supply. | A housing shortage lowers affordability; new homes raise it. | Test | Accepted |

## Map and presentation
| ID | Requirement | Acceptance criteria | Verify | Status |
|---|---|---|---|---|
| MP-050 | Plan view and a street view that rotates in 90° steps. | Both views draw the same town. Rotation cycles four directions. | Play-test | Accepted |
| MP-051 | Pinch to zoom and drag to pan the map. (Changed 2026-10-27: replaces "2x close-up, no free zoom.") | Pinching the map zooms only the map, from 1x to 3x, around the point between your fingers. Dragging pans. A gesture on the map never zooms the page. | Test | Accepted |
| MP-052 | The map shows how the town is doing. | Traffic, pedestrians, streetlights, and vacancies on the map follow the meters. | Play-test | Accepted |
| MP-053 | Works on a phone. | No sideways scrolling at 400px wide. All actions reachable by tap. | Test | Accepted |
| MP-054 | Touch first everywhere. | Every button and control is at least 44 × 44 points. Nothing depends on hover. Text is at least 12 points. | Test | Accepted |
| MP-055 | Built for the iPhone Duo inner display in portrait, as one stacked page. (Changed 2026-10-27: no pinned map.) | No sideways scrolling at 669 × 951. Meters fit in two rows or fewer. The page scrolls as one stack: the map scrolls with everything else, and no content scrolls underneath another section. At 1x a swipe on the map scrolls the page; zoomed in, a drag pans the map. | Test | Accepted |
| MP-056 | Map touch controls. | Double-tap zooms in on that spot. On-map buttons zoom in, zoom out, recenter on downtown, and rotate. A two-finger twist rotates the street view, snapping to the nearest 90°. Tapping a building or site shows its info. | Test | Accepted |
| MP-057 | Main actions within thumb reach. | "End year" sits at the bottom of the screen. In every sheet, the main action buttons stay pinned to the bottom while the sheet scrolls. | Test | Accepted |

## Saves, channels, and security
| ID | Requirement | Acceptance criteria | Verify | Status |
|---|---|---|---|---|
| MP-060 | Saves survive updates. | A save from an older version loads and keeps playing. | Test | Accepted |
| MP-061 | Dev and stable never share a save. | Dev and stable builds use different save keys and database documents. | Test | Accepted |
| MP-062 | Feature flags control what's on in each channel. | Flags come from the build. With no build info, every flag is off. | Test | Accepted |
| MP-063 | No API keys ever ship in the page. | Built pages contain no API key or direct-API access header. | Test | Accepted |
| MP-064 | The full game with AI runs as a claude.ai artifact; GitHub Pages runs without AI. | Pages build falls back to quick options with no errors. | Play-test | Accepted |

## Plan design and history
| ID | Requirement | Acceptance criteria | Verify | Status |
|---|---|---|---|---|
| MP-070 | Detailed plan drawings. | Each proposal shows a detailed site plan (footprints, rooflines, materials, trees, paths, benches, planters, lighting) and a street-level view. | Play-test | Planned |
| MP-071 | Design by conversation. | Talking to the planner sets style, materials, colors, landscaping, and furnishings. The engine still prices the plan; higher design quality costs more and adds livability and property value. | Test | Planned |
| MP-072 | Built results match the design. | What gets built on the map uses the approved plan's design. | Play-test | Planned |
| MP-073 | One Plans tab holds the town's history. | Replaces "Built so far" and the past year-end reports. Each year lists every proposal with its final drawing, revisions, vote, and outcome. | Test | Planned |
