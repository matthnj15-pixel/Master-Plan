# Branching and release policy

The goal: try new ideas freely without touching the game you're actually playing.

## Branches
| Branch | What it is | Who merges into it | Where it runs |
|---|---|---|---|
| `main` | The stable game | Nate, from a release PR (`dev` → `main`) or a hotfix | GitHub Pages root and the **Master Plan** claude.ai artifact |
| `dev` | Everything that's been accepted but not released | Nate, from feature PRs | GitHub Pages `/dev/` and the **Master Plan Dev** claude.ai artifact |
| `feature/<name>` | One change in progress | Claude opens it from `dev` | Built by CI on every PR |
| `hotfix/<name>` | An urgent fix to the stable game | Claude opens it from `main` | Merged to `main`, then `main` is merged back into `dev` |

## The flow
1. **You describe what you want.** Claude writes a short spec in the PR description: what changes for the player, why, and how to check it.
2. **Claude builds it on a `feature/` branch** and opens a pull request into `dev`. CI runs the tests and builds the page.
3. **You review and merge into `dev`.** The dev page and the dev artifact update. Play it there.
4. **When `dev` is good, Claude opens a release PR** from `dev` into `main` with a version bump and changelog. You merge it, and the stable game updates.

## Feature flags
Flags live in `flags.json`, each with an on/off value per channel. Use them when something should ship to `dev` before it's ready for stable, or when you want to compare two versions of a rule.
- New experimental work merges to `dev` with `"stable": false`.
- Releasing it means flipping `"stable": true` in a release PR. Turning it off again is a one-line change.
- On the dev build, the game menu has a **Dev tools** panel where you can toggle flags for your own session, plus shortcuts (add cash, skip a year) for testing.
- Remove a flag once its feature has been stable for a release or two, so old branches don't pile up.

## Saves
Dev and stable never share a save. The dev page and dev artifact use their own save, so a broken experiment can't damage your real town. If an update changes the save format, it must include a migration and a test.

## Settings Nate controls in GitHub
- **Branch protection** on `main` and `dev`: require a pull request and a passing CI check before merging.
- **Pages:** Settings → Pages → Source: **GitHub Actions**.
- **Pages environment:** Settings → Environments → `github-pages` → Deployment branches: allow both `main` and `dev`.
