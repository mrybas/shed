// What's new entries, newest first. Shown once after an update (everything
// between the last seen version and the current one). Keep items short;
// `guide` deep-links into a Guide section.
//
// Convention: add an entry here with every APP_VERSION bump that ships
// something user-visible.

export const CHANGELOG = [
  {
    version: 'v5.39',
    items: [
      { text: 'Subdivision switcher now cycles in order of density (8ths → triplets → 16ths) and the beat dots switch in sync with the click — no more jitter', guide: 'metronome' },
    ],
  },
  {
    version: 'v5.38',
    items: [
      { text: 'Feedback button — tell us what to improve via a prefilled GitHub issue', guide: 'start' },
      { text: 'shed. is now open source under AGPL-3.0; releases ship as tagged GitHub Releases' },
    ],
  },
  {
    version: 'v5.33',
    items: [
      { text: 'The Guide: an illustrated manual of everything — and this What\'s new dialog', guide: 'start' },
    ],
  },
  {
    version: 'v5.32',
    items: [
      { text: 'Upload your own click samples for the metronome (live-show friendly, works offline)', guide: 'metronome' },
      { text: 'GitHub link + tidier sidebar footer' },
    ],
  },
  {
    version: 'v5.27',
    items: [
      { text: 'Favorites and Recently practiced shelves in the library', guide: 'library' },
      { text: 'Tempo goals with progress bars', guide: 'practice' },
      { text: 'Metronome accent patterns: tap beats, 3+3+2-style presets', guide: 'metronome' },
      { text: 'Bar clipboard: copy, paste and repeat ×N in the editor', guide: 'editor' },
      { text: 'Section markers (Intro/Verse/…) — tap a label to loop the section', guide: 'editor' },
      { text: 'Performance mode: fullscreen notation for the music stand', guide: 'practice' },
      { text: 'Stats: charts of your practice minutes and tempo history', guide: 'progress' },
      { text: 'Setlist: a manual queue of exercises for gigs', guide: 'practice' },
      { text: '"Surprise me": generated workout sessions', guide: 'workouts' },
      { text: 'New grooves (jazz, 12/8 blues, second line…), 16 PAS rudiments and 84 more Stick Control exercises', guide: 'library' },
    ],
  },
  {
    version: 'v5.15',
    items: [
      { text: 'Tied rolls with proper notation + Stick Control pages 14–15', guide: 'editor' },
      { text: 'Sight-reading generator and the Exercise of the day', guide: 'library' },
      { text: 'Hi-hat pedal, cross-stick, rimshot and ride bell', guide: 'editor' },
      { text: 'Sound kits (acoustic / electronic / pad) + per-instrument mixer', guide: 'sound' },
    ],
  },
]

const num = (v) => {
  const m = /^v(\d+)\.(\d+)/.exec(v || '')
  return m ? Number(m[1]) * 1000 + Number(m[2]) : -1
}

// Entries strictly newer than `seenVersion`, newest first.
export function entriesSince(seenVersion) {
  const seen = num(seenVersion)
  if (seen < 0) return []
  return CHANGELOG.filter((e) => num(e.version) > seen)
}
