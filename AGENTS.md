# Master Plan

Use [CLAUDE.md](CLAUDE.md) for the game's architecture, product rules, and play surfaces. Check [requirements](docs/requirements.md), [product decisions](docs/decisions.md), and the current `dev` branch before scoping work. Nate owns gameplay priorities and acceptance criteria.

## Development

- Branch from the latest `dev` as `feature/<name>`. Open a PR into `dev` and merge it only after the checks pass. Nate merges releases into `main` after play-testing the dev build. Follow the [branching policy](docs/branching.md) for hotfixes and releases.
- Agree on gameplay changes through the MP requirements. Put the corresponding IDs in regression test names. Keep simulation outcomes deterministic in `src/engine.js` and validate AI output before it can affect a plan. Keep DOM, touch input, and AI calls in the UI layer.
- Keep stable and dev saves separate. When the save schema changes, migrate and test an older save. Gate experimental behavior in `flags.json` and verify the stable path with the flag off.
- Preserve portrait touch controls at 669 × 951 and check layout at 400 px wide. Keep tap targets at least 44 × 44 CSS px and primary sheet actions within thumb reach.

## Codex team

For substantial work, apply the [Codex team workflow](docs/codex-team.md) and explicitly delegate by role when the session supports it. Assign a single writer per file and use separate worktrees for concurrent writers. The coordinating Codex owns integration and remote changes.

## Verification and handoff

- Run `npm test` with Playwright Chromium installed. It covers the engine, builds, touch UI, and requirements traceability. Run `npm run build -- --channel dev` and check the stable build when shared code or packaging changes. Record the commands, results, and GitHub CI status in the PR.
- Separate automated touch coverage from real-device play-testing. Give Nate the [dev Pages link](https://matthnj15-pixel.github.io/Master-Plan/dev/) and a checklist for the affected flow. Pages uses quick options and browser-local saves. Verify AI dialogue and account saves on the Claude Dev artifact when access is available, and report artifact publishing and play-testing separately from Pages.
