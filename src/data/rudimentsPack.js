// PAS rudiments pack — the standard rudiments our catalog was still missing.
// Token language: 'R'/'L' stroke, prefix f=flam, d=drag, z=multiple-bounce
// (closed roll), suffix '>' accent, '.' rest. One token per grid step.
import { createEmptyExercise } from '../model/exercise.js'

function rud({ id, name, bpm, level, ts = { beats: 4, unit: 4 }, beatSubs, bars, seq }) {
  const ex = createEmptyExercise({
    id: `rd_${id}`, name, bpm, level,
    timeSignature: ts, beatSubs, bars,
    source: 'basics', section: 'rudiments', tags: ['rudiment'],
  })
  const toks = seq.replace(/\s+/g, ' ').trim().split(' ')
  toks.forEach((tok, i) => {
    if (!tok || tok === '.') return
    const accent = tok.endsWith('>')
    const body = accent ? tok.slice(0, -1) : tok
    const flag = body.length === 2 ? body[0] : ''
    const hand = body[body.length - 1].toUpperCase()
    const cell = { on: true, accent, roll: flag === 'z' ? 'closed' : 0 }
    if (flag === 'f') cell.flam = true
    if (flag === 'd') cell.flam = 'drag'
    ex.rows.snare[i] = cell
    ex.sticking[i] = hand
  })
  return ex
}

export function getRudimentsPack() {
  const two4 = { beats: 2, unit: 4 }
  return [
    // ---- Roll rudiments -----------------------------------------------------
    rud({
      id: 'ss4', name: 'Single stroke four', bpm: 80, level: 'beginner',
      beatSubs: ['triplet', 'quarter', 'triplet', 'quarter'],
      seq: 'R L R L> L R L R>',
    }),
    rud({
      id: 'ss7', name: 'Single stroke seven', bpm: 76, level: 'intermediate',
      beatSubs: ['sextuplet', 'quarter', 'sextuplet', 'quarter'],
      seq: 'R L R L R L R> L R L R L R L>',
    }),
    rud({
      id: 'buzz', name: 'Multiple bounce roll', bpm: 72, level: 'beginner',
      beatSubs: ['quarter', 'quarter', 'quarter', 'quarter'],
      seq: 'zR zL zR zL',
    }),
    rud({
      id: 'ts', name: 'Triple stroke roll', bpm: 76, level: 'intermediate',
      ts: { beats: 4, unit: 4 }, beatSubs: ['triplet', 'triplet', 'triplet', 'triplet'],
      seq: 'R R R L L L R R R L L L',
    }),
    rud({
      id: 'six', name: 'Six stroke roll', bpm: 72, level: 'intermediate',
      ts: two4, beatSubs: ['sextuplet', 'sextuplet'],
      seq: 'R> L L R R L> L> R R L L R>',
    }),
    rud({
      id: 'seven', name: 'Seven stroke roll', bpm: 70, level: 'intermediate',
      ts: two4, beatSubs: ['sixteenth', 'sixteenth'],
      seq: 'L L R R L L R> .',
    }),
    // ---- Diddle rudiments ---------------------------------------------------
    rud({
      id: 'tpd', name: 'Triple paradiddle', bpm: 76, level: 'intermediate',
      beatSubs: ['sixteenth', 'sixteenth', 'sixteenth', 'sixteenth'],
      seq: 'R> L R L R L R R L> R L R L R L L',
    }),
    // ---- Flam rudiments -----------------------------------------------------
    rud({
      id: 'fpdd', name: 'Flam paradiddle-diddle', bpm: 70, level: 'advanced',
      ts: two4, beatSubs: ['sextuplet', 'sextuplet'],
      seq: 'fR> L R R L L fL> R L L R R',
    }),
    rud({
      id: 'pataflafla', name: 'Pataflafla', bpm: 70, level: 'advanced',
      beatSubs: ['sixteenth', 'sixteenth', 'sixteenth', 'sixteenth'],
      seq: 'fR> L R fL> fR> L R fL> fR> L R fL> fR> L R fL>',
    }),
    rud({
      id: 'swiss', name: 'Swiss army triplet', bpm: 80, level: 'advanced',
      beatSubs: ['triplet', 'triplet', 'triplet', 'triplet'],
      seq: 'fR> R L fR> R L fR> R L fR> R L',
    }),
    rud({
      id: 'ift', name: 'Inverted flam tap', bpm: 72, level: 'advanced',
      beatSubs: ['eighth', 'eighth', 'eighth', 'eighth'],
      seq: 'fR> L fL> R fR> L fL> R',
    }),
    rud({
      id: 'flamdrag', name: 'Flam drag', bpm: 70, level: 'advanced',
      beatSubs: ['triplet', 'triplet', 'triplet', 'triplet'],
      seq: 'fR> dL R fL> dR L fR> dL R fL> dR L',
    }),
    rud({
      id: 'mill', name: 'Single flammed mill', bpm: 70, level: 'advanced',
      beatSubs: ['sixteenth', 'sixteenth', 'sixteenth', 'sixteenth'],
      seq: 'fR> R L R fL> L R L fR> R L R fL> L R L',
    }),
    // ---- Drag rudiments -----------------------------------------------------
    rud({
      id: 'dragadiddle', name: 'Single dragadiddle', bpm: 72, level: 'intermediate',
      beatSubs: ['sixteenth', 'sixteenth', 'sixteenth', 'sixteenth'],
      seq: 'dR> L R R dL> R L L dR> L R R dL> R L L',
    }),
    rud({
      id: 'dragpd1', name: 'Drag paradiddle #1', bpm: 72, level: 'advanced',
      beatSubs: ['quarter', 'sixteenth', 'quarter', 'sixteenth'],
      seq: 'R> dR L R R L> dL R L L',
    }),
    rud({
      id: 'ratamacue', name: 'Single ratamacue', bpm: 72, level: 'intermediate',
      bars: [
        { ts: two4, beatSubs: ['triplet', 'quarter'] },
        { ts: two4, beatSubs: ['triplet', 'quarter'] },
      ],
      seq: 'dR L R L> dL R L R>',
    }),
  ]
}
