// Pure transform: exercise model -> notation-ready data (no VexFlow here, so it
// can be unit-tested). NotationView consumes this to render with VexFlow.
//
// Note DURATIONS are derived from spacing: within each beat, a hit lasts until
// the next hit (or the beat end). So on a 16th grid, one hit per beat renders as
// a quarter note, a hit every 2 steps as eighths, etc. — real rhythmic notation
// instead of "always the grid value + rests".
import { INSTRUMENTS, stepsPerBeat, barLayout } from './exercise.js'

export const RENDER_INFO = {
  kick: { key: 'f/4', order: 0 },
  floorTom: { key: 'a/4', order: 1 },
  snare: { key: 'c/5', order: 2 },
  tom2: { key: 'd/5', order: 3 },
  tom1: { key: 'e/5', order: 4 },
  ride: { key: 'f/5/x2', order: 5 },
  hihatClosed: { key: 'g/5/x2', order: 6 },
  hihatOpen: { key: 'g/5/x2', order: 6, open: true },
  crash: { key: 'a/5/x2', order: 7 },
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
  const layout = barLayout(ex)
  // Rolls render one note per step (no duration merging) so a trailing empty
  // step shows as a real rest (the release), not a lengthened previous note.
  const noMerge = ex.section === 'rolls'

  const stepInfo = (step) => {
    const active = INSTRUMENTS.filter((inst) => ex.rows[inst]?.[step]?.on)
    return {
      onset: active.length > 0,
      accent: active.some((inst) => ex.rows[inst][step].accent),
      flam: active.some((inst) => ex.rows[inst][step].flam),
      ghost: active.some((inst) => ex.rows[inst][step].ghost),
      open: active.some((inst) => RENDER_INFO[inst]?.open),
      roll: (active.find((inst) => ex.rows[inst][step].roll) && ex.rows[active[0]][step].roll) || 0,
      keys: active.map((inst) => RENDER_INFO[inst]).filter(Boolean).sort((a, b) => a.order - b.order).map((r) => r.key),
      sticking: ex.sticking[step] || '',
    }
  }

  const beatsData = []
  const barsMeta = []
  let maxSpb = 1

  layout.bars.forEach((lb) => {
    // Note durations are written relative to the bar's beat unit (cut time etc.).
    const shift = Math.round(Math.log2(4 / lb.ts.unit))
    const firstBeatIndex = beatsData.length
    lb.beats.forEach((bt) => {
      const sub = bt.sub
      const spb = bt.len
      if (spb > maxSpb) maxSpb = spb
      const tuplet = TUPLET_INFO[sub] || null
      const base = bt.start
      const tickables = []

      if (tuplet) {
        const tDur = shiftDur(tuplet.durKind, shift)
        for (let s = 0; s < spb; s++) {
          const gi = base + s
          const info = stepInfo(gi)
          tickables.push({
            rest: !info.onset, keys: info.onset ? info.keys : ['b/4'], durKind: tDur, dots: 0,
            accent: info.onset && info.accent, flam: info.onset && info.flam, ghost: info.onset && info.ghost, open: info.onset && info.open, roll: info.onset ? info.roll : 0,
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
            rest: !info.onset, keys: info.onset ? info.keys : ['b/4'], durKind, dots: 0,
            accent: info.onset && info.accent, flam: info.onset && info.flam, ghost: info.onset && info.ghost, open: info.onset && info.open, roll: info.onset ? info.roll : 0,
            sticking: info.onset ? info.sticking : '', startStep: gi, span: 1,
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
            rest: !info.onset, keys: info.onset ? info.keys : ['b/4'], durKind, dots,
            accent: info.onset && info.accent, flam: info.onset && info.flam, ghost: info.onset && info.ghost, open: info.onset && info.open, roll: info.onset ? info.roll : 0,
            sticking: info.onset ? info.sticking : '', startStep: gi, span,
          })
          p = q
        }
      }
      beatsData.push({ tickables, sub, spb, bar: lb.bar, tuplet: tuplet ? { num: tuplet.num, inTimeOf: tuplet.inTimeOf, groups: tuplet.groups } : null })
    })
    barsMeta.push({
      bar: lb.bar, ts: lb.ts, timeSig: `${lb.ts.beats}/${lb.ts.unit}`,
      unit: lb.ts.unit, beatCount: lb.beats.length, stepCount: lb.stepCount, firstBeatIndex,
    })
  })

  return {
    timeSig: barsMeta[0].timeSig,
    beats: beatsData.length,
    unit: barsMeta[0].unit,
    beatsData,
    barsMeta,
    totalSteps: layout.totalSteps,
    maxSpb,
    // Rolls are beamed across beats (the whole roll under one beam), unlike the
    // default per-beat beaming used everywhere else.
    beamAcross: ex.section === 'rolls',
  }
}
