# shed.

**https://shed.beardlabs.cc** — a drum practice web app: a serious metronome, an
exercise sequencer with real drum-notation rendering, guided workouts and a
practice journal. Installable as a PWA (iOS/Android), fully offline, no
accounts — everything lives on your device.

Built with **React + Vite**, **Web Audio** for all sound (no sample files —
every drum and click is synthesized; you *can* upload your own click samples),
and **VexFlow** for engraving. State persists in `localStorage`/IndexedDB;
everything exports/imports as JSON.

## What's inside

**Metronome**
- Time signatures (2/4…12/8), subdivisions, swing, separate volumes.
- Tap-to-accent any beat + grouping presets (3+3+2 and friends) for odd meters.
- Trainers: **speed trainer** (auto tempo ramp), **gap trainer** (silent bars),
  **subdivision switcher**, **polyrhythms** (4:3, 4:5, …), count-in modes.
- Custom click samples (wav/mp3) — stored locally, stage-safe offline.

**Exercises** — a 350+ piece catalog
- Stick Control (pp. 5–17 incl. triplets, short rolls, flam beats), the PAS
  rudiments, groove & fill packs, first-steps lessons.
- Grid editor: per-beat note values, accents/ghosts/flams/drags/rolls (with
  cross-barline ties), articulations (cross-stick, rimshot, ride bell, hi-hat
  pedal), sticking row, multi-bar editing with copy/repeat and section markers.
- Notation view with bar/section looping, fullscreen **performance mode**,
  A4 printing and share-by-URL.
- Sight-reading generator + a deterministic "exercise of the day".

**Workouts & progress**
- Built-in and custom workout routines with per-block trainers; adaptive tempo
  resume; a "Surprise me" session generator; setlists for gigs.
- Automatic practice journal: streaks, heatmap, minutes by technique, tempo
  records and goals, stats charts.

**Sound**
- Three synthesized kits (acoustic / 808-style electronic / practice pad) and a
  per-instrument mixer (mute a part and play it yourself).

An illustrated **in-app Guide** documents all of it (the `?` in the app).

## Develop

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run e2e        # end-to-end tests (Playwright, needs the dev server)
npm run build      # production build to dist/
```

The Guide's screenshots are generated, not hand-made — after UI changes run
`node scripts/guide-shots.mjs` against a running dev server to refresh
`public/guide/`.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via
`.github/workflows/deploy.yml`. The site is served from the custom domain
**https://shed.beardlabs.cc/** (see `CNAME`), so the Vite base is `/`.

## Note on content

Exercise data in this repo consists of stickings and rhythm patterns
transcribed for personal practice; no book scans or copyrighted assets are
included.
