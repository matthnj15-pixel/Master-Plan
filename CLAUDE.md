# Master Plan: working agreement

Nate is the PM and owns the repo. He decides what to build and how it should behave. Claude writes the code, tests, commits, and deploys. The full policy is in [docs/branching.md](docs/branching.md).

## How changes ship
Conversation becomes requirements, requirements become tests, and tests must pass.

1. **Requirements first.** When Nate describes something, add or update rows in `docs/requirements.md` with an ID, acceptance criteria, a verification method, and status `Proposed`. Show Nate the rows and ask 2 to 4 questions if anything changes scope. Once he agrees, mark them `Accepted` (or `Planned` if not building yet).
2. **Tests next.** Branch from `dev` as `feature/<short-name>`. Write tests named with the requirement IDs they verify (`test('MP-045 ...')`) before the code.
3. **Build it** until `npm test` passes. `npm test` runs every test and the traceability check, which fails if an accepted, test-verified requirement has no test or a test names an unknown ID.
4. **Merge into `dev` yourself** once `npm test` and `npm run build -- --channel dev` pass: merge the feature branch, push `dev`, publish the dev artifact, and tell Nate what changed, which IDs it covers, and how to play it.
5. **Releases need Nate's approval.** Open the `dev` to `main` pull request yourself, with a version bump in `package.json`, a `docs/changelog.md` entry listing requirement IDs delivered, and the play-test checklist run for `Play-test` requirements touched. Write the full description (what changed for the player, requirements delivered, checks, save compatibility); Nate reviews the description and merges. Only `main` is protected. Then publish the stable artifact.
   - **Check the pull request before handing it over.** Wait for its checks to finish. If any fail, find the cause and fix it, or explain plainly why it isn't a code problem. Never send Nate a red pull request without that explanation.
6. **Hotfixes** branch from `main` as `hotfix/<short-name>` and go to Nate as a pull request into `main`. After merging, merge `main` back into `dev`.

Never change what a test checks just to make it pass. If a requirement turns out wrong, change the requirement with Nate first, then the test.

## Feature flags
- Defined in `flags.json` with an on/off value per channel. The build injects them as `MP_BUILD.flags`; the engine exposes them as `ENGINE.FLAGS`.
- Experimental work merges to `dev` behind a flag with `"stable": false`. Releasing it means flipping `"stable": true`.
- Gate engine behavior on `FLAGS.<name>` and keep the off path identical to the stable behavior, so tests (where every flag is off) protect the stable game.

## Layout
- `src/engine.js`: the simulation. Pure functions, no DOM. Every number that affects outcomes lives here.
- `src/ui.js`: rendering, the map, sheets, dev tools, and the AI calls.
- `src/index.html`: page template with styles. `scripts/build.mjs --channel stable|dev --out <dir>` writes `master-plan.html` (artifact) and `index.html` (Pages).
- `flags.json`: feature flags.
- `docs/requirements.md`: the requirements baseline. `scripts/trace.mjs` checks it against the tests (`npm run trace` prints the matrix).
- `tests/engine.test.mjs`, `tests/build.test.mjs`: deterministic simulation and build tests (Node's built-in runner, no dependencies). Test names start with requirement IDs.
- `docs/`: requirements, design handoff, decisions, roadmap, branching policy, changelog.

## Design rules that must hold
- **The AI talks; the simulation decides.** AI characters write dialogue and translate the player's words into plan fields. The engine prices every field and computes every outcome. Validate all AI output with `validatePlan` before use.
- **Every consequence has a visible cause.** Anything that moves a meter adds a `causes` entry the year-end report can show.
- **Saves must survive updates.** If the state shape changes, bump `v` and extend `migrate()`, and add a test.
- **Dev and stable never share a save.** Dev uses its own local key and database document.
- **Same seed, same game.** Randomness goes through `rand(seed, key)`.
- Mobile first: check at 400px wide.

## Runtime
There are two builds of the same code:
- **claude.ai artifact** (`master-plan.html`): the full game. It uses three claude.ai artifact capabilities: `sample` (AI characters), and `db` plus `user` (save game under `data/users/<id>/save`, or `save-dev` on the dev build).
- **GitHub Pages** (`index.html`): no claude.ai runtime, so AI characters fall back to quick options and saves stay in that browser. Never put an API key in the page to change this; a key in a public page is a key anyone can use.

## GitHub access
`gh` isn't authenticated here, but the GitHub REST API works through the session proxy with `curl` (send `Content-Type: application/json`). Use it to open pull requests, edit descriptions, comment, and read check runs and annotations.

## Deploy targets
- Stable artifact (from `main`): https://claude.ai/artifact/S6VNrMR4ovQZfmGs5az7qT
- Dev artifact (from `dev`): https://claude.ai/artifact/3fycGF8m26LbRvbnuF864g
- GitHub Pages: https://matthnj15-pixel.github.io/Master-Plan/ (stable) and `/dev/` (dev)
Publish with the Artifact tool, passing the URL so the existing artifact updates in place.
