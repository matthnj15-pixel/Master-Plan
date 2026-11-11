# Master Plan

A town-planning game set in fictional Millbrooke, Pennsylvania. Each turn is a year: review proposals from residents and developers, negotiate the plans, win council votes, and watch the town change because of what you approved. Every four years, voters decide if you keep the job.

## Explore and play
- **Game showcase:** [Meet Millbrook and compare the Old Mill proposals](https://matthnj15-pixel.github.io/Master-Plan/dev/about/) on the dev edition of GitHub Pages.
- **Full game (AI characters, cloud saves):** the Master Plan claude.ai artifact. This is the primary way to play.
- **GitHub Pages:** https://matthnj15-pixel.github.io/Master-Plan/ runs the stable game with quick options and browser saves.
- **Dev builds:** https://matthnj15-pixel.github.io/Master-Plan/dev/ and the Master Plan Dev artifact run what's on `dev`, with separate saves. Dev Pages can download Qwen for local inference on a compatible WebGPU device. No API key is required.
- **Experimental planning loop:** private component plans, alternatives, resident operating conditions, explicit agenda decisions and persistent project drawings use the Dev-only `compositionPlans` flag. See the [play-test script](docs/dev-playtest.md) and [acceptance evidence](docs/autonomous-evidence.md); automated fixtures, real Qwen and physical-device results are distinct.

## Develop
Requires Node 20 or later. Run `npm ci` once; the only dependency is Playwright, for the touch UI tests (`npx playwright install chromium`).

```
npm test        # all tests plus the requirements traceability check
npm run trace   # print the requirements-to-tests matrix
npm run build                      # stable build into dist/
npm run build -- --channel dev     # dev build (dev tools and dev flags on)
```

The stable quick-option build can open directly from `dist/index.html`. Serve Dev from localhost or HTTPS for Web Locks, service workers and Offline AI, for example `python3 -m http.server 8000 --directory dist`, then open `http://localhost:8000/`.

## How we work
Nate owns the product and the repo. `main` is the stable game and `dev` is where new work lands first, behind feature flags when needed. Changes arrive as pull requests. See [docs/branching.md](docs/branching.md) for the policy, [CLAUDE.md](CLAUDE.md) for the working agreement and design rules, and [docs/](docs/) for the design handoff, decisions, and roadmap.
