# Master Plan: working agreement

Nate is the PM and owns the repo. He decides what to build and how it should behave. Claude writes the code, tests, commits, and deploys.

## How changes ship
1. Work on a branch named `feature/<short-name>` or `fix/<short-name>`. Never push to `main` directly.
2. Run `npm test` and `npm run build` before pushing. Both must pass.
3. Push the branch and give Nate the pull request link. Describe the change in player terms, using the PR template.
4. Nate reviews and merges. Merging to `main` deploys GitHub Pages automatically (`.github/workflows/pages.yml`). After the merge, also publish `dist/master-plan.html` (built from `main`) to the existing claude.ai artifact so that link stays the same.
5. Bump `version` in `package.json` and add a line to `docs/changelog.md` for each merged release.

## Layout
- `src/engine.js`: the simulation. Pure functions, no DOM. Every number that affects outcomes lives here.
- `src/ui.js`: rendering, the map, sheets, and the AI calls.
- `src/index.html`: page template with styles. `scripts/build.mjs` inlines the two scripts into `dist/master-plan.html`.
- `tests/engine.test.mjs`: deterministic simulation tests (Node's built-in runner, no dependencies).
- `docs/`: design handoff, product decisions, roadmap, changelog.

## Design rules that must hold
- **The AI talks; the simulation decides.** AI characters write dialogue and translate the player's words into plan fields. The engine prices every field and computes every outcome. Validate all AI output with `validatePlan` before use.
- **Every consequence has a visible cause.** Anything that moves a meter adds a `causes` entry the year-end report can show.
- **Saves must survive updates.** If the state shape changes, bump `v` and extend `migrate()`, and add a test.
- **Same seed, same game.** Randomness goes through `rand(seed, key)`.
- Mobile first: check at 400px wide.

## Runtime
There are two builds of the same code:
- **claude.ai artifact** (`dist/master-plan.html`): the full game. It uses three claude.ai artifact capabilities: `sample` (AI characters), `db` and `user` (save game under `data/users/<id>/save`). 
- **GitHub Pages** (`dist/index.html`): no claude.ai runtime, so AI characters fall back to quick options and saves stay in that browser. Never put an API key in the page to change this; a key in a public page is a key anyone can use.
