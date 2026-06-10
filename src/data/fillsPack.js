// Fills pack: two-bar phrases — bar 1 keeps time (money beat), bar 2 is the
// fill. Built on the multi-bar model with per-bar grids.
import { createEmptyExercise } from '../model/exercise.js'

const E8 = ['eighth', 'eighth', 'eighth', 'eighth']
const S16 = ['sixteenth', 'sixteenth', 'sixteenth', 'sixteenth']
const T3 = ['triplet', 'triplet', 'triplet', 'triplet']

// Bar 1 (steps 0..7 on an 8th grid): the money beat.
const GROOVE_BAR = {
  hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7],
  snare: [2, 6],
  kick: [0, 4],
}

function fill({ id, name, bpm, level, fillSubs, hits, accents = {}, flams = [], sticking = '' }) {
  const ex = createEmptyExercise({
    id, name, bpm, level,
    bars: [
      { ts: { beats: 4, unit: 4 }, beatSubs: E8 },
      { ts: { beats: 4, unit: 4 }, beatSubs: fillSubs },
    ],
    source: 'basics', section: 'fills', tags: ['groove'],
  })
  Object.entries(GROOVE_BAR).forEach(([inst, steps]) => {
    steps.forEach((s) => { ex.rows[inst][s] = { on: true, accent: inst === 'snare', roll: 0 } })
  })
  const base = 8 // fill bar starts after the 8-step groove bar
  Object.entries(hits).forEach(([inst, steps]) => {
    steps.forEach((s) => {
      const cell = { on: true, accent: (accents[inst] || []).includes(s), roll: 0 }
      if (flams.includes(s) && inst === 'snare') cell.flam = true
      ex.rows[inst][base + s] = cell
    })
  })
  sticking.replace(/\s+/g, '').split('').forEach((ch, i) => { if (ch !== '.') ex.sticking[base + i] = ch })
  return ex
}

export function getFillsPack() {
  return [
    fill({
      id: 'fl_8th_around', name: 'Groove + 8th fill around', bpm: 80, level: 'beginner',
      fillSubs: E8,
      hits: { snare: [0, 1], tom1: [2, 3], tom2: [4, 5], floorTom: [6, 7] },
      sticking: 'RLRLRLRL',
    }),
    fill({
      id: 'fl_16th_around', name: 'Groove + 16th fill around', bpm: 84, level: 'intermediate',
      fillSubs: S16,
      hits: { snare: [0, 1, 2, 3], tom1: [4, 5, 6, 7], tom2: [8, 9, 10, 11], floorTom: [12, 13, 14, 15] },
      sticking: 'RLRLRLRLRLRLRLRL',
    }),
    fill({
      id: 'fl_doubles', name: 'Groove + doubles fill', bpm: 80, level: 'intermediate',
      fillSubs: S16,
      hits: { snare: [0, 1, 2, 3], tom1: [4, 5, 6, 7], tom2: [8, 9, 10, 11], floorTom: [12, 13, 14, 15] },
      sticking: 'RRLLRRLLRRLLRRLL',
    }),
    fill({
      id: 'fl_triplet', name: 'Groove + triplet fill', bpm: 76, level: 'intermediate',
      fillSubs: T3,
      hits: { snare: [0, 1, 2], tom1: [3, 4, 5], tom2: [6, 7, 8], floorTom: [9, 10, 11] },
      sticking: 'RLRLRLRLRLRL',
    }),
    fill({
      id: 'fl_flam', name: 'Groove + flam fill', bpm: 72, level: 'advanced',
      fillSubs: E8,
      hits: { snare: [0, 2, 4], floorTom: [6, 7] },
      flams: [0, 2, 4],
      accents: { floorTom: [7] },
      sticking: 'R.R.R.RL',
    }),
    fill({
      id: 'fl_offbeat16', name: 'Groove + syncopated 16th fill', bpm: 80, level: 'advanced',
      fillSubs: S16,
      hits: { snare: [0, 1, 2, 4, 6], tom1: [7, 8], tom2: [10, 11], floorTom: [13, 14, 15] },
      accents: { snare: [0, 4], floorTom: [15] },
      sticking: 'RLR.R.LRL.RL.RLL',
    }),
  ]
}
