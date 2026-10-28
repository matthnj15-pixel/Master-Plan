# Product decisions

Decisions Nate made, with the date. New decisions go at the bottom.

## 2026-10-27: Foundation
- **Audience:** Personal game for Nate. Security still matters: no keys in the page, saves private to his account.
- **Premise:** You're the new mayor of a small town and try to grow it into a city, one turn at a time. The map shows the town growing or shrinking from your choices.
- **Realism:** Consequences follow real-world logic. Example: a strip mall raises commercial activity and lowers walkability. A luxury store in a small town is a bad bet with lasting effects.
- **Setting:** Small-town Pennsylvania, modeled on State College (a college drives growth) and Lancaster (a revived historic downtown with farmland pressure).
- **Proposals:** Citizens, developers, and the borough planner bring plans. Each presenter's relationship, plan detail, and competency affect the odds of success. You negotiate plans by talking to the presenter, and the plan drawing updates.
- **Core rule:** The AI talks; the simulation decides.

## 2026-10-27: Structure
- **Views:** Top-down plan view and an isometric street view that rotates in 90° steps. No free zoom.
- **Time:** One turn is one year. 32 turns total.
- **Elections:** Every 4 years. Two-term limit, then you play a successor you groomed.
- **Losing:** Bankruptcy (two straight years in deficit) or losing an election. After an election loss, you can keep playing from the opposition or concede and restart.
- **Opposition:** A 5-seat council, a named rival (Greg Marsh), public hearings, and campaigning.
- **Test scope:** First playable slice covers years 1 to 4.

## 2026-10-27: Expansion
- **Your own proposals:** Fully freeform. You describe any idea; the planner maps it onto fixed, engine-priced plan fields.
- **Map:** A 2x close-up with drag to pan, and much more detail. The map reflects metrics (traffic, pedestrians, streetlights, vacancies).
- **New meters:** Safety and housing affordability. Nine meters is the ceiling.
- **New systems:** Kish Creek flooding (an event, not a meter) and state grants that reward planning a year ahead.

## 2026-10-27: Name and workflow
- **Name:** Master Plan.
- **Workspace:** GitHub is the shared development workspace. Nate acts as PM and keeps ownership and control; Claude handles code, commits, and deployment through pull requests.
- **Hosting:** GitHub Pages hosts a public build alongside the claude.ai artifact.
- **Branching:** `main` is the stable game; `dev` is where new work lands first, with its own Pages page (`/dev/`), its own claude.ai artifact, and its own save. Feature flags control what's on in each channel.
