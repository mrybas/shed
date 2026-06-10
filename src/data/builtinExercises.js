// Built-in exercise library: snare rudiments (with sticking + accents) and
// a couple of kit grooves demonstrating multiple instruments.
import { createEmptyExercise } from '../model/exercise.js'

// Build a snare rudiment from a sticking string ("RLRR..."). One char = one step.
// `accentEvery` accents the first step of each group of that size.
function rudiment({ id, name, bpm, beats, unit, subdivision, sticking, accentEvery, source = 'basics', section = 'rudiments' }) {
  const ex = createEmptyExercise({ id, name, bpm, timeSignature: { beats, unit }, subdivision, source, section, tags: ['rudiment'] })
  const chars = sticking.replace(/\s+/g, '').split('')
  chars.forEach((ch, i) => {
    const accent = accentEvery ? i % accentEvery === 0 : false
    ex.rows.snare[i] = { on: true, accent }
    ex.sticking[i] = ch.toUpperCase()
  })
  return ex
}

// Build a flam/drag rudiment: explicit accent/flam/drag step indices.
// All patterns follow the PAS standard rudiment definitions.
function flamRud({ id, name, bpm, beats, unit, subdivision, beatSubs, sticking, flams = [], drags = [], accents = [], level }) {
  const ex = createEmptyExercise({
    id, name, bpm, timeSignature: { beats, unit }, subdivision, beatSubs, level,
    source: 'basics', section: 'rudiments', tags: ['rudiment'],
  })
  const chars = sticking.replace(/\s+/g, '').split('')
  chars.forEach((ch, i) => {
    const cell = { on: true, accent: accents.includes(i), roll: 0 }
    if (flams.includes(i)) cell.flam = true
    if (drags.includes(i)) cell.flam = 'drag'
    ex.rows.snare[i] = cell
    ex.sticking[i] = ch.toUpperCase()
  })
  return ex
}

// Build a groove from a map of instrument -> array of active step indices.
function groove({ id, name, bpm, beats, unit, subdivision, hits, accents = {}, source = 'basics', section = 'grooves' }) {
  const ex = createEmptyExercise({ id, name, bpm, timeSignature: { beats, unit }, subdivision, source, section, tags: ['groove'] })
  Object.entries(hits).forEach(([inst, steps]) => {
    steps.forEach((s) => {
      const accent = (accents[inst] || []).includes(s)
      ex.rows[inst][s] = { on: true, accent }
    })
  })
  return ex
}

export function getBuiltinExercises() {
  return [
    // --- Drumeo "Single Paradiddle" lesson (Dave Atkinson) ---
    rudiment({
      id: 'dci16a_basic', source: 'drumeo', section: 'paradiddle',
      name: 'Single Paradiddle — Basic (8th)',
      bpm: 80,
      beats: 4,
      unit: 4,
      subdivision: 'eighth',
      sticking: 'RLRRLRLL',
      accentEvery: 4,
    }),
    rudiment({
      id: 'dci16a_16th', source: 'drumeo', section: 'paradiddle',
      name: 'Single Paradiddle — 16th notes',
      bpm: 90,
      beats: 4,
      unit: 4,
      subdivision: 'sixteenth',
      sticking: 'RLRRLRLLRLRRLRLL',
      accentEvery: 4,
    }),
    rudiment({
      id: 'dci16a_triplets', source: 'drumeo', section: 'paradiddle',
      name: 'Single Paradiddle — Triplets',
      bpm: 80,
      beats: 8,
      unit: 4,
      subdivision: 'triplet',
      sticking: 'RLRRLRLLRLRRLRLLRLRRLRLL',
      accentEvery: 4,
    }),
    rudiment({
      id: 'dci16a_inverted', source: 'drumeo', section: 'paradiddle',
      name: 'Single Paradiddle — Inverted',
      bpm: 80,
      beats: 4,
      unit: 4,
      subdivision: 'sixteenth',
      sticking: 'RLLRLRRLRLLRLRRL',
      accentEvery: 4,
    }),
    rudiment({
      id: 'dci16a_reverse', source: 'drumeo', section: 'paradiddle',
      name: 'Single Paradiddle — Reverse',
      bpm: 80,
      beats: 4,
      unit: 4,
      subdivision: 'sixteenth',
      sticking: 'RRLRLLRLRRLRLLRL',
      accentEvery: 4,
    }),
    // --- Other rudiments & grooves ---
    rudiment({
      id: 'builtin_single_stroke',
      name: 'Single stroke roll',
      bpm: 90,
      beats: 4,
      unit: 4,
      subdivision: 'sixteenth',
      sticking: 'RLRLRLRLRLRLRLRL',
      accentEvery: 4,
    }),
    rudiment({
      id: 'builtin_double_stroke',
      name: 'Double stroke roll',
      bpm: 80,
      beats: 4,
      unit: 4,
      subdivision: 'sixteenth',
      sticking: 'RRLLRRLLRRLLRRLL',
      accentEvery: 4,
    }),
    rudiment({
      id: 'builtin_double_paradiddle',
      name: 'Double paradiddle',
      bpm: 100,
      beats: 4,
      unit: 4,
      subdivision: 'triplet',
      sticking: 'RLRLRRLRLRLL',
      accentEvery: 6,
    }),
    rudiment({
      id: 'builtin_paradiddle_diddle',
      name: 'Paradiddle-diddle',
      bpm: 100,
      beats: 2,
      unit: 4,
      subdivision: 'triplet',
      sticking: 'RLRRLL',
      accentEvery: 3,
    }),
    // --- Flam & drag rudiments (PAS standard) ---
    flamRud({
      id: 'builtin_flam', name: 'Flam', bpm: 70,
      beats: 4, unit: 4, subdivision: 'eighth',
      sticking: 'RLRLRLRL',
      flams: [0, 1, 2, 3, 4, 5, 6, 7], // alternating flams on every stroke
    }),
    flamRud({
      id: 'builtin_flam_accent', name: 'Flam accent', bpm: 80,
      beats: 4, unit: 4, subdivision: 'triplet',
      sticking: 'RLRLRLRLRLRL', // lR-L-R rL-R-L per triplet
      flams: [0, 3, 6, 9],
      accents: [0, 3, 6, 9],
    }),
    flamRud({
      id: 'builtin_flam_tap', name: 'Flam tap', bpm: 70,
      beats: 4, unit: 4, subdivision: 'eighth',
      sticking: 'RRLLRRLL', // lR-R rL-L
      flams: [0, 2, 4, 6],
      accents: [0, 2, 4, 6],
    }),
    flamRud({
      id: 'builtin_flamacue', level: 'advanced', name: 'Flamacue', bpm: 70,
      beats: 2, unit: 4, beatSubs: ['sixteenth', 'quarter'],
      sticking: 'RLRLR', // lR-Ĺ-R-L + lR on the downbeat
      flams: [0, 4],
      accents: [1],
    }),
    flamRud({
      id: 'builtin_flam_paradiddle', level: 'advanced', name: 'Flam paradiddle', bpm: 80,
      beats: 4, unit: 4, subdivision: 'sixteenth',
      sticking: 'RLRRLRLLRLRRLRLL', // lŔ-L-R-R rĹ-R-L-L
      flams: [0, 4, 8, 12],
      accents: [0, 4, 8, 12],
    }),
    flamRud({
      id: 'builtin_single_drag_tap', level: 'advanced', name: 'Single drag tap', bpm: 60,
      beats: 4, unit: 4, subdivision: 'eighth',
      sticking: 'RLLRRLLR', // llR-Ĺ rrL-Ŕ
      drags: [0, 2, 4, 6],
      accents: [1, 3, 5, 7],
    }),
    flamRud({
      id: 'builtin_double_drag_tap', level: 'advanced', name: 'Double drag tap', bpm: 60,
      beats: 4, unit: 4, subdivision: 'triplet',
      sticking: 'RRLLLRRRLLLR', // llR-llR-Ĺ rrL-rrL-Ŕ
      drags: [0, 1, 3, 4, 6, 7, 9, 10],
      accents: [2, 5, 8, 11],
    }),
    groove({
      id: 'builtin_basic_rock',
      name: 'Basic rock beat',
      bpm: 100,
      beats: 4,
      unit: 4,
      subdivision: 'eighth',
      hits: {
        hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7],
        snare: [2, 6],
        kick: [0, 4],
      },
      accents: { snare: [2, 6] },
    }),
    groove({
      id: 'builtin_rock_ride',
      name: 'Rock beat (ride)',
      bpm: 110,
      beats: 4,
      unit: 4,
      subdivision: 'eighth',
      hits: {
        ride: [0, 1, 2, 3, 4, 5, 6, 7],
        snare: [2, 6],
        kick: [0, 3, 4],
        crash: [0],
      },
    }),
  ]
}
