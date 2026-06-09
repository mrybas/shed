// Pure transform: exercise model -> notation-ready data (no VexFlow here, so it
// can be unit-tested). NotationView consumes this to render with VexFlow.
//
// Note DURATIONS are derived from spacing: within each beat, a hit lasts until
// the next hit (or the beat end). So on a 16th grid, one hit per beat renders as
// a quarter note, a hit every 2 steps as eighths, etc. — real rhythmic notation
// instead of "always the grid value + rests".
import { INSTRUMENTS, stepsPerBeat, getBeatSubs } from './exercise.js'

export const RENDER_INFO = {
  kick: { key: 'f/4', order: 0 },
  snare: { key: 'c/5', order: 1 },
  ride: { key: 'f/5/x2', order: 2 },
  hihatClosed: { key: 'g/5/x2', order: 3 },
  hihatOpen: { key: 'g/5/x2', order: 3, open: true },
  crash: { key: 'a/5/x2', order: 4 },
}

export function durationFor(subdivision) {
  switch (subdivision) {
    case 'quarter': return 'q'
    case 'eighth': return '8'
    case 'triplet': return '8'
    case 'sixteenth': return '16'
    default: return 'q'
  }
}

// span (in grid steps within one beat) -> [durationKind, dots], per steps-per-beat.
const SPAN_MAP = {
  8: { 1: ['32', 0], 2: ['16', 0], 3: ['16', 1], 4: ['8', 0], 6: ['8', 1], 8: ['q', 0] }, // 8/beat
  4: { 1: ['16', 0], 2: ['8', 0], 3: ['8', 1], 4: ['q', 0] }, // sixteenth grid
  2: { 1: ['8', 0], 2: ['q', 0] },                            // eighth grid
  1: { 1: ['q', 0] },                                         // quarter grid
}

// Tuplet beats keep one tickable per step + bracket(s). A sextuplet is written
// as TWO triplet brackets under one beam (groups: 2), not a single "6".
const TUPLET_INFO = {
  triplet: { durKind: '8', num: 3, inTimeOf: 2, groups: 1 },
  sextuplet: { durKind: '16', num: 3, inTimeOf: 2, groups: 2 },
}

// Note durations are written relative to the beat unit. Our base values assume a
// quarter-note beat (unit 4); for a half-note beat (cut time, unit 2) every note
// is one level longer (16th->8th, 8th->quarter, …), etc.
const DUR_LEVEL = { w: 0, h: 1, q: 2, 8: 3, 16: 4, 32: 5 }
const LEVEL_DUR = { 0: 'w', 1: 'h', 2: 'q', 3: '8', 4: '16', 5: '32' }
function shiftDur(durKind, shift) {
  const lvl = DUR_LEVEL[durKind]
  if (lvl == null) return durKind
  const n = Math.max(0, Math.min(5, lvl - shift))
  return LEVEL_DUR[n]
}

export function buildNotationData(ex) {
  const beatSubs = getBeatSubs(ex)
  const beatsCount = ex.timeSignature.beats
  const n = ex.rows[INSTRUMENTS[0]].length
  // unit 4 -> 0 (no shift), unit 2 -> +1 (longer), unit 8 -> -1 (shorter)
  const shift = Math.round(Math.log2(4 / ex.timeSignature.unit))
  // Rolls render one note per step (no duration merging) so a trailing empty
  // step shows as a real rest (the release), not a lengthened previous note.
  const noMerge = ex.section === 'rolls'

  const stepInfo = (step) => {
    const active = INSTRUMENTS.filter((inst) => ex.rows[inst][step]?.on)
    return {
      onset: active.length > 0,
      accent: active.some((inst) => ex.rows[inst][step].accent),
      open: active.some((inst) => RENDER_INFO[inst].open),
      roll: (active.find((inst) => ex.rows[inst][step].roll) && ex.rows[active[0]][step].roll) || 0,
      keys: active.map((inst) => RENDER_INFO[inst]).sort((a, b) => a.order - b.order).map((r) => r.key),
      sticking: ex.sticking[step] || '',
    }
  }

  const beatsData = []
  let base = 0
  let maxSpb = 1
  for (let b = 0; b < beatsCount; b++) {
    const sub = beatSubs[b]
    const spb = stepsPerBeat(sub)
    if (spb > maxSpb) maxSpb = spb
    const tuplet = TUPLET_INFO[sub] || null
    const tickables = []

    if (tuplet) {
      const tDur = shiftDur(tuplet.durKind, shift)
      for (let s = 0; s < spb; s++) {
        const gi = base + s
        const info = stepInfo(gi)
        tickables.push({
          rest: !info.onset, keys: info.onset ? info.keys : ['b/4'], durKind: tDur, dots: 0,
          accent: info.onset && info.accent, open: info.onset && info.open, roll: info.onset ? info.roll : 0,
          sticking: info.onset ? info.sticking : '', startStep: gi, span: 1,
        })
      }
    } else if (noMerge) {
      const map = SPAN_MAP[spb] || SPAN_MAP[4]
      const durKind = shiftDur(map[1][0], shift)
      for (let p = 0; p < spb; p++) {
        const gi = base + p
        const info = stepInfo(gi)
        tickables.push({
          rest: !info.onset,
          keys: info.onset ? info.keys : ['b/4'],
          durKind, dots: 0,
          accent: info.onset && info.accent,
          open: info.onset && info.open,
          roll: info.onset ? info.roll : 0,
          sticking: info.onset ? info.sticking : '',
          startStep: gi, span: 1,
        })
      }
    } else {
      const map = SPAN_MAP[spb] || SPAN_MAP[4]
      let p = 0
      while (p < spb) {
        const gi = base + p
        const info = stepInfo(gi)
        let q = p + 1
        while (q < spb && !stepInfo(base + q).onset) q++
        const span = q - p
        const [baseDur, dots] = map[span] || map[1]
        const durKind = shiftDur(baseDur, shift)
        tickables.push({
          rest: !info.onset,
          keys: info.onset ? info.keys : ['b/4'],
          durKind, dots,
          accent: info.onset && info.accent,
          open: info.onset && info.open,
          roll: info.onset ? info.roll : 0,
          sticking: info.onset ? info.sticking : '',
          startStep: gi, span,
        })
        p = q
      }
    }
    beatsData.push({ tickables, sub, spb, tuplet: tuplet ? { num: tuplet.num, inTimeOf: tuplet.inTimeOf, groups: tuplet.groups } : null })
    base += spb
  }

  return {
    timeSig: `${ex.timeSignature.beats}/${ex.timeSignature.unit}`,
    beats: beatsCount,
    unit: ex.timeSignature.unit,
    beatsData,
    totalSteps: n,
    maxSpb,
    // Rolls are beamed across beats (the whole roll under one beam), unlike the
    // default per-beat beaming used everywhere else.
    beamAcross: ex.section === 'rolls',
  }
}
