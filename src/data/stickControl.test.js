import { describe, it, expect } from 'vitest'
import { getStickControlExercises } from './stickControl.js'
import { barCount, getBars, exerciseTotalSteps } from '../model/exercise.js'
import { buildNotationData } from '../model/notation.js'

const list = getStickControlExercises()
const single = list.filter((e) => e.section === 'single-beat')
const triplets = list.filter((e) => e.section === 'triplets')
const rolls = list.filter((e) => e.section === 'rolls')
const flams = list.filter((e) => e.section === 'flams')
const byNum = (n) => single.find((e) => e.number === n)

describe('Stick Control — Single Beat Combinations (pages 5–7)', () => {
  it('has 72 single-beat exercises, numbered 1..72', () => {
    expect(single).toHaveLength(72)
    expect(single.map((e) => e.number)).toEqual(Array.from({ length: 72 }, (_, i) => i + 1))
  })

  it('each is one 4/4 bar of 16 sixteenths, all on snare, with valid R/L sticking', () => {
    single.forEach((ex) => {
      expect(ex.source).toBe('stick-control')
      expect([5, 6, 7]).toContain(ex.page)
      expect(ex.subdivision).toBe('sixteenth')
      expect(ex.timeSignature).toEqual({ beats: 4, unit: 4 })
      expect(ex.rows.snare.filter((c) => c.on)).toHaveLength(16)
      const sticking = ex.sticking.join('')
      expect(sticking).toMatch(/^[RL]{16}$/)
    })
  })

  it('triplets are cut-time bars (4 eighths + an eighth-triplet sextuplet)', () => {
    expect(triplets.filter((e) => e.page === 8)).toHaveLength(12)
    expect(triplets).toHaveLength(36) // + page 9
    triplets.filter((e) => e.page === 8).forEach((ex) => {
      expect(ex.section).toBe('triplets')
      expect(ex.beatSubs).toEqual(['sixteenth', 'sextuplet'])
      expect(ex.timeSignature).toEqual({ beats: 2, unit: 2 })
      expect(ex.rows.snare.filter((c) => c.on)).toHaveLength(10)
      expect(ex.sticking.join('')).toMatch(/^[RL]{10}$/)
    })
    expect(triplets[0].sticking.join('')).toBe('RLRLRLRLRL')
    expect(triplets[2].sticking.join('')).toBe('RRLLRLRLRL')
  })

  it('transcribes representative stickings and auto-tags stroke types', () => {
    expect(byNum(1).sticking.join('')).toBe('RLRLRLRLRLRLRLRL')
    expect(byNum(1).tags).toContain('singles')
    expect(byNum(3).sticking.join('')).toBe('RRLLRRLLRRLLRRLL')
    expect(byNum(3).tags).toContain('doubles')
    expect(byNum(9).sticking.join('')).toBe('RRRLRRRLRRRLRRRL')
    expect(byNum(9).tags).toContain('triples')
    expect(byNum(13).sticking.join('')).toBe('RRRRLLLLRRRRLLLL')
    expect(byNum(13).tags).toContain('quads')
  })

  it('rolls are cut-time bars with both variants (8 notes, and 7 + rest)', () => {
    // Short Roll Combinations (page 10): cut-time written-out bars.
    const shortRolls = rolls.filter((e) => e.page === 10)
    expect(shortRolls.length).toBeGreaterThanOrEqual(12)
    shortRolls.forEach((ex) => {
      expect(ex.beatSubs).toEqual(['sixteenth', 'thirtysecond'])
      expect(ex.timeSignature).toEqual({ beats: 2, unit: 2 })
      // 4 eighths in beat 1 always
      expect(ex.rows.snare.slice(0, 4).every((c) => c.on)).toBe(true)
    })
    // variant A: 4 eighths + 8 sixteenths = 12 onsets
    expect(rolls.find((e) => e.name === 'Double-stroke roll').rows.snare.filter((c) => c.on)).toHaveLength(12)
    // variant B: 4 eighths + 7 sixteenths (+ 16th rest) = 11 onsets
    expect(rolls.find((e) => e.name === '7-stroke roll').rows.snare.filter((c) => c.on)).toHaveLength(11)
  })

  it('roll progressions (page 43) are standard stroke-roll rudiments with an accented tap', () => {
    const progs = rolls.filter((e) => e.page === 43)
    expect(progs).toHaveLength(6)
    progs.forEach((ex) => {
      expect(ex.section).toBe('rolls')
      // written-out open rolls: discrete doubles + a single accented tap to close
      const accented = ex.rows.snare.filter((c) => c.on && c.accent)
      expect(accented).toHaveLength(1)
      expect(ex.sticking.join('')).toMatch(/^[RL]+$/)
    })
    expect(progs.map((e) => e.name).sort()).toEqual([
      '13-stroke roll', '13-stroke roll (L)',
      '5-stroke roll', '5-stroke roll (L)',
      '9-stroke roll', '9-stroke roll (L)',
    ])
  })
})

describe('Stick Control — Flam Beats (pages 16–17)', () => {
  const fb = (n) => flams.find((e) => e.number === n)
  const marks = (ex) => ({
    on: ex.rows.snare.map((c, i) => (c.on ? i : -1)).filter((i) => i >= 0),
    flams: ex.rows.snare.map((c, i) => (c.on && c.flam ? i : -1)).filter((i) => i >= 0),
    sticking: ex.sticking.filter(Boolean).join(''),
  })

  it('has 48 flam beats, two 2/4 bars each, on a 16th grid', () => {
    expect(flams).toHaveLength(48)
    flams.forEach((ex) => {
      expect(barCount(ex)).toBe(2)
      getBars(ex).forEach((b) => {
        expect(b.ts).toEqual({ beats: 2, unit: 4 })
        expect(b.beatSubs).toEqual(['sixteenth', 'sixteenth'])
      })
      expect(exerciseTotalSteps(ex)).toBe(16)
      expect([16, 17]).toContain(ex.page)
    })
  })

  it('#1: four "8th + two 16ths" groups, right-hand flam on each group', () => {
    const m = marks(fb(1))
    expect(m.on).toEqual([0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15])
    expect(m.flams).toEqual([0, 4, 8, 12]) // group starts
    expect(m.sticking).toBe('RLLRLLRLLRLL')
  })

  it('#2: same figure led by left-hand flams', () => {
    const m = marks(fb(2))
    expect(m.flams).toEqual([0, 4, 8, 12])
    expect(m.sticking).toBe('LRRLRRLRRLRR')
  })

  it('#8: four 16ths per beat, flam on each beat (FLRL)', () => {
    const m = marks(fb(8))
    expect(m.on).toEqual([...Array(16).keys()]) // all 16 slots
    expect(m.flams).toEqual([0, 4, 8, 12])
    expect(m.sticking).toBe('RLRLRLRLRLRLRLRL')
  })

  it('#11: flammed doubles — flams mid-beat too (F R P L)', () => {
    const m = marks(fb(11))
    expect(m.flams).toEqual([0, 2, 4, 6, 8, 10, 12, 14])
    expect(m.sticking).toBe('RRLLRRLLRRLLRRLL')
  })

  it('#24: combination — two FLL groups then 16th groups (FLRR PRLL)', () => {
    const m = marks(fb(24))
    expect(m.on).toEqual([0, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(m.flams).toEqual([0, 4, 8, 12])
    expect(m.sticking).toBe('RLLRLLRLRRLRLL')
  })

  it('#48: ends with flammed doubles bar (FLR PRL FRPL FRPL)', () => {
    const m = marks(fb(48))
    expect(m.flams).toEqual([0, 4, 8, 10, 12, 14])
    expect(m.sticking).toBe('RLRLRLRRLLRRLL')
  })
})

describe('Short Rolls and Triplets (pages 14-15)', () => {
  const srt = getStickControlExercises().filter((e) => e.id.startsWith('sc_srt'))

  it('has 24 exercises per page, two bars of cut time each', () => {
    expect(srt).toHaveLength(48)
    srt.forEach((ex) => {
      expect(ex.bars).toHaveLength(2)
      ex.bars.forEach((b) => expect(b.ts).toEqual({ beats: 2, unit: 2 }))
      expect(ex.bars[1].beatSubs).toEqual(['sixteenth', 'sextuplet'])
      expect(ex.section).toBe('rolls')
      // bar 2 = 4 eighths + 6 triplet strokes, all onsets
      const tail = ex.rows.snare.slice(-10)
      expect(tail.every((c) => c.on)).toBe(true)
    })
  })

  it('roll variants put a tied/untied half-note roll at the end of bar 1', () => {
    const tied = srt.filter((e) => [9, 10, 21, 22].includes(e.number))
    const untied = srt.filter((e) => [11, 12, 23, 24].includes(e.number))
    expect(tied).toHaveLength(8)
    expect(untied).toHaveLength(8)
    tied.forEach((ex) => {
      expect(ex.bars[0].beatSubs).toEqual(['sixteenth', 'quarter'])
      const rollCell = ex.rows.snare[4]
      expect(rollCell.roll).toBe('open')
      expect(rollCell.tie).toBe(true)
    })
    untied.forEach((ex) => {
      expect(ex.rows.snare[4].roll).toBe('open')
      expect(ex.rows.snare[4].tie).toBe(false)
    })
  })

  it('measured variants write 8 or 7 sixteenths; sticking matches the page', () => {
    const ex1 = srt.find((e) => e.id === 'sc_srt14_1')
    expect(ex1.sticking.join('')).toBe('RLRL' + 'RLRLRLRL' + 'RLRL' + 'RLRLRL')
    const ex3 = srt.find((e) => e.id === 'sc_srt14_3')
    expect(ex3.rows.snare[11].on).toBe(false) // the roll's release rest
    const p15one = srt.find((e) => e.id === 'sc_srt15_1')
    expect(p15one.sticking.join('')).toBe('RLRR' + 'LRLRLRLR' + 'LRLL' + 'RLRLRL')
  })

  it('renders to notation with the tie flag on the bar-final roll', () => {
    const tied = getStickControlExercises().find((e) => e.id === 'sc_srt14_9')
    const data = buildNotationData(tied)
    const bar1Ticks = data.beatsData.filter((b) => b.bar === 0).flatMap((b) => b.tickables)
    const last = bar1Ticks[bar1Ticks.length - 1]
    expect(last.roll).toBe('open')
    expect(last.tie).toBe(true)
    const untied = getStickControlExercises().find((e) => e.id === 'sc_srt14_11')
    const u = buildNotationData(untied)
    const uTicks = u.beatsData.filter((b) => b.bar === 0).flatMap((b) => b.tickables)
    expect(uTicks[uTicks.length - 1].tie).toBe(false)
  })
})

describe('pages 9 + 11-13 (triplets and short-roll combinations)', () => {
  const all = getStickControlExercises()
  const page = (n) => all.filter((e) => e.page === n && e.id.startsWith('sc_p'))

  it('has the right counts: 24 + 24 + 12 + 24', () => {
    expect(page(9)).toHaveLength(24)
    expect(page(11)).toHaveLength(24)
    expect(page(12)).toHaveLength(12)
    expect(page(13)).toHaveLength(24)
    page(9).forEach((e) => expect(e.section).toBe('triplets'))
    ;[11, 12, 13].forEach((p) => page(p).forEach((e) => expect(e.section).toBe('rolls')))
  })

  it('spot checks match the printed pages', () => {
    const byId = (id) => all.find((e) => e.id === id)
    // p9 #1: RLRL + RLR LRL twice (4+6+4+6 = 20 steps)
    const p9one = byId('sc_p9_1')
    expect(p9one.sticking.join('')).toBe('RLRL' + 'RLRLRL' + 'RLRL' + 'RLRLRL')
    // p9 #5: paradiddle lead flips between bars
    expect(byId('sc_p9_5').sticking.join('')).toBe('RLRR' + 'LRLRLR' + 'LRLL' + 'RLRLRL')
    // p9 #17 (right column): bar2 is all triplets
    expect(byId('sc_p9_17').sticking.join('')).toBe('RLRR' + 'LRLRLR' + 'LRLRLR' + 'LRLRLR')
    // p11 #1: doubles roll written out; #13 = 7-stroke variant with the rest
    expect(byId('sc_p11_1').sticking.join('')).toBe('RLRL' + 'RRLLRRLL' + 'RLRL' + 'RRLLRRLL')
    const p11thirteen = byId('sc_p11_13')
    expect(p11thirteen.rows.snare[11].on).toBe(false) // the release rest
    expect(p11thirteen.sticking.join('')).toBe('RLRL' + 'RRLLRRL' + 'RLRL' + 'RRLLRRL')
    // p11 #12: RRRR/LLLL lead
    expect(byId('sc_p11_12').sticking.join('')).toBe('RRRR' + 'LLRRLLRR' + 'LLLL' + 'RRLLRRLL')
    // p12: closed rolls, tied
    const p12one = byId('sc_p12_1')
    expect(p12one.rows.snare[4]).toMatchObject({ roll: 'closed', tie: true })
    expect(p12one.rows.snare[9]).toMatchObject({ roll: 'closed', tie: true })
    // p13 #11: untied closed roll (explicit tie: false)
    expect(byId('sc_p13_11').rows.snare[4]).toMatchObject({ roll: 'closed', tie: false })
    // p13 #21: bar 2 = two tied rolls
    const p1321 = byId('sc_p13_21')
    expect(p1321.rows.snare[5]).toMatchObject({ roll: 'closed', tie: true })
    expect(p1321.rows.snare[6]).toMatchObject({ roll: 'closed', tie: true })
  })

  it('all of them render to notation', () => {
    ;[9, 11, 12, 13].forEach((p) => page(p).forEach((ex) => {
      const data = buildNotationData(ex)
      expect(data.barsMeta).toHaveLength(2)
    }))
  })
})
