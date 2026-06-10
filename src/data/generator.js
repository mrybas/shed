// Sight-reading generator: seeded random snare rhythms by difficulty level.
// Deterministic for a given (level, bars, seed) — the "exercise of the day"
// uses the date as its seed so everyone sees the same rhythm all day.
import { createEmptyExercise } from '../model/exercise.js'

// mulberry32 — small, fast, deterministic PRNG.
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Weighted pick from [[item, weight], …].
function pick(rand, pool) {
  const total = pool.reduce((t, [, w]) => t + w, 0)
  let r = rand() * total
  for (const [item, w] of pool) {
    r -= w
    if (r <= 0) return item
  }
  return pool[pool.length - 1][0]
}

// Per-beat onset patterns by subdivision (1 = hit). Weights tune how often a
// figure shows up; harder levels add syncopation (beats starting on a rest).
const POOLS = {
  beginner: {
    subs: [['eighth', 1]],
    eighth: [[[1, 0], 5], [[1, 1], 4], [[0, 0], 1]],
  },
  intermediate: {
    subs: [['sixteenth', 1]],
    sixteenth: [
      [[1, 0, 0, 0], 3], [[1, 0, 1, 0], 3], [[1, 1, 1, 1], 2],
      [[1, 0, 1, 1], 2], [[1, 1, 0, 1], 2], [[1, 1, 1, 0], 2],
      [[1, 0, 0, 1], 1], [[0, 0, 1, 0], 1], [[0, 0, 0, 0], 1],
    ],
  },
  advanced: {
    subs: [['sixteenth', 3], ['triplet', 2], ['eighth', 1]],
    sixteenth: [
      [[1, 0, 1, 0], 2], [[1, 1, 1, 1], 2], [[1, 0, 1, 1], 2], [[1, 1, 0, 1], 2],
      [[0, 1, 1, 1], 2], [[0, 1, 1, 0], 1], [[0, 0, 1, 1], 1], [[1, 0, 0, 1], 1],
    ],
    triplet: [[[1, 0, 0], 2], [[1, 0, 1], 2], [[1, 1, 1], 3], [[0, 1, 1], 1]],
    eighth: [[[1, 1], 2], [[1, 0], 1], [[0, 1], 1]],
  },
}

const LEVEL_BPM = { beginner: 76, intermediate: 84, advanced: 88 }

export function generateRhythm({ level = 'beginner', bars = 2, seed = 1 } = {}) {
  const pools = POOLS[level] || POOLS.beginner
  const rand = mulberry32(seed)

  // Pick each beat's subdivision (uniform per bar for readable notation at
  // lower levels; advanced mixes feels within the bar).
  const barSpecs = []
  for (let b = 0; b < bars; b++) {
    const beatSubs = []
    for (let bt = 0; bt < 4; bt++) beatSubs.push(pick(rand, pools.subs))
    barSpecs.push({ ts: { beats: 4, unit: 4 }, beatSubs })
  }

  const ex = createEmptyExercise({
    id: `gen_${level}_${seed}`,
    name: 'Sight reading',
    bpm: LEVEL_BPM[level] || 80,
    level,
    bars: barSpecs,
    source: 'generated',
    tags: [],
  })
  ex.cat = 'gen' // not a library category: hides the technique chip
  ex.genLevel = level
  ex.genSeed = seed

  // Fill the snare row beat by beat.
  let step = 0
  let prevEmpty = false
  let hand = 0 // alternate R/L across onsets
  let first = true
  barSpecs.forEach((bar) => {
    bar.beatSubs.forEach((sub) => {
      let pattern = pick(rand, pools[sub])
      // Never start the piece on a rest, and never two silent beats in a row.
      const empty = (p) => p.every((v) => !v)
      let guard = 0
      while ((first || prevEmpty) && empty(pattern) && guard++ < 8) pattern = pick(rand, pools[sub])
      if (first && !pattern[0]) pattern = pattern.map((v, i) => (i === 0 ? 1 : v))
      prevEmpty = empty(pattern)
      first = false

      pattern.forEach((on, i) => {
        if (on) {
          const cell = { on: true, accent: false, roll: 0 }
          if (level !== 'beginner' && i === 0 && rand() < 0.2) cell.accent = true
          if (level === 'advanced' && i === 0 && rand() < 0.12) cell.flam = true
          ex.rows.snare[step + i] = cell
          ex.sticking[step + i] = hand === 0 ? 'R' : 'L'
          hand = 1 - hand
        }
      })
      step += pattern.length
    })
  })

  return ex
}

const LEVELS = ['beginner', 'intermediate', 'advanced']

// The daily exercise: same for everyone on a given local date. The level
// rotates with the date hash so the difficulty varies through the week.
export function exerciseOfTheDay(dateStr) {
  const seed = hashSeed(dateStr)
  const level = LEVELS[seed % 3]
  const ex = generateRhythm({ level, bars: 2, seed })
  ex.id = `daily_${dateStr}`
  ex.name = `Exercise of the day · ${dateStr}`
  return ex
}
