// "Stick Control" by George Lawrence Stone — catalogued exercises.
//
// Included: "Single Beat Combinations" 1–72 (pages 5–7) — each one bar of 4/4 in
// sixteenth notes (16 strokes) on the snare. These map cleanly onto our model.
//
// NOT included (need engine features our model lacks):
//   • Triplets (pp. 8–9) mix straight + triplet rhythms within a bar.
//   • Short Roll Combinations / Roll Progressions (pp. 10–15, 43–46) need rolls.
//   • Flam Beats (pp. 16–42) need grace notes (flams).
//
// Stickings are transcribed from the book scans. Page 5 (1–24) is verified;
// 25–72 (pages 6–7) are best-effort transcriptions — a stray letter can be
// corrected in the grid editor if you spot one against the book.
import { createEmptyExercise, strokeTypeTag } from '../model/exercise.js'

const PAGE5 = [
  'RLRL RLRL RLRL RLRL', // 1
  'LRLR LRLR LRLR LRLR', // 2
  'RRLL RRLL RRLL RRLL', // 3
  'LLRR LLRR LLRR LLRR', // 4
  'RLRR LRLL RLRR LRLL', // 5
  'RLLR LRRL RLLR LRRL', // 6
  'RRLR LLRL RRLR LLRL', // 7
  'RLRL LRLR RLRL LRLR', // 8
  'RRRL RRRL RRRL RRRL', // 9
  'LLLR LLLR LLLR LLLR', // 10
  'RLLL RLLL RLLL RLLL', // 11
  'LRRR LRRR LRRR LRRR', // 12
  'RRRR LLLL RRRR LLLL', // 13
  'RLRL RRLL RLRL RRLL', // 14
  'LRLR LLRR LRLR LLRR', // 15
  'RLRL RLRR LRLR LRLL', // 16
  'RLRL RLLR LRLR LRRL', // 17
  'RLRL RRLR LRLR LLRL', // 18
  'RLRL RRRL RLRL RRRL', // 19
  'LRLR LLLR LRLR LLLR', // 20
  'RLRL RLLL RLRL RLLL', // 21
  'LRLR LRRR LRLR LRRR', // 22
  'RLRL RRRR LRLR LLLL', // 23
  'RRLL RLRR LLRR LRLL', // 24
]

const PAGE6 = [
  'RRLL RLLR LLRR LRRL', // 25
  'RRLL RRLR LLRR LLRL', // 26
  'RRLL LLRR RRLL LLRR', // 27
  'RRLL RRRL RRLL RRRL', // 28
  'LLRR LLLR LLRR LLLR', // 29
  'RRLL RLLL RRLL RLLL', // 30
  'LLRR LRRR LLRR LRRR', // 31
  'RRLL RRRR LLRR LLLL', // 32
  'RLRR LRRL RLRR LRRL', // 33
  'LRLL RLLR LRLL RLLR', // 34
  'RLRR LLRL RLRR LLRL', // 35
  'LRLL RRLR LRLL RRLR', // 36
  'RLRR RLRR RLRR RLRR', // 37
  'LRLL LRLL LRLL LRLL', // 38
  'RLRR LLLR LRLL RRRL', // 39
  'RLRR LRRR LRLL RLLL', // 40
  'RLRR LLLL RLRR LLLL', // 41
  'LRLL RRRR LRLL RRRR', // 42
  'RLLR LLRL RLLR LLRL', // 43
  'LRRL RRLR LRRL RRLR', // 44
  'RLLR RLLR RLLR RLLR', // 45
  'LRRL LRRL LRRL LRRL', // 46
  'RLLR LLLR LRRL RRRL', // 47
  'RLLR LRRR LRRL RLLL', // 48
]

const PAGE7 = [
  'RLLR LLLL RLLR LLLL', // 49
  'LRRL RRRR LRRL RRRR', // 50
  'RRLR RRLR RRLR RRLR', // 51
  'LLRL LLRL LLRL LLRL', // 52
  'RRLR LLLR LLRL RRRL', // 53
  'RRLR LRRR LLRL RLLL', // 54
  'RRLR LLLL RRLR LLLL', // 55
  'LLRL RRRR LLRL RRRR', // 56
  'RRRL LLLR RRRL LLLR', // 57
  'RRRL RLLL RRRL RLLL', // 58
  'LLLR LRRR LLLR LRRR', // 59
  'RRRL RRRR LLLR LLLL', // 60
  'RLLL LRRR RLLL LRRR', // 61
  'RLLL RRRR LRRR LLLL', // 62
  'RRRL LLRR RLLL RRRL', // 63
  'LLLR RRLL LRRR LLLR', // 64
  'RRLR RLRR LRRL RLRL', // 65
  'LLRL LRLL RLLR LRLR', // 66
  'RLLR LLRL LRLL RLRL', // 67
  'LRRL RRLR RLRR LRLR', // 68
  'RLRR LLLL RRRR LRLL', // 69
  'RRLL RLRR LLLL RRRR', // 70
  'LLRR LRLL RRRR LLLL', // 71
  'RRRR LLRR LRRL RLRL', // 72
]

function singleBeat(num, page, sticking) {
  const chars = sticking.replace(/\s+/g, '').split('')
  const ex = createEmptyExercise({
    id: `sc_sb_${num}`,
    name: `Stick Control #${num}`,
    bpm: 80,
    timeSignature: { beats: 4, unit: 4 },
    subdivision: 'sixteenth',
    source: 'stick-control',
    section: 'single-beat',
    number: num,
    page,
    tags: [strokeTypeTag(chars.join(''))],
  })
  chars.forEach((ch, i) => {
    ex.rows.snare[i] = { on: true, accent: false }
    ex.sticking[i] = ch.toUpperCase()
  })
  return ex
}

// Triplets (page 8): cut time (2/2). Beat 1 (half-note) = 4 eighth notes (the
// basic sticking); beat 2 (half-note) = an eighth-note sextuplet (the two triplet
// groups joined). beatSubs = ['sixteenth','sextuplet'] (4 + 6 = 10 strokes); with
// unit 2 the notation renders them as eighths + an eighth-triplet sextuplet.
function triplet(num, beat1) {
  let last = beat1[3]
  let cont = ''
  for (let i = 0; i < 6; i++) { last = last === 'R' ? 'L' : 'R'; cont += last }
  const sticking = (beat1 + cont).split('')
  const ex = createEmptyExercise({
    id: `sc_tr_${num}`,
    name: `Stick Control Triplet #${num}`,
    bpm: 76,
    timeSignature: { beats: 2, unit: 2 },
    beatSubs: ['sixteenth', 'sextuplet'],
    source: 'stick-control',
    section: 'triplets',
    number: num,
    page: 8,
    tags: [strokeTypeTag(beat1)],
  })
  sticking.forEach((ch, i) => {
    ex.rows.snare[i] = { on: true, accent: false, roll: 0 }
    ex.sticking[i] = ch.toUpperCase()
  })
  return ex
}

const TRIPLET_BEAT1 = PAGE5.slice(0, 12).map((s) => s.replace(/\s+/g, '').slice(0, 4))

// Short Roll Combinations (page 10): cut time (2/2). Beat 1 (half) = four eighth
// notes (the "single beat"); beat 2 (half) = the roll as eight sixteenths (two
// groups of four) under one beam. `eighths` is 4 chars; `sixteenths` is up to 8
// chars where '.' marks a rest (the roll's release).
function rollPattern(id, name, number, eighths, sixteenths) {
  const ex = createEmptyExercise({
    id, name, bpm: 66, timeSignature: { beats: 2, unit: 2 },
    beatSubs: ['sixteenth', 'thirtysecond'],
    source: 'stick-control', section: 'rolls', number, page: 10, tags: ['roll'],
  })
  eighths.split('').forEach((ch, i) => {
    ex.rows.snare[i] = { on: true, accent: false, roll: 0 }
    ex.sticking[i] = ch.toUpperCase()
  })
  sixteenths.split('').forEach((ch, j) => {
    if (ch === '.') return
    const i = 4 + j
    ex.rows.snare[i] = { on: true, accent: false, roll: 0 }
    ex.sticking[i] = ch.toUpperCase()
  })
  return ex
}

// Two roll variants per the book: A) eight sixteenths (two groups of four) and
// B) seven sixteenths + a 16th rest (four + three + release). Each is one cut-time
// bar: four eighths (beat 1) + the roll (beat 2). `e8` = 4 eighths, `s16` = 8
// sixteenths where '.' is a rest. (Representative set across the book's stickings.)
const ROLLS = [
  // Variant A — two groups of four (8 sixteenths)
  ['Single-stroke roll', 'RLRL', 'RLRLRLRL'],
  ['Single-stroke roll (L)', 'LRLR', 'LRLRLRLR'],
  ['Double-stroke roll', 'RLRL', 'RRLLRRLL'],
  ['Double-stroke roll (L)', 'LRLR', 'LLRRLLRR'],
  ['Double-stroke roll · doubles lead', 'RRLL', 'RRLLRRLL'],
  ['Double-stroke roll · doubles lead (L)', 'LLRR', 'LLRRLLRR'],
  ['Paradiddle roll', 'RLRR', 'RRLLRRLL'],
  ['Paradiddle roll (L)', 'LRLL', 'LLRRLLRR'],
  // Variant B — four + three + a 16th rest (release)
  ['7-stroke roll', 'RLRL', 'RRLLRRL.'],
  ['7-stroke roll (L)', 'LRLR', 'LLRRLLR.'],
  ['7-stroke roll · doubles lead', 'RRLL', 'RRLLRRL.'],
  ['7-stroke roll · doubles lead (L)', 'LLRR', 'LLRRLLR.'],
  ['Single-stroke roll + rest', 'RLRL', 'RLRLRLR.'],
  ['Single-stroke roll + rest (L)', 'LRLR', 'LRLRLRL.'],
  ['Triple-stroke roll', 'RLRL', 'RRRLLLR.'],
  ['Triple-stroke roll (L)', 'LRLR', 'LLLRRRL.'],
]

function getRollExercises() {
  return ROLLS.map(([name, e8, s16], i) => rollPattern(`sc_roll_${i + 1}`, name, i + 1, e8, s16))
}

// Roll progressions (pp. 43–46): standard stroke rolls — the doubles written as
// sixteenths + a final accented tap. Only the ones that tile a bar cleanly
// (5/9/13-stroke = 4k+1 strokes); `sticking` is one char per step ('.' = rest),
// the last stroke is the accented tap.
function rollProg(id, name, number, ts, beatSubs, sticking, accentIdx) {
  const ex = createEmptyExercise({
    id, name, bpm: 72, timeSignature: ts, beatSubs,
    source: 'stick-control', section: 'rolls', number, page: 43, tags: ['roll'],
  })
  sticking.split('').forEach((ch, i) => {
    if (ch === '.') return
    ex.rows.snare[i] = { on: true, accent: i === accentIdx, roll: 0 }
    ex.sticking[i] = ch.toUpperCase()
  })
  return ex
}

function getRollProgressions() {
  const four = { beats: 4, unit: 4 }
  const two = { beats: 2, unit: 4 }
  return [
    rollProg('sc_rp_5r', '5-stroke roll', 101, two, ['sixteenth', 'quarter'], 'RRLLR', 4),
    rollProg('sc_rp_5l', '5-stroke roll (L)', 102, two, ['sixteenth', 'quarter'], 'LLRRL', 4),
    rollProg('sc_rp_9r', '9-stroke roll', 103, four, ['sixteenth', 'sixteenth', 'quarter', 'quarter'], 'RRLLRRLLR.', 8),
    rollProg('sc_rp_9l', '9-stroke roll (L)', 104, four, ['sixteenth', 'sixteenth', 'quarter', 'quarter'], 'LLRRLLRRL.', 8),
    rollProg('sc_rp_13r', '13-stroke roll', 105, four, ['sixteenth', 'sixteenth', 'sixteenth', 'quarter'], 'RRLLRRLLRRLLR', 12),
    rollProg('sc_rp_13l', '13-stroke roll (L)', 106, four, ['sixteenth', 'sixteenth', 'sixteenth', 'quarter'], 'LLRRLLRRLLRRL', 12),
  ]
}

// ---- Flam Beats (pages 16–17, #1–48) -------------------------------------
// Each exercise: two bars of 2/4 on a 16th grid. Beat groups come in two
// figures, exactly as printed: a 3-stroke group = eighth + two 16ths (strikes on
// 16th slots 0,2,3) and a 4-stroke group = four 16ths. Stroke letters:
//   R/L = plain stroke;  F = right-hand flam (lR);  P = left-hand flam (rL)
// (the book prints P-strokes as a circled F; the flam grace is the opposite hand).
const FLAM_BEATS = [
  'FLL FLL FLL FLL', 'PRR PRR PRR PRR', 'FRR PLL FRR PLL', 'FLR PRL FLR PRL',
  'FRL FRL FRL FRL', 'PLR PLR PLR PLR', 'FRL PLR FRL PLR', 'FLRL FLRL FLRL FLRL',
  'PRLR PRLR PRLR PRLR', 'FLRR PRLL FLRR PRLL', 'FRPL FRPL FRPL FRPL',
  'FLRL PRLR FLRL PRLR', 'FRLL FRLL FRLL FRLL', 'PLRR PLRR PLRR PLRR',
  'FRLR PLRL FRLR PLRL', 'FRLL PLRR FRLL PLRR', 'FLLR PRRL FLLR PRRL',
  'FRRR PLLL FRRR PLLL', 'FLL FLL FRR PLL', 'FLL FLL FLR PRL',
  'FLL FLL FRL FRL', 'FLL FLL FRL PLR', 'FLL FLL FLRL FLRL', 'FLL FLL FLRR PRLL',
  'FLL FLL FRPL FRPL', 'FLL FLL FLRL PRLR', 'FLL FLL FRLL FRLL',
  'FLL FLL FRLR PLRL', 'FLL FLL FRLL PLRR', 'FLL FLL FLLR PRRL',
  'FLL FLL FRRR PLLL', 'FRR PLL FLR PRL', 'FRR PLL FRL FRL', 'FRR PLL FRL PLR',
  'FRR PLL FLRL FLRL', 'FRR PLL FLRR PRLL', 'FRR PLL FRPL FRPL',
  'FRR PLL FLRL PRLR', 'FRR PLL FRLL FRLL', 'FRR PLL FRLR PLRL',
  'FRR PLL FRLL PLRR', 'FRR PLL FLLR PRRL', 'FRR PLL FRRR PLLL',
  'FLR PRL FRL FRL', 'FLR PRL FRL PLR', 'FLR PRL FLRL FLRL',
  'FLR PRL FLRR PRLL', 'FLR PRL FRPL FRPL',
]

function flamBeat(num, groupsStr) {
  const groups = groupsStr.split(/\s+/)
  const ex = createEmptyExercise({
    id: `sc_fb_${num}`,
    name: `Flam Beat ${num}`,
    bpm: 70,
    bars: [
      { ts: { beats: 2, unit: 4 }, beatSubs: ['sixteenth', 'sixteenth'] },
      { ts: { beats: 2, unit: 4 }, beatSubs: ['sixteenth', 'sixteenth'] },
    ],
    source: 'stick-control',
    section: 'flams',
    number: num,
    page: num <= 24 ? 16 : 17,
    tags: ['rudiment'],
  })
  groups.forEach((g, beat) => {
    const base = beat * 4
    // 3 strokes = eighth + two 16ths (slots 0,2,3); 4 strokes = four 16ths.
    const slots = g.length === 3 ? [0, 2, 3] : [0, 1, 2, 3]
    g.split('').forEach((ch, idx) => {
      const i = base + slots[idx]
      const flam = ch === 'F' || ch === 'P'
      const cell = { on: true, accent: false, roll: 0 }
      if (flam) cell.flam = true
      ex.rows.snare[i] = cell
      ex.sticking[i] = ch === 'F' ? 'R' : ch === 'P' ? 'L' : ch
    })
  })
  return ex
}

export function getFlamBeats() {
  return FLAM_BEATS.map((s, i) => flamBeat(i + 1, s))
}

export function getStickControlExercises() {
  const out = []
  PAGE5.forEach((s, i) => out.push(singleBeat(i + 1, 5, s)))
  PAGE6.forEach((s, i) => out.push(singleBeat(i + 25, 6, s)))
  PAGE7.forEach((s, i) => out.push(singleBeat(i + 49, 7, s)))
  TRIPLET_BEAT1.forEach((b1, i) => out.push(triplet(i + 1, b1)))
  getRollExercises().forEach((ex) => out.push(ex))
  getRollProgressions().forEach((ex) => out.push(ex))
  getFlamBeats().forEach((ex) => out.push(ex))
  return out
}
