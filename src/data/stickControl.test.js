import { describe, it, expect } from 'vitest'
import { getStickControlExercises } from './stickControl.js'
import { barCount, getBars, exerciseTotalSteps } from '../model/exercise.js'

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
    expect(triplets).toHaveLength(12)
    triplets.forEach((ex) => {
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
