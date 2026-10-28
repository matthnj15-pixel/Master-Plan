# Master Plan

A turn-based small-town planning sim. You're the new mayor of Millbrook, Pennsylvania. Each turn is a year: review proposals from residents and developers, negotiate the plans, win council votes, and watch the town grow or shrink because of what you approved. Every four years, voters decide if you keep the job.

## Play
- **Full game (AI characters, cloud saves):** the claude.ai artifact.
- **GitHub Pages:** the same game with quick options instead of AI conversations. Saves stay in your browser.

## Develop
Requires Node 20 or later. No dependencies.

```
npm test        # simulation tests
npm run build   # writes dist/master-plan.html and dist/index.html
```

Open `dist/index.html` in a browser to play locally.

## How we work
Nate owns the product and the repo. Changes arrive as pull requests; merging to `main` deploys GitHub Pages. See [CLAUDE.md](CLAUDE.md) for the working agreement and design rules, and [docs/](docs/) for the design handoff, decisions, and roadmap.
