// World grooves pack — authored kit grooves (only patterns we're sure about).
// Steps are absolute grid indices; ghosts/accents per instrument.
import { createEmptyExercise } from '../model/exercise.js'

function groove({ id, name, bpm, level, beats = 4, unit = 4, subdivision, bars, hits, accents = {}, ghosts = {}, sticking = '' }) {
  const ex = createEmptyExercise({
    id, name, bpm, level, timeSignature: { beats, unit }, subdivision, bars,
    source: 'basics', section: 'grooves', tags: ['groove'],
  })
  Object.entries(hits).forEach(([inst, steps]) => {
    steps.forEach((s) => {
      const cell = { on: true, accent: (accents[inst] || []).includes(s), roll: 0 }
      if ((ghosts[inst] || []).includes(s)) cell.ghost = true
      ex.rows[inst][s] = cell
    })
  })
  sticking.replace(/\s+/g, '').split('').forEach((ch, i) => { if (ch !== '.') ex.sticking[i] = ch })
  return ex
}

export function getGroovesPack() {
  return [
    groove({
      id: 'gv_shuffle', name: 'Shuffle', bpm: 84, level: 'intermediate',
      subdivision: 'triplet', // 12 steps: hat on 1st & 3rd triplet partials
      hits: {
        hihatClosed: [0, 2, 3, 5, 6, 8, 9, 11],
        snare: [3, 9],
        kick: [0, 6],
      },
      accents: { snare: [3, 9] },
    }),
    groove({
      id: 'gv_halftime_shuffle', name: 'Half-time shuffle', bpm: 78, level: 'advanced',
      subdivision: 'triplet',
      hits: {
        hihatClosed: [0, 2, 3, 5, 6, 8, 9, 11],
        snare: [2, 5, 6, 11],
        kick: [0],
      },
      accents: { snare: [6] }, // backbeat on 3
      ghosts: { snare: [2, 5, 11] },
    }),
    groove({
      id: 'gv_train', name: 'Train beat', bpm: 92, level: 'intermediate',
      subdivision: 'sixteenth',
      hits: {
        snare: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        kick: [0, 8],
      },
      accents: { snare: [2, 6, 10, 14] }, // pushes on the "&"s
      ghosts: { snare: [1, 3, 5, 7, 9, 11, 13, 15] },
      sticking: 'RLRLRLRLRLRLRLRL',
    }),
    groove({
      id: 'gv_motown', name: 'Motown four', bpm: 104, level: 'beginner',
      subdivision: 'eighth',
      hits: {
        hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7],
        snare: [0, 2, 4, 6], // snare on every quarter — the Motown stamp
        kick: [0, 4],
      },
      accents: { snare: [0, 2, 4, 6] },
    }),
    groove({
      id: 'gv_funk16', name: '16th-note funk', bpm: 96, level: 'intermediate',
      subdivision: 'sixteenth',
      hits: {
        hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14],
        snare: [4, 7, 9, 12, 15],
        kick: [0, 10],
      },
      accents: { snare: [4, 12] },
      ghosts: { snare: [7, 9, 15] },
    }),
    groove({
      id: 'gv_bossa', name: 'Bossa nova (son clave)', bpm: 116, level: 'intermediate',
      bars: [
        { ts: { beats: 4, unit: 4 }, beatSubs: ['eighth', 'eighth', 'eighth', 'eighth'] },
        { ts: { beats: 4, unit: 4 }, beatSubs: ['eighth', 'eighth', 'eighth', 'eighth'] },
      ],
      hits: {
        hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        snare: [0, 3, 6, 10, 12], // 3-2 son clave across the two bars
        kick: [0, 3, 4, 7, 8, 11, 12, 15], // bossa foot ostinato
      },
    }),
    groove({
      id: 'gv_samba_feet', name: 'Samba feet + 16ths', bpm: 100, level: 'advanced',
      bars: [
        { ts: { beats: 2, unit: 4 }, beatSubs: ['sixteenth', 'sixteenth'] },
        { ts: { beats: 2, unit: 4 }, beatSubs: ['sixteenth', 'sixteenth'] },
      ],
      hits: {
        ride: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        kick: [0, 3, 4, 7, 8, 11, 12, 15], // the samba "heartbeat"
        snare: [2, 6, 10, 14],
      },
      ghosts: { snare: [2, 6, 10, 14] },
    }),
    groove({
      id: 'gv_disco', name: 'Disco (open hats)', bpm: 112, level: 'beginner',
      subdivision: 'eighth',
      hits: {
        kick: [0, 2, 4, 6], // four on the floor
        hihatClosed: [0, 2, 4, 6],
        hihatOpen: [1, 3, 5, 7], // "&" opens, choked by the next closed
        snare: [2, 6],
      },
      accents: { snare: [2, 6] },
    }),
    groove({
      id: 'gv_halftime16', name: 'Half-time 16th groove', bpm: 86, level: 'intermediate',
      subdivision: 'sixteenth',
      hits: {
        hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        snare: [5, 8, 14],
        kick: [0, 10],
      },
      accents: { snare: [8] }, // big backbeat on 3
      ghosts: { snare: [5, 14] },
    }),
    groove({
      id: 'gv_onedrop', name: 'Reggae one drop', bpm: 74, level: 'intermediate',
      subdivision: 'eighth',
      hits: {
        hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7],
        snare: [4],
        kick: [4], // kick + snare together on 3, nothing on 1 — the "drop"
      },
      accents: { snare: [4], hihatClosed: [1, 3, 5, 7] },
    }),
  ]
}
