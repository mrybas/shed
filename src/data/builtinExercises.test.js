import { describe, it, expect } from 'vitest'
import { getBuiltinExercises } from './builtinExercises.js'
import { totalSteps } from '../model/exercise.js'

const byId = (id) => getBuiltinExercises().find((e) => e.id === id)

// Collect the indices where snare is on, and which of those are accented.
function snareInfo(ex) {
  const on = []
  const accents = []
  ex.rows.snare.forEach((c, i) => {
    if (c.on) on.push(i)
    if (c.on && c.accent) accents.push(i)
  })
  return { on, accents, sticking: ex.sticking.join('') }
}

describe('builtin library', () => {
  it('returns a non-empty list with unique ids', () => {
    const list = getBuiltinExercises()
    expect(list.length).toBeGreaterThan(5)
    const ids = list.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every row matches the exercise total step count', () => {
    getBuiltinExercises().forEach((ex) => {
      const n = totalSteps(ex.timeSignature, ex.subdivision)
      Object.values(ex.rows).forEach((row) => expect(row).toHaveLength(n))
      expect(ex.sticking).toHaveLength(n)
    })
  })
})

describe('Drumeo single paradiddle set', () => {
  it('Basic (8th): RLRRLRLL on snare, accents on beats 1 & 3', () => {
    const ex = byId('dci16a_basic')
    expect(ex.timeSignature).toEqual({ beats: 4, unit: 4 })
    expect(ex.subdivision).toBe('eighth')
    const { on, accents, sticking } = snareInfo(ex)
    expect(on).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(sticking).toBe('RLRRLRLL')
    expect(accents).toEqual([0, 4])
  })

  it('16th notes: RLRRLRLL x2, accent on every beat', () => {
    const ex = byId('dci16a_16th')
    expect(ex.subdivision).toBe('sixteenth')
    const { on, accents, sticking } = snareInfo(ex)
    expect(on).toHaveLength(16)
    expect(sticking).toBe('RLRRLRLLRLRRLRLL')
    expect(accents).toEqual([0, 4, 8, 12])
  })

  it('Triplets: 24 notes over 8 beats, accents every 4', () => {
    const ex = byId('dci16a_triplets')
    expect(ex.timeSignature).toEqual({ beats: 8, unit: 4 })
    expect(ex.subdivision).toBe('triplet')
    const { on, accents, sticking } = snareInfo(ex)
    expect(on).toHaveLength(24)
    expect(sticking).toBe('RLRRLRLLRLRRLRLLRLRRLRLL')
    expect(accents).toEqual([0, 4, 8, 12, 16, 20])
  })

  it('Inverted sticking is RLLR LRRL repeated', () => {
    expect(snareInfo(byId('dci16a_inverted')).sticking).toBe('RLLRLRRLRLLRLRRL')
  })

  it('Reverse sticking is RRLR LLRL repeated', () => {
    expect(snareInfo(byId('dci16a_reverse')).sticking).toBe('RRLRLLRLRRLRLLRL')
  })
})

describe('grooves', () => {
  it('basic rock beat places kick/snare/hihat correctly', () => {
    const ex = byId('builtin_basic_rock')
    const stepsOn = (inst) => ex.rows[inst].map((c, i) => (c.on ? i : -1)).filter((i) => i >= 0)
    expect(stepsOn('hihatClosed')).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(stepsOn('snare')).toEqual([2, 6])
    expect(stepsOn('kick')).toEqual([0, 4])
  })
})
