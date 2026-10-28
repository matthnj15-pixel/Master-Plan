# Master Plan

A turn-based small-town planning sim. You're the new mayor of Millbrook, Pennsylvania. Each turn is a year: review proposals from residents and developers, negotiate the plans, win council votes, and watch the town grow or shrink because of what you approved. Every four years, voters decide if you keep the job.

## Play
- **Full game (AI characters, cloud saves):** the Master Plan claude.ai artifact.
- **GitHub Pages:** https://matthnj15-pixel.github.io/Master-Plan/ runs the stable game with quick options instead of AI conversations. Saves stay in your browser.
- **Dev builds:** https://matthnj15-pixel.github.io/Master-Plan/dev/ and the Master Plan Dev artifact run what's on the `dev` branch, with a separate save.

## Develop
Requires Node 20 or later. No dependencies.

```
npm test        # simulation tests
npm run build                      # stable build into dist/
npm run build -- --channel dev     # dev build (dev tools and dev flags on)
```

Open `dist/index.html` in a browser to play locally.

## How we work
Nate owns the product and the repo. `main` is the stable game and `dev` is where new work lands first, behind feature flags when needed. Changes arrive as pull requests. See [docs/branching.md](docs/branching.md) for the policy, [CLAUDE.md](CLAUDE.md) for the working agreement and design rules, and [docs/](docs/) for the design handoff, decisions, and roadmap.
