# shed. — guide for AI coding agents

Drum practice PWA: React + Vite, all sound synthesized via Web Audio,
notation engraved with VexFlow. No backend — state lives in
`localStorage`/IndexedDB, hosted statically on GitHub Pages.

## Commands

```sh
npm run dev            # dev server (Vite, port 5173)
npm test               # unit tests (Vitest, jsdom)
npm run build          # production build (also builds the PWA service worker)
npm run e2e            # Playwright e2e (starts its own dev server)
node scripts/guide-shots.mjs   # regenerate Guide screenshots (needs dev server running)
```

## Map

- `src/audio/` — `Scheduler.js` (lookahead scheduler, the heart of timing),
  `drumSynths.js` (kits), `click.js` + `clickSamples.js` (metronome sounds)
- `src/model/` — pure logic: exercise model, notation building, progress
  journal, share-URL codec. Everything here is unit-tested (`*.test.js` next
  to the module).
- `src/data/` — exercise packs (Stick Control, rudiments, grooves, fills),
  workouts, the Guide content (`guide.js`), `changelog.js`
- `src/components/v2/` — the UI; `src/App.jsx` wires it all together
- `e2e/app.spec.js` — the single Playwright spec covering all features
- `scripts/` — guide screenshots, release notes generation

## Process rules (non-negotiable)

1. Every user-visible change ships with: `APP_VERSION` bump in `src/App.jsx`
   **and** an entry in `src/data/changelog.js` (it feeds both the in-app
   "What's new" and GitHub Release notes).
2. New or changed features must be documented in the in-app Guide
   (`src/data/guide.js`). If the UI changed, rerun
   `node scripts/guide-shots.mjs` to regenerate screenshots.
3. Each feature: implement → unit tests → e2e test → `npm run build` →
   verify, then commit. One feature per commit.
4. Releases are tag-driven (`vX.Y` must equal `APP_VERSION`) and are cut by
   the maintainer only. Never push tags.
5. Sound changes require a human listening pass before merging — synthesis
   can't be judged by tests alone.
6. Never commit PDFs or the `design/` folder (copyrighted reference
   material; `.gitignore` enforces this — don't work around it).

## Conventions

- Plain JS + JSX, no TypeScript. English-only UI strings live in
  `src/i18n/translations.js`.
- Audio scheduling code must not allocate in the tick loop; UI code must not
  touch the audio clock directly (go through `useScheduler`).
- e2e selectors are CSS classes (`.pb-play`, `.sheet`, …) — keep them stable.
