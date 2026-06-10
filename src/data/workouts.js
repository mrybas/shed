import { downloadJSON } from '../model/exercise.js'
import { getCatalogExercises, catOf, levelOf } from './catalogV2.js'
import { mulberry32 } from './generator.js'

// Built-in daily workouts: ordered blocks of catalog exercises with per-block
// playback settings (tempo, speed/gap trainer, swing, count-in). Built on the
// standard practice principles: warm up slow, raise tempo gradually (Stone's
// "20 relaxed repetitions" idea automated by the speed trainer), work dynamics,
// finish with a timekeeping test on the gap trainer.

const ramp = (everyBars, stepBpm, maxBpm) => ({ tempoRamp: { enabled: true, everyBars, stepBpm, maxBpm } })
const gap = (onBars, offBars) => ({ gapTrainer: { enabled: true, onBars, offBars } })
const countInEach = { countIn: { enabled: true, bars: 1, mode: 'phrase', feel: 'quarter' } }

export const WORKOUTS = [
  {
    id: 'wk_beg_10',
    name: 'Beginner Daily',
    level: 'beginner',
    minutes: 10,
    description: 'The daily minimum for new drummers: even hands, first doubles, your first groove, and a short timing test.',
    blocks: [
      { exerciseId: 'fs_quarters', minutes: 2, note: 'Relaxed full strokes. Let the stick rebound.', settings: { bpm: 60 } },
      { exerciseId: 'fs_eighths', minutes: 2, note: 'Stay even between the hands.', settings: { bpm: 60, ...ramp(4, 4, 80) } },
      { exerciseId: 'fs_doubles_slow', minutes: 2, note: 'Two clean strokes per hand — no buzzing.', settings: { bpm: 60, ...ramp(4, 4, 76) } },
      { exerciseId: 'fs_money_beat', minutes: 3, note: 'Lock kick and hat together; snare relaxed.', settings: { bpm: 70 } },
      { exerciseId: 'fs_kick_snare', minutes: 1, note: 'Timing test: keep it steady when the click drops out.', settings: { bpm: 65, ...gap(2, 2) } },
    ],
  },
  {
    id: 'wk_beg_15',
    name: 'Beginner Builder',
    level: 'beginner',
    minutes: 15,
    description: 'A fuller session: hands, first 16ths, two grooves and your first fill drilled with a count-in on every pass.',
    blocks: [
      { exerciseId: 'fs_eighths', minutes: 2, note: 'Warm-up. Watch the rebound.', settings: { bpm: 60, ...ramp(4, 5, 85) } },
      { exerciseId: 'fs_doubles_slow', minutes: 3, note: 'Doubles still slow and even.', settings: { bpm: 60, ...ramp(4, 4, 80) } },
      { exerciseId: 'builtin_single_stroke', minutes: 3, note: 'First 16th notes — quiet hands, no tension.', settings: { bpm: 70 } },
      { exerciseId: 'fs_money_beat', minutes: 3, note: 'Groove time. Make it feel good, not just correct.', settings: { bpm: 72 } },
      { exerciseId: 'fs_half_time', minutes: 2, note: 'Big spacious backbeat on 3.', settings: { bpm: 70 } },
      { exerciseId: 'fs_first_fill', minutes: 2, note: 'One pass per count-in: think the fill before playing it.', settings: { bpm: 65, ...countInEach } },
    ],
  },
  {
    id: 'wk_int_10',
    name: 'Intermediate Daily',
    level: 'intermediate',
    minutes: 10,
    description: 'Singles and doubles pushed up the metronome, paradiddle accents, and a groove with the click dropping out.',
    blocks: [
      { exerciseId: 'builtin_single_stroke', minutes: 2, note: 'Warm-up ramp. Stop the ramp where tension starts.', settings: { bpm: 90, ...ramp(4, 5, 130) } },
      { exerciseId: 'builtin_double_stroke', minutes: 3, note: 'Open doubles — second note as strong as the first.', settings: { bpm: 80, ...ramp(4, 5, 120) } },
      { exerciseId: 'dci16a_16th', minutes: 3, note: 'Paradiddles: accents pop, taps whisper.', settings: { bpm: 90 } },
      { exerciseId: 'builtin_basic_rock', minutes: 2, note: 'Timekeeping: hold the groove through the silence.', settings: { bpm: 96, ...gap(2, 2) } },
    ],
  },
  {
    id: 'wk_int_20',
    name: 'Intermediate Shed',
    level: 'intermediate',
    minutes: 20,
    description: 'The full hands menu: ramped singles/doubles/triples, paradiddle variations, flam taps, triplets and a shuffle groove.',
    blocks: [
      { exerciseId: 'builtin_single_stroke', minutes: 2, note: 'Warm-up ramp.', settings: { bpm: 90, ...ramp(4, 5, 130) } },
      { exerciseId: 'builtin_double_stroke', minutes: 3, note: 'Doubles ramp — relaxed at the top or lower the cap.', settings: { bpm: 80, ...ramp(4, 5, 120) } },
      { exerciseId: 'sc_sb_9', minutes: 3, note: 'Triples (RRRL): even three per hand.', settings: { bpm: 70, ...ramp(4, 5, 100) } },
      { exerciseId: 'dci16a_16th', minutes: 3, note: 'Paradiddle accents.', settings: { bpm: 90 } },
      { exerciseId: 'dci16a_inverted', minutes: 2, note: 'Inverted paradiddle — accent moves, hands stay calm.', settings: { bpm: 80 } },
      { exerciseId: 'builtin_flam_tap', minutes: 3, note: 'Flam taps: grace notes low, taps even.', settings: { bpm: 70 } },
      { exerciseId: 'dci16a_triplets', minutes: 2, note: 'Paradiddles over a triplet pulse.', settings: { bpm: 80 } },
      { exerciseId: 'builtin_basic_rock', minutes: 2, note: 'Shuffle it: same groove, swung 8ths.', settings: { bpm: 92, swing: 60 } },
    ],
  },
  {
    id: 'wk_adv_20',
    name: 'Advanced Shed',
    level: 'advanced',
    minutes: 20,
    description: 'Quads, Flam Beats from Stick Control, drags and stroke rolls — capped with a hard gap-trainer test.',
    blocks: [
      { exerciseId: 'builtin_double_stroke', minutes: 2, note: 'Warm-up ramp, higher cap.', settings: { bpm: 100, ...ramp(4, 5, 140) } },
      { exerciseId: 'sc_sb_13', minutes: 3, note: 'Quads (RRRRLLLL): four even strokes per hand.', settings: { bpm: 80, ...ramp(4, 5, 110) } },
      { exerciseId: 'sc_fb_1', minutes: 3, note: 'Flam Beat 1 — graces tight to the beat.', settings: { bpm: 70, ...ramp(8, 4, 90) } },
      { exerciseId: 'sc_fb_11', minutes: 3, note: 'Flammed doubles — both flams identical.', settings: { bpm: 70 } },
      { exerciseId: 'builtin_single_drag_tap', minutes: 2, note: 'Drags: two graces, one accent.', settings: { bpm: 60, ...ramp(8, 4, 80) } },
      { exerciseId: 'sc_rp_5r', minutes: 3, note: '5-stroke rolls — clean release on the accent.', settings: { bpm: 70 } },
      { exerciseId: 'sc_tr_1', minutes: 2, note: 'Straight 8ths into sextuplets without rushing.', settings: { bpm: 70 } },
      { exerciseId: 'builtin_single_stroke', minutes: 2, note: 'Exam: 1 bar of click, 3 bars alone.', settings: { bpm: 110, ...gap(1, 3) } },
    ],
  },
  {
    id: 'wk_adv_30',
    name: 'Advanced Marathon',
    level: 'advanced',
    minutes: 30,
    description: 'The big one: every hand family ramped, Flam Beat combinations, drags, roll progressions, triplets and swung grooves.',
    blocks: [
      { exerciseId: 'builtin_single_stroke', minutes: 3, note: 'Long warm-up ramp.', settings: { bpm: 100, ...ramp(4, 5, 150) } },
      { exerciseId: 'builtin_double_stroke', minutes: 3, note: 'Doubles ramp.', settings: { bpm: 100, ...ramp(4, 5, 140) } },
      { exerciseId: 'sc_sb_13', minutes: 3, note: 'Quads ramp.', settings: { bpm: 80, ...ramp(4, 5, 115) } },
      { exerciseId: 'sc_fb_3', minutes: 3, note: 'Alternating flam leads (FRR PLL).', settings: { bpm: 70, ...ramp(8, 4, 92) } },
      { exerciseId: 'sc_fb_24', minutes: 3, note: 'Flam Beat combination — figure change without a hiccup.', settings: { bpm: 70 } },
      { exerciseId: 'builtin_double_drag_tap', minutes: 3, note: 'Double drags in triplet feel.', settings: { bpm: 60, ...ramp(8, 4, 80) } },
      { exerciseId: 'sc_rp_9r', minutes: 3, note: '9-stroke rolls.', settings: { bpm: 72 } },
      { exerciseId: 'sc_tr_3', minutes: 3, note: 'Doubles into sextuplets (Stick Control triplets #3).', settings: { bpm: 72 } },
      { exerciseId: 'builtin_rock_ride', minutes: 3, note: 'Apply it: ride groove, swung.', settings: { bpm: 104, swing: 55 } },
      { exerciseId: 'builtin_single_stroke', minutes: 3, note: 'Final exam: mostly silent click.', settings: { bpm: 120, ...gap(1, 3) } },
    ],
  },
]

// ---- User-made workouts (localStorage) ----
const MY_KEY = 'drums2_myworkouts'

export function loadMyWorkouts() {
  try {
    const raw = localStorage.getItem(MY_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveMyWorkout(w) {
  const list = loadMyWorkouts()
  const i = list.findIndex((x) => x.id === w.id)
  if (i >= 0) list[i] = w
  else list.push(w)
  try {
    localStorage.setItem(MY_KEY, JSON.stringify(list))
    return list
  } catch {
    return null
  }
}

export function deleteMyWorkout(id) {
  const list = loadMyWorkouts().filter((w) => w.id !== id)
  try { localStorage.setItem(MY_KEY, JSON.stringify(list)) } catch { /* ignore */ }
  return list
}

let wkCounter = 0
export function newWorkoutId() {
  wkCounter += 1
  return `mywk_${wkCounter}_${performance.now().toString(36).replace('.', '')}`
}

export function emptyWorkout() {
  return { id: newWorkoutId(), name: 'My workout', level: 'intermediate', minutes: 0, description: '', custom: true, blocks: [] }
}

// A user copy of any workout (re-id'd, marked custom, minutes recomputed).
export function duplicateWorkout(w) {
  const copy = JSON.parse(JSON.stringify(w))
  copy.id = newWorkoutId()
  copy.name = `${w.name} (copy)`
  copy.custom = true
  copy.minutes = copy.blocks.reduce((t, b) => t + b.minutes, 0)
  return copy
}

// Adaptive progression: when a ramped block has tempo history for its exercise,
// start a touch below the last reached tempo instead of the cold base — classic
// periodization. Clamped so it never starts below the block's base or within
// 10 bpm of the ramp ceiling.
export function adaptiveStartBpm(block, stats) {
  const s = block.settings || {}
  if (!s.tempoRamp?.enabled || !s.bpm || !stats?.last) return null
  const cap = (s.tempoRamp.maxBpm || Infinity) - 10
  const start = Math.max(s.bpm, Math.min(stats.last - 4, cap))
  return start > s.bpm ? Math.round(start) : null
}

// Test helper: every workout must reference real exercises and add up.
export function validateWorkouts(catalog) {
  const ids = new Set(catalog.map((e) => e.id))
  const problems = []
  WORKOUTS.forEach((w) => {
    const sum = w.blocks.reduce((t, b) => t + b.minutes, 0)
    if (sum !== w.minutes) problems.push(`${w.id}: blocks sum ${sum} != ${w.minutes}`)
    w.blocks.forEach((b) => { if (!ids.has(b.exerciseId)) problems.push(`${w.id}: missing exercise ${b.exerciseId}`) })
    if (!['beginner', 'intermediate', 'advanced'].includes(w.level)) problems.push(`${w.id}: bad level`)
  })
  return problems
}

// ---- "Surprise me": generate a session from the catalog -------------------
// warm-up -> technique (ramped) -> groove -> optional fill -> timing test.
const GEN_TECH = {
  beginner: ['singles', 'doubles'],
  intermediate: ['doubles', 'triples', 'paradiddle', 'rudiments'],
  advanced: ['paradiddle', 'rudiments', 'rolls', 'flams', 'quads'],
}
const GEN_LEVELS = {
  beginner: ['beginner'],
  intermediate: ['beginner', 'intermediate'],
  advanced: ['intermediate', 'advanced'],
}

export function generateWorkout({ level = 'intermediate', minutes = 15, seed = 1 } = {}) {
  const rand = mulberry32(seed)
  const all = getCatalogExercises()
  const lvls = GEN_LEVELS[level] || GEN_LEVELS.intermediate
  const pool = (cats) => {
    const strict = all.filter((e) => cats.includes(catOf(e)) && lvls.includes(levelOf(e)))
    return strict.length ? strict : all.filter((e) => cats.includes(catOf(e)))
  }
  const used = new Set()
  const pick = (cats) => {
    const arr = pool(cats)
    const fresh = arr.filter((e) => !used.has(e.id))
    const ex = (fresh.length ? fresh : arr)[Math.floor(rand() * (fresh.length ? fresh.length : arr.length))]
    used.add(ex.id)
    return ex
  }
  const ramp = (everyBars, stepBpm, maxBpm) => ({ tempoRamp: { enabled: true, everyBars, stepBpm, maxBpm } })

  const withFill = minutes >= 15
  const techCount = minutes >= 20 ? 3 : minutes >= 12 ? 2 : 1
  // Fixed-size blocks first; the rest splits between technique and groove.
  const warmMin = 2
  const fillMin = withFill ? 2 : 0
  const timeMin = 2
  let rest = Math.max(2 + techCount * 2, minutes - warmMin - fillMin - timeMin)
  const grooveMin = Math.max(2, Math.round(rest / (techCount + 1)))
  const techMinEach = Math.max(2, Math.floor((rest - grooveMin) / techCount))
  rest = rest - grooveMin - techMinEach * techCount // leftover goes to the groove

  const warm = pick(level === 'beginner' ? ['firstSteps'] : ['singles'])
  const blocks = [
    { exerciseId: warm.id, minutes: warmMin, note: 'Warm-up. Relaxed hands, watch the rebound.', settings: { bpm: Math.max(50, warm.bpm - 10), ...ramp(4, 4, warm.bpm + 16) } },
  ]
  for (let i = 0; i < techCount; i++) {
    const ex = pick(GEN_TECH[level] || GEN_TECH.intermediate)
    blocks.push({ exerciseId: ex.id, minutes: techMinEach, note: 'Technique. Clean strokes before speed.', settings: { bpm: Math.max(50, ex.bpm - 6), ...ramp(4, 4, ex.bpm + 20) } })
  }
  const groove = pick(['grooves'])
  blocks.push({ exerciseId: groove.id, minutes: grooveMin + rest, note: 'Groove. Make it feel good, not just correct.', settings: { bpm: groove.bpm } })
  if (withFill) {
    const fill = pick(['fills'])
    blocks.push({ exerciseId: fill.id, minutes: fillMin, note: 'Fill. Think it through before each pass.', settings: { bpm: Math.max(50, fill.bpm - 6), countIn: { enabled: true, bars: 1, mode: 'phrase', feel: 'quarter' } } })
  }
  const timing = pick(['grooves', 'firstSteps'])
  blocks.push({ exerciseId: timing.id, minutes: timeMin, note: 'Timing test: hold steady through the silent bars.', settings: { bpm: timing.bpm, gapTrainer: { enabled: true, onBars: 2, offBars: 2 } } })

  const total = blocks.reduce((t, b) => t + b.minutes, 0)
  return {
    id: `wk_gen_${seed}`,
    name: `Surprise session · ${total}′`,
    level,
    minutes: total,
    description: 'Generated from the catalog: warm-up, technique with the speed trainer, a groove, and a timing test.',
    generated: true,
    blocks,
  }
}

// Share/backup a single workout as a file.
export function exportWorkoutFile(w) {
  const safe = w.name.replace(/[^\w\- ]/gi, '').trim().replace(/\s+/g, '_') || 'workout'
  downloadJSON(JSON.stringify({ app: 'drums', type: 'workout', version: 1, workout: w }, null, 2), `${safe}.workout.json`)
}
