// "First steps" — a day-one set for someone who just sat at the kit.
// Standard first-lesson material: alternating strokes, hands+foot coordination,
// the money beat, and a first fill around the toms. All slow tempos.
import { createEmptyExercise } from '../model/exercise.js'

function ex({ id, name, bpm, subdivision = 'eighth', hits, sticking = '', accents = {} }) {
  const e = createEmptyExercise({
    id, name, bpm, subdivision,
    timeSignature: { beats: 4, unit: 4 },
    source: 'basics', section: 'first-steps', level: 'beginner', tags: [],
  })
  Object.entries(hits).forEach(([inst, steps]) => {
    steps.forEach((s) => {
      e.rows[inst][s] = { on: true, accent: (accents[inst] || []).includes(s), roll: 0 }
    })
  })
  sticking.replace(/\s+/g, '').split('').forEach((ch, i) => { if (ch !== '.') e.sticking[i] = ch })
  return e
}

export function getFirstStepsExercises() {
  return [
    ex({
      id: 'fs_quarters', name: 'Quarter notes, alternating hands', bpm: 60, subdivision: 'quarter',
      hits: { snare: [0, 1, 2, 3] }, sticking: 'RLRL',
    }),
    ex({
      id: 'fs_eighths', name: 'Eighth notes, alternating hands', bpm: 60,
      hits: { snare: [0, 1, 2, 3, 4, 5, 6, 7] }, sticking: 'RLRLRLRL',
    }),
    ex({
      id: 'fs_doubles_slow', name: 'Slow doubles (RRLL)', bpm: 60,
      hits: { snare: [0, 1, 2, 3, 4, 5, 6, 7] }, sticking: 'RRLLRRLL',
    }),
    ex({
      id: 'fs_hands_foot', name: 'Hands and foot together', bpm: 60, subdivision: 'quarter',
      hits: { snare: [0, 1, 2, 3], kick: [0, 1, 2, 3] }, sticking: 'RLRL',
    }),
    ex({
      id: 'fs_kick_snare', name: 'Kick and snare take turns', bpm: 60, subdivision: 'quarter',
      hits: { kick: [0, 2], snare: [1, 3] }, sticking: '.R.L',
    }),
    ex({
      id: 'fs_money_beat', name: 'Money beat (the first groove)', bpm: 70,
      hits: { hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7], kick: [0, 4], snare: [2, 6] },
      accents: { snare: [2, 6] },
    }),
    ex({
      id: 'fs_half_time', name: 'Half-time groove', bpm: 70,
      hits: { hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7], kick: [0], snare: [4] },
      accents: { snare: [4] },
    }),
    ex({
      id: 'fs_first_fill', name: 'First fill: around the kit', bpm: 60,
      hits: { snare: [0, 1], tom1: [2, 3], tom2: [4, 5], floorTom: [6, 7] },
      sticking: 'RLRLRLRL',
    }),
  ]
}
