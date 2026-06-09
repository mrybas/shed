import { describe, it, expect } from 'vitest'
import { getStickControlExercises } from './stickControl.js'

const list = getStickControlExercises()
const single = list.filter((e) => e.section === 'single-beat')
const triplets = list.filter((e) => e.section === 'triplets')
const rolls = list.filter((e) => e.section === 'rolls')
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
