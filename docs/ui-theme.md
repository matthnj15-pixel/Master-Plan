# Light paper UI

Approved by Nate on 2026-11-10 (MP-058), following the rendered theme review and its lighter refinement.

Use warm paper and near-white surfaces with dark text. Keep card outlines quiet, corners modest (8–10px), card padding comfortable (20–24px), and more space around page/section headings than between related labels and values. Use green for primary actions with dark text, and navy for focus and orientation. Preserve Millbrook's seal, actual game map and the Courier's newspaper typography.

Do not add decorative side highlight bars or accent stripes to callouts or council statements. Plain surfaces, clear headings and spacing should establish their hierarchy. Preserve semantic map outlines, chart marks and visible keyboard focus.

The approved change is presentation only. Keep the existing map/agenda navigation, the one-page scroll behavior, nine meters, engine forecasts, council/funding flow and turn resolution. The exploration's agenda-first layout, site notebook, report regrouping and intent-checking ideas remain separate decisions.

## Font and licensing

The palette and typography were informed by [8B's Linea template](https://github.com/matthnj15-pixel/app-landing-page-template). The game's CSS is written for its existing DOM; no template code, photography, motion kit, GSAP, Lenis or framework is included.

Host Grotesk is bundled as `src/fonts/host-grotesk-latin.woff2` from [Google Fonts](https://fonts.google.com/specimen/Host+Grotesk). It is licensed under SIL Open Font License 1.1; the complete notice is in `src/fonts/OFL.txt`. The build embeds the font and its complete copyright/license notice in each HTML output to retain offline and single-file artifact support. The Courier uses the existing native serif fallback.

## Verification

Run `npm test`, build both dev and stable, and check the normal Pages and artifact entry points at 669 × 951 and 400px wide. Inspect the map/agenda, a proposal forecast, council statements, an initiative, Budget, the menu and a year-end report. Check the bottom actions before and after sheet scrolling, 44px controls, visible keyboard focus, 1× page swipe versus zoomed map pan, and rendering with network requests blocked and dark OS preference.

Browser captures and automated touch checks are distinct from real iPhone Duo/Safari/Home Screen testing. The latter remains Nate's play-test before a stable release.

### Implementation verification, 2026-11-10

- `npm test`: 50 passed, including engine, packaging, touch UI, offline AI fixtures and requirements traceability. After adding the complete font notice to the HTML, all 6 packaging tests passed again.
- Dev and stable builds passed. Both single-file artifacts loaded the bundled font with remote requests blocked and an OS dark preference.
- Browser play-throughs at 669 × 951 and 400 × 951 inspected the map, bridge proposal/actions, budget, initiative, menu, Old Mill proposal/hearing/lobbying/vote and year-end report. All sampled viewports fit, controls retained their touch targets, callouts had no side bars and no script errors occurred.
- The recorded seed-68790 Old Mill sequence ended at the identical engine snapshot at both widths: population 3,342, reserve $449K, walkability 55, livability 60.8 and approval 55.2.
- Independent read-only review found no outstanding blockers after the font-license fix. `git diff --check` passed.
- These checks used local Chromium builds and disposable saves. Physical Duo/Safari, hosted Claude runtime and GitHub CI have not been run for this local feature-branch commit. No release or deployment is implied.
