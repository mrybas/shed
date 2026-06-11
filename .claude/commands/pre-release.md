---
description: Run the full pre-release checklist (tests, build, version/changelog/guide sync)
---

Run the shed. pre-release checklist and report a pass/fail summary:

1. `npm test` — all unit tests pass.
2. `npm run build` — production build succeeds.
3. `npm run e2e` — full Playwright suite passes.
4. Consistency checks:
   - `APP_VERSION` in `src/App.jsx` has a matching top entry in
     `src/data/changelog.js`.
   - Working tree is clean (`git status`), and the diff vs `origin/main`
     contains the version bump if there are user-visible changes.
   - If any UI changed in this release, confirm Guide screenshots were
     regenerated (`public/guide/*.webp` newer than the UI changes, or
     explicitly state they didn't need it).
5. Print the release command for the maintainer (do NOT run it):
   `git push origin main && git tag vX.Y && git push origin vX.Y`
   with the actual version substituted.

If anything fails, stop and list exactly what needs fixing before release.
