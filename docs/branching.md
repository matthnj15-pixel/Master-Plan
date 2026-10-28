# Branching and release policy

The goal: try new ideas freely without touching the game you're actually playing.

## Branches
| Branch | What it is | Who merges into it | Where it runs |
|---|---|---|---|
| `main` | The stable game. Protected. | Nate, from a release pull request (`dev` → `main`) or a hotfix | GitHub Pages root and the **Master Plan** claude.ai artifact |
| `dev` | Everything accepted but not released | Claude, once all tests pass | GitHub Pages `/dev/` and the **Master Plan Dev** claude.ai artifact |
| `feature/<name>` | One change in progress | Claude creates it from `dev` | Tested before merging |
| `hotfix/<name>` | An urgent fix to the stable game | Claude opens it from `main` | Merged to `main`, then `main` is merged back into `dev` |

## The flow
1. **You describe what you want.** Claude turns it into requirements in `docs/requirements.md` and confirms them with you.
2. **Requirements become tests.** Claude writes tests named with the requirement IDs on a `feature/` branch, then builds until they pass.
3. **Tests gate `dev`.** When every test and the traceability check pass, Claude merges into `dev` and updates the dev page and dev artifact. You play it there.
4. **You gate `main`.** When `dev` is ready, Claude opens the release pull request, writes its description, checks that its checks pass, with a version bump, a changelog listing the requirements delivered, and the play-test checklist. You merge it, and the stable game updates.

## Feature flags
Flags live in `flags.json`, each with an on/off value per channel. Use them when something should ship to `dev` before it's ready for stable, or when you want to compare two versions of a rule.
- New experimental work merges to `dev` with `"stable": false`.
- Releasing it means flipping `"stable": true` in a release PR. Turning it off again is a one-line change.
- On the dev build, the game menu has a **Dev tools** panel where you can toggle flags for your own session, plus shortcuts (add cash, skip a year) for testing.
- Remove a flag once its feature has been stable for a release or two, so old branches don't pile up.

## Saves
Dev and stable never share a save. The dev page and dev artifact use their own save, so a broken experiment can't damage your real town. If an update changes the save format, it must include a migration and a test.

## Settings Nate controls in GitHub
- **Branch protection** on `main` only: require a pull request before merging. `dev` stays open so Claude can merge tested work.
- **Pages:** Settings → Pages → Source: **GitHub Actions**.
- **Pages environment:** nothing to change. The dev page deploys through a workflow that runs from `main` after CI passes on `dev`, so the default `main`-only rule works.
