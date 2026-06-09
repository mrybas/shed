# shed.

A drum practice web app — a synthesized metronome and an exercise sequencer with
real drum-notation rendering. Build exercises (paradiddles, rolls, triplets, the
Stick Control library, …), hear them played back with separate synthesized voices
(snare, kick, hi-hats, ride, crash), and practice against a flexible metronome.

Built with **React + Vite**, **Web Audio** for all sound (no samples — everything
is synthesized), and **VexFlow** for notation. State persists in `localStorage`;
exercises can be exported/imported as JSON.

## Features

- Standalone metronome: time signatures, subdivisions, accents, volume.
- Exercise sequencer with a grid editor and live drum notation.
- Per-beat subdivisions (mix straight beats with triplets/sextuplets), rolls, accents, sticking.
- Browsable exercise library with categories, search and progress tracking.
- **Speed trainer** — raise the tempo automatically every N bars.
- **Gap trainer** — mute the metronome for a few bars to test how steady you play.
- Works on desktop and mobile (incl. iOS audio unlock).

## Develop

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run e2e        # end-to-end tests (Playwright)
npm run build      # production build to dist/
```

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via
`.github/workflows/deploy.yml`. The site is served from the custom domain
**https://shed.beardlabs.cc/** (see `CNAME`), so the Vite base is `/`.
