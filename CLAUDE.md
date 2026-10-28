# Master Plan: working agreement

Nate is the PM and owns the repo. He decides what to build and how it should behave. Claude writes the code, tests, commits, and deploys. The full policy is in [docs/branching.md](docs/branching.md).

## How changes ship
1. Branch from `dev` as `feature/<short-name>`. For an urgent fix to the stable game, branch from `main` as `hotfix/<short-name>`. Never push to `main` or `dev` directly.
2. Run `npm test` and `npm run build -- --channel dev` before pushing. Both must pass.
3. Push the branch and give Nate the pull request link (into `dev`, or into `main` for a hotfix). Describe the change in player terms, using the PR template.
4. Nate reviews and merges. Merging to `dev` or `main` redeploys GitHub Pages: stable at the root, dev at `/dev/`.
5. After a merge into `dev`, publish the dev build to the **Master Plan Dev** artifact. After a merge into `main`, publish the stable build to the **Master Plan** artifact. Always update the existing artifact so links don't change.
6. Releases are a PR from `dev` into `main` that bumps `version` in `package.json` and adds an entry to `docs/changelog.md`. After a hotfix, merge `main` back into `dev`.

## Feature flags
- Defined in `flags.json` with an on/off value per channel. The build injects them as `MP_BUILD.flags`; the engine exposes them as `ENGINE.FLAGS`.
- Experimental work merges to `dev` behind a flag with `"stable": false`. Releasing it means flipping `"stable": true`.
- Gate engine behavior on `FLAGS.<name>` and keep the off path identical to the stable behavior, so tests (where every flag is off) protect the stable game.

## Layout
- `src/engine.js`: the simulation. Pure functions, no DOM. Every number that affects outcomes lives here.
- `src/ui.js`: rendering, the map, sheets, dev tools, and the AI calls.
- `src/index.html`: page template with styles. `scripts/build.mjs --channel stable|dev --out <dir>` writes `master-plan.html` (artifact) and `index.html` (Pages).
- `flags.json`: feature flags.
- `tests/engine.test.mjs`: deterministic simulation tests (Node's built-in runner, no dependencies).
- `docs/`: design handoff, decisions, roadmap, branching policy, changelog.

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

## Deploy targets
- Stable artifact (from `main`): https://claude.ai/artifact/S6VNrMR4ovQZfmGs5az7qT
- Dev artifact (from `dev`): https://claude.ai/artifact/3fycGF8m26LbRvbnuF864g
- GitHub Pages: https://matthnj15-pixel.github.io/Master-Plan/ (stable) and `/dev/` (dev)
Publish with the Artifact tool, passing the URL so the existing artifact updates in place.
